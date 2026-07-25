#!/usr/bin/env bun

import { createHash } from "node:crypto";
import {
  MIRROR_PROJECTIONS,
  mirrorProjectionRegistryDigest,
  type MirrorArtifact,
  type MirrorProjection,
  validateMirrorProjectionRegistry,
} from "../packages/framework/harness/projections.ts";
import {
  type DistributionReadSession,
  DistributionTransactionCoordinator,
} from "./distribution-transaction.ts";

export type DistributionFinding = Readonly<{
  surface: string;
  path: string;
  kind:
    | "missing"
    | "unexpected"
    | "content-mismatch"
    | "registry-invalid"
    | "recovery-required";
}>;

function digest(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

type Inspection = {
  findings: DistributionFinding[];
  digests: Record<string, string>;
};

function readProjectionFile(
  session: DistributionReadSession,
  inspection: Inspection,
  surface: string,
  path: string,
): Buffer | null {
  try {
    const bytes = session.readFile(path);
    inspection.digests[path] = digest(bytes);
    return bytes;
  } catch {
    inspection.findings.push({ surface, path, kind: "missing" });
    return null;
  }
}

function inspectArtifact(
  session: DistributionReadSession,
  inspection: Inspection,
  projection: MirrorProjection,
  artifact: MirrorArtifact,
): void {
  const source = readProjectionFile(
    session,
    inspection,
    projection.surface,
    artifact.source,
  );
  if (source === null) return;
  for (const path of [artifact.distPath, artifact.selfPath]) {
    if (path === null) continue;
    const bytes = readProjectionFile(
      session,
      inspection,
      projection.surface,
      path,
    );
    if (bytes !== null && !bytes.equals(source)) {
      inspection.findings.push({
        surface: projection.surface,
        path,
        kind: "content-mismatch",
      });
    }
  }
}

type ProjectionRoot = Readonly<{
  path: string;
  expected: readonly string[];
}>;

function dirname(path: string): string {
  return path.slice(0, path.lastIndexOf("/"));
}

function artifactPaths(
  artifacts: readonly MirrorArtifact[],
  side: "distPath" | "selfPath",
): string[] {
  return artifacts.flatMap((artifact) =>
    artifact[side] ? [artifact[side] as string] : []
  );
}

function projectionRoots(projection: MirrorProjection): ProjectionRoot[] {
  const tools = projection.artifacts.filter((artifact) =>
    artifact.kind === "tool" || artifact.kind === "wrapper"
  );
  const skills = projection.artifacts.filter((artifact) =>
    artifact.kind === "skill" || artifact.kind === "registration"
  );
  return [
    { path: dirname(projection.distTool), expected: artifactPaths(tools, "distPath") },
    { path: dirname(projection.distSkill), expected: artifactPaths(skills, "distPath") },
    ...(projection.selfTool
      ? [{ path: dirname(projection.selfTool), expected: artifactPaths(tools, "selfPath") }]
      : []),
    ...(projection.selfSkill
      ? [{ path: dirname(projection.selfSkill), expected: artifactPaths(skills, "selfPath") }]
      : []),
  ];
}

function inspectRoot(
  session: DistributionReadSession,
  inspection: Inspection,
  surface: string,
  root: ProjectionRoot,
): void {
  let actual: readonly string[];
  try {
    actual = session.listPublicRoot(root.path);
  } catch {
    return;
  }
  const expected = new Set(root.expected.map((path) =>
    path.slice(root.path.length + 1)
  ));
  const managed = root.path.endsWith("/tools")
    ? actual.filter((path) => /^amadeus-mirror[^/]*\.ts$/u.test(path))
    : actual;
  for (const path of managed) {
    if (!expected.has(path))
      inspection.findings.push({
        surface,
        path: `${root.path}/${path}`,
        kind: "unexpected",
      });
  }
}

function inspectProjection(
  session: DistributionReadSession,
  inspection: Inspection,
  projection: MirrorProjection,
): void {
  for (const artifact of projection.artifacts)
    inspectArtifact(session, inspection, projection, artifact);
  for (const root of projectionRoots(projection))
    inspectRoot(session, inspection, projection.surface, root);
}

export function checkMirrorDistribution(root: string): {
  findings: readonly DistributionFinding[];
  digests: Readonly<Record<string, string>>;
  registryDigest: string;
} {
  const inspection: Inspection = { findings: [], digests: {} };
  const registryDigest = mirrorProjectionRegistryDigest();
  for (const message of validateMirrorProjectionRegistry()) {
    inspection.findings.push({
      surface: "registry",
      path: message,
      kind: "registry-invalid",
    });
  }
  const coordinator = new DistributionTransactionCoordinator(root);
  if (coordinator.pendingJournalCount() > 0) {
    return {
      findings: [{
        surface: "transaction",
        path: ".amadeus/distribution-transaction/journals",
        kind: "recovery-required",
      }],
      digests: inspection.digests,
      registryDigest,
    };
  }
  const session = coordinator.openReadSession("mirror-distribution-check");
  try {
    for (const projection of MIRROR_PROJECTIONS)
      inspectProjection(session, inspection, projection);
  } finally {
    session.close();
  }
  inspection.findings.sort(
    (left, right) =>
      left.surface.localeCompare(right.surface) ||
      left.path.localeCompare(right.path) ||
      left.kind.localeCompare(right.kind),
  );
  return {
    findings: inspection.findings,
    digests: inspection.digests,
    registryDigest,
  };
}

if (import.meta.main) {
  const result = checkMirrorDistribution(process.cwd());
  if (result.findings.length > 0) {
    for (const finding of result.findings)
      console.error(`${finding.surface}: ${finding.kind}: ${finding.path}`);
    process.exit(1);
  }
  console.log(
    `mirror-distribution-check: OK (${Object.keys(result.digests).length} payloads; registry ${result.registryDigest.slice(0, 12)})`,
  );
}
