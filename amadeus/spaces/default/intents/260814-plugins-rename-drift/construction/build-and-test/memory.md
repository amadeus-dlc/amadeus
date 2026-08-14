<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-14T14:17:03Z — 新規テストを追加した PR は tests/.coverage-registry.json の regen(bun tests/gen-coverage-registry.ts)を同梱しないと CI の gen-coverage-registry freshness テストが赤化する; 本 intent で #3051(t2996 追加)と統合断面(t2996+t2997 合流)の両方がこのクラスで赤化し、regen 同梱で解消した。既存の bt-ledger-resync(model-map/allowlist)と同族だが別台帳。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-14T14:17:03Z — フルスイートのローカル 2 回実行で size 分類 flag(declared=medium measured=large)が実行ごとに異なる集合で発生; 複数エージェント並行・CI 併走環境の負荷起因で本 intent 非帰属と判定(t-pi-child-driver の機能赤も単独 green で同判定)。t224/t427 の CI 赤も生 5000ms timeout の同クラス。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
