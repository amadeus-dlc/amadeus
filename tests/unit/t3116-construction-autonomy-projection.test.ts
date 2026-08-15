// covers: file:packages/framework/core/tools/amadeus-intent-autonomy.ts
// size: small

// RFC-0001 FR-6 (#3116). The Construction scheduling projection is derived from
// the declared Intent mode by ONE function, and any record whose two fields
// disagree is a divergence — in every mode, not just full, and loudly rather
// than by silently disabling the swarm.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assertRecomposeAllowed } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  detectProjectionDivergence,
  projectConstructionAutonomy,
  type AutonomyMode,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";

const TOOLS_DIR = join(import.meta.dir, "..", "..", "packages", "framework", "core", "tools");

function stateWith(declared: string | null, recorded: string | null): string {
  return [
    "## Current Status",
    "",
    ...(declared === null ? [] : [`- **Intent Autonomy Mode**: ${declared}`]),
    "- **Intent Grant**: none",
    ...(recorded === null ? [] : [`- **Construction Autonomy Mode**: ${recorded}`]),
    "",
  ].join("\n");
}

describe("R-12: one projection rule", () => {
  const rule: ReadonlyArray<readonly [AutonomyMode, "autonomous" | "gated"]> = [
    ["none", "gated"],
    ["semi", "autonomous"],
    ["full", "autonomous"],
  ];

  for (const [mode, expected] of rule) {
    test(`${mode} projects to ${expected}`, () => {
      expect(projectConstructionAutonomy(mode)).toBe(expected);
    });
  }

  test("the writer and the reader both call the one function, so the rule is not restated", () => {
    const writer = readFileSync(join(TOOLS_DIR, "amadeus-intent-autonomy-production.ts"), "utf8");
    const reader = readFileSync(join(TOOLS_DIR, "amadeus-orchestrate.ts"), "utf8");
    expect(writer).toContain("projectConstructionAutonomy(");
    expect(reader).toContain("projectConstructionAutonomy(");
    // The retired ternary that encoded the rule a second time.
    expect(writer).not.toContain('mode === "full" ? "autonomous" : "gated"');
    // The retired full-only, stderr-only degrade.
    expect(reader).not.toContain("announceAutonomyProjectionSkew");
  });
});

describe("R-13 / R-14 / R-25: divergence detection over the declared x recorded matrix", () => {
  const matrix: ReadonlyArray<{
    readonly declared: string | null;
    readonly recorded: string | null;
    readonly diverges: boolean;
    readonly why: string;
  }> = [
    // R-25: the initialization pair — declared none (the template default) next
    // to an unwritten projection — is the ONLY exemption.
    { declared: "none", recorded: "unset", diverges: false, why: "the template's initialization pair" },
    { declared: "none", recorded: "gated", diverges: false, why: "none projects to gated" },
    { declared: "none", recorded: "autonomous", diverges: true, why: "none never projects to autonomous" },
    // R-25's other half: a DECLARED mode next to an unwritten projection is a
    // divergence, not a second exemption.
    { declared: "semi", recorded: "unset", diverges: true, why: "declared but unprojected" },
    { declared: "full", recorded: "unset", diverges: true, why: "declared but unprojected" },
    { declared: "semi", recorded: "autonomous", diverges: false, why: "semi projects to autonomous" },
    { declared: "semi", recorded: "gated", diverges: true, why: "the pre-RFC projection semi used to get" },
    { declared: "full", recorded: "autonomous", diverges: false, why: "full projects to autonomous" },
    { declared: "full", recorded: "gated", diverges: true, why: "#2483's incident shape" },
    // R-14: absence and unknown values are divergences, not silent degrades.
    { declared: "full", recorded: null, diverges: true, why: "the projection field is missing" },
    { declared: "semi", recorded: "bogus", diverges: true, why: "a hand-edited value" },
    { declared: "none", recorded: "", diverges: true, why: "an empty projection field" },
  ];

  for (const row of matrix) {
    test(`${row.declared ?? "(absent)"} x ${row.recorded ?? "(absent)"} ${row.diverges ? "diverges" : "agrees"} — ${row.why}`, () => {
      const report = detectProjectionDivergence(stateWith(row.declared, row.recorded));
      expect(report === null).toBe(!row.diverges);
    });
  }

  test("the report carries declared, the RAW recorded value, and the expectation", () => {
    expect(detectProjectionDivergence(stateWith("semi", "gated"))).toEqual({
      declared: "semi",
      recorded: "gated",
      expected: "autonomous",
    });
    expect(detectProjectionDivergence(stateWith("full", "bogus"))).toEqual({
      declared: "full",
      recorded: "bogus",
      expected: "autonomous",
    });
    expect(detectProjectionDivergence(stateWith("semi", null))).toEqual({
      declared: "semi",
      recorded: null,
      expected: "autonomous",
    });
  });

  test("a record that declares no mode makes no projection claim to diverge from", () => {
    expect(detectProjectionDivergence(stateWith(null, "autonomous"))).toBeNull();
    expect(detectProjectionDivergence(stateWith("bogus", "gated"))).toBeNull();
    expect(detectProjectionDivergence(null)).toBeNull();
  });
});

// R-24: an intended consequence, pinned so it is not mistaken for a regression.
// The recompose guard refuses to re-shape a plan under a running Construction
// swarm; semi now runs one, so semi's Construction inherits the refusal.
describe("R-24: semi's Construction inherits the recompose refusal", () => {
  test("the projection semi now writes is the one the guard denies", () => {
    const projection = projectConstructionAutonomy("semi");
    expect(assertRecomposeAllowed(projection, "CONSTRUCTION")).toEqual({
      kind: "denied",
      autonomy: "autonomous",
      reason: "human-gate-required",
      remediation: "switch-to-gated-or-wait-for-swarm",
    });
  });

  test("none's projection still allows it, and every earlier phase is inert", () => {
    expect(assertRecomposeAllowed(projectConstructionAutonomy("none"), "CONSTRUCTION"))
      .toEqual({ kind: "allowed", autonomy: "gated" });
    expect(assertRecomposeAllowed(projectConstructionAutonomy("semi"), "INCEPTION"))
      .toEqual({ kind: "allowed", autonomy: "autonomous" });
  });
});
