# Skills and Runner Commands

> Languages: **English** | [日本語](17-skills.ja.md)

**AI-DLC is a family of commands.** Alongside the `/amadeus` orchestrator you get a set of typeable one-word runner commands: one per scope, one per stage, and one for setup. They are convenience doors onto slices the orchestrator already exposes, so you can reach the whole framework from `/amadeus` alone, or skip the flags and type the door you want.

> **Harness note.** This chapter uses Claude Code's surfaces — skills under
> `.claude/skills/`, typed with a leading `/` from the picker. Kiro ships the same
> runner set under `.kiro/skills/` (also `/`-typed); Codex ships them to
> `.agents/skills/` and types them with `$` (`$amadeus-bugfix`). The runner *set* and
> what each does are identical across harnesses — only the directory and prefix
> differ. See [Running on other harnesses](harnesses/README.md).

---

## Many skills, one engine

Every command this implementation ships is a skill under `.claude/skills/`. They all drive the same deterministic engine — they differ only in what they bake in before they start:

- **`/amadeus`** — the full orchestrator. No flags baked in; it detects your scope (or you describe what you want), then drives every stage in your scope to completion. This is the one you reach for most.
- **Scope-runners** — `/amadeus-bugfix`, `/amadeus-feature`, `/amadeus-mvp`, `/amadeus-security-patch`. Same full workflow, with a scope fixed and scope detection skipped.
- **Stage-runners** — `/amadeus-application-design`, `/amadeus-code-generation`, and 27 more. Run one stage in isolation, never touching your main workflow.
- **`/amadeus-init`** — birth the first intent (run the whole Initialization phase) in one step; opt-in packaging over the engine's auto-birth.
- **Session skills** — `/amadeus-session-cost`, `/amadeus-replay`, `/amadeus-outcomes-pack`, `/amadeus-grilling`. Read-only skills usable at any point; the first three are workflow views covered in [Session Management](11-session-management.md), and `/amadeus-grilling` is a standalone grilling interview (see [Interaction Modes](07-interaction-modes.md)).

Everything a runner does is reachable from `/amadeus` with a flag. The runners are packaging — typing `/amadeus-bugfix` and seeing it in your `/` menu is good ergonomics, nothing more. Delete every runner and the shortcuts go; the capability stays, reachable through `/amadeus` flags.

---

## Scope-runners — a named door per problem class

A scope-runner drives the full workflow with one scope locked in. Use it when you already know what kind of work you're doing and want to skip scope detection.

```
/amadeus-bugfix          Fix a specific bug — minimal depth, streamlined path
/amadeus-feature         Build a new feature — standard depth, all stages
/amadeus-mvp             Ship the core — skips late operations stages
/amadeus-security-patch  CVE / vulnerability response
```

Each is identical to passing `--scope` to the orchestrator:

```
/amadeus-bugfix          ==  /amadeus --scope bugfix
/amadeus-feature         ==  /amadeus --scope feature
```

You can pass a description and flags straight through, exactly as you would to `/amadeus`:

```
/amadeus-bugfix The profile API returns 500 when display_name is null
/amadeus-feature --status
```

**Only four scopes ship a runner** — the high-traffic ones. The framework defines ten scopes total (see [Scopes, Depth, and Test Strategy](05-scopes-and-depth.md)); every other one — `chore`, `enterprise`, `infra`, `poc`, `refactor`, `workshop` — is always reachable through the orchestrator:

```
/amadeus --scope enterprise
/amadeus --scope poc
```

Once a workflow has started, its scope is fixed in `amadeus-state.md`, so re-running the same runner resumes the workflow rather than restarting it. To run under a different scope, use `/amadeus --scope <name>`.

---

## Stage-runners — run one stage, leave your workflow alone

A stage-runner runs a **single stage in isolation**. It never advances your main workflow's `Current Stage`; the tool itself enforces that isolation.

```
/amadeus-application-design
/amadeus-code-generation
/amadeus-requirements-analysis
/amadeus-reverse-engineering
```

Each one packages `/amadeus --stage <slug> --single`:

```
/amadeus-code-generation    ==  /amadeus --stage code-generation --single
```

### When you'd use one

- **Apply one piece of methodology without committing to a workflow.** You want a requirements analysis on a problem, but you're not ready to drive a whole lifecycle. Run `/amadeus-requirements-analysis`, get the artifact, stop.
- **You're the orchestrator.** You're sequencing the work by hand and want the framework to run just the stage in front of you — the human drives, the framework supplies one stage of methodology.
- **Re-run a stage in isolation** while your main workflow sits parked at a different point — the single-stage run can't disturb it.

### Why it's safe

The `--single` invariant is tool-enforced. A single-stage run records its work under a synthetic workflow id and refuses to write your main workflow's `Current Stage`. If a runner ever tried to advance the main pointer, the engine returns an error instead. The engine guarantees this, so the safety holds even if the docs were wrong.

The three bootstrap **initialization** stages ship no stage-runner — birthing half an intent has no standalone meaning. Instead the whole initialization phase is packaged as one command:

```
/amadeus-init [--scope <name>] [description]   birth the first intent (== running /amadeus on a fresh workspace)
```

---

## The runner families at a glance

| Family | Examples | What it does | Orchestrator equivalent |
|---|---|---|---|
| Orchestrator | `/amadeus` | Full workflow, scope detected | — |
| Scope-runner | `/amadeus-bugfix`, `/amadeus-feature`, `/amadeus-mvp`, `/amadeus-security-patch` | Full workflow, scope fixed, no detection | `/amadeus --scope <name>` |
| Stage-runner | `/amadeus-application-design`, `/amadeus-code-generation`, … (29 total) | One stage in isolation, never advances your workflow | `/amadeus --stage <slug> --single` |
| Init wrapper | `/amadeus-init` | Birth the first intent (run Initialization) | `/amadeus` on a fresh workspace |
| Session views | `/amadeus-session-cost`, `/amadeus-replay`, `/amadeus-outcomes-pack` | Read-only workflow reports | see [Session Management](11-session-management.md) |
| Grilling interview | `/amadeus-grilling` | Read-only one-question-at-a-time interview about a plan or design | see [Interaction Modes](07-interaction-modes.md) |

There's one stage-runner for every runnable stage in the lifecycle. To see the full set, list your skills directory:

```bash
ls .claude/skills/
```

---

## Author your own runner — write a stage file

Here's the part that matters if you're customizing the framework: **you don't write runners by hand.** They're generated from the compiled stage graph and your scope files.

To add a stage-runner, add a stage. Write the stage file, recompile the graph, and regenerate:

```bash
bun .claude/tools/amadeus-runner-gen.ts write
```

The generator reads the compiled stage list (the one source of truth) and emits a runner shell per runnable stage. Your new stage's `/amadeus-<your-stage>` command appears automatically — no runner file to author, no boilerplate to copy. Scope-runners work the same way: drop a scope file under `.claude/scopes/`, regenerate, and the runner follows.

```bash
bun .claude/tools/amadeus-runner-gen.ts scopes      # generate scope-runners
```

Because the runner set is derived rather than hand-maintained, it can't drift from the stages and scopes it covers. Two checks fail CI the moment the on-disk set diverges from the source of truth:

```bash
bun .claude/tools/amadeus-runner-gen.ts check            # stage-runner drift
bun .claude/tools/amadeus-runner-gen.ts scopes --check   # scope-runner drift
```

A stage added to the graph without a regenerated runner — or an orphan runner for a stage that's gone — fails loudly with a diff. Adding a stage file and regenerating is the whole authoring path; the runner follows as a consequence the generator maintains for you.

For the mechanics of writing a stage file, see [Customization](13-customization.md) and [Phases and Stages](04-phases-and-stages.md). For the engine, the directive contract, and how a runner shell drives `next`/`report` under the hood, see the reference chapter on the [Skill System](../reference/17-skill-system.md).

---

## Quick reference

```
# Full workflow
/amadeus                              detect scope, run everything
/amadeus --scope enterprise           any of the 10 scopes

# Scope-runners (the 4 high-traffic doors)
/amadeus-bugfix · /amadeus-feature · /amadeus-mvp · /amadeus-security-patch

# One stage, isolated (never advances your workflow)
/amadeus-code-generation              == /amadeus --stage code-generation --single

# Birth the first intent (Initialization phase)
/amadeus-init [--scope <name>]        == /amadeus on a fresh workspace

# Add your own: write a stage/scope file, then
bun .claude/tools/amadeus-runner-gen.ts write
bun .claude/tools/amadeus-runner-gen.ts scopes
```

See also: [CLI Commands](12-cli-commands.md) · [Scopes, Depth, and Test Strategy](05-scopes-and-depth.md) · [Customization](13-customization.md)
