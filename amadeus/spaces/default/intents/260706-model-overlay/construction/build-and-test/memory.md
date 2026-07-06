<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06 — requirements.md FR-3.2 の「apply は毎回 base を最新の実値で記録し直す」という機構描写を採用せず、BR-10/BR-12 の方式（bootstrap 時のみ base 記録、以降の更新は `--accept-upstream-base` の明示操作のみ。管理外実値は非ゼロ終了で拒否）に置き換えた。理由: reviewer iteration 1 の懸念 2（自動再記録が上流 drift を握りつぶす）。FR-3.2 が要求する結果（drift 時の parity fail）と Q1 合意（parity が正しく fail すること）は BR-9/BR-10 で満たされる。承認済み requirements.md は書き換えず、gate 承認でこの逸脱を確定する。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
