<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-27T07:29:56Z — Q1 裁定(hook 件数 count-free)のハーネス件数への類推適用は無断一般化を避け FD へ明示委譲(FR-1b); 裁定範囲の保存
- 2026-07-27T07:29:56Z — 本文の個別 file:line は consumes 転記でなく起草時 repo 直接実測と明示(iteration 1 Major の是正方針 (b) 採用); 契約外 codekb 依拠を残さない

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-27T07:29:56Z — FR-3c の行番号ピンをやめ「grep -c plugin-compose = 0」の機械検証可能基準へ変更; 行シフト耐性(allowlist-line-pin-stale の教訓)と検証容易性を優先
- 2026-07-27T07:29:56Z — reviewer 再実測で 15-troubleshooting.ja.md:222 の追加乖離を検出・FR-3b へ編入; 是正が検出面を広げた好例

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
