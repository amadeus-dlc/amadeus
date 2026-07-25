// Closed registry for every public Intent Mirror projection.

import { createHash } from "node:crypto";

export const MIRROR_SURFACE_IDS = [
  "claude",
  "codex",
  "cursor",
  "kiro",
  "kiro-ide",
  "opencode",
] as const;

export type MirrorSurfaceId = (typeof MIRROR_SURFACE_IDS)[number];
export type MirrorArtifactKind =
  | "tool"
  | "wrapper"
  | "skill"
  | "registration";

export const MIRROR_TOOL_FILES = [
  "amadeus-mirror-capability.ts",
  "amadeus-mirror-config.ts",
  "amadeus-mirror-coordinator.ts",
  "amadeus-mirror-executor.ts",
  "amadeus-mirror-gateway.ts",
  "amadeus-mirror-lifecycle.ts",
  "amadeus-mirror-policy.ts",
  "amadeus-mirror-presentation.ts",
  "amadeus-mirror-provenance.ts",
  "amadeus-mirror-repair.ts",
  "amadeus-mirror-runner.ts",
  "amadeus-mirror-state-codec.ts",
  "amadeus-mirror-state-reducer.ts",
  "amadeus-mirror-state-store.ts",
  "amadeus-mirror-types.ts",
  "amadeus-mirror.ts",
] as const;

export type MirrorArtifact = Readonly<{
  kind: MirrorArtifactKind;
  source: string;
  distPath: string | null;
  selfPath: string | null;
  parity: "raw" | "golden";
  scan: boolean;
}>;

export type MirrorProjection = Readonly<{
  surface: MirrorSurfaceId;
  harnessDir: string;
  distTool: string;
  distSkill: string;
  selfTool: string | null;
  selfSkill: string | null;
  artifacts: readonly MirrorArtifact[];
}>;

type ProjectionRoots = Readonly<{
  harnessDir: string;
  distRoot: string;
  distSkillRoot: string;
  selfRoot: string | null;
  selfSkillRoot: string | null;
  manifest: string;
}>;

const roots: Record<MirrorSurfaceId, ProjectionRoots> = {
  claude: {
    harnessDir: ".claude",
    distRoot: "dist/claude/.claude",
    distSkillRoot: "dist/claude/.claude",
    selfRoot: ".claude",
    selfSkillRoot: ".claude",
    manifest: "packages/framework/harness/claude/manifest.ts",
  },
  codex: {
    harnessDir: ".codex",
    distRoot: "dist/codex/.codex",
    distSkillRoot: "dist/codex/.agents",
    selfRoot: ".codex",
    selfSkillRoot: ".agents",
    manifest: "packages/framework/harness/codex/manifest.ts",
  },
  cursor: {
    harnessDir: ".cursor",
    distRoot: "dist/cursor/.cursor",
    distSkillRoot: "dist/cursor/.cursor",
    selfRoot: ".cursor",
    selfSkillRoot: ".cursor",
    manifest: "packages/framework/harness/cursor/manifest.ts",
  },
  kiro: {
    harnessDir: ".kiro",
    distRoot: "dist/kiro/.kiro",
    distSkillRoot: "dist/kiro/.kiro",
    selfRoot: null,
    selfSkillRoot: null,
    manifest: "packages/framework/harness/kiro/manifest.ts",
  },
  "kiro-ide": {
    harnessDir: ".kiro",
    distRoot: "dist/kiro-ide/.kiro",
    distSkillRoot: "dist/kiro-ide/.kiro",
    selfRoot: null,
    selfSkillRoot: null,
    manifest: "packages/framework/harness/kiro-ide/manifest.ts",
  },
  opencode: {
    harnessDir: ".opencode",
    distRoot: "dist/opencode/.opencode",
    distSkillRoot: "dist/opencode/.opencode",
    selfRoot: ".opencode",
    selfSkillRoot: ".opencode",
    manifest: "packages/framework/harness/opencode/manifest.ts",
  },
};

function toolArtifact(
  file: (typeof MIRROR_TOOL_FILES)[number],
  projectionRoots: ProjectionRoots,
): MirrorArtifact {
  return {
    kind: file === "amadeus-mirror.ts" ? "tool" : "wrapper",
    source: `packages/framework/core/tools/${file}`,
    distPath: `${projectionRoots.distRoot}/tools/${file}`,
    selfPath: projectionRoots.selfRoot
      ? `${projectionRoots.selfRoot}/tools/${file}`
      : null,
    parity: file === "amadeus-mirror.ts" ? "raw" : "golden",
    scan: true,
  };
}

function projection(
  surface: MirrorSurfaceId,
  projectionRoots: ProjectionRoots,
): MirrorProjection {
  const skill: MirrorArtifact = {
    kind: "skill",
    source: "packages/framework/core/skills/amadeus-mirror/SKILL.md",
    distPath: `${projectionRoots.distSkillRoot}/skills/amadeus-mirror/SKILL.md`,
    selfPath: projectionRoots.selfSkillRoot
      ? `${projectionRoots.selfSkillRoot}/skills/amadeus-mirror/SKILL.md`
      : null,
    parity: "raw",
    scan: true,
  };
  const artifacts = [
    ...MIRROR_TOOL_FILES.map((file) => toolArtifact(file, projectionRoots)),
    skill,
    {
      kind: "registration",
      source: projectionRoots.manifest,
      distPath: null,
      selfPath: null,
      parity: "golden",
      scan: true,
    } satisfies MirrorArtifact,
    ...(surface === "codex"
      ? [{
          kind: "registration",
          source:
            "dist/codex/.agents/skills/amadeus-mirror/agents/openai.yaml",
          distPath:
            "dist/codex/.agents/skills/amadeus-mirror/agents/openai.yaml",
          selfPath: ".agents/skills/amadeus-mirror/agents/openai.yaml",
          parity: "golden",
          scan: true,
        } satisfies MirrorArtifact]
      : []),
  ];
  const entrypoint = artifacts.find((artifact) => artifact.kind === "tool");
  return {
    surface,
    harnessDir: projectionRoots.harnessDir,
    distTool: entrypoint?.distPath as string,
    distSkill: skill.distPath as string,
    selfTool: entrypoint?.selfPath ?? null,
    selfSkill: skill.selfPath,
    artifacts,
  };
}

const projections: Record<MirrorSurfaceId, MirrorProjection> =
  Object.fromEntries(
    MIRROR_SURFACE_IDS.map((surface) => [
      surface,
      projection(surface, roots[surface]),
    ]),
  ) as Record<MirrorSurfaceId, MirrorProjection>;

export const MIRROR_PROJECTIONS: readonly MirrorProjection[] =
  MIRROR_SURFACE_IDS.map((surface) => projections[surface]);

export const MIRROR_CORE_PROJECTIONS = {
  tool: "packages/framework/core/tools/amadeus-mirror.ts",
  skill: "packages/framework/core/skills/amadeus-mirror/SKILL.md",
} as const;

export const MIRROR_DOC_PROJECTIONS = [
  "docs/guide/22-intent-mirror.md",
  "docs/guide/22-intent-mirror.ja.md",
  "docs/reference/20-intent-mirror.md",
  "docs/reference/20-intent-mirror.ja.md",
] as const;

export const MIRROR_PUBLIC_PROJECTION_PATHS = [
  ...new Set([
    ...MIRROR_PROJECTIONS.flatMap((item) =>
      item.artifacts.flatMap((artifact) => [
        ...(artifact.scan ? [artifact.source] : []),
        ...(artifact.scan && artifact.distPath ? [artifact.distPath] : []),
        ...(artifact.scan && artifact.selfPath ? [artifact.selfPath] : []),
      ]),
    ),
    ...MIRROR_DOC_PROJECTIONS,
  ]),
].sort();

function invalidPath(path: string): boolean {
  return path.length === 0 ||
    path.includes("\0") ||
    path.startsWith("/") ||
    /^[A-Za-z]:[\\/]/u.test(path) ||
    path.split(/[\\/]/u).includes("..");
}

export function validateMirrorProjectionRegistry(
  entries: readonly MirrorProjection[] = MIRROR_PROJECTIONS,
): readonly string[] {
  const findings: string[] = [];
  const targets = new Map<string, string>();
  const surfaces = new Set<string>();
  for (const entry of entries) {
    if (surfaces.has(entry.surface))
      findings.push(`${entry.surface}: duplicate surface`);
    surfaces.add(entry.surface);
    if (!MIRROR_SURFACE_IDS.includes(entry.surface))
      findings.push(`${entry.surface}: unknown surface`);
    for (const artifact of entry.artifacts) {
      if (!["tool", "wrapper", "skill", "registration"].includes(artifact.kind))
        findings.push(`${entry.surface}: unknown artifact kind ${artifact.kind}`);
      for (const [role, path] of [
        ["source", artifact.source],
        ["dist", artifact.distPath],
        ["self", artifact.selfPath],
      ] as const) {
        if (path === null) continue;
        if (invalidPath(path))
          findings.push(`${entry.surface}:${role}: invalid path ${path}`);
        if (role === "source") continue;
        const prior = targets.get(path);
        if (prior) findings.push(`${entry.surface}:${role}: collision with ${prior}`);
        else targets.set(path, `${entry.surface}:${artifact.kind}`);
      }
    }
    const includesSelf = !["kiro", "kiro-ide"].includes(entry.surface);
    for (const artifact of entry.artifacts) {
      if (
        includesSelf &&
        artifact.kind !== "registration" &&
        artifact.selfPath === null
      ) findings.push(`${entry.surface}: included self-install path is missing`);
      if (!includesSelf && artifact.selfPath !== null)
        findings.push(`${entry.surface}: excluded self-install path is present`);
    }
  }
  for (const surface of MIRROR_SURFACE_IDS) {
    if (!surfaces.has(surface)) findings.push(`${surface}: surface is missing`);
  }
  const paths = [...targets.keys()].sort();
  for (let index = 0; index < paths.length; index += 1) {
    const prefix = `${paths[index]}/`;
    const nested = paths.find((candidate, candidateIndex) =>
      candidateIndex !== index && candidate.startsWith(prefix)
    );
    if (nested) findings.push(`root collision: ${paths[index]} contains ${nested}`);
  }
  return findings.sort();
}

export function mirrorProjection(surface: MirrorSurfaceId): MirrorProjection {
  return projections[surface];
}

export function mirrorSessionSkillName(surface: MirrorSurfaceId): string {
  return mirrorProjection(surface).distSkill.split("/").at(-2) as string;
}

export function mirrorCoreSkillDirectory(surface: MirrorSurfaceId): {
  src: string;
  dst: string;
} {
  const name = mirrorSessionSkillName(surface);
  return { src: `skills/${name}`, dst: `skills/${name}` };
}

export function mirrorProjectionRegistryDigest(): string {
  return createHash("sha256")
    .update(JSON.stringify(MIRROR_PROJECTIONS))
    .digest("hex");
}
