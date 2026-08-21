// t431 — structured configuration contract.
// covers: packages/framework/core/tools/amadeus-config.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  type AmadeusConfigLayerInput,
  deriveSoloElectionTrigger,
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
            issue: { consent: "prompt" },
            project: { targets: [] },
          },
        },
        finding: {
          github: { issue: { creation: { consent: "prompt" } } },
        },
        swarm: { unit: { concurrency: { limit: 4 } } },
        plugin: { activation: { names: [] }, scopeBindings: {}, settings: {} },
        subagent: { dispatch: { enforcedModels: ["opus", "sonnet"] } },
      },
      sources: [],
    });
  });

  test("subagent.dispatch.enforced-models replaces the default at any layer and rejects malformed sets", () => {
    const configured = parseAmadeusConfigLayers([
      present("project", {
        subagent: { dispatch: { "enforced-models": ["opus", "sonnet", "haiku"] } },
      }),
      absent("space"),
      absent("intent"),
    ]);
    expect(configured.kind).toBe("resolved");
    if (configured.kind === "resolved") {
      expect(configured.config.subagent.dispatch.enforcedModels).toEqual(["opus", "sonnet", "haiku"]);
    }

    // An intent layer replaces (not merges) the project value.
    const overridden = parseAmadeusConfigLayers([
      present("project", {
        subagent: { dispatch: { "enforced-models": ["opus", "sonnet"] } },
      }),
      absent("space"),
      present("intent", {
        subagent: { dispatch: { "enforced-models": ["haiku"] } },
      }),
    ]);
    expect(overridden.kind).toBe("resolved");
    if (overridden.kind === "resolved") {
      expect(overridden.config.subagent.dispatch.enforcedModels).toEqual(["haiku"]);
    }

    // Malformed sets are rejected, never silently defaulted: an empty array
    // would deny every dispatch, and a non-string entry is a typo, not a model.
    for (const bad of [[], ["opus", "opus"], ["opus", 5], "opus", [" "]]) {
      const outcome = parseAmadeusConfigLayers([
        present("project", { subagent: { dispatch: { "enforced-models": bad } } }),
        absent("space"),
        absent("intent"),
      ]);
      expect(outcome.kind).toBe("invalid");
    }
  });

  test("merges leaves by project, space, then intent and replaces arrays", () => {
    const outcome = parseAmadeusConfigLayers([
      present("intent", {
        "intent-mirror": { github: { issue: { consent: "auto" } } },
        swarm: { unit: { concurrency: { limit: 1 } } },
      }),
      present("project", {
        "intent-mirror": {
          github: {
            issue: { consent: "off" },
            project: {
              targets: [{ project: "amadeus-dlc/5" }],
            },
          },
        },
        plugin: { activation: { names: ["zeta", "alpha"] } },
      }),
      present("space", {
        "intent-mirror": { github: { issue: { consent: "prompt" } } },
        finding: {
          github: { issue: { creation: { consent: "off" } } },
        },
      }),
    ]);

    expect(outcome.kind).toBe("resolved");
    if (outcome.kind !== "resolved") return;
    expect(outcome.config).toEqual({
      intentMirror: {
        github: {
          issue: { consent: "auto" },
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
      finding: { github: { issue: { creation: { consent: "off" } } } },
      swarm: { unit: { concurrency: { limit: 1 } } },
      plugin: { activation: { names: ["alpha", "zeta"] }, scopeBindings: {}, settings: {} },
      subagent: { dispatch: { enforcedModels: ["opus", "sonnet"] } },
    });
    expect(outcome.sources).toEqual([
      "amadeus/project.json",
      "amadeus/space.json",
      "amadeus/intent.json",
    ]);
  });

  test("rejects every renamed legacy key at every layer and explains value conversion", () => {
    // R-2/R-4: the consent-axis keys were renamed (.mode -> .consent) but the
    // value vocabulary (off/prompt/auto) is unchanged, so the flat legacy
    // aliases still resolve to a *renamed* replacement path.
    const legacy = [
      ["auto-mirror", "auto", "intent-mirror.github.issue.consent", "unchanged"],
      ["mirror-projects", [], "intent-mirror.github.project.targets", "unchanged"],
      ["auto-file-findings", "auto", "finding.github.issue.creation.consent", "unchanged"],
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

  // R-1/R-2/R-3: solo-election.trigger.mode was ABOLISHED (no replacement
  // path — it's derived from Intent Autonomy Mode, not read from config), so
  // both its structured spelling and its flat legacy alias must loud-fail
  // with an `expected` message that does NOT name a new config path.
  test("rejects the abolished solo-election key (structured, flat-dotted, and legacy alias forms) without naming a replacement path", () => {
    for (const layer of ["project", "space", "intent"] as const) {
      // Nested structured form: `solo-election` is the first unrecognized
      // segment (no registry entry carries that prefix any more), so the
      // issue surfaces at that top segment rather than at `...trigger.mode`.
      const structured = parseAmadeusConfigLayers([
        present(layer, { "solo-election": { trigger: { mode: "auto" } } }),
      ]);
      expect(structured.kind).toBe("invalid");
      if (structured.kind === "invalid") {
        expect(structured.issues).toContainEqual({
          kind: "invalid-value",
          layer,
          path: `amadeus/${layer}.json`,
          key: "intent-mirror.github.issue.consent",
          actualType: "legacy key solo-election",
          expected: expect.stringContaining("Autonomy Mode") as unknown as string,
        });
        const issue = structured.issues.find(
          (candidate) => candidate.kind === "invalid-value" && candidate.actualType === "legacy key solo-election",
        );
        expect(issue?.expected).not.toContain(".trigger.mode");
      }

      const flatDotted = parseAmadeusConfigLayers([
        present(layer, { "solo-election.trigger.mode": "auto" }),
      ]);
      expect(flatDotted.kind).toBe("invalid");
      if (flatDotted.kind === "invalid") {
        expect(flatDotted.issues).toContainEqual({
          kind: "invalid-value",
          layer,
          path: `amadeus/${layer}.json`,
          key: "intent-mirror.github.issue.consent",
          actualType: "legacy key solo-election.trigger.mode",
          expected: expect.stringContaining("Autonomy Mode") as unknown as string,
        });
      }

      const legacyAlias = parseAmadeusConfigLayers([
        present(layer, { "auto-solo-election": true }),
      ]);
      expect(legacyAlias.kind).toBe("invalid");
      if (legacyAlias.kind === "invalid") {
        const issue = legacyAlias.issues[0];
        expect(issue?.kind).toBe("invalid-value");
        if (issue?.kind === "invalid-value") {
          expect(issue.actualType).toBe("legacy key auto-solo-election");
          expect(issue.expected).toContain("Autonomy Mode");
        }
      }
    }
  });

  test("rejects a legacy key even when its renamed structured replacement is present", () => {
    const outcome = parseAmadeusConfigLayers([
      present("project", {
        "auto-mirror": "auto",
        "intent-mirror": { github: { issue: { consent: "auto" } } },
      }),
    ]);
    expect(outcome.kind).toBe("invalid");
  });

  test("rejects the old .mode spelling (flat-dotted) with a message naming the new .consent path", () => {
    const outcome = parseAmadeusConfigLayers([
      present("project", { "intent-mirror.github.issue.mode": "auto" }),
    ]);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind !== "invalid") return;
    expect(outcome.issues).toContainEqual({
      kind: "invalid-value",
      layer: "project",
      path: "amadeus/project.json",
      key: "intent-mirror.github.issue.consent",
      actualType: "legacy key intent-mirror.github.issue.mode",
      expected: "use intent-mirror.github.issue.consent; value conversion: unchanged",
    });
  });

  test("rejects the old finding .mode spelling (nested) with a message naming the new .consent path", () => {
    const outcome = parseAmadeusConfigLayers([
      present("project", {
        finding: { github: { issue: { creation: { mode: "auto" } } } },
      }),
    ]);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind !== "invalid") return;
    expect(outcome.issues).toContainEqual({
      kind: "invalid-value",
      layer: "project",
      path: "amadeus/project.json",
      key: "finding.github.issue.creation.consent",
      actualType: "legacy key mode",
      expected: "use finding.github.issue.creation.consent; value conversion: unchanged",
    });
  });

  test("still rejects a genuinely unknown flat dotted key with the generic message", () => {
    const outcome = parseAmadeusConfigLayers([
      present("project", { "unexpected.flat.dotted.key": "auto" }),
    ]);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind !== "invalid") return;
    expect(outcome.issues).toContainEqual({
      kind: "invalid-value",
      layer: "project",
      path: "amadeus/project.json",
      key: "intent-mirror.github.issue.consent",
      actualType: "unknown key unexpected.flat.dotted.key",
      expected: "documented structured configuration path",
    });
  });

  // R-5: deriveSoloElectionTrigger is a pure function of AutonomyMode — no
  // config, no I/O. The absence of any mock/hook argument is itself the
  // structural proof of purity.
  test("deriveSoloElectionTrigger derives manual/auto from AutonomyMode alone", () => {
    expect(deriveSoloElectionTrigger("none")).toBe("manual");
    expect(deriveSoloElectionTrigger("semi")).toBe("auto");
    expect(deriveSoloElectionTrigger("full")).toBe("auto");
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
          plugin: { activation: { names: ["conformance-fixture"] } },
        }),
      ]);
      expect(outcome.kind).toBe("invalid");
      if (outcome.kind === "invalid") {
        expect(outcome.issues[0]?.key).toBe("plugin.activation.names");
      }
    }
  });

  test("resolves host-owned plugin scope bindings only from project config", () => {
    const outcome = parseAmadeusConfigLayers([
      present("project", {
        plugin: {
          "scope-bindings": {
            "fixture-plugin": {
              "fixture-stage": ["team-z", "team-a"],
            },
          },
        },
      }),
    ]);
    expect(outcome.kind).toBe("resolved");
    if (outcome.kind === "resolved") {
      expect(outcome.config.plugin.scopeBindings).toEqual({
        "fixture-plugin": { "fixture-stage": ["team-a", "team-z"] },
      });
    }
    const forbidden = parseAmadeusConfigLayers([
      present("space", {
        plugin: { "scope-bindings": { "fixture-plugin": { "fixture-stage": ["team-a"] } } },
      }),
    ]);
    expect(forbidden.kind).toBe("invalid");

    for (const scopeBindings of [
      { "INVALID PLUGIN": { "fixture-stage": ["team-a"] } },
      { "fixture-plugin": { "INVALID STAGE": ["team-a"] } },
      { "fixture-plugin": { "fixture-stage": [] } },
      { "fixture-plugin": { "fixture-stage": ["INVALID SCOPE"] } },
      { "fixture-plugin": { "fixture-stage": ["team-a", "team-a"] } },
    ]) {
      const invalid = parseAmadeusConfigLayers([
        present("project", { plugin: { "scope-bindings": scopeBindings } }),
      ]);
      expect(invalid.kind).toBe("invalid");
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
          "intent-mirror": { github: { issue: { consent: null } } },
        }),
      ]).kind,
    ).toBe("invalid");
  });

  test("rejects non-object roots and structured prefixes", () => {
    expect(
      parseAmadeusConfigLayers([present("project", null)]).kind,
    ).toBe("invalid");

    const prefix = parseAmadeusConfigLayers([
      present("project", { "intent-mirror": false }),
    ]);
    expect(prefix.kind).toBe("invalid");
    if (prefix.kind !== "invalid") return;
    expect(prefix.issues).toContainEqual({
      kind: "invalid-value",
      layer: "project",
      path: "amadeus/project.json",
      key: "intent-mirror.github.issue.consent",
      actualType: "boolean",
      expected: "object",
    });
  });

  test("aggregates unknown paths, invalid modes, and out-of-range limits", () => {
    const outcome = parseAmadeusConfigLayers([
      present("project", {
        unexpected: true,
        finding: { github: { issue: { creation: { consent: "sometimes" } } } },
        swarm: { unit: { concurrency: { limit: 5 } } },
      }),
    ]);
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind === "invalid") {
      expect(outcome.issues).toHaveLength(3);
    }
  });
});
