<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-23T03:06:20Z — ユニット4分割は components.md C1〜C4 と1:1。C5(norm PR)はコードなしのためユニット外の先行タスク T-norm として delivery-planning の順序制約へ委譲(FR-7 (c) のマージ順序制約は DAG のコード依存辺にしない — 検証劇場を作らないため edge block には載せず prose+DP で扱う)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-23T03:12:59Z — reviewer i1 Major(story-map の stage 定義 :126-130 必須2要素欠落)+Minor(U1 境界の ADR-5 usage 出力面漏れ)を是正 → i2 READY。consumes-first-drafting の類型(stage 定義の produces 要素を先に読む)の違反実例2件目として PM 回付対象
- 2026-07-23T03:06:20Z — upstream-coverage FAILED 2件(dependency/story-map の冒頭行が consumes 全数列挙でなく『経由で継承』の要約記載)→ 冒頭行を宣言全数+本文導出注記へ是正し再発火 PASSED。consumes-first-drafting/body-derivation-before-header の違反実例(自己捕捉、レビュー前)として PM 回付対象
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
