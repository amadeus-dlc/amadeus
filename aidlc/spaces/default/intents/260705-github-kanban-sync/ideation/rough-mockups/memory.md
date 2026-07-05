<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T02:27:36Z — 上流入力 intent-statement.md / scope-document.md の成功指標をカードフィールドへ 1 対 1 で写像した; mockup は Projects v2 の Board view の ASCII 表現とし、独自 UI は描かない
- 2026-07-05T02:27:36Z — 人間指示（PR まで自動進行）により、列構成とカード表現の 2 問を推奨案で自己回答した

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-05T02:27:36Z — Awaiting Approval を独立列にし、phase 列より優先する表現を採用; 承認待ちが phase 列内のバッジだと従課題（滞留検知）が一覧で拾えないため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
