# Build and Test 結果

## ビルド

| 項目 | 結果 |
|---|---|
| `bun run typecheck` | PASS |
| `bun run dist:check` | PASS（6 harness、drift 0） |
| `bun run promote:self:check` | PASS（4 self-install面、drift 0） |

## テスト

| スイート | 結果 |
|---|---|
| 対象unit/integration | 103 pass、0 fail、297 assertions |
| 全体 `bun run test:ci` | 486 files、6,993 assertions、失敗0 |
| Performance | status registry、transaction、guard、AST corpusの全閾値PASS |
| Security | malformed input、HUMAN_TURN、symlink、forged target、mutation-free rejectionをPASS |

失敗詳細はない。live AWS/Claude substrate依存テストは環境条件によりskipされ、既存wall-clock advisory 1件が報告されたが、最終結果は `RESULT: PASS` である。
