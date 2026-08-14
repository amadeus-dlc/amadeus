# Unit Test Instructions — 260814-t99-copytree-race

上流入力: `code-generation-plan.md`(Step 1-3)/ `code-summary.md`(検証実測表)。

## 対象と実行

- 変更は helper(`tests/harness/fixtures.ts`)と integration テスト 1 本。新規 unit 層テストなし。real 呼出サイトの回帰は `bun test tests/unit/t27.test.ts` / `tests/unit/t80.test.ts`(63/0・7/0 実測済み)
- 要件対応(Test Strategy: Comprehensive): FR-1〜7 の検証は code-summary.md の実測表に 1:1 対応(TDD Red→Green、落ちる実証 md5 残渣ゼロ、回帰ガード)
