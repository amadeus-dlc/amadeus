<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T08:30:00Z — mode: subagent に対し conductor 直接処理（#552 の上流全数調査の文脈保持が執筆品質に直結するため。Maintainer 裁量許可と前例）。実測は scratchpad の fresh clone（b67798c3）を再利用し、両側件数を採取した。
- 2026-07-06T08:30:00Z — audit-format.md の per-category 合計が 72 で header の 71 と 1 差ある既存不整合（reviewer が iteration 1 で検出、本 Intent のスコープ外）は、文書では header 値（71）= 出典明記で記載し、不整合自体は leader へ申し送る。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
