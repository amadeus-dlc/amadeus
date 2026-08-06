// amadeus-kimi-lib.ts — the Kimi Code CLI hook shim LOGIC (AUTHORED; the
// amadeus-*.ts hook bodies beside it in .kimi-code/hooks/ are PACKAGED core,
// byte-shared with the Claude Code harness). All parse/map/translate/spawn
// logic lives here, fully in-process testable; the thin runnable entrypoint is
// amadeus-kimi-adapter.ts (which imports runCli from this file). Modeled on
// the cursor/codex adapters: normalize the Kimi payload to the
// ClaudeCodeHookInput shape each named core hook consumes, subprocess-pipe
// into it, and relay stdout/exit per the Kimi contract.
//
// ── measured and bundle-derived Kimi contracts ─────────────────────────────
// Most fixtures are Kimi Code CLI 0.28.1 live captures (2026-07-26).
// PreToolUse is an official-contract fixture. SubagentStart/SubagentStop are
// derived from the Kimi 0.29.0 external hook runner: it supplies agent_name
// but an empty session_id, so these are not claimed live captures.
// Session/tool envelopes otherwise use {hook_event_name, session_id, cwd} in
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
//   4. Subagent identity is only `agent_name`; there is no agent_id and the
//      0.29.0 external runner emits an empty session_id. Maps to agent_type
//      for observation only; it cannot establish a trustworthy caller role.
//   5. PostToolUse carries tool_call_id + tool_output (string) — neither is
//      read by any core hook; dropped (unknown fields are not forwarded).
//
// Output contracts — the base shapes were verified LIVE on 0.28.1 (BR-3/BR-5):
//   - Stop forwards only when the payload's non-empty session_id matches both
//     the host-stamped `.current-session` and the SessionStart baseline, no
//     agent_name is present, and no subagent lifecycle is active. Empty,
//     mismatched, delegated-agent, and ambiguous payloads remain silent no-ops.
//     A live 0.28.1 Stop capture has no agent_name. The installed 0.29.0
//     bundle constructs Stop with only stopHookActive and reports delegated
//     lifecycle separately through SubagentStart/SubagentStop agentName.
//   - SessionStart context injection: NONE. Three candidate formats were
//     probed and none reached the model's context (plain-text stdout,
//     {"hookSpecificOutput":{...,"additionalContext"}}, and bare
//     {"additionalContext"}) — SessionStart is observation-only on 0.28.1.
//     translateSessionStartOutput therefore always returns "".
//   - fail-open: exit 0 = allow (stdout MAY be appended to context on
//     blockable events); exit 2 = block; other non-zero / error / timeout =
//     allow. This shim exits 0 on every path.
//     (Observed for completeness, not wired: UserPromptSubmit stdout plain
//     text IS appended to context — the only injection channel that works
//     on 0.28.1.)

import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
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

const KIMI_ROLE_MARKER_RELATIVE_PATH = join(
  "amadeus",
  ".amadeus-sessions",
  "kimi-active-subagents.json",
);
const KIMI_ROLE_DENY_RELATIVE_PATH = join(
  "amadeus",
  ".amadeus-sessions",
  "kimi-subagent-transition-deny",
);
const KIMI_SESSION_ENDED_DENY_RELATIVE_PATH = join(
  "amadeus",
  ".amadeus-sessions",
  "kimi-session-ended-deny",
);

interface KimiRoleMarker {
  version: 1;
  mainSessionId: string;
  roles: Record<string, number>;
}

export type KimiRoleMarkerWriter = (
  markerPath: string,
  marker: KimiRoleMarker,
) => void;

export const ROLE_LOCK_STALE_MS = 30_000;
const ROLE_LOCK_RETRIES = 100;
const ROLE_LOCK_WAIT_MS = 5;
const ROLE_LOCK_OWNER_FILE = "owner.json";

interface RoleLockOwner {
  pid: number;
  startedAt: number;
}

/**
 * Stamp the holder of a freshly created lock directory. The directory itself is
 * still the mutual-exclusion primitive (mkdir is atomic); this file only names
 * who holds it, so a would-be reclaimer can ask whether that holder still
 * exists instead of assuming.
 *
 * Throws on failure rather than leaving the lock unattributed: an unstamped
 * lock can only be reclaimed by the 30s mtime backstop, so holding one while
 * pretending the stamp succeeded would trade a write error for a workspace
 * that wedges. The caller releases the lock and stays fail-closed.
 */
export function writeRoleLockOwner(lockPath: string, pid = process.pid): void {
  writeFileSync(
    join(lockPath, ROLE_LOCK_OWNER_FILE),
    `${JSON.stringify({ pid, startedAt: Date.now() } satisfies RoleLockOwner)}\n`,
    "utf-8",
  );
}

function readRoleLockOwner(lockPath: string): RoleLockOwner | null {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(join(lockPath, ROLE_LOCK_OWNER_FILE), "utf-8"),
    );
    const pid = (parsed as { pid?: unknown }).pid;
    const startedAt = (parsed as { startedAt?: unknown }).startedAt;
    if (
      typeof pid !== "number" ||
      !Number.isSafeInteger(pid) ||
      pid <= 0 ||
      typeof startedAt !== "number"
    ) {
      return null;
    }
    return { pid, startedAt };
  } catch {
    return null;
  }
}

// `kill(pid, 0)` performs the permission and existence checks without sending a
// signal. ESRCH is the only answer that proves absence: EPERM means the process
// exists under another user, and any other failure is treated as "still there"
// so an unknown errno can never license a seizure.
function roleLockOwnerIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (cause) {
    return (cause as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

/**
 * Reclaim a role-marker lock, and report whether it was actually taken.
 *
 * Two independent grounds, and nothing else:
 *  - the recorded owner is observably gone. This is the reason ownership was
 *    introduced: a lock left by a killed process is fresh by mtime, and the
 *    retry budget (ROLE_LOCK_RETRIES x ROLE_LOCK_WAIT_MS) is two orders of
 *    magnitude short of ROLE_LOCK_STALE_MS, so before this the workspace simply
 *    latched denied until the window elapsed.
 *  - the mtime backstop expired. Kept because a pid can be recycled: an owner
 *    that merely *looks* alive must not be able to wedge the lock forever.
 *
 * Every other state — a live owner inside the window, an owner file not yet
 * written after mkdir — is fail-safe: the lock stays.
 */
export function reclaimRoleMarkerLock(lockPath: string): boolean {
  let mtimeMs: number;
  try {
    mtimeMs = statSync(lockPath).mtimeMs;
  } catch {
    return false;
  }
  const owner = readRoleLockOwner(lockPath);
  const expired = Date.now() - mtimeMs > ROLE_LOCK_STALE_MS;
  if (!expired && (owner === null || roleLockOwnerIsAlive(owner.pid))) {
    return false;
  }
  // A removal failure propagates: both callers already treat a thrown error as
  // "the carrier could not be made safe" and fail closed, so swallowing it here
  // would only hide the one case where the lock genuinely could not be taken.
  rmSync(lockPath, { recursive: true, force: true });
  return true;
}

function roleMarkerPath(projectDir: string): string {
  return join(projectDir, KIMI_ROLE_MARKER_RELATIVE_PATH);
}

function roleDenyPath(projectDir: string): string {
  return join(projectDir, KIMI_ROLE_DENY_RELATIVE_PATH);
}

function sessionEndedDenyPath(projectDir: string): string {
  return join(projectDir, KIMI_SESSION_ENDED_DENY_RELATIVE_PATH);
}

function withRoleMarkerLock(
  markerPath: string,
  operation: () => void,
): boolean {
  const lockPath = `${markerPath}.lock`;
  for (let attempt = 0; attempt < ROLE_LOCK_RETRIES; attempt++) {
    // Only the lock acquisition sits in this try: an error thrown by
    // operation() must not be mistaken for lock contention and retried, and
    // it must reach the caller's own fail-closed path instead of collapsing
    // into the same `false` a lock-acquisition failure returns.
    try {
      mkdirSync(lockPath);
    } catch (cause) {
      const code = (cause as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") return false;
      // A reclaimed lock is retried at once — the whole point of tracking the
      // owner is not to spend the (far too short) retry budget waiting out a
      // lock nobody holds.
      if (reclaimRoleMarkerLock(lockPath)) continue;
      Bun.sleepSync(ROLE_LOCK_WAIT_MS);
      continue;
    }
    // The stamp shares operation()'s try/finally so a failed stamp releases the
    // lock instead of leaking an unattributable one, and reaches the caller's
    // fail-closed path exactly as an operation() error does.
    try {
      writeRoleLockOwner(lockPath);
      operation();
      return true;
    } finally {
      rmSync(lockPath, { recursive: true, force: true });
    }
  }
  return false;
}

function readRoleMarker(projectDir: string): KimiRoleMarker | null {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(roleMarkerPath(projectDir), "utf-8"),
    );
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      (parsed as { version?: unknown }).version !== 1
    ) {
      return null;
    }
    const mainSessionId = (parsed as { mainSessionId?: unknown }).mainSessionId;
    const roles = (parsed as { roles?: unknown }).roles;
    if (
      typeof mainSessionId !== "string" ||
      mainSessionId.trim().length === 0 ||
      roles === null ||
      typeof roles !== "object" ||
      Array.isArray(roles)
    ) {
      return null;
    }
    for (const [role, count] of Object.entries(roles)) {
      if (
        role.trim().length === 0 ||
        typeof count !== "number" ||
        !Number.isSafeInteger(count) ||
        count < 1
      ) {
        return null;
      }
    }
    return {
      version: 1,
      mainSessionId,
      roles: roles as Record<string, number>,
    };
  } catch {
    return null;
  }
}

function writeRoleMarkerAtomic(
  markerPath: string,
  marker: KimiRoleMarker,
): void {
  const temporaryPath = `${markerPath}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(marker)}\n`, "utf-8");
  renameSync(temporaryPath, markerPath);
}

function establishKimiMainBaseline(
  projectDir: string,
  sessionId: string,
): void {
  const markerPath = roleMarkerPath(projectDir);
  const normalizedSessionId = sessionId.trim();
  try {
    mkdirSync(dirname(markerPath), { recursive: true });
    // A lock found here is USUALLY residue from a killed session, and clearing
    // it is what lets the baseline below land instead of giving up and leaving
    // the workspace denied with no in-band way out. But "usually" is not a
    // licence: another Kimi process in this same project dir can be inside
    // withRoleMarkerLock's operation() right now, and deleting its lock would
    // let this baseline write interleave with that in-flight read-modify-write
    // of the same carrier. So the residue case is not assumed, it is checked —
    // reclaimRoleMarkerLock only takes the lock when its owner is observably
    // gone (or the mtime backstop expired), and a live owner keeps it.
    reclaimRoleMarkerLock(`${markerPath}.lock`);
    if (normalizedSessionId.length === 0) {
      unlinkSync(markerPath);
      return;
    }
    const updated = withRoleMarkerLock(markerPath, () => {
      writeRoleMarkerAtomic(markerPath, {
        version: 1,
        mainSessionId: normalizedSessionId,
        roles: {},
      });
      try {
        unlinkSync(roleDenyPath(projectDir));
      } catch {
        // An absent transition latch is the intended baseline state.
      }
      try {
        unlinkSync(sessionEndedDenyPath(projectDir));
      } catch {
        // A new valid baseline retires the prior session's tombstone.
      }
    });
    if (!updated) {
      try {
        unlinkSync(markerPath);
      } catch {
        // A missing baseline is fail-closed in the engine guard.
      }
    }
  } catch {
    try {
      unlinkSync(markerPath);
    } catch {
      // A missing baseline is fail-closed in the engine guard.
    }
  }
}

function clearKimiRoleCarrier(projectDir: string): void {
  const markerPath = roleMarkerPath(projectDir);
  try {
    mkdirSync(dirname(markerPath), { recursive: true });
    writeFileSync(sessionEndedDenyPath(projectDir), "session-ended\n", "utf-8");
    writeFileSync(roleDenyPath(projectDir), "session-ended\n", "utf-8");
    const cleared = withRoleMarkerLock(markerPath, () => {
      try {
        unlinkSync(markerPath);
      } catch {
        // A missing baseline is the intended post-session state.
      }
    });
    if (cleared) return;
  } catch {
    // Fall through to a best-effort baseline removal. A retained latch or a
    // missing marker both keep the engine fail-closed until SessionStart.
  }
  try {
    unlinkSync(markerPath);
  } catch {
    // Runtime cleanup is best-effort and remains fail-closed.
  }
}

export function updateKimiSubagentRole(
  projectDir: string,
  agentName: string,
  action: "start" | "stop",
  writeMarker: KimiRoleMarkerWriter = writeRoleMarkerAtomic,
): void {
  const markerPath = roleMarkerPath(projectDir);

  try {
    mkdirSync(dirname(markerPath), { recursive: true });
    if (action === "start") {
      writeFileSync(roleDenyPath(projectDir), "subagent-start\n", "utf-8");
    }
    const updated = withRoleMarkerLock(markerPath, () => {
      const role = agentName.trim() || "unknown";
      const marker = readRoleMarker(projectDir);
      if (marker === null) {
        throw new Error("Kimi main-session baseline is missing or malformed");
      }
      const current = marker.roles[role] ?? 0;
      if (action === "start") {
        marker.roles[role] = current + 1;
      } else if (current <= 1) {
        delete marker.roles[role];
      } else {
        marker.roles[role] = current - 1;
      }
      writeMarker(markerPath, marker);
      if (Object.keys(marker.roles).length > 0) return;
      try {
        unlinkSync(roleDenyPath(projectDir));
      } catch {
        // An absent transition latch is the intended idle state.
      }
    });
    if (!updated && action === "start") {
      try {
        writeFileSync(roleDenyPath(projectDir), "subagent-start-failed\n", "utf-8");
      } catch {
        try {
          unlinkSync(markerPath);
        } catch {
          // If storage is wholly unwritable, the adapter cannot strengthen
          // the filesystem carrier; the engine still rejects lock/malformed
          // and missing baseline states.
        }
      }
    }
  } catch {
    // Role-start creates the deny latch before updating the counted carrier,
    // so a failed persistence remains denied. A failed role-stop leaves the
    // prior active marker or latch in place.
    if (action === "start") {
      try {
        writeFileSync(roleDenyPath(projectDir), "subagent-start-failed\n", "utf-8");
      } catch {
        try {
          unlinkSync(markerPath);
        } catch {
          // See the wholly-unwritable storage limitation above.
        }
      }
    }
  }
}

export function isTrustedMainStop(
  env: KimiEnvelope,
  projectDir: string,
): boolean {
  if (typeof env.session_id !== "string" || env.session_id.length === 0) {
    return false;
  }
  if (typeof env.agent_name === "string" && env.agent_name.length > 0) {
    return false;
  }
  const markerPath = roleMarkerPath(projectDir);
  if (
    statExists(roleDenyPath(projectDir)) ||
    statExists(sessionEndedDenyPath(projectDir)) ||
    statExists(`${markerPath}.lock`)
  ) {
    return false;
  }
  try {
    const marker = readRoleMarker(projectDir);
    if (
      marker === null ||
      marker.mainSessionId !== env.session_id ||
      Object.keys(marker.roles).length > 0
    ) {
      return false;
    }
    const trustedSessionId = readFileSync(
      join(projectDir, "amadeus", ".amadeus-sessions", ".current-session"),
      "utf-8",
    ).trim();
    return trustedSessionId.length > 0 && trustedSessionId === env.session_id;
  } catch {
    return false;
  }
}

function statExists(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function trackKimiRoleLifecycle(
  target: string,
  env: KimiEnvelope,
  projectDir: string,
): void {
  switch (target) {
    case "session-start":
      establishKimiMainBaseline(projectDir, env.session_id ?? "");
      break;
    case "session-end":
      clearKimiRoleCarrier(projectDir);
      break;
    case "role-start":
      updateKimiSubagentRole(projectDir, env.agent_name ?? "", "start");
      break;
    case "log-subagent":
      updateKimiSubagentRole(projectDir, env.agent_name ?? "", "stop");
      break;
  }
}

function translateCoreResult(
  call: CoreHookCall,
  result: { stdout: string; code: number },
  previous: AdapterResult,
): AdapterResult {
  if (call.translate === "session-start") {
    return {
      stdout: translateSessionStartOutput(result.stdout),
      exitCode: 0,
      stderr: "",
    };
  }
  if (call.translate === "stop" && result.code === 0) {
    return { stdout: result.stdout, exitCode: 0, stderr: "" };
  }
  return previous;
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
      return JSON.stringify({
        hook_event_name: "SessionEnd",
        reason: env.reason ?? "unknown",
        ...(env.session_id ? { session_id: env.session_id } : {}),
      });
    case "mint": {
      const payload: Record<string, unknown> = {
        hook_event_name: env.hook_event_name ?? "",
        ...(env.tool_name ? { tool_name: env.tool_name } : {}),
        ...(env.tool_input ? { tool_input: env.tool_input } : {}),
        ...(env.session_id ? { session_id: env.session_id } : {}),
      };
      // UserPromptSubmit carries the human text in `prompt`; PostToolUse
      // (AskUserQuestion) carries the rendered question in `tool_input`.
      // Omitting a synthetic empty prompt lets the core choose tool_input as
      // the reservation-binding purpose for that primary gate path.
      if (env.hook_event_name === "UserPromptSubmit") {
        payload.prompt = promptText(env.prompt);
      }
      return JSON.stringify(payload);
    }
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
    case "role-start":
      // The one real subagent-start seam across the harnesses (U4). Kimi ships
      // the dispatch prompt here, so Purpose is derivable; there is no
      // agent_id in any probed version and no tool envelope, which is what
      // tells the core hook this fires only for subagents.
      return JSON.stringify({
        hook_event_name: "SubagentStart",
        agent_type: env.agent_name ?? "",
        prompt: promptText(env.prompt),
      });
    case "log-subagent":
      // Kimi names the subagent `agent_name` and ships no agent_id (capture).
      return JSON.stringify({
        hook_event_name: "SubagentStop",
        agent_type: env.agent_name ?? "",
        agent_id: "",
        ...(env.session_id ? { session_id: env.session_id } : {}),
      });
    case "stop":
      return JSON.stringify({
        hook_event_name: "Stop",
        ...(env.session_id ? { session_id: env.session_id } : {}),
        ...(env.cwd ? { cwd: env.cwd } : {}),
        stop_hook_active: env.stop_hook_active === true,
      });
    default:
      return null;
  }
}

// routeTarget — the dispatch table (domain-entities.md
// §AdapterTarget). Unknown target / unmappable payload → empty call list
// (fail-open: nothing to pipe, exit 0).
export function routeTarget(
  target: string,
  env: KimiEnvelope,
  trustedMainStop = false,
): CoreHookCall[] {
  const stdin = normalizePayload(target, env);
  if (stdin === null) return [];
  switch (target) {
    case "session-start":
      // Auto-compose opted-in plugins (U4 hook-wiring-remaining, BR-U4-1): a
      // 1-point invocation of the SAME core hook the claude face wires (U2),
      // with NO composition logic (--if-stale no-op fast path). translate:
      // "none" drops its (empty) stdout so amadeus-session-start.ts keeps
      // owning Kimi's context channel; order is irrelevant since only the
      // session-start relay sets output. Advisory (stderr + exit 0).
      return [
        { hookPath: "amadeus-session-start.ts", stdin, translate: "session-start" },
        { hookPath: "amadeus-plugin-compose.ts", stdin, translate: "none" },
      ];
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
    case "role-start":
      return [{ hookPath: "amadeus-log-subagent-start.ts", stdin, translate: "none" }];
    case "log-subagent":
      return [{ hookPath: "amadeus-log-subagent.ts", stdin, translate: "none" }];
    case "stop":
      return trustedMainStop
        ? [{ hookPath: "amadeus-stop.ts", stdin, translate: "stop" }]
        : [];
    default:
      return [];
  }
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
// resolve to exit 0 — the user's Kimi session is never trapped. Stop is a
// no-op unless the host-stamped session carriers and empty ambient-role set
// establish the main Stop contract. This does not authenticate an arbitrary
// process caller; the conductor must not mutate while a subagent is active.
export function runAdapter(target: string, raw: string, projectDir: string, spawn: SpawnFn = defaultSpawn): AdapterResult {
  try {
    const env = parseKimiEnvelope(raw);
    if (env === null) {
      return { stdout: "", exitCode: 0, stderr: `amadeus-kimi-adapter: unparseable stdin for target '${target}'\n` };
    }
    const dir = env.cwd ?? projectDir;
    trackKimiRoleLifecycle(target, env, dir);
    const calls = routeTarget(target, env, target === "stop" && isTrustedMainStop(env, dir));
    let last: AdapterResult = { stdout: "", exitCode: 0, stderr: "" };
    for (const call of calls) {
      let r: { stdout: string; code: number };
      try {
        r = spawn(call.hookPath, call.stdin, dir);
      } catch {
        continue; // core hook missing / spawn failure — fail open (BR-2)
      }
      last = translateCoreResult(call, r, last);
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
