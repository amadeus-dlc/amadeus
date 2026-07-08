// covers: domain:setup-plan
//
// Plan.forInstall — file classification/action assignment (add/conflict/
// update/backup/skip), hasConflicts()/isNoop()/summary(), and
// PlanRefusal.harness-not-in-payload. FR-007/008/009, business-logic-model
// workflow 4.

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";
import { Plan } from "../../packages/setup/src/domain/plan.ts";
import { Result } from "../../packages/setup/src/shared/result.ts";
import type { ExtractedPayload } from "../../packages/setup/src/domain/payload.ts";

function claudeHarness(): HarnessName {
  const claude = HarnessName.all.find((h) => (h as string) === "claude");
  if (!claude) throw new Error("fixture setup: 'claude' must be a known harness");
  return claude;
}

function withTempDirs<T>(fn: (sourceRoot: string, target: string) => T): T {
  const sourceRoot = mkdtempSync(join(tmpdir(), "amadeus-setup-plan-src-"));
  const target = mkdtempSync(join(tmpdir(), "amadeus-setup-plan-target-"));
  try {
    return fn(sourceRoot, target);
  } finally {
    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(target, { recursive: true, force: true });
  }
}

function seedSource(sourceRoot: string): void {
  mkdirSync(join(sourceRoot, "memory"), { recursive: true });
  writeFileSync(join(sourceRoot, "amadeus-tool.ts"), "export const tool = 1;\n");
  writeFileSync(join(sourceRoot, "memory", "team.md"), "# team practices\n");
  writeFileSync(join(sourceRoot, "settings.json"), '{"a":1}\n');
}

function fakePayload(sourceRoot: string, availability: readonly HarnessName[] = HarnessName.all): ExtractedPayload {
  return {
    version: undefined as never, // not read by Plan.forInstall
    harnessRoot: (harness) => (availability.includes(harness) ? Result.ok(sourceRoot) : Result.err(undefined as never)),
    availableHarnesses: () => availability,
  };
}

describe("Plan.forInstall — fresh target (no pre-existing files)", () => {
  test("every payload file becomes an 'add' entry with no conflicts", () => {
    withTempDirs((sourceRoot, target) => {
      seedSource(sourceRoot);
      const result = Plan.forInstall(fakePayload(sourceRoot), claudeHarness(), target, { force: false, startedAt: "2026-07-08T12:00:00.000Z" });
      expect(result.type).toBe("ok");
      if (result.type !== "ok") return;
      const plan = result.value;
      expect(plan.entries().length).toBe(3);
      expect(plan.hasConflicts()).toBe(false);
      expect(plan.isNoop()).toBe(false);
      expect(plan.entriesBy("add").length).toBe(3);
      // Review correction 2: harnessRoot() replaces PlanEntry.source so
      // Applier can rebuild each entry's copy source itself.
      expect(plan.harnessRoot()).toBe(sourceRoot);
    });
  });

  test("required is true only for owned (amadeus-*) files", () => {
    withTempDirs((sourceRoot, target) => {
      seedSource(sourceRoot);
      const result = Plan.forInstall(fakePayload(sourceRoot), claudeHarness(), target, { force: false, startedAt: "2026-07-08T12:00:00.000Z" });
      if (result.type !== "ok") throw new Error("expected ok");
      const owned = result.value.entries().find((e) => e.path === "amadeus-tool.ts");
      const shared = result.value.entries().find((e) => e.path === "settings.json");
      expect(owned?.class).toBe("owned");
      expect(owned?.required).toBe(true);
      expect(shared?.class).toBe("shared");
      expect(shared?.required).toBe(false);
    });
  });
});

describe("Plan.forInstall — pre-existing target files, no --force (BR-I10/I11)", () => {
  test("existing files conflict regardless of class", () => {
    withTempDirs((sourceRoot, target) => {
      seedSource(sourceRoot);
      writeFileSync(join(target, "settings.json"), "{}\n");
      const result = Plan.forInstall(fakePayload(sourceRoot), claudeHarness(), target, { force: false, startedAt: "2026-07-08T12:00:00.000Z" });
      if (result.type !== "ok") throw new Error("expected ok");
      const plan = result.value;
      expect(plan.hasConflicts()).toBe(true);
      const conflict = plan.entriesBy("conflict");
      expect(conflict.map((e) => e.path)).toEqual(["settings.json"]);
      expect(conflict[0]?.forced).toBe(false);
    });
  });
});

describe("Plan.forInstall — pre-existing target files, --force (FR-008/FR-009)", () => {
  test("owned files become 'update', shared become 'backup', user-preserved become 'skip'", () => {
    withTempDirs((sourceRoot, target) => {
      seedSource(sourceRoot);
      mkdirSync(join(target, "memory"), { recursive: true });
      writeFileSync(join(target, "amadeus-tool.ts"), "old\n");
      writeFileSync(join(target, "settings.json"), "old\n");
      writeFileSync(join(target, "memory", "team.md"), "existing team practices\n");

      const result = Plan.forInstall(fakePayload(sourceRoot), claudeHarness(), target, { force: true, startedAt: "2026-07-08T12:00:00.000Z" });
      if (result.type !== "ok") throw new Error("expected ok");
      const plan = result.value;
      expect(plan.hasConflicts()).toBe(false);

      const byPath = new Map(plan.entries().map((e) => [e.path, e]));
      expect(byPath.get("amadeus-tool.ts")?.action).toBe("update");
      expect(byPath.get("amadeus-tool.ts")?.forced).toBe(true);
      expect(byPath.get("settings.json")?.action).toBe("backup");
      expect(byPath.get("settings.json")?.forced).toBe(true);
      expect(byPath.get("memory/team.md")?.action).toBe("skip");
      expect(byPath.get("memory/team.md")?.forced).toBe(false);
    });
  });

  test("edge case: an all-skip plan reports isNoop() true", () => {
    withTempDirs((sourceRoot, target) => {
      mkdirSync(join(sourceRoot, "memory"), { recursive: true });
      writeFileSync(join(sourceRoot, "memory", "team.md"), "template\n");
      mkdirSync(join(target, "memory"), { recursive: true });
      writeFileSync(join(target, "memory", "team.md"), "already customized\n");

      const result = Plan.forInstall(fakePayload(sourceRoot), claudeHarness(), target, { force: true, startedAt: "2026-07-08T12:00:00.000Z" });
      if (result.type !== "ok") throw new Error("expected ok");
      expect(result.value.isNoop()).toBe(true);
      expect(result.value.summary()).toEqual({ add: 0, update: 0, skip: 1, backup: 0, conflict: 0 });
    });
  });
});

describe("Plan.forInstall — PlanRefusal", () => {
  test("edge case: a harness absent from the payload is refused, not thrown", () => {
    withTempDirs((sourceRoot, target) => {
      seedSource(sourceRoot);
      const result = Plan.forInstall(fakePayload(sourceRoot, []), claudeHarness(), target, { force: false, startedAt: "2026-07-08T12:00:00.000Z" });
      expect(result.type).toBe("err");
      if (result.type === "err") expect(result.error.type).toBe("harness-not-in-payload");
    });
  });
});
