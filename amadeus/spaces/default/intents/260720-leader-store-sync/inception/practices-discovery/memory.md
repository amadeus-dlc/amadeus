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

- [2026-07-20T03:38Z] Interpretation: practices-discovery:c1(同日 RE codekb 証跡代用)+c2(live 全温存の部分ドラフト)適用 — 差分ギャップ0・新規候補0・質問0件(E-OC1 対象質問なし、e2 の 260719 同ステージと同型)。
- [2026-07-20T03:38Z] Deviation: 初回 upstream-coverage FAILED 4件(宣言 consumes = codekb 6点への実参照不足)→ c1 代用の内実を6点への実参照として書き直し全 PASSED(consumes-first-drafting の違反実例 — PM 回付対象として自己申告)。
