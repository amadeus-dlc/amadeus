<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-16T21:18:00Z — 公式 docs を WebFetch 実測: plugins 配置・自動ロード・JS/TS 形式・イベント一覧は文書化済み、payload スキーマは未文書と確定 — 確約は書かず C-4 として RE の一次ソース直読へ委譲(external-seam-vocab-measurement)
- 2026-07-16T21:18:00Z — dist/opencode 実測: core hooks 10ファイルが配布済み・未配線(plugins dir 不存在)— 実装面は配線プラグイン+manifest に縮小
- 2026-07-16T21:18:00Z — HUMAN_TURN 相当イベントが docs 一覧に不在 — GO 条件の核心として R-1 に固定(不在なら根拠付き未対応維持 = スコープ(3)が許容)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
