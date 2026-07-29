// t348 — the complete `mirror-projects` form: an arbitrary number of targets,
// whole-value layer replacement that never merges, and per-Project status-names
// overrides that change only the phase -> column mapping while every unnamed
// phase still falls back to the one default table.
// covers: packages/framework/core/tools/amadeus-mirror-{config,policy}.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  type ConfigLayer,
  type MirrorConfigLayerInput,
  parseMirrorConfigLayers,
} from "../../packages/framework/core/tools/amadeus-mirror-config.ts";
import {
  DEFAULT_PROJECT_STATUS_NAMES,
  expectedProjectStatus,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import type {
  MirrorProjectTarget,
  MirrorSnapshot,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

function layer(
  name: ConfigLayer,
  rawValue: unknown,
  present = true,
): MirrorConfigLayerInput {
  return { layer: name, path: `${name}/config.json`, present, rawValue };
}

function projects(layers: MirrorConfigLayerInput[]): readonly MirrorProjectTarget[] {
  const outcome = parseMirrorConfigLayers(layers);
  if (outcome.kind !== "resolved") {
    throw new Error(`expected resolved, got: ${JSON.stringify(outcome.issues)}`);
  }
  return outcome.config.projects;
}

function issues(layers: MirrorConfigLayerInput[]) {
  const outcome = parseMirrorConfigLayers(layers);
  if (outcome.kind !== "invalid") throw new Error("expected invalid");
  return outcome.issues;
}

function snapshot(overrides: Partial<MirrorSnapshot> = {}): MirrorSnapshot {
  return {
    intentUuid: "intent-t348",
    intentDir: "260727-demo-a1b2c3d4",
    projectSummary: "Project status sync",
    lifecyclePhase: "CONSTRUCTION",
    currentStage: "code-generation",
    status: "Running",
    registryStatus: "in-flight",
    updatedAt: "2026-07-27T00:00:00Z",
    ...overrides,
  };
}

describe("t348 many targets", () => {
  test("a layer may configure several Projects, each with its own overrides", () => {
    expect(
      projects([
        layer("space", {
          "mirror-projects": [
            { project: "acme/5", "status-names": { construction: "Building" } },
            { project: "acme/6" },
            { project: "other/12", "status-names": { done: "Shipped" } },
          ],
        }),
      ]),
    ).toEqual([
      {
        project: { owner: "acme", number: 5 },
        phaseField: "Intent Phase",
        statusNames: { construction: "Building" },
      },
      {
        project: { owner: "acme", number: 6 },
        phaseField: "Intent Phase",
        statusNames: {},
      },
      {
        project: { owner: "other", number: 12 },
        phaseField: "Intent Phase",
        statusNames: { done: "Shipped" },
      },
    ]);
  });

  test("one malformed element rejects the whole layer, never a partial list", () => {
    const reported = issues([
      layer("space", {
        "mirror-projects": [{ project: "acme/5" }, { project: "acme/six" }],
      }),
    ]);
    expect(reported).toHaveLength(1);
    expect(reported[0].key).toBe("mirror-projects");
  });

  test("an unknown phase in the second element still rejects the layer", () => {
    const reported = issues([
      layer("intent", {
        "mirror-projects": [
          { project: "acme/5" },
          { project: "acme/6", "status-names": { rollout: "Live" } },
        ],
      }),
    ]);
    expect(reported[0].kind === "invalid-value" && reported[0].actualType).toContain(
      "rollout",
    );
  });
});

describe("t348 layer replacement", () => {
  test("a later layer replaces the whole target list rather than adding to it", () => {
    expect(
      projects([
        layer("global", {
          "mirror-projects": [{ project: "acme/5" }, { project: "acme/6" }],
        }),
        layer("space", { "mirror-projects": [{ project: "other/12" }] }),
      ]).map((target) => target.project),
    ).toEqual([{ owner: "other", number: 12 }]);
  });

  test("replacement drops the earlier layer's overrides with its targets", () => {
    expect(
      projects([
        layer("global", {
          "mirror-projects": [
            { project: "acme/5", "status-names": { construction: "Building" } },
          ],
        }),
        layer("intent", { "mirror-projects": [{ project: "acme/5" }] }),
      ]),
    ).toEqual([
      {
        project: { owner: "acme", number: 5 },
        phaseField: "Intent Phase",
        statusNames: {},
      },
    ]);
  });

  test("a layer that only sets auto-mirror leaves the winning target list intact", () => {
    const outcome = parseMirrorConfigLayers([
      layer("global", {
        "mirror-projects": [{ project: "acme/5" }, { project: "acme/6" }],
      }),
      layer("space", { "auto-mirror": "off" }),
      layer("intent", { "auto-mirror": "auto" }),
    ]);
    if (outcome.kind !== "resolved") throw new Error("expected resolved");
    expect(outcome.config.autoMirror).toBe("auto");
    expect(outcome.config.projects).toHaveLength(2);
  });
});

describe("t348 status-names overrides", () => {
  test("a named phase uses the override and every other phase the default", () => {
    const statusNames = { construction: "Building" };
    expect(
      expectedProjectStatus(snapshot(), "phase-verified", statusNames),
    ).toEqual({ kind: "status", name: "Building" });
    expect(
      expectedProjectStatus(
        snapshot({ lifecyclePhase: "INCEPTION" }),
        "phase-verified",
        statusNames,
      ),
    ).toEqual({ kind: "status", name: DEFAULT_PROJECT_STATUS_NAMES.inception });
  });

  test("the done column follows its override on a landed Intent", () => {
    const landed = snapshot({ registryStatus: "complete", status: "Completed" });
    expect(expectedProjectStatus(landed, "workflow-completed", { done: "Shipped" })).toEqual(
      { kind: "status", name: "Shipped" },
    );
    expect(expectedProjectStatus(landed, "workflow-completed", {})).toEqual({
      kind: "status",
      name: DEFAULT_PROJECT_STATUS_NAMES.done,
    });
  });

  test("an override renames the column without changing which phase is expected", () => {
    // The mapping is the only thing configuration may change: a parked Intent
    // still expects no column at all, however its phases are named.
    expect(
      expectedProjectStatus(
        snapshot({ registryStatus: "parked" }),
        "phase-verified",
        { construction: "Building" },
      ),
    ).toEqual({ kind: "keep" });
  });

  test("two Projects in one layer derive different columns for the same phase", () => {
    const [first, second] = projects([
      layer("space", {
        "mirror-projects": [
          { project: "acme/5", "status-names": { construction: "Building" } },
          { project: "acme/6" },
        ],
      }),
    ]);
    expect(expectedProjectStatus(snapshot(), "phase-verified", first.statusNames)).toEqual(
      { kind: "status", name: "Building" },
    );
    expect(
      expectedProjectStatus(snapshot(), "phase-verified", second.statusNames),
    ).toEqual({ kind: "status", name: DEFAULT_PROJECT_STATUS_NAMES.construction });
  });
});
