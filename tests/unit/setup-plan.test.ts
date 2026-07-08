// covers: domain:setup-plan
//
// Plan.forInstall — file classification/action assignment (add/conflict/
// update/backup/skip), hasConflicts()/isNoop()/summary(), and
// PlanRefusal.harness-not-in-payload. FR-007/008/009, business-logic-model
// workflow 4.

import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";
import { Manifest, ManifestFiles } from "../../packages/setup/src/domain/manifest.ts";
import { Plan } from "../../packages/setup/src/domain/plan.ts";
import { ResolvedVersion } from "../../packages/setup/src/domain/resolved-version.ts";
import { UpgradeSource } from "../../packages/setup/src/domain/upgrade.ts";
import { Result } from "../../packages/setup/src/shared/result.ts";
import type { ExtractedPayload } from "../../packages/setup/src/domain/payload.ts";
import { fakePayload as fakeVersionedPayload, semver } from "../lib/setup-domain-fixtures.ts";

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

// --- Plan.forUpgrade (U3) ----------------------------------------------------

function manifestedSource(entries: Parameters<typeof ManifestFiles.fromEntries>[0]): UpgradeSource {
  const filesResult = ManifestFiles.fromEntries(entries);
  if (filesResult.type === "err") throw new Error("fixture setup: invalid manifest entries");
  const manifest = Manifest.build(fakeVersionedPayload(ResolvedVersion.fromRelease(semver("1.0.0"))), filesResult.value, {
    installerPackageVersion: "0.1.0",
    harness: claudeHarness(),
    installStartedAt: "2026-07-08T12:00:00.000Z",
  });
  const sourceResult = UpgradeSource.fromInstallation({ kind: "manifested", manifest, admitsInstall: () => ({ type: "proceed" }) }, false);
  if (sourceResult.type !== "ok") throw new Error("fixture setup: expected a manifested UpgradeSource");
  return sourceResult.value;
}

function manualOrUnknownSource(): UpgradeSource {
  const sourceResult = UpgradeSource.fromInstallation(
    {
      kind: "manual-or-unknown",
      evidence: { paths: [], versionFileContent: null, anchors: { toolsDir: true, amadeusCommon: true } },
      admitsInstall: () => ({ type: "proceed" }),
    },
    false,
  );
  if (sourceResult.type !== "ok") throw new Error("fixture setup: expected a manual-or-unknown UpgradeSource");
  return sourceResult.value;
}

describe("Plan.forUpgrade — fresh target (no pre-existing files)", () => {
  test("every payload file becomes an 'add' entry", () => {
    withTempDirs((sourceRoot, target) => {
      seedSource(sourceRoot);
      const source = manualOrUnknownSource();
      const result = Plan.forUpgrade(fakePayload(sourceRoot), source, claudeHarness(), target, {
        force: false,
        startedAt: "2026-07-08T12:00:00.000Z",
      });
      expect(result.type).toBe("ok");
      if (result.type !== "ok") return;
      expect(result.value.entriesBy("add").length).toBe(3);
      expect(result.value.hasConflicts()).toBe(false); // BR-U13: upgrade never produces "conflict"
    });
  });
});

describe("Plan.forUpgrade — manifested source delegates disposition (BR-U11)", () => {
  test("owned updates, matching-md5 shared overwrites (update), drifted shared backs up, user-preserved skips", () => {
    withTempDirs((sourceRoot, target) => {
      seedSource(sourceRoot);
      mkdirSync(join(target, "memory"), { recursive: true });
      writeFileSync(join(target, "amadeus-tool.ts"), "old\n");
      writeFileSync(join(target, "settings.json"), '{"a":1}\n'); // matches seedSource's content below
      writeFileSync(join(target, "memory", "team.md"), "customized team practices\n");

      const md5 = createHash("md5").update('{"a":1}\n').digest("hex");
      const source = manifestedSource([
        { path: "amadeus-tool.ts", class: "owned", required: true, md5: "irrelevant-for-owned" },
        { path: "settings.json", class: "shared", required: false, md5 },
        { path: "memory/team.md", class: "user-preserved", required: false, md5: "irrelevant-for-preserved" },
      ]);

      const result = Plan.forUpgrade(fakePayload(sourceRoot), source, claudeHarness(), target, {
        force: false,
        startedAt: "2026-07-08T12:00:00.000Z",
      });
      expect(result.type).toBe("ok");
      if (result.type !== "ok") return;
      const byPath = new Map(result.value.entries().map((e) => [e.path, e]));
      expect(byPath.get("amadeus-tool.ts")?.action).toBe("update");
      expect(byPath.get("settings.json")?.action).toBe("update"); // md5 matched -> overwrite -> "update"
      expect(byPath.get("memory/team.md")?.action).toBe("skip");
    });
  });

  test("edge case: a shared file whose content drifted from the manifest's expected md5 is backed up", () => {
    withTempDirs((sourceRoot, target) => {
      seedSource(sourceRoot);
      writeFileSync(join(target, "settings.json"), "hand-edited\n");
      const source = manifestedSource([{ path: "settings.json", class: "shared", required: false, md5: "not-the-actual-md5" }]);

      const result = Plan.forUpgrade(fakePayload(sourceRoot), source, claudeHarness(), target, {
        force: false,
        startedAt: "2026-07-08T12:00:00.000Z",
      });
      expect(result.type).toBe("ok");
      if (result.type !== "ok") return;
      const entry = result.value.entries().find((e) => e.path === "settings.json");
      expect(entry?.action).toBe("backup");
      expect(entry?.forced).toBe(false); // opts.force is false here
    });
  });
});

describe("Plan.forUpgrade — conservative source (manual-or-unknown, BR-U09)", () => {
  test("every existing shared file is backed up regardless of content", () => {
    withTempDirs((sourceRoot, target) => {
      seedSource(sourceRoot);
      mkdirSync(join(target, "memory"), { recursive: true });
      writeFileSync(join(target, "amadeus-tool.ts"), "old\n");
      writeFileSync(join(target, "settings.json"), '{"a":1}\n'); // identical content, still backed up (no known expectation)
      writeFileSync(join(target, "memory", "team.md"), "customized\n");

      const result = Plan.forUpgrade(fakePayload(sourceRoot), manualOrUnknownSource(), claudeHarness(), target, {
        force: true,
        startedAt: "2026-07-08T12:00:00.000Z",
      });
      expect(result.type).toBe("ok");
      if (result.type !== "ok") return;
      const byPath = new Map(result.value.entries().map((e) => [e.path, e]));
      expect(byPath.get("amadeus-tool.ts")?.action).toBe("update");
      expect(byPath.get("settings.json")?.action).toBe("backup");
      expect(byPath.get("settings.json")?.forced).toBe(true); // BR-U12: --force does not skip the backup itself
      expect(byPath.get("memory/team.md")?.action).toBe("skip");
    });
  });
});

describe("Plan.forUpgrade — PlanRefusal (harness absent from payload)", () => {
  test("edge case: reuses PlanRefusal.harnessNotInPayload rather than a duplicate UpgradeRefusal variant", () => {
    withTempDirs((sourceRoot, target) => {
      seedSource(sourceRoot);
      const result = Plan.forUpgrade(fakePayload(sourceRoot, []), manualOrUnknownSource(), claudeHarness(), target, {
        force: false,
        startedAt: "2026-07-08T12:00:00.000Z",
      });
      expect(result.type).toBe("err");
      if (result.type === "err") expect(result.error.type).toBe("harness-not-in-payload");
    });
  });
});
