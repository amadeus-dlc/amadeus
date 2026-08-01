// Subagent-start hook: emit SUBAGENT_STARTED when a subagent is dispatched.
//
// The opening half of the interval whose closing half amadeus-log-subagent.ts
// writes. Both halves share the same three gates (TTY, an active audit shard,
// a workflow that is not already terminal) so a start can never be recorded
// where its completion would be dropped.
//
// SEAM ASYMMETRY (deliberate, and the reason the started event's attributes are
// mostly optional). Harnesses do not agree on when a subagent begins:
//   - Claude Code has no subagent-start event at all, so the seam is
//     PreToolUse on the dispatch tool. That fires for EVERY tool, which is why
//     subagentStartFields declines anything but the dispatch tool.
//   - Kimi has a real SubagentStart event carrying the prompt.
//   - Codex, Cursor, OpenCode and Kiro have no start seam, so they emit the
//     completed half only. Lifetime composition treats such a completion as an
//     orphan and drops it rather than inventing a start.
//
// Receives JSON on stdin. No-op if no audit shard exists.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureOtelBootstrap } from "../otel/bootstrap.ts";
import { appendAuditEntryViaEvents } from "../otel/migration-adapter.ts";
import { initProcessObservability } from "../tools/amadeus-observability.ts";
import {
  activeWorkflowIsComplete,
  type ClaudeCodeHookInput,
  errorMessage,
  hasActiveWorkflowAudit,
  hooksHealthDir,
  isClaudeCodeHookInput,
  isoTimestamp,
  readHookStdin,
  recordHookDrop,
  resolveProjectDirFromHook,
  subagentStartFields,
} from "../tools/amadeus-lib.ts";

// Drain stdin first: the payload's `cwd` is the top rung of project-dir
// resolution (#1482), and the stream can only be read once.
const hookStdin = await readHookStdin();
const projectDir = resolveProjectDirFromHook(import.meta.url, hookStdin.cwd);

// Write health heartbeat
const healthDir = hooksHealthDir(projectDir);
mkdirSync(healthDir, { recursive: true });
writeFileSync(join(healthDir, "log-subagent-start.last"), isoTimestamp(), "utf-8");

// Exit cleanly if stdin is a TTY (no hook JSON coming) — avoids blocking on a
// terminal read in test / debug-mode contexts.
if (process.stdin.isTTY) process.exit(0);

let parsed: ClaudeCodeHookInput;
try {
  const raw: unknown = JSON.parse(hookStdin.text);
  if (!isClaudeCodeHookInput(raw)) process.exit(0);
  parsed = raw;
} catch {
  process.exit(0);
}

const started = subagentStartFields(parsed);
if (started === null) process.exit(0);

// Assembled as a literal here, rather than forwarded straight from
// subagentStartFields, so the emitter/registry admission guard (t385) can read
// this call site's key set statically. A field object that arrives as an opaque
// return value is unanalyzable, and default-deny redaction makes an unadmitted
// key vanish without a sound — the guard is what catches that, so the call site
// has to stay legible to it. Same shape as the completed half's hook.
const fields: Record<string, string> = { "Agent Type": started["Agent Type"] };
if (started["Agent ID"]) fields["Agent ID"] = started["Agent ID"];
if (started.Purpose) fields.Purpose = started.Purpose;

// Gate on ANY per-clone shard of the active intent (glob-merge), NOT this
// clone's own shard — a fresh clone / new worktree mints a new clone-id, so a
// bare self-shard existsSync would drop the event until the engine's first
// append.
if (!hasActiveWorkflowAudit(projectDir)) process.exit(0);

// #845: appending to a workflow that is already Completed leaves unpushed
// audit residue in every worktree that merely runs subagents afterwards.
if (activeWorkflowIsComplete(projectDir)) process.exit(0);

// Telemetry process span (opt-in; no-op unless observability.enabled)
initProcessObservability("hook:log-subagent-start", projectDir);

try {
  // Stand up the canonical emit path before the first emit (emitEvent throws
  // with no Logger Provider registered). Inside the try so a bootstrap failure
  // lands on the SAME fail-open drop as an append failure.
  ensureOtelBootstrap(projectDir);
  appendAuditEntryViaEvents("SUBAGENT_STARTED", fields, projectDir);
} catch (e) {
  recordHookDrop(projectDir, "log-subagent-start", errorMessage(e));
  process.exit(0);
}
