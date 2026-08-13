// covers: function:verifyStageCompletionGuards, function:verifyPhaseCheckArtifact, function:handleIntentBirth, function:formatGuardRefusal
//
// t2771 — the no-change regression for the guard migration (#2771 FR-7).
//
// The migration moved guard bodies behind a shared runtime. Nothing a user sees
// was supposed to change, so this file pins the OLD text: each expectation below
// is the pre-migration message literal, and the current code has to render it
// byte-for-byte out of `reason` + `recovery`.
//
// SCOPE. The messages reachable from a bare temporary directory are asserted
// here. The refusals that need a seeded workspace — the blocking-sensor trio and
// the phase-check "artifact missing" arm — are asserted verbatim through the CLI
// by the suites that already own them (t185-stage-artifact-guard,
// t511-blocking-sensor-gate, t368-phase-check-name-contract,
// t-harness-approval-order-contract); those suites are unchanged by this work
// and are the regression evidence for those arms.
//
// Also pinned here: the three bypass routes the migration was required to leave
// alone — the four AMADEUS_SKIP_* switches, the blocking-sensor date cutoff, and
// the sensor truth table whose fail-open arms are a known deviation that this
// intent deliberately did not correct.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  evaluateLifecycleGuards,
  formatGuardRefusal,
} from "../../packages/framework/core/tools/amadeus-lifecycle-guard.ts";
import {
  PHASE_TRANSITION_GUARDS,
  STAGE_COMPLETION_GUARDS,
  type StageCompletionGuardContext,
  type PhaseTransitionGuardContext,
} from "../../packages/framework/core/tools/amadeus-state.ts";
import {
  INTENT_BIRTH_GUARDS,
  type IntentBirthGuardContext,
  type IntentBirthGuardReceipt,
} from "../../packages/framework/core/tools/amadeus-utility.ts";

const CORE_TOOLS = join(import.meta.dir, "..", "..", "packages", "framework", "core", "tools");

function tempProject(): string {
  return mkdtempSync(join(tmpdir(), "amadeus-t2771-regression-"));
}

function refusalText(decision: { kind: string; refusal?: { reason: string } }): string {
  if (decision.kind !== "blocked") throw new Error(`expected a blocked decision, got ${decision.kind}`);
  return formatGuardRefusal(
    (decision as { refusal: Parameters<typeof formatGuardRefusal>[0] }).refusal,
  );
}

describe("refusal text is unchanged by the migration", () => {
  test('stage completion: "one or more missing required artifacts"', () => {
    const pd = tempProject();
    const saved = process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
    delete process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
    process.env.AMADEUS_SKIP_BLOCKING_SENSOR_GUARD = "1";
    try {
      const decision = evaluateLifecycleGuards<StageCompletionGuardContext>({
        checkpoint: "stage-completion",
        targetRevision: "stage:code-generation",
        adapters: STAGE_COMPLETION_GUARDS,
        context: {
          pd,
          stage: {
            slug: "code-generation",
            name: "Code Generation",
            phase: "construction",
            produces: ["code-generation-plan.md"],
          },
        },
      });
      expect(refusalText(decision)).toBe(
        'Refusing to complete "code-generation": one or more missing required artifacts ' +
          "under the intent's record directory. The stage protocol requires Code Generation " +
          "to produce output before the gate. Produce the artifacts before completing. " +
          "(declared: code-generation-plan.md)",
      );
    } finally {
      if (saved === undefined) delete process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
      else process.env.AMADEUS_SKIP_ARTIFACT_GUARD = saved;
      delete process.env.AMADEUS_SKIP_BLOCKING_SENSOR_GUARD;
      rmSync(pd, { recursive: true, force: true });
    }
  });

  test('phase transition: "no active intent record resolves"', () => {
    const pd = tempProject();
    const saved = process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
    delete process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
    try {
      const decision = evaluateLifecycleGuards<PhaseTransitionGuardContext>({
        checkpoint: "phase-transition",
        targetRevision: "phase:construction",
        adapters: PHASE_TRANSITION_GUARDS,
        context: { pd, phase: "construction" },
      });
      expect(refusalText(decision)).toBe(
        'Refusing to verify the "construction" phase boundary: no active intent record resolves, ' +
          "so there is nowhere to check for verification/phase-check-construction.md.",
      );
    } finally {
      if (saved === undefined) delete process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
      else process.env.AMADEUS_SKIP_ARTIFACT_GUARD = saved;
      rmSync(pd, { recursive: true, force: true });
    }
  });

  test("intent birth: reserved intent name", () => {
    const pd = tempProject();
    try {
      const decision = evaluateLifecycleGuards<IntentBirthGuardContext, IntentBirthGuardReceipt>({
        checkpoint: "intent-birth",
        targetRevision: "intent:help",
        adapters: INTENT_BIRTH_GUARDS,
        context: { projectDir: pd, flags: {}, slugSource: "help" },
      });
      expect(refusalText(decision)).toBe(
        'Reserved intent name "help" cannot be created. Choose a non-help intent name.',
      );
    } finally {
      rmSync(pd, { recursive: true, force: true });
    }
  });
});

describe("the bypass routes the migration left alone", () => {
  test("all four AMADEUS_SKIP_* switches keep their names and consumers", () => {
    const consumers = ["amadeus-state", "amadeus-lib"]
      .map((tool) => readFileSync(join(CORE_TOOLS, `${tool}.ts`), "utf-8"))
      .join("\n");
    for (const variable of [
      "AMADEUS_SKIP_ARTIFACT_GUARD",
      "AMADEUS_SKIP_BLOCKING_SENSOR_GUARD",
      "AMADEUS_SKIP_GATE_REVISION_RECOVERY",
      "AMADEUS_SKIP_HUMAN_PRESENCE_GUARD",
    ]) {
      expect(consumers).toContain(`process.env.${variable} === "1"`);
    }
  });

  test("the blocking-sensor date cutoff is unchanged and still consulted", () => {
    const state = readFileSync(join(CORE_TOOLS, "amadeus-state.ts"), "utf-8");
    expect(state).toContain("const BLOCKING_SENSOR_CUTOFF_YYMMDD = 260809");
    expect(state).toContain("intentDate >= BLOCKING_SENSOR_CUTOFF_YYMMDD");
  });

  test("the sensor truth table's fail-open arms are untouched", () => {
    // A known deviation, recorded in the requirements and corrected separately:
    // fail-closed is the Runtime's AGGREGATION rule, and what an individual
    // sensor decides is its own policy. Pinned so a future edit is a decision.
    const sensor = readFileSync(join(CORE_TOOLS, "amadeus-sensor.ts"), "utf-8");
    expect(sensor).toContain(
      "//   e) status non-0/non-127 (non-timeout)                   → PASSED script-error: exit-<n>",
    );
    expect(sensor).toContain(
      "//   f) bad JSON / missing pass                              → PASSED script-error: bad-output",
    );
  });
});
