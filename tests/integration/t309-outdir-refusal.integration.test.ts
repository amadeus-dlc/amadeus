// covers: file:scripts/plugin-projection.ts
// size: medium
//
// U3 host-projection-all — the plan-stage outDir safety over a REAL filesystem
// (BR-U3-3, upstream t188 #27-32). t304 pins the pure decision; this integration
// pins the fs probing that feeds it: a regular file, a symlink, a broken symlink,
// and a non-empty non-projection directory are all refused BEFORE any write, and
// a legitimate empty / prior-projection dir is NOT refused (両側実測 —
// corpus-sweep-for-new-guards: the guard is red for bad input, green for good).

import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { discoverPluginSources, type PluginSource, projectPluginForHarness, validatePluginSources } from "../../scripts/plugin-projection.ts";

const FIXTURE = "zz-t309-fixture";
let plugin: PluginSource;

beforeAll(() => {
  const ws = mkdtempSync(join(tmpdir(), "amadeus-t309-src-"));
  const pluginsRoot = join(ws, "plugins");
  mkdirSync(join(pluginsRoot, FIXTURE), { recursive: true });
  writeFileSync(join(pluginsRoot, FIXTURE, "plugin.json"), `{"name":"${FIXTURE}"}\n`);
  [plugin] = validatePluginSources(discoverPluginSources(pluginsRoot));
});

let scratch = "";
beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "amadeus-t309-out-"));
});
afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

const project = (outDir: string) => projectPluginForHarness(plugin, "codex", outDir);

describe("t309 projectPluginForHarness outDir refusals (real fs)", () => {
  test("refuses a regular-file outDir (#29, no raw ENOTDIR stack)", () => {
    const file = join(scratch, "afile");
    writeFileSync(file, "not a dir");
    expect(() => project(file)).toThrow(/file, not a directory/);
  });

  test("refuses a symlink outDir (#30)", () => {
    const target = join(scratch, "real");
    mkdirSync(target, { recursive: true });
    const link = join(scratch, "link");
    symlinkSync(target, link);
    expect(() => project(link)).toThrow(/symlink/);
    // The symlink target stayed empty — no write happened through the link.
    expect(readdirSync(target).length).toBe(0);
  });

  test("refuses a broken symlink outDir (#31, no raw EEXIST stack)", () => {
    const link = join(scratch, "dangling");
    symlinkSync(join(scratch, "does-not-exist"), link);
    expect(() => project(link)).toThrow(/broken symlink/);
  });

  test("refuses a non-empty non-projection directory (#27)", () => {
    const outDir = join(scratch, "occupied");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "stray.txt"), "occupied");
    expect(() => project(outDir)).toThrow(/non-empty/);
    // Write-0 on refusal: only the stray file remains.
    expect(readdirSync(outDir)).toEqual(["stray.txt"]);
  });

  test("does NOT refuse a legitimate empty outDir (both-side proof)", () => {
    const outDir = join(scratch, "fresh");
    mkdirSync(outDir, { recursive: true });
    expect(() => project(outDir)).not.toThrow();
    expect(existsSync(join(outDir, "INSTALL.md"))).toBe(true);
  });

  test("does NOT refuse a non-existent outDir (both-side proof)", () => {
    const outDir = join(scratch, "brand-new");
    expect(() => project(outDir)).not.toThrow();
    expect(existsSync(join(outDir, ".amadeus-plugin-projection.json"))).toBe(true);
  });
});
