# Integration Test Instructions

## 適用判断

Test Strategy が Minimal のため、専用の統合テストは新設しない。
統合レベルの検証は既存の `npm run test:it:engine-e2e` が担っており、intent-birth から run-stage directive 発行、produces ガード、audit shard 生成までの実フローを一時 workspace 上で通しで検証する。
本 Intent の修正（code-generation-plan.md Step 3/5、code-summary.md 参照）は advance の stdout と validator の照合条件であり、engine-e2e の通し経路に含まれる。

## 実行方法

```bash
npm run test:it:engine-e2e
```

## 合格条件

- `engine e2e eval: ok` が出力され、exit 0 で完了すること。
