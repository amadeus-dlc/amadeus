<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-22T23:56:46Z — [Deviations] Q3 で「手動実証」を推奨したが、ユーザー指摘→再実測で既存の fake-herdr 統合テスト(t-team-msg)と pty e2e 基盤の実在を確認し e2e 組み込みへ訂正。推奨起草前の既存資産棚卸し(Reuse Inventory)を怠った — absence-claim-grep-verify の「不在主張の反証確認」違反類例。§13 候補。

- 2026-07-23T00:00:02Z — [Interpretations] §13 選定: 採用0件をユーザー直接裁定で確定(Q3 の手動実証誤推奨は absence-claim-grep-verify の違反実例として次回ローリング PM へ報告 — 新規ルール性なし)。
