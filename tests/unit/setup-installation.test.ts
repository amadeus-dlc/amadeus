// covers: domain:setup-installation
//
// Installation.detect — none / manifested / manual-or-unknown / partial
// classification, and installation.admitsInstall(force) (BR-I07~I09).
// Uses real temp directories and U1's real manifestIo (only the manifest
// content and directory layout are fixtures; no fake ports here).

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Installation } from "../../packages/setup/src/domain/installation.ts";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";
import { Manifest, ManifestFiles } from "../../packages/setup/src/domain/manifest.ts";
import { ResolvedVersion } from "../../packages/setup/src/domain/resolved-version.ts";
import { SemVer } from "../../packages/setup/src/domain/semver.ts";
import { createFsRead, createFsWrite } from "../../packages/setup/src/ports/fsops.ts";
import { createManifestIo } from "../../packages/setup/src/modules/manifest-io.ts";
import type { ExtractedPayload } from "../../packages/setup/src/domain/payload.ts";

function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "amadeus-setup-installation-"));
  return fn(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
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
      const installation = await Installation.detect(dir, manifestIo);
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

      const installation = await Installation.detect(dir, manifestIo);
      expect(installation.kind).toBe("manifested");
      if (installation.kind === "manifested") expect(installation.manifest.sourceTag).toBe("v1.0.0");
    });
  });

  test("a manual copy with both required anchors is kind 'manual-or-unknown'", async () => {
    await withTempDir(async (dir) => {
      mkdirSync(join(dir, ".claude", "tools"), { recursive: true });
      mkdirSync(join(dir, ".claude", "amadeus-common"), { recursive: true });
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const installation = await Installation.detect(dir, manifestIo);
      expect(installation.kind).toBe("manual-or-unknown");
    });
  });

  test("edge case: an engine directory missing a required anchor is kind 'partial'", async () => {
    await withTempDir(async (dir) => {
      mkdirSync(join(dir, ".claude", "tools"), { recursive: true });
      // amadeus-common deliberately absent
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const installation = await Installation.detect(dir, manifestIo);
      expect(installation.kind).toBe("partial");
      if (installation.kind === "partial") expect(installation.missing.length).toBeGreaterThan(0);
    });
  });
});

describe("Installation#admitsInstall (BR-I07~I09)", () => {
  test("kind 'none' always proceeds, even with force", async () => {
    await withTempDir(async (dir) => {
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const installation = await Installation.detect(dir, manifestIo);
      expect(installation.admitsInstall(false).type).toBe("proceed");
      expect(installation.admitsInstall(true).type).toBe("proceed");
    });
  });

  test("a detected installation without force refuses and suggests upgrade", async () => {
    await withTempDir(async (dir) => {
      mkdirSync(join(dir, ".claude", "tools"), { recursive: true });
      mkdirSync(join(dir, ".claude", "amadeus-common"), { recursive: true });
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const installation = await Installation.detect(dir, manifestIo);
      const admission = installation.admitsInstall(false);
      expect(admission.type).toBe("refuse-suggest-upgrade");
    });
  });

  test("edge case: a detected installation with force proceeds as forced", async () => {
    await withTempDir(async (dir) => {
      mkdirSync(join(dir, ".claude", "tools"), { recursive: true });
      mkdirSync(join(dir, ".claude", "amadeus-common"), { recursive: true });
      const manifestIo = createManifestIo(createFsRead(), createFsWrite());
      const installation = await Installation.detect(dir, manifestIo);
      expect(installation.admitsInstall(true).type).toBe("proceed-forced");
    });
  });
});
