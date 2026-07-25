# Build/Test実行結果

## 実行環境

- 実行日: 2026-07-25
- Runtime: Bun 1.3.13
- Workspace: `/Users/j5ik2o/.codex/worktrees/b620/amadeus`
- 入力: [code-generation-plan.md](../%7Bunit-name%7D/code-generation/code-generation-plan.md)、[code-summary.md](../%7Bunit-name%7D/code-generation/code-summary.md)

## ビルド結果

| コマンド | 結果 |
|---|---|
| `bun run typecheck` | PASS |
| `bun run lint` | PASS（exit 0、既存を含むwarningのみ） |
| `bun run dist:check` | PASS、6 surfaces同期 |
| `bun run promote:self:check` | PASS、4 surfaces同期 |

## テスト結果

| 実行 | Total | Passed | Failed | Skipped |
|---|---:|---:|---:|---:|
| 対象12ファイル再検証 | 181 tests / 449 assertions | 181 / 449 | 0 | 0 |
| repository-native full CI | 545 files / 7,509 assertions | 545 / 7,509 | 0 | live SDK/substrateのみ環境条件でskip |

full CIの最終結果は`RESULT: PASS`である。formal workflow focusedは3 tests / 13 assertionsでPASSした。

## FailureとCoverage

未解決failureはない。初回full CIで検出したcomplexity gateとformal baseline不一致は、それぞれ局所関数分割と最新main rebase後のbaseline正規化により解消した。

Coverageは既存repository-native gateに従う。FR-4の受入条件である生成source重複の正規化はfocused testとfull CIで成功し、特定coverage率の回復値は要件に含めていない。
