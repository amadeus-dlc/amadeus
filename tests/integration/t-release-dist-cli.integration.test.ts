import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runReleaseDistCli } from "../../scripts/release-dist.ts";
import { discoverHarnessNames } from "../../scripts/package.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("release-dist CLI", () => {
  test("builds the three release files and reports the verified bundle", async () => {
    const root = mkdtempSync(join(tmpdir(), "release-dist-cli-"));
    roots.push(root);
    const distRoot = join(root, "dist");
    const outputDir = join(root, "release-assets");
    for (const harness of discoverHarnessNames()) {
      mkdirSync(join(distRoot, harness, "engine"), { recursive: true });
      writeFileSync(join(distRoot, harness, "engine", `${harness}.txt`), `${harness}\n`);
    }
    const stdout: string[] = [];
    const stderr: string[] = [];

    const code = await runReleaseDistCli(["--version", "4.5.6"], {
      distRoot,
      outputDir,
      stdout: (line) => stdout.push(line),
      stderr: (line) => stderr.push(line),
    });

    expect(code).toBe(0);
    expect(stderr).toEqual([]);
    expect(stdout.join("\n")).toContain("release-dist: self-check OK");
    expect(existsSync(join(outputDir, "amadeus-dist-v4.5.6.tar.gz"))).toBe(true);
    expect(existsSync(join(outputDir, "amadeus-dist-v4.5.6.manifest.json"))).toBe(true);
    expect(existsSync(join(outputDir, "SHA256SUMS"))).toBe(true);
  });

  test("returns non-zero and a loud reason for invalid input", async () => {
    const stderr: string[] = [];
    const code = await runReleaseDistCli(["--version", "../../bad"], {
      distRoot: "dist",
      outputDir: "release-assets",
      stdout: () => {},
      stderr: (line) => stderr.push(line),
    });
    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("release-dist:");
  });
});
