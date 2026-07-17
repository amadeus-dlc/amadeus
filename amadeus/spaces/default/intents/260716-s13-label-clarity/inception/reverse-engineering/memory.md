<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-16T01:07:40Z — base=6495e03a1(observed 準拠・祖先・距離28)を採用; より近い d6b489772 は re-scans 鮮度追補の landed-main pointer で observed でないため不採用(rescan-base-ancestry の厳密適用 — pointer と observed の区別を明示)
- 2026-07-16T01:07:40Z — 否定例の配置先は stage-protocol.md L960 単独と確定 — Developer 列挙+Architect の反証 grep(検索語8種)の2段で L19/L577(post-selection capture 別クラスタ)除外を確認(enumeration-completeness+absence-claim-grep-verify)
- 2026-07-16T01:07:40Z — 編集正本は packages/framework/core/amadeus-common/(生成ツリーとの差は HARNESS_DIR 置換行のみ・L960 は byte 同一)— 修正は正本編集+dist 再生成の通常経路。センサー scan-notes 2/2 PASS

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
