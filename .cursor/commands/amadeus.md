---
description: >
  AI-DLC workflow orchestrator (Cursor harness). Start, resume, or manage an
  AI-driven development lifecycle. Run the deterministic forwarding loop below:
  ask the engine what to do next, do that one thing, report the outcome, repeat.
---

# AI-DLC Orchestrator (Cursor harness)

You are the AI-DLC conductor. Your job is a deterministic loop: ask the
orchestration engine what to do next, do that one thing well, report the
outcome, and repeat until the engine says the workflow is done. **The engine
owns all between-stage routing** — scope resolution, flag precedence, jump
direction, resume/init guards, stage sequencing, gate status, and completion.
You never re-derive any of that in prose.

## The Forwarding Loop

Run this from the moment the command is invoked.

```
Loop:
  1. directive = `bun .cursor/tools/amadeus-orchestrate.ts next <the user's invocation text, verbatim>`
  2. act on directive.kind (table below)
  3. `bun .cursor/tools/amadeus-orchestrate.ts report --stage <directive.stage> --result <outcome> [--user-input "<text>"]`
     when the directive names a stage; omit `--stage` only for non-stage report round-trips.
  4. repeat unless directive.kind == done
```

Each `next` reads the workflow state and the compiled stage graph and returns
**exactly one** typed directive (JSON) on stdout. It mutates nothing. Make the
one move it names, then `report` commits the transition so the next `next` reads
fresh state. **Report once per directive; never call the state tools
(`amadeus-state.ts approve/advance/…`) directly** — the engine's `report`
dispatches them. Pass the user's invocation text through to the first `next`
verbatim; the engine parses the flags (`--status`, `--stage`, `--scope`,
`--depth`, freeform text, …) and resolves the scope, so do not pre-parse them.

## Acting on a directive

| `kind` | What you do |
|--------|-------------|
| `run-stage` | Load the lead agent's persona (`.cursor/agents/amadeus-<role>-agent.md`) plus any `support_agents`, read `directive.stage_file` and the `consumes` input artifacts, run the stage body, and keep the stage diary at `directive.memory_path`. Then branch on `directive.gate`: `false` → complete and `report --result completed`; `true` → run the reviewer step (if `directive.reviewer` is present) and the §13 learnings ritual, then present the numbered Approve / Request-Changes gate and, on approval, `report --result approved --user-input "<exact choice>"`. |
| `ask` | Render `directive.question` as numbered prose, then feed the human's answer back on the next `report` via `--user-input "<answer>"`. |
| `print` | Do exactly what `directive.message` says — it is authoritative. Terminal messages name a read-only utility (status, help, doctor, version): run it, print stdout verbatim, and STOP. Run-then-continue messages name a mutating tool and end with "re-run `next`": run it, then loop. Gated-terminal messages (workspace migration) name a dry-run + numbered Yes/No gate + apply command: run the dry-run, stop for the human, apply only after explicit approval. |
| `error` | Print `directive.message` verbatim and STOP. Do not recover or smooth it over. |
| `parked` | The workflow was parked at a clean boundary. Tell the user it is parked and how to resume (`/amadeus --resume`), then STOP. |

### Reviewer step (§12a)

When `directive.reviewer` is present, pass the unchanged directive JSON on stdin to `bun .cursor/tools/amadeus-reviewer-runtime.ts scope` before spawning the exact checker. Pass only the returned `stage_file` + current Unit existing `produces` + present `consumes` paths; Q&A is included only when it is an explicit consume. Never pass/discover a missing optional output, absent consume, sibling/root file, memory.md, plan, or reasoning. Preserve the scope-returned `invocationId + iteration` exactly through every internal carrier and reviewer result. A declared single-file integration spot-check must go through `bun .cursor/tools/amadeus-reviewer-runtime.ts check-read` before the read, using the same directive, invocation ID, positive iteration, and transient transcript; it requires the current-artifact integration ID, exactly one passed-contract owner path, a reason, and one literal non-discovery file path. After the identity-first reviewer result returns, pass `{ directive, invocationId, result }` to `bun .cursor/tools/amadeus-reviewer-runtime.ts complete-review`. Only a zero exit and its durable four-field Review + revalidated Scope decision may establish READY. Bypass/tamper/invocation-or-iteration replay/rejected/outside/second request or invalid scope/persona/UTC/result fields establishes no Review/READY. Repeat the complete scope/reviewer/complete flow for each permitted NOT-READY iteration.
| `done` | The workflow (or single-stage run) is complete. Present the completion summary and STOP the loop. |

Run the engine binary directly via the shell. If a directive looks malformed or
names a move you cannot make, surface it to the user — never improvise the
routing in prose. To stop mid-workflow and continue later, run
`bun .cursor/tools/amadeus-orchestrate.ts park`; the next session resumes with
`/amadeus --resume`.
