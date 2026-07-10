// covers: domain:setup-upgrade
//
// UpgradeAssessment (version-boundary decision, BR-U01~U04), LegacyLayout
// (BR-U07, conditions a/b), and UpgradeSource.fromInstallation (BR-U05~U09,
// BR-U11, BR-U14) — the domain/upgrade.ts entities U3 introduces. Combined
// with cli-wiring/integration tests, covers all 6 no-change refusal paths
// plus proceed (code-generation-plan.md Step 1).

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";
import { Installation, type InstallationEvidence } from "../../packages/setup/src/domain/installation.ts";
import { Manifest, ManifestFiles } from "../../packages/setup/src/domain/manifest.ts";
import { ResolvedVersion } from "../../packages/setup/src/domain/resolved-version.ts";
import { LegacyLayout, UpgradeAssessment, UpgradeRefusal, UpgradeSource } from "../../packages/setup/src/domain/upgrade.ts";
import { VersionSpec } from "../../packages/setup/src/domain/version-spec.ts";
import { createFsRead, createFsWrite } from "../../packages/setup/src/ports/fsops.ts";
import { createManifestIo } from "../../packages/setup/src/modules/manifest-io.ts";
import { fakePayload, semver } from "../lib/setup-domain-fixtures.ts";

function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "amadeus-setup-upgrade-"));
  return fn(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
}

function claudeHarness(): HarnessName {
  const claude = HarnessName.all.find((h) => (h as string) === "claude");
  if (!claude) throw new Error("fixture setup: 'claude' must be a known harness");
  return claude;
}

function exactSpec(raw: string): VersionSpec {
  const result = VersionSpec.exact(raw);
  if (result.type === "err") throw new Error("fixture setup: invalid version spec");
  return result.value;
}

function noneInstallation(): Installation {
  return { kind: "none", admitsInstall: () => ({ type: "proceed" }) };
}

function partialInstallation(missing: readonly string[]): Installation {
  return { kind: "partial", missing, admitsInstall: () => ({ type: "proceed" }) };
}

function manualOrUnknownInstallation(evidence: InstallationEvidence): Installation {
  return { kind: "manual-or-unknown", evidence, admitsInstall: () => ({ type: "proceed" }) };
}

function manifestedInstallation(manifest: Manifest): Installation {
  return { kind: "manifested", manifest, admitsInstall: () => ({ type: "proceed" }) };
}

function evidence(overrides: Partial<InstallationEvidence> = {}): InstallationEvidence {
  return {
    paths: [".claude/tools", ".claude/amadeus-common"],
    versionFileContent: null,
    anchors: { toolsDir: true, amadeusCommon: true },
    ...overrides,
  };
}

function buildManifest(entries: Parameters<typeof ManifestFiles.fromEntries>[0], version = "1.0.0"): Manifest {
  const filesResult = ManifestFiles.fromEntries(entries);
  if (filesResult.type === "err") throw new Error("fixture setup: invalid manifest entries");
  return Manifest.build(fakePayload(ResolvedVersion.fromRelease(semver(version))), filesResult.value, {
    installerPackageVersion: "0.1.0",
    harness: claudeHarness(),
    installStartedAt: "2026-07-08T12:00:00.000Z",
  });
}

describe("UpgradeAssessment.of — version boundary (BR-U01~U04)", () => {
  test("installed equals requested -> already-up-to-date", () => {
    const assessment = UpgradeAssessment.of(semver("1.2.3"), ResolvedVersion.fromRelease(semver("1.2.3")), VersionSpec.latest());
    const outcome = assessment.outcome();
    expect(outcome.type).toBe("already-up-to-date");
    if (outcome.type === "already-up-to-date") expect(outcome.installed.format()).toBe("v1.2.3");
    expect(assessment.isActionable()).toBe(false);
  });

  test("requested is newer -> proceed", () => {
    const resolved = ResolvedVersion.fromRelease(semver("1.3.0"));
    const assessment = UpgradeAssessment.of(semver("1.2.3"), resolved, VersionSpec.latest());
    const outcome = assessment.outcome();
    expect(outcome.type).toBe("proceed");
    if (outcome.type === "proceed") expect(outcome.to).toBe(resolved);
    expect(assessment.isActionable()).toBe(true);
  });

  test("edge case: installed newer than the default-resolved latest (no --version) -> installed-newer-than-latest (BR-U03)", () => {
    const assessment = UpgradeAssessment.of(semver("2.0.0"), ResolvedVersion.fromRelease(semver("1.9.0")), VersionSpec.latest());
    const outcome = assessment.outcome();
    expect(outcome.type).toBe("installed-newer-than-latest");
    if (outcome.type === "installed-newer-than-latest") {
      expect(outcome.installed.format()).toBe("v2.0.0");
      expect(outcome.latest.format()).toBe("v1.9.0");
    }
    expect(assessment.isActionable()).toBe(false);
  });

  test("edge case: an explicit --version older than installed -> downgrade-unsupported (BR-U02)", () => {
    const assessment = UpgradeAssessment.of(semver("2.0.0"), ResolvedVersion.fromTag(semver("1.0.0")), exactSpec("1.0.0"));
    const outcome = assessment.outcome();
    expect(outcome.type).toBe("downgrade-unsupported");
    if (outcome.type === "downgrade-unsupported") {
      expect(outcome.installed.format()).toBe("v2.0.0");
      expect(outcome.requested.format()).toBe("v1.0.0");
    }
    expect(assessment.isActionable()).toBe(false);
  });

  // FR-747 (issue #747): upgrading from a prerelease to its release is a real
  // upgrade, not a no-op. Before the fix isLaterThan ignored prereleases, so
  // this resolved as downgrade-unsupported (a --version pin) instead of proceed.
  test("FR-747: an explicit --version release newer than the installed prerelease -> proceed", () => {
    const resolved = ResolvedVersion.fromTag(semver("1.0.0"));
    const assessment = UpgradeAssessment.of(semver("1.0.0-rc.1"), resolved, exactSpec("1.0.0"));
    const outcome = assessment.outcome();
    expect(outcome.type).toBe("proceed");
    if (outcome.type === "proceed") expect(outcome.to).toBe(resolved);
    expect(assessment.isActionable()).toBe(true);
  });

  test("FR-747: an explicit --version prerelease older than the installed release -> downgrade-unsupported", () => {
    const assessment = UpgradeAssessment.of(semver("1.0.0"), ResolvedVersion.fromTag(semver("1.0.0-rc.1")), exactSpec("1.0.0-rc.1"));
    const outcome = assessment.outcome();
    expect(outcome.type).toBe("downgrade-unsupported");
    if (outcome.type === "downgrade-unsupported") {
      expect(outcome.installed.format()).toBe("v1.0.0");
      expect(outcome.requested.format()).toBe("v1.0.0-rc.1");
    }
    expect(assessment.isActionable()).toBe(false);
  });
});

describe("UpgradeRefusal", () => {
  test("fromOutcome carries a non-proceed outcome through unchanged", () => {
    const outcome = UpgradeAssessment.of(semver("1.0.0"), ResolvedVersion.fromRelease(semver("1.0.0")), VersionSpec.latest()).outcome();
    if (outcome.type === "proceed") throw new Error("fixture setup: expected a non-proceed outcome");
    expect(UpgradeRefusal.fromOutcome(outcome)).toEqual(outcome);
  });

  test("noInstallation/unsupportedLayout/partialRefused build their own shapes", () => {
    expect(UpgradeRefusal.noInstallation()).toEqual({ type: "no-installation" });
    expect(UpgradeRefusal.unsupportedLayout("old layout")).toEqual({ type: "unsupported-layout", detail: "old layout" });
    expect(UpgradeRefusal.partialRefused(["tools directory"])).toEqual({ type: "partial-refused", missing: ["tools directory"] });
  });
});

describe("LegacyLayout.isUnsupported — condition (a): unparsable VERSION content", () => {
  test("a non-SemVer VERSION file content is unsupported", () => {
    const verdict = LegacyLayout.isUnsupported(evidence({ versionFileContent: "legacy-build-2024" }));
    expect(verdict.unsupported).toBe(true);
    expect(verdict.detail.length).toBeGreaterThan(0);
  });

  test("a parseable VERSION file content is not unsupported by condition (a)", () => {
    const verdict = LegacyLayout.isUnsupported(evidence({ versionFileContent: "1.2.3" }));
    expect(verdict.unsupported).toBe(false);
  });

  test("edge case: no VERSION file at all does not trigger condition (a)", () => {
    const verdict = LegacyLayout.isUnsupported(evidence({ versionFileContent: null }));
    expect(verdict.unsupported).toBe(false);
  });
});

describe("LegacyLayout.isUnsupported — condition (b): amadeus-* files without either layout anchor", () => {
  test("amadeus-* prefixed evidence path with both anchors false is unsupported", () => {
    const verdict = LegacyLayout.isUnsupported(
      evidence({ paths: [".claude/amadeus-runtime.ts"], anchors: { toolsDir: false, amadeusCommon: false } }),
    );
    expect(verdict.unsupported).toBe(true);
  });

  test("edge case: the same amadeus-* path with an anchor present is not unsupported (stays manual-or-unknown)", () => {
    const verdict = LegacyLayout.isUnsupported(
      evidence({ paths: [".claude/amadeus-runtime.ts"], anchors: { toolsDir: true, amadeusCommon: false } }),
    );
    expect(verdict.unsupported).toBe(false);
  });
});

describe("UpgradeSource.fromInstallation — routing (BR-U05~U09)", () => {
  test("kind 'none' refuses with no-installation", () => {
    const result = UpgradeSource.fromInstallation(noneInstallation(), false);
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error).toEqual({ type: "no-installation" });
  });

  test("kind 'partial' without --force refuses with partial-refused (BR-U08)", () => {
    const result = UpgradeSource.fromInstallation(partialInstallation(["amadeus-common directory"]), false);
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error).toEqual({ type: "partial-refused", missing: ["amadeus-common directory"] });
  });

  test("edge case: kind 'partial' with --force proceeds as partial-forced", () => {
    const result = UpgradeSource.fromInstallation(partialInstallation(["amadeus-common directory"]), true);
    expect(result.type).toBe("ok");
    if (result.type === "ok") expect(result.value.kind).toBe("partial-forced");
  });

  test("kind 'manual-or-unknown' with a supported layout proceeds conservatively", () => {
    const result = UpgradeSource.fromInstallation(manualOrUnknownInstallation(evidence()), false);
    expect(result.type).toBe("ok");
    if (result.type === "ok") expect(result.value.kind).toBe("manual-or-unknown");
  });

  test("edge case: kind 'manual-or-unknown' with an unsupported legacy layout refuses (BR-U07)", () => {
    const result = UpgradeSource.fromInstallation(
      manualOrUnknownInstallation(evidence({ versionFileContent: "legacy-build-2024" })),
      false,
    );
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error.type).toBe("unsupported-layout");
  });

  test("kind 'manifested' always proceeds, wrapping the manifest", () => {
    const manifest = buildManifest([{ path: "settings.json", class: "shared", required: false, md5: "aaa" }]);
    const result = UpgradeSource.fromInstallation(manifestedInstallation(manifest), false);
    expect(result.type).toBe("ok");
    if (result.type === "ok") expect(result.value.kind).toBe("manifested");
  });

  // FR-656-1/FR-656-3 (issue #656, BR-U07): an anchor-less legacy layout, real
  // Installation.detect() output (not synthetic evidence) piped through
  // UpgradeSource.fromInstallation, must hard-refuse as unsupported-layout —
  // even with --force. Before the fix, detect() misclassified this fixture
  // as 'partial', which --force would have continued past.
  test("edge case: an anchor-less legacy layout refuses as unsupported-layout even with --force (BR-U07)", async () => {
    await withTempDir(async (dir) => {
      mkdirSync(join(dir, ".claude"), { recursive: true });
      writeFileSync(join(dir, ".claude", "amadeus-runtime.ts"), "// legacy owned file\n");
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const detected = await Installation.detect(dir, manifestIo);
      if (detected.type === "err") throw new Error(`expected an ok installation, got err: ${detected.error.type}`);
      const installation = detected.value;
      expect(installation.kind).toBe("manual-or-unknown"); // FR-656-1 precondition

      const result = UpgradeSource.fromInstallation(installation, true);
      expect(result.type).toBe("err");
      if (result.type === "err") expect(result.error.type).toBe("unsupported-layout");
    });
  });
});

describe("UpgradeSource#dispositionFor — manifested delegates to the manifest (BR-U11)", () => {
  test("delegates verbatim: shared file matching expected md5 overwrites", () => {
    const manifest = buildManifest([{ path: "settings.json", class: "shared", required: false, md5: "aaa" }]);
    const result = UpgradeSource.fromInstallation(manifestedInstallation(manifest), false);
    if (result.type !== "ok") throw new Error("fixture setup failed");
    expect(result.value.dispositionFor("settings.json", "shared", "aaa")).toEqual({ type: "overwrite" });
  });

  test("delegates verbatim: shared file with drifted md5 backs up", () => {
    const manifest = buildManifest([{ path: "settings.json", class: "shared", required: false, md5: "aaa" }]);
    const result = UpgradeSource.fromInstallation(manifestedInstallation(manifest), false);
    if (result.type !== "ok") throw new Error("fixture setup failed");
    expect(result.value.dispositionFor("settings.json", "shared", "drifted")).toEqual({ type: "backup-then-copy" });
  });

  test("edge case: the cls parameter is ignored for manifested sources (the manifest's own recorded class wins)", () => {
    const manifest = buildManifest([{ path: "memory/team.md", class: "user-preserved", required: false, md5: "aaa" }]);
    const result = UpgradeSource.fromInstallation(manifestedInstallation(manifest), false);
    if (result.type !== "ok") throw new Error("fixture setup failed");
    // Passing "owned" here must not override the manifest's recorded "user-preserved" class.
    expect(result.value.dispositionFor("memory/team.md", "owned", "anything")).toEqual({ type: "preserve" });
  });
});

describe("UpgradeSource#dispositionFor — conservative sources (BR-U09)", () => {
  test("owned always overwrites, user-preserved always preserves, shared always backs up", () => {
    const result = UpgradeSource.fromInstallation(manualOrUnknownInstallation(evidence()), false);
    if (result.type !== "ok") throw new Error("fixture setup failed");
    const source = result.value;
    expect(source.dispositionFor("amadeus-tool.ts", "owned", "anything")).toEqual({ type: "overwrite" });
    expect(source.dispositionFor("memory/team.md", "user-preserved", "anything")).toEqual({ type: "preserve" });
    expect(source.dispositionFor("settings.json", "shared", "anything")).toEqual({ type: "backup-then-copy" });
  });
});

describe("UpgradeSource#assess (BR-U05)", () => {
  test("manifested delegates to UpgradeAssessment.of using the manifest's distributionVersion", () => {
    const manifest = buildManifest([{ path: "settings.json", class: "shared", required: false, md5: "aaa" }], "1.0.0");
    const result = UpgradeSource.fromInstallation(manifestedInstallation(manifest), false);
    if (result.type !== "ok") throw new Error("fixture setup failed");
    const assessment = result.value.assess(ResolvedVersion.fromRelease(semver("1.1.0")), VersionSpec.latest());
    expect(assessment?.outcome().type).toBe("proceed");
  });

  test("edge case: conservative sources return null (installed version unknown)", () => {
    const result = UpgradeSource.fromInstallation(manualOrUnknownInstallation(evidence()), false);
    if (result.type !== "ok") throw new Error("fixture setup failed");
    expect(result.value.assess(ResolvedVersion.fromRelease(semver("9.9.9")), VersionSpec.latest())).toBeNull();
  });
});

describe("UpgradeSource#nextManifest (BR-U14)", () => {
  test("manifested upgrades the existing manifest (upgradedTo)", () => {
    const manifest = buildManifest([{ path: "settings.json", class: "shared", required: false, md5: "aaa" }], "1.0.0");
    const result = UpgradeSource.fromInstallation(manifestedInstallation(manifest), false);
    if (result.type !== "ok") throw new Error("fixture setup failed");
    const filesResult = ManifestFiles.fromEntries([{ path: "settings.json", class: "shared", required: false, md5: "bbb" }]);
    if (filesResult.type === "err") throw new Error("fixture setup failed");
    const next = result.value.nextManifest({
      payload: fakePayload(ResolvedVersion.fromRelease(semver("1.1.0"))),
      files: filesResult.value,
      meta: { installerPackageVersion: "0.1.0", harness: claudeHarness(), installStartedAt: "2026-07-08T13:00:00.000Z" },
    });
    expect(next.distributionVersion.format()).toBe("v1.1.0");
  });

  test("edge case: conservative sources build a fresh manifest (Manifest.build)", () => {
    const result = UpgradeSource.fromInstallation(manualOrUnknownInstallation(evidence()), false);
    if (result.type !== "ok") throw new Error("fixture setup failed");
    const filesResult = ManifestFiles.fromEntries([{ path: "settings.json", class: "shared", required: false, md5: "bbb" }]);
    if (filesResult.type === "err") throw new Error("fixture setup failed");
    const next = result.value.nextManifest({
      payload: fakePayload(ResolvedVersion.fromRelease(semver("1.1.0"))),
      files: filesResult.value,
      meta: { installerPackageVersion: "0.1.0", harness: claudeHarness(), installStartedAt: "2026-07-08T13:00:00.000Z" },
    });
    expect(next.distributionVersion.format()).toBe("v1.1.0");
    expect(next.schemaVersion).toBe(1);
  });
});

describe("UpgradeSource#strategyNote", () => {
  test("each kind returns a distinct, non-empty note", () => {
    const manifested = UpgradeSource.fromInstallation(
      manifestedInstallation(buildManifest([{ path: "settings.json", class: "shared", required: false, md5: "aaa" }])),
      false,
    );
    const manual = UpgradeSource.fromInstallation(manualOrUnknownInstallation(evidence()), false);
    const forced = UpgradeSource.fromInstallation(partialInstallation(["amadeus-common directory"]), true);
    if (manifested.type !== "ok" || manual.type !== "ok" || forced.type !== "ok") throw new Error("fixture setup failed");
    const notes = [manifested.value.strategyNote(), manual.value.strategyNote(), forced.value.strategyNote()];
    for (const note of notes) expect(note.length).toBeGreaterThan(0);
    expect(new Set(notes).size).toBe(3);
  });
});
