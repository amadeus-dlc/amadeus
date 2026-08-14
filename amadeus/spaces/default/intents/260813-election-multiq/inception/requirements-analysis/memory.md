<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-13T08:04:00Z — Standard depth は妥当と判断し、Issue #2813 の明示要件を15〜30 FRへ展開する前に、aggregate、ID、ballot、mixed result、互換範囲、性能の6点を確定する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-13T08:10:48Z — 旧単問 schema の question ID は質問文 hash や配列位置から導出せず、予約 ID `legacy-question` を使う。内容編集や移行で ID が変わらず、再実行と canonical digest の同一性を検証できるため。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
