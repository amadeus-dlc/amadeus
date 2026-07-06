# Integration Test Instructions

Unit: parallel-policy-docs（Test Strategy: Minimal）

## 適用判断

新設しない。

## 判断根拠

- 変更は文書のみで、実行境界を持たない。memory/phases/construction.md が Construction stage の rules_in_context として読み込まれる経路は、既存の engine sandbox e2e（`npm run test:it:engine-e2e`、test:all に含まれる）が回帰を担保する。
