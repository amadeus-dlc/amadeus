<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-01T13:20:00Z — pre-guard 側に独立した stdin parse(try/catch・副作用なし)を許容; source/malformed 分類は post-guard に残す二重 parse 構造を選択( builder 提案、reviewer READY)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-01T13:20:00Z — 私(conductor)の指示ミスで 2 artifact が一度英語で作成された; amadeus/**/*.md 日本語ルールに従い日本語へ全面書き換え済み(言語ルール違反は同一変更内で修正の規範どおり)

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-01T13:20:00Z — t10 ヘッダの歴史的行番号引用が pre-change layout 基準で stale だが、意味記述は正しく surgical 範囲外として据え置き(reviewer の advisory nit を受容)

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-01T13:20:00Z — なし
