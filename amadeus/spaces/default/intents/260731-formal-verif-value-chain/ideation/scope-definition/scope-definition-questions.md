# Scope Definition — 質問票(グリリングモード)

対象 intent: 260731-formal-verif-value-chain(scope: self-feature)
モード: Grill me(1問ずつ動的生成)
上流入力: intent-statement.md(スコープ境界・成功指標は同文書で裁定済み — 本票は順序と題材確定のみを問う)

## Q1. 実装順序の戦略

3 Issue の作業列(#1829 配布自立化 / #1738 到達面 / #1510 運用面)の順序選好はどれか。

A. dependency+risk-first: #1829(runner 移設・削除)を先行 — scripts/formal-verif の配置が #1738 のモデル工程・#1510 の updateModelMap と物理的に交差するため、移設を先に確定して後続の手戻りを消す(推奨)
B. value-first: #1738 の到達面(composition・advisory・発火点)を先行 — 価値到達を最速化し、#1829 は後続
C. 並行: 交差しない範囲で #1829 と #1738 を並行 Bolt 化
X. Other (please specify)

[Answer]: A. dependency+risk-first(#1829 移設先行、walking-skeleton は移設後 runner の e2e 薄スライス)— 2026-07-31 Grill me モード

## Q2. 新規モデルの題材確定

#1738 (c) の「新規モデルを最低1本」の題材を mirror lifecycle(close-after-landing の順序クラス、#1816/#1607 が題材)で確定してよいか。本 intent 中に #1838(承認境界の重複 create)が新たに実測されており、モデル化対象の不変量候補になりうる。

A. mirror lifecycle で確定。#1838 の重複 create 不変量(issueNumber 記録済みなら create を再選択しない)も同モデルの invariant 候補として含める(推奨)
B. mirror lifecycle で確定。#1838 は含めない(#1738 記載の close-after-landing クラスのみ)
C. 題材は requirements 段で再検討する
X. Other (please specify)

[Answer]: A. mirror lifecycle で確定+#1838 の重複 create 不変量も invariant 候補に含める — 2026-07-31 Grill me モード

## 裁定の記録

- Q1=A / Q2=A はいずれもユーザーの直接回答(Grill me モード、AskUserQuestion 経由)。ソロモードにつき選挙不要 — 根拠種別: ユーザー直接裁定(1問1行)。
- ユーザー承認: 2026-07-31T08:51:28Z
