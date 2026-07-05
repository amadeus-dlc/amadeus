# Delivery Planning 質問（260705-engine-installer）

上流入力: [bolt-plan.md](bolt-plan.md)

Bolt 分割は units-generation の実装順序と D7（単一 PR）からの導出である。回答は上流から転記し、新規のピア協議は行わない。

---

## Q1. Bolt 分割はどれですか？

A. 2 Bolt 直列（B001 = walking skeleton の縦切り、B002 = 異常系と品質の完成）。PR は単一のまま
B. 1 Bolt（分割なし）
C. ストーリーごとの 9 Bolt
X. Other (please specify)

[Answer]: A（skeleton 先行で最大リスク（A-1、縦切り成立）を最初に潰す。C は単一ファイルスクリプトに対して過剰。B は walking skeleton の人間 gate（team.md）を活かせない）

## Q2. walking skeleton（B001）の gate evidence はどうしますか？

A. B001 完了時に leader へ gate 報告し人間承認を得る。Bolt PR は作らず、最終的な gate evidence は単一 PR の merge と BOLT_COMPLETED とする
B. B001 を独立 PR にする（D7 の単一 PR 判断を覆す）
X. Other (please specify)

[Answer]: A（D7 = 単一 PR は scope-definition の gate で人間承認済み。walking skeleton の人間承認は Bolt gate の承認中継で満たし、PR 分割はしない）
