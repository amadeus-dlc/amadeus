---
name: amadeus-decision-review
description: >-
  Internal skill that, at Amadeus phase skill startup, re-evaluates the
  decision tree from existing artifacts and currently referenceable evidence,
  and decides whether to invoke `amadeus-grilling`, proceed to normal
  processing, return to structural repair, or report as a follow-up Issue
  candidate. Does not execute questions itself; creates a handoff to
  `amadeus-grilling` when needed.
---

# amadeus-decision-review

## Purpose

Re-evaluate decision-making at phase skill startup.

Read existing artifacts, Issues, PRs, the work tree, validator results, Skill
Contract, and trusted reference sources as input evidence, and choose the next
processing branch for each Decision Node.

At phase skill startup, also treat the
stage assumptions of the skill supply source and the execution environment as
input evidence.
Confirm availability separately for
the source skill, promoted artifacts, and host environment.
Confirm stage0, stage1, stage2, and the stage0 adoption decision, and when
treating stage2 as stage0, include the human stage0 adoption decision as
evidence.

This skill is a decision gate.
Delegate question execution to `amadeus-grilling`.

## Inputs

- Target phase skill.
- Target Intent or artifact set.
- Execution mode.
- User input.
- Existing artifacts.
- Issues, PRs, work tree.
- validator results.
- Skill Contract.
- Trusted reference sources.
- Stage assumptions of the skill supply source and the execution environment.
- Availability of the source skill, promoted artifacts, and host environment.
- stage0, stage1, stage2, and the stage0 adoption decision.

## Decision Nodes

| Node | What to check | Main inputs |
|---|---|---|
| DN001 | Can the target Intent or artifact set be resolved? | User input, `aidlc/`, Issue |
| DN002 | Does the phase gate or the preceding artifacts satisfy the execution condition? | `aidlc-state.md` (Stage Progress, Phase Progress), `audit/audit.md`, traceability, decisions |
| DN003 | Are the stage assumptions of the skill supply source and the execution environment satisfied? | source skill, promoted artifacts, host environment, stage0, stage1, stage2, stage0 adoption decision |
| DN004 | Can this be decided using only existing artifacts and currently referenceable evidence? | Existing artifacts, work tree, Skill Contract |
| DN005 | Is this a problem solvable by structural repair alone? | validator results, required headings, links, state |
| DN006 | Is a shortage of artifacts from a preceding phase or preceding stage blocking the current success condition? | scope, requirements, acceptance, Bolt, Skill Contract, stage assumptions |
| DN007 | Is this a minor issue outside the current Intent's success condition? | scope, requirements, acceptance, Bolt |

## Outcome

| outcome | Purpose | Next processing |
|---|---|---|
| `grill_required` | Human judgment is needed and cannot be resolved with existing artifacts or the work tree alone. | Hand off to `amadeus-grilling`. |
| `no_grill` | Can be decided from existing artifacts and currently referenceable evidence. | Proceed to normal processing. |
| `repair_only` | Solvable by artifact structure repair alone. | Proceed to the target phase skill's `repair`. |
| `upstream_feedback_required` | A shortage, contradiction, or granularity error in a preceding phase's or preceding stage's artifacts is blocking the current Intent's success condition. | Return to the applicable phase skill or internal stage skill. |
| `follow_up_issue_candidate` | Outside the current Intent's success condition, but can be treated as a follow-up Issue candidate. | Create an Issue after human approval. |

## Deterministic grilling Triggers

In decision review at phase skill startup, evaluate the following
deterministic triggers before discretionary judgment.

If the required artifacts of the preceding phase have one or more remaining
items under the `未確定事項` and `未確認事項` headings that contain
「<現在 phase> で判断する」, set the outcome to `grill_required`.
The calling phase skill confirms each matching item one question at a time,
following the `amadeus-grilling` protocol.

Items that can be resolved through investigation (checking existing artifacts,
checking actual data) can skip the question if the resolution evidence is
recorded.
Confirm only the remaining items, one question at a time.

To make this determination work, write unresolved items passed to a
subsequent phase in the form 「〜は <phase> で判断する。」.

## Grilling Handoff

Only when the outcome is `grill_required`, return the following to the
calling phase skill.

- One question.
- Reason for confirming.
- Recommended answer.
- Reason for the recommendation.
- Candidate reflection target.
- Decision Node.
- Supporting input evidence.

`amadeus-decision-review` does not display questions.
The calling phase skill asks exactly one question, following
`amadeus-grilling`'s question protocol.

## Boundaries

Owns:

- Classification of input evidence.
- Re-evaluation of Decision Nodes.
- Classification of the outcome.
- Selection of the handoff items passed to `amadeus-grilling`.
- Confirmation of the stage assumptions of the skill supply source and the
  execution environment.

Does not own:

- `amadeus-grilling`'s question protocol.
- Changing the placement of the Grilling Decision Trail.
- Content approval by the validator.
- Quality evaluation by the evaluator.
- Bulk migration of existing Intent artifacts.
- Automatic detection of the host environment.
- Automation of the stage0 adoption decision.
- Automatic creation of GitHub Issues.

## stage Assumption Check

At phase skill startup, confirm the following evidence separately.

| Evidence | What to check | Main classification when not satisfied |
|---|---|---|
| source skill | Does `skills/amadeus-*` have the target skill or an internal skill? | `upstream_feedback_required` |
| promoted artifacts | Is the source skill's content reflected in `.agents/skills/amadeus-*`? | `repair_only` or `upstream_feedback_required` |
| host environment | Can the target skill be used in the current execution environment? | `upstream_feedback_required` |
| stage0 | Is it the skill, validator, and dev script available from the build workspace at the start of work? | `no_grill` or `upstream_feedback_required` |
| stage1 | Is it the in-progress source skill and validation results in the target workspace? | `no_grill` or `repair_only` |
| stage2 | Is it the state where the target workspace's promoted artifacts, examples, and validator all pass together? | `follow_up_issue_candidate` or `upstream_feedback_required` |
| stage0 adoption decision | Is there a human decision to treat stage2 as the next stage0? | `upstream_feedback_required` |

Do not treat stage2 as the next stage0 without the stage0 adoption decision.
validator or CI success is a candidate piece of evidence for the stage0
adoption decision, not the decision itself.
For a distributed skill, treat this as a general description of the source
skill, promoted artifacts, host environment, and stage assumptions, not an
explanation premised on a specific repository's Issue number.

## Validation Boundary

The validator's `pass` means that the minimum structural conditions referenceable at runtime are satisfied, and it is not content approval.
The evaluator's result is a quality evaluation; the phase skill or human
judgment classifies where it is adopted.
Skill Contract is input evidence and boundary information, not the decision
review's result itself.

## Prohibitions

- Do not execute questions.
- Do not line up multiple questions.
- Do not change the Grilling Decision Trail's structure.
- Do not adopt the validator's `pass` alone as grounds for skipping questions.
- Do not mix issues outside the current Intent's success condition into the
  current artifacts.
