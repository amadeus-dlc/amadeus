<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T18:04:07Z — units-generation SKIP のため成果物は construction/functional-design/ 直下に配置(directive の {unit-name} プレースホルダは単一ステージ実行では不使用)
- 2026-07-06T18:04:07Z — OQ-1/OQ-2 とも成立を実コード読解+本ワークフロー実測で確定。仮説の人間ゲート差し戻しは不要になった

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-06T18:04:07Z — requirements FR-2.4 の合否基準(4ハーネス manifest への行追加)を設計で上書き: codex は emit.ts のセッションスキル配列経由(実配布経路に合わせた逸脱、由来: architecture-reviewer 指摘[1])

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-06T18:04:07Z — 規律の単一ソースを新設 grilling-protocol.md に配置(stage-protocol への全文インライン案を退けた: 1000行ファイルの肥大回避+スキルとの共有)

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
