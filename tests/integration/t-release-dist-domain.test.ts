// @test-size medium
import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  archiveSizeStatus,
  buildDistAssets,
  inspectDistArchive,
  parseDistAssetVersion,
  requiredDiskHeadroom,
  verifyDistAssets,
} from "../../scripts/release-dist.ts";
import { discoverHarnessNames } from "../../scripts/package.ts";

const roots: string[] = [];

function tempRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function fixtureDist(root: string): string {
  const distRoot = join(root, "dist");
  for (const harness of discoverHarnessNames()) {
    mkdirSync(join(distRoot, harness, "engine"), { recursive: true });
    writeFileSync(join(distRoot, harness, "engine", `${harness}.txt`), `${harness}\n`);
  }
  mkdirSync(join(distRoot, "plugins", "example"), { recursive: true });
  writeFileSync(join(distRoot, "plugins", "example", "plugin.json"), "{}\n");
  return distRoot;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("release dist domain", () => {
  test("parses a release semver and rejects path-shaped input", () => {
    const valid = parseDistAssetVersion("1.2.3-beta.1");
    expect(valid.ok).toBe(true);
    if (valid.ok) expect(String(valid.value)).toBe("1.2.3-beta.1");
    expect(parseDistAssetVersion("v1.2.3")).toEqual({ ok: false, error: "version must be a semver without a v prefix" });
    expect(parseDistAssetVersion("1.2.3/../../escape").ok).toBe(false);
  });

  test("builds deterministic assets with the exact schema and tar-derived facts", async () => {
    const root = tempRoot("release-dist-unit-");
    const distRoot = fixtureDist(root);
    const first = await buildDistAssets({ version: "1.2.3", distRoot, outputDir: join(root, "out-a") });
    const second = await buildDistAssets({ version: "1.2.3", distRoot, outputDir: join(root, "out-b") });

    expect(readFileSync(first.tarPath).equals(readFileSync(second.tarPath))).toBe(true);
    expect(readFileSync(first.manifestPath).equals(readFileSync(second.manifestPath))).toBe(true);
    expect(readFileSync(first.checksumPath).equals(readFileSync(second.checksumPath))).toBe(true);

    const manifest = JSON.parse(readFileSync(first.manifestPath, "utf8"));
    expect(Object.keys(manifest)).toEqual([
      "schema",
      "version",
      "tarball",
      "sha256",
      "sizeBytes",
      "harnesses",
      "fileCount",
    ]);
    expect(manifest.harnesses).toEqual([...discoverHarnessNames(), "plugins"].sort());
    expect(manifest.fileCount).toBe(discoverHarnessNames().length + 1);

    const archive = await inspectDistArchive(first.tarPath);
    expect(archive.wrapper).toBe("amadeus-dist-v1.2.3");
    expect(archive.harnesses).toEqual(manifest.harnesses);
    expect(archive.fileCount).toBe(manifest.fileCount);
    expect(await verifyDistAssets(first)).toEqual({ kind: "ok" });
  });

  test("writes SHA256SUMS only after tar and manifest digests exist", async () => {
    const root = tempRoot("release-dist-checksums-");
    const bundle = await buildDistAssets({
      version: "2.0.0",
      distRoot: fixtureDist(root),
      outputDir: join(root, "out"),
    });
    const lines = readFileSync(bundle.checksumPath, "utf8").trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^[0-9a-f]{64} {2}amadeus-dist-v2\.0\.0\.tar\.gz$/);
    expect(lines[1]).toMatch(/^[0-9a-f]{64} {2}amadeus-dist-v2\.0\.0\.manifest\.json$/);
  });

  test("fails closed for missing roots, non-empty output, and symlinks", async () => {
    const emptyRoot = tempRoot("release-dist-empty-");
    await expect(
      buildDistAssets({ version: "1.0.0", distRoot: join(emptyRoot, "missing"), outputDir: join(emptyRoot, "out") }),
    ).rejects.toThrow("dist root does not exist");

    const occupiedRoot = tempRoot("release-dist-occupied-");
    const occupiedDist = fixtureDist(occupiedRoot);
    mkdirSync(join(occupiedRoot, "out"));
    writeFileSync(join(occupiedRoot, "out", "keep"), "occupied\n");
    await expect(
      buildDistAssets({ version: "1.0.0", distRoot: occupiedDist, outputDir: join(occupiedRoot, "out") }),
    ).rejects.toThrow("output directory is not empty");
    expect(existsSync(join(occupiedRoot, "out", "keep"))).toBe(true);

    const symlinkRoot = tempRoot("release-dist-symlink-");
    const symlinkDist = fixtureDist(symlinkRoot);
    symlinkSync(join(symlinkDist, "claude", "engine", "claude.txt"), join(symlinkDist, "claude", "link.ts"));
    await expect(
      buildDistAssets({ version: "1.0.0", distRoot: symlinkDist, outputDir: join(symlinkRoot, "out") }),
    ).rejects.toThrow("symlink entries are not allowed");
  });

  test("self-check detects manifest and archive tampering", async () => {
    const root = tempRoot("release-dist-tamper-");
    const bundle = await buildDistAssets({
      version: "3.0.0",
      distRoot: fixtureDist(root),
      outputDir: join(root, "out"),
    });
    const manifest = JSON.parse(readFileSync(bundle.manifestPath, "utf8"));
    manifest.fileCount += 1;
    writeFileSync(bundle.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await expect(verifyDistAssets(bundle)).rejects.toThrow("self-check FAILED");
  });

  test("computes deterministic performance and capacity guards", () => {
    expect(requiredDiskHeadroom(10)).toBe(512 * 1024 * 1024);
    expect(requiredDiskHeadroom(300 * 1024 * 1024)).toBe(900 * 1024 * 1024);
    expect(archiveSizeStatus(1024 ** 3)).toBe("ok");
    expect(archiveSizeStatus(1024 ** 3 + 1)).toBe("warning");
    expect(archiveSizeStatus(Math.floor(1.8 * 1024 ** 3) + 1)).toBe("reject");
  });
});
