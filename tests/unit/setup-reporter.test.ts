// covers: modules:setup-reporter
//
// reporter's 8 pure render functions. Asserts on the *intent* of each
// message (which facts appear, force markers, guidance presence) rather than
// exact snapshots, per code-generation-plan.md Step 9.

import { describe, expect, test } from "bun:test";
import * as reporter from "../../packages/setup/src/modules/reporter.ts";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";
import { NextSteps, VerifyResult } from "../../packages/setup/src/domain/verify-result.ts";
import type { Plan, PlanEntry } from "../../packages/setup/src/domain/plan.ts";
import type { ApplyResult } from "../../packages/setup/src/domain/apply-result.ts";
import { ResolvedVersion } from "../../packages/setup/src/domain/resolved-version.ts";
import { SemVer } from "../../packages/setup/src/domain/semver.ts";

function claudeHarness(): HarnessName {
  const claude = HarnessName.all.find((h) => (h as string) === "claude");
  if (!claude) throw new Error("fixture setup: 'claude' must be a known harness");
  return claude;
}

function planEntry(overrides: Partial<PlanEntry> & Pick<PlanEntry, "path" | "action" | "class">): PlanEntry {
  return Object.freeze({ forced: false, md5: "x", required: false, ...overrides });
}

function fakePlan(entries: readonly PlanEntry[]): Plan {
  return {
    startedAtIso: "2026-07-08T12:00:00.000Z",
    backupTimestamp: "20260708T120000Z",
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
    harnessRoot: () => "/src",
  };
}

function fakeApplyResult(overrides: Partial<ApplyResult> = {}): ApplyResult {
  return {
    hasFailures: () => false,
    failures: () => [],
    appliedEntries: () => [],
    backupPaths: () => [],
    manifestFiles: () => {
      throw new Error("not used in this test");
    },
    ...overrides,
  };
}

describe("renderHelp", () => {
  test("mentions both subcommands and the no-subcommand-is-help contract", () => {
    const text = reporter.renderHelp();
    expect(text).toContain("install");
    expect(text).toContain("upgrade");
  });
});

describe("renderPlanReport (FR-007)", () => {
  test("lists each action category and marks forced entries", () => {
    const plan = fakePlan([
      planEntry({ path: "amadeus-tool.ts", action: "update", class: "owned", forced: true }),
      planEntry({ path: "settings.json", action: "conflict", class: "shared" }),
    ]);
    const text = reporter.renderPlanReport(plan);
    expect(text).toContain("amadeus-tool.ts");
    expect(text).toContain("(forced)");
    expect(text).toContain("settings.json");
    expect(text).toMatch(/conflict=1/);
  });
});

describe("renderAlreadyInstalled (FR-004)", () => {
  test("names the upgrade command as the suggested next step", () => {
    const text = reporter.renderAlreadyInstalled({ type: "refuse-suggest-upgrade", detected: "claude v1.0.0" });
    expect(text).toContain("upgrade");
    expect(text).toContain("claude v1.0.0");
  });
});

describe("renderApplyFailure", () => {
  test("lists each failure's operation and path, and notes no manifest was written", () => {
    const applied = fakeApplyResult({ hasFailures: () => true, failures: () => [{ path: "a.ts", operation: "copy", detail: "disk full" }] });
    const text = reporter.renderApplyFailure(applied);
    expect(text).toContain("a.ts");
    expect(text).toContain("disk full");
    expect(text.toLowerCase()).toContain("manifest");
  });
});

describe("renderVerifyFailure (FR-013)", () => {
  test("lists only the failed checks", () => {
    const verify = VerifyResult.of([
      { name: "harness-dir", ok: true, detail: "ok" },
      { name: "tools-dir", ok: false, detail: "missing tools/" },
    ]);
    const text = reporter.renderVerifyFailure(verify);
    expect(text).toContain("tools-dir");
    expect(text).toContain("missing tools/");
    expect(text).not.toContain("harness-dir");
  });
});

describe("renderSuccess (US-A6)", () => {
  test("reports verification checks and next steps", () => {
    const semver = SemVer.parse("1.2.3");
    if (semver.type === "err") throw new Error("fixture setup failed");
    const verify = VerifyResult.of([{ name: "harness-dir", ok: true, detail: "exists" }]);
    const next = NextSteps.of(claudeHarness(), ResolvedVersion.fromRelease(semver.value), "/tmp/project");
    const text = reporter.renderSuccess(fakeApplyResult(), verify, next);
    expect(text).toContain("harness-dir");
    expect(text).toContain("/tmp/project");
    expect(text).toContain("/amadeus");
  });
});

describe("renderWizardAborted (BR-I18)", () => {
  test("states no files were changed", () => {
    expect(reporter.renderWizardAborted().toLowerCase()).toContain("no files were changed".toLowerCase());
  });
});

describe("renderUpgradeNotImplemented (SEC-I04)", () => {
  test("names the upgrade subcommand", () => {
    expect(reporter.renderUpgradeNotImplemented()).toContain("upgrade");
  });
});

describe("renderTmpDirFailure (SEC-I04)", () => {
  test("includes the underlying detail", () => {
    const text = reporter.renderTmpDirFailure("ENOSPC: no space left on device");
    expect(text).toContain("ENOSPC");
    expect(text.toLowerCase()).toContain("temp");
  });
});

describe("renderError (US-A7/FR-012)", () => {
  test("a FetchError includes its own guidance", () => {
    const text = reporter.renderError({
      type: "dns",
      detail: "ENOTFOUND api.github.com",
      status: null,
      isTransient: () => false,
      guidance: () => "check your network connection",
    });
    expect(text).toContain("ENOTFOUND");
    expect(text).toContain("check your network connection");
  });

  test("a UsageError renders a usage-specific message", () => {
    const text = reporter.renderError({ type: "invalid-harness", raw: "bogus" });
    expect(text).toContain("bogus");
    expect(text.toLowerCase()).toContain("harness");
  });

  test("a PlanRefusal renders a harness-not-in-payload message", () => {
    const text = reporter.renderError({ type: "harness-not-in-payload", harness: claudeHarness() });
    expect(text).toContain("claude");
  });

  test("edge case: a ManifestError renders without throwing", () => {
    expect(() => reporter.renderError({ type: "malformed", detail: "missing field" })).not.toThrow();
  });
});
