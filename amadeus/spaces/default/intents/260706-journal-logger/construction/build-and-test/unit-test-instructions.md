# Unit Test Instructions

Unit: u001-journal-logger（feature scope、B001）

## 上流入力

検証対象は code-generation の成果（内訳は [code-generation-plan.md](../u001-journal-logger/code-generation/code-generation-plan.md) と [code-summary.md](../u001-journal-logger/code-generation/code-summary.md) を参照）である。

## 適用判断

validator の checkJournal が本 Bolt 唯一のコード変更であり、その単体相当の検証は eval J1〜J5（TDD、RED 実確認済み、実データ fixture + 変異 3 種）が担う。test:it:amadeus-validator が pass。
