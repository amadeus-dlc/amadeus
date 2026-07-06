<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-06T09:20:00Z — CLI 機能のため wireframe は 3 様式スケッチ（manifest JSON / 更新出力 / 版確認出力）とし、既存の amadeus-install: prefix 行形式（実測 509・548 行）を踏襲した。3-way merge はしない（退避 + 利用者の再適用）を Right-Sizing としてフローに明記した。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-06T09:30:00Z — §12a 反復 1 の指摘 3 件を修正した。(F1 高) 出力例が実装の [n/5] ステップ行形式を省略し「すべて prefix 行」と誤って断定していた → 実測（runStep 489 行）どおりの混合形式へ修正し様式の原則を訂正。(F2 高) 全会一致で確定済みの Q4（削除ファイルの再作成）が mockup とフローに未登場だった → restored 行とフロー 1 への明記を追加。(F3 中) manifest 不在メッセージが次の一手を示さない → 既存の fix: 規約に合わせたヒントを追加。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
