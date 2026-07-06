# Construction Phase Stage Reference

## AI-DLC v2 Reference

- [AI-DLC v2 Construction Stages](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/reference/04-stages/construction.md)

## Phase Overview

Construction is the phase that designs, implements, and verifies Units according to the Bolt plan.

Construction treats the Bolt as its execution unit.
One Bolt runs Stage 3.1 through 3.6 once over the Units bundled by the bolt-plan, isolated in its own branch and worktree.
Stage 3.1 through 3.5 run per Unit, and Stage 3.6 runs once after all Units in the Bolt are complete.
Stage 3.7 runs per Intent when needed.

For scopes that do not run Units Generation and Delivery Planning (bugfix, poc, refactor, security-patch), the whole Intent runs once as a single implicit Unit and a single implicit Bolt.
For the treatment when a required input's Source stage is `skipped`, see "Input substitution on reduction" in [scopes.md](scopes.md).

As a phase-common input, every stage reads the steering/memory references (`org.md`, `team.md`, `project.md`, `phases/construction.md` — the engine's rules_in_context).
This common input is not repeated in each stage's Inputs table (for the notation, see "Stage contract I/O notation" in [overview.md](overview.md)).

A Bolt's completion is finalized through a PR and a human merge.
A Bolt's execution state is tracked by Project Information's `Bolt Refs` and the audit's `BOLT_STARTED` / `BOLT_COMPLETED` events.

## Execution criteria

The determination of `Execution` and `Condition` follows [overview.md](overview.md) and [scopes.md](scopes.md).

Construction treats questions as an exception.
The premise is that the decision was already made in an earlier artifact; a question is asked only when a genuine gap that the earlier stages did not address is detected.

When an existing artifact is present, review or repair may satisfy the stage instead of recreating it.

## Bolt gates

Construction has three Bolt gates in addition to the stage gates.

**Walking skeleton gate**: for the first Bolt, a human always approves the design artifacts and the generated code together.
This is never skipped, regardless of the `Construction Autonomy Mode` setting.

**Ladder proposal**: immediately after the walking skeleton's approval, whether to run the remaining Bolts autonomously or to keep gating each Bolt is confirmed once, and the answer is recorded in Current Status's `Construction Autonomy Mode` (`autonomous` or `gated`).

**Halt-and-ask**: even when `Construction Autonomy Mode` is `autonomous`, a failed Bolt stops and confirms with a human.
Only the failed Bolt can be retried or skipped.

## Stage Summary Table

| Stage | Name | Execution | Condition | Lead Skill | Outputs |
|---|---|---|---|---|---|
| 3.1 | Functional Design | CONDITIONAL | When a new data model, complex business logic, or business rule design is needed | `amadeus-construction-functional-design` | `business-logic-model.md`, and more |
| 3.2 | NFR Requirements | CONDITIONAL | When performance, security, scalability, or technology stack selection is needed | `amadeus-construction-nfr-requirements` | `performance-requirements.md`, and more |
| 3.3 | NFR Design | CONDITIONAL | When NFR Requirements has run and NFR pattern design is needed | `amadeus-construction-nfr-design` | `performance-design.md`, and more |
| 3.4 | Infrastructure Design | CONDITIONAL | When infrastructure service mapping or deployment design is needed | `amadeus-construction-infrastructure-design` | `deployment-architecture.md`, and more |
| 3.5 | Code Generation | ALWAYS | Always runs for each Unit in the execution plan | `amadeus-construction-code-generation` | Code, `code-generation-plan.md`, `code-summary.md` |
| 3.6 | Build and Test | ALWAYS | Always runs once after all Units in the Bolt are complete | `amadeus-construction-build-and-test` | `build-test-results.md`, and more |
| 3.7 | CI Pipeline | CONDITIONAL | When a new CI setup or a major change is needed | `amadeus-construction-ci-pipeline` | `ci-config.md`, `quality-gates.md` |

Unit-scoped stages' (3.1-3.5) artifacts are placed under `construction/<unit-id>-<slug>/<stage-slug>/`.
Bolt execution records (3.6 and the PR) are placed under `construction/bolts/<bolt-id>-<slug>/`.

## Stage 3.1: Functional Design

### Metadata

| Property | Value |
|---|---|
| Stage | 3.1 |
| Phase | Construction |
| Execution | CONDITIONAL |
| Condition | Runs when a new data model, complex business logic, or business rule design is needed. Does not run for a simple change with no new business logic |
| Lead Skill | `amadeus-construction-functional-design` |
| Mode | internal |
| Execution unit | Per Unit |
| v2 Source | [functional-design.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/construction/functional-design.md) |

### Purpose

Designs the target Unit's business logic model, business rules, and domain entities.
For a Unit that has a UI, also designs the frontend component composition.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `unit-of-work.md` (target Unit) | Required (when Units Generation runs) | Stage 2.7 |
| `unit-of-work-story-map.md` | Optional | Stage 2.7 |
| `requirements.md` | Required | Stage 2.3 |
| `components.md`, `component-methods.md`, `services.md` | Required (when Application Design runs) | Stage 2.6 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `construction/<unit>/functional-design/business-logic-model.md` | Business logic model | business-logic-model |
| `construction/<unit>/functional-design/business-rules.md` | Business rules | business-rules |
| `construction/<unit>/functional-design/domain-entities.md` | Domain entities | domain-entities |
| `construction/<unit>/functional-design/frontend-components.md` | Frontend composition. Only when there is a UI | frontend-components |
| `construction/<unit>/functional-design/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

`amadeus-domain-modeling` and Event Storming's artifacts (Aggregate Candidate, Bounded Context Candidate) are referenced as judgment material for this stage.

## Stage 3.2: NFR Requirements

### Metadata

| Property | Value |
|---|---|
| Stage | 3.2 |
| Phase | Construction |
| Execution | CONDITIONAL |
| Condition | Runs when performance requirements, security considerations, scalability, or technology stack selection are needed. Does not run when there are no NFRs and the technology stack is already fixed |
| Lead Skill | `amadeus-construction-nfr-requirements` |
| Mode | internal |
| Execution unit | Per Unit |
| v2 Source | [nfr-requirements.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/construction/nfr-requirements.md) |

### Purpose

Finalizes the target Unit's non-functional requirements (performance, security, scalability, reliability) and the technology stack decisions.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `business-logic-model.md`, `business-rules.md` | Required (when Functional Design runs) | Stage 3.1 |
| `requirements.md` | Required (when Requirements Analysis runs) | Stage 2.3 |
| `technology-stack.md` | Conditional (brownfield) | Stage 2.1 |

Because security-patch does not run Requirements Analysis, this stage also captures the requirements.

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `construction/<unit>/nfr-requirements/performance-requirements.md` | Performance requirements | performance-requirements |
| `construction/<unit>/nfr-requirements/security-requirements.md` | Security requirements | security-requirements |
| `construction/<unit>/nfr-requirements/scalability-requirements.md` | Scalability requirements | scalability-requirements |
| `construction/<unit>/nfr-requirements/reliability-requirements.md` | Reliability requirements | reliability-requirements |
| `construction/<unit>/nfr-requirements/tech-stack-decisions.md` | Technology stack decisions | tech-stack-decisions |
| `construction/<unit>/nfr-requirements/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

## Stage 3.3: NFR Design

### Metadata

| Property | Value |
|---|---|
| Stage | 3.3 |
| Phase | Construction |
| Execution | CONDITIONAL |
| Condition | Runs when NFR Requirements has run and NFR pattern design is needed. Does not run when NFR Requirements did not run |
| Lead Skill | `amadeus-construction-nfr-design` |
| Mode | internal |
| Execution unit | Per Unit |
| v2 Source | [nfr-design.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/construction/nfr-design.md) |

### Purpose

Produces the design (performance, security, scalability, reliability, logical components) that satisfies the NFR requirements.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| NFR Requirements' 5 artifacts | Required (when NFR Requirements runs) | Stage 3.2 |
| `business-logic-model.md` | Required (when Functional Design runs) | Stage 3.1 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `construction/<unit>/nfr-design/performance-design.md` | Performance design | performance-design |
| `construction/<unit>/nfr-design/security-design.md` | Security design | security-design |
| `construction/<unit>/nfr-design/scalability-design.md` | Scalability design | scalability-design |
| `construction/<unit>/nfr-design/reliability-design.md` | Reliability design | reliability-design |
| `construction/<unit>/nfr-design/logical-components.md` | Logical components | logical-components |
| `construction/<unit>/nfr-design/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

## Stage 3.4: Infrastructure Design

### Metadata

| Property | Value |
|---|---|
| Stage | 3.4 |
| Phase | Construction |
| Execution | CONDITIONAL |
| Condition | Runs when infrastructure service mapping, deployment architecture, or cloud resources are needed. Does not run when there is no infrastructure change and it is already defined |
| Lead Skill | `amadeus-construction-infrastructure-design` |
| Mode | internal |
| Execution unit | Per Unit |
| v2 Source | [infrastructure-design.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/construction/infrastructure-design.md) |

### Purpose

Produces the deployment architecture, infrastructure services, monitoring, and CI/CD pipeline design from the NFR design and the application design.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| NFR Design's 5 artifacts | Required (when NFR Design runs) | Stage 3.3 |
| `components.md`, `services.md` | Required (when Application Design runs) | Stage 2.6 |
| `business-logic-model.md` | Required (when Functional Design runs) | Stage 3.1 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `construction/<unit>/infrastructure-design/deployment-architecture.md` | Deployment architecture | deployment-architecture |
| `construction/<unit>/infrastructure-design/infrastructure-services.md` | Infrastructure service mapping | infrastructure-services |
| `construction/<unit>/infrastructure-design/monitoring-design.md` | Monitoring design | monitoring-design |
| `construction/<unit>/infrastructure-design/cicd-pipeline.md` | CI/CD design | cicd-pipeline |
| `construction/<unit>/infrastructure-design/shared-infrastructure.md` | Shared infrastructure. Only when applicable | shared-infrastructure |
| `construction/<unit>/infrastructure-design/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

Because Amadeus excludes the Operation phase, a human performs the deployment execution based on this stage's design artifacts.

## Stage 3.5: Code Generation

### Metadata

| Property | Value |
|---|---|
| Stage | 3.5 |
| Phase | Construction |
| Execution | ALWAYS |
| Condition | Always runs for each Unit in the execution plan |
| Lead Skill | `amadeus-construction-code-generation` |
| Mode | internal (delegable to a subagent) |
| Execution unit | Per Unit. Runs inside the Bolt's worktree |
| v2 Source | [code-generation.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/construction/code-generation.md) |

### Purpose

Takes the target Unit's design artifacts as input, plans the implementation, and generates code and test code.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `unit-of-work.md` (target Unit) | Required (when Units Generation runs) | Stage 2.7 |
| `requirements.md` | Required (when Requirements Analysis runs) | Stage 2.3 |
| Functional Design's artifacts | Optional | Stage 3.1 |
| NFR Design's and Infrastructure Design's artifacts | Optional | Stage 3.3, 3.4 |

For scopes that do not run Units Generation, the whole Intent is implemented once as the implicit Unit.
For security-patch, `security-requirements.md` is the requirements' defining source.

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| Application code and test code | Changes to the target repository | application code |
| `construction/<unit>/code-generation/code-generation-plan.md` | Implementation plan | code-generation-plan |
| `construction/<unit>/code-generation/code-summary.md` | Summary of the implementation result | code-summary |
| `construction/<unit>/code-generation/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

The legacy contract's Bolt preparation and `tasks.md` are replaced by `code-generation-plan.md`.
Implementation is isolated in the Bolt's branch and worktree, following the Git Branching Policy.

## Stage 3.6: Build and Test

### Metadata

| Property | Value |
|---|---|
| Stage | 3.6 |
| Phase | Construction |
| Execution | ALWAYS |
| Condition | Always runs once after all Units in the Bolt complete Code Generation |
| Lead Skill | `amadeus-construction-build-and-test` |
| Mode | internal |
| Execution unit | Once per Bolt |
| v2 Source | [build-and-test.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/construction/build-and-test.md) |

### Purpose

Runs the build and tests for the whole Bolt, and records the procedure and the results.

The volume of testing follows depth's test strategy.
Minimal is one test per requirement plus a happy-path floor, Standard verifies component boundaries, and Comprehensive performs exhaustive verification.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `code-generation-plan.md` and `code-summary.md` for every Unit in the Bolt | Required | Stage 3.5 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `construction/bolts/<bolt-id>-<slug>/build-instructions.md` | Build procedure | build-instructions |
| `construction/bolts/<bolt-id>-<slug>/unit-test-instructions.md` | Unit test procedure | unit-test-instructions |
| `construction/bolts/<bolt-id>-<slug>/integration-test-instructions.md` | Integration test procedure. When run | integration-test-instructions |
| `construction/bolts/<bolt-id>-<slug>/performance-test-instructions.md` | Performance test procedure. When run | performance-test-instructions |
| `construction/bolts/<bolt-id>-<slug>/security-test-instructions.md` | Security test procedure. When run | security-test-instructions |
| `construction/bolts/<bolt-id>-<slug>/build-and-test-summary.md` | Build and test summary | build-and-test-summary |
| `construction/bolts/<bolt-id>-<slug>/build-test-results.md` | Test execution results | build-test-results |
| `construction/bolts/<bolt-id>-<slug>/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

Failure handling is an intentional difference in Amadeus DLC.
AI-DLC v2's Build and Test attempts diagnosis and fixes up to 2 times, but Amadeus DLC makes no implementation fix at this stage.
On failure, it stops regardless of the autonomy mode, records the failure in `build-test-results.md`, and confirms with a human (halt-and-ask).
The fix is made under human instruction as a revision to the target Unit's Code Generation, and the re-run redoes only the steps related to the failure's cause.
For the reason and the comparison with the upstream, see [AI-DLC v2 Build and Test Failure Handling](../aidlc-v2-build-and-test-failure-handling.md).

After this stage completes, the Bolt's PR is created.
The PR description records the Definition of Done and the confidence hypothesis, and after the merge it is recorded in `construction/bolts/<bolt-id>-<slug>/pr.md`.
`pr.md` is an Amadeus extension artifact.

## Stage 3.7: CI Pipeline

### Metadata

| Property | Value |
|---|---|
| Stage | 3.7 |
| Phase | Construction |
| Execution | CONDITIONAL |
| Condition | Runs when a new CI pipeline or a major change to it is needed. Does not run when there is already sufficient CI |
| Lead Skill | `amadeus-construction-ci-pipeline` |
| Mode | internal |
| Execution unit | Per Intent |
| v2 Source | [ci-pipeline.md](https://github.com/awslabs/aidlc-workflows/blob/v2/core/amadeus-common/stages/construction/ci-pipeline.md) |

### Purpose

Designs the CI configuration and quality gates from the build and test results.

The CI trigger design (push, PR, tag) follows the team practices confirmed by Practices Discovery.

### Inputs

| Artifact | Required | Source |
|---|---|---|
| `build-and-test-summary.md`, `build-test-results.md` | Required | Stage 3.6 |
| `team-practices.md` | Optional | Stage 2.2 |

### Outputs

| Artifact | Description | v2 Counterpart |
|---|---|---|
| `construction/ci-pipeline/ci-config.md` | CI configuration design | ci-config |
| `construction/ci-pipeline/quality-gates.md` | Quality gates | quality-gates |
| `construction/ci-pipeline/ci-pipeline-questions.md` | Confirmed questions and answers | ci-pipeline-questions |
| `construction/ci-pipeline/memory.md` | Learning record of stage execution (Interpretations, Deviations, Tradeoffs, Open questions) | memory |

### Notes

After all Bolts are complete, the phase's `decisions.md` and `traceability.md` are finalized, and the Intent's completion is recorded in `amadeus-state.md`'s `Status` (`Completed`) and `audit/audit.md`'s `WORKFLOW_COMPLETED`.
