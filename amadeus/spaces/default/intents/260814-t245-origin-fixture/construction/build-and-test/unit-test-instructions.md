# Unit Test Instructions — 260814-t245-origin-fixture

上流入力: `code-generation-plan.md`(Step 1-4)/ `code-summary.md`(検証実測表)。

## 対象と実行

- 変更はテストファイル 1 本(`tests/integration/t245-amadeus-leader-sync.integration.test.ts`)であり、新規 unit 層テストの追加はない。既存 unit スイートの回帰確認はフルスイート(`bash tests/run-tests.sh --ci`)で担う
- 対象ファイル単独: `bun test tests/integration/t245-amadeus-leader-sync.integration.test.ts` → 24/24 pass を要求

## 要件対応(Test Strategy: Comprehensive)

- FR-1〜FR-8 の検証は要件駆動で code-summary.md の実測表に 1:1 対応(TDD Red→Green、grep 機械検証、副作用ゼロ、フルスイート)。fixture 化された掃引テスト自体が FR-2 の全件一致 assert を担う
