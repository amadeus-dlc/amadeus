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

- 2026-08-15T (Interpretation): 1 Issue = 1 Unit で5ユニット。依存辺は U-2→U-3 の1本のみ。独立実装可能性を検証済み(ファイル交差なし、共有台帳のみ conductor 直列化)。
- 2026-08-15T (Deviation): iteration 1 NOT-READY(yaml エッジブロック・canonical kind・H2 の様式欠落 — ステージ契約の PART 2 様式を未読のまま起草した)→ 是正して iteration 2 READY。
