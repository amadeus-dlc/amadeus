---
name: amadeus-learning-review
description: >-
  Internal Amadeus skill. Takes as input the analysis results from
  `amadeus-history-review`, validator results, evaluator results, Issues, PRs,
  and CI results, and classifies them into current phase update required,
  upstream feedback, steering knowledge, Domain Map, Context Map, follow-up
  Issue, follow-up Intent, or no action required. Does not ask questions or
  update artifacts. Returns a handoff to `amadeus-grilling` or the phase skill
  when needed.
---

# amadeus-learning-review

## Purpose

Classify past analysis results and validation results into Amadeus DLC
learning destinations.

This skill is a classification gate.
Do not update artifacts, do not create GitHub Issues, and do not auto-promote into the Domain Map and Context Map.
When a question is needed, return a handoff to `amadeus-grilling`.

## Inputs

- Analysis results from `amadeus-history-review`.
- Validator results.
- Evaluator results.
- GitHub Issues.
- PRs and review comments.
- CI results.
- The target Intent or target artifact.
- Skill Contract.
- The calling phase skill.

When inputs are insufficient, return a handoff candidate to
`amadeus-grilling`.
Do not update artifacts by guesswork because of insufficient inputs.

## Classification Results

| Classification | Purpose | Return Destination |
|---|---|---|
| `current_phase_update_required` | Can be resolved within the current phase and is required for the current Intent's success conditions. | The calling phase skill |
| `upstream_feedback_required` | A gap or contradiction in an upstream artifact that blocks the current Intent's success conditions. | The upstream phase skill or a repair policy |
| `steering_knowledge_candidate` | Knowledge that may be worth keeping in the Space's `memory/` and `knowledge/`. | Human judgment or a steering update candidate |
| `domain_map_candidate` | Needs consideration for adoption as a shared boundary. | Human judgment or domain modeling |
| `context_map_candidate` | Needs consideration for adoption as an inter-context dependency. | Human judgment or domain modeling |
| `follow_up_issue_candidate` | Outside the current Intent's success conditions, but a small, trackable issue. | A GitHub Issue after human approval |
| `follow_up_intent_candidate` | An issue large enough to treat as an independent Intent. | An Intent candidate after human approval |
| `no_learning_action` | Does not need to be reflected into any learning destination. | None |

The Domain Map and Context Map do not handle candidates; they handle only
the current index of approved `adopted` and `retired` entries.
Therefore, report `domain_map_candidate` and `context_map_candidate` as
candidates, and do not auto-promote into the Domain Map and Context Map.

## Judgment Order

1. Check whether it blocks the current Intent's success conditions.
2. Check whether it can be resolved within the current phase.
3. Check whether it is a gap or contradiction in an upstream artifact.
4. Check whether it is knowledge that should be considered for adoption into
   the Space's `memory/` and `knowledge/`, the Domain Map, or the Context Map.
5. Check whether it should be split off as a follow-up Issue or a follow-up
   Intent.
6. If none of the above apply, classify it as `no_learning_action`.

## Grilling Handoff

Only when human judgment is needed, return the following to the calling
phase skill.

- One question.
- The reason for asking.
- A recommended answer.
- The reason for the recommendation.
- The candidate reflection destination.
- The candidate classification.
- The input evidence used as grounds.

`amadeus-learning-review` does not display questions.
The calling phase skill asks exactly one question, following
`amadeus-grilling`'s question protocol.

## Phase Skill Coordination

`current_phase_update_required` is handled by the calling phase skill.
`upstream_feedback_required` is treated as a gap or contradiction in an
upstream phase's artifact.
`follow_up_issue_candidate` and `follow_up_intent_candidate` become
follow-up work only when a human approves.

Create a GitHub Issue only when a human approves turning it into an Issue.
Create an Intent Record only when a human approves turning it into an
Intent.

## Boundaries

Owns:

- Classifying input evidence into learning destinations.
- Organizing the grounds for classification.
- Presenting candidate return destinations.
- Selecting the handoff items for `amadeus-grilling`.

Does not own:

- The body of `amadeus-history-review`'s past analysis.
- Updating artifacts.
- Creating GitHub Issues.
- Creating Intent Records.
- Creating PRs.
- Auto-promoting into the Domain Map and Context Map.
- Executing `amadeus-grilling`'s questions.
- The body of `amadeus`'s Intake decision.

## Validation Boundary

The validator's `pass` means that the minimum structural conditions
referenceable at runtime are satisfied, and it is not content approval.
The evaluator's result is a quality evaluation; classify the adoption
destination via the phase skill or human judgment.
The Skill Contract is input evidence and boundary information, not the
classification result itself.

## Prohibitions

- Do not update artifacts.
- Do not create GitHub Issues.
- Do not create Intent Records.
- Do not auto-promote into the Domain Map and Context Map.
- Do not ask questions.
- Do not mix issues outside the current Intent's success conditions into
  current artifacts.
