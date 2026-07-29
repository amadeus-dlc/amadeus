// amadeus-log.ts — Interaction audit helper
//
// Records DECISION_RECORDED (before AskUserQuestion) and QUESTION_ANSWERED
// (after the user answers). Orchestrator-callable; state tool doesn't own
// these because they fire per-question, not per state transition.

import { existsSync, readFileSync } from "node:fs";
import { createAuditLogExporter } from "../otel/audit-log-exporter.ts";
import { attachIntentContext, ensureContextManager, restoreIntentContext } from "../otel/context.ts";
import { createLocalLogExporter } from "../otel/local-log-exporter.ts";
import { emitEvent, registerLoggerProvider } from "../otel/logger-provider.ts";
import { assertMutationAllowed, setFatal, verifyJournalHealth } from "../otel/fatal-latch.ts";
import { initProcessObservability } from "./amadeus-observability.ts";
import {
  activeIntent,
  auditFilePath,
  docsRoot,
  emitError,
  errorMessage,
  hasOpenGate,
  humanActedSinceLastAnswer,
  humanPresenceGuardDisabled,
  isAutonomousMode,
  resolveProjectDir,
  stateFilePath,
} from "./amadeus-lib.js";

// Resolve the project dir AND assert that an active workflow exists before any
// audit emit. WHY: amadeus-log is orchestrator-called per-question and threads no
// --intent/--space, so it relies on default intent resolution. On a fresh shell
// (pre-birth) or a >1-intent workspace with no active-intent cursor, that
// resolution yields null and stateFilePath()/auditFilePath() collapse to the
// BARE space record root (amadeus/spaces/<space>/intents/). Emitting there would
// drop an audit shard DIRECTLY into the bare intents root and break the "no
// amadeus-state.md / no audit/ ever lives directly in the bare intents root"
// invariant (amadeus-lib.ts). Existence of the resolved state file is the same
// "is there an active workflow" signal every other emitter guards on — the
// hooks via `if (!existsSync(stateFilePath(...)))` no-op, emitError() via the
// same check. amadeus-log is the lone emitter that was missing it; mirror the
// clean-error idiom (orchestrator-called → a missing workflow is a misuse, not
// a routine no-op).
function resolveActiveProjectDir(explicit?: string): string {
  const pd = resolveProjectDir(explicit);
  if (!existsSync(stateFilePath(pd))) {
    error(
      'No active workflow — refusing to log an interaction event with no resolvable intent. Start a workflow first by describing what to build (/amadeus "build the auth service"), or switch to an intent (/amadeus intent <name>) if several exist.'
    );
  }
  return pd;
}

// v1 audit event type -> OTel event name for the representative U1 pair.
const OTEL_EVENT_NAMES: Record<string, string> = {
  DECISION_RECORDED: "amadeus.decision.recorded",
  QUESTION_ANSWERED: "amadeus.question.answered",
};

function emitAudit(
  eventType: string,
  fields: Record<string, string>
): void {
  // U1 representative wiring: canonical events flow through the Amadeus
  // Logger Provider (emitEvent -> AuditLogExporter), never through a direct
  // appendAuditEntry call site (BR-1). The failure contract is unchanged:
  // a write failure throws synchronously here AND sets the fatal latch.
  emitEvent(OTEL_EVENT_NAMES[eventType] ?? eventType, fields);
}

// One-time OTel bootstrap for this short-lived CLI process (FR-EXP-1):
// register the Amadeus Logger Provider against the synchronous
// AuditLogExporter, restore the persisted intent anchor (FR-TRC-4), and run
// the non-destructive journal health probe — an unhealthy journal latches
// the process so no later canonical mutation proceeds (FR-EVT-5).
function bootstrapOtel(pd: string): void {
  ensureContextManager();
  registerLoggerProvider({
    projectDir: pd,
    auditExporter: createAuditLogExporter({ projectDir: pd }),
    logExporter: createLocalLogExporter({ projectDir: pd }),
  });
  const intent = activeIntent(pd);
  const root = docsRoot(pd);
  if (intent !== null && root !== null) {
    const restored = restoreIntentContext(root, intent);
    if (restored !== null) attachIntentContext(restored);
  }
  const shard = auditFilePath(pd);
  if (existsSync(shard)) {
    const health = verifyJournalHealth({ shardPath: shard, projectDir: pd });
    if (!health.ok) {
      setFatal(`journal health probe failed: ${health.detail}`);
    }
  }
}

// --- Flag parsing ---

function parseFlags(
  args: string[]
): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      if (i + 1 >= args.length) {
        error(`${a} expects a value, got end of arguments.`);
      }
      const val = args[i + 1];
      if (val.startsWith("--")) {
        error(`${a} expects a value, got another flag: "${val}". Did you forget the value?`);
      }
      flags[a.slice(2)] = val;
      i++;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

// --- Subcommand: decision ---
// Usage: amadeus-log decision --stage <slug> --decision <text> [--options <csv>] [--rationale <text>]
//
// Fires BEFORE AskUserQuestion, recording what options will be shown.
function handleDecision(args: string[]): void {
  const { flags } = parseFlags(args);
  if (!flags.stage) error("Missing --stage <slug>");
  if (!flags.decision) error("Missing --decision <text>");

  // The active-workflow guard already ran in main (bootstrapOtel resolves
  // the project dir with the same refusal). The latch check is the
  // FR-EVT-4 mutation gate for this entrypoint.
  assertMutationAllowed();
  const fields: Record<string, string> = {
    Stage: flags.stage,
    Decision: flags.decision,
  };
  if (flags.options) fields.Options = flags.options;
  if (flags.rationale) fields.Rationale = flags.rationale;

  try {
    emitAudit("DECISION_RECORDED", fields);
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }

  console.log(
    JSON.stringify({ emitted: "DECISION_RECORDED", stage: flags.stage })
  );
}

// --- Subcommand: answer ---
// Usage: amadeus-log answer --stage <slug> --details <text>
//
// Fires AFTER the user answers a question.
function handleAnswer(args: string[]): void {
  const { flags } = parseFlags(args);
  if (!flags.stage) error("Missing --stage <slug>");
  if (!flags.details) error("Missing --details <text>");

  const pd = resolveActiveProjectDir(projectDir);
  assertMutationAllowed(); // FR-EVT-4: refuse when a prior canonical write failed
  const fields: Record<string, string> = {
    Stage: flags.stage,
    Details: flags.details,
  };

  // Human-presence gate (ledger-event design): the interview answer is
  // a human-judgement event, so require a HUMAN_TURN appended AFTER the last
  // QUESTION_ANSWERED (ledger order) before recording another. The prior
  // QUESTION_ANSWERED is the "since" boundary (its own consume-once: one human turn
  // logs one answer), so no separate marker/consume step is needed. An open
  // approval gate is refused before the autonomy carve-out (Construction
  // swarm/Bolt answers are not human) and the scoped test off-switch. Fail-open
  // when no ledger exists (presence not tracked yet).
  const content = existsSync(stateFilePath(pd))
    ? readFileSync(stateFilePath(pd), "utf-8")
    : null;
  if (hasOpenGate(content)) {
    error(
      "Refusing to record this answer: an approval gate is open. Approval and rejection responses must resolve the gate directly via amadeus-orchestrate.ts report or amadeus-state.ts reject; no QUESTION_ANSWERED event was emitted."
    );
  }
  if (isAutonomousMode(content)) {
    // autonomous Construction: no human presence required
  } else if (humanPresenceGuardDisabled()) {
    // scoped test off-switch
  } else if (!humanActedSinceLastAnswer(pd)) {
    error(
      "Refusing to record this answer: a real human has not acted at this checkpoint this turn. Type your answer in the session (which records a human turn) before logging it."
    );
  }

  try {
    emitAudit("QUESTION_ANSWERED", fields);
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }

  console.log(
    JSON.stringify({ emitted: "QUESTION_ANSWERED", stage: flags.stage })
  );
}

// --- CLI entry point ---

let projectDir: string | undefined;

function main(): void {
  const rawArgs = process.argv.slice(2);

  // Extract --project-dir
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

  // Telemetry process span (opt-in; no-op unless observability.enabled).
  // Resolution failures must not change the CLI contract — skip silently.
  try {
    initProcessObservability(`tool:amadeus-log:${subcommand ?? "?"}`, resolveActiveProjectDir(projectDir));
  } catch {
    // no resolvable workflow -> nothing to observe
  }

  try {
    bootstrapOtel(resolveActiveProjectDir(projectDir));
    switch (subcommand) {
      case "decision":
        handleDecision(filteredArgs.slice(1));
        break;
      case "answer":
        handleAnswer(filteredArgs.slice(1));
        break;
      default:
        error(`Unknown subcommand: ${subcommand}. Valid: decision, answer`);
    }
  } catch (e) {
    error(errorMessage(e));
  }
}

// --- Utility ---

function error(msg: string): never {
  const pd = resolveProjectDir(projectDir);
  const command = `amadeus-log ${process.argv.slice(2).join(" ")}`.trim();
  emitError(pd, "amadeus-log", command, msg);
}

if (import.meta.main) {
  main();
}
