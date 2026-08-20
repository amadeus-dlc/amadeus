// event-registry.ts — the typed Event Registry (FR-EVT-1).
//
// The canonical half of the registry covers the full 90-event audit
// vocabulary (#1672) — every
// canonical name maps 1:1 onto the EXISTING v1 audit event vocabulary so the
// current readers understand the records unchanged. The telemetry half
// carries events that must NEVER reach the audit journal (FR-EXP-4): free-form
// diagnostic notes and the `recordException()` exception span event
// (FR-EVT-7).
//
// Drift guard (VER-1), three layers:
//   1. compile-time — `RegisteredEventName` is derived from REGISTERED_EVENTS
//      (`as const`), so an unregistered name cannot typecheck at typed call
//      sites (BR-2);
//   2. unit test — tests/unit/event-registry-drift.test.ts asserts the
//      four-set equality (state-machine references == canonical registry ==
//      exporter accept set == journal reader decode set) with the 88
//      cardinality pinned, so vacuous equality fails;
//   3. sensor — sensors/amadeus-event-registry-drift.md runs the same
//      extraction at gate time.
// Sets (a)(b)(c) are enforced now; the reader decode set (d) activates when
// the U3 codec table lands (the v1 reader accepts any event name, so there is
// no closed set to compare yet). See otel/event-registry-drift.ts.

export type Durability = "canonical" | "telemetry";

// The 21 vocabulary categories of audit-format.md's Event Registry, plus
// "telemetry" for events that never reach the journal. The category lets the
// drift guard catch misclassification (a state-lifecycle event demoted to
// telemetry).
export type EventCategory =
  | "workflow-lifecycle"
  | "phase-lifecycle"
  | "stage-lifecycle"
  | "session"
  | "initialization"
  | "navigation"
  | "interaction"
  | "grant"
  | "artifact"
  | "subagent"
  | "utility"
  | "error-recovery"
  | "bolt"
  | "worktree"
  | "practices"
  | "merge-dispatch"
  | "merge-provenance"
  | "sensor"
  | "learning"
  | "swarm"
  | "goal-lifecycle"
  | "loop-monitor"
  | "telemetry";

export type EventDef = {
  // OTel event name (Registry-registered).
  readonly name: string;
  // The v1 audit event type a canonical record is appended as. null for
  // telemetry — telemetry records NEVER reach the audit journal (FR-EXP-4).
  readonly auditEvent: string | null;
  readonly durability: Durability;
  readonly category: EventCategory;
  // Keys EVERY emitter of this event supplies. emitEvent THROWS when one is
  // absent, so a key that only SOME emitter supplies must not live here: it
  // would turn a working legacy write into a crash the moment its call site
  // migrates. Derived per event from the intersection over the real emitters.
  readonly requiredAttributes: readonly string[];
  // Keys an emitter MAY supply — conditionally-spread fields, keys owned by one
  // of several emitters, and the documented vocabulary a CLI passthrough
  // (`--field "Key: Value"`) can carry. Never validated, but admitted through
  // redaction: the policy is default-deny, so a supplied-but-unlisted key would
  // be dropped from the stored row without a word.
  readonly optionalAttributes: readonly string[];
  readonly schemaVersion: number;
};

// The canonical cardinality (#1672). The drift guard pins this so an emptied
// or truncated registry fails instead of passing vacuously.
// +LEARNING_ZERO_CONFIRMED +LEARNING_CANDIDATE_ADDED (unit s13-zero, ADR-6)
// +DELEGATED_MERGE_RECORDED (unit merge-provenance, ADR-10) take it to 96.
export const EXPECTED_CANONICAL_COUNT = 98;

// The OTel semantic-convention span event name produced by recordException().
// Registered as telemetry (FR-EVT-7): it rides the span record, never the
// audit journal. Canonical failures are emitted separately as
// `amadeus.operation.failed` (the ERROR_LOGGED vocabulary entry).
export const EXCEPTION_SPAN_EVENT_NAME = "exception";

export const REGISTERED_EVENTS = [
  // --- Workflow Lifecycle (7) ---
  {
    name: "amadeus.workflow.started",
    auditEvent: "WORKFLOW_STARTED",
    durability: "canonical",
    category: "workflow-lifecycle",
    requiredAttributes: ["Scope", "Request"],
    optionalAttributes: ["Repos"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.workflow.completed",
    auditEvent: "WORKFLOW_COMPLETED",
    durability: "canonical",
    category: "workflow-lifecycle",
    requiredAttributes: ["Scope", "Details"],
    optionalAttributes: [
      "Reason",
      "Completion Instance",
      "Goal Id",
      "Goal Revision",
      "Goal Digest",
      "Goal Receipt Id",
      "Goal Receipt Digest",
      "Goal Verdict",
      "Goal Evidence Count",
      "Goal Human Ruling",
    ],
    schemaVersion: 1,
  },
  {
    name: "amadeus.workflow.parked",
    auditEvent: "WORKFLOW_PARKED",
    durability: "canonical",
    category: "workflow-lifecycle",
    requiredAttributes: ["Stage"],
    optionalAttributes: ["Timestamp"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.workflow.unparked",
    auditEvent: "WORKFLOW_UNPARKED",
    durability: "canonical",
    category: "workflow-lifecycle",
    requiredAttributes: [],
    optionalAttributes: ["Timestamp"],
    schemaVersion: 1,
  },
  // RFC-0001 FR-3 / ADR-4 — waiting is a terminal of its own, so it gets
  // markers of its own rather than borrowing park's. Both carry identifiers
  // only: `Transaction Id` points at the Intent autonomy transaction that holds
  // the WaitingCause, and the cause never appears here (a second copy of it
  // could disagree with the ledger, and the ledger is the truth).
  {
    name: "amadeus.workflow.waiting.entered",
    auditEvent: "WORKFLOW_WAITING_ENTERED",
    durability: "canonical",
    category: "workflow-lifecycle",
    requiredAttributes: ["Stage", "Occurrence Id", "Basis Fingerprint", "Transaction Id"],
    optionalAttributes: ["Timestamp"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.workflow.waiting.resumed",
    auditEvent: "WORKFLOW_WAITING_RESUMED",
    durability: "canonical",
    category: "workflow-lifecycle",
    requiredAttributes: ["Stage", "Transaction Id"],
    optionalAttributes: ["Timestamp"],
    schemaVersion: 1,
  },
  // --- Goal Lifecycle (4) ---
  {
    name: "amadeus.goal.change.proposed",
    auditEvent: "GOAL_CHANGE_PROPOSED",
    durability: "canonical",
    category: "goal-lifecycle",
    requiredAttributes: ["Intent", "Proposal Id", "Proposal Digest"],
    optionalAttributes: ["Goal Id", "Parent Revision"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.goal.revision.approved",
    auditEvent: "GOAL_REVISION_APPROVED",
    durability: "canonical",
    category: "goal-lifecycle",
    requiredAttributes: ["Intent", "Goal Id", "Goal Revision", "Goal Digest", "Proposal Id", "Human Turn Timestamp"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.goal.reconciled",
    auditEvent: "GOAL_RECONCILED",
    durability: "canonical",
    category: "goal-lifecycle",
    requiredAttributes: ["Intent", "Goal Id", "Goal Revision", "Goal Digest", "Goal Receipt Id", "Goal Receipt Digest", "Goal Verdict", "Completion Instance"],
    optionalAttributes: ["Goal Human Ruling"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.goal.legacy.migrated",
    auditEvent: "LEGACY_GOAL_MIGRATED",
    durability: "canonical",
    category: "goal-lifecycle",
    requiredAttributes: ["Intent", "Goal Id", "Goal Revision", "Goal Digest", "Goal Receipt Id", "Human Turn Timestamp"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.intent.archived",
    auditEvent: "INTENT_ARCHIVED",
    durability: "canonical",
    category: "workflow-lifecycle",
    requiredAttributes: ["Intent", "From Status", "To Status", "Operation Id", "User Input", "Human Turn Timestamp"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.intent.unarchived",
    auditEvent: "INTENT_UNARCHIVED",
    durability: "canonical",
    category: "workflow-lifecycle",
    requiredAttributes: ["Intent", "From Status", "To Status", "Operation Id", "User Input", "Human Turn Timestamp"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.execution.event_set.committed",
    auditEvent: "EXECUTION_EVENT_SET_COMMITTED",
    durability: "canonical",
    category: "workflow-lifecycle",
    requiredAttributes: ["Root Operation Id", "Event Set Digest", "Event Set"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.loop_monitor.event_set.committed",
    auditEvent: "LOOP_MONITOR_EVENT_SET_COMMITTED",
    durability: "canonical",
    category: "loop-monitor",
    requiredAttributes: ["Partition Key", "Event Set Id", "Event Set"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.quality_repair.transaction.committed",
    auditEvent: "QUALITY_REPAIR_TRANSACTION_COMMITTED",
    durability: "canonical",
    category: "loop-monitor",
    requiredAttributes: ["Quality Scope Id", "Transaction Id", "Transaction"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.intent_autonomy.transaction.committed",
    auditEvent: "INTENT_AUTONOMY_TRANSACTION_COMMITTED",
    durability: "canonical",
    category: "grant",
    requiredAttributes: ["Intent Uuid", "Transaction Id", "Transaction Digest", "Transaction"],
    optionalAttributes: ["Principal", "Decider", "Actor", "Basis"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.intent_autonomy.human_required",
    auditEvent: "INTENT_AUTONOMY_HUMAN_REQUIRED",
    durability: "canonical",
    category: "grant",
    requiredAttributes: ["Interaction Kind", "Stage slug", "Reason", "Mode", "Idempotency Key"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.intent_completion.transaction.committed",
    auditEvent: "INTENT_COMPLETION_TRANSACTION_COMMITTED",
    durability: "canonical",
    category: "grant",
    requiredAttributes: [
      "Intent Uuid",
      "Transaction Id",
      "Evidence Id",
      "Evidence Digest",
      "Completion Seal Digest",
      "Transaction",
    ],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.auto_decision.reviewed",
    auditEvent: "AUTO_DECISION_REVIEWED",
    durability: "canonical",
    category: "grant",
    requiredAttributes: [
      "Intent Uuid",
      "Decision Id",
      "Review Id",
      "Choice",
      "Lifecycle",
      "Review Principal",
      "Review Actor",
      "Source Human Turn",
      "Audit Transaction Id",
      "Payload Digest",
      "Payload V1",
    ],
    optionalAttributes: [
      "Decision Principal",
      "Decision Actor",
      "Decision Source",
      "Basis Digest",
      "Grant Id",
      "Remediation",
      "Note Digest",
      "Redaction Status",
      "Event Identity",
      "Projection Revision",
      "Trace Id",
      "Span Id",
    ],
    schemaVersion: 1,
  },
  // --- Phase Lifecycle (4) ---
  {
    name: "amadeus.phase.started",
    auditEvent: "PHASE_STARTED",
    durability: "canonical",
    category: "phase-lifecycle",
    requiredAttributes: ["Phase", "Scope"],
    optionalAttributes: ["Stage count"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.phase.completed",
    auditEvent: "PHASE_COMPLETED",
    durability: "canonical",
    category: "phase-lifecycle",
    requiredAttributes: ["From phase", "To phase", "Stages completed"],
    // A forward jump names the crossing it recorded (tools/amadeus-jump.ts).
    optionalAttributes: ["Details", "Completion Instance"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.phase.verified",
    auditEvent: "PHASE_VERIFIED",
    durability: "canonical",
    category: "phase-lifecycle",
    requiredAttributes: ["Phase boundary"],
    optionalAttributes: ["Details", "Pass/fail", "Issues", "Completion Instance"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.phase.skipped",
    auditEvent: "PHASE_SKIPPED",
    durability: "canonical",
    category: "phase-lifecycle",
    requiredAttributes: ["Phase", "Reason"],
    optionalAttributes: ["Scope"],
    schemaVersion: 1,
  },
  // --- Stage Lifecycle (7) ---
  {
    name: "amadeus.stage.started",
    auditEvent: "STAGE_STARTED",
    durability: "canonical",
    category: "stage-lifecycle",
    requiredAttributes: ["Stage", "Agent"],
    // `Workflow` is the synthetic id a --single stage run is recorded under.
    optionalAttributes: ["Workflow"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.stage.awaiting.approval",
    auditEvent: "STAGE_AWAITING_APPROVAL",
    durability: "canonical",
    category: "stage-lifecycle",
    requiredAttributes: ["Stage"],
    optionalAttributes: ["Artifacts", "Details", "Recovered", "Transaction Id"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.stage.revising",
    auditEvent: "STAGE_REVISING",
    durability: "canonical",
    category: "stage-lifecycle",
    requiredAttributes: ["Stage", "Revision count"],
    optionalAttributes: ["Feedback", "Recovered", "Transaction Id", "Presence Reservation Id"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.stage.completed",
    auditEvent: "STAGE_COMPLETED",
    durability: "canonical",
    category: "stage-lifecycle",
    requiredAttributes: ["Stage", "Details"],
    optionalAttributes: ["Artifacts", "Transaction Id", "Workflow", "Completion Instance", "Presence Reservation Id"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.stage.jumped",
    auditEvent: "STAGE_JUMPED",
    durability: "canonical",
    category: "stage-lifecycle",
    requiredAttributes: ["Direction", "Source", "Target", "Scope"],
    optionalAttributes: ["Details"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.stage.skipped",
    auditEvent: "STAGE_SKIPPED",
    durability: "canonical",
    category: "stage-lifecycle",
    requiredAttributes: ["Stage"],
    optionalAttributes: ["Reason"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.guard.exempted",
    auditEvent: "GUARD_EXEMPTED",
    durability: "canonical",
    category: "stage-lifecycle",
    requiredAttributes: ["Stage", "Evidence"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  // --- Session Events (5) ---
  {
    name: "amadeus.session.started",
    auditEvent: "SESSION_STARTED",
    durability: "canonical",
    category: "session",
    requiredAttributes: ["Source"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.session.resumed",
    auditEvent: "SESSION_RESUMED",
    durability: "canonical",
    category: "session",
    requiredAttributes: ["Source"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.session.compacted",
    auditEvent: "SESSION_COMPACTED",
    durability: "canonical",
    category: "session",
    requiredAttributes: ["Current Stage", "State Validity"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.session.ended",
    auditEvent: "SESSION_ENDED",
    durability: "canonical",
    category: "session",
    requiredAttributes: ["Reason"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.human.turn",
    auditEvent: "HUMAN_TURN",
    durability: "canonical",
    category: "session",
    requiredAttributes: [],
    optionalAttributes: ["Presence Reservation Id"],
    schemaVersion: 1,
  },
  // --- Initialization Events (3) ---
  {
    name: "amadeus.workspace.scaffolded",
    auditEvent: "WORKSPACE_SCAFFOLDED",
    durability: "canonical",
    category: "initialization",
    requiredAttributes: ["Details"],
    optionalAttributes: ["Request"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.workspace.scanned",
    auditEvent: "WORKSPACE_SCANNED",
    durability: "canonical",
    category: "initialization",
    requiredAttributes: ["Project Type", "Details"],
    optionalAttributes: ["Languages", "Frameworks", "Build System", "Nested Root", "Nested Candidates", "Submodules"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.workspace.initialised",
    auditEvent: "WORKSPACE_INITIALISED",
    durability: "canonical",
    category: "initialization",
    requiredAttributes: ["Details"],
    optionalAttributes: ["Request", "Scope", "Project Type", "Languages", "Frameworks", "Build System"],
    schemaVersion: 1,
  },
  // --- Navigation Events (5) ---
  {
    name: "amadeus.scope.changed",
    auditEvent: "SCOPE_CHANGED",
    durability: "canonical",
    category: "navigation",
    requiredAttributes: ["Old Scope", "New Scope"],
    optionalAttributes: ["Stage Count Delta", "Stages in Scope", "Depth"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.depth.changed",
    auditEvent: "DEPTH_CHANGED",
    durability: "canonical",
    category: "navigation",
    requiredAttributes: ["Old Depth", "New Depth"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.test.strategy.changed",
    auditEvent: "TEST_STRATEGY_CHANGED",
    durability: "canonical",
    category: "navigation",
    requiredAttributes: ["Old Strategy", "New Strategy"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.scope.detected",
    auditEvent: "SCOPE_DETECTED",
    durability: "canonical",
    category: "navigation",
    requiredAttributes: ["Detected scope", "Input text", "Source"],
    optionalAttributes: ["Matched keywords"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.plan.recomposed",
    auditEvent: "RECOMPOSED",
    durability: "canonical",
    category: "navigation",
    requiredAttributes: ["Scope", "Stages skipped", "Stages added", "Stages in Scope"],
    // "Workflow completion retracted": the prepared-completion stage this flip
    // invalidated by moving the terminal stage, or "none" (#3249). Optional so
    // RECOMPOSED rows emitted before the retraction existed stay valid.
    optionalAttributes: ["Workflow completion retracted"],
    schemaVersion: 1,
  },
  // --- Interaction Events (6) ---
  {
    name: "amadeus.decision.recorded",
    auditEvent: "DECISION_RECORDED",
    durability: "canonical",
    category: "interaction",
    requiredAttributes: ["Stage", "Decision"],
    optionalAttributes: ["Options", "Rationale"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.gate.approved",
    auditEvent: "GATE_APPROVED",
    durability: "canonical",
    category: "interaction",
    requiredAttributes: ["Stage"],
    optionalAttributes: ["User Input", "Grant Id", "Approval Provenance", "Swarm batch", "Transaction Id", "Presence Reservation Id"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.gate.rejected",
    auditEvent: "GATE_REJECTED",
    durability: "canonical",
    category: "interaction",
    requiredAttributes: ["Stage"],
    optionalAttributes: ["Feedback", "Recovered", "Transaction Id", "Presence Reservation Id"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.question.answered",
    auditEvent: "QUESTION_ANSWERED",
    durability: "canonical",
    category: "interaction",
    requiredAttributes: ["Stage", "Details"],
    // u3-question-route-observability (FR-3): the resolution-route attributes
    // are OPTIONAL so pre-u3 rows (and any legacy emitter) stay valid; readers
    // treat their absence as "route unknown (pre-u3)".
    optionalAttributes: ["Resolution Route", "Decision Id"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.delegated.approval",
    auditEvent: "DELEGATED_APPROVAL",
    durability: "canonical",
    category: "interaction",
    requiredAttributes: ["Stage", "Issuer Space", "Issuer Intent", "Issuer Shard", "Issuer Human Ts"],
    optionalAttributes: ["User Input", "Grant Id"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.delegated.rejection",
    auditEvent: "DELEGATED_REJECTION",
    durability: "canonical",
    category: "interaction",
    requiredAttributes: ["Stage", "Issuer Space", "Issuer Intent", "Issuer Shard", "Issuer Human Ts"],
    optionalAttributes: ["Feedback"],
    schemaVersion: 1,
  },
  // --- Standing Delegation Grants (3) ---
  {
    name: "amadeus.grant.issued",
    auditEvent: "GRANT_ISSUED",
    durability: "canonical",
    category: "grant",
    requiredAttributes: ["Grant Id", "Scope", "Expires At", "Includes Phase Boundary", "Issuer Space", "Issuer Intent", "Issuer Shard", "Issuer Human Ts"],
    optionalAttributes: ["User Input"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.grant.revoked",
    auditEvent: "GRANT_REVOKED",
    durability: "canonical",
    category: "grant",
    requiredAttributes: ["Grant Id", "Issuer Space", "Issuer Intent", "Issuer Shard", "Issuer Human Ts"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.gate.authorization.selected",
    auditEvent: "GATE_AUTHORIZATION_SELECTED",
    durability: "canonical",
    category: "grant",
    requiredAttributes: ["Route Id", "Stage", "Grant Id"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  // --- Artifact Events (4) ---
  {
    name: "amadeus.artifact.created",
    auditEvent: "ARTIFACT_CREATED",
    durability: "canonical",
    category: "artifact",
    requiredAttributes: ["Tool", "File", "Context"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.artifact.updated",
    auditEvent: "ARTIFACT_UPDATED",
    durability: "canonical",
    category: "artifact",
    requiredAttributes: [],
    optionalAttributes: ["Tool", "File", "Context", "Artifact", "TransactionId", "Revision", "TransitionKind", "Digest", "TriggerBoundary", "Reconciliation", "OperationId", "Classification", "coalescedWarning", "repairProof"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.artifact.reused",
    auditEvent: "ARTIFACT_REUSED",
    durability: "canonical",
    category: "artifact",
    requiredAttributes: ["Stage", "Decision", "Artifacts"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.artifact.attested",
    auditEvent: "ARTIFACT_ATTESTED",
    durability: "canonical",
    category: "artifact",
    requiredAttributes: [
      "Attestation Id", "Intent", "Intent UUID", "Record", "Bolt", "Unit",
      "Repository", "PR", "Local Head", "Remote Head", "PR Head", "Content Digest",
    ],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  // --- Subagent Events (2) ---
  {
    // The opening half of a subagent's interval (U4). `Purpose` is the first
    // line of the dispatch prompt, truncated by the emitter — optional because
    // only the harnesses whose start seam carries the prompt can supply it.
    name: "amadeus.subagent.started",
    auditEvent: "SUBAGENT_STARTED",
    durability: "canonical",
    category: "subagent",
    requiredAttributes: ["Agent Type"],
    // `Type Verdict` / `Model` / `Model Source` are the #2279 attribution
    // (U1/U2) — optional because the checks are advisory and skip themselves
    // rather than block the write, and an unresolved model records NOTHING
    // (ADR-5: absence is the record of absence).
    optionalAttributes: ["Agent ID", "Purpose", "Type Verdict", "Model", "Model Source"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.subagent.completed",
    auditEvent: "SUBAGENT_COMPLETED",
    durability: "canonical",
    category: "subagent",
    requiredAttributes: ["Agent Type"],
    // `Type Verdict` is where the Agent Type sits relative to the allowed set
    // (#2279) — optional because the check is advisory and skips itself rather
    // than block the write. `Model` / `Model Source` are the effective-model
    // attribution (ADR-3) — written as a pair or not at all (ADR-5).
    optionalAttributes: ["Agent ID", "Message", "Type Verdict", "Model", "Model Source"],
    schemaVersion: 1,
  },
  // --- Utility Events (1) ---
  {
    name: "amadeus.health.checked",
    auditEvent: "HEALTH_CHECKED",
    durability: "canonical",
    category: "utility",
    requiredAttributes: ["Request", "Details"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  // --- Error/Recovery Events (2) ---
  {
    // FR-EVT-7: the canonical failure event, emitted separately from the
    // telemetry-classified exception span event.
    name: "amadeus.operation.failed",
    auditEvent: "ERROR_LOGGED",
    durability: "canonical",
    category: "error-recovery",
    requiredAttributes: ["Tool", "Command", "Error"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.recovery.completed",
    auditEvent: "RECOVERY_COMPLETED",
    durability: "canonical",
    category: "error-recovery",
    requiredAttributes: ["Choice", "Current Stage"],
    // `Reason` carries the caller-authorization denial a session-takeover
    // repaired; the compaction-acknowledgement recovery has no such cause and
    // omits it.
    optionalAttributes: ["Reason"],
    schemaVersion: 1,
  },
  // --- Construction Bolt Events (5) ---
  {
    // The per-unit `run-stage` path's own outcome row (#3099). The Unit pool
    // stream is the swarm path's ledger; a units-generation scope that never
    // swarms dispatches unit by unit through the engine, and this is where that
    // route records a Unit's settled outcome. Deliberately NOT folded into the
    // pool's batchId namespace: the pool keeps its single-writer contract.
    name: "amadeus.unit.outcome.settled",
    auditEvent: "UNIT_OUTCOME_SETTLED",
    durability: "canonical",
    category: "bolt",
    requiredAttributes: ["Stage", "Unit", "Batch", "Outcome", "Idempotency Key"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.bolt.started",
    auditEvent: "BOLT_STARTED",
    durability: "canonical",
    category: "bolt",
    requiredAttributes: ["Bolt names", "Batch number", "Walking skeleton"],
    optionalAttributes: ["Bolt slug", "Stage", "Attempt Id", "Batch Id"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.bolt.completed",
    auditEvent: "BOLT_COMPLETED",
    durability: "canonical",
    category: "bolt",
    requiredAttributes: ["Bolt names", "Batch number"],
    optionalAttributes: ["Bolt slug", "Stage", "Attempt Id", "Batch Id", "Outcome", "Reason"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.bolt.failed",
    auditEvent: "BOLT_FAILED",
    durability: "canonical",
    category: "bolt",
    requiredAttributes: ["Failed Bolt", "Error summary"],
    // `Reason` distinguishes an explicit abort from a run failure; `Succeeded
    // siblings` is carried by halt-and-ask flows (tools/amadeus-bolt.ts fail).
    optionalAttributes: ["Bolt slug", "Reason", "Succeeded siblings", "Stage", "Attempt Id", "Batch Id"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.autonomy.mode.set",
    auditEvent: "AUTONOMY_MODE_SET",
    durability: "canonical",
    category: "bolt",
    // `Field` names WHICH projection row carried the value — the generic
    // `amadeus-state set` can write any of the three fields the autonomy
    // transaction owns, and without the name a row reading only `Mode: gated`
    // cannot say whether the scheduling projection or the intent mode moved
    // (#2483). Optional: the legacy set-autonomy rows this event was minted for
    // carried `Mode` alone.
    requiredAttributes: ["Mode"],
    optionalAttributes: ["Field"],
    schemaVersion: 1,
  },
  // --- Worktree (7) ---
  {
    name: "amadeus.worktree.created",
    auditEvent: "WORKTREE_CREATED",
    durability: "canonical",
    category: "worktree",
    requiredAttributes: ["Bolt slug", "Worktree path", "Branch name", "Base branch"],
    optionalAttributes: ["Base SHA"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.worktree.merged",
    auditEvent: "WORKTREE_MERGED",
    durability: "canonical",
    category: "worktree",
    requiredAttributes: ["Bolt slug", "Worktree path", "Target branch", "Strategy"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.worktree.discarded",
    auditEvent: "WORKTREE_DISCARDED",
    durability: "canonical",
    category: "worktree",
    requiredAttributes: ["Bolt slug", "Worktree path", "Reason"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.state.forked",
    auditEvent: "STATE_FORKED",
    durability: "canonical",
    category: "worktree",
    requiredAttributes: ["Bolt slug", "Worktree path", "Source state hash", "Target state hash"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.state.merged",
    auditEvent: "STATE_MERGED",
    durability: "canonical",
    category: "worktree",
    requiredAttributes: ["Bolt slug", "Worktree path", "Source state hash", "Target state hash", "Conflict resolution"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.audit.forked",
    auditEvent: "AUDIT_FORKED",
    durability: "canonical",
    category: "worktree",
    requiredAttributes: ["Bolt slug", "Source Audit Hash", "Fork Boundary"],
    optionalAttributes: ["Reentrant"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.audit.merged",
    auditEvent: "AUDIT_MERGED",
    durability: "canonical",
    category: "worktree",
    requiredAttributes: ["Bolt slug", "Entries Merged", "Source Audit Hash", "Fork Boundary"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  // --- Practices (4) ---
  {
    name: "amadeus.practices.discovered",
    auditEvent: "PRACTICES_DISCOVERED",
    durability: "canonical",
    category: "practices",
    requiredAttributes: [],
    optionalAttributes: ["Sources Scanned", "Drafts"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.practices.affirmed",
    auditEvent: "PRACTICES_AFFIRMED",
    durability: "canonical",
    category: "practices",
    requiredAttributes: [],
    optionalAttributes: ["Affirming User", "Sections Written", "Mandated Rules Appended", "Forbidden Rules Appended", "Timestamp"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.practices.override",
    auditEvent: "PRACTICES_OVERRIDE",
    durability: "canonical",
    category: "practices",
    requiredAttributes: ["Reason"],
    optionalAttributes: ["Timestamp", "Practices Stance", "Bolt-Plan Marker", "Bolt slug"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.practices.section.empty",
    auditEvent: "PRACTICES_SECTION_EMPTY",
    durability: "canonical",
    category: "practices",
    requiredAttributes: [],
    // The names the emitter actually passes (`--field "Section: ..."`,
    // `--field "Fallback: ..."`), not the longer prose the docs used to carry.
    // Redaction is default-deny over this vocabulary, so a name that does not
    // match here is dropped from the row without a sound.
    optionalAttributes: ["Section", "Fallback"],
    schemaVersion: 1,
  },
  // --- Merge Dispatch (3) ---
  {
    name: "amadeus.merge.dispatch.invoked",
    auditEvent: "MERGE_DISPATCH_INVOKED",
    durability: "canonical",
    category: "merge-dispatch",
    requiredAttributes: ["Bolt slug", "Practices section excerpt"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.merge.dispatch.returned",
    auditEvent: "MERGE_DISPATCH_RETURNED",
    durability: "canonical",
    category: "merge-dispatch",
    requiredAttributes: ["Bolt slug", "Strategy", "Target branch", "Confidence", "Notes"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.merge.dispatch.fallback",
    auditEvent: "MERGE_DISPATCH_FALLBACK",
    durability: "canonical",
    category: "merge-dispatch",
    requiredAttributes: ["Bolt slug", "Fallback reason", "Defaults applied"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  // --- Delegated Merge Provenance (1) --- (C11/FR-9: record-only fact that a
  // team.md standing-ruling-delegated merge happened; NOT a merge-dispatch
  // strategy selection and NOT a Bolt-internal worktree merge.)
  {
    name: "amadeus.delegated.merge",
    auditEvent: "DELEGATED_MERGE_RECORDED",
    durability: "canonical",
    category: "merge-provenance",
    requiredAttributes: ["Standing Ruling Ref", "CI Conclusion", "Converged Digest"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  // --- Sensor Events (5) ---
  {
    name: "amadeus.sensor.fired",
    auditEvent: "SENSOR_FIRED",
    durability: "canonical",
    category: "sensor",
    requiredAttributes: ["Fire id", "Sensor ID", "Stage slug", "Output path"],
    optionalAttributes: ["Output digest"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.sensor.passed",
    auditEvent: "SENSOR_PASSED",
    durability: "canonical",
    category: "sensor",
    requiredAttributes: ["Fire id", "Sensor ID", "Stage slug", "Output path", "Duration ms"],
    optionalAttributes: ["Note", "Output digest"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.sensor.failed",
    auditEvent: "SENSOR_FAILED",
    durability: "canonical",
    category: "sensor",
    requiredAttributes: ["Fire id", "Sensor ID", "Stage slug", "Output path", "Detail path", "Findings count"],
    optionalAttributes: ["Output digest"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.sensor.budget.override",
    auditEvent: "SENSOR_BUDGET_OVERRIDE",
    durability: "canonical",
    category: "sensor",
    requiredAttributes: ["Fire id", "Sensor ID", "Stage slug", "Output path", "Cap layer", "Cap value", "Observed value"],
    optionalAttributes: ["Output digest"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.guardrail.loaded",
    auditEvent: "GUARDRAIL_LOADED",
    durability: "canonical",
    category: "sensor",
    requiredAttributes: ["Scope", "Path", "Rule count"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  // --- Learning Loop (3) ---
  {
    name: "amadeus.memory.empty",
    auditEvent: "MEMORY_EMPTY",
    durability: "canonical",
    category: "learning",
    requiredAttributes: ["Stage"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.rule.learned",
    auditEvent: "RULE_LEARNED",
    durability: "canonical",
    category: "learning",
    requiredAttributes: ["Stage", "Candidate-ID", "Destination", "Heading", "Source"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.sensor.proposed",
    auditEvent: "SENSOR_PROPOSED",
    durability: "canonical",
    category: "learning",
    requiredAttributes: ["Stage", "Candidate-ID", "Sensor ID", "Manifest path", "Matches", "Destinations", "Source"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    // unit s13-zero (ADR-6, R-1/R-2/R-5): the sole machine-checkable basis
    // for a §13 "0 件" confirmation — the surfaceDigest bound at surface
    // time. Emitted only when confirmZeroCandidates mints a ZeroReceipt.
    name: "amadeus.learning.zero_confirmed",
    auditEvent: "LEARNING_ZERO_CONFIRMED",
    durability: "canonical",
    category: "learning",
    requiredAttributes: ["Stage", "Surface Digest", "Confirmed At"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    // unit s13-zero (ADR-6, R-3/R-4/R-5): the conductor's additive-only
    // candidate, gated on disk evidence. "Surface Digest" ties the addition
    // to the surface snapshot it was layered on top of.
    name: "amadeus.learning.candidate_added",
    auditEvent: "LEARNING_CANDIDATE_ADDED",
    durability: "canonical",
    category: "learning",
    requiredAttributes: ["Stage", "Candidate-ID", "Disk Evidence Path", "Surface Digest"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  // --- Swarm (7) ---
  {
    name: "amadeus.unit_pool.event_set.committed",
    auditEvent: "UNIT_POOL_EVENT_SET_COMMITTED",
    durability: "canonical",
    category: "swarm",
    requiredAttributes: ["Batch Id", "Event Set Id", "Event Set"],
    optionalAttributes: ["Stage"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.swarm.started",
    auditEvent: "SWARM_STARTED",
    durability: "canonical",
    category: "swarm",
    requiredAttributes: ["Batch number", "Unit names", "Concurrency cap"],
    // "Plan generation" binds the row to the compiled Bolt DAG it ran under, so
    // approve-time reconciliation cannot count a previous plan's fan-out as this
    // plan's (#1953 / FR-5a). Optional: a workflow with no compiled DAG has no
    // generation to stamp, and the verifier fails closed on the absence.
    optionalAttributes: ["Plan generation"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.swarm.unit.converged",
    auditEvent: "SWARM_UNIT_CONVERGED",
    durability: "canonical",
    category: "swarm",
    requiredAttributes: ["Batch number", "Unit name"],
    optionalAttributes: ["Plan generation"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.swarm.unit.failed",
    auditEvent: "SWARM_UNIT_FAILED",
    durability: "canonical",
    category: "swarm",
    requiredAttributes: ["Batch number", "Unit name", "Reason"],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.swarm.baton.returned",
    auditEvent: "SWARM_BATON_RETURNED",
    durability: "canonical",
    category: "swarm",
    requiredAttributes: ["Batch number", "Unit name", "Reason"],
    optionalAttributes: ["Stage", "Attempt Id"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.swarm.completed",
    auditEvent: "SWARM_COMPLETED",
    durability: "canonical",
    category: "swarm",
    requiredAttributes: ["Batch number", "Converged count", "Failed count"],
    optionalAttributes: ["Plan generation"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.swarm.degraded",
    auditEvent: "SWARM_DEGRADED",
    durability: "canonical",
    category: "swarm",
    requiredAttributes: ["Batch number", "Requested driver", "Fallback driver"],
    optionalAttributes: ["Plan generation"],
    schemaVersion: 1,
  },
  // --- Telemetry (never the audit journal, FR-EXP-4) ---
  {
    name: "amadeus.diagnostic.note",
    auditEvent: null,
    durability: "telemetry",
    category: "telemetry",
    requiredAttributes: [],
    optionalAttributes: [],
    schemaVersion: 1,
  },
  {
    // FR-EVT-7: the recordException() span event. Telemetry by invariant —
    // reclassifying it canonical is a drift-guard violation (BR-3).
    name: EXCEPTION_SPAN_EVENT_NAME,
    auditEvent: null,
    durability: "telemetry",
    category: "telemetry",
    requiredAttributes: ["exception.message"],
    // The OTel semantic-convention companions. Optional, not required: a
    // non-Error thrown value has neither, and an Error may carry no stack, so
    // requiring them would turn a recorded failure into a second failure.
    // Listing them here is also what admits them through the default-deny
    // redaction policy, which derives its safe keys from this vocabulary.
    optionalAttributes: ["exception.type", "exception.stacktrace"],
    schemaVersion: 1,
  },
] as const satisfies readonly EventDef[];

// Compile-time layer of the drift guard (BR-2): derived from the registry
// table itself, so the union and the table cannot drift apart.
export type RegisteredEventName = (typeof REGISTERED_EVENTS)[number]["name"];

// The canonical audit vocabulary derived from the registry — drift-guard set
// (b). Every canonical def maps to exactly one v1 audit event type.
export function canonicalAuditEvents(): string[] {
  return REGISTERED_EVENTS.filter((d) => d.durability === "canonical").map((d) => d.auditEvent as string);
}

// Registry lookup. An unregistered name is an INVARIANT violation (the caller
// emitted outside the registered vocabulary), not a write failure — it throws
// without touching the fatal latch. The parameter is typed RegisteredEventName
// so typed callers are excluded at compile time; the runtime throw is the
// backstop for dynamically-typed paths (the api-logs bridge, shell callers).
export function getEventDef(name: RegisteredEventName): EventDef {
  const def = REGISTERED_EVENTS.find((d) => d.name === name);
  if (def === undefined) {
    throw new Error(`unregistered event name: ${name} — invariant violation (FR-EVT-1)`);
  }
  return def;
}

// Reverse lookup for the migration adapter (BR-7): map a legacy v1 audit
// eventType to its registered def. An unmappable eventType is a drift-guard
// violation and throws — no ambiguous fallback.
export function getEventDefByAuditEvent(auditEvent: string): EventDef {
  const def = REGISTERED_EVENTS.find((d) => d.auditEvent === auditEvent);
  if (def === undefined) {
    throw new Error(`unmapped audit event type: ${auditEvent} — drift guard violation (BR-7)`);
  }
  return def;
}

// Runtime self-consistency (VER-1, used with the compile-time and unit-test
// layers): names unique, audit events unique, durability consistent with the
// auditEvent mapping, categories present, and the canonical cardinality
// pinned — an emptied registry fails instead of passing vacuously.
// The set and its expected cardinality are parameters, defaulting to the
// shipped registry: that registry is consistent by construction, so every
// rejection below is only provable against a supplied set. The parameter type
// widens to EventDef so the checks are not narrowed away by the const-asserted
// literal types.
export function assertRegistryConsistent(events: readonly EventDef[] = REGISTERED_EVENTS, expectedCanonical: number = EXPECTED_CANONICAL_COUNT): void {
  const names = new Set<string>();
  const auditEvents = new Set<string>();
  for (const def of events) {
    assertDefConsistent(def, names, auditEvents);
  }
  if (auditEvents.size !== expectedCanonical) {
    throw new Error(`canonical registry cardinality drift: expected ${expectedCanonical}, got ${auditEvents.size} (VER-1)`);
  }
}

function assertDefConsistent(def: EventDef, names: Set<string>, auditEvents: Set<string>): void {
  if (names.has(def.name)) {
    throw new Error(`duplicate event name in registry: ${def.name}`);
  }
  names.add(def.name);
  if (def.durability === "canonical") {
    assertCanonicalDefConsistent(def, auditEvents);
    return;
  }
  if (def.auditEvent !== null) {
    throw new Error(`telemetry event mapped to the audit journal: ${def.name}`);
  }
}

function assertCanonicalDefConsistent(def: EventDef, auditEvents: Set<string>): void {
  if (def.auditEvent === null) {
    throw new Error(`canonical event without an audit mapping: ${def.name}`);
  }
  if (auditEvents.has(def.auditEvent)) {
    throw new Error(`duplicate audit event mapping in registry: ${def.auditEvent}`);
  }
  auditEvents.add(def.auditEvent);
  if (def.category === "telemetry") {
    throw new Error(`canonical event misclassified as telemetry category: ${def.name}`);
  }
}
