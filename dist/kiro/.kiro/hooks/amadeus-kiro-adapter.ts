#!/usr/bin/env bun
// amadeus-kiro-adapter.ts — the Kiro CLI hook shim (AUTHORED shell file; the
// amadeus-*.ts hook bodies beside it are PACKAGED core, byte-shared with the
// Claude Code harness).
//
// Kiro hook payloads are near-isomorphic to Claude Code's but differ in
// three load-bearing ways (live-captured on kiro-cli 2.6.1 — see
// docs/spikes/dist-kiro/findings.md §0.2 in the framework repo):
//   1. tool_name arrives as the ALIAS: `shell` (execute_bash), `write`
//      (fs_write).
//   2. the write payload's file path field is `path`, not `file_path`.
//   3. `todo_list` input is command-shaped ({command: "create", tasks:
//      [{task_description}]}) — there is no status/activeForm transition.
//
// This shim normalizes a Kiro payload into the ClaudeCodeHookInput shape the
// core hooks parse, then pipes it into the named core hook (same directory)
// as a bun subprocess, forwarding stdout and the exit code. Two outputs need
// post-processing:
//   - session-start emits {"additionalContext": "..."} — Kiro's context
//     channel is plain stdout at exit 0, so the shim unwraps the JSON and
//     prints the text.
//   - stop emits {"decision":"block","reason":"..."} — Kiro's stop contract
//     is IDENTICAL (verified live), so it passes through verbatim.
//
// Usage (registered in .kiro/agents/amadeus.json):
//   bun .kiro/hooks/amadeus-kiro-adapter.ts <target>
// where <target> ∈ session-start | audit-and-sensors | runtime-compile |
//                  state-sync | log-subagent | stop | verb-intercept |
//                  pretool-block

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  armMigrationPendingDecision,
  classifyMigrationRequest,
  classifyTerminalCommand,
  consumeMigrationPendingDecision,
  hasOpenGate,
  humanActedSinceGate,
  humanPresenceGuardDisabled,
  isAutonomousMode,
  isMachineInjectedTurnText,
  isMigrationApplyCommand,
  isMigrationDispatchCommand,
  isMigrationExecutionCommand,
  isMigrationPublicRoute,
  peekMigrationPendingDecision,
  stateFilePath,
} from "../tools/amadeus-lib.ts";
import { appendAuditEntry } from "../tools/amadeus-audit.ts";

const HOOKS_DIR = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] ?? "";

interface KiroHookInput {
  hook_event_name?: string;
  cwd?: string;
  session_id?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
  prompt?: string;
  assistant_response?: string;
}

let kiro: KiroHookInput = {};
if (!process.stdin.isTTY) {
  try {
    const text = await Bun.stdin.text();
    if (text.length > 0) kiro = JSON.parse(text) as KiroHookInput;
  } catch {
    process.exit(0); // malformed stdin — advisory hooks fail open
  }
}

// The workspace the payload names — forwarded as the core-hook subprocess cwd so
// resolveProjectDirFromHook resolves the SAME dir the engine wrote from (#822).
// Without this the core hook inherits the adapter's launch dir (the main checkout
// under a worktree session) and mis-resolves the record — symmetric to codex.
const projectDir = kiro.cwd ?? process.cwd();

// --- verb-intercept: the deterministic terminal-command seam (userPromptSubmit) ---
//
// A `/amadeus` command that leads with a workspace navigation verb
// (space/space-create/intent) or a read-only utility flag (--status/--doctor/
// --help/--version) is TERMINAL — it maps 1:1 to an amadeus-utility.ts subcommand
// and carries no workflow work. Over an ACTIVE workflow the live conductor is
// unreliable at honouring these: under accumulated session context it runs a
// bare `next` and advances the active intent (verb dropped) or rolls into the
// active stage (read-only flag ignored) — the "roll-forward" bug. This hook
// dispatches them DETERMINISTICALLY before the conductor decides anything:
// recover the raw args, classify with the engine's own classifier
// (classifyTerminalCommand — same sets the engine routes on), run the tool, and
// hand the conductor the verbatim output with an explicit do-NOT-advance
// instruction (Kiro's context channel is plain stdout at exit 0; it has no
// block API, so the conductor relays rather than is bypassed — measured to land
// the command and leave the active intent untouched).
//
// WHY the args are recovered from the EXPANDED body: Kiro fires userPromptSubmit
// with `prompt` = the fully-expanded skill body (the raw `/amadeus …` literal is
// gone), but it SUBSTITUTES the user's post-/amadeus text ($ARGUMENTS) into the
// forwarding-loop anchor `amadeus-orchestrate.ts next <ARGS>`. We read the args
// back from that anchor — the same text the conductor would forward. Tokenize
// shell quoting rather than splitting on whitespace: a quoted migration source
// may legitimately contain a word such as `--status`, which must remain part of
// the source argv instead of being intercepted as a read-only flag.
interface QuotedSegment {
  text: string;
  end: number;
}

const DOUBLE_QUOTE_ESCAPES = new Set(['"', "\\", "$", "`", "\n"]);

function readDoubleQuoted(input: string, start: number): QuotedSegment | null {
  let text = "";
  for (let i = start + 1; i < input.length; i++) {
    const char = input[i];
    if (char === '"') return { text, end: i };
    if (char !== "\\") {
      text += char;
      continue;
    }
    const next = input[i + 1];
    if (next === undefined) return null;
    if (!DOUBLE_QUOTE_ESCAPES.has(next)) {
      text += "\\";
      continue;
    }
    text += next;
    i++;
  }
  return null;
}

function readSingleQuoted(input: string, start: number): QuotedSegment | null {
  const end = input.indexOf("'", start + 1);
  return end === -1 ? null : { text: input.slice(start + 1, end), end };
}

function readShellSegment(input: string, start: number): QuotedSegment | null {
  const char = input[start];
  if (char === "'") return readSingleQuoted(input, start);
  if (char === '"') return readDoubleQuoted(input, start);
  if (char !== "\\") return { text: char, end: start };
  const next = input[start + 1];
  return next === undefined ? null : { text: next, end: start + 1 };
}

function tokenizeShellWords(input: string): string[] | null {
  const words: string[] = [];
  let word = "";
  let started = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (/\s/.test(char)) {
      if (started) words.push(word);
      word = "";
      started = false;
      continue;
    }
    const segment = readShellSegment(input, i);
    if (segment === null) return null;
    word += segment.text;
    started = true;
    i = segment.end;
  }

  if (started) words.push(word);
  return words;
}

function extractNextArgs(expandedPrompt: string): string[] {
  // Match the FIRST `… amadeus-orchestrate.ts next <ARGS>` occurrence (the loop's
  // step-1 anchor) and take the tokens up to the closing backtick. The anchor is
  // inside a markdown code span, so the args end at the backtick.
  const m = expandedPrompt.match(/amadeus-orchestrate\.ts next ([^`\n]*)`/);
  if (!m) return [];
  return tokenizeShellWords(m[1].trim()) ?? [];
}

type MigrationGateDecision = "yes" | "no";

function classifyMigrationGateDecision(
  prompt: string,
  args: string[],
): MigrationGateDecision | null {
  const candidate = args.length === 1 ? args[0] : prompt.trim();
  if (candidate === "1" || /^yes$/i.test(candidate)) return "yes";
  if (candidate === "2" || /^no$/i.test(candidate)) return "no";
  return null;
}

if (target === "verb-intercept") {
  // The whole turn's only job here is to deterministically handle a terminal
  // command; anything else falls through to the conductor untouched (exit 0, no
  // output → Kiro proceeds to the LLM normally). Advisory: any failure fails open.
  const args = extractNextArgs(kiro.prompt ?? "");
  const cmd = classifyTerminalCommand(args);

  // A migration approval answer is still part of the prior gated terminal
  // operation, not an Intent turn. Recognize only the four exact answers while
  // a fresh marker exists for THIS session, before the project-local turn clock
  // or HUMAN_TURN mint can run. Yes retains the marker until apply PostToolUse;
  // No consumes it immediately. A dry-run failure, non-answer, missing session,
  // stale marker, or insecure marker falls through to normal hook behavior—the
  // external marker itself never causes a project write or suppresses a future
  // unrelated turn.
  const decision = classifyMigrationGateDecision(kiro.prompt ?? "", args);
  if (decision === "yes") {
    if (peekMigrationPendingDecision(projectDir, kiro.session_id)) process.exit(0);
  } else if (decision === "no") {
    if (consumeMigrationPendingDecision(projectDir, kiro.session_id)) process.exit(0);
  }

  // Migration is a gated conductor flow, not an off-band terminal command.
  // Leave the request untouched—including not creating the turn-clock
  // directory, which may be the migration destination itself. Do NOT arm the
  // decision marker here: public-option conflicts and failed/refused dry-runs
  // must never make a later unrelated Yes/No look like gate approval. The
  // runtime-compile PostToolUse seam arms only after it proves status=ready.
  // Read-only flags keep their engine-defined absolute precedence.
  if (
    isMigrationPublicRoute(args) &&
    cmd?.source !== "read-only-flag"
  ) {
    // A new public request supersedes any prior unanswered gate. This is a
    // consume-only seam: even invalid/conflicting requests leave no marker;
    // only their later successful dry-run PostToolUse may arm a fresh one.
    consumeMigrationPendingDecision(projectDir, kiro.session_id);
    process.exit(0);
  }
  // Turn-clock: bump a per-turn counter EVERY time this seam fires (it fires
  // once per turn, BEFORE the cmd===null exit so a bare-next turn still advances
  // the clock and a prior turn's latch goes stale). The read-only/nav latch
  // below stamps THIS counter value; the engine done-guard + preToolUse backstop
  // fire ONLY when the latch's turn === the current counter (same turn) — truly
  // turn-scoped, no time window, no wedge. Best-effort; failure fails open.
  let turn = 0;
  try {
    const cwd = kiro.cwd ?? process.cwd();
    mkdirSync(join(cwd, "amadeus"), { recursive: true });
    const cp = join(cwd, "amadeus", ".amadeus-turn-counter");
    turn = existsSync(cp)
      ? (Number.parseInt(readFileSync(cp, "utf-8").trim(), 10) || 0) + 1
      : 1;
    writeFileSync(cp, String(turn) + "\n", "utf-8");
  } catch { /* turn-clock best-effort */ }
  // Human presence: this seam fires on a real human turn, so record a HUMAN_TURN
  // event in the active intent's audit shard. The gate (handleApprove/handleAnswer)
  // refuses unless a HUMAN_TURN was recorded since the last gate resolution; the
  // preToolUse block below is the exit-2 floor. Own try block, SEPARATE from the
  // turn-counter bump above (that is the roll-forward latch clock - a counter I/O
  // failure must not skip the mint, or a genuine approval gets refused). Gated on
  // workflow state existing (same self-gate as the core mint hook) so a prompt in
  // a project that never ran the framework does not scaffold audit shards.
  // Classify the prompt through the SHARED lib predicate (the same catalog the
  // core mint hook uses) BEFORE minting: a machine-injected turn (agmsg
  // teammate-message / task-notification) must NOT scaffold a phantom HUMAN_TURN
  // (#755/#811). Fail-open: a prompt-absent payload still mints (the core hook's
  // contract).
  try {
    const cwd = kiro.cwd ?? process.cwd();
    const machineInjected =
      typeof kiro.prompt === "string" && isMachineInjectedTurnText(kiro.prompt);
    if (existsSync(stateFilePath(cwd)) && !machineInjected) {
      appendAuditEntry("HUMAN_TURN", {}, cwd);
    }
  } catch { /* presence best-effort - mint never blocks the turn */ }
  if (cmd === null) process.exit(0); // not a terminal command — conductor handles it

  const cwd = kiro.cwd ?? process.cwd();
  const utilArgs = [join(".kiro", "tools", "amadeus-utility.ts"), cmd.subcommand];
  if (cmd.arg !== undefined) utilArgs.push(cmd.arg);
  const run = Bun.spawnSync(["bun", ...utilArgs], { cwd, stdout: "pipe", stderr: "pipe" });
  const out = ((run.stdout?.toString() ?? "") + (run.stderr?.toString() ?? "")).trim();

  // Turn-scoped latch: a terminal command was handled OFF-BAND this turn (the
  // seam ran the tool; the conductor only relays). Stamp the latch with the
  // CURRENT turn counter so the engine done-guard + preToolUse backstop know a
  // bare advancing `next` THIS SAME turn is the spurious roll-forward and must
  // be neutralized. Read-only flags (--status/--doctor/--help/--version) and
  // workspace verbs (space/space-create/intent) both arm it, so the same guard
  // catches the read-only AND the nav roll-forward. Best-effort; fails open.
  if (cmd.source === "read-only-flag" || cmd.source === "workspace-verb") {
    try {
      const cwd = kiro.cwd ?? process.cwd();
      mkdirSync(join(cwd, "amadeus"), { recursive: true });
      const flag = cmd.source === "read-only-flag"
        ? cmd.subcommand
        : (cmd.arg ? cmd.subcommand + " " + cmd.arg : cmd.subcommand);
      writeFileSync(
        join(cwd, "amadeus", ".amadeus-readonly-latch"),
        JSON.stringify({ turn, flag, source: cmd.source, ts: Date.now() }) + "\n",
        "utf-8",
      );
    } catch { /* latch best-effort */ }
  }
  // Echo the command the way the user typed it (verb + arg, or the --flag) so the
  // short-circuit message is legible.
  const typed = cmd.source === "read-only-flag"
    ? `--${cmd.subcommand}`
    : `${cmd.subcommand}${cmd.arg ? " " + cmd.arg : ""}`;
  process.stdout.write(
    `SYSTEM (deterministic harness dispatch): The command \`/amadeus ${typed}\` has ALREADY been run by the harness — it is a read-only/navigation command that carries NO workflow work. Its verbatim output is below. Your ONLY action this turn: relay that output to the user, then STOP. Do NOT run \`amadeus-orchestrate.ts next\`. Do NOT advance, resume, or run any workflow stage.\n\n--- OUTPUT ---\n${out}\n--- END OUTPUT ---\n`,
  );
  process.exit(0);
}

// --- pretool-block: the preToolUse roll-forward backstop (matcher: execute_bash) ---
//
// Defense-in-depth behind the engine done-guard. The verb-intercept seam above
// handles a read-only/nav command off-band and stamps amadeus/.amadeus-readonly-latch
// with the current turn counter; the engine's `next` then emits `done` for a bare
// advancing next this same turn. But Kiro's userPromptSubmit can only INJECT, not
// block — so if the live conductor retries a bare `next` past the engine's `done`,
// this preToolUse hook is the hard floor: when the latch is fresh-for-this-turn and
// the attempted execute_bash command is a TRULY BARE advancing `amadeus-orchestrate.ts
// next` (no advancing flag, classifyTerminalCommand === null), exit 2 + stderr →
// Kiro BLOCKS the tool call (live-verified contract: only exit 2 blocks; exit 1 and
// a JSON {"decision":...} on stdout do NOT). It does NOT consume the latch (the
// conductor may retry within the turn; the next turn bumps the counter so the latch
// goes stale and a legitimate advancing next runs). Advisory/fail-open: any
// parse/read failure exits 0 and never blocks a real next.
if (target === "pretool-block") {
  const cmdStr = String(kiro.tool_input?.command ?? "");
  const cwd = kiro.cwd ?? process.cwd();
  const migrationDispatch = isMigrationDispatchCommand(cmdStr, cwd);
  const m = cmdStr.match(/amadeus-orchestrate\.ts\s+next\b([^\n]*)/);
  const parsedNextArgs = m ? tokenizeShellWords(m[1].trim()) : null;
  const nextArgs = parsedNextArgs ?? [];
  // A next carrying ANY advancing/config flag is a DELIBERATE move — only a truly
  // bare next is the spurious roll-forward. Mirrors the engine done-guard's
  // exemptions (the engine doesn't parse --init/--force — retired P4 — so listing
  // them here is a harmless superset).
  const ADVANCING_FLAGS = new Set([
    "--stage", "--phase", "--scope", "--resume", "--depth",
    "--test-strategy", "--single", "--init", "--force",
    "--new-scope", "--report", "--migrate",
  ]);
  // A leading `compose` verb is a deliberate composer dispatch (the engine's
  // Branch 0 exempts flags.compose the same way) - never the spurious bare
  // roll-forward this backstop exists to block.
  const isBareAdvancing =
    m !== null &&
    parsedNextArgs !== null &&
    nextArgs[0] !== "compose" &&
    !nextArgs.some((a) => ADVANCING_FLAGS.has(a)) &&
    classifyMigrationRequest(nextArgs) === null &&
    classifyTerminalCommand(nextArgs) === null;

  let counter = -1;
  let latchTurn = -2;
  try {
    const cp = join(cwd, "amadeus", ".amadeus-turn-counter");
    if (existsSync(cp)) {
      const n = Number.parseInt(readFileSync(cp, "utf-8").trim(), 10);
      if (Number.isFinite(n)) counter = n;
    }
    const lp = join(cwd, "amadeus", ".amadeus-readonly-latch");
    if (existsSync(lp)) {
      const r = JSON.parse(readFileSync(lp, "utf-8")) as { turn?: number };
      if (typeof r.turn === "number") latchTurn = r.turn;
    }
  } catch { /* fail open */ }

  if (isBareAdvancing && counter >= 0 && latchTurn === counter) {
    process.stderr.write(
      "read-only/navigation command already handled this turn by the deterministic harness — do not advance the workflow. The output was already relayed; end the turn.\n",
    );
    process.exit(2); // Kiro reject contract: exit 2 + stderr BLOCKS the tool call.
  }

  // Migration dispatch is a pure read that reaches the shared engine's gated
  // terminal branch before any state inspection. Let exactly that one complete
  // bun invocation pass without minting HUMAN_TURN or touching the active
  // Intent; utility/apply commands are not covered by this carve-out.
  if (migrationDispatch) process.exit(0);

  // --- human-presence floor (second exit-2 branch) ---
  //
  // Refuse a tool call ONLY while an approval gate is actually OPEN (a stage sits
  // at [?] in the state file) and no HUMAN_TURN has been recorded since the last
  // gate resolution: the hard floor that stops a model under autopilot from
  // fabricating an approval (the verb-intercept seam above records a HUMAN_TURN
  // on a real human turn). The gate-open predicate is load-bearing: after a
  // legitimate approval the resolution follows the turn's HUMAN_TURN, and without
  // it the floor would block the mandated same-turn continuation into the next
  // stage. Distinct from the roll-forward latch above. Carve-outs mirror the core
  // gate: autonomous Construction (swarm/Bolt) first, then the deterministic
  // off-switch, then no-open-gate. Fail-open on any read/parse error: advisory,
  // must never wedge a legitimate turn.
  try {
    const content = existsSync(stateFilePath(cwd))
      ? readFileSync(stateFilePath(cwd), "utf-8")
      : null;
    if (isAutonomousMode(content)) process.exit(0); // autonomous: never block
    if (humanPresenceGuardDisabled()) process.exit(0); // deterministic off-switch
    if (!hasOpenGate(content)) process.exit(0); // no gate awaits approval

    if (!humanActedSinceGate(cwd)) {
      process.stderr.write(
        "an approval gate is open and no human has acted since it opened: refusing the tool call. A real human must respond at the gate. End the turn.\n",
      );
      process.exit(2); // Kiro reject contract: exit 2 + stderr BLOCKS the tool call.
    }
  } catch { /* fail open: advisory presence floor */ }

  process.exit(0);
}

// Normalize Kiro's alias tool names to the canonical names the core hooks
// match on. Both alias and canonical forms are accepted defensively.
function canonicalTool(name: string): string {
  if (name === "write" || name === "fs_write") return "Write";
  if (name === "shell" || name === "execute_bash") return "Bash";
  return name;
}

function kiroTextOutput(toolResponse: unknown): string | null {
  if (toolResponse === null || typeof toolResponse !== "object") return null;
  const items = (toolResponse as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) return null;
  const chunks: string[] = [];
  for (const item of items) {
    if (item === null || typeof item !== "object") return null;
    const text = (item as { Text?: unknown }).Text;
    if (typeof text !== "string") return null;
    chunks.push(text);
  }
  const output = chunks.join("\n").trim();
  return output.length > 0 ? output : null;
}

function jsonMigrationDryRunIsReady(output: string): boolean {
  try {
    const parsed = JSON.parse(output) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return false;
    }
    const report = parsed as Record<string, unknown>;
    return (
      report.schemaVersion === 1 &&
      report.mode === "dry-run" &&
      report.status === "ready"
    );
  } catch {
    return false;
  }
}

function humanMigrationDryRunIsReady(output: string): boolean {
  const lines = output.split(/\r?\n/);
  const modeLines = lines.filter((line) => line.startsWith("Mode:"));
  const statusLines = lines.filter((line) => line.startsWith("Status:"));
  return (
    lines[0] === "AI-DLC v2 -> Amadeus workspace migration" &&
    lines.at(-1) ===
      "No files were changed. Re-run with --apply only after explicit approval." &&
    modeLines.length === 1 &&
    modeLines[0] === "Mode: dry-run" &&
    statusLines.length === 1 &&
    statusLines[0] === "Status: ready" &&
    lines.includes("Checks:") &&
    lines.includes("Operations:")
  );
}

function migrationDryRunResponseIsReady(toolResponse: unknown): boolean {
  const output = kiroTextOutput(toolResponse);
  return output !== null &&
    (jsonMigrationDryRunIsReady(output) || humanMigrationDryRunIsReady(output));
}

function updateMigrationPendingDecision(
  command: string,
  toolResponse: unknown,
): void {
  if (isMigrationApplyCommand(command, projectDir)) {
    consumeMigrationPendingDecision(projectDir, kiro.session_id);
    return;
  }
  if (!isMigrationExecutionCommand(command, projectDir)) return;

  // Every completed dry-run supersedes any prior gate marker. Re-arm only when
  // the live Kiro response is an unambiguous canonical ready report; refused,
  // failed, non-zero/missing output and lookalike text all leave no permission.
  consumeMigrationPendingDecision(projectDir, kiro.session_id);
  if (migrationDryRunResponseIsReady(toolResponse)) {
    armMigrationPendingDecision(projectDir, kiro.session_id);
  }
}

type Forward = { hook: string; input: Record<string, unknown> } | null;

function buildForward(): Forward {
  const tool = canonicalTool(kiro.tool_name ?? "");
  const ti = kiro.tool_input ?? {};

  switch (target) {
    case "session-start":
      // session_id is forwarded when present so the core hook writes its
      // per-session→intent STAMP (the session→intent record). BUT agentSpawn
      // carries no source discrimination — every spawn reports as "startup"
      // from the core hook's perspective (Kiro has no resume signal in this
      // payload), so SESSION_RESUMED can never fire and the P8 resume-rebind
      // OFFER is structurally unreachable on Kiro — a documented harness
      // limitation, not a bug. We never fake a resume source. The state-file
      // self-gate keeps the whole thing a no-op outside active workflows.
      return {
        hook: "amadeus-session-start.ts",
        input: {
          hook_event_name: "SessionStart",
          source: "startup",
          ...(kiro.session_id ? { session_id: kiro.session_id } : {}),
        },
      };

    case "audit-and-sensors": {
      // postToolUse(write) → audit-logger THEN sensor-fire (both ship core).
      if (tool !== "Write") return null;
      const filePath = (ti.path as string) ?? (ti.file_path as string) ?? "";
      if (!filePath) return null;
      return {
        hook: "__audit_and_sensors__", // handled specially below (two hooks)
        input: {
          hook_event_name: "PostToolUse",
          tool_name: "Write",
          tool_input: { file_path: filePath },
        },
      };
    }

    case "runtime-compile": {
      if (tool !== "Bash") return null;
      const command = (ti.command as string) ?? "";
      updateMigrationPendingDecision(command, kiro.tool_response);
      return {
        hook: "amadeus-runtime-compile.ts",
        input: {
          hook_event_name: "PostToolUse",
          ...(kiro.session_id ? { session_id: kiro.session_id } : {}),
          tool_name: "Bash",
          tool_input: { command },
          ...(kiro.tool_response !== undefined
            ? { tool_response: kiro.tool_response }
            : {}),
        },
      };
    }

    case "state-sync": {
      // Kiro's todo_list is command-shaped. A `create` whose first task
      // description carries the stage-protocol "[slug]" suffix maps to the
      // Claude TaskUpdate in_progress transition the core hook keys on.
      if ((kiro.tool_name ?? "") !== "todo_list") return null;
      if ((ti.command as string) !== "create") return null;
      const tasks = (ti.tasks as Array<{ task_description?: string }>) ?? [];
      const desc = tasks[0]?.task_description ?? "";
      if (!desc) return null;
      return {
        hook: "amadeus-sync-statusline.ts",
        input: {
          hook_event_name: "PostToolUse",
          tool_name: "TaskUpdate",
          tool_input: { status: "in_progress", activeForm: desc },
        },
      };
    }

    case "log-subagent": {
      if ((kiro.tool_name ?? "") !== "subagent") return null;
      const stages = (ti.stages as Array<{ role?: string }>) ?? [];
      const roles = [...new Set(stages.map((s) => s.role ?? "unknown"))].join(",");
      return {
        hook: "amadeus-log-subagent.ts",
        input: {
          hook_event_name: "SubagentStop",
          agent_type: roles || "unknown",
          agent_id: kiro.session_id ?? "",
        },
      };
    }

    case "stop":
      // Kiro provides neither stop_hook_active NOR a transcript_path, so the
      // core hook's run-mode-aware no-progress ceiling is the loop guard here
      // (it defaults stop_hook_active to false). With no transcript the core
      // hook's conversational carve-out is inert on Kiro, so a chatting or
      // pausing human is released by the INTERACTIVE cap (default 2; 8 under
      // autonomous Construction) instead, after one nudge rather than eight. The
      // {"decision":"block"} stdout contract is identical.
      return {
        hook: "amadeus-stop.ts",
        input: {
          hook_event_name: "Stop",
          ...(kiro.session_id ? { session_id: kiro.session_id } : {}),
          stop_hook_active: false,
        },
      };

    default:
      return null;
  }
}

function runCore(hookFile: string, input: Record<string, unknown>): { stdout: string; code: number } {
  const r = Bun.spawnSync(["bun", join(HOOKS_DIR, hookFile)], {
    stdin: Buffer.from(JSON.stringify(input), "utf-8"),
    stdout: "pipe",
    stderr: "ignore",
    cwd: projectDir,
  });
  return { stdout: r.stdout?.toString() ?? "", code: r.exitCode ?? 0 };
}

const fwd = buildForward();
if (fwd === null) {
  process.exit(0);
  throw new Error("unreachable"); // narrows fwd for TS below
}

if (fwd.hook === "__audit_and_sensors__") {
  // Two core hooks ride the same write event, in audit-then-sensors order
  // (mirrors the Claude settings.json registration). Both advisory: exit 0.
  runCore("amadeus-audit-logger.ts", fwd.input);
  runCore("amadeus-sensor-fire.ts", fwd.input);
  process.exit(0);
}

const result = runCore(fwd.hook, fwd.input);

if (target === "session-start") {
  // Unwrap {"additionalContext": ...} → plain text on stdout (Kiro's context
  // channel). Anything unparseable passes through untouched.
  try {
    const parsed = JSON.parse(result.stdout) as { additionalContext?: string };
    if (parsed.additionalContext) {
      process.stdout.write(parsed.additionalContext);
    }
  } catch {
    if (result.stdout) process.stdout.write(result.stdout);
  }
  process.exit(0);
}

// stop (and any future passthrough target): forward stdout + exit code
// verbatim — the {"decision":"block","reason"} contract is shared.
if (result.stdout) process.stdout.write(result.stdout);
process.exit(result.code);
