<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations

- 2026-08-02T00:36:53Z — #1963 は外部修正の統合依存へ再分類; Intent 開始後に PR #1970 で修正済みとなったため、重複実装せず回帰検証だけを本 Intent に残す。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs

- 2026-08-02T00:36:53Z — 走査は手書き正本3領域へ拡張し、生成物とテスト fixture を除外; 配布元の網羅性を上げつつ、投影コピーの重複と意図的違反 fixture のノイズを避ける。
- 2026-08-02T00:36:53Z — 免除にも shrink-only ratchet を適用; 正当な新規免除の導入コストより、ゲート迂回を通常運用にしないことを優先する。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions

- 2026-08-02T00:36:53Z — 初期 census の実件数は未計測; 検出器の walking slice で測定し、人手分類不能な規模ならルール分割が必要。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
