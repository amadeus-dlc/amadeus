# Integration Test Instructions

Unit: steering-learnings（Test Strategy: Minimal、docs 系 refactor）

## 適用判断

本 Intent は統合境界（API、DB、外部サービス）に触れないため、Intent 固有の統合テストは作成しない。エンジンの決定論的な統合検証（`npm run test:it:engine-e2e`）は `npm run test:all` に含まれ、steering 変更後も pass することを確認する。

## 検証観点

- validator の構造検証（`AmadeusValidator.ts . 260705-steering-learnings`）が pass すること（実行時参照の整合）。結果は [build-test-results.md](build-test-results.md) を参照。
