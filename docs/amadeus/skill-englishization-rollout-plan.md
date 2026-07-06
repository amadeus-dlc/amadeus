# Skill Englishization Rollout Plan

This document defines, as the decision of Issue #402, the staged englishization units, priority order, and verification commands for the remaining Amadeus skills.

Issue #402 is complete once the rollout units are fixed, but the parent Issue #399 does not close until RU002–RU006 defined in this document are executed to completion.

It builds on Issue #395's [Skill Language Policy](skill-language-policy.md), Issue #400's englishization of the representative skill, and Issue #401's [AI-DLC v2 Difference Response Plan](aidlc-v2-difference-response-plan.md).

Note: the tables below list skill names as they existed when this plan was written (Issue #402). Several were later renamed to the phase-prefix-free `amadeus-<stage>` form or retired; see [skills/amadeus/references/stage-catalog.md](../../skills/amadeus/references/stage-catalog.md) for the current inventory.

## Policy

The remaining skills are not englishized all at once.

Pull requests are split by phase or skill family.

Each pull request states clearly, in its description, the boundary between translation changes, semantic changes, the promotion flow, and verification results.

Templates, generated Amadeus DLC artifacts, `amadeus/**/*.md`, and user-facing gate text remain Japanese-retained targets.

## Current baseline

| Category | Skill |
|---|---|
| Representative skill already englishized | `amadeus-construction-functional-design` |
| Remaining source skills | The 31 files under `skills/amadeus*/SKILL.md` other than `amadeus-construction-functional-design` |
| Promoted destination | `.agents/skills/amadeus*/SKILL.md` |

## Priority order

| Priority | Rollout Unit | Target skills | Reason for handling first | Precondition |
|---:|---|---|---|---|
| 0 | Representative foundation | `amadeus-construction-functional-design` | A small foundation pull request already confirmed englishization, the promotion flow, and the verification method. | Already complete. |
| 1 | AI-DLC v2 difference PRs | Skills touched by #391, #393, #392, #394 | Decisions on reviewer, sensor, Learn, Build and Test, and the Operation phase affect the vocabulary and meaning preservation of the following englishization work. | Follows the order in #401. |
| 2 | Core entrypoints and verification | `amadeus`, `amadeus-steering`, `amadeus-validator` | Aligns first the vocabulary of the single public entry point, Space initialization, and verification that later stage skills reference. | The Operation phase boundary decision from #394 has been reflected. |
| 3 | Construction stage skills | `amadeus-construction-nfr-requirements`, `amadeus-construction-nfr-design`, `amadeus-construction-infrastructure-design`, `amadeus-construction-code-generation`, `amadeus-construction-build-and-test`, `amadeus-construction-ci-pipeline` | Same phase as the representative skill, so the findings from B001 through B004 are most directly reusable. | The decisions from #391, #393, and #392 have been reflected. |
| 4 | Inception stage skills | `amadeus-inception-reverse-engineering`, `amadeus-inception-practices-discovery`, `amadeus-inception-requirements-analysis`, `amadeus-inception-user-stories`, `amadeus-inception-refined-mockups`, `amadeus-inception-application-design`, `amadeus-inception-units-generation`, `amadeus-inception-delivery-planning` | This phase produces Construction's input artifacts, so the terminology across stages needs to be aligned together. | The decisions from #391 and #393 have been reflected. |
| 5 | Ideation stage skills | `amadeus-ideation-intent-capture`, `amadeus-ideation-market-research`, `amadeus-ideation-feasibility`, `amadeus-ideation-scope-definition`, `amadeus-ideation-team-formation`, `amadeus-ideation-rough-mockups`, `amadeus-ideation-approval-handoff` | Aligns the vocabulary handed from Intent's entry point to Inception, after the connection with Inception. | The decisions from #391 and #393 have been reflected. |
| 6 | Supporting analysis and review skills | `amadeus-grilling`, `amadeus-domain-grilling`, `amadeus-domain-modeling`, `amadeus-event-storming`, `amadeus-decision-review`, `amadeus-history-review`, `amadeus-learning-review` | Aligns the vocabulary of supporting analysis and review skills after the phase skills' vocabulary is fixed. | Englishization of Core entrypoints and verification is complete. |

## Pull request split

| PR Unit | Change scope | Split criterion |
|---|---|---|
| RU001 | AI-DLC v2 difference PRs | A separate pull request per Issue among #391, #393, #392, #394. Not mixed into englishization-only pull requests. |
| RU002 | Core entrypoints and verification | Bundles `amadeus`, `amadeus-steering`, `amadeus-validator` into one pull request. If the diff is large, split `amadeus` into its own pull request. |
| RU003 | Construction stage skills | Bundles Construction stage skills into one pull request. Include `amadeus-construction-build-and-test` only after the decision in #392. |
| RU004 | Inception stage skills | Bundles Inception stage skills into one pull request. For skills that were also targets of #391 and #393, treat this as a diff check only if they were already updated in those pull requests. |
| RU005 | Ideation stage skills | Bundles Ideation stage skills into one pull request. Include `amadeus-ideation-rough-mockups` only after confirming the decisions in #391 and #393. |
| RU006 | Supporting analysis and review skills | Bundles supporting analysis and review skills into one pull request. If the diff is large, split into a domain group and a review group. |

Per the human instruction of 2026-07-03 (Issue #399 recovery), RU002–RU006 were executed together in a single recovery pull request ([PR #417](https://github.com/amadeus-dlc/amadeus/pull/417)). This decision is recorded in the target Intent's `construction/decisions.md` (CD007). The preconditions for RU002–RU006 — the decisions from #391–#394 — remain incomplete, but the recovery pull request performs translation only and does not change meaning, so it does not conflict. #391–#394 continue against the post-englishization body text.

## Verification commands

Each englishization pull request runs at least the following.

```sh
bun run dev-scripts/promote-skill.ts <skill-name> --replace
npm run test:it:promote-skill
npm run test:all
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260703-amadeus-skill-english-rollout-plan
git diff --check
```

For a pull request that changes multiple skills, run `promote-skill.ts` for every changed source skill.

When the `SKILL.md` frontmatter description changes, check whether the same skill's `agents/openai.yaml` needs updating.

Confirm the synchronization between the source skill and the promoted skill for each changed skill.

## Preservation Pass

Each englishization pull request confirms the following for each changed skill.

| Category | What to confirm |
|---|---|
| Trigger boundary | The conditions under which the skill should and should not fire are unchanged. |
| Stage procedure | The handling of checkboxes, audit events, gates, skip, resume, and halt-and-ask is unchanged. |
| Artifact contract | The list of files the skill may create or update, and the Japanese-retained targets, are unchanged. |
| Knowledge flow | The roles of `memory.md`, `decisions.md`, `traceability.md`, `grillings`, the Domain Map, and the Context Map are unchanged. |
| Promotion flow | `.agents/skills/**` is synchronized from the source skill through the promotion flow. |
| Metadata | Whether `agents/openai.yaml` needs updating has been checked. |

## Avoiding conflicts with #391 through #394

#391, #393, #392, and #394 are not mixed into englishization-unit pull requests.

However, when a target skill is changed in one of those pull requests, only the touched `SKILL.md` may be moved toward English style.

In that case, the pull request description explains the AI-DLC v2 difference response and the englishization part separately.

RU002 through RU006 state in the pull request description that the corresponding decisions from #391, #393, #392, and #394 have been merged, or that they are out of scope.

## Completion condition for Issue #402

Issue #402 is complete once the pull request containing this document is merged and the remaining skills' englishization units, priority order, verification commands, and the conflict avoidance with #391 through #394 can be tracked.

The actual completion of englishizing the remaining skills is not included in Issue #402's completion condition.

However, the actual completion of englishizing the remaining skills is included in Issue #399's completion condition.
