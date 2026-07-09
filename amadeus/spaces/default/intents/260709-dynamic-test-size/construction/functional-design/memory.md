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
- 2026-07-10T07:35:00Z — Interpretation: refactor scope は units-generation/application-design をスキップするため(consumes_absent 全件 expected:true)、ステージ規定のフォールバックに従い単一ユニット `dynamic-size-observation` を定義し、既存コード構造(codekb)をデファクト応用設計として扱う。
- 2026-07-10T07:35:00Z — Interpretation: 設計方針レベルの判断は requirements 選挙(Q1〜Q4)で既決。functional-design の残余(スキーマ字段・出力パス・seam 形状)は既決方針の機械的具体化として architect 判断で確定し、questions ファイルに根拠併記で記録。真に未決の団体判断が生じた場合のみ選挙へ回す(always-elect と no-election-for-decided-norms の整合解釈)。architecture-reviewer の敵対的レビュー+delegate ゲートが検証を担う。
- 2026-07-10T07:35:00Z — Tradeoff: レポート出力先は gitignore 済み `tests/logs/` を再利用(新規 gitignore エントリ不要・「ログ/レポート」の意味論に適合)。coverage/ は Codecov 専用の意味が確立しており混載を避けた。
- 2026-07-10T07:45:00Z — Interpretation: frontend-components.md は CONDITIONAL(UI を含むユニットのみ)であり、本ユニットは CLI ランナーのテキスト出力のみで UI 非該当のためスキップ。summary matrix の drift 行は frontend ではなく observability 出力(BR-5)。
