# Build Test Results：B001 walking skeleton

実行日時: 2026-07-03T18:30Z 前後（UTC）。実行環境: macOS、Bun、branch claude/issue-396-inception。

| # | コマンド | 結果 |
|---|---|---|
| 1 | `npm run test:all` | exit 0（green。既存環境の回帰なし。C001 充足） |
| 2 | `npm run test:it:promote-skill` | exit 0（`promote skill eval: ok`） |
| 3 | `bun .claude/tools/aidlc-version.ts` | exit 0 |
| 4 | `bun .claude/tools/aidlc-directive.ts` | 全ディレクティブ VALID |
| 5 | sandbox: `intent-birth --scope poc ...` | 成功（`Intent born: 260703-sandbox-smoke`、poc 7 stages、Minimal depth） |
| 6 | sandbox: `orchestrate next` | run-stage directive 発行（stage: intent-capture、gate: true、lead: aidlc-product-agent、produces 3 件、conductor_persona 同梱） |
| 7 | sandbox: `report --result completed`（成果物なし） | 拒否（declared artifacts 不在。決定論ガードの実証） |
| 8 | sandbox: `report --result completed`（成果物あり、presence なし） | 拒否（human presence 不在。gate の人間必須ガードの実証。presence hook は実セッション専用のため sandbox では正しい挙動） |
| 9 | sandbox: audit shard | `audit/j5ik2o-mac-studio-lan-<clone>.md` が自動生成され、ERROR_LOGGED が構造化追記された |

## 失敗と是正

初回の sandbox 実行（tools、aidlc-common、sensors のみ）で `Unknown scope` エラーが発生した。
原因はエンジンが `.claude/scopes/` の scope 定義に強依存するためである。
code-generation-plan.md の事前承認（「エンジンが強依存する場合だけ最小追加し、記録する」）に基づき、`scopes/`（9 ファイル）、`agents/`（13 ファイル）、`knowledge/`（58 ファイル）、`rules/aidlc.md`（1 ファイル。既存 `.claude/rules/` と名前空間マージ、衝突なし）を追加コピーし、再実行で全項目を確認した。
backlog #1（上流ディレクトリのコピー範囲）はこの結果で「4 ディレクトリすべて必要」と確定した。
