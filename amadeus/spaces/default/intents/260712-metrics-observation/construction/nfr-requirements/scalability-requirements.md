# Scalability Requirements — metrics-observation

- **SC-1: snapshot サイズ上限の目安 = 1ファイル 16KB**(強制メカニズム = FR-5 疎結合テストでのスキーマ検証に上限アサートを含める)。現設計の実測見込みは数 KB(6 collector の集計値のみ、per-file 明細を持たない)。
- **SC-2: 蓄積成長** — (マージ頻度+手動/re-run 回数)× 数 KB = 年間 MB オーダー(feasibility 概算)。R-3 の冪等設計により re-run は追加ファイルを生む(上書きしない)が、re-run は人間起点(workflow 手動 re-run・ローカル手動)に限られ支配項はマージ頻度 — オーダー見積りは不変。間引きポリシーはバックログ B2 の留保のまま(E-L62)。
- **SC-3: collector 追加の水平拡張** — 配列駆動(D4)により O(1) の追加コスト。スキーマ互換は schema_version でゲート。
