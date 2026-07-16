# AI-DLC on Cursor

> Languages: **English** | [日本語](cursor.ja.md)

`dist/cursor/` is one of the framework's harness distributions, for the
**Cursor** harness. One deterministic core, many harnesses: the engine, state
machine, audit log, graph, swarm referee, and learnings gate are byte-identical
across every distribution — only the shell differs. The tree is **generated**
from `packages/framework/core/` + `packages/framework/harness/cursor/` by
`bun scripts/package.ts cursor`; never hand-edit it (the drift guard fails CI).

## Prerequisites

- **Cursor** — a release with the `.cursor/` rules, commands, and hooks surface.
- **bun** — same requirement as the Claude harness; every tool and hook runs
  via bun.
- **A model provider** — Cursor uses your normal configured provider and model.

## Install

There is **no installer** for this harness yet — copy the distribution into your
project manually (Issue [#1048](https://github.com/amadeus-dlc/amadeus/issues/1048)):

```bash
cp -r dist/cursor/.cursor/ your-project/.cursor/
cp -r dist/cursor/amadeus/ your-project/amadeus/    # the workspace shell — a sibling of .cursor/, not inside it
cp dist/cursor/AGENTS.md    your-project/AGENTS.md  # or merge into yours
cp -n your-project/.cursor/hooks.json.example your-project/.cursor/hooks.json
```

The `amadeus/` directory is the workspace shell — it ships the pre-built
`amadeus/spaces/default/memory/` method tree the engine reads. It is a
**sibling** of `.cursor/`, so copy it separately (or copy the whole
`dist/cursor/` tree at once). The always-applied `.cursor/rules/amadeus.mdc`
points Cursor at that method chain.

## Use

Invoke the orchestrator with the `/amadeus` command (authored at
`.cursor/commands/amadeus.md`) followed by a scope or description. It runs the
same deterministic forwarding loop as every other harness. `AGENTS.md` carries
the session-resume onboarding a returning session reads.

## What ships (feature units)

| Unit | Status |
| --- | --- |
| Distribution | `dist/cursor/` — manual placement, no installer ([#1048](https://github.com/amadeus-dlc/amadeus/issues/1048)) |
| Rules | `.cursor/rules/amadeus.mdc` (always-applied method pointer) |
| Orchestrator | `.cursor/commands/amadeus.md` (the `/amadeus` command) |
| Onboarding | `AGENTS.md` (session-resume path) |
| Hooks | `.cursor/hooks.json.example` wires 8 events through the adapter (see below) |
| `promote:self` | Not applicable to this harness |

## Hook wiring

The shipped `hooks.json.example` wires 8 Cursor events through the
`.cursor/hooks/amadeus-cursor-adapter.ts` adapter:

| Cursor event | Adapter verb → framework hook |
| --- | --- |
| `sessionStart` | `session-start` |
| `beforeSubmitPrompt` | `mint` (presence) |
| `afterShellExecution` | `runtime-compile` |
| `afterFileEdit` | `audit-and-sensors` |
| `subagentStop` | `log-subagent` |
| `preCompact` | `validate-state` |
| `stop` | `stop` (advisory, exit 0 fixed — the block-wire contract is unverified) |
| `sessionEnd` | `session-end` |

A **generic `postToolUse` is NOT shipped**: Cursor's documented `tool_name`
value set is not independently verifiable and its per-tool `tool_input` shape is
undocumented, so a generic wire would risk a silent no-op false-green. Only
Cursor-specific events that carry a documented payload are wired. The adapter's
`ToolNameMap` is `{ afterShellExecution: "Bash", afterFileEdit: "Edit" }`;
unregistered identifiers are advisory-rejected (exit 2 is not used).

**Adapter exit semantics** (Cursor's contract): exit 0 adopts stdout, exit 2
denies (not used here), any other code fails open. The adapter's
`EXIT_ADVISORY_FAIL` is 1.

## Harness differences vs Claude Code

- **No generic tool hook**: only the documented Cursor events above are wired;
  there is no catch-all `postToolUse`.
- **`/amadeus --version`** reports `amadeus 0.1.2` (exit 0).
- **`/amadeus --doctor`** reports 30 pass + 1 environment-driven fail (a missing
  `settings.json` in a scratch project) — the fail is environmental, not a
  correctness defect.

## Regenerating

```bash
bun scripts/package.ts cursor        # regenerate dist/cursor from packages/framework/core + harness/cursor
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
