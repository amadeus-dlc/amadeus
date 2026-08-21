// covers: function:verifyStageCompletionGuards, function:verifyPhaseCheckArtifact, function:verifyStageArtifacts, function:verifyBlockingSensors
//
// t2771 — the contrast matrix for the four lifecycle checkpoints (#2771 FR-8).
//
// Every checkpoint registry is driven through the shared runtime against a real
// temporary workspace: filesystem reads are the guards' whole business, so this
// lives in the integration suite rather than tests/unit.
//
// THE MATRIX. Seven observations per checkpoint — allowed / denied / unknown /
// not-applicable / adapter exception / timeout / multi-guard conflict:
//   - `timeout` is structurally unreachable and is asserted as such: the runtime
//     and every built-in adapter are synchronous, so no deadline can expire
//     mid-evaluation. The documented representation (an adapter that owns a time
//     budget reports its expiry as `unknown`) is covered by the `unknown` row.
//   - `unknown` and `exception` have no built-in producer at the stage-completion
//     and phase-transition checkpoints — both registries answer from local file
//     existence — so those rows drive the real registry with a probe adapter
//     appended, which exercises the same registry + runtime pair the commit path
//     uses. The workflow-completion checkpoint has a real `unknown` producer (a
//     Goal receipt that has not settled) and is asserted through it.
//   - `multi-guard conflict` asserts the aggregation the commit path depends on:
//     the FIRST blocking policy in evaluation order owns the refusal.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  evaluateLifecycleGuards,
  guardDenied,
  guardReceipt,
  type LifecycleGuardAdapter,
  type LifecycleGuardDecision,
} from "../../packages/framework/core/tools/amadeus-lifecycle-guard.ts";
import {
  PHASE_TRANSITION_GUARDS,
  type PhaseTransitionGuardContext,
  STAGE_COMPLETION_GUARDS,
  type StageCompletionGuardContext,
  type WorkflowAuthorizationGuardContext,
  WORKFLOW_COMPLETION_AUTHORIZATION_GUARDS,
  WORKFLOW_COMPLETION_PREPARATION_GUARDS,
  type WorkflowPreparationGuardContext,
} from "../../packages/framework/core/tools/amadeus-state.ts";
import type { GoalReconciliationReceipt } from "../../packages/framework/core/tools/amadeus-goal-reconciliation.ts";
import {
  type ClassifiedWorkspaceScan,
  INTENT_BIRTH_GUARDS,
  INTENT_BIRTH_WORKSPACE_GUARDS,
  type IntentBirthGuardContext,
  type IntentBirthGuardReceipt,
  type WorkspaceScanGuardContext,
} from "../../packages/framework/core/tools/amadeus-utility.ts";

// The guards that consult the compiled stage graph (the blocking-sensor policy,
// and nextInScopeStage inside the Goal receipt policy) read it through the
// AMADEUS_STAGE_GRAPH seam. Point it at the built graph so a bare
// `bun test <this file>` sees the same graph the runner's fixtures do — the
// source tree carries no compiled data/ dir.
process.env.AMADEUS_STAGE_GRAPH ??= join(
  import.meta.dir,
  "..",
  "..",
  "dist",
  "claude",
  ".claude",
  "tools",
  "data",
  "stage-graph.json",
);

const tempRoots: string[] = [];

function tempProject(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t2771-"));
  tempRoots.push(root);
  return root;
}

function withEnv(vars: Record<string, string | undefined>, run: () => void): void {
  const saved: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(vars)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function throwingProbe<C, P = never>(
  checkpoint: LifecycleGuardAdapter<C, P>["checkpoint"],
): LifecycleGuardAdapter<C, P> {
  return {
    id: "probe.throws",
    checkpoint,
    order: 1000,
    evaluate: () => {
      throw new Error("probe failure");
    },
  };
}

function denyingProbe<C, P = never>(
  checkpoint: LifecycleGuardAdapter<C, P>["checkpoint"],
  id: string,
  order: number,
): LifecycleGuardAdapter<C, P> {
  return {
    id,
    checkpoint,
    order,
    evaluate: () => guardDenied({ reason: `${id} refuses` }),
  };
}

function blocked<P>(decision: LifecycleGuardDecision<P>) {
  if (decision.kind !== "blocked") {
    throw new Error(`expected a blocked decision, got ${decision.kind}`);
  }
  return decision;
}

function stageDecision(
  context: StageCompletionGuardContext,
  extra: readonly LifecycleGuardAdapter<StageCompletionGuardContext>[] = [],
) {
  return evaluateLifecycleGuards<StageCompletionGuardContext>({
    checkpoint: "stage-completion",
    targetRevision: `stage:${context.stage.slug}`,
    adapters: [...STAGE_COMPLETION_GUARDS, ...extra],
    context,
  });
}

function phaseDecision(
  context: PhaseTransitionGuardContext,
  extra: readonly LifecycleGuardAdapter<PhaseTransitionGuardContext>[] = [],
) {
  return evaluateLifecycleGuards<PhaseTransitionGuardContext>({
    checkpoint: "phase-transition",
    targetRevision: `phase:${context.phase}`,
    adapters: [...PHASE_TRANSITION_GUARDS, ...extra],
    context,
  });
}

const PRODUCING_STAGE = {
  slug: "code-generation",
  name: "Code Generation",
  phase: "construction",
  produces: ["code-generation-plan.md"],
};

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("stage-completion checkpoint", () => {
  test("registry order is the load-bearing narrowing order", () => {
    expect(STAGE_COMPLETION_GUARDS.map((guard) => guard.id)).toEqual([
      "stage-completion.artifacts",
      "stage-completion.unit-review",
      "stage-completion.blocking-sensors",
    ]);
    for (const guard of STAGE_COMPLETION_GUARDS) {
      expect(guard.checkpoint).toBe("stage-completion");
    }
  });

  test("not-applicable: the artifact off-switch disables the artifact-shaped guards", () => {
    const pd = tempProject();
    withEnv(
      { AMADEUS_SKIP_ARTIFACT_GUARD: "1", AMADEUS_SKIP_BLOCKING_SENSOR_GUARD: "1" },
      () => {
        const decision = stageDecision({ pd, stage: PRODUCING_STAGE });
        expect(decision.kind).toBe("allowed");
        expect(decision.evaluations.map((e) => e.verdict.kind)).toEqual([
          "not-applicable",
          "not-applicable",
          "not-applicable",
        ]);
      },
    );
  });

  test("denied: a stage that produced nothing is refused with its verbatim message", () => {
    const pd = tempProject();
    withEnv(
      { AMADEUS_SKIP_ARTIFACT_GUARD: undefined, AMADEUS_SKIP_BLOCKING_SENSOR_GUARD: "1" },
      () => {
        const decision = blocked(stageDecision({ pd, stage: PRODUCING_STAGE }));
        expect(decision.policyId).toBe("stage-completion.artifacts");
        expect(decision.blockingKind).toBe("denied");
        expect(decision.refusal.reason).toContain(
          'Refusing to complete "code-generation": one or more missing required artifacts',
        );
        expect(decision.refusal.recovery).toContain("Produce the artifacts before completing.");
      },
    );
  });

  test("allowed: a stage with no declared produces clears every applicable guard", () => {
    const pd = tempProject();
    withEnv(
      { AMADEUS_SKIP_ARTIFACT_GUARD: undefined, AMADEUS_SKIP_BLOCKING_SENSOR_GUARD: "1" },
      () => {
        const decision = stageDecision({
          pd,
          stage: { slug: "market-research", name: "Market Research", phase: "ideation" },
        });
        expect(decision.kind).toBe("allowed");
        expect(decision.evaluations[0].verdict.kind).toBe("allowed");
      },
    );
  });

  test("unknown / exception: a guard that cannot answer blocks the completion", () => {
    const pd = tempProject();
    withEnv(
      { AMADEUS_SKIP_ARTIFACT_GUARD: "1", AMADEUS_SKIP_BLOCKING_SENSOR_GUARD: "1" },
      () => {
        const decision = blocked(
          stageDecision({ pd, stage: PRODUCING_STAGE }, [
            throwingProbe<StageCompletionGuardContext>("stage-completion"),
          ]),
        );
        expect(decision.blockingKind).toBe("unknown");
        expect(decision.refusal.reason).toContain("probe failure");
        expect(decision.refusal.evidence?.target).toBe("stage:code-generation");
      },
    );
  });

  test("conflict: the first blocking policy in order owns the refusal", () => {
    const pd = tempProject();
    withEnv(
      { AMADEUS_SKIP_ARTIFACT_GUARD: "1", AMADEUS_SKIP_BLOCKING_SENSOR_GUARD: "1" },
      () => {
        const decision = blocked(
          stageDecision({ pd, stage: PRODUCING_STAGE }, [
            denyingProbe<StageCompletionGuardContext>("stage-completion", "probe.late", 200),
            denyingProbe<StageCompletionGuardContext>("stage-completion", "probe.early", 100),
          ]),
        );
        expect(decision.policyId).toBe("probe.early");
      },
    );
  });

  test("guards write nothing while they evaluate", () => {
    const pd = tempProject();
    mkdirSync(join(pd, "amadeus"), { recursive: true });
    writeFileSync(join(pd, "amadeus", "marker.txt"), "unchanged\n");
    const before = readdirSync(pd).sort();
    withEnv(
      { AMADEUS_SKIP_ARTIFACT_GUARD: undefined, AMADEUS_SKIP_BLOCKING_SENSOR_GUARD: undefined },
      () => {
        stageDecision({ pd, stage: PRODUCING_STAGE });
      },
    );
    expect(readdirSync(pd).sort()).toEqual(before);
  });
});

describe("phase-transition checkpoint", () => {
  test("registry holds the phase-check artifact policy", () => {
    expect(PHASE_TRANSITION_GUARDS.map((guard) => guard.id)).toEqual([
      "phase-transition.phase-check-artifact",
    ]);
    expect(PHASE_TRANSITION_GUARDS[0].checkpoint).toBe("phase-transition");
  });

  test("not-applicable: a phase outside the required set is never judged", () => {
    const pd = tempProject();
    withEnv({ AMADEUS_SKIP_ARTIFACT_GUARD: undefined }, () => {
      const decision = phaseDecision({ pd, phase: "operation" });
      expect(decision.kind).toBe("allowed");
      expect(decision.evaluations[0].verdict.kind).toBe("not-applicable");
    });
  });

  test("not-applicable: the shared artifact off-switch disables the gate", () => {
    const pd = tempProject();
    withEnv({ AMADEUS_SKIP_ARTIFACT_GUARD: "1" }, () => {
      const decision = phaseDecision({ pd, phase: "inception" });
      expect(decision.evaluations[0].verdict).toEqual({
        kind: "not-applicable",
        reason: "AMADEUS_SKIP_ARTIFACT_GUARD is set",
      });
    });
  });

  test("denied: an unresolved record refuses the boundary verbatim", () => {
    const pd = tempProject();
    withEnv({ AMADEUS_SKIP_ARTIFACT_GUARD: undefined }, () => {
      const decision = blocked(phaseDecision({ pd, phase: "inception" }));
      expect(decision.policyId).toBe("phase-transition.phase-check-artifact");
      expect(decision.refusal.reason).toBe(
        'Refusing to verify the "inception" phase boundary: no active intent record resolves, ' +
          "so there is nowhere to check for verification/phase-check-inception.md.",
      );
    });
  });

  test("unknown / exception: a guard that cannot answer blocks the crossing", () => {
    const pd = tempProject();
    withEnv({ AMADEUS_SKIP_ARTIFACT_GUARD: "1" }, () => {
      const decision = blocked(
        phaseDecision({ pd, phase: "inception" }, [
          throwingProbe<PhaseTransitionGuardContext>("phase-transition"),
        ]),
      );
      expect(decision.blockingKind).toBe("unknown");
      expect(decision.refusal.evidence?.checkpoint).toBe("phase-transition");
    });
  });

  test("conflict: the first blocking policy in order owns the refusal", () => {
    const pd = tempProject();
    withEnv({ AMADEUS_SKIP_ARTIFACT_GUARD: undefined }, () => {
      const decision = blocked(
        phaseDecision({ pd, phase: "inception" }, [
          denyingProbe<PhaseTransitionGuardContext>("phase-transition", "probe.first", 1),
        ]),
      );
      expect(decision.policyId).toBe("probe.first");
    });
  });
});

function completionState(overrides: { readonly prepared: boolean }): string {
  const preparation = overrides.prepared
    ? [
        "- **Workflow Completion Instance**: terminal:build-and-test",
        "- **Workflow Completion Stage**: build-and-test",
        "- **Workflow Completion Status**: completed",
      ].join("\n")
    : "";
  return `# AI-DLC State Tracking

## Project Information
- **Project**: Lifecycle guard runtime contrast matrix
- **Scope**: self-fix

## Scope Configuration
- **Stages to Execute**: build-and-test
- **Stages to Skip**: all others
- **Execution Projection Digest**: projection-1

## Runtime State
${preparation}

## Stage Progress
- [x] build-and-test — EXECUTE

## Current Status
- **Status**: Completed
- **Last Completed Stage**: build-and-test
`;
}

function preparationContext(
  overrides: Partial<WorkflowPreparationGuardContext> & { readonly pd: string },
): WorkflowPreparationGuardContext {
  return {
    content: completionState({ prepared: false }),
    completedSlug: "build-and-test",
    requestedInstance: undefined,
    ...overrides,
  };
}

function authorizationContext(
  overrides: Partial<WorkflowAuthorizationGuardContext> & { readonly pd: string },
): WorkflowAuthorizationGuardContext {
  return {
    content: completionState({ prepared: false }),
    completedSlug: "build-and-test",
    completionInstance: "terminal:build-and-test",
    recordDir: overrides.pd,
    ...overrides,
  };
}

function preparationDecision(
  context: WorkflowPreparationGuardContext,
  extra: readonly LifecycleGuardAdapter<WorkflowPreparationGuardContext>[] = [],
) {
  return evaluateLifecycleGuards<WorkflowPreparationGuardContext>({
    checkpoint: "workflow-completion",
    targetRevision: `workflow:${context.completedSlug}`,
    adapters: [...WORKFLOW_COMPLETION_PREPARATION_GUARDS, ...extra],
    context,
  });
}

function authorizationDecision(
  context: WorkflowAuthorizationGuardContext,
  extra: readonly LifecycleGuardAdapter<
    WorkflowAuthorizationGuardContext,
    GoalReconciliationReceipt
  >[] = [],
) {
  return evaluateLifecycleGuards<WorkflowAuthorizationGuardContext, GoalReconciliationReceipt>({
    checkpoint: "workflow-completion",
    targetRevision: `workflow:${context.completedSlug}@${context.completionInstance}`,
    adapters: [...WORKFLOW_COMPLETION_AUTHORIZATION_GUARDS, ...extra],
    context,
  });
}

describe("workflow-completion checkpoint", () => {
  test("both registries are declared for the workflow-completion checkpoint, in order", () => {
    expect(WORKFLOW_COMPLETION_PREPARATION_GUARDS.map((guard) => guard.id)).toEqual([
      "workflow-completion.prepared",
      "workflow-completion.mandatory-plugin-stages",
    ]);
    expect(WORKFLOW_COMPLETION_AUTHORIZATION_GUARDS.map((guard) => guard.id)).toEqual([
      "workflow-completion.record-resolution",
      "workflow-completion.goal-receipt",
    ]);
    for (const guard of [
      ...WORKFLOW_COMPLETION_PREPARATION_GUARDS,
      ...WORKFLOW_COMPLETION_AUTHORIZATION_GUARDS,
    ]) {
      expect(guard.checkpoint).toBe("workflow-completion");
    }
  });

  test("not-applicable / allowed: an unprepared completion clears the preparation registry", () => {
    const pd = tempProject();
    const decision = preparationDecision(preparationContext({ pd }));
    expect(decision.kind).toBe("allowed");
    expect(decision.evaluations.map((e) => e.verdict.kind)).toEqual([
      "not-applicable",
      "allowed",
    ]);
  });

  test("denied: a preparation minted for another stage refuses verbatim", () => {
    const pd = tempProject();
    const decision = blocked(
      preparationDecision(
        preparationContext({
          pd,
          content: completionState({ prepared: true }),
          completedSlug: "requirements-analysis",
        }),
      ),
    );
    expect(decision.policyId).toBe("workflow-completion.prepared");
    expect(decision.refusal.reason).toBe(
      'Workflow completion was prepared for "build-and-test", not "requirements-analysis".',
    );
    expect(decision.refusal.audit).toBeUndefined();
  });

  test("denied: a prepared completion whose Intent has vanished refuses verbatim", () => {
    // The I/O-race sibling of the identity checks: the state document was read,
    // and by the time the policy resolves the Intent behind it there is none.
    const pd = tempProject();
    const decision = blocked(
      preparationDecision(
        preparationContext({
          pd,
          content: completionState({ prepared: true }),
          requestedInstance: "terminal:build-and-test",
        }),
      ),
    );
    expect(decision.policyId).toBe("workflow-completion.prepared");
    expect(decision.refusal.reason).toBe(
      "Prepared workflow completion cannot resolve its Intent.",
    );
  });

  test("denied: an unresolved Intent record keeps the audited error path", () => {
    const pd = tempProject();
    const decision = blocked(
      authorizationDecision(authorizationContext({ pd, recordDir: null })),
    );
    expect(decision.policyId).toBe("workflow-completion.record-resolution");
    expect(decision.blockingKind).toBe("denied");
    expect(decision.refusal.reason).toBe(
      "Goal reconciliation refused completion: Intent record is unresolved",
    );
    expect(decision.refusal.audit).toBeUndefined();
  });

  test("unknown: an unsettled Goal receipt maps to the unaudited waiting channel", () => {
    const pd = tempProject();
    const decision = blocked(
      authorizationDecision(authorizationContext({ pd })),
    );
    expect(decision.policyId).toBe("workflow-completion.goal-receipt");
    expect(decision.blockingKind).toBe("unknown");
    expect(decision.refusal.reason).toContain("Goal lineage is missing");
    expect(decision.refusal.audit).toBe("none");
  });

  test("denied: a malformed completion state stays on the audited error path", () => {
    const pd = tempProject();
    const decision = blocked(
      authorizationDecision(
        authorizationContext({
          pd,
          content: completionState({ prepared: false }).replace("self-fix", ""),
        }),
      ),
    );
    expect(decision.blockingKind).toBe("denied");
    expect(decision.refusal.reason).toContain("Scope");
    expect(decision.refusal.audit).toBeUndefined();
  });

  test("not-applicable: a prepared completion is not judged while the Intent mirror is off", () => {
    // The preparation policy's mirror-off arm: with the mirror configured off
    // there is no boundary to settle, so the policy declines the question
    // instead of refusing the completion.
    const pd = tempProject();
    const intentDir = "260814-guard-runtime-abcd1234";
    const recordDir = join(pd, "amadeus", "spaces", "default", "intents", intentDir);
    mkdirSync(recordDir, { recursive: true });
    writeFileSync(join(recordDir, "amadeus-state.md"), completionState({ prepared: true }));
    writeFileSync(
      join(pd, "amadeus", "config.json"),
      `${JSON.stringify({ "intent-mirror": { github: { issue: { consent: "off" } } } }, null, 2)}\n`,
    );
    const decision = preparationDecision(
      preparationContext({
        pd,
        content: completionState({ prepared: true }),
        requestedInstance: "terminal:build-and-test",
      }),
    );
    const prepared = decision.evaluations.find(
      (e) => e.policyId === "workflow-completion.prepared",
    );
    expect(prepared?.verdict).toEqual({
      kind: "not-applicable",
      reason: "the Intent mirror is off",
    });
  });

  test("unknown: the Goal receipt policy answers an unresolved record on its own", () => {
    // Evaluated as the lone adapter: in the full registry the record-resolution
    // policy denies first, so this arm of the Goal receipt policy is only
    // reachable when that policy is not in the registry ahead of it.
    const pd = tempProject();
    const goalReceiptOnly = WORKFLOW_COMPLETION_AUTHORIZATION_GUARDS.filter(
      (guard) => guard.id === "workflow-completion.goal-receipt",
    );
    expect(goalReceiptOnly).toHaveLength(1);
    const decision = blocked(
      evaluateLifecycleGuards<WorkflowAuthorizationGuardContext, GoalReconciliationReceipt>({
        checkpoint: "workflow-completion",
        targetRevision: "workflow:build-and-test@terminal:build-and-test",
        adapters: goalReceiptOnly,
        context: authorizationContext({ pd, recordDir: null }),
      }),
    );
    expect(decision.policyId).toBe("workflow-completion.goal-receipt");
    expect(decision.blockingKind).toBe("unknown");
    expect(decision.refusal.reason).toBe(
      "Goal reconciliation refused completion: Intent record is unresolved",
    );
  });

  test("unknown / exception: a probe that cannot answer blocks the completion", () => {
    const pd = tempProject();
    const decision = blocked(
      preparationDecision(preparationContext({ pd }), [
        throwingProbe<WorkflowPreparationGuardContext>("workflow-completion"),
      ]),
    );
    expect(decision.blockingKind).toBe("unknown");
    expect(decision.refusal.reason).toContain("probe failure");
  });

  test("conflict: the first blocking policy in order owns the refusal", () => {
    const pd = tempProject();
    const decision = blocked(
      authorizationDecision(authorizationContext({ pd, recordDir: null }), [
        denyingProbe<WorkflowAuthorizationGuardContext, GoalReconciliationReceipt>(
          "workflow-completion",
          "probe.first",
          1,
        ),
      ]),
    );
    expect(decision.policyId).toBe("probe.first");
  });
});

describe("intent-birth checkpoint", () => {
  function birthDecision(
    context: IntentBirthGuardContext,
    extra: readonly LifecycleGuardAdapter<IntentBirthGuardContext, IntentBirthGuardReceipt>[] = [],
  ) {
    return evaluateLifecycleGuards<IntentBirthGuardContext, IntentBirthGuardReceipt>({
      checkpoint: "intent-birth",
      targetRevision: `intent:${context.slugSource}`,
      adapters: [...INTENT_BIRTH_GUARDS, ...extra],
      context,
    });
  }

  function birthContext(
    overrides: Partial<IntentBirthGuardContext> & { readonly projectDir: string },
  ): IntentBirthGuardContext {
    return { flags: {}, slugSource: "guard runtime", ...overrides };
  }

  test("both registries are declared for the intent-birth checkpoint, in order", () => {
    expect(INTENT_BIRTH_GUARDS.map((guard) => guard.id)).toEqual([
      "intent-birth.autonomy-declaration",
      "intent-birth.reserved-name",
      "intent-birth.repo-set",
      "intent-birth.self-development-integrity",
    ]);
    expect(INTENT_BIRTH_WORKSPACE_GUARDS.map((guard) => guard.id)).toEqual([
      "intent-birth.workspace-scan",
    ]);
    for (const guard of [...INTENT_BIRTH_GUARDS, ...INTENT_BIRTH_WORKSPACE_GUARDS]) {
      expect(guard.checkpoint).toBe("intent-birth");
    }
  });

  test("allowed: an ordinary birth resolves its autonomy mode and repo set as receipts", () => {
    const pd = tempProject();
    const decision = birthDecision(birthContext({ projectDir: pd }));
    expect(decision.kind).toBe("allowed");
    expect(guardReceipt(decision, "intent-birth.autonomy-declaration")).toEqual({
      kind: "autonomy",
      mode: null,
    });
    expect(guardReceipt(decision, "intent-birth.repo-set")).toEqual({ kind: "repos", repos: [] });
  });

  test("denied: an invalid autonomy flag keeps the audited refusal channel", () => {
    const pd = tempProject();
    const decision = blocked(
      birthDecision(birthContext({ projectDir: pd, flags: { autonomy: "sideways" } })),
    );
    expect(decision.policyId).toBe("intent-birth.autonomy-declaration");
    expect(decision.refusal.audit).toBeUndefined();
  });

  test("denied: a reserved intent name refuses without touching the audit ledger", () => {
    const pd = tempProject();
    const decision = blocked(birthDecision(birthContext({ projectDir: pd, slugSource: "help" })));
    expect(decision.policyId).toBe("intent-birth.reserved-name");
    expect(decision.refusal.reason).toBe('Reserved intent name "help" cannot be created.');
    expect(decision.refusal.recovery).toBe("Choose a non-help intent name.");
    expect(decision.refusal.audit).toBe("none");
  });

  test("denied: an invalid --repos entry is refused before anything is minted", () => {
    const pd = tempProject();
    const decision = blocked(
      birthDecision(birthContext({ projectDir: pd, flags: { repos: "../escape" } })),
    );
    expect(decision.policyId).toBe("intent-birth.repo-set");
    expect(decision.blockingKind).toBe("denied");
    expect(decision.refusal.reason).toContain('Invalid --repos entry "../escape"');
  });

  test("allowed: the workspace scan hands its classified snapshot to the birth pipeline", () => {
    const pd = tempProject();
    const decision = evaluateLifecycleGuards<
      WorkspaceScanGuardContext,
      ClassifiedWorkspaceScan
    >({
      checkpoint: "intent-birth",
      targetRevision: `intent:${pd}`,
      adapters: INTENT_BIRTH_WORKSPACE_GUARDS,
      context: { projectDir: pd },
    });
    expect(decision.kind).toBe("allowed");
    expect(guardReceipt(decision, "intent-birth.workspace-scan").projectType).toBeDefined();
  });

  test("unknown / exception: a guard that cannot answer blocks the birth", () => {
    const pd = tempProject();
    const decision = blocked(
      birthDecision(birthContext({ projectDir: pd }), [
        throwingProbe<IntentBirthGuardContext, IntentBirthGuardReceipt>("intent-birth"),
      ]),
    );
    expect(decision.blockingKind).toBe("unknown");
    expect(decision.refusal.evidence?.checkpoint).toBe("intent-birth");
  });

  test("conflict: the first blocking policy in order owns the refusal", () => {
    const pd = tempProject();
    const decision = blocked(
      birthDecision(birthContext({ projectDir: pd, slugSource: "help" }), [
        denyingProbe<IntentBirthGuardContext, IntentBirthGuardReceipt>(
          "intent-birth",
          "probe.first",
          1,
        ),
      ]),
    );
    expect(decision.policyId).toBe("probe.first");
  });

  test("guards write nothing while they evaluate", () => {
    const pd = tempProject();
    mkdirSync(join(pd, "src"), { recursive: true });
    writeFileSync(join(pd, "src", "main.ts"), "export const x = 1;\n");
    const before = readdirSync(pd).sort();
    birthDecision(birthContext({ projectDir: pd }));
    evaluateLifecycleGuards<WorkspaceScanGuardContext, ClassifiedWorkspaceScan>({
      checkpoint: "intent-birth",
      targetRevision: `intent:${pd}`,
      adapters: INTENT_BIRTH_WORKSPACE_GUARDS,
      context: { projectDir: pd },
    });
    expect(readdirSync(pd).sort()).toEqual(before);
  });
});
