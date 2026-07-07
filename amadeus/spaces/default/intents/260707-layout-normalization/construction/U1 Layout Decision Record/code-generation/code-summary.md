# Code Summary — U1 Layout Decision Record

## Files Created

- `docs/reference/18-workspace-layout.md`
- `amadeus/spaces/default/intents/260707-layout-normalization/construction/U1 Layout Decision Record/code-generation/code-generation-plan.md`
- `amadeus/spaces/default/intents/260707-layout-normalization/construction/U1 Layout Decision Record/code-generation/code-summary.md`

## Key Decisions

- Added a repository-level design record for Issue #610 under `docs/reference/`.
- Recorded staged mixed layout as the recommended decision.
- Kept root-level `core/`, `harness/`, `scripts/`, `dist/` as the framework layout.
- Treated `packages/setup` as a sibling package handled by a separate intent.
- Preserved `dist:check` and `promote:self:check` as release/drift guards.

## Tests

No test files were added for U1 because this unit is documentation-only and does not change runtime code. Build and Test should still decide whether docs/reference checks or repository-wide validation commands are needed after U2/U3 complete.

## Deviations

No deviations from the approved functional design. Link/navigation updates are intentionally left for U2 Contributor Documentation Update.
