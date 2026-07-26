// amadeus-kimi-lib.ts — the Kimi Code CLI hook shim LOGIC (AUTHORED; the
// amadeus-*.ts hook bodies beside it in .kimi-code/hooks/ are PACKAGED core,
// byte-shared with the Claude Code harness). All parse/map/translate/spawn
// logic lives here, fully in-process testable; the thin runnable entrypoint is
// amadeus-kimi-adapter.ts (which imports runCli from this file). Modeled on
// the cursor/codex adapters: normalize the Kimi payload to the
// ClaudeCodeHookInput shape each named core hook consumes, subprocess-pipe
// into it, and relay stdout/exit per the Kimi contract.
//
// ── live-capture measurement (Kimi Code CLI 0.28.1, captured 2026-07-26) ────
// Fixtures: tests/fixtures/kimi-hooks/<event>.json (real captures only).
// Base envelope for every event: {hook_event_name, session_id, cwd} —
// snake_case, near-isomorphic to Claude Code. The load-bearing differences:
//   1. UserPromptSubmit.prompt is a CONTENT-BLOCK ARRAY
//      ([{type:"text",text:"..."}]), not a plain string. The core mint hook's
//      machine-injection classifier keys on the prompt TEXT, so the shim
//      joins block texts into a string (BR-4: classification stays core-side;
//      a non-string prompt would silently skip classification).
//   2. Write/Edit tool_input carries `path`, NOT Claude's `file_path`
//      (Write: {path, content}; Edit: {path, old_string, new_string}). The
//      core audit-logger/sensor-fire read tool_input.file_path — renamed here.
//   3. The plan tool is TodoList ({todos:[{status,title}]}), not TaskUpdate —
//      the first in_progress todo maps to the {status, activeForm} shape the
//      statusline-sync hook keys on (same idiom as codex's update_plan).
//   4. Subagent identity is `agent_name` (SubagentStart/SubagentStop); there
//      is no agent_id field. Maps to the core log-subagent hook's agent_type,
//      agent_id defaults to "".
//   5. PostToolUse carries tool_call_id + tool_output (string) — neither is
//      read by any core hook; dropped (unknown fields are not forwarded).
//
// Output contracts — all three verified LIVE on 0.28.1 (BR-3/BR-5):
//   - Stop block: exit 2 + stderr. The stderr text is delivered to the model
//     as a continue message (observed: the model quoted the reason verbatim
//     and continued the turn). The core stop hook emits Claude-schema
//     {"decision":"block","reason"} on stdout with exit 0 — the shim parses
//     that and relays the reason VERBATIM on stderr with exit 2. Stop did NOT
//     re-fire after the block (single fire per turn observed). Core stdout is
//     never forwarded on Stop: with exit 0 Kimi may append hook stdout to
//     context, so a stray Claude-schema JSON must not leak.
//   - SessionStart context injection: NONE. Three candidate formats were
//     probed and none reached the model's context (plain-text stdout,
//     {"hookSpecificOutput":{...,"additionalContext"}}, and bare
//     {"additionalContext"}) — SessionStart is observation-only on 0.28.1.
//     translateSessionStartOutput therefore always returns "".
//   - fail-open: exit 0 = allow (stdout MAY be appended to context on
//     blockable events); exit 2 = block; other non-zero / error / timeout =
//     allow. This shim exits 0 on every path except the Stop block relay.
//     (Observed for completeness, not wired: UserPromptSubmit stdout plain
//     text IS appended to context — the only injection channel that works
//     on 0.28.1.)

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HOOKS_DIR = dirname(fileURLToPath(import.meta.url));

// The Kimi stdin envelope (only the fields this shim reads; captures above).
// parse-don't-validate: parseKimiEnvelope returns this shape or null — no
// partial state.
export interface KimiEnvelope {
  hook_event_name?: string;
  session_id?: string;
  cwd?: string;
  // SessionStart
  source?: string;
  // SessionEnd
  reason?: string;
  // UserPromptSubmit (content-block array on Kimi, string tolerated)
  prompt?: unknown;
  // PostToolUse
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  // SubagentStart/SubagentStop
  agent_name?: string;
  // Stop
  stop_hook_active?: boolean;
}

// A single core-hook invocation the shim will pipe (domain-entities.md
// §CoreHookCall): which hook file, what Claude-shaped stdin, and how the
// core's stdout is relayed to Kimi.
export interface CoreHookCall {
  hookPath: string;
  stdin: string;
  translate: "none" | "session-start" | "stop";
}

export interface AdapterResult {
  stdout: string;
  exitCode: number;
  stderr: string;
}

// parse-don't-validate: JSON text → envelope object, or null for anything that
// is not a JSON object (empty, non-JSON, array, primitive).
export function parseKimiEnvelope(raw: string): KimiEnvelope | null {
  if (raw.length === 0) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  return v as KimiEnvelope;
}

// Kimi's UserPromptSubmit prompt is a content-block array; Claude's is a
// string. Join text blocks (a plain string passes through, anything else
// degrades to "") so the core mint hook's machine-injection classifier sees
// the same text shape it gets on Claude (BR-4).
function promptText(prompt: unknown): string {
  if (typeof prompt === "string") return prompt;
  if (Array.isArray(prompt)) {
    return prompt
      .map((b) => (typeof b === "object" && b !== null ? (b as { text?: unknown }).text : undefined))
      .filter((t): t is string => typeof t === "string")
      .join("\n");
  }
  return "";
}

// Pure mapping: (target, envelope) → Claude-shaped stdin for that target's
// core hook, or null when there is nothing to pipe (unknown target, or a
// TodoList with no in_progress item). Field defaults follow the cursor-lib
// idiom (tolerant; absent → "" / "startup" / "unknown"). Unknown Kimi fields
// (tool_call_id, tool_output, token_count, trigger, response, …) are dropped.
export function normalizePayload(target: string, env: KimiEnvelope): string | null {
  switch (target) {
    case "session-start": {
      const payload: Record<string, unknown> = {
        hook_event_name: "SessionStart",
        source: env.source ?? "startup",
      };
      if (env.session_id) payload.session_id = env.session_id;
      return JSON.stringify(payload);
    }
    case "session-end":
      return JSON.stringify({ hook_event_name: "SessionEnd", reason: env.reason ?? "unknown" });
    case "mint":
      // Both wirings land here: UserPromptSubmit (real prompt text) and
      // PostToolUse(AskUserQuestion) (no prompt field → "" → the core hook
      // mints fail-open, its exact contract for a prompt-absent payload).
      return JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt: promptText(env.prompt) });
    case "audit-and-sensors": {
      // Write|Edit matcher (snippet). Kimi tool_input.path → Claude file_path.
      const payload: Record<string, unknown> = {
        hook_event_name: "PostToolUse",
        tool_name: env.tool_name ?? "",
        tool_input: { file_path: (env.tool_input?.path as string) ?? "" },
      };
      return JSON.stringify(payload);
    }
    case "state-sync": {
      // TodoList → the first in_progress todo maps to the TaskUpdate
      // in_progress transition (core hook extracts the "[slug]" suffix).
      const todos = (env.tool_input?.todos as Array<{ status?: string; title?: string }>) ?? [];
      const active = todos.find((t) => t.status === "in_progress");
      if (!active?.title) return null;
      return JSON.stringify({
        hook_event_name: "PostToolUse",
        tool_name: "TaskUpdate",
        tool_input: { status: "in_progress", activeForm: active.title },
      });
    }
    case "runtime-compile": {
      const payload: Record<string, unknown> = {
        hook_event_name: "PostToolUse",
        tool_name: "Bash",
        tool_input: { command: (env.tool_input?.command as string) ?? "" },
      };
      if (env.session_id) payload.session_id = env.session_id;
      return JSON.stringify(payload);
    }
    case "validate-state":
      // PreCompact: the core hook reads no stdin fields (state validation +
      // SESSION_COMPACTED + recovery breadcrumb are all self-contained).
      return "{}";
    case "log-subagent":
      // Kimi names the subagent `agent_name` and ships no agent_id (capture).
      return JSON.stringify({
        hook_event_name: "SubagentStop",
        agent_type: env.agent_name ?? "",
        agent_id: "",
      });
    case "stop": {
      const payload: Record<string, unknown> = {
        hook_event_name: "Stop",
        stop_hook_active: env.stop_hook_active ?? false,
      };
      if (env.session_id) payload.session_id = env.session_id;
      return JSON.stringify(payload);
    }
    default:
      return null;
  }
}

// routeTarget — the 9-target dispatch table (domain-entities.md
// §AdapterTarget). Unknown target / unmappable payload → empty call list
// (fail-open: nothing to pipe, exit 0).
export function routeTarget(target: string, env: KimiEnvelope): CoreHookCall[] {
  const stdin = normalizePayload(target, env);
  if (stdin === null) return [];
  switch (target) {
    case "session-start":
      return [{ hookPath: "amadeus-session-start.ts", stdin, translate: "session-start" }];
    case "session-end":
      return [{ hookPath: "amadeus-session-end.ts", stdin, translate: "none" }];
    case "mint":
      return [{ hookPath: "amadeus-mint-presence.ts", stdin, translate: "none" }];
    case "audit-and-sensors":
      // Mirrors the Claude Write|Edit registration order (audit THEN sensors).
      return [
        { hookPath: "amadeus-audit-logger.ts", stdin, translate: "none" },
        { hookPath: "amadeus-sensor-fire.ts", stdin, translate: "none" },
      ];
    case "state-sync":
      return [{ hookPath: "amadeus-sync-statusline.ts", stdin, translate: "none" }];
    case "runtime-compile":
      return [{ hookPath: "amadeus-runtime-compile.ts", stdin, translate: "none" }];
    case "validate-state":
      return [{ hookPath: "amadeus-validate-state.ts", stdin, translate: "none" }];
    case "log-subagent":
      return [{ hookPath: "amadeus-log-subagent.ts", stdin, translate: "none" }];
    case "stop":
      return [{ hookPath: "amadeus-stop.ts", stdin, translate: "stop" }];
    default:
      return [];
  }
}

// translateStopOutput — the ONE verbatim relay (BR-3). The core stop hook's
// block decision arrives as Claude-schema {"decision":"block","reason"} on
// stdout (exit 0). Kimi's block contract (verified live on 0.28.1) is exit 2
// with the reason on stderr. Only a well-formed block decision is relayed;
// anything else (no block, malformed output) fails open with exit 0 and NO
// stdout — Kimi may append a blockable event's exit-0 stdout to context, so
// the Claude-schema JSON must never leak through.
export function translateStopOutput(coreStdout: string): AdapterResult {
  try {
    const parsed = JSON.parse(coreStdout.trim()) as { decision?: unknown; reason?: unknown };
    if (parsed.decision === "block" && typeof parsed.reason === "string") {
      return { stdout: "", exitCode: 2, stderr: `${parsed.reason}\n` };
    }
  } catch {
    // unparseable core output — cannot relay a block contract; fail open
  }
  return { stdout: "", exitCode: 0, stderr: "" };
}

// translateSessionStartOutput — Kimi 0.28.1 discards SessionStart hook stdout
// in every probed format (plain text, hookSpecificOutput JSON, bare
// additionalContext JSON): the event is observation-only. The core hook still
// runs for its side effects (audit row, session stamp, resume rebind offer);
// its context payload is dropped here. If a future Kimi version reads
// SessionStart stdout, this is the one seam to change (the contract test
// pins the current behavior).
export function translateSessionStartOutput(_coreStdout: string): string {
  return "";
}

// Spawn seam: pipe stdin into a sibling core hook and capture {stdout, code}.
// env: process.env is explicit (bun-spawn-env-snapshot: bun spawnSync does not
// fold runtime env changes into the child automatically).
export type SpawnFn = (hookFile: string, input: string, projectDir: string) => { stdout: string; code: number };

type HookInput = {
  cwd: string;
  stdin?: Uint8Array;
  stdout: "pipe";
  stderr: "pipe" | "ignore";
  env?: Record<string, string | undefined>;
};

type SpawnResult = {
  stdout: Uint8Array;
  stderr: Uint8Array;
  exitCode: number;
  signalCode?: string;
};

export function spawnHookWithRuntime(args: readonly string[], input: HookInput): SpawnResult {
  const result = Bun.spawnSync([process.execPath, ...args], input);
  return {
    stdout: result.stdout,
    stderr: result.stderr ?? new Uint8Array(),
    exitCode: result.exitCode,
    signalCode: result.signalCode,
  };
}

export function defaultSpawn(hookFile: string, input: string, projectDir: string): { stdout: string; code: number } {
  const r = spawnHookWithRuntime([join(HOOKS_DIR, hookFile)], {
    stdin: Buffer.from(input, "utf-8"),
    stdout: "pipe",
    stderr: "ignore",
    cwd: projectDir,
    env: process.env,
  });
  return { stdout: r.stdout?.toString() ?? "", code: r.exitCode ?? 0 };
}

// runAdapter — the argv/stdin-parameterized handler (seam-export-handler-amend).
// Pure of process.exit so it drives in-process under test; the CLI entrypoint
// owns the actual exit. Fail-open EVERYWHERE (BR-2): unparseable stdin,
// unknown target, missing core hook, or a core hook's non-zero exit all
// resolve to exit 0 — the user's Kimi session is never trapped. The single
// exception is the Stop block relay (exit 2), and even that only fires on a
// well-formed core block decision.
export function runAdapter(target: string, raw: string, projectDir: string, spawn: SpawnFn = defaultSpawn): AdapterResult {
  try {
    const env = parseKimiEnvelope(raw);
    if (env === null) {
      return { stdout: "", exitCode: 0, stderr: `amadeus-kimi-adapter: unparseable stdin for target '${target}'\n` };
    }
    const dir = env.cwd ?? projectDir;
    const calls = routeTarget(target, env);
    let last: AdapterResult = { stdout: "", exitCode: 0, stderr: "" };
    for (const call of calls) {
      let r: { stdout: string; code: number };
      try {
        r = spawn(call.hookPath, call.stdin, dir);
      } catch {
        continue; // core hook missing / spawn failure — fail open (BR-2)
      }
      if (call.translate === "stop") last = translateStopOutput(r.stdout);
      else if (call.translate === "session-start") last = { stdout: translateSessionStartOutput(r.stdout), exitCode: 0, stderr: "" };
      // translate "none": advisory — core stdout/exit are deliberately dropped.
    }
    return last;
  } catch {
    return { stdout: "", exitCode: 0, stderr: "" };
  }
}

// runCli — the argv/stdin-parameterized CLI body. stdin is injected (readStdin)
// so this is driven fully in-process by tests; the amadeus-kimi-adapter.ts
// entrypoint binds it to the real Bun.stdin. A TTY stdin (interactive / test /
// debug) is treated as no envelope. Reads argv[2] as target.
export async function runCli(argv: string[], readStdin: () => Promise<string>): Promise<AdapterResult> {
  const target = argv[2] ?? "";
  let raw = "";
  if (!process.stdin.isTTY) {
    try {
      raw = await readStdin();
    } catch {
      raw = ""; // unreadable stdin → parse null → fail open
    }
  }
  return runAdapter(target, raw, process.cwd());
}
