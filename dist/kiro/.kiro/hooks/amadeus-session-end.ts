// SessionEnd hook: Emit SESSION_ENDED when a Claude Code conversation ends.
// The workflow lifecycle is independent of session lifecycle — ending a
// session does NOT complete the workflow. This event is observability only.
//
// No-op if amadeus-state.md is absent in cwd (the canonical "active workflow"
// signal — matches session-start.ts and the plan definition).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appendAuditEntry } from "../tools/amadeus-audit.ts";
import {
  errorMessage,
  hooksHealthDir,
  isClaudeCodeHookInput,
  isoTimestamp,
  readHookStdin,
  recordHookDrop,
  resolveProjectDirFromHook,
  stateFilePath,
} from "../tools/amadeus-lib.ts";

// Drain stdin first: the payload's `cwd` is the top rung of project-dir
// resolution (#1482), and the stream can only be read once.
const hookStdin = await readHookStdin();
const projectDir = resolveProjectDirFromHook(import.meta.url, hookStdin.cwd);

// No workflow active — do nothing (consistent with session-start.ts)
if (!existsSync(stateFilePath(projectDir))) process.exit(0);

// Health heartbeat
const healthDir = hooksHealthDir(projectDir);
mkdirSync(healthDir, { recursive: true });
writeFileSync(join(healthDir, "session-end.last"), isoTimestamp(), "utf-8");

// Reason field from the already-read payload (Claude Code may pass
// reason=logout|clear|prompt_input_exit etc.). Empty on a TTY, where
// readHookStdin never blocks on a terminal read.
let reason = "unknown";
try {
  if (hookStdin.text) {
    const raw: unknown = JSON.parse(hookStdin.text);
    if (isClaudeCodeHookInput(raw) && raw.reason) {
      reason = String(raw.reason);
    }
  }
} catch {
  // Treat malformed/missing stdin as unknown
}

try {
  appendAuditEntry("SESSION_ENDED", { Reason: reason }, projectDir);
} catch (e) {
  recordHookDrop(projectDir, "session-end", errorMessage(e));
  process.exit(0);
}
