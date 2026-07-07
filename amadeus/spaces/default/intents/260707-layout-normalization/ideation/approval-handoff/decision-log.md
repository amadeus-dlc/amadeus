# Ideation Decision Log

## Decisions

| ID | Decision | Source |
| --- | --- | --- |
| D-01 | Use a custom Amadeus scope named `workspace-layout-normalization` instead of stock `refactor` or `feature`. | Compose gate approval. |
| D-02 | Treat issue #610 as a repository-architecture design intent, not immediate migration. | Intent Capture. |
| D-03 | Keep `packages/setup` implementation out of this workflow; it will proceed in a separate parallel intent. | User clarification during Feasibility. |
| D-04 | Proceed without waiting for `packages/setup` to exist in this checkout. | Feasibility update. |
| D-05 | Preserve status quo and no-migration as valid outcomes. | Scope Definition. |
| D-06 | Require path-impact inventory before migration planning. | Feasibility and Scope Definition. |
| D-07 | Treat generated `dist/<harness>/` and self-install drift guards as constraints, not optional cleanup. | Team/project practices and Feasibility. |

## Skipped Ideation Stages

| Stage | Reason |
| --- | --- |
| market-research | Internal repository architecture decision; no external market validation needed. |
| team-formation | No new delivery team formation needed at Ideation. |
| rough-mockups | No UI or visual workflow is in scope. |

## Accepted Risks

| Risk | Accepted For Inception? | Condition |
| --- | --- | --- |
| Large path churn if full normalization is selected. | Yes | Reverse engineering and design must inventory blast radius before implementation. |
| `packages/setup` is absent in this checkout. | Yes | Treat it as a sibling dependency and do not absorb its implementation. |
| ADR destination is not yet fixed. | Yes | Later design stages choose between docs path and Amadeus artifacts. |

## Open Items For Inception

- Determine the canonical design-record location.
- Inventory exact code, test, and documentation path assumptions.
- Compare candidate layouts with explicit migration/no-migration consequences.
- Decide whether any implementation slice should be included in this workflow or deferred to follow-up issues.
