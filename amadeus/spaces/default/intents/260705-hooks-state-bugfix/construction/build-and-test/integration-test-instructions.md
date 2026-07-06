# Integration Test Instructions

Unit: hooks-state-bugfix（Test Strategy: Minimal）

## 適用判断

新設しない。

## 判断根拠

- Minimal 戦略の生成対象は unit-test-instructions.md だけである（stage-protocol §8）。
- 通し検証は既存のエンジン sandbox e2e（`npm run test:it:engine-e2e`、N003 の presence 契約検証を含む）が担い、`npm run test:all` に含まれる。
