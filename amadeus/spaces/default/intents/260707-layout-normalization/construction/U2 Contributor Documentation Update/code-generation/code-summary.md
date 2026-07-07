# Code Summary — U2 Contributor Documentation Update

## Files Modified

- `README.md`
- `docs/README.md`
- `docs/reference/00-overview.md`
- `docs/reference/11-contributing.md`

## Key Decisions

- Added discoverability for `docs/reference/18-workspace-layout.md`.
- Documented that root-level `core/`, `harness/`, `scripts/`, `dist/` remain the framework source/distribution contract.
- Documented that `packages/setup` is a sibling package boundary handled separately.
- Did not change install commands or generated `dist/` paths.

## Tests

No test files were added for U2 because this unit is documentation-only. Build and Test should decide whether to run docs reference gates or broader repository validation.

## Deviations

No deviations from the approved functional design.
