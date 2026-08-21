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

## #3402 statusline marker

- Scope: `self-fix`.
- Baseline: `bun test tests/e2e/t-tui-statusline.serial.test.ts` reached the real tmux TUI but failed after waiting for the stale `\\[AIDLC\\]` marker; the captured pane contained the rendered `[Amadeus-DLC] ready` line.
- Fix: exported the statusline implementation's canonical `STATUSLINE_PREFIX`, changed the TUI test's wait pattern and assertions to derive from it, and guarded the hook entrypoint with `import.meta.main` so importing the constant has no render side effect.
- The target test contains no hard-coded `AIDLC` or `Amadeus-DLC` marker literal.

### Verification

- `bun run build` — pass; regenerated all distributions.
- `bun run check` — pass; typecheck and distribution checks passed. Lint reported repository baseline warnings only.
- `git diff --check` — pass.
- `bun test tests/e2e/t-tui-statusline.serial.test.ts` — pass in local tmux after the final distribution build:

```text
bun test v1.3.13 (bf2e2cec)

tests/e2e/t-tui-statusline.serial.test.ts:
(pass) t-tui-statusline (statusline renders in a real terminal) > [Amadeus-DLC] ready paints in the launched TUI [18548.29ms]

 1 pass
 0 fail
 4 expect() calls
Ran 1 test across 1 file. [19.00s]
```

## CI fix

- CI failure: the marker-constant entrypoint guard was measured as part of `main()` by lizard, changing the ratcheted CCN from 26 to 27.
- Fix: moved the `import.meta.main` guard and direct call into `runStatuslineEntrypoint()`. The gate now measures `main` at CCN 26 and the new helper at CCN 2; no baseline entry was changed.
- The known `#1841`-family `FAIL zero direct legacy call sites` advisory was not changed.
- `bun tests/complexity-gate.ts --check` — pass: 0 new violations, 0 regressions.
- `bun test tests/e2e/t-tui-statusline.serial.test.ts` — pass in local tmux:

```text
(pass) t-tui-statusline (statusline renders in a real terminal) > [Amadeus-DLC] ready paints in the launched TUI [18918.27ms]

 1 pass
 0 fail
 4 expect() calls
Ran 1 test across 1 file. [19.42s]
```

- `bun run check` — pass; typecheck and distribution checks passed, with repository baseline lint warnings only.
