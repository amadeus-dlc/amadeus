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
- 2026-07-19T22:38:09Z [Interpretation] diff-refresh(base a326f47bc・祖先 exit 0・dist 20、scripts/ 区間変更0件)。一次原因 = tally(model.ts:321)の choice-blind 裁定導出(ETF 設計欠陥)。verify は tally recompute で自動追随 — 修正集約点は tally 一点+TallyResult 型拡張の機械的波及。
- 2026-07-19T22:38:09Z [Interpretation] E-GMEBT が唯一の実データ fixture(choice 2-1 不採用 vs adopted 誤描画)。unknown-choice 対称欠落(e4 所見)を実文確認。e2 intent と tally/Ballot.parse で直接交差 — 直列合意済み(e1 先行)。
- 2026-07-19T22:38:09Z [Open question] 方式選挙が必要: choice 勝者選出(票数 vs GoA 重み)・hold 分岐の choice 軸再定義・TallyResult 型拡張形・unknown-choice のスコープ — requirements へ。
- 2026-07-19T22:38:09Z [Deviation] engine の diary 自動生成が不在だったため conductor が template から作成(persona の fallback 手順どおり)。
