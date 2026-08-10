<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-10T11:36:40Z — スキップ済み Unit 定義の代わりに承認済み要件と codekb を実装境界とした; self-fix では units-generation が設計どおり欠落するため、13行の prose と2キーの規則差分だけを対象にした。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-10T11:36:40Z — compose Red の前に build を実行した; stale dist による無関係な失敗を除き、新しい root-relative path 述語の失敗だけを証跡にするため。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-10T11:36:40Z — transform/seed 等価性を harness ごとの独立 test case にした; assertion 数は増えるが、複数 harness の Red を同一実行で個別観測でき、AC-4b の監査可能性を優先した。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
