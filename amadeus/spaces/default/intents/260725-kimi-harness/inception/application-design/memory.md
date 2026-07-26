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

- 2026-07-25T09:10:00Z — Interpretations: 参照質問は全て既存実装から導出可能と判定(requirements-analysis:c5 を初適用)。emit 要否のみ実測で閉じた(.agents 版 frontmatter が claude runner-gen とバイト同一 = Kimi は未知フィールド寛容)
- 2026-07-25T09:10:00Z — Tradeoffs: managed block 正本は dist 同梱 authored file(単一ソース・drift 検出)とし、installer ハードコードを拒否(ADR-4)
- 2026-07-25T09:10:00Z — Deviations: services.md はネットワークサービス不存在を明示したうえで、実行単位の協調を整理(c4 準拠の N/A 記法)

- 2026-07-25T09:32:00Z — Deviations: 再び gate-start を §13 回答前に実行し回答イベント未記録(persist しない選択のため実害なし)。二度目の同型ミス — §13 完了後に gate-start の順序を徹底すること
