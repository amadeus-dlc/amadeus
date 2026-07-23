# Scalability Requirements — boundary-guard

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack(本文で参照)

## スケーラビリティ要件

- 対象規模は配布ツリーのファイル数に比例(現況: dist 6面+self-install 5面 — technology-stack の配布投影構造)。business-rules BR-7 の roots 定数1箇所により配布面追加時は定数追記のみで走査対象が拡張される(構造的スケール — 件数目標値は不要)。走査自体は business-logic-model の層分割どおり integration 層の1パス実行で、requirements NFR-1(既存 CI green 維持)の予算枠内に収まる — 件数増は roots 追加時の corpus sweep 再実測(FR-5c)で吸収する

## 検証

- roots 追加の拡張性は BR-7 の実装形(canonical 定数)のレビューで担保
