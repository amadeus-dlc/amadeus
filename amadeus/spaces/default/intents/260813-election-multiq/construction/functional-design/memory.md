<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-13T11:53:15Z — U1では`legacy-question`をlegacy decode専用予約IDと解釈し、新規v2 authoringでの使用を拒否する。canonical tallyは全definition questionをちょうど1件ずつ覆う。
- 2026-08-13T11:55:15Z — U2のrerun入力をtarget hold IDsとpreserved established resultsのdisjoint partitionとして定義し、全question被覆とdigest一致をstore commit前に検査する。
- 2026-08-13T11:57:42Z — U3はmulti-file commitを削除rollbackで扱わず、create-only historyを先に固定して同runId/同bytesのforward repairで収束させる。
- 2026-08-13T11:59:47Z — U4はrecordをdefinition順question sectionsの正本とし、transportはvoterごと1 view pathのままpayloadだけを多問化する。
- 2026-08-13T12:02:13Z — U5はpartial directiveへheld[]、target IDs、preserved digestを必須で載せ、CLI内ではpolicyを再実装せずU1〜U4をorchestrateする。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-13T11:53:15Z — unknown fieldのsilent preservationではなくversionごとのstrict whitelistを採用する。forward compatibilityはunknown dataの推測ではなくschemaVersion追加で扱う。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
