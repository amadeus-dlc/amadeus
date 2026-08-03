import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildDistAssets, inspectDistArchive, verifyDistAssets } from "../../scripts/release-dist.ts";
import { discoverHarnessNames } from "../../scripts/package.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("release dist end-to-end", () => {
  test("round-trips a multi-root dist into byte-identical verified release assets", async () => {
    const root = mkdtempSync(join(tmpdir(), "release-dist-e2e-"));
    roots.push(root);
    const distRoot = join(root, "dist");
    const payloadRoots = [...discoverHarnessNames(), "plugins"].sort();
    for (const name of payloadRoots) {
      mkdirSync(join(distRoot, name, "nested"), { recursive: true });
      writeFileSync(join(distRoot, name, "nested", `${name}.txt`), `${name}\n`);
    }

    const first = await buildDistAssets({ version: "9.8.7", distRoot, outputDir: join(root, "first") });
    const second = await buildDistAssets({ version: "9.8.7", distRoot, outputDir: join(root, "second") });

    for (const key of ["tarPath", "manifestPath", "checksumPath"] as const) {
      expect(readFileSync(first[key]).equals(readFileSync(second[key]))).toBe(true);
    }
    expect(await verifyDistAssets(first)).toEqual({ kind: "ok" });
    expect(await inspectDistArchive(first.tarPath)).toMatchObject({
      wrapper: "amadeus-dist-v9.8.7",
      harnesses: payloadRoots,
      fileCount: payloadRoots.length,
    });
  });
});
