// t431 — structured configuration contract.
// covers: packages/framework/core/tools/amadeus-config.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  type AmadeusConfigLayerInput,
  parseAmadeusConfigLayers,
} from "../../packages/framework/core/tools/amadeus-config.ts";

function absent(
  layer: AmadeusConfigLayerInput["layer"],
): AmadeusConfigLayerInput {
  return {
    layer,
    path: `amadeus/${layer}.json`,
    present: false,
    rawValue: undefined,
  };
}

function present(
  layer: AmadeusConfigLayerInput["layer"],
  rawValue: unknown,
): AmadeusConfigLayerInput {
  return {
    layer,
    path: `amadeus/${layer}.json`,
    present: true,
    rawValue,
  };
}

describe("t431 structured config", () => {
  test("resolves the documented nested defaults", () => {
    expect(
      parseAmadeusConfigLayers([
        absent("project"),
        absent("space"),
        absent("intent"),
      ]),
    ).toEqual({
      kind: "resolved",
      config: {
        intentMirror: {
          github: {
            issue: { mode: "prompt" },
            project: { targets: [] },
          },
        },
        soloElection: { trigger: { mode: "manual" } },
        finding: {
          github: { issue: { creation: { mode: "prompt" } } },
        },
        swarm: { unit: { concurrency: { limit: 4 } } },
        plugin: { activation: { names: [] } },
      },
      sources: [],
    });
  });

  test("merges leaves by project, space, then intent and replaces arrays", () => {
    const outcome = parseAmadeusConfigLayers([
      present("intent", {
        "intent-mirror": { github: { issue: { mode: "auto" } } },
        swarm: { unit: { concurrency: { limit: 1 } } },
      }),
      present("project", {
        "intent-mirror": {
          github: {
            issue: { mode: "off" },
            project: {
              targets: [{ project: "amadeus-dlc/5" }],
            },
          },
        },
        plugin: { activation: { names: ["zeta", "alpha"] } },
      }),
      present("space", {
        "intent-mirror": { github: { issue: { mode: "prompt" } } },
        "solo-election": { trigger: { mode: "auto" } },
        finding: {
          github: { issue: { creation: { mode: "off" } } },
        },
      }),
    ]);

    expect(outcome.kind).toBe("resolved");
    if (outcome.kind !== "resolved") return;
    expect(outcome.config).toEqual({
      intentMirror: {
        github: {
          issue: { mode: "auto" },
          project: {
            targets: [
              {
                project: { owner: "amadeus-dlc", number: 5 },
                phaseField: "Intent Phase",
                statusNames: {},
              },
            ],
          },
        },
      },
      soloElection: { trigger: { mode: "auto" } },
      finding: { github: { issue: { creation: { mode: "off" } } } },
      swarm: { unit: { concurrency: { limit: 1 } } },
      plugin: { activation: { names: ["alpha", "zeta"] } },
    });
    expect(outcome.sources).toEqual([
      "amadeus/project.json",
      "amadeus/space.json",
      "amadeus/intent.json",
    ]);
  });

  test("rejects every legacy key at every layer and explains value conversion", () => {
    const legacy = [
      ["auto-mirror", "auto", "intent-mirror.github.issue.mode", "unchanged"],
      ["mirror-projects", [], "intent-mirror.github.project.targets", "unchanged"],
      [
        "auto-solo-election",
        true,
        "solo-election.trigger.mode",
        "false -> manual; true -> auto",
      ],
      ["auto-file-findings", "auto", "finding.github.issue.creation.mode", "unchanged"],
      ["max-parallel-units", 4, "swarm.unit.concurrency.limit", "unchanged"],
      ["plugins", [], "plugin.activation.names", "unchanged"],
    ] as const;

    for (const layer of ["project", "space", "intent"] as const) {
      for (const [key, value, replacement, conversion] of legacy) {
        const outcome = parseAmadeusConfigLayers([
          present(layer, { [key]: value }),
        ]);
        expect(outcome.kind).toBe("invalid");
        if (outcome.kind !== "invalid") continue;
        expect(outcome.issues).toContainEqual({
          kind: "invalid-value",
          layer,
          path: `amadeus/${layer}.json`,
          key: replacement,
          actualType: `legacy key ${key}`,
          expected: `use ${replacement}; value conversion: ${conversion}`,
        });
      }
    }
  });

  test("rejects a legacy key even when its structured replacement is present", () => {
    const outcome = parseAmadeusConfigLayers([
      present("project", {
        "auto-mirror": "auto",
        "intent-mirror": { github: { issue: { mode: "auto" } } },
      }),
    ]);
    expect(outcome.kind).toBe("invalid");
  });

  test("normalizes project targets and rejects duplicate identities", () => {
    const rawTarget = {
      project: "Amadeus-DLC/5",
      "phase-field": "Phase",
      "status-names": { construction: "Building" },
    };
    const resolved = parseAmadeusConfigLayers([
      present("project", {
        "intent-mirror": {
          github: { project: { targets: [rawTarget] } },
        },
      }),
    ]);
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind === "resolved") {
      expect(resolved.config.intentMirror.github.project.targets).toEqual([
        {
          project: { owner: "amadeus-dlc", number: 5 },
          phaseField: "Phase",
          statusNames: { construction: "Building" },
        },
      ]);
    }

    const duplicate = parseAmadeusConfigLayers([
      present("project", {
        "intent-mirror": {
          github: {
            project: {
              targets: [rawTarget, { project: "amadeus-dlc/5" }],
            },
          },
        },
      }),
    ]);
    expect(duplicate.kind).toBe("invalid");
  });

  test("allows plugin activation only at project scope", () => {
    for (const layer of ["space", "intent"] as const) {
      const outcome = parseAmadeusConfigLayers([
        present(layer, {
          plugin: { activation: { names: ["formal-model-check"] } },
        }),
      ]);
      expect(outcome.kind).toBe("invalid");
      if (outcome.kind === "invalid") {
        expect(outcome.issues[0]?.key).toBe("plugin.activation.names");
      }
    }
  });

  test("replaces arrays with an explicitly empty higher-layer value", () => {
    const outcome = parseAmadeusConfigLayers([
      present("project", {
        "intent-mirror": {
          github: { project: { targets: [{ project: "amadeus-dlc/5" }] } },
        },
      }),
      present("space", {
        "intent-mirror": { github: { project: { targets: [] } } },
      }),
    ]);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") {
      expect(outcome.config.intentMirror.github.project.targets).toEqual([]);
    }
  });

  test("treats empty objects as no-op and rejects null leaves", () => {
    expect(
      parseAmadeusConfigLayers([
        present("project", { "intent-mirror": {} }),
      ]).kind,
    ).toBe("resolved");
    expect(
      parseAmadeusConfigLayers([
        present("intent", {
          "intent-mirror": { github: { issue: { mode: null } } },
        }),
      ]).kind,
    ).toBe("invalid");
  });

  test("aggregates unknown paths, invalid modes, and out-of-range limits", () => {
    const outcome = parseAmadeusConfigLayers([
      present("project", {
        unexpected: true,
        finding: { github: { issue: { creation: { mode: "sometimes" } } } },
        swarm: { unit: { concurrency: { limit: 5 } } },
      }),
    ]);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues).toHaveLength(3);
    }
  });
});
