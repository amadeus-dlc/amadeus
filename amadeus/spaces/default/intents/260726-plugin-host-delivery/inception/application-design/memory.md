<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-27T00:15:00Z — 設計の要は「compose engine 未配布」の実測(dist に plugin 系 0 件)から導いた ADR-2(core/tools 移設)。ADR-1(activation policy)は案 A(spec-hash 決定的ゲート+advisory、自動実行なし)を推奨として本ゲートで裁定に付す
- 2026-07-27T00:15:30Z — §12a reviewer(architecture-reviewer)2 iteration: it.1 NOT-READY(Major: FR-4 対応表漏落 / ADR-3 の no-help-probe 意味論不一致)→ 是正(FR-4 の C1/C2 配賦、未知フラグ fail-closed 拒否行の追加、C6 engine 側内訳明記)→ it.2 READY(findings 0)。Minor 留意(engine 関数名の次段再検証)は units-generation へ引き継ぐ

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
