# Build and Test Results — open-bug-batch

Executed 2026-07-30 in this stage (Step 10). Upstream: `construction/*/code-generation/code-summary.md`.

## Build status

| Bolt worktree | `bun run typecheck` | `bun run lint` | Drift guards |
|---|---|---|---|
| bolt-issue-1336 | PASS (exit 0) | — | — |
| bolt-issue-1662 | PASS (exit 0) | — | — |
| bolt-issue-1663 | PASS (exit 0) | — | — |
| bolt-issue-1664 | PASS (exit 0) | — | — |
| bolt-issue-1667 | PASS (exit 0) | — | — |
| bolt-issue-1680 | PASS (exit 0) | PASS (exit 0, baseline warnings only) | complexity gate OK; `bun scripts/package.ts` regenerated 7 dist surfaces |

issue-1607 / issue-1681 are merged; `main` (22ee27dbe) typechecks and its unit suite result is below.

## Test results (focused per-unit execution this stage)

| Unit | Suite | Result |
|---|---|---|
| issue-1336 | `t-team-up-codex-safety-wait` (unit) + `t-team-up-codex-safety-wait-ready-evidence` (integration) | 21 pass / 0 fail / 90 expects |
| issue-1662 | `t229-coverage-patch-gate` (unit) + `t229-coverage-patch-gate-check` (integration) | 22 pass / 0 fail / 124 expects |
| issue-1663 | `t-team-up-member-readiness` (unit) + `t295-team-up-worktree-parallel` (integration) | 20 pass / 0 fail / 128 expects |
| issue-1664 | `t224-clone-id-doctor-boundaries` + `t224-state-set-failclosed` + `t224-upstream-v2-migration-cli` (integration) | 82 pass / 0 fail / 641 expects |
| issue-1667 | `book-pack-verify-fixture` (unit) | 6 pass / 0 fail / 8 expects |
| issue-1680 | `t365-kimi-reviewer-boundary` (integration) + `t-kimi-adapter` + `t-solo-gate-transaction-carrier` + `t-kimi-doctor-arm` | 29 pass / 0 fail (t365); 75 pass / 0 fail (related 3 files) |
| main (1607, 1681 merged) | `bun test tests/unit/` full baseline | 4796 pass / 6 skip / 29 fail — all 29 are the pre-existing environment-sensitive set, byte-identical on unmodified main |

## Failure details

- 29 pre-existing failures (t27/t29/t37/t94/t97/t112/t147/t208/t209/t211, graph compile, sensor-fire glob): environment-sensitive on this machine; the identical set fails on unmodified `main` (baseline-verified 2026-07-30). Not caused by any unit in this batch. Linux CI per PR is the authoritative full-suite gate (each unit's `code-summary.md` records CI green at its PR head).

## Coverage

- Assertion-level coverage: per-unit expect counts above; repository coverage gate runs in CI (`bun run test:ci -- -P 4` + patch coverage gate per PR, recorded green in each unit's summary).
