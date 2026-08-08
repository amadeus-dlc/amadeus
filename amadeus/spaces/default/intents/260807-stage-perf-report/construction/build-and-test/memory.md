<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-08T05:07:52Z — フルスイートの失敗を「既存事象」と分類する際、未改変ベースでの単純再実行では足りず、**ambient 入力(アクティブ intent の runtime-graph + カーソル)だけをベースへ植えた対照実験**で同一再現を作って初めて帰属が確定した; 素のベースでは 3 件とも green、ambient を植えると 3 件とも同一に赤 — 「ベースで再現しない ≠ 自変更由来」であり、テストが読む ambient 状態を再現条件に含めないと自変更へ誤帰属する。
- 2026-08-08T05:07:52Z — フルスイートの初回赤 38 assertion のうち 35 は `@ast-grep/napi` 未インストール(`InfraFailure: TOOL_MISSING`)で、コード欠陥と区別がつかない見た目だった; フルスイート実行前に依存インストールを済ませることを build-instructions のトラブルシューティングへ明文化した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
