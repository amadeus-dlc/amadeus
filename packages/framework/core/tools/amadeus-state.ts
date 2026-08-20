import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import { appendLifecycleAuditEntryUnlocked, escapeAuditValue } from "./amadeus-audit.ts";
import type { AwaitCompletionDirective } from "./amadeus-directive.ts";
import {
  isJournalEntryV2,
  JOURNAL_SCHEMA_VERSION,
  parseJournalLine,
  serializeJournalEntry,
  splitJournalLines,
} from "./amadeus-journal.ts";
import {
  activeIntent,
  auditCloneId,
  clearActiveIntentCursor,
  activeSpace,
  auditBlockField,
  splitAuditRecords,
  auditFilePath,
  auditShardDir,
  auditShardName,
  auditShards,
  appendSlug,
  appendUnderHeading,
  type CheckboxState,
  codekbDir,
  countCheckboxes,
  docsOnlyDeclaration,
  emitError,
  errorMessage,
  extractMarkdownSection,
  fieldExists,
  findStageBySlug,
  findAllEvents,
  firstInScopeStageOfPhase,
  getField,
  loadStageGraph,
  humanActedSinceGate,
  humanPresenceGuardDisabled,
  resolveGateResolutionPresence,
  type GateApprovalProvenance,
  isAutonomousMode,
  isoTimestamp,
  KNOWN_CODEKB_STAGES,
  effectivePlanAction,
  loadScopeMapping,
  listIntents,
  guardIntentOperation,
  renderIntentOperationRejection,
  resolveIntentOperationTargetLocked,
  nextInScopeStage,
  normalizeUnitKind,
  normalizeWorktreeSlug,
  ownPhase,
  PHASE_NUMBERS,
  parseBoltDag,
  parseCheckboxes,
  parseScopedCheckboxes,
  parseRefsList,
  parseStateStageSuffixes,
  readAllAuditShards,
  readCurrentSessionId,
  readIntentRegistry,
  readStateFile,
  rebuildCompletedFieldFromState,
  recordDirMatches,
  requireChanged,
  recoverBoltDag,
  recoverGateRevision,
  type GateRevisionRecovery,
  type RevisionEvidenceEvent,
  checkQuestionsEvidence,
  QUESTIONS_EVIDENCE_CUTOFF_YYMMDD,
  recordDir,
  relativeMemoryPath,
  relativeRecordDir,
  runtimeGraphPath,
  removeField,
  removeSlug,
  resolveOperatingMode,
  resolveProjectDir,
  resolveStage,
  setCheckbox,
  StateMutationTargetError,
  setField,
  setFieldStrict,
  setIntentDocsOnly,
  parseDeclaredUnitsArg,
  setOrInsertField,
  writeDegradeUnitDeclaration,
  type ScopedCheckboxLine,
  type StageEntry,
  stageLineKey,
  stageIndex,
  stagesInScope,
  transitionIntentStatusLocked,
  validateStageState,
  withLockedIntentRegistry,
  type IntentLifecycleAuditEvent,
  type IntentLifecycleVerb,
  runIntentLifecycleTransactionLocked,
  withIntentLifecyclePreflight,
  unitDependencyPath,
  type UnitKind,
  validScopes,
  withAuditLock,
  worktreeDocsDir,
  worktreePath,
  worktreeStateFilePath,
  writeStateFile,
  writeFileAtomic,
} from "./amadeus-lib.js";
import {
  classifyApprovalAuthority,
} from "./amadeus-approval-authorization.ts";
import { emitAuditEvent } from "../otel/audit-emit.ts";
import { ensureOtelBootstrap } from "../otel/bootstrap.ts";
import { assertMutationAllowed } from "../otel/fatal-latch.ts";
import { observeSubprocessSpan } from "../otel/subprocess-span.ts";
import {
  BOLT_CONTEXT_MARKER,
  boltContextKind,
  initProcessObservability,
  writeBoltContextMarker,
} from "./amadeus-observability.ts";
import {
  consumePresenceReservation,
  readPresenceReservation,
  type PresenceReservation,
  targetedApprovalEvidence,
  verifyMintedPresenceReservation,
} from "./amadeus-presence-reservation.ts";
import {
  loadGraph,
  memoryDirFor,
  parseConstructionIteration,
  requiredArtifactsForUnit,
} from "./amadeus-graph.ts";
import { KNOWN_HARNESS_DIRS } from "./amadeus-harness.js";
import { detectHarnessTypeForAuthorization } from "./amadeus-harness.ts";
import { autonomyDigest, declaredFullAutonomy, isMilestoneInteraction } from "./amadeus-intent-autonomy.ts";
import {
  buildAutoDecisionSummary,
  formatSummaryBuildError,
  writeAutoDecisionSummaryMarkdown,
} from "./amadeus-completion-report.ts";
import {
  commitProductionIntentCompletion,
  commitProductionStageGateDecision,
  productionStageAutonomy,
  recordAutonomyRefusalAtGateOpen,
  type ProductionAutonomyContext,
  type ProductionStageAutonomyInput,
} from "./amadeus-intent-autonomy-production.ts";
import {
  authorizeMainConductor,
  callerAuthorizationError,
  SESSION_TAKEOVER_VERB,
} from "./amadeus-caller-authorization.ts";
import {
  applySessionTakeover,
  parseSessionTakeoverArgs,
  planSessionTakeover,
  readSessionTakeoverFacts,
} from "./amadeus-session-takeover.ts";
import { requiredPluginStagesForScope, resolveAmadeusConfig } from "./amadeus-config.ts";
import { parseMirrorStateDocument } from "./amadeus-mirror-state-codec.ts";
import { workflowCompletionSettlement } from "./amadeus-mirror-policy.ts";
import {
  authorizeWorkflowCompletion,
  WorkflowCompletionNotSettledError,
  prepareWorkflowCompletion,
  type WorkflowCompletionPreparation,
  workflowCompletionPreparation,
} from "./amadeus-workflow-completion.ts";
import type { GoalReconciliationReceipt } from "./amadeus-goal-reconciliation.ts";
import {
  evaluateLifecycleGuards,
  formatGuardRefusal,
  guardAllowed,
  guardDenied,
  guardNotApplicable,
  guardReceipt,
  guardUnknown,
  type LifecycleGuardAdapter,
  type LifecycleGuardDecision,
  type LifecycleGuardVerdict,
} from "./amadeus-lifecycle-guard.ts";

// All valid checkbox states (lib.ts adds [?] awaiting-approval and [R] revising)
const VALID_CHECKBOX_STATES: CheckboxState[] = [
  "pending",
  "in-progress",
  "awaiting-approval",
  "revising",
  "completed",
  "skipped",
];

const PRACTICES_MANAGED_BEGIN = "<!-- amadeus:practices-promote:BEGIN -->";
const PRACTICES_MANAGED_END = "<!-- amadeus:practices-promote:END -->";
const PRACTICES_TEAM_SECTIONS = [
  "## Way of Working",
  "## Walking Skeleton",
  "## Testing Posture",
  "## Deployment",
  "## Code Style",
] as const;

function isCheckboxState(s: string): s is CheckboxState {
  return (VALID_CHECKBOX_STATES as readonly string[]).includes(s);
}

// Phase Progress roll-up field labels. The "## Phase Progress" section renders
// one bold-labelled line per phase (`- **Inception**: Verified`), while every
// phase-boundary transition carries the lowercase `stage.phase` value. This
// mapping keeps the two in sync. Declared at module top for the same TDZ reason
// as the other shared constants. Object.keys() order is the canonical phase
// order, so a multi-phase jump can enumerate the phases it closes in sequence.
export const PHASE_PROGRESS_FIELD: Readonly<Record<string, string>> = {
  initialization: "Initialization",
  ideation: "Ideation",
  inception: "Inception",
  construction: "Construction",
  operation: "Operation",
};

export type PhaseProgressStatus = "Pending" | "Active" | "Verified" | "Skipped";

// setPhaseProgress flips one phase's Phase Progress roll-up field to a status,
// keeping the "## Phase Progress" section in lock-step with the PHASE_* audit
// emissions in the SAME transaction. The bug this guards against: a
// PHASE_VERIFIED audit row fired while the field stayed at its prior value
// (Active/Pending) forever, since nothing else ever revisits it. General form
// so the four phase-transition sites (jump, advance, finalize, complete-workflow)
// can all drive the roll-up through one seam. Defensive no-op for an unknown
// phase name.
export function setPhaseProgress(
  content: string,
  phase: string,
  status: PhaseProgressStatus,
): string {
  const field = PHASE_PROGRESS_FIELD[phase];
  if (!field) return content;
  return setField(content, field, status);
}

// markPhaseVerified restores the pre-restart lineage contract: flip a phase's
// roll-up field to "Verified". Thin wrapper over setPhaseProgress so callers
// that only verify read at the intended altitude.
export function markPhaseVerified(content: string, phase: string): string {
  return setPhaseProgress(content, phase, "Verified");
}

// --- Phase-check artifact gate (Issue #886, restoring #464/#479) -------------
//
// A phase boundary's PHASE_VERIFIED / markPhaseVerified flip must not fire until
// the phase it closes has written its verification/phase-check-<phase>.md — the
// same "evidence before completion" principle as verifyStageArtifacts, at the
// phase altitude. This gate was implemented in the pre-restart lineage
// (8cf816138) and lost across the restart that rebuilt state.ts; only the
// PHASE_VERIFIED flip wiring (#880/#836) was restored, leaving the boundary
// completion ungated. Scoped to the 3 phases whose upstream stage definitions
// actually produce a phase-check artifact (ideation's approval-handoff,
// inception's delivery-planning, construction's ci-pipeline). Initialization and
// Operation have no stage that ever writes one, so gating them would refuse
// every ordinary workflow's first/terminal boundary with no way to satisfy it.
export const MIRROR_BOUNDARY_PHASES = [
  "ideation",
  "inception",
  "construction",
] as const;
export const PHASE_CHECK_REQUIRED_PHASES: ReadonlySet<string> = new Set(
  MIRROR_BOUNDARY_PHASES,
);

// ---------------------------------------------------------------------------
// LIFECYCLE GUARD REGISTRIES (#2771). The built-in adapters this tool commits
// behind, one frozen array per checkpoint. There is no registration API: a
// project cannot remove a system-invariant guard, and the only user-space policy
// that reaches a checkpoint arrives through an adapter that reads it (the
// blocking-sensor policy and the project's sensor manifests).
//
// Declared at module top, ABOVE the `import.meta.main` dispatch, for the same
// reason HARNESS_DOC_DIRS is: the dispatch runs at top level, so a const
// declared lower in the file would be in its temporal dead zone when an
// approve/advance dispatch reaches a guard. The `evaluate` members are function
// declarations, which hoist, so each policy body still lives beside the code it
// judges.
// ---------------------------------------------------------------------------

// Each context is read-only and carries no writer: an adapter receives what it
// needs to judge a transition and no means to perform one.
export type StageCompletionGuardContext = {
  readonly pd: string;
  readonly stage: VerifiableStage;
};

export type PhaseTransitionGuardContext = {
  readonly pd: string;
  readonly phase: string;
};

// Workflow completion is judged in two rounds, so it has two contexts: the
// preparation round sees the state document, the authorization round sees the
// resolved completion instance and Intent record.
export type WorkflowPreparationGuardContext = {
  readonly pd: string;
  readonly content: string;
  readonly completedSlug: string;
  readonly requestedInstance: string | undefined;
};

export type WorkflowAuthorizationGuardContext = {
  readonly pd: string;
  readonly content: string;
  readonly completedSlug: string;
  readonly completionInstance: string;
  readonly recordDir: string | null;
};

// FOUR handlers mark a stage [x] — approve, advance, finalize and
// complete-workflow — each under its own lock, with no shared transition
// function between them. A guard wired into only one of them leaves the other
// three an unguarded rubber-stamp backdoor on the direct-CLI surface, so every
// completion guard belongs in this array rather than at the individual call
// sites (issue #2671 item (c) shipped the sensor gate on approve alone;
// verifyStageCompletionGuards is the fix for that gap and this array is where
// any fifth guard goes).
//
// Order is load-bearing and each layer asks a narrower question than the last:
// the artifact policy answers "did the stage produce anything", then the review
// policy asks whether that work was reviewed, and only then is "is the blocking
// sensor's verdict on those artifacts clean" meaningful — a sensor complaint
// about a stage that produced nothing names the wrong fault. The artifact-shaped
// policies and the sensor policy carry independent bypass switches
// (AMADEUS_SKIP_ARTIFACT_GUARD vs AMADEUS_SKIP_BLOCKING_SENSOR_GUARD): a fixture
// that wants artifacts unchecked does not thereby want sensor verdicts
// unchecked, so neither disables the other.
export const STAGE_COMPLETION_GUARDS: readonly LifecycleGuardAdapter<StageCompletionGuardContext>[] =
  Object.freeze([
    {
      id: "stage-completion.artifacts",
      checkpoint: "stage-completion",
      order: 10,
      evaluate: evaluateStageArtifacts,
    },
    {
      id: "stage-completion.unit-review",
      checkpoint: "stage-completion",
      order: 20,
      evaluate: evaluateUnitReview,
    },
    {
      id: "stage-completion.blocking-sensors",
      checkpoint: "stage-completion",
      order: 30,
      evaluate: evaluateBlockingSensorGuard,
    },
  ]);

// FIVE paths cross a phase boundary — advance, finalize, complete-workflow,
// approve, and jump's forward crossing — and all of them evaluate this registry.
export const PHASE_TRANSITION_GUARDS: readonly LifecycleGuardAdapter<PhaseTransitionGuardContext>[] =
  Object.freeze([
    {
      id: "phase-transition.phase-check-artifact",
      checkpoint: "phase-transition",
      order: 10,
      evaluate: evaluatePhaseCheckArtifact,
    },
  ]);

// Workflow completion evaluates in two rounds because its context is built in
// two steps: the preparation round judges the state document alone, then the
// completion instance and the Intent record are resolved and the authorization
// round judges those. Splitting the rounds keeps the order the handler had
// before the migration — a prepared-completion mismatch is reported ahead of a
// Goal receipt question about an instance that mismatch already invalidated.
export const WORKFLOW_COMPLETION_PREPARATION_GUARDS: readonly LifecycleGuardAdapter<WorkflowPreparationGuardContext>[] =
  Object.freeze([
    {
      id: "workflow-completion.prepared",
      checkpoint: "workflow-completion",
      order: 10,
      evaluate: evaluatePreparedWorkflowCompletion,
    },
    {
      id: "workflow-completion.mandatory-plugin-stages",
      checkpoint: "workflow-completion",
      order: 20,
      evaluate: evaluateMandatoryPluginStages,
    },
  ]);

export const WORKFLOW_COMPLETION_GOAL_RECEIPT_POLICY = "workflow-completion.goal-receipt";

export const WORKFLOW_COMPLETION_AUTHORIZATION_GUARDS: readonly LifecycleGuardAdapter<
  WorkflowAuthorizationGuardContext,
  GoalReconciliationReceipt
>[] = Object.freeze([
  {
    id: "workflow-completion.record-resolution",
    checkpoint: "workflow-completion",
    order: 10,
    evaluate: evaluateCompletionRecordResolution,
  },
  {
    id: WORKFLOW_COMPLETION_GOAL_RECEIPT_POLICY,
    checkpoint: "workflow-completion",
    order: 20,
    evaluate: evaluateGoalReconciliationReceipt,
  },
]);

// Refuse a state transition the Lifecycle Guard Runtime blocked. Every migrated
// checkpoint funnels here, so the refusal shape is one decision: `error()` exits
// before any writeStateFile, which is what makes an in-memory content flip
// discardable rather than a half-written transition.
function refuseBlockedTransition<P>(decision: LifecycleGuardDecision<P>): void {
  if (decision.kind === "allowed") return;
  error(formatGuardRefusal(decision.refusal));
}
export type MirrorBoundaryPhase = (typeof MIRROR_BOUNDARY_PHASES)[number];
export type MirrorBoundaryReceiptStatus = "pending" | "completed";
export type MirrorBoundaryReceipts = Partial<
  Record<MirrorBoundaryPhase, MirrorBoundaryReceiptStatus>
>;

export function parseMirrorBoundaryReceipts(
  raw: string | null,
): MirrorBoundaryReceipts {
  if (raw === null || raw.trim() === "") return {};
  for (const phase of MIRROR_BOUNDARY_PHASES) {
    const escaped = phase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = raw.match(new RegExp(`"${escaped}"\\s*:`, "g"));
    if (matches !== null && matches.length > 1) {
      throw new Error(
        `Mirror Boundary Receipts has duplicate phase "${phase}"`,
      );
    }
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch (cause) {
    throw new Error(
      `Mirror Boundary Receipts is invalid JSON: ${errorMessage(cause)}`,
    );
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Mirror Boundary Receipts must be a JSON object");
  }
  const receipts: MirrorBoundaryReceipts = {};
  for (const [phase, status] of Object.entries(value)) {
    if (!(MIRROR_BOUNDARY_PHASES as readonly string[]).includes(phase)) {
      throw new Error(`Mirror Boundary Receipts has unknown phase "${phase}"`);
    }
    if (status !== "pending" && status !== "completed") {
      throw new Error(
        `Mirror Boundary Receipts has invalid status for "${phase}"`,
      );
    }
    receipts[phase as MirrorBoundaryPhase] = status;
  }
  return receipts;
}

export function serializeMirrorBoundaryReceipts(
  receipts: MirrorBoundaryReceipts,
): string {
  const ordered: MirrorBoundaryReceipts = {};
  for (const phase of MIRROR_BOUNDARY_PHASES) {
    const status = receipts[phase];
    if (status !== undefined) ordered[phase] = status;
  }
  return JSON.stringify(ordered);
}

export function transitionMirrorBoundaryReceipt(
  content: string,
  phase: MirrorBoundaryPhase,
  expected: "absent" | MirrorBoundaryReceiptStatus,
  next: MirrorBoundaryReceiptStatus,
): string {
  const receipts = parseMirrorBoundaryReceipts(
    getField(content, "Mirror Boundary Receipts"),
  );
  const current = receipts[phase];
  if (current === next) return content;
  if (
    (expected === "absent" && current !== undefined) ||
    (expected !== "absent" && current !== expected)
  ) {
    throw new Error(
      `Mirror boundary "${phase}" expected ${expected}, found ${current ?? "absent"}`,
    );
  }
  receipts[phase] = next;
  return setOrInsertField(
    content,
    "## Runtime State",
    "Mirror Boundary Receipts",
    serializeMirrorBoundaryReceipts(receipts),
  );
}

// --- Initial-create receipt (Issue #1750) -----------------------------------
//
// The scope-independent first create settles on its OWN axis rather than inside
// Mirror Boundary Receipts: that field's vocabulary is exactly the three phases
// (MIRROR_BOUNDARY_PHASES), and parseMirrorBoundaryReceipts rejects any other
// key. The two axes are read together by the engine but never share a slot, so
// a phase receipt can never be mistaken for the initial-create receipt.
export const MIRROR_INITIAL_CREATE_FIELD = "Mirror Initial Create Receipt";

export function parseMirrorInitialCreateReceipt(
  raw: string | null,
): MirrorBoundaryReceiptStatus | undefined {
  const value = raw?.trim();
  if (value === undefined || value === "") return undefined;
  if (value !== "pending" && value !== "completed") {
    throw new Error(
      `${MIRROR_INITIAL_CREATE_FIELD} must be pending or completed; received ${value}`,
    );
  }
  return value;
}

export function transitionMirrorInitialCreateReceipt(
  content: string,
  expected: "absent" | MirrorBoundaryReceiptStatus,
  next: MirrorBoundaryReceiptStatus,
): string {
  const current = parseMirrorInitialCreateReceipt(
    getField(content, MIRROR_INITIAL_CREATE_FIELD),
  );
  if (current === next) return content;
  if (
    (expected === "absent" && current !== undefined) ||
    (expected !== "absent" && current !== expected)
  ) {
    throw new Error(
      `Mirror initial create expected ${expected}, found ${current ?? "absent"}`,
    );
  }
  return setOrInsertField(
    content,
    "## Runtime State",
    MIRROR_INITIAL_CREATE_FIELD,
    next,
  );
}

// Refuse a phase-boundary completion when `phase` requires a phase-check
// artifact and it is missing. Not applicable for phases outside
// PHASE_CHECK_REQUIRED_PHASES. Honors the same AMADEUS_SKIP_ARTIFACT_GUARD
// bypass as the stage-completion artifact policy (the shared test/emergency seam
// the suite sets globally) so it participates in one documented off-switch
// rather than a second one.
function evaluatePhaseCheckArtifact(
  context: PhaseTransitionGuardContext,
): LifecycleGuardVerdict {
  const { pd, phase } = context;
  if (artifactGuardDisabled()) return guardNotApplicable("AMADEUS_SKIP_ARTIFACT_GUARD is set");
  if (!PHASE_CHECK_REQUIRED_PHASES.has(phase)) {
    return guardNotApplicable(`the "${phase}" phase declares no phase-check artifact`);
  }
  const rec = operationRecordDir(pd);
  if (rec === null) {
    let msg = `Refusing to verify the "${phase}" phase boundary: no active intent record resolves, `;
    msg += `so there is nowhere to check for verification/phase-check-${phase}.md.`;
    return guardDenied({ reason: msg });
  }
  const artifactPath = join(rec, "verification", `phase-check-${phase}.md`);
  if (!existsSync(artifactPath)) {
    let msg = `Refusing to complete the "${phase}" phase boundary: verification/phase-check-${phase}.md `;
    msg += `does not exist under the intent's record directory. The phase-boundary protocol requires `;
    msg += `a phase-check artifact before PHASE_VERIFIED.`;
    let recovery = `Produce verification/phase-check-${phase}.md `;
    recovery += `before completing. (expected: ${artifactPath})`;
    return guardDenied({ reason: msg, recovery });
  }
  return guardAllowed();
}

// The phase-transition commit path. Callers invoke it BEFORE writeStateFile; a
// refusal exits, so it leaves the state file untouched (the in-memory content
// flips are discarded). Exported so amadeus-jump.ts reuses the identical
// checkpoint on its forward crossing — the fifth authoritative transition.
export function verifyPhaseCheckArtifact(pd: string, phase: string): void {
  refuseBlockedTransition(
    evaluateLifecycleGuards<PhaseTransitionGuardContext>({
      checkpoint: "phase-transition",
      targetRevision: `phase:${phase}`,
      adapters: PHASE_TRANSITION_GUARDS,
      context: { pd, phase },
    }),
  );
}

// `advance <completed> <next>` is a FORWARD-only transition: the caller has just
// finished <completed> and hands off to the next in-scope stage. A 2-arg advance
// whose <next> sits at or before <completed> in the stage graph would regress
// Current Stage, demote a downstream [x], and mint forward-form PHASE_* events
// for a backward move (a false audit trail). Backward / same-position moves are
// jump's job. Re-derive the relationship from the graph indices and refuse
// anything that is not strictly forward — this also keeps every emitted phase
// event direction-correct, since a rejected backward advance never reaches the
// PHASE_COMPLETED/VERIFIED/STARTED emission block.
// Canonicalise a phase token (name or number) to its canonical name, or null.
// Implemented in amadeus-lib.ts ownPhase (#744 / #833).
export { ownPhase };

export function advanceDirectionCheck(
  completedIdx: number,
  nextIdx: number
): { ok: true } | { ok: false; reason: string } {
  if (nextIdx <= completedIdx) {
    return {
      ok: false,
      reason:
        `next stage index ${nextIdx} is at or before the completed stage index ${completedIdx}. ` +
        `Backward / same-position transitions are jump's job — use 'amadeus-jump.ts execute'.`,
    };
  }
  return { ok: true };
}

// Top-level dirs the artifact guard treats as "not source code" - the whole
// `amadeus/` workspace tree holds the per-intent records + planning artifacts +
// memory + codekb, the harness dirs hold the framework, .git is VCS. (On v2 the
// flat `amadeus-docs/` root is gone - every record lives under amadeus/spaces/...,
// so skipping `amadeus` skips all planning docs.) Used by workspaceHasSourceFile
// (the top-level dir skip) and isNonDocPath (the git first-segment skip).
// Harness dir names are derived from KNOWN_HARNESS_DIRS in amadeus-harness.ts
// (the single source of truth) so new harnesses cannot drift out of the guard.
// Declared at module top (not beside verifyStageArtifacts) because the command
// dispatch runs at top level: a const declared lower in the file would be in
// its temporal dead zone when an approve/advance dispatch calls the guard.
const HARNESS_DOC_DIRS = new Set(["amadeus", ".git", ...KNOWN_HARNESS_DIRS]);

const REVISION_EVIDENCE_EVENTS = new Set<RevisionEvidenceEvent["kind"]>([
  "STAGE_STARTED",
  "STAGE_AWAITING_APPROVAL",
  "HUMAN_TURN",
  "ARTIFACT_CREATED",
  "ARTIFACT_UPDATED",
  "GATE_REJECTED",
]);
const RECOVERY_BATCH_EVENTS = [
  "GATE_REJECTED",
  "STAGE_REVISING",
  "STAGE_AWAITING_APPROVAL",
  "GATE_APPROVED",
  "STAGE_COMPLETED",
] as const;
const RECOVERED_REVISION_FEEDBACK =
  "Recovered from durable artifact evidence; original feedback was not recorded";

// --- Audit emission helper ---
// Uses the throw-on-error appendAuditEntry (not handleAppend which writes JSON to stdout).
// Caller wraps in try/catch; a thrown exception is the signal that audit failed and
// the state write should not proceed.
//
// Lock-aware: when the caller is mid-transaction inside a withAuditLock (the
// C2b lost-update wrapping — every RMW handler below holds the lock across
// read→decide→emit→write), this process already owns the OS lock. The legacy
// writers forced a choice here: appendAuditEntry's acquire is NON-reentrant, so
// a held lock had to be detected and routed to the unlocked variant or the emit
// would self-deadlock and burn the retry budget before throwing.
//
// The canonical emit needs no such branch. It locks through withAuditLock,
// whose per-identity depth counter re-enters when the target names the SAME
// (intent, space) the enclosing section holds — which is the pair threaded
// here. One call therefore covers both cases, and the enclosing section's own
// acquire stays the only one ever spent.
function emitAudit(
  projectDir: string,
  eventType: string,
  fields: Record<string, string>
): void {
  // FR-EVT-4: a state mutation refuses outright while the fatal health latch is
  // set. The emit path only DROPS canonical rows there (#1856), and a drop is a
  // silent success for an audit-first handler — the write that follows would
  // land with no ledger row behind it. Both halves are needed: the assert covers
  // a latch already set when the handler starts, and the outcome check covers
  // the first emit of a process, where the journal health probe latches INSIDE
  // the bootstrap emitAuditEvent runs (so there was nothing to assert on yet).
  assertMutationAllowed();
  const result = emitAuditEvent(
    eventType,
    fields,
    projectDir,
    stateOperationTarget?.intent,
    stateOperationTarget?.space,
  );
  if (result.appended === false && result.reason === "fatal-latch") assertMutationAllowed();
}

// Thin alias over the shared accessor — kept so existing call sites read
// naturally; the physical field format is owned by amadeus-lib.
function auditField(block: string, fieldName: string): string | null {
  return auditBlockField(block, fieldName);
}

function hasStageAuditEvent(
  projectDir: string,
  eventType: string,
  stageSlug: string
): boolean {
  // Read across every per-clone audit shard (one in the common single-clone /
  // flat-legacy case; the glob-merge matters only when concurrent clones append
  // to the same intent). readAllAuditShards returns "" when no shard exists.
  const audit = operationReadAudit(projectDir);
  if (audit.length === 0) return false;
  const workflowStarts = findAllEvents(audit, "WORKFLOW_STARTED");
  const since = workflowStarts.length > 0
    ? workflowStarts[workflowStarts.length - 1].timestamp
    : "";
  return findAllEvents(audit, eventType).some((ev) => {
    if (since && ev.timestamp < since) return false;
    // Rows committed by a `--single` stage-runner run carry a synthetic
    // `Workflow: single-stage:<slug>` id and belong to no main workflow —
    // they must never satisfy a main-workflow dedup check (a single run's
    // STAGE_COMPLETED would otherwise suppress the main workflow's own
    // emission for the same slug). Main-workflow rows carry no Workflow field.
    if (auditField(ev.block, "Workflow")?.startsWith("single-stage:")) {
      return false;
    }
    return auditField(ev.block, "Stage") === stageSlug;
  });
}

const COMPLETION_AUDIT_EVENT_TYPES: ReadonlySet<string> = new Set([
  "STAGE_COMPLETED",
  "PHASE_COMPLETED",
  "PHASE_VERIFIED",
  "WORKFLOW_COMPLETED",
]);

function completionAuditEvents(
  projectDir: string,
  completionInstance: string,
): ReadonlySet<string> {
  const eventTypes = new Set<string>();
  for (const block of splitAuditRecords(operationReadAudit(projectDir))) {
    const eventType = auditField(block, "Event");
    if (
      eventType !== null &&
      COMPLETION_AUDIT_EVENT_TYPES.has(eventType) &&
      auditField(block, "Completion Instance") === completionInstance
    ) {
      eventTypes.add(eventType);
    }
  }
  return eventTypes;
}

function injectWorkflowCompletionCrash(point: string): void {
  if (process.env.AMADEUS_TEST_COMPLETE_WORKFLOW_CRASH_AT !== point) return;
  process.stderr.write(`Injected complete-workflow crash at ${point}\n`);
  process.exit(86);
}

function emitWorkflowCompletionAuditRows(input: {
  pd: string;
  content: string;
  completedSlug: string;
  completedStageName: string;
  completedPhase: string;
  completedCount: number;
  completionInstance: string;
  alreadyMarkedCompleted: boolean;
  stageCompletedAlreadyAudited: boolean;
  receipt: GoalReconciliationReceipt;
  reason?: string;
}): void {
  const scope = getField(input.content, "Scope");
  if (!scope) {
    error(
      "State file has no Scope field. Refusing to complete workflow — fix the state file first.",
    );
  }
  if (!validScopes().has(scope)) {
    error(
      `State file has invalid Scope "${scope}". Valid scopes: ${[...validScopes()].join(", ")}.`,
    );
  }
  try {
    const existingEvents = completionAuditEvents(
      input.pd,
      input.completionInstance,
    );
    const stageMissing = !existingEvents.has("STAGE_COMPLETED");
    const stageNeedsEmission =
      !input.alreadyMarkedCompleted || !input.stageCompletedAlreadyAudited;
    if (stageMissing && stageNeedsEmission) {
      emitAudit(input.pd, "STAGE_COMPLETED", {
        Stage: input.completedSlug,
        Details: `Final stage ${input.completedStageName} completed`,
        "Completion Instance": input.completionInstance,
      });
    }
    injectWorkflowCompletionCrash("after-stage-completed-audit");
    if (!existingEvents.has("PHASE_COMPLETED")) {
      emitAudit(input.pd, "PHASE_COMPLETED", {
        "From phase": input.completedPhase,
        "To phase": "(end)",
        "Stages completed": String(input.completedCount),
        "Completion Instance": input.completionInstance,
      });
    }
    injectWorkflowCompletionCrash("after-phase-completed-audit");
    if (!existingEvents.has("PHASE_VERIFIED")) {
      emitAudit(input.pd, "PHASE_VERIFIED", {
        "Phase boundary": `${input.completedPhase} → end`,
        "Completion Instance": input.completionInstance,
      });
    }
    injectWorkflowCompletionCrash("after-phase-verified-audit");
    const workflowFields: Record<string, string> = {
      Scope: scope,
      Details: `Scope: ${scope}, ${input.completedCount} stages completed`,
      "Completion Instance": input.completionInstance,
      "Goal Id": input.receipt.goalId,
      "Goal Revision": String(input.receipt.goalRevision),
      "Goal Digest": input.receipt.goalDigest,
      "Goal Receipt Id": input.receipt.receiptId,
      "Goal Receipt Digest": input.receipt.evidenceDigest,
      "Goal Verdict": input.receipt.overallVerdict,
      "Goal Evidence Count": String(
        input.receipt.items.reduce((count, item) => count + item.evidence.length, 0),
      ),
    };
    if (input.receipt.humanRulingReference !== null) {
      workflowFields["Goal Human Ruling"] = input.receipt.humanRulingReference;
    }
    if (input.reason) workflowFields.Reason = input.reason;
    if (!existingEvents.has("WORKFLOW_COMPLETED")) {
      emitAudit(input.pd, "WORKFLOW_COMPLETED", workflowFields);
    }
    injectWorkflowCompletionCrash("after-workflow-completed-audit");
  } catch (cause) {
    error(`Audit emission failed: ${errorMessage(cause)}`);
  }
}

// --- Slug + small helpers (used by fork/merge handlers below; declared
// before main() so they're initialised before dispatch fires) ---

const SLUG_RE = /^[a-z][a-z0-9-]*$/;

// Enforcement cutoff, mirroring the E-OC1 questions-evidence gate: intents are
// dated by their record dir name (YYMMDD-...), and only intents born on or after
// the guard's adoption day are enforced. Keep this above main() because direct
// CLI completion dispatch reads it before later module declarations initialize.
export const BLOCKING_SENSOR_CUTOFF_YYMMDD = 260809;

// The events that close a SENSOR_FIRED pair. Only SENSOR_PASSED clears an
// output. Order is the equal-timestamp tie-break: PASSED before FAILED makes a
// tie resolve to failure. These runtime constants must also stay above main().
const SENSOR_TERMINAL_EVENTS = ["SENSOR_PASSED", "SENSOR_FAILED", "SENSOR_BUDGET_OVERRIDE"] as const;
const BLOCKING_SENSOR_REMEDY =
  "Fire the sensor and resolve its finding before completing the stage: " +
  "amadeus-sensor.ts fire <sensor-id> --stage <slug> --output-path <artifact>.";

// Exported for the in-process coverage seam (t220); production callers reach it
// through main()'s handler dispatch. Record-side display names (Unnn-<slug>,
// uppercase) are normalized to the lowercase canonical form and judged post-
// normalization, so the full `bolt start --worktree` chain (state fork ->
// audit-fork) stays consistent with worktreePath / worktree validateSlug
// (Issue #478 gap2 / #885).
export function validateSlug(slug: string | undefined): string {
  if (!slug) errorWithSlug("(missing)", `Missing --slug <slug>`);
  const normalized = normalizeWorktreeSlug(slug);
  if (!SLUG_RE.test(normalized)) {
    errorWithSlug(slug, `Invalid --slug: "${slug}". Must be kebab-case (lowercase letter then [a-z0-9-]).`);
  }
  return normalized;
}

function errorWithSlug(slug: string, msg: string): never {
  error(`[slug=${slug}] ${msg}`);
}

function stageCheckboxOrError(
  content: string,
  slug: string,
  operation: string,
): ReturnType<typeof parseCheckboxes>[number] {
  const matches = parseCheckboxes(content).filter((checkbox) => checkbox.slug === slug);
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    errorWithSlug(
      slug,
      `State mutation refused: operation=${JSON.stringify(operation)} phase=validate reason=duplicate-target target=${JSON.stringify(slug)}`,
    );
  }
  errorWithSlug(
    slug,
    `State mutation refused: operation=${JSON.stringify(operation)} phase=validate reason=target-not-found target=${JSON.stringify(slug)}`,
  );
}

function sha256(buf: string): string {
  return createHash("sha256").update(buf).digest("hex");
}

// Shared value-arm guard for hand-rolled `--flag <value>` loops (Issue #2763):
// a bare `for`-loop consuming `args[i + 1]` as a flag's value has no way to
// tell "the caller omitted the value" from "the caller's value IS another
// flag" (`--foo --bar` silently binds `--bar` to `--foo`, then leaves `--bar`
// itself unconsumed). requireFlagValue (amadeus-sensor-flags.ts) is the
// canonical form for `for`-loops driven by an explicit `if (argv[i] ===
// "--flag")` per flag; this is the same check factored out so callers that
// still collect into a generic flags map (this file's `parseFlags`,
// `handlePracticesPromote`, `handlePracticesEvent`) don't each grow their own
// inline branch (and their own cognitive-complexity cost).
function rejectFlagLikeValue(flag: string, value: string): void {
  if (value.startsWith("--")) {
    error(`${flag} expects a value, got another flag: "${value}". Did you forget the value?`);
  }
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--") && i + 1 < args.length) {
      const value = args[i + 1];
      rejectFlagLikeValue(a, value);
      flags[a.slice(2)] = value;
      i++;
    }
  }
  return flags;
}

// Extract the optional `--intent <record>` / `--space <name>` selector from an
// otherwise POSITIONAL arg list (get/set/checkbox/count take positional field /
// field=value / slug=state / state operands, unlike fork/merge which are
// all-flags and use parseFlags). Returns the selector plus the positional
// remainder. Whole-token match on `--intent`/`--space` only, so a field=value
// operand whose value merely contains those substrings (e.g. `Foo=--intent`) is
// never mis-consumed. A selector token with no following value, OR whose
// following token itself looks like another flag (starts with `--`), is left
// in `rest` (it then fails the operand parse loudly, never a silent drop or a
// mis-consumed selector — Issue #2763). `--project-dir` is already spliced out
// by main() before dispatch, so it never reaches here.
export function extractIntentSelector(args: string[]): { intent?: string; space?: string; rest: string[] } {
  const rest: string[] = [];
  let intent: string | undefined;
  let space: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--intent" && i + 1 < args.length && !args[i + 1].startsWith("--")) {
      intent = args[i + 1];
      i++;
      continue;
    }
    if (a === "--space" && i + 1 < args.length && !args[i + 1].startsWith("--")) {
      space = args[i + 1];
      i++;
      continue;
    }
    rest.push(a);
  }
  return { intent, space, rest };
}

// Resolve the `--intent`/`--space` selector to the record the state/audit/lock
// helpers target. Mirrors handleFork (:3768): an omitted selector keeps the
// pre-existing default EXACTLY — returns undefined so readStateFile /
// writeStateFile / withAuditLock resolve to the active cursor's state file AND
// the workspace(sentinel) lock bucket (byte-identical AND lock-bucket-identical
// to before, so no new cross-bucket race with the sentinel-locked workflow
// verbs). A given selector pins the op to that record and its per-intent lock
// bucket; a non-existent record stays undefined here and fails closed downstream
// when readStateFile throws "State file not found".
function resolveSelectedIntent(
  pd: string,
  intent: string | undefined,
  space: string | undefined,
): string | undefined {
  if (intent === undefined && space === undefined) return undefined;
  return activeIntent(pd, space, intent) ?? undefined;
}

// The state rows owned by the autonomy transaction's projection — the exact set
// writeAutonomyStateProjection (amadeus-intent-autonomy-production.ts) writes as
// one unit. A generic `set` of any of them bypasses that writer, so each such
// write leaves an AUTONOMY_MODE_SET row (#2483). Kept as literal strings rather
// than an import: this tool must not pull the autonomy production module (and
// its coordinator/repository graph) onto the `set` path just to name three rows.
//
// Declared ABOVE the `import.meta.main` dispatch below, not next to handleSet:
// a `const` after that block sits in its temporal dead zone for the whole CLI
// run, so a spawned `set` would throw a ReferenceError before writing anything.
const PROJECTION_OWNED_FIELDS = new Set([
  "Intent Autonomy Mode",
  "Intent Grant",
  "Construction Autonomy Mode",
]);

// --- CLI entry point ---

let projectDir: string | undefined;

// Active per-intent lock context for the in-transaction error path. Targeted
// state operations plus handleFork/handleMerge resolve their intent and hold a
// PER-INTENT audit lock across the whole transaction. When an error fires
// mid-transaction it routes through error() -> emitError,
// whose holdsAuditLock probe must key the SAME per-intent bucket the caller
// holds — a bare holdsAuditLock(pd) keys the __workspace__ sentinel, returns
// false mid per-intent transaction, and takes emitError's 5s blocking-acquire
// branch writing ERROR_LOGGED to the wrong bucket. These mirror the resolved
// intent+space into error() so emitError keys lock==write. Set immediately
// before the lock, cleared after; on the happy path no error fires and they are
// harmless. All untargeted handlers lock the sentinel bucket and leave these
// unset (undefined), so error() keys the sentinel for them — correct.
let lockIntent: string | undefined;
let lockSpace: string | undefined;

type StateOperationTarget = {
  readonly intent: string;
  readonly space: string;
};

let stateOperationTarget: StateOperationTarget | null = null;

function operationReadState(pd: string): string {
  return readStateFile(
    pd,
    stateOperationTarget?.intent,
    stateOperationTarget?.space,
  );
}

function operationWriteState(pd: string, content: string): void {
  writeStateFile(
    pd,
    content,
    stateOperationTarget?.intent,
    stateOperationTarget?.space,
  );
}

function operationRecordDir(pd: string): string | null {
  return recordDir(
    pd,
    stateOperationTarget?.intent,
    stateOperationTarget?.space,
  );
}

function operationRelativeRecordDir(pd: string): string | null {
  return relativeRecordDir(
    pd,
    stateOperationTarget?.intent,
    stateOperationTarget?.space,
  );
}

function operationAuditShards(pd: string): string[] {
  return auditShards(
    pd,
    stateOperationTarget?.intent,
    stateOperationTarget?.space,
  );
}

function operationReadAudit(pd: string): string {
  return readAllAuditShards(
    pd,
    stateOperationTarget?.intent,
    stateOperationTarget?.space,
  );
}

// Callback shapes for the two state-operation wrappers, named so the parameter
// lists carry an alias rather than an inline function type.
type SyncOperation<T> = () => T extends Promise<unknown> ? never : T;
type TargetedOperation<T> = () => T;

function operationWithLock<T>(
  pd: string,
  fn: SyncOperation<T>,
): T extends Promise<unknown> ? never : T {
  return withAuditLock(
    pd,
    fn,
    stateOperationTarget?.intent,
    stateOperationTarget?.space,
  );
}

function withStateOperationTarget<T>(
  target: StateOperationTarget,
  fn: TargetedOperation<T>,
): T {
  const previous = stateOperationTarget;
  const previousLockIntent = lockIntent;
  const previousLockSpace = lockSpace;
  stateOperationTarget = target;
  lockIntent = target.intent;
  lockSpace = target.space;
  try {
    return fn();
  } finally {
    stateOperationTarget = previous;
    lockIntent = previousLockIntent;
    lockSpace = previousLockSpace;
  }
}

type SelectedIntentOperation = (args: string[], pd: string) => void;

function runSelectedIntentOperation(
  args: string[],
  operation: SelectedIntentOperation,
  unresolvedMessage: string,
): void {
  const { intent, space, rest } = extractIntentSelector(args);
  const pd = resolveProjectDir(projectDir);
  if (intent === undefined && space === undefined) {
    operation(rest, pd);
    return;
  }
  const resolvedIntent = resolveSelectedIntent(pd, intent, space);
  if (resolvedIntent === undefined) error(unresolvedMessage);
  withStateOperationTarget(
    { intent: resolvedIntent, space: space ?? activeSpace(pd) },
    operation.bind(null, rest, pd),
  );
}

// Telemetry process span (opt-in; no-op unless observability.enabled).
// Resolution failures must not change the CLI contract — skip silently. Lives
// outside main() so the span costs the dispatcher no branch of its own.
function observeToolRun(subcommand: string | undefined): void {
  try {
    initProcessObservability(`tool:amadeus-state:${subcommand ?? "?"}`, resolveProjectDir(projectDir));
  } catch {
    // no resolvable workflow -> nothing to observe
  }
}

// Which side of this branch a caller lands on decides whether the trusted
// session id comes from the host-stamped carrier or from an environment
// variable the caller sets itself, so the harness question is answered from
// real process evidence (#2326). The two branches themselves are unchanged.
function trustedHostSessionId(): string | undefined {
  const pd = resolveProjectDir(projectDir);
  return detectHarnessTypeForAuthorization(pd) === "kimi"
    ? readCurrentSessionId(pd) ?? undefined
    : process.env.AMADEUS_TRUSTED_SESSION_ID;
}

export function enforceCallerAuthorization(subcommand: string | undefined): void {
  // Only read-only subcommands pass through. On denial, do not use error():
  // writing ERROR_LOGGED would change the state/audit bytes, violating the
  // invariant that a denial leaves both untouched, so write to stderr and exit.
  // session-takeover is the ONE mutating verb outside this gate, and it has to
  // be: every other route out of a denial — `unpark` included — is gated, so a
  // workspace whose carrier went stale under a cross-harness handover would have
  // no in-band recovery at all. It does not weaken the boundary it sits beside;
  // it repairs the carrier the boundary reads, and only after a human turn on
  // this clone's ledger says so (see amadeus-session-takeover.ts).
  if (
    subcommand === undefined ||
    subcommand === "get" ||
    subcommand === "count" ||
    subcommand === "lookup" ||
    subcommand === SESSION_TAKEOVER_VERB
  ) {
    return;
  }
  const authorization = authorizeMainConductor(resolveProjectDir(projectDir));
  if (authorization.kind === "authorized") return;
  process.stderr.write(
    `${JSON.stringify({ error: callerAuthorizationError(authorization) })}\n`,
  );
  process.exit(1);
}

function main(): void {
  const args = process.argv.slice(2);

  // Extract --project-dir flag
  const pdIdx = args.indexOf("--project-dir");
  if (pdIdx !== -1 && pdIdx + 1 < args.length) {
    projectDir = args[pdIdx + 1];
    args.splice(pdIdx, 2);
  }

  const subcommand = args[0];
  enforceCallerAuthorization(subcommand);

  observeToolRun(subcommand);


  try {
    switch (subcommand) {
      case "get":
        handleGet(args.slice(1));
        break;
      case "set":
        handleSet(args.slice(1));
        break;
      case "set-skeleton-stance":
        handleSetSkeletonStance(args.slice(1));
        break;
      case "mirror-boundary":
        handleMirrorBoundary(args.slice(1));
        break;
      case "mirror-initial-create":
        handleMirrorInitialCreate(args.slice(1));
        break;
      case "set-construction-iteration":
        handleSetConstructionIteration(args.slice(1));
        break;
      case "checkbox":
        handleCheckbox(args.slice(1));
        break;
      case "count":
        handleCount(args.slice(1));
        break;
      case "advance":
        handleAdvance(args.slice(1));
        break;
      case "finalize":
        handleFinalize(args.slice(1));
        break;
      case "complete-workflow":
        handleCompleteWorkflow(args.slice(1));
        break;
      case "archive":
        handleArchive(args.slice(1));
        break;
      case "unarchive":
        handleUnarchive(args.slice(1));
        break;
      case "gate-start":
        handleGateStart(args.slice(1));
        break;
      case "approve":
        handleApprove(args.slice(1));
        break;
      case "delegate-approval":
        handleDelegateApproval(args.slice(1));
        break;
      case "delegate-rejection":
        handleDelegateRejection(args.slice(1));
        break;
      case "reject":
        handleReject(args.slice(1));
        break;
      case "revise":
        handleRevise(args.slice(1));
        break;
      case "skip":
        handleSkip(args.slice(1));
        break;
      case "resume":
        handleResume(args.slice(1));
        break;
      case "acknowledge-compaction":
        handleAcknowledgeCompaction(args.slice(1));
        break;
      // The literal (not SESSION_TAKEOVER_VERB) keeps this arm visible to the
      // registry drift guard's case-literal extractor (t416).
      case "session-takeover":
        handleSessionTakeover(args.slice(1));
        break;
      case "reuse-artifact":
        handleReuseArtifact(args.slice(1));
        break;
      case "lookup":
        handleLookup(args.slice(1));
        break;
      case "practices-event":
        handlePracticesEvent(args.slice(1));
        break;
      case "practices-promote":
        handlePracticesPromote(args.slice(1));
        break;
      case "fork":
        handleFork(args.slice(1));
        break;
      case "merge":
        handleMerge(args.slice(1));
        break;
      case "park":
        handlePark(args.slice(1));
        break;
      case "unpark":
        handleUnpark(args.slice(1));
        break;
      case "declare-docs-only":
        handleDeclareDocsOnly(args.slice(1));
        break;
      case "declare-units-done":
        handleDeclareUnitsDone(args.slice(1));
        break;
      default:
        error(
          `Unknown subcommand: ${subcommand}. Valid: get, set, set-skeleton-stance, mirror-boundary, mirror-initial-create, set-construction-iteration, checkbox, count, advance, finalize, complete-workflow, archive, unarchive, gate-start, approve, delegate-approval, delegate-rejection, reject, revise, skip, resume, acknowledge-compaction, session-takeover, reuse-artifact, lookup, practices-event, practices-promote, fork, merge, park, unpark, declare-docs-only, declare-units-done`
        );
    }
  } catch (e) {
    error(errorMessage(e));
  }
}

if (import.meta.main) {
  main();
}

// --- Subcommand handlers ---

export function handleGet(args: string[]): void {
  const { intent, space, rest } = extractIntentSelector(args);
  if (rest.length < 1) error("Usage: amadeus-state.ts get [--intent <record>] [--space <name>] <field>");
  const field = rest.join(" ");
  const pd = resolveProjectDir(projectDir);
  // Omitted selector -> undefined -> the active cursor's state file (unchanged).
  // A given selector reads that record; a non-existent one fails closed when
  // readStateFile throws below.
  const resolvedIntent = resolveSelectedIntent(pd, intent, space);
  const content = readStateFile(pd, resolvedIntent, space);
  const value = getField(content, field);
  if (value === null) {
    error(`Field not found: ${field}`);
  }
  console.log(value);
}

export function handleSet(args: string[]): void {
  const { intent, space, rest } = extractIntentSelector(args);
  if (rest.length < 1) error("Usage: amadeus-state.ts set [--intent <record>] [--space <name>] <field=value> ...");
  const pd = resolveProjectDir(projectDir);
  // Resolve the selector ONCE. Omitted -> undefined -> the active cursor + the
  // sentinel lock bucket (byte-identical AND lock-bucket-identical to before);
  // a given selector pins state+lock to that record (mirrors handleFork).
  const resolvedIntent = resolveSelectedIntent(pd, intent, space);
  // The locked transaction, named rather than inlined so the selector branch
  // below can run it under a bound audit target without duplicating the body.
  function runLockedSet(): void {
  // C2b lost-update safety: hold the audit lock across read→decide→write so
  // two concurrent `set`s of different fields can't clobber each other (A reads
  // V1, B reads V1, A writes V2, B writes V1.5 → A's field lost). The +1/-1
  // increment forms are especially exposed — they read-modify a counter. The
  // lock bucket is the resolved intent (or the sentinel when unselected), so it
  // matches the write target below (LOCK == WRITE).
  withAuditLock(pd, () => {
  let content = readStateFile(pd, resolvedIntent, space);

  // Parse every pair up front so field existence can be validated as one pass
  // before any write. `set` must fail closed (Issue #1027): if a target field
  // row is absent, setField silently no-ops, so the old code wrote an unchanged
  // file and still reported `{"updated":true}` — a lie the caller trusts.
  // Plain loops (no arrow callbacks): the complexity baseline keys anonymous
  // functions by ordinal, so adding closures here would shift every later
  // anonymous entry off its baseline row.
  const pairs: { field: string; value: string }[] = [];
  // Populated by the write loop below with the RESOLVED value of every
  // projection-owned field this call touched; drained into audit rows once the
  // state write has landed (#2483).
  const projectionWrites: { field: string; value: string }[] = [];
  for (const pair of rest) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx <= 0) error(`Invalid field=value pair: ${pair}`);
    pairs.push({ field: pair.slice(0, eqIdx), value: pair.slice(eqIdx + 1) });
  }

  // Pre-validate ALL fields and reject atomically with the full list of the
  // missing ones (fail-at-first would hide later absences). On reject nothing
  // is written — the state file, Last Updated included, stays byte-identical.
  const missingMessages: string[] = [];
  for (const { field } of pairs) {
    if (!fieldExists(content, field)) {
      missingMessages.push(
        `Field not found in state file: "${field}". Cannot update — refusing to silently no-op.`,
      );
    }
  }
  if (missingMessages.length > 0) {
    error(missingMessages.join("\n"));
  }

  for (const { field, value: raw } of pairs) {
    // Special values
    let value = raw;
    if (value === "NOW") {
      value = isoTimestamp();
    } else if (value === "+1") {
      const current = getField(content, field);
      const num = current ? parseInt(current, 10) : 0;
      value = String(num + 1);
    } else if (value === "-1") {
      const current = getField(content, field);
      const num = current ? parseInt(current, 10) : 0;
      value = String(Math.max(0, num - 1));
    }

    content = setField(content, field, value);
    // The RESOLVED value, not the raw argument: NOW/+1/-1 would otherwise put a
    // literal into the ledger that the record never held.
    if (PROJECTION_OWNED_FIELDS.has(field)) projectionWrites.push({ field, value });
  }

  // Reached only when every field existed: the write is real, so the success
  // report is now execution-derived (FR-2), not unconditional.
  writeStateFile(pd, content, resolvedIntent, space);
  // Audit AFTER the write, one row per projection-owned field (#2483). The
  // three fields below are written canonically by writeAutonomyStateProjection
  // (amadeus-intent-autonomy-production.ts) as the projection of a committed
  // autonomy transaction, so a generic `set` of one of them is an out-of-band
  // write of that projection. It is NOT refused here — the park-under-full path
  // that motivates the bypass has no ruling yet — but it stops being invisible:
  // the forensic gap in the incident was exactly a write with no ledger row.
  //
  // Write-then-audit (not audit-first) on purpose: `set` has no transaction to
  // converge on, so a row emitted before a failing write would claim a change
  // the record never took.
  for (const { field, value } of projectionWrites) {
    emitAudit(pd, "AUTONOMY_MODE_SET", { Mode: value, Field: field });
  }
  console.log(JSON.stringify({ updated: true, fields: rest.length }));
  }, resolvedIntent, space);
  }

  // Unselected: the pre-existing shape exactly — the sentinel lock bucket, the
  // active cursor's state file, and an unbound audit target that resolves to the
  // active intent's shard. Publish the lock context so a mid-transaction error()
  // routes ERROR_LOGGED to the SAME bucket we lock (lock==write). Cleared in the
  // finally so an in-process re-entry can't inherit it.
  if (resolvedIntent === undefined) {
    lockIntent = resolvedIntent;
    lockSpace = space;
    try {
      runLockedSet();
    } finally {
      lockIntent = undefined;
      lockSpace = undefined;
    }
    return;
  }
  // Selected: bind the audit target to the record being written (#2483).
  // emitAudit resolves its shard from stateOperationTarget, which handleSet —
  // unlike every handler routed through runSelectedIntentOperation — never
  // published. A `set --intent <other>` therefore wrote the other record's state
  // file while its AUTONOMY_MODE_SET row landed on the ACTIVE intent's shard:
  // the row accused a record that never changed, and the record that DID change
  // stayed as unaudited as before. withStateOperationTarget also carries the
  // lock context (and restores the previous one), so the manual pair above is
  // not repeated here. The space is normalised the way auditLockIdentity
  // normalises it, so the emit re-enters the lock this call already holds
  // instead of taking a second acquire against a different bucket.
  withStateOperationTarget(
    { intent: resolvedIntent, space: space ?? activeSpace(pd) },
    runLockedSet,
  );
}

export function handleMirrorBoundary(args: string[]): void {
  const phase = args[0] as MirrorBoundaryPhase | undefined;
  const next = args[1] as MirrorBoundaryReceiptStatus | undefined;
  const fromIndex = args.indexOf("--from");
  const expected = fromIndex >= 0 ? args[fromIndex + 1] : undefined;
  if (
    phase === undefined ||
    !(MIRROR_BOUNDARY_PHASES as readonly string[]).includes(phase) ||
    (next !== "pending" && next !== "completed") ||
    (expected !== "absent" &&
      expected !== "pending" &&
      expected !== "completed")
  ) {
    error(
      "Usage: amadeus-state.ts mirror-boundary <ideation|inception|construction> " +
        "<pending|completed> --from <absent|pending|completed>",
    );
  }
  const pd = resolveProjectDir(projectDir);
  withAuditLock(pd, () => {
    const content = readStateFile(pd);
    let updated: string;
    try {
      updated = transitionMirrorBoundaryReceipt(
        content,
        phase,
        expected,
        next,
      );
    } catch (cause) {
      error(errorMessage(cause));
    }
    if (updated !== content) writeStateFile(pd, updated);
    console.log(
      JSON.stringify({ updated: updated !== content, phase, status: next }),
    );
  });
}

export function handleMirrorInitialCreate(args: string[]): void {
  const next = args[0] as MirrorBoundaryReceiptStatus | undefined;
  const fromIndex = args.indexOf("--from");
  const expected = fromIndex >= 0 ? args[fromIndex + 1] : undefined;
  if (
    (next !== "pending" && next !== "completed") ||
    (expected !== "absent" && expected !== "pending" && expected !== "completed")
  ) {
    error("Usage: amadeus-state.ts mirror-initial-create <pending|completed> --from <absent|pending|completed>");
  }
  const pd = resolveProjectDir(projectDir);
  // A NAMED function expression rather than an arrow: the complexity baseline
  // matches anonymous functions by ordinal, so an added arrow renumbers every
  // later one in this file into a false NEW_VIOLATION.
  withAuditLock(pd, function writeInitialCreateReceipt() {
    const content = readStateFile(pd);
    let updated: string;
    try {
      updated = transitionMirrorInitialCreateReceipt(content, expected, next);
    } catch (cause) {
      error(errorMessage(cause));
    }
    if (updated !== content) writeStateFile(pd, updated);
    console.log(
      JSON.stringify({ updated: updated !== content, status: next }),
    );
  });
}

// set-skeleton-stance <on|off|scope-dependent> — record the conductor's
// classified walking-skeleton stance (the classify round-trip). The
// `Skeleton Stance` field is runtime metadata (like Revision Count): it is NOT
// in the base state template, so we use setOrInsertField to update-if-present /
// insert-under-`## Runtime State`-if-absent (mirrors amadeus-bolt.ts's Merge-Held
// pattern for a runtime-only field). No audit row — the stance is metadata the
// next `amadeus-orchestrate next` reads to resolve the deferred Construction
// Bolt-1 gate, not a state-machine transition; it rides no event, exactly like
// `set` itself. The orchestration engine shells out to THIS subcommand rather
// than writing state itself (the engine writes nothing).
function handleSetSkeletonStance(args: string[]): void {
  // Declared inside the handler: `main()` is invoked at module load before a
  // module-level const further down would initialise (TDZ), so the value set
  // lives here, where it is reached only when the subcommand runs.
  const skeletonStanceValues = ["on", "off", "scope-dependent"];
  if (args.length < 1) {
    error(
      `Usage: amadeus-state.ts set-skeleton-stance <${skeletonStanceValues.join("|")}>`,
    );
  }
  const stance = args[0];
  if (!skeletonStanceValues.includes(stance)) {
    error(
      `Invalid skeleton stance "${stance}". Valid: ${skeletonStanceValues.join(", ")}.`,
    );
  }
  const pd = resolveProjectDir(projectDir);
  // C2b lost-update safety: read→write under one lock (a concurrent `set` of an
  // unrelated field must not lose this stance write, nor vice versa).
  withAuditLock(pd, () => {
  const content = readStateFile(pd);
  const updated = setOrInsertField(
    content,
    "## Runtime State",
    "Skeleton Stance",
    stance,
  );
  writeStateFile(pd, updated);
  console.log(JSON.stringify({ updated: true, skeleton_stance: stance }));
  });
}

// park - persist a `Parked` runtime field so the next `amadeus-orchestrate next`
// emits a terminal `parked` directive and the Stop hook lets the turn end
// (issue #367: a clean multi-session exit, so the agent never rubber-stamps
// stages to reach `done`). `Parked` and `Parked At Stage` are runtime-only
// fields (like Skeleton Stance) inserted under `## Runtime State`. Refuses a
// completed workflow (nothing to park). Emits WORKFLOW_PARKED - a recorded
// state event, audit-first under the lock.
//
// park is mode-blind (RFC-0001 FR-3). #365's autonomy guard refused it under
// `Construction Autonomy Mode: autonomous` whenever no unconsumed `HUMAN_TURN`
// was on record, on the premise that an unattended run has nobody to resume it
// and therefore has to keep going. RFC-0001's D1/D5 reject that premise: an
// unattended run that reaches a ruling it may not make is exactly the run that
// has to stop, and this tool was the layer making stopping impossible. The
// refusal is gone - there is no mode arm, no flag and no env off-switch here.
//
// The presence ACCOUNTING is untouched, because it never lived here:
// `WORKFLOW_PARKED` is a presence resolution (amadeus-lib.ts
// `resolutionConsumesHuman`), so a park still spends whatever turn was
// outstanding and one turn still licenses exactly one park.
function handlePark(_args: string[]): void {
  const pd = resolveProjectDir(projectDir);
  withAuditLock(pd, () => {
    let content = readStateFile(pd);
    const status = getField(content, "Status");
    if (status === "Completed") {
      error("Workflow is already Completed - nothing to park.");
    }
    const currentSlug = getField(content, "Current Stage") ?? "";
    if (currentSlug.length === 0) {
      error("State file has no Current Stage - cannot park.");
    }
    const timestamp = isoTimestamp();
    emitAudit(pd, "WORKFLOW_PARKED", {
      Stage: currentSlug,
      Timestamp: timestamp,
    });
    content = setOrInsertField(content, "## Runtime State", "Parked", timestamp);
    content = setOrInsertField(content, "## Runtime State", "Parked At Stage", currentSlug);
    content = setField(content, "Last Updated", timestamp);
    writeStateFile(pd, content);
    console.log(JSON.stringify({ parked: true, stage: currentSlug, timestamp }));
  });
}

// unpark - clear the `Parked` / `Parked At Stage` fields on explicit re-entry
// (the resume flow calls this), so subsequent plain `next` calls no longer
// emit `parked`. Idempotent: clearing absent fields is a no-op.
function unparkLocked(
  context: import("./amadeus-lib.ts").LockedIntentRegistryContext,
): void {
  const { projectDir: pd, space } = context;
  const intentDir = activeIntent(pd, space);
  const intent = intentDir
    ? listIntents(pd, space).find((candidate) => candidate.dirName === intentDir)
    : undefined;
  if (intent?.dirName) {
    const guard = guardIntentOperation(
      resolveIntentOperationTargetLocked(context, intent),
      "unpark",
    );
    if (guard.kind === "rejected") {
      process.stderr.write(`${JSON.stringify({
        error: renderIntentOperationRejection(guard.error),
      })}\n`);
      process.exit(1);
    }
  }
  let content = readStateFile(pd);
  const wasParked = (getField(content, "Parked") ?? "").trim().length > 0;
  content = removeField(content, "Parked");
  content = removeField(content, "Parked At Stage");
  if (wasParked) {
    const ts = isoTimestamp();
    emitAudit(pd, "WORKFLOW_UNPARKED", { Timestamp: ts });
    content = setField(content, "Last Updated", ts);
  }
  operationWriteState(pd, content);
  console.log(JSON.stringify({ unparked: true, was_parked: wasParked }));
}

function handleUnpark(_args: string[]): void {
  const pd = resolveProjectDir(projectDir);
  const space = activeSpace(pd);
  withIntentLifecyclePreflight(
    pd,
    space,
    appendLifecycleEvent,
    (context) => unparkLocked(context),
  );
}

// declare-docs-only evidence check (Issue #499/#848): verified BEFORE any
// registry write. The evidence must be "<DECISION_RECORDED|GATE_APPROVED>
// <stage> [detail...]" AND the referenced event must actually exist for that
// stage in the intent's audit shards. Uses the shared findAllEvents/auditField
// readers so the match tracks the canonical audit format. The approvalEvents
// Set is built INLINE (not a module-top const): the CLI dispatch runs at module
// load, so a top-level const would hit the TDZ. Those are the human-approval
// audit events evidence may reference — a free-form string must not exempt the
// guard (self-attestation, the very bypass #366's detection exists to prevent).
// Whitespace is split with a plain " " (not a /\s+/ literal): CLI --evidence
// args are space-delimited, and a regex literal desyncs the complexity gate's
// lizard TS lexer (function-boundary mis-detection).
function verifyDocsOnlyEvidence(pd: string, evidence: string): void {
  const approvalEvents = new Set(["DECISION_RECORDED", "GATE_APPROVED"]);
  const [eventType, stage] = evidence.trim().split(" ").filter(Boolean);
  if (!eventType || !stage || !approvalEvents.has(eventType)) {
    error(
      "Refusing to declare-docs-only: --evidence must reference a human-approval audit event as " +
        '"<DECISION_RECORDED|GATE_APPROVED> <stage> [detail...]" (e.g. "DECISION_RECORDED requirements-analysis 2026-07-11T17:19Z").'
    );
  }
  const audit = readAllAuditShards(pd);
  const found =
    audit.length > 0 &&
    findAllEvents(audit, eventType).some((ev) => auditField(ev.block, "Stage") === stage);
  if (!found) {
    error(
      `Refusing to declare-docs-only: no ${eventType} event for stage "${stage}" exists in this intent's audit trail. ` +
        "Record the approval first (the gate transition / decision), then declare with a reference to it."
    );
  }
}

// declare-docs-only (Issue #499/#848): the sole write path for the docs-only
// exemption. Writes the declaration to the active intent's registry row so a
// later workspace_requires stage completion (verifyStageArtifacts) does not
// require source work outside amadeus/. Under the WORKSPACE audit lock (the same
// bucket setIntentDocsOnly's registry mutation needs).
export function handleDeclareDocsOnly(args: string[]): void {
  const flags = parseFlags(args);
  const evidence = flags.evidence ?? "";
  const pd = resolveProjectDir(projectDir);
  withAuditLock(pd, () => {
    const dirName = activeIntent(pd);
    if (!dirName) {
      error("Refusing to declare-docs-only: no active intent record resolves.");
    }
    if (evidence.trim().length === 0) {
      error("Refusing to declare-docs-only: --evidence must be non-empty.");
    }
    verifyDocsOnlyEvidence(pd, evidence);
    const { matched, changed } = setIntentDocsOnly(pd, dirName, evidence);
    if (!matched) {
      error(
        `Refusing to declare-docs-only: no registry row in intents.json matches record dir "${dirName}". ` +
          "A declaration that lands on no row exempts nothing - repair the registry entry first."
      );
    }
    console.log(JSON.stringify({ declared: true, dirName, evidence: evidence.trim(), changed }));
  });
}

export function handleCheckbox(args: string[]): void {
  const { intent, space, rest } = extractIntentSelector(args);
  if (rest.length < 1) error("Usage: amadeus-state.ts checkbox [--intent <record>] [--space <name>] <slug=state> ...");
  const pd = resolveProjectDir(projectDir);
  // Resolve the selector ONCE (omitted -> undefined -> active cursor + sentinel
  // lock bucket, unchanged; a given selector pins state+lock to that record).
  const resolvedIntent = resolveSelectedIntent(pd, intent, space);

  // Parse + validate args BEFORE taking the lock — pure input checks that
  // touch no shared state, so they fail fast without holding the lock.
  const changes: Array<{ slug: string; state: CheckboxState }> = [];
  for (const pair of rest) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx <= 0) error(`Invalid slug=state pair: ${pair}`);
    const slug = pair.slice(0, eqIdx);
    const stateStr = pair.slice(eqIdx + 1);
    if (!findStageBySlug(slug)) {
      errorWithSlug(
        slug,
        `State mutation refused: operation=${JSON.stringify("checkbox:" + slug)} phase=validate reason=target-not-found target=${JSON.stringify(slug)}`,
      );
    }
    if (!isCheckboxState(stateStr)) {
      error(`Invalid state: ${stateStr}. Valid: ${VALID_CHECKBOX_STATES.join(", ")}`);
    }
    changes.push({ slug, state: stateStr });
  }

  // Publish the lock context so a mid-transaction error() routes ERROR_LOGGED to
  // the SAME per-intent shard we lock (sentinel when unselected); cleared below.
  lockIntent = resolvedIntent;
  lockSpace = space;
  try {
  // C2b lost-update safety: read→apply→count→write under one lock so the
  // Completed counter resync sees a consistent snapshot (a concurrent checkbox
  // flip between our read and write would otherwise desync the count). The lock
  // bucket is the resolved intent so it matches the write target (LOCK == WRITE).
  withAuditLock(pd, () => {
  let content = readStateFile(pd, resolvedIntent, space);

  for (const { slug, state } of changes) {
    content = requireChanged(
      setCheckbox(validateStageState(content), slug, state),
      `checkbox:${slug}`,
    );
  }

  const rebuilt = rebuildCompletedFieldFromState(content);
  content = rebuilt.content;
  const completedCount = rebuilt.completedCount;

  writeStateFile(pd, content, resolvedIntent, space);
  console.log(JSON.stringify({ updated: true, checkboxes: changes.length, completed_count: completedCount }));
  }, resolvedIntent, space);
  } catch (cause) {
    if (cause instanceof StateMutationTargetError) {
      errorWithSlug(cause.target, errorMessage(cause));
    }
    throw cause;
  } finally {
    lockIntent = undefined;
    lockSpace = undefined;
  }
}

export function handleCount(args: string[]): void {
  const { intent, space, rest } = extractIntentSelector(args);
  if (rest.length < 1) error("Usage: amadeus-state.ts count [--intent <record>] [--space <name>] <state>");
  const stateStr = rest[0];
  if (!isCheckboxState(stateStr)) {
    error(`Invalid state: ${stateStr}. Valid: ${VALID_CHECKBOX_STATES.join(", ")}`);
  }
  const pd = resolveProjectDir(projectDir);
  // Omitted selector -> undefined -> the active cursor's state file (unchanged);
  // a given selector reads that record, failing closed if it does not exist.
  const resolvedIntent = resolveSelectedIntent(pd, intent, space);
  const content = readStateFile(pd, resolvedIntent, space);
  console.log(countCheckboxes(content, stateStr));
}

// --- Stage-completion artifact guard (issue #366) ---------------------------
//
// The state machine's transitions were purely ceremonial: approve/advance
// marked a stage [x] without verifying ANY work landed on disk, so an agent
// could rubber-stamp all 32 stages (gate-start->approve, or pure advance) with
// zero artifacts. This guard makes a forward stage-completion CONTINGENT on
// evidence of work - the same principle the swarm referee already applies at
// the merge gate (amadeus-swarm.ts finalize is authoritative, so a red unit
// cannot merge even if the conductor lies).
//
// It lives in amadeus-state.ts because that is the ONE seam every transition
// passes through: the issue's repro calls `amadeus-state.ts approve/advance`
// directly, so a guard only in orchestrate's `report` dispatcher is bypassable.
//
// V2 PATH RE-AUTHOR (workspace refactor #429): the flat `amadeus-docs/<phase>/<slug>/`
// layout is gone - a stage's produces[] artifacts now live under the ACTIVE
// intent's per-intent record dir (`amadeus/spaces/<space>/intents/<slug>-<id8>/
// <phase>/<stage>/`), per-unit Construction artifacts under that record's
// `construction/<unit>/<stage>/`, and codekb stages (reverse-engineering) under
// the space-level `amadeus/spaces/<space>/codekb/<repo>/`. This guard resolves
// against those live seams (recordDir / codekbDir), mirroring
// resolveArtifactPath in amadeus-orchestrate.ts so the two cannot drift on shape.
//
// Two layers:
//   1. produces-existence - a stage that declares produces[] must have at least
//      one of them on disk. Empty-produces stages (init phase) are exempt.
//   2. workspace_requires - a code-producing stage (frontmatter flag) must also
//      have a real file OUTSIDE the amadeus/ workspace tree and the harness dir.
//      Catches the code-generation case where only the two markdown produces[]
//      docs were written but no actual source code (issue #366 Update 2).
//
// Bypass: AMADEUS_SKIP_ARTIFACT_GUARD=1 (env, set by the test runner for synthetic
// tiers that drive transitions against bare fixtures).

function artifactGuardDisabled(): boolean {
  return process.env.AMADEUS_SKIP_ARTIFACT_GUARD === "1";
}

// --- Blocking sensor gate (#2671 (c)) ---------------------------------------
//
// A sensor manifest declares `default_severity: advisory | blocking`. Advisory
// is the framework default and the severity every shipped manifest carries: the
// sensor records SENSOR_* audit rows and never affects the workflow. `blocking`
// makes the sensor's verdict a precondition of stage completion, checked here on
// the single approve chokepoint (approveUnderLock) so both approve arms — the
// targeted-human path and the ordinary one — are covered by one guard.
//
// Severity reaches this guard through the compiled stage graph
// (SensorResolution.severity), NOT the audit row: the SENSOR_* field contract is
// pinned at 8 fields and stays unchanged, so a reader of the trail alone cannot
// distinguish severities. The graph is the sole carrier.
//
// Bypass: AMADEUS_SKIP_BLOCKING_SENSOR_GUARD=1, the same shape as the artifact
// guard's own switch and independent of it (a fixture that wants artifacts
// unchecked does not thereby want sensor verdicts unchecked).

// Canonical name consumed by plugin-owned artifact writers through the audit
// boundary. Exporting it keeps the core registry's writer-reference invariant
// explicit without importing a plugin schema into core.
export const ARTIFACT_ATTESTED_EVENT = "ARTIFACT_ATTESTED";

export type BlockingSensorFinding =
  | { kind: "never-fired"; sensorId: string }
  | { kind: "unresolved"; sensorId: string; outputPath: string; terminal: string | null }
  | { kind: "stale"; sensorId: string; outputPath: string }
  | { kind: "tool-unavailable"; sensorId: string; outputPath: string; note: string }
  | { kind: "script-error"; sensorId: string; outputPath: string; note: string };

type SensorAuditRow = {
  event: string;
  fireId: string;
  sensorId: string;
  outputPath: string;
  outputDigest: string | null;
  note: string | null;
};

type TimedSensorRow = { ts: string; row: SensorAuditRow };

// Named rather than an inline arrow: the complexity baseline matches anonymous
// functions by ordinal position, so a new arrow anywhere in this file renumbers
// every later anonymous entry and reports a pre-existing violation as new.
// Every helper below follows the same rule (plain loops, named comparators).
function compareSensorRowTime(a: TimedSensorRow, b: TimedSensorRow): number {
  if (a.ts === b.ts) return 0;
  return a.ts < b.ts ? -1 : 1;
}

// Collect this stage's SENSOR_* rows for the sensors we care about, in
// chronological order. findAllEvents already sorts each event type by timestamp
// across shards; merging the per-event lists needs one more stable sort so a
// FAILED and a later PASSED on the same output are read in the order they
// happened. Equal timestamps keep the SENSOR_TERMINAL_EVENTS enumeration order,
// which puts FAILED after PASSED — a second-granularity tie therefore resolves
// to the failure, the fail-closed direction.
function sensorRowsForStage(
  audit: string,
  stageSlug: string,
  wanted: ReadonlySet<string>,
): SensorAuditRow[] {
  const collected: TimedSensorRow[] = [];
  for (const event of ["SENSOR_FIRED", ...SENSOR_TERMINAL_EVENTS]) {
    for (const { timestamp, block } of findAllEvents(audit, event)) {
      if (auditBlockField(block, "Stage slug") !== stageSlug) continue;
      const sensorId = auditBlockField(block, "Sensor ID");
      if (sensorId === null || !wanted.has(sensorId)) continue;
      const outputPath = auditBlockField(block, "Output path") ?? "";
      const outputDigest = auditBlockField(block, "Output digest");
      const fireId = auditBlockField(block, "Fire id") ?? "";
      const note = sensorAuditNote(block);
      collected.push({
        ts: timestamp,
        row: { event, fireId, sensorId, outputPath, outputDigest, note },
      });
    }
  }
  collected.sort(compareSensorRowTime);
  const ordered: SensorAuditRow[] = [];
  for (const entry of collected) ordered.push(entry.row);
  return ordered;
}

// Decide whether a stage's blocking sensors permit completion. Returns the first
// finding that refuses, or null when every blocking sensor is settled clean.
//
// Four refusal shapes, all fail-closed:
//   never-fired — the sensor produced no SENSOR_FIRED for this stage at all.
//     "It never ran" is not evidence that it would pass. A sensor whose
//     `matches` glob excludes every artifact this stage wrote is NOT this case
//     and is not judged here: SENSOR_FIRED presence is what marks an output as
//     in scope, so a legitimately non-applicable output is simply never asked
//     about — while a sensor that never applied to anything is refused.
//   unresolved — some fired output's latest terminal is not SENSOR_PASSED
//     (a FAILED, a budget override, or no terminal at all).
//   stale — the current artifact bytes differ from the terminal receipt.
//   script-error — SENSOR_PASSED carries a script-error diagnostic, or the
//     Note field exists in a shape this reader cannot safely interpret.
interface TerminalSensorVerdict {
  readonly event: string;
  readonly outputDigest: string | null;
  readonly receiptMatches: boolean;
  readonly note: string | null;
}

const SENSOR_NOTE_UNREADABLE = "script-error: note-unreadable";

function sensorAuditNote(block: string): string | null {
  const record = parseJournalLine(block.trim());
  if (isJournalEntryV2(record)) {
    const note = record.attributes.Note;
    if (note === undefined || note === null) return null;
    return typeof note === "string" ? note.trim() : SENSOR_NOTE_UNREADABLE;
  }
  return auditBlockField(block, "Note");
}

function isScriptErrorNote(note: string | null): boolean {
  return note?.startsWith("script-error:") === true;
}

function isBlockingDiagnosticNote(note: string | null): boolean {
  return note === "tool-unavailable" || isScriptErrorNote(note);
}

function isToolUnavailableNote(note: string | null): boolean {
  return note === "tool-unavailable";
}

export function evaluateBlockingSensors(
  blockingSensorIds: readonly string[],
  audit: string,
  stageSlug: string,
  currentDigest?: (outputPath: string) => string | null,
): BlockingSensorFinding | null {
  const wanted = new Set(blockingSensorIds);
  if (wanted.size === 0) return null;
  const rows = sensorRowsForStage(audit, stageSlug, wanted);
  for (const sensorId of blockingSensorIds) {
    const firedOutputs: string[] = [];
    let latestOutputPath = "";
    const latestFire = new Map<string, { fireId: string; outputDigest: string | null }>();
    const latestTerminal = new Map<string, TerminalSensorVerdict>();
    for (const row of rows) {
      if (row.sensorId !== sensorId) continue;
      if (row.event === "SENSOR_FIRED") {
        if (!firedOutputs.includes(row.outputPath)) firedOutputs.push(row.outputPath);
        latestOutputPath = row.outputPath;
        latestFire.set(row.outputPath, { fireId: row.fireId, outputDigest: row.outputDigest });
        // A fire INVALIDATES the output's previous terminal: the artifact changed
        // and the verdict that cleared it describes bytes that no longer exist.
        // Without this, a PASSED followed by an in-flight re-fire would read as
        // settled-clean — the newest verdict has not landed yet.
        latestTerminal.delete(row.outputPath);
        continue;
      }
      const fire = latestFire.get(row.outputPath);
      // Fire id is the required correlator. A digest-less terminal from an
      // older fire must not clear a later fire on the same Output path.
      const receiptMatches =
        fire !== undefined &&
        fire.fireId === row.fireId &&
        (row.outputDigest === null || fire.outputDigest === row.outputDigest);
      latestTerminal.set(row.outputPath, {
        event: row.event,
        outputDigest: row.outputDigest,
        receiptMatches,
        note: row.note,
      });
    }
    if (firedOutputs.length === 0) return { kind: "never-fired", sensorId };
    const latest = latestTerminal.get(latestOutputPath) ?? null;
    const latestDigest = currentDigest?.(latestOutputPath);
    const latestOutputPassed = latest?.event === "SENSOR_PASSED"
      && latest.receiptMatches
      && !isBlockingDiagnosticNote(latest.note)
      && (currentDigest === undefined || (
          latest.outputDigest !== null && latestDigest === latest.outputDigest
        )
      );
    for (const outputPath of firedOutputs) {
      const terminal = latestTerminal.get(outputPath) ?? null;
      if (isToolUnavailableNote(terminal?.note ?? null)) {
        return {
          kind: "tool-unavailable",
          sensorId,
          outputPath,
          note: terminal?.note ?? "tool-unavailable",
        };
      }
      if (isScriptErrorNote(terminal?.note ?? null)) {
        return {
          kind: "script-error",
          sensorId,
          outputPath,
          note: terminal?.note ?? SENSOR_NOTE_UNREADABLE,
        };
      }
      if (terminal?.event !== "SENSOR_PASSED" || !terminal.receiptMatches) {
        return { kind: "unresolved", sensorId, outputPath, terminal: terminal?.event ?? null };
      }
      if (currentDigest !== undefined) {
        const digest = currentDigest(outputPath);
        // A later successful fire on a different path represents an artifact
        // move. Do not make a formerly valid, now-absent path a permanent gate;
        // unresolved or changed sibling outputs remain fail-closed.
        if (digest === null && outputPath !== latestOutputPath && latestOutputPassed) continue;
        if (terminal.outputDigest === null || digest !== terminal.outputDigest) {
          return { kind: "stale", sensorId, outputPath };
        }
      }
    }
  }
  return null;
}

function blockingSensorGuardDisabled(): boolean {
  return process.env.AMADEUS_SKIP_BLOCKING_SENSOR_GUARD === "1";
}

// The blocking sensor ids the compiled graph resolves for a stage. Reads the
// same sensors_applicable array the PostToolUse fire hook dispatches from, so
// the set that gates approval is by construction the set that fires.
function blockingSensorIdsForStage(slug: string): string[] {
  const ids: string[] = [];
  for (const node of loadGraph()) {
    if (node.slug !== slug) continue;
    for (const row of node.sensors_applicable ?? []) {
      if (row.severity === "blocking") ids.push(row.id);
    }
  }
  return ids;
}

// The stage-completion blocking-sensor policy. This is the user-space seam of
// the stage-completion checkpoint: the adapter is built-in and cannot be
// removed, while WHICH sensors it judges comes from the project's own sensor
// manifests through the compiled graph's sensors_applicable rows. A project that
// registers no blocking sensor is resolved not-applicable and sees no change.
// The sensor's own PASSED/FAILED truth table (amadeus-sensor.ts) is left
// unchanged. This guard additionally consumes SENSOR_PASSED diagnostics
// (`script-error:` and `tool-unavailable`) as not-pass, so a blocking sensor
// that cannot produce usable evidence cannot complete a stage.
function evaluateBlockingSensorGuard(
  context: StageCompletionGuardContext,
): LifecycleGuardVerdict {
  const { pd, stage } = context;
  if (blockingSensorGuardDisabled()) {
    return guardNotApplicable("AMADEUS_SKIP_BLOCKING_SENSOR_GUARD is set");
  }
  const blocking = blockingSensorIdsForStage(stage.slug);
  if (blocking.length === 0) {
    return guardNotApplicable(`no blocking sensor applies to "${stage.slug}"`);
  }
  const rd = operationRecordDir(pd);
  const intentDate = rd === null ? null : Number.parseInt(basename(rd).slice(0, 6), 10);
  const enforced = intentDate !== null && Number.isFinite(intentDate) && intentDate >= BLOCKING_SENSOR_CUTOFF_YYMMDD;
  if (!enforced) {
    return guardNotApplicable(`the intent predates the ${BLOCKING_SENSOR_CUTOFF_YYMMDD} cutoff`);
  }
  const finding = evaluateBlockingSensors(blocking, operationReadAudit(pd), stage.slug, (outputPath) => {
    try {
      const path = isAbsolute(outputPath) ? outputPath : join(pd, outputPath);
      return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
    } catch {
      return null;
    }
  });
  if (finding === null) return guardAllowed();
  if (finding.kind === "never-fired") {
    let message = `Refusing to complete "${stage.slug}": the blocking sensor `;
    message += `"${finding.sensorId}" has no SENSOR_FIRED row for this stage, so its verdict is `;
    message += "unknown. A blocking sensor that never ran is not a pass.";
    return guardDenied({ reason: message, recovery: BLOCKING_SENSOR_REMEDY });
  }
  if (finding.kind === "stale") {
    return guardDenied({
      reason:
        `Refusing to complete "${stage.slug}": the blocking sensor "${finding.sensorId}" ` +
        `passed different bytes at ${finding.outputPath}.`,
      recovery: "Re-fire it against the current artifact.",
    });
  }
  if (finding.kind === "script-error") {
    return guardDenied({
      reason:
        `Refusing to complete "${stage.slug}": the blocking sensor "${finding.sensorId}" ` +
        `has a script-error verdict (${finding.note}) on ${finding.outputPath}.`,
      recovery: BLOCKING_SENSOR_REMEDY,
    });
  }
  if (finding.kind === "tool-unavailable") {
    return guardDenied({
      reason:
        `Refusing to complete "${stage.slug}": the blocking sensor "${finding.sensorId}" ` +
        `could not run its required tool (${finding.note}) on ${finding.outputPath}.`,
      recovery: BLOCKING_SENSOR_REMEDY,
    });
  }
  const terminal = finding.terminal ?? "no terminal row";
  let message = `Refusing to complete "${stage.slug}": the blocking sensor `;
  message += `"${finding.sensorId}" has an unresolved verdict (${terminal}) on `;
  message += `${finding.outputPath}.`;
  return guardDenied({ reason: message, recovery: BLOCKING_SENSOR_REMEDY });
}

// Resolve the directories a stage's produces[] artifacts would live under,
// mirroring amadeus-orchestrate.ts's resolveArtifactPath against the v2 per-intent
// seams. Three placement classes:
//   - codekb (reverse-engineering): the produces live DIRECTLY under each repo
//     dir beneath the space-level codekb root (no <slug> subdir - see the codekb
//     arm of resolveArtifactPath). We glob every repo dir under the codekb root.
//   - per-unit Construction (for_each: unit-of-work): the {unit} segment is
//     unknown at approve/advance time, so we glob every
//     <record>/construction/<unit>/<slug>/ instead of resolving one.
//   - everything else: <record>/<phase>/<slug>/.
// Returns [] when no active intent record resolves (recordDir null) - a stage
// that declares produces then vacuously fails the existence check, which is the
// correct refusal (there is no record to have written them to).
function producesDirsForStage(
  pd: string,
  stage: { slug: string; phase: string; for_each?: string }
): string[] {
  if (KNOWN_CODEKB_STAGES.has(stage.slug)) {
    // codekbDir(pd, "<repo>") is `<pd>/amadeus/spaces/<space>/codekb/<repo>`; its
    // parent is the codekb root we glob. Built off the seam so the path is not
    // re-hardcoded here.
    const codekbRoot = join(codekbDir(pd, "_"), "..");
    if (!existsSync(codekbRoot)) return [];
    const dirs: string[] = [];
    for (const repo of readdirSync(codekbRoot)) {
      const d = join(codekbRoot, repo);
      try {
        if (statSync(d).isDirectory()) dirs.push(d);
      } catch {
        /* unreadable entry - skip */
      }
    }
    return dirs;
  }
  const rec = operationRecordDir(pd);
  if (rec === null) return [];
  const perUnit = stage.for_each === "unit-of-work";
  if (perUnit) {
    const ctorRoot = join(rec, "construction");
    if (!existsSync(ctorRoot)) return [];
    const dirs: string[] = [];
    for (const unit of readdirSync(ctorRoot)) {
      const d = join(ctorRoot, unit, stage.slug);
      if (existsSync(d)) dirs.push(d);
    }
    return dirs;
  }
  return [join(rec, stage.phase, stage.slug)];
}

interface RuntimeUnitKinds {
  units: string[];
  kinds: ReadonlyMap<string, UnitKind>;
}

function runtimeStateObjectField(value: unknown, key: string): unknown {
  if (value === null || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}

function loadRuntimeStateUnitRows(pd: string): unknown[] | null {
  try {
    const graph: unknown = JSON.parse(readFileSync(runtimeGraphPath(pd), "utf-8"));
    const units = runtimeStateObjectField(
      runtimeStateObjectField(graph, "bolt_dag"),
      "units",
    );
    return Array.isArray(units) && units.length > 0 ? units : null;
  } catch {
    return null;
  }
}

interface RuntimeStateUnitRow {
  name: string;
  kind?: UnitKind;
}

function parseRuntimeStateUnitRow(row: unknown): RuntimeStateUnitRow | null {
  const name = runtimeStateObjectField(row, "name");
  if (typeof name !== "string" || name.trim() === "") return null;
  const rawKind = runtimeStateObjectField(row, "kind");
  if (rawKind === undefined) return { name };
  const normalized = normalizeUnitKind(rawKind);
  if (!normalized.valid) return null;
  return { name, kind: normalized.data };
}

// Unit kinds as the COMMITTED canonical source states them: the fenced yaml
// edge block in unit-of-work-dependency.md, read through the same parser the
// runtime graph is compiled with (`parseBoltDag`). Anything unparseable yields
// an empty map, so a caller falls back exactly as it did before.
function canonicalUnitKinds(pd: string): ReadonlyMap<string, UnitKind> {
  const kinds = new Map<string, UnitKind>();
  let body: string;
  try {
    body = readFileSync(unitDependencyPath(pd), "utf-8");
  } catch {
    return kinds;
  }
  const parsed = parseBoltDag(body);
  if (!parsed.ok) return kinds;
  for (const unit of parsed.units) {
    if (unit.kind !== undefined) kinds.set(unit.name, unit.kind);
  }
  return kinds;
}

// One unit's kind, runtime graph first and the committed doc second (#2567).
//
// runtime-graph.json is gitignored, so a fresh clone, a per-Bolt worktree or a
// stale compile can leave it absent, without the unit's row, or with the row but
// no `kind`. The reviewer, meanwhile, wrote its verdict to the primary of the
// KIND-PRUNED produces it was handed at emit time. A gate that cannot name the
// kind reads the unpruned primary instead — a different file — and refuses a unit
// that was reviewed. unit-of-work-dependency.md is the source the runtime graph
// is compiled from and it IS committed, so consulting it removes the asymmetry
// rather than widening the gate. When neither source names the kind the emit side
// was unpruned too, both ends agree again, and the legacy behaviour is correct.
//
// The canonical read is lazy: a resolved runtime graph never touches the disk.
function unitKindResolver(pd: string): (unit: string) => UnitKind | undefined {
  const runtime = readRuntimeUnitKinds(pd)?.kinds;
  let canonical: ReadonlyMap<string, UnitKind> | null = null;
  return (unit) => {
    const live = runtime?.get(unit);
    if (live !== undefined) return live;
    canonical ??= canonicalUnitKinds(pd);
    return canonical.get(unit);
  };
}

// Invalid or absent runtime data returns null. Callers then retain the legacy
// full artifact matrix, which is the fail-safe direction for completion.
function readRuntimeUnitKinds(pd: string): RuntimeUnitKinds | null {
  const rows = loadRuntimeStateUnitRows(pd);
  if (rows === null) return null;
  const units: string[] = [];
  const kinds = new Map<string, UnitKind>();
  const seen = new Set<string>();
  for (const row of rows) {
    const parsed = parseRuntimeStateUnitRow(row);
    if (parsed === null || seen.has(parsed.name)) return null;
    seen.add(parsed.name);
    units.push(parsed.name);
    if (parsed.kind !== undefined) kinds.set(parsed.name, parsed.kind);
  }
  return { units, kinds };
}

interface ProducedStage {
  slug: string;
  phase: string;
  for_each?: string;
  produces?: string[];
  optional_produces?: string[];
  produces_kinds?: Record<string, UnitKind[]>;
  reviewer?: string;
}

function artifactsExistInDir(dir: string, artifacts: readonly string[]): boolean {
  for (const name of artifacts) {
    if (existsSync(join(dir, `${name}.md`))) return true;
  }
  return false;
}

function allArtifactsExistInDir(dir: string, artifacts: readonly string[]): boolean {
  for (const name of artifacts) {
    if (!existsSync(join(dir, `${name}.md`))) return false;
  }
  return true;
}

function requiredProducedArtifacts(stage: ProducedStage): string[] {
  const optional = new Set(stage.optional_produces ?? []);
  return (stage.produces ?? []).filter((name) => !optional.has(name));
}

function kindAwareArtifactsExist(
  pd: string,
  stage: ProducedStage,
  produces: string[],
): boolean | null {
  if (stage.for_each !== "unit-of-work") return null;
  if (stage.produces_kinds === undefined) return null;
  const snapshot = readRuntimeUnitKinds(pd);
  const rec = operationRecordDir(pd);
  if (snapshot === null || rec === null) return null;

  let hasApplicableArtifact = false;
  for (const unit of snapshot.units) {
    const kind = snapshot.kinds.get(unit);
    const applicable = kind === undefined
      ? produces
      : requiredArtifactsForUnit(
          { produces, produces_kinds: stage.produces_kinds },
          kind,
        );
    if (applicable.length === 0) continue;
    hasApplicableArtifact = true;
    const dir = join(rec, "construction", unit, stage.slug);
    if (!allArtifactsExistInDir(dir, applicable)) return false;
  }
  return hasApplicableArtifact || snapshot.units.length > 0;
}

// Units whose artifacts landed but whose reviewer never ran (#2359).
//
// The artifact layers ask whether a Unit produced output; they cannot ask
// whether the reviewer the protocol requires ("the orchestrator MUST invoke the
// reviewer", stage-protocol §12a) actually ran. Those two states look identical
// on disk, and once a Unit's produces exist the engine stops re-emitting its
// run-stage (#2358 shares that root), so no later step revisits the gap. This
// gate is where it is still visible.
//
// Detection only. A missing review is not something a gate can supply, and
// synthesising the block would be exactly the fabricated evidence the review
// exists to prevent — the refusal names the Units and stops there.
//
// Read as a review-bearing artifact: the `## Review — Iteration N` heading that
// `complete-review` appends.
//
// Units come from disk (`producesDirsForStage`) rather than the runtime graph,
// because the graph is the thing most likely to be stale or absent exactly when
// this gap appears — a session that parked mid-Unit. Disk is what the artifact
// layers already fall back to, and a Unit directory that exists is a Unit that
// ran. `produces_kinds` still narrows which artifacts count when the Unit's kind
// can be named — by the runtime snapshot, or failing that by the committed
// unit-of-work-dependency.md the snapshot is compiled from (`unitKindResolver`,
// #2567). With neither, every declared artifact is a candidate, which matches
// what the emit side handed the reviewer under the same ignorance.
function unitsMissingReview(pd: string, stage: ProducedStage): string[] {
  // §12a binds the reviewer to stages that declare one. A stage with no
  // `reviewer` has no verdict to be missing, so there is nothing here to check.
  if (stage.reviewer === undefined || stage.reviewer.trim() === "") return [];
  if (stage.for_each !== "unit-of-work") return [];
  if ((stage.produces ?? []).length === 0) return [];
  const kindOf = unitKindResolver(pd);
  const missing: string[] = [];
  for (const dir of producesDirsForStage(pd, stage)) {
    const unit = basename(join(dir, ".."));
    if (unitReviewIsMissing(dir, stage, kindOf(unit))) missing.push(unit);
  }
  return missing;
}

// One Unit's verdict, or the absence of one. Returns false for a Unit this layer
// has no standing to judge: nothing applicable to its kind, or nothing produced
// at all (which is the artifact layers' business, not this one's).
function unitReviewIsMissing(
  dir: string,
  stage: ProducedStage,
  kind: UnitKind | undefined,
): boolean {
  const produces = stage.produces ?? [];
  const applicable = kind === undefined
    ? produces
    : requiredArtifactsForUnit({ produces, produces_kinds: stage.produces_kinds }, kind);
  if (applicable.length === 0) return false;
  if (!artifactsExistInDir(dir, applicable)) return false;
  // The PRIMARY artifact only. `complete-review` appends its projection to the
  // first non-optional produces entry and nowhere else, so a block on any other
  // file was not written by the reviewer — accepting one would let a hand-placed
  // heading stand in for the verdict this asks for.
  const optional = new Set(stage.optional_produces ?? []);
  const primary = applicable.find((name) => !optional.has(name));
  if (primary === undefined) return false;
  return !artifactCarriesReview(join(dir, `${primary}.md`));
}

function artifactCarriesReview(path: string): boolean {
  try {
    return /^## Review — Iteration \d+/m.test(readFileSync(path, "utf-8"));
  } catch {
    return false;
  }
}

// True when every applicable required produces[] artifact exists on disk under
// every resolved owner directory. Optional outputs are never completion guards.
function producesArtifactsExist(
  pd: string,
  stage: ProducedStage,
): boolean {
  const produces = requiredProducedArtifacts(stage);
  if (produces.length === 0) return true; // nothing declared -> nothing to verify
  const kindAware = kindAwareArtifactsExist(pd, stage, produces);
  if (kindAware !== null) return kindAware;
  const dirs = producesDirsForStage(pd, stage);
  if (dirs.length === 0) return false;
  return dirs.every((dir) => allArtifactsExistInDir(dir, produces));
}

// True when any non-doc file exists in the workspace - a file outside the
// amadeus/ workspace tree and the harness dirs. Bounded shallow walk (one level
// into each top-level dir is enough to detect src/<file>); avoids a full
// recursive scan. Exported as an in-process test seam (spawn-blindspot norm).
export function workspaceHasSourceFile(pd: string): boolean {
  let entries: string[];
  try {
    entries = readdirSync(pd);
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (HARNESS_DOC_DIRS.has(entry)) continue;
    const p = join(pd, entry);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isFile()) return true; // a file at workspace root counts
    if (st.isDirectory()) {
      // Any file anywhere beneath a non-harness top-level dir (e.g. src/).
      try {
        if (dirHasFile(p)) return true;
      } catch {
        /* unreadable dir - skip */
      }
    }
  }
  return false;
}

// Recursive existence probe: does this directory contain any file? Short-
// circuits on the first file found.
function dirHasFile(dir: string): boolean {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isFile()) return true;
    if (st.isDirectory() && dirHasFile(p)) return true;
  }
  return false;
}

// A git-reported path (status --porcelain or diff --name-only output) counts as
// "source work" when its FIRST segment is not a harness/doc dir - i.e. it is a
// real workspace file (src/..., a root file), not an amadeus/ planning doc or
// framework file. Mirrors HARNESS_DOC_DIRS, the same set the FS walk skips.
// Exported as an in-process test seam (spawn-blindspot norm).
export function isNonDocPath(p: string): boolean {
  const rel = p.trim().replace(/^"|"$/g, ""); // git -z not used; strip any quoting
  if (rel.length === 0) return false;
  const firstSeg = rel.split("/")[0];
  return !HARNESS_DOC_DIRS.has(firstSeg);
}

// Run git in the workspace, fail-safe: returns null on any spawn/exec problem so
// callers fall back to the filesystem check rather than trapping.
function git(pd: string, args: string[]): string | null {
  try {
    const r = observeSubprocessSpan(pd, "git", () =>
      spawnSync("git", args, {
        cwd: pd,
        encoding: "utf-8",
        timeout: 30_000,
      }),
    );
    if (r.status !== 0 || typeof r.stdout !== "string") return null;
    return r.stdout;
  } catch {
    return null;
  }
}

// True when `pd` is inside a git work tree. (`--is-inside-work-tree` prints
// "true"/"false"; a non-repo exits non-zero -> git() returns null -> false.)
function isGitRepo(pd: string): boolean {
  return git(pd, ["rev-parse", "--is-inside-work-tree"])?.trim() === "true";
}

// The commit that ADDED this intent's record `amadeus-state.md` — the intent's
// birth. `git log --diff-filter=A` is newest-first, so the LAST line is the
// earliest Add. null when there is no active record or the file was never added.
function intentBirthCommit(pd: string): string | null {
  const rel = operationRelativeRecordDir(pd);
  if (rel === null) return null;
  const log = git(pd, ["log", "--diff-filter=A", "--format=%H", "--", `${rel}/amadeus-state.md`]);
  const lines = log?.split("\n").filter((l) => l.trim().length > 0) ?? [];
  return lines.length > 0 ? lines[lines.length - 1] : null;
}

// True when a non-merge commit on HEAD's first-parent chain since `birth` touched
// a non-doc path — i.e. code the conductor committed DIRECTLY onto the record
// branch. `--first-parent --no-merges` deliberately excludes merge-arrived code:
// another intent's PR pulled in via a main->record merge is NOT this intent's
// work, so it must not count (attribution, not just recency).
function recordBranchSourceWork(pd: string, birth: string): boolean {
  const log = git(pd, [
    "log",
    "--first-parent",
    "--no-merges",
    "--pretty=format:",
    "--name-only",
    `${birth}..HEAD`,
  ]);
  return log !== null && log.split("\n").some(isNonDocPath);
}

// This intent's bolt slugs, read from the first-class `Bolt Refs` state field.
// [] on any read/parse problem (fail-safe: the caller then finds no bolt work).
function intentBoltSlugs(pd: string): string[] {
  const rec = operationRecordDir(pd);
  if (rec === null) return [];
  const statePath = join(rec, "amadeus-state.md");
  if (!existsSync(statePath)) return [];
  try {
    const refs = getField(readFileSync(statePath, "utf-8"), "Bolt Refs");
    return refs === null ? [] : parseRefsList(refs);
  } catch {
    return [];
  }
}

// The candidate git refs for a bolt slug: local + remote, both naming
// conventions (`bolt-<slug>` from the engine worktree fork, `bolt/<slug>` from
// the record-branch flow). Remotes are included because a merged bolt branch is
// pruned locally but survives on origin, where its code is still referenceable.
function boltRefsForSlug(slug: string): string[] {
  return [
    `refs/heads/bolt-${slug}`,
    `refs/heads/bolt/${slug}`,
    `refs/remotes/origin/bolt-${slug}`,
    `refs/remotes/origin/bolt/${slug}`,
  ];
}

// True when `ref` exists and adds a non-doc path relative to its merge-base with
// HEAD — the ref's OWN work carries source, not shared history. This resolves a
// bolt branch's code even after a squash merge (the squash sha is not on the
// branch, so merge-base != tip). False (never throws) on an absent ref or any
// git failure.
function boltRefHasSourceWork(pd: string, ref: string): boolean {
  if (git(pd, ["rev-parse", "--verify", "--quiet", ref]) === null) return false;
  const mergeBase = git(pd, ["merge-base", "HEAD", ref]);
  if (mergeBase === null) return false;
  const diff = git(pd, ["diff", "--name-only", mergeBase.trim(), ref]);
  if (diff === null) return false;
  return diff.split("\n").some(isNonDocPath);
}

// The issue numbers this intent declares in its first-class `Project` state field
// (every `#<digits>`, e.g. "GitHub issue #697 (= #684 Phase B, #688)"). [] on any
// read/parse problem (fail-safe: the merged-PR probe then finds nothing).
function intentIssueRefs(pd: string): string[] {
  const rec = operationRecordDir(pd);
  if (rec === null) return [];
  const statePath = join(rec, "amadeus-state.md");
  if (!existsSync(statePath)) return [];
  try {
    const project = getField(readFileSync(statePath, "utf-8"), "Project");
    const nums = project?.match(/#(\d+)/g) ?? [];
    return [...new Set(nums.map((m) => m.slice(1)))];
  } catch {
    return [];
  }
}

// True when a commit since `birth` whose SUBJECT references one of `issues` (as
// `#<num>` on a word boundary) itself touches a non-doc path. This is the
// merged-PR attribution probe: the conductor record-branch pattern squash-merges
// a Bolt PR onto main (subject e.g. "fix #697: ... (#726)"), which reaches the
// record branch via a main->record merge. Unlike recordBranchSourceWork this does
// NOT restrict to the first-parent chain, so merge-arrived squash commits are
// seen; attribution comes from the issue reference rather than commit position.
//
// Honest limitation: subject issue references are a CONVENTION, not proof of
// ownership - a sibling intent that names the same issue in a commit subject
// could be over-attributed. The triple gate (commit within THIS intent's span
// birth..HEAD, references THIS intent's declared issue, AND touches non-doc
// files) narrows it enough to be a sound guard signal in practice.
function mergedPrSourceWork(pd: string, birth: string, issues: string[]): boolean {
  if (issues.length === 0) return false;
  const log = git(pd, ["log", `${birth}..HEAD`, "--pretty=%H%x09%s"]);
  if (log === null) return false;
  const patterns = issues.map((n) => new RegExp(`#${n}\\b`));
  for (const line of log.split("\n")) {
    const tab = line.indexOf("\t");
    if (tab === -1) continue;
    const subject = line.slice(tab + 1);
    if (!patterns.some((re) => re.test(subject))) continue;
    const files = git(pd, ["diff-tree", "--no-commit-id", "--name-only", "-r", line.slice(0, tab)]);
    if (files !== null && files.split("\n").some(isNonDocPath)) return true;
  }
  return false;
}

// This repo's trunk ref, for probe (d)'s fork-point boundary: local `main` if
// it resolves, else the `origin/main` remote-tracking ref. null when neither
// does (probe (d) then contributes nothing rather than guessing a trunk name -
// every other probe in this file already fails closed the same way). Both
// candidates are looked up by their FULLY-QUALIFIED ref path
// (`refs/heads/main` / `refs/remotes/origin/main`), never the bare `main` - a
// bare name's lookup order checks `refs/tags/<name>` before
// `refs/heads/<name>`, so a stale tag named `main` would silently outrank the
// real branch and hand branchSourceWorkSinceTrunkFork the wrong fork point.
function resolveTrunkRef(pd: string): string | null {
  if (git(pd, ["rev-parse", "--verify", "--quiet", "refs/heads/main"]) !== null) return "refs/heads/main";
  if (git(pd, ["rev-parse", "--verify", "--quiet", "refs/remotes/origin/main"]) !== null) {
    return "refs/remotes/origin/main";
  }
  return null;
}

// (issue #3156) Attribution rule extending recordBranchSourceWork BACKWARD past
// birth: the solo-Bolt-worktree convention (`cid:code-generation:c2-pr-record-in-
// head-checkout`) commits code directly onto the SAME branch that later gets the
// record checkpoint bundled onto it, so the code can land BEFORE birth instead of
// after - recordBranchSourceWork (birth..HEAD) and mergedPrSourceWork (also
// birth..HEAD) both miss it, and boltRefHasSourceWork's merge-base diff is empty
// when the bolt ref is an ancestor of HEAD rather than a divergent sibling.
//
// The fix widens the window to [trunk fork point .. HEAD] - still THIS branch's
// own first-parent, no-merge history, so a sibling's MERGE-arrived code is
// excluded exactly as it is for probe (a) (attribution, not just recency). Three
// safety properties keep this from over-firing:
//   - when HEAD has not diverged from trunk (fp === HEAD, e.g. commits landed
//     directly on trunk with no dedicated branch), the range is empty and the
//     probe is a no-op - this is what keeps a brownfield repo's pre-birth src/
//     (committed straight on trunk) from false-passing;
//   - birth must lie within that same span, so a workspace accidentally checked
//     out to an unrelated diverged branch (this intent's own birth commit not on
//     it at all) cannot false-positive on someone else's branch history;
//   - --no-merges only excludes MERGE-arrived code. A sibling's commit could
//     still reach this branch via a non-merge path (cherry-pick, rebase onto
//     this branch, etc.), so every candidate commit ALSO needs an identity tie
//     to THIS intent - its message references one of the intent's declared
//     issues (the same triple-gate mergedPrSourceWork already uses), OR it is
//     reachable from one of the intent's OWN bolt branch refs (Bolt Refs field
//     -> boltRefsForSlug, the same refs probe (b) resolves). A structurally
//     in-range commit with neither signal is not counted.
function branchSourceWorkSinceTrunkFork(pd: string, birth: string | null): boolean {
  if (birth === null) return false;
  const trunk = resolveTrunkRef(pd);
  if (trunk === null) return false;
  const forkPoint = git(pd, ["merge-base", "HEAD", trunk]);
  if (forkPoint === null) return false;
  const fp = forkPoint.trim();
  if (git(pd, ["merge-base", "--is-ancestor", fp, birth]) === null) return false;

  const shas = git(pd, ["log", "--first-parent", "--no-merges", "--pretty=format:%H", `${fp}..HEAD`]);
  if (shas === null) return false;
  const candidates = shas.split("\n").filter((l) => l.trim().length > 0);
  if (candidates.length === 0) return false;

  const issuePatterns = intentIssueRefs(pd).map((n) => new RegExp(`#${n}\\b`));
  const boltRefs = intentBoltSlugs(pd).flatMap(boltRefsForSlug);

  for (const sha of candidates) {
    const files = git(pd, ["diff-tree", "--no-commit-id", "--name-only", "-r", sha]);
    if (files === null || !files.split("\n").some(isNonDocPath)) continue;
    const message = git(pd, ["show", "-s", "--format=%B", sha]);
    if (message !== null && issuePatterns.some((re) => re.test(message))) return true;
    if (boltRefs.some((ref) => git(pd, ["merge-base", "--is-ancestor", sha, ref]) !== null)) return true;
  }
  return false;
}

// Attribution rule (issue #731, extended by issue #3156): when the record
// branch's recent history is doc-only, is there source work ATTRIBUTABLE TO
// THIS INTENT? Four intent-scoped probes, never a blanket post-birth diff
// (which would count a sibling intent's merged code):
//   (a) code committed directly onto the record branch since birth
//       (recordBranchSourceWork);
//   (b) code on any of THIS intent's bolt branches (Bolt Refs -> local/remote
//       refs), referenced via merge-base so a squash-merged branch still counts;
//   (c) a commit since birth whose subject references THIS intent's declared
//       issue(s) and touches non-doc files (mergedPrSourceWork) - covers a Bolt
//       PR squash-merged to main and pulled into the record branch via a merge;
//   (d) an issue- or bolt-ref-attributed commit directly onto the CURRENT
//       branch BEFORE birth, since it diverged from trunk
//       (branchSourceWorkSinceTrunkFork) - covers the solo-Bolt-worktree
//       pattern where the record checkpoint is bundled onto the branch AFTER
//       the code it belongs to (issue #3156).
function intentScopedSourceWork(pd: string): boolean {
  const birth = intentBirthCommit(pd);
  if (birth !== null && recordBranchSourceWork(pd, birth)) return true;
  for (const slug of intentBoltSlugs(pd)) {
    for (const ref of boltRefsForSlug(slug)) {
      if (boltRefHasSourceWork(pd, ref)) return true;
    }
  }
  if (birth !== null && mergedPrSourceWork(pd, birth, intentIssueRefs(pd))) return true;
  if (branchSourceWorkSinceTrunkFork(pd, birth)) return true;
  return false;
}

// Git-aware "did this workspace get real source work?" signal (issue #366
// Update 3). Distinguishes "code produced this session" from a brownfield repo's
// pre-existing src/ - which the bare filesystem check cannot. True when ANY of:
//   1. the working tree has an uncommitted/untracked non-doc change
//      (`git status --porcelain`);
//   2. the last commit touched a non-doc path (`git diff --name-only HEAD~1 HEAD`)
//      - so commit-then-approve (clean tree) still passes, closing Update 3's
//      clean-working-tree false-block;
//   3. (issue #731) the last commit is doc-only but this intent has attributable
//      source work elsewhere - see intentScopedSourceWork. This closes the
//      record-branch false-refusal (code merged/committed earlier, then trailing
//      checkpoint/delegate doc commits) while still refusing when the only recent
//      non-doc change belongs to a sibling intent or a brownfield baseline.
// Returns null (NOT false) on any git error or a HEAD~1 miss (a single-commit or
// 0-commit repo has no parent to diff), so the caller falls back to the
// filesystem check rather than wrongly refusing a greenfield first commit.
export function gitHasSourceWork(pd: string): boolean | null {
  const porcelain = git(pd, ["status", "--porcelain"]);
  if (porcelain === null) return null;
  // `XY <path>` per line; renames are `orig -> new` (take the new path).
  for (const line of porcelain.split("\n")) {
    if (line.trim().length === 0) continue;
    const pathPart = line.slice(3);
    const candidate = pathPart.includes(" -> ")
      ? pathPart.split(" -> ")[1]
      : pathPart;
    if (isNonDocPath(candidate)) return true;
  }
  // Clean (or doc-only) working tree - check whether the LAST commit added code,
  // covering the commit-then-approve pattern. HEAD~1 is absent on the very first
  // commit; that diff errors -> git() returns null.
  const lastCommit = git(pd, ["diff", "--name-only", "HEAD~1", "HEAD"]);
  if (lastCommit !== null) {
    for (const line of lastCommit.split("\n")) {
      if (isNonDocPath(line)) return true;
    }
    // Doc-only last commit: widen to this intent's attributable work, else refuse.
    return intentScopedSourceWork(pd);
  }
  // HEAD~1 did NOT resolve (a single-commit repo has no parent): we could not
  // inspect the last commit at all, so this is the documented "0-commit / HEAD~1
  // miss" case - return null (NOT false) so the caller falls back to the
  // filesystem probe rather than false-refusing a greenfield first-commit whose
  // sole commit holds the source.
  return null;
}

// The workspace_requires signal: git-aware when the workspace is a git repo
// (precise - tells session-produced code from a brownfield baseline), else the
// filesystem-existence fallback (shell-free, reliable in non-git workspaces and
// the test fixtures). Fail-open: a git error falls back to the FS check.
function workspaceHasWork(pd: string): boolean {
  if (isGitRepo(pd)) {
    const gitVerdict = gitHasSourceWork(pd);
    if (gitVerdict !== null) return gitVerdict;
  }
  return workspaceHasSourceFile(pd);
}

// The stage being completed. Declared at module scope so the type-only field
// lines carry no in-body coverage records (they are erased at runtime).
type VerifiableStage = {
  slug: string;
  name: string;
  phase: string;
  for_each?: string;
  produces?: string[];
  optional_produces?: string[];
  produces_kinds?: Record<string, UnitKind[]>;
  reviewer?: string;
  workspace_requires?: boolean;
};
// Did the stage produce anything, and is there real work behind it? The
// GUARD_EXEMPTED row this emits is audit evidence for a human declaration the
// guard honored, not a lifecycle mutation: the transition itself still waits on
// the decision this verdict feeds.
function evaluateStageArtifacts(context: StageCompletionGuardContext): LifecycleGuardVerdict {
  const { pd, stage } = context;
  if (artifactGuardDisabled()) return guardNotApplicable("AMADEUS_SKIP_ARTIFACT_GUARD is set");

  if (!producesArtifactsExist(pd, stage)) {
    // Built one statement per line rather than as a multi-line argument: a
    // continuation line of a single expression carries no DA record of its own
    // under bun's union merge, so the patch gate reads it as never executed.
    let reason = `Refusing to complete "${stage.slug}": one or more missing required artifacts `;
    reason += `under the intent's record directory. The stage protocol requires ${stage.name} `;
    reason += "to produce output before the gate.";
    let recovery = "Produce the artifacts before completing. ";
    recovery += `(declared: ${(stage.produces ?? []).join(", ") || "none"})`;
    return guardDenied({ reason, recovery });
  }

  if (stage.workspace_requires && !workspaceHasWork(pd)) {
    // docs-only exemption (Issue #499/#848): a declared Intent (registry
    // docsOnly, written only via `declare-docs-only`) has already had a human
    // confirm its produces are record-internal documents only, so the
    // workspace_requires refusal below does not apply. Emit GUARD_EXEMPTED so
    // the exemption is auditable, then let completion proceed. No declaration
    // (or an invalid one) falls through to the original refusal, preserving
    // #366's gap detection.
    const dirName = stateOperationTarget?.intent ?? activeIntent(pd);
    const declaration = dirName ? docsOnlyDeclaration(pd, dirName) : null;
    if (!declaration) {
      // One statement per line, for the same DA-record reason as above.
      let reason = `Refusing to complete "${stage.slug}": it is a code-producing stage `;
      reason += "(workspace_requires) but no source work is evident outside the amadeus/ ";
      reason += "workspace tree. In a git workspace this means no uncommitted change and no ";
      reason += "code in the last commit; otherwise no source file exists. Planning docs alone ";
      reason += `do not satisfy ${stage.name} - write the code to the workspace.`;
      let recovery = "If this Intent's produces are genuinely record-internal documents only, ";
      recovery += 'declare it first: amadeus-state.ts declare-docs-only --evidence "<approval reference>".';
      return guardDenied({ reason, recovery });
    }
    emitAudit(pd, "GUARD_EXEMPTED", {
      Stage: stage.slug,
      Evidence: declaration.evidence,
    });
  }
  return guardAllowed();
}

// Asked after the artifact policy because it is the narrower question: that
// layer establishes that a Unit produced artifacts and that real work exists
// behind them, and only then is "was that work reviewed" worth asking. Ordering
// it ahead would answer a Unit that produced nothing with a complaint about its
// missing review. Shares the artifact off-switch, as it did when the two lived
// in one function.
function evaluateUnitReview(context: StageCompletionGuardContext): LifecycleGuardVerdict {
  const { pd, stage } = context;
  if (artifactGuardDisabled()) return guardNotApplicable("AMADEUS_SKIP_ARTIFACT_GUARD is set");
  const unreviewed = unitsMissingReview(pd, stage);
  if (unreviewed.length === 0) return guardAllowed();
  // Built one statement per line rather than as a multi-line argument: a
  // continuation line of a single call carries no DA record of its own under
  // bun's union merge, so the patch gate reads it as never executed.
  let message = `Refusing to complete "${stage.slug}": ${unreviewed.length} unit(s) produced `;
  message += `artifacts with no reviewer verdict recorded on them — ${unreviewed.join(", ")}. `;
  message += "The stage protocol requires the reviewer to run before the gate (§12a), and a ";
  message += "unit whose artifacts already exist will not be re-emitted for one.";
  let recovery = "Run §12a for ";
  recovery += "each unit named above, or halt for human direction if its review cannot be ";
  recovery += "established. Do not hand-write the Review block.";
  return guardDenied({ reason: message, recovery });
}

// The completion chokepoint. Called from approve/advance/finalize/
// complete-workflow BEFORE any state mutation, so a refusal (error() ->
// process.exit) leaves state untouched.
//
// Callers own the "is this transition actually completing" question: the three
// direct paths skip this when the slug is already [x] (an approve-delegated or
// replayed call already passed it), while approve always runs it.
function verifyStageCompletionGuards(pd: string, stage: VerifiableStage): void {
  refuseBlockedTransition(
    evaluateLifecycleGuards<StageCompletionGuardContext>({
      checkpoint: "stage-completion",
      targetRevision: `stage:${stage.slug}`,
      adapters: STAGE_COMPLETION_GUARDS,
      context: { pd, stage },
    }),
  );
}

function advanceScopeOrError(content: string): string {
  const scope = getField(content, "Scope");
  if (!scope) {
    error("State file has no Scope field. Refusing to advance — fix the state file first.");
  }
  if (!validScopes().has(scope)) {
    error(`State file has invalid Scope "${scope}". Valid scopes: ${[...validScopes()].join(", ")}.`);
  }
  return scope;
}

function resolveAdvanceNextStage(
  positional: readonly string[],
  completedSlug: string,
  scope: string,
  content: string,
): StageEntry {
  let nextSlug: string;
  if (positional.length >= 2) {
    nextSlug = positional[1];
    const stateOverrides = parseStateStageSuffixes(content);
    const nextAction = stateOverrides.get(nextSlug) ?? loadScopeMapping()[scope]?.stages[nextSlug];
    if (nextAction === "SKIP") {
      error(
        `Cannot advance to "${nextSlug}": stage is SKIP for scope "${scope}" (or state file). Pick the next EXECUTE stage or use 'skip'.`,
      );
    }
  } else {
    const next = nextInScopeStage(completedSlug, scope, content);
    if (!next) {
      error(
        `No next in-scope stage after "${completedSlug}" for scope "${scope}". ` +
          `Use 'complete-workflow' if this was the final stage.`,
      );
    }
    nextSlug = next.slug;
  }
  const nextStage = findStageBySlug(nextSlug);
  if (!nextStage) error(`Unknown stage: ${nextSlug}`);
  return nextStage;
}

function inspectCompletedAdvanceState(
  pd: string,
  content: string,
  completedSlug: string,
): {
  alreadyMarkedCompleted: boolean;
  currentStageField: string | null;
  stageCompletedAlreadyAudited: boolean;
} {
  const completedCbBefore = stageCheckboxOrError(
    content,
    completedSlug,
    `advance:complete:${completedSlug}`,
  );
  const currentStageField = getField(content, "Current Stage");
  const alreadyMarkedCompleted = completedCbBefore.state === "completed";
  if (completedSlug !== currentStageField && !alreadyMarkedCompleted) {
    error(
      `Cannot advance "${completedSlug}": Current Stage is "${currentStageField}" and "${completedSlug}" is ${
        completedCbBefore.state
      }. Pass the slug that's actually active, or use 'skip' / 'complete-workflow'.`,
    );
  }
  return {
    alreadyMarkedCompleted,
    currentStageField,
    stageCompletedAlreadyAudited:
      alreadyMarkedCompleted && hasStageAuditEvent(pd, "STAGE_COMPLETED", completedSlug),
  };
}

function isAdvanceReplay(
  content: string,
  nextSlug: string,
  currentStageField: string | null,
  alreadyMarkedCompleted: boolean,
  stageCompletedAlreadyAudited: boolean,
): boolean {
  const nextCbBefore = stageCheckboxOrError(content, nextSlug, `advance:start:${nextSlug}`);
  const nextAlreadyStarted =
    nextCbBefore.state === "in-progress" ||
    nextCbBefore.state === "awaiting-approval" ||
    nextCbBefore.state === "revising";
  return (
    alreadyMarkedCompleted &&
    stageCompletedAlreadyAudited &&
    nextAlreadyStarted &&
    currentStageField === nextSlug
  );
}

function emitAdvanceAudit(
  pd: string,
  content: string,
  completedStage: StageEntry,
  nextStage: StageEntry,
  scope: string,
  completedCount: number,
  alreadyMarkedCompleted: boolean,
  stageCompletedAlreadyAudited: boolean,
): string {
  const crossesPhaseBoundary = completedStage.phase !== nextStage.phase;
  try {
    if (!alreadyMarkedCompleted || !stageCompletedAlreadyAudited) {
      emitAudit(pd, "STAGE_COMPLETED", {
        Stage: completedStage.slug,
        Details: `Stage ${completedStage.name} completed`,
      });
    }
    if (crossesPhaseBoundary) {
      content = markPhaseVerified(content, completedStage.phase);
      content = setPhaseProgress(content, nextStage.phase, "Active");
      emitAudit(pd, "PHASE_COMPLETED", {
        "From phase": completedStage.phase,
        "To phase": nextStage.phase,
        "Stages completed": String(completedCount),
      });
      emitAudit(pd, "PHASE_VERIFIED", {
        "Phase boundary": `${completedStage.phase} → ${nextStage.phase}`,
      });
      emitAudit(pd, "PHASE_STARTED", { Phase: nextStage.phase, Scope: scope });
    }
  } catch (cause) {
    error(`Audit emission failed: ${errorMessage(cause)}`);
  }
  return content;
}

export function handleAdvance(args: string[]): void {
  // Keep only the positional <completed-slug> [<next-slug>]; any flags are
  // filtered out so they are not misread as the next slug.
  const positional = args.filter((a) => !a.startsWith("--"));
  if (positional.length < 1)
    error("Usage: amadeus-state.ts advance <completed-slug> [<next-slug>]");
  const completedSlug = positional[0];

  const pd = resolveProjectDir(projectDir);
  // C2b lost-update safety: the whole read→decide→emit-audit→write critical
  // section runs under one audit lock so the next-stage derivation, the 5 audit
  // rows, and the state write all commit atomically against a single snapshot
  // (decide-inside-lock). emitAudit detects the held lock and uses the unlocked
  // append variant, so audit + state land together (audit-first). The replay
  // guard's early `return` exits the arrow cleanly; the lock releases in
  // withAuditLock's finally.
  operationWithLock(pd, () => {
  let content = operationReadState(pd);

  // Look up stage data
  const completedStage = findStageBySlug(completedSlug);
  if (!completedStage) error(`Unknown stage: ${completedSlug}`);

  // Scope is authoritative for deriving next stage — refuse silent "feature"
  // fallback when the state file is missing or corrupted. Adversarial finding.
  const scope = advanceScopeOrError(content);

  // Slug validation — `advance <slug>` is a post-gate-approval transition.
  // The caller must have just finished <completedSlug>. Silently accepting
  // any slug (even ones unrelated to the current state) would mutate
  // unrelated stages and emit bogus events.
  //
  // Accept two shapes cleanly:
  //   1. completedSlug matches `Current Stage` (normal post-approve flow);
  //   2. completedSlug is already `[x]` (idempotent replay / approve-first).
  // Anything else errors.
  const { alreadyMarkedCompleted, currentStageField, stageCompletedAlreadyAudited } =
    inspectCompletedAdvanceState(pd, content, completedSlug);

  // If next-slug was not provided, derive it from the scope AND state file.
  // The state file's EXECUTE/SKIP suffix (set by handleInit with Greenfield
  // overrides) and per-stage checkbox state take precedence over the
  // scope-mapping.json defaults.
  const nextStage = resolveAdvanceNextStage(positional, completedSlug, scope, content);
  const nextSlug = nextStage.slug;

  const dirCheck = advanceDirectionCheck(
    stageIndex(completedSlug),
    stageIndex(nextSlug)
  );
  if (!dirCheck.ok)
    error(`Cannot advance from "${completedSlug}" to "${nextSlug}": ${dirCheck.reason}`);
  // Idempotency guard — if completedSlug is already [x] AND nextSlug has
  // already left pending with Current Stage pointing at it, this is a replay.
  // Skip the whole emission block and exit cleanly, rather than doubling
  // STAGE_STARTED / PHASE_COMPLETED / PHASE_VERIFIED / PHASE_STARTED.
  // Adversarial finding: the previous alreadyMarkedCompleted guard only
  // suppressed STAGE_COMPLETED; phase events still doubled.
  // The next stage counts as already-started in ANY of its post-start gate
  // states — in-progress, awaiting-approval, revising. Matching only
  // in-progress let a stale replay demote a gate-held `[?]`/`[R]` next stage
  // back to `[-]` and re-emit STAGE_STARTED.
  const isReplay = isAdvanceReplay(
    content,
    nextSlug,
    currentStageField,
    alreadyMarkedCompleted,
    stageCompletedAlreadyAudited,
  );
  if (isReplay) {
    console.log(
      JSON.stringify({
        completed: completedSlug,
        started: nextSlug,
        replay: true,
        timestamp: isoTimestamp(),
      })
    );
    return;
  }

  // Completion guards (artifacts #366 + blocking sensors #2671). Only enforce
  // when THIS advance is the transition that completes the stage - i.e. it was
  // not already [x]. When approve delegates here the slug is already [x] and
  // approve ran the guards itself, so skip to avoid a double check. A direct
  // `advance <active-slug>` (the gate-skipping attack path) is NOT
  // alreadyMarkedCompleted, so it is guarded. Runs before any mutation;
  // error() exits leaving state untouched.
  if (!alreadyMarkedCompleted) {
    verifyStageCompletionGuards(pd, completedStage);
  }

  // Detect phase boundary (for PHASE_COMPLETED/VERIFIED/STARTED emissions)
  const crossesPhaseBoundary = completedStage.phase !== nextStage.phase;

  // Phase-check artifact gate (#886). Same guard condition as the stage-artifact
  // guard above: only enforce on the transition that ACTUALLY closes the phase
  // (an approve-delegated / replay call is alreadyMarkedCompleted and already
  // passed it). Runs before any state write; a refusal exits leaving the state
  // file untouched (the markPhaseVerified flip below is discarded with it).
  if (crossesPhaseBoundary && !alreadyMarkedCompleted) {
    verifyPhaseCheckArtifact(pd, completedStage.phase);
  }

  // 1. Mark completed-slug → [x] (idempotent)
  content = requireChanged(
    setCheckbox(validateStageState(content), completedSlug, "completed"),
    `advance:complete:${completedSlug}`,
  );

  // 2. Mark next-slug → [-]
  content = requireChanged(
    setCheckbox(validateStageState(content), nextSlug, "in-progress"),
    `advance:start:${nextSlug}`,
  );

  // 3. Update fields
  const nextAfterNext = nextInScopeStage(nextSlug, scope, content);
  const timestamp = isoTimestamp();

  content = setField(content, "Current Stage", nextStage.slug);
  content = setField(content, "Lifecycle Phase", nextStage.phase.toUpperCase());
  content = setField(content, "Next Stage", nextAfterNext ? nextAfterNext.slug : "none");
  content = setField(content, "In Progress", nextStage.slug);
  content = setField(content, "Active Agent", nextStage.lead_agent);
  content = setField(content, "Status", "Running");
  content = setField(content, "Last Updated", timestamp);
  content = setField(content, "Last Completed Stage", completedSlug);
  content = setField(content, "Next Action", `Execute ${nextStage.name}`);

  const rebuilt = rebuildCompletedFieldFromState(content);
  content = rebuilt.content;
  const completedCount = rebuilt.completedCount;

  // 4. Atomic audit emission — audit-first, then state write.
  // If audit fails, throw before touching state (writeStateFile below is skipped).
  content = emitAdvanceAudit(
    pd,
    content,
    completedStage,
    nextStage,
    scope,
    completedCount,
    alreadyMarkedCompleted,
    stageCompletedAlreadyAudited,
  );
  try {
    emitAudit(pd, "STAGE_STARTED", {
      Stage: nextSlug,
      Agent: nextStage.lead_agent,
    });
  } catch (cause) {
    error(`Audit emission failed: ${errorMessage(cause)}`);
  }

  operationWriteState(pd, content);

  console.log(
    JSON.stringify({
      completed: completedSlug,
      started: nextSlug,
      phase: nextStage.phase.toUpperCase(),
      phase_boundary: crossesPhaseBoundary,
      completed_count: completedCount,
      next_after: nextAfterNext ? nextAfterNext.slug : null,
      already_completed: alreadyMarkedCompleted,
      memory_path: relativeMemoryPath(
        nextStage.phase,
        nextStage.slug,
        operationRelativeRecordDir(pd),
      ),
      timestamp,
    })
  );
  });
}

export function handleFinalize(args: string[]): void {
  // Keep <completed-slug> positional; any flags are filtered out.
  const positional = args.filter((a) => !a.startsWith("--"));
  if (positional.length < 1)
    error("Usage: amadeus-state.ts finalize <completed-slug>");
  const completedSlug = positional[0];

  const pd = resolveProjectDir(projectDir);
  // C2b lost-update safety: read→decide→write under one lock (no audit here).
  withAuditLock(pd, () => {
  let content = readStateFile(pd);

  const completedStage = findStageBySlug(completedSlug);
  if (!completedStage) error(`Unknown stage: ${completedSlug}`);

  // Completion guards (artifacts #366 + blocking sensors #2671). finalize also
  // marks a stage [x], so it is a completing transition that must not
  // rubber-stamp. Guard only when the slug is not already [x] (an idempotent
  // re-finalize already passed the guards), and before any mutation so a
  // refusal leaves state untouched.
  const alreadyMarkedCompleted = stageCheckboxOrError(
    content,
    completedSlug,
    `finalize:${completedSlug}`,
  ).state === "completed";
  if (!alreadyMarkedCompleted) {
    verifyStageCompletionGuards(pd, completedStage);
  }

  // 1. Mark completed
  content = requireChanged(
    setCheckbox(validateStageState(content), completedSlug, "completed"),
    `finalize:${completedSlug}`,
  );

  // 2. Sync derived plan fields to the effective EXECUTE plan.
  const rebuilt = rebuildCompletedFieldFromState(content);
  content = rebuilt.content;
  const completedCount = rebuilt.completedCount;

  // 3. Look up next in-scope stage. Refuse silent fallback on missing/invalid
  // Scope — matches handleAdvance's stance. Adversarial: pre-Phase-11 code
  // silently used "feature" when Scope was absent, hiding state-file corruption.
  const scope = getField(content, "Scope");
  if (!scope) {
    error(
      `State file has no Scope field. Refusing to finalize — fix the state file first.`
    );
  }
  if (!validScopes().has(scope)) {
    error(
      `State file has invalid Scope "${scope}". Valid scopes: ${[...validScopes()].join(", ")}.`
    );
  }
  // Thread the live state content into BOTH walks so per-stage EXECUTE/SKIP
  // suffix overrides (a recomposed plan) and prior [x]/[S] checkboxes are
  // honoured - the same threading the advance path does (:869/:935). Without
  // it these two calls project the next move from the STATIC scope grid and
  // route around any recompose flip.
  const nextStage = nextInScopeStage(completedSlug, scope, content);
  const nextAfterNext = nextStage ? nextInScopeStage(nextStage.slug, scope, content) : null;
  const timestamp = isoTimestamp();

  if (nextStage === null) {
    completeWorkflowForTarget([completedSlug], pd);
    return;
  }

  // Phase-check artifact gate (#886). finalize flips markPhaseVerified for the
  // completed phase on BOTH the terminal branch (no next stage) and the
  // boundary-crossing branch (next stage in a different phase) below — gate
  // exactly those. A same-phase finalize closes no phase and is not gated.
  // Guarded by !alreadyMarkedCompleted (an idempotent re-finalize already
  // passed). Runs before writeStateFile so a refusal leaves the state untouched.
  if (!alreadyMarkedCompleted && (!nextStage || completedStage.phase !== nextStage.phase)) {
    verifyPhaseCheckArtifact(pd, completedStage.phase);
  }

  // 4. Update state fields (but do NOT mark next stage [-] or set In Progress)
  content = setField(content, "Current Stage", nextStage.slug);
  content = setField(content, "Next Stage", nextAfterNext ? nextAfterNext.slug : "none");
  content = setField(content, "Lifecycle Phase", nextStage.phase.toUpperCase());
  content = setField(content, "Active Agent", nextStage.lead_agent);
  if (completedStage.phase !== nextStage.phase) {
    content = markPhaseVerified(content, completedStage.phase);
    content = setPhaseProgress(content, nextStage.phase, "Active");
  }
  content = setField(content, "Last Completed Stage", completedSlug);
  content = setField(content, "Last Updated", timestamp);
  content = setField(content, "Next Action", nextStage ? `Resume from ${nextStage.name}` : "Workflow complete");

  operationWriteState(pd, content);
  console.log(
    JSON.stringify({
      completed: completedSlug,
      completed_count: completedCount,
      next_stage: nextStage?.slug || "none",
      phase: nextStage?.phase.toUpperCase() || completedStage.phase.toUpperCase(),
      timestamp,
    })
  );
  });
}

export function handleCompleteWorkflow(args: string[]): void {
  runSelectedIntentOperation(
    args,
    completeWorkflowForTarget,
    "complete-workflow could not resolve the selected Intent.",
  );
}

// C9/ADR-3: non-blocking auto-decision summary (R-3). Every branch —
// including anything this helper did not anticipate — resolves to a warning
// string, never a thrown error: a defect in report generation must never turn
// a real completion into a failed one.
export function generateAutoDecisionSummaryOutcome(
  pd: string,
  completionRecordDir: string | null,
): { path: string | null; warning: string | null } {
  try {
    if (completionRecordDir === null) {
      return { path: null, warning: formatSummaryBuildError({ kind: "record-dir-unresolved" }) };
    }
    const built = buildAutoDecisionSummary(pd, completionRecordDir);
    if (!built.ok) return { path: null, warning: formatSummaryBuildError(built.error) };
    const written = writeAutoDecisionSummaryMarkdown(completionRecordDir, built.summary);
    if (written.ok) return { path: written.relativePath, warning: null };
    return { path: null, warning: formatSummaryBuildError(written.error) };
  } catch (cause) {
    return { path: null, warning: `generation-failed:${cause instanceof Error ? cause.message : String(cause)}` };
  }
}

function completeWorkflowForTarget(args: string[], pd: string): void {
  // Keep <completed-slug> positional and distinct from the --reason value.
  // --reason takes a value, so its argument is excluded from positionals too.
  const reasonIdx = args.indexOf("--reason");
  const reasonValueIdx = reasonIdx !== -1 ? reasonIdx + 1 : -1;
  const completionInstanceIdx = args.indexOf("--completion-instance");
  const completionInstanceValueIdx =
    completionInstanceIdx !== -1 ? completionInstanceIdx + 1 : -1;
  const positional = args.filter(
    (a, i) =>
      !a.startsWith("--") &&
      i !== reasonValueIdx &&
      i !== completionInstanceValueIdx,
  );
  if (positional.length < 1)
    error(
      "Usage: amadeus-state.ts complete-workflow <completed-slug> [--reason <text>] [--completion-instance <instance>] [--intent <record>] [--space <name>]",
    );
  const completedSlug = positional[0];

  // Optional --reason flag for recording why the workflow completed early
  let reason: string | undefined;
  if (reasonIdx !== -1 && reasonIdx + 1 < args.length) {
    reason = args[reasonIdx + 1];
  }
  const requestedInstance =
    completionInstanceIdx !== -1 && completionInstanceIdx + 1 < args.length
      ? args[completionInstanceIdx + 1]
      : undefined;

  // C2b lost-update safety: read→decide→emit-audit→write under one lock and one
  // snapshot. Each persisted step is replay-safe, so a crash between steps can
  // resume without duplicating the completion audit rows.
  operationWithLock(pd, () => {
  let content = operationReadState(pd);
  const completion = workflowCompletionPreparation(content);

  const completedStage = findStageBySlug(completedSlug);
  if (!completedStage) error(`Unknown stage: ${completedSlug}`);
  // Round one of the workflow-completion checkpoint: everything answerable from
  // the state document alone, before the completion instance is resolved.
  refuseBlockedTransition(
    evaluateLifecycleGuards<WorkflowPreparationGuardContext>({
      checkpoint: "workflow-completion",
      targetRevision: `workflow:${completedSlug}`,
      adapters: WORKFLOW_COMPLETION_PREPARATION_GUARDS,
      context: { pd, content, completedSlug, requestedInstance },
    }),
  );

  // If the slug is already [x], approve already emitted STAGE_COMPLETED —
  // skip re-emission to avoid duplicates. Matches handleAdvance's
  // alreadyMarkedCompleted guard.
  const alreadyMarkedCompleted = stageCheckboxOrError(
    content,
    completedSlug,
    `complete-workflow:${completedSlug}`,
  ).state === "completed";
  const stageCompletedAlreadyAudited =
    alreadyMarkedCompleted && hasStageAuditEvent(pd, "STAGE_COMPLETED", completedSlug);
  const completionInstance = completion?.instance ??
    `terminal:${completedSlug}`;
  // Round two: the Intent record and the Goal authority. A blocked decision here
  // splits by audit disposition — a receipt that has not settled is a waiting
  // state the workflow recovers from (the engine's await-completion directive,
  // no ERROR_LOGGED row), everything else is a genuine failure.
  // Captured once, before the completion-registry mutations below (which may
  // clear the active-intent cursor) — buildAutoDecisionSummary reuses this
  // same resolved path later rather than re-resolving recordDir post-cursor-
  // clear, where an implicit (non---intent) resolution could go ambiguous.
  const completionRecordDir = operationRecordDir(pd);
  const authorization = evaluateLifecycleGuards<WorkflowAuthorizationGuardContext, GoalReconciliationReceipt>({
    checkpoint: "workflow-completion",
    targetRevision: `workflow:${completedSlug}@${completionInstance}`,
    adapters: WORKFLOW_COMPLETION_AUTHORIZATION_GUARDS,
    context: {
      pd,
      content,
      completedSlug,
      completionInstance,
      recordDir: completionRecordDir,
    },
  });
  if (authorization.kind === "blocked") {
    const refusal = formatGuardRefusal(authorization.refusal);
    if (authorization.refusal.audit === "none") awaitCompletion(refusal);
    error(refusal);
  }
  const completionReceipt = guardReceipt(
    authorization,
    WORKFLOW_COMPLETION_GOAL_RECEIPT_POLICY,
  );
  const stateAlreadyCompleted =
    getField(content, "Status")?.trim() === "Completed";

  // Completion guards (artifacts #366 + blocking sensors #2671).
  // complete-workflow marks the FINAL stage [x], so it is a completing
  // transition too. Guard only when the slug is not already [x]: approve
  // delegates here AFTER marking the slug [x] and running the guards itself, so
  // this skips the double-check on that path while still refusing a direct
  // `complete-workflow <active-slug>` that never produced artifacts or left a
  // blocking sensor unresolved. Runs before any mutation so a refusal leaves
  // state untouched.
  if (!alreadyMarkedCompleted) {
    verifyStageCompletionGuards(pd, completedStage);
    // Phase-check artifact gate (#886). complete-workflow always closes
    // completedStage.phase (an implicit "phase → end" boundary) and flips it
    // Verified below, so gate it the same way as advance's boundary block.
    // Before any mutation → a refusal leaves the state untouched.
    verifyPhaseCheckArtifact(pd, completedStage.phase);
  }

  const timestamp = isoTimestamp();
  if (!stateAlreadyCompleted) {
    // Mark the final stage and every terminal field in one state-file rename.
    content = requireChanged(
      setCheckbox(validateStageState(content), completedSlug, "completed"),
      `complete-workflow:${completedSlug}`,
    );
    content = rebuildCompletedFieldFromState(content).content;
    content = setField(content, "Status", "Completed");
    if (completion !== null) {
      content = setOrInsertField(
        content,
        "## Runtime State",
        "Workflow Completion Status",
        "completed",
      );
    }
    content = setField(content, "Last Updated", timestamp);
    content = setField(content, "Last Completed Stage", completedSlug);
    content = setField(content, "In Progress", "none");
    content = setField(content, "Next Stage", "none");
    content = setField(content, "Next Action", "Workflow complete");
    content = markPhaseVerified(content, completedStage.phase);
  }
  const completedCount = rebuildCompletedFieldFromState(content).completedCount;

  emitWorkflowCompletionAuditRows({
    pd,
    content,
    completedSlug,
    completedStageName: completedStage.name,
    completedPhase: completedStage.phase,
    completedCount,
    completionInstance,
    alreadyMarkedCompleted,
    stageCompletedAlreadyAudited,
    receipt: completionReceipt,
    ...(reason ? { reason } : {}),
  });

  const autonomyCompletion = commitProductionIntentCompletion({
    projectDir: pd,
    ...(stateOperationTarget?.intent ? { intent: stateOperationTarget.intent } : {}),
    ...(stateOperationTarget?.space ? { space: stateOperationTarget.space } : {}),
  });
  assertIntentAutonomyCompletion(autonomyCompletion);
  if (!stateAlreadyCompleted) {
    operationWriteState(pd, content);
  }
  injectWorkflowCompletionCrash("after-state-completed");

  // C9/ADR-3: must run BEFORE completeIntentRegistryRow below: listProductionAutoDecisions
  // resolves this Intent's review lifecycle off the intents.json status row, and
  // a "completed" lifecycle demands a committed completion-seal audit row that a
  // baseline/"none"-autonomy Intent never writes (commitProductionIntentCompletion
  // above tolerates "active-intent-required" as a no-op). Reading the summary
  // while the registry row still says "in-flight" resolves lifecycle "active",
  // which skips the seal requirement entirely — R-4 only pins this to run after
  // the state write and before the completion JSON, not relative to the
  // registry flip, so this ordering stays inside the mandated window.
  const summaryOutcome = generateAutoDecisionSummaryOutcome(pd, completionRecordDir);
  const autoDecisionSummaryPath = summaryOutcome.path;
  const autoDecisionSummaryWarning = summaryOutcome.warning;

  // Intent status lifecycle: terminal completion flips the active intent's
  // registry row to "complete". This is the determinism (field write) gated by
  // the human-confirmed completion that drove complete-workflow here — never an
  // automatic inference from state, so a crashed run never self-completes. Runs
  // under the workspace lock already held (every intents.json mutation takes the
  // sentinel bucket). No-op for the legacy flat record (no registry row).
  const completedIntentDir = completeIntentRegistryRow(pd);
  injectWorkflowCompletionCrash("after-registry-complete");
  if (completedIntentDir !== null) {
    clearActiveIntentCursor(
      pd,
      completedIntentDir,
      stateOperationTarget?.space,
    );
  }
  injectWorkflowCompletionCrash("after-cursor-clear");

  console.log(
    JSON.stringify({
      completed: completedSlug,
      completed_count: completedCount,
      status: "Completed",
      reason: reason || null,
      timestamp,
      auto_decision_summary: autoDecisionSummaryPath,
      auto_decision_summary_warning: autoDecisionSummaryWarning,
      workflow_result: completionWorkflowResultEnvelope(autonomyCompletion),
    })
  );
  });
}

function assertIntentAutonomyCompletion(
  completion: ReturnType<typeof commitProductionIntentCompletion>,
): void {
  if (!completion.ok && completion.error !== "active-intent-required") {
    error(`Intent autonomy completion failed: ${completion.error}`);
  }
}

function completionWorkflowResultEnvelope(
  completion: ReturnType<typeof commitProductionIntentCompletion>,
): Record<string, unknown> | null {
  if (!completion.ok) return null;
  const result = completion.result.result;
  return {
    outcome: result.outcome,
    reason_code: result.reasonCode,
    retryable: result.retryable,
    intent_uuid: result.intentUuid,
    autonomy_mode: result.autonomyMode,
    workflow_execution_state: "completed",
    grant: result.grant,
    evidence_fingerprint: result.evidenceFingerprint,
    resume_condition: result.resumeCondition,
  };
}

// Terminal completion flips the target intent's registry row to "complete".
// Cursor release happens later, after every completion row and the state file
// commit have landed. No-op for the legacy flat record (no registry row). Must
// run under the workspace lock the caller already holds.
function completeIntentRegistryRow(pd: string): string | null {
  const completedIntentDir = stateOperationTarget?.intent ?? activeIntent(pd);
  if (!completedIntentDir) return null;
  withLockedIntentRegistry(
    pd,
    (context) =>
      transitionIntentStatusLocked(context, completedIntentDir, "complete"),
    stateOperationTarget?.space,
  );
  return completedIntentDir;
}

function appendLifecycleEvent(
  event: IntentLifecycleAuditEvent,
  shard: string,
  pd: string,
  intentDir: string,
  space: string,
): void {
  const fields = {
    Intent: event.intentDir,
    "From Status": event.fromStatus,
    "To Status": event.toStatus,
    "Operation Id": event.operationId,
    "User Input": event.userInput,
    "Human Turn Timestamp": event.humanTurnTimestamp,
  };
  if (event.eventType === "INTENT_ARCHIVED") {
    appendLifecycleAuditEntryUnlocked(
      "INTENT_ARCHIVED", fields, pd, intentDir, space, shard,
    );
  } else {
    appendLifecycleAuditEntryUnlocked(
      "INTENT_UNARCHIVED", fields, pd, intentDir, space, shard,
    );
  }
}

function handleIntentLifecycle(args: string[], verb: IntentLifecycleVerb): void {
  const inputIndex = args.indexOf("--user-input");
  const intentDir = args.find((arg, index) =>
    !arg.startsWith("--") && index !== inputIndex + 1
  );
  if (!intentDir || inputIndex === -1 || inputIndex + 1 >= args.length) {
    error(`Usage: amadeus-state.ts ${verb} <intent-dir> --user-input <text>`);
  }
  // Canonical entrance normalization (Issue #2583). The audit block format
  // cannot round-trip surrounding whitespace: the ledger read side trims every
  // string field, while the write side and the post-append expectation keep the
  // value verbatim (only CRLF is escaped). An untrimmed value is therefore
  // structurally guaranteed to mismatch, and because the mismatch is diagnosed
  // *after* the append, the transaction journal survives — every later attempt
  // replays the same throw and the space's archive/unarchive wedges for good.
  // Normalizing here makes the recorded value a fixed point of the read side,
  // so the unrepresentable state is never constructed (parse, don't validate).
  // This is the only normalization point: nothing downstream trims again.
  // A whitespace-only value collapses to "", which is exactly the already
  // supported `--user-input ""` (it round-trips), so no input that used to be
  // accepted is rejected here.
  const userInput = args[inputIndex + 1].trim();
  const pd = resolveProjectDir(projectDir);
  const space = activeSpace(pd);
  try {
    const result = withIntentLifecyclePreflight(
      pd,
      space,
      appendLifecycleEvent,
      (context, recovery) => {
        if (recovery.kind !== "none") {
          return { operationId: recovery.operationId, recovered: true };
        }
        return {
          operationId: runIntentLifecycleTransactionLocked(
            context,
            intentDir,
            verb,
            userInput,
            appendLifecycleEvent,
          ),
          recovered: false,
        };
      },
    );
    console.log(JSON.stringify({
      intent: intentDir,
      status: verb === "archive" ? "archived" : "in-flight",
      operation_id: result.operationId,
      recovered: result.recovered,
    }));
  } catch (cause) {
    const message = errorMessage(cause);
    // A workspace-lock timeout cannot be audited without waiting on the same
    // unavailable lock for another full retry budget. Report it directly: no
    // transaction exists yet, and the lock holder remains the audit authority.
    if (message.startsWith("Failed to acquire audit lock")) {
      process.stderr.write(`${JSON.stringify({ error: `${verb}: ${message}` })}\n`);
      process.exit(1);
    }
    error(`${verb}: ${message}`);
  }
}

export function handleArchive(args: string[]): void {
  handleIntentLifecycle(args, "archive");
}

export function handleUnarchive(args: string[]): void {
  handleIntentLifecycle(args, "unarchive");
}

// --- New gate/approve/reject/skip/revise/resume/reuse-artifact commands (state-machine refactor #50) ---

// Helper: get the current state of a specific slug
function getSlugState(content: string, slug: string): CheckboxState | null {
  const checkboxes = parseCheckboxes(content);
  const match = checkboxes.find((c) => c.slug === slug);
  return match ? match.state : null;
}

function validateSlugInState(
  content: string,
  slug: string,
  expected: CheckboxState | CheckboxState[]
): void {
  const actual = getSlugState(content, slug);
  if (actual === null) error(`Stage not found in state file: ${slug}`);
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(actual)) {
    error(
      `Stage ${slug} is in state '${actual}' but command requires one of: ${allowed.join(", ")}`
    );
  }
}

// gate-start <slug> — transition [-] → [?], emit STAGE_AWAITING_APPROVAL.
// --recovered marks a BACKFILLED gate row (the engine opening a gate the
// conductor skipped, e.g. report's explicit-stage recovery) with
// Recovered=true so audit consumers can tell backfills from organic opens.
export function handleGateStart(args: string[]): void {
  runSelectedIntentOperation(
    args,
    gateStartForTarget,
    "gate-start could not resolve the selected Intent.",
  );
}

function gateStartForTarget(args: string[], pd: string): void {
  if (args.length < 1) {
    error(
      "Usage: amadeus-state.ts gate-start <slug> [--artifacts <csv>] [--recovered] [--intent <record>] [--space <name>]",
    );
  }
  const slug = args[0];
  let artifacts: string | undefined;
  const artifactsIdx = args.indexOf("--artifacts");
  if (artifactsIdx !== -1 && artifactsIdx + 1 < args.length) {
    artifacts = args[artifactsIdx + 1];
  }
  const recovered = args.includes("--recovered");

  // C2b lost-update safety: validate→transition→emit-audit→write under one
  // lock (the state-precondition check and the write see one snapshot).
  operationWithLock(pd, () => {
  let content = operationReadState(pd);

  const stage = findStageBySlug(slug);
  if (!stage) error(`Unknown stage: ${slug}`);
  validateSlugInState(content, slug, "in-progress");

  // E-OC1 evidence gate (#1101): refuse to open the approval gate when the
  // stage's questions file carries a filled [Answer] without ruling/approval
  // evidence. Fail-closed via error() BEFORE any transition is written, so a
  // refusal leaves the checkbox untouched and STAGE_AWAITING_APPROVAL unemitted.
  const rd = operationRecordDir(pd);
  // Enforcement cutoff (reviewer catch, PR #1106): 59/111 questions files in
  // the live corpus predate the E-OC1 evidence-header convention, so applying
  // the guard to pre-guard intents would hard-block unpark -> gate-start on
  // history the norm explicitly does not reach ("no retroactive checks").
  // Intents are dated by their record dir name (YYMMDD-...); only intents
  // born on/after the guard's adoption day are enforced. The cutoff is
  // canonical in amadeus-lib.ts (QUESTIONS_EVIDENCE_CUTOFF_YYMMDD), shared with
  // the advisory answer-evidence sensor so the two never drift.
  const intentDate = rd === null ? null : Number.parseInt(basename(rd).slice(0, 6), 10);
  const enforced =
    intentDate !== null &&
    Number.isFinite(intentDate) &&
    intentDate >= QUESTIONS_EVIDENCE_CUTOFF_YYMMDD;
  if (rd !== null && enforced) {
    const questionsPath = join(rd, stage.phase, slug, `${slug}-questions.md`);
    const ev = checkQuestionsEvidence(questionsPath);
    if (ev.kind === "fail" && ev.reason === "no-evidence") {
      error(`Refusing to gate-start "${slug}": ${slug}-questions.md has a filled [Answer] but no ruling reference (E-code) or leader-approval timestamp line. Record the E-OC1 evidence in the questions header, then retry.`);
    }
    if (ev.kind === "fail" && ev.reason === "unparseable-timestamp") {
      error(`Refusing to gate-start "${slug}": the approval evidence line in ${slug}-questions.md does not carry a parseable ISO timestamp. Fix the E-OC1 evidence header, then retry.`);
    }
  }

  content = requireChanged(
    setCheckbox(validateStageState(content), slug, "awaiting-approval"),
    `gate-start:${slug}`,
  );
  const timestamp = isoTimestamp();
  content = setField(content, "Last Updated", timestamp);

  try {
    const fields: Record<string, string> = { Stage: slug };
    if (artifacts) fields.Artifacts = artifacts;
    if (recovered) fields.Recovered = "true";
    emitAudit(pd, "STAGE_AWAITING_APPROVAL", fields);
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }
  recordGateOpenRefusal(pd, content, slug);

  operationWriteState(pd, content);
  console.log(JSON.stringify({ slug, new_state: "awaiting-approval", timestamp }));
  });
}

// The occurrence coordinates of one stage gate. Resolved here for every caller
// that needs them — the gate opens and the approval transaction — so the two can
// never disagree about which occurrence a given gate is. Null for a slug the
// graph does not know.
function stageAutonomyInputFor(
  pd: string,
  content: string,
  slug: string,
): ProductionStageAutonomyInput | null {
  const stage = findStageBySlug(slug);
  if (stage === undefined) return null;
  const scope = getField(content, "Scope") ?? "feature";
  const next = nextInScopeStage(slug, scope, content);
  return {
    projectDir: pd,
    stage: slug,
    phase: stage.phase,
    graphRevision: autonomyDigest(loadStageGraph()),
    walkingSkeleton:
      stage.phase === "construction" && firstInScopeStageOfPhase("construction", scope)?.slug === slug,
    phaseBoundary: next === null || next.phase !== stage.phase,
  };
}

// Record WHY this gate is being put to a human, alongside the
// STAGE_AWAITING_APPROVAL that opens it (#3152). Called from every site that
// emits that row — the first open, the re-presentation after a revision, and the
// gate a rejection backfills — while each still holds its own transaction lock.
// The recorder is fail-open, so a gate open never fails on account of this row.
//
// The record is named from `stateOperationTarget`, exactly as emitAudit names
// it: a gate opened for a selected Intent must not write its refusal into
// whichever record the active cursor points at.
function recordGateOpenRefusal(pd: string, content: string, slug: string): void {
  const input = stageAutonomyInputFor(pd, content, slug);
  if (input === null) return;
  recordAutonomyRefusalAtGateOpen({
    ...input,
    stateContent: content,
    intent: stateOperationTarget?.intent,
    space: stateOperationTarget?.space,
  });
}

// approve <slug> [--user-input <text>]
// Transition: [?] → [x] AND auto-advance to the next in-scope stage (or
// complete the workflow if this was the final stage). Human judgment ends
// at the gate response; everything after is deterministic bookkeeping, so
// approve owns it end-to-end. Emits GATE_APPROVED + STAGE_COMPLETED, then
// delegates to handleAdvance or handleCompleteWorkflow for the remaining
// transitions. Eliminates the t59-class bug where the orchestrator approved
// but forgot to call advance, leaving Current Stage pointing at a [x] slug.
// What let one gate resolution through: the Intent grant that decided it (a
// `Grant Id` to stamp) and the branch that authorised it (an `Approval
// Provenance` to stamp beside it). Declared at module scope so the type-only
// lines carry no in-body coverage records.
type GateResolutionAuthorization = {
  readonly grantId: string | null;
  readonly provenance: GateApprovalProvenance;
};

// Shared gate-resolution presence guard for approve AND reject (#675). A gate
// cannot be RESOLVED (approved or rejected) unless a real human acted at THIS
// gate since the last gate resolution. Call this BEFORE any state mutation so
// a refusal (error() -> exit) leaves state untouched. Carve-outs FIRST:
// autonomous Construction (swarm / Bolt) and the suite-wide test bypass never
// require presence. Both handleApprove and handleReject route through this
// single helper so a presence-check refinement (e.g. #671/#685's delegated
// provenance recognition inside humanActedSinceGate) applies to both verbs
// automatically instead of drifting between two hand-copied checks. The verb is
// forwarded to humanActedSinceGate so delegated provenance is verb-scoped (#685):
// a DELEGATED_APPROVAL opens ONLY approve, a DELEGATED_REJECTION opens ONLY
// reject — a local HUMAN_TURN still opens either. Per-kind slots (#736): a
// delegation's GATE slot is consumed only by GATE_APPROVED / GATE_REJECTED — an
// interview QUESTION_ANSWERED no longer consumes it (a HUMAN_TURN is still
// consumed by any resolution; see humanActedSinceGate for the full semantics).
// Returns the Intent grant id that opened the gate (a `Grant Id` to stamp on
// GATE_APPROVED) alongside the branch that authorised it (an `Approval
// Provenance` to stamp beside it, #3153 — so a reader can tell a human answer
// from an engine carry). A refusal exits via error().
//
// Milestone boundary (#3153): where autonomy DECLARED the gate human-required
// and the interaction is a milestone (phase-gate / walking-skeleton), the
// boundary is this gate's own STAGE_AWAITING_APPROVAL rather than the prior
// resolution — a turn typed before the gate existed answered a different
// question. Only `approve` narrows (FR-1 is about the approval), the kind and
// the declaration both come from the autonomy context rather than being
// recomputed here, and every other gate keeps the prior-resolution boundary.
function assertHumanPresentForGateResolution(
  pd: string,
  content: string,
  slug: string,
  verb: "approve" | "reject",
  intent?: string,
  space?: string
): GateResolutionAuthorization {
  let autonomy: ProductionAutonomyContext | null = null;
  if (verb === "approve") {
    const stageAutonomyInput = stageAutonomyInputFor(pd, content, slug);
    if (stageAutonomyInput !== null) {
      autonomy = productionStageAutonomy(stageAutonomyInput);
      if (autonomy.autoApprove) {
        const decision = commitProductionStageGateDecision({
          ...stageAutonomyInput,
          stateContent: content,
        });
        if (decision.kind === "decided" || decision.kind === "already-decided") {
          return { grantId: decision.grantId, provenance: "intent-grant" };
        }
        error(`Intent autonomy refused automatic approval for "${slug}": ${decision.reason}`);
      }
    }
  }
  if (humanPresenceGuardDisabled()) {
    // The suite-wide deterministic off-switch (AMADEUS_SKIP_HUMAN_PRESENCE_GUARD)
    // is recorded for what it is rather than dressed up as a human turn.
    return { grantId: null, provenance: "guard-disabled" };
  }
  const milestoneStage =
    autonomy !== null && autonomy.humanRequired && isMilestoneInteraction(autonomy.interactionKind) ? slug : null;
  const presence = resolveGateResolutionPresence(pd, verb, milestoneStage, intent, space);
  if (presence.ok) {
    // Ledger-event presence check: an unconsumed human act sits after this
    // gate's boundary in ledger order. Cascade-safety + freshness fall out of
    // that order; no marker file / turn counter.
    return { grantId: null, provenance: presence.provenance };
  }
  if (presence.reason === "gate-open-missing") {
    error(
      `Refusing to ${verb} "${slug}": this milestone gate has no recorded opening for a human to answer (no organic STAGE_AWAITING_APPROVAL; a --recovered backfill does not count). Run gate-start "${slug}", put the gate to a human, then ${verb}.`
    );
  }
  error(
    `Refusing to ${verb} "${slug}": a real human has not acted at this gate since it opened. The approval gate requires a typed human turn before it can commit. Acknowledge the gate as a human, then ${verb}. (autonomous Construction is exempt)`
  );
}

// Compaction detection over the merged audit buffer: true when the most
// recent SESSION_COMPACTED record has no later stage activity or explicit
// recovery. Buffer order (not timestamp order) mirrors the historical tail
// scan this replaced — within the common single-shard case they coincide.
const COMPACTION_PROGRESS_EVENTS = new Set([
  "STAGE_STARTED",
  "STAGE_COMPLETED",
  "GATE_APPROVED",
  "SESSION_RESUMED",
  "RECOVERY_COMPLETED",
]);

export function compactionPendingFromAudit(raw: string): boolean {
  const blocks = splitAuditRecords(raw);
  let lastCompact = -1;
  for (let i = 0; i < blocks.length; i += 1) {
    if (auditBlockField(blocks[i]!, "Event") === "SESSION_COMPACTED") lastCompact = i;
  }
  if (lastCompact === -1) return false;
  for (let i = lastCompact + 1; i < blocks.length; i += 1) {
    const event = auditBlockField(blocks[i]!, "Event");
    if (event !== null && COMPACTION_PROGRESS_EVENTS.has(event)) return false;
  }
  return true;
}

function revisionEvidenceFromAudit(raw: string): RevisionEvidenceEvent[] {
  const evidence: RevisionEvidenceEvent[] = [];
  const blocks = splitAuditRecords(raw);
  for (let bufferPosition = 0; bufferPosition < blocks.length; bufferPosition += 1) {
    const block = blocks[bufferPosition]!;
    const kind = auditBlockField(block, "Event");
    if (kind === null || !REVISION_EVIDENCE_EVENTS.has(kind as RevisionEvidenceEvent["kind"])) continue;
    evidence.push({
      kind: kind as RevisionEvidenceEvent["kind"],
      timestamp: auditBlockField(block, "Timestamp") ?? "",
      bufferPosition,
      stage: auditBlockField(block, "Stage"),
      file: auditBlockField(block, "File"),
      recovered: auditBlockField(block, "Recovered")?.toLowerCase() === "true",
    });
  }
  return evidence;
}

function revisionEvidenceForRecovery(pd: string): RevisionEvidenceEvent[] {
  const sharded: Array<{ readonly event: RevisionEvidenceEvent; readonly shard: number }> = [];
  const paths = operationAuditShards(pd);
  for (let shard = 0; shard < paths.length; shard += 1) {
    try {
      for (const event of revisionEvidenceFromAudit(readFileSync(paths[shard]!, "utf-8"))) {
        sharded.push({ event, shard });
      }
    } catch {
      return [];
    }
  }
  const shardsByTimestamp = new Map<string, Set<number>>();
  for (const { event, shard } of sharded) {
    const shards = shardsByTimestamp.get(event.timestamp) ?? new Set<number>();
    shards.add(shard);
    shardsByTimestamp.set(event.timestamp, shards);
  }
  if ([...shardsByTimestamp.values()].some((shards) => shards.size > 1)) return [];
  return sharded.map(({ event }) => event);
}

function declaredProducePaths(
  pd: string,
  stage: { readonly slug: string; readonly phase: string; readonly for_each?: string; readonly produces?: readonly string[] },
): string[] {
  const names = stage.produces ?? [];
  const absoluteRecord = operationRecordDir(pd);
  const relativeRecord = operationRelativeRecordDir(pd);
  if (absoluteRecord === null || relativeRecord === null) return [];
  let ownerPaths = [[stage.phase, stage.slug]];
  if (stage.for_each === "unit-of-work") {
    const dependencyPath = unitDependencyPath(pd);
    if (!existsSync(dependencyPath)) return [];
    let source: ReturnType<typeof recoverBoltDag>;
    try {
      source = recoverBoltDag(undefined, {
        kind: "content",
        path: dependencyPath,
        body: readFileSync(dependencyPath, "utf-8"),
      });
    } catch {
      return [];
    }
    if (source.kind !== "ok") return [];
    const units = source.batches.flat();
    if (units.length === 0) return [];
    ownerPaths = units.map((unit) => ["construction", unit, stage.slug]);
  }
  return ownerPaths.flatMap((ownerSegments) =>
    names.flatMap((name) => {
      const fileName = `${name}.md`;
      return [join(absoluteRecord, ...ownerSegments, fileName), `${relativeRecord}/${ownerSegments.join("/")}/${fileName}`];
    })
  );
}

function completedRecoveryRevision(
  raw: string,
  slug: string,
  stageName: string,
  expectedTransactionId: string,
  expectedRevision: number,
): number | null {
  const sourceBlocks = splitAuditRecords(raw);
  const byTransaction = new Map<string, PositionedAuditBlock[]>();
  for (let position = 0; position < sourceBlocks.length; position += 1) {
    const block = sourceBlocks[position]!;
    if (auditBlockField(block, "Stage") !== slug) continue;
    const transactionId = auditBlockField(block, "Transaction Id");
    if (transactionId === null) continue;
    const blocks = byTransaction.get(transactionId) ?? [];
    blocks.push({ block, position });
    byTransaction.set(transactionId, blocks);
  }
  const blocks = byTransaction.get(expectedTransactionId);
  if (blocks === undefined) return null;
  return completedTransactionRevision(
    blocks,
    sourceBlocks,
    slug,
    stageName,
    expectedTransactionId,
    expectedRevision,
  );
}

type PositionedAuditBlock = { readonly block: string; readonly position: number };

function completedTransactionRevision(
  blocks: readonly PositionedAuditBlock[],
  sourceBlocks: readonly string[],
  slug: string,
  stageName: string,
  transactionId: string,
  revisionCount: number,
): number | null {
  const candidates: CompletedTransactionWindow[] = [];
  for (let start = 0; start <= blocks.length - RECOVERY_BATCH_EVENTS.length; start += 1) {
    const candidate = validatedTransactionWindow(
      blocks.slice(start, start + RECOVERY_BATCH_EVENTS.length),
      slug,
      stageName,
      transactionId,
      revisionCount,
    );
    if (candidate !== null) candidates.push(candidate);
  }
  if (candidates.length !== 1) return null;
  const { timestamp, terminal } = candidates[0]!;
  if (sourceBlocks.some((block, position) => isNewerOrganicAnchor(block, position, slug, timestamp, terminal.position))) return null;
  return revisionCount;
}

type CompletedTransactionWindow = {
  readonly timestamp: string;
  readonly terminal: PositionedAuditBlock;
};

function validatedTransactionWindow(
  blocks: readonly PositionedAuditBlock[],
  slug: string,
  stageName: string,
  transactionId: string,
  revisionCount: number,
): CompletedTransactionWindow | null {
  if (blocks.length !== RECOVERY_BATCH_EVENTS.length) return null;
  if (!blocks.every(({ position }, index) => position === blocks[0]!.position + index)) return null;
  const timestamp = auditBlockField(blocks[0]!.block, "Timestamp");
  if (timestamp === null) return null;
  try {
    validateRecoveredApprovalBatch(blocks.map(({ block }) => block), {
      slug,
      stageName,
      timestamp,
      transactionId,
      revisionCount,
    });
  } catch {
    return null;
  }
  return { timestamp, terminal: blocks.at(-1)! };
}

function isNewerOrganicAnchor(
  block: string,
  position: number,
  slug: string,
  terminalTimestamp: string,
  terminalPosition: number,
): boolean {
  if (auditBlockField(block, "Stage") !== slug) return false;
  if (auditBlockField(block, "Recovered") === "true") return false;
  const event = auditBlockField(block, "Event");
  if (event !== "STAGE_STARTED" && event !== "STAGE_AWAITING_APPROVAL") return false;
  const timestamp = auditBlockField(block, "Timestamp") ?? "";
  return timestamp > terminalTimestamp || (timestamp === terminalTimestamp && position > terminalPosition);
}

type ApprovalAuditBlockInput = {
  readonly heading: string;
  readonly event: string;
  readonly timestamp: string;
  readonly fields: Readonly<Record<string, string>>;
};

// Row identity for a recovery batch: the shard's clone token, the resolved
// intent, and the seq of the first appended record (existing count + 1).
type RecoveryBatchIdentity = {
  readonly cloneId: string;
  readonly intentId: string;
  readonly baseSeq: number;
};

function approvalAuditBlock(
  input: ApprovalAuditBlockInput,
  identity: RecoveryBatchIdentity,
  offset: number,
): string {
  const escaped: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.fields)) {
    escaped[key] = escapeAuditValue(value);
  }
  return serializeJournalEntry({
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    seq: identity.baseSeq + offset,
    cloneId: identity.cloneId,
    intentId: identity.intentId,
    timestamp: input.timestamp,
    heading: input.heading,
    event: input.event,
    fields: escaped,
  });
}

function validateRecoveredApprovalBatch(
  blocks: readonly string[],
  input: RecoveredApprovalBatchInput,
): void {
  const blockIssues = blocks.map((block, index) => recoveredApprovalBlockIssue(block, index, input));
  const issue = blocks.length !== RECOVERY_BATCH_EVENTS.length
    ? "block count"
    : blockIssues.find((candidate) => candidate !== null) ?? recoveredApprovalSummaryIssue(blocks, input);
  if (issue !== null) throw Object.assign(new Error(`Recovery batch validation failed: ${issue}`), { name: "RecoveryBatchValidationError" });
}

function recoveredApprovalBlockIssue(
  block: string,
  index: number,
  input: RecoveredApprovalBatchInput,
): string | null {
  if (auditBlockField(block, "Event") !== RECOVERY_BATCH_EVENTS[index]) return `event ${index + 1}`;
  if (auditBlockField(block, "Timestamp") !== input.timestamp) return `timestamp ${index + 1}`;
  if (auditBlockField(block, "Stage") !== input.slug) return `stage ${index + 1}`;
  if (auditBlockField(block, "Transaction Id") !== input.transactionId) return `transaction ${index + 1}`;
  const recovered = auditBlockField(block, "Recovered");
  if (index < 3 ? recovered !== "true" : recovered !== null) return `recovered ${index + 1}`;
  if (index < 2 && auditBlockField(block, "Feedback") !== RECOVERED_REVISION_FEEDBACK) {
    return `feedback ${index + 1}`;
  }
  return null;
}

function recoveredApprovalSummaryIssue(
  blocks: readonly string[],
  input: RecoveredApprovalBatchInput,
): string | null {
  if (auditBlockField(blocks[1]!, "Revision count") !== String(input.revisionCount)) return "revision count";
  if (auditBlockField(blocks[4]!, "Details") !== `Stage ${input.stageName} approved by gate`) return "completion details";
  return null;
}

type RecoveredApprovalBatchInput = {
  readonly slug: string;
  readonly stageName: string;
  readonly timestamp: string;
  readonly transactionId: string;
  readonly revisionCount: number;
  readonly userInput?: string;
  readonly grantId?: string;
  readonly presenceReservationId?: string;
};

function buildRecoveredApprovalBatch(
  input: RecoveredApprovalBatchInput,
  identity: RecoveryBatchIdentity,
): string[] {
  const common = { Stage: input.slug, "Transaction Id": input.transactionId };
  const inputs: ApprovalAuditBlockInput[] = [
    {
      heading: "Gate Rejected",
      event: "GATE_REJECTED",
      timestamp: input.timestamp,
      fields: { ...common, Feedback: RECOVERED_REVISION_FEEDBACK, Recovered: "true" },
    },
    {
      heading: "Stage Revising",
      event: "STAGE_REVISING",
      timestamp: input.timestamp,
      fields: {
        ...common,
        "Revision count": String(input.revisionCount),
        Feedback: RECOVERED_REVISION_FEEDBACK,
        Recovered: "true",
      },
    },
    {
      heading: "Stage Awaiting Approval",
      event: "STAGE_AWAITING_APPROVAL",
      timestamp: input.timestamp,
      fields: { ...common, Recovered: "true" },
    },
    {
      heading: "Gate Approved",
      event: "GATE_APPROVED",
      timestamp: input.timestamp,
      fields: {
        ...common,
        ...(input.userInput ? { "User Input": input.userInput } : {}),
        ...(input.grantId ? { "Grant Id": input.grantId } : {}),
        ...(input.presenceReservationId
          ? { "Presence Reservation Id": input.presenceReservationId }
          : {}),
      },
    },
    {
      heading: "Stage Completion",
      event: "STAGE_COMPLETED",
      timestamp: input.timestamp,
      fields: {
        ...common,
        Details: `Stage ${input.stageName} approved by gate`,
        ...(input.presenceReservationId
          ? { "Presence Reservation Id": input.presenceReservationId }
          : {}),
      },
    },
  ];
  return inputs.map((entry, offset) => approvalAuditBlock(entry, identity, offset));
}

function commitRecoveredApprovalBatch(pd: string, input: RecoveredApprovalBatchInput): void {
  const path = auditFilePath(
    pd,
    stateOperationTarget?.intent,
    stateOperationTarget?.space,
  );
  mkdirSync(dirname(path), { recursive: true });
  const before = existsSync(path) ? readFileSync(path, "utf-8") : "";
  const blocks = buildRecoveredApprovalBatch(input, {
    cloneId: auditCloneId(pd),
    intentId: activeIntent(pd, stateOperationTarget?.space, stateOperationTarget?.intent) ?? "workspace",
    baseSeq: splitJournalLines(before).length + 1,
  });

  validateRecoveredApprovalBatch(blocks, input);

  writeFileAtomic(path, before + blocks.join(""));
}

type ApprovalAuthorization = {
  readonly audit: string;
  readonly committedRevision: number | null;
  readonly grantId: string | null;
  // The branch that authorised this approval, or null on the paths that never
  // asked (an already-committed revision, or an override whose caller carries
  // its own evidence — a presence reservation).
  readonly provenance: GateApprovalProvenance | null;
  readonly recovery: GateRevisionRecovery | null;
  readonly override?: ApprovalAuthorizationOverride;
};

type ApprovalAuthorizationOverride = {
  readonly grantId: string | null;
  readonly auditPrefix?: "none" | "gate-approved" | "completed";
  readonly presenceReservationId?: string;
};

function authorizeApproval(
  pd: string,
  content: string,
  stage: { readonly name: string; readonly slug: string; readonly phase: string; readonly for_each?: string; readonly produces?: readonly string[] },
  override?: ApprovalAuthorizationOverride,
): ApprovalAuthorization {
  const audit = operationReadAudit(pd);
  const currentRevision = Number.parseInt(getField(content, "Revision Count") ?? "0", 10);
  const recovery = recoverGateRevision(revisionEvidenceForRecovery(pd), {
    stage: stage.slug,
    produces: declaredProducePaths(pd, stage),
    revisionCount: Number.isFinite(currentRevision) ? currentRevision : 0,
    // R-22: recovery is skipped only under DECLARED full — semi keeps its
    // [R] revise loop, so the Construction projection (autonomous for semi
    // too) must not decide this.
    autonomous: declaredFullAutonomy(content),
    disabled:
      process.env.AMADEUS_SKIP_GATE_REVISION_RECOVERY === "1" ||
      KNOWN_CODEKB_STAGES.has(stage.slug),
  });
  const committedRevision = recovery.kind === "recovered"
    ? completedRecoveryRevision(audit, stage.slug, stage.name, recovery.transactionId, recovery.nextRevisionCount)
    : null;
  const authorized = committedRevision === null && override === undefined
    ? assertHumanPresentForGateResolution(pd, content, stage.slug, "approve")
    : null;
  const grantId = committedRevision !== null
    ? null
    : override === undefined
      ? authorized?.grantId ?? null
      : override.grantId;
  return {
    audit,
    committedRevision,
    grantId,
    provenance: authorized?.provenance ?? null,
    recovery,
    ...(override === undefined ? {} : { override }),
  };
}

function resolveApprovalRecovery(
  authorization: ApprovalAuthorization,
): GateRevisionRecovery | null {
  if (authorization.committedRevision !== null) return null;
  return authorization.recovery;
}

type ApprovalAuditInput = {
  readonly slug: string;
  readonly stageName: string;
  readonly timestamp: string;
  readonly userInput?: string;
  readonly authorization: ApprovalAuthorization;
  readonly recovery: GateRevisionRecovery | null;
  readonly deferStageCompletion: boolean;
};

function emitApprovalAudit(pd: string, input: ApprovalAuditInput): void {
  try {
    if (input.recovery?.kind === "recovered") {
      commitRecoveredApprovalBatch(pd, {
        slug: input.slug,
        stageName: input.stageName,
        timestamp: input.timestamp,
        transactionId: input.recovery.transactionId,
        revisionCount: input.recovery.nextRevisionCount,
        ...(input.userInput ? { userInput: input.userInput } : {}),
        ...(input.authorization.grantId ? { grantId: input.authorization.grantId } : {}),
        presenceReservationId: input.authorization.override?.presenceReservationId,
      });
      return;
    }
    if (input.authorization.committedRevision !== null) return;

    const gateFields: Record<string, string> = { Stage: input.slug };
    if (input.userInput) gateFields["User Input"] = input.userInput;
    if (input.authorization.grantId) gateFields["Grant Id"] = input.authorization.grantId;
    if (input.authorization.provenance) {
      gateFields["Approval Provenance"] = input.authorization.provenance;
    }
    if (input.authorization.override?.presenceReservationId) {
      gateFields["Presence Reservation Id"] =
        input.authorization.override.presenceReservationId;
    }
    const auditPrefix = input.authorization.override?.auditPrefix ?? "none";
    if (auditPrefix === "none") {
      emitAudit(pd, "GATE_APPROVED", gateFields);
    }
    if (auditPrefix !== "completed" && !input.deferStageCompletion) {
      const completionFields: Record<string, string> = {
        Stage: input.slug,
        Details: `Stage ${input.stageName} approved by gate`,
      };
      if (input.authorization.override?.presenceReservationId) {
        completionFields["Presence Reservation Id"] =
          input.authorization.override.presenceReservationId;
      }
      emitAudit(pd, "STAGE_COMPLETED", completionFields);
    }
  } catch (e) {
    if (input.recovery?.kind === "recovered") {
      const detail = e instanceof Error && e.name === "RecoveryBatchValidationError"
        ? errorMessage(e)
        : `Audit emission failed: ${errorMessage(e)}`;
      console.error(JSON.stringify({ error: detail }));
      process.exit(1);
    }
    error(`Audit emission failed: ${errorMessage(e)}`);
  }
}

function failApprovalCommitValidation(detail: string): never {
  console.error(JSON.stringify({ error: `Approval commit validation failed: ${detail}` }));
  process.exit(1);
}

function approvalScopeIssue(content: string): string | null {
  const scope = getField(content, "Scope");
  if (!scope) return "State file has no Scope field";
  if (!validScopes().has(scope)) return `State file has invalid Scope "${scope}"`;
  return null;
}

// Exported for the integration contract test: approve's post-commit state
// validation must reject a Completed counter that diverges from the shared
// canonical writer (#1875).
export function approvalNextStateIssue(
  content: string,
  slug: string,
  timestamp: string,
  recoveredRevision: number | null,
): string | null {
  if (getSlugState(content, slug) !== "completed") return "stage checkbox";
  if (getField(content, "Last Completed Stage") !== slug) return "last completed stage";
  if (getField(content, "Last Updated") !== timestamp) return "last updated";
  const canonicalCompleted = getField(
    rebuildCompletedFieldFromState(content).content,
    "Completed",
  );
  if (getField(content, "Completed") !== canonicalCompleted) return "completed count";
  if (recoveredRevision !== null && getField(content, "Revision Count") !== String(recoveredRevision)) return "revision count";
  return approvalScopeIssue(content);
}

function approveUnderLock(
  pd: string,
  slug: string,
  userInput: string | undefined,
  override?: ApprovalAuthorizationOverride,
  deferWorkflowCompletion = false,
): void {
  let content = operationReadState(pd);

  const stage = findStageBySlug(slug);
  if (!stage) error(`Unknown stage: ${slug}`);
  validateSlugInState(content, slug, "awaiting-approval");

  // Both approve arms (targeted-human and ordinary) reach this one call, and
  // approve always completes the stage, so there is no already-[x] skip here.
  verifyStageCompletionGuards(pd, stage);
  const initialScopeIssue = approvalScopeIssue(content);
  if (initialScopeIssue !== null) failApprovalCommitValidation(initialScopeIssue);
  const authorization = authorizeApproval(pd, content, stage, override);

  const approveScope = getField(content, "Scope")!;
  const nextForPhaseGate = nextInScopeStage(slug, approveScope, content);
  if (deferWorkflowCompletion && nextForPhaseGate !== null) {
    error("--defer-workflow-completion is valid only for the final in-scope stage.");
  }
  if (!nextForPhaseGate || nextForPhaseGate.phase !== stage.phase) {
    verifyPhaseCheckArtifact(pd, stage.phase);
  }

  const timestamp = isoTimestamp();
  const recovery = resolveApprovalRecovery(authorization);
  const recoveredRevision = authorization.committedRevision ??
    (recovery?.kind === "recovered" ? recovery.nextRevisionCount : null);
  if (recoveredRevision !== null) {
    content = setField(content, "Revision Count", String(recoveredRevision));
  }

  content = requireChanged(
    setCheckbox(validateStageState(content), slug, "completed"),
    `approve:${slug}`,
  );
  content = setField(content, "Last Updated", timestamp);
  content = rebuildCompletedFieldFromState(content).content;
  content = setField(content, "Last Completed Stage", slug);
  const completionInstance = `terminal:${slug}`;
  if (deferWorkflowCompletion) {
    content = prepareWorkflowCompletion(content, slug, completionInstance);
  }

  const nextStateIssue = approvalNextStateIssue(content, slug, timestamp, recoveredRevision);
  if (nextStateIssue !== null) failApprovalCommitValidation(nextStateIssue);

  emitApprovalAudit(pd, {
    slug,
    stageName: stage.name,
    timestamp,
    ...(userInput ? { userInput } : {}),
    authorization,
    recovery,
    deferStageCompletion: deferWorkflowCompletion,
  });
  operationWriteState(pd, content);
  const scope = approveScope;

  const next = nextInScopeStage(slug, scope, content);
  if (next) {
    handleAdvance([slug]);
  } else if (deferWorkflowCompletion) {
    console.log(JSON.stringify({
      completed: slug,
      status: "completion-pending",
      completion_instance: completionInstance,
    }));
  } else {
    handleCompleteWorkflow([slug]);
  }
}

export function handleApprove(args: string[]): void {
  if (args.length < 1) error("Usage: amadeus-state.ts approve <slug> [--user-input <text>]");
  const slug = args[0];
  const flags = parseApproveFlags(args.slice(1));
  const pd = resolveProjectDir(projectDir);
  const modeResult = resolveOperatingMode(process.env.AMADEUS_OPERATING_MODE);
  const authority = classifyApprovalAuthority({
    operatingMode: modeResult.kind === "valid" ? modeResult.mode : modeResult.raw,
    ...flags,
  });
  if (authority.kind === "invalid") {
    console.error(JSON.stringify({ error: `Invalid approval authority: ${authority.reason}` }));
    process.exit(1);
  }

  if (authority.kind === "targeted-human") {
    const sessionId = trustedHostSessionId();
    if (!sessionId) {
      rejectApprovalProtocol("Trusted session identity is unavailable");
    }
    let selected: PresenceReservation | null;
    try {
      selected = readPresenceReservation(pd, authority.reservationId);
    } catch (cause) {
      rejectApprovalProtocol(`Invalid presence reservation: ${errorMessage(cause)}`);
    }
    if (
      selected === null ||
      selected.targetIntentId !== authority.targetIntentId ||
      selected.stage !== slug ||
      selected.space !== activeSpace(pd)
    ) {
      rejectApprovalProtocol("Presence reservation does not match the targeted approval");
    }
    withStateOperationTarget(
      { intent: selected.targetIntentDir, space: selected.space },
      () => {
        operationWithLock(pd, () => {
          let marker: PresenceReservation;
          try {
            marker = verifyMintedPresenceReservation({
              projectDir: pd,
              sessionId,
              reservationId: authority.reservationId,
              targetIntentId: authority.targetIntentId,
              stage: slug,
              allowConsumed: true,
            });
          } catch (cause) {
            rejectApprovalProtocol(
              `Invalid targeted human presence: ${errorMessage(cause)}`,
            );
          }
          const prefix = targetedApprovalEvidence(operationReadAudit(pd), marker);
          if (!prefix.humanTurnIsFresh) {
            rejectApprovalProtocol("Targeted HUMAN_TURN is not fresh for the open gate");
          }
          if (
            prefix.gateApproved > 1 ||
            prefix.stageCompleted > 1 ||
            prefix.stageCompleted > prefix.gateApproved
          ) {
            rejectApprovalProtocol("Targeted approval audit prefix is ambiguous");
          }
          const ownerState = operationReadState(pd);
          const stageState = getSlugState(ownerState, slug);
          if (stageState === "awaiting-approval") {
            if (marker.state !== "minted") {
              rejectApprovalProtocol("Consumed reservation cannot authorize an open gate");
            }
            const auditPrefix =
              prefix.gateApproved === 0
                ? "none"
                : prefix.stageCompleted === 0
                  ? "gate-approved"
                  : "completed";
            runWithoutTransitionOutput(() => {
              approveUnderLock(pd, slug, authority.userInput, {
                grantId: null,
                auditPrefix,
                presenceReservationId: authority.reservationId,
              }, flags.deferWorkflowCompletion);
            });
          } else if (stageState === "completed") {
            if (prefix.gateApproved !== 1 || prefix.stageCompleted !== 1) {
              rejectApprovalProtocol("Completed targeted approval has no unique audit prefix");
            }
            recoverCompletedTargetedApproval(pd, slug, ownerState);
          } else {
            rejectApprovalProtocol("Targeted approval owner gate is not open or completed");
          }
          consumePresenceReservation({
            projectDir: pd,
            sessionId,
            reservationId: authority.reservationId,
            targetIntentId: authority.targetIntentId,
            stage: slug,
          });
          console.log(JSON.stringify({ kind: "approved" }));
        });
      },
    );
    return;
  }

  // C2b lost-update safety: the ENTIRE approve transaction — including the
  // nested handleAdvance / handleCompleteWorkflow calls below — runs under one
  // outer lock. withAuditLock is REENTRANT (per-pd depth counter): the nested
  // handlers' own withAuditLock calls bump depth 1→2→1 and run inline without
  // re-acquiring the OS lock, so approve+advance commit as one atomic unit and
  // no concurrent writer can interleave between approve's write and the
  // advance's re-read. The original ordering is preserved: approve writes its
  // own state (slug → [x]) BEFORE delegating, so the nested re-read sees it.
  withAuditLock(pd, () => {
    approveUnderLock(
      pd,
      slug,
      authority.userInput,
      undefined,
      flags.deferWorkflowCompletion,
    );
  });
}

// Look up a flag's value while guarding against value-starting-with-"--"
// ambiguity. If the user forgets to provide a value (e.g. `--user-input
// --reason`), indexOf+slice would consume the next flag as the value —
// silently wrong. This helper errors cleanly when the value starts with "--".
// Returns undefined if the flag is absent.
function getFlagValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  if (idx + 1 >= args.length) {
    error(`${flag} expects a value, got end of arguments.`);
  }
  const val = args[idx + 1];
  if (val.startsWith("--")) {
    error(`${flag} expects a value, got another flag: "${val}". Did you forget the value?`);
  }
  return val;
}

type ApproveFlags = {
  readonly userInput?: string;
  readonly targetIntentId?: string;
  readonly presenceReservationId?: string;
  readonly deferWorkflowCompletion: boolean;
};

function parseApproveFlags(args: string[]): ApproveFlags {
  if (
    args.includes("--standing-grant-id") ||
    args.includes("--standing-grant-route-id")
  ) {
    error(
      "Standing-grant approval carriers are retired; select Intent autonomy instead.",
    );
  }
  return {
    userInput: getFlagValue(args, "--user-input"),
    targetIntentId: getFlagValue(args, "--target-intent-id"),
    presenceReservationId: getFlagValue(args, "--presence-reservation-id"),
    deferWorkflowCompletion: args.includes("--defer-workflow-completion"),
  };
}

function runWithoutTransitionOutput(fn: () => void): void {
  const original = console.log;
  console.log = () => {};
  try {
    fn();
  } finally {
    console.log = original;
  }
}

function rejectApprovalProtocol(detail: string): never {
  console.error(JSON.stringify({ error: detail }));
  process.exit(1);
}

function recoverCompletedTargetedApproval(
  pd: string,
  slug: string,
  content: string,
): void {
  if (getField(content, "Current Stage") !== slug) return;
  const scope = getField(content, "Scope");
  if (scope === null || !validScopes().has(scope)) {
    rejectApprovalProtocol("Targeted approval owner has an invalid Scope");
  }
  runWithoutTransitionOutput(() => {
    if (nextInScopeStage(slug, scope, content) === null) {
      handleCompleteWorkflow([slug]);
    } else {
      handleAdvance([slug]);
    }
  });
}

// delegate-approval <slug> --to-intent <record-dir> [--to-space <space>] [--user-input <text>]
//
// Agent-team topology (#671): the human is present only in the LEADER session,
// so a remote conductor's human-presence gate can never observe a local
// HUMAN_TURN and every conductor gate is structurally stuck. This records a
// DELEGATED_APPROVAL into the TARGET (conductor) intent's audit dir, grounded in
// a REAL human turn on THIS (leader) session's own ledger. The conductor's gate
// (humanActedSinceGate → verifyDelegatedProvenance) accepts it ONLY after
// confirming the referenced HUMAN_TURN physically exists in the issuer shard, so
// a model cannot forge it via any audit CLI (HUMAN_TURN minting is refused at the
// `amadeus-audit append` entry; it is written only by the UserPromptSubmit hook
// in-process). Refuses when no fresh human turn backs this call, which is exactly
// what stops an autopilot conductor from self-delegating its own gate open.
// Delegation remains grounded in a fresh real human turn. Legacy standing
// grants are replayable diagnostics only and cannot open this path.
function rejectUngroundedDelegation(): never {
  error(
    "Refusing to delegate approval: no real human turn on this session since the last gate resolution. Acknowledge the approval as a human, then delegate."
  );
}

export function handleDelegateApproval(args: string[]): void {
  const slug = args.find((a) => !a.startsWith("--"));
  if (!slug) {
    error(
      "Usage: amadeus-state.ts delegate-approval <slug> --to-intent <record-dir> [--to-space <space>] [--user-input <text>]"
    );
  }
  const toIntent = getFlagValue(args, "--to-intent");
  if (!toIntent) error("delegate-approval requires --to-intent <conductor record dir name>");
  const toSpace = getFlagValue(args, "--to-space");
  const userInput = getFlagValue(args, "--user-input");
  const pd = resolveProjectDir(projectDir);

  // Target must be a real, locally-present intent record — never scaffold one.
  const targetRecord = recordDir(pd, toIntent, toSpace);
  if (targetRecord === null || !existsSync(join(targetRecord, "amadeus-state.md"))) {
    error(`delegate-approval: target intent record not found: ${toIntent}${toSpace ? ` (space ${toSpace})` : ""}`);
  }

  // Grounding gate: a real human must have acted on THIS session since the last
  // gate resolution. humanActedSinceGate reads the hook-written HUMAN_TURN
  // ledger — unforgeable by any tool a model can call — so this is the anti-
  // autopilot guard. Honour the same deterministic off-switch as the approve
  // path so suite tests can bypass it.
  if (!humanPresenceGuardDisabled() && !humanActedSinceGate(pd)) {
    rejectUngroundedDelegation();
  }

  // Issuer coordinates the conductor verifies against: this session's active
  // intent record dir, its own audit shard, and the timestamp of the grounding
  // HUMAN_TURN within that shard.
  const issuerSpace = activeSpace(pd);
  const issuerIntent = activeIntent(pd, issuerSpace);
  if (!issuerIntent) {
    error("delegate-approval: no active intent on this (leader) session to ground the approval");
  }
  const shardDir = auditShardDir(pd, issuerIntent, issuerSpace);
  if (shardDir === null) error("delegate-approval: cannot resolve this session's audit shard dir");
  const issuerShard = auditShardName(pd);
  let issuerHumanTs: string | null = null;
  try {
    const turns = findAllEvents(readFileSync(join(shardDir, issuerShard), "utf-8"), "HUMAN_TURN");
    if (turns.length > 0) issuerHumanTs = turns[turns.length - 1].timestamp;
  } catch {
    // fall through to the guard below
  }
  if (!issuerHumanTs) {
    error(
      `delegate-approval: no HUMAN_TURN in this session's own audit shard (${issuerShard}); ` +
        "cannot ground the delegation"
    );
  }

  const fields: Record<string, string> = {
    Stage: slug,
    "Issuer Space": issuerSpace,
    "Issuer Intent": issuerIntent,
    "Issuer Shard": issuerShard,
    "Issuer Human Ts": issuerHumanTs,
  };
  if (userInput) fields["User Input"] = userInput;
  // Targeted, and the targeting IS the correctness here: toIntent/toSpace name
  // the ledger being delegated INTO, which is not the issuer's own. Dropping
  // the pair would not throw — it would silently record the approval against
  // whatever the active cursor happens to be. `User Input` is
  // registry-optional, so a delegation without it still satisfies the required
  // set.
  const res = emitAuditEvent("DELEGATED_APPROVAL", fields, pd, toIntent, toSpace);

  console.log(
    JSON.stringify({
      delegated: true,
      stage: slug,
      toIntent,
      toSpace: toSpace ?? issuerSpace,
      issuerIntent,
      issuerShard,
      issuerHumanTs,
      timestamp: res.timestamp,
    })
  );
}

// delegate-rejection <slug> --to-intent <record-dir> [--to-space <space>] [--feedback <text>]
//
// Reject-side mirror of handleDelegateApproval (#685). The same agent-team
// topology problem the approval path solves also blocks REJECTION: a remote
// conductor's human-presence reject gate can never observe a local HUMAN_TURN,
// so it is structurally stuck. This records a DELEGATED_REJECTION into the TARGET
// (conductor) intent's audit dir, grounded in a REAL human turn on THIS (leader)
// session's own ledger. The conductor's reject gate (humanActedSinceGate(pd,
// "reject") → verifyDelegatedProvenance) accepts it ONLY after confirming the
// referenced HUMAN_TURN physically exists in the issuer shard, so a model cannot
// forge it. Verb-scoped: this can open ONLY a reject gate, never an approve gate
// (FR-1.4). Refuses when no fresh human turn backs this call.
function handleDelegateRejection(args: string[]): void {
  const slug = args.find((a) => !a.startsWith("--"));
  if (!slug) {
    error(
      "Usage: amadeus-state.ts delegate-rejection <slug> --to-intent <record-dir> [--to-space <space>] [--feedback <text>]"
    );
  }
  const toIntent = getFlagValue(args, "--to-intent");
  if (!toIntent) error("delegate-rejection requires --to-intent <conductor record dir name>");
  const toSpace = getFlagValue(args, "--to-space");
  const feedback = getFlagValue(args, "--feedback");
  const pd = resolveProjectDir(projectDir);

  // Grounding gate: a real human must have acted on THIS session since the last
  // gate resolution. humanActedSinceGate (general predicate — no verb) reads the
  // hook-written HUMAN_TURN ledger, unforgeable by any tool a model can call, so
  // this is the anti-autopilot guard. Honour the same deterministic off-switch
  // as the approve/reject paths so suite tests can bypass it.
  if (!humanPresenceGuardDisabled() && !humanActedSinceGate(pd)) {
    error(
      "Refusing to delegate rejection: no real human turn on this session since the " +
        "last gate resolution. Acknowledge the rejection as a human, then delegate."
    );
  }

  // Issuer coordinates the conductor verifies against: this session's active
  // intent record dir, its own audit shard, and the timestamp of the grounding
  // HUMAN_TURN within that shard.
  const issuerSpace = activeSpace(pd);
  const issuerIntent = activeIntent(pd, issuerSpace);
  if (!issuerIntent) {
    error("delegate-rejection: no active intent on this (leader) session to ground the rejection");
  }
  const shardDir = auditShardDir(pd, issuerIntent, issuerSpace);
  if (shardDir === null) error("delegate-rejection: cannot resolve this session's audit shard dir");
  const issuerShard = auditShardName(pd);
  let issuerHumanTs: string | null = null;
  try {
    const turns = findAllEvents(readFileSync(join(shardDir, issuerShard), "utf-8"), "HUMAN_TURN");
    if (turns.length > 0) issuerHumanTs = turns[turns.length - 1].timestamp;
  } catch {
    // fall through to the guard below
  }
  if (!issuerHumanTs) {
    error(
      `delegate-rejection: no HUMAN_TURN in this session's own audit shard (${issuerShard}); ` +
        "cannot ground the delegation"
    );
  }

  // Target must be a real, locally-present intent record — never scaffold one here.
  const targetRecord = recordDir(pd, toIntent, toSpace);
  if (targetRecord === null || !existsSync(join(targetRecord, "amadeus-state.md"))) {
    const targetLabel = toSpace
      ? `${toIntent} (space ${toSpace})`
      : toIntent;
    error(
      `delegate-rejection: target intent record not found: ${targetLabel}`
    );
  }

  const fields: Record<string, string> = {
    Stage: slug,
    "Issuer Space": issuerSpace,
    "Issuer Intent": issuerIntent,
    "Issuer Shard": issuerShard,
    "Issuer Human Ts": issuerHumanTs,
  };
  if (feedback) fields.Feedback = feedback;
  // Targeted at the ledger being delegated into — see the approval arm.
  // `Feedback` is registry-optional, so a rejection issued without it still
  // satisfies the required set.
  const res = emitAuditEvent("DELEGATED_REJECTION", fields, pd, toIntent, toSpace);

  console.log(
    JSON.stringify({
      delegated: true,
      verb: "reject",
      stage: slug,
      toIntent,
      toSpace: toSpace ?? issuerSpace,
      issuerIntent,
      issuerShard,
      issuerHumanTs,
      timestamp: res.timestamp,
    })
  );
}

// reject <slug> [--feedback <text>] — transition [?] → [R], emit GATE_REJECTED + STAGE_REVISING, increment Revision Count.
// Also accepts [-]: gate-start is optional before the human prompt, so a
// rejection may arrive with no open gate. The reject self-heals by emitting
// the missing STAGE_AWAITING_APPROVAL (tagged Recovered=true) ahead of the
// rejection pair — mirroring report's approve-side gate backfill.
export function handleReject(args: string[]): void {
  runSelectedIntentOperation(
    args,
    rejectForTarget,
    "reject could not resolve the selected Intent.",
  );
}

function rejectForTarget(args: string[], pd: string): void {
  if (args.length < 1) {
    error(
      "Usage: amadeus-state.ts reject <slug> [--feedback <text>] [--target-intent-id <uuid>] [--presence-reservation-id <uuid>] [--intent <record>] [--space <name>]",
    );
  }
  const slug = args[0];
  const feedback = getFlagValue(args.slice(1), "--feedback");
  const targetIntentId = getFlagValue(args.slice(1), "--target-intent-id");
  const reservationId = getFlagValue(
    args.slice(1),
    "--presence-reservation-id",
  );
  if ((targetIntentId === undefined) !== (reservationId === undefined)) {
    error("Targeted rejection requires both target intent and presence reservation ids");
  }
  // C2b lost-update safety: validate→increment Revision Count→emit-audit→write
  // under one lock. The Revision Count read-modify-write is the exposed bit —
  // two concurrent rejects must not both read N and both write N+1 (one
  // increment lost). emit-then-write stays idempotent on retry: the lock
  // serialises, and re-running the same input recomputes from the locked
  // snapshot rather than double-incrementing a stale value.
  operationWithLock(pd, () => {
  let content = operationReadState(pd);

  const stage = findStageBySlug(slug);
  if (!stage) error(`Unknown stage: ${slug}`);
  validateSlugInState(content, slug, ["awaiting-approval", "in-progress"]);
  const gateWasMissing = getSlugState(content, slug) === "in-progress";

  let targeted:
    | { readonly reservation: PresenceReservation; readonly sessionId: string }
    | null = null;
  if (targetIntentId !== undefined && reservationId !== undefined) {
    const sessionId = trustedHostSessionId();
    if (!sessionId) {
      error("Targeted rejection requires a trusted session identity");
    }
    try {
      targeted = {
        reservation: verifyMintedPresenceReservation({
          projectDir: pd,
          sessionId,
          reservationId,
          targetIntentId,
          stage: slug,
        }),
        sessionId,
      };
    } catch (cause) {
      error(`Invalid targeted human presence: ${errorMessage(cause)}`);
    }
    if (
      targeted.reservation.targetIntentDir !== stateOperationTarget?.intent ||
      targeted.reservation.space !== stateOperationTarget?.space
    ) {
      error("Presence reservation does not match the targeted rejection owner");
    }
    if (
      !targetedApprovalEvidence(
        operationReadAudit(pd),
        targeted.reservation,
      ).humanTurnIsFresh
    ) {
      error("Targeted HUMAN_TURN is not fresh for the open gate");
    }
  } else {
    // Human-presence guard (#675): shared with handleApprove. Runs BEFORE any
    // mutation so a refusal leaves state and audit untouched. Scope the presence
    // check to the record this reject actually mutates (#2588): the state/audit
    // I/O routes through stateOperationTarget for a `--intent` reject, so the
    // ledger read must target the SAME record. An omitted selector keeps the
    // active/legacy scope (stateOperationTarget is null → undefined).
    assertHumanPresentForGateResolution(
      pd,
      content,
      slug,
      "reject",
      stateOperationTarget?.intent,
      stateOperationTarget?.space,
    );
  }

  // Increment Revision Count. Guard against non-numeric values (missing field,
  // manual edits, legacy state files) by coercing non-integers to 0.
  const current = getField(content, "Revision Count");
  const parsed = current ? parseInt(current, 10) : 0;
  const revCount = (Number.isFinite(parsed) ? parsed : 0) + 1;
  content = setField(content, "Revision Count", String(revCount));

  content = requireChanged(
    setCheckbox(validateStageState(content), slug, "revising"),
    `reject:${slug}`,
  );
  const timestamp = isoTimestamp();
  content = setField(content, "Last Updated", timestamp);

  try {
    if (gateWasMissing) {
      // Backfill the gate row the optional gate-start would have written, so
      // the audit trail keeps its STAGE_AWAITING_APPROVAL → GATE_REJECTED
      // order. The intermediate [?] never needs to hit disk — one state write
      // below lands the final [R].
      emitAudit(pd, "STAGE_AWAITING_APPROVAL", {
        Stage: slug,
        Recovered: "true",
      });
      // The gate this backfills was presented to the human who is rejecting it
      // right now, so the presentation is counted here too (#3152). Emitted
      // BEFORE the rejection below, which is what closes this presentation's
      // epoch — a gate-start that already recorded this presentation cannot
      // reach the backfill at all.
      recordGateOpenRefusal(pd, content, slug);
    }
    const rejFields: Record<string, string> = { Stage: slug };
    if (feedback) rejFields.Feedback = feedback;
    if (targeted !== null) {
      rejFields["Presence Reservation Id"] =
        targeted.reservation.reservationId;
    }
    emitAudit(pd, "GATE_REJECTED", rejFields);
    emitAudit(pd, "STAGE_REVISING", {
      Stage: slug,
      "Revision count": String(revCount),
      ...(feedback ? { Feedback: feedback } : {}),
      ...(targeted === null
        ? {}
        : {
            "Presence Reservation Id":
              targeted.reservation.reservationId,
          }),
    });
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }

  operationWriteState(pd, content);
  if (targeted !== null) {
    consumePresenceReservation({
      projectDir: pd,
      sessionId: targeted.sessionId,
      reservationId: targeted.reservation.reservationId,
      targetIntentId: targeted.reservation.targetIntentId,
      stage: slug,
    });
  }
  console.log(JSON.stringify({ slug, new_state: "revising", revision_count: revCount, timestamp }));
  });
}

// revise <slug> — transition [R] → [?] (re-enter gate after revision work)
export function handleRevise(args: string[]): void {
  runSelectedIntentOperation(
    args,
    reviseForTarget,
    "revise could not resolve the selected Intent.",
  );
}

function reviseForTarget(args: string[], pd: string): void {
  if (args.length < 1) {
    error(
      "Usage: amadeus-state.ts revise <slug> [--intent <record>] [--space <name>]",
    );
  }
  const slug = args[0];

  // C2b lost-update safety: validate→transition→emit-audit→write under one lock.
  operationWithLock(pd, () => {
  let content = operationReadState(pd);

  const stage = findStageBySlug(slug);
  if (!stage) error(`Unknown stage: ${slug}`);
  validateSlugInState(content, slug, "revising");

  content = requireChanged(
    setCheckbox(validateStageState(content), slug, "awaiting-approval"),
    `revise:${slug}`,
  );
  const timestamp = isoTimestamp();
  content = setField(content, "Last Updated", timestamp);

  try {
    emitAudit(pd, "STAGE_AWAITING_APPROVAL", {
      Stage: slug,
      Details: "Re-entering gate after revision",
    });
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }
  recordGateOpenRefusal(pd, content, slug);

  operationWriteState(pd, content);
  console.log(JSON.stringify({ slug, new_state: "awaiting-approval", timestamp }));
  });
}

export function skipStageContent(content: string, slug: string): string {
  return requireChanged(
    setCheckbox(validateStageState(content), slug, "skipped"),
    `skip:${slug}`,
  );
}

function mandatoryPluginStages(
  pd: string,
  scope: string,
  intent: string | undefined,
  space: string | undefined,
): string[] {
  const resolved = resolveAmadeusConfig(pd, intent, space);
  if (resolved.kind === "invalid") {
    error(`Cannot enforce plugin scope bindings: ${resolved.issues.map((issue) => issue.path).join(", ")}`);
  }
  return requiredPluginStagesForScope(resolved.config.plugin.scopeBindings, scope);
}

// Host-bound plugin stages a scope declares mandatory. Policy, not invariant:
// which stages are mandatory comes from the project's plugin configuration, so a
// project that configures none is answered allowed with nothing to judge.
//
// TWO sources meet here, and #3249 is what happens when they disagree. The
// mandatory SET comes from host config (`plugin.scope-bindings`), which moves
// with the project. Whether a stage is on THIS Intent's plan comes from the
// record's execution projection, which froze when the Intent was born. Park an
// Intent, add a binding, resume: config says the stage is mandatory while the
// plan says SKIP, so completion refuses it as unrun and `jump` refuses to run
// it as off-plan — a parked Intent terminable by neither path.
//
// The record's plan is canonical for what this Intent RUNS (it is what the
// router, jump and every derived counter read — resolved here through the same
// shared effectivePlanAction they use). So a config-mandated stage the plan
// skips is reported as the divergence it is, naming `recompose` — the one verb
// that reconciles the plan to the config — rather than as an ordinary pending
// stage the caller is told to "run", which the plan forbids.
function evaluateMandatoryPluginStages(
  context: WorkflowPreparationGuardContext,
): LifecycleGuardVerdict {
  const { pd, content } = context;
  const scope = getField(content, "Scope") ?? "";
  const rows = parseCheckboxes(content);
  const suffixes = parseStateStageSuffixes(content);
  const scopeStages = loadScopeMapping()[scope]?.stages ?? {};
  const mandatory = mandatoryPluginStages(
    pd,
    scope,
    stateOperationTarget?.intent,
    stateOperationTarget?.space,
  );
  const outstanding = mandatory.filter((slug) => {
    const state = rows.find((row) => row.slug === slug)?.state;
    return state !== "completed" && slug !== context.completedSlug;
  });
  // Every diverged stage at once: the reconciliation is one `recompose` call,
  // so naming them one refusal at a time would cost a round trip per stage.
  // A slug NEITHER source names (effectivePlanAction undefined — a stage this
  // host never compiled) is not a plan disagreement and keeps the pending arm.
  const diverged = outstanding.filter(
    (slug) => effectivePlanAction(suffixes, scopeStages, slug) === "SKIP",
  );
  if (diverged.length > 0) {
    const named = diverged.map((slug) => `"${slug}"`).join(", ");
    let recovery = "This Intent's plan is canonical for what it runs, so reconcile it before ";
    recovery += `finishing: (1) if Construction is autonomous, \`amadeus-bolt.ts set-autonomy --mode none\` `;
    recovery += `first (it needs a fresh human turn); (2) \`amadeus-utility.ts recompose --add `;
    recovery += `${diverged.join(",")}\`; (3) run and complete the stage(s). Jumping straight to them is `;
    recovery += "refused while the plan says SKIP, so recompose is the only way in.";
    // Built by statement, not by a multi-line literal concatenation: a
    // continuation line holding only constants is folded away, and bun's merged
    // lcov then reports it as an uncovered DA:0 phantom the patch gate fails on.
    let reason = `Refusing workflow completion: host-bound plugin stage(s) ${named} are mandatory `;
    reason += `for scope "${scope}", but this Intent's execution projection has them SKIP. `;
    reason += "The record's plan was frozen when the Intent was born; amadeus/config.json ";
    reason += "plugin.scope-bindings has moved since, and the two now disagree.";
    return guardDenied({ reason, recovery });
  }
  const pending = outstanding[0];
  if (pending !== undefined) {
    const state = rows.find((row) => row.slug === pending)?.state;
    return guardDenied({
      reason:
        `Refusing workflow completion: host-bound plugin stage "${pending}" is mandatory ` +
        `for scope "${scope}" and is ${state ?? "absent"}.`,
      recovery: "Run and complete it before finishing.",
    });
  }
  return guardAllowed();
}

// skip <slug> [--reason <text>] — transition [ ]/[-]/[R] → [S], emit STAGE_SKIPPED
export function handleSkip(args: string[], root = projectDir): void {
  if (args.length < 1) error("Usage: amadeus-state.ts skip <slug> [--reason <text>]");
  const slug = args[0];
  const reason = getFlagValue(args.slice(1), "--reason");

  const pd = resolveProjectDir(root);
  // C2b lost-update safety: validate→transition→emit-audit→write under one lock.
  withAuditLock(pd, () => {
  let content = readStateFile(pd);

  const stage = findStageBySlug(slug);
  if (!stage) error(`Unknown stage: ${slug}`);
  const scope = getField(content, "Scope") ?? "";
  if (
    mandatoryPluginStages(pd, scope, stateOperationTarget?.intent, stateOperationTarget?.space).includes(slug)
  ) {
    error(`Cannot skip "${slug}": it is a host-bound mandatory plugin stage for scope "${scope}".`);
  }
  validateSlugInState(content, slug, ["pending", "in-progress", "revising"]);

  content = skipStageContent(content, slug);
  const timestamp = isoTimestamp();
  content = setField(content, "Last Updated", timestamp);

  try {
    const fields: Record<string, string> = { Stage: slug };
    if (reason) fields.Reason = reason;
    emitAudit(pd, "STAGE_SKIPPED", fields);
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }

  writeStateFile(pd, content);
  console.log(JSON.stringify({ slug, new_state: "skipped", timestamp }));
  });
}

// resume — read-only re-entry marker used by the orchestrator's resume path.
// Returns structured JSON the orchestrator can branch on, including compaction
// detection (was the most recent audit event SESSION_COMPACTED without any
// subsequent stage activity?). Session-level SESSION_RESUMED emission is the
// SessionStart hook's job, NOT this tool — this is a pure reader.
function handleResume(_args: string[]): void {
  const pd = resolveProjectDir(projectDir);
  const content = readStateFile(pd);
  const currentStage = getField(content, "Current Stage") || "unknown";
  const status = getField(content, "Status") || "unknown";
  const phase = getField(content, "Lifecycle Phase") || "unknown";
  const scope = getField(content, "Scope") || "unknown";
  const activeAgent = getField(content, "Active Agent") || "unknown";
  const nextStage = getField(content, "Next Stage") || "none";

  // Stage-level gate awareness — tells the orchestrator whether the user is
  // the blocker on this stage (awaiting approval / revising).
  const checkboxes = parseCheckboxes(content);
  const currentCb = checkboxes.find((c) => c.slug === currentStage);
  const gateState = currentCb?.state ?? "unknown";

  // Compaction detection — scan the audit tail for a SESSION_COMPACTED
  // event that has no subsequent stage activity. The orchestrator uses this
  // to surface the compaction-awareness prompt without a fragile shell pipeline.
  let compactionPending = false;
  try {
    // Merge across per-clone audit shards (single shard in the common case).
    compactionPending = compactionPendingFromAudit(readAllAuditShards(pd));
  } catch {
    // Audit read failures are non-fatal — default to false, orchestrator
    // will use the standard resume flow.
  }

  console.log(
    JSON.stringify({
      resumed: true,
      current_stage: currentStage,
      phase,
      status,
      scope,
      active_agent: activeAgent,
      next_stage: nextStage,
      gate_state: gateState,
      compaction_pending: compactionPending,
    })
  );
}

// acknowledge-compaction --choice <continue|review|restart>
//
// Called by the orchestrator's compaction-awareness flow AFTER the user picks
// Continue / Review / Restart in response to a pending SESSION_COMPACTED event.
// Emits RECOVERY_COMPLETED to record that the user was presented with the
// prompt and made a choice — closing the "compaction detected but not yet
// handled" window. Refuses if `handleResume` would report compaction_pending=false,
// so the event is only emitted when the flow is genuinely recovering.
function handleAcknowledgeCompaction(args: string[]): void {
  const pd = resolveProjectDir(projectDir);
  let choice = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--choice" && i + 1 < args.length) {
      choice = args[i + 1];
      i++;
    }
  }
  if (!choice) {
    error(
      "Usage: amadeus-state.ts acknowledge-compaction --choice <continue|review|restart>"
    );
  }
  if (!["continue", "review", "restart"].includes(choice)) {
    error(`Invalid --choice: ${choice}. Valid: continue, review, restart`);
  }

  const content = readStateFile(pd);
  const currentStage = getField(content, "Current Stage") || "unknown";

  // Only emit if compaction is pending. This prevents spurious
  // RECOVERY_COMPLETED events when the orchestrator calls acknowledge unnecessarily.
  let compactionPending = false;
  try {
    compactionPending = compactionPendingFromAudit(readAllAuditShards(pd));
  } catch {
    // Audit unreadable — nothing to recover.
  }

  if (!compactionPending) {
    error(
      "No pending compaction to acknowledge (latest SESSION_COMPACTED already followed by stage activity or recovery)."
    );
  }

  emitAudit(pd, "RECOVERY_COMPLETED", {
    Choice: choice,
    "Current Stage": currentStage,
  });

  console.log(
    JSON.stringify({ acknowledged: true, choice, current_stage: currentStage })
  );
}

// A human prompt turn is "fresh" for a takeover when it was appended to THIS
// clone's shard after the last takeover recorded there. Ordering in an
// append-only shard is authoritative, so the comparison is positional rather
// than by timestamp — two rows written inside the same clock tick still order
// correctly. An unreadable shard grounds nothing (fail-closed).
function humanTurnGroundsTakeover(projectDir: string): boolean {
  let raw = "";
  try {
    raw = readFileSync(auditFilePath(projectDir), "utf-8");
  } catch {
    return false;
  }
  let humanTurnAt = -1;
  let lastTakeoverAt = -1;
  const blocks = splitAuditRecords(raw);
  for (const [index, block] of blocks.entries()) {
    const event = auditBlockField(block, "Event");
    if (event === "HUMAN_TURN") humanTurnAt = index;
    if (
      event === "RECOVERY_COMPLETED" &&
      auditBlockField(block, "Choice") === SESSION_TAKEOVER_VERB
    ) {
      lastTakeoverAt = index;
    }
  }
  return humanTurnAt > lastTakeoverAt;
}

// session-takeover --confirm [--confirm-roles <a,b>] [--session-id <id>]
//
// The manual recovery layer for a stale Kimi role carrier (see
// amadeus-session-takeover.ts for why it exists and why it is not a bypass).
// Refusals happen before any write, and the audit row is emitted only after the
// guard itself confirms the rebind took — the event records what was achieved,
// never what was attempted.
export function handleSessionTakeover(args: string[]): void {
  const pd = resolveProjectDir(projectDir);
  const parse = parseSessionTakeoverArgs(args);
  if (parse.kind === "invalid") error(parse.message);

  const decision = planSessionTakeover(
    parse.request,
    readSessionTakeoverFacts(pd, humanTurnGroundsTakeover(pd)),
  );
  if (decision.kind === "refused") error(decision.message);
  if (decision.kind === "noop") {
    console.log(
      JSON.stringify({
        taken_over: false,
        reason: "already-authorized",
      }),
    );
    return;
  }

  applySessionTakeover(pd, decision.sessionId);
  const achieved = authorizeMainConductor(pd);
  if (achieved.kind !== "authorized") {
    // One line: bun's lcov leaves the continuation lines of a multi-line call
    // at DA:0, which would read as an untested arm rather than a defensive one.
    error(`${SESSION_TAKEOVER_VERB} rewrote the carrier but the guard still denies this caller (${achieved.reason}). No recovery was recorded.`);
  }

  const currentStage = getField(readStateFile(pd), "Current Stage") || "unknown";
  emitAudit(pd, "RECOVERY_COMPLETED", {
    Choice: SESSION_TAKEOVER_VERB,
    "Current Stage": currentStage,
    Reason: decision.reason,
  });

  console.log(
    JSON.stringify({
      taken_over: true,
      reason: decision.reason,
      session_id: decision.sessionId,
      acknowledged_roles: decision.retainedRoles,
      current_stage: currentStage,
    }),
  );
}

// practices-event --type <discovered|affirmed|override> [--field "K: V"]...
// Emits a PRACTICES_* audit event from tool code (not stage prose).
// Required by the audit-first invariant: every audit event must originate
// in .ts code so t48's emitter-pairing check passes. Called by the
// practices-discovery stage at Step 4 (discovered), Step 7 (affirmed), and
// Step 6 on write failure (override).
export function handlePracticesEvent(args: string[]): void {
  const pd = resolveProjectDir(projectDir);
  let eventTypeArg = "";
  const fields: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--type" && i + 1 < args.length) {
      const value = args[i + 1];
      rejectFlagLikeValue("--type", value);
      eventTypeArg = value;
      i++;
    } else if (args[i] === "--field" && i + 1 < args.length) {
      const kv = args[i + 1];
      rejectFlagLikeValue("--field", kv);
      const idx = kv.indexOf(":");
      if (idx > 0) {
        const key = kv.slice(0, idx).trim();
        const value = kv.slice(idx + 1).trim();
        fields[key] = value;
      }
      i++;
    }
  }
  if (!eventTypeArg) {
    error(
      'Usage: amadeus-state.ts practices-event --type <discovered|affirmed|override|empty> [--field "Key: Value"]...'
    );
  }
  // Explicit literal-string emitAudit calls per --type so t48's
  // emitter-pairing check (which scans for `emitAudit(... "EVENT_NAME")`
  // literals) finds each event at a real call site.
  //
  // --type empty handles the orchestrator's layer-3 fallback path (when
  // extractMarkdownSection returns "" and the orchestrator falls back to
  // scope-hardcoded defaults). Advisory-only — does not block execution.
  // The `override` case is reused by the orchestrator with --field "Reason:
  // bolt-plan-marker-conflict" + --field "Practices Stance: ..." +
  // --field "Bolt-Plan Marker: ..." + --field "Bolt slug: ..." for the
  // orchestrator-overrides-bolt-plan-marker semantic. The write-failure path
  // uses --field "Reason: write-failure-..." — same event, distinct Reason
  // field (discriminator-field disambiguation, no
  // audit-count bump).
  let emittedEvent: string;
  switch (eventTypeArg) {
    case "discovered":
      emitAudit(pd, "PRACTICES_DISCOVERED", fields);
      emittedEvent = "PRACTICES_DISCOVERED";
      break;
    case "affirmed":
      emitAudit(pd, "PRACTICES_AFFIRMED", fields);
      emittedEvent = "PRACTICES_AFFIRMED";
      break;
    case "override":
      emitAudit(pd, "PRACTICES_OVERRIDE", fields);
      emittedEvent = "PRACTICES_OVERRIDE";
      break;
    case "empty":
      emitAudit(pd, "PRACTICES_SECTION_EMPTY", fields);
      emittedEvent = "PRACTICES_SECTION_EMPTY";
      break;
    default:
      error(
        `Invalid --type: ${eventTypeArg}. Must be discovered, affirmed, override, or empty.`
      );
      return;
  }
  console.log(
    JSON.stringify({ emitted: emittedEvent, fields_count: Object.keys(fields).length })
  );
}

// practices-promote --team-practices <path> --discovered-rules <path>
//                   [--affirming-user <name>] [--target-dir <path>]
//
// Cross-row promotion of affirmed practices into the team-authored method
// files. Reads two draft files from amadeus-docs/inception/practices-discovery/
// and applies them deterministically to the relocated method files the
// resolver reads (amadeus/spaces/<space>/memory/, neutral names):
//
//   memory/team.md ........... upsert one promotion-owned marker block in
//                              each draft-present canonical section while
//                              preserving unmanaged content byte-for-byte
//   memory/project.md ........ appendUnderHeading × 2 (Mandated,
//                              Forbidden), each rule stamped
//                              with `(affirmed YYYY-MM-DD)`
//
// Atomicity:
//   1. Read both drafts (fail closed before any write).
//   2. Read both targets (fail closed if either missing).
//   3. Build new contents in memory.
//   4. Write project.md first (smaller, more constrained).
//   5. Write team.md second.
//   6. On success → emit PRACTICES_AFFIRMED.
//   7. On any failure → emit PRACTICES_OVERRIDE with the failure reason
//      and rethrow so the caller halts the gate.
//
// Why this exists: when stage prose tells the LLM to write to the method
// files directly, the LLM (running non-interactively under `claude -p`)
// hallucinates a sensitive-file permission policy that does not actually
// exist. The orchestrator then halts at "awaiting-approval" and emits
// PRACTICES_OVERRIDE without ever attempting the write — the workflow
// bricks. Routing the writes through a tool subcommand removes the LLM's
// judgment from the path: the path is never the LLM's write target, so the
// hallucinated policy never fires.
// Parse a discovered-rules section body into trimmed, non-empty, non-comment,
// non-heading rule lines. Mirrors loadRules()'s line filter so the writer and
// reader never drift.
export function parseRuleLines(sectionContent: string): string[] {
  return sectionContent
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("<!--") && !l.startsWith("#"));
}

// Validate parsed rule lines against the section-keyword contract (Issue #1013):
// each rule under `## Mandated` must lead with `ALWAYS ` and each under
// `## Forbidden` with `NEVER ` (after an optional `- ` bullet), matching the
// org.md rule dialect loadRules() reads back. Returns one message per violation
// (all collected — never fail-fast) naming the section, the offending line, and
// the expected prefix. An unknown section imposes no contract and yields none.
export function validateRuleLines(section: string, lines: string[]): string[] {
  const keywords: Record<string, string> = { Mandated: "ALWAYS ", Forbidden: "NEVER " };
  const keyword = keywords[section];
  if (keyword === undefined) return [];
  const violations: string[] = [];
  for (const line of lines) {
    const body = line.startsWith("- ") ? line.slice(2) : line;
    if (!body.startsWith(keyword)) {
      violations.push(`## ${section} rule must start with "${keyword}": ${line}`);
    }
  }
  return violations;
}

// Parse the ## Mandated / ## Forbidden sections of a discovered-rules draft and
// enforce the section-keyword contract atomically. All violations are collected
// and handed to onViolation (which is expected to reject and exit) BEFORE this
// returns, so a violating draft never yields rule lists to write.
export function parseRuleSectionsOrFail(
  discoveredRulesDraft: string,
  onViolation: (reason: string) => never
): { mandated: string[]; forbidden: string[] } {
  const mandated = parseRuleLines(
    extractMarkdownSection(discoveredRulesDraft, "## Mandated")
  );
  const forbidden = parseRuleLines(
    extractMarkdownSection(discoveredRulesDraft, "## Forbidden")
  );
  const violations = validateRuleLines("Mandated", mandated).concat(
    validateRuleLines("Forbidden", forbidden)
  );
  if (violations.length > 0) {
    onViolation(
      `discovered-rules violates the section-keyword contract:\n${violations.join("\n")}`
    );
  }
  return { mandated, forbidden };
}

function markdownSectionRange(
  markdown: string,
  heading: string,
): { bodyStart: number; bodyEnd: number } | null {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^${escapedHeading}[ \\t]*$`, "m").exec(markdown);
  if (!match) return null;
  const afterHeading = match.index + match[0].length;
  const bodyStart = markdown[afterHeading] === "\n" ? afterHeading + 1 : afterHeading;
  const nextHeading = /^## [^\n]*$/m.exec(markdown.slice(bodyStart));
  const bodyEnd = nextHeading ? bodyStart + nextHeading.index : markdown.length;
  return { bodyStart, bodyEnd };
}

function managedPracticesBlock(sectionContent: string): string {
  const contentSuffix = sectionContent.endsWith("\n") ? "" : "\n";
  return `${PRACTICES_MANAGED_BEGIN}\n${sectionContent}${contentSuffix}${PRACTICES_MANAGED_END}`;
}

function markerCount(markdown: string, marker: string): number {
  return markdown.split(marker).length - 1;
}

function validateManagedPracticesMarkers(
  markdown: string,
  headings: readonly string[],
  onViolation: (reason: string) => never
): void {
  let containedBegins = 0;
  let containedEnds = 0;
  for (const heading of headings) {
    const range = markdownSectionRange(markdown, heading);
    if (!range) continue;
    const body = markdown.slice(range.bodyStart, range.bodyEnd);
    const beginCount = markerCount(body, PRACTICES_MANAGED_BEGIN);
    const endCount = markerCount(body, PRACTICES_MANAGED_END);
    containedBegins += beginCount;
    containedEnds += endCount;
    if (beginCount === 0 && endCount === 0) continue;
    if (
      beginCount !== 1 ||
      endCount !== 1 ||
      body.indexOf(PRACTICES_MANAGED_BEGIN) >
        body.indexOf(PRACTICES_MANAGED_END)
    ) {
      onViolation(`managed markers malformed for "${heading}"`);
    }
  }

  if (
    markerCount(markdown, PRACTICES_MANAGED_BEGIN) !== containedBegins ||
    markerCount(markdown, PRACTICES_MANAGED_END) !== containedEnds
  ) {
    onViolation("managed markers malformed outside canonical team sections");
  }
}

function appendSeparator(markdown: string): string {
  if (markdown.endsWith("\n\n")) return "";
  if (markdown.endsWith("\n")) return "\n";
  return "\n\n";
}

function upsertManagedPracticesSection(
  markdown: string,
  heading: string,
  sectionContent: string
): string {
  const block = managedPracticesBlock(sectionContent);
  const range = markdownSectionRange(markdown, heading);
  if (!range) {
    return `${markdown}${appendSeparator(markdown)}${heading}\n\n${block}\n`;
  }

  const body = markdown.slice(range.bodyStart, range.bodyEnd);
  if (!body.includes(PRACTICES_MANAGED_BEGIN)) {
    const before = markdown.slice(0, range.bodyEnd);
    const after = markdown.slice(range.bodyEnd);
    const afterBlock = after === "" ? "\n" : "\n\n";
    return `${before}${appendSeparator(before)}${block}${afterBlock}${after}`;
  }

  // validateManagedPracticesMarkers() established exactly one ordered pair.
  const begin = body.indexOf(PRACTICES_MANAGED_BEGIN);
  const end = body.indexOf(PRACTICES_MANAGED_END);
  const blockStart = range.bodyStart + begin;
  const blockEnd = range.bodyStart + end + PRACTICES_MANAGED_END.length;
  return `${markdown.slice(0, blockStart)}${block}${markdown.slice(blockEnd)}`;
}

export function handlePracticesPromote(args: string[]): void {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--") && i + 1 < args.length) {
      const value = args[i + 1];
      rejectFlagLikeValue(a, value);
      flags[a.slice(2)] = value;
      i++;
    }
  }
  if (!flags["team-practices"] || !flags["discovered-rules"]) {
    error(
      'Usage: amadeus-state.ts practices-promote --team-practices <path> --discovered-rules <path> [--affirming-user <name>] [--target-dir <path>]'
    );
  }

  const pd = resolveProjectDir(projectDir);
  // The affirmed practices land in the relocated method files the resolver
  // reads — team.md / project.md under amadeus/spaces/<space>/memory/ (neutral
  // names, no `amadeus-` prefix). memoryDirFor() derives the path from the SAME
  // MEMORY_SEGMENTS loadRules() reads from, so this writer and the reader can
  // never drift (P5 relocated the reader; P6 closes the seam here). --target-dir
  // lets tests point the writes at a fixture memory dir; it defaults to the
  // project's resolved memory dir.
  const targetRoot = flags["target-dir"] ?? memoryDirFor(pd);
  const teamMdPath = join(targetRoot, "team.md");
  const guardrailsPath = join(targetRoot, "project.md");

  const today = isoTimestamp().slice(0, 10);
  const sectionsWritten: string[] = [];
  const rulesAppended = { mandated: 0, forbidden: 0 };

  const fail = (reason: string): never => {
    try {
      emitAudit(pd, "PRACTICES_OVERRIDE", {
        Reason: reason,
        Timestamp: isoTimestamp(),
      });
    } catch {
      // If audit emission itself fails, surface the original reason.
    }
    error(`practices-promote failed: ${reason}`);
    throw new Error(reason); // unreachable; error() exits, but TS needs this
  };

  // Step 1: Read both drafts.
  const teamPracticesPath = flags["team-practices"];
  const discoveredRulesPath = flags["discovered-rules"];
  if (!existsSync(teamPracticesPath))
    fail(`team-practices draft not found: ${teamPracticesPath}`);
  if (!existsSync(discoveredRulesPath))
    fail(`discovered-rules draft not found: ${discoveredRulesPath}`);

  let teamPracticesDraft: string;
  let discoveredRulesDraft: string;
  try {
    teamPracticesDraft = readFileSync(teamPracticesPath, "utf-8");
    discoveredRulesDraft = readFileSync(discoveredRulesPath, "utf-8");
  } catch (e) {
    fail(`could not read drafts: ${errorMessage(e)}`);
    return;
  }

  // Step 2: Read both target files. Fail closed if either is missing.
  if (!existsSync(teamMdPath)) fail(`team.md not found at ${teamMdPath}`);
  if (!existsSync(guardrailsPath))
    fail(`project.md not found at ${guardrailsPath}`);

  let teamMd: string;
  let guardrailsMd: string;
  try {
    teamMd = readFileSync(teamMdPath, "utf-8");
    guardrailsMd = readFileSync(guardrailsPath, "utf-8");
  } catch (e) {
    fail(`could not read targets: ${errorMessage(e)}`);
    return;
  }

  // Step 3a: Validate every managed marker before building either target.
  // Draft-absent sections are still validated so malformed ownership markers
  // can never be hidden by a partial promotion.
  validateManagedPracticesMarkers(teamMd, PRACTICES_TEAM_SECTIONS, fail);

  // Build new team.md by upserting one managed block per draft-present
  // canonical section. Existing unmanaged bytes remain outside that block;
  // missing headings are appended in canonical order.
  let newTeamMd = teamMd;
  for (const heading of PRACTICES_TEAM_SECTIONS) {
    const draftSection = extractMarkdownSection(teamPracticesDraft, heading);
    if (draftSection === "") {
      // Section absent from draft → leave the live file's section alone.
      // Useful for partial re-runs that only change one practice area.
      continue;
    }
    newTeamMd = upsertManagedPracticesSection(newTeamMd, heading, draftSection);
    sectionsWritten.push(heading.slice(3));
  }
  validateManagedPracticesMarkers(
    newTeamMd,
    PRACTICES_TEAM_SECTIONS,
    fail
  );

  // Step 3b: parse + enforce the section-keyword contract atomically (Issue #1013).
  const { mandated: mandatedRules, forbidden: forbiddenRules } =
    parseRuleSectionsOrFail(discoveredRulesDraft, fail);

  let newGuardrailsMd = guardrailsMd;
  for (const rule of mandatedRules) {
    const stamped = `${rule} (affirmed ${today})\n`;
    try {
      newGuardrailsMd = appendUnderHeading(
        newGuardrailsMd,
        "## Mandated",
        stamped
      );
      rulesAppended.mandated++;
    } catch (e) {
      fail(`appendUnderHeading failed on Mandated: ${errorMessage(e)}`);
      return;
    }
  }
  for (const rule of forbiddenRules) {
    const stamped = `${rule} (affirmed ${today})\n`;
    try {
      newGuardrailsMd = appendUnderHeading(
        newGuardrailsMd,
        "## Forbidden",
        stamped
      );
      rulesAppended.forbidden++;
    } catch (e) {
      fail(`appendUnderHeading failed on Forbidden: ${errorMessage(e)}`);
      return;
    }
  }

  // Latch gate (#1961): force the fatal health latch to be observable BEFORE
  // either target write. The latch may only become set inside the FIRST emit
  // of a process (the bootstrap journal health probe runs there), so without
  // this bootstrap a latched-journal workspace sailed through to the writes
  // and only failed at the Step 6 emit — after both files were mutated, with
  // the compensating PRACTICES_OVERRIDE refused by the same latch. Bootstrap
  // now (idempotent), then assert: a latched process fails here with NOTHING
  // written. The post-write emit check below stays for the tiny window where
  // the latch trips mid-process.
  try {
    ensureOtelBootstrap(pd);
    assertMutationAllowed();
  } catch (e) {
    fail(`mutation refused before writing targets: ${errorMessage(e)}`);
    return;
  }

  // Step 4 & 5: Write project.md first, then team.md.
  // If the project write fails, team.md is untouched. If the team write
  // fails after project succeeded, we surface that as PRACTICES_OVERRIDE —
  // the user re-enters the gate; the duplicate-rule case is mitigated because
  // re-running parses the same rule list and appendUnderHeading is idempotent
  // only on the draft contents, not on ALL prior runs. Operators should treat
  // a mid-promotion failure as a recovery scenario — one that, since the
  // pre-write latch gate above, can only arise from a failure that occurs
  // mid-process (a latch already set at handler start no longer reaches here).
  try {
    writeFileSync(guardrailsPath, newGuardrailsMd, "utf-8");
  } catch (e) {
    fail(`writing project.md failed: ${errorMessage(e)}`);
    return;
  }
  try {
    writeFileSync(teamMdPath, newTeamMd, "utf-8");
  } catch (e) {
    fail(
      `writing team.md failed AFTER project.md was written: ${errorMessage(e)}`
    );
    return;
  }

  // Step 6: Emit PRACTICES_AFFIRMED.
  try {
    emitAudit(pd, "PRACTICES_AFFIRMED", {
      "Affirming User": flags["affirming-user"] ?? "unknown",
      "Sections Written": sectionsWritten.join(", "),
      "Mandated Rules Appended": String(rulesAppended.mandated),
      "Forbidden Rules Appended": String(rulesAppended.forbidden),
      Timestamp: isoTimestamp(),
    });
  } catch (e) {
    fail(
      `audit emission failed AFTER both files were written: ${errorMessage(e)}`
    );
    return;
  }

  console.log(
    JSON.stringify({
      emitted: "PRACTICES_AFFIRMED",
      sections_written: sectionsWritten,
      mandated_appended: rulesAppended.mandated,
      forbidden_appended: rulesAppended.forbidden,
      team_md: teamMdPath,
      project_guardrails: guardrailsPath,
    })
  );
}

// reuse-artifact <slug> --decision <keep|modify|redo> --artifacts <csv>
function handleReuseArtifact(args: string[]): void {
  if (args.length < 1)
    error("Usage: amadeus-state.ts reuse-artifact <slug> --decision <keep|modify|redo> --artifacts <csv>");
  const slug = args[0];
  const rest = args.slice(1);
  const decision = getFlagValue(rest, "--decision");
  const artifacts = getFlagValue(rest, "--artifacts");
  if (!decision) error("Missing --decision <keep|modify|redo>");
  if (!artifacts) error("Missing --artifacts <csv>");

  if (!["keep", "modify", "redo"].includes(decision)) {
    error(`Invalid decision: ${decision}. Must be keep, modify, or redo.`);
  }

  // Validate stage exists in graph (adversarial finding C: reuse-artifact
  // was accepting any slug). This prevents orphan ARTIFACT_REUSED emissions
  // against non-existent stages.
  const stage = findStageBySlug(slug);
  if (!stage) error(`Unknown stage: ${slug}`);

  const pd = resolveProjectDir(projectDir);

  try {
    emitAudit(pd, "ARTIFACT_REUSED", {
      Stage: slug,
      Decision: decision,
      Artifacts: artifacts,
    });
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }

  console.log(JSON.stringify({ slug, decision, artifacts, emitted: "ARTIFACT_REUSED" }));
}

export function handleLookup(args: string[]): void {
  if (args.length < 1) error("Usage: amadeus-state.ts lookup <subcommand> [args...]");
  const sub = args[0];
  const subArgs = args.slice(1);

  switch (sub) {
    case "phase-of": {
      if (subArgs.length < 1) error("Usage: lookup phase-of <slug>");
      const stage = resolveStage(subArgs[0]);
      if (!stage) error(`Unknown stage: ${subArgs[0]}`);
      console.log(stage.phase);
      break;
    }
    case "next-stage": {
      if (subArgs.length < 2) error("Usage: lookup next-stage <slug> <scope>");
      // Thread the live state file (when one exists) so the projection honours
      // per-stage suffix overrides (a recomposed plan) and [x]/[S] checkboxes,
      // matching the advance/finalize walks. A stateless workspace still
      // answers from the static grid (read-only either way).
      let stateForWalk: string | undefined;
      try {
        const pd = resolveProjectDir(projectDir);
        stateForWalk = readStateFile(pd);
      } catch {
        stateForWalk = undefined;
      }
      const next = nextInScopeStage(subArgs[0], subArgs[1], stateForWalk);
      console.log(next ? next.slug : "none");
      break;
    }
    case "agent-for": {
      if (subArgs.length < 1) error("Usage: lookup agent-for <slug>");
      const stage = resolveStage(subArgs[0]);
      if (!stage) error(`Unknown stage: ${subArgs[0]}`);
      console.log(stage.lead_agent);
      break;
    }
    case "number-of": {
      if (subArgs.length < 1) error("Usage: lookup number-of <slug>");
      const stage = resolveStage(subArgs[0]);
      if (!stage) error(`Unknown stage: ${subArgs[0]}`);
      console.log(stage.number);
      break;
    }
    case "stages-in-scope": {
      if (subArgs.length < 1) error("Usage: lookup stages-in-scope <scope>");
      const stages = stagesInScope(subArgs[0]);
      if (stages.length === 0) error(`Unknown scope: ${subArgs[0]}`);
      console.log(JSON.stringify(stages));
      break;
    }
    case "first-in-phase": {
      if (subArgs.length < 2) error("Usage: lookup first-in-phase <phase> <scope>");
      const stage = firstInScopeStageOfPhase(subArgs[0], subArgs[1]);
      console.log(stage ? stage.slug : "none");
      break;
    }
    case "validate-stage": {
      if (subArgs.length < 1) error("Usage: lookup validate-stage <slug-or-number>");
      const stage = resolveStage(subArgs[0]);
      if (!stage) {
        console.log(JSON.stringify({ valid: false, input: subArgs[0] }));
      } else {
        console.log(
          JSON.stringify({
            valid: true,
            slug: stage.slug,
            number: stage.number,
            name: stage.name,
            phase: stage.phase,
            lead_agent: stage.lead_agent,
          })
        );
      }
      break;
    }
    case "validate-phase": {
      if (subArgs.length < 1) error("Usage: lookup validate-phase <phase-or-number>");
      const phase = ownPhase(subArgs[0]);
      if (!phase) {
        console.log(JSON.stringify({ valid: false, input: subArgs[0] }));
      } else {
        const phaseNumber = Object.entries(PHASE_NUMBERS).find(([_, v]) => v === phase)?.[0];
        console.log(
          JSON.stringify({
            valid: true,
            canonical: phase,
            number: phaseNumber,
            display: phase.toUpperCase(),
          })
        );
      }
      break;
    }
    default:
      error(
        `Unknown lookup subcommand: ${sub}. Valid: phase-of, next-stage, agent-for, number-of, stages-in-scope, first-in-phase, validate-stage, validate-phase`
      );
  }
}

// --- State fork/merge ---
//
// Per-Bolt state isolation for Construction worktrees. fork copies main state
// to <worktreePath>/amadeus-docs/amadeus-state.md on Bolt start; merge copies it
// back on gate approval. Strict audit-first per docs/reference/12-state-machine.md
// — the audit-of-intent exception at line 322 is bounded to the three
// WORKTREE_* events because git worktree add has no idempotent re-run path
// under kill-9; state fork/merge are idempotent (re-reading and re-writing a
// file is repeatable), so strict audit-first applies.
//
// Conflict resolution by alphabetical-slug is defence-in-depth, not load-bearing:
// the v7 schema has workflow-level singletons, not per-(Bolt, stage) cells.
// Realistic per-Bolt contention is rare; main wins on workflow-level fields,
// alphabetical-slug only fires as a tiebreak on the artificial case of two
// worktrees flipping the same Construction Stage Progress cell to different
// values.
//
// (SLUG_RE, validateSlug, errorWithSlug, sha256, parseFlags are declared
// near the top of the file so main() can reach them — handlers live below.)

// fork --slug <slug> [--target-dir <path>]
//
// Forks main's amadeus-state.md to <worktreePath>/amadeus-docs/amadeus-state.md.
// Adds slug to main's Bolt Refs list. Decorative Worktree Path on the
// worktree-side state file (recoverable from cwd; debugging breadcrumb only).
export function handleFork(args: string[]): void {
  // "--unit" (see boltContextKind below) is a bare boolean marker forwarded
  // verbatim by amadeus-bolt.ts's start handler — it never carries a value.
  // parseFlags's value-carrying-flag scan has no boolean-flag concept (unlike
  // amadeus-bolt.ts's own splitBooleanFlags), so strip it before that scan:
  // otherwise a call shaped "--unit --repo <name>" (bolt.ts:299-306's
  // unitFlagArgs()+selectorArgs() pass-through) reads as --unit's value being
  // swallowed by the NEXT flag and is now refused (Issue #2763's
  // rejectFlagLikeValue guard) instead of the pre-existing silent-and-harmless
  // mis-capture into an unread flags.unit. boltContextKind still reads the
  // ORIGINAL args below so its `--unit` presence check is unaffected.
  const flags = parseFlags(args.filter((a) => a !== "--unit"));
  const slug = validateSlug(flags.slug);
  const pd = resolveProjectDir(projectDir);
  // Whether the slug names a swarm unit or a Bolt, for the telemetry marker
  // written at the end of the fork. Resolved off argv: only the caller knows,
  // and parseFlags takes value-carrying flags only.
  const markerKind = boltContextKind(args);

  // The space+intent selector pins this fork to ONE intent end-to-end (vision
  // §5): --intent <record> / --space <name> override the active cursor;
  // omitted -> default-resolution (the active cursor / lone intent). The SAME
  // selector threads main-side state/audit/lock AND the worktree mirror, and
  // MUST match what merge resolves so they touch one record.
  const intent = flags.intent;
  const space = flags.space;
  // recordPrefix is the worktree mirror's relative record dir (null -> the flat
  // legacy mirror, today's behaviour); wtRecord is the resolved record-dir NAME
  // the worktree state file lives under (null -> flat). Resolved on the MAIN
  // side so fork and merge pin to the same intent regardless of the worktree's
  // own cursor.
  const recordPrefix = relativeRecordDir(pd, intent, space);
  // Resolve the intent ONCE, here, BEFORE acquiring the lock. activeIntent maps
  // an omitted (--intent unset) selector to the active cursor / lone record, so
  // `resolvedIntent` is the SAME value the per-intent path helpers (readStateFile
  // / writeStateFile / auditFilePath) resolve internally. Threading the RAW
  // flags.intent to the lock instead would key the __workspace__ sentinel on the
  // omitted path while the writes target the resolved per-intent shard — LOCK !=
  // WRITE, the exact lost-update race the lock exists to prevent (a concurrent
  // explicit-intent op on the same shard would hold a DIFFERENT lock). So we use
  // `resolvedIntent` for the wrapping lock AND every main-side read/write/audit
  // below. `wtRecord` is the same value (kept as a distinct name for the
  // worktree-mirror write, whose null->flat semantics read clearer there).
  const resolvedIntent = activeIntent(pd, space, intent) ?? undefined;
  const wtRecord = resolvedIntent;
  // Publish the resolved lock context so any errorWithSlug fired inside the
  // per-intent withAuditLock below routes ERROR_LOGGED to the bucket we hold
  // (see error()/emitError). Cleared after the transaction.
  lockIntent = resolvedIntent;
  lockSpace = space;

  // target-dir lets tests point fork at a fixture worktree-parent. Defaults
  // to the project's .amadeus/worktrees/bolt-<slug>/ via worktreePath().
  const wtPath = flags["target-dir"] ?? worktreePath(pd, slug);

  if (!existsSync(wtPath)) {
    errorWithSlug(slug, `worktree directory does not exist: ${wtPath}. Run amadeus-worktree create first.`);
  }

  // mkdir BEFORE acquiring the lock. A read-only-fs mkdir failure must not
  // leave a phantom STATE_FORKED row, and acquiring the lock for a doomed
  // operation just delays the failure.
  const wtDocsDir = worktreeDocsDir(wtPath, recordPrefix);
  try {
    mkdirSync(wtDocsDir, { recursive: true });
  } catch (e) {
    errorWithSlug(slug, `failed to create ${wtDocsDir}: ${errorMessage(e)}`);
  }

  // Hold the audit lock across the whole transaction so:
  //   - the dedup-check / emit / write are atomic against concurrent forks
  //     (no two forks for the same slug can both pass the dedup check);
  //   - the audit row only emits when we know the write will land cleanly
  //     (no phantom STATE_FORKED on duplicate-slug or stale-state failures);
  //   - process.exit() inside the body still releases the lock dir via
  //     withAuditLock's exit-handler safety net (Bun's process.exit skips
  //     `finally`, which would otherwise poison the project for ~5s).
  let srcSha: string;
  try {
    // Lock the SAME per-intent bucket the inner state/audit writes target
    // (resolvedIntent+space threaded), NOT the __workspace__ sentinel — without
    // this the transaction serializes every intent's fork on one workspace lock
    // (the P3 shared-lock cliff) and intent-birth/migration would block unrelated
    // forks. resolvedIntent (not raw flags.intent) makes LOCK == WRITE even when
    // --intent is omitted (both resolve to the active record).
    srcSha = withAuditLock(pd, () => {
    let mainContent: string;
    try {
      mainContent = readStateFile(pd, resolvedIntent, space);
    } catch (e) {
      errorWithSlug(slug, `failed to read main state: ${errorMessage(e)}`);
      return ""; // unreachable
    }
    const sha = sha256(mainContent);

    // Dedup BEFORE emit: if the slug is already in Bolt Refs, fail without
    // emitting a phantom audit row. Recovery from a stale ref entry is the
    // CALLER's responsibility, and the refusal below names the two moves it
    // has (discard + re-fork, or removing the stale entry). Re-forking is safe
    // because the next fork sees the slug already present and exits here
    // without poisoning audit — a property of this dedup, not of any numbered
    // step in conductor prose.
    const currentRefs = getField(mainContent, "Bolt Refs") ?? "";
    if (parseRefsList(currentRefs).includes(slug)) {
      errorWithSlug(slug, `slug already in Bolt Refs (current: ${currentRefs.trim()}). If a prior fork failed mid-operation, run 'amadeus-worktree discard --slug ${slug}' and 'amadeus-state.ts merge --slug ${slug}' (which will exit "already merged" cleanly) or remove the stale entry from main state, then retry.`);
    }

    // Append slug to main's Bolt Refs first (the side effect that "registers"
    // the fork). If this fails, no audit, no worktree state — clean recovery.
    let mainNow = mainContent;
    try {
      mainNow = setFieldStrict(mainNow, "Bolt Refs", appendSlug(currentRefs, slug));
    } catch (e) {
      errorWithSlug(slug, `failed to compute updated Bolt Refs: ${errorMessage(e)}`);
    }

    // Audit-first within the locked critical section. The canonical emit
    // re-enters the lock we already hold (withAuditLock's per-identity depth
    // counter) as long as it is targeted at the SAME (intent, space) — which
    // is also the pair that selects the shard this row belongs in.
    try {
      emitAuditEvent("STATE_FORKED", {
        "Bolt slug": slug,
        "Worktree path": wtPath,
        "Source state hash": sha,
        "Target state hash": sha, // fork = byte-identical copy
      }, pd, resolvedIntent, space);
    } catch (e) {
      errorWithSlug(slug, `audit emission failed: ${errorMessage(e)}`);
    }

    // Write main state with updated Bolt Refs.
    try {
      writeStateFile(pd, mainNow, resolvedIntent, space);
    } catch (e) {
      errorWithSlug(slug, `failed to write main state with updated Bolt Refs: ${errorMessage(e)}`);
    }

    // Write worktree state with the decorative Worktree Path breadcrumb.
    // Done last so a write failure here leaves a recoverable surface: main's
    // Bolt Refs has the slug, audit has the row, but the worktree's state
    // file is missing — doctor reconciles by checking
    // `<worktreePath>/amadeus-docs/amadeus-state.md` existence against Bolt Refs.
    let wtContent = mainContent;
    try {
      wtContent = setFieldStrict(wtContent, "Worktree Path", wtPath);
    } catch (e) {
      errorWithSlug(slug, `failed to set Worktree Path on worktree state: ${errorMessage(e)}`);
    }
    try {
      // The worktree mirror lives under the SAME record (wtRecord/space) the
      // main side resolved — NOT the worktree's own cursor — so fork and merge
      // read/write one file. wtRecord===undefined -> the flat legacy mirror.
      writeStateFile(wtPath, wtContent, wtRecord, space);
    } catch (e) {
      errorWithSlug(slug, `failed to write worktree state at ${wtPath}: ${errorMessage(e)}`);
    }

    // The telemetry marker naming the unit of work this worktree serves
    // (#1868 §2, read by otel/span-context.ts). Deliberately NOT a state
    // field: the state file is a tracked path shared with main, so a value
    // written here would reach main on merge and then name this Bolt for every
    // later process there. The marker name sits inside the `.amadeus-*` ignore
    // pattern, so it stays in the worktree that owns it.
    try {
      writeBoltContextMarker(wtDocsDir, slug, markerKind);
    } catch (e) {
      errorWithSlug(slug, `failed to write ${BOLT_CONTEXT_MARKER} at ${wtDocsDir}: ${errorMessage(e)}`);
    }

    return sha;
    }, resolvedIntent, space);
  } catch (e) {
    // Slug-tag any error from the locked block (most commonly: lock-acquire
    // timeout when a peer tool holds the lock across the retry budget).
    errorWithSlug(slug, errorMessage(e));
    return; // unreachable
  }
  // Transaction done — clear the lock context so any subsequent sentinel-locked
  // emit in this process keys the sentinel, not a stale per-intent bucket.
  lockIntent = undefined;
  lockSpace = undefined;

  process.stdout.write(
    `${JSON.stringify({
      status: "forked",
      slug,
      worktree_path: wtPath,
      source_state_hash: srcSha,
    })}\n`
  );
}

// merge --slug <slug> [--target-dir <path>]
//
// Merges <worktreePath>/amadeus-docs/amadeus-state.md back to main. Workflow-level
// singletons are kept from main (untouched); Construction Stage Progress cells
// merge from the worktree; alphabetical-slug tiebreak as defence-in-depth.
// Idempotent: re-running for an already-merged slug exits non-zero with a
// clear "already merged" error and emits no second STATE_MERGED row.
export function mergeScopedCheckboxProgress(
  mainContent: string,
  worktreeContent: string,
  refsList: readonly string[],
  slug: string,
): { merged: string; conflictResolution: string[] } {
  let merged = mainContent;
  const conflictResolution: string[] = [];
  const mainCheckboxes = parseScopedCheckboxes(mainContent);
  const worktreeCheckboxes = parseScopedCheckboxes(worktreeContent);
  const checkboxKey = (checkbox: ScopedCheckboxLine): string =>
    stageLineKey(checkbox.slug, checkbox.unit);
  const mainStateMap = new Map(mainCheckboxes.map((checkbox) => [checkboxKey(checkbox), checkbox.state]));
  const winningSlug = [...refsList].sort()[0];

  for (const worktreeCheckbox of worktreeCheckboxes) {
    const mainState = mainStateMap.get(checkboxKey(worktreeCheckbox));
    if (!mainState || mainState === worktreeCheckbox.state) continue;
    if (winningSlug === slug) {
      merged = requireChanged(
        setCheckbox(
          validateStageState(merged, worktreeCheckbox.unit ? { unit: worktreeCheckbox.unit } : {}),
          worktreeCheckbox.slug,
          worktreeCheckbox.state,
        ),
        `merge-worktree:${worktreeCheckbox.slug}`,
      );
      if (refsList.length > 1) {
        conflictResolution.push(`${worktreeCheckbox.slug}:slug-precedence:${slug}`);
      }
    } else {
      conflictResolution.push(`${worktreeCheckbox.slug}:deferred-to:${winningSlug}`);
    }
  }
  return { merged, conflictResolution };
}

function handleMerge(args: string[]): void {
  const flags = parseFlags(args);
  const slug = validateSlug(flags.slug);
  const pd = resolveProjectDir(projectDir);

  // Same selector the fork used -> the SAME intent record on both ends (vision
  // §5). recordPrefix pins the worktree mirror; wtRecord is its record-dir NAME.
  const intent = flags.intent;
  const space = flags.space;
  const recordPrefix = relativeRecordDir(pd, intent, space);
  // Resolve the intent ONCE before locking (same rationale as handleFork):
  // activeIntent maps an omitted selector to the active record, so resolvedIntent
  // == the value the per-intent path helpers resolve internally. Threading it to
  // the wrapping lock AND every main-side read/write/audit makes LOCK == WRITE
  // even when --intent is omitted; raw flags.intent would key the sentinel while
  // the writes hit the per-intent shard (lost-update race). wtRecord is the same
  // value, named for the worktree-mirror read where null->flat reads clearer.
  const resolvedIntent = activeIntent(pd, space, intent) ?? undefined;
  const wtRecord = resolvedIntent;
  // Publish the lock context for the in-transaction error path (see error()).
  lockIntent = resolvedIntent;
  lockSpace = space;

  const wtPath = flags["target-dir"] ?? worktreePath(pd, slug);
  if (!existsSync(wtPath)) {
    errorWithSlug(slug, `worktree directory does not exist: ${wtPath}.`);
  }
  const wtStatePath = worktreeStateFilePath(wtPath, recordPrefix);
  if (!existsSync(wtStatePath)) {
    errorWithSlug(slug, `worktree state file does not exist: ${wtStatePath}. Was fork run?`);
  }

  // Read worktree state outside the lock — its file isn't shared with peers
  // (each Bolt owns its own worktree state file), so it doesn't need the
  // audit lock for consistency. Read the SAME record the fork wrote.
  const wtContent = readStateFile(wtPath, wtRecord, space);
  const wtSha = sha256(wtContent);

  // Hold the audit lock across the entire decide-emit-write transaction so
  // conflict-resolution decisions, the audit Target state hash, and the
  // actual main state write are all consistent with the SAME view of main.
  // Without this, a third concurrent merge landing between our snapshot and
  // our write would cause: (a) the audit Target hash to disagree with the
  // actual post-write SHA, (b) stale Bolt Refs being used to compute the
  // alphabetical tiebreak, and (c) one merge clobbering another's writes.
  let result: { postMergeSha: string; conflictResolutionField: string };
  try {
    // Lock the per-intent bucket (resolvedIntent+space threaded) the inner
    // writes target — same fix as handleFork: the __workspace__ sentinel would
    // serialize all intents' merges and let intent-birth block an unrelated
    // merge (P3 shared-lock cliff). resolvedIntent (not raw flags.intent) makes
    // LOCK == WRITE on the omitted-intent path.
    result = withAuditLock(pd, () => {
    const mainContent = readStateFile(pd, resolvedIntent, space);

    // Idempotency: if slug is not in main's Bolt Refs, this is a re-run after
    // a prior successful merge (or a never-forked slug). Either way, no work
    // to do; emit no second audit row.
    const currentRefs = getField(mainContent, "Bolt Refs") ?? "";
    const refsList = parseRefsList(currentRefs);
    if (!refsList.includes(slug)) {
      errorWithSlug(slug, `already merged: not in Bolt Refs (current: ${currentRefs.trim()})`);
    }

    // Per-field merge rule, computed against the LOCKED snapshot:
    //  - Workflow-level singletons (Project, Project Type, Scope, Start Date,
    //    State Version, Active Agent, Practices Affirmed Timestamp): main
    //    wins. These come straight from `mainContent` untouched.
    //  - Construction Stage Progress checkboxes: take the worktree's value
    //    when the worktree advanced past main's, IF this slug is the
    //    alphabetically-lowest active ref. Workflow-level fields stay from
    //    main automatically because we start from mainContent and only
    //    overwrite the per-stage cells.
    //  - Tiebreak (alphabetical-slug, defence-in-depth): if multiple slugs
    //    in Bolt Refs would compete for the same cell, the lower
    //    alphabetical slug wins.
    const progressMerge = mergeScopedCheckboxProgress(mainContent, wtContent, refsList, slug);
    let merged = progressMerge.merged;
    const conflictResolution = progressMerge.conflictResolution;

    // Remove slug from Bolt Refs.
    merged = setFieldStrict(merged, "Bolt Refs", removeSlug(currentRefs, slug));

    const conflictResolutionField =
      conflictResolution.length === 0 ? "clean" : conflictResolution.join("; ");
    // Target hash matches the actual post-write content — computed inside the
    // lock against the final `merged` value so doctor can verify by
    // re-hashing the file at observation time.
    const postMergeSha = sha256(merged);

    // Strict audit-first within the locked critical section — the canonical
    // emit re-enters the held lock on the same target (see the fork arm).
    try {
      emitAuditEvent("STATE_MERGED", {
        "Bolt slug": slug,
        "Worktree path": wtPath,
        "Source state hash": wtSha,
        "Target state hash": postMergeSha,
        "Conflict resolution": conflictResolutionField,
      }, pd, resolvedIntent, space);
    } catch (e) {
      errorWithSlug(slug, `audit emission failed: ${errorMessage(e)}`);
    }

    writeStateFile(pd, merged, resolvedIntent, space);

    return { postMergeSha, conflictResolutionField };
    }, resolvedIntent, space);
  } catch (e) {
    // Slug-tag any error from the locked block (most commonly: lock-acquire
    // timeout when a peer tool holds the lock across the retry budget).
    errorWithSlug(slug, errorMessage(e));
    return; // unreachable
  }
  // Transaction done — clear the lock context (see handleFork).
  lockIntent = undefined;
  lockSpace = undefined;

  process.stdout.write(
    `${JSON.stringify({
      status: "merged",
      slug,
      worktree_path: wtPath,
      source_state_hash: wtSha,
      target_state_hash: result.postMergeSha,
      conflict_resolution: result.conflictResolutionField,
    })}\n`
  );
}

// set-construction-iteration <stage-major|unit-major> — record the opt-in
// construction iteration axis (FR-2 item 8). `Construction Iteration` is a
// runtime-only field (like Skeleton Stance): absent from the base template, so
// an unset workflow stays byte-identical on the default stage-major path
// (NFR-3 / BR-U05-02). The token is validated by parseConstructionIteration
// (the graph.ts owner) BEFORE the lock is taken and BEFORE any read/write, so an
// invalid value rejects with state/plan/graph/audit untouched (BR-U05-05): the
// reject arm never reaches withAuditLock. No audit row — the axis is metadata
// the next `amadeus-orchestrate next` reads, riding no state-machine event
// (exactly like set-skeleton-stance). Placed at the tail of the handlers so its
// lock callback does not shift the complexity baseline's anonymous-function
// ordinals (tests/.complexity-baseline.json). Exported so the integration twin
// can drive the production adapter IN-PROCESS (lcov-visible) alongside the
// shipped-subprocess parity check.
export function handleSetConstructionIteration(args: string[]): void {
  if (args.length < 1) {
    error(
      "Usage: amadeus-state.ts set-construction-iteration <stage-major|unit-major>",
    );
  }
  const parsed = parseConstructionIteration(args[0]);
  if (!parsed.ok) {
    // Mutation-before-reject: fail closed here (error() is `never`), before any
    // lock/read/write, so state/plan/graph/audit stay byte-identical.
    error(parsed.error);
  }
  const value = parsed.value;
  const pd = resolveProjectDir(projectDir);
  // C2b lost-update safety: read→write under one lock (mirrors set-skeleton-stance).
  withAuditLock(pd, () => {
    const content = readStateFile(pd);
    const updated = setOrInsertField(
      content,
      "## Runtime State",
      "Construction Iteration",
      value,
    );
    writeStateFile(pd, updated);
    console.log(JSON.stringify({ updated: true, construction_iteration: value }));
  });
}

// declare-units-done (issue #2358, ruling #2385 Q4-B): the sole write path for
// the degrade-path unit-list declaration. A per-unit stage with no compiled unit
// DAG refuses a listing whose unit directories are ALL already covered, because
// it cannot tell a finished workflow from one that is still adding units. This
// verb is the conductor saying "no further unit is coming"; the engine then
// presents the stage gate on the last unit. It only ever RECORDS — the engine
// re-checks the declaration against the live listing, so a stale declaration
// withholds the gate rather than forcing one.
//
// ONE rejection site: parseDeclaredUnitsArg already refuses an absent, empty or
// all-whitespace list (its message carries the usage line), so a separate
// emptiness guard here would be a second error path saying the same thing —
// and, sitting in this spawn-only handler, an unmeasurable one.
// Mutation-before-reject: error() is `never`, so a malformed list fails closed
// before any lock/read/write (mirrors set-construction-iteration).
export function handleDeclareUnitsDone(args: string[]): void {
  const flags = parseFlags(args);
  const raw = typeof flags.units === "string" ? flags.units : "";
  const parsed = parseDeclaredUnitsArg(raw);
  if (!parsed.ok) error(parsed.error);
  const units = parsed.units;
  const pd = resolveProjectDir(projectDir);
  // C2b lost-update safety: read→write under one lock (mirrors set-skeleton-stance).
  withAuditLock(pd, () => {
    const declaredAt = isoTimestamp();
    const content = readStateFile(pd);
    const updated = writeDegradeUnitDeclaration(content, units, declaredAt);
    writeStateFile(pd, updated);
    console.log(JSON.stringify({ declared: true, units, declared_at: declaredAt }));
  });
}

function preparedCompletionIdentityRefusal(
  prepared: WorkflowCompletionPreparation,
  completedSlug: string,
  requestedInstance: string | undefined,
): string | null {
  if (prepared.stage !== completedSlug) {
    return `Workflow completion was prepared for "${prepared.stage}", not "${completedSlug}".`;
  }
  if (requestedInstance === undefined) {
    return `Prepared workflow completion requires --completion-instance "${prepared.instance}".`;
  }
  if (requestedInstance !== prepared.instance) {
    return `Workflow completion instance mismatch: expected "${prepared.instance}", got "${requestedInstance}".`;
  }
  return null;
}

function evaluatePreparedWorkflowCompletion(
  context: WorkflowPreparationGuardContext,
): LifecycleGuardVerdict {
  const { pd, content, completedSlug, requestedInstance } = context;
  const prepared = workflowCompletionPreparation(content);
  if (prepared === null) return guardNotApplicable("no workflow completion was prepared");
  const identity = preparedCompletionIdentityRefusal(prepared, completedSlug, requestedInstance);
  if (identity !== null) return guardDenied({ reason: identity });
  const space = stateOperationTarget?.space ?? activeSpace(pd);
  const intent =
    stateOperationTarget?.intent ?? activeIntent(pd, space);
  if (!intent) {
    return guardDenied({ reason: "Prepared workflow completion cannot resolve its Intent." });
  }
  const config = resolveAmadeusConfig(pd, intent, space);
  if (config.kind === "invalid") {
    const details = config.issues.map((issue) =>
      issue.kind === "read-failure"
        ? `${issue.layer}: ${issue.summary}`
        : `${issue.layer}: expected ${issue.expected}, got ${issue.actualType}`
    ).join("; ");
    return guardDenied({
      reason: `Prepared workflow completion cannot resolve mirror configuration: ${details}`,
    });
  }
  if (config.config.intentMirror.github.issue.consent === "off") {
    return guardNotApplicable("the Intent mirror is off");
  }
  const entries = readIntentRegistry(pd, space).filter((entry) =>
    recordDirMatches(entry, intent)
  );
  if (entries.length !== 1) {
    return guardDenied({
      reason: "Prepared workflow completion must resolve exactly one Intent registry row.",
    });
  }
  const parsed = parseMirrorStateDocument(content);
  if (parsed.kind === "invalid") {
    return guardDenied({
      reason: `Prepared workflow completion has invalid mirror state: ${parsed.issues.join("; ")}`,
    });
  }
  if (parsed.snapshot.auditOutbox !== null && parsed.snapshot.auditOutbox !== undefined) {
    return guardDenied({
      reason: "Prepared workflow completion still has a pending mirror audit outbox.",
    });
  }
  const settlement = workflowCompletionSettlement({
    intentUuid: entries[0].uuid,
    boundary: {
      kind: "workflow-completed",
      instance: prepared.instance,
    },
    state: parsed.snapshot,
  });
  if (settlement.kind !== "settled") {
    const detail = settlement.kind === "pending"
      ? `operation "${settlement.operation}" is still pending`
      : `operation "${settlement.operation}" is ${settlement.status}`;
    return guardDenied({
      reason:
        `Prepared workflow completion cannot commit before its mirror boundary settles: ${detail}.`,
    });
  }
  return guardAllowed();
}

// An unresolved Intent record is a broken workspace, not a completion waiting to
// settle: no Goal work clears it, so it keeps the audited error path rather than
// the waiting channel the Goal receipt policy below can reach.
function evaluateCompletionRecordResolution(
  context: WorkflowAuthorizationGuardContext,
): LifecycleGuardVerdict<GoalReconciliationReceipt> {
  if (context.recordDir === null) {
    return guardDenied({
      reason: "Goal reconciliation refused completion: Intent record is unresolved",
    });
  }
  return guardAllowed();
}

// The Goal authority's verdict on this completion. Three-valued, and the third
// value is why the Runtime has an `unknown`: a receipt that has not settled is
// not a refusal, it is an answer the workflow can still earn, so it maps to
// `unknown` with the unaudited disposition and the commit path answers it with
// the engine's await-completion directive. Identity refusals — a receipt about
// another Intent, Goal or completion — never settle and stay denied.
function evaluateGoalReconciliationReceipt(
  context: WorkflowAuthorizationGuardContext,
): LifecycleGuardVerdict<GoalReconciliationReceipt> {
  const recordDir = context.recordDir;
  if (recordDir === null) {
    return guardUnknown({
      reason: "Goal reconciliation refused completion: Intent record is unresolved",
    });
  }
  try {
    return guardAllowed(authorizeWorkflowCompletion({
      projectDir: context.pd,
      recordDir,
      content: context.content,
      completedSlug: context.completedSlug,
      completionInstance: context.completionInstance,
    }));
  } catch (cause) {
    const refusal = `Goal reconciliation refused completion: ${errorMessage(cause)}`;
    if (cause instanceof WorkflowCompletionNotSettledError) {
      return guardUnknown({ reason: refusal, audit: "none" });
    }
    return guardDenied({ reason: refusal });
  }
}

// --- Utility ---

function error(msg: string): never {
  // Honor module-level projectDir (set from --project-dir in main) so test
  // fixtures and explicit overrides propagate to ERROR_LOGGED.
  const pd = resolveProjectDir(projectDir);
  const command = `amadeus-state ${process.argv.slice(2).join(" ")}`.trim();
  // Thread the active per-intent lock context (set by fork/merge before their
  // per-intent withAuditLock) so emitError's holdsAuditLock probe keys the SAME
  // bucket the caller holds — lock==write on the in-transaction error path.
  // Unset (undefined) for every sentinel-locked handler -> emitError keys the
  // sentinel, matching their lock.
  emitError(pd, "amadeus-state", command, msg, lockIntent, lockSpace);
}

// The terminal completion transaction did not settle. Fail-closed exactly like
// error() — non-zero exit, refusal on stderr, no completion surface touched —
// but typed as the engine's await-completion directive and WITHOUT the
// ERROR_LOGGED row: a completion the goal authority declines to settle is an
// expected waiting state the workflow recovers from, not a failed step (issue
// #2251). error() itself is untouched, so every genuine failure keeps its audit
// evidence (issue #839).
function awaitCompletion(msg: string): never {
  console.error(JSON.stringify({ kind: "await-completion", reason: msg } satisfies AwaitCompletionDirective));
  process.exit(1);
}
