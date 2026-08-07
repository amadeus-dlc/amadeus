// Subagent model-enforcement hook (#2438): deny a dispatch that would run on a
// model outside the enforced set.
//
// The enforcement face of the dispatch seam whose advisory face #2279 built:
// where amadeus-log-subagent-start.ts records what was dispatched, this hook
// stops a dispatch that neither goes through a declared persona (whose
// frontmatter model pin carries compliance) nor requests an enforced model
// explicitly. Without it, ad-hoc names, builtins and typeless spawns silently
// inherit the parent session's model — the exact leak measured at ~76% of all
// recorded dispatches when the guard was filed.
//
// SCOPE: active amadeus workflows only. The gates are the same trio as the
// logging pair (TTY, an active audit shard, a workflow that is not terminal),
// so an ordinary non-amadeus session's dispatches are never judged here.
//
// PROTOCOL: PreToolUse. A deny is the harness JSON contract on stdout
// (hookSpecificOutput.permissionDecision: "deny") with the remedy in the
// reason; an allow is silence. Internal failures fail OPEN with a stderr
// advisory — a broken guard must degrade to #2279's advisory posture, not
// block every dispatch in the workspace.
//
// Receives JSON on stdin. No-op if no audit shard exists.
import { join } from "node:path";
import {
  activeWorkflowIsComplete,
  type ClaudeCodeHookInput,
  errorMessage,
  evaluateDispatchGuard,
  hasActiveWorkflowAudit,
  isClaudeCodeHookInput,
  readHookStdin,
  resolveProjectDirFromHook,
} from "../tools/amadeus-lib.ts";
import { sanitizeAdvisoryValue } from "../tools/amadeus-subagent-observability.ts";
import { harnessDir } from "../tools/amadeus-harness.ts";

// Drain stdin first: the payload's `cwd` is the top rung of project-dir
// resolution (#1482), and the stream can only be read once.
const hookStdin = await readHookStdin();
const projectDir = resolveProjectDirFromHook(import.meta.url, hookStdin.cwd);

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

// Enforcement is an amadeus-workflow concern: outside an active, non-terminal
// workflow the guard has no standing over the session's dispatches.
if (!hasActiveWorkflowAudit(projectDir)) process.exit(0);
if (activeWorkflowIsComplete(projectDir)) process.exit(0);

try {
  const decision = evaluateDispatchGuard(parsed, join(projectDir, harnessDir(), "agents"));
  if (decision?.kind === "deny") {
    process.stdout.write(
      `${JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: decision.reason,
        },
      })}\n`,
    );
  }
} catch (e) {
  // Fail open, loudly: a guard that cannot evaluate must not become a
  // workspace-wide dispatch outage. The advisory face (#2279) still records
  // whatever this dispatch turns out to be. The exit is the approved failure
  // terminal (no-silent-drop NSD001): fail-open here still ENDS the hook.
  process.stderr.write(`advisory: subagent model guard skipped: ${sanitizeAdvisoryValue(errorMessage(e))}\n`);
  process.exit(0);
}
process.exit(0);
