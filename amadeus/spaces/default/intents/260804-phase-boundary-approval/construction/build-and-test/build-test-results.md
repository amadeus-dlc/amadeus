# Build & Test Results — fix-2143-phase-boundary-approval

## 実測結果(2026-08-05、HEAD `eb1257c08`)

| 検証 | 結果 |
|---|---|
| bun run build(dist + promote:self) | exit 0 |
| bun run typecheck | exit 0 |
| bun run lint | exit 0(既存warningのみ) |
| 新規・改訂テスト(t-harness-approval-order-contract / t-phase-check-gate-seam / t-autonomy-phase-boundary-artifact / t-advisory-choice-record / t413) | 54 pass / 0 fail |
| 既存 advisory 経路の非退行 | 102 pass / 0 fail |
| フルスイート `bun tests/run-tests.ts --ci` | 821 files / 10800 assertions / 0 fail(code-generation 時実測) |
| complexity gate | OK(0 new violations) |
| distribution:check / source-only:check | exit 0 / exit 0 |
| no-silent-drop gate(base = origin/main) | NO_SILENT_DROP_OK(conductor が rebind 実施、単独コミット `eb1257c08`) |

## TDD 証跡

各 slice の Red 実測と mutation probe の赤化記録は `code-generation/code-summary.md` に逐語で記録済み。
