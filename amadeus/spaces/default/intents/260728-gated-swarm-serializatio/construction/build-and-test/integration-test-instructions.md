# Integration Test Instructions — 260728-gated-swarm-serializatio

上流入力(consumes 全数): code-generation-plan.md、code-summary.md — 対象は code-summary.md 記載の t135(契約書換え+新契約)と t251(fixture 再ベース)、および全体境界は code-generation-plan.md Step 9 の検証コマンド列。

## 対象と実行

- `bun test tests/integration/t135-invoke-swarm.test.ts` — gated → invoke-swarm(新契約 test 2)、unset ladder ask(2b)、bogus 値 fail-closed(2c)、autonomous 回帰(1/1b)、skeleton 構造ガード(7)、referee 系(3-6)
- `bun test tests/integration/t251-swarm-and-next-stage.test.ts` — next_stage 契約+swarm batch advance ガード(無改変 1/2/2b)
- `bun test tests/integration/t120-classify-roundtrip.test.ts` — seed 追加後の回帰
- 全体: `bash tests/run-tests.sh --ci`(631 files 全数)

## 判定

`RESULT: PASS`(Failed files 0 / Failed assertions 0)。加えて PR #1648 の GitHub Actions(push/pull_request)green を着地前提とする。
