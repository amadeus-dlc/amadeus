# Delivery Planning — 質問(260816-open-bug-batch-7)

Intent Autonomy Mode = `full` のため decide-question 梯子で裁定(E-AD-<hex8> = AUTO_DECIDED 裁定 ID、grant `intent-grant-f3cd750783eded708416acde804af0b5`)。既決事項は再質問しない: Bolt 粒度(1 Unit = 1 Bolt = 1 PR)は intent 起票文と要件制約で確定済み、walking-skeleton は self-fix(インクリメンタル修正)のため org.md 既定でセレモニー非適用、外部依存は存在しない(external-dependency-map.md)。

## Q1. Bolt シーケンシング方針(経済判断)

3 unit は依存エッジ 0 本(unit-of-work-dependency.md)で全順序が有効。どの方針を採るか。

A. **並行を既定**とし(unit ごと worktree 分離、full autonomy 下の engine バッチ fan-out、1 バッチに 3 unit)、直列 fallback 時は **risk-first**(nsd-provenance → pi-distribution → sensor-docs-sync)
B. 厳密直列・risk-first(nsd → pi → sen)
C. 厳密直列・small-first(sen → pi → nsd)
X. Other (please specify)

[Answer]: A — 裁定 E-AD-E4E2A566(= AUTO_DECIDED `auto-decision-e4e2a5663536da7fc6f5cf2f20405fb9`)。根拠: 独立 3 unit に価値差はなく WSJF スコアリングは不要。並行が総リードタイム最小で、リスク最大の nsd-provenance(gate 面の削除再構成)を fallback 先頭に置くことで直列時も risk-first を維持する。クロスレビュー 2 名成立(Issue ごと)は各 unit の実装バッチ組み込み前の内部ゲート条件。
