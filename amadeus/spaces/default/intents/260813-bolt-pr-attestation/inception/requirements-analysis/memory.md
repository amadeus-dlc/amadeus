<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-13T23:20:00Z — Issue #2985の2 Unit / 1 Bolt成功条件を優先し、Delivery Boltが正規 Unit集合を所有して1件のPR証跡を各member Unitへ投影する候補Aを採用した。候補Bの強制分解は対象ケースを消すため採用しない。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-13T23:20:00Z — project既定の「複数 Unitを1 PRへ束ねない」は維持しつつ、同一 Delivery Boltの明示member UnitsだけをIssue #2985に必要な狭い例外とした。別Bolt・別Intent・無関係変更のfoldは禁止を維持する。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
