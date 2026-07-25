#!/usr/bin/env bun

import {
  MIRROR_PUBLIC_PROJECTION_PATHS,
} from "../packages/framework/harness/projections.ts";
import {
  DISTRIBUTION_FILE_LIMIT_BYTES,
  DISTRIBUTION_TOTAL_LIMIT_BYTES,
  DistributionTransactionCoordinator,
} from "./distribution-transaction.ts";

const SECRET =
  /\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|(?:token|secret|password|api[-_]?key)\s*[:=]\s*[^\s"'<>]+)/giu;
const ABSOLUTE_USER_PATH =
  /(?:\/Users\/[^/\s]+|\/home\/[^/\s]+|[A-Za-z]:\\Users\\[^\\\s]+)/gu;

export type ProjectionScanFinding = Readonly<{
  path: string;
  kind:
    | "secret"
    | "absolute-user-path"
    | "file-capacity"
    | "total-capacity"
    | "missing"
    | "recovery-required";
}>;

export function publicProjectionPaths(): readonly string[] {
  return MIRROR_PUBLIC_PROJECTION_PATHS;
}

export function scanProjectionBuffers(
  buffers: ReadonlyMap<string, Buffer>,
): readonly ProjectionScanFinding[] {
  const findings: ProjectionScanFinding[] = [];
  let total = 0;
  for (const [path, bytes] of [...buffers].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    total += bytes.length;
    if (bytes.length > DISTRIBUTION_FILE_LIMIT_BYTES)
      findings.push({ path, kind: "file-capacity" });
    const text = bytes.toString("utf-8");
    if (SECRET.test(text)) findings.push({ path, kind: "secret" });
    SECRET.lastIndex = 0;
    if (ABSOLUTE_USER_PATH.test(text))
      findings.push({ path, kind: "absolute-user-path" });
    ABSOLUTE_USER_PATH.lastIndex = 0;
  }
  if (total > DISTRIBUTION_TOTAL_LIMIT_BYTES)
    findings.push({
      path: "<all-public-projections>",
      kind: "total-capacity",
    });
  return findings;
}

export function scanPublicProjections(
  root: string,
): readonly ProjectionScanFinding[] {
  const coordinator = new DistributionTransactionCoordinator(root);
  if (coordinator.pendingJournalCount() > 0) {
    return [{
      path: ".amadeus/distribution-transaction/journals",
      kind: "recovery-required",
    }];
  }
  const session = coordinator.openReadSession("public-projection-scan");
  const buffers = new Map<string, Buffer>();
  const findings: ProjectionScanFinding[] = [];
  try {
    for (const path of publicProjectionPaths()) {
      try {
        buffers.set(path, session.readFile(path));
      } catch {
        findings.push({ path, kind: "missing" });
      }
    }
  } finally {
    session.close();
  }
  return [...findings, ...scanProjectionBuffers(buffers)];
}

if (import.meta.main) {
  const findings = scanPublicProjections(process.cwd());
  for (const finding of findings)
    console.error(`${finding.kind}: ${finding.path}`);
  if (findings.length > 0) process.exit(1);
  console.log(
    `scan-public-projections: OK (${publicProjectionPaths().length} files)`,
  );
}
