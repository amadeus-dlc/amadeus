# security-test instructions（260705-ledger-pr-docs）

上流入力: [code-summary.md](../ledger-pr-docs/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

docs のみの変更（state.md への 1 節追加）であり、security-test の対象となる実行物は存在しない。

## 代替検証

検証は `npm run test:all`（既存検証全件 = docs-only であることの裏取り、AC3）と、PR レビューでの文書内容確認（BR-1 / BR-2 / BR-4）で行う。
