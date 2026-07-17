# Unit Test Instructions — 260717-mirror-issue-tool

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(amadeus-mirror-cli)

## 実行

- `bun test tests/unit/t232-amadeus-mirror.test.ts` — 純関数層(C1 parseArgs / countStageProgress / C3 テンプレート)。実 FS 非使用(fs-tests-integration-first)

## 結果(Bolt 1 実測)

code-summary.md のとおり: 29 pass / 0 fail(unit+integration 合算)、lcov 未カバー 0行。
