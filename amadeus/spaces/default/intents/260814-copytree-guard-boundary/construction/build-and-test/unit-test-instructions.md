# Unit Test Instructions — 260814-copytree-guard-boundary

上流入力: `code-generation-plan.md`(Step 1-3)/ `code-summary.md`(検証実測表)。

## 対象と実行

- 新規テストは integration 層(t-tui-fixtures-copy-guard)であり unit 層の追加なし。unit 層回帰は `bun test tests/unit/t80.test.ts`(copyTreeWithRetry real 呼出サイト、7/0 実測済み)
- 要件対応(Test Strategy: Comprehensive): FR-1〜7 の検証は code-summary.md の実測表に 1:1 対応(TDD Red 0/4 → Green 4/4、pred-a2 残 3 = 除外面のみ、exists 0 hit)
