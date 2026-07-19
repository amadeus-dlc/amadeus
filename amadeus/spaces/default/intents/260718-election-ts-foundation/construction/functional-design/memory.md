<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-19T03:22:18Z — 6 unit FD の並行レビューで NOT-READY 4件(U2: state 永続矛盾+並行前提 / U3: parseGoaLine 実行反証(0省略・複節コード)/ U4: solo 配信記帳の生成点 / U5: 状態数の鳩の巣矛盾)+REVISE 1件(U6 citation)。うち導出可能2点(単一書込主体=D-09 / state 明示永続=C2 表)は申告、真の裁定3問(Q1 配信記帳・Q2 状態機械 ADR 追補・Q3 GoA コード制約)を E-ETF-FD2 へ — reviewer の実 parseGoaLine 実行・U2 正本突合という機構実測が全指摘の根拠で、adversarial review の実効を実測
- 2026-07-19T04:15:00Z — E-ETF-FD2 裁定適用後の増分再レビューで全6ユニット READY 確定(U1/U3/U5/U6 は iter2、U2 は iter2 READY+新 Major 1 即時是正、U4 は iter2 で伝播漏れ Critical 検出→iter3 READY)。是正 diff が新たな欠陥を2件生んだ(U2 後着経路の二重票迂回 / U4 interface 未伝播)— fix-diff-independent-reverify クラスの実例2件。unit-of-work.md の「6状態機械」stale 表記も申告付きで7状態へ同期
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
