# Integration Test Instructions

## 適用判断

Test Strategy が Minimal のため、専用の統合テストは新設しない。
統合レベルの検証は既存の `npm run test:it:engine-e2e` が担っており、intent-birth から runtime compile、surface までの実フローを一時 workspace 上で通しで検証する（code-generation-plan.md Step 1〜4、code-summary.md 参照）。

## 実行方法

```bash
npm run test:it:engine-e2e
```
