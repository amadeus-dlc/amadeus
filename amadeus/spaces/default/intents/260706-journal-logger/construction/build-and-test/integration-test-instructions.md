# Integration Test Instructions

Unit: u001-journal-logger（feature scope、B001）

## 上流入力

検証対象は code-generation の成果（内訳は [code-generation-plan.md](../u001-journal-logger/code-generation/code-generation-plan.md) と [code-summary.md](../u001-journal-logger/code-generation/code-summary.md) を参照）である。

## 適用判断

統合相当は次で担保: promote 同期（byte 一致を reviewer が確認、test:it:promote-skill pass）、本番実データ（journal/260706.md）への validator 実行 pass、test:it:all チェーンでの回帰なし。
