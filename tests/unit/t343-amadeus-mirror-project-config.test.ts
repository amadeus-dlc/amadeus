// t343 — C1 mirror-projects configuration: the widened allowlist, the
// fail-closed "<owner>/<number>" and status-names parse, and per-key layer
// precedence independent of auto-mirror.
// covers: packages/framework/core/tools/amadeus-mirror-config.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  type ConfigLayer,
  type MirrorConfigLayerInput,
  parseMirrorConfigLayers,
} from "../../packages/framework/core/tools/amadeus-mirror-config.ts";

function layer(
  name: ConfigLayer,
  rawValue: unknown,
  present = true,
): MirrorConfigLayerInput {
  return { layer: name, path: `${name}/config.json`, present, rawValue };
}

function resolved(layers: MirrorConfigLayerInput[]) {
  const outcome = parseMirrorConfigLayers(layers);
  if (outcome.kind !== "resolved") {
    throw new Error(`expected resolved, got: ${JSON.stringify(outcome.issues)}`);
  }
  return outcome;
}

function issues(layers: MirrorConfigLayerInput[]) {
  const outcome = parseMirrorConfigLayers(layers);
  if (outcome.kind !== "invalid") throw new Error("expected invalid");
  return outcome.issues;
}

describe("t343 defaults", () => {
  test("no layer yields prompt mode and no configured Project", () => {
    expect(resolved([]).config).toEqual({ autoMirror: "prompt", projects: [], autoSoloElection: false });
  });

  test("a layer with only auto-mirror leaves projects empty", () => {
    expect(resolved([layer("global", { "auto-mirror": "auto" })]).config).toEqual({
      autoMirror: "auto",
      projects: [], autoSoloElection: false,
    });
  });

  test("an empty object contributes nothing and is not a source", () => {
    const outcome = resolved([layer("global", {})]);
    expect(outcome.config).toEqual({ autoMirror: "prompt", projects: [], autoSoloElection: false });
    expect(outcome.sources).toEqual([]);
  });

  test("auto-solo-election is opt-in and accepts only an explicit boolean", () => {
    expect(
      resolved([layer("global", { "auto-solo-election": true })]).config
        .autoSoloElection,
    ).toBe(true);
    expect(
      resolved([layer("global", { "auto-solo-election": false })]).config
        .autoSoloElection,
    ).toBe(false);

    const reported = issues([
      layer("global", { "auto-solo-election": "true" }),
    ]);
    expect(reported).toHaveLength(1);
    expect(reported[0]).toMatchObject({
      key: "auto-solo-election",
      actualType: "string",
      expected: "boolean",
    });
  });

  test("auto-solo-election follows global -> space -> intent precedence", () => {
    const outcome = resolved([
      layer("global", { "auto-solo-election": true }),
      layer("space", { "auto-solo-election": false }),
      layer("intent", { "auto-solo-election": true }),
    ]);
    expect(outcome.config.autoSoloElection).toBe(true);
    expect(outcome.sources).toEqual([
      "global/config.json",
      "space/config.json",
      "intent/config.json",
    ]);
  });
});

describe("t343 project parse", () => {
  test("a well-formed target parses into owner and number", () => {
    const outcome = resolved([
      layer("space", { "mirror-projects": [{ project: "amadeus-dlc/5" }] }),
    ]);
    expect(outcome.config.projects).toEqual([
      {
        project: { owner: "amadeus-dlc", number: 5 },
        phaseField: "Intent Phase",
        statusNames: {},
      },
    ]);
    expect(outcome.sources).toEqual(["space/config.json"]);
  });

  test("phase-field overrides the authoritative field name", () => {
    const [target] = resolved([
      layer("space", {
        "mirror-projects": [
          { project: "amadeus-dlc/5", "phase-field": "Lifecycle" },
        ],
      }),
    ]).config.projects;

    expect(target.phaseField).toBe("Lifecycle");
  });

  test.each([
    ["an empty phase-field", ""],
    ["a non-string phase-field", 5],
    ["a null phase-field", null],
  ])("rejects %s", (_label, phaseField) => {
    const reported = issues([
      layer("global", {
        "mirror-projects": [
          { project: "a/1", "phase-field": phaseField },
        ],
      }),
    ]);
    expect(reported[0].key).toBe("mirror-projects");
  });

  test("an empty array is valid and configures no Project", () => {
    expect(resolved([layer("space", { "mirror-projects": [] })]).config.projects).toEqual(
      [],
    );
  });

  test("status-names overrides parse for every phase in the closed set", () => {
    const statusNames = {
      ideation: "Discovery",
      inception: "Shaping",
      construction: "Building",
      operation: "Running",
      done: "Shipped",
    };
    expect(
      resolved([
        layer("intent", {
          "mirror-projects": [{ project: "acme/1", "status-names": statusNames }],
        }),
      ]).config.projects[0].statusNames,
    ).toEqual(statusNames);
  });

  test.each([
    ["a missing slash", "amadeus-dlc"],
    ["a non-numeric number", "amadeus-dlc/five"],
    ["a zero number", "amadeus-dlc/0"],
    ["a negative number", "amadeus-dlc/-1"],
    ["a fractional number", "amadeus-dlc/1.5"],
    ["an empty owner", "/5"],
    ["a trailing space", "amadeus-dlc/5 "],
    ["a leading space", " amadeus-dlc/5"],
    ["an extra segment", "amadeus-dlc/5/6"],
    ["an empty string", ""],
  ])("rejects %s rather than coercing it", (_label, project) => {
    const reported = issues([layer("global", { "mirror-projects": [{ project }] })]);
    expect(reported).toHaveLength(1);
    expect(reported[0].key).toBe("mirror-projects");
  });

  test("a non-string project value is rejected", () => {
    expect(issues([layer("global", { "mirror-projects": [{ project: 5 }] })])[0].key).toBe(
      "mirror-projects",
    );
  });

  test("a non-array mirror-projects value is rejected", () => {
    const reported = issues([layer("global", { "mirror-projects": { project: "a/1" } })]);
    expect(reported[0]).toMatchObject({
      kind: "invalid-value",
      key: "mirror-projects",
      actualType: "object",
    });
  });

  test("every element of a multi-target array is parsed in order", () => {
    expect(
      resolved([
        layer("global", {
          "mirror-projects": [{ project: "a/1" }, { project: "a/2" }],
        }),
      ]).config.projects.map((target) => target.project),
    ).toEqual([
      { owner: "a", number: 1 },
      { owner: "a", number: 2 },
    ]);
  });

  test("duplicate Project identities in one layer are rejected", () => {
    const reported = issues([
      layer("space", {
        "mirror-projects": [
          { project: "acme/5", "phase-field": "Intent Phase" },
          { project: "ACME/5", "phase-field": "Lifecycle" },
        ],
      }),
    ]);

    expect(reported).toHaveLength(1);
    expect(reported[0]).toMatchObject({
      key: "mirror-projects",
      actualType: "duplicate project acme/5",
    });
  });

  test("an unknown key inside a target is rejected", () => {
    const reported = issues([
      layer("global", { "mirror-projects": [{ project: "a/1", colour: "red" }] }),
    ]);
    expect(reported[0].kind === "invalid-value" && reported[0].actualType).toContain(
      "colour",
    );
  });

  test("an unknown phase in status-names is rejected", () => {
    const reported = issues([
      layer("global", {
        "mirror-projects": [{ project: "a/1", "status-names": { rollout: "Live" } }],
      }),
    ]);
    expect(reported[0].kind === "invalid-value" && reported[0].actualType).toContain(
      "rollout",
    );
  });

  test.each([
    ["a non-string name", { ideation: 5 }],
    ["an empty name", { ideation: "" }],
    ["a null name", { ideation: null }],
  ])("rejects %s in status-names", (_label, statusNames) => {
    const reported = issues([
      layer("global", {
        "mirror-projects": [{ project: "a/1", "status-names": statusNames }],
      }),
    ]);
    expect(reported[0].key).toBe("mirror-projects");
  });

  test("a non-object status-names is rejected", () => {
    const reported = issues([
      layer("global", {
        "mirror-projects": [{ project: "a/1", "status-names": ["Ideation"] }],
      }),
    ]);
    expect(reported[0].kind === "invalid-value" && reported[0].actualType).toContain(
      "status-names is array",
    );
  });

  test("a non-object element is rejected", () => {
    const reported = issues([layer("global", { "mirror-projects": ["a/1"] })]);
    expect(reported[0].kind === "invalid-value" && reported[0].actualType).toContain(
      "element is string",
    );
  });
});

describe("t343 allowlist", () => {
  test("mirror-projects is now an accepted key alongside auto-mirror", () => {
    expect(
      resolved([
        layer("global", {
          "auto-mirror": "auto",
          "mirror-projects": [{ project: "a/1" }],
        }),
      ]).config,
    ).toEqual({
      autoMirror: "auto",
      projects: [
        {
          project: { owner: "a", number: 1 },
          phaseField: "Intent Phase",
          statusNames: {},
        },
      ],
      autoSoloElection: false,
    });
  });

  test("a key outside the allowlist is still rejected", () => {
    const reported = issues([layer("global", { "mirror-project": [] })]);
    expect(reported[0].kind === "invalid-value" && reported[0].actualType).toContain(
      "unknown key(s): mirror-project",
    );
  });

  test("a non-object layer root is rejected", () => {
    expect(issues([layer("global", ["auto"])])[0]).toMatchObject({
      key: "auto-mirror",
      actualType: "array",
    });
  });
});

describe("t343 layer precedence", () => {
  test("the last layer carrying mirror-projects wins outright", () => {
    const outcome = resolved([
      layer("global", { "mirror-projects": [{ project: "a/1" }] }),
      layer("intent", { "mirror-projects": [{ project: "b/2" }] }),
    ]);
    expect(outcome.config.projects).toEqual([
      {
        project: { owner: "b", number: 2 },
        phaseField: "Intent Phase",
        statusNames: {},
      },
    ]);
  });

  test("a later empty array clears an earlier target rather than merging", () => {
    expect(
      resolved([
        layer("global", { "mirror-projects": [{ project: "a/1" }] }),
        layer("space", { "mirror-projects": [] }),
      ]).config.projects,
    ).toEqual([]);
  });

  test("the two keys resolve independently across layers", () => {
    const outcome = resolved([
      layer("global", { "mirror-projects": [{ project: "a/1" }] }),
      layer("intent", { "auto-mirror": "auto" }),
    ]);
    expect(outcome.config.autoMirror).toBe("auto");
    expect(outcome.config.projects).toEqual([
      {
        project: { owner: "a", number: 1 },
        phaseField: "Intent Phase",
        statusNames: {},
      },
    ]);
    expect(outcome.sources).toEqual(["global/config.json", "intent/config.json"]);
  });

  test("layers are ordered global then space then intent regardless of input order", () => {
    const outcome = resolved([
      layer("intent", { "mirror-projects": [{ project: "c/3" }] }),
      layer("global", { "mirror-projects": [{ project: "a/1" }] }),
      layer("space", { "mirror-projects": [{ project: "b/2" }] }),
    ]);
    expect(outcome.config.projects[0].project).toEqual({ owner: "c", number: 3 });
  });

  test("an absent layer contributes nothing even when it carries a value", () => {
    expect(
      resolved([layer("intent", { "mirror-projects": [{ project: "z/9" }] }, false)])
        .config.projects,
    ).toEqual([]);
  });
});

describe("t343 issue reporting", () => {
  test("both keys can report an error from one layer at once", () => {
    const reported = issues([
      layer("global", { "auto-mirror": "yes", "mirror-projects": "nope" }),
    ]);
    expect(reported.map((issue) => issue.key).sort()).toEqual([
      "auto-mirror",
      "mirror-projects",
    ]);
  });

  test("an invalid layer contributes no partial configuration", () => {
    const outcome = parseMirrorConfigLayers([
      layer("global", { "mirror-projects": [{ project: "a/1" }] }),
      layer("intent", { "mirror-projects": "broken" }),
    ]);
    expect(outcome.kind).toBe("invalid");
  });

  test("each issue names its layer and path", () => {
    expect(issues([layer("space", { "mirror-projects": 7 })])[0]).toMatchObject({
      layer: "space",
      path: "space/config.json",
      expected: expect.stringContaining("<owner>/<number>"),
    });
  });
});
