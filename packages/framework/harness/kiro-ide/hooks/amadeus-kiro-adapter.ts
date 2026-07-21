#!/usr/bin/env bun
// amadeus-kiro-adapter.ts — the Kiro IDE hook shim (AUTHORED shell file; the
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
//                  state-sync | log-subagent | stop

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  activeIntent,
  activeSpace,
  hasOpenGate,
  hooksHealthDir,
  humanActedSinceGate,
  humanPresenceGuardDisabled,
  isAutonomousMode,
  isMachineInjectedTurnText,
  readAllAuditShards,
  recordHookDrop,
  resolveProjectDirFromHook,
  stateFilePath,
} from "../tools/amadeus-lib.ts";
import { appendAuditEntry } from "../tools/amadeus-audit.ts";
import { isSubagentTool, parseKiroIdeHookContext } from "./amadeus-kiro-vocab.ts";
import { spawnHookWithRuntime } from "./amadeus-kiro-hook-runtime.ts";

const HOOKS_DIR = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] ?? "";

const rawUserPrompt = process.env.USER_PROMPT;
const parsedContext = parseKiroIdeHookContext(rawUserPrompt);
const kiro = parsedContext.kind === "ok" ? parsedContext.value : {};
const projectDir = resolveProjectDirFromHook(import.meta.url);

function debugEnabled(): boolean {
  if (process.env.AMADEUS_KIRO_IDE_HOOK_DEBUG === "1") return true;
  try {
    return statSync(join(projectDir, "amadeus", ".amadeus-hook-debug")).isFile();
  } catch {
    return false;
  }
}

function debug(message: string): void {
  if (!debugEnabled()) return;
  try {
    const healthDir = hooksHealthDir(projectDir);
    mkdirSync(healthDir, { recursive: true });
    appendFileSync(join(healthDir, "hook-debug.log"), `${message}\n`, "utf8");
  } catch {
    // Debug output is optional and must never affect hook behavior.
  }
}

debug(`target=${target} context=${parsedContext.kind}`);

// --- mint: record a HUMAN_TURN event on prompt submit ---
//
// Wired by amadeus-mint.kiro.hook (promptSubmit). Kiro IDE supplies the raw
// prompt in USER_PROMPT. Classify that text through the shared predicate before
// minting so machine-injected turns cannot create phantom HUMAN_TURN entries.
// JSON tool contexts belong to the other hook targets and are deliberately not
// inspected for nested prompt fields. Missing input fails open, matching the core
// mint hook. The on-disk state self-gate prevents scaffolding outside workflows,
// and all failures remain advisory.
if (target === "mint") {
  try {
    const machineInjected =
      parsedContext.kind !== "ok" &&
      typeof rawUserPrompt === "string" &&
      isMachineInjectedTurnText(rawUserPrompt);
    if (existsSync(stateFilePath(projectDir)) && !machineInjected) {
      appendAuditEntry("HUMAN_TURN", {}, projectDir);
    }
  } catch {
    /* advisory - mint never blocks the turn */
  }
  process.exit(0);
}

// --- block: the preToolUse human-presence floor ---
//
// Wired by amadeus-block.kiro.hook (preToolUse). Hard-blocks tool calls ONLY while
// an approval gate is actually OPEN (a stage sits at [?] in the state file) and
// no HUMAN_TURN has been recorded since the last gate resolution - the exit-2
// floor behind the core handleApprove check. The gate-open predicate is
// load-bearing: after a legitimate approval the resolution follows the turn's
// HUMAN_TURN, and without it the floor would block the mandated same-turn
// continuation into the next stage. Carve-outs mirror the core gate: autonomous
// Construction (swarm/Bolt has no human at the gate) and the deterministic
// off-switch. All read from disk (empty stdin is fine). Fail-open on any
// read/parse error (advisory).
if (target === "block") {
  try {
    const pd = projectDir;
    const sp = stateFilePath(projectDir);
    const content = existsSync(sp) ? readFileSync(sp, "utf-8") : null;
    // Carve-outs first: autonomous Construction, the deterministic off-switch,
    // and no-open-gate (nothing awaits approval, so nothing to floor).
    if (isAutonomousMode(content)) process.exit(0);
    if (humanPresenceGuardDisabled()) process.exit(0);
    if (!hasOpenGate(content)) process.exit(0);
    if (humanActedSinceGate(pd)) process.exit(0); // a human acted at this gate
    process.stderr.write(
      "An approval gate is open and no human has acted since it opened. The gate " +
        "requires a typed human turn before any tool call proceeds. Acknowledge the " +
        "gate as a human, then continue.\n",
    );
    process.exit(2); // Kiro reject contract: exit 2 + stderr BLOCKS the tool call.
  } catch {
    process.exit(0); // advisory - any read/parse failure fails open
  }
}

// Normalize Kiro's alias tool names to the canonical names the core hooks
// match on. Both alias and canonical forms are accepted defensively.
function canonicalTool(name: string): string {
  if (name === "write" || name === "fs_write") return "Write";
  if (name === "str_replace" || name === "fs_append") return "Edit";
  if (name === "shell" || name === "execute_bash") return "Bash";
  return name;
}

function writtenPath(toolName: string, result: string): string | null {
  const trimmed = result.trim();
  const match =
    toolName === "fs_write" || toolName === "write"
      ? trimmed.match(/^Created the (.+) file\.$/)
      : toolName === "fs_append"
        ? trimmed.match(/^Appended the text to the (.+) file\.$/)
        : toolName === "str_replace"
          ? trimmed.match(/^Replaced text in (.+?)(?: \([^\r\n)]+\))?\.?$/)
          : null;
  const path = match?.[1]?.trim() ?? "";
  return path.length > 0 ? path : null;
}

function realPathIncludingMissing(candidate: string): string {
  let existing = resolve(candidate);
  const missing: string[] = [];
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) return resolve(candidate);
    missing.unshift(basename(existing));
    existing = parent;
  }
  return resolve(realpathSync(existing), ...missing);
}

function containedProjectPath(candidate: string): string | null {
  const root = realPathIncludingMissing(projectDir);
  const path = isAbsolute(candidate) ? candidate : resolve(projectDir, candidate);
  const fromRoot = relative(root, realPathIncludingMissing(path));
  if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) return null;
  return path;
}

function agentIdentity(result: string): string {
  for (const line of result.split(/\r?\n/).slice(0, 8)) {
    const match = line.match(
      /^\s*(?:[-*]\s*)?\*{0,2}(?:Reviewer|Agent)(?::\*{0,2}|\*{0,2}\s*:)\s*(.+?)\s*$/i,
    );
    const identity = match?.[1]?.replace(/\*+$/, "").trim() ?? "";
    if (identity.length > 0) return identity;
  }
  return "unknown";
}

function latestUnfinishedStartedStage(): string | null {
  let state: string;
  try {
    state = readFileSync(stateFilePath(projectDir), "utf8");
  } catch {
    return null;
  }
  if (/^- \*\*Status\*\*:\s*(?:Completed|Complete|Paused|Parked)\s*$/im.test(state)) {
    return null;
  }
  if (/^- \*\*Runtime State\*\*:\s*Parked\s*$/im.test(state)) return null;
  if (/^- \*\*Parked At Stage\*\*:\s*\S+\s*$/im.test(state)) return null;

  const space = activeSpace(projectDir);
  const intent = activeIntent(projectDir, space) ?? undefined;
  const candidates = readAllAuditShards(projectDir, intent, space)
    .split(/\n---\n/)
    .flatMap((block) => {
      if (!/^\*\*Event\*\*:\s*STAGE_STARTED\s*$/m.test(block)) return [];
      const stage = block.match(/^\*\*Stage\*\*:\s*([a-z][a-z0-9-]*)\s*$/m)?.[1];
      const timestamp = block.match(/^\*\*Timestamp\*\*:\s*(\S+)\s*$/m)?.[1];
      return stage && timestamp ? [{ stage, timestamp }] : [];
    })
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const stage = candidates.at(-1)?.stage;
  if (!stage) return null;
  const escaped = stage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const checkbox = state.match(new RegExp(`^- \\[([^\\]]+)\\] ${escaped} —`, "m"))?.[1];
  return checkbox === "x" || checkbox === "S" || checkbox === undefined ? null : stage;
}

type Forward = { hook: string; input: Record<string, unknown> } | null;

function buildForward(): Forward {
  const toolName = kiro.toolName ?? "";
  const tool = canonicalTool(toolName);

  switch (target) {
    case "session-start":
      // agentSpawn carries no source discrimination — every spawn is a
      // startup from the core hook's perspective; its state-file self-gate
      // makes this a no-op outside active workflows.
      return {
        hook: "amadeus-session-start.ts",
        input: { hook_event_name: "SessionStart", source: "startup" },
      };

    case "audit-and-sensors": {
      if (tool !== "Write" && tool !== "Edit") return null;
      if (kiro.toolSuccess !== true) return null;
      const extracted = writtenPath(toolName, kiro.toolResult ?? "");
      if (extracted === null) {
        recordHookDrop(
          projectDir,
          "kiro-ide-adapter",
          `audit-and-sensors: successful ${toolName || "unknown"} result did not match a known path form`,
        );
        return null;
      }
      const filePath = containedProjectPath(extracted);
      if (filePath === null) {
        recordHookDrop(
          projectDir,
          "kiro-ide-adapter",
          `audit-and-sensors: ${toolName || "unknown"} path is outside project root`,
        );
        return null;
      }
      return {
        hook: "__audit_and_sensors__", // handled specially below (two hooks)
        input: {
          hook_event_name: "PostToolUse",
          tool_name: tool,
          tool_input: { file_path: filePath },
        },
      };
    }

    case "runtime-compile": {
      return {
        hook: "amadeus-runtime-compile.ts",
        input: {
          hook_event_name: "PostToolUse",
          tool_name: "Bash",
          tool_input: { source: "ide-audit-sync" },
        },
      };
    }

    case "state-sync": {
      const stage = latestUnfinishedStartedStage();
      if (stage === null) return null;
      return {
        hook: "amadeus-sync-statusline.ts",
        input: {
          hook_event_name: "PostToolUse",
          tool_name: "TaskUpdate",
          tool_input: { status: "in_progress", activeForm: `Running stage [${stage}]` },
        },
      };
    }

    case "log-subagent": {
      if (!isSubagentTool(toolName)) return null;
      if (kiro.toolSuccess !== true) return null;
      const result = kiro.toolResult ?? "";
      return {
        hook: "amadeus-log-subagent.ts",
        input: {
          hook_event_name: "SubagentStop",
          agent_type: agentIdentity(result),
          last_assistant_message: result.slice(0, 200),
        },
      };
    }

    case "stop":
      // Kiro provides no stop_hook_active signal; the core hook's own
      // 8-block no-progress ceiling is the loop guard (it defaults the flag
      // to false). The {"decision":"block"} stdout contract is identical.
      return {
        hook: "amadeus-stop.ts",
        input: {
          hook_event_name: "Stop",
          stop_hook_active: false,
        },
      };

    case "session-end":
      return {
        hook: "amadeus-session-end.ts",
        input: { hook_event_name: "SessionEnd", reason: "agent_stop" },
      };

    default:
      return null;
  }
}

function runCore(hookFile: string, input: Record<string, unknown>): { stdout: string; code: number } {
  const r = spawnHookWithRuntime([join(HOOKS_DIR, hookFile)], {
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
