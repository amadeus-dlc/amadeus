# Integration Test Instructions — open-bug-batch

Upstream: `construction/*/code-generation/code-summary.md`. Strategy: Comprehensive.

## Commands

```sh
bun run test:ci            # smoke + unit + integration (CI runs: bun run test:ci -- -P 4)
bun test tests/integration/ --timeout 120000   # integration layer only
```

## Key boundary coverage per unit

| Unit | Integration coverage |
|---|---|
| issue-1336-safety-wait-readiness | `tests/integration/t-team-up-codex-safety-wait-ready-evidence.test.ts` (live safety-wait readiness evidence) |
| issue-1607-completion-boundary | engine completion-boundary transaction; crash-recovery via audit pairing (merged) |
| issue-1662-coverage-dirty-worktree | coverage patch gate against dirty worktrees (target integration job in PR CI) |
| issue-1663-member-readiness | full CLI integration re-run: 56 pass / 619 expect (member readiness markers across parallel worktrees) |
| issue-1664-clone-id-diagnostics | clone-id doctor boundaries across migration CLI paths |
| issue-1667-book-pack-timeout | book-pack verify fixture with parallel cleanup timeouts |
| issue-1680-kimi-stop-hook-authorization | `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts`: adversarial role matrix (reviewer/support/explore), gate carrier provenance, state/audit byte-invariance, main-conductor compatibility |
| issue-1681-auto-mirror-boundary | mirror lifecycle boundary automation (t265 engine boundary, t282 lifecycle; merged) |

## Cross-unit interactions

- All units touch the same deterministic engine/hook tree; the full `test:ci` run is the cross-unit interaction gate. Per-unit CI evidence is recorded in each `code-summary.md` (GitHub Actions `bun run test:ci -- -P 4`, 0 failed assertions at each PR head).

## Environment setup

- No external services. Some suites spawn subprocesses (`bun`) — keep `bun` on PATH
- On constrained machines raise `--timeout`; first cold-compile run may exceed default per-test timeout
