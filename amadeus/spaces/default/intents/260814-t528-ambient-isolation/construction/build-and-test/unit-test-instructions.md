# Unit Test Instructions — 260814-t528-ambient-isolation

> 上流: `code-generation-plan.md` の Step 2-4 と `code-summary.md` の FR 対応に基づく。本 intent の変更は integration tier のテストファイル1本であり、新規 unit 層テストは追加しない(変更対象コードが存在しないため要件駆動の追加対象なし)。

## 実行

- 対象ファイル単独: `bun test tests/integration/t528-report-ack-kind.integration.test.ts`
- unit tier 全体: `bash tests/run-tests.sh unit`
- フルスイート(CI 相当): `bash tests/run-tests.sh --ci`

## 要件対応(FR → テスト)

| FR | テスト |
|---|---|
| FR-1 | `a failed result remains a typed error directive without a repair loop`(explicit fixture、`Unknown --result "failed"`) |
| FR-2 | `a failed result under a repair loop asks for the typed failure`(semi autonomy fixture、`requires --failure`) |
| FR-4 | `beforeEach` の STOCK_GRAPH 前提検査(不在時 `bun run build` 名指し fail) |

## 決定性の検証(受け入れ基準)

3状態すべてで同一結果になること: env なし / `CLAUDE_PROJECT_DIR=<semi fixture>` / `CLAUDE_PROJECT_DIR=$PWD`(full autonomy の実 intent)。
