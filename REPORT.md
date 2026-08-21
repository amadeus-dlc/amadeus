# Issue 3403 Report

## Finding

`upgrade --force` routes an onboarding document back to its primary name even when the installed manifest records only the alternate name. The manifest therefore treats an existing shared primary such as `CLAUDE.md` as unknown framework-owned content and the old plan action was `update`, overwriting it without a backup.

The supervisor ruling selected the fail-safe behavior: an existing shared destination that is unknown to the manifest must use backup-then-copy under `--force`.

## Implementation

- Updated `buildUpgradeEntries` so a forced, existing, shared destination absent from the installation manifest becomes a `backup` plan entry.
- Kept manifest-known paths, owned files, user-preserved files, install `--force`, and non-forced upgrade behavior unchanged.
- Updated the existing `setup-plan` expectation and rationale.
- Added an end-to-end upgrade regression proving that a user-owned `CLAUDE.md` is backed up as `CLAUDE.md.<timestamp>.bk` before the new onboarding content is copied over it.

## Failing proof

Before the production change, the new regression failed with `update` instead of `backup`, and the real pipeline produced zero backup files. After the change, both the unit plan assertion and the filesystem-level regression pass; the backup contains the user's original bytes.

## Verification

- `bun test tests/unit/setup-plan.test.ts tests/integration/setup-upgrade-flow.test.ts`: PASS (32 tests, 121 assertions).
- Setup unit/integration/smoke suite: PASS (393 tests, 0 failures, 3821 assertions).
- `bun run build`: PASS.
- `bun run check`: PASS. Existing Biome diagnostics remain warnings/infos only.
