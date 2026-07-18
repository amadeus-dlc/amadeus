<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-18T01:48:01Z — iteration 2 残 Major(語彙分裂)を是正: canonical 6句を RNR-W2/SNR-W2/RNR-D2 へ verbatim 伝播+「安全に隔離される」不採用理由を転記(8b1c1f3a0)→ 焦点 re-review READY(reviewer の非ブロッキング Minor = 本 diary 追記、この行がその実施)
- 2026-07-18T01:43:05Z — U1 ND reviewer REVISE(Major 2/Minor 1)→ 是正: (1) 禁止フレーズ集合をフレーズ単位6句へ絞り込み(単語「保証」不採用 — vocabulary-collision 回避)+corpus sweep 実測(harness skills/onboarding/docs 全域 6句 0件) (2) canonical 参照経路を unit-of-work-dependency.md の Cross-unit 決定欄 CU-1 として正式登録(承認済み UG 成果物への申告付き追記)+U2/U3 NR 4ファイルへ参照伝播(review-fix-propagation — 伝播先一覧: RNR-W2/SNR-W2/RNR-D2/SNR-D2) (3) t134 引用を tests/e2e/t134-swarm-referee.test.ts へ精密化(unit 版の誤認防止)
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
