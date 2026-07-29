// t339 — C2 Project field derivation: default table, overrides, keep branches,
// landing branch, unmapped phase, and exact-match option lookup.
// covers: packages/framework/core/tools/amadeus-mirror-policy.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  DEFAULT_PROJECT_STATUS_NAMES,
  expectedProjectFieldValues,
  expectedProjectStatus,
  selectProjectStatusOption,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import type {
  MirrorProjectSingleSelectField,
  MirrorSnapshot,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

function snapshot(overrides: Partial<MirrorSnapshot> = {}): MirrorSnapshot {
  return {
    intentUuid: "intent-1",
    intentDir: "amadeus/spaces/default/intents/demo",
    projectSummary: "demo",
    lifecyclePhase: "Ideation",
    currentStage: "intent-capture",
    status: "In Progress",
    registryStatus: "in-flight",
    updatedAt: "2026-07-27T00:00:00Z",
    ...overrides,
  };
}

const FIELD: MirrorProjectSingleSelectField = {
  fieldId: "PVTSSF_field",
  fieldName: "Intent Phase",
  options: [
    { id: "opt-ideation", name: "Ideation" },
    { id: "opt-done", name: "Done" },
  ],
};

describe("t339 default table", () => {
  test("the table is the closed five-key phase vocabulary", () => {
    expect(Object.keys(DEFAULT_PROJECT_STATUS_NAMES).sort()).toEqual([
      "construction",
      "done",
      "ideation",
      "inception",
      "operation",
    ]);
  });

  test("each lifecycle phase derives its default column name", () => {
    const cases: ReadonlyArray<[string, string]> = [
      ["Ideation", "Ideation"],
      ["Inception", "Inception"],
      ["Construction", "Construction"],
      ["Operation", "Operation"],
    ];
    for (const [lifecyclePhase, expected] of cases) {
      expect(
        expectedProjectStatus(snapshot({ lifecyclePhase }), "phase-verified", {}),
      ).toEqual({ kind: "status", name: expected });
    }
  });

  test("phase matching is case-insensitive on the snapshot value", () => {
    expect(
      expectedProjectStatus(
        snapshot({ lifecyclePhase: "cOnStRuCtIoN" }),
        "phase-verified",
        {},
      ),
    ).toEqual({ kind: "status", name: "Construction" });
  });
});

describe("t339 keep branch", () => {
  test("a parked boundary keeps the column regardless of phase", () => {
    expect(
      expectedProjectStatus(snapshot({ lifecyclePhase: "Construction" }), "parked", {}),
    ).toEqual({ kind: "keep" });
  });

  test("a parked registry status keeps the column on any boundary", () => {
    expect(
      expectedProjectStatus(
        snapshot({ registryStatus: "parked" }),
        "phase-verified",
        {},
      ),
    ).toEqual({ kind: "keep" });
  });

  test("parked wins over a landed snapshot", () => {
    expect(
      expectedProjectStatus(
        snapshot({ registryStatus: "parked", status: "Completed" }),
        "workflow-completed",
        {},
      ),
    ).toEqual({ kind: "keep" });
  });

  test("keep carries no name, so no caller can read a target from it", () => {
    const kept = expectedProjectStatus(snapshot(), "parked", { done: "Shipped" });
    expect("name" in kept).toBe(false);
  });
});

describe("t339 landing branch", () => {
  test("registry complete plus workflow Completed derives the done column", () => {
    expect(
      expectedProjectStatus(
        snapshot({
          registryStatus: "complete",
          status: "Completed",
          lifecyclePhase: "Operation",
        }),
        "workflow-completed",
        {},
      ),
    ).toEqual({ kind: "status", name: "Done" });
  });

  test("registry complete alone is not landing and stays on the phase column", () => {
    expect(
      expectedProjectStatus(
        snapshot({ registryStatus: "complete", lifecyclePhase: "Operation" }),
        "workflow-completed",
        {},
      ),
    ).toEqual({ kind: "status", name: "Operation" });
  });

  test("workflow Completed alone is not landing", () => {
    expect(
      expectedProjectStatus(
        snapshot({ status: "Completed", lifecyclePhase: "Operation" }),
        "workflow-completed",
        {},
      ),
    ).toEqual({ kind: "status", name: "Operation" });
  });
});

describe("t339 overrides", () => {
  test("a configured name replaces the default for that phase only", () => {
    const statusNames = { ideation: "Discovery" };
    expect(
      expectedProjectStatus(snapshot(), "phase-verified", statusNames),
    ).toEqual({ kind: "status", name: "Discovery" });
    expect(
      expectedProjectStatus(
        snapshot({ lifecyclePhase: "Construction" }),
        "phase-verified",
        statusNames,
      ),
    ).toEqual({ kind: "status", name: "Construction" });
  });

  test("the done override applies on the landing branch", () => {
    expect(
      expectedProjectStatus(
        snapshot({ registryStatus: "complete", status: "Completed" }),
        "workflow-completed",
        { done: "Shipped" },
      ),
    ).toEqual({ kind: "status", name: "Shipped" });
  });

  test("overriding one phase does not mutate the shared default table", () => {
    expectedProjectStatus(snapshot(), "phase-verified", { ideation: "Discovery" });
    expect(DEFAULT_PROJECT_STATUS_NAMES.ideation).toBe("Ideation");
  });
});

describe("t339 unmapped phase", () => {
  test("initialization has no board column and yields keep", () => {
    expect(
      expectedProjectStatus(
        snapshot({ lifecyclePhase: "Initialization" }),
        "phase-verified",
        {},
      ),
    ).toEqual({ kind: "keep" });
  });

  test("an unrecognised phase yields keep rather than an invented name", () => {
    expect(
      expectedProjectStatus(
        snapshot({ lifecyclePhase: "Rollout" }),
        "phase-verified",
        {},
      ),
    ).toEqual({ kind: "keep" });
  });

  test("a phase literally named done is not the landing column", () => {
    expect(
      expectedProjectStatus(
        snapshot({ lifecyclePhase: "Done" }),
        "phase-verified",
        {},
      ),
    ).toEqual({ kind: "keep" });
  });

  test("an empty phase yields keep", () => {
    expect(
      expectedProjectStatus(snapshot({ lifecyclePhase: "" }), "phase-verified", {}),
    ).toEqual({ kind: "keep" });
  });
});

describe("t339 auxiliary Status policy", () => {
  test("an active Intent expects In progress even when its phase is unmapped", () => {
    expect(
      expectedProjectFieldValues(
        snapshot({ lifecyclePhase: "Initialization" }),
        "phase-verified",
        {},
      ),
    ).toEqual({
      lifecycle: { kind: "keep" },
      auxiliaryStatus: { kind: "status", name: "In progress" },
    });
  });

  test("a landed Intent expects Done", () => {
    expect(
      expectedProjectFieldValues(
        snapshot({ registryStatus: "complete", status: "Completed" }),
        "workflow-completed",
        {},
      ).auxiliaryStatus,
    ).toEqual({ kind: "status", name: "Done" });
  });

  test("a parked Intent leaves auxiliary Status unchanged", () => {
    expect(
      expectedProjectFieldValues(snapshot(), "parked", {}).auxiliaryStatus,
    ).toEqual({ kind: "keep" });
  });

  test("an archived Intent leaves both Project fields unchanged", () => {
    expect(
      expectedProjectFieldValues(
        snapshot({
          registryStatus: "archived",
          status: "Completed",
          lifecyclePhase: "Operation",
        }),
        "manual",
        {},
      ),
    ).toEqual({
      lifecycle: { kind: "keep" },
      auxiliaryStatus: { kind: "keep" },
    });
  });
});

describe("t339 exact-match option lookup", () => {
  test("an exactly matching option resolves to its id", () => {
    expect(selectProjectStatusOption(FIELD, "Ideation")).toEqual({
      id: "opt-ideation",
      name: "Ideation",
    });
  });

  test("case differences do not match", () => {
    expect(selectProjectStatusOption(FIELD, "ideation")).toBeNull();
    expect(selectProjectStatusOption(FIELD, "IDEATION")).toBeNull();
  });

  test("surrounding whitespace does not match", () => {
    expect(selectProjectStatusOption(FIELD, " Ideation")).toBeNull();
    expect(selectProjectStatusOption(FIELD, "Ideation ")).toBeNull();
  });

  test("a partial or absent name does not match", () => {
    expect(selectProjectStatusOption(FIELD, "Ideat")).toBeNull();
    expect(selectProjectStatusOption(FIELD, "Inception")).toBeNull();
  });

  test("an empty option list resolves nothing", () => {
    expect(
      selectProjectStatusOption({ ...FIELD, options: [] }, "Ideation"),
    ).toBeNull();
  });
});
