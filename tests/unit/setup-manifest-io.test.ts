// covers: modules:setup-manifest-io
//
// createManifestIo — BR-F11 fixed path, BR-F15 absent-is-null, BR-F12 schema
// rejection, and a real read/write round trip against a temp directory.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFsRead, createFsWrite } from "../../packages/setup/src/ports/fsops.ts";
import { createManifestIo } from "../../packages/setup/src/modules/manifest-io.ts";
import { Manifest } from "../../packages/setup/src/domain/manifest.ts";
import { ManifestFiles } from "../../packages/setup/src/domain/manifest.ts";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";
import { ResolvedVersion } from "../../packages/setup/src/domain/resolved-version.ts";
import { SemVer } from "../../packages/setup/src/domain/semver.ts";
import type { ExtractedPayload } from "../../packages/setup/src/domain/payload.ts";

function withTargetDir<T>(fn: (targetDir: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "amadeus-setup-manifest-io-test-"));
  return fn(dir).finally(() => rmSync(dir, { recursive: true, force: true }));
}

function semver(raw: string) {
  const result = SemVer.parse(raw);
  if (result.type === "err") throw new Error(`invalid fixture version: ${raw}`);
  return result.value;
}

function fakePayload(): ExtractedPayload {
  return {
    version: ResolvedVersion.fromRelease(semver("1.0.0")),
    harnessRoot: () => {
      throw new Error("not used in this test");
    },
    availableHarnesses: () => HarnessName.all,
  };
}

function fakeManifest(): Manifest {
  const filesResult = ManifestFiles.fromEntries([{ path: "settings.json", class: "owned", required: true, md5: "aaa" }]);
  if (filesResult.type === "err") throw new Error("unexpected err building fixture files");
  return Manifest.build(fakePayload(), filesResult.value, {
    installerPackageVersion: "0.1.0",
    harness: HarnessName.all[0] as HarnessName,
    installStartedAt: "2026-07-08T12:00:00.000Z",
  });
}

describe("createManifestIo.read", () => {
  test("BR-F15: returns null (not an error) when no manifest exists", () =>
    withTargetDir(async (targetDir) => {
      const io = createManifestIo(createFsRead(), createFsWrite());
      const result = await io.read(targetDir);
      expect(result).toEqual({ type: "ok", value: null });
    }));

  test("BR-F12: rejects an unsupported schemaVersion", () =>
    withTargetDir(async (targetDir) => {
      const io = createManifestIo(createFsRead(), createFsWrite());
      await createFsWrite().writeText(
        join(targetDir, "amadeus", ".installer", "amadeus-setup-manifest.json"),
        JSON.stringify({ schemaVersion: 99 }),
      );
      const result = await io.read(targetDir);
      expect(result.type).toBe("err");
      if (result.type === "err") expect(result.error.type).toBe("schema-unsupported");
    }));

  test("edge case: rejects a manifest file that is not valid JSON", () =>
    withTargetDir(async (targetDir) => {
      const io = createManifestIo(createFsRead(), createFsWrite());
      await createFsWrite().writeText(join(targetDir, "amadeus", ".installer", "amadeus-setup-manifest.json"), "{not json");
      const result = await io.read(targetDir);
      expect(result.type).toBe("err");
      if (result.type === "err") expect(result.error.type).toBe("malformed");
    }));
});

describe("createManifestIo — write then read round trip", () => {
  test("BR-F11: writes to amadeus/.installer/amadeus-setup-manifest.json and reads it back equivalently", () =>
    withTargetDir(async (targetDir) => {
      const io = createManifestIo(createFsRead(), createFsWrite());
      const manifest = fakeManifest();

      const written = await io.write(targetDir, manifest);
      expect(written.type).toBe("ok");

      const read = await io.read(targetDir);
      expect(read.type).toBe("ok");
      if (read.type === "ok") {
        expect(read.value).not.toBeNull();
        expect(read.value?.toJSON()).toEqual(manifest.toJSON());
      }
    }));

  test("edge case: a second write overwrites the previous manifest", () =>
    withTargetDir(async (targetDir) => {
      const io = createManifestIo(createFsRead(), createFsWrite());
      await io.write(targetDir, fakeManifest());

      const filesResult = ManifestFiles.fromEntries([{ path: "other.json", class: "owned", required: false, md5: "zzz" }]);
      if (filesResult.type === "err") throw new Error("unexpected err");
      const second = Manifest.build(fakePayload(), filesResult.value, {
        installerPackageVersion: "0.2.0",
        harness: HarnessName.all[0] as HarnessName,
        installStartedAt: "2026-07-09T00:00:00.000Z",
      });
      await io.write(targetDir, second);

      const read = await io.read(targetDir);
      if (read.type === "ok") {
        expect(read.value?.installerPackageVersion).toBe("0.2.0");
      }
    }));
});
