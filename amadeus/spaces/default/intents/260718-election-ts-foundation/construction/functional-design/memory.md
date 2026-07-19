<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-19T03:22:18Z — 6 unit FD の並行レビューで NOT-READY 4件(U2: state 永続矛盾+並行前提 / U3: parseGoaLine 実行反証(0省略・複節コード)/ U4: solo 配信記帳の生成点 / U5: 状態数の鳩の巣矛盾)+REVISE 1件(U6 citation)。うち導出可能2点(単一書込主体=D-09 / state 明示永続=C2 表)は申告、真の裁定3問(Q1 配信記帳・Q2 状態機械 ADR 追補・Q3 GoA コード制約)を E-ETF-FD2 へ — reviewer の実 parseGoaLine 実行・U2 正本突合という機構実測が全指摘の根拠で、adversarial review の実効を実測
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
