// t2997 — the plugin.settings configuration key (#2997 C3).
// covers: packages/framework/core/tools/amadeus-config.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  type AmadeusConfigLayerInput,
  AMADEUS_CONFIG_REGISTRY,
  parseAmadeusConfigLayers,
} from "../../packages/framework/core/tools/amadeus-config.ts";

function present(
  layer: AmadeusConfigLayerInput["layer"],
  rawValue: unknown,
): AmadeusConfigLayerInput {
  return { layer, path: `amadeus/${layer}.json`, present: true, rawValue };
}

function settings(value: unknown): Record<string, unknown> {
  return { plugin: { settings: value } };
}

function resolvedSettings(layers: readonly AmadeusConfigLayerInput[]) {
  const outcome = parseAmadeusConfigLayers(layers);
  if (outcome.kind !== "resolved") throw new Error(`expected resolved, got ${outcome.kind}`);
  return outcome.config.plugin.settings;
}

function issuesOf(layers: readonly AmadeusConfigLayerInput[]) {
  const outcome = parseAmadeusConfigLayers(layers);
  if (outcome.kind !== "invalid") throw new Error(`expected invalid, got ${outcome.kind}`);
  return outcome.issues;
}

describe("t2997 plugin.settings config key", () => {
  test("is registered on all three layers with an empty-object default", () => {
    const entry = AMADEUS_CONFIG_REGISTRY.find((e) => e.path === "plugin.settings");
    expect(entry).toBeDefined();
    expect(entry?.layers).toEqual(["project", "space", "intent"]);
    expect(entry?.defaultValue).toEqual({});
  });

  test("an absent key resolves to the empty override set", () => {
    expect(resolvedSettings([present("project", {})])).toEqual({});
  });

  test("scalar values of every kind survive the round trip", () => {
    expect(
      resolvedSettings([
        present("project", settings({ "git-drift": { seconds: 600, label: "origin", on: true } })),
      ]),
    ).toEqual({ "git-drift": { seconds: 600, label: "origin", on: true } });
  });

  test("later layers merge per plugin per key rather than replacing the map", () => {
    expect(
      resolvedSettings([
        present("project", settings({ "git-drift": { seconds: 600, label: "origin" }, other: { a: 1 } })),
        present("space", settings({ "git-drift": { seconds: 120 } })),
        present("intent", settings({ "git-drift": { label: "upstream" } })),
      ]),
    ).toEqual({
      "git-drift": { seconds: 120, label: "upstream" },
      other: { a: 1 },
    });
  });

  test.each([
    ["a non-object value", "nope"],
    ["a non-object plugin entry", { "git-drift": 3 }],
    ["an invalid plugin name", { "Git Drift": { seconds: 1 } }],
    ["an out-of-class key name", { "git-drift": { Seconds: 1 } }],
    ["a secret-shaped key name", { "git-drift": { "api-token": "x" } }],
    ["a null value", { "git-drift": { seconds: null } }],
    ["an array value", { "git-drift": { seconds: [1] } }],
    ["an object value", { "git-drift": { seconds: { n: 1 } } }],
  ])("%s is rejected whole (no partial application)", (_label, value) => {
    const issues = issuesOf([present("project", settings(value))]);
    expect(issues.some((issue) => issue.key === "plugin.settings")).toBe(true);
  });

  test("an unknown path under plugin stays an unknown-path error", () => {
    const issues = issuesOf([present("project", { plugin: { setings: {} } })]);
    expect(issues.some((issue) => issue.actualType.includes("unknown key plugin.setings"))).toBe(
      true,
    );
  });
});
