# Unit Test Instructions — open-bug-batch

Test strategy: **Comprehensive** (per `amadeus-state.md`). Upstream: `construction/*/code-generation/code-summary.md`.

## Framework & setup

- Runner: `bun:test` (no extra config; repository root `package.json`)
- Run from the Bolt worktree that carries the unit under test

## Commands

```sh
bun test tests/unit/                 # full unit suite (~323 files across unit+integration split)
bun test tests/unit/<file>.test.ts   # focused per-component run
bun test --timeout 120000 <file>     # raise timeout on cold/constrained machines
```

## Per-unit focused files (from each unit's code-summary)

| Unit | Focused unit tests |
|---|---|
| issue-1336-safety-wait-readiness | `tests/unit/t-team-up-codex-safety-wait.test.ts` |
| issue-1607-completion-boundary | `t243-post-complete-audit-stop`, `t265-engine-boundary`, `t279-amadeus-mirror-executor`, `t282-amadeus-mirror-lifecycle`, `t115` (merged; on main) |
| issue-1662-coverage-dirty-worktree | `t229-coverage-patch-gate`, `t229-coverage-patch-gate-check` |
| issue-1663-member-readiness | `tests/unit/t-team-up-member-readiness.test.ts`, `t295-team-up-worktree-parallel`, `t267-clean-env-team-mode` |
| issue-1664-clone-id-diagnostics | `tests/integration/t224-clone-id-doctor-boundaries.test.ts`, `tests/integration/t224-state-set-failclosed.test.ts`, `tests/integration/t224-upstream-v2-migration-cli.test.ts` |
| issue-1667-book-pack-timeout | `tests/unit/book-pack-verify-fixture.test.ts` |
| issue-1680-kimi-stop-hook-authorization | `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts` (unit-level cases included), `t-kimi-adapter`, `t-solo-gate-transaction-carrier`, `t-kimi-doctor-arm` |
| issue-1681-auto-mirror-boundary | `t265`, `t282-amadeus-mirror-lifecycle` (merged; on main) |

## Coverage expectations (Comprehensive)

- 10-15 tests per touched component; happy-path floor plus failure/adversarial paths
- Complexity ratchet: `bun tests/complexity-gate.ts --check` stays at 0 new violations
- Per-unit summaries record Red→Green evidence; re-run the focused file when touching the same code

## Known environment note

On this development machine, 29 pre-existing failures exist in environment-sensitive suites (t27/t29/t37/t94/t97/t112/t147/t208/t209/t211, graph compile, sensor-fire glob) — identical on unmodified `main` (baseline-verified 2026-07-30). They are not regressions; CI on Linux is the authoritative full-suite gate.
