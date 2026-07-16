# AI-DLC on OpenCode

This project runs AI-DLC (AI-Driven Development Life Cycle) under the OpenCode
harness. The deterministic engine, state machine, audit log, and referee are
byte-identical to every other harness distribution; only the shell differs.

## Starting a workflow

Invoke the orchestrator with the `$amadeus` command (authored at
`.opencode/commands/amadeus.md`) followed by a scope or a description of
what to build. It runs a deterministic forwarding loop: ask the engine what to
do next, do that one thing, report the outcome, repeat until the workflow is
done. Utility invocations pass through to the same engine —
`$amadeus --status` for progress, `$amadeus --doctor` to validate setup,
`$amadeus --version` for the framework version, and
`$amadeus --stage <slug>` / `--phase <name>` / `--depth <level>` for the
usual overrides.

## Session resumption

On startup, resolve the active intent (the
`amadeus/spaces/<space>/intents/active-intent` cursor) and check for its
`<record>/amadeus-state.md`. If found, load the prior context and offer to
resume from the last checkpoint. A brand-new workspace has no intent yet — the
engine auto-births the first one on your first `$amadeus`.

## The AI-DLC method is canonical

The layered practice files — `org.md`, `team.md`, `project.md`, and the
per-phase `phases/<phase>.md` — are the canonical AI-DLC governance for every
stage. They are authored ONCE at the workspace root under
`amadeus/spaces/<space>/memory/` (the single hand-editable source of truth,
identical on every harness) and are the rules this harness reads under the
`.opencode/amadeus-rules/` name (the harness's markdown rule layers,
kept separate from any native tool config). Resolution is a strict-additive
chain — `org → team → project → phase → stage`. Edit the method at the
workspace root, never a per-harness copy.

## Permissions

OpenCode defaults most permissions to `allow`. The shipped
`opencode.json.example` is a NARROWING starting point — it sets
`edit`/`bash`/`webfetch` to `ask` so nothing runs without approval. Copy
it to `opencode.json` and tighten or grant per your team's posture; the
deterministic core runs via `bun .opencode/tools/…` and
`bun .opencode/hooks/…`, which you can allow explicitly once you trust
the tree.
