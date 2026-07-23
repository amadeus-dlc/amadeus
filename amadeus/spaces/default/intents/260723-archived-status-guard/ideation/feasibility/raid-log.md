# RAID Log — 260723-archived-status-guard

上流入力(consumes 全数): intent-statement。

## Risks
- R1(中): #1309 語彙同期 — 対応: C7 の機械確認を requirements 完成条件へ
- R2(低): `closed` 消費側の残存 — 対応: requirements で repo grep 棚卸しを固定
- R3(低): cursor の per-user gitignored 特性による stale すり抜け — 対応: 書込・読出両側ガード(symmetric-pair)

## Assumptions
- A1: human-presence 既習機構(HUMAN_TURN 検証)が verb 単位で再利用可能(feasibility §4 で既習様式実在を確認)
- A2: 260713 以外に archived 相当の ad hoc 値はない(registry 分布実測で確定)

## Issues
- なし(本 intent 起票時点)

## Dependencies
- D1: #1309 / e2 intent(260722-space-record-catalog)の status 語彙定義 — 語彙契約の参照先(実装ブロッカーではない: E-ASGIC2 裁定で4値は確定済み、確認は一致検査のみ)
