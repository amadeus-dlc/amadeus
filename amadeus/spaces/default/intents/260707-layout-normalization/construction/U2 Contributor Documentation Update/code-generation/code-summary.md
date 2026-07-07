# Code Summary — U2 Contributor Documentation Update

## Files Modified

- `README.md`
- `docs/README.md`
- `docs/reference/00-overview.md`
- `docs/reference/11-contributing.md`

## Key Decisions

- Added discoverability for `docs/reference/18-workspace-layout.md`.
- Documented that framework authored source now lives under `packages/framework/core` and `packages/framework/harness`.
- Documented that root `scripts/` and `dist/` remain repository-level build/distribution contracts.
- Documented that `packages/setup` is a sibling package boundary handled separately.
- Did not change install commands or generated `dist/` paths.

## Tests

No test files were added for U2. Build and Test should run docs reference gates and broader repository validation because path assumptions changed.

## Deviations

User-directed deviation after the initial approval: contributor docs now describe the actual source relocation, not a no-migration decision.
