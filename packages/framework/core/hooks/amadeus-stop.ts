// Stop hook: enforce the forwarding loop on turn-end.
//
// This is the framework's FIRST flow-altering hook. The other framework
// hooks are advisory — they observe (audit, sensors, statusline, state
// validation) and always exit 0. The sensor-fire hook in particular carries
// an explicit advisory contract: it NEVER returns {decision: block} (its own
// contract, asserted by t95 Case 7 — not a framework ban). This hook is a
// DIFFERENT, sanctioned contract: it may emit {"decision":"block", ...} to
// keep the interactive forwarding loop running until the engine says `done`.
//
// Why it exists. The forwarding loop is the conductor (LLM) calling the engine
// for the next move, acting on it, and reporting. On the gated/interactive
// path the conductor holds the loop because only it can ask the human a
// question. If the conductor forgets to consult the engine — after a long
// conversation, or by improvising — the workflow drifts. So the loop cannot
// rest on the conductor's good behaviour: when the conductor tries to end its
// turn, this hook runs the engine (`amadeus-orchestrate next`) and, if a
// directive is still PENDING, blocks the stop and injects the directive back
// via `reason`. A report's next directive continues for run-stage,
// invoke-swarm, and print; human-wait, error, parked, and done stop the loop.
// Enforced by the harness, not by the LLM remembering.
//
// The reason is an ON-TASK CONTINUATION — it names the work the conductor
// still owes (run the loop, act on the directive, report), never an
// override-shaped instruction. That phrasing is the security property:
// override-shaped directives are refused by the conductor's own safety
// training, so a buggy or compromised engine can only ever CONTINUE sanctioned
// work, never hijack the session.
//
// A canonical stop-continuation budget keeps a stuck loop from trapping the
// session. The budget is audit-backed, scoped to the stage instance/revision,
// survives hook restarts and compaction, and is unaffected by unrelated audit
// rows. Its mode defaults are interactive=2 and autonomous/gated=8, with hard
// cap 10. The cap-th continuation is permitted; cap+1 is rejected durably.
// `stop_hook_active` is transport context only and never resets the budget.
//
// Five human-wait / terminal carve-outs keep the hook from punishing a turn
// that ended because it is waiting on the human, is conversational, or ran a
// terminal workspace migration:
//   1. The Esc interrupt is FREE: Stop hooks do not fire on user interrupt, so
//      an Esc can never be trapped — no code needed for that case.
//   2. The interactive GATE is not free: the Stop hook DOES fire when the
//      conductor ends its turn to await an `AskUserQuestion` answer. At an
//      approval gate ([?] awaiting-approval) or in the Request-Changes loop
//      ([R] revising) the engine still returns a pending run-stage (the stage is
//      in-flight, amadeus-orchestrate.ts:1161-1176), so without a carve-out the
//      hook would block and spam the forwarding-loop nudge until the cap bleeds
//      out. So when the current stage's checkbox is positively [?]/[R] we ALLOW
//      the stop (isHumanWaitStop below). Positive-confirmation only and
//      fail-open: stateless cases fall through to the cap-bounded block.
//   3. A mid-stage CLARIFYING QUESTION parks the stage at [-] in-progress — the
//      same state as a lazy quit, so [-] alone can't be carved out. But the
//      conductor must write a `<slug>-questions.md` with blank [Answer]: tags
//      before asking (stage-protocol.md §3); an unanswered tag is a positive
//      signal that a question is pending, so we ALLOW the stop then too
//      (isPendingQuestionStop below). Strictly gated: it never fires for an
//      Intent that holds the QUESTION CARVE-OUT — autonomy `full` with an
//      active grant, or `semi` declared by a human command, both of which may
//      rule on the question themselves and so must keep running (#2253) — and
//      any miss — no file, all answered, carve-out held, or a read error —
//      falls through to the cap-bounded block, so a genuine mid-stage quit is
//      still nudged.
//   4. A CONVERSATIONAL turn ends with the human's last prompt answered and NO
//      workflow-engine engagement (the conductor ran neither amadeus-orchestrate
//      nor amadeus-state since that prompt). Issue #365's broader reading: a human
//      who just wants to CHAT mid-workflow should not be nudged at all. We read
//      the harness transcript (Claude / Codex deliver `transcript_path` on the
//      Stop payload; Kiro delivers none, so this carve-out is inert there and
//      the run-mode-aware cap above is its safety net) and ALLOW the stop when
//      the most recent genuine human prompt was answered with zero engine calls
//      (isConversationalStop below). POSITIVE-CONFIRMATION only and fail-closed:
//      it never fires under Intent autonomy `full`, and any engine call in the
//      responding turn, an unreadable transcript, no human prompt found, or any
//      parse miss falls through to the cap-bounded block. It only ever ALLOWS;
//      it can never block more.
//   5. A MIGRATION utility call is terminal even when apply just made an active
//      Amadeus state visible. The PostToolUse Bash hook arms a short-lived,
//      one-shot latch outside the project tree only after the utility ran; this
//      hook consumes it before probing normal workflow state.
//
// No-op outside AIDLC. The frontmatter Stop matcher scopes this to the `amadeus`
// skill, but we defend here too: with no active workflow (no amadeus-state.md
// under the project dir) we exit 0 immediately. A non-AIDLC session is NEVER
// blocked. Any unexpected error also falls through to allow the stop — failing
// open is the only safe failure mode for a hook that can otherwise trap a turn.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import { initProcessObservability } from "../tools/amadeus-observability.ts";
import {
  createBudgetPolicy,
  defaultBudgetPolicy,
  type BudgetPolicyV1,
  type StopBudgetMode,
} from "../tools/amadeus-convergence-policy.ts";
import { reserveStageBudget } from "../tools/amadeus-convergence-runtime.ts";
import {
  readProductionAutonomyProjection,
  readProductionWaitingStop,
} from "../tools/amadeus-intent-autonomy-production.ts";
import { resolveSessionInteractivity } from "../tools/amadeus-intent-autonomy.ts";
import {
  COMPOSE_MARKER_RELATIVE_PATH,
  COMPOSE_MARKER_TTL_MS,
  consumeMigrationStopLatch,
  errorMessage,
  getField,
  hooksHealthDir,
  inspectComposeMarker,
  isEngineToolCall,
  isMachineInjectedTurnText,
  isoTimestamp,
  parseCheckboxes,
  readHookStdin,
  recordDir,
  recordHookDrop,
  resolveProjectDirFromHook,
  stageDir,
  stateFilePath,
  harnessDir,
  type MarkerObservation,
} from "../tools/amadeus-lib.ts";

const HOOK_NAME = "stop";

// The effective durable continuation cap. Exposed as an env var so a fork can
// lower or raise it within the canonical hard cap. With no
// override the default is RUN-MODE aware:
//   - semi/full Intent autonomy -> 8 (the long ceiling SPIKE 1 validated). An
//     unattended run has no human to release it, so the loop must run far before
//     letting go; only a genuine hang should ever hit the cap there.
//   - interactive (everything else) -> 2. Issue #365 itself recommends
//     CLAUDE_CODE_STOP_HOOK_BLOCK_CAP=2 as the workaround: a human who pauses or
//     just chats mid-workflow is released after a single nudge, not eight. A
// A non-numeric / non-positive override falls back to the mode default rather
// than disabling the guard — the guard must never be silently turned off.
export function stopContinuationBlockCap(stateContent: string): number {
  const raw = process.env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP;
  const fallback = stopContinuationDefaultCap(stateContent);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n <= STOP_CONTINUATION_HARD_CAP ? n : fallback;
}

// The mode-aware default cap (used when no env override is set).
export function stopContinuationDefaultCap(stateContent: string): number {
  const mode = intentAutonomyMode(stateContent);
  return mode === "semi" || mode === "full"
    ? AUTONOMOUS_BLOCK_CAP
    : INTERACTIVE_BLOCK_CAP;
}
const AUTONOMOUS_BLOCK_CAP = 8;
const INTERACTIVE_BLOCK_CAP = 2;
const STOP_CONTINUATION_HARD_CAP = 10;

export function stopBudgetMode(stateContent: string): StopBudgetMode {
  const mode = intentAutonomyMode(stateContent);
  return mode === "full" ? "autonomous" : mode === "semi" ? "gated" : "interactive";
}

function intentAutonomyMode(stateContent: string): "none" | "semi" | "full" | null {
  const mode = getField(stateContent, "Intent Autonomy Mode")?.trim();
  return mode === "none" || mode === "semi" || mode === "full" ? mode : null;
}

function isFullyAutonomousIntent(
  stateContent: string,
  resolvedProjectDir: string = projectDir,
): boolean {
  if (intentAutonomyMode(stateContent) !== "full") return false;
  try {
    const projection = readProductionAutonomyProjection(resolvedProjectDir);
    return projection?.mode === "full" && projection.currentGrant?.state === "active";
  } catch {
    return false;
  }
}

// --- The two BOUND carve-outs (question, compose) ----------------------------
//
// RFC-0001 appendix C D10: equating `full` with "unattended" is what left an
// interactive run with no way to hand a ruling back to the human sitting in
// front of it. ADR-5 replaces the mode test on these two sites with two axes
// that describe the situation instead of the configuration — is there a human
// who will see the question, and is this a ruling they are owed?
//
// The human-wait and conversational carve-outs are NOT bound: neither axis is
// applied to them, because both already allow stops that these axes would turn
// into blocks (R-11 / R-12).

// Why a bound carve-out fired, recorded on the allow so a misclassification can
// be contested rather than guessed at (R-15). Constructed only on the allow
// path, so its existence IS "this carve-out returned the turn".
type BoundCarveoutBasis = {
  readonly carveout: "pending-question" | "pending-compose";
  readonly interactivity: SessionInteractivitySignal;
  readonly outcomeKind: "contested" | "none" | "human-prerogative" | "not-required";
};

type SessionInteractivitySignal = { readonly interactive: boolean; readonly source: string };

// The audit line for an allow, carrying WHICH carve-out fired and WHAT the
// interactivity judgment was based on (RFC-0001 Guide-level: the verdict and its
// basis are recorded every time they are used, so a misclassification can be
// contested).
/** @internal */
export function describeBoundCarveout(basis: BoundCarveoutBasis): string {
  return `${basis.carveout} carve-out; interactivity=${basis.interactivity.source}; ruling=${basis.outcomeKind}`;
}

// C3's port is the ONLY interactivity judgment in this hook (R-1) — a second
// reading here is how the displayed verdict and the acted-on verdict drift
// apart. The port is itself fail-closed; this wrapper covers the case where it
// cannot even be reached, which is the same answer for the same reason (R-2).
function sessionInteractivity(resolvedProjectDir: string): SessionInteractivitySignal {
  try {
    const verdict = resolveSessionInteractivity(resolvedProjectDir);
    return { interactive: verdict.interactive === true, source: verdict.source };
  } catch {
    return { interactive: false, source: "undetermined" };
  }
}

// The ruling-order terminal of the decision point this record is stopped at, or
// null when there is none to read. `null` closes the carve-out rather than
// opening it (R-5 / R-10): a terminal that cannot be read is not evidence that a
// human is owed a ruling, and the budget-bounded block is the safe side.
//
// The envelope is U3's waiting record — the one durable place a non-unique
// terminal is written (amadeus-waiting.ts WaitingCause.outcome). A `unique`
// terminal never lands here at all, which is what keeps an auto-decidable
// decision point from firing the carve-out (R-6).
function pendingRulingTerminal(resolvedProjectDir: string): "contested" | "none" | null {
  try {
    return readProductionWaitingStop(resolvedProjectDir)?.cause.outcome.kind ?? null;
  } catch {
    return null;
  }
}

export function stopBudgetPolicy(stateContent: string): BudgetPolicyV1 | null {
  const configuredCap = stopContinuationBlockCap(stateContent);
  const policy = process.env.CLAUDE_CODE_STOP_HOOK_BLOCK_CAP
    ? createBudgetPolicy({
        kind: "stop-continuation",
        effectiveCap: configuredCap,
        hardCap: STOP_CONTINUATION_HARD_CAP,
        configVersion: "convergence-v1",
      })
    : defaultBudgetPolicy("stop-continuation", stopBudgetMode(stateContent));
  return policy.ok ? policy.value : null;
}

// Upper bound on the `amadeus-orchestrate next` consultation. A `next` that never
// returns must not hang the hook for the whole turn (a separate session trap
// that no completed-delivery budget can observe). The
// read-only engine answers in well under a second normally; 10s is generous
// headroom. On timeout the spawn returns non-zero and runEngineNextKind fails
// OPEN (allows the stop).
const ENGINE_TIMEOUT_MS = 10_000;

// Resolved eagerly from the ladder so an `import` of this module (tests pull
// isPendingComposeStop) still sees a real project dir, then RE-resolved in the
// main body once stdin is drained — the payload's `cwd` is the top rung (#1482)
// and the stream can only be read there. Readers must observe the binding, not
// a snapshot of it (see the getter in realPendingComposeStopDeps).
let projectDir = resolveProjectDirFromHook(import.meta.url);

interface PendingComposeStopDeps {
  projectDir: string;
  nowMs: () => number;
  stat: (path: string) => { mtimeMs: number } | undefined;
  unlink: (path: string) => void;
  diagnostic: (value: JanitorDiagnostic) => void;
  // ADR-5's interactivity axis enters through the same injection seam as the
  // clock and the filesystem, so the carve-out stays testable without an audit
  // shard on disk.
  interactivity: () => SessionInteractivitySignal;
}

type MarkerJanitorOutcome =
  | { kind: "not-applicable" }
  | { kind: "deleted"; path: string }
  | { kind: "delete-failed"; path: string; reason: string };

type JanitorDiagnostic = {
  markerState: "stale";
  cleanup: "deleted" | "delete-failed";
  enforcement: "continued";
};

const realPendingComposeStopDeps: PendingComposeStopDeps = {
  // Getter, not a snapshot: the main body re-resolves projectDir once the hook
  // payload's cwd is known, and these deps must follow it.
  get projectDir() {
    return projectDir;
  },
  nowMs: Date.now,
  stat(path) {
    try {
      return { mtimeMs: statSync(path).mtimeMs };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw e;
    }
  },
  unlink(path) {
    unlinkSync(path);
  },
  interactivity() {
    return sessionInteractivity(projectDir);
  },
  diagnostic(value) {
    recordHookDrop(
      projectDir,
      HOOK_NAME,
      `compose marker stale; cleanup=${value.cleanup}; enforcement=${value.enforcement}`,
    );
  },
};

// Allow the stop: emit nothing, exit 0. This is the precedent non-blocking
// pattern shared by every other framework hook. The conductor's turn ends.
function allowStop(): never {
  process.exit(0);
}

// Block the stop and inject the pending work back into the session. The reason
// is an on-task continuation (the work still owed), NOT an override-shaped
// instruction — that phrasing is the security property (see header).
function blockStop(reason: string): never {
  console.log(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
}

// The Current Stage slug from the state file. Factored from the regex the
// budget and continuation both use; returns "" when the field is absent.
// returns "" when the field is absent. Matches `**Current Stage**:`, with or
// without the bold markers / backticks, exactly as before.
function currentStageSlug(stateContent: string): string {
  const stageMatch = stateContent.match(/Current Stage\*{0,2}:?\s*`?([^\n`]*)`?/);
  return (stageMatch?.[1] ?? "").trim();
}

// Reserve one continuation against the canonical stage budget. Audit rows,
// hook invocations, sessions and compact/resume are deliberately absent from
// the BudgetSubject identity; only a real stage/revision transition creates a
// new subject. Canonical write or state failures release the stop safely.
export function decideStopContinuation(
  resolvedProjectDir: string,
  stateContent: string,
  stopHookActive: boolean,
  sessionId: string | undefined,
): boolean {
  const policy = stopBudgetPolicy(stateContent);
  const stage = currentStageSlug(stateContent);
  const activeRecordDir = recordDir(resolvedProjectDir);
  if (policy === null || stage.length === 0 || activeRecordDir === null) return false;
  const revision = Number.parseInt(getField(stateContent, "Revision Count") ?? "0", 10);
  const stageRevision = Number.isInteger(revision) && revision >= 0 ? revision : 0;
  const stageInstanceId = `${stage}@${stageRevision}`;
  const result = reserveStageBudget({
    projectDir: resolvedProjectDir,
    intentUuid: basename(activeRecordDir),
    stageSlug: stage,
    stageInstanceId,
    revision: stageRevision,
    agent: getField(stateContent, "Active Agent") ?? "amadeus-conductor",
    budgetKind: "stop-continuation",
    subjectId: stageInstanceId,
    policy,
    lastDurableProgress: `${stage}:${getField(stateContent, "Status") ?? "running"}`,
    deliveryIdentity: `${sessionId ?? "anonymous"}:${stopHookActive ? "recursive" : "initial"}`,
  });
  if (result.kind === "reserved") return true;
  recordHookDrop(
    resolvedProjectDir,
    HOOK_NAME,
    result.kind === "exhausted"
      ? `stop continuation budget exhausted (${policy.effectiveCap}/${policy.effectiveCap})`
      : `stop continuation budget refused (${result.reason})`,
  );
  return false;
}

// --- Human-wait carve-out -----------------------------------------------------
//
// The block path punishes a conductor that quit mid-loop. But a conductor parked
// at an approval gate or in the Request-Changes loop has ALSO ended its turn with
// the engine still returning a pending directive — and from the engine's vantage
// it looks identical, because a stage in `awaiting-approval` ([?]) or `revising`
// ([R]) is still "in-flight", so `next` re-emits a run-stage for it
// (amadeus-orchestrate.ts:1161-1176). Yet these states exist BECAUSE the human was
// engaged: [?] only because a gate is open awaiting approve/reject, [R] only
// because changes were just requested. Blocking there spams the forwarding-loop
// nudge until the cap bleeds out — confusing and unprofessional at an
// interactive gate.
//
// So when the CURRENT stage's checkbox is positively in one of those states,
// allow the stop. This is the only safe widening of an allow: it can only ever
// make the hook release MORE readily, never block more.
//
// One honest caveat on [R]: the row stays `revising` across the WHOLE rework
// window (it flips back to [?] only when the conductor calls `revise`; see
// stage-protocol.md:164). So [R] covers both the human-wait prompt ("what would
// you like changed?") AND the autonomous rework edits that follow. Allowing the
// stop on [R] means a conductor that quits mid-rework is not nudged — the same
// [-]-style ambiguity we accept for in-progress, here scoped to a window the
// human just opened. It is still only ever an allow (never blocks more), and the
// dominant [R] experience is the human-wait prompt this carve-out targets.
//
// POSITIVE-CONFIRMATION ONLY. We allow ONLY when a checkbox row for the current
// slug exists AND its state is [?]/[R]. No rows, slug not found, or any other
// state → return false and fall through. [-] in-progress is NOT carved out HERE:
// it is also the normal "stage work still owed" state, indistinguishable from a
// lazy mid-stage quit by checkbox alone, so a blanket [-] carve-out would gut
// the hook. (A mid-stage [-] stage with a genuinely pending question is handled
// separately and conservatively by isPendingQuestionStop below, which keys off
// the conductor's questions file rather than checkbox state.) Any parse error
// falls through too: fail-open is the only safe failure mode for a hook that can
// otherwise trap a turn.
export function isHumanWaitStop(stateContent: string): boolean {
  try {
    const slug = currentStageSlug(stateContent);
    if (slug.length === 0) return false;
    const row = parseCheckboxes(stateContent).find((c) => c.slug === slug);
    return row?.state === "awaiting-approval" || row?.state === "revising";
  } catch {
    // Unparseable / odd content — fall through to decideBlock (never trap).
    return false;
  }
}

// --- Tier-2: pending mid-stage question carve-out -----------------------------
//
// A clarifying question asked mid-stage leaves the stage at [-] in-progress —
// the SAME checkbox state as a conductor that lazily quit, so [-] alone cannot
// be carved out (tier 1 deliberately left it to the cap). But there IS a
// conductor-emitted artifact that disambiguates: stage-protocol.md §3 mandates a
// `<slug>-questions.md` is created (Step 1) with blank `[Answer]:` tags before
// the conductor asks, and every tag is filled before the stage proceeds (Step
// 4). So a questions file with an UNANSWERED tag means a question is genuinely
// pending — the conductor is parked on the human, exactly like a gate.
//
// Two strict gates make this safe (it can still only ever ALLOW, never block
// more):
//   1. POSITIVE-CONFIRMATION — allow only when a `<slug>-questions.md` under the
//      current stage's dir (amadeus-docs/<phase>/<slug>/, mirroring memoryPathFor)
//      has at least one `[Answer]:` tag that is empty or underscores-only. No
//      file, all answered, or any read error → false (fall through to the cap).
//   2. BOUND (ADR-5) — the session must be interactive, and under `semi`/`full`
//      the decision point must have reached a terminal a human is owed. A
//      non-interactive run stops here instead and the engine takes it into
//      waiting; an auto-decidable question keeps the loop alive.
// Fail-open throughout: any error returns false and the cap-bounded block stands.

// True when the `<slug>-questions.md` under the stage dir has an unanswered tag.
// An `[Answer]:` line is "unanswered" when, after the colon, only whitespace or
// underscores remain (stage-protocol.md:333 — "blank or contains only
// underscores"). Scans the stage dir for any *-questions.md (the canonical name
// is `<slug>-questions.md`, but matching the suffix is robust to the per-unit
// Construction `{unit}` path segment the engine does not yet resolve).
function hasPendingQuestion(slug: string, phase: string, resolvedProjectDir: string = projectDir): boolean {
  if (slug.length === 0 || phase.length === 0) return false;
  const stageDirPath = stageDir(resolvedProjectDir, phase.toLowerCase(), slug);
  if (!existsSync(stageDirPath)) return false;
  let files: string[];
  try {
    files = readdirSync(stageDirPath).filter((f) => f.endsWith("-questions.md"));
  } catch {
    return false;
  }
  for (const f of files) {
    let body: string;
    try {
      body = readFileSync(join(stageDirPath, f), "utf-8");
    } catch {
      continue;
    }
    // An [Answer]: tag whose value (to end of line) is empty or underscores-only.
    if (/\[Answer\]:[ \t]*_*[ \t]*$/m.test(body)) return true;
  }
  return false;
}

// The tier-2 carve-out decision: the current stage is [-] in-progress, a
// question is pending, somebody is there to answer it, and (outside mode
// `none`) the ladder handed the ruling back rather than making it.
//
// Mode `none` does not run the ladder — every question is the human's by
// definition — so the unanswered tag remains the whole signal there (R-7).
/** @internal */
export function questionCarveoutBasis(
  stateContent: string,
  resolvedProjectDir: string = projectDir,
): BoundCarveoutBasis | null {
  try {
    const slug = currentStageSlug(stateContent);
    if (slug.length === 0) return null;
    const row = parseCheckboxes(stateContent).find((c) => c.slug === slug);
    if (row?.state !== "in-progress") return null; // positive [-] only
    const phase = getField(stateContent, "Lifecycle Phase") ?? "";
    if (!hasPendingQuestion(slug, phase, resolvedProjectDir)) return null;
    const interactivity = sessionInteractivity(resolvedProjectDir);
    if (!interactivity.interactive) return null; // R-8: the engine waits instead
    const mode = intentAutonomyMode(stateContent);
    if (mode !== "semi" && mode !== "full") {
      return { carveout: "pending-question", interactivity, outcomeKind: "not-required" };
    }
    const terminal = pendingRulingTerminal(resolvedProjectDir);
    if (terminal === null) return null;
    return { carveout: "pending-question", interactivity, outcomeKind: terminal };
  } catch {
    // Unparseable / odd content — fall through to decideBlock (never trap).
    return null;
  }
}

export function isPendingQuestionStop(stateContent: string, resolvedProjectDir: string = projectDir): boolean {
  return questionCarveoutBasis(stateContent, resolvedProjectDir) !== null;
}

// --- Tier-2b: pending in-flight compose proposal carve-out --------------------
//
// The adaptive composer's IN-FLIGHT approve/edit/reject gate is a turn-stop
// like a stage gate, but it has no [?]/[R] checkbox signal: the current stage
// stays [ ]/[-], so this hook's bare-`next` probe sees the pending run-stage
// and would block the turn - shoving the conductor back into stage execution
// mid-compose and abandoning the gate (the mid-workflow trap class, reopened
// for compose). POSITIVE-CONFIRMATION: the conductor writes the marker file
// `amadeus/.amadeus-compose-pending` before presenting the gate (the engine's
// compose dispatch print instructs it) and deletes it on approve/reject, the
// same disk-signal discipline as tier-2's <slug>-questions.md. BOUND (ADR-5):
// the session must be interactive — a compose approval is the human's in every
// mode (RFC-0001 ToBe row 19), so the terminal binding is satisfied the moment
// a fresh marker exists, and what remains to establish is that somebody is
// there to give it. Fail-open: any read error falls through to the cap-bounded
// block. Front/report composes are unaffected (cold start has no state file;
// the hook allows before this).
//
// The marker janitor runs regardless of interactivity: a stale marker is
// garbage in either session, and sweeping it is not a carve-out decision.
/** @internal */
export function composeCarveoutBasis(
  deps: PendingComposeStopDeps = realPendingComposeStopDeps,
): BoundCarveoutBasis | null {
  const markerPath = join(deps.projectDir, COMPOSE_MARKER_RELATIVE_PATH);
  let observation: MarkerObservation;
  try {
    const marker = deps.stat(markerPath);
    observation = marker === undefined
      ? { kind: "absent", path: markerPath }
      : { kind: "present", path: markerPath, mtimeMs: marker.mtimeMs };
  } catch (e) { observation = { kind: "unreadable", path: markerPath, reason: errorMessage(e) }; }

  const freshness = inspectComposeMarker(observation, deps.nowMs(), COMPOSE_MARKER_TTL_MS);
  let janitor: MarkerJanitorOutcome = { kind: "not-applicable" };
  if (freshness.kind === "stale") {
    try {
      deps.unlink(markerPath);
      janitor = { kind: "deleted", path: markerPath };
    } catch (e) { janitor = { kind: "delete-failed", path: markerPath, reason: errorMessage(e) }; }
  }
  if (janitor.kind !== "not-applicable") {
    deps.diagnostic({
      markerState: "stale",
      cleanup: janitor.kind,
      enforcement: "continued",
    });
  }
  if (freshness.kind !== "fresh") return null;
  let interactivity: SessionInteractivitySignal;
  try {
    interactivity = deps.interactivity();
  } catch {
    interactivity = { interactive: false, source: "undetermined" }; // R-2
  }
  if (!interactivity.interactive) return null; // R-8: the engine waits instead
  return { carveout: "pending-compose", interactivity, outcomeKind: "human-prerogative" };
}

/** @internal */
export function isPendingComposeStop(
  deps: PendingComposeStopDeps = realPendingComposeStopDeps,
): boolean {
  return composeCarveoutBasis(deps) !== null;
}

// --- Tier-3: conversational-turn carve-out (issue #365 broader reading) -------
//
// Issue #365's literal fix is `park` (the conductor explicitly pauses the run).
// But the reported pain is broader: during an ACTIVE workflow a human who just
// wants to CHAT (ask a question, discuss a decision, course-correct) should
// not be nudged back into the forwarding loop at all. Park does not cover that
// (it is not automatic). This carve-out does: when the turn that is ending was
// CONVERSATIONAL (the most recent genuine human prompt was answered with NO
// workflow-engine engagement, i.e. the conductor ran neither amadeus-orchestrate
// nor amadeus-state since that prompt) we ALLOW the stop.
//
// The signal is the harness transcript. Claude and Codex both deliver a
// `transcript_path` on the Stop payload (Claude JSONL; Codex date-sharded
// rollout JSONL); Kiro delivers none, so on Kiro this carve-out is simply inert
// and the run-mode-aware low interactive cap (blockCap) is the safety net that
// releases a chatting human after one nudge instead of eight.
//
// Two strict gates make this safe (it can still only ever ALLOW, never block
// more), mirroring isPendingQuestionStop:
//   1. POSITIVE-CONFIRMATION: allow only on a transcript we could read that
//      shows a genuine human prompt answered with zero engine calls. A missing
//      path, unreadable file, no human prompt found, or ANY engine call in the
//      responding turn returns false (fall through to the cap-bounded block).
//   2. AUTONOMY GUARD: never fires under Intent autonomy `full`. There the
//      loop must keep running unattended; there is no human chatting to release.
// Fail-closed throughout: any error returns false and the cap-bounded block stands.

// The engine-engagement classifier (isEngineToolCall / isEngineEngagementSegment)
// lives in ../tools/amadeus-lib.ts: this hook only runs as a spawned process,
// which bun --coverage cannot observe, so the classifier is hosted in the
// in-process-testable lib (t209) and imported here (#758).

// True when a user-role transcript entry's text is actually the hook's OWN
// injected continuation (a re-prompt after a block), not the human talking.
// Two shapes: Claude Code wraps the block reason as "Stop hook feedback: ..."
// (isMeta:true), but other harnesses (Codex) may re-inject the RAW reason text
// with no wrapper. continuationReason() (below) always opens with "The AIDLC
// workflow has a pending step" and names "the forwarding loop", so match either
// signature. Excluding these is what keeps an engine-engaged turn whose last
// user entry is the hook's nudge from being misread as a fresh human prompt.
function isInjectedHookFeedback(text: string): boolean {
  const t = text.trimStart();
  return (
    t.startsWith("Stop hook feedback:") ||
    (t.startsWith("The AIDLC workflow has a pending step") &&
      /forwarding loop/.test(t))
  );
}

// Read the transcript and classify the ending turn as conversational. Supports
// both delivered formats; returns true ONLY with positive evidence. `format`
// distinguishes Claude's message-shaped JSONL from Codex's {type,payload}
// rollout. Fail-closed on every miss.
export function transcriptIsConversational(transcriptPath: string, format: "claude" | "codex"): boolean {
  let raw: string;
  try {
    raw = readFileSync(transcriptPath, "utf-8");
  } catch {
    return false; // unreadable transcript: fall through to the cap
  }
  const lines = raw.split("\n");
  // Parse to a flat sequence of {role, engineCall} events in file order.
  type Turn = { role: "user" | "assistant"; engineCall: boolean; humanPrompt: boolean };
  const turns: Turn[] = [];
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    let o: unknown;
    try {
      o = JSON.parse(line);
    } catch {
      continue; // skip non-JSON / partial lines
    }
    if (o === null || typeof o !== "object") continue;
    const entry = o as Record<string, unknown>;
    if (format === "claude") {
      // Claude JSONL: {type:"user"|"assistant", message:{role, content}}.
      const type = entry.type;
      const message = entry.message as Record<string, unknown> | undefined;
      if (!message) continue;
      const role = message.role;
      const content = message.content;
      if (type === "user" && role === "user") {
        // SKIP synthetic / non-human user turns. Claude Code records several
        // things as `type:"user"` that are NOT the human talking:
        //   - `isMeta: true` entries: the Stop hook's OWN injected block-feedback
        //     ("Stop hook feedback: ...") and command-message wrappers. Counting
        //     these as a human prompt would let the hook's own nudge masquerade
        //     as the human, so an engine-engaged turn could be misread as chat.
        //   - tool_result arrays: a tool's output, not a prompt.
        // Both must be excluded so "the most recent genuine human prompt" is the
        // human, not the harness.
        if (entry.isMeta === true) continue;
        const isToolResult =
          Array.isArray(content) &&
          content.some((x) => (x as Record<string, unknown>)?.type === "tool_result");
        if (isToolResult) continue; // a tool_result is not a human prompt
        // Defence-in-depth: the hook's continuation text is injected as a user
        // turn; exclude it by content even if a future build drops `isMeta`.
        const asText =
          typeof content === "string"
            ? content
            : Array.isArray(content)
              ? content
                  .map((x) => {
                    const b = x as Record<string, unknown>;
                    return b?.type === "text" ? String(b.text ?? "") : "";
                  })
                  .join("")
              : "";
        // Exclude the hook's own re-prompt AND any MACHINE-INJECTED turn (agmsg
        // task-notifications / teammate-message deliveries, shared
        // MACHINE_INJECTED_TURN_MARKERS catalog): neither is the human talking,
        // so counting one as "the most recent genuine human prompt" would let a
        // machine-driven turn masquerade as chat (#755).
        if (isInjectedHookFeedback(asText) || isMachineInjectedTurnText(asText)) continue;
        // A genuine human prompt: string content, or an array with a text block.
        const isHuman =
          typeof content === "string" ||
          (Array.isArray(content) &&
            content.some((x) => (x as Record<string, unknown>)?.type === "text"));
        if (isHuman) turns.push({ role: "user", engineCall: false, humanPrompt: true });
      } else if (type === "assistant" && role === "assistant" && Array.isArray(content)) {
        let engineCall = false;
        for (const block of content) {
          const b = block as Record<string, unknown>;
          if (b?.type === "tool_use" && isEngineToolCall(String(b.name ?? ""), b.input)) {
            engineCall = true;
            break;
          }
        }
        turns.push({ role: "assistant", engineCall, humanPrompt: false });
      }
    } else {
      // Codex rollout JSONL: {type:"response_item", payload:{type, role, content,
      // name, ...}}. function_call entries carry the tool name/arguments.
      const payload = entry.payload as Record<string, unknown> | undefined;
      if (entry.type !== "response_item" || !payload) continue;
      const ptype = payload.type;
      if (ptype === "message" && payload.role === "user") {
        // input_text blocks are the human prompt; tool output rides function_call_output.
        const content = payload.content;
        // Exclude the hook's own injected continuation (delivered as a user
        // message on a re-prompt) AND any MACHINE-INJECTED turn (shared
        // MACHINE_INJECTED_TURN_MARKERS catalog) so neither is mistaken for the
        // human, mirroring the Claude reader (#755).
        const asText =
          typeof content === "string"
            ? content
            : Array.isArray(content)
              ? content
                  .map((x) => {
                    const b = x as Record<string, unknown>;
                    return b?.type === "input_text" || b?.type === "text" ? String(b.text ?? "") : "";
                  })
                  .join("")
              : "";
        if (isInjectedHookFeedback(asText) || isMachineInjectedTurnText(asText)) continue;
        const isHuman =
          typeof content === "string" ||
          (Array.isArray(content) &&
            content.some((x) => {
              const t = (x as Record<string, unknown>)?.type;
              return t === "input_text" || t === "text";
            }));
        if (isHuman) turns.push({ role: "user", engineCall: false, humanPrompt: true });
      } else if (ptype === "message" && payload.role === "assistant") {
        turns.push({ role: "assistant", engineCall: false, humanPrompt: false });
      } else if (ptype === "function_call" || ptype === "local_shell_call") {
        const name = String(payload.name ?? (ptype === "local_shell_call" ? "Shell" : ""));
        const args = payload.arguments ?? payload.action ?? {};
        // function_call arguments are a JSON string on Codex; parse leniently.
        let parsedArgs: Record<string, unknown> = {};
        if (typeof args === "string") {
          try {
            const j = JSON.parse(args);
            parsedArgs = j !== null && typeof j === "object" ? (j as Record<string, unknown>) : { command: args };
          } catch {
            parsedArgs = { command: args };
          }
        } else if (args !== null && typeof args === "object") {
          parsedArgs = args as Record<string, unknown>;
        }
        // Normalise the command field so isEngineToolCall sees the full command
        // text (Codex may key it `command`, or carry it as the raw arguments
        // string). Routing it ALL through isEngineToolCall keeps the read-only
        // exemption (--status etc.) consistent across both transcript formats,
        // rather than a loose regex that would re-flag a read-only query.
        if (typeof parsedArgs.command !== "string") {
          parsedArgs = { ...parsedArgs, command: typeof args === "string" ? args : JSON.stringify(args) };
        }
        const engineCall = isEngineToolCall(
          /^(bash|shell|execute_bash|local_shell_call)$/i.test(name) ? "Bash" : name,
          parsedArgs,
        );
        turns.push({ role: "assistant", engineCall, humanPrompt: false });
      }
    }
  }

  // Find the most recent genuine human prompt.
  let lastHumanIdx = -1;
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].humanPrompt) {
      lastHumanIdx = i;
      break;
    }
  }
  if (lastHumanIdx === -1) return false; // no human prompt found: cannot confirm chat

  // Any engine call AFTER that prompt means the conductor engaged the workflow;
  // a mid-loop bail must still be nudged. Zero engine calls -> conversational.
  for (let i = lastHumanIdx + 1; i < turns.length; i++) {
    if (turns[i].engineCall) return false;
  }
  return true;
}

// The tier-3 carve-out decision: not autonomous, a transcript was delivered, and
// it shows a conversational ending turn. `transcriptPath`/`format` come from the
// Stop payload (Claude / Codex); both are absent on Kiro, where this returns
// false and the low interactive cap handles the chat case instead.
export function isConversationalStop(
  stateContent: string,
  transcriptPath: string | null,
  format: "claude" | "codex",
  resolvedProjectDir: string = projectDir,
): boolean {
  try {
    if (isFullyAutonomousIntent(stateContent, resolvedProjectDir)) {
      return false; // autonomy guard: keep the loop alive
    }
    if (transcriptPath === null || transcriptPath.length === 0) return false;
    return transcriptIsConversational(transcriptPath, format);
  } catch {
    // Unparseable / odd content: fall through to decideBlock (never trap).
    return false;
  }
}

// --- Compose the engine -------------------------------------------------------
//
// Run `amadeus-orchestrate.ts next` and return its parsed directive kind, or null
// if the engine could not be consulted (spawn failure, non-zero exit, or
// unparseable stdout). A null kind fails OPEN — the caller allows the stop —
// because we will not trap a turn on the engine's behalf when we cannot read a
// directive. We pass --project-dir explicitly so the engine resolves the same
// workspace regardless of the spawned process's cwd.
export function runEngineNextKind(resolvedProjectDir: string = projectDir): string | null {
  const enginePath = join(resolvedProjectDir, harnessDir(), "tools", "amadeus-orchestrate.ts");
  if (!existsSync(enginePath)) return null;
  // The spawn MUST be time-bounded. Without a timeout a hung `next` (an engine
  // that never returns) would hang this hook for the whole turn — a session
  // trap by a path the completed-delivery budget cannot observe. On timeout spawnSync
  // returns with a non-zero/absent exitCode (and sets `proc.error`), which the
  // null-return below treats as "engine could not be consulted" → fail OPEN
  // (allow the stop). Mirrors amadeus-sensor-fire.ts's bounded spawn.
  const proc = Bun.spawnSync({
    cmd: ["bun", enginePath, "next", "--project-dir", resolvedProjectDir],
    stdout: "pipe",
    stderr: "pipe",
    timeout: ENGINE_TIMEOUT_MS,
  });
  if (proc.exitCode !== 0) return null;
  const stdout = new TextDecoder().decode(proc.stdout).trim();
  if (stdout.length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(stdout);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "kind" in parsed &&
      typeof (parsed as { kind: unknown }).kind === "string"
    ) {
      return (parsed as { kind: string }).kind;
    }
  } catch {
    // Unparseable directive — fail open.
  }
  return null;
}

// Build the on-task continuation injected when blocking. It names the pending
// work the conductor still owes — run the forwarding loop, act on the directive
// the engine emits, then report — and the directive kind / stage for context.
// Deliberately phrased as continuation of sanctioned work, never as an
// instruction to do something new or out-of-band (the security property).
// `resolvedProjectDir` / `resolvedStatePath` are echoed so a mis-resolved project
// dir is diagnosable at a glance: a worktree session whose hook read the MAIN
// checkout's state used to block on someone else's pending step with no way to
// tell from the message (#1482).
export function continuationReason(
  kind: string,
  stage: string,
  resolvedProjectDir: string,
  resolvedStatePath: string,
): string {
  const where = stage.length > 0 ? ` for "${stage}"` : "";
  const body = (
    `The AIDLC workflow has a pending step (a ${kind} directive${where}). ` +
    "You haven't finished the forwarding loop yet. Run " +
    `\`bun ${harnessDir()}/tools/amadeus-orchestrate.ts next\`, act on the directive it ` +
    "emits, then run `amadeus-orchestrate report --stage <stage> --result <outcome>` to commit " +
    "the transition. Complete only this directive's declared completion conditions and do " +
    "not search for additional improvements. Treat the directive returned by the report as " +
    "the next loop step: continue for `run-stage`, `invoke-swarm`, and `print`; human-wait " +
    "(`ask` or `select-intent`), `error`, `parked`, and `done` end the loop. " +
    "If instead you mean to pause this workflow for now (and resume in a later " +
    `session), run \`bun ${harnessDir()}/tools/amadeus-orchestrate.ts park\` to park it ` +
    "cleanly at this inter-stage boundary - never mark stages complete just to end the turn."
  );
  return `${body} (Resolved project dir: ${resolvedProjectDir}; state read from: ${resolvedStatePath}.)`;
}

// --- Main ---------------------------------------------------------------------

// Mirror the SubagentStop hook's stdin idiom: a TTY means no Claude Code JSON
// is coming (test/debug contexts) — allow the stop rather than block on a
// terminal read.
// biome-ignore format: preserve the established top-level hook body without a whole-file reindent
if (import.meta.main) {
if (process.stdin.isTTY) allowStop();

const hookStdin = await readHookStdin();
projectDir = resolveProjectDirFromHook(import.meta.url, hookStdin.cwd);

let stopInputObject: Record<string, unknown> | null = null;
try {
  const raw: unknown = JSON.parse(hookStdin.text);
  if (raw !== null && typeof raw === "object") {
    stopInputObject = raw as Record<string, unknown>;
  }
} catch {
  // Malformed input follows the existing fail-open parser below. In particular,
  // it supplies no session id, so it can never consume a migration permission.
}

// A migration utility that ran in THIS session is terminal even when apply just
// made an active Amadeus state visible. Consume the PostToolUse latch before any
// heartbeat or state probe: dry-run/apply Stop must leave an absent destination,
// pristine installer seed, and migrated runtime/scratch set byte-identical. A
// missing/mismatched/stale session id fails closed (see amadeus-lib.ts).
const migrationSessionId =
  typeof stopInputObject?.session_id === "string"
    ? stopInputObject.session_id
    : undefined;
if (consumeMigrationStopLatch(projectDir, migrationSessionId)) allowStop();

// No-op outside AIDLC: if there is no workflow state file under the project dir,
// there is nothing to enforce — allow the stop. Defends the frontmatter scoping.
const statePath = stateFilePath(projectDir);
if (!existsSync(statePath)) allowStop();

// Telemetry process span (opt-in; no-op unless observability.enabled)
initProcessObservability("hook:stop", projectDir);

// Write a health heartbeat only for a real active workflow, after the terminal
// migration carve-out. A pre-Intent installer seed must remain pristine.
try {
  const healthDir = hooksHealthDir(projectDir);
  mkdirSync(healthDir, { recursive: true });
  writeFileSync(join(healthDir, "stop.last"), isoTimestamp(), "utf-8");
} catch {
  // Heartbeat failure is non-fatal — never let it affect the stop decision.
}

let stateContent: string;
try {
  stateContent = readFileSync(statePath, "utf-8");
} catch (e) {
  // Unreadable state — fail open (never trap) and record the drop.
  recordHookDrop(projectDir, HOOK_NAME, errorMessage(e));
  allowStop();
}

// Parse the Stop-hook input. Garbage / empty stdin must NOT crash and must NOT
// trap the turn (fail open). We read `stop_hook_active` (the recursion bound)
// and `transcript_path` (the conversational carve-out, tier 3). Claude and Codex
// both deliver `transcript_path`; Kiro delivers neither, so transcriptPath stays
// null there and the conversational carve-out is inert (the low interactive cap
// handles chat instead).
let stopHookActive = false;
let transcriptPath: string | null = null;
// Transcript format: Codex's rollout JSONL lives under a `.../sessions/<date>/
// rollout-*.jsonl` path and uses a {type,payload} shape; Claude's is message-
// shaped JSONL. Default to Claude; switch to Codex when the path looks like a
// Codex rollout. (Both readers fail-closed, so a misclassification can only ever
// return false and fall through to the cap, never a false allow.)
let transcriptFormat: "claude" | "codex" = "claude";
if (stopInputObject !== null) {
  if ("stop_hook_active" in stopInputObject) {
    stopHookActive = stopInputObject.stop_hook_active === true;
  }
  if (
    typeof stopInputObject.transcript_path === "string" &&
    stopInputObject.transcript_path.length > 0
  ) {
    transcriptPath = stopInputObject.transcript_path;
    if (/[/\\]rollout-[^/\\]*\.jsonl$/.test(transcriptPath)) {
      transcriptFormat = "codex";
    }
  }
} else {
  // Malformed JSON (or empty): proceed with stopHookActive=false and no
  // transcript. The engine read below still governs whether work is pending; the
  // counter still bounds any block. We never crash on bad input.
}

// Consult the engine for the next move. A null kind (engine unavailable /
// unparseable) fails open — allow the stop.
const kind = runEngineNextKind();
if (kind === null) {
  recordHookDrop(projectDir, HOOK_NAME, "engine next returned no parseable directive; allowing stop");
  allowStop();
}

// `done` → the workflow is complete; allow the turn to end.
if (kind === "done") {
  allowStop();
}

// `parked` -> the workflow was intentionally parked mid-flow (issue #367); a
// human resumes it later with /amadeus --resume. This is the SUPPORTED
// multi-session exit: allow the turn to end, so the conductor parks at a clean
// inter-stage boundary instead of
// rubber-stamping the remaining stages to force a `done`. Terminal allow only
// (never a new block), so it can never trap a session.
//
// A parked directive is terminal for the current turn in every mode. In `full`
// it can represent REPAIR_STALLED, NORM_CONFLICT, or another explicit safe-stop
// envelope; keeping the Stop loop alive would defeat that safety boundary. The
// Intent grant remains a separate projection and is not revoked by this allow.
if (kind === "parked") {
  allowStop();
}

// `ask` / `select-intent` → the engine is explicitly waiting for human input.
// Allow the turn to end so the user can respond, rather than re-feeding the loop.
if (kind === "ask" || kind === "select-intent") {
  allowStop();
}

// Human-wait carve-out: the engine returns a pending directive, but the current
// stage is positively at [?] awaiting-approval or [R] revising — the conductor
// is correctly parked on the human (an approval gate or the Request-Changes
// loop), with genuinely nothing to do without their input. Allow the stop
// instead of spamming the forwarding-loop nudge. Positive-confirmation only and
// fail-open (see isHumanWaitStop): any other state, no checkbox row, or a parse
// error falls through to the cap-bounded block below, unchanged. (This is the
// current-stage-scoped successor to the broad `[?]` substring match that landed
// in 679153d; scoping to the current slug and adding [R] is strictly safer.)
if (isHumanWaitStop(stateContent)) {
  recordHookDrop(
    projectDir,
    HOOK_NAME,
    `current stage ${currentStageSlug(stateContent)} is awaiting approval or being revised; allowing the stop (human-wait carve-out)`,
  );
  allowStop();
}

// Pending-question carve-out (tier 2): the current [-] stage has an unanswered
// question in its `<slug>-questions.md`, somebody is in this session to answer
// it, and the ladder handed the ruling back instead of making it — so the
// conductor is parked on the human. Allow the stop instead of nudging. Strictly
// gated and fail-open (see questionCarveoutBasis): any other state, no open
// question, a non-interactive session, an auto-decidable question, or a read
// error falls through to the cap-bounded block below.
const questionBasis = questionCarveoutBasis(stateContent);
if (questionBasis !== null) {
  recordHookDrop(
    projectDir,
    HOOK_NAME,
    `current stage ${currentStageSlug(stateContent)} has an unanswered question; allowing the stop (${describeBoundCarveout(questionBasis)})`,
  );
  allowStop();
}

// Pending-compose carve-out (tier 2b): an in-flight compose proposal is
// awaiting the human's approve/edit/reject (the conductor's marker file is on
// disk) and this session has a human in it - the conductor is parked on them
// exactly like a stage gate, so allow the turn to end instead of nudging it
// back into stage execution mid-compose. Positive-confirmation only (the
// marker), interactivity-bound, fail-open (see composeCarveoutBasis).
const composeBasis = composeCarveoutBasis();
if (composeBasis !== null) {
  recordHookDrop(
    projectDir,
    HOOK_NAME,
    `an in-flight compose proposal is pending human approval (amadeus/.amadeus-compose-pending present); allowing the stop (${describeBoundCarveout(composeBasis)})`,
  );
  allowStop();
}

// Conversational carve-out (tier 3, issue #365 broader reading): the ending turn
// answered the human's most recent prompt with NO workflow-engine engagement, so
// the human was just chatting mid-workflow, allow the stop instead of nudging
// them back into the loop. Reads the harness transcript (Claude / Codex deliver
// `transcript_path`; Kiro delivers none, so this is inert there and the low
// interactive cap below releases a chatting human after one nudge). Strictly
// gated and fail-closed (see isConversationalStop): no transcript, no human
// prompt, ANY engine call in the responding turn, an autonomous run, or any read
// error falls through to the cap-bounded block below, so a conductor that
// engaged the workflow and then quit mid-loop (and every autonomous run) is
// still nudged.
if (isConversationalStop(stateContent, transcriptPath, transcriptFormat)) {
  recordHookDrop(
    projectDir,
    HOOK_NAME,
    "the ending turn was conversational (human's last prompt answered with no workflow-engine call); allowing the stop (conversational carve-out)",
  );
  allowStop();
}

// A directive is PENDING (run-stage / dispatch-subagent / invoke-swarm /
// present-gate / ask / print / error). Decide whether to block, honouring the
// recursion bounds. When the bounds say release, LET GO — a stuck loop must
// never trap the session.
const shouldBlock = decideStopContinuation(
  projectDir,
  stateContent,
  stopHookActive,
  migrationSessionId,
);
if (!shouldBlock) {
  recordHookDrop(
    projectDir,
    HOOK_NAME,
    `durable continuation budget released the stop (cap ${stopContinuationBlockCap(stateContent)} reached; stop_hook_active=${stopHookActive})`,
  );
  allowStop();
}

// Within budget — block the stop and re-feed the pending work.
blockStop(continuationReason(kind, currentStageSlug(stateContent), projectDir, statePath));
}
