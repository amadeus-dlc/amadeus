// t257 — pure three-mode mirror configuration parsing and precedence.
// covers: packages/framework/core/tools/amadeus-config.ts (parseAmadeusConfigLayers)
// size: small

import { describe, expect, test } from "bun:test";
import {
  type ConfigLayer,
  type AmadeusConfigLayerInput,
  parseAmadeusConfigLayers,
} from "../../packages/framework/core/tools/amadeus-config.ts";

function present(layer: ConfigLayer, rawValue: unknown): AmadeusConfigLayerInput {
  return { layer, path: `amadeus/${layer}.json`, present: true, rawValue };
}

function absent(layer: ConfigLayer): AmadeusConfigLayerInput {
  return { layer, path: `amadeus/${layer}.json`, present: false, rawValue: undefined };
}

function mode(rawValue: string): AmadeusConfigLayerInput {
  return present("global", { "auto-mirror": rawValue });
}

describe("t257 pure config resolution", () => {
  test("defaults to prompt when no layer is present", () => {
    expect(
      parseAmadeusConfigLayers([absent("global"), absent("space"), absent("intent")]),
    ).toEqual({ kind: "resolved", config: { autoMirror: "prompt", projects: [], autoSoloElection: false, autoFileFindings: "prompt", plugins: [] }, sources: [] });
  });

  test.each(["off", "prompt", "auto"] as const)(
    "accepts the exact mode string %s",
    (value) => {
      expect(parseAmadeusConfigLayers([mode(value)])).toEqual({
        kind: "resolved",
        config: { autoMirror: value, projects: [], autoSoloElection: false, autoFileFindings: "prompt", plugins: [] },
        sources: ["amadeus/global.json"],
      });
    },
  );

  test.each(["off", "prompt", "auto"] as const)(
    "accepts auto-file-findings mode %s",
    (value) => {
      const outcome = parseAmadeusConfigLayers([
        present("global", { "auto-file-findings": value }),
      ]);

      expect(outcome.kind).toBe("resolved");
      if (outcome.kind === "resolved") {
        expect(outcome.config.autoFileFindings).toBe(value);
      }
    },
  );

  test("auto-file-findings follows Global < Space < Intent precedence", () => {
    const outcome = parseAmadeusConfigLayers([
      present("global", { "auto-file-findings": "off" }),
      present("space", { "auto-file-findings": "prompt" }),
      present("intent", { "auto-file-findings": "auto" }),
    ]);

    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") {
      expect(outcome.config.autoFileFindings).toBe("auto");
    }
  });

  test("a present but empty object contributes no mode", () => {
    expect(
      parseAmadeusConfigLayers([
        present("global", {}),
        present("space", {}),
        present("intent", {}),
      ]),
    ).toEqual({ kind: "resolved", config: { autoMirror: "prompt", projects: [], autoSoloElection: false, autoFileFindings: "prompt", plugins: [] }, sources: [] });
  });

  // Each present layer carries a distinct mode (global=off, space=prompt,
  // intent=auto) so precedence — not the default or a lower layer — decides
  // the outcome. Expected mode and sources are precomputed per row.
  function layerFor(
    layer: ConfigLayer,
    has: boolean,
    value: string,
  ): AmadeusConfigLayerInput {
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
      const layers: AmadeusConfigLayerInput[] = [
        layerFor("global", hasGlobal, "off"),
        layerFor("space", hasSpace, "prompt"),
        layerFor("intent", hasIntent, "auto"),
      ];
      expect(parseAmadeusConfigLayers(layers)).toEqual({
        kind: "resolved",
        config: { autoMirror: expectedMode, projects: [], autoSoloElection: false, autoFileFindings: "prompt", plugins: [] },
        sources: expectedSources,
      });
    },
  );

  test("intent overrides space and global (Global < Space < Intent)", () => {
    expect(
      parseAmadeusConfigLayers([
        present("global", { "auto-mirror": "auto" }),
        present("space", { "auto-mirror": "off" }),
        present("intent", { "auto-mirror": "prompt" }),
      ]),
    ).toEqual({
      kind: "resolved",
      config: { autoMirror: "prompt", projects: [], autoSoloElection: false, autoFileFindings: "prompt", plugins: [] },
      sources: ["amadeus/global.json", "amadeus/space.json", "amadeus/intent.json"],
    });
  });

  test("resolution is independent of input layer order", () => {
    expect(
      parseAmadeusConfigLayers([
        present("intent", { "auto-mirror": "auto" }),
        present("global", { "auto-mirror": "off" }),
        present("space", { "auto-mirror": "off" }),
      ]),
    ).toEqual({
      kind: "resolved",
      config: { autoMirror: "auto", projects: [], autoSoloElection: false, autoFileFindings: "prompt", plugins: [] },
      sources: ["amadeus/global.json", "amadeus/space.json", "amadeus/intent.json"],
    });
  });

  test("ignores layers marked not present", () => {
    expect(
      parseAmadeusConfigLayers([
        absent("global"),
        present("space", { "auto-mirror": "auto" }),
        absent("intent"),
      ]),
    ).toEqual({
      kind: "resolved",
      config: { autoMirror: "auto", projects: [], autoSoloElection: false, autoFileFindings: "prompt", plugins: [] },
      sources: ["amadeus/space.json"],
    });
  });
});

describe("t257 pure config rejection", () => {
  test("project plugins are validated, deduplicated and sorted without coercion", () => {
    const resolved = parseAmadeusConfigLayers([present("global", { plugins: ["zeta", "alpha"] })]);
    expect(resolved.kind === "resolved" && resolved.config.plugins).toEqual(["alpha", "zeta"]);
    const valid64 = `a${"b".repeat(62)}z`;
    expect(parseAmadeusConfigLayers([present("global", { plugins: [valid64] })]).kind).toBe("resolved");
    for (const plugins of [
      ["dup", "dup"],
      ["Upper"],
      [" white"],
      ["white "],
      ["日本語"],
      ["-leading"],
      ["trailing-"],
      ["."],
      [".."],
      ["a_b"],
      ["a/b"],
      ["a\\b"],
      [`a${"b".repeat(63)}z`],
      [1],
      "formal-model-check",
    ]) {
      expect(parseAmadeusConfigLayers([present("global", { plugins })]).kind).toBe("invalid");
    }
  });

  test("plugins is project-only and rejected at space or intent", () => {
    for (const layer of ["space", "intent"] as const) {
      const result = parseAmadeusConfigLayers([present(layer, { plugins: ["formal-model-check"] })]);
      expect(result.kind).toBe("invalid");
    }
  });

  test("a project-only plugins issue does not hide sibling layer issues", () => {
    const result = parseAmadeusConfigLayers([
      present("space", { "auto-mirror": true, plugins: ["formal-model-check"] }),
    ]);
    expect(result.kind).toBe("invalid");
    if (result.kind !== "invalid") return;
    expect(result.issues.map((issue) => issue.key)).toEqual(["auto-mirror", "plugins"]);
  });

  test("rejects an invalid auto-file-findings value without coercion", () => {
    expect(
      parseAmadeusConfigLayers([
        present("global", { "auto-file-findings": true }),
      ]),
    ).toEqual({
      kind: "invalid",
      issues: [
        {
          kind: "invalid-value",
          layer: "global",
          path: "amadeus/global.json",
          key: "auto-file-findings",
          actualType: "boolean",
          expected: "off | prompt | auto",
        },
      ],
    });
  });

  test("rejects both boolean values without coercion", () => {
    for (const value of [true, false]) {
      expect(parseAmadeusConfigLayers([present("space", { "auto-mirror": value })])).toEqual(
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
    expect(parseAmadeusConfigLayers([present("intent", { "auto-mirror": value })])).toEqual({
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
    expect(parseAmadeusConfigLayers([present("global", rawValue)])).toEqual({
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
      parseAmadeusConfigLayers([
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
    const outcome = parseAmadeusConfigLayers([
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
