# Lifecycle Guard Runtime

> Languages: **English** | [日本語](26-lifecycle-guard-runtime.ja.md)

A lifecycle guard answers one question about a transition the workflow is about
to commit: has this stage produced anything, has a human acted at this gate, has
the Goal authority settled this completion. Before
[Issue #2771](https://github.com/amadeus-dlc/amadeus/issues/2771) those answers
were expressed in five different result vocabularies and wired by hand into every
commit path, so adding a guard meant editing every handler and a missed wire was
a silent fail-open rather than a failing test.

The Lifecycle Guard Runtime is the shared interface those guards now speak:
`packages/framework/core/tools/amadeus-lifecycle-guard.ts`. It is a
**generalization of mechanisms that already existed** — the stage-completion
chokepoint, the declaration-driven applicability the blocking-sensor gate
resolves from the compiled graph, and the `{kind, error: {recovery}}` result
shape of `IntentOperationGuardResult` — not a new subsystem beside them.

## Module

| Concern | Where |
|---|---|
| Verdict vocabulary, adapter interface, evaluation function | `packages/framework/core/tools/amadeus-lifecycle-guard.ts` |
| Stage-completion, phase-transition and workflow-completion registries | `packages/framework/core/tools/amadeus-state.ts` |
| Intent-birth registries | `packages/framework/core/tools/amadeus-utility.ts` |
| Phase-transition commit path for jump's forward crossing | `packages/framework/core/tools/amadeus-jump.ts` |

## Interface

```ts
type LifecycleGuardVerdict<P = never> =
  | { kind: "allowed"; receipt?: P }
  | { kind: "denied"; error: GuardRefusal }
  | { kind: "unknown"; error: GuardRefusal }
  | { kind: "not-applicable"; reason: string };

interface GuardRefusal {
  reason: string;                       // what is wrong
  recovery?: string;                    // how to make it right
  evidence?: Record<string, string>;    // what the guard looked at
  audit?: "error-logged" | "none";      // which refusal channel answers it
}

interface LifecycleGuardAdapter<C, P = never> {
  id: string;                           // policy identity
  checkpoint: LifecycleCheckpoint;
  order: number;                        // deterministic execution order
  evaluate: (context: C) => LifecycleGuardVerdict<P>;
}

function evaluateLifecycleGuards<C, P = never>(input: {
  checkpoint: LifecycleCheckpoint;
  targetRevision: string;               // what is judged, at which revision
  adapters: readonly LifecycleGuardAdapter<C, P>[];
  context: C;
}): LifecycleGuardDecision<P>;
```

`formatGuardRefusal` renders a refusal as `reason [+ " " + recovery] [+ " (evidence: k=v; …)"]`.
The three parts are additive, which is what let every migrated guard keep its
message byte-for-byte: a guard whose remedy already sat inside its sentence moved
that tail into `recovery` and renders identically.

`guardReceipt(decision, policyId)` returns the value an allowing adapter
resolved — the Goal reconciliation receipt, the validated repo set — and throws
when the named policy allowed without one, because a commit path that needs a
receipt cannot proceed on its absence.

## Checkpoints and their seams

| Checkpoint | Commit paths | Registry |
|---|---|---|
| `intent-birth` | `handleIntentBirth`, in two rounds (before the lock; inside it, after the migration probe) | `INTENT_BIRTH_GUARDS`, `INTENT_BIRTH_WORKSPACE_GUARDS` |
| `stage-completion` | `approveUnderLock`, `handleAdvance`, `handleFinalize`, `completeWorkflowForTarget` — via `verifyStageCompletionGuards` | `STAGE_COMPLETION_GUARDS` |
| `phase-transition` | the four above plus jump's forward crossing — via `verifyPhaseCheckArtifact` | `PHASE_TRANSITION_GUARDS` |
| `workflow-completion` | `completeWorkflowForTarget`, in two rounds (state document; then instance + record) | `WORKFLOW_COMPLETION_PREPARATION_GUARDS`, `WORKFLOW_COMPLETION_AUTHORIZATION_GUARDS` |

Jump crosses a phase boundary but does not complete a stage — it flips a stage to
`[S]`/`pending` — so it evaluates the phase-transition checkpoint and not the
stage-completion one. That asymmetry is deliberate and is asserted by the census.

**The census is the measured predicate for "cannot be bypassed"**
(`tests/integration/t2771-lifecycle-guard-census.integration.test.ts`). It
enumerates the commit paths from the source: every function that writes
`setCheckbox(…, "completed")` must call the chokepoint, every chokepoint body
must call `evaluateLifecycleGuards`, and every declared registry must be reached
by exactly one commit path. A fifth completion handler added without the
chokepoint turns it red.

## Trust

Guards divide by who may remove them, not by a flag on the adapter:

- **built-in** — the registries are module-level frozen arrays in the file that
  owns the checkpoint. There is no registration API and no configuration that
  drops a member, so a project cannot disable a system-invariant guard.
- **user space** — policy a project supplies enters through an adapter that reads
  it. Today that is `stage-completion.blocking-sensors`, which judges the sensors
  a project registers as `.claude/sensors/*.md` manifests, resolved through the
  compiled graph's `sensors_applicable` rows. A project that registers no
  blocking sensor is answered `not-applicable` and its behaviour is unchanged.

The `AMADEUS_SKIP_*` switches are unchanged and remain what they were: a
documented test/emergency seam, not a trust boundary. Each renders as
`not-applicable` with the variable named in its reason.

## Atomicity

An adapter is handed a read-only context and no writer: the runtime gives it no
state file handle and no transition function, so a guard cannot advance the
lifecycle it is judging. The commit path evaluates first and writes second —
every refusal exits before `writeStateFile`, which is what makes an in-memory
content flip discardable rather than a half-written transition.

The one write inside an adapter is the `GUARD_EXEMPTED` audit row the
stage-completion artifact policy emits when it honours a `declare-docs-only`
declaration. That is evidence of a decision a human already made, not a
lifecycle mutation: the transition still waits on the verdict the row accompanies.

## Fail-closed aggregation

1. Adapters are ordered by `(order, id)` — the same registry evaluates in the
   same sequence everywhere, independent of how the array was written.
2. An adapter declared for another checkpoint resolves `not-applicable`.
3. `denied`, `unknown` and a thrown exception all block. `allowed` and
   `not-applicable` pass.
4. Evaluation stops at the first blocking verdict, so the refusal the operator
   reads is the first thing that is actually wrong.
5. A thrown exception maps to `unknown` with evidence naming the checkpoint,
   the policy and the target revision — a guard that cannot answer has not
   answered "yes".
6. Timeouts: the runtime is synchronous and imposes no deadline of its own. An
   adapter that owns a time budget reports its expiry as `unknown`, which blocks
   under rule 3.

Fail-closed is a rule about **aggregation**. What an individual guard decides is
its own policy and was not changed by this migration — including the sensor
truth table in `amadeus-sensor.ts`, which still maps a script error to `PASSED`.
That fail-open sits *inside* a guard, is a known deviation recorded by
Issue #2771's requirements, and is a separate correction.

## Audit

No new event type was invented. The refusal channel is chosen by the verdict's
audit disposition:

| Disposition | Channel | Reached by |
|---|---|---|
| `error-logged` (default) | `error()` / `die()` — emits `ERROR_LOGGED` | every guard that refuses a real failure |
| `none` | `refuseWithoutAudit()` at intent birth, `awaitCompletion()` at workflow completion | refusals that must not touch the ledger: an intent that was never minted has none, and a completion the Goal authority declines to settle is a waiting state rather than a failed step |

`GUARD_EXEMPTED` keeps its existing meaning and writer.

## Guard census: what migrated and what did not

The reverse-engineering scan for Issue #2771 enumerated forty lifecycle
progression guards (G1–G40). The migration target was defined by the four
authoritative checkpoints plus jump; everything else keeps its current shape,
with the reason recorded here.

| # | Guard | Class | Disposition |
|---|---|---|---|
| G1 | workspace scan at birth | built-in | **migrated** — `intent-birth.workspace-scan` |
| G2 | reserved intent name | built-in | **migrated** — `intent-birth.reserved-name` |
| G3 | autonomy declaration | policy | **migrated** — `intent-birth.autonomy-declaration` |
| G4 | repo set resolution | built-in | **migrated** — `intent-birth.repo-set` |
| G5 | stage-completion chokepoint | built-in | **generalized** — now the registry evaluation |
| G6 | stage produces / workspace_requires | built-in + off-switch | **migrated** — `stage-completion.artifacts` |
| G7 | blocking sensor gate | built-in + off-switch + policy | **migrated** — `stage-completion.blocking-sensors` |
| G8 | declaration-driven sensor applicability | built-in | reused as-is — the applicability resolution the adapter calls |
| G9 | sensor truth table | built-in | **not migrated** — individual guard policy; its fail-open is a known deviation (separate correction) |
| G10 | unit review verdicts | built-in | **migrated** — `stage-completion.unit-review` |
| G11 | phase-check artifact | built-in + off-switch | **migrated** — `phase-transition.phase-check-artifact` |
| G12 | workflow completion entry | built-in | **generalized** — the two-round evaluation |
| G13 | prepared completion consistency | built-in | **migrated** — `workflow-completion.prepared` |
| G14 | mandatory plugin stages | policy | **migrated** — `workflow-completion.mandatory-plugin-stages` |
| G15 | Goal reconciliation receipt | built-in | **migrated** — `workflow-completion.goal-receipt` |
| G16 | Intent record resolution | built-in | **migrated** — `workflow-completion.record-resolution` |
| G17 | mirror boundary receipt | policy | not migrated — a boundary emission, not a transition commit gate |
| G18–G22 | autonomy authorization, provenance, grant scope, gate ladder, stage-failure admission | policy | not migrated — they authorize *occurrences under autonomy*, a different axis from the transition commit; migrating them is a separate decision with its own audit surface |
| G23–G24 | interaction-kind vocabularies | policy | not migrated — vocabulary, not a guard (their duplicate definition is a separate issue) |
| G25–G29 | human presence, delegation, question recording | built-in + off-switch | not migrated — they gate *gate resolution and answer recording*, not the four commit paths |
| G30 | park under autonomous Construction | policy | not migrated — CLI-layer half of a two-layer defence with the Stop hook; the hook layer is out of scope by ruling |
| G31–G34 | gate-start, docs-only, units-done, audit forgery | built-in | not migrated — they gate declarations and ledger writes, not lifecycle transitions |
| G35–G36 | swarm retry, swarm convergence | policy | not migrated — Bolt-internal scheduling, no state-machine transition |
| G37 | Bolt batch gate | policy | not migrated — approval bookkeeping across Bolts, outside the four checkpoints |
| G38 | `IntentOperationGuardResult` | built-in | **reused** — its `{kind, error: {recovery}}` shape is what the verdict vocabulary extends |
| G39 | recompose / advisory hold results | policy | not migrated — advisory, no transition commit |
| G40 | subagent PreToolUse deny | built-in (hook layer) | not migrated — harness hook layer; state transitions commit in the CLI layer only, and the hook stays defence-in-depth |

## Alternatives rejected

- **A new Runtime built from scratch, beside the existing gates.** Rejected: the
  stage-completion chokepoint, the declaration-driven applicability resolution
  and the recovery-carrying result union already existed. A parallel subsystem
  would have produced a second vocabulary next to the five it was meant to
  replace, and the old wiring would have stayed reachable.
- **Landing the interface first and migrating callers later.** Rejected under the
  inception guardrail against landing adapters or registration slots ahead of
  their wiring: an unwired interface is dormant code that reads as a guarantee.
- **A user-space registration slot with a `trust` flag on the adapter.**
  Rejected for the same reason: with no user-space adapter to register today it
  would be a dormant slot and a field no code consumes. The trust distinction is
  carried by *who owns the registry* and by the blocking-sensor adapter, which is
  the user-space seam that already has consumers.
- **Aggregating all verdicts before refusing, instead of stopping at the first.**
  Rejected: it changes which message the operator sees for a transition that
  fails several layers at once, and the layered order exists precisely so the
  narrowest true complaint is not buried under a broader one.
- **Making `AMADEUS_SKIP_*` and the sensor date cutoff part of the Runtime.**
  Rejected: they are per-guard applicability, and moving them would have changed
  behaviour under the guise of a migration. They are reported as
  `not-applicable`, which is exactly what they always meant.

## Related

- [State Machine](12-state-machine.md) — the transitions these checkpoints guard.
- [Sensor System](07-sensor-system.md) — the manifests and severities behind the
  blocking-sensor policy, and the truth table this migration did not touch.
- [Intent autonomy, review, and completion](24-intent-autonomy.md) — the
  authorization axis (G18–G22) that is deliberately not part of this Runtime.
