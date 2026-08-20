// The orchestration engine — the deterministic "what's next?" answerer that
// stands BESIDE the prose orchestrator (skills/amadeus/SKILL.md), not inside it.
// Nothing in SKILL.md calls this file yet; it is exercised only by its own
// unit tests until the differential corpus proves it emits the same directive
// sequence the prose orchestrator produces today. Framework behaviour is
// unchanged by this file's existence.
//
// The engine reads workflow state (amadeus-docs/amadeus-state.md) and the compiled
// stage graph (data/stage-graph.json), then emits EXACTLY ONE typed Directive
// (JSON) to stdout. `next` mutates no workflow state itself (state md5 is
// unchanged across a `next` call) — including birth: on a fresh workspace it
// NAMES the deterministic `intent-birth` move via a print directive (the
// read-only-engine invariant), and the conductor runs that separate tool. The
// directive's `kind` tells the conductor the single move to make next; the
// conductor relays human choices
// and supplies resolved facts, but the engine never originates a deviation,
// never calls AskUserQuestion (that is a Bash tool the conductor owns), and
// never spawns agents. Clean boundaries: a refused or malformed directive is a
// clear signal, not a silent miss — every emitted directive is validated
// against the frozen amadeus-directive.ts contract before it is printed.
//
// Subcommand dispatch table:
//   next   — read-only. Resolve scope (state > flag > env > default), find the
//            workflow's position, and emit one directive. LIVE. "Read-only"
//            means it never moves the workflow: it births nothing, advances
//            nothing, pivots no pointer. It does RECORD what it observes — the
//            intent-lifecycle preflight rows, and the per-unit outcome a
//            Construction iteration settles (#3099) — appends of facts the read
//            just established, never edits of state.
//   report — commit a transition after the conductor acted on a directive.
//            LIVE. A stage-aware dispatcher: it shells out to amadeus-state.ts
//            transitions so the next `next` reads fresh state. Explicit
//            `--stage` pins the acted directive, and a missing gated
//            in-progress state is recovered by opening the gate before approve.
//
// COMPOSE, don't reimplement. Every read composes an existing deterministic
// tool/library function:
//   - amadeus-graph.ts loadGraph()        — the compiled stage graph (one read,
//                                          cached); the node carries every
//                                          routing field the run-stage
//                                          directive needs.
//   - amadeus-lib.ts   nextInScopeStage() — the next EXECUTE stage after a slug
//                                          for a scope (state-override aware).
//   - amadeus-lib.ts   firstInScopeStageOfPhase() — first EXECUTE stage of a
//                                          phase (for the --phase resolution).
//   - amadeus-lib.ts   validScopes()      — the canonical scope-name set, derived
//                                          from scope-mapping.json.
//   - amadeus-lib.ts   getField/parseCheckboxes — state-field + checkbox reads.
//   - amadeus-lib.ts   resolveProjectDir/readStateFile — project-dir + state I/O.
//
// The non-happy-path branches (jump, resume, init, scope/config-change,
// env-scope validation) COMPOSE the sibling CLI tools by SHELLING OUT — none of
// those handlers is an importable symbol (amadeus-jump.ts and amadeus-utility.ts
// both export zero CLI handlers; they are reachable only by argv dispatch). The
// engine spawns the subcommand with Bun.spawnSync, inspects its exitCode, and
// captures its stderr VERBATIM so the user-facing error wording (e.g. the
// canonical `Invalid AMADEUS_DEFAULT_SCOPE "...". Valid scopes: ...`) is
// relayed unchanged rather than reconstructed — reconstruction would drift from
// the tool the rest of the framework asserts on. The one read-only invariant
// `next` keeps: it never spawns a subcommand that MUTATES. The jump-direction
// (resolve) and env-scope (resolve-env-scope) subcommands are pure reads; the
// init guard is spawned ONLY on the already-state-exists path, where the tool
// dies at its guard before any scaffold write.
//
// The things the engine ADDS — not composes — are (1) the decision rule that
// maps (observed state + graph) -> directive kind, and (2) the artifact-path
// resolver that turns the graph node's vocabulary NAMES into canonical
// amadeus-docs/... paths and drops conditional_on consumes-entries against the
// workflow's project type. The primitives above expose the facts; no existing
// query answers "what directive applies here?" and no graph function maps a
// vocabulary name to a path. Both are pure deterministic code — the right home
// per the tool/agent/human split (routing string-building to an LLM would
// invert the whole thesis).

import { createHash, randomUUID } from "node:crypto";
import { emitAuditEventGuarded } from "../otel/audit-emit.ts";
import { observeSubprocessSpan } from "../otel/subprocess-span.ts";
import {
  closeSync,
  constants as fsConstants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type AskDirective,
  type AwaitAdvisoryChoiceDirective,
  type AwaitCompletionDirective,
  type DepthLevel,
  type Directive,
  type ErrorDirective,
  type ExecuteAdvisoryHandoffDirective,
  type ExecuteFailureElectionDirective,
  FAILURE_ELECTION_CHOICES,
  GATE_UNRESOLVED,
  type GateValue,
  type InvokeSwarmDirective,
  type ParkedDirective,
  type WaitingDirective,
  type PrintDirective,
  renderAdvisoryChoiceQuestion,
  type RunStageDirective,
  type SelectIntentDirective,
  VALID_DEPTH_VALUES,
  validateDirective,
} from "./amadeus-directive.ts";
import { hasDurableReviewProjection } from "./amadeus-reviewer.ts";
import {
  ADVISORY_CHOICE_OPTIONS,
  advisoryReportHoldReason,
  closeAdvisoryInstancesForStage,
  guardAdvisoryChoices,
  recordAdvisoryChoice,
  resolveAdvisoryChoiceAutonomously,
} from "./amadeus-advisory-choice.ts";
import {
  buildIntentSelectionSnapshot,
  type IntentSelectionSnapshot,
} from "./amadeus-intent-selection.ts";
import { appendLifecycleAuditEntryUnlocked } from "./amadeus-audit.ts";
import {
  activeSpace,
  activeIntent,
  advisoryLatchDir,
  auditBlockField,
  findAllEvents,
  guardMessage,
  PLAN_CORRECTION_EXIT,
  PLAN_DRIFT_WEIGHT,
  readAllAuditShards,
  readBoltDagGeneration,
  type SwarmEvidence,
  swarmEvidenceVerdict,
  type BoltDagAbsence,
  type CheckboxLine,
  type DeclaredBatch,
  codekbRepoName,
  decideDegradeUnitCompletion,
  parseDegradeUnitDeclaration,
  KNOWN_CODEKB_STAGES,
  classifyHelpIntent,
  classifyMigrationRequest,
  type MigrationRequest,
  ensureStageDiaryForDirective,
  errorMessage,
  firstInScopeStageOfPhase,
  getField,
  intentRepos,
  listIntents,
  loadScopeMapping,
  nextInScopeStage,
  normalizeUnitKind,
  parseCheckboxes,
  ownPhase,
  parseApprovedSwarmBatches,
  planGuardMessage,
  planIntegrityVerdict,
  type SwarmDecline,
  PHASES,
  READ_ONLY_FLAGS,
  relativeCodekbDir,
  relativeRecordDir,
  relativeSpaceRecordPrefix,
  readIntentRegistry,
  readCurrentSessionId,
  readStateFile,
  recordDirMatches,
  recoverBoltDag,
  resolveProjectDir,
  resolveProjectDirWithSource,
  type ProjectDirSource,
  runtimeGraphPath,
  type StageEntry,
  type UnitKind,
  stateFilePath,
  validScopes,
  harnessDir,
  unitDependencyPath,
  WORKSPACE_VERBS,
  SKELETON_ON_SCOPES,
  guardIntentOperation,
  renderIntentOperationRejection,
  resolveIntentOperationTargetLocked,
  resolveOperatingMode,
  type IntentInfo,
  type IntentLifecycleAuditEvent,
  withIntentLifecyclePreflight,
  withAuditLock,
  emitErrorAuditRow,
} from "./amadeus-lib.ts";
import {
  classifyApprovalAuthority,
  parseApprovalProcessResult,
} from "./amadeus-approval-authorization.ts";
import {
  autonomyDigest,
  declaredIntentAutonomyMode,
  describeProjectionDivergence,
  detectProjectionDivergence,
  projectConstructionAutonomy,
} from "./amadeus-intent-autonomy.ts";
// Aliased: this module's own `AutonomyMode` is the Construction SCHEDULING mode
// ("autonomous" | "gated"), a different axis from the Intent autonomy mode.
import type {
  AutonomyMode as IntentAutonomyMode,
  AutonomyProjection,
  SkeletonStance,
} from "./amadeus-intent-autonomy.ts";
import {
  admitProductionStageFailure,
  applyProductionAutonomyMode,
  formatIntentAutonomyUpdateFailure,
  observeLaunchTurnToken,
  previewProductionAutonomyGrant,
  productionStageAutonomy,
  readProductionAutonomyProjection,
  readProductionRepairStall,
  readProductionWaitingStop,
  type ProductionRepairStall,
  type ProductionWaitingStop,
  type ProductionStageFailureResult,
} from "./amadeus-intent-autonomy-production.ts";
import { detectHarnessType } from "./amadeus-harness.ts";
import { initProcessObservability } from "./amadeus-observability.ts";
import { projectSensorInvocation } from "./amadeus-sensor-invocation.ts";
import {
  armPresenceReservation,
  cancelArmedPresenceReservation,
  consumePresenceReservation,
  findActivePresenceReservation,
  type PresenceReservation,
  readPresenceReservation,
} from "./amadeus-presence-reservation.ts";
import {
  type Consume,
  type GraphStage,
  loadGraph,
  producersOf,
  readConstructionIteration,
  requiredArtifactsForUnit,
  selectNextUnitForStage,
  subgraphForScope,
} from "./amadeus-graph.ts";
import {
  PerUnitConsumeFanoutError,
  resolvePerUnitConsumeFanout,
  type PerUnitConsumeOutcome,
} from "./amadeus-per-unit-consume-fanout.ts";
import { foldUnitPoolEventSets } from "./amadeus-unit-pool.ts";
import { readUnitPoolEventSetsFromAudit } from "./amadeus-unit-pool-runtime.ts";
import {
  authorizeMainConductor,
  callerAuthorizationError,
} from "./amadeus-caller-authorization.ts";
import { deriveSoloElectionTrigger, resolveAmadeusConfig } from "./amadeus-config.ts";
import {
  degradeUnitDirectories,
  DELIVERY_BOLT_PLAN_SOURCE,
  projectEngineSingletonDeliveryBolt,
  projectDeliveryBoltPlan,
} from "./amadeus-delivery-bolts.ts";
import { createAuditUnitPoolRepository, createUnitPoolCoordinator } from "./amadeus-unit-pool-runtime.ts";
import {
  constructionFailureTransition,
  normalizeConstructionOutcomeAudit,
  projectConstructionOutcomes,
} from "./amadeus-construction-outcome-projection.ts";
import {
  mirrorIssueNumberFromDocument,
  succeededMirrorCreateExists,
} from "./amadeus-mirror-state-codec.ts";
import type { MirrorMode } from "./amadeus-mirror-types.ts";
import {
  MIRROR_BOUNDARY_PHASES,
  MIRROR_INITIAL_CREATE_FIELD,
  type MirrorBoundaryPhase,
  type MirrorBoundaryReceiptStatus,
  type MirrorBoundaryReceipts,
  parseMirrorBoundaryReceipts,
  parseMirrorInitialCreateReceipt,
} from "./amadeus-state.ts";
import {
  authorizePersistedCompletedWorkflow,
  authorizeWorkflowCompletion,
  type WorkflowCompletionPreparation,
  WorkflowCompletionNotSettledError,
  completionMirrorDisposition,
  workflowCompletionPreparation,
} from "./amadeus-workflow-completion.ts";
// inferScopeFromText is a PURE function (keyword matching over the scope
// registry) - importing it keeps `next` read-only. The audit-emitting
// detect-scope verb remains the conductor's separate recording move; the
// import is safe (amadeus-utility.ts main() runs only under import.meta.main,
// and utility never imports this module - no cycle).
import { inferScopeFromText } from "./amadeus-utility.ts";
// Generic plugin runtime seams: advisory presentation, composition lookup, and
// direct reach of a composed plugin stage.
import {
  type Advisory,
  isComposedPluginStage,
  unlatchedAdvisories,
} from "./amadeus-plugin-runtime.ts";
// The advisory supply declared by plugins composed into the current host.
import { advisoriesForHost } from "./amadeus-advisory-declaration.ts";

function trustedHostSessionId(projectDir: string | undefined): string | undefined {
  const pd = resolveProjectDir(projectDir);
  return detectHarnessType() === "kimi"
    ? readCurrentSessionId(pd) ?? undefined
    : process.env.AMADEUS_TRUSTED_SESSION_ID;
}

// Read the workflow state file if it exists, else null. The engine's `next` is
// a pure read: an absent state file is a legitimate branch (no workflow yet),
// not an error to throw. Composes stateFilePath() for the canonical location.
function loadStateFileIfPresent(
  projectDir: string,
  intent?: string,
  space?: string,
): string | null {
  const path = stateFilePath(projectDir, intent, space);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf-8");
}

export type MirrorBoundaryDecision =
  | { kind: "suppress" }
  | { kind: "ask"; includeCreate: boolean }
  | { kind: "auto-lifecycle" };

export function decideMirrorBoundary(
  mode: MirrorMode,
  hasMirrorIssue: boolean,
): MirrorBoundaryDecision {
  if (mode === "off") return { kind: "suppress" };
  if (mode === "auto") return { kind: "auto-lifecycle" };
  return { kind: "ask", includeCreate: !hasMirrorIssue };
}

const PREVIOUS_BOUNDARY_BY_PHASE: Readonly<Record<string, MirrorBoundaryPhase>> =
  {
    inception: "ideation",
    construction: "inception",
    operation: "construction",
  };

function currentMirrorBoundaryPhase(
  stateContent: string,
): MirrorBoundaryPhase | null {
  if (
    getField(stateContent, "Status")?.trim() === "Completed" &&
    getField(stateContent, "Construction")?.trim() === "Verified"
  ) {
    return "construction";
  }
  const lifecycle = (getField(stateContent, "Lifecycle Phase") ?? "")
    .trim()
    .toLowerCase();
  const phase = PREVIOUS_BOUNDARY_BY_PHASE[lifecycle];
  if (phase === undefined) return null;
  const scope = getField(stateContent, "Scope") ?? DEFAULT_SCOPE;
  const first = firstInScopeStageOfPhase(lifecycle, scope);
  const current = getField(stateContent, "Current Stage");
  if (first === null || current !== first.slug) return null;
  const label = phase[0].toUpperCase() + phase.slice(1);
  return getField(stateContent, label)?.trim() === "Verified" ? phase : null;
}

type MirrorLifecycleTarget =
  | Readonly<{
      kind: "completion";
      instance: string;
      stage: string;
    }>
  | Readonly<{
      kind: "phase";
      phase: MirrorBoundaryPhase;
      instance: string;
      isPending: boolean;
    }>
  | Readonly<{
      kind: "initial";
      instance: string;
      isPending: boolean;
    }>;

// The lifecycle CLI's boundary sub-verb for each target, and the state verb that
// carries its receipt. The initial create settles on its own receipt axis
// (mirror-initial-create), so the two never write the same field.
function boundaryArgsFor(target: MirrorLifecycleTarget): string {
  const instance = JSON.stringify(target.instance);
  if (target.kind === "completion") return `completion --instance ${instance}`;
  if (target.kind === "initial")
    return `intent-initialized --instance ${instance}`;
  return `phase --phase ${target.phase} --instance ${instance}`;
}

function receiptVerbFor(
  target: Exclude<MirrorLifecycleTarget, { kind: "completion" }>,
): string {
  return target.kind === "initial"
    ? "mirror-initial-create"
    : `mirror-boundary ${target.phase}`;
}

function mirrorLifecyclePrint(
  target: MirrorLifecycleTarget,
  intent: string,
  space: string,
): PrintDirective {
  const selector =
    ` --intent ${JSON.stringify(intent)} --space ${JSON.stringify(space)}`;
  const stateTool = `bun ${harnessDir()}/tools/amadeus-state.ts`;
  const boundaryArgs = boundaryArgsFor(target);
  const lifecycleTool =
    `bun ${harnessDir()}/tools/amadeus-mirror-lifecycle.ts boundary ${boundaryArgs}${selector}`;
  if (target.kind === "completion") {
    const terminalTool =
      `bun ${harnessDir()}/tools/amadeus-state.ts complete-workflow ` +
      `${JSON.stringify(target.stage)} --completion-instance ` +
      `${JSON.stringify(target.instance)}${selector}`;
    return printDirective(
      `Run \`${lifecycleTool}\`. Only after the completion boundary settles, run ` +
        `\`${terminalTool}\`, then re-run \`next\`. If the mirror operation or ` +
        `terminal commit fails, stop; the durable completion instance makes a later retry safe.`,
    );
  }
  const receiptVerb = receiptVerbFor(target);
  const prepare = target.isPending
    ? ""
    : `First run \`${stateTool} ${receiptVerb} pending --from absent${selector}\`. `;
  return printDirective(
    `${prepare}Run \`${lifecycleTool}\`. After it succeeds, run ` +
      `\`${stateTool} ${receiptVerb} completed --from pending${selector}\`. ` +
      `Only after both the mirror operation and receipt update succeed, re-run \`next\`. ` +
      `If either fails, stop without re-running \`next\`; the pending receipt makes a later retry safe.`,
  );
}

type PersistedMirrorBoundary = Readonly<{
  completion: WorkflowCompletionPreparation | null;
  pendingPhase: MirrorBoundaryPhase | undefined;
  phase: MirrorBoundaryPhase | null;
  phaseInstance: string;
  receipts: MirrorBoundaryReceipts;
  initialCreate: MirrorBoundaryReceiptStatus | undefined;
  hasMirrorIssue: boolean;
}>;

// Is the scope-independent first create still outstanding? Settled means either
// the receipt says so or an Issue is already recorded; a pending receipt stays
// live so an interrupted attempt is reissued for an idempotent retry.
function initialCreateIsOutstanding(
  boundary: PersistedMirrorBoundary,
): boolean {
  if (boundary.initialCreate === "completed") return false;
  return boundary.initialCreate === "pending" || !boundary.hasMirrorIssue;
}

function persistedMirrorBoundary(
  stateContent: string,
): PersistedMirrorBoundary {
  const receipts = parseMirrorBoundaryReceipts(
    getField(stateContent, "Mirror Boundary Receipts"),
  );
  const prepared = workflowCompletionPreparation(stateContent);
  const completion = prepared?.status === "completed" ? null : prepared;
  const pendingPhase = MIRROR_BOUNDARY_PHASES.find(
    (candidate) => receipts[candidate] === "pending",
  );
  const phase = currentMirrorBoundaryPhase(stateContent);
  const phaseInstance =
    (getField(stateContent, "Last Updated") ?? "").trim() ||
    `${phase ?? pendingPhase ?? "mirror"}:persisted`;
  const initialCreate = parseMirrorInitialCreateReceipt(
    getField(stateContent, MIRROR_INITIAL_CREATE_FIELD),
  );
  return {
    completion,
    pendingPhase,
    phase,
    phaseInstance,
    receipts,
    initialCreate,
    hasMirrorIssue: mirrorIssueNumberFromDocument(stateContent) !== null,
  };
}

function hasPersistedMirrorBoundary(
  boundary: PersistedMirrorBoundary,
): boolean {
  if (boundary.pendingPhase !== undefined || boundary.completion !== null) {
    return true;
  }
  if (
    boundary.phase !== null &&
    boundary.receipts[boundary.phase] !== "completed"
  ) {
    return true;
  }
  return initialCreateIsOutstanding(boundary);
}

// A fixed instance: the boundary occurs once per Intent and the event key
// already carries the Intent UUID, so a constant keeps every retry on the same
// receipt instead of minting a new identity per attempt.
const INITIAL_CREATE_INSTANCE = "intent-initialized";

function emitConfiguredMirrorBoundary(
  boundary: PersistedMirrorBoundary,
  mode: "off" | "prompt" | "auto",
  intent: string,
  space: string,
): boolean {
  const { completion, pendingPhase, phase, phaseInstance } = boundary;
  if (mode === "off") {
    if (completion === null) return false;
    emit(
      printDirective(
        `Intent Mirror is off. Run \`bun ${harnessDir()}/tools/amadeus-state.ts ` +
          `complete-workflow ${JSON.stringify(completion.stage)} --completion-instance ` +
          `${JSON.stringify(completion.instance)} --intent ${JSON.stringify(intent)} ` +
          `--space ${JSON.stringify(space)}\`, then re-run \`next\`.`,
      ),
    );
    return true;
  }
  if (pendingPhase !== undefined) {
    emit(
      mirrorLifecyclePrint(
        {
          kind: "phase",
          phase: pendingPhase,
          instance: phaseInstance,
          isPending: true,
        },
        intent,
        space,
      ),
    );
    return true;
  }
  if (completion !== null) {
    emit(
      mirrorLifecyclePrint(
        {
          kind: "completion",
          instance: completion.instance,
          stage: completion.stage,
        },
        intent,
        space,
      ),
    );
    return true;
  }
  // Evaluated only where the phase branch used to return false — an absent
  // phase or one whose receipt is already completed — so the established
  // boundaries keep both their precedence and their exact behaviour.
  //
  // The FIRST firing is an `auto`-only move: `prompt` keeps asking exactly
  // where it already did. A `pending` receipt is not a first firing but the
  // recovery of an operation that already started, so it is reissued in
  // `prompt` too — the same treatment the pendingPhase branch above gives a
  // pending phase receipt. `off` reaches neither: it returned at the top.
  if (phase === null || boundary.receipts[phase] === "completed") {
    if (!initialCreateIsOutstanding(boundary)) return false;
    if (mode !== "auto" && boundary.initialCreate !== "pending") return false;
    emit(
      mirrorLifecyclePrint(
        {
          kind: "initial",
          instance: INITIAL_CREATE_INSTANCE,
          isPending: boundary.initialCreate === "pending",
        },
        intent,
        space,
      ),
    );
    return true;
  }
  const decision = decideMirrorBoundary(mode, boundary.hasMirrorIssue);
  if (decision.kind === "suppress") return false;
  if (decision.kind === "auto-lifecycle") {
    emit(
      mirrorLifecyclePrint(
        {
          kind: "phase",
          phase,
          instance: phaseInstance,
          isPending: false,
        },
        intent,
        space,
      ),
    );
    return true;
  }
  const choices = decision.includeCreate
    ? "Choose create, sync, or skip. Run the selected fixed mirror command first; create is available because no Mirror Issue is recorded."
    : "Choose sync or skip. Run sync first if selected.";
  emit(
    askDirective(
      `The ${phase} phase boundary is verified. Synchronize the GitHub mirror? ${choices} ` +
        `After the selected operation succeeds (or for skip), report with ` +
        `\`amadeus-orchestrate.ts report --mirror-boundary ${phase} --result completed --user-input <create|sync|skip>\`.`,
    ),
  );
  return true;
}

function emitMirrorBoundaryIfNeeded(
  projectDir: string,
  stateContent: string,
  intentOverride?: string,
): boolean {
  let boundary: PersistedMirrorBoundary;
  try {
    boundary = persistedMirrorBoundary(stateContent);
  } catch (cause) {
    emit(errorDirective(errorMessage(cause)));
    return true;
  }
  if (!hasPersistedMirrorBoundary(boundary)) return false;
  const space = activeSpace(projectDir);
  const intent = activeIntent(projectDir, space, intentOverride);
  if (intent === null) {
    emit(errorDirective("Mirror boundary cannot resolve the active intent."));
    return true;
  }
  if (boundary.completion !== null) {
    const recordDir = completionRecordDir(projectDir, intent, space);
    try {
      authorizeWorkflowCompletion({
        projectDir,
        recordDir,
        content: stateContent,
        completedSlug: boundary.completion.stage,
        completionInstance: boundary.completion.instance,
      });
    } catch (cause) {
      emit(completionRefusalDirective(cause, `Goal reconciliation refused completion mirror: ${errorMessage(cause)}`));
      return true;
    }
  }
  const resolved = resolveAmadeusConfig(projectDir, intent, space);
  if (resolved.kind === "invalid") {
    const details = resolved.issues
      .map((issue) =>
        issue.kind === "read-failure"
          ? `${issue.layer} (${issue.path}): ${issue.summary}`
          : `${issue.layer} (${issue.path}): expected ${issue.expected}, got ${issue.actualType}`,
      )
      .join(" | ");
    emit(errorDirective(`Invalid mirror configuration: ${details}`));
    return true;
  }
  return emitConfiguredMirrorBoundary(
    boundary,
    resolved.config.intentMirror.github.issue.consent,
    intent,
    space,
  );
}

function completionRecordDir(
  projectDir: string,
  intentOverride?: string,
  spaceOverride?: string,
): string {
  return join(
    projectDir,
    relativeRecordDir(projectDir, intentOverride, spaceOverride) ?? "amadeus-docs",
  );
}

function completedRecoveryError(cause: unknown): string {
  const detail = errorMessage(cause);
  if (detail.includes("Goal lineage is missing")) {
    return `${detail}. Run amadeus-goal.ts legacy-propose, then ` +
      "amadeus-goal.ts approve-legacy-migration before retrying completion.";
  }
  return detail;
}

function emitDeferredCompletionBoundary(
  projectDir: string,
  stage: string,
  intentOverride?: string,
): void {
  const preparedState = loadStateFileIfPresent(projectDir, intentOverride);
  if (
    preparedState === null ||
    !emitMirrorBoundaryIfNeeded(projectDir, preparedState, intentOverride)
  ) {
    emit(errorDirective(
      `Workflow completion for "${stage}" was prepared but no mirror boundary directive was available.`,
    ));
  }
}

function appendOrchestrateLifecycleEvent(
  event: IntentLifecycleAuditEvent,
  shard: string,
  pd: string,
  intentDir: string,
  space: string,
): void {
  appendLifecycleAuditEntryUnlocked(event.eventType, {
    Intent: event.intentDir,
    "From Status": event.fromStatus,
    "To Status": event.toStatus,
    "Operation Id": event.operationId,
    "User Input": event.userInput,
    "Human Turn Timestamp": event.humanTurnTimestamp,
  }, pd, intentDir, space, shard);
}

export function archivedNextGuard(projectDir: string): ErrorDirective | undefined {
  const space = activeSpace(projectDir);
  return withIntentLifecyclePreflight(
    projectDir,
    space,
    appendOrchestrateLifecycleEvent,
    (context) => {
      const active = listIntents(projectDir, space).find((intent) => intent.active);
      if (!active?.dirName) return undefined;
      if (active.uuid.trim().length === 0) {
        return orphanedCurrentIntentError(space, active.dirName);
      }
      const result = guardIntentOperation(
        resolveIntentOperationTargetLocked(context, active),
        "next",
      );
      return result.kind === "rejected"
        ? errorDirective(renderIntentOperationRejection(result.error))
        : undefined;
    },
  );
}

function orphanedCurrentIntentError(
  space: string,
  dirName: string,
): ErrorDirective {
  return errorDirective(
    `The current intent record "${dirName}" in space "${space}" has no registry identity. Repair the intent registry before continuing.`,
  );
}

function unselectableIntentError(
  space: string,
  intents: readonly IntentInfo[],
): ErrorDirective {
  const entries: string[] = [];
  for (const intent of intents) {
    entries.push(`${intent.dirName ?? intent.slug} (${intent.status})`);
  }
  return errorDirective(
    `Intent entries exist in space "${space}", but none are selectable because they are orphaned, registry-only, or archived: ${entries.join(", ")}. Repair the intent registry or unarchive an intent before continuing.`,
  );
}

function emitArchivedNextError(projectDir: string): boolean {
  const archived = archivedNextGuard(projectDir);
  if (!archived) return false;
  emit(archived, false);
  return true;
}

// The default scope when neither the state file, a --scope flag, nor the
// AMADEUS_DEFAULT_SCOPE env var supplies one. Mirrors the prose
// orchestrator's freeform-fallback default (SKILL.md detect-scope fallback).
const DEFAULT_SCOPE = "feature";

// READ_ONLY_FLAGS (--status/--help/--doctor/--version) and WORKSPACE_VERBS
// (space/space-create/intent) — the terminal-command sets — are the single
// source of truth in amadeus-lib.ts (imported above), so the engine's `next`
// routing and any pre-LLM harness seam (the Kiro userPromptSubmit dispatch)
// classify the same tokens identically. See classifyTerminalCommand there.
// Both dispatch before any state inspection (SKILL.md "Read-Only Utility
// Commands" + workspace-vision §3): each maps to a TERMINAL print directive —
// the engine answers "what move?", the conductor runs the tool and prints its
// stdout. The verbs never advance a workflow, so there is nothing for `next` to
// continue into; they are recognised ONLY as the LEADING positional token
// (parseNextFlags guards on i === 0) so freeform prose containing
// "space"/"intent" mid-sentence stays freeform intent text.

// --- Directive emission ---

// Print exactly one directive as JSON to stdout, after validating it against
// the frozen contract. A malformed directive is a hard error (clean
// boundaries), never a silent miss — we exit non-zero so a wiring bug surfaces
// loudly rather than emitting a lie the conductor would act on.
function emit(directive: Directive, recordError = true): void {
  // A birth-bound declaration must have been consumed by birthPrintDirective
  // before anything goes out. Still holding one means this invocation routed
  // somewhere other than birth after the ladder decided it would not — so the
  // mode would vanish. Refuse loudly rather than emit a directive that quietly
  // drops what the user declared (#2378 BR-U2-1).
  const strandedCarry = strandedCarryRefusal(takePendingAutonomyCarry()?.mode ?? null);
  // One line on purpose: the condition is evaluated on every emission, so the
  // process-terminating arm stays measurable instead of reading as a never-hit
  // line the patch gate cannot distinguish from dead code.
  if (strandedCarry !== null) { console.error(strandedCarry); process.exit(1); }
  const guardedDirective = applyPendingAdvisoryGuard(directive);
  const result = validateDirective(guardedDirective);
  if (!result.valid) {
    console.error(
      `amadeus-orchestrate: refusing to emit a malformed directive: ${result.errors.join("; ")}`,
    );
    process.exit(1);
  }
  // Issue #839: an error directive is EVIDENCE of a failed workflow step, so
  // mirror the sibling CLIs' emitError ERROR_LOGGED contract — the engine was
  // the only tool whose error exits left no audit trail (emit⇔terminal
  // asymmetry). Recording is best-effort and happens BEFORE the stdout print so
  // the directive JSON stays the sole stdout output and the exit code is
  // untouched. Every workflow `emit(errorDirective(...))` call site is covered
  // by this aggregation point. State-neutral validation commands and workspace
  // migration opt out because neither may annotate an unrelated active record.
  if (directive.kind === "error" && recordError) {
    recordEngineError(directive.message, _handlerProjectDir);
  }
  if (result.data.kind === "run-stage") {
    try {
      projectSensorInvocation(
        resolveProjectDir(_handlerProjectDir),
        result.data,
      );
    } catch (error) {
      console.error(
        `amadeus-orchestrate: refusing to emit run-stage without sensor invocation projection: ${errorMessage(error)}`,
      );
      process.exit(1);
    }
  }
  console.log(JSON.stringify(result.data));
}

// Move any advisories raised for this emission onto the directive about to be
// printed (U5 / FR-B2). Only a stage-carrying directive can hold them: an
// error/print/done directive has no advisories field, and dropping the raise
// there is correct — the stderr line was already written, and the run latch has
// already recorded it. An EMPTY raise attaches nothing, so a silent judgment
// leaves the directive byte-identical to the pre-U5 engine (invariant I2).
function applyPendingAdvisoryGuard(directive: Directive): Directive {
  const pending = takePendingAdvisories();
  if (pending.length === 0) return directive;
  if (directive.kind !== "run-stage" && directive.kind !== "dispatch-subagent") return directive;
  const advisoryProjectDir = resolveProjectDir(_handlerProjectDir);
  const guard = guardAdvisoryChoices(
    advisoryProjectDir,
    directive.stage,
    pending,
    pluginHostRoot(),
  );
  if (guard.kind === "allow") return directive;
  // #2967 FR-ADV-1/2/7. A hold that already carries its `run-now` answer is
  // SETTLED as a question, whichever route answered it, so it never reaches the
  // ladder and never reaches the human. It becomes work instead: the named
  // handoff stages, for the conductor to open before re-running `next`. Placing
  // this ahead of the ladder is the fix — re-offering it there produced the same
  // decision, single-spend refused the duplicate receipt, and the refusal fell
  // through to a question the human had already answered.
  if (guard.kind === "handoff") {
    const handoffDirective: ExecuteAdvisoryHandoffDirective = {
      kind: "execute-advisory-handoff",
      stage: guard.stage,
      handoff_stages: [
        ...new Set(
          guard.advisories.flatMap((advisory) =>
            advisory.handoff_stage === undefined ? [] : [advisory.handoff_stage]
          ),
        ),
      ],
      advisories: guard.advisories,
    };
    return handoffDirective;
  }
  // #2253 FR-ADV-1/2. A hold is offered to the autonomy ladder before it is
  // turned into a question for the human. There are exactly TWO ways out: the
  // ladder decided `run-now` and the receipt was accepted, in which case the
  // ORIGINAL directive is returned untouched and the run continues unattended;
  // or anything else at all — no grant, an expired one, a scope that does not
  // cover this interaction, a park, a conflict, a deferral, a refused receipt —
  // in which case the human is asked, exactly as before. Two branches is the
  // whole fail-closed argument: there is no third place to land.
  const graphRevision = autonomyDigest(loadGraph());
  const auto = resolveAdvisoryChoiceAutonomously({
    projectDir: advisoryProjectDir,
    hold: guard,
    phase: directive.phase,
    graphRevision,
  });
  if (auto.kind === "resolved") {
    // `recorded` and `already-settled` both mean this advisory now carries a
    // live receipt for the ladder's choice (#2967 FR-ADV-4); only `refused`
    // leaves it unanswered and falls to the human.
    const outcome = recordAdvisoryChoice(advisoryProjectDir, auto.choice, {
      kind: "auto-decision",
      decisionId: auto.decision.decisionId,
      basisKind: auto.decision.basisKind,
      basisFingerprint: auto.decision.basisFingerprint,
      projectionRevision: auto.projectionRevision,
      phase: directive.phase,
      graphRevision,
    });
    if (outcome.kind !== "refused") return directive;
  }
  const choiceDirective: AwaitAdvisoryChoiceDirective = {
    kind: "await-advisory-choice",
    stage: guard.stage,
    question: renderAdvisoryChoiceQuestion(guard.advisories),
    options: ADVISORY_CHOICE_OPTIONS.map((option) => option.label) as AwaitAdvisoryChoiceDirective["options"],
    advisories: guard.advisories,
  };
  return choiceDirective;
}

function emitStateNeutralError(message: string): void {
  // Gate command validation must leave state and audit byte-unchanged; the
  // ordinary error path records ERROR_LOGGED before printing.
  emit(errorDirective(message), false);
}


// Re-entry guard mirroring amadeus-lib's emitError: if appending the audit row
// itself fails and somehow routes back through here, we must not recurse.
let _engineErrorInProgress = false;

// The project dir the current top-level handler is operating on (Issue #1389).
// emit()'s best-effort ERROR_LOGGED must record against THIS project — the one
// the handler received — not the ambient CLAUDE_PROJECT_DIR. recordEngineError
// used to re-derive the project from process.argv, but an in-process driver (a
// test or a seam that calls handleNext/handleReport directly) has no
// `--project-dir` in argv, so the emit fell through to the ambient real
// workspace and polluted its audit shard. Threading the handler's projectDir to
// the single emit() aggregation point restores the sibling emitError's
// projectDir-first contract (amadeus-lib.ts:5879). Set at each in-process entry
// point (main / handleNext / handleReport) and read by emit(); the argv fallback
// in recordEngineError remains for the runEngineMain top-level catch, which can
// fire BEFORE main() sets this. A module-scoped current-dir (not a parameter on
// every emit call site) mirrors _engineErrorInProgress's re-entry guard and
// keeps the CLI's synchronous one-shot invocation unambiguous.
let _handlerProjectDir: string | undefined;

// Best-effort ERROR_LOGGED append for the engine (Issue #839). Mirrors
// amadeus-lib's emitError contract WITHOUT the exit — this helper is void and
// returns to its caller, because the error-directive path prints a directive
// and keeps a non-error exit code while the top-level catch does its own
// exit(1). No-op when no workflow state exists in the resolved project dir
// (pre-init errors have no record to write to), and ANY recording failure is
// swallowed: we are already on an error path and must neither hide nor amplify
// the engine's own failure. Exported for in-process seam testing.
//
// projectDir is the project the caller is operating on, threaded from the
// error-emitting handler via emit() (Issue #1389). When it is absent — the
// runEngineMain top-level catch can fire BEFORE/OUTSIDE main's flag parse — we
// fall back to re-extracting --project-dir from argv the way main() does.
export function recordEngineError(message: string, projectDir?: string): void {
  if (_engineErrorInProgress) return;
  _engineErrorInProgress = true;
  try {
    const rawArgs = process.argv.slice(2);
    let pd: string;
    if (projectDir !== undefined) {
      pd = resolveProjectDir(projectDir);
    } else {
      let projectDirFlag: string | undefined;
      for (let i = 0; i < rawArgs.length; i++) {
        if (rawArgs[i] === "--project-dir" && i + 1 < rawArgs.length) {
          projectDirFlag = rawArgs[i + 1];
        }
      }
      pd = resolveProjectDir(projectDirFlag);
    }
    if (!existsSync(stateFilePath(pd))) return;
    // The same ERROR_LOGGED row lib's emitError writes, through the same
    // seam — one definition of "how this project records a tool failure",
    // including the lazy require that breaks the load-time cycle.
    emitErrorAuditRow(pd, "amadeus-orchestrate", rawArgs.join(" "), message);
  } catch {
    // Swallowed by contract — recording failure must not mask the original error.
  } finally {
    _engineErrorInProgress = false;
  }
}

// --- Composing the sibling CLI tools (shell-out) ---
//
// The non-happy-path branches reuse amadeus-jump.ts / amadeus-utility.ts handlers,
// none of which is importable (both files export zero CLI handlers). We resolve
// the tools directory off THIS module's own location so the spawned `bun <tool>`
// runs the same shipped copy regardless of the caller's cwd.
const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));

function toolPath(file: string): string {
  return join(TOOLS_DIR, file);
}

// The result of spawning a sibling tool: its exit code plus captured streams.
// stderr carries the tool's canonical error envelope on a non-zero exit (the
// shared die()/emitError() helper prints `{"error":"<verbatim message>"}` to
// stderr and exits 1), which we relay UNCHANGED into an error directive.
interface ToolRun {
  ok: boolean;
  stdout: string;
  stderr: string;
}

function runTool(projectDir: string | undefined, toolFile: string, args: string[]): ToolRun {
  const proc = observeSubprocessSpan(
    resolveProjectDir(projectDir),
    `${toolFile.replace(/\.ts$/, "")}:${args[0] ?? "?"}`,
    () =>
      Bun.spawnSync({
        cmd: ["bun", toolPath(toolFile), ...args],
        stdout: "pipe",
        stderr: "pipe",
      }),
  );
  return {
    ok: proc.exitCode === 0,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
}

// Extract the human-facing message from a tool's failure. The shared error
// helper prints `{"error":"<message>"}` to stderr; we unwrap that envelope so
// the directive carries the message itself (e.g. the verbatim
// `Invalid AMADEUS_DEFAULT_SCOPE "...". Valid scopes: ...`) rather than the
// JSON wrapper. If stderr is not the expected envelope (an unexpected crash),
// fall back to the raw stderr so nothing is swallowed.
function toolErrorMessage(run: ToolRun): string {
  const raw = run.stderr.trim();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "error" in parsed &&
      typeof (parsed as { error: unknown }).error === "string"
    ) {
      return (parsed as { error: string }).error;
    }
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return raw.length > 0 ? raw : run.stdout.trim();
}

// --- Terminal-directive constructors (the non-run-stage kinds) ---

function askDirective(question: string): AskDirective {
  return { kind: "ask", question };
}

function selectIntentDirective(
  question: string,
  snapshot: IntentSelectionSnapshot,
): SelectIntentDirective {
  return {
    kind: "select-intent",
    selection_token: snapshot.fingerprint,
    question,
    options: snapshot.choices.map((choice) => choice.label),
  };
}

function printDirective(message: string): PrintDirective {
  return { kind: "print", message };
}

function errorDirective(message: string): ErrorDirective {
  return { kind: "error", message };
}

// await-completion - the terminal completion transaction has not settled yet
// (issue #2251). The engine itself instructs this state ("run complete-workflow,
// then re-run `next`"), so it is a legitimate wait, not a failed step: emitting
// it instead of an error directive keeps the expected window out of
// ERROR_LOGGED / amadeus.operation.failed without touching the error path's own
// recording contract (#839).
function awaitCompletionDirective(reason: string): AwaitCompletionDirective {
  return { kind: "await-completion", reason };
}

// Which shape a refused completion takes. A completion the authority declines
// to settle is a wait; every other cause — malformed state, a lineage that
// contradicts the projection — is a genuine failure that keeps the error
// directive and its ERROR_LOGGED evidence (#839). Exported as a pure seam
// because both call sites sit inside spawn-only orchestration.
export function completionRefusalDirective(
  cause: unknown,
  message: string,
): AwaitCompletionDirective | ErrorDirective {
  return cause instanceof WorkflowCompletionNotSettledError
    ? awaitCompletionDirective(message)
    : errorDirective(message);
}

// Workspace migration is outside the Intent lifecycle. Its public-routing
// errors are still ordinary `error` directives, but must not append ERROR_LOGGED
// to whichever unrelated Intent happens to be active in the destination.
function emitMigrationError(message: string): void {
  emit(errorDirective(message), false);
}

// parked - the terminal directive a parked workflow emits (issue #367). Carries
// the slug it parked at; the Stop hook treats `parked` as a terminal allow so
// the conductor can end its turn at a clean inter-stage boundary.
function parkedDirective(reason: string, stage: string): ParkedDirective {
  return { kind: "parked", reason, stage };
}

// waiting - the terminal a non-interactive run emits when it reached a ruling
// it may not make (RFC-0001 FR-3). NOT `parked`: park says a human chose to
// stop, and a conductor that has to tell the two apart by reading `reason` is
// one wording change away from getting it wrong. The identifiers point at the
// Intent autonomy transaction that holds the full ruling, so `--resume`
// re-presents the SAME candidates rather than a paraphrase of them.
export function waitingDirectiveFor(stop: ProductionWaitingStop): WaitingDirective {
  const options = stop.cause.outcome.kind === "contested"
    ? `${stop.cause.outcome.candidates.length} candidate options are on the table`
    : "no option could be derived at all";
  return {
    kind: "waiting",
    reason: `Workflow waiting at ${JSON.stringify(stop.occurrenceId)}: this run is not interactive (${stop.cause.interactivityBasis.source}) and the ruling due here is not one it may make - ${options}. The derivation was: ${stop.cause.derivationTranscript}. Re-enter with \`/amadeus --resume\` to be shown the same ruling and settle it.`,
    stage: stop.stage,
    occurrence_id: stop.occurrenceId,
    basis_fingerprint: stop.cause.basisFingerprint,
    transaction_id: stop.transactionId,
  };
}

// --- Flag parsing ---

interface ParsedFlags {
  scope?: string;
  stage?: string;
  phase?: string;
  depth?: string;
  testStrategy?: string;
  readOnly?: string; // the matched read-only flag, if any
  resume?: boolean; // --resume: re-enter an existing workflow (resume choice)
  single?: boolean; // --single: run ONE stage under a synthetic workflow id, never touching the main pointer
  newIntent?: boolean; // --new-intent: the conductor confirmed new-work alongside an active intent → emit the SAME birth directive (with the --label seam) the fresh-start path uses, instead of constructing intent-birth from SKILL.md prose
  intent?: string; // freeform request text (no leading --flag)
  workspaceVerb?: { verb: string; arg?: string }; // leading workspace verb (space/space-create/intent) + optional <name> arg
  compose?: boolean; // leading `compose` verb: force the composer (front or in-flight)
  newScope?: boolean; // --new-scope: force the composer to SYNTHESIZE a custom scope even when a stock scope matches
  report?: string; // --report <path>: compose from a scan report (the composer triages the file)
  // --autonomy <none|semi|full>: declare the Intent's autonomy mode at launch
  // (#2253). The parser only CARRIES the string — the range check and every
  // acceptance rule live in applyLaunchAutonomyDeclaration, mirroring how
  // --scope is validated in Branch 3b rather than in this ladder.
  autonomy?: string;
  // Set when `--autonomy` had no following token to consume. FR-CLI-2(3) wants a
  // value-less flag to be LOUD, and the ladder would otherwise drop it in
  // silence (it matches neither the valued branch nor the freeform branch).
  autonomyMissingValue?: boolean;
  projectDir?: string;
}

function normalizeHelpArgs(args: string[]): string[] {
  return classifyHelpIntent(args).kind === "help" ? ["--help"] : args;
}

// Extract the flags the `next` decision rule consumes. --project-dir is pulled
// out by the caller before this runs; here we read scope/stage/phase/depth/
// test-strategy, the boolean mode flags (--resume/--single), and detect a
// read-only utility flag. Any leading non-flag token is the freeform intent
// (mirrors `/amadeus <freeform description>`). Mirrors the prose orchestrator's
// flag extraction — the value of a valued flag is the following argv token.
// Lift every `--autonomy [value]` out of argv, recording the value (or its
// absence) on flags and returning the remaining tokens.
//
// This runs BEFORE the flag ladder rather than as two more rungs inside it: the
// ladder sits exactly on its complexity budget, and the budget only ratchets
// down. Extracting the flag keeps the ladder's measured complexity unchanged
// while giving --autonomy the same guarantee --report gets by consuming its
// value inline — the mode name can never reach the freeform-intent branch.
//
// The scan mirrors the ladder's index arithmetic token for token, so the
// semantics it would have had as rungs are preserved: a following token is
// taken as the value even when it looks like a flag, a trailing --autonomy with
// nothing to consume raises autonomyMissingValue, and a repeated flag lets the
// LAST occurrence win.
function takeAutonomyFlag(args: string[], flags: ParsedFlags): string[] {
  if (!args.includes("--autonomy")) return args;
  const remaining: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== "--autonomy") {
      remaining.push(args[i]);
      continue;
    }
    if (i + 1 < args.length) {
      // No range check here: the parser only carries the string, exactly as
      // --scope is carried and validated outside this function.
      flags.autonomy = args[i + 1];
      i++;
    } else {
      // Nothing left to consume. Mark it so C13 can fail loudly rather than let
      // the flag vanish (FR-CLI-2(3)).
      flags.autonomyMissingValue = true;
    }
  }
  return remaining;
}

export function parseNextFlags(args: string[]): ParsedFlags {
  const flags: ParsedFlags = {};
  args = normalizeHelpArgs(args);
  args = takeAutonomyFlag(args, flags);
  const intentWords: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (READ_ONLY_FLAGS.has(a)) {
      flags.readOnly = a;
      continue;
    }
    // A LEADING workspace verb (space/space-create/intent) is the explicit
    // workspace navigation move (workspace-vision §3). Only the FIRST positional
    // token counts (i === 0) so freeform prose containing "space"/"intent"
    // mid-sentence stays intent text. The optional <name> arg is args[1] when it
    // is present and not itself a --flag; consume it so it is not pushed as
    // freeform. The engine maps this to a terminal print naming the handler.
    if (i === 0 && WORKSPACE_VERBS.has(a)) {
      const next = args[i + 1];
      const arg = next !== undefined && !next.startsWith("--") ? next : undefined;
      flags.workspaceVerb = arg !== undefined ? { verb: a, arg } : { verb: a };
      if (arg !== undefined) i++;
      continue;
    }
    // A LEADING `compose` verb forces the composer (front on a fresh workspace,
    // in-flight recompose over an active one). DELIBERATELY its own check, NOT a
    // WORKSPACE_VERBS entry: that set feeds classifyTerminalCommand, which the
    // Kiro verb-intercept hook runs OFF-BAND as a terminal amadeus-utility
    // subcommand (and arms the roll-forward latch) - compose is workflow work
    // the conductor must dispatch, never a terminal utility. Only the FIRST
    // positional token counts, so freeform prose containing "compose"
    // mid-sentence stays intent text. Any text after the verb is the compose
    // request (falls through to intentWords).
    if (i === 0 && a === "compose") {
      flags.compose = true;
      continue;
    }
    if (a === "--resume") {
      flags.resume = true;
    } else if (a === "--single") {
      flags.single = true;
    } else if (a === "--new-intent") {
      flags.newIntent = true;
    } else if (a === "--scope" && i + 1 < args.length) {
      flags.scope = args[i + 1];
      i++;
    } else if (a === "--stage" && i + 1 < args.length) {
      flags.stage = args[i + 1];
      i++;
    } else if (a === "--phase" && i + 1 < args.length) {
      flags.phase = args[i + 1];
      i++;
    } else if (a === "--depth" && i + 1 < args.length) {
      flags.depth = args[i + 1];
      i++;
    } else if (a === "--test-strategy" && i + 1 < args.length) {
      flags.testStrategy = args[i + 1];
      i++;
    } else if (a === "--new-scope") {
      flags.newScope = true;
    } else if (a === "--report" && i + 1 < args.length) {
      // CONSUME the value: an unrecognized valued flag would leak its value
      // into the freeform intent text (the path would read as intent words).
      flags.report = args[i + 1];
      i++;
    } else if (!a.startsWith("--")) {
      intentWords.push(a);
    }
  }
  if (intentWords.length > 0) flags.intent = intentWords.join(" ");
  return flags;
}

// --- C13: the `--autonomy` launch declaration (#2253) ---
//
// `--autonomy` is a NEW ENTRANCE to the Intent autonomy authorization boundary,
// so everything below exists to keep that boundary exactly as strong as it was
// before the entrance existed. The engine decides and DELEGATES; the single
// existing write path (applyProductionAutonomyMode) stays the only way a mode
// reaches audit + projection + state, so no second write path can drift from
// the provenance rules the first one enforces.

// The decision basis, read from the autonomy projection ONCE so every judgment
// shares one snapshot.
//
//   declared   — the mode arrived through a HUMAN COMMAND. Deliberately NOT
//                "the state file has an Intent Autonomy Mode field": birth
//                always writes that field, so field-presence would read every
//                brand-new intent as already-declared and make the flag's main
//                use case (declare at launch) structurally impossible. The
//                authorization code already discriminates on this provenance.
//   grant      — an ACTIVE full-autonomy grant exists.
//   unreadable — the projection could not be read at all.
export type LaunchAutonomyContext =
  | {
      readonly kind: "readable";
      readonly mode: IntentAutonomyMode;
      readonly declared: boolean;
      readonly grant: "present" | "absent";
    }
  | { readonly kind: "unreadable" };

export type LaunchAutonomyOutcome =
  | { readonly kind: "continue" }
  // The declaration belongs to an intent this invocation is about to CREATE, so
  // it rides on the birth command rather than being applied here (#2378 FR-1a).
  | { readonly kind: "carry"; readonly mode: IntentAutonomyMode }
  | { readonly kind: "error"; readonly message: string };

// Where the CURRENT `next` invocation is headed, as far as a declaration cares.
// "birth" = it will name the intent-birth move; "ask" = it will surface the
// scope-confirm question, which carries nothing; "none" = anything else.
export type LaunchAutonomyReach = "birth" | "ask" | "none";

// The I/O the declaration handler depends on, injected so the judgment ladder
// can be exercised over every context without a real workspace on disk.
export interface LaunchAutonomyPorts {
  readonly readContext: (projectDir: string) => LaunchAutonomyContext;
  readonly applyMode: (input: {
    readonly projectDir: string;
    readonly stateContent: string;
    readonly mode: IntentAutonomyMode;
  }) => { readonly ok: true } | { readonly ok: false; readonly error: string };
  // The content a human needs in order to issue a full-autonomy grant. Null
  // when it cannot be produced — the refusal stands either way.
  readonly describeGrantPreview: (projectDir: string, stateContent: string) => string | null;
}

const LAUNCH_AUTONOMY_MODES: readonly IntentAutonomyMode[] = ["none", "semi", "full"];

// Read-only: readProductionAutonomyProjection emits no audit event.
//
// A read failure becomes "unreadable" rather than the neighbouring
// `catch → false` idiom. That idiom means "withhold the carve-out" — it leans
// SAFE there. Here the same shape would lean PERMISSIVE (an unknown grant state
// would let `--autonomy none` through to the write path, where an active grant
// would be revoked as a side effect), so the failure is surfaced and refused.
export function readLaunchAutonomyContext(projectDir: string): LaunchAutonomyContext {
  let projection: AutonomyProjection | null;
  try {
    projection = readProductionAutonomyProjection(projectDir);
  } catch {
    return { kind: "unreadable" };
  }
  if (projection === null) return { kind: "unreadable" };
  return {
    kind: "readable",
    mode: projection.mode,
    declared: projection.modeProvenance.kind === "human-command",
    grant: projection.currentGrant?.state === "active" ? "present" : "absent",
  };
}

const PRODUCTION_LAUNCH_AUTONOMY_PORTS: LaunchAutonomyPorts = {
  readContext: readLaunchAutonomyContext,
  applyMode: (input) => applyProductionAutonomyMode(input),
  describeGrantPreview: (projectDir, stateContent) => {
    const preview = previewProductionAutonomyGrant({ projectDir, stateContent });
    return preview.ok ? JSON.stringify(preview.preview) : null;
  },
};

// Judgment 0's refusal, split by where the invocation is headed. A freeform
// description with no scope is bound for the scope-confirm ask, which has no
// command line to carry a declaration; naming both ways forward keeps the mode
// from disappearing behind the question (BR-U2-1). Every other shape gets the
// original "declare after birth" wording.
function noDeclarationTargetRefusal(
  reach: LaunchAutonomyReach,
  mode: IntentAutonomyMode,
): LaunchAutonomyOutcome {
  if (reach === "ask") {
    return {
      kind: "error",
      message: `--autonomy cannot ride along with the scope-confirm question. Name the scope on the same command (\`/amadeus --scope <scope> --autonomy ${mode} "<description>"\`), or start the workflow first and declare the mode afterwards with \`/amadeus --autonomy ${mode}\`.`,
    };
  }
  return {
    kind: "error",
    message: "--autonomy needs an active intent. Start the workflow first, then declare the mode with `/amadeus --autonomy <none|semi|full>` or `amadeus-bolt set-autonomy --mode <none|semi|full>`.",
  };
}

// Decide what `--autonomy <mode>` means for the active intent, and delegate the
// write when it means one. Returns "continue" when the caller should fall
// through to the ordinary routing (either nothing needed doing, or the mode was
// applied), and "error" with the message to emit otherwise.
export function applyLaunchAutonomyDeclaration(
  projectDir: string,
  stateContent: string | null,
  flags: ParsedFlags,
  reach: LaunchAutonomyReach,
  ports: LaunchAutonomyPorts = PRODUCTION_LAUNCH_AUTONOMY_PORTS,
): LaunchAutonomyOutcome {
  // 1 — the flag was passed with nothing to consume. Malformed input is reported
  // by the flag the user got wrong, whatever this invocation is doing otherwise,
  // so both malformed judgments precede every state- and reach-dependent one.
  if (flags.autonomyMissingValue) {
    return { kind: "error", message: "--autonomy requires a value: none, semi, or full." };
  }
  const requested = flags.autonomy;
  if (requested === undefined) return { kind: "continue" };
  // 2 — outside the mode vocabulary. Exact match only; no case folding, so a
  // near-miss is reported rather than guessed at.
  if (!LAUNCH_AUTONOMY_MODES.includes(requested as IntentAutonomyMode)) {
    return {
      kind: "error",
      message: `Invalid --autonomy "${requested}". Valid values: none, semi, full.`,
    };
  }
  const mode = requested as IntentAutonomyMode;
  // 2b — this invocation is about to BIRTH an intent (#2378 FR-1a, BR-U2-1). The
  // declaration is for THAT intent, so it is carried onto the birth command and
  // nothing here is read or written. This precedes judgment 0 because `--new-intent`
  // arrives WITH a live state file — the intent already in flight — and applying
  // the mode to it would declare against the wrong intent entirely. `full` is
  // carried as well: intent-birth owns the ceremony (BR-U2-3), so judgment 7
  // below is left to intents that already exist.
  if (reach === "birth") return { kind: "carry", mode };
  // 0 — nothing to declare against, and nothing in this call will create it.
  if (stateContent === null) return noDeclarationTargetRefusal(reach, mode);
  // Judgments 0-2 rejected everything malformed and every call that has no
  // target yet, so the projection read happens only for input that could
  // legitimately be applied to the intent in flight.
  const ctx = ports.readContext(projectDir);
  // 3 — fail closed: with neither the declaration state nor the grant state
  // known, no write is safe.
  if (ctx.kind === "unreadable") {
    return {
      kind: "error",
      message:
        "Cannot read the Intent autonomy projection. --autonomy is refused while the autonomy state is unknown.",
    };
  }
  // 4/5 — a mode that a human already declared is never rewritten by a launch
  // flag. Re-stating the same mode is a no-op, deliberately WITHOUT calling the
  // write path, so repeating the flag does not accumulate audit events.
  if (ctx.declared) {
    if (ctx.mode === mode) return { kind: "continue" };
    return {
      kind: "error",
      message:
        `Intent autonomy is already ${ctx.mode}. Use \`amadeus-bolt set-autonomy --mode ${mode}\` to change it.`,
    };
  }
  // 6 — revoking a grant is a deliberate act, never the side effect of a launch
  // flag. Reaching the write path here would take the revoke-full command.
  if (mode === "none" && ctx.grant === "present") {
    return {
      kind: "error",
      message: "Intent has an active grant. Use `amadeus-bolt set-autonomy --mode none` to revoke it explicitly.",
    };
  }
  // 7 — full autonomy still requires an issued grant. Show what issuing one
  // takes, then stop.
  if (mode === "full" && ctx.grant !== "present") {
    const preview = ports.describeGrantPreview(projectDir, stateContent);
    if (preview !== null) console.error(`amadeus-orchestrate: grant preview: ${preview}`);
    return {
      kind: "error",
      message: "--autonomy full requires an issued grant. Run `amadeus-bolt preview-autonomy`, then `amadeus-bolt set-autonomy --mode full --confirmed-display-digest <digest>` to issue it.",
    };
  }
  // 8 — delegate. The flag is not provenance: the write path's own HUMAN_TURN
  // requirement decides, and its PROVENANCE_REQUIRED is relayed through the
  // user-facing formatter (#3170 turn-boundary hint).
  const applied = ports.applyMode({ projectDir, stateContent, mode });
  if (!applied.ok) return { kind: "error", message: formatIntentAutonomyUpdateFailure(applied.error) };
  return { kind: "continue" };
}

// Where this invocation is headed, mirroring the guards of the branches that
// name the intent-birth move (4a `--new-intent`, 7b bare known-scope positional,
// 9a explicit `--scope`) and of the one that surfaces the scope-confirm ask
// (Branch 8). The order below is handleNext's own branch order, so a call that
// two branches could claim resolves to the one that actually fires.
//
// A prediction is only ever an optimisation here: getting it wrong cannot drop a
// declaration silently, because the carry latch is verified at emit time and a
// carry that never reached a birth print is a hard error.
export function launchAutonomyReach(
  stateContent: string | null,
  flags: ParsedFlags,
  source: string,
): LaunchAutonomyReach {
  if (flags.compose || flags.newScope || flags.report) return "none";
  if (flags.newIntent) return "birth";
  if (stateContent !== null) return "none";
  if (flags.stage || flags.phase) return "none";
  if (flags.resume) return "none";
  if (flags.intent && !flags.scope) {
    return validScopes().has(flags.intent) ? "birth" : "ask";
  }
  if (source === "flag") return "birth";
  return "none";
}

// The mode a birth-bound declaration is waiting to ride out on. Set when the
// ladder returns `carry`, consumed by birthPrintDirective, and checked at every
// emission: a latch still set when a directive goes out means the declaration
// found no birth to attach to, which is the one outcome BR-U2-1 forbids.
// The mode, plus the identity of the human turn observed AT LAUNCH while the
// intent that received the keystroke is still active. The token travels with the
// mode because the intent about to be born has no presence of its own to point
// at, and a bare "find something recent" would let an unrelated intent's stale
// turn stand in (#2378 ruling condition 2). A null token means this launch had
// no turn to cite, which birth then refuses loudly (condition 3).
type PendingAutonomyCarry = {
  readonly mode: IntentAutonomyMode;
  readonly turnToken: string | null;
};

let _pendingAutonomyCarry: PendingAutonomyCarry | null = null;

function takePendingAutonomyCarry(): PendingAutonomyCarry | null {
  const pending = _pendingAutonomyCarry;
  _pendingAutonomyCarry = null;
  return pending;
}

// Why a still-latched carry is refused at emission time, or null when nothing
// was latched. Split out from emit so the wording is exercisable in-process:
// emit's own arm ends the process, which no in-process driver can survive.
export function strandedCarryRefusal(mode: IntentAutonomyMode | null): string | null {
  if (mode === null) return null;
  return `amadeus-orchestrate: refusing to drop the --autonomy ${mode} declaration: this invocation did not reach intent birth.`;
}

// A birth branch can still divert to the intent picker (a workspace that holds
// intents with no cursor resolving one). That prompt has no command line to
// carry a declaration onto, so the declaration is refused with guidance instead
// of disappearing behind the prompt — the same treatment BR-U2-1 gives the
// scope-confirm ask. Null when nothing was latched, in which case the picker
// goes out unchanged.
function autonomyCarryDivertError(): ErrorDirective | null {
  const carry = takePendingAutonomyCarry();
  if (carry === null) return null;
  return errorDirective(
    `--autonomy ${carry.mode} was not applied: this workspace has intents but none is active, so \`next\` needs one selected before there is anything to declare against. Choose an intent, then declare the mode with \`/amadeus --autonomy ${carry.mode}\`.`,
  );
}

// The workflow-birth print for a resolved scope on a fresh workspace (no intent
// record yet). A user who described what to build — `/amadeus "build the auth
// service"`, the bare positional `next fix`, or `next --scope fix` — asked
// to START a workflow; there is nothing to run until an intent is born, and
// birth is a mutation, so `next` (read-only) NAMES the move as a
// run-then-continue print and the conductor runs it, then re-runs `next` to land
// on the first stage. The named move is the deterministic `intent-birth` handler
// (mint UUIDv7, create the intent dir, append intents.json, set active-intent,
// emit WORKFLOW_STARTED/PHASE_STARTED into the new intent's audit) — the
// read-only-engine invariant is preserved: the routing tool names, a separate
// deterministic tool mutates, the human's "start a new intent?" judgement gated
// the get-here. Threads the freeform feature description (--arguments) so the
// born intent's slug + state Project field carry it, plus --depth /
// --test-strategy. Shared by Branch 7b (valid-scope positional) and
// Branch 9 (explicit --scope flag) so the explicit-naming shapes emit identical
// directives. The harness dir is resolved through harnessDir() so the directive
// names the right tree on every harness (.claude/.kiro/.codex).
function birthPrintDirective(scope: string, flags: ParsedFlags, description?: string): PrintDirective {
  const cmd = [`intent-birth --scope ${scope}`];
  let labelHint = "";
  if (description && description.length > 0) {
    // Shell-quote the freeform description so multi-word intents survive intact.
    cmd.push(`--arguments ${JSON.stringify(description)}`);
    // The conductor (LLM) condenses the description into the short dir-name label
    // — the engine can't summarize. Name the missing --label in the directive so
    // the conductor adds it; the dir name becomes `<YYMMDD>-<label>`. (A bare run
    // without --label still births a sane name by truncating --arguments.)
    cmd.push(`--label "<2-3 word kebab essence>"`);
    labelHint =
      ` Replace \`--label\` with a 2-3 word kebab essence of the description (e.g. "simple calc") — it becomes the readable record dir name.`;
  }
  if (flags.depth) cmd.push(`--depth ${flags.depth}`);
  if (flags.testStrategy) cmd.push(`--test-strategy ${flags.testStrategy}`);
  // The birth-bound declaration rides out here — the only place it can, since
  // this is the command that creates the intent it declares against (#2378
  // FR-1a). intent-birth applies `none`/`semi` through the canonical write path
  // and stops on `full` with the grant ceremony (BR-U2-3).
  const carry = takePendingAutonomyCarry();
  if (carry !== null) {
    cmd.push(`--autonomy ${carry.mode}`);
    // The turn observed at launch. Omitted when there was none, so birth refuses
    // for the honest reason instead of hunting for a substitute.
    if (carry.turnToken !== null) cmd.push(`--autonomy-turn ${carry.turnToken}`);
  }
  return printDirective(
    `Run \`bun ${harnessDir()}/tools/amadeus-utility.ts ${cmd.join(" ")}\` to start the workflow, then re-run \`next\` to continue.${labelHint}`,
  );
}

// The composer-dispatch print for a compose request (the adaptive-workflows
// composer). The engine stays read-only: it NAMES the dispatch move (the
// conductor Tasks the composer agent, renders the proposal, and holds the
// approve/edit/reject gate); it never dispatches or writes itself. Two modes:
//   - front (no state file): compose a scope from the prompt (or a scan
//     report) BEFORE birth. The composer proposes; on approval the conductor
//     continues into the normal intent-birth with the chosen scope.
//   - in-flight (state file present): re-shape the RUNNING workflow's pending
//     stages (SKIP / un-SKIP), which lands as suffix flips via the recompose
//     verb - never a silent advance of the current stage.
// The message threads the compose inputs (task text, --new-scope, --report)
// so the conductor forwards them to the composer verbatim.
function composeDispatchDirective(
  flags: ParsedFlags,
  inFlight: boolean,
): PrintDirective {
  const hd = harnessDir();
  const parts: string[] = [];
  if (inFlight) {
    parts.push(
      `Dispatch the composer agent (${hd}/agents/amadeus-composer-agent.md) as a subagent to propose re-shaping the RUNNING workflow's pending stages` +
        (flags.intent ? ` for: "${flags.intent}".` : "."),
      "The composer reads the live state file's Stage Progress and proposes SKIP/un-SKIP flips for PENDING, ahead-of-cursor stages only (completed [x], in-progress [-], and skipped [S] stages are frozen).",
      "BEFORE presenting the gate, write the pending-proposal marker `amadeus/.amadeus-compose-pending` (any content) so the turn can end at the gate; on approve run `bun " +
        hd +
        "/tools/amadeus-utility.ts recompose --skip <slugs> --add <slugs>` (comma-separated) and DELETE the marker; on reject/edit-then-resolve delete the marker too.",
    );
  } else {
    parts.push(
      `Dispatch the composer agent (${hd}/agents/amadeus-composer-agent.md) as a subagent to propose the workflow plan for: "${flags.intent ?? ""}".`,
    );
    if (flags.report) {
      parts.push(
        `First have it read and triage the scan report at "${flags.report}" (auto-fixable vs human-decision findings), then compose a compact fix-and-ship grid - this often routes to the stock fix or security-patch scope rather than minting a new one.`,
      );
    }
    if (flags.newScope) {
      parts.push(
        "--new-scope was passed: the composer must SYNTHESIZE a custom scope even if a stock scope matches.",
      );
    }
  }
  parts.push(
    `The composer runs \`bun ${hd}/tools/amadeus-utility.ts detect --json\` (read-only scan + scope-registry paths) and reads the scope definitions under ${hd}/scopes/, then returns a structured proposal (mode matched|custom, scopeName, the per-stage EXECUTE/SKIP grid, and a per-SKIP rationale).`,
    "Render the proposal to the human and present the approve/edit/reject gate (see the composer block in SKILL.md). Do NOT write any file and do NOT advance any stage before an explicit approval.",
  );
  return printDirective(parts.join(" "));
}

// Guard the birth gate against a DUPLICATE intent on a fresh clone of a
// multi-intent workspace. A no-state birth arm (Branch 7b / 9a) fires purely on
// `!stateContent`, but stateContent is empty in TWO different worlds: a truly
// empty workspace (zero intents → birth is correct), AND a workspace that
// already holds intents whose active-intent CURSOR is unset. The cursor
// (`amadeus/spaces/<sp>/intents/active-intent`) is gitignored per-user state, so a
// fresh clone of a >1-intent workspace lands with records on disk but no cursor
// → activeIntent() returns null (lib:357-361) → stateContent is empty → the
// birth gate would mint a SECOND intent over the top of the existing ones
// (violates the P4 hazard "auto-birth fires only on ZERO intents").
//
// This consults the deterministic query layer (listIntents over the active
// space) and, when selectable intents EXIST but none is flagged active, NAMES
// the disambiguation move as a `select-intent` directive instead of birthing.
// Orphaned, registry-only, and archived entries are not selectable; if they are
// the only entries, an explicit repair error prevents a duplicate birth.
// Returns null when birth should proceed unchanged (zero intents in the space,
// or one already resolved active — the latter only when this is reached with an
// explicit scope/intent that didn't load a cursor'd state). The engine stays
// read-only: it emits a directive, it does not touch the cursor.
export function intentPickPromptIfRecordsExist(
  projectDir: string,
): SelectIntentDirective | ErrorDirective | null {
  const space = activeSpace(projectDir);
  const intents = listIntents(projectDir, space);
  if (intents.length === 0) return null; // zero intents → birth is correct
  if (intents.some((i) => i.active)) return null; // a cursor already resolves → not a birth path
  const snapshot = buildIntentSelectionSnapshot(space, intents);
  if (snapshot === null) {
    return unselectableIntentError(space, intents);
  }
  return selectIntentDirective(
    "Choose an existing intent to continue.",
    snapshot,
  );
}

// --- The decision rule (the engine's one ADDED responsibility) ---
//
// Maps (state + graph + resolved scope) -> directive kind. Read-only and
// terminal branches resolve first; the happy path resolves a run-stage off the
// graph node. The branches that need a human turn (resume / scope-confirm) emit
// `ask`; init / scope-change / config-change name the conductor's move via
// `print` (the mutation stays conductor-side, `next` is read-only); jumps relay
// the tool-computed direction. Under an autonomy grant the happy path emits
// `invoke-swarm` for an eligible Construction batch (the conductor fans the
// per-unit build stage out across worktrees — see tryEmitSwarm). The remaining kinds —
// `present-gate` and `dispatch-subagent` — arrive in later waves; this handler
// emits run-stage / invoke-swarm / print / error / ask / done and cleanly omits
// those two.

// Resolve the scope by the precedence ladder: state file Scope field wins (an
// active workflow is authoritative), then an explicit --scope flag, then the
// AMADEUS_DEFAULT_SCOPE env var, then the default. Returns the resolved scope
// plus whether it was found in the valid set (an unknown scope is the caller's
// to turn into an error directive).
function resolveScope(
  stateContent: string | null,
  flags: ParsedFlags,
): { scope: string; source: "state" | "flag" | "env" | "default" } {
  const stateScope = stateContent ? getField(stateContent, "Scope") : null;
  if (stateScope && stateScope.length > 0) {
    return { scope: stateScope, source: "state" };
  }
  if (flags.scope && flags.scope.length > 0) {
    return { scope: flags.scope, source: "flag" };
  }
  const envScope = process.env.AMADEUS_DEFAULT_SCOPE;
  if (envScope && envScope.length > 0) {
    return { scope: envScope, source: "env" };
  }
  return { scope: DEFAULT_SCOPE, source: "default" };
}

// Derive the memory diary path for a stage (SKILL.md: every stage keeps a
// <record>/<phase>/<stage>/memory.md diary). `recordPrefix` is the RELATIVE
// per-intent record dir (amadeus/spaces/<space>/intents/<slug>-<id8>) the engine
// threads in from the active intent (relativeRecordDir), or null → the bare space
// record prefix (relativeSpaceRecordPrefix — a pre-birth shell with no intent
// yet). These are agent-consumed RELATIVE paths the conductor resolves against
// the workspace root — the engine never opens them — so re-rooting is a pure
// prefix swap, not a route through the absolute projectDir-keyed state helpers.
// Per-unit Construction stages embed a {unit-name} segment that a later engine
// change resolves; until then the bare phase/slug form is the faithful derivation.
function memoryPathFor(phase: string, slug: string, recordPrefix: string | null): string {
  const prefix = recordPrefix ?? relativeSpaceRecordPrefix();
  return `${prefix}/${phase}/${slug}/memory.md`;
}

// Derive the stage file path from phase + slug (the shipped layout:
// .claude/amadeus-common/stages/<phase>/<slug>.md — relocated to the shared
// amadeus-common/ spine, a peer of skills/). Matches the engine design's example
// directive's stage_file field.
function stageFileFor(phase: string, slug: string): string {
  const pluginStage = trustedPluginStageFile(slug);
  if (pluginStage !== null) return pluginStage;
  return `${harnessDir()}/amadeus-common/stages/${phase}/${slug}.md`;
}

type TrustedPluginRuntimeStage = {
  path?: string;
  slug?: string;
  contentDigest?: string;
  frontmatter?: unknown;
};
type TrustedPluginRuntimeRecord = {
  stageIndex?: TrustedPluginRuntimeStage[];
  stageIndexDigest?: string;
  trustGrant?: { plugin?: string; contentDigest?: string; grantTimestamp?: string } | null;
};
type TrustedPluginRuntimeComposition = { plugins?: [string, TrustedPluginRuntimeRecord][] };

function trustedPluginStageFile(slug: string): string | null {
  const configuredHostRoot = process.env.AMADEUS_PLUGINS_HOST_ROOT;
  const hostRoot = realpathSync(configuredHostRoot ?? dirname(TOOLS_DIR));
  const recordPath = join(hostRoot, ".amadeus-plugin-composition.json");
  if (!existsSync(recordPath)) return null;
  const composition = JSON.parse(readFileSync(recordPath, "utf-8")) as TrustedPluginRuntimeComposition;
  for (const [plugin, record] of composition.plugins ?? []) {
    const entry = record.stageIndex?.find((candidate) => candidate.slug === slug);
    if (entry === undefined) continue;
    const index = record.stageIndex ?? [];
    const indexDigest = `sha256:${createHash("sha256").update(JSON.stringify(index)).digest("hex")}`;
    const grant = record.trustGrant;
    const path = entry.path ?? "";
    if (
      grant?.plugin !== plugin
      || record.stageIndexDigest !== indexDigest
      || !path.startsWith(`plugins/${plugin}/stages/`)
      || path.split("/").some((segment) => segment === ".." || segment === "." || segment === "")
      || !/^sha256:[0-9a-f]{64}$/.test(entry.contentDigest ?? "")
    ) {
      throw new Error(`Plugin stage ${slug} trust index is invalid`);
    }
    const abs = join(hostRoot, path);
    const contained = relative(hostRoot, abs);
    if (contained.startsWith("..") || contained === ".." || contained.startsWith(sep)) {
      throw new Error(`Plugin stage ${slug} escapes its trusted host`);
    }
    let ancestor = hostRoot;
    for (const segment of path.split("/").slice(0, -1)) {
      ancestor = join(ancestor, segment);
      if (lstatSync(ancestor).isSymbolicLink()) {
        throw new Error(`Plugin stage ${slug} has a symlinked ancestor`);
      }
    }
    const before = lstatSync(abs);
    if (before.isSymbolicLink()) throw new Error(`Plugin stage ${slug} is a symlink`);
    const noFollow = fsConstants.O_NOFOLLOW as number | undefined;
    if (typeof noFollow !== "number") throw new Error(`Plugin stage ${slug} cannot be verified without O_NOFOLLOW`);
    const fd = openSync(abs, fsConstants.O_RDONLY | noFollow);
    try {
      const opened = fstatSync(fd);
      if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
        throw new Error(`Plugin stage ${slug} changed before trusted execution`);
      }
      if (opened.size > 64 * 1024 * 1024) {
        throw new Error(`Plugin stage ${slug} exceeds the 64 MiB trust boundary`);
      }
      const bytes = Buffer.allocUnsafe(opened.size);
      let offset = 0;
      while (offset < opened.size) {
        const count = readSync(fd, bytes, offset, opened.size - offset, offset);
        if (count === 0) break;
        offset += count;
      }
      if (offset !== opened.size) throw new Error(`Plugin stage ${slug} could not be read completely`);
      const digest = `sha256:${createHash("sha256").update(bytes.subarray(0, offset)).digest("hex")}`;
      if (digest !== entry.contentDigest) throw new Error(`Plugin stage ${slug} content digest drifted`);
    } finally {
      closeSync(fd);
    }
    return configuredHostRoot === undefined ? `${harnessDir()}/${path}` : abs;
  }
  return null;
}

export function _trustedPluginStageFileForTests(slug: string): string | null {
  return trustedPluginStageFile(slug);
}

// ---------------------------------------------------------------------------
// Plugin runtime touch points. The plugin host root is the same one
// trustedPluginStageFile resolves
// (env override, else the harness dir), so the composition record + spec files +
// state file are all read from one consistent root. Resolution is total: a
// missing/misconfigured root degrades to the raw path so an advisory failure can
// never break `next`.
// ---------------------------------------------------------------------------
export function pluginHostRoot(): string {
  const configured = process.env.AMADEUS_PLUGINS_HOST_ROOT ?? dirname(TOOLS_DIR);
  try {
    return realpathSync(configured);
  } catch {
    return configured;
  }
}


// Raise every composed plugin advisory declared for the stage the engine is
// about to emit. Both the main workflow and direct stage-runner call this seam.
// `latchDir` de-duplicates by (plugin, code) for one run; null disables the
// latch for pure decision tests. The return value feeds the machine-readable
// directive while `err` preserves the human-readable channel.
export function emitPluginAdvisories(
  slug: string,
  hostRoot: string,
  err: (line: string) => void,
  latchDir?: string | null,
): Advisory[] {
  const raised = latchDir
    ? unlatchedAdvisories(latchDir, advisoriesForHost(hostRoot, slug))
    : advisoriesForHost(hostRoot, slug);
  for (const advisory of raised) err(advisory.message);
  return raised;
}


// The advisories raised for the directive currently being composed. A
// module-scoped slot rather than a parameter on every emit call site: the two
// advisory call sites each fan out into several emit() sites (per-unit
// iteration, gate re-entry, the error paths), and emit() is the ONE stdout
// point, so attaching there is what guarantees the field rides the directive
// that is actually printed. Mirrors _handlerProjectDir's precedent. Consumed
// (and cleared) by emit() so a raise can never leak onto a later directive.
let _pendingAdvisories: Advisory[] = [];

function setPendingAdvisories(advisories: Advisory[]): void {
  _pendingAdvisories = advisories;
}

function takePendingAdvisories(): Advisory[] {
  const pending = _pendingAdvisories;
  _pendingAdvisories = [];
  return pending;
}

// The activation advisory work for one about-to-be-emitted slug: raise (with the
// run latch), write the human line to stderr, and stage the structured result
// for emit(). Shared by BOTH emit paths so the two can never drift.
function raisePluginAdvisoriesFor(slug: string, projectDir: string): void {
  const hostRoot = pluginHostRoot();
  const advisories = advisoriesForHost(hostRoot, slug);
  emitPluginAdvisories(
    slug,
    hostRoot,
    (line) => process.stderr.write(`${line}\n`),
    advisoryLatchDirForRun(projectDir),
  );
  // The presentation latch suppresses duplicate stderr only. The safety guard
  // must inspect the complete current judgment on every emission.
  setPendingAdvisories(advisories);
}

// The run's latch directory: `<record>/.amadeus-advisory-latch/<session>`. The
// per-session leaf is what makes the latch RUN-scoped rather than permanent —
// the placement's lifecycle IS the run boundary (business-logic-model L4). The
// whole tree is machine-local and gitignored (`.amadeus-*` under the record), so
// the latch never reaches a commit (invariant I4).
//
// Total by construction, so it carries no guard of its own: readCurrentSessionId
// already absorbs its own read failures (returning null, which the "no-session"
// leaf covers) and advisoryLatchDir is a path join over docsRoot, called
// unguarded by every sibling path helper. The fail-open guarantee of BR-U5-3
// lives where the actual I/O is — unlatchedAdvisories, whose read and write are
// each individually fail-open.
function advisoryLatchDirForRun(projectDir: string): string {
  const session = readCurrentSessionId(projectDir) ?? "no-session";
  return join(advisoryLatchDir(projectDir), session.replace(/[^A-Za-z0-9._-]+/g, "-"));
}

// FR-7(a) — a compose-installed plugin stage is reachable via `--stage <slug>`
// WITHOUT `--single`. When the requested stage is a composed plugin stage, emit
// the isolated single run-stage and return true; otherwise return false so the
// caller falls through to the normal jump path. Limited to compose-installed
// plugin stages (BR-U6-5) — a stock stage is untouched.
export function emitComposedPluginStageIfInstalled(
  flags: ParsedFlags,
  scope: string,
  projectType: "brownfield" | "greenfield" | null,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx | undefined,
  hostRoot: string,
  // The live workflow's state, read by the caller. Only its **Depth** is used
  // here (threaded on as a value) — this path stays free of routing state reads.
  stateContent: string | null = null,
): boolean {
  if (!flags.stage || flags.phase) return false;
  if (!isComposedPluginStage(hostRoot, flags.stage)) return false;
  emitSingleRunStage(flags.stage, scope, projectType, recordPrefix, codekbCtx, resolveDepth(stateContent, scope));
  return true;
}

// --- The conductor persona (decision D-E, SPIKE 6) ---
//
// The conductor's execution-quality prose lives ONCE at
// `.claude/amadeus-common/conductor.md` (a root-level peer of skills/). Skills do
// NOT reference it by path; instead the engine reads it and bakes its contents
// into the FIRST run-stage directive of a workflow, so the conductor receives
// its persona in-context with zero per-skill diligence (per the engine design). The file
// is resolved relative to THIS module (tools/ → ../amadeus-common/) so the shipped
// copy is read regardless of the caller's cwd, mirroring how stage files resolve.
const CONDUCTOR_PERSONA_PATH = join(TOOLS_DIR, "..", "amadeus-common", "conductor.md");

// Read the conductor persona, or null if it is absent (a fork that deleted it,
// or a partial install). The delivery is best-effort: a missing persona is not a
// routing error — the run-stage directive is still well-formed without the
// optional field — so we never fail the workflow over it.
function readConductorPersona(): string | null {
  if (!existsSync(CONDUCTOR_PERSONA_PATH)) return null;
  try {
    return readFileSync(CONDUCTOR_PERSONA_PATH, "utf-8");
  } catch {
    return null;
  }
}

// "First run-stage of the workflow" — the deterministic signal D-E delivery
// keys on. The engine is stateless per call, so it cannot track a "session";
// the faithful, reproducible proxy is the WORKFLOW's opening move: no non-init
// stage has been completed yet. We read the completed-checkbox count from state
// — zero completed EXECUTE stages outside initialization means the conductor is
// at the very start of real work and has not yet been handed the persona. (Init
// stages are bootstrap and auto-proceed; a workflow that has only finished init
// is still at its first substantive run-stage.) Resume re-enters via the `ask`
// branch, not a run-stage, so this does not double-deliver on resume of an
// in-flight workflow; a resume that lands back on the very first stage correctly
// re-delivers, which is harmless (the persona is idempotent in-context).
//
// HONEST LIMITATION: because the engine has no session memory, "first" means
// "first of the workflow's substantive stages", not "first call this session".
// In a long single session the persona is delivered once (at workflow open) and
// the conductor carries it; a fresh session resuming mid-workflow relies on the
// persona persisting in the prior context OR on the Stop-hook/loop re-priming —
// it is NOT re-baked mid-workflow. This is the SPIKE-6 contract (deliver on the
// opening directive); documented here so the boundary is visible, not faked.
function isFirstRunStageOfWorkflow(
  stateContent: string | null,
  node: GraphStage,
): boolean {
  if (!stateContent) return false; // no workflow yet → no run-stage emitted anyway
  // An initialization stage is bootstrap; the persona belongs to substantive
  // work, so we never attach it to an init run-stage (those auto-proceed).
  if (node.phase === "initialization") return false;
  const checkboxes = parseCheckboxes(stateContent);
  // Count completed/skipped NON-initialization stages. Zero → this is the first
  // substantive stage the conductor will run, so deliver the persona now.
  const initSlugs = new Set(
    loadGraph().filter((s) => s.phase === "initialization").map((s) => s.slug),
  );
  const advancedSubstantive = checkboxes.some(
    (c) =>
      !initSlugs.has(c.slug) &&
      (c.state === "completed" || c.state === "skipped"),
  );
  return !advancedSubstantive;
}

// --- The walking-skeleton classify round-trip (per the engine design) ---
//
// The first Construction Bolt's gate depends on the walking-skeleton STANCE,
// which an LLM resolves by reading a team's free-form `## Walking Skeleton`
// practices prose. The engine cannot classify free English, so it DEFERS: it
// emits `gate: "unresolved"` for that one stage, the conductor classifies and
// reports the stance (recorded in the state field below), and the next `next`
// resolves the gate from the recorded stance. Every OTHER run-stage keeps its
// boolean gate.

// The state field the conductor's classified stance is recorded in (written by
// `report --skeleton-stance`, read by the next `next`). One of the three stance
// values, or absent before the round-trip completes.
const SKELETON_STANCE_FIELD = "Skeleton Stance";
const VALID_SKELETON_STANCES: ReadonlySet<string> = new Set([
  "on",
  "off",
  "scope-dependent",
]);

// The scope-mapping fallback the "scope-dependent" stance resolves through
// (SKILL.md:686-692, verbatim): skeleton-on for greenfield-shaped scopes,
// skeleton-off for incremental-work scopes. `infra` is greenfield-shaped, so it
// is skeleton-on — and it DOES reach the skeleton gate: its first in-scope
// construction stage is `nfr-requirements` (code-generation is SKIP for infra,
// but nfr-requirements EXECUTEs and is what isSkeletonGateStage matches), so an
// `infra` Construction workflow emits gate:"unresolved" at nfr-requirements and
// resolves through this set like any other greenfield scope.
// Canonical set lives in amadeus-lib.ts; re-exported semantics are identical
// to the inline set this replaced.
// (imported below as SKELETON_ON_SCOPES)

// Read the recorded skeleton stance from state, or null if the round-trip has
// not completed yet (the field is absent or empty). Composes getField.
function readSkeletonStance(stateContent: string | null): SkeletonStance | null {
  const raw = stateContent ? getField(stateContent, SKELETON_STANCE_FIELD) : null;
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  return VALID_SKELETON_STANCES.has(lower) ? (lower as SkeletonStance) : null;
}

// Compatibility scheduling modes. Authorization is resolved separately from
// Intent autonomy; `gated` still fans out a batch and waits before the next one.
type AutonomyMode = "autonomous" | "gated";

// The scheduling side of the projection (RFC-0001 FR-6). The recorded
// `Construction Autonomy Mode` is not an independent input: the declared Intent
// mode projects to it, so this reader derives the schedule through the SAME
// function the writer uses and treats any disagreement between the two fields as
// a record that contradicts itself.
//
// Two things it deliberately does NOT do. It does not cap semi at "gated" —
// under RFC-0001 semi keeps its two human milestones and lets the Bolt swarm run
// (FR-5). And it does not degrade silently: a divergence throws, because the
// pre-RFC form disabled the swarm with a stderr line at most, which is how a
// record could declare full autonomy next to a swarm that never started (#2483).
//
// A record that declares no mode at all still fails closed to null: there is no
// declaration to schedule from, and inventing one would grant a swarm nobody
// asked for.
export function readAutonomyMode(stateContent: string | null): AutonomyMode | null {
  const declared = declaredIntentAutonomyMode(stateContent);
  if (declared === null) return null;
  const divergence = detectProjectionDivergence(stateContent);
  if (divergence !== null) throw new Error(describeProjectionDivergence(divergence));
  return projectConstructionAutonomy(declared);
}

// One advisory per observed scheduling value per process — the same
// report-once shape reportedBoltDagRecoveries uses below, so a `next` that
// reads the mode twice (the swarm predicate and the directive emit) does not
// print the same line twice.
// Read the compiled batch DAG (the Bolt/unit topological levels) off the
// runtime graph that `amadeus-runtime compile` materialises. Returns the
// `batches` array (each inner array is one parallel batch = one topological
// level) or null when there is no graph file or no bolt_dag node. A pure read:
// an absent graph is a legitimate branch (the swarm simply does not trigger).
const reportedBoltDagRecoveries = new Set<string>();

// The companion read to readBoltDagBatches: when that returns null, this says
// whether the compile had a legitimate reason for there being no DAG. A degrade
// scope ("scope-skips-units") and a stage that simply has not run yet
// ("units-pending") are the only two — anything else fails the compile outright,
// so a null here alongside a null DAG means the graph predates this field.
//
// Exported as the in-process seam. No CLI verb calls this yet — the degrade-path
// message wiring is the issuance-guard Bolt's consumer of the same field.
export function readBoltDagAbsence(projectDir: string): BoltDagAbsence | null {
  let raw: unknown;
  try {
    const graph: unknown = JSON.parse(readFileSync(runtimeGraphPath(projectDir), "utf-8"));
    if (graph !== null && typeof graph === "object" && "bolt_dag_absence" in graph) {
      raw = (graph as { bolt_dag_absence?: unknown }).bolt_dag_absence;
    }
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== "object") return null;
  const { reason, detail } = raw as { reason?: unknown; detail?: unknown };
  if (reason !== "scope-skips-units" && reason !== "units-pending") return null;
  return { reason, detail: typeof detail === "string" ? detail : "" };
}

// `intent` names the record dir to read the DAG from. Omitted = the active
// intent, which is every historical caller; the approve guards pass the target
// intent explicitly so a carrier approve for one intent is never judged against
// another intent's plan (#2375).
function readBoltDagBatches(projectDir: string, intent?: string): string[][] | null {
  const runtimePath = runtimeGraphPath(projectDir, intent);
  let cached: unknown;
  try {
    const graph: unknown = JSON.parse(readFileSync(runtimePath, "utf-8"));
    if (graph !== null && typeof graph === "object" && "bolt_dag" in graph) {
      cached = (graph as { bolt_dag?: unknown }).bolt_dag;
    }
  } catch {
    cached = existsSync(runtimePath) ? null : undefined;
  }

  const canonicalPath = unitDependencyPath(projectDir, intent);
  const source = (() => {
    try {
      return { kind: "content" as const, path: canonicalPath, body: readFileSync(canonicalPath, "utf-8") };
    } catch (error) {
      if (error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return { kind: "absent" as const, path: canonicalPath };
      }
      return { kind: "unreadable" as const, path: canonicalPath, detail: errorMessage(error) };
    }
  })();
  const recovery = recoverBoltDag(cached, source);
  if (recovery.kind === "none") return null;
  if (recovery.kind === "malformed") {
    throw new Error(`Bolt DAG recovery failed (${recovery.reason}): ${recovery.detail}`);
  }
  if (recovery.healed && !reportedBoltDagRecoveries.has(canonicalPath)) {
    reportedBoltDagRecoveries.add(canonicalPath);
    console.error(
      `BOLT_DAG_RECOVERED reason=${recovery.healingReason} batches=${recovery.batches.length} source=${canonicalPath} repair="bun ${harnessDir()}/tools/amadeus-runtime.ts compile"`,
    );
  }
  return recovery.batches.map((batch) => [...batch]);
}

// Read unit kinds from the validated runtime snapshot. Any malformed unit row
// degrades the whole lookup to kindless units, preserving the legacy full
// artifact matrix instead of risking an under-production prune.
function runtimeObjectField(value: unknown, key: string): unknown {
  if (value === null || typeof value !== "object") return undefined;
  return (value as Record<string, unknown>)[key];
}

function loadRuntimeUnitRows(projectDir: string, intent?: string): unknown[] | null {
  try {
    const graph: unknown = JSON.parse(
      readFileSync(runtimeGraphPath(projectDir, intent), "utf-8"),
    );
    const units = runtimeObjectField(runtimeObjectField(graph, "bolt_dag"), "units");
    return Array.isArray(units) ? units : null;
  } catch {
    return null;
  }
}

export function loadRuntimeUnitBatches(projectDir: string): string[][] | null {
  try {
    const graph: unknown = JSON.parse(readFileSync(runtimeGraphPath(projectDir), "utf-8"));
    const batches = runtimeObjectField(runtimeObjectField(graph, "bolt_dag"), "batches");
    if (!Array.isArray(batches)) return null;
    const validBatches = batches.filter((batch): batch is string[] =>
      Array.isArray(batch) && batch.every((unit) => typeof unit === "string" && unit.trim() !== "")
    );
    return validBatches.length === batches.length
      ? validBatches.map((batch) => [...batch])
      : null;
  } catch {
    return null;
  }
}

interface RuntimeUnitKindRow {
  name: string;
  kind?: UnitKind;
}

function parseRuntimeUnitKindRow(row: unknown): RuntimeUnitKindRow | null {
  const name = runtimeObjectField(row, "name");
  if (typeof name !== "string" || name.trim() === "") return null;
  const rawKind = runtimeObjectField(row, "kind");
  if (rawKind === undefined) return { name };
  const normalized = normalizeUnitKind(rawKind);
  if (!normalized.valid) return null;
  return { name, kind: normalized.data };
}

function readUnitKinds(projectDir: string, intent?: string): ReadonlyMap<string, UnitKind> {
  const rows = loadRuntimeUnitRows(projectDir, intent);
  if (rows === null) return new Map();
  const kinds = new Map<string, UnitKind>();
  const names = new Set<string>();
  for (const row of rows) {
    const parsed = parseRuntimeUnitKindRow(row);
    if (parsed === null || names.has(parsed.name)) return new Map();
    names.add(parsed.name);
    if (parsed.kind !== undefined) kinds.set(parsed.name, parsed.kind);
  }
  return kinds;
}

// True when `node` is the SKELETON-GATE stage for `scope` — the FIRST
// Construction EXECUTE stage in scope (the start of Bolt 1). This is derived,
// not hardcoded: firstInScopeStageOfPhase("construction", scope) walks the
// scope's EXECUTE-only sub-DAG and returns its first construction stage (e.g.
// functional-design for feature/enterprise/mvp/refactor/workshop, code-generation
// for poc/fix/security-patch, nfr-requirements for infra). A scope-mapping
// edit that moves the first construction stage moves the skeleton gate with it,
// no code change. Non-construction stages are never the skeleton gate.
function isSkeletonGateStage(node: GraphStage, scope: string): boolean {
  if (node.phase !== "construction") return false;
  const first = firstInScopeStageOfPhase("construction", scope);
  return first !== null && first.slug === node.slug;
}

// True when the walking-skeleton gate stage is RECORDED complete in state. The
// predicate is the skeleton-gate stage's own checkbox — derived state the engine
// writes at approval — not a weak proxy such as an artifact directory existing
// (observed-entity-from-failure-mode): a half-run Bolt 1 leaves directories but
// never a completed checkbox. Used only to distinguish legacy/unmigrated state
// before and after the first construction gate.
function skeletonGateCompleted(stateContent: string | null, scope: string): boolean {
  if (stateContent === null) return false;
  const first = firstInScopeStageOfPhase("construction", scope);
  if (first === null) return false;
  return checkboxStateOf(parseCheckboxes(stateContent), first.slug) === "completed";
}

// Resolve the determined boolean gate for the skeleton-gate stage once the
// conductor's classified stance is in hand. The round-trip's whole point is to
// turn "unresolved" into a DETERMINED boolean; this function is that resolution.
//
// The first construction stage remains a real gate in every skeleton stance.
// Intent autonomy decides who resolves that gate: `full` may auto-decide it
// within the confirmed grant, while `none` and `semi` require a human. The
// stance changes the ceremony, not whether the gate exists, so this structural
// answer remains `true` for every stance.
//
// Why the round-trip still earns its keep: the engine cannot EMIT a boolean it
// has not determined. Classifying the prose is what rules out a stance that
// WOULD change Bolt-1 routing; only after the conductor hands back a typed
// stance can the engine commit the determined gate. The value being true in
// every branch is the correct outcome, not a no-op — the determinism is in
// having classified, not in the boolean differing per stance. `scope` and the
// scope-default set are threaded through so the resolution reads against the
// SKILL.md rules verbatim and a future scope/ceremony change resolves here, in
// one legible place, rather than silently.
function resolveSkeletonGate(stance: SkeletonStance, scope: string): boolean {
  switch (stance) {
    case "on":
      // skeleton-on: Bolt 1 has a gate; Intent autonomy resolves authority.
      return true;
    case "off":
      // skeleton-off: regular Bolt; its standard gate still exists.
      return true;
    case "scope-dependent": {
      // Fall back to the scope-mapping defaults to SELECT the ceremony
      // (greenfield → skeleton-on, incremental → skeleton-off); either ceremony
      // presents a gate at Bolt 1, so the determined gate is true regardless.
      const _ceremony: SkeletonStance = SKELETON_ON_SCOPES.has(scope)
        ? "on"
        : "off";
      return resolveSkeletonGate(_ceremony, scope);
    }
  }
}

// --- Artifact path resolution (the engine's deterministic string-building) ---
//
// The compiled stage-graph.json carries artifacts as VOCABULARY NAMES, not
// paths: produces is a bare-name array (e.g. ["components","decisions"]) and
// consumes is an array of {artifact, required, conditional_on?} objects. The
// conductor must act on an amadeus-docs/... path, so the engine resolves names →
// paths at emit time and never asks the conductor to re-derive them. This is
// pure deterministic string-building — the textbook tool job (the engine design:
// "computes the paths ... routing string-building to an LLM would invert the
// whole thesis"). The mapping is documented at
// docs/reference/16-artifact-vocabulary.md:144-167.

// The per-unit marker carried by the five Construction stages that run once per
// Unit of Work. It lives on the stage's `for_each` field (stage frontmatter,
// compiled onto the GraphStage and into stage-graph.json) — NOT as a
// `**Per-Unit:**` line (no such field exists) and NOT behind a later wave. The
// canonical 5-stage set (nfr-requirements, nfr-design, functional-design,
// infrastructure-design, code-generation) is the defensive cross-check; the
// node's own `for_each` is the source of truth so a future per-unit stage is
// picked up without editing this file.
const PER_UNIT_FOR_EACH = "unit-of-work";
const KNOWN_PER_UNIT_STAGES: ReadonlySet<string> = new Set([
  "nfr-requirements",
  "nfr-design",
  "functional-design",
  "infrastructure-design",
  "code-generation",
]);

// The literal token used in the per-unit path shape when no concrete Unit of
// Work is supplied at emit time. The unit value comes from active Bolt context
// (a later engine increment threads it in); when absent, the faithful emission
// is the documented `{unit-name}` placeholder shape, matching
// 16-artifact-vocabulary.md:159.
const UNIT_NAME_PLACEHOLDER = "{unit-name}";

// True when the node runs once per Unit of Work. Reads the node's own
// `for_each` marker (source of truth); the known-set membership is a defensive
// cross-check so a typo'd marker on one of the five canonical stages still
// resolves per-unit.
function isPerUnit(node: GraphStage): boolean {
  return node.for_each === PER_UNIT_FOR_EACH || KNOWN_PER_UNIT_STAGES.has(node.slug);
}

// True when the node's artifacts belong in the space-level codekb (see
// KNOWN_CODEKB_STAGES in amadeus-lib.ts). Pure predicate over the slug — the
// per-repo/per-space placement is resolved by the CodekbCtx threaded into
// resolveArtifactPath.
function isCodekb(node: GraphStage): boolean {
  return KNOWN_CODEKB_STAGES.has(node.slug);
}

// The small, fs-free payload that lets resolveArtifactPath build a codekb path
// without reading the disk itself (the resolver stays PURE — the conductor's
// chokepoint computes these once where projectDir is live, exactly as
// recordPrefix is). `codekbRepo` is the deterministic repo NAME from
// codekbRepoName(projectDir); `space` is the active-space cursor. When absent
// (a non-codekb caller, e.g. a test invoking buildRunStageDirective with
// defaults) the codekb branch never fires and the record-dir path stands.
export type CodekbCtx = {
  projectDir: string;
  projectDirSource: ProjectDirSource;
  space: string;
  codekbRepo: string;
};

// Build the CodekbCtx for a live projectDir, resolving the active-space cursor
// and the deterministic codekb repo name (both read-only). One place so the
// `next` happy path, the jump paths, and the report-side per-unit coverage guard
// share the same construction instead of repeating the object literal.
function codekbCtxFor(pd: string, projectDirSource: ProjectDirSource = "explicit"): CodekbCtx {
  return { projectDir: pd, projectDirSource, space: activeSpace(pd), codekbRepo: codekbRepoName(pd) };
}

// Resolve a single artifact vocabulary name to its canonical amadeus-docs/... path
// UNDER THE STAGE THAT OWNS THE FILE. Non-per-unit stages map to
// `amadeus-docs/<phase>/<stage-slug>/<name>.md`; per-unit Construction stages
// inject a `{unit-name}` segment: `amadeus-docs/construction/{unit}/<stage>/<name>.md`.
// `unit` defaults to the documented placeholder token; a caller with active
// Bolt context passes the concrete unit name to materialise the real path. The
// {unit-name} segment is INJECTED here — it never appears in the node's
// structured produces[]/consumes[] (those are bare names even for per-unit
// stages); it lives only in the node's prose `outputs` string.
//
// `owner` is the stage whose directory the artifact lives under — the stage
// that PRODUCES it. For produces[] the owner is trivially the directive's own
// node (the node IS the producer). For consumes[] the owner is the OTHER stage
// that produced the artifact (resolved via producersOf), because a consumed
// artifact is "a canonical identifier declared by exactly one PRODUCING stage"
// (docs/reference/16-artifact-vocabulary.md:20-24, 44-48) and lives in that
// producer's directory, NOT the consuming stage's. The per-unit decision is
// likewise the OWNER's — a consume of a per-unit-produced artifact resolves
// under construction/{unit}/<producer>/, a consume of a non-per-unit artifact
// under <producer-phase>/<producer-slug>/ with no construction prefix.
function resolveArtifactPath(
  name: string,
  owner: GraphStage,
  unit: string,
  recordPrefix: string | null,
  codekbCtx?: CodekbCtx,
): string {
  // Codekb artifacts live in the space-level codekb dir, keyed by repo — NOT
  // under the per-intent record dir. This arm fires for BOTH produces[] (owner
  // is the directive's own node) AND consumes[] (owner is the producing stage
  // resolved via producersOf — so a consume of an RE artifact also lands here).
  // It drops the intents/<slug> tail and keeps only the amadeus/spaces/<space>/
  // stem, mirroring relativeCodekbDir. Guarded on the ctx being present so a
  // ctx-less caller (defaults) falls through to the record-dir arms below.
  if (isCodekb(owner) && codekbCtx) {
    return `${relativeCodekbDir(codekbCtx.projectDir, codekbCtx.codekbRepo, codekbCtx.space)}/${name}.md`;
  }
  const prefix = recordPrefix ?? relativeSpaceRecordPrefix();
  if (isPerUnit(owner)) {
    return `${prefix}/construction/${unit}/${owner.slug}/${name}.md`;
  }
  return `${prefix}/${owner.phase}/${owner.slug}/${name}.md`;
}

// Resolve a CONSUMED artifact's path. A consumed artifact lives under the stage
// that PRODUCES it (the 1:1 producer rule above), so we key the path on the
// producer node — never on the consuming `node`. producersOf returns the
// producing stages; the verified graph invariant is exactly one producer per
// artifact (a clean 1:1 map), so producersOf(name)[0] is the owner. Defensive
// fallback: if no producer is found (an orphan consume — a graph defect the
// doctor surfaces, not expected in the shipped graph), resolve under the
// consuming node's own directory rather than crash, so the engine still emits a
// well-formed directive.
function resolveConsumePath(
  name: string,
  node: GraphStage,
  unit: string,
  recordPrefix: string | null,
  codekbCtx?: CodekbCtx,
): string {
  const producer = producersOf(name)[0];
  return resolveArtifactPath(name, producer ?? node, unit, recordPrefix, codekbCtx);
}

// Normalise the workflow's Project Type to the lowercase token the graph's
// conditional_on values use ("brownfield"/"greenfield"), or null when state is
// absent or the field is unset. Composes getField for the canonical state read.
function projectTypeFrom(
  stateContent: string | null,
): "brownfield" | "greenfield" | null {
  const raw = stateContent ? getField(stateContent, "Project Type") : null;
  if (!raw) return null;
  const lower = raw.toLowerCase();
  return lower === "brownfield" || lower === "greenfield" ? lower : null;
}

// Resolve a node's consumes[] to canonical paths, dropping conditional_on
// entries that don't match the project type. The drop guard mirrors the verbatim
// idiom in amadeus-graph.ts:733-739 (validateScope): an entry conditional on a
// project type other than the workflow's is excluded. When projectType is null
// (no state / unset field) the filter is a no-op — every entry is kept and
// resolved, matching the prose orchestrator's "list everything when type is
// unknown" behaviour. Each surviving entry resolves UNDER ITS PRODUCER (see
// resolveConsumePath): the filter decides WHICH consumes appear; the producer
// lookup decides WHERE each one lives. `node` is passed only for the orphan
// fallback, not as the resolution key.
// A resolved consume: the artifact NAME and required flag carried alongside
// the resolved path, so the presence split downstream can key producer lookups
// and required-ness off the authored vocabulary instead of re-deriving the
// name from the path shape.
export type ResolvedConsume = {
  artifact: string;
  required: boolean;
  path: string;
  perUnitSucceeded?: true;
};

export interface PerUnitConsumePopulation {
  readonly declaredUnits: readonly string[];
  readonly outcomes: readonly PerUnitConsumeOutcome[];
}

// One UNIT_OUTCOME_SETTLED row: the outcome the ENGINE settled for a Unit on
// its own per-unit dispatch path (#3099). Separate from the swarm path's Unit
// pool stream in every respect — its own event type, its own batch field, no
// entry in the pool's batchId namespace.
interface SettledUnitOutcome {
  readonly stage: string;
  readonly batch: string;
  readonly unit: string;
  readonly outcome: SettledUnitOutcomeValue;
  readonly key: string;
  readonly revision: number;
}

// The outcomes the engine settles on this path: EXACTLY three, the same closed
// set the downstream fan-out already reads (#3106). Coverage on disk is what the
// engine observes for a Unit it dispatched, and a covered Unit succeeded; the
// canonical Construction projection is what it observes for a Unit the failure
// ruling cancelled. `failed` completes the vocabulary and no emitter arm writes
// it — settlePerUnitOutcomes documents why this path cannot reach one. The
// reader accepts these three and nothing else — a closed vocabulary, as the pool
// projection keeps for its own terminals — so an edited ledger cannot decide
// that a consumer runs.
const SETTLED_UNIT_OUTCOMES = ["succeeded", "cancelled", "failed"] as const;
type SettledUnitOutcomeValue = (typeof SETTLED_UNIT_OUTCOMES)[number];

function isSettledUnitOutcome(value: string | null): value is SettledUnitOutcomeValue {
  return (SETTLED_UNIT_OUTCOMES as readonly (string | null)[]).includes(value);
}

// Refusal for a row that does not carry the shape the emitter writes: a missing
// join key, or an outcome outside the vocabulary above.
const INVALID_SETTLED_ROW = "invalid-unit-outcome-audit-row: not the shape the engine writes";

// The three axes one Unit's outcome is settled on. The intent is implicit — the
// row lands in the active intent's own audit shard — so this is the whole
// identity of "what this stage has recorded about this Unit in this batch".
function perUnitOutcomeTriple(stage: string, unit: string, batch: string): string {
  return `${stage} ${unit} ${batch}`;
}

// The idempotency key of one settled per-unit outcome: the triple above plus the
// revision that observation is. Re-entering `next` on an UNCHANGED observation
// re-derives the same key and finds the row already there, which is what keeps
// the emission append-once. A CHANGED observation — the ruling cancelled a Unit
// and a restart put it back in flight (#3106) — is a new revision, so the row
// that supersedes lands beside the one it replaces instead of colliding with its
// key. Revision 1 is the bare triple, byte for byte the key #3099 wrote.
function perUnitOutcomeKey(stage: string, unit: string, batch: string, revision: number): string {
  const triple = perUnitOutcomeTriple(stage, unit, batch);
  return revision === 1 ? triple : `${triple} #${revision}`;
}

// The inverse: the revision a key on the ledger carries. Revision rides the ROW,
// read back off the key that recorded it, rather than being counted from how
// many rows a triple has. The two agree only while the history is contiguous,
// and nothing keeps it so — an unreadable shard or a row lost to a bad merge
// leaves a gap, and a count would then re-derive a key already on the ledger.
function perUnitOutcomeRevision(key: string): number {
  const suffix = /\s#(\d+)$/.exec(key);
  return suffix === null ? 1 : Number(suffix[1]);
}

// Stage never joins a row to the CONSUME population — outcomes collapse across
// the per-unit stages a Unit clears — but it is the first axis of the triple the
// emitter settles on, so the row carries it and a row without it is not a row
// the engine produced.
//
// Every settled row carries all five keys — emitEvent refuses an emit that omits
// a required attribute — so a row missing one, or carrying an outcome the
// emitter never writes, was edited after the fact. Reading it anyway would let
// the edit decide a consumer's fate; skipping it would drop a Unit from the
// population and surface as producer-outcome-pending, a diagnosis pointing at
// the wrong thing entirely. Both are worse than refusing.
function readSettledUnitOutcomes(projectDir: string): SettledUnitOutcome[] {
  return findAllEvents(readAllAuditShards(projectDir), "UNIT_OUTCOME_SETTLED")
    .map(({ timestamp, block }) => {
      const batch = auditBlockField(block, "Batch");
      const unit = auditBlockField(block, "Unit");
      const outcome = auditBlockField(block, "Outcome");
      const key = auditBlockField(block, "Idempotency Key");
      const stage = auditBlockField(block, "Stage");
      if (batch === null || unit === null || key === null || stage === null) throw new Error(INVALID_SETTLED_ROW);
      if (!isSettledUnitOutcome(outcome)) throw new Error(INVALID_SETTLED_ROW);
      return { timestamp, row: { stage, batch, unit, outcome, key, revision: perUnitOutcomeRevision(key) } };
    })
    .sort(compareSettledRows)
    .map(({ row }) => row);
}

// Supersession order (#3106): whoever reads these rows adopts the LAST one for a
// Unit, so the order has to be a property of the rows themselves. Buffer order
// is not — readAllAuditShards concatenates per-clone shards in FILENAME order,
// so a row's position depends on which clone wrote it. Every term here rides the
// row: the journal envelope's timestamp, then the revision, then the key.
//
// The timestamp alone does NOT separate two revisions of one triple. Journal
// timestamps are second-precision, so two `next` runs inside one second carry
// the same one, and the key text cannot break that tie correctly: sorted as a
// string, `<triple> #10` lands BEFORE `<triple> #2`, which would hand the reader
// the row that revision 10 superseded. Within one triple the revision NUMBER is
// therefore the tie-break. Across different triples the key still breaks the
// remaining ties (Units settled in the same second by one run), whose relative
// order no reader depends on.
function compareSettledRows(
  left: { timestamp: string; row: SettledUnitOutcome },
  right: { timestamp: string; row: SettledUnitOutcome },
): number {
  if (left.timestamp !== right.timestamp) return left.timestamp < right.timestamp ? -1 : 1;
  const leftTriple = perUnitOutcomeTriple(left.row.stage, left.row.unit, left.row.batch);
  const rightTriple = perUnitOutcomeTriple(right.row.stage, right.row.unit, right.row.batch);
  if (leftTriple === rightTriple && left.row.revision !== right.row.revision) {
    return left.row.revision < right.row.revision ? -1 : 1;
  }
  if (left.row.key === right.row.key) return 0;
  return left.row.key < right.row.key ? -1 : 1;
}

export function readPerUnitConsumePopulation(
  projectDir: string,
): PerUnitConsumePopulation | undefined {
  const rows = loadRuntimeUnitRows(projectDir);
  if (rows === null || rows.length === 0) return undefined;
  const declaredUnits = rows.flatMap((row) => {
    const name = runtimeObjectField(row, "name");
    return typeof name === "string" && name.trim() !== "" ? [name] : [];
  });
  const eventSets = readUnitPoolEventSetsFromAudit(projectDir);
  const settled = readSettledUnitOutcomes(projectDir);
  const outcomes: PerUnitConsumeOutcome[] = [];
  const batches = loadRuntimeUnitBatches(projectDir) ?? [];
  for (const [index, units] of batches.entries()) {
    const projection = foldUnitPoolEventSets(eventSets, String(index + 1));
    const currentUnits = new Set(units);
    for (const terminal of projection.terminal) {
      if (!currentUnits.has(terminal.unitId)) continue;
      outcomes.push({
        unit: terminal.unitId,
        outcome: terminal.outcome === "succeeded" || terminal.outcome === "cancelled"
          ? terminal.outcome
          : "failed",
      });
    }
    // The engine-settled outcomes of the per-unit dispatch path (#3099), for the
    // Units the pool says nothing about. Pool precedence is what keeps a Unit
    // that travelled BOTH routes to a single row: two rows for one Unit is
    // producer-outcome-ambiguous downstream. Several settle rows for one Unit
    // (one per per-unit Construction stage it cleared) collapse the same way —
    // the population carries a Unit's outcome, not a Unit-and-stage's. The
    // batch join is the SAME currentUnits membership the pool loop applies, so a
    // Unit outside the current runtime population stays ignored.
    //
    // Collapsing keeps the LAST row a Unit has under the reader's own order, so
    // a revision supersedes what it replaced (#3106): a Unit cancelled by a
    // ruling and then restarted back to coverage carries both rows, and the one
    // that stands is the later observation.
    const pooled = new Set(projection.terminal.map((terminal) => terminal.unitId));
    const engineSettled = new Map<string, string>();
    for (const row of settled) {
      if (row.batch !== String(index + 1)) continue;
      if (!currentUnits.has(row.unit) || pooled.has(row.unit)) continue;
      engineSettled.set(row.unit, row.outcome);
    }
    for (const [unit, outcome] of engineSettled) outcomes.push({ unit, outcome });
  }
  return { declaredUnits, outcomes };
}

function hasRequiredPerUnitConsumes(node: GraphStage): boolean {
  return !isPerUnit(node) && (node.consumes ?? []).some((consume) => {
    const producer = producersOf(consume.artifact)[0];
    return consume.required && producer !== undefined && isPerUnit(producer);
  });
}

export function resolveConsumes(
  consumes: Consume[],
  node: GraphStage,
  projectType: "brownfield" | "greenfield" | null,
  unit: string,
  recordPrefix: string | null,
  codekbCtx?: CodekbCtx,
  unitKind?: UnitKind,
  population?: PerUnitConsumePopulation,
): ResolvedConsume[] {
  const resolved: ResolvedConsume[] = [];
  for (const consume of consumes) {
    if (
      consume.conditional_on &&
      projectType &&
      consume.conditional_on !== projectType
    ) {
      continue;
    }
    const producer = producersOf(consume.artifact)[0];
    if (
      unitKind !== undefined &&
      producer !== undefined &&
      !requiredArtifactsForUnit(
        { produces: [consume.artifact], produces_kinds: producer.produces_kinds },
        unitKind,
      ).includes(consume.artifact)
    ) {
      continue;
    }
    resolved.push({
      artifact: consume.artifact,
      required: consume.required,
      path: resolveConsumePath(consume.artifact, node, unit, recordPrefix, codekbCtx),
    });
  }
  if (population === undefined || isPerUnit(node)) return resolved;
  const fanoutCandidates = resolved.filter((consume) => {
    const producer = producersOf(consume.artifact)[0];
    return consume.required && producer !== undefined && isPerUnit(producer);
  });
  if (fanoutCandidates.length === 0) return resolved;
  const fanout = resolvePerUnitConsumeFanout({
    graph: loadGraph(),
    declaredUnits: population.declaredUnits,
    outcomes: population.outcomes,
    templates: fanoutCandidates.map((consume) => ({
      artifact: consume.artifact,
      path: consume.path,
    })),
  });
  const expanded = fanout.map((consume) => ({
    artifact: consume.artifact,
    required: true,
    path: consume.path,
    perUnitSucceeded: true as const,
  }));
  const fanoutArtifacts = new Set(fanoutCandidates.map((consume) => consume.artifact));
  const firstFanoutIndex = resolved.findIndex((consume) => fanoutArtifacts.has(consume.artifact));
  return [
    ...resolved.slice(0, firstFanoutIndex),
    ...expanded,
    ...resolved.slice(firstFanoutIndex).filter((consume) => !fanoutArtifacts.has(consume.artifact)),
  ];
}

// Split resolved consumes into PRESENT (file exists on disk) and ABSENT
// (it does not), so the directive never points the conductor at a path that
// cannot be read. Only REQUIRED absent consumes are reported: an optional
// (`required: false`) input that does not exist simply is not an input — it
// is dropped from the directive entirely, never flagged as a gap. Each
// required absent entry is annotated: `expected: true` when no producer of
// the artifact is on the active scope's path (the scope deliberately skipped
// the producer — the lean scopes' designed shortcut, so absence is by
// design), `expected: false` when a producer IS on the path but the file is
// still missing (a runtime-skipped conditional producer, or a real gap the
// recovery protocol owns).
//
// Existence resolves like unitCovered: the resolved paths are
// workspace-RELATIVE with forward slashes, re-rooted absolutely under
// codekbCtx.projectDir (splitting on "/" so the join is OS-correct). Two
// deliberate skips keep the split total:
//   - no codekbCtx (the ctx-less test/default path) → no absolute base to
//     check against; everything stays in `consumes`, exactly as before.
//   - a path still carrying the {unit-name} placeholder → existence is
//     unknowable pre-Bolt; it stays in `consumes`.
export function consumePresentOnDisk(consume: ResolvedConsume, absolutePath: string): boolean {
  if (!consume.perUnitSucceeded) return existsSync(absolutePath);
  try {
    return statSync(absolutePath).isFile();
  } catch (error) {
    const code = error !== null && typeof error === "object" && "code" in error
      ? error.code
      : undefined;
    if (code !== "ENOENT" && code !== "ENOTDIR") {
      throw new PerUnitConsumeFanoutError("consume-presence-read-failed", [consume.path]);
    }
    return false;
  }
}

function splitConsumesByPresence(
  consumes: ResolvedConsume[],
  scope: string,
  codekbCtx?: CodekbCtx,
): { present: string[]; absent: Array<{ path: string; expected: boolean }> } {
  if (!codekbCtx) return { present: consumes.map((c) => c.path), absent: [] };
  const onPath = new Set(subgraphForScope(scope).map((s) => s.slug));
  const present: string[] = [];
  const absent: Array<{ path: string; expected: boolean }> = [];
  for (const c of consumes) {
    if (c.path.includes(UNIT_NAME_PLACEHOLDER)) {
      present.push(c.path);
      continue;
    }
    const abs = join(codekbCtx.projectDir, ...c.path.split("/"));
    if (consumePresentOnDisk(c, abs)) {
      present.push(c.path);
      continue;
    }
    if (!c.required) continue; // optional + missing → not an input, not a gap
    const producers = producersOf(c.artifact);
    const producerOnPath = producers.some((p) => onPath.has(p.slug));
    absent.push({ path: c.path, expected: c.perUnitSucceeded ? false : !producerOnPath });
  }
  return { present, absent };
}

// Resolve every required and optional output to a canonical path. `candidates`
// preserves the existing directive.produces contract; `optional` retains the
// conditional subset so the conductor can distinguish paths it may omit.
function resolveProduces(
  node: GraphStage,
  unit: string,
  recordPrefix: string | null,
  codekbCtx?: CodekbCtx,
  unitKind?: UnitKind,
): { candidates: string[]; optional: string[] } {
  const requiredNames = unitKind === undefined
    ? node.produces ?? []
    : requiredArtifactsForUnit(node, unitKind);
  const optionalStage: GraphStage = {
    ...node,
    produces: node.optional_produces ?? [],
  };
  const optionalNames = unitKind === undefined
    ? node.optional_produces ?? []
    : requiredArtifactsForUnit(optionalStage, unitKind);
  const required = requiredNames.map((name) =>
    resolveArtifactPath(name, node, unit, recordPrefix, codekbCtx),
  );
  const optional = optionalNames.map((name) =>
    resolveArtifactPath(name, node, unit, recordPrefix, codekbCtx),
  );
  return { candidates: [...required, ...optional], optional };
}

// Compute the `gate` value for a run-stage directive — the human-judgement
// boundary axis. Three outcomes:
//   - initialization stage → false (bootstrap auto-proceed, no governance gate).
//   - the skeleton-gate stage (first Construction EXECUTE stage of the scope =
//     Bolt 1) with NO stance recorded yet → GATE_UNRESOLVED, the classify
//     round-trip sentinel. The conductor classifies `## Walking Skeleton` prose
//     and reports the stance; the next `next` re-emits with the determined gate.
//   - everything else (incl. the skeleton stage AFTER the stance is recorded) →
//     the determined boolean (true for every EXECUTE stage outside init).
//
// gate is ORTHOGONAL to the conditional-inclusion axis (`execution`
// ALWAYS|CONDITIONAL answers "is this stage included", not "does it gate"). The
// node-level gate stays true for construction stages; Construction-Bolt autonomy
// is a separate runtime axis. The init-batching note still holds: the engine
// models the 3 init stages as individual gate:false run-stages (masked on every
// real path; only a synthetic mid-init fixture surfaces one — t118's gate-axis
// anchor).
function computeGate(
  node: GraphStage,
  scope: string,
  stateContent: string | null,
): GateValue {
  if (node.phase === "initialization") return false;
  if (isSkeletonGateStage(node, scope)) {
    const stance = readSkeletonStance(stateContent);
    // No stance yet → defer (the classify round-trip). The conductor will
    // report a stance and the next `next` lands in the resolved branch below.
    if (stance === null) return GATE_UNRESOLVED;
    return resolveSkeletonGate(stance, scope);
  }
  // Every other EXECUTE stage gates deterministically.
  return true;
}

// Resolve the gate for a --single run. A single run reads no main state
// (stateContent is null), so a construction skeleton-gate stage computes
// GATE_UNRESOLVED — but the classify round-trip that resolves it only exists on
// the main workflow, which single never touches. That left `--stage <first
// construction stage> --single` emitting gate:"unresolved" with no path forward.
// Resolve it determinately to a gated stage instead: a standalone single run of
// a construction stage still gates on approval, which is the safe determinate
// default. This only rewrites the gate VALUE; the single pointer rule (a single
// run never advances the main Current Stage) is enforced separately by the
// single report path.
export function resolveSingleGate(gate: GateValue): GateValue {
  return gate === GATE_UNRESOLVED ? true : gate;
}

// Build a run-stage directive by reading the routing fields straight off the
// compiled graph node. consumes/produces carry RESOLVED amadeus-docs/... paths:
// the engine resolves the node's vocabulary names → paths at emit time (so the
// conductor never re-derives them) and drops conditional_on consumes-entries
// against the workflow's Project Type. rules_in_context maps to the node's
// resolved rule paths; sensors_applicable maps to the node's resolved sensor ids.
// `unit` is the active Unit of Work for per-unit Construction stages; callers
// without Bolt context omit it and the per-unit path keeps the {unit-name}
// placeholder. `scope` + `stateContent` feed the gate computation (the skeleton
// round-trip) and the first-run-stage persona delivery (decision D-E).
// FR-2 item 10 (gate-next-stage-naming): project the ACTUAL next in-scope stage
// onto a gate-carrying main-workflow directive, so the approval gate names it
// ("Continue to <next_stage>") from the SAME resolver `next` advances with — the
// gate display can never diverge from the post-approval directive. nextInScopeStage
// excludes SKIP stages (returns only EXECUTE) and returns null at the terminal, so
// next_stage is a real successor slug or the explicit terminal null. Applied only
// when `directive.gate === true`: the pre-stance skeleton classify (GATE_UNRESOLVED)
// is not an approval moment, gate:false covers per-unit iteration + initialization,
// and stateContent === null is a --single run (isolated, does not advance). Kept a
// separate helper so buildRunStageDirective's complexity stays under the gate.
function projectNextStage(
  directive: RunStageDirective,
  node: GraphStage,
  scope: string,
  stateContent: string | null,
): void {
  if (stateContent === null || directive.gate !== true) return;
  const next = nextInScopeStage(node.slug, scope, stateContent);
  directive.next_stage = next?.slug ?? null;
  const phaseBoundary = node.phase === "ideation"
      || node.phase === "inception"
      || node.phase === "construction"
    ? node.phase
    : undefined;
  if (phaseBoundary !== undefined && (!next || next.phase !== node.phase)) {
    directive.phase_boundary = phaseBoundary;
  }
}

function routeMainWorkflowDirective(
  directive: RunStageDirective,
  stateContent: string | null,
  codekbCtx: CodekbCtx | undefined,
): RunStageDirective {
  if (stateContent === null || codekbCtx === undefined) return directive;
  const scope = getField(stateContent, "Scope") ?? DEFAULT_SCOPE;
  const firstConstruction = firstInScopeStageOfPhase("construction", scope);
  const next = directive.next_stage === undefined || directive.next_stage === null
    ? null
    : nodeForSlug(directive.next_stage);
  const phaseBoundary = directive.next_stage === null ||
    (next !== null && next !== undefined && next.phase !== directive.phase);
  const autonomy = productionStageAutonomy({
    projectDir: codekbCtx.projectDir,
    stage: directive.stage,
    phase: directive.phase,
    graphRevision: autonomyDigest(loadGraph()),
    walkingSkeleton:
      directive.phase === "construction" && firstConstruction?.slug === directive.stage,
    phaseBoundary,
  });
  if (autonomy.mode === "semi" || autonomy.mode === "full") {
    directive.intent_autonomy_mode = autonomy.mode;
    directive.autonomy_auto_approve = autonomy.autoApprove;
    directive.quality_repair = autonomy.qualityRepair === "error" ? "error" : "active";
    if (autonomy.grantId !== null) directive.intent_grant_id = autonomy.grantId;
    return directive;
  }
  return directive;
}

// resolveDepth — the single depth authority for directive emission (#2425):
// amadeus-state.md → **Depth** wins. Values are normalized against
// VALID_DEPTH_VALUES so a hand-edited lowercase state still emits the canonical
// Capitalized form. Anything the state cannot supply a usable level for — no
// Depth field, an unrecognizable value, or no state at all (the --single and
// no-state jump paths pass stateContent: null) — falls back to the scope's
// declared default, so a corrupted state degrades to the scope level rather
// than leaving the stage with no depth signal. Only an unknown scope on top of
// that yields undefined, and the directive then omits the optional field.
function resolveDepth(stateContent: string | null, scope: string): DepthLevel | undefined {
  const canon = (raw: string | undefined): DepthLevel | undefined => {
    if (!raw) return undefined;
    const needle = raw.trim().toLowerCase();
    return VALID_DEPTH_VALUES.find((v) => v.toLowerCase() === needle);
  };
  const fromState = stateContent ? canon(getField(stateContent, "Depth") ?? undefined) : undefined;
  return fromState ?? canon(loadScopeMapping()[scope]?.depth);
}

function buildRunStageDirective(
  node: GraphStage,
  projectType: "brownfield" | "greenfield" | null = null,
  unit: string = UNIT_NAME_PLACEHOLDER,
  scope: string = DEFAULT_SCOPE,
  stateContent: string | null = null,
  recordPrefix: string | null = null,
  codekbCtx?: CodekbCtx,
  unitKind?: UnitKind,
  population?: PerUnitConsumePopulation,
): RunStageDirective {
  const resolvedConsumes = resolveConsumes(
    node.consumes ?? [], node, projectType, unit, recordPrefix, codekbCtx, unitKind,
    population,
  );
  const { present, absent } = splitConsumesByPresence(resolvedConsumes, scope, codekbCtx);
  const resolvedProduces = resolveProduces(
    node,
    unit,
    recordPrefix,
    codekbCtx,
    unitKind,
  );
  const directive: RunStageDirective = {
    kind: "run-stage",
    stage: node.slug,
    phase: node.phase,
    lead_agent: node.lead_agent,
    support_agents: node.support_agents ?? [],
    // The graph constrains mode to inline|subagent today; the directive's
    // mode enum is inline|subagent|agent-team. The node value is always one
    // of the first two, so it satisfies the contract; the validator is the
    // backstop if a future graph adds agent-team.
    mode: node.mode as RunStageDirective["mode"],
    gate: computeGate(node, scope, stateContent),
    memory_path: memoryPathFor(node.phase, node.slug, recordPrefix),
    consumes: present,
    produces: resolvedProduces.candidates,
    rules_in_context: (node.rules_in_context ?? []).map((r) => r.path),
    sensors_applicable: (node.sensors_applicable ?? []).map((s) => s.id),
    stage_file: stageFileFor(node.phase, node.slug),
  };
  // Deterministic diary creation at the single chokepoint every issuance path
  // (advance / jump / birth / resume / --single) funnels through. The decision
  // is anchored on the SAME memory_path baked into the directive (#1279): a
  // resolved recordPrefix writes the diary, the bare-space fallback (null
  // recordPrefix) with records on disk emits a loud advisory instead of a silent
  // skip, and a true pre-birth shell stays silent. codekbCtx is still required —
  // it carries the live projectDir; the ctx-less test/default path writes
  // nothing. ensureStageDiary never overwrites an existing diary (#1080).
  if (codekbCtx) {
    ensureStageDiaryForDirective(
      codekbCtx.projectDir,
      directive.memory_path,
      codekbCtx.space,
      codekbCtx.projectDirSource,
    );
  }
  const depth = resolveDepth(stateContent, scope);
  if (depth !== undefined) directive.depth = depth;
  if (absent.length > 0) directive.consumes_absent = absent;
  if (resolvedProduces.optional.length > 0) {
    directive.optional_produces = resolvedProduces.optional;
  }
  projectNextStage(directive, node, scope, stateContent);
  // Reviewer — include if the stage declares one (§12a).
  if (node.reviewer) {
    directive.reviewer = node.reviewer;
    directive.reviewer_max_iterations = node.reviewer_max_iterations ?? 2;
  }
  // Decision D-E: bake the conductor persona into the FIRST run-stage of the
  // workflow. The optional field is omitted on every later directive (the
  // persona persists in the session once delivered). A missing conductor.md is
  // best-effort — the directive stays well-formed without the field.
  if (isFirstRunStageOfWorkflow(stateContent, node)) {
    const persona = readConductorPersona();
    if (persona !== null) directive.conductor_persona = persona;
  }
  return directive;
}

// Find the graph node for a slug. Composes loadGraph() (the one cached read).
function nodeForSlug(slug: string): GraphStage | undefined {
  return loadGraph().find((s) => s.slug === slug);
}

const MIGRATION_WORKFLOW_OPTIONS = new Set([
  "compose",
  "--stage",
  "--phase",
  "--scope",
  "--depth",
  "--test-strategy",
  "--single",
  "--resume",
  "--new-intent",
  "--new-scope",
  "--report",
]);

const SHELL_SINGLE_QUOTE_ESCAPE = "'\"'\"'";

function quoteShellArg(value: string): string {
  if (/^[A-Za-z0-9_./-]+$/.test(value)) return value;
  return "'" + value.split("'").join(SHELL_SINGLE_QUOTE_ESCAPE) + "'";
}

function isSafeMigrationSourceForDirective(value: string): boolean {
  // The source is rendered twice inside Markdown code spans. Shell quoting is
  // not display escaping: a backtick or control character would terminate the
  // span / reshape the numbered approval gate before the command ever runs.
  for (const char of value) {
    const point = char.codePointAt(0) ?? 0;
    if (char === "`" || point <= 0x1f || (point >= 0x7f && point <= 0x9f)) {
      return false;
    }
  }
  return true;
}

// Emit the complete dry-run -> human gate -> internal apply contract. Keeping
// it behind one narrow module interface makes every caller use the same safety
// wording and keeps migration entirely outside workflow state transitions.
function emitMigrationDirective(args: string[], migration: MigrationRequest): void {
  if (
    migration.from !== undefined &&
    !isSafeMigrationSourceForDirective(migration.from)
  ) {
    emitMigrationError(
      "The migration source path cannot contain backticks or control characters. Rename the path or pass a safe relative path.",
    );
    return;
  }

  // A bare word immediately after --migrate is the selected source path, even
  // when that directory happens to be named like a workflow verb (for example
  // `compose`). Exclude only that one classified argv position; flag-shaped
  // tokens such as `--stage` are never source candidates and remain conflicts.
  const migrationFlagIndex = args.indexOf("--migrate");
  const sourceIndex =
    migration.source === "explicit-flag" && migration.from !== undefined
      ? migrationFlagIndex + 1
      : -1;
  const conflict = args.find(
    (arg, index) => index !== sourceIndex && MIGRATION_WORKFLOW_OPTIONS.has(arg),
  );
  if (conflict) {
    emitMigrationError(
      `Cannot combine workspace migration with ${conflict}. Migration does not run or advance workflow stages; run the commands separately.`,
    );
    return;
  }

  if (args.filter((arg) => arg === "--migrate").length > 1) {
    emitMigrationError("Specify --migrate only once.");
    return;
  }
  if (
    migration.source === "explicit-flag" &&
    args.length !== (migration.from === undefined ? 1 : 2)
  ) {
    emitMigrationError(
      "--migrate accepts one optional source path and no freeform arguments. Run workflow options separately.",
    );
    return;
  }

  const sourceArg = migration.from ? ` ${quoteShellArg(migration.from)}` : "";
  const dryRun = `bun ${harnessDir()}/tools/amadeus-utility.ts migrate${sourceArg}`;
  const apply = `${dryRun} --apply`;
  emit(printDirective(
    `Run \`${dryRun}\` and print its complete dry-run report. If the dry-run fails, print the error and stop. Otherwise present exactly this numbered approval gate and STOP for the human's answer:\n\n` +
      "1. Yes — apply this migration exactly as shown\n" +
      "2. No — leave the workspace unchanged\n\n" +
      `Only after an explicit \`1\` or \`Yes\`, run \`${apply}\`, print its complete output, and stop. On \`2\` or \`No\`, stop without running apply. This is workspace migration, NOT workflow work: do NOT run \`next\`, do NOT birth or advance an Intent, and do not infer approval from silence.`,
  ));
}

function isBareAdvancingNext(
  flags: ParsedFlags,
  migration: MigrationRequest | null,
): boolean {
  if (migration !== null) return false;
  const blockers: unknown[] = [
    flags.readOnly,
    flags.workspaceVerb,
    flags.stage,
    flags.phase,
    flags.scope,
    flags.intent,
    flags.resume,
    flags.depth,
    flags.testStrategy,
    flags.single,
    flags.compose,
    flags.newScope,
    flags.report,
    flags.newIntent,
  ];
  for (const blocker of blockers) {
    if (blocker) return false;
  }
  return true;
}

function refuseUnauthorizedKimiCaller(
  projectDir: string | undefined,
): boolean {
  const authorization = authorizeMainConductor(resolveProjectDir(projectDir));
  if (authorization.kind === "authorized") return false;
  emitStateNeutralError(callerAuthorizationError(authorization));
  return true;
}

// The two Codex hook faces, by relative path. The canonical example is tracked;
// the active file is per-clone runtime state and gitignored, so a fresh clone or
// worktree carries the example alone until someone activates it. Kept as plain
// literals rather than an import: core stays harness-neutral and must not depend
// on packages/framework/harness/codex. The contract that owns these two paths
// (and their names) is amadeus-codex-hooks-contract.ts — CANONICAL_HOOKS_PATH
// and ACTIVE_HOOKS_PATH there; keep the literals below in step with it.
const CODEX_CANONICAL_HOOKS_RELATIVE_PATH = ".codex/hooks.json.example";
const CODEX_ACTIVE_HOOKS_RELATIVE_PATH = ".codex/hooks.json";

// Issue #2703 — on Codex, hooks fire only from `.codex/hooks.json`. Without it
// the UserPromptSubmit hook never runs, so no HUMAN_TURN is ever minted and the
// workflow deadlocks silently at the first human checkpoint: `amadeus-log
// answer` and `amadeus-bolt set-autonomy` refuse on a provenance guard whose
// cause is nowhere near the command that failed. Refuse at `next` instead, where
// the fix is still cheap. Inert on every other harness and on any project that
// carries no Codex projection at all.
//
// The recovery command runs a tool inside the harness tree, so it is built
// through harnessDir() rather than a hardcoded literal (the t153 seam) — on the
// only harness that reaches this line that resolves to `.codex`.
// Only a regular file counts as an active hooks face: Codex cannot load hooks
// from a directory (or any other node kind) at that path, so treating one as
// active would re-open the silent #2703 deadlock. statSync (not lstat): a
// symlink RESOLVING to a regular file is a working hooks.json.
function activeCodexHooksFileIsUsable(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function refuseInactiveCodexHooks(projectDir: string | undefined): boolean {
  if (detectHarnessType() !== "codex") return false;
  const pd = resolveProjectDir(projectDir);
  if (!existsSync(join(pd, CODEX_CANONICAL_HOOKS_RELATIVE_PATH))) return false;
  if (activeCodexHooksFileIsUsable(join(pd, CODEX_ACTIVE_HOOKS_RELATIVE_PATH))) return false;
  emitStateNeutralError(
    `Codex hooks are not active: ${CODEX_ACTIVE_HOOKS_RELATIVE_PATH} is missing, so no Amadeus hook fires and no HUMAN_TURN is recorded — the workflow would stall at the first human checkpoint. ` +
      `Run \`bun ${harnessDir()}/tools/amadeus-codex-hooks.ts activate\`, then restart the Codex task: an already-running task does not reload hooks.json.`,
  );
  return true;
}

// Issue #3004. The exported handlers are in-process entrances: a test, a seam,
// or any driver that imports this module calls them directly, with no
// `--project-dir` in argv. When such a caller names no project, every internal
// resolveProjectDir(undefined) falls through to the ambient ladder — the
// CLAUDE_PROJECT_DIR of the surrounding session, then the workspace marker on
// the cwd's ancestor chain — so the handler silently operates on, and records
// ERROR_LOGGED into, whatever real workspace happens to surround the process.
// #1389 fixed where the row lands once a project IS named; this closes the case
// where none is. Fail-closed: refuse before anything is resolved, read, or
// written. main() resolves argv's project dir before dispatch, so the CLI (with
// or without --project-dir) never reaches this refusal.
const AMBIENT_PROJECT_DIR_REFUSAL =
  "amadeus-orchestrate requires an explicit --project-dir / projectDir: " +
  "in-process callers must not rely on ambient workspace resolution " +
  "(CLAUDE_PROJECT_DIR or the cwd workspace marker), which would operate on " +
  "and record into whatever workspace surrounds the process.";

function refuseAmbientProjectDir(projectDir: string | undefined): boolean {
  if (projectDir !== undefined) return false;
  // State-neutral: the refusal must not annotate the record it refuses to touch.
  emitStateNeutralError(AMBIENT_PROJECT_DIR_REFUSAL);
  return true;
}

// All three `next` preconditions in one call site: the unnamed-project refusal
// runs first (nothing below it may resolve an ambient project), then the
// caller-authorization guard (it decides whether this process may speak for the
// workflow at all), then the Codex hooks-activation guard. Composed here rather
// than as three statements in handleNext so the handler's decision count —
// already at the complexity ratchet's recorded ceiling — is unchanged.
function refuseBlockedNextEnvironment(projectDir: string | undefined): boolean {
  if (refuseAmbientProjectDir(projectDir)) return true;
  if (refuseUnauthorizedKimiCaller(projectDir)) return true;
  return refuseInactiveCodexHooks(projectDir);
}

// Reads the Kiro readonly latch and turn counter; returns the command label
// when the latch is fresh (stamped for the CURRENT turn), null otherwise.
// Advisory: any failure returns null so a real `next` is never blocked. Inert
// on Claude/Codex: the latch files are never written there (no seam).
function freshReadonlyLatchLabel(projectDir: string | undefined): string | null {
  try {
    const pdLatch = resolveProjectDir(projectDir);
    const latchPath = join(pdLatch, "amadeus", ".amadeus-readonly-latch");
    const counterPath = join(pdLatch, "amadeus", ".amadeus-turn-counter");
    let counter = -1;
    let latchTurn = -2;
    let label = "the read-only command";
    if (existsSync(counterPath)) {
      const raw = readFileSync(counterPath, "utf-8").trim();
      const parsed = /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : Number.NaN;
      if (Number.isSafeInteger(parsed)) counter = parsed;
    }
    if (existsSync(latchPath)) {
      const lr = JSON.parse(readFileSync(latchPath, "utf-8")) as { turn?: number; flag?: string; source?: string };
      if (typeof lr.turn === "number") latchTurn = lr.turn;
      if (typeof lr.flag === "string") {
        // read-only flags render with a leading `--`; workspace verbs are bare.
        label = lr.source === "workspace-verb" ? `\`${lr.flag}\`` : `--${lr.flag}`;
      }
    }
    if (counter >= 0 && latchTurn === counter) return label;
  } catch { /* advisory: guard is best-effort, never blocks a real next */ }
  return null;
}

// Surface a REPAIR_STALLED suspension as the terminal `parked` directive, or
// report that no such stop is pending. An explicit re-entry (`--resume`,
// `--stage`, `--phase`, `--new-intent`) is a deliberate continuation and is
// handled by the branch that owns it, so it never reads the stall.
function emitRepairStalledIfSuspended(
  projectDir: string,
  stateContent: string | null,
  flags: ParsedFlags,
): boolean {
  const explicitReEntry = Boolean(flags.resume || flags.stage || flags.phase || flags.newIntent);
  if (stateContent === null || explicitReEntry) return false;
  const stall = readProductionRepairStall(projectDir);
  if (stall === null) return false;
  emit(parkedDirective(repairStalledReason(stall), stall.stageInstanceId));
  return true;
}

// Surface a waiting suspension as its own terminal directive, or report that no
// such stop is pending. The self-disable set matches the stall branch: an
// explicit re-entry is a deliberate continuation and belongs to the branch that
// owns it, which is where the ruling gets re-presented.
function emitWaitingIfSuspended(
  projectDir: string,
  stateContent: string | null,
  flags: ParsedFlags,
): boolean {
  const explicitReEntry = Boolean(flags.resume || flags.stage || flags.phase || flags.newIntent);
  if (stateContent === null || explicitReEntry) return false;
  const stop = readProductionWaitingStop(projectDir);
  if (stop === null) return false;
  emit(waitingDirectiveFor(stop));
  return true;
}

// The turn-scoped no-op-next guard (Kiro roll-forward defense). On Kiro the
// userPromptSubmit seam handles a read-only/navigation command deterministically
// off-band but CANNOT block the turn, so the conductor relays the output AND may
// still fire a bare `next` (sometimes several times the same turn), rolling the
// active workflow forward. The seam stamps amadeus/.amadeus-readonly-latch with
// the CURRENT turn counter; a TRULY BARE advancing next (none of its own flags
// set) checks the latch BEFORE any state inspection and emits `done` instead of
// routing to a run-stage. Turn-scoped — a legitimate advancing next in a LATER
// turn (counter bumped, latch now stale) is never swallowed.
function emitReadonlyLatchDone(
  projectDir: string | undefined,
  flags: ParsedFlags,
  migration: ReturnType<typeof classifyMigrationRequest>,
): boolean {
  if (!isBareAdvancingNext(flags, migration)) return false;
  const latchLabel = freshReadonlyLatchLabel(projectDir);
  if (latchLabel === null) return false;
  emit({
    kind: "done",
    reason: `The read-only/navigation command (${latchLabel}) already ran this turn and its output was shown above. This was a read-only utility or a workspace switch, not workflow work — there is nothing to advance. The workflow is unchanged; if one is active it remains paused where it was. STOP.`,
  });
  return true;
}

// The `next` handler — pure read of workflow state, emits exactly one
// directive. Its only write is the machine-local sensor-invocation projection
// emit() drops beside the hooks-health heartbeat for run-stage directives.
export function handleNext(
  args: string[],
  projectDir: string | undefined,
  projectDirSource: ProjectDirSource = "explicit",
): void {
  // Record the project this handler operates on so emit()'s ERROR_LOGGED lands
  // here, not the ambient CLAUDE_PROJECT_DIR, under in-process drivers (#1389).
  _handlerProjectDir = projectDir;
  // Per-invocation latch: an in-process driver reuses this module across calls,
  // so a carry left behind by a previous run must never leak into this one.
  _pendingAutonomyCarry = null;
  if (refuseBlockedNextEnvironment(projectDir)) return;
  const flags = parseNextFlags(args);
  const migration = classifyMigrationRequest(args);

  // Branch 0 — turn-scoped no-op-next guard, before any state inspection
  // (emitReadonlyLatchDone owns the rule).
  if (emitReadonlyLatchDone(projectDir, flags, migration)) return;

  // Branch 1 — read-only utility flags dispatch FIRST, before any state
  // inspection (SKILL.md absolute-precedence rule: --status/--help/--doctor/
  // --version run even when a state file exists). The engine names the move as
  // a print directive; the conductor runs the matching tool and prints its
  // stdout verbatim. The directive NAMES THE EXACT command (the flag maps 1:1 to
  // an amadeus-utility.ts subcommand by stripping the leading `--`: --status→status,
  // --doctor→doctor, --help→help, --version→version) and spells out the terminal
  // contract ("then stop … do NOT run `next`"). This mirrors the workspace-verb
  // branch (Branch 1b below) and exists because the earlier vague wording ("Run
  // the read-only utility for --doctor …") let a live conductor over an active
  // workflow mis-route to a bare `next` and roll forward into the active stage
  // instead of running the utility — a read-only command carries no workflow
  // work, so it must never advance an intent. The harness dir is resolved through
  // harnessDir() so the directive names the right tree on every harness.
  if (flags.readOnly) {
    const sub = flags.readOnly.replace(/^--/, "");
    emit(printDirective(
      `Run \`bun ${harnessDir()}/tools/amadeus-utility.ts ${sub}\`, print its output verbatim, then stop. This is a read-only utility, NOT workflow work: do NOT run \`next\` and do NOT advance, resume, or run any workflow stage.`,
    ));
    return;
  }

  // Public apply is never a workflow request. Reject it before migration,
  // workspace, or active-Intent routing, but after the documented absolute
  // precedence of read-only utilities. Apply is reachable only from the
  // migration print directive after the human approves its numbered gate.
  if (args.includes("--apply")) {
    emitMigrationError(
      "--apply is internal to the migration approval flow. Run /amadeus --migrate [path] and approve the numbered gate instead.",
    );
    return;
  }

  // Branch 1a — upstream workspace migration dispatches immediately after the
  // read-only utilities and before workspace navigation or workflow state.
  if (migration) { emitMigrationDirective(args, migration); return; }

  // Branch 1b — workspace navigation verbs (space/space-create/intent) dispatch
  // BEFORE any state inspection, mirroring Branch 1. This MUST precede
  // resolveProjectDir/loadState: a switch works whether or not a workflow is
  // active, and placing it later would let e.g. `space teamB` fall into the
  // happy-path branch and advance the WRONG intent (the bug this fixes). All of
  // space / space-create / intent map to the same TERMINAL print shape — switch
  // is a cursor write that echoes the new world and stops, space-create mutates
  // but advances no workflow, and a bare `space`/`intent` (no arg) is a
  // read-only listing — so none of them leaves anything for `next` to continue
  // into. The deterministic handler (amadeus-utility.ts) itself branches
  // list-vs-switch on whether the <name> arg is present, so the engine just
  // passes args[1] through when captured and omits it when absent — it does NOT
  // replicate that decision here. The harness dir is resolved through
  // harnessDir() so the directive names the right tree on every harness.
  if (flags.workspaceVerb) {
    const { verb, arg } = flags.workspaceVerb;
    emit(printDirective(
      `Run \`bun ${harnessDir()}/tools/amadeus-utility.ts ${verb}${arg ? " " + arg : ""}\`, print its output verbatim, then stop.`,
    ));
    return;
  }

  // Branch 2 — mutually-exclusive --stage + --phase (SKILL.md step 6). The
  // message is VERBATIM from SKILL.md:120 so the prose and the engine emit the
  // same user-facing text.
  if (flags.stage && flags.phase) {
    emit(errorDirective(
      "Cannot use --stage and --phase together. Use one or the other.",
    ));
    return;
  }

  const pd = projectDir!;
  if (emitArchivedNextError(pd)) return;
  const stateContent = loadStateFileIfPresent(pd);
  // The active intent's RELATIVE record-dir prefix (amadeus/spaces/<sp>/intents/
  // <slug>-<id8>), threaded into every run-stage directive so the conductor's
  // artifact/diary paths resolve under the active intent. null → the flat legacy
  // `amadeus-docs` prefix (a pre-workspace project not yet migrated/born). Resolved
  // once here where projectDir is known; the resolvers themselves take no pd.
  const recordPrefix = relativeRecordDir(pd);
  // The space-level codekb context, resolved on the SAME live projectDir as
  // recordPrefix and threaded down the same spine. Lets resolveArtifactPath
  // place a KNOWN_CODEKB_STAGES artifact under amadeus/spaces/<space>/codekb/
  // <repo>/ (dropping the intents/<slug> tail) without re-reading the disk in
  // the pure resolver. codekbRepoName is read-only (intentRepos never throws).
  const codekbCtx = codekbCtxFor(pd, projectDirSource);

  // Branch 2.4 - REPAIR_STALLED suspension (issue #2912). When bounded Quality
  // Repair parks a semi/full run, the stop lives in the Intent autonomy
  // projection, not in the `Parked` state field Branch 2.5 reads — so without
  // this branch `next` kept re-issuing the very run-stage whose referee had
  // already failed closed. Surfacing the stall is the safe stop the canon names
  // for `full`: the grant stays active and the resume condition is explicit. The
  // self-disable set matches Branch 2.5 — an explicit re-entry is a deliberate
  // continuation and must reach the branch that handles it.
  if (emitRepairStalledIfSuspended(pd, stateContent, flags)) return;

  // Branch 2.4b - WAITING suspension (RFC-0001 FR-3). Same shape as the stall
  // branch above and the same self-disable set, but its own terminal: a run
  // that stopped because it may not rule is not a run that broke, and the
  // conductor is told which one it is by the directive kind rather than by the
  // prose in `reason`.
  if (emitWaitingIfSuspended(pd, stateContent, flags)) return;

  // Branch 2.5 - PARKED workflow (issue #367). The `park` subcommand persists a
  // `Parked` runtime field (via amadeus-state.ts park) without advancing any
  // stage; on a PLAIN `next` (no explicit re-entry flag) the engine emits a
  // terminal `parked` directive that the Stop hook honours as a clean turn-end,
  // so a long workflow can pause across sessions instead of rubber-stamping the
  // remaining stages to reach `done`. Two self-disabling conditions keep this
  // narrow:
  //   1. SELF-DISABLE on explicit re-entry - a `--resume` / `--stage` / `--phase`
  //      next is a deliberate continuation, handled by the unpark branch below
  //      (resume) or the jump path (stage/phase), so it never re-emits `parked`.
  //      `--new-intent` is likewise a deliberate re-entry: it births a BRAND-NEW
  //      intent alongside the parked one, so the parked cursor must not swallow it
  //      (issue #834 - the sister of the #750/#832 latch-face `--new-intent`
  //      escape on a different code path). Without excluding it, a parked
  //      active-intent cursor traps `next --new-intent` in `{"kind":"parked"}` and
  //      it never reaches the Branch 4a birth print below.
  //   2. STALE-BY-PROGRESS - only emit `parked` while `Parked At Stage` still
  //      equals `Current Stage`. If the workflow has advanced past the parked
  //      slug (a stale marker), ignore it and fall through to the normal route.
  if (
    stateContent &&
    !flags.resume &&
    !flags.stage &&
    !flags.phase &&
    !flags.newIntent &&
    (getField(stateContent, "Parked") ?? "").trim().length > 0
  ) {
    const parkedAt = (getField(stateContent, "Parked At Stage") ?? "").trim();
    const currentSlug = (getField(stateContent, "Current Stage") ?? "").trim();
    if (parkedAt.length > 0 && parkedAt === currentSlug) {
      emit(parkedDirective(
        `Workflow parked at "${parkedAt}". Resume with /amadeus --resume.`,
        parkedAt,
      ));
      return;
    }
  }

  // Branch 2.6 - unpark on RESUME (issue #367). A `--resume` over a parked
  // workflow must CLEAR the marker before continuing, else the next plain `next`
  // would re-park. Clearing is a MUTATION, so `next` NAMES the move (a
  // run-then-continue print) and the conductor runs the tool; `next` itself
  // writes nothing. Fires before Branch 6 (the resume-choice ask) so the marker
  // is cleared first.
  if (
    stateContent &&
    flags.resume &&
    !flags.stage &&
    !flags.phase &&
    (getField(stateContent, "Parked") ?? "").trim().length > 0
  ) {
    emit(printDirective(
      `This workflow is parked. Run \`bun ${harnessDir()}/tools/amadeus-state.ts unpark\` ` +
        "to clear the park marker, then re-run `next --resume` to continue.",
    ));
    return;
  }

  // (Branch 3 — the legacy `--init` flag — retired in P4. There is no longer a
  // user-facing `/amadeus --init`: the workspace shell ships in dist/ (SEED) and
  // the first intent is BORN, not scaffolded. Birth flows through the
  // birthPrintDirective seam below — Branch 7b/9a name the `intent-birth` move
  // for a resolved scope on a fresh workspace; Branch 8 surfaces the freeform
  // scope-confirm `ask` first. No `--init`/`--force` flag reaches the engine.)

  // Resolve scope by the precedence ladder before any graph lookup.
  const { scope, source } = resolveScope(stateContent, flags);

  // Branch 3b — UNCONDITIONAL --scope validation. An explicit `--scope` flag is
  // validated even when state supplies a valid scope that wins the precedence
  // ladder (Wave-1 audit finding 4). Without this, `next --scope bogus` over a
  // valid-scope workflow silently runs the current stage — the resolved scope is
  // the (valid) state scope, so the unknown-scope check below never sees the
  // bogus flag. The prose orchestrator errors unconditionally (SKILL.md:110), so
  // we mirror that with the SAME wording the no-state path already emits. A VALID
  // `--scope` that differs from the state scope is a legitimate scope-change and
  // passes this check, reaching Branch 5 below; a valid same-as-state flag is a
  // no-op that falls through to the happy path.
  if (flags.scope && !validScopes().has(flags.scope)) {
    const valid = [...validScopes()].join(", ");
    emit(errorDirective(
      `Unknown scope "${flags.scope}". Valid scopes: ${valid}.`,
    ));
    return;
  }

  // Branch 4 — env-scope validation. When the scope was supplied by
  // AMADEUS_DEFAULT_SCOPE, the canonical validator owns the error wording.
  // Shell out to `resolve-env-scope` (a pure read) and relay its VERBATIM
  // `Invalid AMADEUS_DEFAULT_SCOPE "...". Valid scopes: ...` on a non-zero
  // exit — do NOT reconstruct it via validScopes(), which would drift from the
  // string downstream tests + SKILL.md:101 assert on. This precedes the generic
  // unknown-scope check so the env-specific wording wins for the env source.
  if (source === "env") {
    const run = runTool(projectDir, "amadeus-utility.ts", ["resolve-env-scope"]);
    if (!run.ok) {
      emit(errorDirective(toolErrorMessage(run)));
      return;
    }
  }

  // An unresolvable (unknown) scope is a hard error — the engine cannot derive
  // a path through a scope it doesn't know. Mirrors the prose orchestrator's
  // verbatim "Unknown scope" error so downstream assertions hold.
  if (!validScopes().has(scope)) {
    const valid = [...validScopes()].join(", ");
    emit(errorDirective(`Unknown scope "${scope}". Valid scopes: ${valid}.`));
    return;
  }

  // Branch 4ab - the `--autonomy` launch declaration (#2253, widened by #2378).
  // Placed after the scope checks (so a malformed invocation is reported by the
  // flag the user got wrong) and before birth, so a declaration never rides
  // along with a ROUTING move — birth is exempt, because birth creates the very
  // intent the declaration is for rather than moving an existing workflow along
  // (#2378 FR-1d). Refusals are ordinary error directives; an accepted
  // declaration either applies to the intent in flight and falls through to the
  // routing that would have happened without the flag, or latches for the birth
  // command below.
  //
  // This branch does NOT touch directive.intent_autonomy_mode. Projecting the
  // mode onto the directive stays the sole job of routeMainWorkflowDirective,
  // which is what keeps `none` from ever being carried.
  if (flags.autonomy !== undefined || flags.autonomyMissingValue) {
    const declaration = applyLaunchAutonomyDeclaration(
      pd,
      stateContent,
      flags,
      launchAutonomyReach(stateContent, flags, source),
    );
    if (declaration.kind === "error") {
      emit(errorDirective(declaration.message));
      return;
    }
    // Observed HERE, not at birth: this is the last moment the intent that
    // received the launching keystroke is still active, so it is the only moment
    // this launch's own turn can be identified rather than guessed at.
    if (declaration.kind === "carry") {
      _pendingAutonomyCarry = { mode: declaration.mode, turnToken: observeLaunchTurnToken(pd) };
    }
  }

  // Branch 4c - the COMPOSE surfaces (adaptive workflows). A leading `compose`
  // verb, `--new-scope`, or `--report <path>` each force the composer; the
  // engine NAMES the dispatch (print) and stays read-only. Deliberately NOT a
  // WORKSPACE_VERBS/classifyTerminalCommand entry (that would make the Kiro
  // verb-intercept hook run `compose` off-band as a terminal amadeus-utility
  // subcommand and arm the roll-forward latch - compose is workflow work the
  // conductor dispatches). Two modes split on the state file: no state = the
  // FRONT composer (propose a scope before birth); state present = the
  // IN-FLIGHT composer (propose pending-stage flips over the running
  // workflow), which is what keeps a bare mid-flow `compose` from falling
  // through to Branch 10 and silently advancing the current stage. Precedes
  // Branch 5 (scope/config-change) and Branch 7 (jump) so neither mutating
  // path swallows a compose request.
  if (flags.compose || flags.newScope || flags.report) {
    if (flags.stage || flags.phase) {
      emit(errorDirective(
        "Cannot combine compose with --stage/--phase. Compose re-shapes the plan; jump moves the cursor. Run them separately.",
      ));
      return;
    }
    emit(composeDispatchDirective(flags, stateContent !== null));
    return;
  }

  // Branch 4a — --new-intent: the conductor recognized NEW WORK alongside an
  // already-active intent, ran the SKILL.md offer (AskUserQuestion), and the human
  // confirmed. Rather than have the conductor CONSTRUCT the intent-birth command
  // from SKILL.md prose — a weak signal the live model dropped the --label seam on
  // (the 2nd/3rd intents truncated where the 1st, driven by this directive, got a
  // clean LLM label) — the engine emits the SAME birthPrintDirective the fresh-
  // start path (Branch 7b/9a) uses, so BOTH births carry the --label placeholder
  // identically. The human-yes gate already happened conductor-side; this is the
  // run-then-continue print that performs it. Precedes every continuation branch
  // so an active intent's state never routes the new-work birth into "advance the
  // current stage". The freeform new-work text rides in flags.intent (the same
  // slot Branch 9a threads as the description).
  if (flags.newIntent) {
    // Use the EXPLICIT --scope, not the precedence-ladder `scope` (which lets the
    // ACTIVE intent's state scope win — wrong for a brand-new intent: the offer
    // confirmed a scope for the NEW work, independent of what's in flight). Fall
    // back to the resolved scope only when no flag was passed. Both were already
    // validated above (Branch 3b validates flags.scope; the unknown-scope check
    // validates the resolved scope).
    emit(birthPrintDirective(flags.scope ?? scope, flags, flags.intent));
    return;
  }

  // Read the workflow's Project Type once — it feeds the conditional_on filter
  // when any run-stage directive resolves its consumes paths below. Null when
  // there is no state file or the field is unset (the filter then keeps every
  // entry).
  const projectType = projectTypeFrom(stateContent);

  // Branch 4b — --single stage-runner mode. A stage-runner skill
  // (skills/amadeus-<stage>/) drives ONE stage in isolation: `next --stage <slug>
  // --single` emits exactly one run-stage directive for <slug> and STOPS. The
  // load-bearing invariant is the POINTER RULE: a single-stage run NEVER touches
  // the main workflow's `Current Stage`. The with-state jump path (Branch 7) would
  // pivot Current Stage (it emits a `print` naming `amadeus-jump.ts execute`, a
  // mutation), so --single must short-circuit it and emit the run-stage DIRECTLY
  // here — exactly the read-only no-state `next --stage` shape, but unconditional
  // on whether a main workflow exists. The companion `report --single` commits the
  // STAGE_STARTED/STAGE_COMPLETED pair under a synthetic workflow id (audit only);
  // it never dispatches advance/approve/complete-workflow, so the main pointer is
  // structurally untouchable from a single-stage run. This branch precedes Branch
  // 5 (scope/config-change) and Branch 7 (jump) so neither mutating path is reached
  // under --single.
  if (flags.single) {
    if (flags.phase) {
      // A single run targets ONE stage; --phase is a range, so the two are
      // mutually exclusive (mirrors the --stage/--phase guard above).
      emit(errorDirective(
        "Cannot use --single with --phase. --single runs one stage; pass --stage <slug>.",
      ));
      return;
    }
    if (!flags.stage) {
      emit(errorDirective(
        "--single requires --stage <slug>. A stage-runner runs exactly one named stage.",
      ));
      return;
    }
    emitSingleRunStage(flags.stage, scope, projectType, recordPrefix, codekbCtx, resolveDepth(stateContent, scope));
    return;
  }

  // A plain advancing next is the only surface that evaluates mirror phase
  // boundaries. Read-only utilities, jumps, resume and configuration changes
  // retain their existing precedence and never incur mirror-config I/O.
  if (
    stateContent &&
    isBareAdvancingNext(flags, migration) &&
    emitMirrorBoundaryIfNeeded(pd, stateContent)
  ) {
    return;
  }

  // Branch 5 — natural-language scope/depth/test-strategy change against an
  // existing workflow (SKILL.md:141/:144/:147 + step 7/8). Changing scope or
  // config is a MUTATION, so `next` names the move (print) and the conductor
  // runs the tool; it never mutates here. Fires only when a modifier is present
  // WITHOUT an explicit --stage/--phase jump (those take the jump path below).
  if (stateContent && !flags.stage && !flags.phase) {
    // A scope-change requires a VALID --scope that DIFFERS from the active
    // workflow's scope. An invalid or same-as-current --scope is not a change —
    // state wins on the precedence ladder and we fall through to the happy path
    // (this is also why an active workflow's scope is authoritative: a stray
    // --scope flag never silently re-routes a live workflow).
    const currentStateScope = getField(stateContent, "Scope") ?? "";
    if (
      flags.scope &&
      validScopes().has(flags.scope) &&
      flags.scope !== currentStateScope
    ) {
      const parts = [`scope-change --scope ${flags.scope}`];
      if (flags.depth) parts.push(`--depth ${flags.depth}`);
      if (flags.testStrategy) parts.push(`--test-strategy ${flags.testStrategy}`);
      emit(printDirective(
        `Run \`bun ${harnessDir()}/tools/amadeus-utility.ts ${parts.join(" ")}\` to change scope, then print its output verbatim and stop.`,
      ));
      return;
    }
    // A depth / test-strategy modifier with no scope change is a config-change.
    // Gate it on the absence of a scope flag so a `--scope X --depth Y` combo
    // routes through scope-change above (which carries the depth), not here.
    if (!flags.scope && (flags.depth || flags.testStrategy)) {
      const parts = ["config-change"];
      if (flags.depth) parts.push(`--depth ${flags.depth}`);
      if (flags.testStrategy) parts.push(`--test-strategy ${flags.testStrategy}`);
      emit(printDirective(
        `Run \`bun ${harnessDir()}/tools/amadeus-utility.ts ${parts.join(" ")}\` to update the configuration, then print its output verbatim and stop.`,
      ));
      return;
    }
  }

  // Branch 6 — resume (SKILL.md:292). When the conductor re-enters an existing
  // workflow (`/amadeus --resume`), the prose presents a resume-choice
  // AskUserQuestion. The engine NEVER calls AskUserQuestion (it is a Bash tool
  // the conductor owns); it emits an `ask` directive carrying the question and
  // STOPS, and the conductor renders it and feeds the answer back via report.
  // No state file → there is nothing to resume, so fall through to the
  // no-state error below.
  if (flags.resume && stateContent) {
    const currentSlug = getField(stateContent, "Current Stage") ?? "";
    const where = currentSlug.length > 0 ? ` (currently at "${currentSlug}")` : "";
    emit(askDirective(
      `An existing workflow was found${where}. How would you like to proceed? ` +
        "Resume from last checkpoint, redo the current stage, jump to a stage, or start fresh.",
    ));
    return;
  }

  // Branch 7 — explicit --phase / --stage jump. The conductor relays the
  // human's jump target; the engine SUPPLIES the resolved direction by shelling
  // out to `amadeus-jump.ts resolve` (a pure read) rather than re-deriving the
  // SKILL.md:191-193 forward/backward/redo comparison by hand. resolve also
  // owns the in-scope SKIP validation, so a jump to a stage the scope skips is
  // relayed as its VERBATIM `Stage "..." is skipped for scope "...".` error.
  // On success we surface the run-stage directive for the resolved target,
  // carrying resolved artifact paths (projectType feeds the conditional_on
  // filter for the jumped-to stage).
  if (flags.phase || flags.stage) {
    // FR-7(a): a compose-installed plugin stage runs via `--stage <slug>` with
    // NO `--single` — the opt-in reach that install alone grants. This precedes
    // the jump path so a composed opt-in stage (scopes: []), which the jump would
    // reject as "skipped for scope", instead runs as an isolated single stage.
    if (emitComposedPluginStageIfInstalled(flags, scope, projectType, recordPrefix, codekbCtx, pluginHostRoot(), stateContent)) {
      return;
    }
    emitJumpDirective(flags, scope, pd, projectType, projectDirSource);
    return;
  }

  // Branch 7b — bare KNOWN-SCOPE positional with no workflow yet. A user who
  // types `/amadeus fix` (no `--scope`) named a scope, not freeform intent —
  // but the parser captures any non-`--` token as `flags.intent`, so without
  // this branch the literal scope name would slip into Branch 8 and surface a
  // freeform `ask` defaulting to the wrong scope (Wave-1 audit finding 2). When
  // the positional IS a valid scope name, treat it as the scope: an explicitly
  // named scope on a fresh workspace is a request to START a workflow, and the
  // move is identical to `next --scope <known>` with no state (Branch 9's
  // explicit-flag arm) — scaffolding is a mutation, so the engine names the
  // init move as a run-then-continue print and the conductor births the
  // workflow. This precedes Branch 8 so the known-scope name never reaches the
  // freeform ask; Branch 8's own guard is also tightened to exclude
  // valid-scope intents. Two guards keep the birth unambiguous: an explicit
  // `--scope` flag outranks the positional (the precedence ladder's top rung
  // — Branch 9a births the FLAG's scope instead of silently preferring the
  // positional), and `--resume` is a claim that a workflow already exists, so
  // it never births (falls through to the 9b no-state error).
  if (
    !stateContent &&
    flags.intent &&
    validScopes().has(flags.intent) &&
    !flags.scope &&
    !flags.resume
  ) {
    // Don't birth a duplicate over a multi-intent workspace whose cursor is
    // unset (fresh clone) — prompt the human to pick an existing intent. null →
    // zero intents → birth as before.
    const pick = intentPickPromptIfRecordsExist(pd);
    if (pick) {
      emit(autonomyCarryDivertError() ?? pick);
      return;
    }
    emit(birthPrintDirective(flags.intent, flags));
    return;
  }

  // Branch 8 - freeform intent with no workflow yet (SKILL.md:355-362). The
  // user described what to build in prose rather than naming a scope. `next`
  // stays read-only and surfaces the routing question as an `ask` - the engine
  // never calls AskUserQuestion itself. A bare KNOWN-SCOPE positional was
  // already handled by Branch 7b above, so only genuine prose reaches here.
  //
  // Adaptive routing (replaces the old static feature-default confirm, which
  // interpolated the precedence-ladder scope and silently defaulted rich prose
  // to `feature`): keyword inference (inferScopeFromText, a pure read; the
  // audit-emitting detect-scope verb remains the conductor's recording move)
  // now drives the ask.
  //   - CLEAR KEYWORD HIT (source "keyword": matched a scope's keywords and
  //     is within the matcher's word bound): a one-line confirm naming the
  //     MATCHED scope, with "name another scope" and "compose" as outs.
  //   - NO HIT / RICH PROSE (source "freeform": no keyword matched, or the
  //     description is long enough that the match is likely incidental): the
  //     COMPOSE OFFER, never a silent feature default. The conductor renders
  //     it; on "compose" it re-runs `next compose "<text>"` to reach the
  //     Branch 4c dispatch.
  if (
    !stateContent &&
    flags.intent &&
    !flags.scope &&
    !validScopes().has(flags.intent)
  ) {
    const inferred = inferScopeFromText(flags.intent);
    if (inferred.source === "keyword") {
      emit(askDirective(
        `Starting a "${inferred.scope}" workflow for: "${flags.intent}". ` +
          "Confirm to proceed, name a different scope, or say \"compose\" for a tailored plan.",
      ));
      return;
    }
    const directScopeExamples = "fix, feature, poc";
    emit(askDirective(
      `No stock scope clearly fits: "${flags.intent}". ` +
        "I can compose a tailored plan for this task (recommended: reply \"compose\"), " +
        `or you can name a scope directly (e.g. ${directScopeExamples}; see /amadeus --help for all).`,
    ));
    return;
  }

  // Branch 9 — no state file. Two arms, split on whether the user EXPLICITLY
  // named a scope:
  //
  // 9a — an explicit `--scope <valid>` flag (source === "flag"; an invalid
  // flag already died at Branch 3b). Naming a scope on a fresh workspace is a
  // request to START a workflow — the same birth move as Branch 7b's
  // valid-scope positional, reached here because the flag passes Branch 3b
  // validation and no jump/init/resume branch fired. Scaffolding is a
  // mutation, so the engine names the init move (run-then-continue print)
  // rather than performing it. `--resume` never births: resuming claims a
  // workflow already exists, so with no state it falls to the 9b error.
  if (!stateContent && source === "flag" && !flags.resume) {
    // Same fresh-clone guard as Branch 7b: if intents already exist in the
    // active space with no cursor set, prompt to pick one instead of birthing a
    // duplicate. null → zero intents → birth as before.
    const pick = intentPickPromptIfRecordsExist(pd);
    if (pick) {
      emit(autonomyCarryDivertError() ?? pick);
      return;
    }
    // flags.intent here is freeform feature text typed alongside an explicit
    // --scope (e.g. `/amadeus --scope feature "build the auth service"`) — thread
    // it as the born intent's description; a bare `--scope <s>` carries none.
    emit(birthPrintDirective(scope, flags, flags.intent));
    return;
  }
  //
  // 9b — no state and NO explicitly named scope (the resolved scope came from
  // env or the default — never a birth signal on its own). The engine cannot
  // read a position to advance from, and creating one is a mutation (init's
  // job). Emit a clear error rather than guessing — pure read. The message
  // names the two explicit moves that DO start a workflow; it must not imply
  // the user already made one (the pre-hardening wording told a user who had
  // just typed `/amadeus <scope>` to type exactly that — circular now that a
  // named scope births).
  if (!stateContent) {
    emit(errorDirective(
      "No workflow state found (no active intent). " +
        "Start one by describing what to build (/amadeus \"build the auth service\") " +
        "or by naming a scope (/amadeus --scope <scope>).",
    ));
    return;
  }

  // Branch 10 — the happy path. Read the workflow's position from state and map
  // it to the stage to run next.
  const currentSlug = getField(stateContent, "Current Stage");
  if (!currentSlug || currentSlug.length === 0) {
    emit(errorDirective(
      "State file has no Current Stage field — cannot determine the next stage.",
    ));
    return;
  }

  const checkboxes = parseCheckboxes(stateContent);
  const currentState = checkboxStateOf(checkboxes, currentSlug);

  // If the current stage is still in-flight (pending / in-progress /
  // awaiting-approval / revising), the next move is to run THAT stage — the
  // workflow has not yet completed it. If it is already completed or skipped,
  // walk to the next EXECUTE stage for the scope (state-override aware).
  const currentIsInFlight =
    currentState === "pending" ||
    currentState === "in-progress" ||
    currentState === "awaiting-approval" ||
    currentState === "revising" ||
    currentState === undefined; // no checkbox row → treat as the active stage

  if (currentIsInFlight) {
    // Under an autonomy grant, an eligible per-unit build stage fans out as a
    // swarm batch instead of a single run-stage. emitSwarmOrPerUnit emits the
    // invoke-swarm directive when all trigger conditions hold; otherwise it
    // judges the refusal and either falls back to emitForSlug — which itself
    // drives the engine's per-unit for_each loop for a per-unit Construction
    // stage (one unit per `next`, gate suppressed on every uncovered unit with
    // the real gate only on the all-covered re-entry; issue #368) and emits a
    // single directive for every other stage — or stops on a plan mismatch.
    if (emitConstructionFailureIfPresent(pd, currentSlug, flags.resume === true)) return;
    emitSwarmOrPerUnit(currentSlug, projectType, scope, stateContent, recordPrefix, codekbCtx, pd);
    return;
  }

  // Current stage is done — find the next in-scope stage. Pass stateContent so
  // per-stage EXECUTE/SKIP overrides and prior [x]/[S] checkboxes are honoured.
  const next: StageEntry | null = nextInScopeStage(
    currentSlug,
    scope,
    stateContent,
  );
  if (!next) {
    if (getField(stateContent, "Status")?.trim() !== "Completed") {
      emit(awaitCompletionDirective(
        `No in-scope stage remains after ${currentSlug}, but the workflow completion transaction is not committed.`,
      ));
      return;
    }
    const recordDir = completionRecordDir(pd);
    try {
      authorizePersistedCompletedWorkflow({
        projectDir: pd,
        recordDir,
        content: stateContent,
      });
    } catch (cause) {
      emit(errorDirective(
        `Goal reconciliation refused completed recovery: ${completedRecoveryError(cause)}`,
      ));
      return;
    }
    emit({
      kind: "done",
      reason: `Workflow complete — no in-scope stage remains after ${currentSlug} (scope: ${scope}).`,
    });
    return;
  }
  // Same issuance point on the advance path: an eligible per-unit build stage
  // under autonomy fans out as a batch rather than a single run-stage. Off the
  // swarm path, emitForSlug drives the engine's per-unit for_each loop for a
  // per-unit Construction stage (issue #368) and emits a single directive
  // otherwise — unless the refusal breaks the compiled plan, which stops.
  if (emitConstructionFailureIfPresent(pd, next.slug, flags.resume === true)) return;
  emitSwarmOrPerUnit(next.slug, projectType, scope, stateContent, recordPrefix, codekbCtx, pd);
}

// The per-unit marker + run mode that isolate the per-unit build stage. The
// swarm only fires for a Construction stage that runs once per Unit of Work AND
// runs as a subagent — which, in the shipped graph, is EXACTLY code-generation
// (verified: it is the only construction stage with for_each:unit-of-work +
// mode:subagent; every other for_each:unit-of-work stage is mode:inline). We
// match on those two fields rather than the slug so a graph that moves the
// per-unit build stage moves the trigger with it, no code change.
const SWARM_FOR_EACH = "unit-of-work";
const SWARM_MODE = "subagent";

// The batch-end gate question (gated mode). Names the finished batch, the units
// the human is approving, the exact command that records the approval, and the
// re-entry step — the conductor renders it verbatim and cannot proceed without it.
function batchGateQuestion(batch: number, units: string[]): string {
  const done = `Swarm batch ${batch} (${units.join(", ")}) is complete and Construction Autonomy Mode is gated, so the batch-end gate applies (stage-protocol.md: for parallel batches one gate covers every Bolt in the batch).`;
  const how = `Approve batch ${batch} and continue to the next batch? Record the approval with \`amadeus-bolt approve-batch --batch ${batch}\`, then re-run \`next\` to receive the following batch.`;
  return `${done} ${how}`;
}

// Select the batch to fan out: the FIRST batch that still has uncovered units,
// carrying only those units plus its 1-origin number in the topology (the same
// base the approval ledger and the gate question use, so no caller converts).
//
// Issue #841 (contract from #486): bolt_dag.batches is the STATIC topology, so
// completed batches must be excluded here or every `next` re-offers batch 1
// forever and the swarm never advances. Coverage uses the same ledger as the
// per-unit loop (unitCovered: the stage's produces on disk), so no bolt-name
// correlation is needed. null means every unit of every batch is covered — the
// caller falls through to emitPerUnitRunStage's all-covered re-entry, which
// presents the stage's real gate.
function firstUncoveredBatch(
  batches: string[][],
  node: GraphStage,
  projectDir: string,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
): { units: string[]; batchNumber: number } | null {
  const unitKinds = readUnitKinds(projectDir);
  const cancelledUnits = cancelledConstructionUnits(projectDir, node.slug);
  for (let index = 0; index < batches.length; index++) {
    const batch = batches[index];
    if (!Array.isArray(batch) || batch.length === 0) continue;
    const terminalOutcomes = new Map(
      createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir))
        .readProjection(String(index + 1)).terminal
        .map((entry) => [entry.unitId, entry.outcome] as const),
    );
    const uncovered = batch.filter(
      (u) => !cancelledUnits.has(u) &&
        terminalOutcomes.get(u) !== "cancelled" &&
        terminalOutcomes.get(u) !== "succeeded" &&
        !unitCovered(projectDir, node, u, recordPrefix, codekbCtx, unitKinds.get(u)),
    );
    if (uncovered.length > 0) return { units: uncovered, batchNumber: index + 1 };
  }
  return null;
}

function cancelledConstructionUnits(projectDir: string, stage: string): ReadonlySet<string> {
  const intent = activeIntent(projectDir, activeSpace(projectDir));
  if (!intent) return new Set();
  const normalized = normalizeConstructionOutcomeAudit(readAllAuditShards(projectDir));
  if (!normalized.ok) return new Set();
  const projected = projectConstructionOutcomes(normalized.records, { intent, stage });
  if (!projected.ok) return new Set();
  return new Set(
    projected.projection.units
      .filter((entry) => entry.outcome === "cancelled")
      .map((entry) => entry.unit),
  );
}

// The batch-end gate question owed before batch `nextBatchNumber` (1-origin) may
// fan out, or null when nothing is owed (issue #1612).
//
// Every batch BEFORE the one about to be offered is complete, so under `gated`
// each of them owes the human one gate — one gate per BATCH, not one per Bolt
// (stage-protocol.md § "Subsequent Bolt gate"). The EARLIEST unapproved one is
// returned and the caller emits it as an `ask` instead of the swarm:
// engine-enforced and fail closed, not conductor prose. `autonomous` never
// consults the ledger (behaviour unchanged), and the LAST batch owes no
// batch-end gate here — the all-covered re-entry presents the stage's own gate,
// so no double gate.
function owedBatchGate(
  autonomy: AutonomyMode,
  batches: string[][],
  nextBatchNumber: number,
  stateContent: string | null,
): string | null {
  if (autonomy !== "gated") return null;
  const approved = new Set(parseApprovedSwarmBatches(stateContent));
  for (let batchNumber = 1; batchNumber < nextBatchNumber; batchNumber++) {
    if (!approved.has(batchNumber)) {
      // batchNumber < nextBatchNumber <= batches.length, so the lookup is in
      // range for every iteration of this loop.
      return batchGateQuestion(batchNumber, batches[batchNumber - 1]);
    }
  }
  return null;
}

// Try to take over the emit from the normal run-stage path, returning true when
// this function emitted and false when it did not. It takes over ONLY when every
// trigger condition holds:
//   - the slug resolves to a Construction stage that is the per-unit build stage
//     (for_each:unit-of-work + mode:subagent — code-generation today);
//   - canonical Intent autonomy supplies a scheduling projection (`none` and
//     `semi` fan out and stop at batch-end human gates; only `full` skips the
//     in-phase batch wait; legacy mode fields alone never authorise fan-out);
//   - the compiled Bolt/unit DAG yields a batch with uncovered units.
// Three outcomes, then:
//   - all conditions hold and no batch-end gate is owed: emit
//     `{kind:"invoke-swarm", units: <first batch's uncovered units>}` — the
//     earliest topological level not yet complete, the units eligible to fan out
//     now (issue #841) — and return true;
//   - all conditions hold but `gated` still owes a gate on an earlier batch:
//     emit that gate as an `ask` INSTEAD of the swarm and return true, so the
//     caller does not fall back and offer the next batch anyway (issue #1612);
//   - any condition misses: emit nothing and return false, so the caller falls
//     back to the normal run-stage emit (which keeps its computed gate,
//     including the skeleton round-trip sentinel).
// The skeleton Bolt 1 is structurally excluded from swarm dispatch. For scopes
// where code-generation is the skeleton-gate stage, the gate still exists and
// the Intent autonomy coordinator determines whether `full` may auto-decide it.
//
// The return is a discriminated outcome rather than a boolean: a caller that
// only knows "did not fan out" cannot tell a scope with no units from a run
// about to serialise a batch the plan declared parallel. `declined` names the
// reason and carries the DECLARED batch so the plan-integrity guard can judge
// it (issue #1892).
type SwarmEmitOutcome =
  | { readonly kind: "emitted" }
  | {
      readonly kind: "declined";
      readonly decline: SwarmDecline;
      readonly pendingBatch: DeclaredBatch | null;
    };

// The DECLARED batch behind a pick, by its 1-origin batch number. The pick's own
// `units` are only the UNCOVERED ones, so a width-2 batch with one unit already
// built would read as serial; the guard must judge what the plan declared, not
// what is left. The one place the 1-origin offset is applied.
function declaredBatchOf(batches: string[][], batchNumber: number): DeclaredBatch | null {
  const declared = batches[batchNumber - 1];
  if (!Array.isArray(declared)) return null;
  return { number: batchNumber, units: declared };
}

type SelectedSwarmBatch = {
  readonly batches: string[][];
  readonly pick: NonNullable<ReturnType<typeof firstUncoveredBatch>>;
  readonly pendingBatch: DeclaredBatch | null;
};

function selectSwarmBatch(
  node: ReturnType<typeof nodeForSlug> & {},
  projectDir: string,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
): { readonly kind: "selected"; readonly value: SelectedSwarmBatch } | { readonly kind: "declined"; readonly value: SwarmEmitOutcome } {
  const batches = readBoltDagBatches(projectDir);
  if (!batches || batches.length === 0) {
    return { kind: "declined", value: { kind: "declined", decline: { kind: "no-dag" }, pendingBatch: null } };
  }
  const pick = firstUncoveredBatch(batches, node, projectDir, recordPrefix, codekbCtx);
  if (pick === null) {
    return { kind: "declined", value: { kind: "declined", decline: { kind: "all-covered" }, pendingBatch: null } };
  }
  return {
    kind: "selected",
    value: { batches, pick, pendingBatch: declaredBatchOf(batches, pick.batchNumber) },
  };
}

function autonomySwarmOutcome(
  stateContent: string | null,
  scope: string,
  selected: SelectedSwarmBatch,
): SwarmEmitOutcome | null {
  const autonomy = readAutonomyMode(stateContent);
  if (autonomy === null) {
    const decline: SwarmDecline = skeletonGateCompleted(stateContent, scope)
      ? { kind: "autonomy-unset" }
      : { kind: "autonomy-unset-pre-skeleton" };
    return { kind: "declined", decline, pendingBatch: selected.pendingBatch };
  }
  const owedGate = owedBatchGate(autonomy, selected.batches, selected.pick.batchNumber, stateContent);
  if (owedGate === null) return null;
  emit(askDirective(owedGate));
  return { kind: "emitted" };
}

// The batch identity is ALSO the durable Unit Pool identity: `prepare --batch`
// keys `unit-pool:<batch>:initial-enqueue` and the pool's own batchId off it
// (amadeus-swarm.ts handlePrepare). A pool that has left `open` cannot be
// initialised a second time (proposeInitialEnqueue refuses an already-initialised
// projection), so handing that identity back for a fresh fan-out gives the
// conductor a command that cannot run: same units replay the spent pool, changed
// units conflict on the idempotency key. Issue #2837 — the engine owns this
// identity now, so it refuses to emit a spent one instead of leaving the
// conductor to guess a free number and silently correlate with the old pool.
function spentPoolRefusal(projectDir: string, batch: string, units: string[]): string | null {
  const projection = createUnitPoolCoordinator(createAuditUnitPoolRepository(projectDir)).readProjection(batch);
  if (projection.batchId === null || projection.phase === "open") return null;
  const result = projection.result === null ? "" : ` (${projection.result})`;
  const observed = `Swarm batch ${batch} cannot fan out: its Unit Pool is already ${projection.phase}${result}, and \`prepare --batch ${batch}\` would re-open that spent identity rather than start a new fan-out.`;
  const remaining = `Still uncovered in this batch: ${units.join(", ")}.`;
  const exit = "Rule the batch's recorded failure with `resolve-failure` (Retry re-opens the pool and answers with a prepared-retry directive), or land the outstanding Units' artifacts, then re-run `next`.";
  return `${observed} ${remaining} ${exit}`;
}

function swarmConfigIssue(issue: Extract<ReturnType<typeof resolveAmadeusConfig>, { kind: "invalid" }>["issues"][number]): string {
  return issue.kind === "read-failure"
    ? `${issue.layer} (${issue.path}): ${issue.summary}`
    : `${issue.layer} (${issue.path}): expected ${issue.expected}, got ${issue.actualType}`;
}

function emitConfiguredSwarm(projectDir: string, units: string[], batch: string): void {
  const config = resolveAmadeusConfig(projectDir);
  if (config.kind === "invalid") {
    emit(errorDirective(`Invalid swarm configuration: ${config.issues.map(swarmConfigIssue).join(" | ")}`));
    return;
  }
  const spent = spentPoolRefusal(projectDir, batch, units);
  if (spent !== null) {
    emit(errorDirective(spent));
    return;
  }
  const directive = {
    kind: "invoke-swarm" as const,
    units,
    cap: Math.min(
      units.length,
      config.config.swarm.unit.concurrency.limit,
    ),
    // The conductor passes this straight to `prepare --batch` and every later
    // pool call for the batch; it is the 1-origin number the approval ledger and
    // the batch-end gate already use, so no side converts it.
    batch,
  };
  const repos = intentRepos(projectDir);
  emit(repos.length === 1 ? { ...directive, repo: repos[0] } : directive);
}

export function preparedSwarmRetryDirective(
  projectDir: string,
  batch: string,
  unit: string,
): InvokeSwarmDirective {
  const repos = intentRepos(projectDir);
  const directive: InvokeSwarmDirective = {
    kind: "invoke-swarm",
    units: [unit],
    cap: 1,
    prepared_batch: batch,
    retry_unit: unit,
  };
  return repos.length === 1 ? { ...directive, repo: repos[0] } : directive;
}

function canonicalConstructionFailurePending(projectDir: string): boolean {
  const state = loadStateFileIfPresent(projectDir);
  const stage = state ? getField(state, "Current Stage")?.trim() : undefined;
  const intent = activeIntent(projectDir, activeSpace(projectDir));
  if (!stage || !intent) return false;
  const normalized = normalizeConstructionOutcomeAudit(readAllAuditShards(projectDir));
  if (!normalized.ok) return false;
  const projected = projectConstructionOutcomes(normalized.records, {
    intent,
    stage,
    batches: readBoltDagBatches(projectDir) ?? [],
  });
  return projected.ok && constructionFailureTransition(projected.projection).kind === "await-unit-ruling";
}

// A terminal `failed` without its BOLT_FAILED / batch-closure join stops `next`
// only where the ruling loop lives: the per-unit build stage that dispatched the
// Unit, and only for a batch the compiled Bolt DAG still carries. A failure from
// a batch outside the current runtime population is history, and at a downstream
// consumer stage a failed producer is reported by the per-unit consume fan-out
// (`producer-outcome-failed`) — neither may freeze the workflow here.
function terminalFailureStopsNext(
  projectDir: string,
  stageSlug: string,
  units: readonly { unit: string; batch?: string; outcome: string }[],
): boolean {
  const node = nodeForSlug(stageSlug);
  if (node === undefined || !isPerUnit(node)) return false;
  const batches = readBoltDagBatches(projectDir) ?? [];
  return units.some((entry) => {
    if (entry.outcome !== "failed") return false;
    const index = entry.batch === undefined ? Number.NaN : Number.parseInt(entry.batch, 10) - 1;
    return Number.isInteger(index) && index >= 0 && index < batches.length &&
      batches[index].includes(entry.unit);
  });
}

// The ruling prompt shares the same population scope as the terminal guard
// above: a closed failure (terminal + SWARM_BATON_RETURNED) whose batch the
// compiled Bolt DAG no longer carries is history and must not stop `next`
// with `await-unit-ruling` either. Anything that is not a strict positive
// decimal batch id — non-numeric identities (solo retries), malformed
// numerics ("99x" partial-parse), zero-padded or zero ids — and a missing
// batch id cannot be proven historical, so they keep the fail-closed
// ruling behavior.
function failureOutsideRuntimePopulation(
  entry: { unit: string; batch?: string },
  batches: readonly (readonly string[])[],
): boolean {
  if (entry.batch === undefined || !/^[1-9][0-9]*$/.test(entry.batch)) return false;
  const index = Number.parseInt(entry.batch, 10) - 1;
  return index >= batches.length || !batches[index].includes(entry.unit);
}

function constructionFailureRulingDirective(
  projectDir: string,
  stage: string,
  target: { unit: string; attempt?: string; batch?: string },
  siblings: string,
): Directive {
  // RFC-0001 ADR-8: the solo-election trigger is DERIVED from the active
  // Intent's declared Autonomy Mode, not read from config — no declaration
  // (or no state file at all) derives the same conservative "none" default
  // the retired config leaf carried. declaredIntentAutonomyMode is the same
  // direct state-field reader readAutonomyMode/detectProjectionDivergence use
  // for Construction scheduling decisions elsewhere in this file.
  const mode = declaredIntentAutonomyMode(loadStateFileIfPresent(projectDir)) ?? "none";
  if (deriveSoloElectionTrigger(mode) !== "auto") {
    return askDirective(
      `Unit "${target.unit}" failed during ${stage} (attempt ${target.attempt}, batch ${target.batch}; siblings: ${siblings}). Choose exactly one: Retry, Skip, or Abort. The answer is committed through the ordinary ask report path.`,
    );
  }
  if (!target.attempt || !target.batch) return errorDirective("Construction Unit failure is missing attempt or batch identity; waiting fail-closed.");
  const directive: ExecuteFailureElectionDirective = {
    kind: "execute-failure-election",
    stage,
    unit: target.unit,
    attempt: target.attempt,
    batch: target.batch,
    siblings,
    choices: [...FAILURE_ELECTION_CHOICES],
  };
  return directive;
}

function emitConstructionFailureIfPresent(
  projectDir: string,
  stageSlug: string,
  resume: boolean,
): boolean {
  const intent = activeIntent(projectDir, activeSpace(projectDir));
  if (!intent) return false;
  const normalized = normalizeConstructionOutcomeAudit(readAllAuditShards(projectDir));
  if (!normalized.ok) {
    emit(errorDirective(`Construction outcome audit is incomplete: ${JSON.stringify(normalized.diagnostics)}`));
    return true;
  }
  const batches = readBoltDagBatches(projectDir);
  const result = projectConstructionOutcomes(normalized.records, {
    intent,
    stage: stageSlug,
    batches: batches ?? [],
  });
  if (!result.ok) {
    emit(errorDirective(`Construction outcome join failed closed: ${JSON.stringify(result.diagnostics)}`));
    return true;
  }
  if (result.projection.constructionSuspended && !resume) {
    emit(parkedDirective(
      `Construction parked after an Abort ruling at "${stageSlug}". Failure evidence and Unit worktrees are preserved. Resume explicitly with /amadeus --resume.`,
      stageSlug,
    ));
    return true;
  }
  // Scope the ruling loop to the current runtime population, mirroring the
  // terminal guard below: without a compiled DAG there is no population to
  // scope against, so the fail-closed ruling behavior is kept as-is.
  const transition = constructionFailureTransition(
    batches === null
      ? result.projection
      : {
        ...result.projection,
        unresolvedFailures: result.projection.unresolvedFailures.filter(
          (entry) => !failureOutsideRuntimePopulation(entry, batches),
        ),
      },
  );
  if (transition.kind === "await-unit-ruling") {
    const siblingSummary = transition.siblings.map((entry) => `${entry.unit}:${entry.outcome}`).join(", ") || "none";
    emit(constructionFailureRulingDirective(
      projectDir,
      stageSlug,
      transition.target,
      siblingSummary,
    ));
    return true;
  }
  if (terminalFailureStopsNext(projectDir, stageSlug, result.projection.units)) {
    emit(errorDirective("Construction Unit failure is terminal but its BOLT_FAILED / batch-closure join is incomplete; waiting fail-closed."));
    return true;
  }
  return false;
}

function tryEmitSwarm(
  slug: string,
  scope: string,
  stateContent: string | null,
  projectDir: string,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
): SwarmEmitOutcome {
  const notSwarmStage: SwarmEmitOutcome = {
    kind: "declined",
    decline: { kind: "not-swarm-stage" },
    pendingBatch: null,
  };
  const node = nodeForSlug(slug);
  if (!node) return notSwarmStage;
  if (node.phase !== "construction") return notSwarmStage;
  if (node.for_each !== SWARM_FOR_EACH || node.mode !== SWARM_MODE) return notSwarmStage;
  // Never swarm the walking-skeleton gate stage. Its gate may be human-resolved
  // or full-grant-resolved, but the skeleton remains a single structural slice.
  // Declined before the DAG is read: this stage never swarms, so reading the
  // plan here would be I/O with nothing to decide.
  if (isSkeletonGateStage(node, scope)) {
    return { kind: "declined", decline: { kind: "skeleton-gate" }, pendingBatch: null };
  }
  // Read the plan before Intent autonomy so the guard can preserve a declared
  // parallel width even when canonical mode state is unavailable.
  const selection = selectSwarmBatch(node, projectDir, recordPrefix, codekbCtx);
  if (selection.kind === "declined") return selection.value;
  const autonomyOutcome = autonomySwarmOutcome(stateContent, scope, selection.value);
  if (autonomyOutcome !== null) return autonomyOutcome;
  // Thread the construction repo to the conductor when the engine can resolve it
  // DETERMINISTICALLY (read-only — intentRepos never throws; it returns [] for a
  // legacy/flat intent). NOT resolveConstructionRepo here: that THROWS on >1, and
  // the engine must stay non-throwing on the multi-repo path.
  //   - 0 repos (legacy / projectDir-is-the-repo): emit units UNCHANGED — no repo
  //     field. `prepare` with no --repo is today's behaviour for this case.
  //   - 1 repo: emit the lone sibling as `repo`; the conductor passes --repo.
  //   - >1 repos: emit WITHOUT a repo field. The engine cannot autonomously decide
  //     which sibling THIS batch targets — that is the conductor's knowledge call
  //     (the three-concerns tenet). The SKILL.md prose tells it to supply --repo
  //     from the intent's recorded set; `prepare` errors without it on a multi-repo
  //     intent, surfacing the choice rather than guessing.
  emitConfiguredSwarm(projectDir, selection.value.pick.units, String(selection.value.pick.batchNumber));
  return { kind: "emitted" };
}

// The SINGLE issuance point for a stage that may fan out. Both `next` paths —
// re-entering the in-flight stage and advancing to the next one — go through
// here, so the plan-integrity judgement exists in one place and cannot drift
// between two copies.
//
// Three ways out, and this function performs no judging of its own: it collects
// the two inputs, hands them to the pure verdict, and emits what the verdict
// names. `ok` is the unchanged fallback to the normal run-stage emit (which
// itself drives the per-unit for_each loop for a per-unit Construction stage).
function emitSwarmOrPerUnit(
  slug: string,
  projectType: "brownfield" | "greenfield" | null,
  scope: string,
  stateContent: string | null,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
  projectDir: string,
): void {
  const outcome = tryEmitSwarm(slug, scope, stateContent, projectDir, recordPrefix, codekbCtx);
  if (outcome.kind === "emitted") return;
  const pendingBatch = outcome.pendingBatch;
  const verdict = planIntegrityVerdict(outcome.decline, pendingBatch);
  // No declared batch means nothing to break, which is why the verdict is `ok`
  // in that case — the two halves of this condition are one rule, and naming
  // the batch here is what lets the message cite it below.
  if (verdict.kind === "ok" || pendingBatch === null) {
    emitForSlug(slug, projectType, scope, stateContent, recordPrefix, codekbCtx, projectDir);
    return;
  }
  const message = planGuardMessage(verdict);
  // Missing canonical Intent autonomy is a recoverable selection question;
  // anything else means the run is breaking its own plan and stops.
  emit(verdict.kind === "redirect" ? askDirective(message) : errorDirective(message));
}

// Emit a run-stage directive for a slug, resolving the graph node first. A slug
// that resolves through the scope/lib helpers but is missing from the graph is
// an internal inconsistency — surface it as an error rather than a crash.
// projectType threads through to the consumes conditional_on filter; scope +
// stateContent thread through to the gate computation (skeleton round-trip) and
// the first-run-stage persona delivery (D-E).
// `unit` defaults to the {unit-name} placeholder — the faithful emission for
// every caller that has no concrete Unit of Work. The degrade path (a scope that
// SKIPs units-generation) passes the unit directory it resolved off disk so the
// emitted paths are real, not placeholder-shaped, and passes its validated kind
// so artifact applicability stays identical to the compiled-DAG path.
function emitRunStageForSlug(
  slug: string,
  projectType: "brownfield" | "greenfield" | null = null,
  scope: string = DEFAULT_SCOPE,
  stateContent: string | null = null,
  recordPrefix: string | null = null,
  codekbCtx?: CodekbCtx,
  unit: string = UNIT_NAME_PLACEHOLDER,
  unitKind?: UnitKind,
): void {
  const node = nodeForSlug(slug);
  if (!node) {
    emit({
      kind: "error",
      message: `Internal: stage "${slug}" resolved by routing but not found in the compiled graph.`,
    });
    return;
  }
  const directive = buildRunStageDirective(
    node,
    projectType,
    unit,
    scope,
    stateContent,
    recordPrefix,
    codekbCtx,
    unitKind,
    stateContent !== null && codekbCtx !== undefined && hasRequiredPerUnitConsumes(node)
      ? readPerUnitConsumePopulation(codekbCtx.projectDir)
      : undefined,
  );
  if (unit !== UNIT_NAME_PLACEHOLDER) directive.unit = unit;
  emit(routeMainWorkflowDirective(directive, stateContent, codekbCtx));
}

// --- Per-unit iteration (issue #368): the engine drives the for_each loop ---
//
// A per-unit Construction stage (for_each: unit-of-work) runs ONCE PER Unit of
// Work, but the state file carries ONE checkbox row per stage slug (the engine
// never duplicates rows, verified). So a single checkbox cannot, on its own,
// track "stage done for 3 of 9 units". The COVERAGE LEDGER is the per-unit
// ARTIFACTS on disk: a unit is "covered" for this stage once all of the stage's
// produces[] exist under <recordPrefix>/construction/<unit>/<slug>/. The engine
// walks the ordered unit list (the compiled Bolt DAG, flattened to topo order),
// finds the FIRST uncovered unit, and emits a run-stage for THAT concrete unit,
// with the gate SUPPRESSED (false) on EVERY not-yet-covered unit. The conductor
// completes the unit's body, writes its artifacts, and re-runs `next` WITHOUT
// reporting; the single checkbox stays in-flight and the engine hands back the
// next uncovered unit. Once the LAST unit's artifacts land on disk, the next
// `next` recovers any missing reviewer verdicts before it presents the real gate
// (see emitPerUnitRunStage's pick === null branch), so the human approves once
// (covering all units, only after every unit is built and reviewed) and the
// checkbox flips.
// No unit DAG (a scope that SKIPs units-generation, or pre-compile) degrades to
// today's single {unit-name} directive, zero behaviour change.

// The ordered Unit-of-Work list for the active intent: the compiled Bolt DAG's
// batches flattened to topological order (each batch is already lexicographically
// sorted by computeBatches). [] when there is no compiled DAG (degrade path).
function orderedUnits(projectDir: string, intent?: string): string[] {
  const batches = readBoltDagBatches(projectDir, intent);
  if (!batches) return [];
  return batches.flat();
}

// The Unit-of-Work directories under <recordPrefix>/construction/, for a scope
// that SKIPs units-generation and therefore has no compiled Bolt DAG to read.
// The directory listing is the ONLY ledger on that path, and it mixes two kinds
// of child: the unit dirs (construction/<unit>/<stage>/) and one diary dir per
// construction stage (construction/<slug>/memory.md, written for every stage
// whether or not it is per-unit). Subtracting the graph's slugs leaves the unit
// set — a unit is never named after a stage. Sorted so the resolution is
// deterministic across filesystems.
function unitDirsUnderConstruction(
  projectDir: string,
  recordPrefix: string | null,
): string[] {
  const prefix = recordPrefix ?? relativeSpaceRecordPrefix();
  const recordRoot = join(projectDir, ...prefix.split("/"));
  return [...degradeUnitDirectories(recordRoot, new Set(loadGraph().map((stage) => stage.slug)))];
}

// Fail-closed refusal when the degrade path cannot name one Unit of Work.
// Emitting the {unit-name} placeholder instead would hand the conductor a
// directive whose produces/consumes paths do not exist and cannot be created
// under that literal name, and the reviewer runtime rejects it downstream.
// Each of the three unmet conditions (no directory at all, several units still
// unwritten, every unit already written) names a DIFFERENT move, so the refusal
// tells the conductor what to do rather than only what went wrong.
function degradeUnitResolutionError(
  slug: string,
  recordPrefix: string | null,
  candidates: string[],
  uncovered: string[],
  completionRefusal: string | null,
): ErrorDirective {
  // Each message part is bound to its own const rather than written as a
  // multi-line `+` concatenation: Bun's LCOV stamps continuation lines of a
  // concatenated expression DA:0, which would report these lines as uncovered
  // however thoroughly they run.
  const prefix = recordPrefix ?? relativeSpaceRecordPrefix();
  const where = `${prefix}/construction/`;
  const preamble = `Stage "${slug}" runs once per Unit of Work, but this workflow has no compiled unit DAG (the scope SKIPs units-generation, or the runtime graph has not been compiled since units-generation shipped)`;
  if (candidates.length === 0) {
    const move = "For a scope that runs units-generation, recompile the runtime graph (bun <harness>/tools/amadeus-runtime.ts compile) to restore the Bolt DAG. For a scope that SKIPs units-generation, create the unit directory for this piece of work (its name becomes the unit segment of every artifact path). Then re-run `next`.";
    return errorDirective(`${preamble} and no unit directory exists under ${where}. ${move}`);
  }
  const found = `${candidates.length} unit directories exist under ${where}: ${candidates.join(", ")}.`;
  if (uncovered.length === 0) {
    const done = "Every one of them already holds this stage's required artifacts, so no unit is left to run.";
    // `completionRefusal` comes from decideDegradeUnitCompletion — the one place
    // that knows WHY the recorded unit-list declaration (issue #2358) did not
    // settle this listing, so the refusal names the move that would.
    const move = completionRefusal ?? "Create the unit directory for this piece of work (its name becomes the unit segment of every artifact path), then re-run `next`.";
    return errorDirective(`${preamble} and ${found} ${done} ${move}`);
  }
  const pending = `${uncovered.length} of them are still missing this stage's required artifacts: ${uncovered.join(", ")}.`;
  const move = "The engine cannot choose between them. Narrow this stage to one unit — finish the other unfinished units' artifacts first, or, when their work has not started, hold off creating their directories — then re-run `next`.";
  return errorDirective(`${preamble} and ${found} ${pending} ${move}`);
}

// True when `unit` is COVERED for `node`: every REQUIRED artifact in
// node.produces[] exists on disk under the resolved per-unit path
// (<recordPrefix>/construction/<unit>/<owner.slug>/<name>.md).
// node.optional_produces[] is deliberately excluded: those artifacts may be
// legitimately absent for a unit. The resolved path
// is workspace-RELATIVE with forward slashes, so we re-root it absolutely under
// projectDir (splitting on "/" so the join is OS-correct). A stage with no
// required produces can never be "covered" by artifacts, but all five per-unit
// stages declare required outputs, so the empty case is unreachable in
// practice; an empty required set remains NOT covered so the engine never
// silently skips a unit it cannot prove it ran.
function unitCovered(
  projectDir: string,
  node: GraphStage,
  unit: string,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
  unitKind?: UnitKind,
): boolean {
  const declared = node.produces ?? [];
  if (declared.length === 0) return false;
  const names = unitKind === undefined
    ? declared
    : requiredArtifactsForUnit(node, unitKind);
  if (names.length === 0) return true;
  for (const name of names) {
    const rel = resolveArtifactPath(name, node, unit, recordPrefix, codekbCtx);
    const abs = join(projectDir, ...rel.split("/"));
    if (!existsSync(abs)) return false;
  }
  return true;
}

// Resolve the Unit of Work for a per-unit stage on the DEGRADE path — the one
// taken when there is no compiled Bolt DAG, so the directory listing under
// <recordPrefix>/construction/ is the only ledger there is (issue #1711).
//
// A single directory names itself. When several exist the listing alone is
// ambiguous, but the stage's own coverage is not: a unit whose REQUIRED
// produces are already on disk has no work left for this stage, so it cannot be
// the unit being asked for. Subtracting those leaves the units still to write,
// and when exactly ONE remains it is the answer (issue #1769) — a multi-unit
// record that grew from an earlier Bolt no longer blocks the current one.
// Otherwise `unit` is null and `uncovered` carries the ambiguity for the
// refusal message to name.
//
// The single-candidate arm deliberately resolves WITHOUT consulting coverage,
// so a lone unit whose artifacts already exist still yields a directive
// (E-OBB2-CG1). That is not a re-run instruction: it is the same move the
// compiled-DAG path makes on its all-covered re-entry (pickUnit === null
// below), where the covered unit carries the stage's REAL gate so the human
// approves once. The asymmetry with the all-covered MULTI-unit arm, which
// refuses, is the presence of ambiguity rather than a different policy on
// finished work — with several finished units the engine cannot say which one
// the gate belongs to.
//
// `unitKinds` mirrors the compiled-DAG call: a stage with produces_kinds
// requires only the artifacts its unit's kind declares, so a kindless lookup
// would hold a finished unit to the full matrix and report it uncovered. The
// map is empty whenever the runtime snapshot carries no unit rows, which is
// the common degrade case, and then coverage falls back to the full matrix.
function resolveDegradeUnit(
  projectDir: string,
  node: GraphStage,
  candidates: string[],
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
  unitKinds: ReadonlyMap<string, UnitKind>,
): { unit: string | null; uncovered: string[] } {
  const uncovered = candidates.filter(
    (u) => !unitCovered(projectDir, node, u, recordPrefix, codekbCtx, unitKinds.get(u)),
  );
  if (candidates.length === 1) return { unit: candidates[0], uncovered };
  if (uncovered.length === 1) return { unit: uncovered[0], uncovered };
  return { unit: null, uncovered };
}

// Emit the stage gate for a degrade listing whose unit set the conductor has
// declared complete (issue #2358). This is the move the compiled-DAG path makes
// on its own all-covered re-entry (pickUnit === null in emitPerUnitRunStage):
// the stage's REAL computed gate, carried on the last covered unit, so the
// human approves once after every unit's artifacts already exist on disk.
function emitDegradeCompletionGate(
  node: GraphStage,
  projectType: "brownfield" | "greenfield" | null,
  scope: string,
  stateContent: string | null,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
  unit: string,
  unitKind: UnitKind | undefined,
): void {
  const directive = buildRunStageDirective(
    node, projectType, unit, scope, stateContent, recordPrefix, codekbCtx, unitKind,
  );
  directive.unit = unit;
  emit(routeMainWorkflowDirective(directive, stateContent, codekbCtx));
}

// Walk the ordered unit list and find the units whose artifacts are not all
// present on disk. Returns {unit, uncovered} where `unit` is the FIRST uncovered
// unit (the one the engine emits next) and `uncovered` is the full ordered list
// of not-yet-covered units (so the caller can name them without re-scanning the
// disk), or null when EVERY unit is already covered (the stage's per-unit work is
// complete; the caller then presents the final gate, see emitPerUnitRunStage).
// Order is the topo order from orderedUnits, so the engine produces unit
// dependencies before their dependents.
function nextUncoveredUnit(
  projectDir: string,
  node: GraphStage,
  units: string[],
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
  unitKinds: ReadonlyMap<string, UnitKind>,
): { unit: string; uncovered: string[] } | null {
  const uncovered = units.filter(
    (u) =>
      !unitCovered(
        projectDir,
        node,
        u,
        recordPrefix,
        codekbCtx,
        unitKinds.get(u),
      ),
  );
  if (uncovered.length === 0) return null;
  return { unit: uncovered[0], uncovered };
}

// A reviewer verdict is projected onto the first required output path. This is
// the same observable contract enforced by amadeus-state.ts at approval time,
// but `next` checks it earlier so a covered unit can be recovered before the
// conductor reaches a terminal gate refusal (#2836).
function directiveCarriesReview(
  projectDir: string,
  directive: RunStageDirective,
): boolean {
  const optional = new Set(directive.optional_produces ?? []);
  const primary = directive.produces.find((path) => !optional.has(path));
  if (primary === undefined) return true;
  try {
    return hasDurableReviewProjection(
      readFileSync(join(projectDir, ...primary.split("/")), "utf-8"),
      directive.reviewer!,
    );
  } catch {
    return false;
  }
}

function buildReviewerRecoveryDirective(
  node: GraphStage,
  projectType: "brownfield" | "greenfield" | null,
  unit: string,
  scope: string,
  stateContent: string | null,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
  projectDir: string,
  unitKind: UnitKind | undefined,
): RunStageDirective | null {
  const directive = buildRunStageDirective(
    node, projectType, unit, scope, stateContent, recordPrefix, codekbCtx, unitKind,
  );
  directive.unit = unit;
  if (directive.reviewer === undefined || directiveCarriesReview(projectDir, directive)) {
    return null;
  }
  directive.gate = false;
  directive.review_only = true;
  delete directive.next_stage;
  return directive;
}

function firstReviewerRecoveryDirective(
  node: GraphStage,
  projectType: "brownfield" | "greenfield" | null,
  units: string[],
  scope: string,
  stateContent: string | null,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
  projectDir: string,
  unitKinds: ReadonlyMap<string, UnitKind>,
): RunStageDirective | null {
  for (const unit of units) {
    const recovery = buildReviewerRecoveryDirective(
      node, projectType, unit, scope, stateContent, recordPrefix, codekbCtx,
      projectDir, unitKinds.get(unit),
    );
    if (recovery !== null) return recovery;
  }
  return null;
}

function reviewerRecoveryForCoveredUnit(
  node: GraphStage,
  projectType: "brownfield" | "greenfield" | null,
  picked: ReturnType<typeof resolveDegradeUnit>,
  scope: string,
  stateContent: string | null,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
  projectDir: string,
  unitKind: UnitKind | undefined,
): RunStageDirective | null {
  if (picked.unit === null || picked.uncovered.includes(picked.unit)) return null;
  return buildReviewerRecoveryDirective(
    node, projectType, picked.unit, scope, stateContent, recordPrefix, codekbCtx,
    projectDir, unitKind,
  );
}

// What the engine has observed about ONE Unit at this stage, or undefined while
// it has nothing to record. Both values come from the engine's own observations
// and nothing else: cancellation from the canonical Construction projection —
// the very set cancelledConstructionUnits resolves — and success from the
// coverage of the stage's required artifacts on disk. No conductor-supplied
// verdict reaches this row.
//
// Cancellation is read FIRST, so the coverage predicate gates the `succeeded`
// arm alone (#3106): the ruling has already reached its verdict, and whether the
// abandoned Unit's artifacts happen to survive on disk cannot change it. Gating
// it on coverage would leave exactly the Units whose work was abandoned with no
// outcome at all — the shape that stopped consumers with producer-outcome-pending.
function observedUnitOutcome(
  projectDir: string,
  node: GraphStage,
  unit: string,
  cancelledUnits: ReadonlySet<string>,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
  unitKind: UnitKind | undefined,
): SettledUnitOutcomeValue | undefined {
  if (cancelledUnits.has(unit)) return "cancelled";
  return unitCovered(projectDir, node, unit, recordPrefix, codekbCtx, unitKind)
    ? "succeeded"
    : undefined;
}

// The 1-origin batch identity each Unit is recorded under, first occurrence
// wins — the same number the consume population joins its rows on.
function batchIdentityOfUnits(batches: readonly (readonly string[])[]): Map<string, string> {
  const batchOf = new Map<string, string>();
  for (const [index, batchUnits] of batches.entries()) {
    for (const unit of batchUnits) {
      if (!batchOf.has(unit)) batchOf.set(unit, String(index + 1));
    }
  }
  return batchOf;
}

// Every settled row already on the ledger, grouped by the triple it settles and
// kept in the reader's supersession order, so the emitter can ask what the last
// observation of one Unit at one stage was.
function settledOutcomeHistory(projectDir: string): Map<string, SettledUnitOutcome[]> {
  const history = new Map<string, SettledUnitOutcome[]>();
  for (const row of readSettledUnitOutcomes(projectDir)) {
    const triple = perUnitOutcomeTriple(row.stage, row.unit, row.batch);
    const rows = history.get(triple) ?? [];
    rows.push(row);
    history.set(triple, rows);
  }
  return history;
}

// Append the engine's own outcome row for every Unit of this stage whose
// terminal state it can observe: covered (#3099) or cancelled (#3106). Emission
// is keyed by stage + Unit + batch + revision and reads the existing rows first,
// so re-running `next` over an unchanged observation appends nothing while a
// changed one lands as the revision that supersedes it. A Unit outside the
// compiled batches has no batch identity to record under and is skipped: the
// consume population joins on that identity, and a row it cannot join is a row
// no reader can use.
//
// There is deliberately no `failed` arm. A solo terminal `failed` carries its
// batch closure out of the same normalization step that records it, so it is
// always an UNRESOLVED failure — emitConstructionFailureIfPresent resolves it to
// await-unit-ruling and stops `next` above, before the per-unit loop reaches
// here (measured on the per-unit fixture: the producing stage answers `ask` and
// the ledger holds zero settled rows). The ruling is the only way out, and it
// leaves the Unit retried, cancelled, or the workflow parked — never failed and
// settled. Writing an arm no series can reach would be test theatre; the reader
// still knows the value, because the downstream fan-out does.
function settlePerUnitOutcomes(
  projectDir: string,
  node: GraphStage,
  units: string[],
  cancelledUnits: ReadonlySet<string>,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
  unitKinds: ReadonlyMap<string, UnitKind>,
): void {
  const batches = loadRuntimeUnitBatches(projectDir);
  if (batches === null) return;
  const batchOf = batchIdentityOfUnits(batches);
  const history = settledOutcomeHistory(projectDir);
  for (const unit of units) {
    const batch = batchOf.get(unit);
    if (batch === undefined) continue;
    const outcome = observedUnitOutcome(
      projectDir, node, unit, cancelledUnits, recordPrefix, codekbCtx, unitKinds.get(unit),
    );
    if (outcome === undefined) continue;
    const triple = perUnitOutcomeTriple(node.slug, unit, batch);
    const recorded = history.get(triple) ?? [];
    if (recorded[recorded.length - 1]?.outcome === outcome) continue;
    const revision = recorded.reduce((highest, row) => Math.max(highest, row.revision), 0) + 1;
    const key = perUnitOutcomeKey(node.slug, unit, batch, revision);
    emitAuditEventGuarded(
      "UNIT_OUTCOME_SETTLED",
      { Stage: node.slug, Unit: unit, Batch: batch, Outcome: outcome, "Idempotency Key": key },
      projectDir,
    );
    recorded.push({ stage: node.slug, unit, batch, outcome, key, revision });
    history.set(triple, recorded);
  }
}

function selectNextConstructionUnit(
  node: GraphStage,
  scope: string,
  units: readonly string[],
  cancelledUnits: ReadonlySet<string>,
  projectDir: string,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
  unitKinds: ReadonlyMap<string, UnitKind>,
  stateContent: string | null,
): string | null {
  const constructionStages = subgraphForScope(scope).filter(
    (candidate) => candidate.phase === "construction",
  );
  const constructionStageBySlug = new Map(
    constructionStages.map((candidate) => [candidate.slug, candidate] as const),
  );
  const cancelledByStage = new Map(
    constructionStages.map((candidate) => [
      candidate.slug,
      candidate.slug === node.slug
        ? cancelledUnits
        : cancelledConstructionUnits(projectDir, candidate.slug),
    ] as const),
  );
  return selectNextUnitForStage(
    node.slug,
    units,
    (u, candidateStage) => {
      const candidateNode = constructionStageBySlug.get(candidateStage);
      if (candidateNode === undefined) return false;
      return (
        cancelledByStage.get(candidateStage)?.has(u) === true ||
        unitCovered(
          projectDir,
          candidateNode,
          u,
          recordPrefix,
          codekbCtx,
          unitKinds.get(u),
        )
      );
    },
    readConstructionIteration(stateContent),
    constructionStages.map((candidate) => candidate.slug),
  );
}

// Emit ONE iteration of a per-unit Construction stage. The engine owns the
// for_each loop here: it resolves the next uncovered unit, substitutes the real
// unit name for {unit-name} in every path, and suppresses the gate for EVERY
// not-yet-covered unit. The stage's real gate is presented exactly once, on the
// all-covered-and-reviewed re-entry (pick === null), after the last unit's
// artifacts and every reviewer verdict exist on disk. See the ledger note above
// emitRunStageForSlug's per-unit section.
function emitPerUnitRunStage(
  node: GraphStage,
  projectType: "brownfield" | "greenfield" | null,
  scope: string,
  stateContent: string | null,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
  projectDir: string,
): void {
  // GATE precedence: never iterate per-unit until the walking-skeleton gate is
  // RESOLVED. If this is the skeleton-gate stage and no stance is recorded yet,
  // buildRunStageDirective would emit gate:"unresolved" (the classify
  // round-trip). The conductor must classify the stance FIRST, there is no
  // per-unit work to do while the gate is undetermined, so emit the normal
  // single directive (with the {unit-name} placeholder + the unresolved gate)
  // and return. The follow-up `next` (after `report --skeleton-stance`) resolves
  // the gate and re-enters here to begin per-unit iteration.
  if (isSkeletonGateStage(node, scope) && readSkeletonStance(stateContent) === null) {
    emitRunStageForSlug(node.slug, projectType, scope, stateContent, recordPrefix, codekbCtx);
    return;
  }

  // No compiled unit DAG (a scope that SKIPs units-generation, refactor /
  // security-patch / infra / fix / poc, or a pre-compile moment). There is no
  // DAG to iterate, but the stage is still per-unit, so its artifacts still
  // belong under construction/<unit>/. The unit directory on disk is the ledger
  // (issue #1711): resolve it through resolveDegradeUnit and emit REAL paths. A
  // listing the coverage cannot narrow to one unit is refused rather than
  // papered over with the {unit-name} placeholder — an unresolved placeholder
  // path can neither be produced nor consumed, and the reviewer runtime rejects
  // it downstream.
  const units = orderedUnits(projectDir);
  const unitKinds = readUnitKinds(projectDir);
  const cancelledUnits = cancelledConstructionUnits(projectDir, node.slug);
  if (units.length === 0) {
    const degradeUnits = unitDirsUnderConstruction(projectDir, recordPrefix);
    const picked = resolveDegradeUnit(
      projectDir, node, degradeUnits, recordPrefix, codekbCtx, unitKinds,
    );
    if (picked.unit === null) {
      // Multi-unit arm only: every candidate is already covered, so the listing
      // holds no work — the ONLY thing missing is the conductor's word that no
      // further unit is coming (issue #2358, ruling #2385 Q4-B). The covered set
      // handed to the decision is `degradeUnits` itself, which in this arm IS
      // the set `unitCovered` just proved covered (uncovered is empty); the
      // decision compares it against the recorded declaration and, when they
      // match, names the unit the stage gate belongs to.
      const completion = degradeUnits.length > 0 && picked.uncovered.length === 0
        ? decideDegradeUnitCompletion(parseDegradeUnitDeclaration(stateContent), degradeUnits)
        : null;
      if (completion !== null && completion.kind === "gate") {
        const recovery = firstReviewerRecoveryDirective(
          node, projectType, degradeUnits, scope, stateContent, recordPrefix,
          codekbCtx, projectDir, unitKinds,
        );
        if (recovery !== null) {
          emit(recovery);
          return;
        }
        emitDegradeCompletionGate(
          node, projectType, scope, stateContent, recordPrefix, codekbCtx,
          completion.unit, unitKinds.get(completion.unit),
        );
        return;
      }
      const refusal = completion !== null && completion.kind === "refuse" ? completion.reason : null;
      emit(degradeUnitResolutionError(node.slug, recordPrefix, degradeUnits, picked.uncovered, refusal));
      return;
    }
    const recovery = reviewerRecoveryForCoveredUnit(
      node, projectType, picked, scope, stateContent, recordPrefix, codekbCtx,
      projectDir, unitKinds.get(picked.unit),
    );
    if (recovery !== null) {
      emit(recovery);
      return;
    }
    emitRunStageForSlug(
      node.slug,
      projectType,
      scope,
      stateContent,
      recordPrefix,
      codekbCtx,
      picked.unit,
      unitKinds.get(picked.unit),
    );
    return;
  }

  // Settle the outcome of every Unit this stage has already covered (#3099).
  // The per-unit path is the ONLY dispatch route for a units-generation scope
  // that does not swarm, and it used to leave no outcome behind: the per-unit
  // consume population reads terminal outcomes, so every downstream consumer
  // refused a completed Construction with producer-outcome-pending. The
  // coverage boundary this loop already observes is where the outcome becomes a
  // fact, so that is where it is recorded — forward, at the moment it is
  // observed, never back-dated onto the ledger.
  settlePerUnitOutcomes(
    projectDir, node, units, cancelledUnits, recordPrefix, codekbCtx, unitKinds,
  );

  // Delegate next-unit selection to the canonical construction-iteration seam.
  const pickUnit = selectNextConstructionUnit(
    node,
    scope,
    units,
    cancelledUnits,
    projectDir,
    recordPrefix,
    codekbCtx,
    unitKinds,
    stateContent,
  );
  if (pickUnit === null) {
    // Every unit is already covered, but the checkbox is still in-flight: the
    // conductor wrote the LAST unit's artifacts and re-ran `next` to settle the
    // stage. There is nothing left to PRODUCE, so present the stage gate now (its
    // REAL computed gate) on the last unit, so the human approves once and the
    // engine advances. This is the ONLY directive on which the gate fires, so the
    // approval is reached only after every unit's artifacts and reviewer verdict
    // exist (closing both last-unit holes). It is also
    // the re-entry after a "request changes" that re-ran a unit and then
    // everything is covered again.
    const recovery = firstReviewerRecoveryDirective(
      node, projectType, units, scope, stateContent, recordPrefix, codekbCtx,
      projectDir, unitKinds,
    );
    if (recovery !== null) {
      emit(recovery);
      return;
    }
    const lastUnit = units[units.length - 1];
    const directive = buildRunStageDirective(
      node, projectType, lastUnit, scope, stateContent, recordPrefix, codekbCtx,
      unitKinds.get(lastUnit),
    );
    directive.unit = lastUnit;
    emit(routeMainWorkflowDirective(directive, stateContent, codekbCtx));
    return;
  }

  const directive = buildRunStageDirective(
    node, projectType, pickUnit, scope, stateContent, recordPrefix, codekbCtx,
    unitKinds.get(pickUnit),
  );
  // Suppress the gate on EVERY not-yet-covered unit. A per-unit directive with an
  // uncovered unit carries gate:false: the conductor completes the body, writes
  // the unit's artifacts, and re-runs `next` (NO report-approve), so the checkbox
  // stays in-flight and the engine emits the next uncovered unit. Once the LAST
  // unit's artifacts land on disk, the next `next` takes the pickUnit === null
  // branch above and presents the stage's real gate, so the single human approval
  // covers the whole stage only after all units are built. We override AFTER
  // building so the rest of the directive (paths, reviewer, persona) is unchanged.
  directive.gate = false;
  // An uncovered per-unit iteration step is NOT an approval gate, so it carries no
  // next_stage (FR-2 item 10 projects it only on gate-carrying directives). Remove
  // the field buildRunStageDirective set while the gate was still true — a present
  // `next_stage: undefined` key would trip the emit-time directive validator.
  delete directive.next_stage;
  directive.unit = pickUnit;
  emit(directive);
}

// Route a slug to its emit path: a per-unit Construction stage drives the
// engine's for_each loop (emitPerUnitRunStage); every other stage emits the
// single {unit-name}-or-non-per-unit directive (emitRunStageForSlug). Called
// from BOTH handleNext sites AFTER tryEmitSwarm has returned false, so
// autonomous code-gen still swarms and only the non-swarm path reaches here.
function emitForSlug(
  slug: string,
  projectType: "brownfield" | "greenfield" | null,
  scope: string,
  stateContent: string | null,
  recordPrefix: string | null,
  codekbCtx: CodekbCtx,
  projectDir: string,
): void {
  // Plugin advisories are raised here — the
  // MAIN-WORKFLOW call site — just before this stage's directive is emitted. The
  // `--single` path raises them at its own site (emitSingleRunStage); the run
  // latch is what keeps the two from repeating each other.
  raisePluginAdvisoriesFor(slug, projectDir);
  const node = nodeForSlug(slug);
  if (node && isPerUnit(node)) {
    emitPerUnitRunStage(node, projectType, scope, stateContent, recordPrefix, codekbCtx, projectDir);
    return;
  }
  emitRunStageForSlug(slug, projectType, scope, stateContent, recordPrefix, codekbCtx);
}

// --- --single stage-runner mode ---
//
// Emit the lone run-stage directive for a `--single` stage-runner invocation. A
// single-stage run is deliberately ISOLATED from any main workflow: it computes
// the directive purely from the graph node + scope, passing `stateContent: null`
// so neither the skeleton round-trip nor the main-pointer-derived persona signal
// reads the main state file. The pointer rule is the whole point — a single-stage
// run must leave the main workflow's `Current Stage` exactly where it was, so it
// never consults or mutates that pointer. We then attach the conductor persona
// unconditionally, because for a stage-runner THIS is the conductor's first (and
// only) directive of the invocation — the same D-E delivery the orchestrator's
// first run-stage gets (per the engine design), just keyed on "first of this single run"
// rather than "first of the workflow".
//
// Guards, in order: the stage must exist in the compiled graph; an initialization
// stage is rejected (bootstrap stages create/scaffold state — they have no
// isolated single-stage meaning, mirroring the jump init-guard); and the stage
// must be a member of the scope's EXECUTE-only sub-DAG (a SKIP-for-scope stage is
// not runnable, relayed with the verbatim skip wording the jump path uses, so the
// directive stream is identical regardless of entry point).
const SINGLE_INIT_ERROR =
  "Cannot run an initialization stage with --single. Initialization is bootstrap (it births the intent + state); it runs automatically when you start a workflow (describe what to build, e.g. /amadeus \"build the auth service\").";

function emitSingleRunStage(
  slug: string,
  scope: string,
  projectType: "brownfield" | "greenfield" | null,
  recordPrefix: string | null = null,
  codekbCtx?: CodekbCtx,
  // depth — resolved by the CALLER from the live state, threaded as a value
  // rather than read here. This path deliberately passes stateContent: null to
  // buildRunStageDirective (no routing read), but depth is workflow
  // CONFIGURATION, not routing: a `--stage` jump or `--single` run inside a live
  // workflow must still deliver the state's **Depth**, or a `--depth` override
  // would be silently replaced by the scope default. Undefined (no state) leaves
  // buildRunStageDirective's scope-default fallback in charge.
  depth?: DepthLevel,
): void {
  const node = nodeForSlug(slug);
  if (!node) {
    emit(errorDirective(
      `Unknown stage "${slug}". Run /amadeus --help for the full list.`,
    ));
    return;
  }
  if (node.phase === "initialization") {
    emit(errorDirective(SINGLE_INIT_ERROR));
    return;
  }
  // Empty-scope stages are explicit capabilities and remain directly runnable.
  const isOptInStage = (node.scopes ?? []).length === 0;
  const inScopeSlugs = new Set(subgraphForScope(scope).map((s) => s.slug));
  if (!isOptInStage && !inScopeSlugs.has(node.slug)) {
    emit(errorDirective(
      `Stage "${node.slug}" is skipped for scope "${scope}". ` +
        "Choose a different stage or change scope.",
    ));
    return;
  }
  // Evaluate plugin declarations only after the requested stage is known to be
  // runnable, immediately before its directive is built.
  raisePluginAdvisoriesFor(slug, resolveProjectDir(_handlerProjectDir));
  // Build the directive from the graph node alone (stateContent: null → no main
  // state read, no skeleton round-trip, no main-pointer persona signal), then
  // attach the persona explicitly: this is the conductor's first directive of the
  // single run, so D-E delivery applies.
  const directive = buildRunStageDirective(
    node,
    projectType,
    UNIT_NAME_PLACEHOLDER,
    scope,
    null,
    recordPrefix,
    codekbCtx,
  );
  directive.gate = resolveSingleGate(directive.gate);
  if (depth !== undefined) directive.depth = depth;
  if (directive.conductor_persona === undefined) {
    const persona = readConductorPersona();
    if (persona !== null) directive.conductor_persona = persona;
  }
  emit(directive);
}

// Resolve an explicit --stage / --phase jump and emit the resulting directive.
//
// A jump against an EXISTING workflow is a MUTATION: it marks intervening
// stages [S] (forward), resets downstream stages (backward), emits STAGE_JUMPED,
// and pivots Current Stage. `next` is read-only and never mutates, so — exactly
// like the scope-change (Branch 5) and config-change branches, which emit a
// `print` directive naming a CLI tool for the conductor to run — the WITH-STATE
// jump path emits a `print` naming `amadeus-jump.ts execute`. The conductor runs
// that mutating tool, then re-runs `next`; the next `next` reads the pivoted
// state and naturally emits the run-stage for the now-current target. This
// composes the existing CLI-only `execute` handler (no new directive field, no
// jump vocabulary in `report`, and `next` stays read-only).
//
// The conductor RELAYS the human's jump target; the engine SUPPLIES the
// resolved facts. It shells out to `amadeus-jump.ts resolve` (a pure read) —
// that handler both validates the target is in-scope for the scope (rejecting a
// SKIP stage with its VERBATIM `Stage "..." is skipped for scope "...".`
// message) AND computes the forward/backward/redo direction at
// amadeus-jump.ts:142-145. We relay a rejection verbatim and, on success, compose
// the `execute` command with the tool's own `target_slug` + `direction`.
// Re-deriving the SKILL.md:191-193 comparison by hand would be an LLM-shaped
// move; delegating it to the tool is the deterministic one.
//
// resolve REQUIRES a state file (it reads `Current Stage` to anchor the
// direction). With no workflow yet, there is no position to jump FROM — the
// direction is undefined, and there are no intervening stages to skip or reset,
// so a jump is really just "start here". That NO-STATE path falls back to a
// direct graph lookup that names the requested target (the prose's "or 0.3 if
// freshly initialized" degenerate case) and emits a plain run-stage — it is NOT
// a commit, so it does not route through `execute`.
// SKILL.md step 5 (Initialization guard) verbatim: jumping to an initialization
// stage — or `--phase initialization` — is rejected. Init stages have bootstrap
// behavior (create the state file, scaffold dirs) that doesn't fit the jump
// model; the user must run `/amadeus --init`. The guard is prose-only in SKILL.md
// (`amadeus-jump.ts resolve` treats init stages as valid targets, returning
// valid:true), so the engine enforces it here rather than relaying a tool error.
const INIT_JUMP_ERROR =
  "Cannot jump to initialization stages. The Initialization phase runs automatically when you start a workflow (describe what to build, e.g. /amadeus \"build the auth service\").";

function emitJumpDirective(
  flags: ParsedFlags,
  scope: string,
  projectDir: string,
  projectType: "brownfield" | "greenfield" | null = null,
  projectDirSource: ProjectDirSource,
): void {
  // --phase initialization is rejected up front (applies with or without state).
  if (flags.phase && canonicalisePhase(flags.phase) === "initialization") {
    emit(errorDirective(INIT_JUMP_ERROR));
    return;
  }

  const hasState = existsSync(stateFilePath(projectDir));

  if (hasState) {
    const resolveArgs = ["resolve", "--scope", scope, "--project-dir", projectDir];
    if (flags.phase) resolveArgs.push("--phase", flags.phase);
    else if (flags.stage) resolveArgs.push("--stage", flags.stage);

    const run = runTool(projectDir, "amadeus-jump.ts", resolveArgs);
    if (!run.ok) {
      // SKIP-for-scope, unknown stage/phase, etc. — relay the tool's verbatim
      // error (it owns the wording the rest of the framework asserts on).
      emit(errorDirective(toolErrorMessage(run)));
      return;
    }
    const resolved = parseResolved(run.stdout);
    if (!resolved) {
      emit(errorDirective(
        `Internal: amadeus-jump.ts resolve returned no target_slug/direction for ${flags.phase ? `--phase ${flags.phase}` : `--stage ${flags.stage}`}.`,
      ));
      return;
    }
    const { targetSlug, direction } = resolved;
    // resolve validates SKIP/unknown but NOT the init-stage guard — enforce it
    // on the resolved target (covers --stage <init> against existing state).
    const targetNode = nodeForSlug(targetSlug);
    if (targetNode && targetNode.phase === "initialization") {
      emit(errorDirective(INIT_JUMP_ERROR));
      return;
    }
    // Committing the jump is a MUTATION — name the move (print) and let the
    // conductor run `execute`, exactly as scope-change/config-change do. The
    // command carries the tool-resolved direction so `execute` skips/resets the
    // right stages, emits STAGE_JUMPED, and pivots Current Stage. After the
    // conductor runs it, the NEXT `next` sees the pivoted state and emits the
    // run-stage for the now-current target.
    emit(printDirective(
      `Run \`bun ${harnessDir()}/tools/amadeus-jump.ts execute --target ${targetSlug} --direction ${direction} --scope ${scope}\` to perform the jump, then re-run \`next\` to continue from the jump target.`,
    ));
    return;
  }

  // No state file — resolve cannot compute a direction. Name the requested
  // target directly off the graph (the no-position behaviour is preserved from
  // the read-only `next` baseline this branch extends).
  if (flags.phase) {
    const canonical = canonicalisePhase(flags.phase);
    if (!canonical) {
      emit(errorDirective(
        `Unknown phase "${flags.phase}". Valid phases: ${PHASES.join(", ")}.`,
      ));
      return;
    }
    const first = firstInScopeStageOfPhase(canonical, scope);
    if (!first) {
      emit(errorDirective(
        `Phase "${canonical}" has no executable stages for scope "${scope}".`,
      ));
      return;
    }
    // No-state jump: pass scope for the gate computation; stateContent stays
    // null (no workflow yet → no skeleton round-trip, no persona delivery —
    // both correct, this is a degenerate "start here" before init). recordPrefix
    // resolves the active intent's relative dir (null on a fresh workspace). The
    // codekb ctx is computed from the same live projectDir (no handleNext-cached
    // value reaches this inline site), so a codekb stage jumped-to here still
    // resolves under amadeus/spaces/<space>/codekb/<repo>/.
    emitRunStageForSlug(
      first.slug,
      projectType,
      scope,
      null,
      relativeRecordDir(projectDir),
      codekbCtxFor(projectDir, projectDirSource),
    );
    return;
  }

  // flags.stage (guaranteed by the caller's `phase || stage` guard).
  const stageSlug = flags.stage ?? "";
  const node = nodeForSlug(stageSlug);
  if (!node) {
    emit(errorDirective(
      `Unknown stage "${stageSlug}". Run /amadeus --help for the full list.`,
    ));
    return;
  }
  // Init-stage guard applies on the no-state path too (SKILL.md step 5).
  if (node.phase === "initialization") {
    emit(errorDirective(INIT_JUMP_ERROR));
    return;
  }
  // Scope-membership guard (Wave-1 audit finding 3). The with-state path gets
  // SKIP validation for free from `amadeus-jump.ts resolve`, but resolve REQUIRES
  // a state file, so this no-state branch did a bare graph lookup with no
  // in-scope check — emitting run-stage for a stage the scope SKIPs (e.g.
  // `next --scope fix --stage user-stories`). Mirror the with-state error by
  // testing membership against the scope's EXECUTE-only sub-DAG; relay the
  // verbatim skip wording resolve uses (amadeus-jump.ts:118) so the directive
  // stream is identical regardless of whether state exists yet.
  const inScopeSlugs = new Set(subgraphForScope(scope).map((s) => s.slug));
  if (!inScopeSlugs.has(node.slug)) {
    emit(errorDirective(
      `Stage "${node.slug}" is skipped for scope "${scope}". ` +
        "Choose a different stage or change scope.",
    ));
    return;
  }
  // No-state jump: scope feeds the gate; stateContent is null (no workflow yet).
  // codekb ctx computed off the same live projectDir as the inline recordPrefix
  // (same rationale as the --phase inline site above).
  emit(
    buildRunStageDirective(
      node,
      projectType,
      UNIT_NAME_PLACEHOLDER,
      scope,
      null,
      relativeRecordDir(projectDir),
      codekbCtxFor(projectDir, projectDirSource),
    ),
  );
}

// Pull `target_slug` AND `direction` out of `amadeus-jump.ts resolve`'s stdout
// JSON. resolve emits both fields (amadeus-jump.ts:168-180) — the engine needs
// the slug to name the target and the direction to compose the `execute` commit
// directive (forward marks intervening stages [S]; backward resets downstream;
// redo resets only the target). Returns null when the payload is unparseable or
// missing either field, so the caller surfaces a clean internal error rather
// than composing a half-specified jump command.
function parseResolved(
  stdout: string,
): { targetSlug: string; direction: string } | null {
  try {
    const parsed: unknown = JSON.parse(stdout.trim());
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "target_slug" in parsed &&
      typeof (parsed as { target_slug: unknown }).target_slug === "string" &&
      "direction" in parsed &&
      typeof (parsed as { direction: unknown }).direction === "string"
    ) {
      const p = parsed as { target_slug: string; direction: string };
      return { targetSlug: p.target_slug, direction: p.direction };
    }
  } catch {
    // unparseable — fall through to null
  }
  return null;
}

// Look up a slug's checkbox state from the parsed list. Returns undefined when
// the slug has no checkbox row (a freshly-targeted stage).
function checkboxStateOf(
  checkboxes: CheckboxLine[],
  slug: string,
): CheckboxLine["state"] | undefined {
  return checkboxes.find((c) => c.slug === slug)?.state;
}

// Canonicalise a phase token (name or number) to its canonical name, or null.
// Implemented in amadeus-lib.ts ownPhase (#744 / #833).
export { ownPhase };

const canonicalisePhase = (input: string): string | null => ownPhase(input);

// --- report: commit the transition (the engine's WRITE half) ---
//
// `report` records what happened after the conductor acted on a directive, so
// the next `next` reads fresh state. It is a dispatcher over amadeus-state.ts's
// transition subcommands and reimplements none of their transition logic.
// Those subcommands are CLI-only (amadeus-state.ts
// exports nothing); importing a handle* function is a hard build failure, so
// the only seam is the argv dispatch — Bun.spawnSync the subcommand.
//
// Why no withAuditLock here: each spawned amadeus-state.ts subcommand is already
// atomic — it does its own per-emit OS mkdir-lock acquire/release in its own
// process. The engine's withAuditLock would NOT span that subprocess (the lock
// is per-process), so wrapping the spawn in one buys nothing. The engine holds
// a lock only if it emits its OWN in-process audit row, which report does not —
// it delegates every emission to the already-atomic subcommand.
//
// The dispatch choice is the engine's small ADDED decision rule (mirroring the
// `next` decision rule): map the acted stage to its committing subcommand by
// GATE STATUS first, then finality.
//   - gated stage   -> `approve`. approve OWNS the full transition: it emits
//                      GATE_APPROVED + STAGE_COMPLETED and then self-delegates
//                      in-process to advance (non-final) or complete-workflow
//                      (final). We must NOT also call advance after approve
//                      (SKILL.md: "approve owns the full transition — do not
//                      call advance after approve"). Branching on finality here
//                      would double-dispatch a final gated stage. When an
//                      explicit --stage report finds the stage still active,
//                      report first opens the missing gate, then approves.
//   - non-gated, not the final in-scope stage -> `advance`.
//   - non-gated, final in-scope stage          -> `complete-workflow`.
// Gate status is the same axis `next` uses to build a run-stage directive: only
// the bootstrap initialization stages auto-proceed with no gate; every other
// EXECUTE stage gates. Finality is "no in-scope stage remains after this one".

// The outcomes `report --result` accepts. A forward commit reports that the
// stage the conductor just worked on succeeded; `approved` and `completed` are
// accepted synonyms for that verdict (the conductor naturally says "approved"
// at a gate and "completed" for a non-gated stage). The engine — not the
// caller — picks the committing subcommand from gate status + finality, so the
// two synonyms are interchangeable; what matters is that a verdict was given.
// Reject/revise are NOT report outcomes: report commits FORWARD transitions
// only (the reject path stays in the prose orchestrator's gate handling).
const FORWARD_RESULTS = new Set(["approved", "completed", "complete", "done"]);

interface ReportFlags {
  result?: string;
  userInput?: string;
  targetIntentId?: string;
  presenceReservationId?: string;
  reason?: string;
  skeletonStance?: string; // the classify round-trip's classified stance
  single?: boolean; // --single: commit a synthetic-id STAGE_STARTED/COMPLETED pair, never the main pointer
  stage?: string; // --stage <slug>: the acted stage (required under --single; preferred for main workflow reports)
  mirrorBoundary?: string;
  failure?: string; // --failure <detail>: the typed failure a stage's referee returned, admitted to Quality Repair
}

// Extract report's flags. --result is the verdict; --user-input rides through
// to approve's GATE_APPROVED row; --reason rides through to complete-workflow.
// --skeleton-stance carries the conductor's classified walking-skeleton stance
// (the classify round-trip): it does NOT commit a transition — it records the
// stance so the next `next` resolves the deferred gate.
function parseReportFlags(args: string[]): ReportFlags {
  const flags: ReportFlags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--result" && i + 1 < args.length) {
      flags.result = args[i + 1];
      i++;
    } else if (a === "--user-input" && i + 1 < args.length) {
      flags.userInput = args[i + 1];
      i++;
    } else if (a === "--reason" && i + 1 < args.length) {
      flags.reason = args[i + 1];
      i++;
    } else if (a === "--target-intent-id") {
      flags.targetIntentId = args[i + 1] ?? "";
      if (i + 1 < args.length) i++;
    } else if (a === "--presence-reservation-id") {
      flags.presenceReservationId = args[i + 1] ?? "";
      if (i + 1 < args.length) i++;
    } else if (a === "--skeleton-stance" && i + 1 < args.length) {
      flags.skeletonStance = args[i + 1];
      i++;
    } else if (a === "--stage" && i + 1 < args.length) {
      flags.stage = args[i + 1];
      i++;
    } else if (a === "--mirror-boundary" && i + 1 < args.length) {
      flags.mirrorBoundary = args[i + 1];
      i++;
    } else if (a === "--failure" && i + 1 < args.length) {
      flags.failure = args[i + 1];
      i++;
    } else if (a === "--single") {
      flags.single = true;
    }
  }
  return flags;
}

// Shell out to a sibling amadeus-state.ts subcommand. Resolves the tool relative
// to this file so the engine and the tool it drives stay co-located. Returns
// the child's exitCode + captured streams; a non-zero exitCode means
// amadeus-state.ts rejected the transition via error() (which exits non-zero),
// and the engine surfaces that as an error directive rather than a silent miss.
function spawnState(
  projectDir: string,
  subArgs: string[],
): { exitCode: number; stdout: string; stderr: string } {
  const toolPath = fileURLToPath(new URL("./amadeus-state.ts", import.meta.url));
  const result = observeSubprocessSpan(projectDir, `amadeus-state:${subArgs[0] ?? "?"}`, () =>
    Bun.spawnSync({
      cmd: ["bun", "run", toolPath, ...subArgs, "--project-dir", projectDir],
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    }),
  );
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

// Shell out to `amadeus-audit.ts append <event> [--field k=v ...]` — the audit
// CLI's atomic, lock-acquiring append. The `--single` synthetic-pair emission
// (handleSingleReport below) uses this, mirroring report's spawn-the-atomic-tool
// discipline: the engine itself writes nothing; the spawned tool acquires the
// per-emit audit lock in its own process. This is the audit-only path — it
// touches the audit shard, never `amadeus-state.md` — so a `--single` commit cannot
// reach the main pointer even by accident (amadeus-audit.ts has no state write).
function spawnAuditAppend(
  projectDir: string,
  eventType: string,
  fields: Record<string, string>,
): { exitCode: number; stdout: string; stderr: string } {
  const auditTool = fileURLToPath(new URL("./amadeus-audit.ts", import.meta.url));
  const fieldArgs: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    fieldArgs.push("--field", `${k}=${v}`);
  }
  const result = observeSubprocessSpan(projectDir, "amadeus-audit:append", () =>
    Bun.spawnSync({
      cmd: ["bun", "run", auditTool, "append", eventType, ...fieldArgs, "--project-dir", projectDir],
      stdout: "pipe",
      stderr: "pipe",
    }),
  );
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

// Record the conductor's classified walking-skeleton stance (the classify
// round-trip's hand-back) and name the next move. Validates the stance value,
// confirms a workflow exists AND its current stage is the skeleton-gate stage
// awaiting an unresolved gate (so a stray stance report cannot scribble the
// field at the wrong moment), writes the `Skeleton Stance` field via the atomic
// `amadeus-state.ts set` subcommand, then emits a `print` telling the conductor to
// re-run `next` — the follow-up `next` reads the recorded stance and emits the
// determined gate. The write lives in the spawned tool; the engine writes
// nothing itself (mirrors the scope-change/jump pattern: name the move, the
// conductor's tool mutates).
function handleSkeletonStanceReport(
  stance: string,
  projectDir: string | undefined,
): void {
  if (!VALID_SKELETON_STANCES.has(stance)) {
    emit(errorDirective(
      `Unknown --skeleton-stance "${stance}". Accepted: ${[...VALID_SKELETON_STANCES].join(", ")} ` +
        "(the walking-skeleton stance classified from the team's ## Walking Skeleton prose).",
    ));
    return;
  }

  const pd = resolveProjectDir(projectDir);
  const stateContent = loadStateFileIfPresent(pd);
  if (!stateContent) {
    emit(errorDirective(
      "No workflow state found (amadeus-docs/amadeus-state.md is absent) — nothing to record a skeleton stance for.",
    ));
    return;
  }

  // Defensive: a stance only makes sense when the workflow is parked on the
  // skeleton-gate stage with an unresolved gate. If the current stage is not the
  // skeleton-gate stage for the scope, the conductor mis-fired — surface it
  // rather than write the field at the wrong moment.
  const slug = getField(stateContent, "Current Stage");
  const scope = getField(stateContent, "Scope");
  if (!slug || slug.length === 0) {
    emit(errorDirective(
      "State file has no Current Stage field — cannot record a skeleton stance.",
    ));
    return;
  }
  if (!scope || scope.length === 0) {
    emit(errorDirective(
      "State file has no Scope field — cannot validate the skeleton-gate stage.",
    ));
    return;
  }
  const node = nodeForSlug(slug);
  if (!node || !isSkeletonGateStage(node, scope)) {
    emit(errorDirective(
      `Current stage "${slug}" is not the skeleton-gate stage for scope "${scope}" — ` +
        "a skeleton stance is only reported for the first Construction Bolt's gate.",
    ));
    return;
  }

  // Record the stance via the dedicated state subcommand. `set-skeleton-stance`
  // uses setOrInsertField so the runtime-only `Skeleton Stance` field is written
  // even on a state file that predates it (plain `set` silently no-ops on an
  // absent field). The engine writes nothing itself — the spawned tool mutates.
  const res = spawnState(pd, ["set-skeleton-stance", stance]);
  if (res.exitCode !== 0) {
    const detail = (res.stderr || res.stdout).trim();
    emit(errorDirective(
      `Failed to record skeleton stance for "${slug}"` + (detail ? `: ${detail}` : "."),
    ));
    return;
  }

  emit(printDirective(
    `Recorded walking-skeleton stance "${stance}" for "${slug}". ` +
      "Re-run `next` to continue — the gate is now determined.",
  ));
}

// --- --single report: commit the synthetic-id pair ---
//
// The synthetic workflow id a `--single` stage-runner's events are tagged with.
// It is NOT a real WORKFLOW_STARTED id — it exists only to mark the
// STAGE_STARTED/STAGE_COMPLETED pair in the audit journal as belonging to an isolated
// single-stage run, never to the main workflow. The `<slug>` segment makes the
// provenance legible in the audit trail.
function syntheticWorkflowId(slug: string): string {
  return `single-stage:${slug}`;
}

// Handle `report --single --stage <slug> --result <outcome>`: commit the lone
// STAGE_STARTED / STAGE_COMPLETED pair for `<slug>` under a SYNTHETIC workflow
// id, audit-only, then emit `done`. This is the WRITE half of the stage-runner
// contract, and it carries the load-bearing pointer invariant:
//
//   A `--single` run NEVER touches the main state file's `Current Stage`.
//
// It is tool-enforced two ways. (1) STRUCTURAL: this path shells out ONLY to
// `amadeus-audit.ts append` (which has no state write) — never to amadeus-state.ts
// advance / approve / complete-workflow, the only subcommands that pivot the main
// pointer. So a single-stage run is mechanically incapable of advancing the main
// workflow. (2) EXPLICIT: `--single` REQUIRES a `--stage <slug>` naming the stage
// that was run. A `report --single` with NO `--stage` is exactly an attempt to
// "advance the main workflow" (commit against whatever `Current Stage` points at)
// — and that returns an `error` directive rather than silently mutating. The two
// together make "advance the main workflow from a single run" unreachable.
//
// The pair is emitted via the atomic audit-append CLI (mirrors report's
// spawn-the-atomic-tool discipline — the engine writes nothing itself). STAGE_STARTED
// carries Stage + Agent + Workflow (the synthetic id); STAGE_COMPLETED carries
// Stage + Details + Workflow, matching the field shape amadeus-state.ts emits for
// the same events so the audit format stays uniform.
function handleSingleReport(
  flags: ReportFlags,
  projectDir: string | undefined,
): void {
  if (!flags.result) {
    emit(errorDirective(
      "report --single requires --result <outcome>. Accepted: " +
        [...FORWARD_RESULTS].join(", ") +
        " (the verdict for the single stage just run).",
    ));
    return;
  }
  if (!FORWARD_RESULTS.has(flags.result)) {
    emit(errorDirective(
      `Unknown --result "${flags.result}". report commits forward outcomes only; ` +
        `accepted: ${[...FORWARD_RESULTS].join(", ")}.`,
    ));
    return;
  }
  // The pointer invariant, explicit half: a --single report with no --stage is an
  // attempt to advance the MAIN workflow (commit against Current Stage). Refuse it.
  if (!flags.stage || flags.stage.length === 0) {
    emit(errorDirective(
      "report --single must not advance the main workflow. Pass --stage <slug> to commit the " +
        "single stage's synthetic-id pair; --single never writes the main workflow's Current Stage.",
    ));
    return;
  }
  const node = nodeForSlug(flags.stage);
  if (!node) {
    emit(errorDirective(
      `Unknown stage "${flags.stage}". Run /amadeus --help for the full list.`,
    ));
    return;
  }
  if (node.phase === "initialization") {
    emit(errorDirective(SINGLE_INIT_ERROR));
    return;
  }

  const pd = resolveProjectDir(projectDir);
  const advisoryHold = advisoryReportHoldReason(pd, node.slug, pluginHostRoot());
  if (advisoryHold !== null) {
    emit(errorDirective(`Cannot report stage "${node.slug}": ${advisoryHold}.`));
    return;
  }
  const wfId = syntheticWorkflowId(node.slug);

  const started = spawnAuditAppend(pd, "STAGE_STARTED", {
    Stage: node.slug,
    Agent: node.lead_agent,
    Workflow: wfId,
  });
  if (started.exitCode !== 0) {
    const detail = (started.stderr || started.stdout).trim();
    emit(errorDirective(
      `Failed to record single-stage STAGE_STARTED for "${node.slug}"` +
        (detail ? `: ${detail}` : "."),
    ));
    return;
  }
  const completed = spawnAuditAppend(pd, "STAGE_COMPLETED", {
    Stage: node.slug,
    Details: `Single-stage run of ${node.slug} completed`,
    Workflow: wfId,
  });
  if (completed.exitCode !== 0) {
    const detail = (completed.stderr || completed.stdout).trim();
    emit(errorDirective(
      `Failed to record single-stage STAGE_COMPLETED for "${node.slug}"` +
        (detail ? `: ${detail}` : "."),
    ));
    return;
  }

  closeAdvisoryInstancesForStage(pd, node.slug);

  emit({
    kind: "done",
    reason:
      `Single-stage run of "${node.slug}" committed under synthetic workflow "${wfId}". ` +
      "The main workflow's Current Stage is untouched.",
  });
}

function checkboxForSlug(
  stateContent: string,
  slug: string,
): CheckboxLine | undefined {
  return parseCheckboxes(stateContent).find((c) => c.slug === slug);
}

function approveArgs(
  slug: string,
  flags: ReportFlags,
  deferWorkflowCompletion = false,
): string[] {
  const args = ["approve", slug];
  if (flags.userInput) args.push("--user-input", flags.userInput);
  if (deferWorkflowCompletion) args.push("--defer-workflow-completion");
  return args;
}

// The carrier-bearing arm of the approval authority union. Declared at
// module scope: an inline Exclude<> annotation is runtime-erased yet still
// stamped DA:0 by Bun's LCOV.
type CarrierApprovalAuthority = Exclude<
  ReturnType<typeof classifyApprovalAuthority>,
  { readonly kind: "normal" } | { readonly kind: "invalid" }
>;

function authorizedApprovalIntent(
  pd: string,
  slug: string,
  authority: CarrierApprovalAuthority,
): string | null {
  try {
    const selected = readPresenceReservation(pd, authority.reservationId);
    return selected?.targetIntentId === authority.targetIntentId &&
        selected.stage === slug &&
        selected.space === activeSpace(pd)
      ? selected.targetIntentDir
      : null;
  } catch {
    return null;
  }
}

// Read ONE batch number off an audit block. The only entry point for turning a
// recorded row's number into a set member, so the fail-closed rule lives in one
// place: a row whose "Batch number" is absent, empty, or not a finite number is
// not evidence of anything and never joins the set. (`Number("")` is 0, so the
// empty string has to be rejected before the numeric check, or a blank field
// would silently vouch for a batch 0 no plan ever declares.)
function batchNumberOf(block: string): number | null {
  const raw = auditBlockField(block, "Batch number");
  if (raw === null || raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** The non-empty unit names on a comma-joined audit field, or none. */
function unitNamesOf(block: string, field: string): string[] {
  const raw = auditBlockField(block, field);
  if (raw === null) return [];
  return raw.split(",").map((name) => name.trim()).filter((name) => name.length > 0);
}

/**
 * Whether an audit row belongs to the plan running NOW. The trail is
 * append-only, so a fan-out that ran under a plan this run replaced leaves rows
 * that name the same units; only the generation stamp separates them. A row
 * carrying no stamp (pre-#1953) is not current evidence either — fail-closed
 * (FR-5a / FR-5b).
 */
function rowIsCurrentGeneration(block: string, generation: string | null): boolean {
  if (generation === null) return false;
  const stamped = auditBlockField(block, "Plan generation");
  return stamped !== null && stamped.trim() === generation;
}

/** Every batch number that carries a SWARM_COMPLETED row of the current plan. */
function completedBatchNumbers(audit: string, generation: string | null): Set<number> {
  const numbers = new Set<number>();
  for (const found of findAllEvents(audit, "SWARM_COMPLETED")) {
    if (!rowIsCurrentGeneration(found.block, generation)) continue;
    const number = batchNumberOf(found.block);
    if (number !== null) numbers.add(number);
  }
  return numbers;
}

// What actually ran, read from the audit trail. amadeus-swarm.ts is the sole
// emitter of these rows, so this is a read of first-hand evidence and not a
// re-derivation of it — nothing here writes back, which is what stops the next
// reconciliation from reading a row this one produced.
//
// Keyed on unit names, never on batch numbers (#2354): a number is the value the
// conductor handed `prepare --batch`, so a re-dispatch shifts it and the plan's
// numbers stop lining up with the trail's while the RUN was parallel throughout.
// SWARM_DEGRADED needs no row of its own here — `prepare` emits it in addition to
// the batch-start row, never instead of it, so the degraded batch's unit names
// still arrive via SWARM_STARTED.
//
// Units count as SETTLED per COMPLETED BATCH, not as one pooled set: convergence
// alone is a per-unit claim, the completion row is what says the referee finished
// that batch, and keeping the grouping is what stops an abandoned wide prepare
// from vouching for units that were really re-dispatched one at a time (the
// grouping argument lives on swarmEvidenceVerdict).
//
// Reading every shard (not just this clone's) matters because a batch prepared in
// one worktree and finalised in another leaves its rows in two files, and a
// single-shard read would call that batch missing.
function collectSwarmEvidence(projectDir: string, intent?: string): SwarmEvidence {
  const audit = readAllAuditShards(projectDir, intent);
  // #1953 / FR-5: bind every row to the compiled plan it ran under before it
  // counts as evidence for THIS plan.
  const generation = readBoltDagGeneration(projectDir, intent);
  const completed = completedBatchNumbers(audit, generation);
  const fannedOutUnitSets: ReadonlySet<string>[] = [];
  let sawStaleGeneration = false;
  for (const found of findAllEvents(audit, "SWARM_STARTED")) {
    const units = unitNamesOf(found.block, "Unit names");
    if (units.length === 0) continue;
    if (!rowIsCurrentGeneration(found.block, generation)) {
      sawStaleGeneration = true;
      continue;
    }
    fannedOutUnitSets.push(new Set(units));
  }
  const convergedByBatch = new Map<number, Set<string>>();
  for (const found of findAllEvents(audit, "SWARM_UNIT_CONVERGED")) {
    const number = batchNumberOf(found.block);
    if (number === null) continue;
    if (!rowIsCurrentGeneration(found.block, generation)) {
      sawStaleGeneration = true;
      continue;
    }
    if (!completed.has(number)) continue;
    const units = convergedByBatch.get(number) ?? new Set<string>();
    for (const unit of unitNamesOf(found.block, "Unit name")) units.add(unit);
    convergedByBatch.set(number, units);
  }
  return {
    fannedOutUnitSets,
    settledUnitSets: [...convergedByBatch.values()],
    sawStaleGeneration,
  };
}

/** "batch 1 (2 units: alpha, beta)" for each batch the run owes evidence for. */
function namedMissingBatches(batches: readonly DeclaredBatch[]): string {
  const named = batches.map((batch) => `batch ${batch.number} (${batch.units.length} units: ${batch.units.join(", ")})`);
  return named.join("; ");
}

/** The names a set holds, sorted, or "none" when it holds nothing. */
function listedUnitNames(names: Iterable<string>): string {
  const sorted = [...names].sort();
  return sorted.length === 0 ? "none" : sorted.join(", ");
}

/** One bracketed group per recorded row: "[alpha, beta]; [gamma]". */
function listedGroups(groups: readonly ReadonlySet<string>[]): string {
  if (groups.length === 0) return "none";
  return groups.map((group) => `[${listedUnitNames(group)}]`).join("; ");
}

// Approve-time reconciliation has no ruling/delegate consumer. Keep this exit
// limited to the two paths that can actually clear the guard: record fan-out
// evidence under the current plan, or correct the plan to serial and recompile.
const APPROVE_PLAN_CORRECTION_EXIT =
  "Correct the plan, not the run: record the dependency that makes these units serial (with its reason) in unit-of-work-dependency.md, re-run `bun <harness>/tools/amadeus-runtime.ts compile`, then re-run `next`. Otherwise, run the declared batch as a fan-out under the current plan so its SWARM evidence can be reconciled at approve time.";

// The VALUES the approve refusal carries — the prose template stays
// guardMessage's, and the weight remains the measured basis shared with the
// issuance guard while this approve-only exit names only executable paths.
//
// Every name here is read off the verdict and the evidence that produced it;
// nothing is re-counted at this call site
// (cid:requirements-analysis:ledger-count-mechanical-recalc). Both sides are
// printed one bracketed group per row rather than unioned, because which units
// were dispatched TOGETHER — and settled together — is exactly the fact under
// dispute.
function swarmEvidenceRejection(batches: readonly DeclaredBatch[], evidence: SwarmEvidence): string {
  const owed = namedMissingBatches(batches);
  const fannedOut = listedGroups(evidence.fannedOutUnitSets);
  const settled = listedGroups(evidence.settledUnitSets);
  const declared = `the compiled Bolt DAG declares these batches parallel and this run has no fan-out on record for them — ${owed}`;
  const trail = `the audit trail records fan-out rows for ${fannedOut} and batch-completed convergence for ${settled}`;
  // FR-5b: rows that exist but belong to a plan this run replaced (or predate the
  // generation stamp) are called out with the one action that regenerates them —
  // otherwise the refusal reads as "no rows" against a trail full of rows.
  const staleNote = evidence.sawStaleGeneration === true
    ? " Some SWARM rows carry a different plan generation (or none at all), so they are evidence for a plan this run replaced — re-run the fan-out under the current plan to regenerate them."
    : "";
  const observation = `${declared}, but ${trail}, so these units were built one at a time while the plan said they run in parallel.${staleNote}`;
  return guardMessage({ observation, weight: PLAN_DRIFT_WEIGHT, exit: APPROVE_PLAN_CORRECTION_EXIT });
}

// Per-unit coverage gate (issue #368), DETERMINISTIC enforcement on the approve
// path. The engine only PRESENTS the stage's real gate once every unit is
// covered (emitPerUnitRunStage suppresses gate:false on every uncovered unit and
// fires the real gate only on the all-covered re-entry), but a hand-flipped
// checkbox or a conductor that reported the wrong directive could still try to
// approve early and complete the stage for only some of N units. So before
// committing a gated per-unit stage's transition, require that EVERY unit is
// covered. If any unit is still uncovered, refuse with a message naming the
// remaining units; the conductor must run `next` to finish them first.
//
// The unit set comes from whichever ledger this run has (issue #2586). With a
// compiled Bolt DAG that is orderedUnits; without one it is the SAME directory
// listing emitPerUnitRunStage's degrade path iterates (unitDirsUnderConstruction),
// because a scope that SKIPs units-generation still spreads its work across
// several unit directories — the earlier reading of "no DAG = single iteration"
// was already false when `declare-units-done` (issue #2358) shipped a command
// whose whole purpose is to settle a MULTI-unit degrade listing. An empty
// listing is left unguarded: the listing is the only ledger there, and an empty
// one proves nothing to refuse on.
//
// This is strictly upstream of that declaration, never in conflict with it:
// declare-units-done only ever settles a listing whose units are ALL covered,
// which is exactly the case this guard passes through.
//
// Scoped to the INLINE per-unit loop, NOT the code-generation swarm.
// The swarm advances ONE Bolt BATCH at a time (tryEmitSwarm emits the first
// batch with uncovered units)
// and gates per BATCH (stage-protocol.md: "a single Bolt-level gate (or
// batch-level gate for parallel batches)"), with the swarm referee
// (amadeus-swarm.ts finalize) verifying each batch's convergence before its merge.
// An all-units coverage check is WRONG there: after batch 1 of a multi-batch
// DAG merges, the later batches' units are legitimately still uncovered, so
// requiring every unit would refuse the batch-1 approve AND `next` would
// re-emit batch 1 (no batch-advance), deadlocking the run. So we exclude the
// swarm condition (per-unit + mode:subagent + a recorded grant) verbatim from
// tryEmitSwarm's trigger and let the swarm's own per-batch verification stand.
// Issue #1612 widened that trigger to `gated` (the batch-end gate replaces the
// autonomous run-through), so this exclusion is widened SYMMETRICALLY in the
// same change — a gated swarm advances batch by batch exactly like an
// autonomous one, and an all-units check would deadlock it identically. Unset
// (the non-swarm serial path) keeps the guard.
// The guard remains for every inline per-unit stage (the four design stages,
// and code-generation when it falls back to the inline path off the swarm).
function perUnitCoverageRefusal(
  pd: string,
  node: GraphStage,
  slug: string,
  stateContent: string,
  intent?: string,
): string | null {
  const isSwarmDriven =
    node.mode === SWARM_MODE && readAutonomyMode(stateContent) !== null;
  if (!isPerUnit(node) || isSwarmDriven) return null;
  const recordPrefix = relativeRecordDir(pd, intent);
  const dagUnits = orderedUnits(pd, intent);
  const units = dagUnits.length > 0
    ? dagUnits
    : unitDirsUnderConstruction(pd, recordPrefix);
  if (units.length === 0) return null;
  const pick = nextUncoveredUnit(
    pd,
    node,
    units,
    recordPrefix,
    codekbCtxFor(pd),
    readUnitKinds(pd, intent),
  );
  if (pick === null) return null;
  return (
    `Stage "${slug}" is per-unit (for_each: unit-of-work) and ${pick.uncovered.length} of ` +
    `${units.length} units are not yet complete (${pick.uncovered.join(", ")}). ` +
    "Run `next` to continue the remaining units before approving."
  );
}

// This overlay turns code-generation completion into the final Delivery Bolt
// evidence boundary. Swarm batches may advance independently,
// but the stage itself cannot complete until every owner projection exists.
type DeliveryEvidenceOwners =
  | { readonly ok: true; readonly units: readonly string[] }
  | {
    readonly ok: false;
    readonly message: string;
    readonly reason?: "projection-absent";
  };

function engineSingletonEvidenceOwners(
  pd: string,
  projection: Record<string, unknown>,
  stateContent: string,
  intent?: string,
): DeliveryEvidenceOwners {
  const expected = projectEngineSingletonDeliveryBolt(
    pd,
    stateContent,
    new Set(loadGraph().map((stage) => stage.slug)),
    intent,
  );
  if (expected.kind !== "projection") {
    return { ok: false, message: "DELIVERY_EVIDENCE_CARRIER_STALE: engine singleton authority no longer resolves." };
  }
  if (JSON.stringify(projection) !== JSON.stringify(expected.projection)) {
    return { ok: false, message: "DELIVERY_EVIDENCE_CARRIER_MISMATCH: engine singleton authority does not match the current state and Unit." };
  }
  return { ok: true, units: [expected.projection.unit] };
}

function approvedPlanEvidenceOwners(
  projection: unknown,
  planPath: string,
): DeliveryEvidenceOwners {
  if (!existsSync(planPath)) {
    return { ok: false, message: "DELIVERY_EVIDENCE_CARRIER_STALE: the projected Delivery Bolt source is missing." };
  }
  const projected = projectDeliveryBoltPlan(readFileSync(planPath, "utf-8"));
  if (!projected.ok) {
    return { ok: false, message: `DELIVERY_EVIDENCE_CARRIER_INVALID: ${projected.message}.` };
  }
  if (projection === null || typeof projection !== "object" || Array.isArray(projection)) {
    return { ok: false, message: "DELIVERY_EVIDENCE_CARRIER_INVALID: Delivery Bolt projection is empty or malformed." };
  }
  const fields = projection as Record<string, unknown>;
  if (
    fields.source !== DELIVERY_BOLT_PLAN_SOURCE ||
    !Array.isArray(fields.bolts) ||
    fields.bolts.length === 0
  ) {
    return { ok: false, message: "DELIVERY_EVIDENCE_CARRIER_INVALID: Delivery Bolt projection is empty or malformed." };
  }
  const actualDigest = fields.sourceDigest;
  if (actualDigest !== projected.projection.sourceDigest) {
    return { ok: false, message: "DELIVERY_EVIDENCE_CARRIER_STALE: Delivery Bolt source digest does not match the current plan." };
  }
  if (JSON.stringify(projection) !== JSON.stringify(projected.projection)) {
    return { ok: false, message: "DELIVERY_EVIDENCE_CARRIER_MISMATCH: runtime membership does not match the approved plan." };
  }
  return { ok: true, units: projected.projection.bolts.flatMap((bolt) => bolt.units) };
}

function deliveryEvidenceOwners(
  pd: string,
  stateContent: string,
  intent?: string,
): DeliveryEvidenceOwners {
  let graph: unknown;
  try {
    graph = JSON.parse(readFileSync(runtimeGraphPath(pd, intent), "utf-8"));
  } catch {
    return { ok: false, message: "DELIVERY_EVIDENCE_CARRIER_INVALID: runtime-graph.json is missing or unreadable." };
  }
  if (graph === null || typeof graph !== "object" || Array.isArray(graph)) {
    return { ok: false, message: "DELIVERY_EVIDENCE_CARRIER_INVALID: runtime-graph.json is not an object." };
  }
  const projection = (graph as Record<string, unknown>).delivery_bolts;
  const recordPrefix = relativeRecordDir(pd, intent);
  if (recordPrefix === null) {
    return { ok: false, message: "DELIVERY_EVIDENCE_CARRIER_MISSING: no Intent record resolves the Delivery Bolt owner set." };
  }
  const planPath = join(pd, ...recordPrefix.split("/"), DELIVERY_BOLT_PLAN_SOURCE);
  if (projection === undefined) {
    return {
      ok: false,
      message: "DELIVERY_EVIDENCE_CARRIER_MISSING: approved Delivery Bolt membership is absent.",
      reason: "projection-absent",
    };
  }
  if (
    projection !== null && typeof projection === "object" && !Array.isArray(projection) &&
    (projection as Record<string, unknown>).authority === "engine-singleton"
  ) {
    return engineSingletonEvidenceOwners(
      pd,
      projection as Record<string, unknown>,
      stateContent,
      intent,
    );
  }
  return approvedPlanEvidenceOwners(projection, planPath);
}

export function deliveryEvidenceCoverageRefusal(
  pd: string,
  node: GraphStage,
  stateContent: string,
  intent?: string,
): string | null {
  if (
    node.slug !== "code-generation" ||
    !isPerUnit(node)
  ) {
    return null;
  }
  const recordPrefix = relativeRecordDir(pd, intent);
  const dagUnits = orderedUnits(pd, intent);
  const executionUnits = dagUnits.length > 0
    ? dagUnits
    : unitDirsUnderConstruction(pd, recordPrefix);
  if (executionUnits.length === 0) return null;
  const owners = deliveryEvidenceOwners(pd, stateContent, intent);
  if (!owners.ok) {
    if (owners.reason === "projection-absent") {
      const pick = nextUncoveredUnit(
        pd,
        node,
        executionUnits,
        recordPrefix,
        codekbCtxFor(pd),
        readUnitKinds(pd, intent),
      );
      const isSwarmDriven =
        node.mode === SWARM_MODE && readAutonomyMode(stateContent) !== null;
      if (pick !== null && isSwarmDriven) return null;
    }
    return owners.message;
  }
  const units = [...owners.units];
  const pick = nextUncoveredUnit(
    pd,
    node,
    units,
    recordPrefix,
    codekbCtxFor(pd),
    readUnitKinds(pd, intent),
  );
  if (pick === null) return null;
  return (
    `DELIVERY_EVIDENCE_INCOMPLETE: ${pick.uncovered.length} of ${units.length} Unit owner projections ` +
    `are missing required code-generation evidence (${pick.uncovered.join(", ")}). ` +
    "Finish every Delivery Bolt member before reporting code-generation completed."
  );
}

// Approve-time reconciliation (FR-2). The issuance guard stops a run that is
// ABOUT to serialise a parallel batch; this one stops a run that already did —
// a hand-driven fan-out, or a batch built one unit at a time outside the
// engine, reaches approve with every unit covered and nothing else to show for
// it. The plan is the claim, the SWARM rows are the receipt, and approve is the
// last moment the two can still be compared.
//
// Deliberately NOT conditioned on isSwarmDriven: the drift #1892 measured
// includes runs that never recorded an autonomy grant and completed serially,
// which is exactly the shape that predicate excludes.
//
// The conditions are ordered cheapest-first so the two reads never happen on a
// stage this does not govern: stage kind, then the DAG, then the audit (NFR-3).
function swarmReconciliationRefusal(
  pd: string,
  node: GraphStage,
  scope: string,
  intent?: string,
): string | null {
  if (
    node.for_each !== SWARM_FOR_EACH ||
    node.mode !== SWARM_MODE ||
    // The walking-skeleton gate stage is the one place the engine itself refuses
    // to fan out (tryEmitSwarm declines it), so zero SWARM rows there is
    // compliance, not drift — reconciling it would refuse an approve that the
    // one approved exit, a plan correction, could never unblock.
    isSkeletonGateStage(node, scope)
  ) {
    return null;
  }
  const declaredBatches = readBoltDagBatches(pd, intent);
  if (declaredBatches === null) return null;
  const evidence = collectSwarmEvidence(pd, intent);
  const verdict = swarmEvidenceVerdict(declaredBatches, evidence);
  return verdict.kind === "missing"
    ? swarmEvidenceRejection(verdict.batches, evidence)
    : null;
}

/**
 * The guard set EVERY approve commit must clear, whichever report path reached
 * it. Returns the refusal message, or null when the transition may proceed.
 *
 * Extracted for #2375: the carrier path (report + a targeted-human
 * authorization) returned to spawnState before either guard ran, so on a harness
 * where every gate approval travels the carrier — Kimi — both were permanently
 * inert. One function, two call sites, no third dialect.
 *
 * `checkboxState` is the reported stage's checkbox: an already-completed stage is
 * an idempotent re-report (a recovery replay) whose artifacts may legitimately be
 * absent (a fresh clone, moved files), so neither guard may turn a harmless
 * replay into an error. An ABSENT checkbox is not a replay and stays guarded.
 * `intent` names the record dir under judgement — the carrier's target intent,
 * not whatever the cursor happens to point at.
 */
function gatedApproveRefusal(
  pd: string,
  node: GraphStage,
  scope: string,
  slug: string,
  stateContent: string,
  checkboxState: string | null,
  intent?: string,
): string | null {
  // Only bootstrap initialization stages auto-proceed; every other EXECUTE stage
  // gates, and only a gated stage has an approve to guard.
  if (node.phase === "initialization" || checkboxState === "completed") return null;
  return (
    deliveryEvidenceCoverageRefusal(pd, node, stateContent, intent) ??
    perUnitCoverageRefusal(pd, node, slug, stateContent, intent) ??
    swarmReconciliationRefusal(pd, node, scope, intent)
  );
}

function handleAuthorizedApprovalReport(
  pd: string,
  slug: string,
  authority: CarrierApprovalAuthority,
): void {
  const approvalIntent = authorizedApprovalIntent(pd, slug, authority);
  if (approvalIntent === null) {
    emit(errorDirective(
      "Approval authorization does not match exactly one workflow and stage.",
    ));
    return;
  }
  const stateContent = loadStateFileIfPresent(
    pd,
    approvalIntent,
  );
  if (stateContent === null) {
    emit(errorDirective("Approval authorization requires an active workflow."));
    return;
  }
  const scope = getField(stateContent, "Scope");
  const isFinal =
    scope !== null && nextInScopeStage(slug, scope, stateContent) === null;
  const stageCheckbox = checkboxForSlug(stateContent, slug);
  let prepared: ReturnType<typeof workflowCompletionPreparation>;
  try {
    prepared = workflowCompletionPreparation(stateContent);
  } catch (cause) {
    emit(errorDirective(errorMessage(cause)));
    return;
  }
  if (
    stageCheckbox?.state === "completed" &&
    isFinal &&
    prepared?.status === "pending" &&
    prepared.stage === slug
  ) {
    if (!emitMirrorBoundaryIfNeeded(pd, stateContent, approvalIntent)) {
      emit(errorDirective(
        `Workflow completion for "${slug}" is pending but no mirror boundary directive was available.`,
      ));
    }
    return;
  }
  // #2375: the same approve guards the normal report path runs, against the
  // TARGET intent's plan and trail (not the cursor's). Ordered before the
  // mirror disposition exactly as on the normal path. A stage the compiled graph
  // does not carry, or a state file with no Scope, is outside what these guards
  // can judge — both are refused downstream on their own terms.
  const guardNode = nodeForSlug(slug);
  if (guardNode && scope !== null) {
    const refusal = gatedApproveRefusal(
      pd,
      guardNode,
      scope,
      slug,
      stateContent,
      stageCheckbox?.state ?? null,
      approvalIntent,
    );
    if (refusal !== null) {
      emit(errorDirective(refusal));
      return;
    }
  }
  const completionDisposition = isFinal
    ? completionMirrorDisposition(pd, approvalIntent)
    : { kind: "immediate" as const };
  if (completionDisposition.kind === "error") {
    emit(errorDirective(completionDisposition.message));
    return;
  }
  const deferWorkflowCompletion =
    isFinal && completionDisposition.kind === "defer";
  const approve = ["approve", slug];
  if (deferWorkflowCompletion) {
    approve.push("--defer-workflow-completion");
  }
  approve.push(
    "--user-input",
    authority.userInput,
    "--target-intent-id",
    authority.targetIntentId,
    "--presence-reservation-id",
    authority.reservationId,
  );
  const processResult = parseApprovalProcessResult(spawnState(pd, approve));
  if (processResult.kind === "fatal-error") {
    emit(errorDirective(
      `Transition rejected by amadeus-state.ts approve for "${slug}"` +
        (processResult.detail ? `: ${processResult.detail}` : "."),
    ));
    return;
  }
  if (processResult.kind === "protocol-error") {
    emit(errorDirective(
      `Approval process protocol error for "${slug}": ${processResult.detail}`,
    ));
    return;
  }
  if (deferWorkflowCompletion) {
    emitDeferredCompletionBoundary(pd, slug, approvalIntent);
    return;
  }
  const approvedReason = `Committed approve for "${slug}" with ${authority.kind} authorization. State advanced; run next to continue.`;
  emit({ kind: "committed", reason: approvedReason });
}

// Whether this Intent runs a Quality Repair loop a stage failure can be
// admitted into. `none` does not, and keeps the historical forward-only
// report contract.
function runsQualityRepair(projectDir: string): boolean {
  const mode = readProductionAutonomyProjection(projectDir)?.mode;
  return mode === "semi" || mode === "full";
}

// The one wording for a REPAIR_STALLED stop, shared by the `report` that parks
// and by every later `next` that has to surface the same stall. Both name the
// resume routes the park's resume condition actually accepts.
function repairStalledReason(stall: ProductionRepairStall): string {
  const scope = stall.qualityScopeId === null
    ? "the stalled quality scope"
    : `quality scope ${JSON.stringify(stall.qualityScopeId)}`;
  return `Workflow parked as REPAIR_STALLED at ${JSON.stringify(stall.stageInstanceId)}: bounded quality repair ` +
    `stopped making progress on evidence ${stall.evidenceFingerprint}. The Intent autonomy grant stays active. ` +
    `Resume ${scope} with \`bun ${harnessDir()}/tools/amadeus-bolt.ts resume-quality --input <carrier>\` once the ` +
    "evidence strictly improves, or after an explicit human retry.";
}

// The directive an admission outcome calls for: the REPAIR_STALLED stop, the
// refusal when Quality Repair could not take the failure, or the next move in
// the bounded loop (another repair round, or the single replan). Exported as a
// pure function so every outcome — including the refusals only a racing Intent
// can produce in production — is drivable from a test.
export function stageFailureDirective(
  stage: string,
  admitted: ProductionStageFailureResult,
): Directive {
  if (admitted.kind === "error") {
    return errorDirective(`Cannot admit the failure of stage ${JSON.stringify(stage)}: ${admitted.reason}.`);
  }
  if (admitted.kind === "parked") return parkedDirective(repairStalledReason(admitted.stall), stage);
  const move = admitted.kind === "replanned"
    ? "Quality Repair replanned the repair context"
    : "Quality Repair recorded the obligation for another repair round";
  const next = "Repair the recorded obligation, re-run the stage, and report its outcome again.";
  return printDirective(`Stage ${JSON.stringify(stage)} failed closed and the failure was admitted to Quality Repair. ${move} (evidence ${admitted.evidenceFingerprint}). ${next}`);
}

// Admit a typed stage-referee failure into Quality Repair and name the move the
// outcome calls for: another bounded repair round, the one replan, or the
// REPAIR_STALLED stop. The stall is read back from the park envelope so the
// directive carries the same resume condition the projection recorded.
function handleStageFailureReport(flags: ReportFlags, projectDir: string): void {
  // Only a stage the graph carries can fail: the slug keys the quality scope the
  // repair loop reads back, so an unknown one would open a scope nothing resumes.
  // A state file the reader cannot supply a Current Stage from lands in the same
  // refusal rather than in a scope keyed by nothing.
  const stateContent = loadStateFileIfPresent(projectDir) ?? "";
  const stage = (flags.stage ?? getField(stateContent, "Current Stage") ?? "").trim();
  if (nodeForSlug(stage) === undefined) {
    emit(errorDirective(`Cannot admit a failure for unknown stage ${JSON.stringify(stage)}.`));
    return;
  }
  const detail = flags.failure?.trim();
  if (detail === undefined || detail.length === 0) {
    emit(errorDirective(
      "report --result failed requires --failure <detail> — the typed failure the stage's referee returned.",
    ));
    return;
  }
  emit(stageFailureDirective(stage, admitProductionStageFailure({ projectDir, stage, failureDetail: detail })));
}

// The `report` handler. Reads the acted stage + scope from state, decides the
// committing subcommand(s) (gate status, then finality), shells out to the
// atomic state tool, and emits a non-terminal `committed` directive on success
// or an `error` directive on a rejected transition. Mutation happens entirely
// inside the spawned subcommand(s) — the engine itself writes nothing.
export function handleReport(args: string[], projectDir: string | undefined): void {
  // Record the project this handler operates on so emit()'s ERROR_LOGGED lands
  // here, not the ambient CLAUDE_PROJECT_DIR, under in-process drivers (#1389).
  _handlerProjectDir = projectDir;
  if (refuseAmbientProjectDir(projectDir)) return;
  if (refuseUnauthorizedKimiCaller(projectDir)) return;
  if (
    args.includes("--standing-grant-id") ||
    args.includes("--standing-grant-route-id")
  ) {
    emit(errorDirective(
      "Standing-grant approval carriers are retired; select Intent autonomy instead.",
    ));
    return;
  }
  const flags = parseReportFlags(args);
  const modeResult = resolveOperatingMode(process.env.AMADEUS_OPERATING_MODE);
  const authority = classifyApprovalAuthority({
    operatingMode: modeResult.kind === "valid" ? modeResult.mode : modeResult.raw,
    userInput: flags.userInput,
    targetIntentId: flags.targetIntentId,
    presenceReservationId: flags.presenceReservationId,
  });
  if (authority.kind === "invalid") {
    emit(errorDirective(`Invalid approval authority: ${authority.reason}`));
    return;
  }
  if (
    authority.kind !== "normal" &&
    (flags.single === true ||
      flags.skeletonStance !== undefined ||
      flags.mirrorBoundary !== undefined)
  ) {
    emit(errorDirective(
      "Approval authorization carriers are valid only for a main-workflow stage report.",
    ));
    return;
  }

  if (flags.mirrorBoundary !== undefined) {
    const phase = flags.mirrorBoundary;
    const answer = flags.userInput?.trim().toLowerCase();
    if (
      !(MIRROR_BOUNDARY_PHASES as readonly string[]).includes(phase) ||
      flags.result !== "completed" ||
      (answer !== "create" && answer !== "sync" && answer !== "skip")
    ) {
      emit(
        errorDirective(
          "Mirror boundary report requires a canonical phase, --result completed, " +
            "and --user-input create, sync, or skip.",
        ),
      );
      return;
    }
    const pd = resolveProjectDir(projectDir);
    const stateContent = loadStateFileIfPresent(pd);
    if (stateContent === null) {
      emit(errorDirective("Mirror boundary report requires an active workflow."));
      return;
    }
    const expectedPhase = currentMirrorBoundaryPhase(stateContent);
    // Evidence that a create ran, not the absence of an Issue. Running the
    // create the ask instructs records the Issue, so the earlier Issue re-read
    // rejected exactly the reports that had done what the ask asked for
    // (Issue #1752).
    const createRan = succeededMirrorCreateExists(stateContent);
    let receipts: MirrorBoundaryReceipts;
    try {
      receipts = parseMirrorBoundaryReceipts(
        getField(stateContent, "Mirror Boundary Receipts"),
      );
    } catch (cause) {
      emit(errorDirective(errorMessage(cause)));
      return;
    }
    if (
      expectedPhase !== phase ||
      receipts[phase as MirrorBoundaryPhase] !== undefined ||
      (answer === "create" && !createRan)
    ) {
      emit(
        errorDirective(
          `Mirror boundary report does not match the pending ${expectedPhase ?? "none"} boundary or its offered choices.`,
        ),
      );
      return;
    }
    const result = spawnState(pd, [
      "mirror-boundary",
      phase,
      "completed",
      "--from",
      "absent",
    ]);
    if (result.exitCode !== 0) {
      emit(errorDirective(result.stderr.trim() || result.stdout.trim()));
      return;
    }
    emit(
      printDirective(
        `Mirror boundary "${phase}" recorded as completed after "${answer}". Re-run \`next\` to continue.`,
      ),
    );
    return;
  }

  // Branch -1 — the --single stage-runner commit. A stage-runner reports
  // its lone stage via `report --single --stage <slug> --result <outcome>`; the
  // engine commits a synthetic-id STAGE_STARTED/STAGE_COMPLETED pair (audit only)
  // and NEVER touches the main `Current Stage`. Resolves first, before the
  // main-workflow branches, so a single-stage commit can never fall through to a
  // state-mutating subcommand.
  if (flags.single) {
    handleSingleReport(flags, projectDir);
    return;
  }

  // Branch 0 — the classify round-trip (per the engine design). `report
  // --skeleton-stance <on|off|scope-dependent>` is NOT a transition commit: the
  // conductor classified the team's `## Walking Skeleton` prose (knowledge work
  // the engine cannot do) and hands the typed stance back. We RECORD it in the
  // state field the next `next` reads, then name the move (re-run `next`) — the
  // next `next` resolves the now-determined gate. Recording is a state write, so
  // it goes through the atomic `amadeus-state.ts set` subcommand (the engine never
  // writes state itself). This branch resolves BEFORE the --result requirement
  // because a stance report carries no verdict.
  if (flags.skeletonStance !== undefined) {
    handleSkeletonStanceReport(flags.skeletonStance, projectDir);
    return;
  }

  // Branch 0.5 — the resume-choice ask round-trip. A resume answer is not a
  // stage verdict: accepting it must neither approve the current gate nor
  // mutate workflow state. Keep the accepted vocabulary deliberately narrow
  // until the destructive Redo / Start Fresh choices and the target-bearing
  // Jump choice have dedicated, correlated routes. Number 1 is the Codex
  // numbered-prose rendering of the same Resume option.
  if (!flags.result && !flags.stage && flags.userInput !== undefined) {
    const answer = flags.userInput.trim().toLowerCase();
    const isResumeAnswer =
      answer === "1" ||
      answer === "resume" ||
      answer === "resume from last checkpoint" ||
      answer === "resume from last checkpoint (recommended)";
    if (isResumeAnswer) {
      const pd = resolveProjectDir(projectDir);
      if (loadStateFileIfPresent(pd)) {
        const message = "Resume selected for the existing workflow. No stage transition was committed. Re-run `next` to continue from the current checkpoint.";
        emit(printDirective(message));
        return;
      }
    }
  }

  const answer = flags.userInput?.trim().toLowerCase();
  if (
    flags.result === undefined &&
    (answer === "retry" || answer === "skip" || answer === "abort") &&
    canonicalConstructionFailurePending(resolveProjectDir(projectDir))
  ) {
    handleFailureRuling(args, projectDir);
    return;
  }

  // A stage-owned referee that failed closed (issue #2912). `report` commits
  // forward transitions only and the generic manual park is refused under an
  // autonomous Construction run, so without this route a typed failure has no
  // admission path and `next` re-issues the same run-stage forever. (#3016
  // narrowed that refusal to a genuinely UNATTENDED run — one with no unconsumed
  // HUMAN_TURN — which is exactly the case this route answers.) Under semi
  // or full the failure belongs to Quality Repair: it becomes an unresolved
  // obligation, bounded repair owns the recovery, and a nonproductive loop parks
  // as REPAIR_STALLED with the grant intact. Under `none` there is no repair
  // loop to admit it into, so the forward-only contract below still answers.
  const failureAdmissionDir = resolveProjectDir(projectDir);
  if (flags.result === "failed" && runsQualityRepair(failureAdmissionDir)) {
    handleStageFailureReport(flags, failureAdmissionDir);
    return;
  }

  // A verdict is required: report commits the outcome of an acted directive, so
  // it cannot run without one. An unrecognised verdict is a hard error (clean
  // boundaries) rather than a silent no-op.
  if (!flags.result) {
    emit({
      kind: "error",
      message:
        "report requires --result <outcome>. Accepted: " +
        [...FORWARD_RESULTS].join(", ") +
        " (the verdict for the stage just acted on).",
    });
    return;
  }
  if (!FORWARD_RESULTS.has(flags.result)) {
    emit({
      kind: "error",
      message:
        `Unknown --result "${flags.result}". report commits forward transitions only; ` +
        `accepted outcomes: ${[...FORWARD_RESULTS].join(", ")}.`,
    });
    return;
  }

  const pd = resolveProjectDir(projectDir);
  if (authority.kind !== "normal") {
    const slug = flags.stage?.trim();
    if (!slug) {
      emit(errorDirective(
        "Approval authorization carriers require an explicit --stage.",
      ));
      return;
    }
    const advisoryHold = advisoryReportHoldReason(pd, slug, pluginHostRoot());
    if (advisoryHold !== null) {
      emit(errorDirective(`Cannot report stage "${slug}": ${advisoryHold}.`));
      return;
    }
    handleAuthorizedApprovalReport(pd, slug, authority);
    return;
  }
  const stateContent = loadStateFileIfPresent(pd);
  if (!stateContent) {
    emit({
      kind: "error",
      message:
        "No workflow state found (amadeus-docs/amadeus-state.md is absent) — nothing to report a transition for.",
    });
    return;
  }

  // Prefer the stage the conductor explicitly reports. This closes the stale
  // pointer gap where the conductor may have already moved Current Stage by a
  // direct state-tool recovery, then reports the older directive it actually
  // acted on. Omitted --stage keeps the historical Current Stage fallback.
  const currentSlug = getField(stateContent, "Current Stage");
  if (!currentSlug || currentSlug.length === 0) {
    emit({
      kind: "error",
      message:
        "State file has no Current Stage field — cannot determine which stage's transition to commit.",
    });
    return;
  }
  const explicitStage = flags.stage?.trim();
  const slug = explicitStage && explicitStage.length > 0 ? explicitStage : currentSlug;
  const advisoryHold = advisoryReportHoldReason(pd, slug, pluginHostRoot());
  if (advisoryHold !== null) {
    emit(errorDirective(`Cannot report stage "${slug}": ${advisoryHold}.`));
    return;
  }

  const scope = getField(stateContent, "Scope");
  if (!scope || scope.length === 0) {
    emit({
      kind: "error",
      message: "State file has no Scope field — cannot resolve the next in-scope stage.",
    });
    return;
  }

  // Gate status off the graph node — the same axis `next` uses for run-stage's
  // `gate` field: only bootstrap initialization stages auto-proceed; every
  // other EXECUTE stage gates.
  const node = nodeForSlug(slug);
  if (!node) {
    emit({
      kind: "error",
      message: `Internal: reported stage "${slug}" is not in the compiled graph — cannot commit its transition.`,
    });
    return;
  }
  const stageCheckbox = checkboxForSlug(stateContent, slug);
  if (!stageCheckbox) {
    emit({
      kind: "error",
      message: `Stage "${slug}" is not present in the state file — cannot commit its transition.`,
    });
    return;
  }
  const isGated = node.phase !== "initialization";
  if (
    isGated &&
    stageCheckbox.state !== "completed" &&
    detectHarnessType() === "kimi"
  ) {
    emit(errorDirective(
      `Kimi gate approval for "${slug}" requires the stage reservation carrier from gate-reserve.`,
    ));
    return;
  }

  // Both approve guards — the per-unit coverage gate (#368) and the approve-time
  // swarm reconciliation (FR-2) — live in gatedApproveRefusal so the carrier
  // report path enforces the identical set (#2375). The active intent is the one
  // under judgement here, so the intent argument is left at its default.
  const refusal = gatedApproveRefusal(
    pd,
    node,
    scope,
    slug,
    stateContent,
    stageCheckbox.state,
  );
  if (refusal !== null) {
    emit(errorDirective(refusal));
    return;
  }

  // Finality — is there an in-scope stage after this one? (state-override aware,
  // so EXECUTE/SKIP suffixes and prior [x]/[S] checkboxes are honoured.)
  const isFinal = nextInScopeStage(slug, scope, stateContent) === null;
  const completionDisposition = isFinal
    ? completionMirrorDisposition(pd)
    : { kind: "immediate" as const };
  if (completionDisposition.kind === "error") {
    emit(errorDirective(completionDisposition.message));
    return;
  }
  const deferWorkflowCompletion =
    isFinal && completionDisposition.kind === "defer";

  const status = getField(stateContent, "Status") ?? "";

  // Decide the committing subcommand(s). Normal gated stages still dispatch
  // to approve only. Explicit-stage recovery may first open a missing gate:
  // this preserves the state-machine audit trail (STAGE_AWAITING_APPROVAL
  // before GATE_APPROVED) without asking the conductor to hand-roll the
  // deterministic transition.
  const sequence: string[][] = [];
  if (stageCheckbox.state === "skipped" || stageCheckbox.state === "revising") {
    emit({
      kind: "error",
      message:
        `Stage "${slug}" is ${stageCheckbox.state}; report commits forward completions only.`,
    });
    return;
  }
  if (stageCheckbox.state === "pending") {
    emit({
      kind: "error",
      message:
        `Stage "${slug}" is still pending. Run the stage before reporting it complete.`,
    });
    return;
  }

  if (stageCheckbox.state === "completed") {
    if (isFinal) {
      let prepared: ReturnType<typeof workflowCompletionPreparation>;
      try {
        prepared = workflowCompletionPreparation(stateContent);
      } catch (cause) {
        emit(errorDirective(errorMessage(cause)));
        return;
      }
      if (prepared !== null) {
        if (prepared.status === "pending") {
          if (!emitMirrorBoundaryIfNeeded(pd, stateContent)) {
            emit(errorDirective(
              `Workflow completion for "${slug}" is pending but no mirror boundary directive was available.`,
            ));
          }
          return;
        }
      }
      if (status === "Completed") {
        const recordDir = completionRecordDir(pd);
        try {
          authorizePersistedCompletedWorkflow({
            projectDir: pd,
            recordDir,
            content: stateContent,
          });
        } catch (cause) {
          emit(errorDirective(
            `Goal reconciliation refused completed recovery: ${completedRecoveryError(cause)}`,
          ));
          return;
        }
        emit({
          kind: "done",
          reason:
            `Workflow is already completed at "${slug}" (scope: ${scope}); no transition was needed.`,
        });
        return;
      }
      const completeArgs = ["complete-workflow", slug];
      if (flags.reason) completeArgs.push("--reason", flags.reason);
      sequence.push(completeArgs);
    } else {
      // Stale re-report guard. If the workflow has already moved on — Current
      // Stage points at a DIFFERENT slug whose checkbox has left pending — a
      // re-report of the completed stage is a replay, not a recovery. Spawning
      // advance here would demote a gate-held `[?]`/`[R]` current stage back to
      // `[-]` and re-emit STAGE_STARTED. The legitimate recovery (approve
      // landed but advance crashed: slug === currentSlug, next still pending)
      // falls through to advance below.
      const currentCb =
        slug === currentSlug ? undefined : checkboxForSlug(stateContent, currentSlug);
      if (currentCb && currentCb.state !== "pending") {
        emit({
          kind: "committed",
          reason:
            `Stage "${slug}" is already completed and the workflow has moved on to ` +
            `"${currentSlug}" (scope: ${scope}); idempotent re-report, no transition needed.`,
        });
        return;
      }
      sequence.push(["advance", slug]);
    }
  } else if (isGated) {
    if (stageCheckbox.state === "in-progress") {
      if (!explicitStage) {
        emit({
          kind: "error",
          message:
            `Stage "${slug}" is still in-progress. To approve a gated stage that has not entered ` +
            `awaiting-approval, report the acted directive explicitly with --stage "${slug}" so ` +
            "the engine cannot mistake a freshly advanced Current Stage for the completed one.",
        });
        return;
      }
      // Backfilled gate — tag the row Recovered=true so audit consumers can
      // tell the engine-opened gate from an organic gate-start.
      sequence.push(["gate-start", slug, "--recovered"]);
    }
    sequence.push(approveArgs(slug, flags, deferWorkflowCompletion));
  } else if (isFinal) {
    const completeArgs = ["complete-workflow", slug];
    if (flags.reason) completeArgs.push("--reason", flags.reason);
    sequence.push(completeArgs);
  } else {
    sequence.push(["advance", slug]);
  }

  const committed: string[] = [];
  for (const subArgs of sequence) {
    const res = spawnState(pd, subArgs);
    if (res.exitCode !== 0) {
      // amadeus-state.ts rejected the transition (error() exits non-zero). Surface
      // its message verbatim so the rejection is a clear signal, not a silent miss.
      const detail = (res.stderr || res.stdout).trim();
      emit({
        kind: "error",
        message:
          `Transition rejected by amadeus-state.ts ${subArgs[0]} for "${slug}"` +
          (detail ? `: ${detail}` : "."),
      });
      return;
    }
    committed.push(subArgs[0]);
  }
  if (committed.length === 0) {
    emit({
      kind: "error",
      message: `Internal: no transition selected for "${slug}".`,
    });
    return;
  }
  if (deferWorkflowCompletion) {
    closeAdvisoryInstancesForStage(pd, slug);
    emitDeferredCompletionBoundary(pd, slug);
    return;
  }

  closeAdvisoryInstancesForStage(pd, slug);

  // The transition committed. Emit a non-terminal `committed` directive naming
  // the move — the loop driver reads this to know the report landed and the next
  // `next` will see fresh state. Deliberately NOT `done`: `done` tells the
  // conductor to present a completion summary and stop, which mid-workflow is a
  // false completion (issue #2762).
  const intentCaptureMirror =
    slug === "intent-capture"
      ? (() => {
          const updated = loadStateFileIfPresent(pd);
          const instance = updated
            ? (getField(updated, "Last Updated") ?? slug).trim()
            : slug;
          return (
            ` Run \`bun ${harnessDir()}/tools/amadeus-mirror-lifecycle.ts ` +
            `boundary intent-capture --instance ${JSON.stringify(instance)} ` +
            `--project-dir ${JSON.stringify(pd)}\` before continuing.`
          );
        })()
      : "";
  emit({
    kind: "committed",
    reason:
      `Committed ${committed.join(" + ")} for "${slug}" (scope: ${scope}). ` +
      `State advanced.${intentCaptureMirror} Run next to continue.`,
  });
}

// The `park` handler (issue #367). Parks the workflow at the current inter-stage
// boundary: it shells out to `amadeus-state.ts park` (which persists the
// Parked/Parked At Stage runtime markers, emits WORKFLOW_PARKED, and refuses
// under autonomous Construction), then emits the terminal `parked` directive the
// Stop hook honours as a clean turn-end. Mutation lives entirely in the spawned
// subcommand - the engine itself writes nothing, mirroring report's discipline.
// A non-zero exit (e.g. the autonomy refusal, or an already-completed workflow)
// is relayed verbatim as an error directive.
export function handleFailureRuling(args: string[], projectDir: string | undefined): void {
  _handlerProjectDir = projectDir;
  if (refuseAmbientProjectDir(projectDir)) return;
  const flags = parseReportFlags(args);
  const pd = resolveProjectDir(projectDir);
  const state = loadStateFileIfPresent(pd);
  // biome-ignore format: One evaluated tuple keeps Bun's line coverage from reporting the two executed initializers as zero-hit regions.
  const [stage, intent, normalized] = [flags.stage?.trim() || (state ? getField(state, "Current Stage")?.trim() : undefined), activeIntent(pd, activeSpace(pd)), normalizeConstructionOutcomeAudit(readAllAuditShards(pd))] as const;
  if (!stage || !intent || !normalized.ok) { emit(errorDirective("Cannot resolve the canonical Construction failure target.")); return; }
  const projected = projectConstructionOutcomes(normalized.records, { intent, stage, batches: readBoltDagBatches(pd) ?? [] });
  if (!projected.ok) { emit(errorDirective(`Construction outcome join failed closed: ${JSON.stringify(projected.diagnostics)}`)); return; }
  if (projected.projection.constructionSuspended) { emit(errorDirective("Construction is suspended after Abort; resume explicitly before any new failure ruling.")); return; }
  const pending = constructionFailureTransition(projected.projection);
  if (pending.kind !== "await-unit-ruling" || !pending.target.attempt || !pending.target.batch) { emit(errorDirective("No unresolved Construction Unit failure is eligible for a ruling.")); return; }
  const answer = flags.userInput?.trim().toLowerCase();
  if (answer !== "retry" && answer !== "skip" && answer !== "abort") { emit(errorDirective("resolve-failure requires --user-input Retry, Skip, or Abort.")); return; }
  const solo = pending.target.batch.startsWith("solo:");
  const soloBatchNumber = solo ? pending.target.batch.split(":")[1] : undefined;
  if (solo && (!soloBatchNumber || !/^[1-9][0-9]*$/.test(soloBatchNumber))) { emit(errorDirective("Solo Construction failure has an invalid explicit batch identity.")); return; }
  const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(pd));
  if (answer === "retry") {
    if (solo) {
      const started = runTool(pd, "amadeus-bolt.ts", [
        "start", "--name", pending.target.unit, "--batch", soloBatchNumber!, "--project-dir", pd,
      ]);
      if (!started.ok) { emit(errorDirective(`Solo Retry transition refused: ${toolErrorMessage(started)}`)); return; }
      emit({ kind: "committed", reason: `Retry committed for solo Unit "${pending.target.unit}" with a fresh immutable attempt; run next to continue.` });
      return;
    }
    const retried = pool.retryFailedUnit({ idempotencyKey: `failure-ruling:${pending.target.attempt}:retry`, batchId: pending.target.batch, unitId: pending.target.unit });
    if (!retried.ok) { emit(errorDirective(`Retry transition refused: ${retried.reason}`)); return; }
    emit(preparedSwarmRetryDirective(pd, pending.target.batch, pending.target.unit));
    return;
  }
  if (answer === "skip") {
    if (solo) {
      const appended = spawnAuditAppend(pd, "BOLT_COMPLETED", {
        "Bolt names": pending.target.unit,
        "Bolt slug": pending.target.unit,
        "Batch number": soloBatchNumber!,
        "Batch Id": pending.target.batch,
        "Attempt Id": pending.target.attempt,
        Stage: stage,
        Outcome: "cancelled",
        Reason: "skipped",
      });
      if (appended.exitCode !== 0) { emit(errorDirective(`Solo Skip audit commit failed: ${appended.stderr.trim() || appended.stdout.trim()}`)); return; }
      emit({ kind: "committed", reason: `Skip committed for solo Unit "${pending.target.unit}" as cancelled.` });
      return;
    }
    const skipped = pool.skipFailedUnit({ idempotencyKey: `failure-ruling:${pending.target.attempt}:skip`, batchId: pending.target.batch, unitId: pending.target.unit, reason: "skipped" });
    if (!skipped.ok) { emit(errorDirective(`Skip transition refused: ${skipped.reason}`)); return; }
    emit({ kind: "committed", reason: `Skip committed for Unit "${pending.target.unit}" as cancelled; sibling outcomes are preserved.` });
    return;
  }
  const aborted = runTool(pd, "amadeus-bolt.ts", ["abort", "--name", pending.target.unit, "--slug", pending.target.unit, "--reason", "Construction failure ruling", "--stage", stage, "--attempt", pending.target.attempt, "--batch-id", pending.target.batch, "--project-dir", pd]);
  if (!aborted.ok) { emit(errorDirective(`Abort transition refused: ${toolErrorMessage(aborted)}`)); return; }
  emit(parkedDirective(`Construction parked after Abort for Unit "${pending.target.unit}"; failure evidence and worktree are preserved.`, stage));
}

// Not exported, so main() is its only caller and the project is always named
// (main resolves it before dispatch) — the type says so, and no runtime refusal
// is needed here.
function handlePark(_args: string[], projectDir: string): void {
  _handlerProjectDir = projectDir;
  if (refuseUnauthorizedKimiCaller(projectDir)) return;
  const pd = resolveProjectDir(projectDir);
  const res = spawnState(pd, ["park"]);
  if (res.exitCode !== 0) {
    const detail = (res.stderr || res.stdout).trim();
    emit(errorDirective(`Cannot park the workflow${detail ? `: ${detail}` : "."}`));
    return;
  }
  const stateContent = loadStateFileIfPresent(pd);
  const parkedAt = stateContent
    ? (getField(stateContent, "Parked At Stage") ?? "").trim()
    : "";
  const instance = stateContent
    ? (getField(stateContent, "Last Updated") ?? parkedAt).trim()
    : parkedAt;
  const mirrorCommand =
    `bun ${harnessDir()}/tools/amadeus-mirror-lifecycle.ts boundary park ` +
    `--stage ${JSON.stringify(parkedAt)} --instance ${JSON.stringify(instance)} ` +
    `--project-dir ${JSON.stringify(pd)}`;
  emit(parkedDirective(
    `Workflow parked at "${parkedAt}". Run \`${mirrorCommand}\`, then resume with /amadeus --resume.`,
    parkedAt,
  ));
}

export function openGateForKimiReservation(
  pd: string,
  slug: string,
  reservation: PresenceReservation,
): string | null {
  const stateContent = loadStateFileIfPresent(
    pd,
    reservation.targetIntentDir,
    reservation.space,
  );
  const currentStage = stateContent === null
    ? null
    : getField(stateContent, "Current Stage");
  const checkbox = stateContent === null
    ? undefined
    : checkboxForSlug(stateContent, slug);
  if (
    currentStage !== slug ||
    (checkbox?.state !== "in-progress" &&
      checkbox?.state !== "awaiting-approval" &&
      checkbox?.state !== "revising")
  ) {
    return `gate-reserve requires current stage "${slug}" to be in-progress, revising, or awaiting-approval.`;
  }
  if (checkbox.state === "awaiting-approval") return null;
  const transition = checkbox.state === "revising" ? "revise" : "gate-start";
  const opened = spawnState(pd, [
    transition,
    slug,
    ...(transition === "gate-start" ? ["--recovered"] : []),
    "--intent",
    reservation.targetIntentDir,
    "--space",
    reservation.space,
  ]);
  if (opened.exitCode === 0) return null;
  const detail = (opened.stderr || opened.stdout).trim();
  return (
    `Transition rejected by amadeus-state.ts ${transition} for "${slug}"` +
    (detail ? `: ${detail}` : ".")
  );
}

type KimiGateReservationOwner = {
  readonly space: string;
  readonly uuid: string;
};

function kimiGateReservationOwner(pd: string): KimiGateReservationOwner | null {
  const space = activeSpace(pd);
  const intent = activeIntent(pd, space);
  if (intent === null) return null;
  const owner = readIntentRegistry(pd, space).find((entry) =>
    recordDirMatches(entry, intent)
  );
  return owner === undefined ? null : { space, uuid: owner.uuid };
}

type KimiGateReservationResult =
  | {
    readonly kind: "reserved";
    readonly reservation: PresenceReservation;
    readonly newlyArmed: boolean;
  }
  | { readonly kind: "error"; readonly message: string };

function matchingKimiGateReservation(
  pd: string,
  sessionId: string,
  owner: KimiGateReservationOwner,
  slug: string,
): PresenceReservation | null {
  const active = findActivePresenceReservation(pd, sessionId);
  if (active === null) return null;
  if (
    active.space !== owner.space ||
    active.targetIntentId !== owner.uuid ||
    active.stage !== slug ||
    active.routeId !== active.reservationId
  ) {
    throw new Error(
      "Trusted session already has a reservation for another approval route",
    );
  }
  return active;
}

function reserveKimiGateApproval(
  pd: string,
  sessionId: string,
  owner: KimiGateReservationOwner,
  slug: string,
): KimiGateReservationResult {
  try {
    const active = matchingKimiGateReservation(
      pd,
      sessionId,
      owner,
      slug,
    );
    if (active !== null) {
      const state = loadStateFileIfPresent(
        pd,
        active.targetIntentDir,
        active.space,
      );
      const interruptedRejection =
        active.state === "minted" &&
        state !== null &&
        checkboxForSlug(state, slug)?.state === "revising";
      if (!interruptedRejection) {
        // A concurrent retry may have retired this snapshot while the owner
        // state was read. Linearize the return under the reservation lock and
        // converge on the current carrier instead of returning stale authority.
        const winner = withAuditLock(pd, () =>
          matchingKimiGateReservation(pd, sessionId, owner, slug)
        );
        if (winner === null) {
          throw new Error("Trusted session reservation changed during retry");
        }
        return { kind: "reserved", reservation: winner, newlyArmed: false };
      }
      // The rejection state and audit committed before the old carrier's
      // consume write. Retire that exact residue before re-presenting the gate.
      consumePresenceReservation({
        projectDir: pd,
        sessionId,
        reservationId: active.reservationId,
        targetIntentId: active.targetIntentId,
        stage: slug,
      });
    }
    const reservationId = randomUUID();
    try {
      const reservation = armPresenceReservation({
        projectDir: pd,
        sessionId,
        space: owner.space,
        targetIntentId: owner.uuid,
        stage: slug,
        routeId: reservationId,
        reservationIdFactory: () => reservationId,
      });
      return { kind: "reserved", reservation, newlyArmed: true };
    } catch (cause) {
      // Another simultaneous retry may have won between the initial lookup
      // and arm. Re-read through matchingKimiGateReservation, whose active
      // lookup owns the reservation lock, and converge on that exact route;
      // unrelated or corrupt markers still fail loudly.
      const winner = matchingKimiGateReservation(
        pd,
        sessionId,
        owner,
        slug,
      );
      if (winner !== null) {
        return { kind: "reserved", reservation: winner, newlyArmed: false };
      }
      throw cause;
    }
  } catch (cause) {
    return {
      kind: "error",
      message:
        `Cannot reserve Kimi approval for "${slug}": ${errorMessage(cause)}`,
    };
  }
}

function gateOpenedAfterReservation(
  pd: string,
  sessionId: string,
  slug: string,
  reservation: PresenceReservation,
  newlyArmed: boolean,
): boolean {
  const state = loadStateFileIfPresent(
    pd,
    reservation.targetIntentDir,
    reservation.space,
  );
  const awaiting =
    state !== null && checkboxForSlug(state, slug)?.state === "awaiting-approval";
  if (!awaiting && newlyArmed) {
    try {
      cancelArmedPresenceReservation(
        pd,
        sessionId,
        reservation.reservationId,
      );
    } catch {
      // The command still returns no carrier. A later retry resolves the
      // exact marker or rejects it; it can never authorize another route.
    }
  }
  return awaiting;
}

export function handleGateReserve(
  args: string[],
  projectDir: string | undefined,
): void {
  if (refuseUnauthorizedKimiCaller(projectDir)) return;
  const stageIndex = args.indexOf("--stage");
  const slug = stageIndex === -1 ? undefined : args[stageIndex + 1];
  if (!slug || slug.startsWith("--")) {
    emitStateNeutralError("gate-reserve requires --stage <slug>.");
    return;
  }
  if (detectHarnessType() !== "kimi") {
    emitStateNeutralError("gate-reserve is available only on the Kimi harness.");
    return;
  }
  const sessionId = trustedHostSessionId(projectDir);
  if (!sessionId) {
    emitStateNeutralError(
      "gate-reserve requires a trusted Kimi conductor session.",
    );
    return;
  }
  const pd = resolveProjectDir(projectDir);
  const owner = kimiGateReservationOwner(pd);
  if (owner === null) {
    emitStateNeutralError("gate-reserve could not resolve one active intent.");
    return;
  }
  const reserved = reserveKimiGateApproval(pd, sessionId, owner, slug);
  if (reserved.kind === "error") {
    emitStateNeutralError(reserved.message);
    return;
  }
  const openError = openGateForKimiReservation(
    pd,
    slug,
    reserved.reservation,
  );
  if (openError !== null) {
    if (
      !gateOpenedAfterReservation(
        pd,
        sessionId,
        slug,
        reserved.reservation,
        reserved.newlyArmed,
      )
    ) {
      emitStateNeutralError(openError);
      return;
    }
  }
  emit({
    kind: "await-approval",
    stage: slug,
    reason: "kimi-human-approval-required",
    target_intent_id: owner.uuid,
    presence_reservation_id: reserved.reservation.reservationId,
  });
}

export function handleGateReject(
  args: string[],
  projectDir: string | undefined,
): void {
  if (refuseUnauthorizedKimiCaller(projectDir)) return;
  const value = (name: string): string | undefined => {
    const index = args.indexOf(name);
    const candidate = index === -1 ? undefined : args[index + 1];
    return candidate === undefined || candidate.startsWith("--")
      ? undefined
      : candidate;
  };
  const slug = value("--stage");
  const targetIntentId = value("--target-intent-id");
  const reservationId = value("--presence-reservation-id");
  const feedback = value("--feedback");
  if (!slug || !targetIntentId || !reservationId) {
    emitStateNeutralError(
      "gate-reject requires --stage, --target-intent-id, and --presence-reservation-id.",
    );
    return;
  }
  if (detectHarnessType() !== "kimi") {
    emitStateNeutralError("gate-reject is available only on the Kimi harness.");
    return;
  }
  if (!trustedHostSessionId(projectDir)) {
    emitStateNeutralError(
      "gate-reject requires a trusted Kimi conductor session.",
    );
    return;
  }
  const pd = resolveProjectDir(projectDir);
  let marker: PresenceReservation | null;
  try {
    marker = readPresenceReservation(pd, reservationId);
  } catch (cause) {
    emitStateNeutralError(
      `Invalid presence reservation: ${errorMessage(cause)}`,
    );
    return;
  }
  if (
    marker === null ||
    marker.targetIntentId !== targetIntentId ||
    marker.stage !== slug
  ) {
    emitStateNeutralError(
      "Presence reservation does not match the gate rejection.",
    );
    return;
  }
  const rejectArgs = [
    "reject",
    slug,
    "--target-intent-id",
    targetIntentId,
    "--presence-reservation-id",
    reservationId,
    "--intent",
    marker.targetIntentDir,
    "--space",
    marker.space,
  ];
  if (feedback) rejectArgs.push("--feedback", feedback);
  const rejected = spawnState(pd, rejectArgs);
  if (rejected.exitCode !== 0) {
    const detail = (rejected.stderr || rejected.stdout).trim();
    emitStateNeutralError(
      `Transition rejected by amadeus-state.ts reject for "${slug}"` +
        (detail ? `: ${detail}` : "."),
    );
    return;
  }
  emit(printDirective(
    `Request Changes recorded for "${slug}". Complete the Keep/Modify/Redo revision, then run gate-reserve again to mint a new approval carrier.`,
  ));
}

// --- CLI entry point ---

function main(): void {
  const rawArgs = process.argv.slice(2);

  // Extract --project-dir (mirrors amadeus-jump.ts / amadeus-state.ts).
  let projectDir: string | undefined;
  const filteredArgs: string[] = [];
  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === "--project-dir" && i + 1 < rawArgs.length) {
      projectDir = rawArgs[i + 1];
      i++;
    } else {
      filteredArgs.push(rawArgs[i]);
    }
  }

  const subcommand = filteredArgs[0];
  const subArgs = filteredArgs.slice(1);

  // Record the operating project for emit()/the top-level catch (#1389). The
  // handlers set this too (for in-process drivers that bypass main); setting it
  // here covers the unknown-subcommand path and the runEngineMain catch.
  _handlerProjectDir = projectDir;

  // Telemetry process span (opt-in; no-op unless observability.enabled).
  // Resolution failures must not change the CLI contract — skip silently.
  const resolvedProject = resolveProjectDirWithSource(projectDir);
  try {
    initProcessObservability(`tool:amadeus-orchestrate:${subcommand ?? "?"}`, resolvedProject.projectDir);
  } catch {
    // no resolvable workflow -> nothing to observe
  }


  // The CLI always names the project it operates on: resolve argv's (possibly
  // absent) --project-dir through the ordinary ladder HERE, once, so the
  // workflow handlers below receive a named project and their unnamed-project
  // refusal (#3004) stays exclusive to in-process callers. Resolution is
  // idempotent — an explicit dir is returned unchanged — so the CLI contract is
  // byte-unchanged.
  switch (subcommand) {
    case "next":
      handleNext(subArgs, resolvedProject.projectDir, resolvedProject.source);
      break;
    case "report":
      handleReport(subArgs, resolvedProject.projectDir);
      break;
    case "resolve-failure":
      handleFailureRuling(subArgs, resolvedProject.projectDir);
      break;
    case "park":
      handlePark(subArgs, resolvedProject.projectDir);
      break;
    case "gate-reserve":
      handleGateReserve(subArgs, projectDir);
      break;
    case "gate-reject":
      handleGateReject(subArgs, projectDir);
      break;
    default: {
      // Unknown / missing subcommand — usage to stderr, exit 1. Mirror the
      // sibling tools (amadeus-state.ts default -> error()): record an
      // ERROR_LOGGED row before exiting so a bad subcommand leaves audit
      // evidence, not just a stderr line (Issue #878). No-op pre-init.
      const usage = `Unknown subcommand: ${subcommand ?? "(none)"}. Valid: next, report, resolve-failure, park, gate-reserve, gate-reject`;
      recordEngineError(usage, projectDir);
      console.error(usage);
      process.exit(1);
    }
  }
}

// Run main() under the top-level error boundary. Extracted from the
// import.meta.main shim so the catch is drivable in-process (the shim body
// itself only runs when spawned, which coverage cannot see through). Exported
// for the seam test.
export function runEngineMain(): void {
  try {
    main();
  } catch (e) {
    // Any uncaught read error (missing graph, malformed state) surfaces as a
    // non-zero exit with the message on stderr — never a half-emitted
    // directive on stdout. Best-effort ERROR_LOGGED first (Issue #839) so the
    // failure leaves audit evidence, not just a conversation-log trace; the
    // console.error + exit(1) below are unchanged.
    recordEngineError(errorMessage(e));
    console.error(`amadeus-orchestrate: ${errorMessage(e)}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  runEngineMain();
}
