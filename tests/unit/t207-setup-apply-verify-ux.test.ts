// covers: package:@amadeus-dlc/setup, installer:apply-verify-ux, requirements:FR-005, requirements:FR-008, requirements:FR-009, requirements:FR-010, requirements:FR-011, requirements:FR-013, requirements:FR-014, stories:US-002, stories:US-003, stories:US-004, stories:US-005, stories:US-006, stories:US-007, stories:US-011

import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { executePlannedSetup } from "../../packages/setup/src/application/planned-setup.ts";
import { resolveSetupDeps, type SetupServiceDeps } from "../../packages/setup/src/application/setup-deps.ts";
import { FailingManifestStore } from "../../packages/setup/src/adapters/manifest-store.ts";
import { noWriteNextAction, noWriteReasonMessage, renderError, renderPlan, renderResult } from "../../packages/setup/src/cli/reporter.ts";
import type { SetupCommand } from "../../packages/setup/src/cli/types.ts";
import { applyPlan } from "../../packages/setup/src/domain/file-applier.ts";
import { formatUtcBasicTimestamp } from "../../packages/setup/src/domain/backup-planner.ts";
import { buildInstallerManifest } from "../../packages/setup/src/domain/manifest-builder.ts";
import { planInstall } from "../../packages/setup/src/domain/operation-planner.ts";
import type { FileOperation, FileOperationPlan } from "../../packages/setup/src/domain/plan-types.ts";
import { CANONICAL_SOURCE_REPO, type DistributionFile, type LoadedDistribution, type ResolvedVersion } from "../../packages/setup/src/domain/source-types.ts";
import { verifyInstallation } from "../../packages/setup/src/domain/verifier.ts";
import { INSTALLER_MANIFEST_PATH, type InstallerManifest } from "../../packages/setup/src/domain/target-types.ts";
import type { PromptPort } from "../../packages/setup/src/ports/target-state.ts";
import { FakeTargetFiles } from "../helpers/setup/fake-ports.ts";

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

function loadedDistribution(files: DistributionFile[]): LoadedDistribution {
  return {
    root: "/tmp/source-dist",
    harness: "codex",
    resolvedVersion,
    files: files.map((file) => ({ path: file.path, absolutePath: `/tmp/source-dist/${file.path}`, md5: file.md5 })),
  };
}

function installCommand(overrides: Partial<SetupCommand> = {}): SetupCommand {
  return { command: "install", target: targetRoot, harness: "codex", version: undefined, yes: false, force: false, ...overrides };
}

function basePlan(operations: FileOperation[], overrides: Partial<FileOperationPlan> = {}): FileOperationPlan {
  return {
    command: "install",
    harness: "codex",
    target: targetRoot,
    resolvedVersion,
    manifestPath: INSTALLER_MANIFEST_PATH,
    operations,
    canApply: true,
    requiresConfirmation: false,
    ...overrides,
  };
}

async function runPlannedSetup(input: {
  command: SetupCommand;
  plan: FileOperationPlan;
  metadata: DistributionFile[];
  deps?: SetupServiceDeps;
}) {
  return executePlannedSetup({
    command: input.command,
    plan: input.plan,
    metadata: input.metadata,
    deps: resolveSetupDeps(input.deps ?? {}),
  });
}

describe("U5 file applier", () => {
  test("executes operations in plan order without recalculating policy", async () => {
    const files = new FakeTargetFiles();
    files.addExisting(join(targetRoot, "AGENTS.md"));
    const timestamp = formatUtcBasicTimestamp(fixedTimestamp);
    const backupPath = `AGENTS.md.${timestamp}.bk`;
    const plan = basePlan([
      { kind: "backup", path: "AGENTS.md", backupPath, reason: "shared-file-changed" },
      { kind: "force-update", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/source-dist/AGENTS.md", sourceMd5: md5("new"), backupPath },
      { kind: "add", path: ".codex/config.toml", class: "shared", sourcePath: "/tmp/source-dist/.codex/config.toml", sourceMd5: md5("config") },
    ]);

    const result = await applyPlan(plan, { targetRoot, files });

    expect(result.ok).toBe(true);
    expect(files.backupCalls).toEqual([{ sourcePath: join(targetRoot, "AGENTS.md"), backupPath: join(targetRoot, backupPath) }]);
    expect(files.copyCalls).toEqual([
      { sourcePath: "/tmp/source-dist/AGENTS.md", destinationPath: join(targetRoot, "AGENTS.md") },
      { sourcePath: "/tmp/source-dist/.codex/config.toml", destinationPath: join(targetRoot, ".codex/config.toml") },
    ]);
    expect(result.manifestWrite).toBe("not-started");
  });

  test("canApply false is rejected as an invariant violation", async () => {
    const files = new FakeTargetFiles();
    await expect(applyPlan(basePlan([], { canApply: false }), { targetRoot, files })).rejects.toThrow("canApply:true");
    expect(files.copyCalls).toEqual([]);
    expect(files.backupCalls).toEqual([]);
  });

  test("conflict operations are not executed", async () => {
    const files = new FakeTargetFiles();
    const plan = basePlan([{ kind: "conflict", path: "AGENTS.md", class: "shared", reason: "shared-file-changed" }]);
    const result = await applyPlan(plan, { targetRoot, files });
    expect(result.ok).toBe(true);
    expect(result.applied).toEqual([]);
    expect(files.copyCalls).toEqual([]);
  });

  test("backup failure stops before dependent copy and leaves manifest not-started", async () => {
    const files = new FakeTargetFiles();
    files.addExisting(join(targetRoot, "AGENTS.md"));
    const backupPath = `AGENTS.md.${formatUtcBasicTimestamp(fixedTimestamp)}.bk`;
    files.failBackup(join(targetRoot, backupPath));
    const plan = basePlan([
      { kind: "backup", path: "AGENTS.md", backupPath, reason: "shared-file-changed" },
      { kind: "update", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/source-dist/AGENTS.md", sourceMd5: md5("new") },
    ]);

    const result = await applyPlan(plan, { targetRoot, files });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failedPhase).toBe("backup");
      expect(result.manifestWrite).toBe("not-started");
    }
    expect(files.copyCalls).toEqual([]);
  });

  test("copy failure reports partial apply diagnostics", async () => {
    const files = new FakeTargetFiles();
    files.failCopy(join(targetRoot, ".codex/config.toml"));
    const plan = basePlan([
      { kind: "add", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/source-dist/AGENTS.md", sourceMd5: md5("agents") },
      { kind: "add", path: ".codex/config.toml", class: "shared", sourcePath: "/tmp/source-dist/.codex/config.toml", sourceMd5: md5("config") },
    ]);

    const result = await applyPlan(plan, { targetRoot, files });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failedPhase).toBe("copy");
      expect(result.applied).toHaveLength(1);
      expect(result.manifestWrite).toBe("not-started");
    }
  });
});

describe("U5 reporter", () => {
  test("renderPlan uses Operation Files Example columns from plan operations", () => {
    const timestamp = formatUtcBasicTimestamp(fixedTimestamp);
    const plan = basePlan([
      { kind: "add", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/source-dist/AGENTS.md", sourceMd5: md5("agents") },
      { kind: "backup", path: "AGENTS.md", backupPath: `AGENTS.md.${timestamp}.bk`, reason: "shared-file-changed" },
      { kind: "force-update", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/source-dist/AGENTS.md", sourceMd5: md5("new"), backupPath: `AGENTS.md.${timestamp}.bk` },
    ]);

    const rendered = renderPlan(plan);

    expect(rendered).toContain("| Operation | Files | Example |");
    expect(rendered).toContain("| add | 1 | AGENTS.md |");
    expect(rendered).toContain(`| backup | 1 | AGENTS.md -> AGENTS.md.${timestamp}.bk |`);
    expect(rendered).toContain("| force-update | 1 | AGENTS.md (force) |");
  });

  test("classified errors include reason, no-change guarantee, and next action", () => {
    const rendered = renderError({
      code: "plan-no-write",
      message: noWriteReasonMessage("non-interactive-collision"),
      noFilesModified: true,
      nextAction: noWriteNextAction("non-interactive-collision"),
    });

    expect(rendered).toContain("Code: plan-no-write");
    expect(rendered).toContain("No files were modified.");
    expect(rendered).toContain("Next action:");
    expect(rendered).toContain("--force");
  });

  test("renderResult shows backup paths in final output", () => {
    const timestamp = formatUtcBasicTimestamp(fixedTimestamp);
    const backupPath = `AGENTS.md.${timestamp}.bk`;
    const plan = basePlan([
      { kind: "backup", path: "AGENTS.md", backupPath, reason: "shared-file-changed" },
      { kind: "force-update", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/source-dist/AGENTS.md", sourceMd5: md5("new"), backupPath },
    ]);
    const rendered = renderResult({
      exitCode: 0,
      prependPlan: false,
      plan,
      applyResult: {
        ok: true,
        applied: plan.operations,
        backups: [{ path: "AGENTS.md", backupPath }],
        manifestWrite: "written",
        diagnostics: [],
      },
      verificationResult: { ok: true, checks: [{ name: "tools directory present", status: "passed" }] },
    });

    expect(rendered).toContain(`AGENTS.md -> ${backupPath}`);
    expect(rendered).toContain("Installed Amadeus.");
  });
});

describe("U5 manifest and verification", () => {
  test("manifest builder uses plan version and metadata files", () => {
    const metadata = [distributionFile("AGENTS.md", { content: "agents" })];
    const plan = basePlan([]);
    const manifest = buildInstallerManifest({
      plan,
      metadata,
      installerPackageVersion: "0.0.0",
      installedAt: "2026-07-07T00:00:00.000Z",
    });

    expect(manifest.distributionVersion).toBe("1.2.3");
    expect(manifest.files).toEqual(metadata);
  });

  test("verification checks manifest entries and readiness paths", async () => {
    const metadata = [distributionFile("AGENTS.md", { content: "agents" })];
    const files = new FakeTargetFiles();
    files.addExisting(join(targetRoot, "AGENTS.md"));
    files.addExisting(join(targetRoot, ".codex"));
    files.addExisting(join(targetRoot, ".codex/tools"));
    files.addExisting(join(targetRoot, "amadeus/spaces/default/memory"));

    const manifest: InstallerManifest = {
      schemaVersion: 1,
      installerPackageVersion: "0.0.0",
      distributionVersion: "1.2.3",
      sourceTag: "v1.2.3",
      installedAt: "2026-07-07T00:00:00.000Z",
      harness: "codex",
      files: metadata,
    };

    const result = await verifyInstallation({ target: targetRoot, harness: "codex", manifest, files });

    expect(result.ok).toBe(true);
    expect(files.existsCalls).toContain(join(targetRoot, "AGENTS.md"));
    expect(files.existsCalls).toContain(join(targetRoot, ".codex"));
    expect(files.existsCalls).toContain(join(targetRoot, ".codex/tools"));
    expect(files.existsCalls).toContain(join(targetRoot, "amadeus/spaces/default/memory"));
  });

  test("verification failure reports named failed checks", async () => {
    const metadata = [distributionFile("AGENTS.md", { content: "agents" })];
    const files = new FakeTargetFiles();
    files.addExisting(join(targetRoot, "AGENTS.md"));
    files.addExisting(join(targetRoot, ".codex"));
    const manifest: InstallerManifest = {
      schemaVersion: 1,
      installerPackageVersion: "0.0.0",
      distributionVersion: "1.2.3",
      sourceTag: "v1.2.3",
      installedAt: "2026-07-07T00:00:00.000Z",
      harness: "codex",
      files: metadata,
    };

    const result = await verifyInstallation({ target: targetRoot, harness: "codex", manifest, files });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.checks.some((check) => check.name === "tools directory present" && check.status === "failed")).toBe(true);
    }
  });

  test("fresh install tolerates absent runtime state and intent paths", async () => {
    const metadata = [distributionFile("AGENTS.md", { content: "agents" })];
    const files = new FakeTargetFiles();
    files.addExisting(join(targetRoot, "AGENTS.md"));
    files.addExisting(join(targetRoot, ".codex"));
    files.addExisting(join(targetRoot, ".codex/tools"));
    files.addExisting(join(targetRoot, "amadeus/spaces/default/memory"));
    const manifest: InstallerManifest = {
      schemaVersion: 1,
      installerPackageVersion: "0.0.0",
      distributionVersion: "1.2.3",
      sourceTag: "v1.2.3",
      installedAt: "2026-07-07T00:00:00.000Z",
      harness: "codex",
      files: metadata,
    };

    const result = await verifyInstallation({ target: targetRoot, harness: "codex", manifest, files });

    expect(result.ok).toBe(true);
    expect(files.existsCalls.some((path) => path.includes("amadeus-state.md") || path.includes("/intents/"))).toBe(false);
  });
});

describe("U5 service orchestration", () => {
  test("declined confirmation leaves target unchanged", async () => {
    const writable = new FakeTargetFiles();
    const metadata = [distributionFile("AGENTS.md", { content: "new-agents" })];
    const timestamp = formatUtcBasicTimestamp(fixedTimestamp);
    const backupPath = `AGENTS.md.${timestamp}.bk`;
    const plan = basePlan(
      [
        { kind: "backup", path: "AGENTS.md", backupPath, reason: "shared-file-unknown-md5" },
        { kind: "update", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/source-dist/AGENTS.md", sourceMd5: md5("new-agents"), backupPath },
      ],
      { requiresConfirmation: true, confirmationReason: "shared-file-collision" },
    );
    const promptPort: PromptPort = {
      chooseHarness() {
        return "codex";
      },
      confirmApply() {
        return { apply: false, reason: "declined" };
      },
    };

    const result = await runPlannedSetup({
      command: installCommand(),
      plan,
      metadata,
      deps: { targetWritableFiles: writable, promptPort },
    });

    expect(result.exitCode).toBe(2);
    expect(result.classifiedError?.code).toBe("apply-declined");
    expect(result.classifiedError?.noFilesModified).toBe(true);
    expect(writable.copyCalls).toEqual([]);
    expect(writable.backupCalls).toEqual([]);
    expect(renderResult(result)).toContain("No files were modified.");
  });

  test("--yes with conflict and no force renders no-write without mutation", async () => {
    const writable = new FakeTargetFiles();
    const plan = basePlan(
      [{ kind: "conflict", path: "AGENTS.md", class: "shared", reason: "shared-file-changed" }],
      { canApply: false, noWriteReason: "non-interactive-collision" },
    );
    let confirmCalled = false;
    const promptPort: PromptPort = {
      chooseHarness() {
        return "codex";
      },
      confirmApply() {
        confirmCalled = true;
        return { apply: true };
      },
    };

    const result = await runPlannedSetup({
      command: installCommand({ yes: true }),
      plan,
      metadata: [distributionFile("AGENTS.md", { content: "agents" })],
      deps: { targetWritableFiles: writable, promptPort },
    });

    expect(result.exitCode).toBe(2);
    expect(result.classifiedError?.code).toBe("plan-no-write");
    expect(confirmCalled).toBe(false);
    expect(writable.copyCalls).toEqual([]);
    expect(renderResult(result)).toContain("| conflict | 1 |");
  });

  test("--force plan executes backup before force-update through service", async () => {
    const writable = new FakeTargetFiles();
    writable.addExisting(join(targetRoot, "AGENTS.md"));
    const metadata = [distributionFile("AGENTS.md", { content: "new-agents" })];
    const timestamp = formatUtcBasicTimestamp(fixedTimestamp);
    const backupPath = `AGENTS.md.${timestamp}.bk`;
    const plan = basePlan([
      { kind: "backup", path: "AGENTS.md", backupPath, reason: "shared-file-changed" },
      { kind: "force-update", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/source-dist/AGENTS.md", sourceMd5: md5("new-agents"), backupPath },
    ]);
    const readonly = new FakeTargetFiles();
    readonly.addExisting(join(targetRoot, "AGENTS.md"));
    readonly.addExisting(join(targetRoot, ".codex"));
    readonly.addExisting(join(targetRoot, ".codex/tools"));
    readonly.addExisting(join(targetRoot, "amadeus/spaces/default/memory"));

    const result = await runPlannedSetup({
      command: installCommand({ yes: true, force: true }),
      plan,
      metadata,
      deps: { targetWritableFiles: writable, targetFiles: readonly },
    });

    expect(result.exitCode).toBe(0);
    expect(writable.backupCalls[0]).toEqual({
      sourcePath: join(targetRoot, "AGENTS.md"),
      backupPath: join(targetRoot, backupPath),
    });
    expect(writable.copyCalls[0]?.sourcePath).toBe("/tmp/source-dist/AGENTS.md");
    expect(writable.writeCalls.some((call) => call.path === join(targetRoot, INSTALLER_MANIFEST_PATH))).toBe(true);
  });

  test("manifest write failure exits non-zero and reports applied files", async () => {
    const writable = new FakeTargetFiles();
    const metadata = [distributionFile("AGENTS.md", { content: "agents" })];
    const plan = basePlan([{ kind: "add", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/source-dist/AGENTS.md", sourceMd5: md5("agents") }]);
    const readonly = new FakeTargetFiles();
    readonly.addExisting(join(targetRoot, "AGENTS.md"));

    const result = await runPlannedSetup({
      command: installCommand({ yes: true }),
      plan,
      metadata,
      deps: {
        targetWritableFiles: writable,
        targetFiles: readonly,
        manifestStore: new FailingManifestStore("disk full"),
      },
    });

    expect(result.exitCode).toBe(1);
    expect(result.classifiedError?.code).toBe("manifest-write-failed");
    expect(result.classifiedError?.noFilesModified).toBe(false);
    expect(result.applyResult?.ok).toBe(true);
    expect(renderResult(result)).toContain("| add | 1 | AGENTS.md |");
  });

  test("verification failure exits non-zero with failed check names", async () => {
    const writable = new FakeTargetFiles();
    const metadata = [distributionFile("AGENTS.md", { content: "agents" })];
    const plan = basePlan([{ kind: "add", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/source-dist/AGENTS.md", sourceMd5: md5("agents") }]);
    const readonly = new FakeTargetFiles();
    readonly.addExisting(join(targetRoot, "AGENTS.md"));
    readonly.addExisting(join(targetRoot, ".codex"));

    const result = await runPlannedSetup({
      command: installCommand({ yes: true }),
      plan,
      metadata,
      deps: { targetWritableFiles: writable, targetFiles: readonly },
    });

    expect(result.exitCode).toBe(1);
    expect(result.classifiedError?.code).toBe("verification-failed");
    expect(renderResult(result)).toContain("failed check: tools directory present");
  });

  test("prompt adapter is not called when prompts are disallowed", async () => {
    let confirmCalled = false;
    const promptPort: PromptPort = {
      chooseHarness() {
        return "codex";
      },
      confirmApply() {
        confirmCalled = true;
        return { apply: true };
      },
    };
    const plan = basePlan([], { requiresConfirmation: true, confirmationReason: "shared-file-collision" });

    await runPlannedSetup({
      command: installCommand({ yes: true }),
      plan,
      metadata: [distributionFile("AGENTS.md", { content: "agents" })],
      deps: { promptPort, targetWritableFiles: new FakeTargetFiles(), stdinIsTTY: true },
    });

    expect(confirmCalled).toBe(false);
  });

  test("successful apply renders plan before applying output", async () => {
    const plan = basePlan([{ kind: "add", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/src/AGENTS.md", sourceMd5: md5("agents") }]);
    const writable = new FakeTargetFiles();
    const readonly = new FakeTargetFiles();
    readonly.addExisting(join(targetRoot, ".codex"));
    readonly.addExisting(join(targetRoot, ".agents"));
    readonly.addExisting(join(targetRoot, "amadeus", "spaces", "default", "memory"));

    const result = await runPlannedSetup({
      command: installCommand({ yes: true }),
      plan,
      metadata: [distributionFile("AGENTS.md", { content: "agents" })],
      deps: { targetWritableFiles: writable, targetFiles: readonly, stdinIsTTY: false },
    });
    const rendered = `${renderPlan(plan)}\n\n${renderResult(result, { omitPlan: result.prependPlan })}`;

    expect(rendered.indexOf("Plan:")).toBeLessThan(rendered.indexOf("Applying plan... done"));
  });

  test("interactive confirmation uses prompt port when stdin is a TTY", async () => {
    let confirmCalled = false;
    const promptPort: PromptPort = {
      chooseHarness() {
        return "codex";
      },
      async confirmApply() {
        confirmCalled = true;
        return { apply: true };
      },
    };
    const plan = basePlan([{ kind: "add", path: "AGENTS.md", class: "shared", sourcePath: "/tmp/src/AGENTS.md", sourceMd5: md5("agents") }], {
      requiresConfirmation: true,
      confirmationReason: "shared-file-collision",
    });

    await runPlannedSetup({
      command: installCommand({ yes: false }),
      plan,
      metadata: [distributionFile("AGENTS.md", { content: "agents" })],
      deps: { promptPort, targetWritableFiles: new FakeTargetFiles(), stdinIsTTY: true },
    });

    expect(confirmCalled).toBe(true);
  });

  test("planner-generated force plan keeps backup before force-update ordering", () => {
    const metadata = [distributionFile("AGENTS.md", { content: "new-agents" })];
    const plan = planInstall({
      command: installCommand({ yes: true, force: true }),
      mode: "non-interactive",
      harness: "codex",
      target: targetRoot,
      distribution: loadedDistribution(metadata),
      metadata,
      targetDetection: {
        state: "manual-or-unknown",
        target: targetRoot,
        inferredHarness: "codex",
        diagnostics: {
          manifestRead: { status: "absent", reasonCode: "manifest-absent", manifestPath: INSTALLER_MANIFEST_PATH },
          sentinelMatches: [],
        },
      },
      targetSnapshot: {
        target: targetRoot,
        detection: {
          state: "manual-or-unknown",
          target: targetRoot,
          inferredHarness: "codex",
          diagnostics: {
            manifestRead: { status: "absent", reasonCode: "manifest-absent", manifestPath: INSTALLER_MANIFEST_PATH },
            sentinelMatches: [],
          },
        },
        existingFiles: [{ path: "AGENTS.md", exists: true, md5: md5("local-agents") }],
        diagnostics: { expectedFileCount: 1, unknownMd5Count: 0, unreadableFiles: [] },
      },
      operationTimestamp: fixedTimestamp,
      backupPathExists: () => false,
    });

    expect(plan.operations.map((operation) => operation.kind)).toEqual(["backup", "force-update"]);
    expect(renderPlan(plan)).toContain("| backup | 1 |");
    expect(renderPlan(plan)).toContain("| force-update | 1 | AGENTS.md (force) |");
  });
});
