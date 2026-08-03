// SubagentStop hook: Emit SUBAGENT_COMPLETED when a subagent finishes.
// Replaces the previous free-form `## Subagent Completed` markdown write with
// a canonical audit event.
//
// Receives JSON on stdin with subagent info. No-op if no audit shard exists.
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
  normalizeAgentType,
  recordHookDrop,
  readHookStdin,
  resolveProjectDirFromHook,
} from "../tools/amadeus-lib.ts";

// Drain stdin first: the payload's `cwd` is the top rung of project-dir
// resolution (#1482), and the stream can only be read once.
const hookStdin = await readHookStdin();
const projectDir = resolveProjectDirFromHook(import.meta.url, hookStdin.cwd);

// Write health heartbeat
const healthDir = hooksHealthDir(projectDir);
mkdirSync(healthDir, { recursive: true });
writeFileSync(join(healthDir, "log-subagent.last"), isoTimestamp(), "utf-8");

// Read JSON from stdin. Exit cleanly if stdin is a TTY (no Claude Code JSON
// coming) — avoids blocking on terminal read in test / debug-mode contexts.
if (process.stdin.isTTY) process.exit(0);

const input = hookStdin.text;
let parsed: ClaudeCodeHookInput;
try {
  const raw: unknown = JSON.parse(input);
  if (!isClaudeCodeHookInput(raw)) process.exit(0);
  parsed = raw;
} catch {
  process.exit(0);
}

// SubagentStop delivers agent_type as "" for generic Task agents (#845).
const agentType = normalizeAgentType(parsed.agent_type);
const agentId: string = parsed.agent_id ?? "";
const agentMessage: string = (parsed.last_assistant_message ?? "").slice(0, 200);

// Gate on ANY per-clone shard of the active intent (glob-merge), NOT this clone's
// own shard — a fresh clone / new worktree mints a new clone-id, so a bare
// self-shard existsSync would drop the event until the engine's first append.
if (!hasActiveWorkflowAudit(projectDir)) process.exit(0);

// #845: the active intent may already be Completed (Status=Completed on its
// amadeus-state.md). Appending SUBAGENT_COMPLETED to a closed workflow leaves
// unpushed audit residue in every worktree that merely runs subagents after the
// intent finished — no-op once the workflow is terminal.
if (activeWorkflowIsComplete(projectDir)) process.exit(0);

// Telemetry process span (opt-in; no-op unless observability.enabled)
initProcessObservability("hook:log-subagent", projectDir);

const fields: Record<string, string> = {
  "Agent Type": agentType,
};
if (agentId) fields["Agent ID"] = agentId;
if (agentMessage) fields.Message = agentMessage;

try {
  // Stand up the canonical emit path before the first emit (emitEvent throws
  // with no Logger Provider registered). Inside the try so a bootstrap failure
  // lands on the SAME fail-open drop as an append failure.
  //
  // Agent ID and Message are conditional here, which is why this hook stayed on
  // the legacy writer while the other four migrated: default-deny redaction
  // dropped any key the registry did not name, and naming them required would
  // have thrown on the calls that omit them. They are registered optional now,
  // so both survive the write without becoming mandatory.
  ensureOtelBootstrap(projectDir);
  appendAuditEntryViaEvents("SUBAGENT_COMPLETED", fields, projectDir);
} catch (e) {
  recordHookDrop(projectDir, "log-subagent", errorMessage(e));
  process.exit(0);
}
