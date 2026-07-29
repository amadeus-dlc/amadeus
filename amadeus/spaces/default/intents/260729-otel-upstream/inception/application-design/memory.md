<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-29T07:16:07Z — aws-platform-agent／design-agent の支援観点（AWS・UI）は非該当と判断し inline で統合。services.md の「サービス」は常駐サービスのない CLI 基盤のため「短命 process の実行単位」と再解釈した

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-29T07:16:07Z — UI component structure の設問は対象外（ユーザー向け UI を持たない）として省略

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-29T07:16:07Z — Q1 で tools/ 平置き（慣行）より core/otel/ 新設を選択。12 コンポーネントの追加で tools/ が過密になることと、CLI ツールとライブラリ層の分離を優先
- 2026-07-29T07:16:07Z — ADR-4 で amadeus-lib.ts への非追加を明示。既存の巨大 lib への混入は将来の分割を困難にするため

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-29T07:16:07Z — Phase 1 ADR 4事項（Logs API 採否・Bun Context Manager・health 検証・bundle 構成）は decisions.md へ実測後追記。harness manifest への otel/ マッピング追加は units-generation で Unit 化する
