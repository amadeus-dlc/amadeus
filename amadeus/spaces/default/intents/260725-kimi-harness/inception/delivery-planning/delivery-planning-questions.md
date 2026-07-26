# Delivery Planning 質問 — 260725-kimi-harness

> E-OC1 証跡: ソロモード・選挙不要判定(根拠種別: 全1問ともユーザー本人の HUMAN_TURN 直接回答 — Guide me 対話)。ユーザー承認タイムスタンプ: 2026-07-25T10:28:39Z(「1」= A)
> モード: Guide me(対話式)
> 事前整理済みの裁定(質問対象外):
> - walking-skeleton-first: Bolt 1 = U1(team-practices 承認済み)
> - Bolt 粒度: 1 Unit = 1 Bolt = 1 PR(units-generation:c1)
> - 並列実行: 本 intent では不可。swarm の `resolve --harness kimi` は U4 の `HARNESS_VALUES` 追加がブランチに着地するまで fail-closed で、並列化候補(U2∥U3)は U4 より前に位置するため。直列実行とする
> - mob 編成: なし(ソロ。全 Bolt は AI 実行 — team-formation SKIP)

## Q1. Bolt 2/3 の順序(swarm 並列不可の前提で、U2(adapter)と U3(merge)のどちらを先行するか)

事実(自己調査): U2(kimi-hook-adapter)は本 intent 最大の技術リスク R1(payload 実機差異)を内包し、live capture を要する。U3(setup-hooks-merge)は既存流儀の踏襲中心でリスクが低い。位相上はどちらを先に置いても DAG に適合する(U1 への直接依存のみ)。

- A. risk-first: U2 先行(推奨): 最大リスクを最早に潰す。payload 変換表が確定すれば U3 の managed block 内容も実機確定値で書ける
- B. U3 先行: 小さく確実な U3 で momentum を作り、U2 は後に回す
- X. Other (please specify)

[Answer]:
