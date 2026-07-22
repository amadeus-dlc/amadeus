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
- 2026-07-22T09:25:00Z — **Deviations**: code-generation-plan.md はステージ雛形のチェックボックス/Step-N 様式でなく叙述形で作成(reviewer iteration 1 指摘)。1ファイル4関数の chore として実質は全項目カバー済みのため conductor が意図的逸脱として受理。雛形前例としては使用しない。
- 2026-07-22T09:25:00Z — **Interpretations**: reviewer のスポットチェック要求(amadeus-state.ts)は check-read 契約(integration ID を含む passed consume が必要)が chore degrade スコープでは構造的に充足不能のため却下し、conductor が対象シンボル(extractIntentSelector:391 / resolveSelectedIntent:421 / lockIntent:594,659 / 4 handler の selector 配線)を直接 grep 実測して代替検証した。
