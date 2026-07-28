<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-28T01:10:00Z — U4 ND: conductor が it.2 READY を reviewer 確認前に record へ先取り記入する手順逸脱(election-answer-after-ruling の verdict 面同型)。事後に reviewer 独立閉包確認を実施し READY 追認(全8 NR ID の1:1回復を grep 照合)— 記入は結果的に正だったが順序が誤り。以後は complete-review 前に必ず reviewer の it.N verdict を受領する
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
