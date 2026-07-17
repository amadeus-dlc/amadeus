// harness/cursor/emit.ts — the Cursor IDE per-shell emission plugin (U3 port).
//
// The unified packager copies core/ → dist/cursor/.cursor/ (rules → amadeus-rules)
// and runs graph compile, then calls this emit() for the four cursor-specific
// surfaces that are CODE/prose, not core-projected data:
//   (i)   .cursor/rules/amadeus.mdc     — the always-applied pointer rule
//   (ii)  .cursor/hooks.json.example    — the adapter hook wiring
//   (iii) AGENTS.md (dist ROOT)         — the Cursor onboarding doc
//   (iv)  .cursor/commands/amadeus.md   — the orchestrator-forwarding command
//
// Modeled on codex emit.ts (hooks.json + AGENTS.md + emission table) and
// opencode emit.ts (single authored command via ctx.readHarnessSource). The
// write⇔check symmetry is byte-identical in shape to codex emit.ts:348-367 /
// opencode emit.ts — one emissions table, one write branch, one check branch.
//
// Error policy: FAIL-FAST — I/O failures (readFileSync / writeFileSync) propagate
// as thrown errors rather than being swallowed; the check branch reports
// MISSING/DIFFERS via the returned EmitResult.problems. No error is smoothed over.
//
// ── 工程0 external measurement (Cursor hooks docs, retrieved 2026-07-16) ──
// Source: https://cursor.com/docs/hooks (official). Cross-check attempted
// against github.com/johnlindquist/cursor-hooks — that repo reflects an OLDER
// API revision (6 events, no preToolUse/postToolUse, no tool_name enum), so the
// generic postToolUse tool_name value set could NOT be corroborated verbatim.
//
// (a) tool_name value set: the official docs DO describe preToolUse/postToolUse
//     with a `tool_name` field {Shell, Read, Write, Grep, Delete, Task, MCP:*},
//     BUT the per-tool `tool_input` internal shape (does Shell carry .command?
//     does Write carry .file_path?) is UNDOCUMENTED and uncorroborated. Wiring a
//     generic postToolUse + matcher whose reconstruction target we cannot verify
//     would risk a SILENT core-hook no-op (偽グリーン). So this skeleton does NOT
//     ship generic postToolUse+matcher entries. Instead it wires Cursor's
//     DEDICATED tool-observation events, whose payload fields ARE documented
//     verbatim and are exactly what the core hooks consume:
//       afterShellExecution → `command`      → runtime-compile (tool_input.command)
//       afterFileEdit       → `file_path`    → audit-and-sensors (tool_input.file_path)
//     The adapter's ToolNameMap normalizes these Cursor tool-EVENT identities to
//     Claude tool_name vocab (afterShellExecution→Bash, afterFileEdit→Edit); an
//     unregistered identity is rejected advisory (never denied). No matcher =
//     no silent matcher-mismatch class.
// (b) exit semantics (re-confirmed 2026-07-16): exit 0 = use stdout JSON; exit 2
//     = deny (permission:deny equivalent); other = fail-open UNLESS the entry sets
//     failClosed:true (default false). Unchanged from the prior 2026-07-16
//     record — still fail-open, so no implementation-stop condition triggered.
//     The tool_name-INDEPENDENT events (sessionStart / beforeSubmitPrompt / stop /
//     sessionEnd) ship on (b) alone; subagentStop + preCompact ship on their
//     documented payloads. The adapter NEVER emits exit 2 (see the shim).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { EmitContext, EmitResult } from "../../../../scripts/manifest-types.ts";

// ---------------------------------------------------------------------------
// Hook wiring (kiro-normative shape: register ONLY events with a real core-hook
// consumer via the adapter target; unverified surfaces ship unregistered). Each
// entry is a Cursor event → adapter target; every target reconstructs the exact
// stdin the named core hook consumes. See the adapter shim for the per-target
// reconstruction + the 工程0 rationale for why the tool-observation events are
// the dedicated ones (afterShellExecution / afterFileEdit), not generic
// postToolUse+matcher.
// ---------------------------------------------------------------------------
const HOOK_WIRING: ReadonlyArray<{ event: string; target: string }> = [
  { event: "sessionStart", target: "session-start" }, // (b) independent
  { event: "beforeSubmitPrompt", target: "mint" }, // documented `prompt`
  { event: "afterShellExecution", target: "runtime-compile" }, // documented `command`
  { event: "afterFileEdit", target: "audit-and-sensors" }, // documented `file_path`
  { event: "subagentStop", target: "log-subagent" }, // documented `subagent_type`
  { event: "preCompact", target: "validate-state" }, // independent (no stdin fields)
  { event: "stop", target: "stop" }, // (b) independent
  { event: "sessionEnd", target: "session-end" }, // documented `reason`
];

const ADAPTER_CMD = (target: string) => `bun .cursor/hooks/amadeus-cursor-adapter.ts ${target}`;

// Cursor hooks.json schema (工程0): {version:1, hooks:{<event>:[{type,command}]}}.
function emitHooksJson(): string {
  const hooks: Record<string, Array<{ type: string; command: string }>> = {};
  for (const { event, target } of HOOK_WIRING) {
    hooks[event] ??= [];
    hooks[event].push({ type: "command", command: ADAPTER_CMD(target) });
  }
  return `${JSON.stringify({ version: 1, hooks }, null, 2)}\n`;
}

// .cursor/rules/amadeus.mdc — ONE always-applied Cursor rule (.cursor/rules/ is
// Cursor's native .mdc rule dir) that POINTS AT the method chain
// (org→team→project→phases); it does NOT duplicate any rule body. The method is
// the single hand-editable source of truth at the workspace root under
// amadeus/spaces/<space>/memory/ (harness-neutral; NOT copied per-harness).
function emitRuleMdc(): string {
  return `---
description: AI-DLC (Amadeus) method — always-applied pointer to the layered rule chain.
alwaysApply: true
---

# AI-DLC method (Amadeus)

This project runs the AI-DLC workflow. The method — the layered rule files
\`org.md\` → \`team.md\` → \`project.md\` → \`phases/<phase>.md\` — is authored once at
the workspace root under \`amadeus/spaces/<space>/memory/\`, the single
hand-editable source of truth shared by every harness. Read that chain (in that
additive order) as the governing rules for every stage; do NOT restate the rules
here.

To start, resume, or manage the workflow, run the \`/amadeus\` command
(\`.cursor/commands/amadeus.md\`), which forwards to the deterministic
orchestration engine at \`.cursor/tools/amadeus-orchestrate.ts\`.
`;
}

// AGENTS.md at the dist ROOT (beside .cursor/) — the Cursor onboarding doc.
// English (project language rule: docs default to English). Cursor-specific
// prose with literal .cursor paths, so no token substitution is applied.
function emitAgentsMd(): string {
  return `# AI-DLC (Amadeus) — Cursor harness

This project uses AI-DLC (AI-Driven Development Life Cycle) for structured,
engine-driven development. Cursor is one of several supported harnesses; the
harness-neutral method and tools live under \`.cursor/\` and \`amadeus/\`.

## Getting started

Run the \`/amadeus\` command (defined at \`.cursor/commands/amadeus.md\`) followed by
a scope or a description of what to build. It runs a deterministic loop against
the orchestration engine (\`.cursor/tools/amadeus-orchestrate.ts\`): ask what to do
next, do that one thing, report the outcome, repeat until done. The engine owns
all between-stage routing — never re-derive it in prose.

## The method

The rule layers — \`org.md\` → \`team.md\` → \`project.md\` → \`phases/<phase>.md\` —
are authored once at the workspace root under \`amadeus/spaces/<space>/memory/\`.
The always-applied \`.cursor/rules/amadeus.mdc\` points Cursor at that chain. Edit
the method at the workspace root; it is the single hand-editable source of truth,
identical on every harness.

## Hooks (optional)

\`.cursor/hooks.json.example\` wires Cursor's agent-lifecycle hooks to the
\`amadeus-cursor-adapter.ts\` shim, which normalizes each Cursor payload and pipes
it into the byte-shared core hooks (audit, sensors, runtime compile, presence
mint, state validation, session lifecycle). Copy it to \`.cursor/hooks.json\` to
enable them. The hooks are ADVISORY: a failure never blocks your turn, and the
adapter never denies an action.

## Prerequisites

- **bun**: the engine, tools, and hook adapter all run via \`bun\`. Install from
  https://bun.sh and ensure it is on your PATH for non-interactive shells.
`;
}

// ---------------------------------------------------------------------------
// emit() — assemble the four emissions, then write (or, under check, diff) them.
// Same write⇔check symmetry as codex emit.ts:348-367 / opencode emit.ts.
// ---------------------------------------------------------------------------
export default function emit(ctx: EmitContext): EmitResult {
  const { distRoot } = ctx;
  const DCURSOR = join(distRoot, ".cursor"); // dist/cursor/.cursor

  const emissions: Array<{ path: string; content: () => string }> = [
    { path: join(DCURSOR, "rules", "amadeus.mdc"), content: emitRuleMdc },
    { path: join(DCURSOR, "hooks.json.example"), content: emitHooksJson },
    { path: join(distRoot, "AGENTS.md"), content: emitAgentsMd },
    {
      // AUTHORED prose, read through ctx.readHarnessSource so it counts as a
      // referenced source in the packager's unreferenced-source scan (#735).
      path: join(DCURSOR, "commands", "amadeus.md"),
      content: () => ctx.readHarnessSource(join("commands", "amadeus.md")),
    },
  ];

  const written: string[] = [];
  const problems: string[] = [];
  if (ctx.check) {
    for (const { path, content } of emissions) {
      const want = content();
      if (!existsSync(path)) problems.push(`MISSING emission: ${relative(distRoot, path)}`);
      else if (readFileSync(path, "utf-8") !== want) problems.push(`DIFFERS emission: ${relative(distRoot, path)}`);
      written.push(path);
    }
  } else {
    for (const { path, content } of emissions) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content(), "utf-8");
      written.push(path);
    }
  }
  return { written, problems };
}
