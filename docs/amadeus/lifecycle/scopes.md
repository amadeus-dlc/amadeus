# Scope and Depth Reference

## AI-DLC v2 Reference

- [AI-DLC v2 Scopes and Depth](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/guide/05-scopes-and-depth.md)
- [AI-DLC v2 Scope Definitions](https://github.com/awslabs/aidlc-workflows/tree/v2/core/scopes)

## Inputs

This document is not a per-stage document, so the stage contract's Inputs table (the "Stage contract I/O notation" section of [overview.md](overview.md)) does not apply.
The contracts this document references as input are the engine's scope definitions (`.agents/amadeus/scopes/amadeus-<scope>.md`, one file per scope) and each stage definition's execution condition (`execution` / `condition`).

## Scope adaptation

**Scope adaptation**: the mechanism that reduces the stage set and depth executed, according to the nature of the Intent.

Scope adaptation is the core contract that keeps small work from being forced through the full ceremony.
It rests on the judgment that smallness itself is not the harm — running every stage on small work is.

Intake infers the scope from keywords, and a human confirms it at the birth proposal.
The scope is recorded in the Intent's `amadeus-state.md` and becomes an input to stage resolution.

## Scope list

Amadeus adopts v2's 9 scopes as-is and adds `pdm` as an Amadeus-specific addition (10 scopes total).
Because `pdm` does not exist upstream, it is declared as an exception in the upstream parity check ([Issue #429](https://github.com/amadeus-dlc/amadeus/issues/429)).

| Scope | Depth | Keywords | Description |
|---|---|---|---|
| enterprise | Comprehensive | none (explicit designation only) | Work requiring regulatory compliance or an audit trail. Runs all stages. |
| feature | Standard | none (the default) | The default scope for new features. Targets all stages, narrowed by execution conditions. |
| mvp | Standard | mvp, minimum viable | Ships the core quickly. Skips market-research, team-formation, and approval-handoff. |
| poc | Minimal | proof of concept, prototype, poc, spike | Proves feasibility. Runs only the shortest path to working code. |
| bugfix | Minimal | fix, bug, broken | Fixes a specific bug in existing code. Runs only understanding, requirements, fix, and verification. |
| refactor | Minimal | refactor, clean up, simplify | A behavior-preserving structural change. Adds Functional Design to bugfix. |
| infra | Standard | infrastructure, deploy, infra | Infrastructure changes. Leans toward NFR-related stages, infrastructure-design, and ci-pipeline. |
| security-patch | Minimal | security, CVE, vulnerability, patch | Vulnerability response. Runs understanding, security requirements, fix, and verification. |
| workshop | Standard | workshop, lab, training | A facilitator-led learning session. Skips Ideation and sets the test level to Minimal. |
| pdm | Standard | pdm, prd, product-discovery | A PdM Intent that completes within planning, research, and requirements definition. Runs all of Ideation and Inception's requirements-related stages (requirements-analysis, user-stories, refined-mockups); has no Construction onward. Its terminal artifacts are the full PRD set (intent-statement, competitive-analysis, build-vs-buy, scope-document, initiative-brief, requirements, stories, personas, wireframes). |

Because the default space's workspace steering treats Operation as out of scope, scopes that include Operation stages (enterprise, feature, infra, security-patch, workshop) are processed in this workspace with a reasoned skip for those stages; the lifecycle contract itself holds the same stage set as v2. The current validator additionally requires `[S]` for every Operation stage in every workspace regardless of scope — executing Operation is a future adoption (see [AI-DLC v2 Operation Phase Boundary](../aidlc-v2-operation-phase-boundary.md)).
security-patch's deployment-related stages and infra's provisioning-related stages are handled by this reasoned skip; when deployment steps are needed, they are recorded in the Intent's artifacts and left to a human.

## Scope inference rules

Intake infers the scope using the following rules.

- Keywords match on word boundaries; a substring match does not trigger inference.
- Input that matches no keyword, or whose length suggests a thematic description, defaults to `feature`.
- The inferred scope is stated explicitly in the birth proposal, so a human can correct it.

The Japanese-keyword correspondence table is not yet finalized and will be settled when the entry skill is implemented.

## Depth

**Depth**: a three-level setting that expresses how deep the work goes within a stage.

| Depth | Approximate question volume | Test strategy |
|---|---|---|
| Minimal | 2–4 questions | The Nyquist approach: at minimum, one test per requirement plus a happy-path test per component. |
| Standard | 5–8 questions | The standard approach that verifies component boundaries. |
| Comprehensive | 8–12+ questions | Actively digs into edge cases, compliance, and failure modes. |

Scope determines depth's default value.
workshop overrides only the test strategy to Minimal, independent of depth.
A human can request a depth change at a stage gate.

## Scope-to-stage correspondence table

EXECUTE means the stage is targeted for execution under that scope.
Among targeted stages, a CONDITIONAL stage additionally has its executability determined by that stage's own Condition.
A blank cell means SKIP.

| Stage | enterprise | feature | mvp | poc | bugfix | refactor | infra | security-patch | workshop |
|---|---|---|---|---|---|---|---|---|---|
| 0.1 workspace-scaffold | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE |
| 0.2 workspace-detection | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE |
| 0.3 state-init | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE |
| 1.1 intent-capture | EXECUTE | EXECUTE | EXECUTE | EXECUTE | | | | | |
| 1.2 market-research | EXECUTE | EXECUTE | | | | | | | |
| 1.3 feasibility | EXECUTE | EXECUTE | EXECUTE | | | | | | |
| 1.4 scope-definition | EXECUTE | EXECUTE | EXECUTE | | | | | | |
| 1.5 team-formation | EXECUTE | EXECUTE | | | | | | | |
| 1.6 rough-mockups | EXECUTE | EXECUTE | EXECUTE | | | | | | |
| 1.7 approval-handoff | EXECUTE | EXECUTE | | | | | | | |
| 2.1 reverse-engineering | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | | EXECUTE | EXECUTE |
| 2.2 practices-discovery | EXECUTE | EXECUTE | EXECUTE | | | | EXECUTE | | EXECUTE |
| 2.3 requirements-analysis | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | | EXECUTE |
| 2.4 user-stories | EXECUTE | EXECUTE | EXECUTE | | | | | | EXECUTE |
| 2.5 refined-mockups | EXECUTE | EXECUTE | EXECUTE | | | | | | EXECUTE |
| 2.6 application-design | EXECUTE | EXECUTE | EXECUTE | | | | | | EXECUTE |
| 2.7 units-generation | EXECUTE | EXECUTE | EXECUTE | | | | | | EXECUTE |
| 2.8 delivery-planning | EXECUTE | EXECUTE | EXECUTE | | | | | | EXECUTE |
| 3.1 functional-design | EXECUTE | EXECUTE | EXECUTE | | | EXECUTE | | | EXECUTE |
| 3.2 nfr-requirements | EXECUTE | EXECUTE | EXECUTE | | | | EXECUTE | EXECUTE | EXECUTE |
| 3.3 nfr-design | EXECUTE | EXECUTE | EXECUTE | | | | EXECUTE | | EXECUTE |
| 3.4 infrastructure-design | EXECUTE | EXECUTE | EXECUTE | | | | EXECUTE | | EXECUTE |
| 3.5 code-generation | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | | EXECUTE | EXECUTE |
| 3.6 build-and-test | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | EXECUTE | | EXECUTE | EXECUTE |
| 3.7 ci-pipeline | EXECUTE | EXECUTE | EXECUTE | | | | EXECUTE | | EXECUTE |

This table was transcribed from each v2 stage definition's `scopes:` declaration.
The 3 Initialization stages are targeted for execution under every scope and are included in this table.
The compiled scope grid's numbers (bugfix 7/32, refactor 8/32, poc 8/32, etc.) are identical to v2's; the difference is in workspace steering, which processes the Operation stages with a reasoned skip rather than through a stage-count reduction.

## Input substitution on reduction

In each stage's Inputs table, "Required" describes the relationship when the Source stage runs.

When a Source stage is `skipped` by scope or by its Condition, the downstream stage follows the substitution rule below and records the substitution it used in its own artifact.

| Skipped source stage | Substitution rule |
|---|---|
| 2.3 Requirements Analysis (for security-patch) | 3.2 NFR Requirements also captures requirements; `security-requirements.md` becomes the requirements' defining source. |
| 2.6 Application Design | Uses Reverse Engineering's `architecture.md` and `component-inventory.md` as structural material. In greenfield work, Unit boundaries are judged directly from `requirements.md`. |
| 2.7 Units Generation | Treats the whole Intent as a single implicit Unit. `requirements.md` substitutes for the Unit description. |
| 2.8 Delivery Planning | Treats the whole Intent as a single implicit Bolt. The walking skeleton gate applies to that Bolt. |
| 3.1 Functional Design | Uses `requirements.md` and Reverse Engineering's artifacts as design material. |
| 3.2 NFR Requirements | 3.3 NFR Design and 3.4 Infrastructure Design do not run (guaranteed by 3.3's Condition). |

An implicit Unit and an implicit Bolt do not produce artifacts of their own.
`amadeus-state.md` and audit records use `implicit` as the identifier.
Unit-scoped stages (3.1–3.5) run once against the whole Intent, for the implicit Unit.

## Re-scoping

Once poc has confirmed feasibility, the work re-scopes to feature or mvp rather than continuing the same Intent, and runs the full-implementation lifecycle.
When mvp moves toward production operation, it re-scopes to feature or enterprise.

Re-scoping is treated as the birth of a new Intent and goes through Intake's confirmation.
The original Intent's artifacts are referenced as inputs to the new Intent.
