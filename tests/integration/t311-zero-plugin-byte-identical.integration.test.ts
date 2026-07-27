// covers: file:scripts/plugin-projection.ts
// size: medium
//
// U3 host-projection-all — the 0-plugin byte-identical baseline (BR-U3-4 / REL-U3-1).
// With no plugin sources, pluginBundleExpected is EMPTY, so the packager writes
// nothing under dist/plugins/ and checkPluginProjections reports zero drift. The
// structural no-op is what keeps a pre-plugin dist tree byte-identical.

import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkPluginProjections, pluginBundleExpected } from "../../scripts/plugin-projection.ts";

describe("t311 zero-plugin baseline", () => {
  test("an absent plugins root yields an empty expected bundle", () => {
    const ws = mkdtempSync(join(tmpdir(), "amadeus-t311-"));
    const pluginsRoot = join(ws, "plugins"); // never created
    expect(pluginBundleExpected(pluginsRoot).size).toBe(0);
  });

  test("an empty plugins root yields an empty expected bundle", () => {
    const ws = mkdtempSync(join(tmpdir(), "amadeus-t311-"));
    const pluginsRoot = join(ws, "plugins");
    mkdirSync(pluginsRoot, { recursive: true }); // exists but has no plugin dirs
    expect(pluginBundleExpected(pluginsRoot).size).toBe(0);
  });

  test("zero plugins → zero drift and no dist/plugins tree created", () => {
    const ws = mkdtempSync(join(tmpdir(), "amadeus-t311-"));
    const pluginsRoot = join(ws, "plugins");
    const distRoot = join(ws, "dist");
    expect(checkPluginProjections(pluginsRoot, distRoot)).toEqual([]);
    expect(existsSync(join(distRoot, "plugins"))).toBe(false);
  });
});
