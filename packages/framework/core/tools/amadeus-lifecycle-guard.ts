// The Lifecycle Guard Runtime (#2771).
//
// WHAT THIS IS. One evaluation function every authoritative lifecycle
// transition calls before it commits: Intent birth, stage completion, phase
// transition (including jump's forward crossing) and workflow completion. Each
// guard is an Adapter that answers one question about the transition and
// returns a verdict; the runtime resolves which adapters apply, runs them in a
// deterministic order, and aggregates their verdicts fail-closed.
//
// WHY IT EXISTS. The refusals it now hosts were five separate result
// vocabularies (`error()` process-exit, discriminated unions with a recovery,
// booleans, typed error classes, `{ok, reason}` results) wired by hand into
// every completion handler. A guard wired into only some of them is a silent
// fail-open, and adding one meant editing every commit path. Adapters carry the
// policy; the commit path carries one call.
//
// WHAT AN ADAPTER MAY DO. Answer. Nothing else. `evaluate` receives a
// caller-owned context and returns a verdict — the runtime hands it no writer,
// no state file handle and no transition function, so a guard cannot advance
// (or corrupt) the lifecycle it is judging. The core commits, and only after an
// allowed decision.
//
// FAIL-CLOSED AGGREGATION. `denied`, `unknown` and a thrown exception all block
// the transition; only `allowed` and `not-applicable` let it through. Evaluation
// stops at the first blocking verdict so the refusal the operator reads is the
// first thing that is actually wrong. Because the runtime is synchronous it
// imposes no deadline of its own: an adapter that owns a time budget reports the
// expiry as `unknown`, which blocks on the same rule.
//
// TRUST. The built-in registries are module-level frozen arrays in the file that
// owns each checkpoint; there is no registration API, so a project cannot remove
// a system-invariant guard. User-space policy enters through the adapters that
// consult it — today the blocking-sensor adapter, which reads the sensor
// manifests a project registers — and a project that registers none sees no
// change in behaviour. See docs/reference/26-lifecycle-guard-runtime.md.

import { errorMessage } from "./amadeus-lib.ts";

// The authoritative transitions. A checkpoint is the commit path's identity, not
// the handler's: four CLI handlers complete a stage and five cross a phase
// boundary, and all of them evaluate the same checkpoint.
export type LifecycleCheckpoint =
  | "intent-birth"
  | "stage-completion"
  | "phase-transition"
  | "workflow-completion";

// Whether the refusal this verdict carries belongs in the audit ledger. The two
// values map onto refusal channels that already exist: `error-logged` is the
// ERROR_LOGGED-emitting refusal every failed transition uses, `none` is the
// deliberately unaudited one (an intent that was never minted has no ledger to
// write to; a completion the Goal authority declines to settle is a waiting
// state, not a failed step).
export type GuardAuditDisposition = "error-logged" | "none";

export interface GuardRefusal {
  // What is wrong. Rendered first and verbatim.
  readonly reason: string;
  // How to make it right. Rendered as the message tail so a guard can keep its
  // remedy separable from its complaint without changing what the operator sees.
  readonly recovery?: string;
  // What the guard looked at. Rendered as a trailing clause; used where the
  // refusal itself cannot name the fault, i.e. the exception path.
  readonly evidence?: Readonly<Record<string, string>>;
  // Defaults to the audited channel at the call site that renders the refusal.
  readonly audit?: GuardAuditDisposition;
}

// `P` is the checkpoint's receipt type: the value an adapter resolved on its way
// to allowing the transition and the commit path needs afterwards (the Goal
// reconciliation receipt, the validated repo set). It defaults to `never`, so a
// checkpoint that resolves nothing cannot accidentally smuggle a payload
// through its guards.
export type LifecycleGuardVerdict<P = never> =
  | { readonly kind: "allowed"; readonly receipt?: P }
  | { readonly kind: "denied"; readonly error: GuardRefusal }
  | { readonly kind: "unknown"; readonly error: GuardRefusal }
  | { readonly kind: "not-applicable"; readonly reason: string };

export interface LifecycleGuardAdapter<C, P = never> {
  // Policy identity. Unique within a checkpoint's registry and stable across
  // releases: it names the refusing policy in the decision and keys receipts.
  readonly id: string;
  readonly checkpoint: LifecycleCheckpoint;
  // Execution order, ascending. Load-bearing where one guard's question only
  // makes sense once an earlier one has been answered.
  readonly order: number;
  readonly evaluate: (context: C) => LifecycleGuardVerdict<P>;
}

export interface LifecycleGuardEvaluation<P = never> {
  readonly policyId: string;
  readonly verdict: LifecycleGuardVerdict<P>;
}

export type LifecycleGuardDecision<P = never> =
  | {
      readonly kind: "allowed";
      readonly checkpoint: LifecycleCheckpoint;
      readonly targetRevision: string;
      readonly evaluations: readonly LifecycleGuardEvaluation<P>[];
    }
  | {
      readonly kind: "blocked";
      readonly checkpoint: LifecycleCheckpoint;
      readonly targetRevision: string;
      readonly policyId: string;
      readonly blockingKind: "denied" | "unknown";
      readonly refusal: GuardRefusal;
      readonly evaluations: readonly LifecycleGuardEvaluation<P>[];
    };

export type BlockedLifecycleGuardDecision<P = never> = Extract<
  LifecycleGuardDecision<P>,
  { kind: "blocked" }
>;

export function guardAllowed<P = never>(receipt?: P): LifecycleGuardVerdict<P> {
  return receipt === undefined ? { kind: "allowed" } : { kind: "allowed", receipt };
}

export function guardDenied<P = never>(error: GuardRefusal): LifecycleGuardVerdict<P> {
  return { kind: "denied", error };
}

export function guardUnknown<P = never>(error: GuardRefusal): LifecycleGuardVerdict<P> {
  return { kind: "unknown", error };
}

export function guardNotApplicable<P = never>(reason: string): LifecycleGuardVerdict<P> {
  return { kind: "not-applicable", reason };
}

// Render a refusal for a human. The three parts are additive so a migrated guard
// whose remedy is already inside `reason` renders byte-identically to the
// message it carried before the migration.
export function formatGuardRefusal(refusal: GuardRefusal): string {
  let message = refusal.reason;
  if (refusal.recovery) message += ` ${refusal.recovery}`;
  const evidence = refusal.evidence;
  if (evidence !== undefined) {
    const keys = Object.keys(evidence).sort();
    if (keys.length > 0) {
      message += ` (evidence: ${keys.map((key) => `${key}=${evidence[key]}`).join("; ")})`;
    }
  }
  return message;
}

// The value an allowing adapter resolved. Throws when the named policy allowed
// without one: a commit path that asks for a receipt cannot proceed on its
// absence, and the miss is a wiring defect in the adapter, not a user error.
export function guardReceipt<P>(decision: LifecycleGuardDecision<P>, policyId: string): P {
  for (const evaluation of decision.evaluations) {
    if (evaluation.policyId !== policyId) continue;
    if (evaluation.verdict.kind === "allowed" && evaluation.verdict.receipt !== undefined) {
      return evaluation.verdict.receipt;
    }
  }
  throw new Error(
    `Lifecycle guard "${policyId}" produced no receipt at the "${decision.checkpoint}" checkpoint`,
  );
}

function orderAdapters<C, P>(
  adapters: readonly LifecycleGuardAdapter<C, P>[],
): readonly LifecycleGuardAdapter<C, P>[] {
  const seen = new Set<string>();
  for (const adapter of adapters) {
    if (seen.has(adapter.id)) {
      throw new Error(`Lifecycle guard registry has a duplicate policy id "${adapter.id}"`);
    }
    seen.add(adapter.id);
  }
  // Ties break on id so the order does not depend on how the registry array was
  // written: the same registry evaluates in the same sequence everywhere.
  return [...adapters].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// One adapter's answer. A guard that cannot answer has not answered "yes", so a
// thrown exception becomes `unknown` — its own words are unavailable, so the
// evidence names what was being judged instead.
function evaluateAdapter<C, P>(
  adapter: LifecycleGuardAdapter<C, P>,
  context: C,
  checkpoint: LifecycleCheckpoint,
  targetRevision: string,
): LifecycleGuardVerdict<P> {
  try {
    return adapter.evaluate(context);
  } catch (cause) {
    return guardUnknown({
      reason: `Lifecycle guard "${adapter.id}" could not evaluate the ${checkpoint} checkpoint: ${errorMessage(cause)}`,
      evidence: { checkpoint, policy: adapter.id, target: targetRevision },
    });
  }
}

export interface EvaluateLifecycleGuardsInput<C, P> {
  readonly checkpoint: LifecycleCheckpoint;
  // What is being judged, at the revision it is being judged at. Named in the
  // evidence of an evaluation the runtime could not complete.
  readonly targetRevision: string;
  readonly adapters: readonly LifecycleGuardAdapter<C, P>[];
  readonly context: C;
}

export function evaluateLifecycleGuards<C, P = never>(
  input: EvaluateLifecycleGuardsInput<C, P>,
): LifecycleGuardDecision<P> {
  const { checkpoint, targetRevision, context } = input;
  const evaluations: LifecycleGuardEvaluation<P>[] = [];
  for (const adapter of orderAdapters(input.adapters)) {
    if (adapter.checkpoint !== checkpoint) {
      evaluations.push({
        policyId: adapter.id,
        verdict: guardNotApplicable(`declared for the "${adapter.checkpoint}" checkpoint`),
      });
      continue;
    }
    const verdict = evaluateAdapter(adapter, context, checkpoint, targetRevision);
    evaluations.push({ policyId: adapter.id, verdict });
    if (verdict.kind === "denied" || verdict.kind === "unknown") {
      return {
        kind: "blocked",
        checkpoint,
        targetRevision,
        policyId: adapter.id,
        blockingKind: verdict.kind,
        refusal: verdict.error,
        evaluations,
      };
    }
  }
  return { kind: "allowed", checkpoint, targetRevision, evaluations };
}
