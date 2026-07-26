// covers: file:scripts/plugin-projection.ts
// size: medium
//
// U2 walking-skeleton-claude — projectPluginForHarness is the C3 public seam that
// writes a claude install bundle into an outDir after a plan-stage output-safety
// check (assertSafeOutDir). It touches a real temp filesystem (mkdtemp + writes),
// so it lives in the integration tier (fs-tests-integration-first). Drives the
// happy write path, the non-claude U2 guard, and every assertSafeOutDir rejection
// (symlink / regular file / pre-existing non-empty directory) plus the non-existent
// outDir early return.

import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { discoverPluginSources, type PluginSource, projectPluginForHarness, validatePluginSources } from "../../scripts/plugin-projection.ts";

const FIXTURE = "zz-t303-fixture";

let ws = "";
let pluginsRoot = "";
let plugin: PluginSource;

beforeAll(() => {
  ws = mkdtempSync(join(tmpdir(), "amadeus-t303-src-"));
  pluginsRoot = join(ws, "plugins");
  mkdirSync(join(pluginsRoot, FIXTURE, "skills"), { recursive: true });
  writeFileSync(join(pluginsRoot, FIXTURE, "plugin.json"), `{"name":"${FIXTURE}"}\n`);
  writeFileSync(join(pluginsRoot, FIXTURE, "skills", "s.md"), "home {{HARNESS_DIR}} rules {{HARNESS_DIR}}/rules/x\n");
  [plugin] = validatePluginSources(discoverPluginSources(pluginsRoot));
});

let scratch = "";
beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "amadeus-t303-out-"));
});
afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("t303 projectPluginForHarness (C3 public seam)", () => {
  test("writes the claude install bundle into a non-existent outDir (early-return safety + write loop)", () => {
    const outDir = join(scratch, "bundle"); // does not exist yet → assertSafeOutDir early-returns
    const result = projectPluginForHarness(plugin, "claude", outDir);
    expect(result.harness).toBe("claude");
    expect(result.plugin).toBe(FIXTURE);
    expect(result.artifacts.length).toBeGreaterThan(0);
    // Every projected artifact was actually written to disk with its bytes.
    for (const a of result.artifacts) {
      const dest = join(outDir, ...a.relativePath.split("/"));
      expect(existsSync(dest)).toBe(true);
      expect(readFileSync(dest).equals(Buffer.from(a.bytes))).toBe(true);
    }
    // The claude marketplace manifest is among the written artifacts.
    expect(result.artifacts.some((a) => a.relativePath === ".claude-plugin/plugin.json")).toBe(true);
  });

  test("accepts a pre-existing empty outDir", () => {
    const outDir = join(scratch, "empty");
    mkdirSync(outDir, { recursive: true });
    const result = projectPluginForHarness(plugin, "claude", outDir);
    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(existsSync(join(outDir, ".claude-plugin", "plugin.json"))).toBe(true);
  });

  test("rejects a non-claude harness before any write (U2 guard)", () => {
    const outDir = join(scratch, "codex");
    expect(() => projectPluginForHarness(plugin, "codex", outDir)).toThrow(/only "claude" is implemented/);
    expect(existsSync(outDir)).toBe(false);
  });

  test("rejects a symlink outDir", () => {
    const target = join(scratch, "real");
    mkdirSync(target, { recursive: true });
    const link = join(scratch, "link");
    symlinkSync(target, link);
    expect(() => projectPluginForHarness(plugin, "claude", link)).toThrow(/symlink/);
  });

  test("rejects a regular-file outDir", () => {
    const file = join(scratch, "afile");
    writeFileSync(file, "not a dir");
    expect(() => projectPluginForHarness(plugin, "claude", file)).toThrow(/not a directory/);
  });

  test("rejects a pre-existing non-empty outDir", () => {
    const outDir = join(scratch, "nonempty");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "stray.txt"), "occupied");
    expect(() => projectPluginForHarness(plugin, "claude", outDir)).toThrow(/non-empty/);
  });
});
