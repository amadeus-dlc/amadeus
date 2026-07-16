import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appendAuditEntry, appendAuditEntryUnlocked } from "./amadeus-audit.ts";
import {
  activeIntent,
  activeSpace,
  auditShardDir,
  auditShardName,
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
  holdsAuditLock,
  humanActedSinceGate,
  humanPresenceGuardDisabled,
  isAutonomousMode,
  isoTimestamp,
  loadScopeMapping,
  nextInScopeStage,
  normalizeWorktreeSlug,
  PHASE_NUMBERS,
  PHASES,
  parseCheckboxes,
  parseRefsList,
  parseStateStageSuffixes,
  readAllAuditShards,
  readStateFile,
  recordDir,
  relativeMemoryPath,
  relativeRecordDir,
  removeField,
  removeSlug,
  replaceSection,
  resolveProjectDir,
  resolveStage,
  setCheckbox,
  setField,
  setFieldStrict,
  setIntentDocsOnly,
  setOrInsertField,
  stageIndex,
  stagesInScope,
  updateIntentStatus,
  validScopes,
  withAuditLock,
  worktreeDocsDir,
  worktreePath,
  worktreeStateFilePath,
  writeStateFile,
} from "./amadeus-lib.js";
import { memoryDirFor } from "./amadeus-graph.ts";

// All valid checkbox states (lib.ts adds [?] awaiting-approval and [R] revising)
const VALID_CHECKBOX_STATES: CheckboxState[] = [
  "pending",
  "in-progress",
  "awaiting-approval",
  "revising",
  "completed",
  "skipped",
];

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
const PHASE_CHECK_REQUIRED_PHASES: ReadonlySet<string> = new Set([
  "ideation",
  "inception",
  "construction",
]);

// Refuse a phase-boundary completion when `phase` requires a phase-check
// artifact and it is missing. No-op for phases outside
// PHASE_CHECK_REQUIRED_PHASES. Honors the same AMADEUS_SKIP_ARTIFACT_GUARD
// bypass as verifyStageArtifacts (the shared test/emergency seam the suite sets
// globally) so it participates in one documented off-switch rather than a second
// one. Callers invoke it BEFORE writeStateFile; error() exits, so a refusal
// leaves the state file untouched (the in-memory content flips are discarded).
// Exported so amadeus-jump.ts reuses the identical gate on its forward crossing.
export function verifyPhaseCheckArtifact(pd: string, phase: string): void {
  if (artifactGuardDisabled()) return;
  if (!PHASE_CHECK_REQUIRED_PHASES.has(phase)) return;
  const rec = recordDir(pd);
  if (rec === null) {
    let msg = `Refusing to verify the "${phase}" phase boundary: no active intent record resolves, `;
    msg += `so there is nowhere to check for verification/phase-check-${phase}.md.`;
    error(msg);
  }
  const artifactPath = join(rec, "verification", `phase-check-${phase}.md`);
  if (!existsSync(artifactPath)) {
    let msg = `Refusing to complete the "${phase}" phase boundary: verification/phase-check-${phase}.md `;
    msg += `does not exist under the intent's record directory. The phase-boundary protocol requires `;
    msg += `a phase-check artifact before PHASE_VERIFIED. Produce verification/phase-check-${phase}.md `;
    msg += `before completing. (expected: ${artifactPath})`;
    error(msg);
  }
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
//
// A bare PHASE_NUMBERS[lower] walks the prototype chain, so all-lowercase
// Object.prototype members (`constructor`, `__proto__`) resolve to truthy
// non-string values and are mistaken for valid phases. Object.hasOwn keeps
// those names on the null (valid:false) path. Kept local to this tool (E-L17):
// the PHASE_NUMBERS constant stays shared, but each site carries its own guard
// to avoid cross-file churn; #833 tracks lifting the copies.
export function ownPhase(input: string): string | null {
  const lower = input.toLowerCase();
  if (Object.hasOwn(PHASE_NUMBERS, lower)) return PHASE_NUMBERS[lower];
  return (PHASES as readonly string[]).includes(lower) ? lower : null;
}

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
// Declared at module top (not beside verifyStageArtifacts) because the command
// dispatch runs at top level: a const declared lower in the file would be in
// its temporal dead zone when an approve/advance dispatch calls the guard.
const HARNESS_DOC_DIRS = new Set([
  "amadeus",
  ".claude",
  ".kiro",
  ".codex",
  ".git",
]);

// The codekb stages - their produces live in the space-level codekb dir, keyed
// by repo, NOT under a per-intent record dir. Mirrors KNOWN_CODEKB_STAGES in
// amadeus-orchestrate.ts (kept local because that set is not exported and the
// guard has no engine context at approve/advance time). reverse-engineering is
// the sole member; a future codekb stage joins both sets. Declared at module
// top (not beside verifyStageArtifacts) for the same TDZ reason as
// HARNESS_DOC_DIRS: the command dispatch runs at top level, so a const declared
// lower in the file would be in its temporal dead zone when the guard runs.
const KNOWN_CODEKB_STAGES: ReadonlySet<string> = new Set(["reverse-engineering"]);

// --- Audit emission helper ---
// Uses the throw-on-error appendAuditEntry (not handleAppend which writes JSON to stdout).
// Caller wraps in try/catch; a thrown exception is the signal that audit failed and
// the state write should not proceed.
//
// Lock-aware: when the caller is mid-transaction inside a withAuditLock (the
// C2b lost-update wrapping — every RMW handler below holds the lock across
// read→decide→emit→write), this process already owns the OS lock. Routing
// through appendAuditEntry (which calls the NON-reentrant acquireAuditLock)
// would self-deadlock and burn the 5s retry budget before throwing, so detect
// the held lock and use the unlocked append variant instead — exactly how
// handleFork/handleMerge emit (appendAuditEntryUnlocked) and how emitError
// branches in amadeus-lib.ts. Outside a held lock (no current caller, but kept
// safe for any future bare-emit site) it takes its own lock as before.
function emitAudit(
  projectDir: string,
  eventType: string,
  fields: Record<string, string>
): void {
  if (holdsAuditLock(projectDir)) {
    appendAuditEntryUnlocked(eventType, fields, projectDir);
  } else {
    appendAuditEntry(eventType, fields, projectDir);
  }
}

function auditField(block: string, fieldName: string): string | null {
  const prefix = `**${fieldName}**:`;
  for (const line of block.split("\n")) {
    if (line.startsWith(prefix)) return line.slice(prefix.length).trim();
  }
  return null;
}

function hasStageAuditEvent(
  projectDir: string,
  eventType: string,
  stageSlug: string
): boolean {
  // Read across every per-clone audit shard (one in the common single-clone /
  // flat-legacy case; the glob-merge matters only when concurrent clones append
  // to the same intent). readAllAuditShards returns "" when no shard exists.
  const audit = readAllAuditShards(projectDir);
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

// --- Slug + small helpers (used by fork/merge handlers below; declared
// before main() so they're initialised before dispatch fires) ---

const SLUG_RE = /^[a-z][a-z0-9-]*$/;

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

function sha256(buf: string): string {
  return createHash("sha256").update(buf).digest("hex");
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--") && i + 1 < args.length) {
      flags[a.slice(2)] = args[i + 1];
      i++;
    }
  }
  return flags;
}

// --- CLI entry point ---

let projectDir: string | undefined;

// Active per-intent lock context for the in-transaction error path. handleFork/
// handleMerge resolve their intent and hold a PER-INTENT audit lock across the
// whole transaction (withAuditLock(pd, fn, resolvedIntent, space)). When an
// errorWithSlug fires mid-transaction it routes through error() -> emitError,
// whose holdsAuditLock probe must key the SAME per-intent bucket the caller
// holds — a bare holdsAuditLock(pd) keys the __workspace__ sentinel, returns
// false mid per-intent transaction, and takes emitError's 5s blocking-acquire
// branch writing ERROR_LOGGED to the wrong bucket. These mirror the resolved
// intent+space into error() so emitError keys lock==write. Set immediately
// before the lock, cleared after; on the happy path no error fires and they are
// harmless. All OTHER handlers lock the sentinel bucket and leave these unset
// (undefined), so error() keys the sentinel for them — correct.
let lockIntent: string | undefined;
let lockSpace: string | undefined;

function main(): void {
  const args = process.argv.slice(2);

  // Extract --project-dir flag
  const pdIdx = args.indexOf("--project-dir");
  if (pdIdx !== -1 && pdIdx + 1 < args.length) {
    projectDir = args[pdIdx + 1];
    args.splice(pdIdx, 2);
  }

  const subcommand = args[0];

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
      default:
        error(
          `Unknown subcommand: ${subcommand}. Valid: get, set, set-skeleton-stance, checkbox, count, advance, finalize, complete-workflow, gate-start, approve, delegate-approval, delegate-rejection, reject, revise, skip, resume, acknowledge-compaction, reuse-artifact, lookup, practices-event, practices-promote, fork, merge, park, unpark, declare-docs-only`
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

function handleGet(args: string[]): void {
  if (args.length < 1) error("Usage: amadeus-state.ts get <field>");
  const field = args.join(" ");
  const pd = resolveProjectDir(projectDir);
  const content = readStateFile(pd);
  const value = getField(content, field);
  if (value === null) {
    error(`Field not found: ${field}`);
  }
  console.log(value);
}

function handleSet(args: string[]): void {
  if (args.length < 1) error("Usage: amadeus-state.ts set <field=value> ...");
  const pd = resolveProjectDir(projectDir);
  // C2b lost-update safety: hold the audit lock across read→decide→write so
  // two concurrent `set`s of different fields can't clobber each other (A reads
  // V1, B reads V1, A writes V2, B writes V1.5 → A's field lost). The +1/-1
  // increment forms are especially exposed — they read-modify a counter.
  withAuditLock(pd, () => {
  let content = readStateFile(pd);

  // Parse every pair up front so field existence can be validated as one pass
  // before any write. `set` must fail closed (Issue #1027): if a target field
  // row is absent, setField silently no-ops, so the old code wrote an unchanged
  // file and still reported `{"updated":true}` — a lie the caller trusts.
  // Plain loops (no arrow callbacks): the complexity baseline keys anonymous
  // functions by ordinal, so adding closures here would shift every later
  // anonymous entry off its baseline row.
  const pairs: { field: string; value: string }[] = [];
  for (const pair of args) {
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
  }

  // Reached only when every field existed: the write is real, so the success
  // report is now execution-derived (FR-2), not unconditional.
  writeStateFile(pd, content);
  console.log(JSON.stringify({ updated: true, fields: args.length }));
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
// AUTONOMY GUARD (issue #365, salvaged from the suspend branch): an unattended
// autonomous Construction run must never park, so the tool refuses `park`
// outright under `Construction Autonomy Mode: autonomous`. This is
// defence-in-depth beside the Stop hook's identical guard: the hook protects
// the unattended turn-end path, this tool refusal protects a direct/scripted
// `amadeus-state.ts park` invocation in an autonomous run. (#365's suspend
// mechanism had no first-class tool verb a swarm could call, so it could guard
// hook-side only; park's `amadeus-state.ts park` is directly invocable, so the
// tool refusal closes a path #365 did not have.)
function handlePark(_args: string[]): void {
  const pd = resolveProjectDir(projectDir);
  withAuditLock(pd, () => {
    let content = readStateFile(pd);
    if (getField(content, "Construction Autonomy Mode")?.trim() === "autonomous") {
      error(
        "Refusing to park: Construction Autonomy Mode is autonomous. An unattended " +
          "autonomous run has no human to resume it and must keep moving - do not park it.",
      );
    }
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
function handleUnpark(_args: string[]): void {
  const pd = resolveProjectDir(projectDir);
  withAuditLock(pd, () => {
    let content = readStateFile(pd);
    const wasParked = (getField(content, "Parked") ?? "").trim().length > 0;
    // Remove both runtime markers (no-op if absent - unpark is idempotent).
    content = removeField(content, "Parked");
    content = removeField(content, "Parked At Stage");
    if (wasParked) {
      const ts = isoTimestamp();
      emitAudit(pd, "WORKFLOW_UNPARKED", { Timestamp: ts });
      content = setField(content, "Last Updated", ts);
    }
    writeStateFile(pd, content);
    console.log(JSON.stringify({ unparked: true, was_parked: wasParked }));
  });
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

function handleCheckbox(args: string[]): void {
  if (args.length < 1) error("Usage: amadeus-state.ts checkbox <slug=state> ...");
  const pd = resolveProjectDir(projectDir);

  // Parse + validate args BEFORE taking the lock — pure input checks that
  // touch no shared state, so they fail fast without holding the lock.
  const changes: Array<{ slug: string; state: CheckboxState }> = [];
  for (const pair of args) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx <= 0) error(`Invalid slug=state pair: ${pair}`);
    const slug = pair.slice(0, eqIdx);
    const stateStr = pair.slice(eqIdx + 1);
    if (!isCheckboxState(stateStr)) {
      error(`Invalid state: ${stateStr}. Valid: ${VALID_CHECKBOX_STATES.join(", ")}`);
    }
    changes.push({ slug, state: stateStr });
  }

  // C2b lost-update safety: read→apply→count→write under one lock so the
  // Completed counter resync sees a consistent snapshot (a concurrent checkbox
  // flip between our read and write would otherwise desync the count).
  withAuditLock(pd, () => {
  let content = readStateFile(pd);

  for (const { slug, state } of changes) {
    content = setCheckbox(content, slug, state);
  }

  // Sync Completed counter to actual [x] count
  const completedCount = countCheckboxes(content, "completed");
  content = setField(content, "Completed", String(completedCount));

  writeStateFile(pd, content);
  console.log(JSON.stringify({ updated: true, checkboxes: changes.length, completed_count: completedCount }));
  });
}

function handleCount(args: string[]): void {
  if (args.length < 1) error("Usage: amadeus-state.ts count <state>");
  const stateStr = args[0];
  if (!isCheckboxState(stateStr)) {
    error(`Invalid state: ${stateStr}. Valid: ${VALID_CHECKBOX_STATES.join(", ")}`);
  }
  const pd = resolveProjectDir(projectDir);
  const content = readStateFile(pd);
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
// (KNOWN_CODEKB_STAGES is declared at module top alongside HARNESS_DOC_DIRS to
// dodge the TDZ - the dispatch that calls this guard runs at module load.)

function artifactGuardDisabled(): boolean {
  return process.env.AMADEUS_SKIP_ARTIFACT_GUARD === "1";
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
  const rec = recordDir(pd);
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

// True when at least one declared produces[] artifact exists on disk under the
// stage's resolved directory. A stage with empty produces[] vacuously passes.
function producesArtifactsExist(
  pd: string,
  stage: { slug: string; phase: string; for_each?: string; produces?: string[] }
): boolean {
  const produces = stage.produces ?? [];
  if (produces.length === 0) return true; // nothing declared -> nothing to verify
  for (const dir of producesDirsForStage(pd, stage)) {
    for (const name of produces) {
      if (existsSync(join(dir, `${name}.md`))) return true;
    }
  }
  return false;
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
function isNonDocPath(p: string): boolean {
  const rel = p.trim().replace(/^"|"$/g, ""); // git -z not used; strip any quoting
  if (rel.length === 0) return false;
  const firstSeg = rel.split("/")[0];
  return !HARNESS_DOC_DIRS.has(firstSeg);
}

// Run git in the workspace, fail-safe: returns null on any spawn/exec problem so
// callers fall back to the filesystem check rather than trapping.
function git(pd: string, args: string[]): string | null {
  try {
    const r = spawnSync("git", args, {
      cwd: pd,
      encoding: "utf-8",
      timeout: 30_000,
    });
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
  const rel = relativeRecordDir(pd);
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
  const rec = recordDir(pd);
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
  const rec = recordDir(pd);
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

// Attribution rule (issue #731): when the record branch's recent history is
// doc-only, is there source work ATTRIBUTABLE TO THIS INTENT? Three intent-scoped
// probes, never a blanket post-birth diff (which would count a sibling intent's
// merged code):
//   (a) code committed directly onto the record branch since birth
//       (recordBranchSourceWork);
//   (b) code on any of THIS intent's bolt branches (Bolt Refs -> local/remote
//       refs), referenced via merge-base so a squash-merged branch still counts;
//   (c) a commit since birth whose subject references THIS intent's declared
//       issue(s) and touches non-doc files (mergedPrSourceWork) - covers a Bolt
//       PR squash-merged to main and pulled into the record branch via a merge.
function intentScopedSourceWork(pd: string): boolean {
  const birth = intentBirthCommit(pd);
  if (birth !== null && recordBranchSourceWork(pd, birth)) return true;
  for (const slug of intentBoltSlugs(pd)) {
    for (const ref of boltRefsForSlug(slug)) {
      if (boltRefHasSourceWork(pd, ref)) return true;
    }
  }
  if (birth !== null && mergedPrSourceWork(pd, birth, intentIssueRefs(pd))) return true;
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

// The guard itself. Called from approve/advance/finalize/complete-workflow
// BEFORE any state mutation, so a refusal (error() -> process.exit) leaves state
// untouched. `stage` is the StageEntry being completed. No-op when bypass active.
function verifyStageArtifacts(
  pd: string,
  stage: { slug: string; name: string; phase: string; for_each?: string; produces?: string[]; workspace_requires?: boolean }
): void {
  if (artifactGuardDisabled()) return;

  if (!producesArtifactsExist(pd, stage)) {
    error(
      `Refusing to complete "${stage.slug}": none of its declared artifacts exist ` +
        `under the intent's record directory. The stage protocol requires ${stage.name} ` +
        `to produce output before the gate. Produce the artifacts before completing. ` +
        `(declared: ${(stage.produces ?? []).join(", ") || "none"})`
    );
  }

  if (stage.workspace_requires && !workspaceHasWork(pd)) {
    // docs-only exemption (Issue #499/#848): a declared Intent (registry
    // docsOnly, written only via `declare-docs-only`) has already had a human
    // confirm its produces are record-internal documents only, so the
    // workspace_requires refusal below does not apply. Emit GUARD_EXEMPTED so
    // the exemption is auditable, then let completion proceed. No declaration
    // (or an invalid one) falls through to the original refusal, preserving
    // #366's gap detection.
    const dirName = activeIntent(pd);
    const declaration = dirName ? docsOnlyDeclaration(pd, dirName) : null;
    if (declaration) {
      emitAudit(pd, "GUARD_EXEMPTED", {
        Stage: stage.slug,
        Evidence: declaration.evidence,
      });
    } else {
      error(
        `Refusing to complete "${stage.slug}": it is a code-producing stage ` +
          `(workspace_requires) but no source work is evident outside the amadeus/ ` +
          `workspace tree. In a git workspace this means no uncommitted change and no ` +
          `code in the last commit; otherwise no source file exists. Planning docs alone ` +
          `do not satisfy ${stage.name} - write the code to the workspace. If this Intent's ` +
          `produces are genuinely record-internal documents only, declare it first: ` +
          `amadeus-state.ts declare-docs-only --evidence "<approval reference>".`
      );
    }
  }
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
  withAuditLock(pd, () => {
  let content = readStateFile(pd);

  // Look up stage data
  const completedStage = findStageBySlug(completedSlug);
  if (!completedStage) error(`Unknown stage: ${completedSlug}`);

  // Scope is authoritative for deriving next stage — refuse silent "feature"
  // fallback when the state file is missing or corrupted. Adversarial finding.
  const scope = getField(content, "Scope");
  if (!scope) {
    error(
      `State file has no Scope field. Refusing to advance — fix the state file first.`
    );
  }
  if (!validScopes().has(scope)) {
    error(
      `State file has invalid Scope "${scope}". Valid scopes: ${[...validScopes()].join(", ")}.`
    );
  }

  // Slug validation — `advance <slug>` is a post-gate-approval transition.
  // The caller must have just finished <completedSlug>. Silently accepting
  // any slug (even ones unrelated to the current state) would mutate
  // unrelated stages and emit bogus events.
  //
  // Accept two shapes cleanly:
  //   1. completedSlug matches `Current Stage` (normal post-approve flow);
  //   2. completedSlug is already `[x]` (idempotent replay / approve-first).
  // Anything else errors.
  const completedCbBefore = parseCheckboxes(content).find(
    (c) => c.slug === completedSlug
  );
  const currentStageField = getField(content, "Current Stage");
  const matchesCurrent = completedSlug === currentStageField;
  const alreadyMarkedCompleted = completedCbBefore?.state === "completed";
  const stageCompletedAlreadyAudited =
    alreadyMarkedCompleted && hasStageAuditEvent(pd, "STAGE_COMPLETED", completedSlug);
  if (!matchesCurrent && !alreadyMarkedCompleted) {
    error(
      `Cannot advance "${completedSlug}": Current Stage is "${currentStageField}" and "${completedSlug}" is ${
        completedCbBefore?.state ?? "unknown"
      }. Pass the slug that's actually active, or use 'skip' / 'complete-workflow'.`
    );
  }

  // If next-slug was not provided, derive it from the scope AND state file.
  // The state file's EXECUTE/SKIP suffix (set by handleInit with Greenfield
  // overrides) and per-stage checkbox state take precedence over the
  // scope-mapping.json defaults.
  let nextSlug: string;
  if (positional.length >= 2) {
    nextSlug = positional[1];
    // Validate the caller-supplied next slug is in scope AND not already
    // SKIP-stamped in the state file. Symmetric with single-arg form.
    const stateOverrides = parseStateStageSuffixes(content);
    const nextAction =
      stateOverrides.get(nextSlug) ??
      loadScopeMapping()[scope]?.stages[nextSlug];
    if (nextAction === "SKIP") {
      error(
        `Cannot advance to "${nextSlug}": stage is SKIP for scope "${scope}" (or state file). Pick the next EXECUTE stage or use 'skip'.`
      );
    }
  } else {
    const next = nextInScopeStage(completedSlug, scope, content);
    if (!next) {
      error(
        `No next in-scope stage after "${completedSlug}" for scope "${scope}". ` +
          `Use 'complete-workflow' if this was the final stage.`
      );
    }
    nextSlug = next.slug;
  }
  const nextStage = findStageBySlug(nextSlug);
  if (!nextStage) error(`Unknown stage: ${nextSlug}`);

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
  const nextCbBefore = parseCheckboxes(content).find(
    (c) => c.slug === nextSlug
  );
  const nextAlreadyStarted =
    nextCbBefore?.state === "in-progress" ||
    nextCbBefore?.state === "awaiting-approval" ||
    nextCbBefore?.state === "revising";
  const isReplay =
    alreadyMarkedCompleted &&
    stageCompletedAlreadyAudited &&
    nextAlreadyStarted &&
    currentStageField === nextSlug;
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

  // Artifact guard (issue #366). Only enforce when THIS advance is the
  // transition that completes the stage - i.e. it was not already [x]. When
  // approve delegates here the slug is already [x] and approve ran the guard
  // itself, so skip to avoid a double check. A direct `advance <active-slug>`
  // (the gate-skipping attack path) is NOT alreadyMarkedCompleted, so it is
  // guarded. Runs before any mutation; error() exits leaving state untouched.
  if (!alreadyMarkedCompleted) {
    verifyStageArtifacts(pd, completedStage);
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
  content = setCheckbox(content, completedSlug, "completed");

  // 2. Mark next-slug → [-]
  content = setCheckbox(content, nextSlug, "in-progress");

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

  // Sync Completed counter to actual [x] count
  const completedCount = countCheckboxes(content, "completed");
  content = setField(content, "Completed", String(completedCount));

  // 4. Atomic audit emission — audit-first, then state write.
  // If audit fails, throw before touching state (writeStateFile below is skipped).
  try {
    // Emit STAGE_COMPLETED only if approve didn't already emit it.
    if (!alreadyMarkedCompleted || !stageCompletedAlreadyAudited) {
      emitAudit(pd, "STAGE_COMPLETED", {
        Stage: completedSlug,
        Details: `Stage ${completedStage.name} completed`,
      });
    }
    if (crossesPhaseBoundary) {
      // Phase Progress roll-up, in the SAME boundary branch as the PHASE_* audit
      // so the ledger and the roll-up can never disagree (#836): close the
      // completed stage's phase (→ Verified — it just went [x]) and enter the
      // next stage's phase (→ Active). Content is written after this try; a
      // failing emitAudit exits before writeStateFile, so the flip is discarded
      // with the rest. Intermediate phases an advance skips over entirely were
      // already stamped Skipped at init time.
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
      emitAudit(pd, "PHASE_STARTED", {
        Phase: nextStage.phase,
        Scope: scope,
      });
    }
    emitAudit(pd, "STAGE_STARTED", {
      Stage: nextSlug,
      Agent: nextStage.lead_agent,
    });
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }

  writeStateFile(pd, content);

  console.log(
    JSON.stringify({
      completed: completedSlug,
      started: nextSlug,
      phase: nextStage.phase.toUpperCase(),
      phase_boundary: crossesPhaseBoundary,
      completed_count: completedCount,
      next_after: nextAfterNext ? nextAfterNext.slug : null,
      already_completed: alreadyMarkedCompleted,
      memory_path: relativeMemoryPath(nextStage.phase, nextStage.slug, relativeRecordDir(pd)),
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

  // Artifact guard (issue #366). finalize also marks a stage [x], so it is a
  // completing transition that must not rubber-stamp. Guard only when the slug
  // is not already [x] (an idempotent re-finalize already passed the guard),
  // and before any mutation so a refusal leaves state untouched.
  const alreadyMarkedCompleted =
    parseCheckboxes(content).find((c) => c.slug === completedSlug)?.state ===
    "completed";
  if (!alreadyMarkedCompleted) {
    verifyStageArtifacts(pd, completedStage);
  }

  // 1. Mark completed
  content = setCheckbox(content, completedSlug, "completed");

  // 2. Sync Completed counter to actual [x] count
  const completedCount = countCheckboxes(content, "completed");
  content = setField(content, "Completed", String(completedCount));

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
  if (nextStage) {
    content = setField(content, "Current Stage", nextStage.slug);
    content = setField(content, "Next Stage", nextAfterNext ? nextAfterNext.slug : "none");
    content = setField(content, "Lifecycle Phase", nextStage.phase.toUpperCase());
    content = setField(content, "Active Agent", nextStage.lead_agent);
    // Phase Progress roll-up on a boundary-crossing finalize: close the
    // completed phase (→ Verified) and enter the next (→ Active) — same
    // transaction as the field updates (#836). Mirrors handleAdvance.
    if (completedStage.phase !== nextStage.phase) {
      content = markPhaseVerified(content, completedStage.phase);
      content = setPhaseProgress(content, nextStage.phase, "Active");
    }
  } else {
    content = setField(content, "Current Stage", "none");
    content = setField(content, "Next Stage", "none");
    content = setField(content, "Status", "Completed");
    content = setField(content, "In Progress", "none");
    // Terminal finalize (no next stage): the final phase is now complete →
    // Verified, in lock-step with Status: Completed (#836).
    content = markPhaseVerified(content, completedStage.phase);
  }
  content = setField(content, "Last Completed Stage", completedSlug);
  content = setField(content, "Last Updated", timestamp);
  content = setField(content, "Next Action", nextStage ? `Resume from ${nextStage.name}` : "Workflow complete");

  writeStateFile(pd, content);
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
  // Keep <completed-slug> positional and distinct from the --reason value.
  // --reason takes a value, so its argument is excluded from positionals too.
  const reasonIdx = args.indexOf("--reason");
  const reasonValueIdx = reasonIdx !== -1 ? reasonIdx + 1 : -1;
  const positional = args.filter(
    (a, i) => !a.startsWith("--") && i !== reasonValueIdx,
  );
  if (positional.length < 1)
    error("Usage: amadeus-state.ts complete-workflow <completed-slug> [--reason <text>]");
  const completedSlug = positional[0];

  // Optional --reason flag for recording why the workflow completed early
  let reason: string | undefined;
  if (reasonIdx !== -1 && reasonIdx + 1 < args.length) {
    reason = args[reasonIdx + 1];
  }

  const pd = resolveProjectDir(projectDir);
  // C2b lost-update safety: read→decide→emit-audit (4 rows)→write under one
  // lock so the 4 audit rows and the completion state commit atomically against
  // a single snapshot (audit-first / decide-inside-lock). emitAudit uses the
  // unlocked variant because the lock is held.
  withAuditLock(pd, () => {
  let content = readStateFile(pd);

  const completedStage = findStageBySlug(completedSlug);
  if (!completedStage) error(`Unknown stage: ${completedSlug}`);

  // If the slug is already [x], approve already emitted STAGE_COMPLETED —
  // skip re-emission to avoid duplicates. Matches handleAdvance's
  // alreadyMarkedCompleted guard.
  const alreadyMarkedCompleted =
    parseCheckboxes(content).find((c) => c.slug === completedSlug)?.state ===
    "completed";
  const stageCompletedAlreadyAudited =
    alreadyMarkedCompleted && hasStageAuditEvent(pd, "STAGE_COMPLETED", completedSlug);

  // Artifact guard (issue #366). complete-workflow marks the FINAL stage [x], so
  // it is a completing transition too. Guard only when the slug is not already
  // [x]: approve delegates here AFTER marking the slug [x] and running the guard
  // itself, so this skips the double-check on that path while still refusing a
  // direct `complete-workflow <active-slug>` that never produced artifacts. Runs
  // before any mutation so a refusal leaves state untouched.
  if (!alreadyMarkedCompleted) {
    verifyStageArtifacts(pd, completedStage);
    // Phase-check artifact gate (#886). complete-workflow always closes
    // completedStage.phase (an implicit "phase → end" boundary) and flips it
    // Verified below, so gate it the same way as advance's boundary block.
    // Before any mutation → a refusal leaves the state untouched.
    verifyPhaseCheckArtifact(pd, completedStage.phase);
  }

  // 1. Mark completed
  content = setCheckbox(content, completedSlug, "completed");

  // 2. Sync Completed counter
  const completedCount = countCheckboxes(content, "completed");
  content = setField(content, "Completed", String(completedCount));

  // 3. Update all fields atomically for workflow completion
  const timestamp = isoTimestamp();
  content = setField(content, "Status", "Completed");
  content = setField(content, "Last Updated", timestamp);
  content = setField(content, "Last Completed Stage", completedSlug);
  content = setField(content, "In Progress", "none");
  content = setField(content, "Next Stage", "none");
  content = setField(content, "Next Action", "Workflow complete");
  // Phase Progress roll-up: the final stage's phase is now complete → Verified,
  // in the same transaction as Status: Completed and the PHASE_VERIFIED audit
  // below (#836). Earlier phases were flipped Verified/Skipped by their own
  // boundary transitions (advance / init pre-cross); this closes the last one.
  content = markPhaseVerified(content, completedStage.phase);

  // 4. Atomic audit emissions. Refuse silent fallback — matches handleAdvance.
  const scope = getField(content, "Scope");
  if (!scope) {
    error(
      `State file has no Scope field. Refusing to complete workflow — fix the state file first.`
    );
  }
  if (!validScopes().has(scope)) {
    error(
      `State file has invalid Scope "${scope}". Valid scopes: ${[...validScopes()].join(", ")}.`
    );
  }
  try {
    if (!alreadyMarkedCompleted || !stageCompletedAlreadyAudited) {
      emitAudit(pd, "STAGE_COMPLETED", {
        Stage: completedSlug,
        Details: `Final stage ${completedStage.name} completed`,
      });
    }
    emitAudit(pd, "PHASE_COMPLETED", {
      "From phase": completedStage.phase,
      "To phase": "(end)",
      "Stages completed": String(completedCount),
    });
    emitAudit(pd, "PHASE_VERIFIED", {
      "Phase boundary": `${completedStage.phase} → end`,
    });
    const workflowFields: Record<string, string> = {
      Scope: scope,
      Details: `Scope: ${scope}, ${completedCount} stages completed`,
    };
    if (reason) workflowFields.Reason = reason;
    emitAudit(pd, "WORKFLOW_COMPLETED", workflowFields);
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }

  writeStateFile(pd, content);
  // Intent status lifecycle: terminal completion flips the active intent's
  // registry row to "complete". This is the determinism (field write) gated by
  // the human-confirmed completion that drove complete-workflow here — never an
  // automatic inference from state, so a crashed run never self-completes. Runs
  // under the workspace lock already held (every intents.json mutation takes the
  // sentinel bucket). No-op for the legacy flat record (no registry row).
  const completedIntentDir = activeIntent(pd);
  if (completedIntentDir) updateIntentStatus(pd, completedIntentDir, "complete");
  console.log(
    JSON.stringify({
      completed: completedSlug,
      completed_count: completedCount,
      status: "Completed",
      reason: reason || null,
      timestamp,
    })
  );
  });
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
function handleGateStart(args: string[]): void {
  if (args.length < 1) error("Usage: amadeus-state.ts gate-start <slug> [--artifacts <csv>] [--recovered]");
  const slug = args[0];
  let artifacts: string | undefined;
  const artifactsIdx = args.indexOf("--artifacts");
  if (artifactsIdx !== -1 && artifactsIdx + 1 < args.length) {
    artifacts = args[artifactsIdx + 1];
  }
  const recovered = args.includes("--recovered");

  const pd = resolveProjectDir(projectDir);
  // C2b lost-update safety: validate→transition→emit-audit→write under one
  // lock (the state-precondition check and the write see one snapshot).
  withAuditLock(pd, () => {
  let content = readStateFile(pd);

  const stage = findStageBySlug(slug);
  if (!stage) error(`Unknown stage: ${slug}`);
  validateSlugInState(content, slug, "in-progress");

  content = setCheckbox(content, slug, "awaiting-approval");
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

  writeStateFile(pd, content);
  console.log(JSON.stringify({ slug, new_state: "awaiting-approval", timestamp }));
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
function assertHumanPresentForGateResolution(
  pd: string,
  content: string,
  slug: string,
  verb: "approve" | "reject"
): void {
  if (isAutonomousMode(content)) {
    // skip the presence check — autonomous Construction has no human at the gate
  } else if (humanPresenceGuardDisabled()) {
    // skip — suite-wide deterministic off-switch (AMADEUS_SKIP_HUMAN_PRESENCE_GUARD)
  } else if (!humanActedSinceGate(pd, verb)) {
    // Ledger-event presence check: refuse unless a HUMAN_TURN event was appended
    // AFTER the last gate resolution (GATE_APPROVED / GATE_REJECTED /
    // QUESTION_ANSWERED) in ledger order - the boundary is the prior resolution,
    // NOT this gate's open event (one human turn drives both open and this
    // resolution). Cascade-safety + freshness fall out of order; no marker
    // file / turn counter.
    error(
      `Refusing to ${verb} "${slug}": a real human has not acted at this gate ` +
        `since it opened. The approval gate requires a typed human turn before it ` +
        `can commit. Acknowledge the gate as a human, then ${verb}. (autonomous ` +
        `Construction is exempt)`
    );
  }
}

export function handleApprove(args: string[]): void {
  if (args.length < 1) error("Usage: amadeus-state.ts approve <slug> [--user-input <text>]");
  const slug = args[0];
  const { userInput } = parseApproveFlags(args.slice(1));

  const pd = resolveProjectDir(projectDir);
  // C2b lost-update safety: the ENTIRE approve transaction — including the
  // nested handleAdvance / handleCompleteWorkflow calls below — runs under one
  // outer lock. withAuditLock is REENTRANT (per-pd depth counter): the nested
  // handlers' own withAuditLock calls bump depth 1→2→1 and run inline without
  // re-acquiring the OS lock, so approve+advance commit as one atomic unit and
  // no concurrent writer can interleave between approve's write and the
  // advance's re-read. The original ordering is preserved: approve writes its
  // own state (slug → [x]) BEFORE delegating, so the nested re-read sees it.
  withAuditLock(pd, () => {
  let content = readStateFile(pd);

  const stage = findStageBySlug(slug);
  if (!stage) error(`Unknown stage: ${slug}`);
  validateSlugInState(content, slug, "awaiting-approval");

  // Artifact guard (issue #366): a stage cannot be approved without evidence of
  // work on disk. Runs BEFORE any mutation so a refusal (error() -> exit) leaves
  // state untouched. The nested handleAdvance / handleCompleteWorkflow below see
  // the slug as already [x] and skip their own guard, so this is the single
  // enforcement point on the approve path. Bypass via AMADEUS_SKIP_ARTIFACT_GUARD.
  // Covers per-unit Construction stages (globs the record's
  // construction/<unit>/<slug>/) and code-producing stages (workspace_requires).
  verifyStageArtifacts(pd, stage);

  // Human-presence guard (#675): shared with handleReject via
  // assertHumanPresentForGateResolution. Runs BEFORE any mutation so a
  // refusal (error() -> exit) leaves state untouched (same slot as the
  // artifact guard above).
  assertHumanPresentForGateResolution(pd, content, slug, "approve");

  // Phase-check artifact gate (#886). approve marks the slug [x] and DELEGATES
  // to handleAdvance / handleCompleteWorkflow, which see alreadyMarkedCompleted
  // and skip their OWN phase-check gate — so without a check HERE the ordinary
  // (approve) gate-completion path could cross a phase boundary with no
  // phase-check artifact. Mirrors handleAdvance's crossesPhaseBoundary test: no
  // next stage (the final stage) always counts, like complete-workflow's
  // unconditional gate. Placed AFTER the human-presence guard (same ordering
  // precedent) so an approve missing BOTH a human turn and the artifact reports
  // human-absence first. Before any mutation → a refusal leaves state untouched.
  const approveScope = getField(content, "Scope") ?? "";
  const nextForPhaseGate = approveScope ? nextInScopeStage(slug, approveScope, content) : null;
  if (!nextForPhaseGate || nextForPhaseGate.phase !== stage.phase) {
    verifyPhaseCheckArtifact(pd, stage.phase);
  }

  const timestamp = isoTimestamp();

  content = setCheckbox(content, slug, "completed");
  content = setField(content, "Last Updated", timestamp);
  const completedCount = countCheckboxes(content, "completed");
  content = setField(content, "Completed", String(completedCount));
  content = setField(content, "Last Completed Stage", slug);

  // Atomic audit emissions (audit-first). GATE_APPROVED records the human
  // decision; STAGE_COMPLETED records the state transition the approval
  // implies. Both emit here so the audit trail is correct even if the
  // downstream advance/complete-workflow fails.
  try {
    const gateFields: Record<string, string> = { Stage: slug };
    if (userInput) gateFields["User Input"] = userInput;
    emitAudit(pd, "GATE_APPROVED", gateFields);

    emitAudit(pd, "STAGE_COMPLETED", {
      Stage: slug,
      Details: `Stage ${stage.name} approved by gate`,
    });
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }

  writeStateFile(pd, content);

  // Auto-advance or complete-workflow. Scope is required for next-stage
  // derivation; refuse silent fallback (matches handleAdvance/handleCompleteWorkflow).
  const scope = getField(content, "Scope");
  if (!scope) {
    error(
      `State file has no Scope field. Refusing to advance after approve — fix the state file first.`
    );
  }
  if (!validScopes().has(scope)) {
    error(
      `State file has invalid Scope "${scope}". Valid scopes: ${[...validScopes()].join(", ")}.`
    );
  }

  // No explicit consume step (ledger-event design): the GATE_APPROVED
  // emitted by this commit IS the freshness boundary for the next gate. A second
  // gate auto-cascaded in the same human turn finds the last gate resolution
  // (this GATE_APPROVED) AFTER the only HUMAN_TURN, so humanActedSinceGate refuses
  // it — one commit per human turn, from ledger order, with no marker to flip.
  const next = nextInScopeStage(slug, scope, content);
  if (next) {
    // Delegate to handleAdvance. The slug is now [x], so handleAdvance takes
    // the alreadyMarkedCompleted path and skips re-emitting STAGE_COMPLETED.
    // Reentrant call — runs under the depth-2 lock without re-acquire.
    handleAdvance([slug]);
  } else {
    // Final stage — complete the workflow. handleCompleteWorkflow re-sets
    // the checkbox to [x] (idempotent) and emits PHASE_COMPLETED +
    // PHASE_VERIFIED + WORKFLOW_COMPLETED. Reentrant call — see above.
    handleCompleteWorkflow([slug]);
  }
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

// Flag parser for approve — handles --user-input (value).
function parseApproveFlags(args: string[]): { userInput?: string } {
  return {
    userInput: getFlagValue(args, "--user-input"),
  };
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
function handleDelegateApproval(args: string[]): void {
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

  // Grounding gate: a real human must have acted on THIS session since the last
  // gate resolution. humanActedSinceGate reads the hook-written HUMAN_TURN
  // ledger — unforgeable by any tool a model can call — so this is the anti-
  // autopilot guard. Honour the same deterministic off-switch as the approve
  // path so suite tests can bypass it.
  if (!humanPresenceGuardDisabled() && !humanActedSinceGate(pd)) {
    error(
      "Refusing to delegate approval: no real human turn on this session since the " +
        "last gate resolution. Acknowledge the approval as a human, then delegate."
    );
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

  // Target must be a real, locally-present intent record — never scaffold one here.
  const targetRecord = recordDir(pd, toIntent, toSpace);
  if (targetRecord === null || !existsSync(join(targetRecord, "amadeus-state.md"))) {
    error(
      `delegate-approval: target intent record not found: ${toIntent}${toSpace ? ` (space ${toSpace})` : ""}`
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
  const res = appendAuditEntry("DELEGATED_APPROVAL", fields, pd, toIntent, toSpace);

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
    error(
      `delegate-rejection: target intent record not found: ${toIntent}${toSpace ? ` (space ${toSpace})` : ""}`
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
  const res = appendAuditEntry("DELEGATED_REJECTION", fields, pd, toIntent, toSpace);

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
function handleReject(args: string[]): void {
  if (args.length < 1) error("Usage: amadeus-state.ts reject <slug> [--feedback <text>]");
  const slug = args[0];
  const feedback = getFlagValue(args.slice(1), "--feedback");

  const pd = resolveProjectDir(projectDir);
  // C2b lost-update safety: validate→increment Revision Count→emit-audit→write
  // under one lock. The Revision Count read-modify-write is the exposed bit —
  // two concurrent rejects must not both read N and both write N+1 (one
  // increment lost). emit-then-write stays idempotent on retry: the lock
  // serialises, and re-running the same input recomputes from the locked
  // snapshot rather than double-incrementing a stale value.
  withAuditLock(pd, () => {
  let content = readStateFile(pd);

  const stage = findStageBySlug(slug);
  if (!stage) error(`Unknown stage: ${slug}`);
  validateSlugInState(content, slug, ["awaiting-approval", "in-progress"]);
  const gateWasMissing = getSlugState(content, slug) === "in-progress";

  // Human-presence guard (#675): shared with handleApprove via
  // assertHumanPresentForGateResolution. Runs BEFORE any mutation (Revision
  // Count increment, [R] transition, GATE_REJECTED emit) so a refusal
  // (error() -> exit) leaves state untouched.
  assertHumanPresentForGateResolution(pd, content, slug, "reject");

  // Increment Revision Count. Guard against non-numeric values (missing field,
  // manual edits, legacy state files) by coercing non-integers to 0.
  const current = getField(content, "Revision Count");
  const parsed = current ? parseInt(current, 10) : 0;
  const revCount = (Number.isFinite(parsed) ? parsed : 0) + 1;
  content = setField(content, "Revision Count", String(revCount));

  content = setCheckbox(content, slug, "revising");
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
    }
    const rejFields: Record<string, string> = { Stage: slug };
    if (feedback) rejFields.Feedback = feedback;
    emitAudit(pd, "GATE_REJECTED", rejFields);
    emitAudit(pd, "STAGE_REVISING", {
      Stage: slug,
      "Revision count": String(revCount),
      ...(feedback ? { Feedback: feedback } : {}),
    });
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }

  writeStateFile(pd, content);
  console.log(JSON.stringify({ slug, new_state: "revising", revision_count: revCount, timestamp }));
  });
}

// revise <slug> — transition [R] → [?] (re-enter gate after revision work)
function handleRevise(args: string[]): void {
  if (args.length < 1) error("Usage: amadeus-state.ts revise <slug>");
  const slug = args[0];

  const pd = resolveProjectDir(projectDir);
  // C2b lost-update safety: validate→transition→emit-audit→write under one lock.
  withAuditLock(pd, () => {
  let content = readStateFile(pd);

  const stage = findStageBySlug(slug);
  if (!stage) error(`Unknown stage: ${slug}`);
  validateSlugInState(content, slug, "revising");

  content = setCheckbox(content, slug, "awaiting-approval");
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

  writeStateFile(pd, content);
  console.log(JSON.stringify({ slug, new_state: "awaiting-approval", timestamp }));
  });
}

// skip <slug> [--reason <text>] — transition [ ]/[-]/[R] → [S], emit STAGE_SKIPPED
function handleSkip(args: string[]): void {
  if (args.length < 1) error("Usage: amadeus-state.ts skip <slug> [--reason <text>]");
  const slug = args[0];
  const reason = getFlagValue(args.slice(1), "--reason");

  const pd = resolveProjectDir(projectDir);
  // C2b lost-update safety: validate→transition→emit-audit→write under one lock.
  withAuditLock(pd, () => {
  let content = readStateFile(pd);

  const stage = findStageBySlug(slug);
  if (!stage) error(`Unknown stage: ${slug}`);
  validateSlugInState(content, slug, ["pending", "in-progress", "revising"]);

  content = setCheckbox(content, slug, "skipped");
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

  // Compaction detection — scan the tail of audit.md for a SESSION_COMPACTED
  // event that has no subsequent stage activity. The orchestrator uses this
  // to surface the compaction-awareness prompt without a fragile shell pipeline.
  let compactionPending = false;
  try {
    // Merge across per-clone audit shards (single shard in the common case).
    const raw = readAllAuditShards(pd);
    if (raw.length > 0) {
      // Read last ~400 lines (enough to cover ~30 events' worth of blocks)
      const tailLines = raw.split("\n").slice(-400);
      const tail = tailLines.join("\n");
      // Find the index of the last SESSION_COMPACTED event
      const lastCompactIdx = tail.lastIndexOf("**Event**: SESSION_COMPACTED");
      if (lastCompactIdx !== -1) {
        const after = tail.slice(lastCompactIdx);
        // Any stage activity OR explicit recovery after the compaction?
        // STAGE_STARTED / STAGE_COMPLETED / GATE_APPROVED / SESSION_RESUMED
        // are normal progress; RECOVERY_COMPLETED is the explicit "user saw
        // the compaction prompt and chose how to proceed" signal.
        const hasActivity =
          /\*\*Event\*\*: (STAGE_STARTED|STAGE_COMPLETED|GATE_APPROVED|SESSION_RESUMED|RECOVERY_COMPLETED)/.test(
            after
          );
        compactionPending = !hasActivity;
      }
    }
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
    const raw = readAllAuditShards(pd);
    if (raw.length > 0) {
      const tail = raw.split("\n").slice(-400).join("\n");
      const lastCompactIdx = tail.lastIndexOf("**Event**: SESSION_COMPACTED");
      if (lastCompactIdx !== -1) {
        const after = tail.slice(lastCompactIdx);
        compactionPending =
          !/\*\*Event\*\*: (STAGE_STARTED|STAGE_COMPLETED|GATE_APPROVED|SESSION_RESUMED|RECOVERY_COMPLETED)/.test(
            after
          );
      }
    }
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

// practices-event --type <discovered|affirmed|override> [--field "K: V"]...
// Emits a PRACTICES_* audit event from tool code (not stage prose).
// Required by the audit-first invariant: every audit event must originate
// in .ts code so t48's emitter-pairing check passes. Called by the
// practices-discovery stage at Step 4 (discovered), Step 7 (affirmed), and
// Step 6 on write failure (override).
function handlePracticesEvent(args: string[]): void {
  const pd = resolveProjectDir(projectDir);
  let eventTypeArg = "";
  const fields: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--type" && i + 1 < args.length) {
      eventTypeArg = args[i + 1];
      i++;
    } else if (args[i] === "--field" && i + 1 < args.length) {
      const kv = args[i + 1];
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
//   memory/team.md ........... replaceSection × 5 (Way of Working,
//                              Walking Skeleton, Testing Posture,
//                              Deployment, Code Style)
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

export function handlePracticesPromote(args: string[]): void {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--") && i + 1 < args.length) {
      flags[a.slice(2)] = args[i + 1];
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

  // Step 3a: Build new team.md by section-replacing each of the five
  // sections. team.md uses Title Case headings; the draft mirrors that
  // shape.
  const TEAM_SECTIONS = [
    "## Way of Working",
    "## Walking Skeleton",
    "## Testing Posture",
    "## Deployment",
    "## Code Style",
  ];
  let newTeamMd = teamMd;
  for (const heading of TEAM_SECTIONS) {
    const draftSection = extractMarkdownSection(teamPracticesDraft, heading);
    if (draftSection === "") {
      // Section absent from draft → leave the live file's section alone.
      // Useful for partial re-runs that only change one practice area.
      continue;
    }
    try {
      newTeamMd = replaceSection(newTeamMd, heading, draftSection);
      sectionsWritten.push(heading.slice(3));
    } catch (e) {
      fail(
        `replaceSection failed on team.md for "${heading}": ${errorMessage(e)}`
      );
      return;
    }
  }

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

  // Step 4 & 5: Write project.md first, then team.md.
  // If the project write fails, team.md is untouched. If the team write
  // fails after project succeeded, we surface that as PRACTICES_OVERRIDE —
  // the user re-enters the gate; the duplicate-rule case is mitigated because
  // re-running parses the same rule list and appendUnderHeading is idempotent
  // only on the draft contents, not on ALL prior runs. Operators should treat
  // a mid-promotion failure as a recovery scenario.
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
function handleFork(args: string[]): void {
  const flags = parseFlags(args);
  const slug = validateSlug(flags.slug);
  const pd = resolveProjectDir(projectDir);

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
    // caller's responsibility (see SKILL.md Step 0.6 recovery seam — discard
    // + re-fork is supported because the next fork sees the slug already
    // present and exits without poisoning audit).
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

    // Audit-first within the locked critical section. Use the unlocked
    // variant since we already hold the lock.
    try {
      appendAuditEntryUnlocked("STATE_FORKED", {
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
  const wtCheckboxes = parseCheckboxes(wtContent);

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
    let merged = mainContent;
    const conflictResolution: string[] = [];
    const mainCheckboxes = parseCheckboxes(mainContent);
    const mainStateMap = new Map(mainCheckboxes.map((c) => [c.slug, c.state]));
    const candidateSlugs = [...refsList].sort();
    const winningSlug = candidateSlugs[0];

    for (const wtCb of wtCheckboxes) {
      const mainCbState = mainStateMap.get(wtCb.slug);
      if (!mainCbState) continue;
      if (mainCbState === wtCb.state) continue;

      if (winningSlug === slug) {
        merged = setCheckbox(merged, wtCb.slug, wtCb.state);
        if (refsList.length > 1) {
          conflictResolution.push(`${wtCb.slug}:slug-precedence:${slug}`);
        }
      } else {
        conflictResolution.push(`${wtCb.slug}:deferred-to:${winningSlug}`);
      }
    }

    // Remove slug from Bolt Refs.
    merged = setFieldStrict(merged, "Bolt Refs", removeSlug(currentRefs, slug));

    const conflictResolutionField =
      conflictResolution.length === 0 ? "clean" : conflictResolution.join("; ");
    // Target hash matches the actual post-write content — computed inside the
    // lock against the final `merged` value so doctor can verify by
    // re-hashing the file at observation time.
    const postMergeSha = sha256(merged);

    // Strict audit-first within the locked critical section.
    try {
      appendAuditEntryUnlocked("STATE_MERGED", {
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
