# Build & Test Results — s13-label-clarity(2026-07-16 fresh 実測)

対象: conductor 本線(main merge+#1055 ミラー後)。PR 実体 #1055。

| コマンド | exit |
|---|---|
| `bun run typecheck` | 0 |
| `bun run lint` | 0 |
| `bun run dist:check` | 0 |
| `bun run promote:self:check` | 0 |
| 専用5ファミリ(t86+t34-37) | 201 pass / 0 fail |
| `bash tests/run-tests.sh --smoke` | RESULT: PASS(drift 0) |
| 否定例 8ツリー grep | trees=8 hits=8(機械再計算) |

落ちる実証: builder(削除注入 7 pass/1 fail→復元 8/8)+stage reviewer(scratch clone で独立再実行、同一結果)の2段実測。
