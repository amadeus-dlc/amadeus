// covers: function:verifyStageCompletionGuards, function:verifyPhaseCheckArtifact, function:handleIntentBirth
//
// t2771 — the commit-path census (#2771 FR-2).
//
// THE MEASURED PREDICATE for "the guards cannot be bypassed". Every commit path
// of the four authoritative checkpoints — Intent birth, stage completion, phase
// transition (including jump's forward crossing) and workflow completion —
// must reach evaluateLifecycleGuards before it writes. This test enumerates
// those paths FROM THE SOURCE rather than from a hand-written list, so a fifth
// completion handler added tomorrow without the chokepoint turns this red
// instead of shipping a silent fail-open.
//
// Two levels, because the chokepoints are named functions:
//   1. each commit path calls its checkpoint's chokepoint (or the runtime), and
//   2. each chokepoint's own body calls evaluateLifecycleGuards.
// Level 2 is what makes level 1 more than a naming convention.
//
// Reads the product source off disk, so it lives in the integration suite.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CORE_TOOLS = join(import.meta.dir, "..", "..", "packages", "framework", "core", "tools");

function source(tool: string): string {
  return readFileSync(join(CORE_TOOLS, `${tool}.ts`), "utf-8");
}

const STATE = source("amadeus-state");
const UTILITY = source("amadeus-utility");
const JUMP = source("amadeus-jump");

/** The body of a top-level `function NAME(` / `export function NAME(`, by brace
 *  matching from its opening `{`. Throws when the declaration is absent so a
 *  rename fails loudly here rather than silently emptying the census. */
function functionBody(src: string, name: string): string {
  const declaration = new RegExp(`^(?:export )?(?:async )?function ${name}\\(`, "m");
  const match = declaration.exec(src);
  if (!match) throw new Error(`census target function is missing: ${name}`);
  const open = src.indexOf("{", match.index);
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error(`census target function is unterminated: ${name}`);
}

/** Names of the top-level functions whose bodies contain `needle`. */
function functionsContaining(src: string, needle: string): string[] {
  const declarations = [...src.matchAll(/^(?:export )?(?:async )?function ([A-Za-z0-9_]+)\(/gm)];
  const hits: string[] = [];
  for (const declaration of declarations) {
    const name = declaration[1];
    if (functionBody(src, name).includes(needle)) hits.push(name);
  }
  return hits;
}

function callCount(src: string, call: string): number {
  return src.split(call).length - 1;
}

describe("stage-completion commit paths", () => {
  test("every handler that marks a stage completed runs the completion chokepoint", () => {
    // The write itself is the definition of a commit path: setCheckbox(..., "completed").
    const writers = functionsContaining(STATE, '"completed"),').filter((name) =>
      functionBody(STATE, name).includes("setCheckbox("),
    );
    expect(writers.sort()).toEqual([
      "approveUnderLock",
      "completeWorkflowForTarget",
      "handleAdvance",
      "handleFinalize",
    ]);
    for (const writer of writers) {
      expect(functionBody(STATE, writer)).toContain("verifyStageCompletionGuards(");
    }
  });

  test("the chokepoint itself evaluates the stage-completion registry", () => {
    const body = functionBody(STATE, "verifyStageCompletionGuards");
    expect(body).toContain("evaluateLifecycleGuards<StageCompletionGuardContext>");
    expect(body).toContain("adapters: STAGE_COMPLETION_GUARDS");
  });
});

describe("phase-transition commit paths", () => {
  test("all five authoritative crossings run the phase gate", () => {
    const stateCallers = functionsContaining(STATE, "verifyPhaseCheckArtifact(").filter(
      (name) => name !== "verifyPhaseCheckArtifact",
    );
    expect(stateCallers.sort()).toEqual([
      "approveUnderLock",
      "completeWorkflowForTarget",
      "handleAdvance",
      "handleFinalize",
    ]);
    // The fifth crossing lives in the jump tool and reuses the identical gate.
    expect(JUMP).toContain("verifyPhaseCheckArtifact,");
    expect(JUMP).toContain("verifyPhaseCheckArtifact(pd, phase)");
  });

  test("the phase gate evaluates the phase-transition registry", () => {
    const body = functionBody(STATE, "verifyPhaseCheckArtifact");
    expect(body).toContain("evaluateLifecycleGuards<PhaseTransitionGuardContext>");
    expect(body).toContain("adapters: PHASE_TRANSITION_GUARDS");
  });
});

describe("workflow-completion and intent-birth commit paths", () => {
  test("workflow completion evaluates both of its rounds", () => {
    const body = functionBody(STATE, "completeWorkflowForTarget");
    expect(body).toContain("adapters: WORKFLOW_COMPLETION_PREPARATION_GUARDS");
    expect(body).toContain("adapters: WORKFLOW_COMPLETION_AUTHORIZATION_GUARDS");
  });

  test("intent birth evaluates both of its rounds", () => {
    const body = functionBody(UTILITY, "handleIntentBirth");
    expect(body).toContain("adapters: INTENT_BIRTH_GUARDS");
    expect(body).toContain("adapters: INTENT_BIRTH_WORKSPACE_GUARDS");
  });
});

describe("census completeness", () => {
  test("no commit path evaluates a registry outside the enumerated checkpoints", () => {
    // Every evaluateLifecycleGuards call in the product source is accounted for
    // by the census above: 1 stage-completion + 1 phase-transition + 2
    // workflow-completion in amadeus-state.ts, 2 intent-birth in
    // amadeus-utility.ts. A new call site is a new commit path and must be
    // enumerated here before it can pass.
    expect(callCount(STATE, "evaluateLifecycleGuards<")).toBe(4);
    expect(callCount(UTILITY, "evaluateLifecycleGuards<")).toBe(2);
    expect(callCount(JUMP, "evaluateLifecycleGuards")).toBe(0);
  });

  test("every declared registry is reachable from a commit path", () => {
    const registries = [
      ["STAGE_COMPLETION_GUARDS", STATE],
      ["PHASE_TRANSITION_GUARDS", STATE],
      ["WORKFLOW_COMPLETION_PREPARATION_GUARDS", STATE],
      ["WORKFLOW_COMPLETION_AUTHORIZATION_GUARDS", STATE],
      ["INTENT_BIRTH_GUARDS", UTILITY],
      ["INTENT_BIRTH_WORKSPACE_GUARDS", UTILITY],
    ] as const;
    for (const [registry, src] of registries) {
      expect(src).toContain(`export const ${registry}`);
      expect(callCount(src, `adapters: ${registry}`)).toBe(1);
    }
  });
});
