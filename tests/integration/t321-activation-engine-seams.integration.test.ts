// covers: file:packages/framework/core/tools/amadeus-plugin-runtime.ts, function:emitPluginAdvisories
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  emitPluginAdvisories,
  pluginHostRoot,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  composedPluginNames,
  isComposedPluginStage,
} from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";

const roots: string[] = [];
const originalHost = process.env.AMADEUS_PLUGINS_HOST_ROOT;

afterEach(() => {
  if (originalHost === undefined) delete process.env.AMADEUS_PLUGINS_HOST_ROOT;
  else process.env.AMADEUS_PLUGINS_HOST_ROOT = originalHost;
  roots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

describe("generic plugin engine seams", () => {
  test("host root resolution contains no plugin-specific policy", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-t321-"));
    roots.push(root);
    mkdirSync(root, { recursive: true });
    process.env.AMADEUS_PLUGINS_HOST_ROOT = root;
    expect(realpathSync(pluginHostRoot())).toBe(realpathSync(root));
  });

  test("a host with no composed plugins has no names, stages, or advisories", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-t321-"));
    roots.push(root);
    expect(composedPluginNames(root)).toEqual([]);
    expect(isComposedPluginStage(root, "anything")).toBe(false);
    const lines: string[] = [];
    expect(emitPluginAdvisories("anything", root, (line) => lines.push(line))).toEqual([]);
    expect(lines).toEqual([]);
  });

  test("a malformed composition record is treated as no composed plugins", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-t321-"));
    roots.push(root);
    writeFileSync(join(root, ".amadeus-plugin-composition.json"), "{ malformed");
    expect(composedPluginNames(root)).toEqual([]);
    expect(isComposedPluginStage(root, "anything")).toBe(false);
  });

  test("composition records are validated from unknown JSON before use", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-t321-"));
    roots.push(root);
    const record = join(root, ".amadeus-plugin-composition.json");
    writeFileSync(record, "null");
    expect(composedPluginNames(root)).toEqual([]);
    writeFileSync(record, JSON.stringify({ plugins: {} }));
    expect(composedPluginNames(root)).toEqual([]);
    writeFileSync(record, JSON.stringify({
      plugins: [null, [], [1, {}], ["fixture-plugin", { stageIndex: [{ slug: "fixture-stage" }] }]],
    }));
    expect(composedPluginNames(root)).toEqual(["fixture-plugin"]);
    expect(isComposedPluginStage(root, "fixture-stage")).toBe(true);

    for (const malformed of [null, {}, { stageIndex: null }, { stageIndex: {} }, { stageIndex: [null, 1, {}] }]) {
      writeFileSync(record, JSON.stringify({ plugins: [["fixture-plugin", malformed]] }));
      expect(isComposedPluginStage(root, "fixture-stage")).toBe(false);
    }
  });
});
