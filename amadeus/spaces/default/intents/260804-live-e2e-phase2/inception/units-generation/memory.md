# Units Generation Memory

## Interpretations

- 2026-08-04T12:19:35Z — Issue・Requirements・Application Designで確定済みのKimi/Kiro transport独立境界は再質問しない; Unit設計を変える未決事項だけを確認する。
- 2026-08-04T12:21:50Z — User StoriesステージがSKIPのためrequirementsをstory proxyとしてmapする; 未生成storyを発明せず、FR/NFR coverageでUnit完全性を検証する。

## Deviations

## Tradeoffs

- 2026-08-04T12:21:11Z — probe-only Unitではなくtransport Unitへruntime probeを内包する; adapter先行着地や「要調査」で止まるUnitを避け、connected/follow-upの価値結果まで同じ境界で閉じるため。

## Open questions

- 2026-08-04T12:21:50Z — U1〜U3はDAG上独立だがregistry等の共有file contentionがある; topologyへ偽の依存を追加せず、Delivery PlanningでBolt groupingを判断する。
- 2026-08-04T12:24:51Z — Reviewer FOLLOW-UP: Kiro ACP/TUI Unitの規模見積りは直接実装分岐を基準としている; Delivery Planningでdirect/follow-up分岐別に再見積りする。
