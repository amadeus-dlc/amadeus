// covers: modules:setup-transaction-coordinator
// size: medium

import { createHash } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "bun:test";
import { Manifest } from "../../packages/setup/src/domain/manifest.ts";
import type { Plan, PlanEntry } from "../../packages/setup/src/domain/plan.ts";
import { SetupTransactionCoordinator, type TransactionIoEvent } from "../../packages/setup/src/modules/setup-transaction-coordinator.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(): { root: string; target: string; source: string; privateRoot: string } {
  const root = mkdtempSync(join(tmpdir(), "amadeus-setup-tx-test-"));
  roots.push(root);
  const target = join(root, "project");
  const source = join(root, "payload");
  const privateRoot = join(root, ".private-installer");
  mkdirSync(target);
  mkdirSync(source);
  return { root, target, source, privateRoot };
}

function md5(value: string): string {
  return createHash("md5").update(value).digest("hex");
}

function entry(path: string, content: string, action: PlanEntry["action"] = "update"): PlanEntry {
  return { path, action, class: path.startsWith("amadeus-") ? "owned" : "shared", forced: true, md5: md5(content), required: true };
}

function plan(source: string, entries: readonly PlanEntry[]): Plan {
  return {
    startedAtIso: "2026-08-04T00:00:00.000Z",
    backupTimestamp: "20260804T000000Z",
    entries: () => entries,
    entriesBy: (action) => entries.filter((item) => item.action === action),
    hasConflicts: () => entries.some((item) => item.action === "conflict"),
    isNoop: () => entries.every((item) => item.action === "skip"),
    summary: () => ({
      add: entries.filter((item) => item.action === "add").length,
      update: entries.filter((item) => item.action === "update").length,
      skip: entries.filter((item) => item.action === "skip").length,
      backup: entries.filter((item) => item.action === "backup").length,
      conflict: entries.filter((item) => item.action === "conflict").length,
    }),
    harnessRoot: () => source,
    onboardingNotices: () => [],
  };
}

function manifest(entries: readonly PlanEntry[]): Manifest {
  const parsed = Manifest.parse({
    schemaVersion: 1,
    installerPackageVersion: "0.1.7",
    distributionVersion: "1.2.3",
    sourceTag: "v1.2.3",
    installedAt: "2026-08-04T00:00:00.000Z",
    harness: "claude",
    files: entries.map((item) => ({ path: item.path, class: item.class, required: item.required, md5: item.md5 })),
  });
  if (parsed.type === "err") throw new Error(JSON.stringify(parsed.error));
  return parsed.value;
}

function writeInstalledManifest(target: string, entries: readonly PlanEntry[]): void {
  const path = join(target, "amadeus", ".installer", "amadeus-setup-manifest.json");
  mkdirSync(join(target, "amadeus", ".installer"), { recursive: true });
  writeFileSync(path, `${JSON.stringify(manifest(entries).toJSON(), null, 2)}\n`);
}

describe("SetupTransactionCoordinator", () => {
  test("commits managed files and manifest together while retaining the captured inode in private 0600 storage", async () => {
    const { target, source, privateRoot } = fixture();
    mkdirSync(join(target, "config"));
    mkdirSync(join(source, "config"));
    writeFileSync(join(target, "config", "settings.json"), "old-secret\n");
    writeFileSync(join(source, "config", "settings.json"), "new\n");
    const before = lstatSync(join(target, "config", "settings.json"));
    const entries = [entry("config/settings.json", "new\n", "backup")];

    const result = await SetupTransactionCoordinator.create({ privateRoot: () => privateRoot }).apply(
      plan(source, entries),
      target,
      manifest(entries),
    );

    expect(result.hasFailures()).toBe(false);
    expect(result.manifestFiles().type).toBe("ok");
    expect(readFileSync(join(target, "config", "settings.json"), "utf8")).toBe("new\n");
    expect(existsSync(join(target, "amadeus", ".installer", "amadeus-setup-manifest.json"))).toBe(true);
    expect(readdirSync(join(target, "config"))).toEqual(["settings.json"]);
    const transactionDirs = readdirSync(join(privateRoot, "committed"));
    expect(transactionDirs).toHaveLength(1);
    const backupFiles = readdirSync(join(privateRoot, "committed", transactionDirs[0] as string)).filter((name) => name.endsWith(".bin"));
    const retained = backupFiles
      .map((name) => join(privateRoot, "committed", transactionDirs[0] as string, name))
      .find((path) => readFileSync(path, "utf8") === "old-secret\n");
    expect(retained).toBeDefined();
    if (retained !== undefined) {
      expect(lstatSync(retained).ino).toBe(before.ino);
      expect(lstatSync(retained).mode & 0o077).toBe(0);
    }
    expect(lstatSync(privateRoot).mode & 0o077).toBe(0);
  });

  test("installs a diverted onboarding doc from its payload path and leaves the user's own file untouched (#3388)", async () => {
    const { target, source, privateRoot } = fixture();
    // The rung-2 shape: the payload ships CLAUDE.md, the target already owns
    // one, so the plan's destination is CLAUDE-AMADEUS.md with sourcePath set.
    writeFileSync(join(target, "CLAUDE.md"), "the user's own instructions\n");
    writeFileSync(join(source, "CLAUDE.md"), "shipped onboarding doc\n");
    const entries = [{ ...entry("CLAUDE-AMADEUS.md", "shipped onboarding doc\n", "add"), sourcePath: "CLAUDE.md" }];

    const result = await SetupTransactionCoordinator.create({ privateRoot: () => privateRoot }).apply(
      plan(source, entries),
      target,
      manifest(entries),
    );

    expect(result.hasFailures()).toBe(false);
    expect(readFileSync(join(target, "CLAUDE-AMADEUS.md"), "utf8")).toBe("shipped onboarding doc\n");
    expect(readFileSync(join(target, "CLAUDE.md"), "utf8")).toBe("the user's own instructions\n");
    // Nothing was captured, so no backup transaction dir holds a payload file.
    expect(readdirSync(join(privateRoot, "committed"))).toHaveLength(1);
  });

  test("derives a private root by default and recovers an idle target", async () => {
    const { root, target, source } = fixture();
    writeFileSync(join(source, "amadeus-tool.ts"), "new\n");
    const entries = [entry("amadeus-tool.ts", "new\n", "add")];
    const coordinator = SetupTransactionCoordinator.create();

    const result = await coordinator.apply(plan(source, entries), target, manifest(entries));

    expect(result.hasFailures()).toBe(false);
    expect(readdirSync(root).some((name) => name.startsWith(".amadeus-installer-private-"))).toBe(true);
    expect(await coordinator.recover(target)).toEqual([]);
  });

  test("returns a classified recovery failure when the target parent is absent", async () => {
    const { root, privateRoot } = fixture();
    const missingTarget = join(root, "missing-parent", "project");

    const failures = await SetupTransactionCoordinator.create({ privateRoot: () => privateRoot }).recover(missingTarget);

    expect(failures).toHaveLength(1);
    expect(failures[0]?.operation).toBe("journal");
  });

  test("a failure immediately before candidate installation rolls back the captured original", async () => {
    const { target, source, privateRoot } = fixture();
    writeFileSync(join(target, "amadeus-tool.ts"), "old\n");
    writeFileSync(join(source, "amadeus-tool.ts"), "new\n");
    const entries = [entry("amadeus-tool.ts", "new\n")];
    let injected = false;
    const beforeIo = (event: TransactionIoEvent): void => {
      if (!injected && event.operation === "link-no-clobber" && event.path.includes("amadeus-tool.ts")) {
        injected = true;
        throw new Error(`injected at ${event.ordinal}`);
      }
    };

    const result = await SetupTransactionCoordinator.create({ privateRoot: () => privateRoot, beforeIo }).apply(
      plan(source, entries),
      target,
      manifest(entries),
    );

    expect(injected).toBe(true);
    expect(result.hasFailures()).toBe(true);
    expect(readFileSync(join(target, "amadeus-tool.ts"), "utf8")).toBe("old\n");
    expect(existsSync(join(target, "amadeus", ".installer", "amadeus-setup-manifest.json"))).toBe(false);
    expect(readdirSync(join(privateRoot, "active"))).toEqual([]);
  });

  test("publishes lock metadata atomically so a pre-publication crash remains retryable", async () => {
    const sample = fixture();
    writeFileSync(join(sample.source, "amadeus-tool.ts"), "new\n");
    const entries = [entry("amadeus-tool.ts", "new\n", "add")];
    const failed = await SetupTransactionCoordinator.create({
      privateRoot: () => sample.privateRoot,
      beforeIo: (event) => {
        if (event.operation === "lock-publish") throw new Error("crash before lock publication");
      },
    }).apply(plan(sample.source, entries), sample.target, manifest(entries));

    expect(failed.hasFailures()).toBe(true);
    expect(existsSync(join(sample.privateRoot, "lock"))).toBe(false);
    const retried = await SetupTransactionCoordinator.create({ privateRoot: () => sample.privateRoot }).apply(
      plan(sample.source, entries),
      sample.target,
      manifest(entries),
    );
    expect(retried.hasFailures()).toBe(false);
  });

  test("retries when another contender removes the same stale lock first", async () => {
    const sample = fixture();
    writeFileSync(join(sample.source, "amadeus-tool.ts"), "new\n");
    const entries = [entry("amadeus-tool.ts", "new\n", "add")];
    const lockDir = join(sample.privateRoot, "lock");
    mkdirSync(lockDir, { recursive: true, mode: 0o700 });
    chmodSync(sample.privateRoot, 0o700);
    chmodSync(lockDir, 0o700);
    const priorOwner = Bun.spawn([process.execPath, "-e", "process.exit(0)"], { stdout: "ignore", stderr: "ignore" });
    await priorOwner.exited;
    writeFileSync(join(lockDir, "owner.json"), `${JSON.stringify({ pid: priorOwner.pid })}\n`);
    chmodSync(join(lockDir, "owner.json"), 0o600);
    let removedByContender = false;

    const result = await SetupTransactionCoordinator.create({
      privateRoot: () => sample.privateRoot,
      beforeIo: (event) => {
        if (!removedByContender && event.operation === "remove-stale-lock-owner") {
          removedByContender = true;
          rmSync(lockDir, { recursive: true });
        }
      },
    }).apply(plan(sample.source, entries), sample.target, manifest(entries));

    expect(removedByContender, JSON.stringify(result.failures())).toBe(true);
    expect(result.hasFailures()).toBe(false);
  });

  test("reports both the apply and rollback failures without masking the original", async () => {
    const sample = fixture();
    writeFileSync(join(sample.target, "amadeus-tool.ts"), "old\n");
    writeFileSync(join(sample.source, "amadeus-tool.ts"), "new\n");
    const entries = [entry("amadeus-tool.ts", "new\n")];
    let applyFailed = false;
    const result = await SetupTransactionCoordinator.create({
      privateRoot: () => sample.privateRoot,
      beforeIo: (event) => {
        if (!applyFailed && event.operation === "link-no-clobber") {
          applyFailed = true;
          throw new Error("apply injection");
        }
        if (applyFailed && event.operation === "link-no-clobber") throw new Error("rollback injection");
      },
    }).apply(plan(sample.source, entries), sample.target, manifest(entries));

    expect(result.hasFailures()).toBe(true);
    expect(result.failures()[0]?.detail).toContain("apply injection");
    expect(result.failures()[0]?.detail).toContain("rollback also failed");
  });

  test("reports both the committed cleanup failure and its failed recovery", async () => {
    const sample = fixture();
    writeFileSync(join(sample.source, "amadeus-tool.ts"), "new\n");
    const entries = [entry("amadeus-tool.ts", "new\n", "add")];
    let cleanupAttempts = 0;
    const result = await SetupTransactionCoordinator.create({
      privateRoot: () => sample.privateRoot,
      beforeIo: (event) => {
        if (event.operation !== "unlink" || !event.path.includes("/staging/")) return;
        cleanupAttempts += 1;
        throw new Error(cleanupAttempts === 1 ? "initial cleanup injection" : "recovery cleanup injection");
      },
    }).apply(plan(sample.source, entries), sample.target, manifest(entries));

    expect(result.hasFailures()).toBe(true);
    expect(result.failures()[0]?.operation).toBe("recovery");
    expect(result.failures()[0]?.detail).toContain("initial cleanup injection");
    expect(result.failures()[0]?.detail).toContain("recovery cleanup injection");
  });

  test("every durability I/O ordinal leaves either the complete old state or the complete committed state", async () => {
    const baseline = fixture();
    writeFileSync(join(baseline.target, "amadeus-tool.ts"), "old\n");
    writeFileSync(join(baseline.source, "amadeus-tool.ts"), "new\n");
    const baselineEntries = [entry("amadeus-tool.ts", "new\n")];
    const events: TransactionIoEvent[] = [];
    const baselineResult = await SetupTransactionCoordinator.create({
      privateRoot: () => baseline.privateRoot,
      beforeIo: (event) => events.push(event),
    }).apply(plan(baseline.source, baselineEntries), baseline.target, manifest(baselineEntries));
    expect(baselineResult.hasFailures()).toBe(false);

    for (const eventToFail of events) {
      const sample = fixture();
      writeFileSync(join(sample.target, "amadeus-tool.ts"), "old\n");
      writeFileSync(join(sample.source, "amadeus-tool.ts"), "new\n");
      const entries = [entry("amadeus-tool.ts", "new\n")];
      let injected = false;
      const result = await SetupTransactionCoordinator.create({
        privateRoot: () => sample.privateRoot,
        beforeIo: (event) => {
          if (!injected && event.ordinal === eventToFail.ordinal) {
            injected = true;
            throw new Error(`failure at I/O ${event.ordinal} (${event.operation})`);
          }
        },
      }).apply(plan(sample.source, entries), sample.target, manifest(entries));
      expect(injected).toBe(true);
      const content = readFileSync(join(sample.target, "amadeus-tool.ts"), "utf8");
      const manifestExists = existsSync(join(sample.target, "amadeus", ".installer", "amadeus-setup-manifest.json"));
      expect(
        (content === "old\n" && !manifestExists) || (content === "new\n" && manifestExists),
        `ordinal ${eventToFail.ordinal} (${eventToFail.operation}) returned ${result.failures()[0]?.detail ?? "success"}`,
      ).toBe(true);
    }
  });

  test("case-fold and Unicode collisions fail before journal, staging, or payload mutation", async () => {
    for (const [left, right] of [
      ["Tool.ts", "tool.ts"],
      ["caf\u00e9.ts", "cafe\u0301.ts"],
    ] as const) {
      const { target, source, privateRoot } = fixture();
      writeFileSync(join(source, left), "one\n");
      writeFileSync(join(source, right), "two\n");
      const entries = [entry(left, "one\n", "add"), entry(right, "two\n", "add")];

      const result = await SetupTransactionCoordinator.create({ privateRoot: () => privateRoot }).apply(
        plan(source, entries),
        target,
        manifest(entries),
      );

      expect(result.hasFailures()).toBe(true);
      expect(result.failures()[0]?.operation).toBe("preflight");
      expect(readdirSync(target)).toEqual([]);
      expect(readdirSync(join(privateRoot, "active"))).toEqual([]);
      expect(readdirSync(source).every((name) => !name.startsWith(".amadeus-setup-manifest-"))).toBe(true);
    }
  });

  test("symlinks and permission-weakened private roots are rejected fail-closed", async () => {
    const symlinkCase = fixture();
    writeFileSync(join(symlinkCase.source, "amadeus-tool.ts"), "new\n");
    writeFileSync(join(symlinkCase.target, "outside"), "old\n");
    symlinkSync(join(symlinkCase.target, "outside"), join(symlinkCase.target, "amadeus-tool.ts"));
    const entries = [entry("amadeus-tool.ts", "new\n")];
    const symlinkResult = await SetupTransactionCoordinator.create({ privateRoot: () => symlinkCase.privateRoot }).apply(
      plan(symlinkCase.source, entries),
      symlinkCase.target,
      manifest(entries),
    );
    expect(symlinkResult.hasFailures()).toBe(true);
    expect(readFileSync(join(symlinkCase.target, "outside"), "utf8")).toBe("old\n");

    const permissionsCase = fixture();
    mkdirSync(permissionsCase.privateRoot, { mode: 0o755 });
    chmodSync(permissionsCase.privateRoot, 0o755);
    writeFileSync(join(permissionsCase.source, "amadeus-tool.ts"), "new\n");
    const permissionsResult = await SetupTransactionCoordinator.create({ privateRoot: () => permissionsCase.privateRoot }).apply(
      plan(permissionsCase.source, entries),
      permissionsCase.target,
      manifest(entries),
    );
    expect(permissionsResult.hasFailures()).toBe(true);
    expect(permissionsResult.failures()[0]?.detail).toContain("0700");
  });

  test("retires a removed owned resource only when its bytes still match the prior manifest", async () => {
    const { target, source, privateRoot } = fixture();
    const retired = entry("amadeus-retired.ts", "managed\n");
    writeFileSync(join(target, retired.path), "managed\n");
    writeInstalledManifest(target, [retired]);

    const result = await SetupTransactionCoordinator.create({ privateRoot: () => privateRoot }).apply(
      plan(source, []),
      target,
      manifest([]),
    );

    expect(result.hasFailures()).toBe(false);
    expect(existsSync(join(target, retired.path))).toBe(false);
  });

  test("preserves a modified owned resource retired by the next catalog", async () => {
    const { target, source, privateRoot } = fixture();
    const retired = entry("amadeus-retired.ts", "managed\n");
    writeFileSync(join(target, retired.path), "user-modified\n");
    writeInstalledManifest(target, [retired]);

    const result = await SetupTransactionCoordinator.create({ privateRoot: () => privateRoot }).apply(
      plan(source, []),
      target,
      manifest([]),
    );

    expect(result.hasFailures()).toBe(false);
    expect(readFileSync(join(target, retired.path), "utf8")).toBe("user-modified\n");
  });
});
