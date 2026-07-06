# Amadeus Lifecycle Contract Overview

## Positioning

This document family is the target contract for the v2-compatible lifecycle established by [Issue #369](https://github.com/amadeus-dlc/amadeus/issues/369).

It defines the contract for implementing AI-DLC v2's ([awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows), `v2` branch) Ideation, Inception, and Construction specifications in Amadeus with semantic compatibility.

The legacy model's per-stage contracts (`docs/amadeus/stages/`) were replaced by this contract and removed in #369's retirement wave. The Space contract is described in [steering.md](../steering.md).
Until the replacement, running skills follow the legacy contract, and #369's implementation work follows this contract.

## Compatibility policy

Compatibility applies to specification and semantics.

The following are kept aligned with v2:

- Stage responsibilities, execution conditions (ALWAYS / CONDITIONAL), and the meaning of input and output artifacts.
- Intake's determination (default to merge, birth proposal with human approval).
- Scope adaptation (stage-set reduction and depth by scope).
- The gate state machine (stage approval, Bolt gates, revision loop).
- Question protocol artifacts (questions files and recorded answers).

The following keep Amadeus's own expression:

- Artifacts are written in Japanese Markdown.
- Intent records are laid out in record directories (`intents/<YYMMDD>-<label>/`); the canonical ledger is held by `intents.json`.
- State is managed by `amadeus-state.md` (Stage Progress checkboxes) and `audit/audit.md` (events), directly under the record.
- Structural validation is owned by `amadeus-validator`.
- Questions are presented through the `amadeus-grilling` protocol (one at a time, with a recommended answer).
- The human gate at phase boundaries and Bolt completion is done through a PR and a human merge.

## Intent definition and acceptance criteria

**Intent**: an outcome whose completion can be judged independently and that has observable success criteria; the unit of work for one turn of the lifecycle.

An Intent's acceptance criteria are the following three qualitative conditions.

1. It has observable success criteria. For a technical Intent, this includes behavior to preserve (preserve conditions) and an observable improvement metric.
2. Its completion can be judged independently.
3. It does not belong to an existing Intent's outcome.

Numeric proxies such as a Unit count or a Bolt count are not acceptance criteria.
The Unit count and Bolt count at Ideation time are unmeasured projections and cannot become verifiable conditions.

An input that does not meet the acceptance criteria is not rejected.
It is guided by questions; it is accepted once its success criteria can be articulated, and it is routed to a merge if it belongs to an existing Intent's success conditions.
This corresponds to v2's Principle 2 (Every Intent Starts Ambiguous).

## Intake

**Intake**: the determination the single entry point makes first when it receives an input.

Intake determines in the following order.

1. Continuation check. If the input is an active Intent or a continuation of an existing Intent, it proceeds to that Intent's next stage. When the determination is unclear, it is treated as a continuation (v2's Default to CONTINUATION).
2. Merge check. If the input is new work that belongs to an existing Intent's outcome, adding it to that Intent's scope backlog is proposed.
3. Acceptance criteria check. An input that looks like a new outcome is checked against the three acceptance criteria. If it does not meet them, it is guided by questions.
4. Scope estimation. Scope is estimated from the input's keywords. When it cannot be estimated, or when the input is only long enough to be a theme description, `feature` is the default.
5. Birth proposal. Creating a new Intent is confirmed with the human as a proposal that states the estimated scope explicitly. An Intent is never created without the human's explicit approval (v2's never auto-birth).

Intake does not judge an Intent's size numerically.
At most one Intent is born from a single input, and the scope backlog is the receiving point for the remaining work within the theme.

## Single entry point and routing

The lifecycle's public entry point is a single skill.

The public entry point performs Intake, reads the target record's `amadeus-state.md`, resolves the next stage to run from the scope and stage progress state, and invokes the corresponding internal skill.

The user does not choose a phase or a stage.
Resolving the phase and the stage is the entry point's responsibility.

An interrupted Intent resumes from `amadeus-state.md`'s Session Resume Point on the next entry-point invocation.

Auxiliary entries remain independent.
`amadeus-grilling`, `amadeus-domain-modeling`, and `amadeus-validator` are out of scope for this contract.

## Phase structure

The lifecycle consists of five phases: Initialization, Ideation, Inception, Construction, and Operation.

**Initialization**: has three stages — Stage 0.1 Workspace Scaffold, 0.2 Workspace Detection, and 0.3 State Initialization. All scopes run it, and it has no approval gate. The single entry point runs it directly and creates the record immediately after the human approves the Birth proposal.

**Ideation**, **Inception**, and **Construction** each have the stages defined by [ideation.md](ideation.md), [inception.md](inception.md), and [construction.md](construction.md) respectively.

**Operation**: has only the record scaffold corresponding to v2's 7 stages. Amadeus does not run any of its stages, and Stage Progress is always `[S]` (`SKIP: out of Amadeus scope`). The reason it is out of scope (artifact contracts, gates, validator, PR boundary) and the treatment of the upstream Operation skills follow [AI-DLC v2 Operation Phase Boundary](../aidlc-v2-operation-phase-boundary.md).

## Scope backlog

**Scope backlog**: the artifact that holds work excluded from an Intent's scope and future work candidates as prioritized proto-Units.

The scope backlog is created by Stage 1.4 Scope Definition as `intent-backlog.md`.

The scope backlog is the receiving point for "what we are not doing this time," and it does not reserve a seat for a future Intent.
Backlog items are either evaluated as Unit candidates in the later Units Generation, or used as the matching target for Intake's merge check.

## Gate contract

Gates consist of three layers.

**Stage gate**: the gate that obtains human approval in-conversation at the completion of each stage.
The approval options are basically Approve and Request Changes.
Only Ideation and Inception stages can offer adding a skipped stage back in as a third option.
If Request Changes occurs three times in a row on the same stage, Accept as-is is added as an option.
On the turn the gate is presented, the entry point waits for an answer and does not proceed without approval.
Approval is recorded in `audit/audit.md` as a `GATE_APPROVED` event.

**Bolt gate**: the gate that applies to Construction's Bolt execution.
The first Bolt (walking skeleton) always has its design artifacts and generated code approved by a human together.
Immediately after the walking skeleton's approval, whether to run the remaining Bolts autonomously or to keep gating is confirmed once (the ladder proposal).
Even during autonomous execution, on failure it stops and confirms with the human (halt-and-ask).

**Phase gate**: phase boundaries (Ideation complete, Inception complete) and Bolt completion are finalized through a PR and a human merge.
A PR is not created per stage.
Limiting the PR unit to phases and Bolts keeps stage-approval round trips within the conversation and holds down the cost of PR round trips.

## Question protocol

Each stage leaves points that need confirmation as a questions file (`<stage-slug>-questions.md`) in the stage directory.

Presenting questions follows the `amadeus-grilling` protocol.
Questions are presented one at a time, each with a recommended answer attached, and the entry point waits for an answer.
Answers are recorded in the questions file.
A confirmed decision that affects an artifact's meaning or a later determination is also recorded in the Grilling Decision Trail.

The volume of questions is guided by depth.

| Depth | Guideline per stage |
|---|---|
| Minimal | 2-4 questions |
| Standard | 5-8 questions |
| Comprehensive | 8-12+ questions |

The guideline is not a ceiling.
Resolving ambiguity and contradiction is mandatory regardless of depth.
Questions decrease as the phase progresses, and Construction treats questions as an exception.

## Artifact layout

Amadeus artifacts are placed under `amadeus/`.
Space artifacts are placed under `amadeus/spaces/<space>/`, and Intent artifacts are placed under that Space's `intents/`.

```text
amadeus/
  active-space                        # cursor (gitignored; points to the current Space name; default if absent)
  spaces/
    default/
      memory/
        org.md                       # organizational defaults
        team.md                      # team working conventions (overrides org.md)
        project.md                   # project-specific judgment criteria (overrides team.md)
        phases/                      # phase-specific supplements (optional)
        templates/                   # project-specific template overrides (optional)
      knowledge/
        glossary.md
        actors.md
        external-systems.md
        background.md
        domain-map.md                # index of adopted or retired Subdomains and Bounded Contexts
        context-map.md               # index of adopted or retired cross-context dependencies
        event-storming/              # Event Storming performed before Intent creation
      codekb/
        <repo>/                      # codebase knowledge (v2's codekb; created in brownfield)
      intents/
        active-intent                # cursor (gitignored; read by Intake's continuation check)
        intents.json                 # registry (the canonical ledger; uuid, slug, dirName, scope, repos, status)
        <YYMMDD>-<label>/            # record
          amadeus-state.md             # Stage Progress, Phase Progress, and more (the sole owner of state)
          verification/
          audit/
            audit.md                 # append-only gate and transition events
          initialization/
            <stage-slug>/
          ideation/
            <stage-slug>/            # per-stage artifacts, <stage-slug>-questions.md, memory.md
            decisions.md             # phase decisions (equivalent to a decision log)
            traceability.md          # Amadeus extension
            grillings.md             # Grilling Decision Trail index
            grillings/
          inception/
            <stage-slug>/
            decisions.md
            traceability.md
            grillings.md
            grillings/
          construction/
            <unit-id>-<slug>/
              <stage-slug>/          # artifacts of per-Unit stages (3.1-3.5)
            bolts/
              <bolt-id>-<slug>/      # Bolt execution record (build-and-test, pr.md)
            ci-pipeline/             # per-Intent (3.7)
            decisions.md
            traceability.md
            grillings.md
            grillings/
          operation/
            <stage-slug>/           # scaffold for v2's 7 stages; Amadeus does not run them
```

The Intent module file (`<dirName>.md`) and the `intents.md` index were retired (GD009).
The content corresponding to v2's intent-statement (purpose, target, success conditions, trigger, scope) is held by `ideation/intent-capture/intent-statement.md`, created by Stage 1.1.
When a human-readable Intent list is needed, it is generated on demand from the canonical ledger `intents.json`.

Codebase knowledge (v2's codekb) is reused across Intents, so it is placed under the Space's `codekb/<repo>/`.

## Stage contract I/O notation

Each stage in the per-phase documents ([ideation.md](ideation.md), [inception.md](inception.md), [construction.md](construction.md)) has a paired `### Inputs` and `### Outputs`.
This section is the authority for the Inputs table's notation.

### Inputs table format

The Inputs table is written with the following three columns.

| Column | Meaning | Label after englishization |
|---|---|---|
| Artifact | The name of an input the stage reads (a record-relative path of an artifact, an existing workspace / Space reference, or an input from Intake). Only inputs whose existence has been confirmed are written. | Artifact |
| Required | One of `Required` / `Optional` / `Conditional (condition name)` / `Required (when <stage name> runs)`. | Required (values are Required / Optional / Conditional (condition) / Required (when <stage> runs)) |
| Source | The producing stage number (`Stage N.M`), `Intake`, `workspace`, or `Space`. | Source |

The meanings of Source's values are as follows.

| Value | Meaning |
|---|---|
| Stage N.M | Supplied by that stage's Outputs. |
| Intake | Supplied by Intake's birth proposal and approval content. |
| workspace | Supplied by the workspace's existing state (codekb, existing repositories). |
| Space | Supplied by the Space's shared assets (`memory/team.md`, and so on). |

Multiple sources are listed with a comma, and alternative sources are written with "or" (for example, `Stage 2.4, 2.5`, `Stage 1.1 or Intake`).

### Correspondence with engine reality

The primary measured source for the Inputs table is the engine's stage definition frontmatter `consumes` (`artifact` / `required` / `conditional_on`) under `.agents/amadeus/amadeus-common/stages/<phase>/<slug>.md`.
`conditional_on` corresponds to `Conditional (condition name)` (for example, `Conditional (brownfield)`).
The upstream-coverage sensor is a pure derivative of `consumes` and is not treated as an independent measured source.
When the document and the engine's description diverge, the document is corrected against the engine's actual behavior.

### When the source stage is CONDITIONAL

The frontmatter's `required: true` means "required if the source stage ran," and it does not include the source stage's own execution condition (`execution: CONDITIONAL`, SKIP by scope).
When the source stage is CONDITIONAL, or can be SKIPped by scope, the required value is written as `Required (when <stage name> runs)` (for example, `Required (when Application Design runs)`).
For input substitution on scope reduction, see "Input substitution on reduction" in [scopes.md](scopes.md).

### Phase-common inputs

Steering/memory references common to all stages (`org.md`, `team.md`, `project.md`, `phases/<phase>.md` — the engine's rules_in_context) are not repeated in each stage's Inputs table; they are written once in each phase document's Phase Overview.

### No inputs that do not exist

Only artifacts and references whose existence has been confirmed against the measured sources above may be written in Inputs.
No input is written from speculation.

## Structural differences from v2

v2's state machine, directory structure, Initialization, audit trail, and Intent registry are adopted with structural parity.
Within the range of semantic compatibility, only the following Amadeus-specific artifacts are kept as intentional differences.

| Item | v2 | Amadeus | Reason |
|---|---|---|---|
| Recording confirmed questions | Bulk entry into a questions file, or a dialogue | The grilling protocol and the Grilling Decision Trail (`grillings.md`, `grillings/`) | Keeps the existing contract of one question at a time with a recommended answer, and keeps an artifact that tracks confirmed decisions. |
| Supplementing the audit trail | Only events in `audit/audit.md` | `traceability.md` (artifact tracking) and `decisions.md` (phase decisions), in addition to `audit/audit.md` | Keeps per-artifact tracking and a decision summary separate from the event stream. |
| Artifact language | English Markdown | Japanese Markdown | Artifacts are written under the Japanese norm (one sentence per line, paragraphs separated by a blank line). |
| reviewer | An independent sub-agent review before the gate, driven by the stage definition's `reviewer` and `reviewer_max_iterations` | Human approval at the stage gate, phase PR and Bolt PR review and CI, mapped to `amadeus-validator` | The final decision remains with a human upstream too, so this maps to the gate contract without changing the approval boundary. See [AI-DLC v2 Reviewer Mapping](../aidlc-v2-reviewer-mapping.md) for detail. |
| sensor | Deterministic checks via the stage definition's `sensors:` (output to `.amadeus-sensors/`) | `required-sections` and `upstream-coverage` map to `amadeus-validator` and `traceability.md`; `linter` and `type-check` map to the Build and Test record and the PR's CI | Does not add a hook execution substrate to the distribution contract. See [AI-DLC v2 Sensor and Learn Mapping](../aidlc-v2-sensor-learn-mapping.md) for detail. |
| Learn | Fixation into the harness through `memory.md`'s 4 headings and the learnings ritual | Mapped to each stage's `memory.md` (the same 4 perspectives), `decisions.md`, `traceability.md`, and the Grilling Decision Trail | Fixation is not automated and goes through a human gate. See [AI-DLC v2 Sensor and Learn Mapping](../aidlc-v2-sensor-learn-mapping.md) for detail. |
| Build and Test failure handling | Attempts diagnosis and fixes up to 2 times, and proceeds to the gate with a record if unresolved | Makes no implementation fix; on failure, halt-and-ask confirms with a human immediately, and the fix is treated as Code Generation's responsibility | Preserves the record's truthfulness and the Bolt gate's approval target. See [AI-DLC v2 Build and Test Failure Handling](../aidlc-v2-build-and-test-failure-handling.md) for detail. |
| Operation phase | Includes 7 stages to run | Has only the record scaffold and the Stage Progress `[S]` rows; does not run them | Because artifact contracts, gates, validator, and the PR boundary do not handle effects on a real environment. See [AI-DLC v2 Operation Phase Boundary](../aidlc-v2-operation-phase-boundary.md) for detail. |

## Major changes from the legacy contract

| Legacy contract | This contract |
|---|---|
| `amadeus-discovery` (pre-splitting of Intent candidates) | Retired. Intake's merge check and the scope backlog replace it. |
| Per-phase public entry points (`amadeus-ideation`, and so on) | Retired. Consolidated into the single entry point. |
| use-cases stage | Retired. user-stories and Functional Design take over. |
| `ideation/scope.md` | Replaced by `scope-definition/scope-document.md` and `intent-backlog.md`. |
| `ideation/ideation.md` | Replaced by `feasibility/feasibility-assessment.md` and `constraint-register.md`. |
| `ideation/mocks/*.puml` | Replaced by `rough-mockups/wireframes.md` and `user-flow.md`. Diagrams can be embedded in PlantUML or Mermaid. |
| `inception/acceptance.md` | Retired. Acceptance criteria are embedded in each requirement in `requirements.md`. |
| Unit Design Brief (`units/<unit-id>/design.md`) | Retired. Application Design and Functional Design replace it. |
| `inception/bolts.md` | Replaced by `delivery-planning/bolt-plan.md`. |
| Bolt preparation's `tasks.md` | Replaced by `code-generation/code-generation-plan.md`. |
| A phase PR per stage | Only phase boundaries and Bolt completion become PRs. |

## Document map

- [scopes.md](scopes.md): scope, depth, and the scope-to-stage mapping table.
- [ideation.md](ideation.md): the contract for Ideation's 7 stages.
- [inception.md](inception.md): the contract for Inception's 8 stages.
- [construction.md](construction.md): the contract for Construction's 7 stages.
- [state.md](state.md): `amadeus-state.md`'s structure and the stage state machine.
