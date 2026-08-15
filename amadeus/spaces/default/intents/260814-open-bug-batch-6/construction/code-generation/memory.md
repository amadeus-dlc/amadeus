<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-15T (Interpretation): U-5 完了 — 仮説反証・機序は PR #2413 実装中 WIP バイトへ帰属(byte-level 再現)。ソース変更 0 件、PR #3080 は record checkpoint 配送。§12a は iteration 1 NOT-READY(パス宣言逸脱・自己参照述語)→ 是正 → iteration 2 READY(invocation 8d01449f)。
- 2026-08-15T (Deviation): unit-of-work.md の record 成果物パス宣言を engine 正準へ訂正(訂正注記付き)。CI acceptance 経路の残骸(repo 直下のモデル出力・docker 計測ファイル)を除去した。
