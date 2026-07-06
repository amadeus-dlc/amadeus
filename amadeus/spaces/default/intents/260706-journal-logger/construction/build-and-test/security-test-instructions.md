# Security Test Instructions

Unit: u001-journal-logger（feature scope、B001）

## 上流入力

検証対象は code-generation の成果（内訳は [code-generation-plan.md](../u001-journal-logger/code-generation/code-generation-plan.md) と [code-summary.md](../u001-journal-logger/code-generation/code-summary.md) を参照）である。

## 適用判断

セキュリティテストは不適用とする（認証・入力処理・シークレット扱いの変更なし）。役割 prompt の越権禁止（journal/ 以外の変更禁止・Issue 操作禁止・指示禁止）が logger の権限境界を定義し、定着決定権は human gate に残る（C-2）。
