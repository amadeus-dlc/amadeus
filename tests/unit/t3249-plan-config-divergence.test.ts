// covers: function:effectivePlanAction
//
// t3249 - the in-process half of the #3249 fix.
//
// The end-to-end recovery path lives in
// tests/integration/t3249-parked-scope-binding-divergence.integration.test.ts,
// which spawns the shipped CLIs. That proves the behaviour but measures no
// coverage (bun --coverage does not instrument a spawned child), so the three
// seams the fix actually changed are driven here in-process:
//
//   - effectivePlanAction              the ONE plan-action resolution rule
//   - the mandatory-plugin-stage guard through its registry, the same way
//     complete-workflow evaluates it
//   - retractStrandedWorkflowCompletion the recompose-side retraction
//
// Mechanism: none - pure functions and a guard registry driven directly.

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "bun:test";
import {
  WORKFLOW_COMPLETION_PREPARATION_GUARDS,
  type WorkflowPreparationGuardContext,
} from "../../packages/framework/core/tools/amadeus-state.ts";
import {
  evaluateLifecycleGuards,
  formatGuardRefusal,
} from "../../packages/framework/core/tools/amadeus-lifecycle-guard.ts";
import { effectivePlanAction } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { retractStrandedWorkflowCompletion } from "../../packages/framework/core/tools/amadeus-utility.ts";
import {
  prepareWorkflowCompletion,
  workflowCompletionPreparation,
} from "../../packages/framework/core/tools/amadeus-workflow-completion.ts";

// The guard and nextInScopeStage read the compiled graph and scope grid through
// these seams; a bare `bun test <this file>` sees no data/ dir in the source
// tree, so point both at the built copies (same move as t2771).
const DATA = join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "data");
process.env.AMADEUS_STAGE_GRAPH ??= join(DATA, "stage-graph.json");
process.env.AMADEUS_SCOPE_GRID ??= join(DATA, "scope-grid.json");

const roots: string[] = [];
afterAll(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

// A project whose host config binds `stages` as mandatory for scope `fix` —
// the binding that moved while the Intent was parked.
function projectBinding(...stages: readonly string[]): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t3249-"));
  roots.push(root);
  mkdirSync(join(root, "amadeus"), { recursive: true });
  writeFileSync(
    join(root, "amadeus", "config.json"),
    JSON.stringify({
      plugin: {
        "scope-bindings": {
          "t3249-plugin": Object.fromEntries(stages.map((slug) => [slug, ["fix"]])),
        },
      },
    }),
  );
  return root;
}

// A `fix`-scope state document. `rows` is the Stage Progress block, so each test
// decides what the record's execution projection says about the bound stage.
function state(rows: string, preparation = ""): string {
  return `# AI-DLC State Tracking

## Project Information
- **Project**: t3249
- **Scope**: fix

## Scope Configuration
- **Stages to Execute**: code-generation, build-and-test
- **Stages to Skip**: ci-pipeline
- **Execution Projection Digest**: projection-1

## Runtime State
${preparation}

## Stage Progress
${rows}

## Current Status
- **Status**: Running
- **Current Stage**: build-and-test
- **Last Completed Stage**: code-generation
`;
}

function refusalFor(pd: string, content: string): string {
  const context: WorkflowPreparationGuardContext = {
    pd,
    content,
    completedSlug: "build-and-test",
    requestedInstance: undefined,
  };
  const decision = evaluateLifecycleGuards<WorkflowPreparationGuardContext>({
    checkpoint: "workflow-completion",
    targetRevision: "workflow:build-and-test",
    adapters: WORKFLOW_COMPLETION_PREPARATION_GUARDS,
    context,
  });
  if (decision.kind !== "blocked") throw new Error(`expected blocked, got ${decision.kind}`);
  expect(decision.policyId).toBe("workflow-completion.mandatory-plugin-stages");
  return formatGuardRefusal(decision.refusal);
}

const ROWS = [
  "- [x] code-generation — EXECUTE",
  "- [ ] build-and-test — EXECUTE",
  "- [ ] ci-pipeline — SKIP",
].join("\n");

describe("effectivePlanAction is the one plan-action resolution rule", () => {
  test("a suffix override wins over the scope grid, in both directions", () => {
    const suffixes = new Map<string, "EXECUTE" | "SKIP">([
      ["promoted", "EXECUTE"],
      ["dropped", "SKIP"],
    ]);
    const grid = { promoted: "SKIP", dropped: "EXECUTE", untouched: "EXECUTE" };
    expect(effectivePlanAction(suffixes, grid, "promoted")).toBe("EXECUTE");
    expect(effectivePlanAction(suffixes, grid, "dropped")).toBe("SKIP");
    expect(effectivePlanAction(suffixes, grid, "untouched")).toBe("EXECUTE");
  });

  test("a slug NEITHER source names resolves undefined, not SKIP", () => {
    // The distinction the mandatory-plugin-stage guard keys off: an off-grid
    // stage is not a plan disagreement, so it keeps the pending arm.
    expect(effectivePlanAction(new Map(), {}, "never-compiled")).toBeUndefined();
    expect(effectivePlanAction(null, {}, "never-compiled")).toBeUndefined();
    expect(effectivePlanAction(undefined, { known: "SKIP" }, "known")).toBe("SKIP");
  });
});

describe("the mandatory-plugin-stage guard separates divergence from unrun", () => {
  test("a config-mandated stage the plan skips is named as a divergence, with the way out", () => {
    const refusal = refusalFor(projectBinding("ci-pipeline"), state(ROWS));
    expect(refusal).toContain('host-bound plugin stage(s) "ci-pipeline" are mandatory for scope "fix"');
    expect(refusal).toContain("execution projection has them SKIP");
    expect(refusal).toContain("amadeus-utility.ts recompose --add ci-pipeline");
    expect(refusal).toContain("amadeus-bolt.ts set-autonomy --mode none");
    expect(refusal).not.toContain("and is pending. Run and complete it before finishing.");
  });

  test("every diverged stage is named at once, so one recompose reconciles them", () => {
    const rows = `${ROWS}\n- [ ] deployment-pipeline — SKIP`;
    const refusal = refusalFor(
      projectBinding("ci-pipeline", "deployment-pipeline"),
      state(rows),
    );
    expect(refusal).toContain('"ci-pipeline", "deployment-pipeline" are mandatory');
    expect(refusal).toContain("recompose --add ci-pipeline,deployment-pipeline");
  });

  test("an on-plan mandatory stage keeps the unchanged pending wording", () => {
    const rows = ROWS.replace("- [x] code-generation — EXECUTE", "- [ ] code-generation — EXECUTE");
    const refusal = refusalFor(projectBinding("code-generation"), state(rows));
    expect(refusal).toBe(
      'Refusing workflow completion: host-bound plugin stage "code-generation" is mandatory ' +
        'for scope "fix" and is pending. Run and complete it before finishing.',
    );
  });

  test("a stage neither the grid nor the record names keeps the absent wording", () => {
    const refusal = refusalFor(projectBinding("never-compiled"), state(ROWS));
    expect(refusal).toBe(
      'Refusing workflow completion: host-bound plugin stage "never-compiled" is mandatory ' +
        'for scope "fix" and is absent. Run and complete it before finishing.',
    );
  });

  test("a completed mandatory stage, and the stage being completed, clear the guard", () => {
    const rows = ROWS.replace("- [ ] ci-pipeline — SKIP", "- [x] ci-pipeline — SKIP");
    const decision = evaluateLifecycleGuards<WorkflowPreparationGuardContext>({
      checkpoint: "workflow-completion",
      targetRevision: "workflow:build-and-test",
      adapters: WORKFLOW_COMPLETION_PREPARATION_GUARDS,
      context: {
        pd: projectBinding("ci-pipeline", "build-and-test"),
        content: state(rows),
        completedSlug: "build-and-test",
        requestedInstance: undefined,
      },
    });
    expect(decision.kind).toBe("allowed");
  });
});

describe("retractStrandedWorkflowCompletion closes the stale preparation at the cause", () => {
  const prepared = (stage: string): string =>
    prepareWorkflowCompletion(state(ROWS), stage, `terminal:${stage}`);

  test("a preparation the flip left non-terminal is cleared and reported", () => {
    // code-generation is no longer terminal: build-and-test is still ahead of it.
    const retraction = retractStrandedWorkflowCompletion(prepared("code-generation"), "fix");
    expect(workflowCompletionPreparation(retraction.content)).toBeNull();
    expect(retraction.auditValue).toBe("code-generation");
    expect(retraction.notice).toContain("Workflow completion preparation retracted: code-generation");
    // The field lines survive, emptied — so the new terminal stage's
    // prepareWorkflowCompletion updates them in place.
    expect(retraction.content).toContain("- **Workflow Completion Stage**:");
    const reprepared = prepareWorkflowCompletion(
      retraction.content,
      "build-and-test",
      "terminal:build-and-test",
    );
    expect(workflowCompletionPreparation(reprepared)?.stage).toBe("build-and-test");
  });

  test("a preparation that is still terminal is left alone", () => {
    const content = prepared("build-and-test");
    const retraction = retractStrandedWorkflowCompletion(content, "fix");
    expect(retraction.content).toBe(content);
    expect(retraction.auditValue).toBe("none");
    expect(retraction.notice).toBe("");
  });

  test("no preparation is nothing to retract", () => {
    const content = state(ROWS);
    const retraction = retractStrandedWorkflowCompletion(content, "fix");
    expect(retraction.content).toBe(content);
    expect(retraction.auditValue).toBe("none");
    expect(retraction.notice).toBe("");
  });
});
