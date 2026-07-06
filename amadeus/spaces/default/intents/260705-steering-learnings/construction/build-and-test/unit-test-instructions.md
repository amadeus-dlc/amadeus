# Unit Test Instructions

Unit: steering-learnings（Test Strategy: Minimal、docs 系 refactor）

## 適用判断

本 Intent は実装コードとテストコードを変更しない（BR-4）ため、Intent 固有の単体テストは作成しない。既存の単体テスト群は `npm run test:all`（test:it:all を含む）で全件実行し、steering 文書の変更が既存検証を壊していないことを確認する。

## 検証観点

- team.md / project.md の変更が、既存スクリプト・validator・eval の前提を壊していないこと（`npm run test:all` の pass で確認する）。
