# Build and Test Results

## 実行結果

| 検査 | 結果 |
|---|---|
| `bun install --frozen-lockfile` | PASS |
| `bun run build` | PASS |
| `bun run typecheck` | PASS（コード修正後に再実行） |
| `bun run lint` | PASS、既存 warning 474 件 |
| `bun run source-only:check` | PASS |
| `bun run distribution:check` | PASS |
| 対象 t511/t92 | PASS — 111 tests / 0 fail |
| t517 question-budget | PASS — 30 tests / 0 fail（質問を Minimal 上限4見出しへ統合後） |
| formal model-map affected set | PASS — 120 tests / 0 fail（`updateModelMap --impl-only` 後） |
| baseline comparison | complexity/t435/approve-batch/formal affected set は base 環境で green（approve-batch は dist 再生成後に green） |
| initial `bun run test:ci` | FAIL — 16 files / 67 assertions（既定並列、AWS live skip を含む） |
| timeout-raised serial CI | FAIL — 16 files / 64 assertions（初回 ledger/question-budget 断面を含む） |

## 失敗と制限

失敗は complexity-gate、formal model-map drift、approve-batch の OTel workspace 再 bootstrap、t435 quality repair、t517 questions corpus、t557/TLA 連鎖などに分散した。許可された `model-map.json` の impl-only 再ピンと questions 見出し統合後、直接影響する targeted tests は green。残余 full CI のリモート収束は pr-convergence で確認する。AWS credentials は invalid/expired のため live SDK/substrate tests を skip した。
