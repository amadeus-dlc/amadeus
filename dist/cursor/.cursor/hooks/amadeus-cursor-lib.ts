// amadeus-cursor-lib.ts — the Cursor IDE hook shim LOGIC (AUTHORED; the
// amadeus-*.ts hook bodies beside it in .cursor/hooks/ are PACKAGED core,
// byte-shared with the Claude Code harness). All parse/map/reconstruct/spawn
// logic lives here, fully in-process testable; the thin runnable entrypoint is
// amadeus-cursor-adapter.ts (which imports runCli from this file). Modeled on
// the codex/kiro adapters: normalize the Cursor payload to the
// ClaudeCodeHookInput shape each named core hook consumes, subprocess-pipe into
// it, and forward stdout/exit.
//
// ── 工程0 measurement (Cursor hooks docs, retrieved 2026-07-16) ──────────────
// Source https://cursor.com/docs/hooks (official). Cross-check against
// github.com/johnlindquist/cursor-hooks reflected an OLDER API (no
// preToolUse/postToolUse, no tool_name enum) — so the generic postToolUse
// tool_name value set could not be corroborated verbatim, and the per-tool
// tool_input shape is undocumented. This shim therefore normalizes Cursor's
// DEDICATED tool-observation events (afterShellExecution / afterFileEdit), whose
// payload fields are documented verbatim and match exactly what the core hooks
// read (runtime-compile ← tool_input.command; audit-logger/sensor-fire ←
// tool_input.file_path). ToolNameMap holds ONLY those measured identities.
//
// Exit-code contract (工程0 (b), re-confirmed 2026-07-16): Cursor reads exit 0 =
// use stdout JSON; exit 2 = DENY (permission:deny); other = fail-open unless the
// hooks.json entry sets failClosed:true (default false). This shim NEVER emits
// exit 2 — parse failure and unregistered tool identity resolve to
// EXIT_ADVISORY_FAIL (= 1), a benign non-deny failure so a shim bug can never
// silently block an edit/shell/turn. (The codex adapter fails open with exit 0
// for the same intent; this shim uses exit 1 — a DIFFERENT value, SAME intent:
// "advisory, never deny" — because Cursor's `other`-code branch is explicitly
// fail-open, so exit 1 surfaces the diagnostic on stderr without denying.)

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Advisory failure exit code — module scope, NEVER 2 (no unintended deny).
export const EXIT_ADVISORY_FAIL = 1;

const HOOKS_DIR = dirname(fileURLToPath(import.meta.url));

// The Cursor stdin envelope (only the fields this shim reads). parse-don't-
// validate: parseCursorEnvelope returns this shape or null — no partial state.
export interface CursorEnvelope {
  hook_event_name?: string;
  // sessionStart
  session_id?: string;
  source?: string;
  // beforeSubmitPrompt
  prompt?: string;
  // afterShellExecution
  command?: string;
  // afterFileEdit
  file_path?: string;
  // subagentStop
  subagent_type?: string;
  subagent_id?: string;
  // sessionEnd
  reason?: string;
}

// ToolNameMap — 工程0 実測確定値のみ. Maps a Cursor tool-observation EVENT identity
// (hook_event_name) to the Claude tool_name the core hooks key on. Only the two
// events whose documented payload carries the exact field the target reads are
// registered; an unregistered identity on a tool-use target is rejected advisory
// (no silent no-op, no matcher-mismatch class).
export const ToolNameMap: Readonly<Record<string, string>> = {
  afterShellExecution: "Bash",
  afterFileEdit: "Edit",
};

// A single core-hook invocation the shim will pipe: which hook file, what stdin.
export interface CoreCall {
  hookFile: string;
  input: string;
}

// Reconstruction outcome for a (target, envelope) pair: the core calls to make
// plus whether to forward the last call's stdout, OR an advisory error string.
export type Reconstruction = { calls: CoreCall[]; forwardStdout: boolean } | { error: string };

// parse-don't-validate: JSON text → envelope object, or null for anything that
// is not a JSON object (empty, non-JSON, array, primitive).
export function parseCursorEnvelope(raw: string): CursorEnvelope | null {
  if (raw.length === 0) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  return v as CursorEnvelope;
}

// Pure mapping: (target, envelope) → the core calls to pipe. No I/O, no spawn —
// this is the tested seam (seam-export-handler-amend). Semantic-match comments
// cite the codex adapter reconstruction each target mirrors.
export function reconstruct(target: string, env: CursorEnvelope): Reconstruction {
  switch (target) {
    case "session-start": {
      // → amadeus-session-start.ts {hook_event_name, source, session_id?}
      // (codex adapter case "session-start"). Cursor gives no `source`; default
      // to "startup". Forward the {additionalContext} JSON for context injection.
      const payload: Record<string, unknown> = {
        hook_event_name: "SessionStart",
        source: env.source ?? "startup",
      };
      if (env.session_id) payload.session_id = env.session_id;
      return { calls: [{ hookFile: "amadeus-session-start.ts", input: JSON.stringify(payload) }], forwardStdout: true };
    }

    case "mint": {
      // → amadeus-mint-presence.ts {hook_event_name, prompt}. The core hook
      // classifies machine-injected turns itself from the prompt text (#755), so
      // the shim forwards the prompt and does no classification. Advisory.
      return {
        calls: [
          {
            hookFile: "amadeus-mint-presence.ts",
            input: JSON.stringify({ hook_event_name: "UserPromptSubmit", prompt: env.prompt ?? "" }),
          },
        ],
        forwardStdout: false,
      };
    }

    case "runtime-compile": {
      // Cursor afterShellExecution → amadeus-runtime-compile.ts, which reads
      // tool_input.command (core hook :59). Normalize via ToolNameMap (must map
      // to Bash) — an unregistered event identity is rejected advisory.
      const tool = ToolNameMap[env.hook_event_name ?? ""];
      if (tool !== "Bash") return { error: `unregistered tool identity for runtime-compile: ${env.hook_event_name}` };
      return {
        calls: [
          {
            hookFile: "amadeus-runtime-compile.ts",
            input: JSON.stringify({ hook_event_name: "PostToolUse", tool_name: tool, tool_input: { command: env.command ?? "" } }),
          },
        ],
        forwardStdout: false,
      };
    }

    case "audit-and-sensors": {
      // Cursor afterFileEdit → audit-logger THEN sensor-fire, each reading
      // tool_input.file_path (audit-logger :45-46). Mirrors the Claude
      // Write|Edit registration order (codex adapter case "audit-and-sensors").
      const tool = ToolNameMap[env.hook_event_name ?? ""];
      if (tool !== "Edit") return { error: `unregistered tool identity for audit-and-sensors: ${env.hook_event_name}` };
      const input = JSON.stringify({ hook_event_name: "PostToolUse", tool_name: tool, tool_input: { file_path: env.file_path ?? "" } });
      return {
        calls: [
          { hookFile: "amadeus-audit-logger.ts", input },
          { hookFile: "amadeus-sensor-fire.ts", input },
        ],
        forwardStdout: false,
      };
    }

    case "log-subagent": {
      // Cursor subagentStop → amadeus-log-subagent.ts {agent_type, agent_id}
      // (core hook :44-45). Cursor names them subagent_type / subagent_id.
      return {
        calls: [
          {
            hookFile: "amadeus-log-subagent.ts",
            input: JSON.stringify({ hook_event_name: "SubagentStop", agent_type: env.subagent_type ?? "", agent_id: env.subagent_id ?? "" }),
          },
        ],
        forwardStdout: false,
      };
    }

    case "validate-state": {
      // Cursor preCompact → amadeus-validate-state.ts. The core hook reads no
      // stdin fields (codex adapter case "validate-state"); pass an empty object.
      return { calls: [{ hookFile: "amadeus-validate-state.ts", input: "{}" }], forwardStdout: false };
    }

    case "session-end": {
      // Cursor sessionEnd → amadeus-session-end.ts {reason} (core hook :39-40).
      return {
        calls: [{ hookFile: "amadeus-session-end.ts", input: JSON.stringify({ hook_event_name: "SessionEnd", reason: env.reason ?? "unknown" }) }],
        forwardStdout: false,
      };
    }

    case "stop": {
      // Cursor stop → amadeus-stop.ts for its side effects. The core hook's
      // block decision travels as a Claude-schema {"decision":"block"} on stdout
      // and, on Claude, as exit 2. Cursor's stop-block wire contract (permission
      // model vs exit 2) is UNVERIFIED, and this shim must never emit exit 2 —
      // so stop is ADVISORY here: run the core hook, do NOT forward its
      // Claude-schema stdout, exit 0. Enforcing the workflow-incomplete guard on
      // Cursor is deferred to a later Bolt that can measure the block contract.
      return { calls: [{ hookFile: "amadeus-stop.ts", input: "{}" }], forwardStdout: false };
    }

    default:
      // Unknown target = misconfigured hooks.json. Advisory no-op (no core call).
      return { calls: [], forwardStdout: false };
  }
}

export interface AdapterResult {
  stdout: string;
  exitCode: number;
  stderr: string;
}

// Spawn seam: pipe stdin into a sibling core hook and capture {stdout, code}.
// env: process.env is explicit (bun-spawn-env-snapshot: bun spawnSync does not
// fold runtime env changes into the child automatically).
export type SpawnFn = (hookFile: string, input: string, projectDir: string) => { stdout: string; code: number };

export function defaultSpawn(hookFile: string, input: string, projectDir: string): { stdout: string; code: number } {
  const r = Bun.spawnSync(["bun", join(HOOKS_DIR, hookFile)], {
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
// owns the actual exit. Advisory throughout: it returns exit 0 on success and
// EXIT_ADVISORY_FAIL on parse/mapping failure, and NEVER exit 2.
export function runAdapter(target: string, raw: string, projectDir: string, spawn: SpawnFn = defaultSpawn): AdapterResult {
  const env = parseCursorEnvelope(raw);
  if (env === null) {
    return { stdout: "", exitCode: EXIT_ADVISORY_FAIL, stderr: `amadeus-cursor-adapter: unparseable stdin for target '${target}'\n` };
  }
  const recon = reconstruct(target, env);
  if ("error" in recon) {
    return { stdout: "", exitCode: EXIT_ADVISORY_FAIL, stderr: `amadeus-cursor-adapter: ${recon.error}\n` };
  }
  let lastStdout = "";
  for (const call of recon.calls) {
    const r = spawn(call.hookFile, call.input, projectDir);
    lastStdout = r.stdout;
  }
  // Success is always exit 0 (advisory, never deny). Core-hook non-zero exits are
  // not propagated: the only Claude blocking code is 2, which this shim must not
  // emit; the advisory hooks otherwise fail open by Cursor's `other`-code rule.
  return { stdout: recon.forwardStdout ? lastStdout : "", exitCode: 0, stderr: "" };
}

// runCli — the argv/stdin-parameterized CLI body. stdin is injected (readStdin)
// so this is driven fully in-process by tests; the amadeus-cursor-adapter.ts
// entrypoint binds it to the real Bun.stdin. A TTY stdin (interactive / test /
// debug) is treated as no envelope. Reads argv[2] as target.
export async function runCli(argv: string[], readStdin: () => Promise<string>): Promise<AdapterResult> {
  const target = argv[2] ?? "";
  let raw = "";
  if (!process.stdin.isTTY) {
    try {
      raw = await readStdin();
    } catch {
      raw = ""; // unreadable stdin → parse null → advisory fail
    }
  }
  return runAdapter(target, raw, process.cwd());
}
