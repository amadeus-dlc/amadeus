// covers: file:scripts/plugin-projection.ts, file:scripts/package.ts
// size: medium
//
// U3 host-projection-all — the OutDirRefusal guard must fire on the PRODUCTION
// write path, not just via the projectPluginForHarness seam (§12a Major 1). The
// packager's writeNeutralBundle calls assertInstallOutDirsSafe(classifyOutDir)
// before its clean-sweep, so a symlink / file / broken symlink planted at a
// per-harness install outDir is refused (write-0) instead of being followed or
// clobbered. Drives writeNeutralBundle against a temp AMADEUS_DIST_ROOT so the
// falling proof runs on the real code path — a legitimate rebuild (plain dirs)
// stays green.

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { writeNeutralBundle } from "../../scripts/package.ts";

const FIXTURE = "zz-t312-fixture";
const HARNESS = "codex"; // any packaged face; the guard iterates all seven

let ws = "";
let pluginsRoot = "";
let distRoot = "";
let savedPlugins: string | undefined;
let savedDist: string | undefined;

beforeAll(() => {
  savedPlugins = process.env.AMADEUS_PLUGINS_ROOT;
  savedDist = process.env.AMADEUS_DIST_ROOT;
});
afterAll(() => {
  if (savedPlugins === undefined) delete process.env.AMADEUS_PLUGINS_ROOT;
  else process.env.AMADEUS_PLUGINS_ROOT = savedPlugins;
  if (savedDist === undefined) delete process.env.AMADEUS_DIST_ROOT;
  else process.env.AMADEUS_DIST_ROOT = savedDist;
});

beforeEach(() => {
  ws = mkdtempSync(join(tmpdir(), "amadeus-t312-"));
  pluginsRoot = join(ws, "plugins");
  distRoot = join(ws, "dist");
  mkdirSync(join(pluginsRoot, FIXTURE), { recursive: true });
  writeFileSync(join(pluginsRoot, FIXTURE, "plugin.json"), `{"name":"${FIXTURE}"}\n`);
  writeFileSync(join(pluginsRoot, FIXTURE, "note.md"), "home {{HARNESS_DIR}}\n");
  process.env.AMADEUS_PLUGINS_ROOT = pluginsRoot;
  process.env.AMADEUS_DIST_ROOT = distRoot;
});

const faceDir = () => join(distRoot, "plugins", FIXTURE, HARNESS);

describe("t312 writeNeutralBundle wires OutDirRefusal on the real write path", () => {
  test("a first build succeeds and a plain-dir rebuild is accepted (prior projection)", () => {
    writeNeutralBundle();
    expect(existsSync(join(faceDir(), "INSTALL.md"))).toBe(true);
    // Rebuild over the plain dir: generator-owned → prior projection → no refusal.
    expect(() => writeNeutralBundle()).not.toThrow();
  });

  test("refuses when a per-harness install outDir is a symlink (write-0, target untouched)", () => {
    writeNeutralBundle(); // establish a normal bundle first
    const target = join(ws, "elsewhere");
    mkdirSync(target, { recursive: true });
    rmSync(faceDir(), { recursive: true, force: true });
    symlinkSync(target, faceDir());
    expect(() => writeNeutralBundle()).toThrow(/UNSAFE outDir.*symlink/s);
    // The clean-sweep never ran: the symlink and its empty target are intact.
    expect(readdirSync(target).length).toBe(0);
  });

  test("refuses when a per-harness install outDir is a regular file", () => {
    mkdirSync(join(distRoot, "plugins", FIXTURE), { recursive: true });
    writeFileSync(faceDir(), "not a dir");
    expect(() => writeNeutralBundle()).toThrow(/UNSAFE outDir.*file-outdir/s);
  });

  test("refuses when a per-harness install outDir is a broken symlink", () => {
    mkdirSync(join(distRoot, "plugins", FIXTURE), { recursive: true });
    symlinkSync(join(ws, "does-not-exist"), faceDir());
    expect(() => writeNeutralBundle()).toThrow(/UNSAFE outDir.*broken-symlink/s);
  });
});
