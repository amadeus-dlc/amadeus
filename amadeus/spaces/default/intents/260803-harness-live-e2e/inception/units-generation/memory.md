<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-03T12:05:41Z — Unitは共通基盤2件とadapter別transport slice 10件に分ける。すべて短命test infrastructureの再利用コードであり、canonical kindは`library`とする。
- 2026-08-03T12:43:37Z — 先行の12 Unit解釈を11 Unitへ改訂する。U01単独をvertical walking skeleton、U02をcontract-preserving hardening、U03〜U11をtransport sliceとし、全Unitのcanonical kindは`library`を維持する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-03T12:43:37Z — Delivery Planningでwalking-skeleton要件と複数Unit/PR禁止の矛盾が顕在化したため、承認済みStage 2.7を後方ジャンプで再開した。ユーザー直接裁定により、旧U01〜U03の水平分割をvertical U01とhardening U02へ再分割した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-03T12:05:41Z — Claude SDK/TUIとKiro ACP/TUI/IDEをfamily単位の巨大Unitにまとめずtransport別Unitにする。既存driverの所有pathとfake/live検証を独立させ、Delivery PlanningがDAG上でBoltへ束ねられる粒度を優先する。
- 2026-08-03T12:43:37Z — U01にC1〜C9のproduction kernelとCodex C5/C6を集約し、U02は公開contractを再定義しないadversarial test kitへ限定する。U01がL規模になる代わりに、最初のBoltを1 Unit / 1 PRでend-to-endに閉じ、production ownershipの重複を避ける。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
