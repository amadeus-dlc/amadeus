// t2997 — sensor-side settings resolution and argv hand-off (#2997 C4).
// covers: packages/framework/core/tools/amadeus-sensor.ts
// covers: packages/framework/core/tools/amadeus-plugin-runtime.ts
// size: small

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import type { PluginRuntimeFs } from "../../packages/framework/core/tools/amadeus-plugin-runtime.ts";
import {
  pluginSettingsArgs,
  resolvePluginSettingsForSensor,
} from "../../packages/framework/core/tools/amadeus-sensor.ts";

const HOST = "/w/.claude";

const DECLARATION = {
  "fetch-throttle-seconds": { type: "number", default: 600, description: "throttle" },
  mode: { type: "enum", values: ["fast", "thorough"], default: "fast", description: "mode" },
};

// A composition record whose single plugin owns the git-drift sensor manifest.
function composition(owned: readonly string[]): string {
  return JSON.stringify({
    ledger: [],
    plugins: [["git-drift", { plugin: "git-drift", ownedPaths: owned, stageIndex: [] }]],
  });
}

function fakeFs(files: Readonly<Record<string, string>>): PluginRuntimeFs {
  return {
    existsSync: (path) => Object.hasOwn(files, path),
    readFileSync: (path) => Buffer.from(files[path] ?? ""),
  };
}

function host(manifest: unknown, owned = ["sensors/amadeus-git-drift.md"]): PluginRuntimeFs {
  return fakeFs({
    [join(HOST, ".amadeus-plugin-composition.json")]: composition(owned),
    [join(HOST, ".amadeus-plugin-src", "git-drift", "plugin.json")]: JSON.stringify(manifest),
  });
}

const DECLARING_PLUGIN = { name: "git-drift", settings: DECLARATION };

describe("t2997 sensor settings resolution", () => {
  test("a sensor whose plugin declares no settings resolves to nothing", () => {
    const resolved = resolvePluginSettingsForSensor("git-drift", HOST, () => ({}), host({ name: "git-drift" }));
    expect(resolved).toBeNull();
  });

  test("a sensor with no owning plugin resolves to nothing", () => {
    const resolved = resolvePluginSettingsForSensor(
      "required-sections",
      HOST,
      () => ({}),
      host(DECLARING_PLUGIN),
    );
    expect(resolved).toBeNull();
  });

  test("declared defaults resolve when the config carries no overrides", () => {
    const resolved = resolvePluginSettingsForSensor("git-drift", HOST, () => ({}), host(DECLARING_PLUGIN));
    expect(resolved).toEqual({
      ok: true,
      settings: { "fetch-throttle-seconds": 600, mode: "fast" },
    });
  });

  test("only the owning plugin's overrides are applied", () => {
    const resolved = resolvePluginSettingsForSensor(
      "git-drift",
      HOST,
      () => ({ "git-drift": { mode: "thorough" }, other: { mode: "nonsense" } }),
      host(DECLARING_PLUGIN),
    );
    expect(resolved).toEqual({
      ok: true,
      settings: { "fetch-throttle-seconds": 600, mode: "thorough" },
    });
  });

  test("an override the declaration does not know aborts the resolution", () => {
    const resolved = resolvePluginSettingsForSensor(
      "git-drift",
      HOST,
      () => ({ "git-drift": { unknown: 1 } }),
      host(DECLARING_PLUGIN),
    );
    expect(resolved?.ok).toBe(false);
  });
});

describe("t2997 sensor settings argv", () => {
  test("a resolved set becomes exactly one --settings-json argument", () => {
    expect(pluginSettingsArgs({ ok: true, settings: { mode: "fast" } })).toEqual([
      "--settings-json",
      '{"mode":"fast"}',
    ]);
  });

  test("no declaration adds no arguments at all", () => {
    expect(pluginSettingsArgs(null)).toEqual([]);
  });
});
