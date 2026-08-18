<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-18T07:20:00Z — self-fix スコープは intent-capture を SKIP するため issue-evidence.md が record に存在しなかった。stage 本文が名指す証跡チャネルを成立させるため、orchestrate ループ外の read-only verb `amadeus-utility.ts issue-evidence fetch --issues 2837,3106` を実行して `<record>/ideation/intent-capture/issue-evidence.md` を取り込んだ(#3181 の設計どおり、consumes 宣言は追加しない)
- 2026-08-18T07:20:00Z — 差分ベースは re-scans/ 中で HEAD の祖先である最新 observed = 23d4ae767(260817-inception-cost-batch の observed)を選定。#2415 で導入された除外 pathspec 5 本を Developer scan の指示に逐語で同梱した

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
