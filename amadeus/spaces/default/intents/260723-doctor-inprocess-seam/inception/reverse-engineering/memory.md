<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-23T02:56:30Z — Issue の起票時前提を現行仕様とはみなさず再実測した; `handleDoctor` は既に export され複数テストが直接呼び出しているため「本体全行が常に LCOV 非計測」は失効したが、正式な戻り値 seam と cwd/env/cache の明示依存化は未実装と解釈した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-23T02:56:30Z — 既存の共有 codekb を全置換前提の入力として再利用し Issue #857 の差分へスキャンを集中した; repo 全体の既知構造を保持しつつ、`a81c11d` から `abb5576` までの到達可能な差分と doctor 関連面を優先することで Minimal depth に合わせた。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-23T02:56:30Z — Functional Design で doctor core の戻り値を単純な exit code とするか、results/output/exitCode を持つ結果オブジェクトとするか確定する。
