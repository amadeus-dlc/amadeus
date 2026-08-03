// @test-size medium
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statfsSync,
  symlinkSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
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

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function rewriteManifestChecksum(bundle: {
  readonly manifestPath: string;
  readonly checksumPath: string;
}): void {
  const manifestName = basename(bundle.manifestPath);
  const lines = readFileSync(bundle.checksumPath, "utf8")
    .trimEnd()
    .split("\n")
    .map((line) => (line.endsWith(`  ${manifestName}`) ? `${sha256(bundle.manifestPath)}  ${manifestName}` : line));
  writeFileSync(bundle.checksumPath, `${lines.join("\n")}\n`);
}

function writeUnsafeArchive(sourcePath: string, targetPath: string): void {
  const rawTar = gunzipSync(readFileSync(sourcePath));
  rawTar.fill(0, 0, 100);
  rawTar.write("bad/../entry", 0, "utf8");
  rawTar.fill(0x20, 148, 156);
  const checksum = rawTar.subarray(0, 512).reduce((sum, byte) => sum + byte, 0);
  rawTar.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, "binary");
  writeFileSync(targetPath, gzipSync(rawTar, { level: 9 }));
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

  test("supports split ustar paths and removes staging after an unrepresentable path", async () => {
    const longRoot = tempRoot("release-dist-long-path-");
    const longDist = fixtureDist(longRoot);
    const longDirectory = "nested-".repeat(12);
    mkdirSync(join(longDist, "claude", longDirectory), { recursive: true });
    writeFileSync(join(longDist, "claude", longDirectory, "payload.txt"), "long path\n");
    expect(
      await buildDistAssets({ version: "1.0.0", distRoot: longDist, outputDir: join(longRoot, "out") }),
    ).toBeDefined();

    const rejectedRoot = tempRoot("release-dist-rejected-path-");
    const rejectedDist = fixtureDist(rejectedRoot);
    writeFileSync(join(rejectedDist, "claude", "x".repeat(101)), "unrepresentable\n");
    await expect(
      buildDistAssets({ version: "1.0.0", distRoot: rejectedDist, outputDir: join(rejectedRoot, "out") }),
    ).rejects.toThrow("archive path cannot be represented as ustar");
    expect(existsSync(join(rejectedRoot, "out"))).toBe(false);
    expect(readdirSync(rejectedRoot).some((name) => name.startsWith(".release-dist-"))).toBe(false);
  });

  test("rejects unsafe paths while inspecting a tar archive", async () => {
    const root = tempRoot("release-dist-unsafe-tar-");
    const bundle = await buildDistAssets({
      version: "1.0.0",
      distRoot: fixtureDist(root),
      outputDir: join(root, "out"),
    });
    const unsafeTar = join(root, "unsafe.tar.gz");
    writeUnsafeArchive(bundle.tarPath, unsafeTar);
    await expect(inspectDistArchive(unsafeTar)).rejects.toThrow("unsafe archive path");
  });

  test("rejects invalid manifests and mismatched manifest filenames", async () => {
    const invalidRoot = tempRoot("release-dist-invalid-manifest-");
    const invalidBundle = await buildDistAssets({
      version: "1.0.0",
      distRoot: fixtureDist(invalidRoot),
      outputDir: join(invalidRoot, "out"),
    });
    const invalidManifest = JSON.parse(readFileSync(invalidBundle.manifestPath, "utf8"));
    invalidManifest.schema = 2;
    writeFileSync(invalidBundle.manifestPath, `${JSON.stringify(invalidManifest, null, 2)}\n`);
    await expect(verifyDistAssets(invalidBundle)).rejects.toThrow("manifest contains invalid field values");

    const nameRoot = tempRoot("release-dist-manifest-name-");
    const nameBundle = await buildDistAssets({
      version: "1.0.0",
      distRoot: fixtureDist(nameRoot),
      outputDir: join(nameRoot, "out"),
    });
    const wrongManifestPath = join(nameRoot, "out", "wrong.manifest.json");
    writeFileSync(wrongManifestPath, readFileSync(nameBundle.manifestPath));
    await expect(verifyDistAssets({ ...nameBundle, manifestPath: wrongManifestPath })).rejects.toThrow(
      "manifest filename does not match version",
    );
  });

  test("detects manifest harness and file-count mismatches after checksum validation", async () => {
    const harnessRoot = tempRoot("release-dist-harness-mismatch-");
    const harnessBundle = await buildDistAssets({
      version: "1.0.0",
      distRoot: fixtureDist(harnessRoot),
      outputDir: join(harnessRoot, "out"),
    });
    const harnessManifest = JSON.parse(readFileSync(harnessBundle.manifestPath, "utf8"));
    harnessManifest.harnesses = harnessManifest.harnesses.slice(1);
    writeFileSync(harnessBundle.manifestPath, `${JSON.stringify(harnessManifest, null, 2)}\n`);
    rewriteManifestChecksum(harnessBundle);
    await expect(verifyDistAssets(harnessBundle)).rejects.toThrow("manifest harnesses mismatch");

    const countRoot = tempRoot("release-dist-count-mismatch-");
    const countBundle = await buildDistAssets({
      version: "1.0.0",
      distRoot: fixtureDist(countRoot),
      outputDir: join(countRoot, "out"),
    });
    const countManifest = JSON.parse(readFileSync(countBundle.manifestPath, "utf8"));
    countManifest.fileCount += 1;
    writeFileSync(countBundle.manifestPath, `${JSON.stringify(countManifest, null, 2)}\n`);
    rewriteManifestChecksum(countBundle);
    await expect(verifyDistAssets(countBundle)).rejects.toThrow("manifest fileCount mismatch");
  });

  test("rejects a payload when available disk cannot satisfy required headroom", async () => {
    const root = tempRoot("release-dist-disk-headroom-");
    const distRoot = fixtureDist(root);
    const disk = statfsSync(root);
    const harness = discoverHarnessNames()[0];
    const sparsePath = join(distRoot, harness, "sparse.bin");
    writeFileSync(sparsePath, "");
    truncateSync(sparsePath, Math.floor((disk.bavail * disk.bsize) / 2));
    await expect(buildDistAssets({ version: "1.0.0", distRoot, outputDir: join(root, "out") })).rejects.toThrow(
      "insufficient disk headroom",
    );
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
