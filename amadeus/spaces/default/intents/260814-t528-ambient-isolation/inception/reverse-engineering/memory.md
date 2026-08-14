<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-14T04:30:00Z — xrev differential scan mode を採用。xrev-260814-2981(target-sha 52f1f1b25)と observed(HEAD=origin/main 5f6b5bf97)の差は docs-only 1 コミットで被引用パス(t528 テスト / amadeus-orchestrate.ts / amadeus-lib.ts / fixtures.ts)と交差なし(git diff 52f1f1b25..HEAD -- <paths> 空、exit 0)。schema 移行 PR も間に不在で currency 成立
- 2026-08-14T04:30:00Z — 差分ベースは re-scans/ 全 observed のうち HEAD 祖先で距離最小の 89532174c(dist 9)。本 intent に prior scan record なし
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
