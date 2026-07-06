# Integration Test Instructions

Unit: feature-diff（docs 系 refactor、Minimal）

## 上流入力

検証対象は code-generation の成果（内訳は [code-generation-plan.md](../feature-diff/code-generation/code-generation-plan.md) と [code-summary.md](../feature-diff/code-generation/code-summary.md) を参照）である。

## 適用判断

統合テストは不適用とする（実行時統合点なし）。統合相当は rename-leftovers（docs 走査対象、旧名トークン 0）と、参照先（parity-map キー、harness/codex 2 文書、Issue 15 件）の実在確認（reviewer 独立検証）で担保した。
