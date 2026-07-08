// covers: domain:setup-manifest
//
// ManifestFiles (dispositionFor/requiredPaths/duplicate-path invariant) and
// Manifest (build/parse round trip, schema checks, isNewerThan, upgradedTo).
// BR-F11~F15, FR-008, FR-016.

import { describe, expect, test } from "bun:test";
import { HarnessName } from "../../packages/setup/src/domain/harness.ts";
import { Manifest, ManifestFiles, type ManifestFile } from "../../packages/setup/src/domain/manifest.ts";
import { ResolvedVersion } from "../../packages/setup/src/domain/resolved-version.ts";
import { fakePayload, semver } from "../lib/setup-domain-fixtures.ts";

const FILES: ManifestFile[] = [
  { path: "settings.json", class: "owned", required: true, md5: "aaa" },
  { path: "team.md", class: "shared", required: true, md5: "bbb" },
  { path: "local.md", class: "user-preserved", required: false, md5: "ccc" },
];

function buildFiles(entries: ManifestFile[] = FILES): ManifestFiles {
  const result = ManifestFiles.fromEntries(entries);
  if (result.type === "err") throw new Error(`unexpected err: ${result.error.type}`);
  return result.value;
}

describe("ManifestFiles.fromEntries", () => {
  test("edge case: rejects duplicate paths", () => {
    const result = ManifestFiles.fromEntries([...FILES, { path: "settings.json", class: "owned", required: true, md5: "zzz" }]);
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error.type).toBe("duplicate-path");
  });

  test("requiredPaths() lists only required entries", () => {
    expect([...buildFiles().requiredPaths()].sort()).toEqual(["settings.json", "team.md"]);
  });
});

describe("ManifestFiles#dispositionFor (FR-008)", () => {
  const files = buildFiles();

  test("owned file is always overwrite", () => {
    expect(files.dispositionFor("settings.json", "anything").type).toBe("overwrite");
  });

  test("shared file with matching md5 is overwrite", () => {
    expect(files.dispositionFor("team.md", "bbb").type).toBe("overwrite");
  });

  test("shared file with mismatched md5 is backup-then-copy", () => {
    expect(files.dispositionFor("team.md", "different").type).toBe("backup-then-copy");
  });

  test("user-preserved file is always preserve", () => {
    expect(files.dispositionFor("local.md", "anything").type).toBe("preserve");
  });

  test("edge case: an unlisted path defaults to overwrite (treated as owned)", () => {
    expect(files.dispositionFor("new-file.txt", null).type).toBe("overwrite");
  });

  test("edge case: shared file with a null actual md5 (missing on disk) is backup-then-copy", () => {
    expect(files.dispositionFor("team.md", null).type).toBe("backup-then-copy");
  });
});

describe("Manifest.build / toJSON / parse round trip", () => {
  test("build() then toJSON() then parse() reproduces the same manifest", () => {
    const built = Manifest.build(fakePayload(), buildFiles(), {
      installerPackageVersion: "0.1.0",
      harness: HarnessName.all[0] as HarnessName,
      installStartedAt: "2026-07-08T12:00:00.000Z",
    });
    const json = built.toJSON();
    const parsed = Manifest.parse(json);
    expect(parsed.type).toBe("ok");
    if (parsed.type === "ok") {
      expect(parsed.value.toJSON()).toEqual(json);
    }
  });

  test("edge case: rejects an unsupported schemaVersion (BR-F12)", () => {
    const result = Manifest.parse({ schemaVersion: 2 });
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error.type).toBe("schema-unsupported");
  });

  test("edge case: rejects a malformed manifest missing required fields", () => {
    const result = Manifest.parse({ schemaVersion: 1 });
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error.type).toBe("malformed");
  });

  test("edge case: rejects an unknown harness string", () => {
    const built = Manifest.build(fakePayload(), buildFiles(), {
      installerPackageVersion: "0.1.0",
      harness: HarnessName.all[0] as HarnessName,
      installStartedAt: "2026-07-08T12:00:00.000Z",
    });
    const json = { ...built.toJSON(), harness: "not-a-real-harness" };
    const result = Manifest.parse(json);
    expect(result.type).toBe("err");
    if (result.type === "err") expect(result.error.type).toBe("unknown-harness");
  });
});

describe("Manifest#isNewerThan / upgradedTo", () => {
  test("isNewerThan delegates to the distribution SemVer", () => {
    const manifest = Manifest.build(fakePayload(ResolvedVersion.fromRelease(semver("2.0.0"))), buildFiles(), {
      installerPackageVersion: "0.1.0",
      harness: HarnessName.all[0] as HarnessName,
      installStartedAt: "2026-07-08T12:00:00.000Z",
    });
    expect(manifest.isNewerThan(semver("1.0.0"))).toBe(true);
    expect(manifest.isNewerThan(semver("3.0.0"))).toBe(false);
  });

  test("upgradedTo() returns a new Manifest reflecting the next payload", () => {
    const original = Manifest.build(fakePayload(ResolvedVersion.fromRelease(semver("1.0.0"))), buildFiles(), {
      installerPackageVersion: "0.1.0",
      harness: HarnessName.all[0] as HarnessName,
      installStartedAt: "2026-07-08T12:00:00.000Z",
    });
    const upgraded = original.upgradedTo({
      payload: fakePayload(ResolvedVersion.fromRelease(semver("2.0.0"))),
      files: buildFiles(),
      meta: {
        installerPackageVersion: "0.1.0",
        harness: HarnessName.all[0] as HarnessName,
        installStartedAt: "2026-07-09T00:00:00.000Z",
      },
    });
    expect(upgraded.sourceTag).toBe("v2.0.0");
    expect(original.sourceTag).toBe("v1.0.0"); // edge case: original instance is untouched (immutable update)
  });
});
