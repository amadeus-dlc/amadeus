# Unit Test Instructions — 260801-open-bug-batch-5

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

- 各 unit の code-generation-plan.md のテスト計画(新設 t391/t393/t394/t395/t396/t397、拡張 t279/t280/t275/t222/t33/t355)と code-summary.md の Red→Green 実測表を本書の対象集合とした。

## 対象と実行

- 新設 unit テスト: `bun test tests/unit/t391-*.test.ts tests/unit/t393-*.test.ts tests/unit/t394-*.test.ts tests/unit/t397-*.test.ts`
- 拡張 unit テスト: t279 / t280 / t275(mirror)、t222(metrics)、t33(scaffold pin)、t355(graph)
- 全 unit 層: `bash tests/run-tests.sh --ci` に内包(smoke+unit+integration)

## TDD 証跡

各 AC の Red verbatim → Green は unit ごとの code-summary.md の表を正本とする(CR-1/CR-2 の実施記録)。t392 / t398 は既存拡張で充足のため採番返上。
