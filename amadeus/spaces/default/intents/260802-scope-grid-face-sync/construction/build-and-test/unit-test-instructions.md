# Unit Test Instructions — 260802-scope-grid-face-sync

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 対象

本 intent の新規テストは実 FS を読む integration 層に配置(fs-tests-integration-first 規範)。unit 層の新規テストはなし — code-generation-plan.md の Test files 節どおり。既存 unit 層の回帰確認:

- `bun test tests/unit/t370-promote-self-scopegrid-order.test.ts` — mergeScopeGrid のキー順対称性 pin(本 intent は promote-self.ts を変更していないが、grid 変更の隣接検査として実行)

## 実測

t370 を含む宣言5ファイル実行で 55 pass / 0 fail(build-test-results.md 参照)。
