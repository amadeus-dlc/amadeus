# Unit Test Instructions

Unit: feature-diff（docs 系 refactor、Minimal）

## 上流入力

検証対象は code-generation の成果（内訳は [code-generation-plan.md](../feature-diff/code-generation/code-generation-plan.md) と [code-summary.md](../feature-diff/code-generation/code-summary.md) を参照）である。

## 適用判断

コード単体テストは不適用とする（実装コード・テストコードの変更なし）。文書への要求駆動検証は NFR-3 の決定論チェック 3 点（出典空欄 0 / 正準 H2 12 対の存在 / en-ja H2 構成一致）を一時スクリプトで機械実行し、全 PASS を記録した。
