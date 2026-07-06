# Performance Test Instructions

Unit: u001-journal-logger（feature scope、B001）

## 上流入力

検証対象は code-generation の成果（内訳は [code-generation-plan.md](../u001-journal-logger/code-generation/code-generation-plan.md) と [code-summary.md](../u001-journal-logger/code-generation/code-summary.md) を参照）である。

## 適用判断

性能テストは不適用とする（checkJournal は日次ファイル数 × エントリ数の線形走査で、validator の既存検査群と同オーダー。性能特性に影響する変更なし）。
