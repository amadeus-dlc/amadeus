# Security Test Instructions

Unit: u001-harness-codex

## 上流入力

検証対象は code-generation の実装（内訳は [code-generation-plan.md](../u001-harness-codex/code-generation/code-generation-plan.md) と [code-summary.md](../u001-harness-codex/code-generation/code-summary.md) を参照）である。

## 適用判断

セキュリティテストは不適用とする（認証・入力処理・シークレット扱いの変更なし）。追加した openai.yaml は Codex の暗黙起動を禁止する guard であり、セキュリティを強める側の設定である。取り込みは fresh clone + 全件 sha256 照合（#541）で出所を担保し、シークレット混入がないことは内容の全件同一性（guard 2 行のみ）で構造的に保証される。
