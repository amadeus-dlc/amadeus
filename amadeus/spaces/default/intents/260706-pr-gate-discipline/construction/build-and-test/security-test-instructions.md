# Security Test Instructions

Unit: pr-gate-discipline（Test Strategy: Minimal）

## 上流入力

検証対象は code-generation の実装 6 変更である。内訳は [code-generation-plan.md](../pr-gate-discipline/code-generation/code-generation-plan.md) と [code-summary.md](../pr-gate-discipline/code-generation/code-summary.md) を参照する。

## 適用判断

セキュリティテストは不適用とする（認証・入力処理・シークレット扱いの変更なし）。文書内容として、知識文書は「検証設定を緩めて pass させない」不変条件を含み、検証迂回を禁じる側の規律である。ハードコードされたシークレットが混入していないことは diff 目視と lint（`npm run lint:check`）で確認した。
