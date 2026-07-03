---
name: amadeus-history-review
description: >-
  Internal Amadeus skill. Analyze past artifacts, Issues, PRs, and CI results
  under `aidlc/` read-only to extract reuse decisions, unresolved items,
  recurring problems, and follow-up candidates. Do not update artifacts and do
  not create Issues. Return the analysis result, handing off to
  `amadeus-learning-review` or the `amadeus` Intake as needed.
---

# amadeus-history-review

## Purpose

Cross-analyze the Space's (`aidlc/spaces/<space>/`) past artifacts read-only,
and return reuse information and gaps usable for the current decision.

This skill is the entry point for historical analysis.
Do not update artifacts, do not create GitHub Issues, do not create Intent Records, and do not auto-promote into the Domain Map and Context Map.

## Inputs

- The working directory under analysis.
- The target Intent or target theme.
- Any Issues, PRs, and CI results.
- The Space's (`aidlc/spaces/<space>/`) `memory/` and `knowledge/`.
- The Space's (`aidlc/spaces/<space>/`) `intents/`.
- The most recent validator result or eval result.

If inputs are insufficient, leave the missing items in the analysis result's
unresolved items.
Do not create artifacts by guesswork because of insufficient input.

## Reading Targets

Read these artifacts with priority:

- `aidlc/spaces/<space>/memory/org.md`
- `aidlc/spaces/<space>/memory/team.md`
- `aidlc/spaces/<space>/memory/project.md`
- `aidlc/spaces/<space>/knowledge/glossary.md`
- `aidlc/spaces/<space>/knowledge/domain-map.md`
- `aidlc/spaces/<space>/knowledge/context-map.md`
- `aidlc/spaces/<space>/intents/intents.md`
- `aidlc/spaces/<space>/intents/**/aidlc-state.md`
- `aidlc/spaces/<space>/intents/**/ideation/traceability.md`
- `aidlc/spaces/<space>/intents/**/inception/requirements-analysis/requirements.md`
- `aidlc/spaces/<space>/intents/**/inception/traceability.md`
- `aidlc/spaces/<space>/intents/**/construction/**`

Supplementary information to read only when needed:

- GitHub Issues.
- PRs and review comments.
- CI results.
- Validator results.
- Evaluator results.
- Skill Contract.

## Extraction Results

Split the analysis result into the following items.

| Item | Content | Primary handoff target |
|---|---|---|
| Reuse decision | Whether an existing artifact or decision can be reused for the current work. | phase skill |
| Unresolved items | Items that cannot be settled from current evidence alone. | `amadeus-grilling`, phase skill |
| Recurring problem | A problem spanning multiple Intents, Issues, PRs, or CI results. | `amadeus-learning-review` |
| Upstream feedback candidate | A gap or contradiction in an upstream artifact that blocks the current Intent's success condition. | `amadeus-learning-review` |
| Steering knowledge candidate | Knowledge that may be worth reflecting into the Space's `memory/` and `knowledge/`. | `amadeus-learning-review` |
| Domain Map candidate | Content requiring adoption consideration as a shared boundary. | `amadeus-learning-review` |
| Context Map candidate | Content requiring adoption consideration as an inter-context dependency. | `amadeus-learning-review` |
| Follow-up Issue candidate | An issue outside the current Intent's success condition but small enough to track. | human decision |
| Follow-up Intent candidate | An issue large enough to be treated as an independent Intent. | human decision |
| Not-adopted note | An item with a reason it is not handled this time. | phase skill |

The Domain Map and Context Map do not hold candidates; they hold only the
current index of approved `adopted` and `retired` entries.
Therefore, report Domain Map candidates and Context Map candidates as part of
the analysis result.
Do not auto-promote into the Domain Map and Context Map.

## Output

Return the output as a Markdown report.

Include at least the following:

- The analysis target.
- The artifacts read.
- The extraction results.
- The rationale.
- The unresolved items.
- The recommended next skill.

If machine-readable JSON is needed, leave it as a follow-up Issue candidate in
the current analysis result.

## Next Skill

Hand off to `amadeus-learning-review` when learning-destination
classification is needed.

When used to judge a new work theme, pass the result as input to the
`amadeus` Intake. However, `amadeus` does not own the historical analysis
itself.

When a human decision is needed, the calling phase skill hands off to
`amadeus-grilling`. `amadeus-history-review` does not execute questions.

## Boundaries

Owns:

- Selecting the reading targets.
- Analyzing past artifacts.
- Pre-classification organization of extraction results.
- Organizing the rationale.

Does not own:

- Updating artifacts.
- Creating GitHub Issues.
- Creating Intent Records.
- Creating PRs.
- Auto-promoting into the Domain Map and Context Map.
- The final decision on learning-destination classification.
- The `amadeus` Intake's decision body.
- Executing `amadeus-grilling`'s questions.

## Validation Boundary

The validator's `pass` means that the minimum structural conditions
referenceable at runtime are satisfied, and it is not content approval.
The evaluator's result is quality evaluation; the phase skill or human
decision classifies its adoption destination.

## Prohibitions

- Do not update artifacts.
- Do not create GitHub Issues.
- Do not create Intent Records.
- Do not auto-promote into the Domain Map and Context Map.
- Do not execute questions.
- Do not mix issues outside the current Intent's success condition into
  current artifacts.
