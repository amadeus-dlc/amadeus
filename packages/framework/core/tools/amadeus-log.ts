// amadeus-log.ts — Interaction audit helper
//
// Records DECISION_RECORDED (before AskUserQuestion) and QUESTION_ANSWERED
// (after the user answers). Orchestrator-callable; state tool doesn't own
// these because they fire per-question, not per state transition.

import { existsSync, readFileSync } from "node:fs";
import { ensureOtelBootstrap } from "../otel/bootstrap.ts";
import { emitEvent } from "../otel/logger-provider.ts";
import type { RegisteredEventName } from "../otel/event-registry.ts";
import { assertMutationAllowed } from "../otel/fatal-latch.ts";
import { initProcessObservability } from "./amadeus-observability.ts";
import { advisoryChoicePresentationFields } from "./amadeus-advisory-choice.ts";
import {
  auditBlockField,
  emitError,
  errorMessage,
  hasOpenGate,
  humanActedSinceLastAnswer,
  humanPresenceGuardDisabled,
  resolveProjectDir,
  splitAuditRecords,
  stateFilePath,
} from "./amadeus-lib.js";
import { declaredIntentAutonomyMode, type AutonomyMode } from "./amadeus-intent-autonomy.ts";
import { decodeIntentAutonomyTransaction } from "./amadeus-intent-autonomy-replay.ts";

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
const OTEL_EVENT_NAMES: Record<string, RegisteredEventName> = {
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
  // An unmapped eventType is rejected at runtime by getEventDef (BR-2).
  emitEvent((OTEL_EVENT_NAMES[eventType] ?? eventType) as RegisteredEventName, fields);
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

  // The active-workflow guard already ran in main (the bootstrap resolves
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

// --- Subcommand: advisory-decision ---
// Usage: amadeus-log advisory-decision --stage <slug> --instances <csv>
//
// Records the exact pending advisory question immediately before it is shown.
// The prompt hook accepts an ordinal answer only when this is the last
// interaction decision since the previous HUMAN_TURN.
function handleAdvisoryDecision(args: string[]): void {
  const { flags } = parseFlags(args);
  if (!flags.stage) error("Missing --stage <slug>");
  if (!flags.instances) error("Missing --instances <csv>");
  const instances = flags.instances.split(",").map((item) => item.trim()).filter(Boolean);
  const pd = resolveActiveProjectDir(projectDir);
  const fields = advisoryChoicePresentationFields(pd, flags.stage, instances);
  if (!fields.ok) error(`Invalid advisory presentation: ${fields.reason}`);
  assertMutationAllowed();
  try {
    emitAudit("DECISION_RECORDED", fields.value);
  } catch (e) {
    error(`Audit emission failed: ${errorMessage(e)}`);
  }
  console.log(JSON.stringify({ emitted: "DECISION_RECORDED", stage: flags.stage, advisory_instances: instances }));
}

// --- Question resolution route (u3-question-route-observability, FR-3) ---
//
// The route is DERIVED, never an input: a caller that passes --decision-id
// answered through the decide-question ladder (route "ladder"); every other
// caller is a direct human answer (route "human"). Existing call sites stay
// unchanged and record "human" (zero migration).

export type QuestionResolutionRoute =
  | { readonly route: "human" }
  | { readonly route: "ladder"; readonly decisionId: string };

// Shape of a decide-question decision id: the "auto-decision-" namespace
// prefix minted by autonomyStableId (amadeus-intent-autonomy.ts), followed by
// a non-empty run of safe-id characters. Omitting the flag is always valid;
// this is the ONLY new check the route feature introduces (FR-3c: observe,
// never refuse an answer for any other reason).
const AUTO_DECISION_ID_RE = /^auto-decision-[A-Za-z0-9._:-]+$/;

export function resolveQuestionRoute(
  decisionId: string | undefined
): QuestionResolutionRoute {
  if (decisionId === undefined) return { route: "human" };
  if (!AUTO_DECISION_ID_RE.test(decisionId)) {
    throw new Error(
      `Invalid --decision-id "${decisionId}": expected a decide-question decision id of the form "auto-decision-<id>".`
    );
  }
  return { route: "ladder", decisionId };
}

// One QUESTION_ANSWERED row as the after-the-fact sweep sees it. `route`
// "unknown" marks a pre-u3 row (no Resolution Route attribute) — read, never
// rejected (BR-U3-4). `autonomyMode` is the Intent autonomy mode in force at
// the row's position, derived from the INTENT_AUTONOMY_TRANSACTION_COMMITTED
// rows preceding it in the same audit buffer (BR-U3-5).
export interface QuestionRouteRow {
  readonly stage: string | null;
  readonly route: "ladder" | "human" | "unknown";
  readonly decisionId: string | null;
  readonly autonomyMode: AutonomyMode;
}

export function questionAnswerRouteRows(audit: string): QuestionRouteRow[] {
  const rows: QuestionRouteRow[] = [];
  let mode: AutonomyMode = "none";
  for (const block of splitAuditRecords(audit)) {
    const event = auditBlockField(block, "Event");
    if (event === "INTENT_AUTONOMY_TRANSACTION_COMMITTED") {
      const encoded = auditBlockField(block, "Transaction");
      if (encoded !== null) {
        try {
          mode = decodeIntentAutonomyTransaction(encoded).projection.mode;
        } catch {
          // Observation-only sweep (FR-3c): an undecodable transaction row
          // keeps the last known mode instead of failing the whole read.
        }
      }
      continue;
    }
    if (event !== "QUESTION_ANSWERED") continue;
    const routeField = auditBlockField(block, "Resolution Route");
    rows.push({
      stage: auditBlockField(block, "Stage"),
      route: routeField === "ladder" || routeField === "human" ? routeField : "unknown",
      decisionId: auditBlockField(block, "Decision Id"),
      autonomyMode: mode,
    });
  }
  return rows;
}

// FR-3b bypass predicate: a QUESTION_ANSWERED row answered directly by a
// human while the Intent autonomy mode in force was semi or full — i.e. an
// answer that skipped the decide-question ladder. Rows with route "unknown"
// (pre-u3) are NOT counted: their route is genuinely unobserved.
export function findBypassedQuestionAnswers(audit: string): QuestionRouteRow[] {
  return questionAnswerRouteRows(audit).filter(
    (row) => row.route === "human" && (row.autonomyMode === "semi" || row.autonomyMode === "full")
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
  // FR-3a: record the derived resolution route so ladder and direct-human
  // answers stay machine-discriminable in the shard. The route is never an
  // input — it is derived from the presence of --decision-id. The shape check
  // inside resolveQuestionRoute is the ONLY new refusal (FR-3c: observe,
  // never reject an answer for any other reason); omitting the flag is
  // always valid, so every existing caller keeps working unchanged.
  // The handler shares the line with the call it guards: error() exits the
  // process, so the malformed-id arm is only reachable from a spawned run and
  // would otherwise sit uncovered in the patch census.
  let resolvedRoute: QuestionResolutionRoute;
  try { resolvedRoute = resolveQuestionRoute(flags["decision-id"]); } catch (e) { error(errorMessage(e)); }
  fields["Resolution Route"] = resolvedRoute.route;
  if (resolvedRoute.route === "ladder") fields["Decision Id"] = resolvedRoute.decisionId;

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
  if (declaredIntentAutonomyMode(content) === "full") {
    // full autonomy: nobody is watching this run, so there is no human turn to
    // wait for. Bound to the DECLARED Intent mode, not to the Construction
    // projection: semi projects to autonomous too (RFC-0001 FR-6) but keeps its
    // human milestones, and reading the projection here would switch the
    // presence guard off for every semi answer.
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

// Exported for in-process test driving (the amadeus-bolt `export main` idiom):
// spawn-only entry points leave their wiring lines unmeasured by lcov, so the
// success paths are exercised through this seam while error paths (which
// process.exit) stay on the spawn boundary.
export function main(rawArgs: string[] = process.argv.slice(2)): void {
  projectDir = undefined;

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
    ensureOtelBootstrap(resolveActiveProjectDir(projectDir));
    switch (subcommand) {
      case "decision":
        handleDecision(filteredArgs.slice(1));
        break;
      case "answer":
        handleAnswer(filteredArgs.slice(1));
        break;
      case "advisory-decision":
        handleAdvisoryDecision(filteredArgs.slice(1));
        break;
      default:
        error(`Unknown subcommand: ${subcommand}. Valid: decision, advisory-decision, answer`);
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
