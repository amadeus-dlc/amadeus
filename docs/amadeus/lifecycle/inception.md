# Inception Phase Stage Reference

## AI-DLC v2 Reference

- [AI-DLC v2 Inception Stages](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/04-stages/inception.md)

## Phase Overview

The Inception phase produces an understanding of the existing code, discovers team practices, and builds requirements, stories, application design, the Unit dependency DAG, and the Bolt plan.

Inception settles everything from requirements through topology (Units and their dependencies), and separates the economic sequencing decision (what to ship first) into Delivery Planning.

This phase does not handle Domain Model detail, implementation, or test execution.

As a phase-common input, every stage reads the steering/memory references (`org.md`, `team.md`, `project.md`, `phases/inception.md` — the engine's rules_in_context).
This common input is not repeated in each stage's Inputs table (for the notation, see "Stage contract I/O notation" in [overview.md](overview.md)).

Phase completion is finalized by a PR of the Inception artifacts and a human merge.

## Execution criteria

The determination of `Execution` and `Condition` follows [overview.md](overview.md) and [scopes.md](scopes.md).

brownfield refers to a state where existing code for the change target already exists.
Inputs conditioned on brownfield are not required in greenfield.

When an existing artifact already exists, it may be satisfied by inspection or repair rather than recreation.

## Stage Summary Table

| Stage | Name | Execution | Condition | Lead Skill | Outputs |
|---|---|---|---|---|---|
| 2.1 | Reverse Engineering | CONDITIONAL | When brownfield. Re-run every time to keep it fresh | `amadeus-inception-reverse-engineering` | 9 artifacts under `codekb/<repo>/` |
| 2.2 | Practices Discovery | CONDITIONAL | Re-run every time to keep it fresh. Discovered from evidence in brownfield, from questions in greenfield | `amadeus-inception-practices-discovery` | `team-practices.md`, `discovered-rules.md`, `evidence.md` |
| 2.3 | Requirements Analysis | ALWAYS | Always runs when scope targets it for execution | `amadeus-inception-requirements-analysis` | `requirements.md` |
| 2.4 | User Stories | CONDITIONAL | When there is user-facing functionality, multiple personas, complex business logic, or cross-team work | `amadeus-inception-user-stories` | `stories.md`, `personas.md`, `user-stories-assessment.md` |
| 2.5 | Refined Mockups | CONDITIONAL | When there is a UI and Ideation produced rough mockups | `amadeus-inception-refined-mockups` | `mockups.md`, `interaction-spec.md`, and more |
| 2.6 | Application Design | CONDITIONAL | When designing new components or services is needed | `amadeus-inception-application-design` | `components.md`, `services.md`, and more |
| 2.7 | Units Generation | ALWAYS | Always runs when scope targets it for execution | `amadeus-inception-units-generation` | `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md` |
| 2.8 | Delivery Planning | ALWAYS | Always runs when scope targets it for execution | `amadeus-inception-delivery-planning` | `bolt-plan.md`, and more |

Each stage records the points it confirmed and their answers in the stage directory's `<stage-slug>-questions.md`.

## Stage 2.1: Reverse Engineering

### Metadata

| Property | Value |
|---|---|
| Stage | 2.1 |
| Phase | Inception |
| Execution | CONDITIONAL |
| Condition | Runs when brownfield. Re-runs every time to keep it fresh. Does not run in greenfield |
| Lead Skill | `amadeus-inception-reverse-engineering` |
| Mode | internal (delegable to a subagent) |
| v2 Source | [reverse-engineering.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/reverse-engineering.md) |

### Purpose

Analyzes the existing codebase and records the business overview, architecture, code structure, API, component inventory, technology stack, dependencies, and quality assessment.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| Code of the target repository | Required | workspace |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `codekb/<repo>/business-overview.md` | Business overview | business-overview |
| `codekb/<repo>/architecture.md` | Architecture | architecture |
| `codekb/<repo>/code-structure.md` | Code structure | code-structure |
| `codekb/<repo>/api-documentation.md` | API documentation | api-documentation |
| `codekb/<repo>/component-inventory.md` | Component inventory | component-inventory |
| `codekb/<repo>/technology-stack.md` | Technology stack | technology-stack |
| `codekb/<repo>/dependencies.md` | Dependencies | dependencies |
| `codekb/<repo>/code-quality-assessment.md` | Quality assessment | code-quality-assessment |
| `codekb/<repo>/timestamp.md` | Analysis time and freshness | reverse-engineering-timestamp |
| `inception/reverse-engineering/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

The artifacts are placed under the Space's `codekb/<repo>/`, not under the Intent, and are reused across Intents.
The legacy contract's `inception/codebase-analysis.md` moves to this stage's artifacts.

## Stage 2.2: Practices Discovery

### Metadata

| Property | Value |
|---|---|
| Stage | 2.2 |
| Phase | Inception |
| Execution | CONDITIONAL |
| Condition | Re-runs every time to keep it fresh. Discovered from evidence and Reverse Engineering's artifacts in brownfield, confirmed through structured questions in greenfield |
| Lead Skill | `amadeus-inception-practices-discovery` |
| Mode | internal |
| v2 Source | [practices-discovery.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/practices-discovery.md) |

### Purpose

Discovers the team's development practices (branch strategy, test policy, deployment, quality standards) and records them with evidence.

Practices confirmed by a human are promoted into the Space's `memory/team.md`, and subsequent Intents reference them.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| Artifacts under `codekb/<repo>/` | Conditional (brownfield) | Stage 2.1 |
| The Space's existing `memory/team.md` | Optional | Space |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `inception/practices-discovery/team-practices.md` | Discovered practices | team-practices |
| `inception/practices-discovery/discovered-rules.md` | Candidate rules | discovered-rules |
| `inception/practices-discovery/evidence.md` | Grounds for the discovery | evidence |
| `inception/practices-discovery/practices-discovery-timestamp.md` | Discovery time and freshness | practices-discovery-timestamp |
| `inception/practices-discovery/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

The promotion target is the Space's `memory/team.md`.
Promotion requires human approval.

## Stage 2.3: Requirements Analysis

### Metadata

| Property | Value |
|---|---|
| Stage | 2.3 |
| Phase | Inception |
| Execution | ALWAYS |
| Condition | Always runs when scope targets it for execution. The question depth follows the configured Depth value |
| Lead Skill | `amadeus-inception-requirements-analysis` |
| Mode | internal |
| v2 Source | [requirements-analysis.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/requirements-analysis.md) |

### Purpose

Breaks the Intent down into verifiable requirements.
Each requirement has an identifier and acceptance criteria, and can be traced back to the success conditions.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| user project description in the record's audit shard | Required | Intake |
| `intent-statement.md` | Optional | Stage 1.1 |
| `scope-document.md` | Optional | Stage 1.4 |
| Artifacts under `codekb/<repo>/` | Conditional (brownfield) | Stage 2.1 |
| `team-practices.md` | Optional | Stage 2.2 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `inception/requirements-analysis/requirements.md` | Requirement list. Each requirement includes an identifier and acceptance criteria | requirements |
| `inception/requirements-analysis/requirements-analysis-questions.md` | Confirmed questions and answers | requirements-analysis-questions |
| `inception/requirements-analysis/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

Acceptance criteria are embedded in each requirement.
The legacy contract's `inception/acceptance.md` is retired and is not made a separate artifact.
When there are many requirements, they may be split into `requirements/<requirement-id>.md`.
Even then, `requirements.md` is kept as the list.

## Stage 2.4: User Stories

### Metadata

| Property | Value |
|---|---|
| Stage | 2.4 |
| Phase | Inception |
| Execution | CONDITIONAL |
| Condition | Runs when there is user-facing functionality, multiple personas, complex business logic, or cross-team work. Does not run for pure refactoring, a one-off bug fix, an infrastructure-only change, or developer tooling |
| Lead Skill | `amadeus-inception-user-stories` |
| Mode | internal |
| v2 Source | [user-stories.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/user-stories.md) |

### Purpose

Breaks requirements down into value statements for human actors, and organizes personas.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `requirements.md` | Required | Stage 2.3 |
| `business-overview.md`, `component-inventory.md` | Conditional (brownfield) | Stage 2.1 |
| `team-practices.md` | Optional | Stage 2.2 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `inception/user-stories/stories.md` | User story list | stories |
| `inception/user-stories/personas.md` | Personas | personas |
| `inception/user-stories/user-stories-assessment.md` | Story sufficiency assessment | user-stories-assessment |
| `inception/user-stories/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

The legacy contract's use-cases stage is retired.
Detailing actor-system interactions is handled by this stage and by Construction's Functional Design.

## Stage 2.5: Refined Mockups

### Metadata

| Property | Value |
|---|---|
| Stage | 2.5 |
| Phase | Inception |
| Execution | CONDITIONAL |
| Condition | Runs when there is a UI and Ideation produced rough mockups. For an API, it refines the interaction diagram |
| Lead Skill | `amadeus-inception-refined-mockups` |
| Mode | internal |
| v2 Source | [refined-mockups.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/refined-mockups.md) |

### Purpose

Refines the rough mockups into detailed mocks mapped to requirements and stories.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `wireframes.md`, `user-flow.md` | Required (when Rough Mockups runs) | Stage 1.6 |
| `requirements.md` | Required | Stage 2.3 |
| `stories.md` | Optional | Stage 2.4 |
| `team-practices.md` | Optional | Stage 2.2 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `inception/refined-mockups/mockups.md` | Detailed mocks | mockups |
| `inception/refined-mockups/interaction-spec.md` | Interaction specification | interaction-spec |
| `inception/refined-mockups/design-system-mapping.md` | Design system mapping | design-system-mapping |
| `inception/refined-mockups/accessibility-checklist.md` | Accessibility check | accessibility-checklist |
| `inception/refined-mockups/refined-mockups-questions.md` | Confirmed questions and answers | refined-mockups-questions |
| `inception/refined-mockups/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

## Stage 2.6: Application Design

### Metadata

| Property | Value |
|---|---|
| Stage | 2.6 |
| Phase | Inception |
| Execution | CONDITIONAL |
| Condition | Runs when new components or services are needed, or when service-layer design is needed. Does not run when only fixing existing components |
| Lead Skill | `amadeus-inception-application-design` |
| Mode | internal |
| v2 Source | [application-design.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/application-design.md) |

### Purpose

Designs components, method boundaries, services, and dependencies from requirements and stories.

Settles here the architecture that becomes the material for Unit boundaries.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `requirements.md` | Required | Stage 2.3 |
| `stories.md` | Optional | Stage 2.4 |
| `architecture.md`, `component-inventory.md` | Conditional (brownfield) | Stage 2.1 |
| `team-practices.md` | Optional | Stage 2.2 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `inception/application-design/components.md` | Component list and responsibilities | components |
| `inception/application-design/component-methods.md` | Component method boundaries | component-methods |
| `inception/application-design/services.md` | Service design | services |
| `inception/application-design/component-dependency.md` | Component dependencies | component-dependency |
| `inception/application-design/decisions.md` | Design decisions | decisions |
| `inception/application-design/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

`application-design/decisions.md` handles this stage's design decisions, and is kept separate from `inception/decisions.md` directly under the phase (the phase's confirmed decisions).
The legacy contract's Unit Design Brief is replaced by this stage and by Functional Design.

## Stage 2.7: Units Generation

### Metadata

| Property | Value |
|---|---|
| Stage | 2.7 |
| Phase | Inception |
| Execution | ALWAYS |
| Condition | Always runs when scope targets it for execution. Runs paired with 2.8 Delivery Planning |
| Lead Skill | `amadeus-inception-units-generation` |
| Mode | internal |
| v2 Source | [units-generation.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/units-generation.md) |

### Purpose

Generates Units and the dependency DAG from Application Design and the requirements.

This stage produces only the topology (Unit boundaries and dependencies).
It does not handle implementation order, critical-path recommendations, or economic sequencing.
Those are Stage 2.8 Delivery Planning's responsibility.

The Unit boundary strategy (by service, by feature, by domain, by deployment target) and granularity (coarse, fine) are confirmed with a human through structured questions.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `components.md`, `component-methods.md`, `services.md`, `component-dependency.md`, `decisions.md` | Required (when Application Design runs) | Stage 2.6 |
| `requirements.md` | Required | Stage 2.3 |
| `stories.md` | Optional | Stage 2.4 |

When Application Design did not run, follow the input substitution on reduction in [scopes.md](scopes.md), and judge Unit boundaries from Reverse Engineering's artifacts or from `requirements.md`.

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `inception/units-generation/unit-of-work.md` | Unit list | unit-of-work |
| `inception/units-generation/unit-of-work-dependency.md` | Unit dependency DAG | unit-of-work-dependency |
| `inception/units-generation/unit-of-work-story-map.md` | Unit-to-story correspondence. Only when stories exist | unit-of-work-story-map |
| `inception/units-generation/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

Scope backlog items are evaluated as Unit candidates in this stage.
When there are many Units, they may be split into `units/<unit-id>-<slug>.md`.
Even then, `unit-of-work.md` is kept as the list.

## Stage 2.8: Delivery Planning

### Metadata

| Property | Value |
|---|---|
| Stage | 2.8 |
| Phase | Inception |
| Execution | ALWAYS |
| Condition | Always runs when scope targets it for execution. As Inception's final stage, it produces Construction's execution plan |
| Lead Skill | `amadeus-inception-delivery-planning` |
| Mode | internal |
| v2 Source | [delivery-planning.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/inception/delivery-planning.md) |

### Purpose

Applies economic sequencing to the Unit dependency DAG and produces the Bolt plan.

How Bolts are bundled (one Unit at a time, a bundle of related Units, a thin slice spanning Units) is confirmed with a human through structured questions.
The first Bolt is the smallest slice that cuts through the architecture (a walking skeleton).

Each Bolt is given a Definition of Done and a statement of what shipping that Bolt proves (a confidence hypothesis).

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `unit-of-work.md`, `unit-of-work-dependency.md` | Required | Stage 2.7 |
| `unit-of-work-story-map.md` | Optional | Stage 2.7 |
| `requirements.md` | Required | Stage 2.3 |
| `components.md` | Required (when Application Design runs) | Stage 2.6 |
| `stories.md`, `mockups.md` | Optional | Stage 2.4, 2.5 |
| `team-practices.md` | Optional | Stage 2.2 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `inception/delivery-planning/bolt-plan.md` | Bolt list, Unit bundling, execution order, Definition of Done, confidence hypothesis | bolt-plan |
| `inception/delivery-planning/team-allocation.md` | Assignment of owners to Bolts. Only when a team exists | team-allocation |
| `inception/delivery-planning/risk-and-sequencing-rationale.md` | Rationale for sequencing and risks | risk-and-sequencing-rationale |
| `inception/delivery-planning/external-dependency-map.md` | External dependency mapping | external-dependency-map |
| `inception/delivery-planning/delivery-planning-questions.md` | Confirmed questions and answers | delivery-planning-questions |
| `inception/delivery-planning/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

The legacy contract's `inception/bolts.md` and `bolts/<bolt-id>-<slug>.md` are replaced by `bolt-plan.md`.
When there are many Bolts, they may be split into `bolts/<bolt-id>-<slug>.md`.

After this stage's approval, the Inception artifacts are gathered into a phase PR, and phase completion is finalized by a human merge.
The phase's `decisions.md` and `traceability.md` are settled by the phase PR.
Appending the `PHASE_VERIFIED` event and updating Phase Progress happen after the merge.
