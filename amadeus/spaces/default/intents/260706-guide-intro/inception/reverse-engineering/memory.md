<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T07:50:00Z — 既存 codekb/amadeus/ を採用し、9dd93f50..3366cd69 の差分（PR #559 = エンジン修正 3 件、#561 / #563 = docs-only）を実測評価した。#548（validator の RE produces 共有 codekb 直接解決）は architecture.md の検査記述の前提を変えるため外科的に追記し、timestamp 2 ファイルへ差分記録を追記した。
- 2026-07-06T07:50:00Z — #548 の直接解決により参照台帳 stub の作成は不要になった。stub なしで validator pass（fail 0）を早期実測で確認済み。前 Intent までの「stub 早期作成」の学びは #548 で無効化された（エンジン改善が運用回避策を置き換えた実例）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
