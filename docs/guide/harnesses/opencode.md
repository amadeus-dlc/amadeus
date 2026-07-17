# AI-DLC on OpenCode

> Languages: **English** | [日本語](opencode.ja.md)

`dist/opencode/` is one of the framework's harness distributions, for the
**OpenCode** harness. One deterministic core, many harnesses: the engine, state
machine, audit log, graph, swarm referee, and learnings gate are byte-identical
across every distribution — only the shell differs. The tree is **generated**
from `packages/framework/core/` + `packages/framework/harness/opencode/` by
`bun scripts/package.ts opencode`; never hand-edit it (the drift guard fails CI).

## Prerequisites

- **OpenCode** — a recent release with the `.opencode/` command, agent, and
  config surface.
- **bun** — same requirement as the Claude harness; every tool and hook runs
  via bun.
- **A model provider** — OpenCode uses your normal configured provider and
  model. The shipped `opencode.json.example` pins neither.

## Install

There is **no installer** for this harness yet — copy the distribution into your
project manually (Issue [#1048](https://github.com/amadeus-dlc/amadeus/issues/1048)):

```bash
cp -r dist/opencode/.opencode/ your-project/.opencode/
cp -r dist/opencode/amadeus/   your-project/amadeus/    # the workspace shell — a sibling of .opencode/, not inside it
cp dist/opencode/AGENTS.md      your-project/AGENTS.md  # or merge into yours
cp -n your-project/.opencode/opencode.json.example your-project/.opencode/opencode.json
```

The `amadeus/` directory is the workspace shell — it ships the pre-built
`amadeus/spaces/default/memory/` method tree the engine reads. It is a
**sibling** of `.opencode/`, so copy it separately (or copy the whole
`dist/opencode/` tree at once).

OpenCode's default permission is allow-all. The shipped `opencode.json.example`
narrows `edit`, `bash`, and `webfetch` to `ask`; applying the example is
recommended so gate-relevant actions surface a prompt.

## Use

Invoke the orchestrator with the `$amadeus` command (authored at
`.opencode/commands/amadeus.md`) followed by a scope or description. It runs the
same deterministic forwarding loop as every other harness. `AGENTS.md` carries
the session-resume onboarding a returning session reads.

## What ships (feature units)

| Unit | Status |
| --- | --- |
| Distribution | `dist/opencode/` — manual placement, no installer ([#1048](https://github.com/amadeus-dlc/amadeus/issues/1048)) |
| Orchestrator | `.opencode/commands/amadeus.md` (the `$amadeus` command) |
| Onboarding | `AGENTS.md` (session-resume path) |
| Config example | `.opencode/opencode.json.example` — `$schema` + permission narrowing (`edit`/`bash`/`webfetch` = `ask`) |
| Session skills | 4 (`session-cost`, `replay`, `outcomes-pack`, `grilling`) — the 32 per-stage runners are out of initial scope |
| Hooks | **Not wired (0 of 8)** — the 工程0 mapping ([#1049](https://github.com/amadeus-dlc/amadeus/issues/1049)) measured every Cursor-parity core-hook target against OpenCode's JS plugin API: **0 wired · 5 conditional · 3 unsupported**. See [Hook mapping](#hook-mapping-1049) below |
| `promote:self` | Not applicable to this harness |

## Harness differences vs Claude Code

- **No hooks wired**: OpenCode has no shell-command hook mechanism — its
  extension surface is JS plugins. Audit emission, sensor firing, and presence
  minting that ride hooks on other harnesses are **not active** here. The 工程0
  mapping ([#1049](https://github.com/amadeus-dlc/amadeus/issues/1049)) measured
  the plugin API and wired none of the eight targets; see [Hook mapping](#hook-mapping-1049).
- **`$amadeus --version`** reports `amadeus 0.1.2` (exit 0).
- **`$amadeus --doctor`** degrades to advisory only — it misfires the `.claude`
  prerequisite block and does not enumerate other worktrees, neither of which
  affects correctness.
- **Session skills only**: the four read-only session skills ship; the per-stage
  runners are excluded from the initial scope.

## Hook mapping (#1049)

The 工程0 measurement classified each of the eight Cursor-parity core-hook
targets against OpenCode's plugin API by reading the installed type
definitions verbatim. **Measured 2026-07-17 against `@opencode-ai/plugin@1.18.3`
(and its `@opencode-ai/sdk@1.18.3` dependency).**

| Cursor target | OpenCode status | Confirmation condition / rationale |
| --- | --- | --- |
| audit-and-sensors | ⚠ conditional | `tool.execute.after` seam confirmed, but the tool vocabulary (`ToolIds = Array<string>`, no enum) and `args` shape (`args: any`) are untyped — needs live-runtime measurement (a follow-up intent) |
| runtime-compile | ⚠ conditional | same as above (`tool.execute.after`, untyped vocabulary/args) |
| session-start | ⚠ conditional | `event` (`session.created`) carries no `source` field and OpenCode has no `additionalContext` injection seam; side-effect-only wiring was declined (no false parity) |
| session-end | ⚠ conditional | `event` (`session.deleted`) / `dispose` carry no `reason` and differ in meaning from a session ending; side-effect-only wiring declined |
| validate-state | ⚠ conditional | `event` (`session.compacted`) fires **after** compaction; the core hook is a **pre**-compact validator — timing is inverted |
| mint (HUMAN_TURN) | ❌ unsupported | Held **fail-closed** to block a phantom HUMAN_TURN: `UserMessage` has no machine-injection marker field, and whether an AskUserQuestion answer flows through `chat.message` is unverified. Human-presence keeps the current delegate flow |
| log-subagent | ❌ unsupported | No event carries a subagent-stop signal with `agent_type` / `agent_id` |
| stop | ❌ unsupported | No turn-end gate event (`session.idle` is idle-transition, not a turn boundary) |

The five conditional rows all block on the same missing fact — OpenCode's tool
vocabulary and `args` shape are untyped, so they need live-runtime measurement,
deferred to a follow-up intent. The full evidence (verbatim type citations per
row) lives in the intent record's `mapping-table.md`.

## Regenerating

```bash
bun scripts/package.ts opencode      # regenerate dist/opencode from packages/framework/core + harness/opencode
bun scripts/package.ts --check       # CI drift guard (every harness)
```

## Next steps

The methodology is the same on every harness — keep going with the neutral
chapters:

- [Your First Workflow](../02-your-first-workflow.md) — an annotated end-to-end run.
- [Phases and Stages](../04-phases-and-stages.md) — the 5 phases and 32 stages.
- [Scopes, Depth, and Test Strategy](../05-scopes-and-depth.md) — right-sizing a run.
- [Glossary](../glossary.md) — every term defined.

Other harnesses: [the harness family index](README.md).
