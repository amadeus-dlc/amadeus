// covers: package:@amadeus-dlc/setup, installer:operation-planning, requirements:FR-005, requirements:FR-006, requirements:FR-008, requirements:FR-009, requirements:FR-010, requirements:FR-011, stories:US-002, stories:US-004, stories:US-005, stories:US-006, stories:US-007

import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { buildBackupPath, formatUtcBasicTimestamp } from "../../packages/setup/src/domain/backup-planner.ts";
import { planInstall, planUpgrade, validateFileOperationPlan } from "../../packages/setup/src/domain/operation-planner.ts";
import type { FileOperationPlan, PlanningContext } from "../../packages/setup/src/domain/plan-types.ts";
import { CANONICAL_SOURCE_REPO, type DistributionFile, type LoadedDistribution, type ResolvedVersion } from "../../packages/setup/src/domain/source-types.ts";
import { INSTALLER_MANIFEST_PATH, type InstallerManifest, type TargetDetection, type TargetSnapshot } from "../../packages/setup/src/domain/target-types.ts";
import type { SetupCommand } from "../../packages/setup/src/cli/types.ts";

const targetRoot = "/tmp/amadeus-target";
const fixedTimestamp = new Date("2026-07-07T12:34:56.000Z");

const resolvedVersion: ResolvedVersion = {
  distributionVersion: "1.2.3",
  sourceTag: "v1.2.3",
  sourceRepo: CANONICAL_SOURCE_REPO,
  ignoredTags: [],
};

function md5(content: string): string {
  return createHash("md5").update(content).digest("hex");
}

function distributionFile(path: string, input: Partial<DistributionFile> & { content?: string } = {}): DistributionFile {
  const content = input.content ?? path;
  return {
    path,
    class: input.class ?? "shared",
    required: input.required ?? true,
    md5: input.md5 ?? md5(content),
  };
}

function manifest(input: Partial<InstallerManifest> = {}): InstallerManifest {
  return {
    schemaVersion: 1,
    installerPackageVersion: "0.0.0",
    distributionVersion: "1.2.3",
    sourceTag: "v1.2.3",
    installedAt: "2026-07-07T00:00:00.000Z",
    harness: "codex",
    files: [distributionFile("AGENTS.md", { content: "agents" })],
    ...input,
  };
}

function loadedDistribution(files: DistributionFile[]): LoadedDistribution {
  return {
    root: "/tmp/source-dist",
    harness: "codex",
    resolvedVersion,
    files: files.map((file) => ({ path: file.path, absolutePath: `/tmp/source-dist/${file.path}`, md5: file.md5 })),
  };
}

function snapshot(files: Array<{ path: string; exists: boolean; md5?: string }>, targetDetection: TargetDetection = detection("none")): TargetSnapshot {
  return {
    target: targetRoot,
    detection: targetDetection,
    existingFiles: files,
    diagnostics: {
      expectedFileCount: files.length,
      unknownMd5Count: files.filter((file) => file.exists && file.md5 === undefined).length,
      unreadableFiles: [],
    },
  };
}

function detection(state: TargetDetection["state"], input: Partial<TargetDetection> = {}): TargetDetection {
  const baseDiagnostics = {
    manifestRead: { status: "absent" as const, reasonCode: "manifest-absent" as const, manifestPath: INSTALLER_MANIFEST_PATH },
    sentinelMatches: [],
  };
  switch (state) {
    case "manifest-installed":
      return {
        state,
        target: targetRoot,
        manifest: manifest(),
        inferredHarness: "codex",
        diagnostics: baseDiagnostics,
        ...input,
      } as TargetDetection;
    case "manual-or-unknown":
      return {
        state,
        target: targetRoot,
        inferredHarness: "codex",
        diagnostics: baseDiagnostics,
        ...input,
      } as TargetDetection;
    case "partial":
      return {
        state,
        target: targetRoot,
        missingPaths: [".agents"],
        diagnostics: baseDiagnostics,
        ...input,
      } as TargetDetection;
    case "none":
      return { state, target: targetRoot, diagnostics: baseDiagnostics, ...input } as TargetDetection;
    case "unsupported-layout":
      return {
        state,
        target: targetRoot,
        reason: "first-release harness sentinel missing",
        diagnostics: baseDiagnostics,
        ...input,
      } as TargetDetection;
    case "ambiguous-harness":
      return {
        state,
        target: targetRoot,
        candidates: ["kiro", "kiro-ide"],
        reason: "multiple harness sentinels matched",
        diagnostics: baseDiagnostics,
        ...input,
      } as TargetDetection;
  }
}

function planningContext(input: {
  command: SetupCommand;
  metadata: DistributionFile[];
  targetDetection: TargetDetection;
  targetSnapshot: TargetSnapshot;
  mode?: PlanningContext["mode"];
  backupPathExists?: (backupPath: string) => boolean;
  resolvedVersion?: ResolvedVersion;
}): PlanningContext {
  const distribution = loadedDistribution(input.metadata);
  if (input.resolvedVersion !== undefined) {
    distribution.resolvedVersion = input.resolvedVersion;
  }
  return {
    command: input.command,
    mode: input.mode ?? (input.command.yes ? "non-interactive" : "interactive"),
    harness: "codex",
    target: targetRoot,
    distribution,
    metadata: input.metadata,
    targetDetection: input.targetDetection,
    targetSnapshot: input.targetSnapshot,
    operationTimestamp: fixedTimestamp,
    backupPathExists: input.backupPathExists ?? (() => false),
  };
}

function installCommand(overrides: Partial<SetupCommand> = {}): SetupCommand {
  return { command: "install", target: targetRoot, harness: "codex", version: undefined, yes: false, force: false, ...overrides };
}

function upgradeCommand(overrides: Partial<SetupCommand> = {}): SetupCommand {
  return { command: "upgrade", target: targetRoot, harness: "codex", version: undefined, yes: false, force: false, ...overrides };
}

describe("U4 install planning", () => {
  test("clean add plan emits add operations for absent files", () => {
    const metadata = [distributionFile("AGENTS.md", { content: "agents" }), distributionFile(".codex/config.toml", { content: "config" })];
    const plan = planInstall(
      planningContext({
        command: installCommand(),
        metadata,
        targetDetection: detection("none"),
        targetSnapshot: snapshot([]),
      }),
    );

    expect(plan.canApply).toBe(true);
    expect(plan.requiresConfirmation).toBe(false);
    expect(plan.operations).toEqual([
      { kind: "add", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/source-dist/AGENTS.md", sourceMd5: md5("agents") },
      { kind: "add", path: ".codex/config.toml", class: "shared", sourcePath: "/tmp/source-dist/.codex/config.toml", sourceMd5: md5("config") },
    ]);
    expect(validateFileOperationPlan(plan)).toEqual([]);
  });

  test("user-preserved files are skipped even when present", () => {
    const metadata = [distributionFile(".env.local", { class: "user-preserved", content: "secret" })];
    const plan = planInstall(
      planningContext({
        command: installCommand(),
        metadata,
        targetDetection: detection("manual-or-unknown"),
        targetSnapshot: snapshot([{ path: ".env.local", exists: true, md5: md5("existing") }]),
      }),
    );

    expect(plan.operations).toEqual([{ kind: "skip", path: ".env.local", class: "user-preserved", reason: "user-preserved" }]);
    expect(plan.canApply).toBe(true);
  });

  test("shared unchanged files emit update without backup", () => {
    const file = distributionFile("AGENTS.md", { content: "agents" });
    const plan = planInstall(
      planningContext({
        command: installCommand(),
        metadata: [file],
        targetDetection: detection("manifest-installed", {
          manifest: manifest({ files: [file] }),
        }),
        targetSnapshot: snapshot([{ path: "AGENTS.md", exists: true, md5: md5("agents") }]),
      }),
    );

    expect(plan.canApply).toBe(true);
    expect(plan.operations).toEqual([
      { kind: "update", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/source-dist/AGENTS.md", sourceMd5: md5("agents"), previousMd5: md5("agents") },
    ]);
  });

  test("shared changed non-interactive collision produces no-write plan", () => {
    const file = distributionFile("AGENTS.md", { content: "new-agents" });
    const plan = planInstall(
      planningContext({
        command: installCommand({ yes: true }),
        mode: "non-interactive",
        metadata: [file],
        targetDetection: detection("manifest-installed", {
          manifest: manifest({ files: [distributionFile("AGENTS.md", { content: "old-agents" })] }),
        }),
        targetSnapshot: snapshot([{ path: "AGENTS.md", exists: true, md5: md5("local-agents") }]),
      }),
    );

    expect(plan.canApply).toBe(false);
    expect(plan.noWriteReason).toBe("non-interactive-collision");
    expect(plan.operations).toEqual([
      {
        kind: "conflict",
        path: "AGENTS.md",
        class: "shared",
        reason: "shared-file-changed",
        previousMd5: md5("old-agents"),
      },
    ]);
  });

  test("interactive shared collision emits backup before update and requires confirmation", () => {
    const file = distributionFile("AGENTS.md", { content: "new-agents" });
    const plan = planInstall(
      planningContext({
        command: installCommand(),
        mode: "interactive",
        metadata: [file],
        targetDetection: detection("manual-or-unknown"),
        targetSnapshot: snapshot([{ path: "AGENTS.md", exists: true }]),
      }),
    );

    expect(plan.canApply).toBe(true);
    expect(plan.requiresConfirmation).toBe(true);
    expect(plan.confirmationReason).toBe("shared-file-collision");
    expect(plan.operations).toEqual([
      {
        kind: "backup",
        path: "AGENTS.md",
        backupPath: `AGENTS.md.${formatUtcBasicTimestamp(fixedTimestamp)}.bk`,
        reason: "shared-file-unknown-md5",
      },
      {
        kind: "update",
        path: "AGENTS.md",
        class: "shared",
        sourcePath: "/tmp/source-dist/AGENTS.md",
        sourceMd5: md5("new-agents"),
        previousMd5: md5("new-agents"),
        backupPath: `AGENTS.md.${formatUtcBasicTimestamp(fixedTimestamp)}.bk`,
      },
    ]);
  });

  test("--yes --force emits backup before force-update for changed shared files", () => {
    const file = distributionFile("AGENTS.md", { content: "new-agents" });
    const plan = planInstall(
      planningContext({
        command: installCommand({ yes: true, force: true }),
        mode: "non-interactive",
        metadata: [file],
        targetDetection: detection("manifest-installed", {
          manifest: manifest({ files: [distributionFile("AGENTS.md", { content: "old-agents" })] }),
        }),
        targetSnapshot: snapshot([{ path: "AGENTS.md", exists: true, md5: md5("local-agents") }]),
      }),
    );

    expect(plan.canApply).toBe(true);
    expect(plan.requiresConfirmation).toBe(false);
    expect(plan.operations).toEqual([
      {
        kind: "backup",
        path: "AGENTS.md",
        backupPath: `AGENTS.md.${formatUtcBasicTimestamp(fixedTimestamp)}.bk`,
        reason: "shared-file-changed",
      },
      {
        kind: "force-update",
        path: "AGENTS.md",
        class: "shared",
        sourcePath: "/tmp/source-dist/AGENTS.md",
        sourceMd5: md5("new-agents"),
        previousMd5: md5("old-agents"),
        backupPath: `AGENTS.md.${formatUtcBasicTimestamp(fixedTimestamp)}.bk`,
      },
    ]);
  });
});

describe("U4 upgrade planning", () => {
  test("upgrade on target none is no-write", () => {
    const plan = planUpgrade(
      planningContext({
        command: upgradeCommand(),
        metadata: [distributionFile("AGENTS.md", { content: "agents" })],
        targetDetection: detection("none"),
        targetSnapshot: snapshot([]),
      }),
    );

    expect(plan.canApply).toBe(false);
    expect(plan.noWriteReason).toBe("upgrade-target-none");
    expect(plan.operations).toEqual([]);
  });

  test("upgrade on unsupported layout is no-write", () => {
    const plan = planUpgrade(
      planningContext({
        command: upgradeCommand(),
        metadata: [distributionFile("AGENTS.md", { content: "agents" })],
        targetDetection: detection("unsupported-layout"),
        targetSnapshot: snapshot([{ path: "amadeus", exists: true }]),
      }),
    );

    expect(plan.canApply).toBe(false);
    expect(plan.noWriteReason).toBe("unsupported-layout");
  });

  test("upgrade on ambiguous harness is no-write", () => {
    const plan = planUpgrade(
      planningContext({
        command: upgradeCommand(),
        metadata: [distributionFile("AGENTS.md", { content: "agents" })],
        targetDetection: detection("ambiguous-harness"),
        targetSnapshot: snapshot([{ path: "AGENTS.md", exists: true, md5: md5("agents") }]),
      }),
    );

    expect(plan.canApply).toBe(false);
    expect(plan.noWriteReason).toBe("ambiguous-harness");
  });

  test("partial target without force is no-write", () => {
    const plan = planUpgrade(
      planningContext({
        command: upgradeCommand({ force: false }),
        metadata: [distributionFile("AGENTS.md", { content: "agents" })],
        targetDetection: detection("partial"),
        targetSnapshot: snapshot([{ path: ".codex", exists: true }]),
      }),
    );

    expect(plan.canApply).toBe(false);
    expect(plan.noWriteReason).toBe("partial-target-force-required");
  });

  test("partial target with force uses conservative shared backup policy", () => {
    const file = distributionFile("AGENTS.md", { content: "new-agents" });
    const plan = planUpgrade(
      planningContext({
        command: upgradeCommand({ force: true }),
        metadata: [file],
        targetDetection: detection("partial"),
        targetSnapshot: snapshot([{ path: "AGENTS.md", exists: true }]),
      }),
    );

    expect(plan.canApply).toBe(true);
    expect(plan.operations).toEqual([
      {
        kind: "backup",
        path: "AGENTS.md",
        backupPath: `AGENTS.md.${formatUtcBasicTimestamp(fixedTimestamp)}.bk`,
        reason: "shared-file-unknown-md5",
      },
      {
        kind: "force-update",
        path: "AGENTS.md",
        class: "shared",
        sourcePath: "/tmp/source-dist/AGENTS.md",
        sourceMd5: md5("new-agents"),
        previousMd5: md5("new-agents"),
        backupPath: `AGENTS.md.${formatUtcBasicTimestamp(fixedTimestamp)}.bk`,
      },
    ]);
  });

  test("already-up-to-date manifest produces no-write plan", () => {
    const file = distributionFile("AGENTS.md", { content: "agents" });
    const plan = planUpgrade(
      planningContext({
        command: upgradeCommand(),
        metadata: [file],
        targetDetection: detection("manifest-installed", {
          manifest: manifest({ distributionVersion: "1.2.3", files: [file] }),
        }),
        targetSnapshot: snapshot([{ path: "AGENTS.md", exists: true, md5: md5("agents") }]),
      }),
    );

    expect(plan.canApply).toBe(false);
    expect(plan.noWriteReason).toBe("already-up-to-date");
  });

  test("explicit downgrade is unsupported", () => {
    const file = distributionFile("AGENTS.md", { content: "agents" });
    const plan = planUpgrade(
      planningContext({
        command: upgradeCommand({ version: "1.0.0" }),
        metadata: [file],
        targetDetection: detection("manifest-installed", {
          manifest: manifest({ distributionVersion: "1.2.3", files: [file] }),
        }),
        targetSnapshot: snapshot([{ path: "AGENTS.md", exists: true, md5: md5("agents") }]),
        resolvedVersion: { ...resolvedVersion, distributionVersion: "1.0.0", sourceTag: "v1.0.0" },
      }),
    );

    expect(plan.canApply).toBe(false);
    expect(plan.noWriteReason).toBe("downgrade-unsupported");
  });

  test("installed newer than latest without explicit version is no-write", () => {
    const file = distributionFile("AGENTS.md", { content: "agents" });
    const plan = planUpgrade(
      planningContext({
        command: upgradeCommand({ version: undefined }),
        metadata: [file],
        targetDetection: detection("manifest-installed", {
          manifest: manifest({ distributionVersion: "9.9.9", files: [file] }),
        }),
        targetSnapshot: snapshot([{ path: "AGENTS.md", exists: true, md5: md5("agents") }]),
      }),
    );

    expect(plan.canApply).toBe(false);
    expect(plan.noWriteReason).toBe("installed-newer-than-latest");
  });

  test("newer explicit upgrade plans file operations", () => {
    const file = distributionFile("AGENTS.md", { content: "new-agents" });
    const previous = distributionFile("AGENTS.md", { content: "old-agents" });
    const plan = planUpgrade(
      planningContext({
        command: upgradeCommand({ version: "1.3.0" }),
        metadata: [file],
        targetDetection: detection("manifest-installed", {
          manifest: manifest({ distributionVersion: "1.2.3", files: [previous] }),
        }),
        targetSnapshot: snapshot([{ path: "AGENTS.md", exists: true, md5: md5("old-agents") }]),
        resolvedVersion: { ...resolvedVersion, distributionVersion: "1.3.0", sourceTag: "v1.3.0" },
      }),
    );

    expect(plan.canApply).toBe(true);
    expect(plan.operations).toEqual([
      { kind: "update", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/source-dist/AGENTS.md", sourceMd5: md5("new-agents"), previousMd5: md5("old-agents") },
    ]);
  });
});

describe("U4 backup and plan invariants", () => {
  test("formatUtcBasicTimestamp uses UTC basic format", () => {
    expect(formatUtcBasicTimestamp(fixedTimestamp)).toBe("20260707T123456Z");
  });

  test("buildBackupPath appends collision suffixes before .bk", () => {
    const timestamp = "20260707T123456Z";
    const existing = new Set<string>([`AGENTS.md.${timestamp}.bk`, `AGENTS.md.${timestamp}.1.bk`]);

    const result = buildBackupPath({
      originalPath: "AGENTS.md",
      timestamp,
      backupPathExists: (path) => existing.has(path),
    });

    expect(result.suffix).toBe(".2.bk");
    expect(result.backupPath).toBe(`AGENTS.md.${timestamp}.2.bk`);
  });

  test("one operation timestamp is reused for multiple backup candidates", () => {
    const files = [
      distributionFile("AGENTS.md", { content: "new-agents" }),
      distributionFile(".codex/config.toml", { content: "new-config" }),
    ];
    const plan = planInstall(
      planningContext({
        command: installCommand({ force: true }),
        metadata: files,
        targetDetection: detection("manual-or-unknown"),
        targetSnapshot: snapshot([
          { path: "AGENTS.md", exists: true, md5: md5("local-agents") },
          { path: ".codex/config.toml", exists: true, md5: md5("local-config") },
        ]),
      }),
    );

    const timestamp = formatUtcBasicTimestamp(fixedTimestamp);
    expect(plan.operations.filter((operation) => operation.kind === "backup").map((operation) => operation.backupPath)).toEqual([
      `AGENTS.md.${timestamp}.bk`,
      `.codex/config.toml.${timestamp}.bk`,
    ]);
  });

  test("backupPathExists is consulted only for backup candidates", () => {
    const consulted: string[] = [];
    const metadata = [distributionFile("AGENTS.md", { content: "new-agents" })];
    planInstall(
      planningContext({
        command: installCommand({ force: true }),
        metadata,
        targetDetection: detection("manual-or-unknown"),
        targetSnapshot: snapshot([{ path: "AGENTS.md", exists: true, md5: md5("local-agents") }]),
        backupPathExists: (path) => {
          consulted.push(path);
          return false;
        },
      }),
    );

    expect(consulted).toEqual([`AGENTS.md.${formatUtcBasicTimestamp(fixedTimestamp)}.bk`]);
  });

  test("conflict-only plans are not executable", () => {
    const plan: FileOperationPlan = {
      command: "install",
      harness: "codex",
      target: targetRoot,
      resolvedVersion,
      manifestPath: INSTALLER_MANIFEST_PATH,
      operations: [{ kind: "conflict", path: "AGENTS.md", class: "shared", reason: "shared-file-changed" }],
      canApply: true,
      requiresConfirmation: false,
    };

    expect(validateFileOperationPlan(plan)).toContain("conflict operations require canApply:false");
  });

  test("copy operations require sourcePath and sourceMd5", () => {
    const plan: FileOperationPlan = {
      command: "install",
      harness: "codex",
      target: targetRoot,
      resolvedVersion,
      manifestPath: INSTALLER_MANIFEST_PATH,
      operations: [{ kind: "add", path: "AGENTS.md", class: "shared", sourcePath: "", sourceMd5: "" }],
      canApply: true,
      requiresConfirmation: false,
    };

    expect(validateFileOperationPlan(plan)).toContain("add for AGENTS.md requires sourcePath and sourceMd5");
  });
});
