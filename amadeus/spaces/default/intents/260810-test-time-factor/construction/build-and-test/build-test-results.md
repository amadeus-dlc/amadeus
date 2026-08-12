# Build and Test Results — TEST_TIME_FACTOR

上流の [`code-generation-plan.md`](../{unit-name}/code-generation/code-generation-plan.md) と [`code-summary.md`](../{unit-name}/code-generation/code-summary.md) に対応する実測結果である。

## 実行環境

- 実行日: `2026-08-10T17:24:17Z`
- Runtime: Bun `1.3.13`
- CI相当係数: `TEST_TIME_FACTOR=2`
- Workspace: `/Users/j5ik2o/.codex/worktrees/587c/amadeus`

## ビルド結果

| コマンド | 結果 | 要約 |
|---|---|---|
| `bun run build` | PASS | 8 harness の dist 再生成と project-local self install を完了 |
| `bun run typecheck` | PASS | application / tests の両 tsconfig が exit 0 |
| `bun run lint` | PASS | exit 0、既存 complexity warning 457件 / info 18件 |
| `bun run distribution:check` | PASS | 444 payloads、4 docs / 44 topics、448 projections |
| `bun run source-only:check` | PASS | `source-only boundary: clean` |
| `bun tests/test-time-factor-guard.ts` | PASS | 105 classified sinks、未分類 0 |
| `git diff --check` | PASS | whitespace error 0 |

## テスト結果

`TEST_TIME_FACTOR=2 bun run test:ci` を最終差分で単一実行した。

| 指標 | 結果 |
|---|---:|
| Test files | 972 |
| Passed files | 948 |
| Skipped files | 24 |
| Failed files | 0 |
| Total assertions | 13063 |
| Failed assertions | 0 |
| Runner verdict | `RESULT: PASS` |

skip は利用不能な live model substrate に対する正規skipであり、失敗を隠す隔離ではない。失敗詳細とstack traceは存在しない。

## カバレッジと制約

- この実行は `test:ci` の機能ゲートであり、coverage percentage の新規計測は行っていない。
- coverage job 自体への `TEST_TIME_FACTOR=2` 配線は workflow 契約テストで確認した。
- 性能試験は test-only budget と wall-clock 閾値の分離契約を対象とし、サービス負荷試験は適用外である。
