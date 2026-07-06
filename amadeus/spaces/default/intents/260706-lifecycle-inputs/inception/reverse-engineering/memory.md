<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T06:00:00Z — 既存 codekb（amadeus/spaces/default/codekb/amadeus/、9 artifacts）を採用した。解析時刻 2026-07-06T04:04:37Z、対象コミット c50a0fe5（Intent 260706-full-rename の差分更新）。#498 修正以降、produces は codekb/ へ解決されるため stub は作らない（前例: 260705-presence-evidence）。
- 2026-07-06T06:00:00Z — codekb 基準 c50a0fe5 と現 main 9dd93f50 の差分は PR #553（全面 rename）のみ。本 Intent の対象は docs/amadeus/lifecycle/ の文書契約であり、rename 後の path（amadeus/、amadeus-state.md、.claude/amadeus-common/ ほか）は Inputs 実測時に stage frontmatter・rules_in_context を直接読むため、codekb の再解析は不要と判断した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
