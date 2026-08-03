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
- 2026-08-02T16:12:42Z — Interpretations: #1980 はクロスレビュー2名＋本文改稿＋独立再検証で既決事項が多いため、cid:intent-capture:c1 に従い質問を未決3判断（分類台帳の record 化範囲 / mirror property 化の位置づけ / 深掘り CI ジョブ）に絞った。3問ともユーザーが推奨案（C/B/C）を採用。
- 2026-08-02T16:12:42Z — Deviations: [Answer] タグ一括置換で置換文字列自身が [Answer]: を含み入れ子混入（3答が1行に連結）→ 即時検出し行単位で修復（cid:code-generation:bulk-edit-verify-before-write の実例 — 置換成立検証を書込前に行うべきだった）。
- 2026-08-02T16:12:42Z — Interpretations: consumes 宣言が空のため、上流入力ヘッダは「なし」と明記する形で artifact-upstream-inputs-header の趣旨（装飾トークン禁止）を守った。
