<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-23T03:07:56Z — E-MHERA1(A: isMarkerArtifact を lib へ canonical 抽出、3-0)/ E-MHERA2(A: marker_exempt+消費配線、3-0)を [Answer]+FR-1/FR-2 へ反映。留保必須票(GoA2)4件(MHERA1:1+MHERA2:3)を全件 verbatim 転記し件数照合一致(reviewer iteration 2 で 1/1+3/3 を独立確認)。E-MHERA2 の B 縮退分岐は e6 留保に従い『leader 申告+再裁定必須』の運用規則として FR-2 へ固定
- 2026-07-23T03:07:56Z — E-MHERA1 の前提訂正(e1 GoA2): 起草判断点の『センサー』の語がスクリプト(lib import のみ — :3 実測)と dispatcher(graph import あり — amadeus-sensor.ts:39-47)を区別せず曖昧だった。conductor 再実測で両言明の両立を確定し、裁定の記録節へ全文転記。裁定 A の妥当性は不変
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-23T03:07:56Z — reviewer iteration 1 Major: トレーサビリティの『クロスレビュー2名』主張が e5 一名分のエビデンスのみだった — Issue #1296 コメント実測(VERIFIED 08:00:10Z / CONFIRMED 08:01:21Z、2026-07-20)で4段系譜へ精密化して是正。numbers/エビデンス粒度の違反実例として PM 回付
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-23T03:07:56Z — questions は2問+『## 裁定の記録』節の構成(E-TCRRAS13B 様式適用)で required-sections floor を通過 — 本 intent が修正対象とする欠陥の運用回避を自 intent でも適用した(修正着地までの暫定)
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
