# AI-DLC v2 Sensor and Learn Mapping

## Override Note (D004)

The non-adoption judgment this document made about the sensor execution mechanism and the learnings ritual's deterministic tool was changed to adoption by D004 of Intent `260704-v2-parity-completion`.
Issue #393's non-adoption judgment explicitly stated it would be reconsidered "once a decision confirms including a hook-execution runtime," and the adaptive-copy strategy for upstream's TS engine (D001) satisfied that reconsideration condition.
The inspection setup now combines upstream's sensors (copied per engine, checked immediately at stage completion) with `amadeus-validator` (checked persistently, across the whole workspace).
The body below preserves the Issue #393 judgment as a historical record; read it under this note. The `amadeus-history-review` / `amadeus-learning-review` skills it references were later retired — the §13 learnings ritual (`amadeus-learnings.ts`) owns that role today.

This document defines, as the judgment for Issue #393, which Amadeus DLC artifacts and verifications the sensor and Learn (the learnings ritual and `memory.md`) found in AI-DLC v2's stage definitions map to.

References:

- Repository: https://github.com/awslabs/aidlc-workflows/tree/v2
- Reference commit: `d341522e1491db4884e9127004c3882365229218`
- Sensor declaration: each stage definition's frontmatter `sensors:`; Learn: `core/amadeus-common/protocols/stage-protocol.md` §13

## Decision (Issue #393 — Superseded by D004)

Amadeus DLC does not adopt the sensor execution mechanism (inspection output to `.amadeus-sensors/`, the sensor-fire hook) or the learnings ritual's deterministic tool (the equivalent of `amadeus-learnings.ts`).

The deterministic inspection the sensor carries out is mapped to existing verification; the recording and settling of insights that Learn carries out is mapped to existing artifacts and review skills.

## Sensor Mapping

As of the reference commit there are 4 sensors, declared on stages as follows.

| Sensor | Role upstream | Stages that declare it |
|---|---|---|
| `required-sections` | Checks whether a Markdown artifact contains its required sections | All stages except code-generation |
| `upstream-coverage` | Checks whether an artifact references its upstream artifacts | All stages except code-generation |
| `linter` | Runs the project's linter (outputs the result to `<record>/.amadeus-sensors/`) | Construction's 4 design stages, code-generation, ci-pipeline |
| `type-check` | Runs the project's type-checker | Construction's 4 design stages, code-generation, build-and-test, ci-pipeline |

Amadeus DLC's verification targets are as follows.

| Sensor | Amadeus DLC's verification target |
|---|---|
| `required-sections` | `amadeus-validator`'s structural verification. Checks the artifact's required headings and required items. |
| `upstream-coverage` | Each stage skill's contract for reading its required inputs, plus the phase's `traceability.md` (the correspondence from requirements to artifacts and verification). `amadeus-validator` checks the evidence links. |
| `linter` | Build and Test's (Stage 3.6) execution record (`build-test-results.md` retains the commands and results), plus CI on the Bolt PR and phase PR. |
| `type-check` | Same as above. |

No inspection-result directory equivalent to `.amadeus-sensors/` is added. The recording destination for inspection results is the validator's result report for structural verification, and the Bolt record's `build-test-results.md` for build and test.

## Learn Mapping

Upstream's Learn records under `memory.md` during stage execution, using 4 headings (Interpretations, Deviations, Tradeoffs, Open questions); it surfaces candidates through the learnings ritual at stage completion, and settles them into the harness at human judgment.

Amadeus DLC's recording destinations are as follows.

| Upstream Learn element | Amadeus DLC's recording destination |
|---|---|
| `memory.md`'s Interpretations / Deviations / Tradeoffs / Open questions | Each stage artifact's `memory.md`. The same 4 viewpoints (interpretations, deviations, tradeoffs, open questions) are recorded through the stage skill's procedure. |
| Resolving Open questions | `amadeus-grilling`'s one-question-at-a-time questioning, and the stage's `<stage>-questions.md`. Confirmed judgments are retained in the Grilling Decision Trail (`grillings.md`, `grillings/`). |
| Recording confirmed judgments | The phase's `decisions.md` (including the gate's Accept as-is record), plus stage-specific decision artifacts. |
| Tracking per artifact | The phase's `traceability.md`. Confirmed at the phase boundary by the `amadeus` entry point. |
| Surfacing and settling candidates (the learnings ritual) | `amadeus-history-review` (reading and extracting from past artifacts) and `amadeus-learning-review` (classification). `steering_knowledge_candidate` connects to the Space's `memory/` and `knowledge/`; `domain_map_candidate` and `context_map_candidate` connect to the Domain Map and Context Map; `follow_up_issue_candidate` and `follow_up_intent_candidate` connect to filing an Issue or an Intent. None of these auto-promotes; each goes through human judgment. |

## Items Not Adopted at the Time, and Why (Superseded by D004)

| Item | Reason |
|---|---|
| The sensor execution mechanism (the sensor-fire hook, `.amadeus-sensors/` output) | Does not add a hook-execution runtime to the distribution contract (a single public entry point plus a skill set). Deterministic inspection is already carried out by `amadeus-validator`, Build and Test, and CI. |
| The learnings ritual's deterministic tool (the equivalent of `amadeus-learnings.ts`) | Surfacing and classifying candidates is carried out by the `amadeus-history-review` and `amadeus-learning-review` contract, and settling retains the existing contract that goes through a human gate. |

## Tracking from Stage Skills

Each stage skill's `SKILL.md` Gate section states that stage's sensor declaration and its mapping on the Amadeus side.

Recording the 4 viewpoints in `memory.md` is already included in each stage skill's procedure.

## Future Reconsideration Conditions

Reconsider adopting the sensor execution mechanism in a separate Issue if either of the following occurs:

- Operational experience confirms artifact omissions, undetectable by the validator and CI, occurring frequently as gate rejections.
- A separate decision confirms including a hook-execution runtime in the distribution contract.

## Related Documents

- [AI-DLC v2 Difference Response Plan](aidlc-v2-difference-response-plan.md)
- [AI-DLC v2 Reviewer Mapping](aidlc-v2-reviewer-mapping.md)
- [Lifecycle Contract Overview](lifecycle/overview.md)
