<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-21T02:02:12Z — 「禁止」は server-side safety check の無効化ではなく、team-up 管理下の既知 Codex safety-wait UIを自動解除する要求と解釈した；公開 option と approval bypass では無効化できないため。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-21T02:02:12Z — agmsg bridge 拡張ではなく team-up 所有の Herdr 境界に専用 supervisor を置く候補を選んだ；bridge は modal API を持たず、session／member／pane lifecycle は team-up が所有する。
- 2026-07-21T02:02:12Z — pane ID 永続化より role 名からの再解決を基準案とした；現行 run record を広げず resume に適合する一方、0件／複数件を fail-closed にする必要がある。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-21T02:02:12Z — Herdr 0.7.1 の visible read 出力に対する ANSI／wrap 正規化の最小許容範囲と、対応 Codex version allowlist は requirements-analysis で確定が必要。
