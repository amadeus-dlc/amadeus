<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-28T13:57:52Z — 非祖先の旧 observed を差分 base に使わず `base=none` とした; 旧 codekb の最新 observed `afb93a825...` は現 HEAD `ca8ff0af4...` の祖先ではないため、現 HEAD と `v0.1.6` からの実測を正本にした。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-28T13:57:52Z — 宣言済み RE sensors を成功扱いせず代替検証を記録した; codekb 出力 path は required-sections / upstream-coverage / answer-evidence の matches 対象外なので、H2 数・競合マーカー・現在マーカー・Mermaid parse・whitespace baseline を直接検証した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-28T13:57:52Z — 全体再記述ではなく 5 path・3カテゴリの差分リフレッシュを選んだ; 既存 codekb の履歴を保存しながら、今回の修正境界と生成面同期だけを現在節として追加した。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
