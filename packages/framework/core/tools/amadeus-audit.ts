import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  JOURNAL_SCHEMA_VERSION_V2,
  type JournalEntryV2,
  serializeJournalEntryV2,
  splitJournalLines,
} from "./amadeus-journal.ts";
import {
  activeIntent,
  activeSpace,
  AuditLockAcquireError,
  auditBlockField,
  auditCloneId,
  auditFilePath,
  auditShardDir,
  errorMessage,
  intentStatusForAudit,
  isoTimestamp,
  parseFieldArgs,
  relativeRecordDir,
  resolveProjectDir,
  validateBoltSlug,
  withAuditLock,
  worktreeAuditFilePath,
  worktreePath,
} from "./amadeus-lib.ts";
import { initProcessObservability } from "./amadeus-observability.ts";
import { assertMutationAllowed } from "../otel/fatal-latch.ts";
import {
  assessAuditMergeRecovery,
  type MergeRecoveryAssessment,
} from "./amadeus-merge-recovery.ts";
// Type-only: the runtime binding is required lazily (see
// emitCanonicalAuditEvent below), so this import erases at compile time.
import type { emitAuditEvent as EmitAuditEvent } from "../otel/audit-emit.ts";
// Type-only, like the emit import above: the registry is required lazily (see
// registeredAuditEventTypes), so this erases at compile time.
import type { EventDef as RegistryEventDef } from "../otel/event-registry.ts";

// The lazily-required registry module's shape, named here so the require below
// is a ONE-LINE cast: the annotation lines of a multi-line cast are erased at
// runtime and stay permanently DA:0 in bun's lcov.
type EventRegistryModule = { REGISTERED_EVENTS: readonly RegistryEventDef[] };

// The append outcome (#1248). A completed intent stops accepting audit appends:
// the gate returns the `appended: false` arm so a caller can distinguish a real
// write from a post-complete suppression. The same arm carries the fatal health
// latch refusal (#1856), which is a suppression for the same reason: the write
// was declined deliberately, not attempted and failed. Both arms carry event +
// timestamp so existing consumers that only read `.timestamp`/`.event` are
// unaffected.
export type AppendAuditResult =
  | { appended: true; event: string; timestamp: string }
  | { appended: false; reason: "intent-complete" | "fatal-latch"; event: string; timestamp: string };

// Canonical event names and their audit mappings live in otel/event-registry.ts.
// --- Event type to human-readable heading ---

// Exported so the one table that maps an audit event type to its prose heading
// stays the single definition: a v2 row stores the OTel eventName instead of the
// heading, and readers resolve the heading back through here rather than
// restating the mapping.
export const EVENT_HEADINGS: Record<string, string> = {
  STAGE_STARTED: "Stage Start",
  STAGE_AWAITING_APPROVAL: "Stage Awaiting Approval",
  STAGE_REVISING: "Stage Revising",
  STAGE_COMPLETED: "Stage Completion",
  STAGE_JUMPED: "Stage Jump",
  STAGE_SKIPPED: "Stage Skip",
  GUARD_EXEMPTED: "Guard Exempted",
  PHASE_STARTED: "Phase Start",
  PHASE_COMPLETED: "Phase Completion",
  PHASE_VERIFIED: "Phase Verification",
  PHASE_SKIPPED: "Phase Skip",
  WORKFLOW_STARTED: "Workflow Start",
  WORKFLOW_COMPLETED: "Workflow Completion",
  WORKFLOW_PARKED: "Workflow Parked",
  WORKFLOW_UNPARKED: "Workflow Unparked",
  WORKFLOW_WAITING_ENTERED: "Workflow Waiting Entered",
  WORKFLOW_WAITING_RESUMED: "Workflow Waiting Resumed",
  INTENT_ARCHIVED: "Intent Archived",
  INTENT_UNARCHIVED: "Intent Unarchived",
  GOAL_CHANGE_PROPOSED: "Goal Change Proposed",
  GOAL_REVISION_APPROVED: "Goal Revision Approved",
  GOAL_RECONCILED: "Goal Reconciled",
  LEGACY_GOAL_MIGRATED: "Legacy Goal Migrated",
  EXECUTION_EVENT_SET_COMMITTED: "Execution Event Set Committed",
  LOOP_MONITOR_EVENT_SET_COMMITTED: "Loop Monitor Event Set Committed",
  QUALITY_REPAIR_TRANSACTION_COMMITTED: "Quality Repair Transaction Committed",
  INTENT_AUTONOMY_TRANSACTION_COMMITTED: "Intent Autonomy Transaction Committed",
  INTENT_AUTONOMY_HUMAN_REQUIRED: "Intent Autonomy Human Required",
  AUTO_DECISION_REVIEWED: "Auto Decision Reviewed",
  INTENT_COMPLETION_TRANSACTION_COMMITTED: "Intent Completion Transaction Committed",
  UNIT_POOL_EVENT_SET_COMMITTED: "Unit Pool Event Set Committed",
  SESSION_STARTED: "Session Start",
  SESSION_RESUMED: "Session Resume",
  SESSION_COMPACTED: "Session Compacted",
  SESSION_ENDED: "Session End",
  HUMAN_TURN: "Human Turn",
  WORKSPACE_SCAFFOLDED: "Workspace Scaffolded",
  WORKSPACE_SCANNED: "Workspace Scanned",
  WORKSPACE_INITIALISED: "Workspace Initialised",
  DECISION_RECORDED: "Decision Recorded",
  GATE_APPROVED: "Gate Approved",
  GATE_REJECTED: "Gate Rejected",
  QUESTION_ANSWERED: "Question Answered",
  DELEGATED_APPROVAL: "Delegated Approval",
  DELEGATED_REJECTION: "Delegated Rejection",
  GRANT_ISSUED: "Standing Grant Issued",
  GRANT_REVOKED: "Standing Grant Revoked",
  GATE_AUTHORIZATION_SELECTED: "Gate Authorization Selected",
  ARTIFACT_CREATED: "Artifact Created",
  ARTIFACT_UPDATED: "Artifact Updated",
  ARTIFACT_REUSED: "Artifact Reused",
  ARTIFACT_ATTESTED: "Artifact Attested",
  SUBAGENT_STARTED: "Subagent Started",
  SUBAGENT_COMPLETED: "Subagent Completed",
  HEALTH_CHECKED: "Health Check",
  SCOPE_DETECTED: "Scope Detection",
  SCOPE_CHANGED: "Scope Change",
  DEPTH_CHANGED: "Depth Change",
  TEST_STRATEGY_CHANGED: "Test Strategy Change",
  RECOMPOSED: "Plan Recomposed",
  ERROR_LOGGED: "Error Logged",
  RECOVERY_COMPLETED: "Recovery Completed",
  UNIT_OUTCOME_SETTLED: "Unit Outcome Settled",
  BOLT_STARTED: "Bolt Started",
  BOLT_COMPLETED: "Bolt Completed",
  BOLT_FAILED: "Bolt Failed",
  AUTONOMY_MODE_SET: "Autonomy Mode Set",
  WORKTREE_CREATED: "Worktree Created",
  WORKTREE_MERGED: "Worktree Merged",
  WORKTREE_DISCARDED: "Worktree Discarded",
  STATE_FORKED: "State Forked",
  STATE_MERGED: "State Merged",
  AUDIT_FORKED: "Audit Forked",
  AUDIT_MERGED: "Audit Merged",
  PRACTICES_DISCOVERED: "Practices Discovered",
  PRACTICES_AFFIRMED: "Practices Affirmed",
  PRACTICES_OVERRIDE: "Practices Override",
  PRACTICES_SECTION_EMPTY: "Practices Section Empty",
  MERGE_DISPATCH_INVOKED: "Merge Dispatch Invoked",
  MERGE_DISPATCH_RETURNED: "Merge Dispatch Returned",
  MERGE_DISPATCH_FALLBACK: "Merge Dispatch Fallback",
  DELEGATED_MERGE_RECORDED: "Delegated Merge Recorded",
  SENSOR_FIRED: "Sensor Fired",
  SENSOR_PASSED: "Sensor Passed",
  SENSOR_FAILED: "Sensor Failed",
  SENSOR_BUDGET_OVERRIDE: "Sensor Budget Override",
  GUARDRAIL_LOADED: "Guardrail Loaded",
  MEMORY_EMPTY: "Memory Empty",
  RULE_LEARNED: "Rule Learned",
  SENSOR_PROPOSED: "Sensor Proposed",
  LEARNING_ZERO_CONFIRMED: "Learning Zero Confirmed",
  LEARNING_CANDIDATE_ADDED: "Learning Candidate Added",
  SWARM_STARTED: "Swarm Started",
  SWARM_UNIT_CONVERGED: "Swarm Unit Converged",
  SWARM_UNIT_FAILED: "Swarm Unit Failed",
  SWARM_BATON_RETURNED: "Swarm Baton Returned",
  SWARM_COMPLETED: "Swarm Completed",
  SWARM_DEGRADED: "Swarm Degraded",
};

// --- Helpers ---

// The canonical emit, reached lazily.
//
// A top-level import would close a load-time cycle: the canonical path's audit
// exporter appends through appendJournalRecordV2, which lives in THIS module.
// require() is synchronous under Bun and keeps the module graph one-way at
// init time — the same idiom amadeus-lib.ts uses for its own emitError row.
//
// Every caller below is inside a withAuditLock section for the (intent, space)
// it passes here, so the emit re-enters that lock via the depth counter rather
// than taking a second OS-level acquire. That is what preserves the enclosing
// section's own retry budget: the outer acquire is the only one, and the 20s
// parallel-Bolt window audit-merge sizes for stays the window in force.
function emitCanonicalAuditEvent(
  eventType: string,
  fields: Record<string, string>,
  projectDir: string,
  intent?: string,
  space?: string
): AppendAuditResult {
  const otel = require("../otel/audit-emit.ts") as { emitAuditEvent: typeof EmitAuditEvent };
  return otel.emitAuditEvent(eventType, fields, projectDir, intent, space);
}

function ensureAuditFile(projectDir: string, intent?: string, space?: string): string {
  const path = auditFilePath(projectDir, intent, space);
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(path)) {
    appendFileSync(path, "", "utf-8");
  }
  return path;
}

// Next per-shard monotonic sequence: existing record count + 1. Callers hold
// the audit lock, so count-then-append is race-free within a clone.
function nextShardSeq(path: string): number {
  if (!existsSync(path)) return 1;
  return splitJournalLines(readFileSync(path, "utf-8")).length + 1;
}

// The row-identity intent token: the resolved record dir name, or the
// workspace-level marker for the flat-legacy layout (audit directly under
// the intents root).
function auditIntentId(projectDir: string, intent?: string, space?: string): string {
  return activeIntent(projectDir, space, intent) ?? "workspace";
}

function jsonSuccess(data: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(data)}\n`);
}

function jsonError(message: string): never {
  process.stderr.write(`${JSON.stringify({ error: message })}\n`);
  process.exit(1);
}

// --- Audit line-escaping seams (pure) ---

// Escape CR/LF in a field value so a malicious or malformed input (e.g., a file
// path containing '\n**Event**: FAKE\n') cannot forge an audit entry. Field
// values are markdown, not prose — literal newlines are never semantically
// meaningful here, and the audit trail is security-critical. Behaviour is
// identical to the former inline `String(value).replace(/\r?\n/g, "\\n")`: a
// lone CR (not followed by LF) is intentionally NOT matched.
export function escapeAuditValue(value: string): string {
  return String(value).replace(/\r?\n/g, "\\n");
}

// Inverse used by append-raw: interpret literal `\n` sequences in a body as
// actual newlines. Behaviour is identical to the former inline
// `body.replace(/\\n/g, "\n")`.
export function unescapeAuditBody(body: string): string {
  return body.replace(/\\n/g, "\n");
}

// --- Canonical record formatter ---

// Renders one record in the LEGACY Markdown format. Live writers emit JSONL
// (serializeJournalEntry) since the Issue #1628 switchover; this renderer
// remains solely for amadeus-journal-convert.ts, whose lossless proof
// re-renders parsed legacy blocks through it. Do not add new callers.
export type AuditRecordInput = {
  readonly heading: string;
  readonly timestamp: string;
  readonly event?: string;
  readonly fields?: Readonly<Record<string, string>>;
  readonly rawBody?: string;
};

export function formatAuditRecord(input: AuditRecordInput): string {
  let block = `\n## ${input.heading}\n`;
  block += `**Timestamp**: ${input.timestamp}\n`;
  if (input.event !== undefined) {
    block += `**Event**: ${input.event}\n`;
  }
  if (input.fields !== undefined) {
    for (const [key, value] of Object.entries(input.fields)) {
      block += `**${key}**: ${escapeAuditValue(value)}\n`;
    }
  }
  if (input.rawBody !== undefined) {
    block += `${input.rawBody}\n`;
  }
  block += `\n---\n`;
  return block;
}

// --- Subcommand: append ---

// Locked v2 journal append: lock → sequence → encode → synchronous append,
// through the schema v2 codec (FR-JRN-1, BR-13). The caller (the
// AuditLogExporter) owns accept-set validation and the failure contract; this
// function throws on lock/disk failure and never swallows; the shard-local
// sequence is assigned here, inside the lock. Appends to a sealed ledger
// (registry row "complete") are suppressed by the post-complete stop (#1248).
// Whether the locked v2 append actually wrote. The post-complete seal is a
// SUPPRESSION, not a failure — it throws nothing — so a caller that needs to
// distinguish "written" from "sealed" can only learn it from this return value
// (E-U7CG-Q3B ruling A'). The migration Adapter needs exactly that to keep the
// legacy `appended:false` arm honest instead of asserting an unverified write.
export type JournalAppendOutcome =
  | { readonly appended: true }
  | { readonly appended: false; readonly reason: "intent-complete" };

export type JournalAppendOptions = {
  // The legacy append-raw command historically bypassed the post-complete
  // seal. Preserve that CLI contract while it moves to the v2 row writer.
  readonly allowSealed?: boolean;
};

// A sealed legacy Intent needs exactly one post-proposal HUMAN_TURN so a human
// can authorize reconstruction. The exception closes as soon as
// approve-legacy-migration creates goal-lineage.json; ordinary CLI minting is
// still rejected because this predicate accepts only the journal event name.
function allowsSealedAuditEvent(
  eventName: string,
  projectDir: string,
  intent?: string,
  space?: string,
): boolean {
  if (
    eventName === "amadeus.intent.archived" ||
    eventName === "amadeus.intent.unarchived" ||
    eventName === "amadeus.goal.change.proposed" ||
    eventName === "amadeus.goal.legacy.migrated"
  ) {
    return true;
  }
  if (eventName !== "amadeus.human.turn") return false;
  const shardDir = auditShardDir(projectDir, intent, space);
  if (shardDir === null) return false;
  const goalDir = join(dirname(shardDir), "goal");
  const proposals = join(goalDir, "legacy-proposals");
  return !existsSync(join(goalDir, "goal-lineage.json")) &&
    existsSync(proposals) &&
    readdirSync(proposals).some((name) => name.endsWith(".json"));
}

// Locked via withAuditLock, NOT a bare acquire (E-U8PRE O-L1). The canonical
// emit path reaches this from arbitrary depth, including from inside a section
// that already holds the lock for the same identity. A bare acquire hits EEXIST
// against the caller's OWN lock: it burns the retry budget and then throws, so
// a long outer section deadlocks against itself. withAuditLock's per-identity
// depth counter makes the nested append re-enter instead. (The acquire-side
// reaper never compounds this into a steal — a live owner is not reclaimable at
// any age, #1906. A holder genuinely wedged past DEFAULT_LOCK_STALE_MS is
// surfaced by the detectLeakedLocks doctor probe, which clears it on request.)
export function appendJournalRecordV2(
  record: Omit<JournalEntryV2, "seq">,
  projectDir: string,
  intent?: string,
  space?: string,
  options?: JournalAppendOptions,
): JournalAppendOutcome {
  return withAuditLock(
    projectDir,
    () => {
      // Post-complete audit stop (#1248): once the target intent's registry row
      // is "complete", the ledger is sealed and the append is suppressed. Gated
      // on the definite "complete" only; "unknown" falls through to the append.
      if (
        intentStatusForAudit(projectDir, intent, space) === "complete" &&
        !options?.allowSealed &&
        !allowsSealedAuditEvent(record.eventName, projectDir, intent, space)
      ) {
        const targetDir = activeIntent(projectDir, space, intent) ?? "(unresolved)";
        process.stderr.write(
          `amadeus-audit: suppressed ${record.eventName} v2 append — target intent ${targetDir} is complete (#1248)\n`
        );
        return { appended: false, reason: "intent-complete" } as JournalAppendOutcome;
      }
      const path = ensureAuditFile(projectDir, intent, space);
      appendFileSync(path, serializeJournalEntryV2({ ...record, seq: nextShardSeq(path) }), "utf-8");
      return { appended: true } as JournalAppendOutcome;
    },
    intent,
    space
  );
}

// The forgery guard escapeAuditValue applied across a field map — CR/LF in a
// value collapses to the literal two-character "\n" before the codec sees it,
// exactly as the Markdown writer did (t204 contract preserved).
function escapeFieldValues(fields: Record<string, string>): Record<string, string> {
  const escaped: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    escaped[key] = escapeAuditValue(value);
  }
  return escaped;
}

const LIFECYCLE_OTEL_EVENT_NAMES = {
  INTENT_ARCHIVED: "amadeus.intent.archived",
  INTENT_UNARCHIVED: "amadeus.intent.unarchived",
  GOAL_CHANGE_PROPOSED: "amadeus.goal.change.proposed",
  LEGACY_GOAL_MIGRATED: "amadeus.goal.legacy.migrated",
} as const;

// Trusted lifecycle-only writer. Lifecycle transitions may start from a
// completed intent, so the canonical append path explicitly permits these
// registered lifecycle events while retaining the closed event vocabulary. The
// caller owns the workspace lock and has already reserved a HUMAN_TURN in
// `shardName`. This uses the same locked v2 append seam as the OTel audit
// exporter, with the registry event name and legacy Event projection carried
// in the row; it keeps the lifecycle API's caller-supplied fields intact.
export function appendLifecycleAuditEntryUnlocked(
  eventType:
    | "INTENT_ARCHIVED"
    | "INTENT_UNARCHIVED"
    | "GOAL_CHANGE_PROPOSED"
    | "LEGACY_GOAL_MIGRATED",
  fields: Record<string, string>,
  projectDir: string,
  intent: string,
  space: string,
  shardName: string,
): AppendAuditResult {
  if (basename(shardName) !== shardName || !shardName.endsWith(".jsonl")) {
    throw new Error(`Invalid lifecycle audit shard: ${shardName}`);
  }
  const shardDir = auditShardDir(projectDir, intent, space);
  if (shardDir === null) throw new Error(`Cannot resolve audit directory for intent ${intent}`);
  mkdirSync(shardDir, { recursive: true });
  const ts = isoTimestamp();
  const escapedFields = escapeFieldValues(fields);
  const result = appendJournalRecordV2(
    {
      schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
      eventId: randomUUID(),
      timestamp: ts,
      eventName: LIFECYCLE_OTEL_EVENT_NAMES[eventType],
      attributes: { ...escapedFields, Event: eventType },
      intentId: intent,
      space,
      cloneId: auditCloneId(projectDir),
      traceId: null,
      spanId: null,
      traceFlags: 0,
      idempotencyKey: randomUUID(),
      canonical: true,
    },
    projectDir,
    intent,
    space,
  );
  if (result.appended === false) {
    return { appended: false, reason: result.reason, event: eventType, timestamp: ts };
  }
  return { appended: true, event: eventType, timestamp: ts };
}

// Legacy CLI-style wrapper. Kept for backward compatibility with amadeus-state/amadeus-jump/
// amadeus-log/amadeus-bolt — they import this and catch exceptions. The
// main() caller below uses this same function but its catch block translates errors
// via jsonError (which exits).
//
// CLI minting guard (#685 review): the general `append` entry must NOT mint a
// presence/provenance event. It is enforced HERE (the CLI's append handler), not
// in the emit path, so the trusted in-process writers (mint hook,
// delegate-approval/rejection) that emit directly are unaffected. A throw
// matches the invalid-event contract main() already surfaces.
export function handleAppend(
  eventType: string,
  fields: Record<string, string>,
  projectDir: string
): void {
  const rejection = presenceMintRejection(eventType);
  if (rejection) throw new Error(rejection);
  const unregistered = unregisteredEventRejection(eventType);
  if (unregistered) throw new Error(unregistered);
  const incomplete = missingRequiredRejection(eventType, fields);
  if (incomplete) throw new Error(incomplete);
  const result = emitCanonicalAuditEvent(eventType, fields, projectDir);
  jsonSuccess(result);
}

// --- Subcommand: append-raw ---
//
// CLI minting guard (#685 review): reject a presence/provenance event smuggled
// via the raw heading or an `**Event**:` line in the \n-expanded body, BEFORE
// acquiring the lock or touching disk. Same rationale as handleAppend.
export function handleAppendRaw(
  heading: string,
  body: string,
  projectDir: string
): void {
  const rejection = rawPresenceMintRejection(heading, body.replace(/\\n/g, "\n"));
  if (rejection) throw new Error(rejection);
  const ts = isoTimestamp();
  const space = activeSpace(projectDir);
  const intent = auditIntentId(projectDir, undefined, space);
  const expandedBody = unescapeAuditBody(body);
  // append-raw has no registered canonical event or v2 rawBody envelope. Keep
  // its free-form payload as typed v2 attributes while sharing the canonical
  // locked writer; this removes the old v1 serializer without inventing a
  // misleading registry event.
  try {
    // allowSealed preserves append-raw's legacy contract, so this call cannot
    // return the post-complete suppression arm.
    appendJournalRecordV2(
      {
        schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
        eventId: randomUUID(),
        timestamp: ts,
        eventName: "amadeus.audit.raw",
        attributes: { Heading: heading, "Raw Body": expandedBody },
        intentId: intent,
        space,
        cloneId: auditCloneId(projectDir),
        traceId: null,
        spanId: null,
        traceFlags: 0,
        idempotencyKey: randomUUID(),
        canonical: true,
      },
      projectDir,
      undefined,
      space,
      { allowSealed: true },
    );
  } catch (cause) {
    if (cause instanceof AuditLockAcquireError) {
      jsonError("Failed to acquire audit lock after retries");
    }
    throw cause;
  }

  jsonSuccess({ appended: true, heading, timestamp: ts });
}

// --- Subcommand: audit-fork ---
//
// audit-fork --slug <slug> [--project-dir <path>]
//
// Forks the main audit log into a Bolt's worktree on Bolt start. Byte-copies
// main audit so the worktree is self-contained at fork instant. Records the
// pre-emit record count (Fork Boundary) and SHA-256 (Source Audit Hash) on
// AUDIT_FORKED so audit-merge can recover both at gate-approval time.
//
// Audit-of-intent semantics: emits AUDIT_FORKED to the main audit BEFORE the
// mkdir + copy. If the disk operation fails after emit, additionally emits
// ERROR_LOGGED with [slug=<slug>] [fork-emitted:<ts>] so doctor can
// reconcile drift at observation time. Mirrors amadeus-worktree.ts pattern.
//
// Why this exists as a tool subcommand: same load-bearing rationale as
// amadeus-state.ts practices-promote — stage prose that names a write target
// gets the LLM (under `claude -p`) to hallucinate a permission policy and
// halt the workflow. Routing through a subcommand removes the LLM from the
// path entirely.

// The intent/space SELECTOR for a Bolt audit fork/merge pair: --intent <record>
// / --space <name> pin BOTH ends to one intent's audit shard + worktree mirror
// (vision §5). Omitted -> default-resolution (the active cursor), which is what
// the orchestrator threads today. Returns undefined when a flag is absent so the
// helpers default-resolve.
function parseSelectorFlags(args: string[]): { intent?: string; space?: string } {
  let intent: string | undefined;
  let space: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--intent" && i + 1 < args.length) {
      intent = args[i + 1];
      i++;
    } else if (args[i] === "--space" && i + 1 < args.length) {
      space = args[i + 1];
      i++;
    }
  }
  return { intent, space };
}

function parseSlugFlag(args: string[], subcommand: string): string {
  let slug: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--slug" && i + 1 < args.length) {
      slug = args[i + 1];
      i++;
    }
  }
  if (!slug) {
    jsonError(`Usage: amadeus-audit ${subcommand} --slug <slug> [--project-dir <path>]`);
  }
  const err = validateBoltSlug(slug);
  if (err) {
    jsonError(err);
  }
  return slug;
}

// --- Fork/merge physical-representation seams (JSONL) ---
//
// The helpers below are the ONLY places fork/merge touch the physical
// storage representation. Since the JSONL switchover the physical unit is
// RECORD LINES: Fork Boundary counts the main shard's records at fork time,
// and Source Audit Hash covers the bytes of exactly those lines.

// Byte length of the first `lineCount` records (including each trailing
// newline). Caps at the whole buffer when fewer lines exist.
function journalLinePrefixLength(text: string, lineCount: number): number {
  let offset = 0;
  for (let i = 0; i < lineCount; i += 1) {
    const nl = text.indexOf("\n", offset);
    if (nl < 0) return text.length;
    offset = nl + 1;
  }
  return offset;
}

// Record count of the main shard BEFORE the AUDIT_FORKED row lands — the
// prefix that Source Audit Hash covers. Physical unit: lines.
function auditForkBoundary(mainAuditPath: string): number {
  return splitJournalLines(readFileSync(mainAuditPath, "utf-8")).length;
}

// Hash of the main shard's first `boundary` records.
function auditPrefixHash(mainText: string, boundary: number): string {
  const prefixLen = journalLinePrefixLength(mainText, boundary);
  return createHash("sha256").update(mainText.slice(0, prefixLen), "utf-8").digest("hex");
}

// Locate the most recent AUDIT_FORKED record for `slug` in a worktree shard
// and extract its anchor fields. Returns null when absent; throws on a
// present-but-malformed record (missing fields).
export type ForkAnchor = { boundary: number; sourceHash: string; forkTs: string; forkBlock: string };

export function findForkAnchor(wtContent: string, slug: string): ForkAnchor | null {
  const lines = splitJournalLines(wtContent);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (auditBlockField(line, "Event") !== "AUDIT_FORKED") continue;
    if (auditBlockField(line, "Bolt slug") !== slug) continue;
    const boundaryText = auditBlockField(line, "Fork Boundary");
    const sourceHash = auditBlockField(line, "Source Audit Hash");
    const forkTs = auditBlockField(line, "Timestamp");
    if (boundaryText === null || !/^\d+$/.test(boundaryText) || sourceHash === null || forkTs === null) {
      throw new Error(
        `worktree audit AUDIT_FORKED entry for slug ${slug} missing Fork Boundary, Source Audit Hash, or Timestamp field`
      );
    }
    return { boundary: parseInt(boundaryText, 10), sourceHash, forkTs, forkBlock: line };
  }
  return null;
}

// Start offset of the LAST whole record line byte-identical to `lineText`, or
// -1. Whole-line match: the candidate must begin at a line boundary and end at
// a newline or the buffer end, so a record that merely embeds the text never
// masquerades as the anchor.
//
// Last, not first: this is the SAME occurrence findForkAnchor names when it
// scans from the tail. A first-occurrence cut on a shard that carries a
// byte-identical earlier copy of the anchor would hand the merge every record
// written before the current fork — records the main ledger already holds.
//
// Re-forking is NOT how a duplicate arises: handleAuditFork stamps a fresh
// `Fork Boundary` and `Source Audit Hash` (main has grown by the previous
// AUDIT_FORKED row), tags a re-entry with `Reentrant`, and the canonical emit
// adds a new timestamp and per-shard seq — every field that could collide moves.
// The reachable source is shard union merges, where a concurrent fork's rows are
// re-appended verbatim (team.md, cid:code-generation:cg-shard-merge-dedupe,
// measured at 20 duplicated lines). Symmetry with findForkAnchor is the point:
// the two must not disagree about which anchor they mean, whatever produced it.
function lastRecordLineStart(buffer: string, lineText: string): number {
  let at = buffer.lastIndexOf(lineText);
  while (at >= 0) {
    const end = at + lineText.length;
    const startsLine = at === 0 || buffer[at - 1] === "\n";
    const endsLine = end === buffer.length || buffer[end] === "\n";
    if (startsLine && endsLine) return at;
    if (at === 0) break;
    at = buffer.lastIndexOf(lineText, at - 1);
  }
  return -1;
}

// Everything after the AUDIT_FORKED anchor record — the post-fork delta, as
// verbatim storage text ready for appendFileSync. Returns null when the
// shard is malformed (anchor line not found or not newline-terminated).
export function extractPostForkDelta(wtContent: string, forkBlock: string): string | null {
  const anchorStart = lastRecordLineStart(wtContent, forkBlock);
  if (anchorStart < 0) return null;
  const anchorEnd = anchorStart + forkBlock.length;
  // Whole-line match guarantees the next byte is a newline unless the anchor
  // record ends the buffer unterminated — that shard is malformed.
  if (anchorEnd >= wtContent.length) return null;
  return wtContent.slice(anchorEnd + 1);
}

// Count the records inside a verbatim delta produced by extractPostForkDelta.
export function countDeltaRecords(delta: string): number {
  return splitJournalLines(delta).length;
}

// Re-hash the main shard's first `boundary` records against the recorded
// Source Audit Hash. Returns null when the prefix is intact, or the refusal
// message classifying the mismatch (truncation vs mid-Bolt tampering).
export function auditPrefixMismatch(mainText: string, boundary: number, sourceHash: string): string | null {
  if (auditPrefixHash(mainText, boundary) === sourceHash) return null;
  const mainLines = splitJournalLines(mainText).length;
  if (mainLines < boundary) {
    return `main audit prefix-hash does not match recorded Source Audit Hash (expected at least ${boundary} records, got ${mainLines}); refusing to merge (main-audit truncation suspected)`;
  }
  return `main audit prefix-hash at record ${boundary} does not match recorded Source Audit Hash; refusing to merge (mid-Bolt tampering suspected)`;
}

export function handleAuditFork(args: string[], projectDir: string): void {
  const slug = parseSlugFlag(args, "audit-fork");
  // Pin the main-side audit shard AND the worktree mirror to ONE intent so
  // audit-fork/merge operate on the same record (the SAME selector the state
  // fork used). recordPrefix is the worktree mirror's relative record dir
  // (null -> flat-legacy mirror, today's behaviour).
  const { intent, space } = parseSelectorFlags(args);
  const recordPrefix = relativeRecordDir(projectDir, intent, space);

  const mainAuditPath = auditFilePath(projectDir, intent, space);
  const wtPath = worktreePath(projectDir, slug);
  // Thread the MAIN projectDir so the worktree shard name uses the main clone's
  // stable token (the fork and merge subprocesses are both spawned from main →
  // they resolve the SAME worktree shard across PIDs).
  const wtAuditPath = worktreeAuditFilePath(wtPath, recordPrefix, projectDir);

  // Pre-emit guards (fail clean before any audit side-effect).
  if (!existsSync(mainAuditPath)) {
    jsonError(`main audit not found at ${mainAuditPath}; start a workflow first (describe what to build, e.g. /amadeus "build the auth service")`);
  }
  if (!existsSync(wtPath)) {
    jsonError(
      `worktree directory not found at ${wtPath}; run amadeus-worktree create first`
    );
  }
  // Re-entrancy (Issue #478 gap1): a checkout whose shard is a byte-prefix of
  // (or identical to) the main shard is just an older committed snapshot of the
  // SAME ledger — phase-PR workflows commit shards, so a re-created worktree
  // checkout starts with one. Reforking over it loses nothing. A DIVERGED shard
  // (not a prefix) is evidence of separate work and stays refused.
  let reentrant = false;
  if (existsSync(wtAuditPath)) {
    const mainContent = readFileSync(mainAuditPath, "utf-8");
    const wtContent = readFileSync(wtAuditPath, "utf-8");
    const isPrefix = mainContent === wtContent || mainContent.startsWith(wtContent);
    if (!isPrefix) jsonError(`worktree audit already exists at ${wtAuditPath} and has DIVERGED from the main shard; refusing to overwrite (audit-fork only re-enters over a committed prefix of the main audit)`);
    reentrant = true;
  }

  // Offset of main audit BEFORE the AUDIT_FORKED row lands. This is the
  // prefix that Source Audit Hash covers; audit-merge re-hashes the same range
  // to detect tampering.
  const boundary = auditForkBoundary(mainAuditPath);
  const mainText = readFileSync(mainAuditPath, "utf-8");
  const sourceHash = auditPrefixHash(mainText, boundary);

  // Audit-of-intent: emit BEFORE the disk copy. The canonical emit throws on
  // lock failure — audit-of-intent constraint preserved (no disk side effect
  // when emit fails).
  const forkFields: Record<string, string> = {
    "Bolt slug": slug,
    "Source Audit Hash": sourceHash,
    "Fork Boundary": String(boundary),
  };
  // Distinguish a re-entry fork from an initial one in the audit trail.
  if (reentrant) forkFields.Reentrant = "true";
  // `Reentrant` survives the emit because the registry declares it an OPTIONAL
  // attribute of AUDIT_FORKED and the redaction policy's safe keys are derived
  // from required + optional. Before that, a default-deny policy built from
  // required alone would have dropped the tag doctor reads to tell a re-entry
  // fork from an initial one.
  //
  // FR-EVT-4 (#1960): mirror the canonical amadeus-state.ts emitAudit pattern.
  // The assert covers a latch already set when the handler starts; the outcome
  // check after the emit covers the latch tripping inside the emit's own
  // bootstrap (the journal health probe runs there). Both refuse BEFORE the
  // disk copy below, so no worktree mirror is minted off an AUDIT_FORKED row
  // that never landed. The outcome check fires on EVERY non-appended reason
  // (#1991): "intent-complete" — the #1248 post-complete seal — suppresses the
  // emit without throwing and without latching, so re-asserting cannot refuse
  // it; the jsonError below is the loud refusal for that arm.
  assertMutationAllowed();
  const result = emitCanonicalAuditEvent(
    "AUDIT_FORKED",
    forkFields,
    projectDir,
    intent,
    space,
  );
  if (result.appended === false) {
    if (result.reason === "fatal-latch") assertMutationAllowed();
    jsonError(
      `audit-fork: AUDIT_FORKED emit dropped (reason=${result.reason}) — refusing to mint the worktree audit mirror off a row that never landed [slug=${slug}]`
    );
  }
  const auditTs = result.timestamp;

  // Post-emit disk operations. On failure, emit ERROR_LOGGED with the
  // [fork-emitted:<ts>] correlation tag and exit non-zero so doctor
  // can identify the orphan AUDIT_FORKED row.
  try {
    mkdirSync(dirname(wtAuditPath), { recursive: true });
    copyFileSync(mainAuditPath, wtAuditPath);
  } catch (e) {
    const message = e instanceof Error ? errorMessage(e) : String(e);
    emitCanonicalAuditEvent(
      "ERROR_LOGGED",
      {
        Tool: "amadeus-audit",
        Command: "audit-fork",
        Error: `[slug=${slug}] [fork-emitted:${auditTs}] ${message}`,
      },
      projectDir,
      intent,
      space,
    );
    process.exit(1);
  }

  jsonSuccess({
    emitted: "AUDIT_FORKED",
    slug,
    source_audit_hash: sourceHash,
    fork_boundary: boundary,
    worktree_audit: wtAuditPath,
    audit_timestamp: auditTs,
  });
}

// --- Subcommand: audit-merge ---
//
// audit-merge --slug <slug> [--project-dir <path>]
//
// Merges a Bolt's worktree audit deltas back into the main audit on gate
// approval. Recovers Fork Boundary + Source Audit Hash from the worktree's
// AUDIT_FORKED entry, sanity-checks the prefix-hash against main audit's
// current first-`boundary` records (refuses on mismatch — catches mid-Bolt
// tampering or main-audit truncation), then appends the post-fork delta and
// emits AUDIT_MERGED.
//
// Delta detection is parse-driven: locate the AUDIT_FORKED record line in
// the worktree audit, take everything after that line.
// The Fork Boundary field is used solely as the prefix-hash anchor, NOT for
// delta math (the worktree audit's copy of AUDIT_FORKED extends beyond
// `boundary` by the entry's own record; trusting `boundary` for delta-start
// would duplicate AUDIT_FORKED on merge-back).
//
// Lock budget: extended from acquireAuditLock's 5s default to 20s
// (200 retries × 100ms) to absorb N=4-8 Bolt-merge contention in workshop
// scenarios.
//
// Lock pattern: one withAuditLock section covers the prefix-hash check, the
// delta append and the AUDIT_MERGED emit. The canonical emit re-enters that
// section rather than taking a second acquire, so there is no release-reacquire
// window; merged-audit chronological order is preserved by the order in which
// deltas were appended, not by AUDIT_MERGED timestamps.

export function handleAuditMerge(args: string[], projectDir: string): void {
  const slug = parseSlugFlag(args, "audit-merge");
  // Same selector the state/audit fork used -> the SAME intent record on both
  // ends (vision §5). recordPrefix pins the worktree audit mirror.
  const { intent, space } = parseSelectorFlags(args);
  const recordPrefix = relativeRecordDir(projectDir, intent, space);

  const mainAuditPath = auditFilePath(projectDir, intent, space);
  const wtPath = worktreePath(projectDir, slug);
  // Same MAIN clone-id token the fork used → the SAME worktree shard on merge.
  let mergeContext: AuditMergeContext;
  try {
    mergeContext = resolveAuditMergeContext(wtPath, recordPrefix, projectDir, slug);
  } catch (error) {
    jsonError(errorMessage(error));
  }
  const { wtAuditPath, anchor, delta, entries } = mergeContext;
  if (!existsSync(mainAuditPath)) {
    jsonError(`main audit not found at ${mainAuditPath}; start a workflow first (describe what to build, e.g. /amadeus "build the auth service")`);
  }

  const { boundary, sourceHash } = anchor;
  // forkTs anchors the audit-of-intent correlation tag for any post-emit
  // failure on this merge — doctor joins this back to the matching
  // AUDIT_FORKED row in main audit by exact-string timestamp match.
  const forkTs = anchor.forkTs;

  const recovery = assessAuditMergeRecovery(
    projectDir,
    slug,
    anchor,
    entries,
    intent,
    space,
  );
  if (recovery.status === "invalid") jsonError(recovery.detail);
  if (recovery.status === "verified") {
    jsonSuccess({
      emitted: "AUDIT_MERGED",
      slug,
      entries_merged: entries,
      source_audit_hash: sourceHash,
      fork_boundary: boundary,
      reentrant: true,
    });
    return;
  }

  // Sanity check: re-hash main audit's first `boundary` units; refuse if it
  // disagrees with the recorded Source Audit Hash. Catches the case where
  // the prefix has been edited (length-preserving mutation) or truncated
  // (length less than boundary — hash differs because we hash fewer bytes
  // than were originally hashed).
  const sourceMainAuditPath = join(dirname(mainAuditPath), basename(wtAuditPath));
  if (!existsSync(sourceMainAuditPath)) {
    jsonError(
      `main audit source shard not found at ${sourceMainAuditPath}; refusing to verify fork prefix`,
    );
  }
  const mainText = readFileSync(sourceMainAuditPath, "utf-8");
  const prefixMismatch = auditPrefixMismatch(mainText, boundary, sourceHash);
  if (prefixMismatch !== null) {
    jsonError(prefixMismatch);
  }

  // Everything after the record that closes the AUDIT_FORKED anchor is the
  // post-fork delta, extracted as verbatim storage text.
  // Acquire outer lock with extended budget for parallel-Bolt contention.
  // Defaults: 200 retries × 100ms = 20s, sized for N=4-8 contention. The
  // AMADEUS_AUDIT_LOCK_RETRIES env var lets tests dial this down so the
  // lock-timeout failure path is testable without 20-second waits.
  const lockRetries = parseInt(
    process.env.AMADEUS_AUDIT_LOCK_RETRIES ?? "200",
    10,
  );
  const lockRetryMs = parseInt(
    process.env.AMADEUS_AUDIT_LOCK_RETRY_MS ?? "100",
    10,
  );
  // Atomic critical section: delta-append + AUDIT_MERGED emit run under a
  // single lock acquisition, held by withAuditLock so a nested canonical emit
  // re-enters instead of self-colliding (E-U8PRE O-L1). The extended budget
  // above is passed through explicitly — withAuditLock's own default is the 5s
  // one, and inheriting it would silently shrink this section's 20s window.
  // The AUDIT_MERGED row goes through emitCanonicalAuditEvent, which re-enters
  // this section rather than double-acquiring; the catch path emits the same
  // way, for the same reason — we already hold the lock when the throw lands.
  //
  // Failure-mode worth flagging for doctor: if the AUDIT_MERGED emit
  // throws AFTER appendFileSync (delta) succeeded, main audit has the delta
  // but no matching AUDIT_MERGED row. The catch path emits ERROR_LOGGED with
  // [slug=<slug>] [fork-emitted:<forkTs>] correlation tags so doctor can
  // detect the orphan-delta case (delta in main, AUDIT_FORKED present, no
  // AUDIT_MERGED, ERROR_LOGGED with matching forkTs). The process.exit there
  // skips withAuditLock's finally, which is exactly what its exit-handler
  // safety net covers.
  //
  // A second failure mode does NOT throw: under the fatal health latch the
  // emit DROPS (#1856), so mergeDeltaUnderLock checks the outcome itself
  // (#1960) — a latch set before the section refuses ahead of the delta
  // append, and a latch tripping inside the emit names the orphan delta on
  // stderr and exits non-zero rather than returning into the jsonSuccess
  // below.
  let merged: { entriesMerged: number; result: AppendAuditResult };
  try {
    merged = withAuditLock(
      projectDir,
      () => mergeDeltaUnderLock(projectDir, sourceMainAuditPath, delta, { slug, sourceHash, boundary, forkTs }, intent, space),
      intent,
      space,
      { maxRetries: lockRetries, retryMs: lockRetryMs },
    );
  } catch (e) {
    if (!(e instanceof AuditLockAcquireError)) throw e;
    jsonError(`${e.message}; another merge in flight?`);
  }

  jsonSuccess({
    emitted: "AUDIT_MERGED",
    slug,
    entries_merged: merged.entriesMerged,
    source_audit_hash: sourceHash,
    fork_boundary: boundary,
    audit_timestamp: merged.result.timestamp,
  });
}

type AuditMergeContext = {
  wtAuditPath: string;
  anchor: ForkAnchor;
  delta: string;
  entries: number;
};

function resolveAuditMergeContext(
  wtPath: string,
  recordPrefix: string | null,
  projectDir: string,
  slug: string,
): AuditMergeContext {
  const expectedPath = worktreeAuditFilePath(wtPath, recordPrefix, projectDir);
  const auditDir = dirname(expectedPath);
  let names: string[];
  try {
    names = readdirSync(auditDir).filter((name) => name.endsWith(".jsonl")).sort();
  } catch {
    throw new Error(`worktree audit not found at ${expectedPath}; nothing to merge`);
  }
  const candidates: AuditMergeContext[] = [];
  for (const name of names) {
    const candidatePath = join(auditDir, name);
    const content = readFileSync(candidatePath, "utf-8");
    const anchor = findForkAnchor(content, slug);
    if (anchor === null) continue;
    const delta = extractPostForkDelta(content, anchor.forkBlock);
    if (delta === null) {
      throw new Error(`worktree audit malformed — no separator after AUDIT_FORKED block for slug ${slug}`);
    }
    candidates.push({
      wtAuditPath: candidatePath,
      anchor,
      delta,
      entries: countDeltaRecords(delta),
    });
  }
  if (candidates.length === 0) {
    throw new Error(`worktree audit missing AUDIT_FORKED entry for slug ${slug}`);
  }
  if (candidates.length !== 1) {
    throw new Error(
      `ambiguous worktree audit evidence for slug ${slug}: expected 1 fork shard, found ${candidates.length}`,
    );
  }
  return candidates[0]!;
}

export function verifyAuditMergeRecovery(
  projectDir: string,
  slug: string,
  intent?: string,
  space?: string,
): MergeRecoveryAssessment {
  try {
    const recordPrefix = relativeRecordDir(projectDir, intent, space);
    const context = resolveAuditMergeContext(
      worktreePath(projectDir, slug),
      recordPrefix,
      projectDir,
      slug,
    );
    return assessAuditMergeRecovery(
      projectDir,
      slug,
      context.anchor,
      context.entries,
      intent,
      space,
    );
  } catch (error) {
    return { status: "invalid", detail: errorMessage(error) };
  }
}

// The audit-merge critical section, called with the audit lock already held.
// Exported as a seam: the orphan-delta failure arm below needs the delta append
// to fail while the ERROR_LOGGED append still lands, which through the handler
// is impossible (both write the same shard) and through a spawned CLI is
// unmeasurable.
export function mergeDeltaUnderLock(
  projectDir: string,
  mainAuditPath: string,
  delta: string,
  coords: { slug: string; sourceHash: string; boundary: number; forkTs: string },
  intent?: string,
  space?: string,
): { entriesMerged: number; result: AppendAuditResult } {
  // FR-EVT-4 (#1960): refuse BEFORE the delta append. Under the fatal health
  // latch the canonical emit only DROPS (#1856) — it does not throw — so
  // without this assert a latched process would extend the main shard with a
  // delta whose AUDIT_MERGED row can never land. Placed OUTSIDE the try so the
  // refusal surfaces to the caller instead of feeding the orphan-delta arm
  // below (nothing was mutated yet — there is no orphan to correlate).
  assertMutationAllowed();
  // Intent-complete refusal, likewise BEFORE the delta append (#1991). The
  // #1248 post-complete seal suppresses only the CANONICAL emit — the delta
  // append below is a raw appendFileSync that would bypass the seal and extend
  // a sealed ledger whose AUDIT_MERGED row can never land. The process is not
  // latched here, so assertMutationAllowed cannot refuse it; this explicit
  // check is the loud failure. Nothing has been mutated yet — a clean refusal,
  // not an orphan to correlate.
  if (intentStatusForAudit(projectDir, intent, space) === "complete") {
    const targetDir = activeIntent(projectDir, space, intent) ?? "(unresolved)";
    process.stderr.write(
      `audit-merge: target intent ${targetDir} is complete — the ledger is sealed (#1248); refusing before the delta append [slug=${coords.slug}] [fork-emitted:${coords.forkTs}]\n`,
    );
    process.exit(1);
  }
  let entriesMerged = 0;
  let result: AppendAuditResult;
  try {
    const deltaRecords = splitJournalLines(delta);
    const mainRecords = new Set(splitJournalLines(readFileSync(mainAuditPath, "utf-8")));
    const recordsAlreadyPresent = deltaRecords.filter((record) => mainRecords.has(record)).length;
    if (recordsAlreadyPresent !== 0 && recordsAlreadyPresent !== deltaRecords.length) {
      throw new Error(
        `partial audit delta evidence for slug ${coords.slug}: ${recordsAlreadyPresent}/${deltaRecords.length} records already present; refusing to duplicate or guess`,
      );
    }
    if (delta.trim() !== "" && recordsAlreadyPresent === 0) {
      // Delta is already a sequence of well-formed journal records (one
      // JSONL line each). Append verbatim — running it back through an emit
      // would re-mint each record's identity.
      appendFileSync(mainAuditPath, delta, "utf-8");
    }
    entriesMerged = deltaRecords.length;
    result = emitCanonicalAuditEvent(
      "AUDIT_MERGED",
      {
        "Bolt slug": coords.slug,
        "Entries Merged": String(entriesMerged),
        "Source Audit Hash": coords.sourceHash,
        "Fork Boundary": String(coords.boundary),
      },
      projectDir,
      intent,
      space,
    );
  } catch (e) {
    const message = e instanceof Error ? errorMessage(e) : String(e);
    emitCanonicalAuditEvent(
      "ERROR_LOGGED",
      {
        Tool: "amadeus-audit",
        Command: "audit-merge",
        Error: `[slug=${coords.slug}] [fork-emitted:${coords.forkTs}] ${message}`,
      },
      projectDir,
      intent,
      space,
    );
    process.exit(1);
  }
  // The emit dropped INSIDE its own bootstrap (the journal health probe latches
  // there, and the registry row can flip to complete mid-section — so there was
  // nothing to refuse on beforehand; the same two-halves rationale as
  // amadeus-state.ts emitAudit). A drop is not a throw for ANY reason (#1991),
  // so the ERROR_LOGGED arm above cannot see it — and a dropped process would
  // drop that emit too. Name the outcome out loud, with the same correlation
  // tags doctor keys on, and exit non-zero instead of returning into
  // jsonSuccess. An EMPTY delta skipped the append (#1991 (a)) — there is no
  // orphan on the shard, and the message must not claim one.
  if (result.appended === false) {
    process.stderr.write(
      `audit-merge: canonical emit dropped (reason=${result.reason}) after the delta stage — ${orphanDeltaDetail(entriesMerged, mainAuditPath)} [slug=${coords.slug}] [fork-emitted:${coords.forkTs}]\n`,
    );
    process.exit(1);
  }
  return { entriesMerged, result };
}

// The loud-fail arm's delta detail, honest about whether a delta actually
// landed: entriesMerged === 0 means the empty delta skipped the append
// entirely, so there is no orphan to point doctor at (#1991 (a)).
function orphanDeltaDetail(entriesMerged: number, mainAuditPath: string): string {
  if (entriesMerged === 0) {
    return `empty delta: nothing was appended to ${mainAuditPath}, and no AUDIT_MERGED row landed`;
  }
  return `orphan delta (${entriesMerged} record(s)) is in ${mainAuditPath} with no AUDIT_MERGED row`;
}

// --- Subcommand: record-delegated-merge (C11, FR-9) ---
//
// team.md's standing merge-approval norm (cid:ci-pipeline:standing-merge-
// approval-ci-green) is the sole source of truth for the DELEGATION
// CONDITION (required CI green AND pr-convergence converged:true). This
// function does not decide or perform a merge — it records, after the fact,
// that a delegated merge whose condition the caller already verified took
// place. Record-only (R-2/R-3): no git/GitHub side effect ever happens here.
export type DelegatedMergeEvidence = {
  readonly standingRulingRef: string;
  readonly ciConclusion: string;
  readonly convergedDigest: string;
};

export type AuditReceipt = {
  readonly eventId: string;
  readonly committedAt: string;
};

export type RecordDelegatedMergeRefusal = {
  readonly kind: "evidence-incomplete";
  readonly missingField: keyof DelegatedMergeEvidence;
};

export type RecordDelegatedMergeResult =
  | { readonly ok: true; readonly receipt: AuditReceipt }
  | { readonly ok: false; readonly error: RecordDelegatedMergeRefusal };

// Evidence field -> its audit row label, in emission order.
const DELEGATED_MERGE_FIELDS: ReadonlyArray<readonly [keyof DelegatedMergeEvidence, string]> = [
  ["standingRulingRef", "Standing Ruling Ref"],
  ["ciConclusion", "CI Conclusion"],
  ["convergedDigest", "Converged Digest"],
];

export function recordDelegatedMerge(
  evidence: DelegatedMergeEvidence,
  projectDir: string,
  intent?: string,
  space?: string
): RecordDelegatedMergeResult {
  for (const [key] of DELEGATED_MERGE_FIELDS) {
    if (evidence[key].trim().length === 0) {
      return { ok: false, error: { kind: "evidence-incomplete", missingField: key } };
    }
  }
  const fields: Record<string, string> = {};
  for (const [key, label] of DELEGATED_MERGE_FIELDS) fields[label] = evidence[key];

  // Same fail-closed-on-latch pattern as handleAuditFork/handleAuditMerge:
  // refuse before the emit rather than let a suppressed row silently mint a
  // "committed" receipt for nothing.
  assertMutationAllowed();
  const result = emitCanonicalAuditEvent("DELEGATED_MERGE_RECORDED", fields, projectDir, intent, space);
  if (result.appended === false) {
    if (result.reason === "fatal-latch") assertMutationAllowed();
    throw new Error(
      `recordDelegatedMerge: DELEGATED_MERGE_RECORDED emit dropped (reason=${result.reason}) — no audit row landed`
    );
  }
  return { ok: true, receipt: { eventId: result.event, committedAt: result.timestamp } };
}

// --- Presence/provenance CLI minting guard ---
//
// HUMAN_TURN, DELEGATED_APPROVAL and DELEGATED_REJECTION are the trust anchors of
// the human-presence gate (#671/#685). A HUMAN_TURN proves a real human prompt;
// the two delegations carry a leader's human-grounded gate decision into a remote
// conductor's ledger. Their integrity rests entirely on WHO may write them: only
// the UserPromptSubmit mint hook (HUMAN_TURN) and amadeus-state's delegate-approval
// / delegate-rejection writers (the delegations), all via the IN-PROCESS
// canonical emit. The general audit CLI (`append` / `append-raw`) is a
// general-purpose entry a model can invoke, so it must NOT be able to mint these
// — otherwise a model could fabricate presence and open a gate it never earned.
// The refusal lives at the CLI entry ONLY; the emit path itself stays open for
// the trusted in-process writers. (This closes the CLI hole but not direct file
// writes — see the residual-threat note near verifyDelegatedProvenance.)
const PRESENCE_PROTECTED_EVENTS = new Set([
  "HUMAN_TURN",
  "DELEGATED_APPROVAL",
  "DELEGATED_REJECTION",
  // Delegated-merge provenance rows are only trustworthy when the validated
  // writer (recordDelegatedMerge) minted them — a generic append would bypass
  // its non-empty-evidence refusal.
  "DELEGATED_MERGE_RECORDED",
  // Legacy event shapes remain read-only. Refuse new rows so fabricated history
  // cannot influence replay or migration projections.
  "GRANT_ISSUED",
  "GRANT_REVOKED",
  "GATE_AUTHORIZATION_SELECTED",
  "INTENT_ARCHIVED",
  "INTENT_UNARCHIVED",
]);

// The EVENT_HEADINGS values for the protected events — the `## <heading>` a forger
// would pass to append-raw to reproduce the same block shape.
const PRESENCE_PROTECTED_HEADINGS = new Set(
  [...PRESENCE_PROTECTED_EVENTS].map((e) => EVENT_HEADINGS[e] ?? e)
);

// `append` guard: refuse a protected event type. Returns the error message to
// surface (single-line so line coverage attributes cleanly), or null when clean.
export function presenceMintRejection(eventType: string): string | null {
  if (!PRESENCE_PROTECTED_EVENTS.has(eventType)) return null;
  return `Refusing to append "${eventType}" via the general audit CLI: presence/provenance events are minted only by their trusted in-process writers (HUMAN_TURN by the UserPromptSubmit hook; DELEGATED_APPROVAL/DELEGATED_REJECTION by amadeus-state delegate-approval/delegate-rejection).`;
}

// The event vocabulary the audit journal accepts, read from the registry lazily
// and memoised. Telemetry defs carry `auditEvent: null` and so are absent by
// construction — FR-EXP-4's "telemetry never reaches the journal" needs no
// separate check.
//
// Lazy for the same reason emitCanonicalAuditEvent is, but a different hazard:
// not a cycle (event-registry.ts is pure data and imports nothing) — module
// FOOTPRINT. The hooks import this module, and a hook runs inside sandboxes
// that copy tools/ alone; an eager `../otel/...` import makes every such
// sandbox fail to load the hook before it reaches the behaviour under test.
// Keeping the reference lazy leaves this module's load-time contract as the
// hooks already rely on it.
//
// Widened to Set<string> deliberately: the registry is `as const`, so the
// inferred element type is the 79-name literal union — but this guard's input
// is untrusted CLI text, and narrowing it there would make the check
// untypeable.
// Keyed by the v1 audit event type, which is the vocabulary the CLI speaks.
// Both guards below read this one map, so they can never disagree about which
// events exist.
let registeredAuditEventMap: Map<string, RegistryEventDef> | null = null;
function registeredAuditEventDefs(): Map<string, RegistryEventDef> {
  if (registeredAuditEventMap === null) {
    const { REGISTERED_EVENTS } = require("../otel/event-registry.ts") as EventRegistryModule;
    registeredAuditEventMap = new Map(
      REGISTERED_EVENTS.flatMap((def) =>
        def.durability === "canonical" && def.auditEvent !== null
          ? ([[def.auditEvent, def]] as [string, RegistryEventDef][])
          : []
      )
    );
  }
  return registeredAuditEventMap;
}

function registeredAuditEventTypes(): Set<string> {
  return new Set(registeredAuditEventDefs().keys());
}

// `append` guard: refuse an event outside the registered vocabulary. Returns the
// error message to surface, or null when clean.
//
// The legacy writer used to check a copied event table; it was deleted with the
// writer. Validating at the CLI entry keeps the rejection readable and
// attributable to the CLI now that the canonical path is the only writer left —
// otherwise an unregistered event would travel to emitEvent's registry lookup
// and throw from inside the emit.
export function unregisteredEventRejection(eventType: string): string | null {
  const registered = registeredAuditEventTypes();
  if (registered.has(eventType)) return null;
  return `Invalid event type: ${eventType}. Must be one of: ${[...registered].join(", ")}`;
}

// `append` guard: refuse a field set that omits a required attribute. Returns
// the error message to surface, or null when clean.
//
// The canonical path fails closed on this too (emitEvent throws), but it throws
// in the registry's OTel vocabulary and from inside the emit. Checking here lets
// the CLI name the event type the CALLER passed and list what is missing.
//
// An unregistered event returns null: that is unregisteredEventRejection's
// business, and reporting both would hand the caller a required-attribute
// complaint about an event that does not exist.
export function missingRequiredRejection(
  eventType: string,
  fields: Record<string, string>
): string | null {
  const def = registeredAuditEventDefs().get(eventType);
  if (def === undefined) return null;
  const missing = def.requiredAttributes.filter((key) => !(key in fields));
  if (missing.length === 0) return null;
  return `Missing required attribute(s) for ${eventType}: ${missing.join(", ")}. Required: ${def.requiredAttributes.join(", ")}`;
}

// `append-raw` guard: the block is a free-form heading + body, so a forger can
// smuggle a protected event via EITHER the heading OR an `**Event**: <type>` line
// in the body (after \n expansion). Reject both. Returns the error message, or
// null when clean.
// Each body line is parsed with the SAME canonical field parser the presence
// consumers use (auditBlockField, which tolerates an optional leading "- "),
// so the guard's grammar can never drift from what the gate actually accepts —
// a dash-prefixed "- **Event**: HUMAN_TURN" line parses identically on both
// sides. Per-line (not per-block) scanning also covers a body that smuggles a
// "\n---\n" block separator to fabricate an entire standalone event block.
export function rawPresenceMintRejection(heading: string, expandedBody: string): string | null {
  if (PRESENCE_PROTECTED_HEADINGS.has(heading)) {
    return `Refusing append-raw with heading "${heading}": it matches a presence/provenance event heading, which the general audit CLI may not mint.`;
  }
  for (const line of expandedBody.split("\n")) {
    const ev = auditBlockField(line, "Event");
    if (ev !== null && PRESENCE_PROTECTED_EVENTS.has(ev)) {
      return `Refusing append-raw: body carries an Event line for "${ev}", a presence/provenance event the general audit CLI may not mint.`;
    }
  }
  return null;
}

// --- CLI entry point ---

function main(): void {
  const rawArgs = process.argv.slice(2);

  // Extract --project-dir before general parsing
  let projectDirArg: string | undefined;
  const filteredArgs: string[] = [];
  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === "--project-dir" && i + 1 < rawArgs.length) {
      projectDirArg = rawArgs[i + 1];
      i++; // skip the value
    } else {
      filteredArgs.push(rawArgs[i]);
    }
  }

  const projectDir = resolveProjectDir(projectDirArg);
  const subcommand = filteredArgs[0];

  // Telemetry process span (opt-in; no-op unless observability.enabled).
  // Resolution failures must not change the CLI contract — skip silently.
  try {
    initProcessObservability(`tool:amadeus-audit:${subcommand ?? "?"}`, projectDir);
  } catch {
    // no resolvable workflow -> nothing to observe
  }


  if (!subcommand) {
    jsonError("Usage: amadeus-audit <append|append-raw|audit-fork|audit-merge> [args...]");
  }

  switch (subcommand) {
    case "append": {
      const eventType = filteredArgs[1];
      if (!eventType) {
        jsonError("Usage: amadeus-audit append <event-type> [--field key=value ...]");
      }
      const fields = parseFieldArgs(rawArgs);
      handleAppend(eventType, fields, projectDir);
      break;
    }

    case "append-raw": {
      const heading = filteredArgs[1];
      const body = filteredArgs[2];
      if (!heading || !body) {
        jsonError(
          "Usage: amadeus-audit append-raw <heading> <body>"
        );
      }
      handleAppendRaw(heading, body, projectDir);
      break;
    }

    case "audit-fork":
      handleAuditFork(filteredArgs.slice(1), projectDir);
      break;

    case "audit-merge":
      handleAuditMerge(filteredArgs.slice(1), projectDir);
      break;

    default:
      jsonError(`Unknown subcommand: ${subcommand}. Expected: append, append-raw, audit-fork, audit-merge`);
  }
}

if (import.meta.main) {
  main();
}
