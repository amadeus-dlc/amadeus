# Scope Definition 質問記録 — 260801-cg-plan-guard

上流入力(consumes 全数): intent-statement.md、stakeholder-map.md

E-OC1 判定: In/Out の骨格は Issue #1892 のユーザー裁定(骨子5点+Won't の実行時 verb 禁止)と intent-statement のスコープ境界から一意に導出され、scope-definition 段で新たに諮る未決の判断はない(0問)。conductor 並行度上限の機械強制を Out に置く判断は「ガードは形態一致のみ見る」という裁定1の射程解釈であり、requirements の §12a レビューで異議があれば裁定へ回す。
ユーザー承認: 2026-08-01T07:49:13Z(intent-capture ゲート承認 = 骨子・境界の追認)

## 裁定の記録

- In = M1〜M7 / Out = 実行時 verb・遡及検査・degrade 適用・並行度上限強制・driver 解決変更。編成 B1→B2→B3→B4(risk-first: 誤発動リスクを corpus sweep 先行で緩和)。
- #1893 の編入前提(クロスレビュー2名)と REFRAME 時の切り出し手順を scope-document に固定。
