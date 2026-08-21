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

// --- #3388 onboarding destination ladder --------------------------------------

// A payload whose project root carries the onboarding doc (the post-#3388 shape
// for every harness: dist/claude/CLAUDE.md, dist/kimi/AGENTS.md, ...), plus one
// ordinary shared file so the ladder's blast radius stays visible.
function seedOnboardingSource(sourceRoot: string, doc: "CLAUDE.md" | "AGENTS.md"): void {
  writeFileSync(join(sourceRoot, doc), "# shipped onboarding doc\n");
  writeFileSync(join(sourceRoot, "settings.json"), '{"a":1}\n');
}

function planForInstall(sourceRoot: string, target: string, force: boolean) {
  const result = Plan.forInstall(fakePayload(sourceRoot), claudeHarness(), target, { force, startedAt: "2026-07-08T12:00:00.000Z" });
  if (result.type !== "ok") throw new Error("expected ok");
  return result.value;
}

describe("Plan.forInstall — onboarding ladder rung 1: fresh target (#3388 spec 1)", () => {
  test("the onboarding doc installs under its real name with no notice", () => {
    withTempDirs((sourceRoot, target) => {
      seedOnboardingSource(sourceRoot, "CLAUDE.md");
      const plan = planForInstall(sourceRoot, target, false);
      const entry = plan.entries().find((e) => e.path === "CLAUDE.md");
      expect(entry?.action).toBe("add");
      // No divert happened, so no sourcePath is recorded at all.
      expect(entry?.sourcePath).toBeUndefined();
      expect(plan.onboardingNotices()).toEqual([]);
    });
  });
});

describe("Plan.forInstall — onboarding ladder rung 2: name taken (#3388 spec 2)", () => {
  test("an existing CLAUDE.md diverts the install to CLAUDE-AMADEUS.md and never conflicts", () => {
    withTempDirs((sourceRoot, target) => {
      seedOnboardingSource(sourceRoot, "CLAUDE.md");
      writeFileSync(join(target, "CLAUDE.md"), "# the user's own instructions\n");

      const plan = planForInstall(sourceRoot, target, false);
      const byPath = new Map(plan.entries().map((e) => [e.path, e]));
      // The user's file is not in the plan under any action — it is not
      // overwritten, not backed up, not even reported as a conflict.
      expect(byPath.has("CLAUDE.md")).toBe(false);
      const diverted = byPath.get("CLAUDE-AMADEUS.md");
      expect(diverted?.action).toBe("add");
      // The payload path survives as sourcePath so the applier copies the right
      // bytes to the new destination.
      expect(diverted?.sourcePath).toBe("CLAUDE.md");
      expect(plan.onboardingNotices()).toEqual([
        { kind: "alternate", primary: "CLAUDE.md", alternate: "CLAUDE-AMADEUS.md", primaryExists: true },
      ]);
    });
  });

  test("the same ladder applies to the AGENTS.md harnesses", () => {
    withTempDirs((sourceRoot, target) => {
      seedOnboardingSource(sourceRoot, "AGENTS.md");
      writeFileSync(join(target, "AGENTS.md"), "# an existing Codex/Cursor AGENTS.md\n");

      const plan = planForInstall(sourceRoot, target, false);
      expect(plan.entries().map((e) => e.path).sort()).toEqual(["AGENTS-AMADEUS.md", "settings.json"]);
      expect(plan.onboardingNotices()).toEqual([
        { kind: "alternate", primary: "AGENTS.md", alternate: "AGENTS-AMADEUS.md", primaryExists: true },
      ]);
    });
  });

  test("edge case: a non-onboarding file with an existing target copy still conflicts (BR-I11 intact)", () => {
    withTempDirs((sourceRoot, target) => {
      seedOnboardingSource(sourceRoot, "CLAUDE.md");
      writeFileSync(join(target, "CLAUDE.md"), "# the user's own instructions\n");
      writeFileSync(join(target, "settings.json"), "{}\n");

      const plan = planForInstall(sourceRoot, target, false);
      expect(plan.entriesBy("conflict").map((e) => e.path)).toEqual(["settings.json"]);
      expect(plan.hasConflicts()).toBe(true);
    });
  });
});

describe("Plan.forInstall — onboarding ladder rung 3: both names taken (#3388 spec 3)", () => {
  test("nothing is planned for the doc and the notice says so", () => {
    withTempDirs((sourceRoot, target) => {
      seedOnboardingSource(sourceRoot, "CLAUDE.md");
      writeFileSync(join(target, "CLAUDE.md"), "# the user's own instructions\n");
      writeFileSync(join(target, "CLAUDE-AMADEUS.md"), "# something already here\n");

      const plan = planForInstall(sourceRoot, target, false);
      // Not written AND not recorded: a manifest entry for a file we never
      // installed would let the next upgrade "follow" it onto the user's file.
      expect(plan.entries().map((e) => e.path)).toEqual(["settings.json"]);
      expect(plan.onboardingNotices()).toEqual([
        { kind: "blocked", primary: "CLAUDE.md", alternate: "CLAUDE-AMADEUS.md", primaryExists: true },
      ]);
    });
  });
});

describe("Plan.forInstall — --force keeps the pre-#3388 behaviour (#3388 spec 4)", () => {
  test("an existing CLAUDE.md is backed up under its real name, with no ladder notice", () => {
    withTempDirs((sourceRoot, target) => {
      seedOnboardingSource(sourceRoot, "CLAUDE.md");
      writeFileSync(join(target, "CLAUDE.md"), "# the user's own instructions\n");
      writeFileSync(join(target, "CLAUDE-AMADEUS.md"), "# even this exists\n");

      const plan = planForInstall(sourceRoot, target, true);
      const entry = plan.entries().find((e) => e.path === "CLAUDE.md");
      expect(entry?.action).toBe("backup"); // shared + --force = FR-008 backup-then-copy
      expect(entry?.forced).toBe(true);
      expect(plan.entries().some((e) => e.path === "CLAUDE-AMADEUS.md")).toBe(false);
      expect(plan.onboardingNotices()).toEqual([]);
    });
  });
});

describe("Plan.forUpgrade — the manifest decides where the doc lives (#3388 spec 5)", () => {
  test("an installation recorded at CLAUDE-AMADEUS.md keeps being updated there", () => {
    withTempDirs((sourceRoot, target) => {
      seedOnboardingSource(sourceRoot, "CLAUDE.md");
      // The state a rung-2 install leaves behind: the user's own CLAUDE.md, our
      // copy at the alternate, and a manifest that records the alternate.
      writeFileSync(join(target, "CLAUDE.md"), "# the user's own instructions\n");
      writeFileSync(join(target, "CLAUDE-AMADEUS.md"), "# shipped onboarding doc\n");
      const md5 = createHash("md5").update("# shipped onboarding doc\n").digest("hex");
      const source = manifestedSource([{ path: "CLAUDE-AMADEUS.md", class: "shared", required: false, md5 }]);

      const result = Plan.forUpgrade(fakePayload(sourceRoot), source, claudeHarness(), target, {
        force: false,
        startedAt: "2026-07-08T12:00:00.000Z",
      });
      if (result.type !== "ok") throw new Error("expected ok");
      const entry = result.value.entries().find((e) => e.path === "CLAUDE-AMADEUS.md");
      // md5 still matches what we installed, so it is a clean overwrite of OUR
      // file — and the user's CLAUDE.md is untouched by the upgrade.
      expect(entry?.action).toBe("update");
      expect(entry?.sourcePath).toBe("CLAUDE.md");
      expect(result.value.entries().some((e) => e.path === "CLAUDE.md")).toBe(false);
      expect(result.value.onboardingNotices()).toEqual([
        { kind: "alternate", primary: "CLAUDE.md", alternate: "CLAUDE-AMADEUS.md", primaryExists: true },
      ]);
    });
  });

  test("a user who since deleted their own CLAUDE.md is not told it still exists", () => {
    withTempDirs((sourceRoot, target) => {
      seedOnboardingSource(sourceRoot, "CLAUDE.md");
      // Same manifest as the rung-2 install above, but the user has removed the
      // file that caused the divert. The doc still follows the manifest to the
      // alternate — the notice just must not assert a collision that is gone.
      writeFileSync(join(target, "CLAUDE-AMADEUS.md"), "# shipped onboarding doc\n");
      const md5 = createHash("md5").update("# shipped onboarding doc\n").digest("hex");
      const source = manifestedSource([{ path: "CLAUDE-AMADEUS.md", class: "shared", required: false, md5 }]);

      const result = Plan.forUpgrade(fakePayload(sourceRoot), source, claudeHarness(), target, {
        force: false,
        startedAt: "2026-07-08T12:00:00.000Z",
      });
      if (result.type !== "ok") throw new Error("expected ok");
      expect(result.value.entries().find((e) => e.path === "CLAUDE-AMADEUS.md")?.action).toBe("update");
      expect(result.value.onboardingNotices()).toEqual([
        { kind: "alternate", primary: "CLAUDE.md", alternate: "CLAUDE-AMADEUS.md", primaryExists: false },
      ]);
    });
  });

  test("--force routes the doc back to its real name, manifest alternate and all (#3388 spec 4)", () => {
    withTempDirs((sourceRoot, target) => {
      seedOnboardingSource(sourceRoot, "CLAUDE.md");
      writeFileSync(join(target, "CLAUDE.md"), "# the user's own instructions\n");
      writeFileSync(join(target, "CLAUDE-AMADEUS.md"), "# shipped onboarding doc\n");
      const md5 = createHash("md5").update("# shipped onboarding doc\n").digest("hex");
      const source = manifestedSource([{ path: "CLAUDE-AMADEUS.md", class: "shared", required: false, md5 }]);

      const result = Plan.forUpgrade(fakePayload(sourceRoot), source, claudeHarness(), target, {
        force: true,
        startedAt: "2026-07-08T12:00:00.000Z",
      });
      if (result.type !== "ok") throw new Error("expected ok");
      // --force bypasses the ladder AND the manifest follow: the real name wins.
      // The disposition is then BR-U11's ordinary manifest lookup — a path the
      // manifest never recorded is treated as framework-owned, hence "update".
      const entry = result.value.entries().find((e) => e.path === "CLAUDE.md");
      expect(entry?.action).toBe("update");
      expect(entry?.sourcePath).toBeUndefined();
      expect(result.value.entries().some((e) => e.path === "CLAUDE-AMADEUS.md")).toBe(false);
      expect(result.value.onboardingNotices()).toEqual([]);
    });
  });

  test("an installation recorded at the real name keeps being updated there", () => {
    withTempDirs((sourceRoot, target) => {
      seedOnboardingSource(sourceRoot, "CLAUDE.md");
      writeFileSync(join(target, "CLAUDE.md"), "# shipped onboarding doc\n");
      const md5 = createHash("md5").update("# shipped onboarding doc\n").digest("hex");
      const source = manifestedSource([{ path: "CLAUDE.md", class: "shared", required: false, md5 }]);

      const result = Plan.forUpgrade(fakePayload(sourceRoot), source, claudeHarness(), target, {
        force: false,
        startedAt: "2026-07-08T12:00:00.000Z",
      });
      if (result.type !== "ok") throw new Error("expected ok");
      expect(result.value.entries().find((e) => e.path === "CLAUDE.md")?.action).toBe("update");
      expect(result.value.onboardingNotices()).toEqual([]);
    });
  });

  test("edge case: a source with no manifest falls back to the same ladder install uses", () => {
    withTempDirs((sourceRoot, target) => {
      seedOnboardingSource(sourceRoot, "CLAUDE.md");
      writeFileSync(join(target, "CLAUDE.md"), "# the user's own instructions\n");

      const result = Plan.forUpgrade(fakePayload(sourceRoot), manualOrUnknownSource(), claudeHarness(), target, {
        force: false,
        startedAt: "2026-07-08T12:00:00.000Z",
      });
      if (result.type !== "ok") throw new Error("expected ok");
      // BR-U09 would otherwise back up and overwrite the user's own CLAUDE.md.
      expect(result.value.entries().some((e) => e.path === "CLAUDE.md")).toBe(false);
      expect(result.value.entries().find((e) => e.path === "CLAUDE-AMADEUS.md")?.action).toBe("add");
      expect(result.value.onboardingNotices()).toEqual([
        { kind: "alternate", primary: "CLAUDE.md", alternate: "CLAUDE-AMADEUS.md", primaryExists: true },
      ]);
    });
  });
});
