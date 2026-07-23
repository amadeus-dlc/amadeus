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
- 2026-07-22T15:20:00Z — Interpretations: 事前整理(#1309 用語照合、2026-07-22 leader セッション)で確定済みの事項(ideation park・ミラー化・rename スコープ外)は前提として質問から除外(cid:intent-capture:c1 適用)
- 2026-07-22T15:25:00Z — Deviations: チームモードだが、ユーザー明示指示(実 HUMAN_TURN)により本 intent は leader セッションでユーザー対話モードで実行。明確化質問はメンバー選挙でなくユーザー直接裁定で確定(選挙ノルムの上位 = ユーザー裁定)。conductor 割当(e1)はユーザー指示で取り下げ済み
- 2026-07-22T15:30:00Z — Interpretations: Q3 裁定により新用語「ライフサイクルレコード」を用語集(knowledge/amadeus-shared/domain-language.md)へ登録(登録条件 (b) ユーザー裁定充足)。#1309 の他の提案語彙(SpaceRecordCatalog 等)は設計確定まで未登録
- 2026-07-22T15:30:30Z — Open questions: createdAt 導出・タイムゾーン規則・投影配置の3裁定は本 intent の後続ステージ(feasibility / scope-definition)で扱う
