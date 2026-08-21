# Audit Event Taxonomy

**Event names MUST match this table exactly.** Do not invent new event types. For stage completions, ALWAYS use `STAGE_COMPLETED` — do not substitute stage-specific names like "Requirements Analysis Complete" or "Code Generated".

> See [`docs/reference/12-state-machine.md`](../../../../docs/reference/12-state-machine.md) for the state transitions that emit each event. Events marked `✓` are MANDATORY and asserted by `tests/feature/t48-audit-event-emitters.sh`.

## Naming Convention

All event names follow `SUBJECT_PAST_VERB` — every event answers "what happened?"

## Required vs Optional

**Required** is what EVERY emitter of that event supplies — the intersection, not
the union. The canonical emit path throws when a required attribute is absent,
so a key only some emitter provides does not belong there: `PHASE_STARTED` has
four emitters and only one of them carries `Stage count`, `ARTIFACT_UPDATED`'s
two emitters share no key at all.

**Optional** is everything else an emitter may attach: conditionally-spread
fields, keys owned by one emitter among several, and the documented vocabulary a
`--field "Key: Value"` CLI passthrough can carry. These are never validated, but
they are not decorative — the redaction policy is default-deny and admits
exactly the union of both columns, so a key missing from this table is dropped
from the stored row without a word.

Both columns are the registry's (`otel/event-registry.ts`), which is where the
tools read them from. Neither lists the record envelope — every record carries a
`timestamp`, and the handful of events that ALSO carry a `Timestamp` attribute
(the park pair, the practices events) show it in the table as the attribute it
is.

## Event Registry (98 events, 22 categories)

### Workflow Lifecycle (9 events)

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| ✓ `WORKFLOW_STARTED` | Scope determined, workflow begins | Scope, Request | Repos | `tools/amadeus-utility.ts init` |
| ✓ `WORKFLOW_COMPLETED` | All in-scope stages done with an ACHIEVED Goal receipt | Scope, Details | Reason, Completion Instance, Goal Id, Goal Revision, Goal Digest, Goal Receipt Id, Goal Receipt Digest, Goal Verdict, Goal Evidence Count, Goal Human Ruling | `tools/amadeus-state.ts complete-workflow` |
| ✓ `WORKFLOW_PARKED` | Workflow parked mid-flow for a later session (no stage advanced) | Stage | Timestamp | `tools/amadeus-state.ts park` |
| ✓ `WORKFLOW_UNPARKED` | Park marker cleared on explicit `--resume` re-entry | — | Timestamp | `tools/amadeus-state.ts unpark` |
| ✓ `WORKFLOW_WAITING_ENTERED` | A non-interactive run stopped at a ruling it may not make (the cause is in the named Intent autonomy transaction) | Stage, Occurrence Id, Basis Fingerprint, Transaction Id | Timestamp | engine (waiting admission) |
| ✓ `WORKFLOW_WAITING_RESUMED` | A waiting record was re-presented and ruled on | Stage, Transaction Id | Timestamp | engine (resume) |
| `INTENT_ARCHIVED` | Human-authorized intent archive transaction commits | Intent, From Status, To Status, Operation Id, User Input, Human Turn Timestamp | — | `tools/amadeus-state.ts archive` |
| `INTENT_UNARCHIVED` | Human-authorized intent unarchive transaction commits | Intent, From Status, To Status, Operation Id, User Input, Human Turn Timestamp | — | `tools/amadeus-state.ts unarchive` |
| `EXECUTION_EVENT_SET_COMMITTED` | One audit-first execution lifecycle event set commits before required projections or native dispatch | Root Operation Id, Event Set Digest, Event Set | — | `tools/amadeus-execution-lifecycle.ts` |

### Goal Lifecycle (4 events)

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `GOAL_CHANGE_PROPOSED` | An AI or human saves an unapproved Goal change proposal | Intent, Proposal Id, Proposal Digest | Goal Id, Parent Revision | `tools/amadeus-goal.ts propose` |
| `GOAL_REVISION_APPROVED` | A direct HUMAN_TURN after the dedicated gate approves a Goal revision | Intent, Goal Id, Goal Revision, Goal Digest, Proposal Id, Human Turn Timestamp | — | `tools/amadeus-goal.ts approve-revision` |
| `GOAL_RECONCILED` | A receipt is saved against the current approved Goal | Intent, Goal Id, Goal Revision, Goal Digest, Goal Receipt Id, Goal Receipt Digest, Goal Verdict, Completion Instance | Goal Human Ruling | `tools/amadeus-goal.ts reconcile` |
| `LEGACY_GOAL_MIGRATED` | A human explicitly approves a legacy Goal proposal and its item-level rulings | Intent, Goal Id, Goal Revision, Goal Digest, Goal Receipt Id, Human Turn Timestamp | — | `tools/amadeus-goal.ts approve-legacy-migration` |

### Phase Lifecycle (4 events)

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| ✓ `PHASE_STARTED` | Phase begins (first in-scope stage about to run) | Phase, Scope | Stage count | `tools/amadeus-utility.ts init` (Init phase), `tools/amadeus-state.ts advance` (phase boundary) |
| ✓ `PHASE_COMPLETED` | Crossed a phase boundary | From phase, To phase, Stages completed | Details | `tools/amadeus-state.ts advance`, `tools/amadeus-state.ts complete-workflow`, `tools/amadeus-jump.ts` (forward crossing) |
| `PHASE_VERIFIED` | Traceability check at boundary | Phase boundary | Details, Pass/fail, Issues | `tools/amadeus-state.ts advance`, `tools/amadeus-state.ts complete-workflow` |
| `PHASE_SKIPPED` | Scope excludes phase | Phase, Reason | Scope | `tools/amadeus-utility.ts init` (per-phase scope eval) |

### Stage Lifecycle (7 events)

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| ✓ `STAGE_STARTED` | Stage enters `[-]` Active | Stage, Agent | Workflow | `tools/amadeus-state.ts advance`, `tools/amadeus-utility.ts init` (init stages), `tools/amadeus-orchestrate.ts` (single-stage runs) |
| `STAGE_AWAITING_APPROVAL` | Stage enters `[?]` (gate open) | Stage | Artifacts, Details, Recovered, Transaction Id | `tools/amadeus-state.ts gate-start` (organic, or `--recovered` backfill), `tools/amadeus-state.ts revise` (gate re-entry), `tools/amadeus-state.ts reject` (backfill when gate-start was skipped) |
| `STAGE_REVISING` | Stage enters `[R]` (user rejected gate) | Stage, Revision count | Feedback, Recovered, Transaction Id | `tools/amadeus-state.ts reject` |
| ✓ `STAGE_COMPLETED` | Stage finishes (`[x]`) | Stage, Details | Artifacts, Transaction Id, Workflow | `tools/amadeus-state.ts approve` (gated stages; also auto-advances to next), `tools/amadeus-state.ts advance` (non-gated stages), `tools/amadeus-utility.ts init` (init stages), `tools/amadeus-orchestrate.ts` (single-stage runs) |
| `STAGE_JUMPED` | Forward/backward/redo jump target reached | Direction, Source, Target, Scope | Details | `tools/amadeus-jump.ts execute` |
| `STAGE_SKIPPED` | Stage skipped during jump (`[S]`) | Stage | Reason | `tools/amadeus-jump.ts execute`, `tools/amadeus-state.ts skip` |
| `GUARD_EXEMPTED` | A `workspace_requires` stage-completion guard refusal was exempted by a registry docs-only declaration (Issue #499/#848) | Stage, Evidence | — | `tools/amadeus-state.ts` `verifyStageArtifacts` (via `approve`/`advance`/`finalize`/`complete-workflow`) |

### Session Events (5 events — hook-owned, independent of workflow lifecycle)

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `SESSION_STARTED` | Fresh Claude Code session begins (source=startup or clear) | Source | — | `hooks/amadeus-session-start.ts` |
| `SESSION_RESUMED` | Existing Claude Code session resumed (source=resume) | Source | — | `hooks/amadeus-session-start.ts` |
| `SESSION_COMPACTED` | Context compaction occurred | Current Stage, State Validity | — | `hooks/amadeus-validate-state.ts` (PreCompact) |
| `SESSION_ENDED` | Claude Code session terminates | Reason | — | `hooks/amadeus-session-end.ts` |
| `HUMAN_TURN` | A real human acted this turn: submitted a prompt at a turn boundary, or answered a question widget only on a harness with a trusted question-answer hook (the approval/interview gate requires one since the last gate resolution). Codex uses numbered prose so every answer returns through prompt submission. A message queued mid-turn (`queued_command`) is real human input but is not this event: Claude Code does not fire UserPromptSubmit for that delivery (#3170). | — | — | `tools/amadeus-presence-reservation.ts` — the canonical presence seam appended to by `hooks/amadeus-mint-presence.ts` (UserPromptSubmit + PostToolUse AskUserQuestion where that hook is trusted) and by the per-harness prompt-submit adapters, which never append on their own |

### Advisory choice evidence

Advisory checkpoint choices use an authoritative side ledger at
`<record>/.amadeus-advisory-choice.json`, written atomically under the audit
lock. Each pending row binds plugin/code, checkpoint, target, spec identity,
intent run, and advisory instance. Each receipt adds the canonical choice and a
**provenance union** naming how the choice earned the right to exist: a
`human-turn` arm carrying the exact physical `HUMAN_TURN` coordinates (shard,
timestamp, and SHA-256 of the event record), or an `auto-decision` arm carrying
the autonomy ladder's decision id and basis. The choice is accepted only when the immediately preceding
interaction decision is the tool-validated advisory presentation for those
exact instances. A correction may mark a legacy, unpresented run-now receipt as
revoked only while the advisory remains open and no model-check evidence exists;
the revoked row stays in the side ledger and no longer resolves the hold. A stage report is refused while any matching row is
unresolved. The ordinary audit shard still supplies the human turn and stage
lifecycle; the side ledger supplies the advisory-specific correlation that a
general approval event cannot express. Local run-now evidence is retained in
the instance-specific `.amadeus-advisory-check/` directory.

The ledger is at schema 2, which is where the provenance union lives; schema 1
receipts predate it and carried a bare human turn. A schema 1 ledger is never
translated — it fails to parse and every reader falls closed to a hold rather
than guessing what a bare human turn means under the union. The migration path
out is the `recover-schema-1` verb of `tools/amadeus-advisory-choice.ts`: for
one named ledger it salvages the pending rows (still `schema: 1` by design,
inside a schema 2 ledger), discards the schema 1 receipts rather than
translating them, and writes schema 2. Discarding is what makes the advisories
unanswered again, which is the "ask the human again" the fail-closed hold
already stood for. It refuses loudly and writes nothing when the ledger names an
intent run other than the active one — read off the salvaged pending rows, or
off the receipts when there is no pending row to carry it, so a receipts-only
ledger is not left undefended at the moment its whole content is discarded. On
that receipts-only path a receipt whose intent run cannot be read refuses the
recovery as well: with no pending row to name the owner, passing such a receipt
over would delete it without ever establishing whose it was, and silence is not
evidence of belonging. The outcome
reports the receipts dropped, whether re-presentation is required, and the
number of discarded run-now receipts.

### Initialization Events (3 events — fire IN ADDITION TO `STAGE_COMPLETED`)

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `WORKSPACE_SCAFFOLDED` | Directory tree created | Details | Request | `tools/amadeus-utility.ts` handleInit |
| `WORKSPACE_SCANNED` | Workspace detection done | Project Type, Details | Languages, Frameworks, Build System, Nested Root, Nested Candidates, Submodules | `tools/amadeus-utility.ts` handleInit |
| `WORKSPACE_INITIALISED` | State file created | Details | Request, Scope, Project Type, Languages, Frameworks, Build System | `tools/amadeus-utility.ts` handleInit |

### Navigation Events (5 events)

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `SCOPE_CHANGED` | `--scope` changed existing scope | Old Scope, New Scope | Stage Count Delta, Stages in Scope, Depth | `tools/amadeus-utility.ts` |
| `DEPTH_CHANGED` | `--depth` changed depth level | Old Depth, New Depth | — | `tools/amadeus-utility.ts` |
| `TEST_STRATEGY_CHANGED` | `--test-strategy` changed test strategy | Old Strategy, New Strategy | — | `tools/amadeus-utility.ts` |
| `SCOPE_DETECTED` | Auto-detected from freeform text | Detected scope, Input text, Source | Matched keywords | `tools/amadeus-utility.ts detect-scope` |
| `RECOMPOSED` | The adaptive composer re-shaped a running workflow's pending stages (suffix flips via `recompose`) | Scope, Stages skipped, Stages added, Stages in Scope | Workflow completion retracted | `tools/amadeus-utility.ts recompose` |

### Interaction Events (6 events)

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `DECISION_RECORDED` | Before presenting a structured question, to record the options shown | Stage, Decision | Options, Rationale | `tools/amadeus-log.ts decision` |
| `GATE_APPROVED` | Gate resolution approved — `Approval Provenance` names the deciding branch (`gate-open-turn` / `delegated` / `intent-grant` / `guard-disabled`) | Stage | User Input, Grant Id, Approval Provenance, Swarm batch, Transaction Id, Presence Reservation Id | `tools/amadeus-state.ts approve` |
| `GATE_REJECTED` | Human requested changes | Stage | Feedback, Recovered, Transaction Id | `tools/amadeus-state.ts reject` |
| `QUESTION_ANSWERED` | Question answered by user | Stage, Details | Resolution Route, Decision Id | `tools/amadeus-log.ts answer` |
| `DELEGATED_APPROVAL` | Leader session records a human-grounded approval into a remote conductor intent's audit dir (agent-team topology, #671) | Stage, Issuer Space, Issuer Intent, Issuer Shard, Issuer Human Ts | User Input, Grant Id | `tools/amadeus-state.ts delegate-approval` |
| `DELEGATED_REJECTION` | Leader session records a human-grounded rejection into a remote conductor intent's audit dir; verb-scoped mirror of `DELEGATED_APPROVAL` (agent-team topology, #685) | Stage, Issuer Space, Issuer Intent, Issuer Shard, Issuer Human Ts | Feedback | `tools/amadeus-state.ts delegate-rejection` |

### Legacy Standing Delegation Grant Observations (3 events)

These event shapes are retained only so replay and migration projection code can read historical ledgers. No live command or router emits them, and none of them authorizes work. The general audit CLI continues to refuse them so new rows cannot masquerade as history.

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `GRANT_ISSUED` | Historical standing-grant evidence | Grant Id, Scope, Expires At, Includes Phase Boundary, Issuer Space, Issuer Intent, Issuer Shard, Issuer Human Ts | User Input | Reserved legacy observation |
| `GRANT_REVOKED` | Historical standing-grant revocation | Grant Id, Issuer Space, Issuer Intent, Issuer Shard, Issuer Human Ts | — | Reserved legacy observation |
| `GATE_AUTHORIZATION_SELECTED` | Historical standing-grant route selection | Route Id, Stage, Grant Id | — | Reserved legacy observation |

### Artifact Events (4 events)

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `ARTIFACT_CREATED` | New artifact file written under `amadeus-docs/` | Tool, File, Context | — | `hooks/amadeus-audit-logger.ts` (PostToolUse; Write to net-new path) |
| `ARTIFACT_UPDATED` | Existing artifact modified | — | Tool, File, Context, Artifact, TransactionId, Revision, TransitionKind, Digest, TriggerBoundary, Reconciliation, OperationId, Classification, coalescedWarning, repairProof | `hooks/amadeus-audit-logger.ts` (PostToolUse; Edit, or Write overwriting existing) |
| `ARTIFACT_REUSED` | Re-use decision on backward jump | Stage, Decision, Artifacts | — | `tools/amadeus-state.ts reuse-artifact` |
| `ARTIFACT_ATTESTED` | A tool-owned delivery binds artifact bytes to workflow and external-delivery identity | Attestation Id, Intent, Intent UUID, Record, Bolt, Unit, Repository, PR, Local Head, Remote Head, PR Head, Content Digest | — | Plugin CLI through `tools/amadeus-audit.ts append` under the canonical audit lock |

### Subagent Events (2 events — hook-emitted)

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `SUBAGENT_STARTED` | Subagent is dispatched | Agent Type | Agent ID, Purpose | `hooks/amadeus-log-subagent-start.ts` (PreToolUse on a dispatch tool / SubagentStart) |
| `SUBAGENT_COMPLETED` | Subagent task finishes | Agent Type | Agent ID, Message | `hooks/amadeus-log-subagent.ts` (SubagentStop) |

Harnesses do not agree on when a subagent BEGINS, so `SUBAGENT_STARTED` is
emitted only where a start seam exists: Claude Code has no subagent-start event
and uses `PreToolUse` on the dispatch tool, Kimi has a real `SubagentStart` that
also carries the prompt (the source of `Purpose`), and Codex, Cursor, OpenCode
and Kiro have no start seam and emit the completed half alone. A completion with
no start is therefore normal on those harnesses; readers pair the two halves and
drop unmatched rows rather than inventing an interval.

### Utility Events (1 event)

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `HEALTH_CHECKED` | `--doctor` completed | Request, Details | — | `tools/amadeus-utility.ts handleDoctor` |

### Error/Recovery Events (2 events)

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `ERROR_LOGGED` | Tool CLI exited non-zero via `error()` | Tool, Command, Error | — | `tools/amadeus-lib.ts emitError` (called by every tool's `error()` helper) |
| `RECOVERY_COMPLETED` | User answered the compaction-awareness prompt, or a human-confirmed session takeover repaired a stale caller carrier | Choice, Current Stage | Reason | `tools/amadeus-state.ts acknowledge-compaction` / `session-takeover` |

### Construction Bolt Events (5 events)

Emitted only during Phase 3 (Construction). A Bolt is one execution of stages 3.1–3.5 for a Unit or small group of dependency-linked Units. See `stage-protocol.md` Glossary. Note: this deviates intentionally from AI-DLC v1, where a Bolt is a sprint-like time-box (a Unit of Work spans multiple Bolts). This implementation repurposes "Bolt" to mean a deployable slice that wraps one or more Units of Work.

`UNIT_OUTCOME_SETTLED` is the per-unit `run-stage` path's outcome ledger. A units-generation scope that does not swarm dispatches its Units through the engine's own for_each loop, and there is no Unit pool behind that route — so the engine records the outcome itself: `succeeded` at the coverage boundary the loop already observes, and `cancelled` for a Unit the failure ruling cancelled, read from the canonical Construction projection rather than gated on coverage (#3106). `Outcome` is a closed set of three — `succeeded`, `cancelled`, `failed` — and a row outside it is refused; no arm writes `failed`, because a solo terminal failure stops `next` at the ruling prompt before this emitter runs. The row is keyed by stage, Unit, batch and revision, so re-entering `next` on an unchanged observation appends nothing while a changed one (a cancelled Unit restarted back to coverage) lands as the revision that supersedes it. Consumers read the LAST row for a Unit, and only where the pool stream has no terminal for that Unit: a pool-settled Unit keeps its pool outcome (#3099).

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `UNIT_OUTCOME_SETTLED` | A per-unit Construction stage observes a Unit's terminal state on the engine's own dispatch path: its required artifacts covered, or the Unit cancelled by a failure ruling | Stage, Unit, Batch, Outcome, Idempotency Key | — | `tools/amadeus-orchestrate.ts` |
| `BOLT_STARTED` | Orchestrator begins a Bolt (or parallel batch of Bolts) | Bolt names, Batch number, Walking skeleton | Bolt slug | `tools/amadeus-bolt.ts start` |
| `BOLT_COMPLETED` | All Bolts in the batch finished successfully | Bolt names, Batch number | Bolt slug | `tools/amadeus-bolt.ts complete` |
| `BOLT_FAILED` | A Bolt failed during code-generation, or was explicitly aborted by the user | Failed Bolt, Error summary | Bolt slug, Reason, Succeeded siblings | `tools/amadeus-bolt.ts fail` and `tools/amadeus-bolt.ts abort` |
| `AUTONOMY_MODE_SET` | An out-of-band `set` wrote one of the three fields the autonomy transaction owns (`Intent Autonomy Mode`, `Intent Grant`, `Construction Autonomy Mode`); also the historical Construction-mode evidence retained for replay and doctor diagnostics | Mode | Field | `tools/amadeus-state.ts` `set` (historical rows: reserved legacy observation) |

### Worktree (7 events)

Emitted during Phase 3 (Construction) when Bolts run inside per-Bolt git worktrees. Worktree primitive emits `WORKTREE_*`; state fork/merge subcommands emit `STATE_*`; audit fork/merge subcommands emit `AUDIT_*`.

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `WORKTREE_CREATED` | Per-Bolt git worktree created from main on Bolt start | Bolt slug, Worktree path, Branch name, Base branch | Base SHA | `tools/amadeus-worktree.ts` (`create`) |
| `WORKTREE_MERGED` | Bolt's worktree merged back to main on gate approval | Bolt slug, Worktree path, Target branch, Strategy | — | `tools/amadeus-worktree.ts` (`merge`) |
| `WORKTREE_DISCARDED` | Aborted Bolt's worktree explicitly removed | Bolt slug, Worktree path, Reason | — | `tools/amadeus-worktree.ts` (`discard`) |
| `STATE_FORKED` | State file forked to worktree on Bolt start | Bolt slug, Worktree path, Source state hash, Target state hash | — | `tools/amadeus-state.ts` (`fork`) |
| `STATE_MERGED` | Worktree's state merged back to main state on gate approval | Bolt slug, Worktree path, Source state hash, Target state hash, Conflict resolution | — | `tools/amadeus-state.ts` (`merge`) |
| `AUDIT_FORKED` | Audit log forked to worktree on Bolt start (audit-of-intent — emit precedes the byte-copy) | Bolt slug, Source Audit Hash, Fork Boundary | Reentrant | `tools/amadeus-audit.ts` (`audit-fork`) |
| `AUDIT_MERGED` | Worktree's audit entries appended to main audit on gate approval; per-Bolt entry order preserved, cross-Bolt order reflects merge-completion order | Bolt slug, Entries Merged, Source Audit Hash, Fork Boundary | — | `tools/amadeus-audit.ts` (`audit-merge`) |

### Practices (4 events)

Emitted by the Inception stage `practices-discovery` and by the Construction orchestrator at runtime. The stage emits at the affirmation gate; the orchestrator emits at runtime via `--type empty` (fallback advisory) and `--type override` (discriminator-field for the bolt-plan-marker-conflict path).

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `PRACTICES_DISCOVERED` | Brownfield discovery dispatch + drafting completed; team-practices draft awaiting affirmation | — | Sources Scanned, Drafts | `tools/amadeus-state.ts` `practices-event --type discovered` |
| `PRACTICES_AFFIRMED` | Team approved practices at the practices-discovery affirmation gate; content promoted to `{{HARNESS_DIR}}/rules/amadeus-team.md` and `{{HARNESS_DIR}}/rules/amadeus-project.md` | — | Affirming User, Sections Written, Mandated Rules Appended, Forbidden Rules Appended, Timestamp | `tools/amadeus-state.ts` `practices-promote` |
| `PRACTICES_OVERRIDE` | Cross-row promotion failed during practices-discovery affirmation, OR walking-skeleton stance from `amadeus-team.md` overrode bolt-plan's marker for the current Bolt | Reason | Timestamp, Practices Stance, Bolt-Plan Marker, Bolt slug | `tools/amadeus-state.ts` `practices-promote` (write-failure path); `tools/amadeus-state.ts` `practices-event --type override` (bolt-plan-marker-conflict path — discriminator-field disambiguation, no separate event) |
| `PRACTICES_SECTION_EMPTY` | Orchestrator read a practices section that returned empty; falling back to org defaults (advisory-only) | — | Section, Fallback | `tools/amadeus-state.ts` `practices-event --type empty` |

### Merge Dispatch (3 events)

Emitted when Construction's Bolt-merge step calls amadeus-pipeline-deploy-agent via Task to determine the merge strategy from team practices prose. Emitted via the `amadeus-bolt dispatch-event` subcommand. The orchestrator brackets each amadeus-pipeline-deploy-agent dispatch — pre-call INVOKED, post-call RETURNED on successful parse, FALLBACK on timeout/malformed-YAML. Audit-of-intent semantic: INVOKED emits before the LLM Task call (no disk side-effect for the dispatch itself; reconciliation by slug + timestamp window). Doctor reconciles orphan INVOKED rows.

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `MERGE_DISPATCH_INVOKED` | Orchestrator dispatched amadeus-pipeline-deploy-agent with current practices section + Bolt context | Bolt slug, Practices section excerpt | — | `tools/amadeus-bolt.ts` `dispatch-event --event MERGE_DISPATCH_INVOKED` |
| `MERGE_DISPATCH_RETURNED` | Agent returned parsed YAML with strategy, target branch, confidence, notes | Bolt slug, Strategy, Target branch, Confidence, Notes | — | `tools/amadeus-bolt.ts` `dispatch-event --event MERGE_DISPATCH_RETURNED` |
| `MERGE_DISPATCH_FALLBACK` | Agent timed out or returned malformed YAML; orchestrator fell back to org defaults — critical observability hook | Bolt slug, Fallback reason, Defaults applied | — | `tools/amadeus-bolt.ts` `dispatch-event --event MERGE_DISPATCH_FALLBACK` |

### Delegated Merge Provenance (1 event)

Record-only fact that a PR merge delegated under team.md's standing merge-approval norm (`cid:ci-pipeline:standing-merge-approval-ci-green` — required CI green AND pr-convergence `converged: true`) took place. The norm stays the sole source of truth for the delegation condition; this event never triggers or performs the merge and carries no git/GitHub side effect. Distinct from both the Bolt-internal `*_MERGED` trio (Worktree/State/Audit — a Bolt worktree merging back to main state) and `MERGE_DISPATCH_*` (a Bolt's merge STRATEGY selection) — none of those cover a GitHub PR merge.

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `DELEGATED_MERGE_RECORDED` | Caller (conductor or delegated executor) confirms the delegation condition was met and the PR merge already happened, then calls `recordDelegatedMerge` | Standing Ruling Ref, CI Conclusion, Converged Digest | — | `tools/amadeus-audit.ts` `recordDelegatedMerge` (CLI: `tools/amadeus-merge-provenance.ts record`) |

### Sensor Events (5 events)

Emitted by the deterministic-sensor system. The sensor dispatcher emits the four `SENSOR_*` events; the paired-coverage doctor row emits `GUARDRAIL_LOADED` with `Scope: all`, because doctor reads the full resolved guardrail set without an active stage (the per-workflow org → project → phase → stage scoping in the When-clause below describes the steady-state loader, not doctor's unscoped read). Coverage is environmental — every Inception/Construction/Operation stage that writes markdown emits at least one `SENSOR_FIRED` row from the registry-default sensors (`upstream-coverage`, `required-sections`); Construction/Operation TS/JS writes additionally emit `linter` and `type-check` rows. Advisory-only; the future ralph driver introduces blocking semantics for Construction-phase sensors.

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `SENSOR_FIRED` | Dispatcher invoked a sensor against a stage output (per PostToolUse Write/Edit match on the sensor's `matches` filter) | Fire id, Sensor ID, Stage slug, Output path | Output digest | `tools/amadeus-sensor.ts` `fire` |
| `SENSOR_PASSED` | Sensor completed and reported no findings (also: tool-unavailable, script-error fall-through — see Note footnote); a blocking guard may reject diagnostic notes | Fire id, Sensor ID, Stage slug, Output path, Duration ms | Note, Output digest | `tools/amadeus-sensor.ts` `fire` |
| `SENSOR_FAILED` | Sensor completed and reported findings; detail file written at `amadeus-docs/.amadeus-sensors/<stage-slug>/<sensor-id>-<fire-id>.md` | Fire id, Sensor ID, Stage slug, Output path, Detail path, Findings count | Output digest | `tools/amadeus-sensor.ts` `fire` |
| `SENSOR_BUDGET_OVERRIDE` | Sensor exceeded its configured cap (registry / binding / depth-derived per the three-layer cap model) and was terminated or skipped | Fire id, Sensor ID, Stage slug, Output path, Cap layer, Cap value, Observed value | Output digest | `tools/amadeus-sensor.ts` `fire` |
| `GUARDRAIL_LOADED` | Guardrail loader resolved the scope-hierarchical guardrail set for the active workflow (org → project → phase → stage); doctor's paired-coverage check reads from this event | Scope, Path, Rule count | — | `tools/amadeus-utility.ts` |

> The `Note` field on `SENSOR_PASSED` is optional. It carries `tool-unavailable` when the per-sensor script's underlying binary isn't on PATH. This preserves the audit event schema, but a `blocking` sensor's completion guard treats the diagnostic as unusable evidence and refuses stage completion. It carries `script-error: <reason>` for spawn-failure / non-zero exit / malformed JSON / detail-write failure paths, which blocking guards also reject. Pair correlation is via `Fire id` (echoed verbatim from `SENSOR_FIRED` to the terminal row); `Output path` alone does not disambiguate when the PostToolUse Write/Edit hook fires the same sensor + stage + path tuple multiple times within a stage. The blocking completion guard requires that `Fire id` match even when `Output digest` is absent, so a digest-less `SENSOR_PASSED` from an older fire cannot clear a later fire on the same path. `Output digest` remains optional and is checked only when present.

> **Pair by `Fire id`, not by audit-row index.** The PostToolUse Write/Edit hook can fan out a single tool call to four parallel sensor fires (one per applicable sensor on the matching stage). Terminal rows interleave by spawn duration — a 200ms linter beats a 4s tsc — so `findAllEvents("SENSOR_FIRED")[i]` does NOT pair with `findAllEvents("SENSOR_PASSED")[i]` by index. Audit-walking consumers (the `sensor_firings[]` populator, doctor, designer) MUST match terminal rows to FIRED rows via the 8-hex `Fire id` correlator. The dispatcher emits `Fire id` on every row precisely so this pairing remains O(1) under arbitrary fan-out + interleave.

### Learning Loop (5 events)

Emitted by stage-protocol §13 (Learnings Ritual). The runtime-graph compile emits `MEMORY_EMPTY` when a just-approved stage's memory.md has zero non-blank entries under the four standard headings. The learning-gate tool emits `RULE_LEARNED` when the user keeps a surfaced or free-text learning (a learning IS a practice — it lands as a practice line under the routed heading in `{project,team}.md`) and `SENSOR_PROPOSED` when a learning installs a sensor binding (manifest + originating stage `sensors:` frontmatter). Doctor reads `MEMORY_EMPTY` rows over time to detect systematic diary-skipping across stages. `LEARNING_ZERO_CONFIRMED` and `LEARNING_CANDIDATE_ADDED` (unit s13-zero, ADR-6) machine-bind a §13 "0 件" confirmation to the digest of the surface run it is based on, so the conductor's own self-report is never the basis: `confirm-zero` only emits `LEARNING_ZERO_CONFIRMED` when candidates is empty AND the surfaceDigest recomputes from the same surface output; `add-candidate` is the additive-only, disk-evidence-gated path for a conductor-observed candidate `surface` missed, and its `LEARNING_CANDIDATE_ADDED` row carries the surfaceDigest of the snapshot it was layered on top of.

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `MEMORY_EMPTY` | A stage approval triggered a runtime-graph compile and the stage's memory.md had zero non-blank entries under any of the four §13 headings | Stage | — | `tools/amadeus-runtime.ts compile` |
| `RULE_LEARNED` | The learning gate persisted a kept learning as a practice line under the routed heading in `{project,team}.md` | Stage, Candidate-ID, Destination, Heading, Source | — | `tools/amadeus-learnings.ts persist` |
| `SENSOR_PROPOSED` | The learning gate scaffolded a project-tier sensor manifest and bound it to the originating stage's `sensors:` frontmatter | Stage, Candidate-ID, Sensor ID, Manifest path, Matches, Destinations, Source | — | `tools/amadeus-learnings.ts persist` |
| `LEARNING_ZERO_CONFIRMED` | `confirmZeroCandidates` minted a ZeroReceipt: candidates was empty and the surfaceDigest recomputed from the same surface output | Stage, Surface Digest, Confirmed At | — | `tools/amadeus-learnings.ts confirm-zero` |
| `LEARNING_CANDIDATE_ADDED` | `addConductorCandidate` accepted a conductor-observed candidate whose disk evidence path existed and corresponded to the claim | Stage, Candidate-ID, Disk Evidence Path, Surface Digest | — | `tools/amadeus-learnings.ts add-candidate` |

### Loop Monitor, Quality Repair, and Intent Autonomy (5 events)

The event set is the atomic canonical stream for delivery observation, cycle trigger, Judge reservation/result, closed route application, and latch transitions. The per-clone Replay Index is a repairable secondary projection and never replaces this audit source of truth.

`INTENT_AUTONOMY_HUMAN_REQUIRED` is written when a gate is PRESENTED, not when the autonomy projection is read — reading it (every `next`, every approval attempt) writes nothing. Its `Idempotency Key` is derived from the occurrence, the mode that could not decide it, and how many times that gate has already been resolved, so re-opening a gate nobody has answered yet collapses onto the existing row while a re-presentation after a rejection earns its own. The row count is therefore how often a human was actually stopped at that gate.

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `LOOP_MONITOR_EVENT_SET_COMMITTED` | One atomic Loop Monitor delivery/Judge/latch transition commits | Partition Key, Event Set Id, Event Set | — | `tools/amadeus-loop-monitor-replay.ts` |
| `QUALITY_REPAIR_TRANSACTION_COMMITTED` | One Quality snapshot/progress/replan/stall/resume transaction and its generic Monitor effects commit atomically | Quality Scope Id, Transaction Id, Transaction | — | `tools/amadeus-quality-repair-replay.ts` |
| `INTENT_AUTONOMY_TRANSACTION_COMMITTED` | One Intent-scoped mode/grant/decision/effect/park transaction commits atomically | Intent Uuid, Transaction Id, Transaction Digest, Transaction | Principal, Decider, Actor, Basis | `tools/amadeus-intent-autonomy-replay.ts` |
| `INTENT_AUTONOMY_HUMAN_REQUIRED` | A gate opens on an occurrence the active mode could not decide on its own, recorded with the reason it fell to a human | Interaction Kind, Stage slug, Reason, Mode, Idempotency Key | — | `tools/amadeus-intent-autonomy-production.ts` |
| `AUTO_DECISION_REVIEWED` | A real human accepts or flags one immutable automatic decision; completed Intent reviews extend the review chain without changing the completion seal | Intent Uuid, Decision Id, Review Id, Choice, Lifecycle, Review Principal, Review Actor, Source Human Turn, Audit Transaction Id, Payload Digest, Payload V1 | Decision Principal, Decision Actor, Decision Source, Basis Digest, Grant Id, Remediation, Note Digest, Redaction Status, Event Identity, Projection Revision, Trace Id, Span Id | `tools/amadeus-autonomy-review-production.ts` |
| `INTENT_COMPLETION_TRANSACTION_COMMITTED` | The Core Intent completion transaction commits and seals the Intent record with its evidence digest | Intent Uuid, Transaction Id, Evidence Id, Evidence Digest, Completion Seal Digest, Transaction | — | `tools/amadeus-intent-completion.ts` |

### Swarm (7 events)

All six `SWARM_*` events emit from `amadeus-swarm.ts`. In addition, `UNIT_POOL_EVENT_SET_COMMITTED` is the canonical C2 single-writer stream for FIFO queue, slot, Unit-attempt, dispatch-confirmation, settlement, reconciliation, drain, and late-result observations. Harnesses supply native facts only and own no scheduler or counter. `prepare` initialises the pool and records the effective cap; `finalize` refuses a non-terminal pool before re-verification and merge.

| Event | When | Required | Optional | Emitter |
|-------|------|----------|----------|---------|
| `UNIT_POOL_EVENT_SET_COMMITTED` | One atomic fixed-pool queue/slot transition commits before native dispatch | Batch Id, Event Set Id, Event Set | — | `tools/amadeus-unit-pool-runtime.ts` |
| `SWARM_STARTED` | Swarm referee `prepare` forked a batch of dependency-linked Units | Batch number, Unit names, Concurrency cap | Plan generation | `tools/amadeus-swarm.ts` |
| `SWARM_UNIT_CONVERGED` | A swarm Unit re-verified green (and untampered) at the `finalize` gate | Batch number, Unit name | Plan generation | `tools/amadeus-swarm.ts` |
| `SWARM_UNIT_FAILED` | A swarm Unit failed the `finalize` re-verify (not claimed, claimed-but-red, or tampered) | Batch number, Unit name, Reason | — | `tools/amadeus-swarm.ts` |
<!-- Reason for a CLAIMED-but-red / tampered unit is always the tool's own verdict (`error`); for a DECLINED (unclaimed) unit it is the conductor's typed attribution via `finalize --reasons` (`unsatisfiable` / `budget-exhausted` / `cap-exhausted`, defaulting to `cap-exhausted`) — the tool records the conductor's knowledge call, it does not judge unsatisfiability itself (D-I). -->
| `SWARM_BATON_RETURNED` | A swarm Unit returned the baton to the conductor for orchestrator-mediated coordination | Batch number, Unit name, Reason | — | `tools/amadeus-swarm.ts` |
| `SWARM_COMPLETED` | All Units in the batch finished (converged or failed); batch closed | Batch number, Converged count, Failed count | Plan generation | `tools/amadeus-swarm.ts` |
| `SWARM_DEGRADED` | An ultra value (`claude-ultra` or `codex-ultra`) was requested on a harness that is not its native one, so the conductor loud-degraded to the subagent floor (the legacy `1` is fail-closed, not degraded) | Batch number, Requested driver, Fallback driver | Plan generation | `tools/amadeus-swarm.ts` |

## Hook-Generated Format

Hooks that emit events use the same CLI as orchestrator-driven emissions: `bun {{HARNESS_DIR}}/tools/amadeus-audit.ts append EVENT --field Key=Value`. Hook-emitted events are first-class taxonomy members (`ARTIFACT_CREATED`, `ARTIFACT_UPDATED`, `SUBAGENT_COMPLETED`, all `SESSION_*`) — there is no longer a separate "free-form hook entry" format. A hook with no active workflow in `cwd` is a no-op; session events only append to a workflow's audit.md when one exists.

## Format Standards

- All timestamps: ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
- Generate fresh timestamp for EACH entry via `date -u +"%Y-%m-%dT%H:%M:%SZ"` (tools do this automatically)
- Append-only — NEVER modify or delete existing entries
- No sensitive data (credentials, PII, secrets)
- Human decisions recorded verbatim — NEVER summarize

## Entry Format

Since the Intent Event Journal switchover (Issue #1628) each audit shard is a
JSONL file — `audit/<host>-<clone-id>.jsonl`, one JSON object per line,
append-only, no header line. Every record carries the idempotency identity
plus the event payload:

### Standard Format (one physical line per record)
```json
{"schemaVersion":1,"seq":42,"cloneId":"d4a945003a7f","intentId":"260728-otel-1a2b3c4d","timestamp":"2026-07-28T10:00:00Z","heading":"Stage Start","event":"STAGE_STARTED","fields":{"Stage":"code-generation","Agent":"developer"}}
```

- `schemaVersion` — wire version (currently 1); readers accept older, refuse newer
- `seq` — per-shard monotonic sequence, 1-based; `intentId:cloneId:seq` is the global idempotency key
- `cloneId` — this clone's stable token (`amadeus/.amadeus-clone-id`)
- `intentId` — the record dir name, or `workspace` for the flat-legacy layout
- `event` — an event type from the table above; `fields` carries the event's Required Fields as string key/values (order preserved)
- Field values are newline-escaped at append time (CR/LF → the literal two characters `\n`), the same forgery guard the Markdown ledger used

### Raw Format (`append-raw` records)
```json
{"schemaVersion":1,"seq":43,"cloneId":"d4a945003a7f","intentId":"260728-otel-1a2b3c4d","timestamp":"2026-07-28T10:01:00Z","heading":"Custom Note","event":null,"rawBody":"**Note**: free-form"}
```

`event` is `null` and `rawBody` preserves the body verbatim. Records converted
from the legacy Markdown ledger may additionally carry `"opaque":true` when
the original block did not match the canonical frame — such records preserve
the entire legacy segment in `rawBody`.

### Legacy Markdown ledger

Shards written before the switchover used `\n---\n`-separated Markdown
blocks under a `# AI-DLC Audit Log` header. They are converted losslessly by
`tools/amadeus-journal-convert.ts` (byte-exact round-trip proof; refuses
unmerged `AUDIT_FORKED` anchors unless `--allow-unmerged-forks`). A leftover
`.md` shard is invisible to the JSONL readers and is surfaced by `--doctor`.
