<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-14T12:40:00Z — ユーザー裁定(仕様変更・本会話の直接指示): 過去の選挙データの読取互換は不要。FR-COMP-1(legacy decode / `legacy-question` 予約 ID)・FR-COMP-4(migration CLI の両 schema 認識)を撤回し、v2 並列モジュール群(amadeus-election-v2-*.ts + v1/v2 実行時ディスパッチ)を単一正実装への破壊的置換で解消する。migration CLI(scripts/amadeus-election-migrate.ts)と legacy 専用テスト(t262/t556 ほか legacy decode 面)は削除。既存ストアの旧データはディスク上に残るが CLI からは読めない(git 履歴と一次記録は保存)。背景: v2 並列実装は org.md Forbidden(要求されていない二重実装の禁止)の趣旨に反するというユーザー指摘を受けた是正。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-14T08:08:00Z — create は dirty worktree と origin との ahead 24 / behind 12 で拒否される。commit も force-push も未許可。PR 番号は捏造しない。
