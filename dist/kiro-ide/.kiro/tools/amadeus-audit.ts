import { createHash } from "node:crypto";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname } from "node:path";
import {
  acquireAuditLock,
  auditBlockField,
  auditFilePath,
  errorMessage,
  isoTimestamp,
  parseFieldArgs,
  relativeRecordDir,
  releaseAuditLock,
  resolveProjectDir,
  validateBoltSlug,
  worktreeAuditFilePath,
  worktreePath,
} from "./amadeus-lib.ts";

// --- Canonical event types (79) ---
// See docs/reference/12-state-machine.md for the state transitions that emit each event.

const VALID_EVENT_TYPES = new Set([
  // Stage lifecycle
  "STAGE_STARTED",
  "STAGE_AWAITING_APPROVAL",
  "STAGE_REVISING",
  "STAGE_COMPLETED",
  "STAGE_JUMPED",
  "STAGE_SKIPPED",
  // Docs-only workspace_requires stage-completion guard exemption (Issue #499/#848)
  "GUARD_EXEMPTED",
  // Phase lifecycle
  "PHASE_STARTED",
  "PHASE_COMPLETED",
  "PHASE_VERIFIED",
  "PHASE_SKIPPED",
  // Workflow lifecycle
  "WORKFLOW_STARTED",
  "WORKFLOW_COMPLETED",
  "WORKFLOW_PARKED",
  "WORKFLOW_UNPARKED",
  // Session events (hook-owned)
  "SESSION_STARTED",
  "SESSION_RESUMED",
  "SESSION_COMPACTED",
  "SESSION_ENDED",
  // Human presence (hook-owned): one event per real human prompt turn. The
  // approval/interview gate requires a HUMAN_TURN appended AFTER the last gate
  // resolution (in ledger order) before it commits.
  "HUMAN_TURN",
  // Initialization events (fire IN ADDITION TO STAGE_COMPLETED)
  "WORKSPACE_SCAFFOLDED",
  "WORKSPACE_SCANNED",
  "WORKSPACE_INITIALISED",
  // User interaction
  "DECISION_RECORDED",
  "GATE_APPROVED",
  "GATE_REJECTED",
  "QUESTION_ANSWERED",
  // Delegated approval provenance (#671): a leader session, driven by a real
  // human turn on its own ledger, records this into a REMOTE conductor intent's
  // audit dir so the conductor's human-presence gate can open. The event carries
  // the issuer's (space, intent, shard, HUMAN_TURN timestamp) so the conductor
  // can verify the grounding HUMAN_TURN physically exists in the issuer shard —
  // it is not self-asserted (checked by verifyDelegatedProvenance). HUMAN_TURN is
  // written only by the UserPromptSubmit hook in-process and refused at the audit
  // CLI (presenceMintRejection), so no tool a model invokes can mint the grounding.
  "DELEGATED_APPROVAL",
  // Delegated rejection provenance (#685): the reject-side mirror of
  // DELEGATED_APPROVAL. A leader session, driven by a real human turn on its own
  // ledger, records this into a REMOTE conductor intent's audit dir so the
  // conductor's human-presence REJECT gate can open. Same issuer coordinates as
  // DELEGATED_APPROVAL (verified by verifyDelegatedProvenance); verb-scoped so it
  // can ONLY open a reject gate, never an approve gate.
  "DELEGATED_REJECTION",
  // Artifact events (hook-emitted)
  "ARTIFACT_CREATED",
  "ARTIFACT_UPDATED",
  "ARTIFACT_REUSED",
  // Subagent (hook-emitted)
  "SUBAGENT_COMPLETED",
  // Health/system
  "HEALTH_CHECKED",
  "SCOPE_DETECTED",
  "SCOPE_CHANGED",
  "DEPTH_CHANGED",
  "TEST_STRATEGY_CHANGED",
  // Adaptive composer: an in-flight plan re-shape (pending-stage suffix flips
  // via the recompose verb). Emitted by amadeus-utility.ts handleRecompose.
  "RECOMPOSED",
  // Jump events owned by STAGE_JUMPED — JUMP_COMPLETED was deleted as a
  // redundant alias.
  // Error/Recovery
  "ERROR_LOGGED",
  "RECOVERY_COMPLETED",
  // Construction Bolt execution
  "BOLT_STARTED",
  "BOLT_COMPLETED",
  "BOLT_FAILED",
  "AUTONOMY_MODE_SET",
  "UNIT_DISPOSITION_CHANGED",
  // Worktree lifecycle:
  //   WORKTREE_* emitted by amadeus-worktree.ts
  //   STATE_*    emitted by amadeus-state.ts state-fork/state-merge
  //   AUDIT_*    emitted by audit-fork/audit-merge handlers below
  "WORKTREE_CREATED",
  "WORKTREE_MERGED",
  "WORKTREE_DISCARDED",
  "STATE_FORKED",
  "STATE_MERGED",
  "AUDIT_FORKED",
  "AUDIT_MERGED",
  // Practices (stage events + runtime events)
  "PRACTICES_DISCOVERED",
  "PRACTICES_AFFIRMED",
  "PRACTICES_OVERRIDE",
  "PRACTICES_SECTION_EMPTY",
  // Merge Dispatch (emitter wired via amadeus-bolt.ts dispatch-event)
  "MERGE_DISPATCH_INVOKED",
  "MERGE_DISPATCH_RETURNED",
  "MERGE_DISPATCH_FALLBACK",
  // Sensors (emitters wired by sensor dispatcher for SENSOR_*; doctor for
  // GUARDRAIL_LOADED)
  "SENSOR_FIRED",
  "SENSOR_PASSED",
  "SENSOR_FAILED",
  "SENSOR_BUDGET_OVERRIDE",
  "GUARDRAIL_LOADED",
  // Learning Loop (MEMORY_EMPTY emitter wired by amadeus-runtime.ts compile;
  // RULE_LEARNED + SENSOR_PROPOSED emitters wired by amadeus-learnings.ts persist)
  "MEMORY_EMPTY",
  "RULE_LEARNED",
  "SENSOR_PROPOSED",
  // Swarm lifecycle — all emit from the swarm referee amadeus-swarm.ts (the
  // per-Unit pair + batch tally from `finalize`; SWARM_STARTED + SWARM_DEGRADED
  // from `prepare`). See CHANGELOG + audit-format.md.
  "SWARM_STARTED",
  "SWARM_UNIT_CONVERGED",
  "SWARM_UNIT_FAILED",
  "SWARM_BATON_RETURNED",
  "SWARM_COMPLETED",
  "SWARM_DEGRADED",
  // Stateful swarm-driver selection, transition, reconciliation, and native
  // evidence lifecycle. Emitted by amadeus-swarm-driver-store.ts.
  "SWARM_DRIVER_ATTEMPTED",
  "SWARM_DRIVER_SELECTED",
  "SWARM_DRIVER_TRANSITION",
  "SWARM_DRIVER_RECONCILED",
  "SWARM_NATIVE_EVIDENCE",
]);

// --- Event type to human-readable heading ---

const EVENT_HEADINGS: Record<string, string> = {
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
  ARTIFACT_CREATED: "Artifact Created",
  ARTIFACT_UPDATED: "Artifact Updated",
  ARTIFACT_REUSED: "Artifact Reused",
  SUBAGENT_COMPLETED: "Subagent Completed",
  HEALTH_CHECKED: "Health Check",
  SCOPE_DETECTED: "Scope Detection",
  SCOPE_CHANGED: "Scope Change",
  DEPTH_CHANGED: "Depth Change",
  TEST_STRATEGY_CHANGED: "Test Strategy Change",
  RECOMPOSED: "Plan Recomposed",
  ERROR_LOGGED: "Error Logged",
  RECOVERY_COMPLETED: "Recovery Completed",
  BOLT_STARTED: "Bolt Started",
  BOLT_COMPLETED: "Bolt Completed",
  BOLT_FAILED: "Bolt Failed",
  AUTONOMY_MODE_SET: "Autonomy Mode Set",
  UNIT_DISPOSITION_CHANGED: "Unit Disposition Changed",
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
  SENSOR_FIRED: "Sensor Fired",
  SENSOR_PASSED: "Sensor Passed",
  SENSOR_FAILED: "Sensor Failed",
  SENSOR_BUDGET_OVERRIDE: "Sensor Budget Override",
  GUARDRAIL_LOADED: "Guardrail Loaded",
  MEMORY_EMPTY: "Memory Empty",
  RULE_LEARNED: "Rule Learned",
  SENSOR_PROPOSED: "Sensor Proposed",
  SWARM_STARTED: "Swarm Started",
  SWARM_UNIT_CONVERGED: "Swarm Unit Converged",
  SWARM_UNIT_FAILED: "Swarm Unit Failed",
  SWARM_BATON_RETURNED: "Swarm Baton Returned",
  SWARM_COMPLETED: "Swarm Completed",
  SWARM_DEGRADED: "Swarm Degraded",
  SWARM_DRIVER_ATTEMPTED: "Swarm Driver Attempted",
  SWARM_DRIVER_SELECTED: "Swarm Driver Selected",
  SWARM_DRIVER_TRANSITION: "Swarm Driver Transition",
  SWARM_DRIVER_RECONCILED: "Swarm Driver Reconciled",
  SWARM_NATIVE_EVIDENCE: "Swarm Native Evidence",
};

// --- Helpers ---

function ensureAuditFile(projectDir: string, intent?: string, space?: string): string {
  const path = auditFilePath(projectDir, intent, space);
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(path)) {
    appendFileSync(path, "# AI-DLC Audit Log\n", "utf-8");
  }
  return path;
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

// --- Subcommand: append ---

// Core append logic — throws on error instead of exiting. Safe for library callers.
// CLI caller (main) wraps this in try/catch and translates to jsonError.
export function appendAuditEntry(
  eventType: string,
  fields: Record<string, string>,
  projectDir: string,
  intent?: string,
  space?: string
): { appended: true; event: string; timestamp: string } {
  if (!VALID_EVENT_TYPES.has(eventType)) {
    throw new Error(
      `Invalid event type: ${eventType}. Must be one of: ${[...VALID_EVENT_TYPES].join(", ")}`
    );
  }

  // Lock + audit shard both pin to the same (intent, space) record so a fork/
  // merge pair targets ONE intent end-to-end; omitted -> default-resolution.
  if (!acquireAuditLock(projectDir, 50, 100, intent, space)) {
    throw new Error("Failed to acquire audit lock after retries");
  }

  try {
    return appendAuditEntryUnlocked(eventType, fields, projectDir, intent, space);
  } finally {
    releaseAuditLock(projectDir, intent, space);
  }
}

// Lock-already-held variant for callers that need to hold the audit lock
// across multiple operations (e.g., amadeus-state.ts fork/merge, which read
// state, decide on a write, emit audit, and write state — all inside one
// critical section). The caller MUST have acquired the audit lock via
// acquireAuditLock(projectDir) and MUST release it (via releaseAuditLock or
// equivalent) regardless of how this function returns. Validates the event
// type the same way as the locked variant; everything else is identical.
export function appendAuditEntryUnlocked(
  eventType: string,
  fields: Record<string, string>,
  projectDir: string,
  intent?: string,
  space?: string
): { appended: true; event: string; timestamp: string } {
  if (!VALID_EVENT_TYPES.has(eventType)) {
    throw new Error(
      `Invalid event type: ${eventType}. Must be one of: ${[...VALID_EVENT_TYPES].join(", ")}`
    );
  }

  const heading = EVENT_HEADINGS[eventType] || eventType;
  const ts = isoTimestamp();

  const path = ensureAuditFile(projectDir, intent, space);

  let block = `\n## ${heading}\n`;
  block += `**Timestamp**: ${ts}\n`;
  block += `**Event**: ${eventType}\n`;
  for (const [key, value] of Object.entries(fields)) {
    const safeValue = escapeAuditValue(value);
    block += `**${key}**: ${safeValue}\n`;
  }
  block += `\n---\n`;

  appendFileSync(path, block, "utf-8");

  return { appended: true, event: eventType, timestamp: ts };
}

// Legacy CLI-style wrapper. Kept for backward compatibility with amadeus-state/amadeus-jump/
// amadeus-log/amadeus-bolt — they import this and catch exceptions. The
// main() caller below uses this same function but its catch block translates errors
// via jsonError (which exits).
//
// CLI minting guard (#685 review): the general `append` entry must NOT mint a
// presence/provenance event. It is enforced HERE (the CLI's append handler), not
// in appendAuditEntry, so the trusted in-process writers (mint hook,
// delegate-approval/rejection) that call appendAuditEntry directly are
// unaffected. A throw matches the invalid-event contract main() already surfaces.
export function handleAppend(
  eventType: string,
  fields: Record<string, string>,
  projectDir: string
): void {
  const rejection = presenceMintRejection(eventType);
  if (rejection) throw new Error(rejection);
  const result = appendAuditEntry(eventType, fields, projectDir);
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

  if (!acquireAuditLock(projectDir)) {
    jsonError("Failed to acquire audit lock after retries");
  }

  try {
    const path = ensureAuditFile(projectDir);

    // Interpret literal \n sequences in the body as actual newlines
    const expandedBody = unescapeAuditBody(body);

    let block = `\n## ${heading}\n`;
    block += `**Timestamp**: ${ts}\n`;
    block += `${expandedBody}\n`;
    block += `\n---\n`;

    appendFileSync(path, block, "utf-8");
  } finally {
    releaseAuditLock(projectDir);
  }

  jsonSuccess({ appended: true, heading, timestamp: ts });
}

// --- Subcommand: audit-fork ---
//
// audit-fork --slug <slug> [--project-dir <path>]
//
// Forks the main audit log into a Bolt's worktree on Bolt start. Byte-copies
// main audit so the worktree is self-contained at fork instant. Records the
// pre-emit byte-offset (Fork Boundary) and SHA-256 (Source Audit Hash) on
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

  // Byte-offset of main audit BEFORE the AUDIT_FORKED row lands. This is the
  // prefix that Source Audit Hash covers; audit-merge re-hashes the same range
  // to detect tampering.
  const boundary = statSync(mainAuditPath).size;
  const sourceHash = createHash("sha256")
    .update(readFileSync(mainAuditPath))
    .digest("hex");

  // Audit-of-intent: emit BEFORE the disk copy. appendAuditEntry throws on
  // lock failure — audit-of-intent constraint preserved (no disk side effect
  // when emit fails).
  const forkFields: Record<string, string> = {
    "Bolt slug": slug,
    "Source Audit Hash": sourceHash,
    "Fork Boundary": String(boundary),
  };
  // Distinguish a re-entry fork from an initial one in the audit trail.
  if (reentrant) forkFields.Reentrant = "true";
  const result = appendAuditEntry(
    "AUDIT_FORKED",
    forkFields,
    projectDir,
    intent,
    space,
  );
  const auditTs = result.timestamp;

  // Post-emit disk operations. On failure, emit ERROR_LOGGED with the
  // [fork-emitted:<ts>] correlation tag and exit non-zero so doctor
  // can identify the orphan AUDIT_FORKED row.
  try {
    mkdirSync(dirname(wtAuditPath), { recursive: true });
    copyFileSync(mainAuditPath, wtAuditPath);
  } catch (e) {
    const message = e instanceof Error ? errorMessage(e) : String(e);
    appendAuditEntry(
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
// current first-`boundary` bytes (refuses on mismatch — catches mid-Bolt
// tampering or main-audit truncation), then appends the post-fork delta and
// emits AUDIT_MERGED.
//
// Delta detection is parse-driven: locate the AUDIT_FORKED block in the
// worktree audit, take everything after that block's "\n---\n" separator.
// The Fork Boundary field is used solely as the prefix-hash anchor, NOT for
// delta math (the worktree audit's copy of AUDIT_FORKED extends beyond
// `boundary` by the entry's own size; trusting `boundary` for delta-start
// would duplicate AUDIT_FORKED on merge-back).
//
// Lock budget: extended from acquireAuditLock's 5s default to 20s
// (200 retries × 100ms) to absorb N=4-8 Bolt-merge contention in workshop
// scenarios.
//
// Nested-lock pattern: the outer lock guards prefix-hash check + delta
// append. AUDIT_MERGED emits via appendAuditEntry which acquires its own
// lock — outer lock is released first to avoid deadlock. Brief release-
// reacquire window is benign because deltas are append-only and AUDIT_MERGED
// is a trailing marker; merged-audit chronological order is preserved by the
// order in which deltas were appended, not by AUDIT_MERGED timestamps.

function handleAuditMerge(args: string[], projectDir: string): void {
  const slug = parseSlugFlag(args, "audit-merge");
  const operationIndex = args.indexOf("--operation-id");
  const requestDigestIndex = args.indexOf("--finalize-request-digest");
  const operationId = operationIndex >= 0 ? args[operationIndex + 1] : undefined;
  const finalizeRequestDigest = requestDigestIndex >= 0 ? args[requestDigestIndex + 1] : undefined;
  // Same selector the state/audit fork used -> the SAME intent record on both
  // ends (vision §5). recordPrefix pins the worktree audit mirror.
  const { intent, space } = parseSelectorFlags(args);
  const recordPrefix = relativeRecordDir(projectDir, intent, space);

  const mainAuditPath = auditFilePath(projectDir, intent, space);
  const wtPath = worktreePath(projectDir, slug);
  // Same MAIN clone-id token the fork used → the SAME worktree shard on merge.
  const wtAuditPath = worktreeAuditFilePath(wtPath, recordPrefix, projectDir);

  if (!existsSync(wtAuditPath)) {
    jsonError(`worktree audit not found at ${wtAuditPath}; nothing to merge`);
  }
  if (!existsSync(mainAuditPath)) {
    jsonError(`main audit not found at ${mainAuditPath}; start a workflow first (describe what to build, e.g. /amadeus "build the auth service")`);
  }

  const wtContent = readFileSync(wtAuditPath, "utf-8");

  // Locate the most recent AUDIT_FORKED block matching this slug. Block
  // structure per appendAuditEntry: "\n## <heading>\n**Timestamp**: <ts>\n
  // **Event**: <type>\n<fields>\n\n---\n". Blocks are separated by "\n---\n".
  const blocks = wtContent.split("\n---\n");
  let forkBlock: string | undefined;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (b.includes("**Event**: AUDIT_FORKED") && b.includes(`**Bolt slug**: ${slug}`)) {
      forkBlock = b;
      break;
    }
  }
  if (!forkBlock) {
    jsonError(`worktree audit missing AUDIT_FORKED entry for slug ${slug}`);
  }

  const boundaryMatch = forkBlock.match(/\*\*Fork Boundary\*\*:\s*(\d+)/);
  const sourceHashMatch = forkBlock.match(/\*\*Source Audit Hash\*\*:\s*([0-9a-f]+)/);
  const timestampMatch = forkBlock.match(/\*\*Timestamp\*\*:\s*([^\n]+)/);
  if (!boundaryMatch || !sourceHashMatch || !timestampMatch) {
    jsonError(
      `worktree audit AUDIT_FORKED entry for slug ${slug} missing Fork Boundary, Source Audit Hash, or Timestamp field`
    );
  }
  const boundary = parseInt(boundaryMatch[1], 10);
  const sourceHash = sourceHashMatch[1];
  // forkTs anchors the audit-of-intent correlation tag for any post-emit
  // failure on this merge — doctor joins this back to the matching
  // AUDIT_FORKED row in main audit by exact-string timestamp match.
  const forkTs = timestampMatch[1].trim();

  // Sanity check: re-hash main audit's first `boundary` bytes; refuse if it
  // disagrees with the recorded Source Audit Hash. Catches the case where
  // the prefix has been edited (length-preserving mutation) or truncated
  // (length less than boundary — hash differs because we hash fewer bytes
  // than were originally hashed).
  const mainBuf = readFileSync(mainAuditPath);
  const prefixLen = Math.min(boundary, mainBuf.length);
  const prefixHash = createHash("sha256")
    .update(mainBuf.subarray(0, prefixLen))
    .digest("hex");
  if (prefixHash !== sourceHash) {
    if (mainBuf.length < boundary) {
      jsonError(
        `main audit prefix-hash does not match recorded Source Audit Hash (expected at least ${boundary} bytes, got ${mainBuf.length}); refusing to merge (main-audit truncation suspected)`
      );
    } else {
      jsonError(
        `main audit prefix-hash at byte ${boundary} does not match recorded Source Audit Hash; refusing to merge (mid-Bolt tampering suspected)`
      );
    }
  }

  // Compute delta-start by locating the byte position immediately after the
  // "\n---\n" that closes the AUDIT_FORKED block. indexOf on the matched
  // forkBlock text gives a stable anchor.
  const forkBlockStart = wtContent.indexOf(forkBlock);
  const blockEndSep = "\n---\n";
  const sepIdx = wtContent.indexOf(blockEndSep, forkBlockStart);
  if (sepIdx < 0) {
    jsonError(`worktree audit malformed — no separator after AUDIT_FORKED block for slug ${slug}`);
  }
  const deltaStart = sepIdx + blockEndSep.length;
  const delta = wtContent.slice(deltaStart);

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
  if (!acquireAuditLock(projectDir, lockRetries, lockRetryMs, intent, space)) {
    jsonError(
      `Failed to acquire audit lock after ${lockRetries} × ${lockRetryMs}ms = ${(lockRetries * lockRetryMs / 1000).toFixed(1)}s retries; another merge in flight?`
    );
  }

  // Atomic critical section: delta-append + AUDIT_MERGED emit run under a
  // single lock acquisition. We use appendAuditEntryUnlocked for the
  // AUDIT_MERGED row so we don't double-acquire the lock — an earlier
  // design released-and-reacquired across the boundary, which
  // worked but left a brief window where another merger could interleave.
  // The catch path also uses the unlocked variant for the same reason: we
  // already hold the lock when the throw lands, so re-acquiring would either
  // deadlock or create a release-reacquire race in the error path.
  //
  // Failure-mode worth flagging for doctor: if appendAuditEntryUnlocked
  // throws AFTER appendFileSync (delta) succeeded, main audit has the delta
  // but no matching AUDIT_MERGED row. The catch path emits ERROR_LOGGED with
  // [slug=<slug>] [fork-emitted:<forkTs>] correlation tags so doctor can
  // detect the orphan-delta case (delta in main, AUDIT_FORKED present, no
  // AUDIT_MERGED, ERROR_LOGGED with matching forkTs).
  let entriesMerged = 0;
  let result: { appended: true; event: string; timestamp: string };
  try {
    const trimmed = delta.trim();
    if (trimmed !== "") {
      // Delta is already a sequence of well-formed audit blocks (each ending
      // in "\n---\n"). Append verbatim — running it through appendAuditEntry
      // would double-wrap each block.
      appendFileSync(mainAuditPath, delta, "utf-8");
      entriesMerged = delta.split(/\n---\n/).filter((b) => b.trim()).length;
    }
    result = appendAuditEntryUnlocked(
      "AUDIT_MERGED",
      {
        "Bolt slug": slug,
        "Entries Merged": String(entriesMerged),
        "Source Audit Hash": sourceHash,
        "Fork Boundary": String(boundary),
        ...(operationId ? { "Operation ID": operationId } : {}),
        ...(finalizeRequestDigest ? { "Finalize request digest": finalizeRequestDigest } : {}),
      },
      projectDir,
      intent,
      space,
    );
  } catch (e) {
    const message = e instanceof Error ? errorMessage(e) : String(e);
    // We still hold the outer lock in the catch path. Use the unlocked
    // variant so we don't release-and-reacquire (which would race against
    // any concurrent merger waiting for our lock). Release in finally below.
    try {
      appendAuditEntryUnlocked(
        "ERROR_LOGGED",
        {
          Tool: "amadeus-audit",
          Command: "audit-merge",
          Error: `[slug=${slug}] [fork-emitted:${forkTs}] ${message}`,
        },
        projectDir,
        intent,
        space,
      );
    } finally {
      releaseAuditLock(projectDir, intent, space);
    }
    process.exit(1);
  }
  releaseAuditLock(projectDir, intent, space);

  jsonSuccess({
    emitted: "AUDIT_MERGED",
    slug,
    entries_merged: entriesMerged,
    source_audit_hash: sourceHash,
    fork_boundary: boundary,
    audit_timestamp: result.timestamp,
    ...(operationId ? { operation_id: operationId } : {}),
    ...(finalizeRequestDigest ? { finalize_request_digest: finalizeRequestDigest } : {}),
  });
}

// --- Presence/provenance CLI minting guard ---
//
// HUMAN_TURN, DELEGATED_APPROVAL and DELEGATED_REJECTION are the trust anchors of
// the human-presence gate (#671/#685). A HUMAN_TURN proves a real human prompt;
// the two delegations carry a leader's human-grounded gate decision into a remote
// conductor's ledger. Their integrity rests entirely on WHO may write them: only
// the UserPromptSubmit mint hook (HUMAN_TURN) and amadeus-state's delegate-approval
// / delegate-rejection writers (the delegations), all via the IN-PROCESS
// appendAuditEntry. The general audit CLI (`append` / `append-raw`) is a
// general-purpose entry a model can invoke, so it must NOT be able to mint these
// — otherwise a model could fabricate presence and open a gate it never earned.
// The refusal lives at the CLI entry ONLY; appendAuditEntry itself stays open for
// the trusted in-process writers. (This closes the CLI hole but not direct file
// writes — see the residual-threat note near verifyDelegatedProvenance.)
const PRESENCE_PROTECTED_EVENTS = new Set([
  "HUMAN_TURN",
  "DELEGATED_APPROVAL",
  "DELEGATED_REJECTION",
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
