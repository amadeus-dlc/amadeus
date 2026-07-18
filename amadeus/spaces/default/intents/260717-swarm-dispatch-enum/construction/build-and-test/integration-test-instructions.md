# Integration Test Instructions — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): 3 unit の code-generation 成果物(`code-generation-plan.md`・`code-summary.md` ×3)、`requirements.md`、`unit-of-work.md`。

## 対象と実行

- `tests/integration/t135-invoke-swarm.test.ts`(engine directive→referee 経路の回帰)/ `tests/e2e/t134-swarm-referee.test.ts`(prepare/check/finalize+SWARM_ 6 イベント、三値 fixture)
- 実行: `bash tests/run-tests.sh --ci`(smoke+unit+integration の CI プロファイル)
## 期待結果

- FR-7(referee 意味論不変)・FR-3(degrade audit 一致)の回帰 green(`code-summary.md` ×3 の検証欄と同一コマンド列)
