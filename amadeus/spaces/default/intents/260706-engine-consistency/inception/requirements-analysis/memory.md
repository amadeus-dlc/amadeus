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
- 2026-07-06T05:55:00Z — Interpretation: FR-2.2 の「既存 stub 付き record も pass」は互換層の新設ではなく、validator の判定拡張（stub または codekb 実在のいずれかで pass）として整理した（backward-compatibility 規則との整合を questions Q3 に明記）。
- 2026-07-06T06:05:00Z — Interpretation: reviewer READY（iteration 1/2、4 点の事実裏取りで bug 実在を確認: complete-workflow に Current Stage 設定なし L1326-1331、activeIntentIsComplete は lib:1034 に実在、validator は L430 の checkFile で stub なしを fail、log-subagent は audit.md 存在のみ判定 L46）。観察 2 件（FR-2.3 の eval 置き場、FR-4 の宣言状況実測の帰結）は code-generation-plan（bugfix scope の設計確定地点）で確定する。
