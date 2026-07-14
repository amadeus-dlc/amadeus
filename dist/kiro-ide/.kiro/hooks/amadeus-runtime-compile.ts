// PostToolUse hook (Bash matcher): Dispatch `amadeus-runtime.ts compile`
// after every transition-class audit emit.
//
// Fires after every Bash tool call from the agent. Filters cheaply on
// the command — only direct transition tools plus `amadeus-orchestrate.ts report`
// get past the early exit. On match, tail-reads the LAST 3
// audit blocks (one approve writes up to 3 audit rows in a single Bash
// call), regex-matches `**Event**: (GATE_APPROVED|STAGE_STARTED|
// AUDIT_MERGED|WORKFLOW_COMPLETED)` against any of them, and dispatches
// `amadeus-runtime.ts compile` on match.
//
// WORKFLOW_COMPLETED is in the transition set so the final-stage approve
// fires the compile (handleCompleteWorkflow at amadeus-state.ts:572-590
// emits 5 audit rows ending with WORKFLOW_COMPLETED — without it in the
// regex, the last 3 blocks would be PHASE_COMPLETED + PHASE_VERIFIED +
// WORKFLOW_COMPLETED, none in the original transition set, and the
// runtime-graph would never record the final stage as approved).
//
// Recursion guard: `amadeus-runtime.ts` is excluded from the command-regex
// matcher set, AND MEMORY_EMPTY is not in the event-class regex. The
// compile's own audit emits cannot re-trigger the compile.

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  activeIntent,
  activeSpace,
  armMigrationStopLatch,
  type ClaudeCodeHookInput,
  errorMessage,
  hooksHealthDir,
  isClaudeCodeHookInput,
  isoTimestamp,
  isMigrationExecutionCommand,
  isRejectedMigrationDispatch,
  readAllAuditShards,
  recordHookDrop,
  resolveProjectDirFromHook,
  harnessDir,
} from "../tools/amadeus-lib.ts";

const projectDir = resolveProjectDirFromHook(import.meta.url);

// 1. TTY guard — exit cleanly when invoked outside a piped stdin context
//    (interactive shell, test harness running under `bash -x`).
if (process.stdin.isTTY) process.exit(0);

// 2. Stdin parse — read JSON payload from Claude Code; exit on malformed.
const input = await Bun.stdin.text();
let parsed: ClaudeCodeHookInput;
try {
  const raw: unknown = JSON.parse(input);
  if (!isClaudeCodeHookInput(raw)) process.exit(0);
  parsed = raw;
} catch {
  process.exit(0);
}
const command: string = parsed.tool_input?.command ?? "";

// A rejected public migration dispatch is also terminal. It ran no utility, so
// the execution branch below cannot arm the Stop latch; without this response-
// checked seam an active Intent would make Stop consult a bare `next` and inject
// its pending stage after the engine had already returned the migration error.
// Arm only for the exact canonical dispatch plus an actual `error` directive.
// A valid `print` response remains unlatching so Stop still catches a conductor
// that fails to run the required dry-run.
if (isRejectedMigrationDispatch(command, parsed.tool_response, projectDir)) {
  armMigrationStopLatch(projectDir, parsed.session_id);
  process.exit(0);
}

// Workspace migration is a gated TERMINAL utility, not a workflow transition.
// Arm a session-scoped, one-shot Stop carve-out after the utility actually ran,
// then exit before ANY audit/heartbeat/runtime-graph work. Apply may have just
// made an active state visible, but migration's postcondition requires runtime
// scratch to stay absent and the same turn must not roll into its pending stage.
// A missing session id deliberately leaves no latch (fail closed).
if (isMigrationExecutionCommand(command, projectDir)) {
  armMigrationStopLatch(projectDir, parsed.session_id);
  process.exit(0);
}

// 3. Command filter — only dispatch on the audit-emit-side seam.
//    amadeus-runtime.ts is rejected explicitly (recursion guard at the
//    command level — a positive-only allowlist would let composites like
//    `bun amadeus-runtime.ts compile && bun amadeus-state.ts approve` through
//    and loop). amadeus-log.ts emits only chatty in-stage events
//    (DECISION_RECORDED / QUESTION_ANSWERED / ERROR_LOGGED), none
//    transition-class. amadeus-worktree.ts emits only WORKTREE_* events.
//    `amadeus-orchestrate.ts report` is included because the conductor calls it
//    as the public transition surface; the state-tool emit happens in its
//    subprocess, which PostToolUse cannot see as a separate Bash command.
const amadeusTransitionTool = /\bbun\b.*\.(?:claude|kiro|codex)\/tools\/amadeus-(state|jump|bolt|utility)\.ts\b/;
const amadeusOrchestrateReport = /\bbun\b.*\.(?:claude|kiro|codex)\/tools\/amadeus-orchestrate\.ts\b.*\breport\b/;
const amadeusRuntimeRef = /\bbun\b.*\.(?:claude|kiro|codex)\/tools\/amadeus-runtime\.ts\b/;
if (amadeusRuntimeRef.test(command)) process.exit(0);
if (!amadeusTransitionTool.test(command) && !amadeusOrchestrateReport.test(command)) process.exit(0);

// 4. Audit read — across EVERY per-clone shard of the ACTIVE intent, NOT this
//    hook process's own PID/clone shard. The state tool that wrote the
//    transition runs in a SEPARATE process; on the new layout a bare
//    auditFilePath(projectDir) would resolve a per-process/PID shard the hook
//    never wrote, so the transition would be invisible and the runtime-graph
//    would never refresh after a transition (the major). Resolve the active
//    intent (cursor / lone-intent → null = flat-legacy) and glob-merge its
//    shards. Exit cleanly before init (no audit yet → "").
const space = activeSpace(projectDir);
const intent = activeIntent(projectDir, space) ?? undefined;
const audit = readAllAuditShards(projectDir, intent, space).replace(/\r\n/g, "\n");
if (audit.length === 0) process.exit(0);

// 5. Heartbeat — doctor reads this file's mtime to detect silent-hook failure.
//    Kept at the bare (workspace-level) health dir to match where --doctor reads
//    it (amadeus-utility.ts) and where recordHookDrop writes drops — the heartbeat
//    is a per-hook liveness probe, not per-intent state.
const healthDir = hooksHealthDir(projectDir);
mkdirSync(healthDir, { recursive: true });
writeFileSync(join(healthDir, "runtime-compile.last"), isoTimestamp(), "utf-8");

// 6. Tail-read last 3 audit blocks. Three is the upper bound: a normal
//    approve writes GATE_APPROVED + STAGE_COMPLETED + STAGE_STARTED in
//    one Bash call. Terminal-WORKFLOW approve writes 5 rows; the last 3
//    are PHASE_COMPLETED + PHASE_VERIFIED + WORKFLOW_COMPLETED. In the common
//    single-clone case the merged buffer is one shard, so the last 3 blocks are
//    the just-written transition rows.
const blocks = audit.split(/\n---\n/);
const last3 = blocks.slice(-3);

// 7. Event-class filter — recursion guard + scope filter combined.
//    A single Bash call can append multiple transition rows in one go
//    (approve emits GATE_APPROVED + STAGE_COMPLETED + STAGE_STARTED).
//    Any of the last 3 blocks may carry the transition.
//    STAGE_AWAITING_APPROVAL is in the set so the compile refreshes the
//    runtime-graph at gate-start — without it, the gate ritual reads a
//    stale memory_entries count snapshotted at STAGE_STARTED time
//    (before the orchestrator wrote any §13 entries).
const transitionRegex = /^\*\*Event\*\*:\s*(GATE_APPROVED|STAGE_STARTED|STAGE_AWAITING_APPROVAL|AUDIT_MERGED|WORKFLOW_COMPLETED)\s*$/m;
const hasTransition = last3.some((b) => transitionRegex.test(b));
if (!hasTransition) process.exit(0);

// 8. Dispatch — sync subprocess. Hook waits for completion. On non-zero
//    exit, record the drop for `--doctor` to surface; never block the
//    parent Bash call (mirrors amadeus-audit-logger.ts:95-101).
const runtimeTs = join(projectDir, harnessDir(), "tools", "amadeus-runtime.ts");
try {
  const args = ["run", runtimeTs, "compile"];
  const result = spawnSync("bun", args, {
    cwd: projectDir,
    timeout: 30_000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    recordHookDrop(
      projectDir,
      "runtime-compile",
      `exit ${result.status}: ${result.stderr?.toString() ?? ""}`
    );
  }
} catch (e) {
  recordHookDrop(projectDir, "runtime-compile", errorMessage(e));
}
