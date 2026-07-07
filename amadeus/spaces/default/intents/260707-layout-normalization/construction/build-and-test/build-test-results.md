# Build Test Results — Workspace Layout Normalization

## Environment

- Timestamp: 2026-07-07T07:35:55Z
- Runtime: Bun 1.3.13
- Dependency setup: `bun install` updated `bun.lock` after adding root workspaces and `packages/framework/package.json`; `bun install --frozen-lockfile` then passed.
- Upstream inputs: all unit `code-generation-plan` and `code-summary` artifacts under `construction/*/code-generation/`.

## Build Results

| Command | Status | Notes |
| --- | --- | --- |
| `bun install --frozen-lockfile` | pass | 108 packages installed; lockfile fixed. |
| `bun run dist:check` | pass | `claude`, `codex`, `kiro`, `kiro-ide` all reported `--check: OK`; package check reported all harness trees in sync. |
| `bun run promote:self:check` | pass | `claude` and `codex` checks passed; project-local self install is in sync. |
| `bun run typecheck` | pass after retry | Initial run failed with `tsc: command not found`; after dependency install, `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.tests.json` completed successfully. |
| `bun run lint` | pass with warnings | Exit code 0. Biome reported existing warnings/infos in tests; no fixes applied. |
| `bun tests/run-tests.ts --integration --filter t145-packaging-parity` | pass | Packaging parity targeted integration test passed after source relocation. |

## Unit Test Results

| Command | Test files | Assertions | Status |
| --- | ---: | ---: | --- |
| `bun tests/run-tests.ts --unit --filter t174-docs-legacy-refs-gate` | 1 | 3 | pass |

Details:

- `t174-docs-legacy-refs-gate.test.ts`: 3 pass, 0 fail.
- Total assertions: 3.
- Failed assertions: 0.

## Integration Test Results

Targeted integration test `t145-packaging-parity` was run and passed. It confirms `scripts/package.ts --check` and `scripts/package.ts claude --check` remain clean with source under `packages/framework/`.

## Performance Test Results

No performance tests were run. No runtime or algorithmic path changed.

## Security Test Results

No dedicated security scan was run. No security-sensitive code, dependency, CI, auth, network, secret, or installer behavior changed.

## Failure Details

Resolved setup failure:

- Initial `bun run typecheck` failed with `tsc: command not found`.
- Cause: dependencies were not installed in the worktree.
- Resolution: ran `bun install --frozen-lockfile`; reran `bun run typecheck`; result passed.

Outstanding non-blocking warning:

- `bun run lint` produced Biome warnings in existing test files and exited 0.
- These warnings are unrelated to the Issue #610 docs/layout decision work and were not modified.

## Coverage Report

No coverage tool was run. The relevant requirement coverage is command-based:

- Docs legacy refs: targeted unit test passed.
- Distribution drift: `dist:check` passed.
- Self-install drift: `promote:self:check` passed.
- TypeScript compile safety: `typecheck` passed after dependency setup.
- Packaging parity: targeted integration test passed.
