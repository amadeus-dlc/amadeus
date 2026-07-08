// covers: modules:setup-applier
//
// Applier.create(fsWrite).apply — backup/overwrite/skip/conflict dispositions
// and fail-fast on the first failure (REL-I01), against a fake ApplyWrite so
// failure injection is deterministic. SEC-I01's target-escape rejection is
// covered against a real path (Result-based, not a fake-port concern).

import { describe, expect, test } from "bun:test";
import { Applier } from "../../packages/setup/src/modules/applier.ts";
import type { ApplyWrite } from "../../packages/setup/src/ports/apply-write.ts";
import { Result } from "../../packages/setup/src/shared/result.ts";
import type { PlanEntry } from "../../packages/setup/src/domain/plan.ts";
import type { Plan } from "../../packages/setup/src/domain/plan.ts";

function entry(overrides: Partial<PlanEntry> & Pick<PlanEntry, "path" | "action" | "class">): PlanEntry {
  return Object.freeze({
    forced: false,
    md5: "irrelevant",
    required: false,
    ...overrides,
  });
}

function fakePlan(entries: readonly PlanEntry[], backupTimestamp = "20260708T120000Z"): Plan {
  return {
    startedAtIso: "2026-07-08T12:00:00.000Z",
    backupTimestamp,
    entries: () => entries,
    entriesBy: (action) => entries.filter((e) => e.action === action),
    hasConflicts: () => entries.some((e) => e.action === "conflict"),
    isNoop: () => entries.every((e) => e.action === "skip"),
    summary: () => ({
      add: entries.filter((e) => e.action === "add").length,
      update: entries.filter((e) => e.action === "update").length,
      skip: entries.filter((e) => e.action === "skip").length,
      backup: entries.filter((e) => e.action === "backup").length,
      conflict: entries.filter((e) => e.action === "conflict").length,
    }),
    // Review correction 2: Applier now rebuilds each entry's source path from
    // Plan.harnessRoot() instead of a PlanEntry.source field.
    harnessRoot: () => "/fixture-source",
  };
}

function fakeApplyWrite(overrides: Partial<ApplyWrite> = {}): { port: ApplyWrite; calls: string[] } {
  const calls: string[] = [];
  const existing = new Set<string>();
  const port: ApplyWrite = {
    async exists(path) {
      return existing.has(path);
    },
    async mkdir(path) {
      calls.push(`mkdir:${path}`);
      return Result.ok(undefined);
    },
    async copyFile(src, dest) {
      calls.push(`copy:${src}->${dest}`);
      existing.add(dest);
      return Result.ok(undefined);
    },
    async backup(path, backupPath) {
      calls.push(`backup:${path}->${backupPath}`);
      existing.delete(path);
      existing.add(backupPath);
      return Result.ok(undefined);
    },
    ...overrides,
  };
  return { port, calls };
}

describe("Applier.apply — dispositions", () => {
  test("'add' and 'update' entries are copied without a backup", async () => {
    const { port, calls } = fakeApplyWrite();
    const plan = fakePlan([
      entry({ path: "amadeus-tool.ts", action: "add", class: "owned" }),
      entry({ path: "amadeus-tool2.ts", action: "update", class: "owned", forced: true }),
    ]);
    const result = await Applier.create(port).apply(plan, "/target");
    expect(result.hasFailures()).toBe(false);
    expect(result.appliedEntries().length).toBe(2);
    expect(result.backupPaths()).toEqual([]);
    expect(calls.some((c) => c.startsWith("backup:"))).toBe(false);
  });

  test("edge case: the copy source is rebuilt from Plan.harnessRoot() + entry.path (review correction 2)", async () => {
    const { port, calls } = fakeApplyWrite();
    const plan = fakePlan([entry({ path: "amadeus-tool.ts", action: "add", class: "owned" })]);
    await Applier.create(port).apply(plan, "/target");
    expect(calls.some((c) => c.startsWith(`copy:${plan.harnessRoot()}/amadeus-tool.ts->`))).toBe(true);
  });

  test("'backup' entries are backed up (only when the destination exists) then copied", async () => {
    const { port, calls } = fakeApplyWrite();
    const plan = fakePlan([entry({ path: "settings.json", action: "backup", class: "shared", forced: true })]);
    const result = await Applier.create(port).apply(plan, "/target");
    expect(result.hasFailures()).toBe(false);
    // The fake ApplyWrite starts with nothing "existing", so no backup call is
    // expected here — backup only fires once the destination is present.
    expect(calls.some((c) => c.startsWith("copy:"))).toBe(true);
    expect(result.backupPaths()).toEqual([]);
  });

  test("a 'skip' entry is neither backed up nor copied", async () => {
    const { port, calls } = fakeApplyWrite();
    const plan = fakePlan([entry({ path: "memory/team.md", action: "skip", class: "user-preserved" })]);
    const result = await Applier.create(port).apply(plan, "/target");
    expect(result.hasFailures()).toBe(false);
    expect(result.appliedEntries().map((e) => e.path)).toEqual(["memory/team.md"]);
    expect(calls).toEqual([]);
  });

  test("a 'conflict' entry resolves like force would: owned copies, shared backs up, user-preserved skips", async () => {
    const { port, calls } = fakeApplyWrite();
    const plan = fakePlan([
      entry({ path: "amadeus-tool.ts", action: "conflict", class: "owned" }),
      entry({ path: "settings.json", action: "conflict", class: "shared" }),
      entry({ path: "memory/team.md", action: "conflict", class: "user-preserved" }),
    ]);
    const result = await Applier.create(port).apply(plan, "/target");
    expect(result.hasFailures()).toBe(false);
    expect(calls.filter((c) => c.startsWith("copy:")).length).toBe(2); // owned + shared
    expect(calls.some((c) => c.includes("memory/team.md"))).toBe(false);
  });

  test("edge case: an existing destination is backed up before a 'backup' entry is copied", async () => {
    const { port, calls } = fakeApplyWrite({
      // The destination exists but its (not-yet-created) .bk path does not
      // (SEC-U01 checks the latter separately — see the dedicated describe
      // block below).
      async exists(path) {
        return path === "/target/settings.json";
      },
    });
    const plan = fakePlan([entry({ path: "settings.json", action: "backup", class: "shared" })]);
    const result = await Applier.create(port).apply(plan, "/target");
    expect(result.hasFailures()).toBe(false);
    expect(result.backupPaths()).toEqual(["settings.json.20260708T120000Z.bk"]);
    expect(calls.some((c) => c.startsWith("backup:"))).toBe(true);
  });
});

describe("Applier.apply — SEC-U01 (an existing .bk file is never overwritten)", () => {
  test("a pre-existing backup path stops the entry as an ApplyFailure without touching backup() or copyFile()", async () => {
    const { port, calls } = fakeApplyWrite({
      async exists(path) {
        // Both the destination and its would-be backup path already exist.
        return path === "/target/settings.json" || path === "/target/settings.json.20260708T120000Z.bk";
      },
    });
    const plan = fakePlan([entry({ path: "settings.json", action: "backup", class: "shared" })]);
    const result = await Applier.create(port).apply(plan, "/target");
    expect(result.hasFailures()).toBe(true);
    expect(result.failures()[0]?.operation).toBe("backup");
    expect(result.failures()[0]?.detail).toContain("settings.json.20260708T120000Z.bk");
    expect(calls.some((c) => c.startsWith("backup:"))).toBe(false);
    expect(calls.some((c) => c.startsWith("copy:"))).toBe(false);
    expect(result.appliedEntries().length).toBe(0);
  });

  test("edge case: this shared implementation also protects install's own --force-over-a-previous-.bk path", async () => {
    const { port, calls } = fakeApplyWrite({
      async exists(path) {
        return path === "/target/settings.json" || path === "/target/settings.json.20260708T120000Z.bk";
      },
    });
    // A "conflict" entry (install-only action) resolving to backup-then-copy
    // for a shared file hits the exact same guard as upgrade's "backup" action.
    const plan = fakePlan([entry({ path: "settings.json", action: "conflict", class: "shared" })]);
    const result = await Applier.create(port).apply(plan, "/target");
    expect(result.hasFailures()).toBe(true);
    expect(result.failures()[0]?.operation).toBe("backup");
    expect(calls.some((c) => c.startsWith("backup:"))).toBe(false);
  });
});

describe("Applier.apply — fail-fast (REL-I01)", () => {
  test("a copy failure stops before applying any later entries", async () => {
    const { port } = fakeApplyWrite({
      async copyFile() {
        return Result.err({ type: "io", detail: "disk full" });
      },
    });
    const plan = fakePlan([
      entry({ path: "amadeus-tool.ts", action: "add", class: "owned" }),
      entry({ path: "amadeus-tool2.ts", action: "add", class: "owned" }),
    ]);
    const result = await Applier.create(port).apply(plan, "/target");
    expect(result.hasFailures()).toBe(true);
    expect(result.failures().length).toBe(1);
    expect(result.failures()[0]?.operation).toBe("copy");
    expect(result.appliedEntries().length).toBe(0);
  });

  test("edge case: manifestFiles() is a Result even after failures (caller must gate on hasFailures first)", async () => {
    const { port } = fakeApplyWrite({
      async mkdir() {
        return Result.err({ type: "io", detail: "permission denied" });
      },
    });
    const plan = fakePlan([entry({ path: "amadeus-tool.ts", action: "add", class: "owned" })]);
    const result = await Applier.create(port).apply(plan, "/target");
    expect(result.hasFailures()).toBe(true);
    expect(result.manifestFiles().type).toBe("ok"); // zero applied entries is still a valid (empty) projection
  });
});

describe("Applier.apply — manifestFiles projection", () => {
  test("projects applied entries into ManifestFile shape (path/class/required/md5)", async () => {
    const { port } = fakeApplyWrite();
    const plan = fakePlan([entry({ path: "amadeus-tool.ts", action: "add", class: "owned", required: true, md5: "abc123" })]);
    const result = await Applier.create(port).apply(plan, "/target");
    const files = result.manifestFiles();
    expect(files.type).toBe("ok");
    if (files.type === "ok") {
      expect(files.value.entries()).toEqual([{ path: "amadeus-tool.ts", class: "owned", required: true, md5: "abc123" }]);
    }
  });
});
