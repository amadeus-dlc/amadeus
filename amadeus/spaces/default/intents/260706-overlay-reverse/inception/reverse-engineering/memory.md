<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T12:25:00Z — 既存 codekb（amadeus/spaces/default/codekb/amadeus/）を採用し、0d6d492f..6e82899a の未反映分（#583/#585/#586/#587）を差分更新した。#587 = 本 Intent の対象ファイル scripts/amadeus-install.ts の全面更新（自分の #543 実装）であり、codekb の installer 記述を最新化してから設計に入る。
- 2026-07-06T12:25:00Z — bug 最優先の速度要件により conductor 直接処理（前例: 260706-persona-loading）。#554 の逆変換実装（dev-scripts/apply-model-overrides.ts の reverse-normalization）は functional-design で実測してから流用可否を確定する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
