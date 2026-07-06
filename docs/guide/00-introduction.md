# Introduction

## What is Amadeus DLC

Amadeus DLC is a lifecycle contract for AI-assisted software development, semantically compatible with AI-DLC v2 (the `v2` branch of [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows)). Work is organized around an **Intent**: an independently completable outcome with an observable success criterion. An Intent moves through Ideation, Inception, and Construction; scopes that include them also run the Operation stages (which scopes execute which stages is defined in the [scopes contract](../amadeus/lifecycle/scopes.md)). The full contract — stage responsibilities, inputs and outputs, and the state machine behind it — is defined in the [Lifecycle Contract Overview](../amadeus/lifecycle/overview.md).

Every stage completion and every gate decision is recorded as an audit event under the Intent's own record. Each stage gate, and each Construction Bolt gate, waits for an explicit human decision before the work advances. The day-to-day stage work is agent-driven, but what ships stays under human control.

## How it runs

Amadeus is engine-driven. The single public entrypoint skill, `amadeus`, does not itself decide what happens next: it calls the engine's `next` / `report` forwarding loop, implemented in `.agents/amadeus/tools/amadeus-orchestrate.ts`, one step at a time. The engine resolves Intake, scope, stage ordering, and gate outcomes; the skill layer only carries out the directive the engine returns and reports the result back before asking for the next one. Keeping this resolution in one deterministic place means scope rules and gate logic are not re-derived in prose on every run.

## The shape of the lifecycle

The lifecycle has 5 phases: Initialization, Ideation, Inception, Construction, and Operation. Together they define 32 stages in total, as compiled into `.agents/amadeus/tools/data/stage-graph.json`.

Not every Intent runs all 32 stages. 10 **scopes** — defined one file per scope under `.agents/amadeus/scopes/` (for example `poc`, `feature`, `mvp`, `enterprise`) — each declare their own EXECUTE/SKIP subset of the 32 stages. A scope lets a small Intent skip ceremony that a larger one needs. The exact stage set for each scope is defined in the [scopes contract](../amadeus/lifecycle/scopes.md).

## Skills at a glance

Amadeus ships 42 skills across five groups:

- 1 public entrypoint: `amadeus`.
- 3 auxiliary entrypoints: `amadeus-grilling`, `amadeus-domain-modeling`, and `amadeus-validator`.
- 29 single-stage runner skills, one per stage, each packaging `/amadeus --stage <slug> --single`.
- 6 shortcuts: the scope entry skills, the composer, and the whole-Initialization runner.
- 3 read-only utility skills: `amadeus-replay`, `amadeus-session-cost`, and `amadeus-outcomes-pack`.

The full stage-to-runner mapping is maintained in the [Stage Catalog](../../skills/amadeus/references/stage-catalog.md); this guide does not duplicate it.

## Relationship to AI-DLC v2

Amadeus tracks AI-DLC v2 at the level of structure and semantics: stage responsibilities, execution conditions, gate state machines, and the Intake protocol are designed to match. What is Amadeus-specific is the namespace — skill names, tool paths, and CLI tokens use the `amadeus` prefix in place of `aidlc`.

A machine-checked table, `parity-map.json` (`dev-scripts/data/parity-map.json`), defines this renaming as data rather than prose. It covers 10 kinds of renamed elements (engine directories, tools, hooks, scope files, sensor files, CLI tokens, and more) for 120 mappings in total, and `npm run parity:check` verifies the codebase against it.

Beyond naming, where Amadeus's actual feature set diverges from upstream is still being inventoried; see [Issue #524](https://github.com/amadeus-dlc/amadeus/issues/524) for that pending work.

## Next steps

The next chapter, [Getting Started](01-getting-started.md), installs the engine into your own workspace and verifies the install. The guide [index](index.md) tracks the status of every chapter.
