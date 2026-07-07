# Code Summary — U1 Layout Decision Record

## Files Created

- `docs/reference/18-workspace-layout.md`
- `amadeus/spaces/default/intents/260707-layout-normalization/construction/U1 Layout Decision Record/code-generation/code-generation-plan.md`
- `amadeus/spaces/default/intents/260707-layout-normalization/construction/U1 Layout Decision Record/code-generation/code-summary.md`

## Key Decisions

- Added a repository-level design record for Issue #610 under `docs/reference/`.
- Recorded package-owned framework source layout as the implemented decision.
- Moved framework source to `packages/framework/core` and `packages/framework/harness`.
- Kept root-level `scripts/` and `dist/` as repository-level build/distribution contracts.
- Treated `packages/setup` as a sibling package handled by a separate intent.
- Preserved `dist:check` and `promote:self:check` as release/drift guards.

## Tests

No test files were added for U1. The migration changes source paths and packaging resolution, so Build and Test must run typecheck, packaging drift guards, and targeted packaging parity.

## Deviations

User-directed deviation after the initial approval: implementation now includes moving `core` and `harness` under `packages/framework/` while preserving root `scripts/` and `dist/`.
