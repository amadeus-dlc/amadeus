# Unit Test Instructions — 260801-cg-plan-guard

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(4 unit)

- 対象は各 unit の code-summary.md が宣言した新規テスト(t399 / t403 / t402)の unit 層と既存回帰全数。

## 手順

- 対象限定: `bash tests/run-tests.sh --unit --filter "t403|t402"`(t399 は integration 層 — fs-tests-integration-first)
- 全数: `bash tests/run-tests.sh --ci`(coverage 付きは `bun run coverage:ci`)

## 実測

- t403 unit(15 — `grep -cE '^\s*(test|it)(\.\w+)?\('` 実測)、t402 unit(7、同 grep)— 全 green。
- 全数 9,792 assertions / 0 fail(coverage:ci、統合断面)。
