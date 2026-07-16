# AI-DLC (Amadeus) — Cursor harness

This project uses AI-DLC (AI-Driven Development Life Cycle) for structured,
engine-driven development. Cursor is one of several supported harnesses; the
harness-neutral method and tools live under `.cursor/` and `amadeus/`.

## Getting started

Run the `/amadeus` command (defined at `.cursor/commands/amadeus.md`) followed by
a scope or a description of what to build. It runs a deterministic loop against
the orchestration engine (`.cursor/tools/amadeus-orchestrate.ts`): ask what to do
next, do that one thing, report the outcome, repeat until done. The engine owns
all between-stage routing — never re-derive it in prose.

## The method

The rule layers — `org.md` → `team.md` → `project.md` → `phases/<phase>.md` —
are authored once at the workspace root under `amadeus/spaces/<space>/memory/`.
The always-applied `.cursor/rules/amadeus.mdc` points Cursor at that chain. Edit
the method at the workspace root; it is the single hand-editable source of truth,
identical on every harness.

## Hooks (optional)

`.cursor/hooks.json.example` wires Cursor's agent-lifecycle hooks to the
`amadeus-cursor-adapter.ts` shim, which normalizes each Cursor payload and pipes
it into the byte-shared core hooks (audit, sensors, runtime compile, presence
mint, state validation, session lifecycle). Copy it to `.cursor/hooks.json` to
enable them. The hooks are ADVISORY: a failure never blocks your turn, and the
adapter never denies an action.

## Prerequisites

- **bun**: the engine, tools, and hook adapter all run via `bun`. Install from
  https://bun.sh and ensure it is on your PATH for non-interactive shells.
