# Ideation Phase Stage Reference

## AI-DLC v2 Reference

- [AI-DLC v2 Ideation Stages](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/04-stages/ideation.md)

## Phase Overview

The Ideation phase organizes the Intent's outcome, stakeholders, feasibility, scope boundaries, backlog, and initial mockups, and assembles the approval that hands off to Inception.

Ideation begins for an Intent once a human has approved Intake's birth proposal and Initialization (Stage 0.1-0.3) has created the record.

This phase does not produce Requirements, Stories, Units, Bolts, a Domain Model, or implementation.

As a phase-common input, every stage reads the steering/memory references (`org.md`, `team.md`, `project.md`, `phases/ideation.md` — the engine's rules_in_context).
Each stage's Inputs table does not repeat this common input (see [overview.md](overview.md)'s "Stage contract I/O notation" for the notation).

Phase completion is finalized through a PR of the Ideation artifacts and a human merge.

## Execution criteria

The determination of `Execution` and `Condition` follows [overview.md](overview.md) and [scopes.md](scopes.md).

Stages that the scope sets to SKIP do not run.
Among the stages the scope sets to EXECUTE, `ALWAYS` stages always run, and `CONDITIONAL` stages run only when their `Condition` is true.
When a required input's source stage did not run, the treatment follows "Input substitution on reduction" in [scopes.md](scopes.md).

When an existing artifact is already present, it may be satisfied by review or repair rather than recreated.

## Stage Summary Table

| Stage | Name | Execution | Condition | Lead Skill | Outputs |
|---|---|---|---|---|---|
| 1.1 | Intent Capture & Framing | ALWAYS | The start of the entire workflow | `amadeus-ideation-intent-capture` | `intent-statement.md`, `stakeholder-map.md` |
| 1.2 | Market Research | CONDITIONAL | When there is a need for external market positioning or a build-vs-buy decision | `amadeus-ideation-market-research` | `competitive-analysis.md`, `market-trends.md`, `build-vs-buy.md` |
| 1.3 | Feasibility | CONDITIONAL | When there are integration constraints, regulatory requirements, or significant technical uncertainty | `amadeus-ideation-feasibility` | `feasibility-assessment.md`, `constraint-register.md`, `raid-log.md` |
| 1.4 | Scope Definition | ALWAYS | Always runs when the scope targets it for execution | `amadeus-ideation-scope-definition` | `scope-document.md`, `intent-backlog.md` |
| 1.5 | Team Formation | CONDITIONAL | When team composition, capacity, or mob planning is meaningful | `amadeus-ideation-team-formation` | `team-assessment.md`, `skill-matrix.md`, `mob-composition.md` |
| 1.6 | Rough Mockups | CONDITIONAL | When there is a UI. API or backend work substitutes an interaction diagram | `amadeus-ideation-rough-mockups` | `wireframes.md`, `user-flow.md` |
| 1.7 | Approval & Handoff | ALWAYS | Always runs when the scope targets it for execution | `amadeus-ideation-approval-handoff` | `initiative-brief.md`, `decisions.md`, `traceability.md` |

Each stage records the points confirmed and their answers in the stage directory's `<stage-slug>-questions.md`.

## Stage 1.1: Intent Capture & Framing

### Metadata

| Property | Value |
|---|---|
| Stage | 1.1 |
| Phase | Ideation |
| Execution | ALWAYS |
| Condition | The start of the entire workflow. Establishes the Intent's foundation |
| Lead Skill | `amadeus-ideation-intent-capture` |
| Mode | internal |
| v2 Source | [intent-capture.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/ideation/intent-capture.md) |

### Purpose

From the input theme, confirms the problem to solve, the target audience, success metrics, and the trigger, and produces `intent-statement.md` and a stakeholder map.

Confirmation is done through clarifying questions.
It confirms what business problem is being solved, who the customer is and what pain they have, how success can be observed, and why now.
It detects ambiguity and contradiction in the answers, and asks follow-up questions when needed.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| Input theme (the description approved in Intake's birth proposal) | Required | Intake |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `ideation/intent-capture/intent-statement.md` | Purpose (problem), target, success conditions, trigger, scope | intent-statement |
| `ideation/intent-capture/stakeholder-map.md` | Stakeholders, the distinction between decision-makers and influencers, communication requirements | stakeholder-map |
| `ideation/intent-capture/intent-capture-questions.md` | Confirmed questions and answers | intent-capture-questions |
| `ideation/intent-capture/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

This stage fixes the purpose, target, success conditions, trigger, and scope in `intent-statement.md`.
Success conditions are written to satisfy the Intent's acceptance criterion 1 (observable success criteria).
The Intent module file (`<dirName>.md`) was retired by GD009, so this stage does not create it (see [overview.md](overview.md)'s artifact layout).

## Stage 1.2: Market Research

### Metadata

| Property | Value |
|---|---|
| Stage | 1.2 |
| Phase | Ideation |
| Execution | CONDITIONAL |
| Condition | Runs when there is external market positioning or a build-vs-buy decision. Does not run for internal tools, bug fixes, or refactoring |
| Lead Skill | `amadeus-ideation-market-research` |
| Mode | internal |
| v2 Source | [market-research.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/ideation/market-research.md) |

### Purpose

Organizes the competitive landscape, market trends, and build-vs-buy decision material.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `intent-statement.md` | Required | Stage 1.1 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `ideation/market-research/competitive-analysis.md` | Competitive analysis | competitive-analysis |
| `ideation/market-research/market-trends.md` | Market trends | market-trends |
| `ideation/market-research/build-vs-buy.md` | Build-vs-buy decision material | build-vs-buy |
| `ideation/market-research/market-research-questions.md` | Confirmed questions and answers | market-research-questions |
| `ideation/market-research/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

## Stage 1.3: Feasibility

### Metadata

| Property | Value |
|---|---|
| Stage | 1.3 |
| Phase | Ideation |
| Execution | CONDITIONAL |
| Condition | Runs when there are integration constraints, regulatory requirements, or significant technical uncertainty. Does not run for minor changes with no technical risk |
| Lead Skill | `amadeus-ideation-feasibility` |
| Mode | internal |
| v2 Source | [feasibility.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/ideation/feasibility.md) |

### Purpose

Evaluates feasibility from the perspectives of technology, operations, security, and dependencies, and registers non-negotiable constraints and risks.

The constraint register is an artifact that hands over judgment material without prescribing the how.
It states the existing architecture, deadlines, compliance, and what will not be done as explicit constraints.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `intent-statement.md` | Required | Stage 1.1 |
| `competitive-analysis.md`, `market-trends.md`, `build-vs-buy.md` | Optional | Stage 1.2 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `ideation/feasibility/feasibility-assessment.md` | Feasibility assessment | feasibility-assessment |
| `ideation/feasibility/constraint-register.md` | Register of non-negotiable constraints | constraint-register |
| `ideation/feasibility/raid-log.md` | Record of risks, assumptions, issues, and dependencies | raid-log |
| `ideation/feasibility/feasibility-questions.md` | Confirmed questions and answers | feasibility-questions |
| `ideation/feasibility/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

The feasibility, team readiness, and open issues that the legacy contract's `ideation/ideation.md` used to cover move to this stage's artifacts.

## Stage 1.4: Scope Definition

### Metadata

| Property | Value |
|---|---|
| Stage | 1.4 |
| Phase | Ideation |
| Execution | ALWAYS |
| Condition | Always runs when the scope targets it for execution. Defines the scope boundary and the prioritized backlog |
| Lead Skill | `amadeus-ideation-scope-definition` |
| Mode | internal |
| v2 Source | [scope-definition.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/ideation/scope-definition.md) |

### Purpose

Defines the boundary between in-scope and out-of-scope, confirms the minimum scope that delivers value, and organizes candidate work within the theme into a prioritized scope backlog.

The points it confirms are the minimum valuable scope, the distinction between must-have and nice-to-have, dependencies among candidate work, ordering preference (risk-first, value-first, or dependency-first), and the deadline.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `intent-statement.md` | Required | Stage 1.1 |
| `feasibility-assessment.md`, `constraint-register.md` | Optional | Stage 1.3 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `ideation/scope-definition/scope-document.md` | The boundary between in-scope and out-of-scope | scope-document |
| `ideation/scope-definition/intent-backlog.md` | Prioritized list of proto-Units; the receiving point for what is not done this time | intent-backlog |
| `ideation/scope-definition/scope-definition-questions.md` | Confirmed questions and answers | scope-definition-questions |
| `ideation/scope-definition/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

Scope backlog items are not a reserved seat for a future Intent.
They are used as Unit candidates in Units Generation, or as the matching target for Intake's merge determination.

Prioritization is based on MoSCoW, using WSJF or RICE as needed.

The legacy contract's `ideation/scope.md` moves to this stage's two artifacts.

## Stage 1.5: Team Formation

### Metadata

| Property | Value |
|---|---|
| Stage | 1.5 |
| Phase | Ideation |
| Execution | CONDITIONAL |
| Condition | Runs when team composition, capacity, or mob planning is meaningful. Does not run for a solo developer or a small team |
| Lead Skill | `amadeus-ideation-team-formation` |
| Mode | internal |
| v2 Source | [team-formation.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/ideation/team-formation.md) |

### Purpose

Assesses the team's readiness, skills, and mob composition against the scope and backlog.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `scope-document.md`, `intent-backlog.md` | Required | Stage 1.4 |
| `feasibility-assessment.md` | Optional | Stage 1.3 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `ideation/team-formation/team-assessment.md` | Team readiness assessment | team-assessment |
| `ideation/team-formation/skill-matrix.md` | Skill matrix | skill-matrix |
| `ideation/team-formation/mob-composition.md` | Mob composition | mob-composition |
| `ideation/team-formation/team-formation-questions.md` | Confirmed questions and answers | team-formation-questions |
| `ideation/team-formation/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

## Stage 1.6: Rough Mockups

### Metadata

| Property | Value |
|---|---|
| Stage | 1.6 |
| Phase | Ideation |
| Execution | CONDITIONAL |
| Condition | Runs when a UI is included in scope. For API or backend work, it produces a system interaction diagram instead. Does not run when there is neither a UI nor system interaction |
| Lead Skill | `amadeus-ideation-rough-mockups` |
| Mode | internal |
| v2 Source | [rough-mockups.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/ideation/rough-mockups.md) |

### Purpose

Produces wireframes and a user flow at a granularity that can be confirmed as concrete examples for later requirements and use cases.

It does not produce high-fidelity UI.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `intent-statement.md` | Required | Stage 1.1 |
| `scope-document.md`, `intent-backlog.md` | Required | Stage 1.4 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `ideation/rough-mockups/wireframes.md` | Wireframes or a system interaction diagram | wireframes |
| `ideation/rough-mockups/user-flow.md` | User flow | user-flow |
| `ideation/rough-mockups/rough-mockups-questions.md` | Confirmed questions and answers | rough-mockups-questions |
| `ideation/rough-mockups/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

Diagrams are written in PlantUML or Mermaid, which can be embedded in Markdown.
The legacy contract's `ideation/mocks/*.puml` moves to this stage's artifacts.

## Stage 1.7: Approval & Handoff

### Metadata

| Property | Value |
|---|---|
| Stage | 1.7 |
| Phase | Ideation |
| Execution | ALWAYS |
| Condition | Always runs when the scope targets it for execution. Assembles the Ideation artifacts into an initiative brief and obtains approval |
| Lead Skill | `amadeus-ideation-approval-handoff` |
| Mode | internal |
| v2 Source | [approval-handoff.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/ideation/approval-handoff.md) |

### Purpose

Consolidates all of Ideation's artifacts into an initiative brief, finalizes the record of decisions, and obtains approval for the handoff to Inception.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `intent-statement.md` | Required | Stage 1.1 |
| `scope-document.md`, `intent-backlog.md` | Required | Stage 1.4 |
| `competitive-analysis.md` | Optional | Stage 1.2 |
| `feasibility-assessment.md`, `constraint-register.md` | Optional | Stage 1.3 |
| `team-assessment.md` | Optional | Stage 1.5 |
| `wireframes.md` | Optional | Stage 1.6 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `ideation/approval-handoff/initiative-brief.md` | Consolidation of the Ideation artifacts | initiative-brief |
| `ideation/decisions.md` and `ideation/decisions/` | The phase's finalized decisions | decision-log |
| `ideation/traceability.md` | Traceability of the Ideation artifacts | Amadeus extension |
| `ideation/approval-handoff/approval-handoff-questions.md` | Confirmed questions and answers | approval-handoff-questions |
| `ideation/approval-handoff/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

After this stage's approval, the Ideation artifacts are assembled into a phase PR, and phase completion is finalized by a human merge.
Appending the `PHASE_VERIFIED` event and updating Phase Progress happen after the merge.

For scopes such as mvp or poc, which run part of Ideation while setting this stage to SKIP, the approval of the last Ideation stage that ran and its phase PR double as the handoff.
For scopes such as bugfix, which run none of Ideation's stages, the phase passes through without creating Ideation artifacts or a phase PR (see [state.md](state.md)'s phase transitions).
