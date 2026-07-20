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

- [2026-07-19T15:10:46Z] Interpretation: feasibility:c1(外部前提の実ツール検証)の適用対象は本 intent では内部 seam のみ — Ballot.parse/store/tally を grep・実読で検証し、外部レジストリ照会は非該当。
- [2026-07-19T15:10:46Z] Interpretation: tally(model.ts:321-338)の無差別集計を実測し、amend write 経路の単独開放が二重計上を作ることを feasibility の主発見として C-4/R-1/D-1 に固定 — 設計裁定(選挙)を design 段の前提条件へ昇格。
- [2026-07-19T15:10:46Z] Tradeoff: 判定は Conditional GO でなく GO+前提条件(選挙裁定)を選択 — 外部不確定性がなく、条件は自チームの選挙プロセスで解消可能なため(feasibility:c4 の「代替へ黙って降格せず停止」原則は C-5 の逸脱停止で担保)。
