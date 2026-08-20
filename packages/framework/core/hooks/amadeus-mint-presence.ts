// UserPromptSubmit + PostToolUse AskUserQuestion hook: record a HUMAN_TURN
// event (human-presence gate).
//
// On every real human prompt, append a HUMAN_TURN event to the active intent's
// audit shard (the state machine's own append-only ledger). The approval /
// interview gate (handleApprove / handleAnswer) refuses unless a HUMAN_TURN was
// recorded since the last gate resolution, so a model under autopilot cannot
// fabricate an approval with no human having acted this turn.
//
// Claude Code fires this hook on UserPromptSubmit (typed prompt at a turn
// boundary) and on PostToolUse for AskUserQuestion. It does not fire
// UserPromptSubmit for a queued mid-turn delivery (`queued_command` attachments
// injected while the agent is working; anthropics/claude-code#31114). That
// input is real human text but is not presence — provenance gates refuse with
// PROVENANCE_REQUIRED and name the turn-boundary retry rather than scraping
// the transcript (#3170).
//
// Classify the prompt before minting. Claude Code fires UserPromptSubmit not
// only for physical human input but also for machine-injected, turn-starting
// user-role messages (agmsg Monitor task-notifications, teammate-message inbox
// deliveries). Those must NOT count as human presence, or the gate
// (humanActedSinceGate) goes false-positive — a model under autopilot would ride
// a machine ping's phantom HUMAN_TURN to approve its own gate (issue #708,
// reopened by #755). The one signal that separates the two is the prompt text:
// a machine-injected turn carries a fixed injection marker in its opening bytes
// (a `<teammate-message` tag, a `<task-notification>`, or a preamble line); a
// human never opens a prompt that way (and the threat model is a MODEL
// fabricating presence, not a human disowning their own input). The recognised
// marker set lives in the shared MACHINE_INJECTED_TURN_MARKERS catalog so it
// cannot drift from the Stop hook's classifier. The stdin payload carries no
// source flag, so the prompt text is the classifier.
//
// PRIVACY: the prompt is read into memory and matched against a fixed marker
// only. Its body is never written to the audit shard or logged — the mint keeps
// its empty-details payload.
//
// FAIL-OPEN: if stdin can't be read, isn't JSON, or has no prompt, we MINT — a
// read failure must never rob a real human of their presence. Only a payload we
// can positively classify as machine-injected suppresses the mint.
//
// appendAuditEntry resolves the active intent from the on-disk cursor using only
// the project dir (no payload needed). No workflow state on disk means nothing
// to gate, so the hook exits without writing (same self-gate as
// amadeus-session-start.ts) - otherwise every prompt in a project that carries the
// harness shell but never ran the framework would scaffold and grow audit
// shards. The gate fails open on an empty ledger, so skipping the mint there is
// safe. The mint is fail-open (try/catch, exit 0): a mint failure must never
// block the human's turn.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  auditFilePath,
  auditShardName,
  findAllEvents,
  isClaudeCodeHookInput,
  isMachineInjectedTurnText,
  readHookStdin,
  resolveProjectDirFromHook,
  stateFilePath,
} from "../tools/amadeus-lib.ts";
import {
  choiceFromExactPrompt,
  recordAdvisoryChoice,
} from "../tools/amadeus-advisory-choice.ts";
import { detectHarnessTypeForAuthorization } from "../tools/amadeus-harness.ts";
import { initProcessObservability } from "../tools/amadeus-observability.ts";
import {
  hostSessionCapability,
  mintHumanPresence,
} from "../tools/amadeus-presence-reservation.ts";

// Read + classify the UserPromptSubmit stdin. Returns true only when we can
// POSITIVELY identify a machine-injected turn (fail-open everywhere else). The
// recognised markers live in the shared MACHINE_INJECTED_TURN_MARKERS catalog
// (leading-256-byte detection) so this classifier and the Stop hook's tier-3
// carve-out can never diverge (#755).
type PromptContext = {
  readonly machineInjected: boolean;
  readonly sessionId: string | null;
  readonly cwd: string | null;
  readonly prompt: string | null;
  readonly route: {
    readonly eventName: string;
    readonly toolName: string | null;
    readonly purposeText: string;
  } | null;
};

async function readPromptContext(): Promise<PromptContext> {
  // A TTY yields empty text here (readHookStdin never blocks on a terminal) —
  // treat as unclassifiable (fail-open -> mint).
  const stdin = await readHookStdin();
  // Codex Desktop may carry an exact menu answer as raw stdin rather than a
  // JSON object. Retain only a canonical advisory choice; arbitrary malformed
  // or prompt-absent payloads remain presence-only fail-open inputs.
  const rawChoicePrompt = choiceFromExactPrompt(stdin.text) === null
    ? null
    : stdin.text;
  const blank: PromptContext = {
    machineInjected: false,
    sessionId: null,
    cwd: stdin.cwd,
    prompt: rawChoicePrompt,
    route: null,
  };
  try {
    if (stdin.text.length === 0) return blank;
    const raw: unknown = JSON.parse(stdin.text);
    if (!isClaudeCodeHookInput(raw)) return blank;
    const prompt = raw.prompt;
    const sessionId =
      typeof raw.session_id === "string" &&
        raw.session_id.length > 0 &&
        raw.session_id === raw.session_id.trim()
        ? raw.session_id
        : null;
    const eventName =
      typeof raw.hook_event_name === "string" ? raw.hook_event_name : "";
    const toolName = typeof raw.tool_name === "string" ? raw.tool_name : null;
    const purposeText = typeof prompt === "string"
      ? prompt
      : JSON.stringify(raw.tool_input ?? {});
    const route = { eventName, toolName, purposeText };
    if (typeof prompt !== "string") {
      return { machineInjected: false, sessionId, cwd: stdin.cwd, prompt: null, route };
    }
    return {
      machineInjected: isMachineInjectedTurnText(prompt),
      sessionId,
      cwd: stdin.cwd,
      prompt,
      route,
    };
  } catch {
    return blank;
  }
}

try {
  const context = await readPromptContext();
  const projectDir = resolveProjectDirFromHook(import.meta.url, context.cwd);
  if (existsSync(stateFilePath(projectDir)) && !context.machineInjected) {
    // Telemetry process span (opt-in; no-op unless observability.enabled)
    initProcessObservability("hook:mint-presence", projectDir);
    mintHumanPresence({
      projectDir,
      capability: hostSessionCapability(context.sessionId),
      // Kimi alone requires the reservation to be bound to a carrier-bearing
      // host event, so this flag is a strictness dial on a security boundary,
      // not a label: it is read from real process evidence, never from
      // AMADEUS_HARNESS_TYPE, which a caller could otherwise export to relax
      // its own presence mint (#2326).
      requireReservationRoute:
        detectHarnessTypeForAuthorization(projectDir) === "kimi",
      ...(context.route === null ? {} : { route: context.route }),
    });
    const promptChoice = context.prompt === null ? null : choiceFromExactPrompt(context.prompt);
    if (promptChoice !== null) {
      const turns = findAllEvents(readFileSync(auditFilePath(projectDir), "utf-8"), "HUMAN_TURN");
      const latest = turns[turns.length - 1];
      if (latest !== undefined) {
        recordAdvisoryChoice(projectDir, promptChoice, {
          kind: "human-turn",
          timestamp: latest.timestamp,
          shard: auditShardName(projectDir),
          eventIdentity: createHash("sha256").update(latest.block).digest("hex"),
        });
      }
    }
  }
} catch {
  // Non-fatal — a mint failure must never block the human's turn.
}

process.exit(0);
