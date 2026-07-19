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

- [2026-07-19T22:38Z] Interpretation: E-BFARA1 e4 留保への design 回答 = ADR-1(normalizeAt 残置+恒等コメント)。留保の2択(残置/除去)のうち surgical・防御層維持で残置を選択し Alternatives に除去を記録。
- [2026-07-19T22:38Z] Interpretation: 起草時引用の自己実測で2件是正 — tally 呼び出し元「5箇所」→ scripts 実測2箇所(:353/:440)、GoaFreq 消費行を :447/:448 実測値へ(ledger-count-mechanical-recalc / mechanism-cite-verify-at-draft の適用)。
- [2026-07-19T22:38Z] Interpretation: #1262(receivedAt)はスコープ外と設計判定(受理境界の内側でない timeline 意味論)— e1 との直列合意も component-dependency に固定。
