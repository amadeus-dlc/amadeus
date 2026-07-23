<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-23T00:42:18Z — performance/security の専用テストは cid:build-and-test:c1/c3 の選定基準で N/A(性能 NFR 不在・攻撃面拡大なし)— 戦略名だけの機械追加をしない判断を instructions に根拠付きで記録
- 2026-07-23T00:42:18Z — B&T は bugfix スコープの construction 最終 = phase 境界(次 in-scope ステージなし)。phase-check-construction.md 作成済み、approve は per-gate delegate 経路
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-23T00:42:18Z — 監査シャードが hostname 変化で local→lan に分裂(同一 clone-id add286b804a1)。センサー verdict は lan シャードで実測(44 PASSED / 0 FAILED)— union 読みで吸収、異常ではない
- 2026-07-23T00:42:18Z — fixture audit 汚染(#1389)がフル CI 再実行で決定的再現(2/2)→ 再除去+Issue コメント追記。type-check センサーは filter(**/*.ts)適合成果物なしのため発火対象外(matches-rejection 回避)
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
