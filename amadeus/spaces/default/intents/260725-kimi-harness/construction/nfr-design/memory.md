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

- 2026-07-25T14:20:00Z — Interpretations: N/A カテゴリも「設計対象なし」を明記して5ファイルを欠かさず生成(要件と1対1の対応を保つ)
- 2026-07-25T14:20:00Z — Tradeoffs: TOML 検証 oracle は Bun.TOML.parse(ランタイム内蔵)を選び、外部パーサ導入を回避(tech-stack の却下条件と両立)
- 2026-07-25T14:20:00Z — Interpretations: consume 外の BR 参照は「経由」の provenance 表記で扱う(reviewer 承認の様式)
