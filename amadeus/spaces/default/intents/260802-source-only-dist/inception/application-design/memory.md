<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-02T18:05:00Z — OQ-2(asset 配信ホスト)は設計段で read-only 実測(公開 asset への HEAD、302 → release-assets.githubusercontent.com)により確定し、ADR-A4 に再実測条項を付けた(external-seam-vocab-measurement 準拠)。OQ-1/OQ-3 は ADR-A2/A3 で解決、OQ-4 は functional-design へ残置
- 2026-08-02T18:05:00Z — 明確化質問 0 問(既決 G 裁定+RA 裁定+実測で6次元充足 — E-OC1 は RA と同型の判定。新規のユーザー判断は不要と判定し、質問ファイルは本ステージの produces に含まれないため作成せず)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-02T18:20:00Z — FR-4.2/4.3/4.5 の切替・有効化時期を移行順序5(追跡除外と同一 PR の原子切替)へ確定 — requirements の FR-4=順序3 配置との時期解釈は reviewer Critical 起点の設計判断として component-methods.md C7 に申告(implementation-deviation の事前申告形)。requirements 本文の改訂は不要(Constraints が優先する読みで整合)と判断
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-08-02T18:05:00Z — release.yml は build-dist ジョブ新設を選択(ADR-A3)。公開権限ジョブとビルドの責務分離を優先し、github-release 直付け案・ci.yml 流用案を棄却理由付きで記録
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-02T18:20:00Z — 第3ガードのグラフ不変量の具体集合(OQ-4)は functional-design で確定する
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
