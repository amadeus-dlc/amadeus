// t257 — pure three-mode mirror configuration parsing and precedence.
// covers: packages/framework/core/tools/amadeus-mirror-config.ts (parseMirrorConfigLayers)
// size: small

import { describe, expect, test } from "bun:test";
import {
  type ConfigLayer,
  type MirrorConfigLayerInput,
  parseMirrorConfigLayers,
} from "../../packages/framework/core/tools/amadeus-mirror-config.ts";

function present(layer: ConfigLayer, rawValue: unknown): MirrorConfigLayerInput {
  return { layer, path: `amadeus/${layer}.json`, present: true, rawValue };
}

function absent(layer: ConfigLayer): MirrorConfigLayerInput {
  return { layer, path: `amadeus/${layer}.json`, present: false, rawValue: undefined };
}

function mode(rawValue: string): MirrorConfigLayerInput {
  return present("global", { "auto-mirror": rawValue });
}

describe("t257 pure config resolution", () => {
  test("defaults to prompt when no layer is present", () => {
    expect(
      parseMirrorConfigLayers([absent("global"), absent("space"), absent("intent")]),
    ).toEqual({ kind: "resolved", config: { autoMirror: "prompt" }, sources: [] });
  });

  test.each(["off", "prompt", "auto"] as const)(
    "accepts the exact mode string %s",
    (value) => {
      expect(parseMirrorConfigLayers([mode(value)])).toEqual({
        kind: "resolved",
        config: { autoMirror: value },
        sources: ["amadeus/global.json"],
      });
    },
  );

  test("a present but empty object contributes no mode", () => {
    expect(
      parseMirrorConfigLayers([
        present("global", {}),
        present("space", {}),
        present("intent", {}),
      ]),
    ).toEqual({ kind: "resolved", config: { autoMirror: "prompt" }, sources: [] });
  });

  // Each present layer carries a distinct mode (global=off, space=prompt,
  // intent=auto) so precedence — not the default or a lower layer — decides
  // the outcome. Expected mode and sources are precomputed per row.
  function layerFor(
    layer: ConfigLayer,
    has: boolean,
    value: string,
  ): MirrorConfigLayerInput {
    return has ? present(layer, { "auto-mirror": value }) : absent(layer);
  }

  const combinations = [
    [false, false, false, "prompt", []],
    [true, false, false, "off", ["amadeus/global.json"]],
    [false, true, false, "prompt", ["amadeus/space.json"]],
    [false, false, true, "auto", ["amadeus/intent.json"]],
    [true, true, false, "prompt", ["amadeus/global.json", "amadeus/space.json"]],
    [true, false, true, "auto", ["amadeus/global.json", "amadeus/intent.json"]],
    [false, true, true, "auto", ["amadeus/space.json", "amadeus/intent.json"]],
    [
      true,
      true,
      true,
      "auto",
      ["amadeus/global.json", "amadeus/space.json", "amadeus/intent.json"],
    ],
  ] as const;

  test.each(combinations)(
    "highest present layer wins for global=%s space=%s intent=%s",
    (hasGlobal, hasSpace, hasIntent, expectedMode, expectedSources) => {
      const layers: MirrorConfigLayerInput[] = [
        layerFor("global", hasGlobal, "off"),
        layerFor("space", hasSpace, "prompt"),
        layerFor("intent", hasIntent, "auto"),
      ];
      expect(parseMirrorConfigLayers(layers)).toEqual({
        kind: "resolved",
        config: { autoMirror: expectedMode },
        sources: expectedSources,
      });
    },
  );

  test("intent overrides space and global (Global < Space < Intent)", () => {
    expect(
      parseMirrorConfigLayers([
        present("global", { "auto-mirror": "auto" }),
        present("space", { "auto-mirror": "off" }),
        present("intent", { "auto-mirror": "prompt" }),
      ]),
    ).toEqual({
      kind: "resolved",
      config: { autoMirror: "prompt" },
      sources: ["amadeus/global.json", "amadeus/space.json", "amadeus/intent.json"],
    });
  });

  test("resolution is independent of input layer order", () => {
    expect(
      parseMirrorConfigLayers([
        present("intent", { "auto-mirror": "auto" }),
        present("global", { "auto-mirror": "off" }),
        present("space", { "auto-mirror": "off" }),
      ]),
    ).toEqual({
      kind: "resolved",
      config: { autoMirror: "auto" },
      sources: ["amadeus/global.json", "amadeus/space.json", "amadeus/intent.json"],
    });
  });

  test("ignores layers marked not present", () => {
    expect(
      parseMirrorConfigLayers([
        absent("global"),
        present("space", { "auto-mirror": "auto" }),
        absent("intent"),
      ]),
    ).toEqual({
      kind: "resolved",
      config: { autoMirror: "auto" },
      sources: ["amadeus/space.json"],
    });
  });
});

describe("t257 pure config rejection", () => {
  test("rejects both boolean values without coercion", () => {
    for (const value of [true, false]) {
      expect(parseMirrorConfigLayers([present("space", { "auto-mirror": value })])).toEqual(
        {
          kind: "invalid",
          issues: [
            {
              kind: "invalid-value",
              layer: "space",
              path: "amadeus/space.json",
              key: "auto-mirror",
              actualType: "boolean",
              expected: "off | prompt | auto",
            },
          ],
        },
      );
    }
  });

  test.each([
    ["yes", "string"],
    [1, "number"],
    [null, "null"],
    [["auto"], "array"],
    [{ nested: true }, "object"],
  ])("rejects a %p auto-mirror value as %s", (value, actualType) => {
    expect(parseMirrorConfigLayers([present("intent", { "auto-mirror": value })])).toEqual({
      kind: "invalid",
      issues: [
        {
          kind: "invalid-value",
          layer: "intent",
          path: "amadeus/intent.json",
          key: "auto-mirror",
          actualType,
          expected: "off | prompt | auto",
        },
      ],
    });
  });

  test.each([
    ["array root", ["auto"], "array"],
    ["string root", "auto", "string"],
    ["number root", 1, "number"],
    ["null root", null, "null"],
    ["boolean root", true, "boolean"],
  ])("rejects a malformed %s", (_name, rawValue, actualType) => {
    expect(parseMirrorConfigLayers([present("global", rawValue)])).toEqual({
      kind: "invalid",
      issues: [
        {
          kind: "invalid-value",
          layer: "global",
          path: "amadeus/global.json",
          key: "auto-mirror",
          actualType,
          expected: "off | prompt | auto",
        },
      ],
    });
  });

  test("rejects an object carrying an unknown property", () => {
    expect(
      parseMirrorConfigLayers([
        present("global", { "auto-mirror": "auto", extra: 1, other: 2 }),
      ]),
    ).toEqual({
      kind: "invalid",
      issues: [
        {
          kind: "invalid-value",
          layer: "global",
          path: "amadeus/global.json",
          key: "auto-mirror",
          actualType: "object with unknown key(s): extra, other",
          expected: "off | prompt | auto",
        },
      ],
    });
  });

  test("aggregates every invalid layer in precedence order and returns no config", () => {
    const outcome = parseMirrorConfigLayers([
      present("intent", { "auto-mirror": "nope" }),
      present("global", { "auto-mirror": true }),
      present("space", { "auto-mirror": "auto" }),
    ]);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues.map((issue) => issue.layer)).toEqual(["global", "intent"]);
    }
  });
});
