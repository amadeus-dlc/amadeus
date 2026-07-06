# Security Test Instructions

Unit: feature-diff（docs 系 refactor、Minimal）

## 上流入力

検証対象は code-generation の成果（内訳は [code-generation-plan.md](../feature-diff/code-generation/code-generation-plan.md) と [code-summary.md](../feature-diff/code-generation/code-summary.md) を参照）である。

## 適用判断

セキュリティテストは不適用とする（認証・入力処理・シークレット扱いの変更なし）。シークレット混入がないことは diff 目視と lint で確認した。
