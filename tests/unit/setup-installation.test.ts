// covers: domain:setup-installation
//
// Installation.detect — none / manifested / manual-or-unknown / partial
// classification, and installation.admitsInstall(force) (BR-I07~I09).
// Uses real temp directories and U1's real manifestIo (only the manifest
// content and directory layout are fixtures; no fake ports here).

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Installation } from "../../packages/setup/src/domain/installation.ts";
import type { InstallationError } from "../../packages/setup/src/domain/installation.ts";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";
import { Manifest, ManifestFiles } from "../../packages/setup/src/domain/manifest.ts";
import { ResolvedVersion } from "../../packages/setup/src/domain/resolved-version.ts";
import { SemVer } from "../../packages/setup/src/domain/semver.ts";
import { createFsRead, createFsWrite } from "../../packages/setup/src/ports/fsops.ts";
import { createManifestIo, manifestPathFor } from "../../packages/setup/src/modules/manifest-io.ts";
import type { ExtractedPayload } from "../../packages/setup/src/domain/payload.ts";
import type { Result } from "../../packages/setup/src/shared/result.ts";

function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "amadeus-setup-installation-"));
  return fn(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
}

// FR-742: detect now returns a Result — the corrupt-manifest case is a loud
// err. Existing classification tests only care about the ok Installation, so
// unwrap it here and fail the test loudly if detection erred unexpectedly.
function detectOk(result: Result<Installation, InstallationError>): Installation {
  if (result.type === "err") throw new Error(`expected an ok installation, got err: ${result.error.type}`);
  return result.value;
}

function claudeHarness(): HarnessName {
  const claude = HarnessName.all.find((h) => (h as string) === "claude");
  if (!claude) throw new Error("fixture setup: 'claude' must be a known harness");
  return claude;
}

describe("Installation.detect", () => {
  test("an empty target is kind 'none'", async () => {
    await withTempDir(async (dir) => {
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const installation = detectOk(await Installation.detect(dir, manifestIo));
      expect(installation.kind).toBe("none");
    });
  });

  test("a target with a written manifest is kind 'manifested'", async () => {
    await withTempDir(async (dir) => {
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const filesResult = ManifestFiles.fromEntries([{ path: "settings.json", class: "owned", required: true, md5: "aaa" }]);
      if (filesResult.type === "err") throw new Error("fixture setup failed");
      const semverResult = SemVer.parse("1.0.0");
      if (semverResult.type === "err") throw new Error("fixture setup failed");
      const fakePayload: ExtractedPayload = {
        version: ResolvedVersion.fromRelease(semverResult.value),
        harnessRoot: () => {
          throw new Error("not used in this test");
        },
        availableHarnesses: () => HarnessName.all,
      };
      const manifest = Manifest.build(fakePayload, filesResult.value, {
        installerPackageVersion: "0.1.0",
        harness: claudeHarness(),
        installStartedAt: "2026-07-08T12:00:00.000Z",
      });
      const written = await manifestIo.write(dir, manifest);
      if (written.type === "err") throw new Error("fixture setup failed to write manifest");
      // FR-656-2 fixture: settings.json is manifest-listed as required but never
      // written to disk. Written separately below since this happy-path test
      // asserts the all-present case; the missing-file case has its own test.
      writeFileSync(join(dir, "settings.json"), "{}\n");

      const installation = detectOk(await Installation.detect(dir, manifestIo));
      expect(installation.kind).toBe("manifested");
      if (installation.kind === "manifested") expect(installation.manifest.sourceTag).toBe("v1.0.0");
    });
  });

  // FR-656-2 (issue #656): a readable manifest alone is not proof the
  // installation is intact — verify each manifest-listed required file still
  // exists on disk. If one is missing, the accurate classification is
  // 'partial', not an unconditional 'manifested'.
  test("FR-656-2: a readable manifest whose required file is missing on disk is kind 'partial'", async () => {
    await withTempDir(async (dir) => {
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const filesResult = ManifestFiles.fromEntries([{ path: "settings.json", class: "owned", required: true, md5: "aaa" }]);
      if (filesResult.type === "err") throw new Error("fixture setup failed");
      const semverResult = SemVer.parse("1.0.0");
      if (semverResult.type === "err") throw new Error("fixture setup failed");
      const fakePayload: ExtractedPayload = {
        version: ResolvedVersion.fromRelease(semverResult.value),
        harnessRoot: () => {
          throw new Error("not used in this test");
        },
        availableHarnesses: () => HarnessName.all,
      };
      const manifest = Manifest.build(fakePayload, filesResult.value, {
        installerPackageVersion: "0.1.0",
        harness: claudeHarness(),
        installStartedAt: "2026-07-08T12:00:00.000Z",
      });
      const written = await manifestIo.write(dir, manifest);
      if (written.type === "err") throw new Error("fixture setup failed to write manifest");
      // Deliberately do NOT write settings.json to disk: the manifest lists it
      // as required, but the file itself is gone.

      const installation = detectOk(await Installation.detect(dir, manifestIo));
      expect(installation.kind).toBe("partial");
      if (installation.kind === "partial") expect(installation.missing).toContain("settings.json");
    });
  });

  test("a manual copy with both required anchors is kind 'manual-or-unknown'", async () => {
    await withTempDir(async (dir) => {
      mkdirSync(join(dir, ".claude", "tools"), { recursive: true });
      mkdirSync(join(dir, ".claude", "amadeus-common"), { recursive: true });
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const installation = detectOk(await Installation.detect(dir, manifestIo));
      expect(installation.kind).toBe("manual-or-unknown");
    });
  });

  test("edge case: an engine directory missing a required anchor is kind 'partial'", async () => {
    await withTempDir(async (dir) => {
      mkdirSync(join(dir, ".claude", "tools"), { recursive: true });
      // amadeus-common deliberately absent
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const installation = detectOk(await Installation.detect(dir, manifestIo));
      expect(installation.kind).toBe("partial");
      if (installation.kind === "partial") expect(installation.missing.length).toBeGreaterThan(0);
    });
  });

  test("review correction 3: a bare engineDir with an unrelated file and no Amadeus anchor is kind 'none'", async () => {
    await withTempDir(async (dir) => {
      mkdirSync(join(dir, ".claude"), { recursive: true });
      writeFileSync(join(dir, ".claude", "settings.json"), "{}\n"); // unrelated content, not an Amadeus anchor
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const installation = detectOk(await Installation.detect(dir, manifestIo));
      expect(installation.kind).toBe("none");
      expect(installation.admitsInstall(false).type).toBe("proceed"); // install can proceed without --force
    });
  });

  // FR-656-1 (issue #656): an anchor-less legacy layout recognizable only by
  // its owned-file naming (loose amadeus-* entries) must surface as
  // 'manual-or-unknown' evidence, not 'partial' — otherwise LegacyLayout
  // condition (b) in upgrade.ts never fires and the unsupported layout is
  // instead treated as force-continuable.
  test("FR-656-1: an engineDir with only loose amadeus-* entries (no anchors) is kind 'manual-or-unknown'", async () => {
    await withTempDir(async (dir) => {
      mkdirSync(join(dir, ".claude"), { recursive: true });
      // Legacy owned-file naming, no tools/ or amadeus-common/ anchor present.
      writeFileSync(join(dir, ".claude", "amadeus-runtime.ts"), "// legacy owned file\n");
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const installation = detectOk(await Installation.detect(dir, manifestIo));
      expect(installation.kind).toBe("manual-or-unknown");
    });
  });

  // FR-742 (issue #742): a manifest present on disk but not valid JSON is a
  // loud detection error, not silently reported as 'none' (which would tell the
  // user to run `install` and overwrite a real, if damaged, installation). The
  // err carries the manifest path so the caller can point the user at it.
  // Before the fix, detect() swallowed the read err and fell through to the
  // evidence scan, returning kind 'none' — this case fails against that.
  test("FR-742: a present-but-malformed manifest is a loud corrupt-manifest err, not kind 'none'", async () => {
    await withTempDir(async (dir) => {
      const manifestPath = manifestPathFor(dir);
      mkdirSync(join(dir, ".claude", "tools"), { recursive: true }); // a real (if damaged) install exists on disk
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const written = await manifestIo.write(dir, buildClaudeManifest());
      if (written.type === "err") throw new Error("fixture setup failed to write manifest");
      writeFileSync(manifestPath, '{"schemaVersion": 1, "harness": '); // truncated mid-write: invalid JSON

      const result = await Installation.detect(dir, manifestIo);
      expect(result.type).toBe("err");
      if (result.type === "err") {
        expect(result.error.type).toBe("corrupt-manifest");
        expect(result.error.path).toBe(manifestPath);
        expect(result.error.cause.type).toBe("malformed");
      }
    });
  });
});

function buildClaudeManifest(): Manifest {
  const filesResult = ManifestFiles.fromEntries([{ path: "settings.json", class: "owned", required: false, md5: "aaa" }]);
  if (filesResult.type === "err") throw new Error("fixture setup failed");
  const semverResult = SemVer.parse("1.0.0");
  if (semverResult.type === "err") throw new Error("fixture setup failed");
  const fakePayload: ExtractedPayload = {
    version: ResolvedVersion.fromRelease(semverResult.value),
    harnessRoot: () => {
      throw new Error("not used in this test");
    },
    availableHarnesses: () => HarnessName.all,
  };
  return Manifest.build(fakePayload, filesResult.value, {
    installerPackageVersion: "0.1.0",
    harness: claudeHarness(),
    installStartedAt: "2026-07-08T12:00:00.000Z",
  });
}

describe("Installation#admitsInstall (BR-I07~I09)", () => {
  test("kind 'none' always proceeds, even with force", async () => {
    await withTempDir(async (dir) => {
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const installation = detectOk(await Installation.detect(dir, manifestIo));
      expect(installation.admitsInstall(false).type).toBe("proceed");
      expect(installation.admitsInstall(true).type).toBe("proceed");
    });
  });

  test("a detected installation without force refuses and suggests upgrade", async () => {
    await withTempDir(async (dir) => {
      mkdirSync(join(dir, ".claude", "tools"), { recursive: true });
      mkdirSync(join(dir, ".claude", "amadeus-common"), { recursive: true });
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const installation = detectOk(await Installation.detect(dir, manifestIo));
      const admission = installation.admitsInstall(false);
      expect(admission.type).toBe("refuse-suggest-upgrade");
    });
  });

  test("edge case: a detected installation with force proceeds as forced", async () => {
    await withTempDir(async (dir) => {
      mkdirSync(join(dir, ".claude", "tools"), { recursive: true });
      mkdirSync(join(dir, ".claude", "amadeus-common"), { recursive: true });
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const installation = detectOk(await Installation.detect(dir, manifestIo));
      expect(installation.admitsInstall(true).type).toBe("proceed-forced");
    });
  });
});
