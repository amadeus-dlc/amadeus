# Constraint Register — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../market-research/competitive-analysis.md`(closed-enum 業界標準の確認)、`../market-research/market-trends.md`(面数拡大トレンド)、`../market-research/build-vs-buy.md`(完全自作の継承)、feasibility-assessment.md。

## 制約一覧

| # | 制約 | 種別 | 出典 |
| --- | --- | --- | --- |
| C-1 | Bun-only 前提 — 配布フレームワークへの runtime dependency 追加禁止 | 技術(Forbidden) | project.md |
| C-2 | 新設・変更テストは配置層のサイズ上限内(t-test-size-drift の purity) | 技術 | 本日の実測知識(#1060 t229 事故) |
| C-3 | packages/setup は lint(Biome)+型検査の配線済み — 既存 CI 基準(typecheck/lint/dist:check/promote:self:check/--ci)を全 green 維持 | プロセス | project.md Mandated |
| C-4 | バージョンバンプ・リリースは release.yml 一本 — 本 intent で version 面に触れない | プロセス(Mandated) | project.md |
| C-5 | installer のユーザー可視契約(列挙全数性・npm pack 実検証・将来条件)を requirements でテスト可能に固定 | プロセス | requirements-analysis:c3/c4(既決)+leader 割当指示 |
| C-6 | patch gate(lcov 在籍の追加行 100%)+相対ゲート — 新コードは in-process 被覆を設計時から | 技術 | #1060 以降の CI 体制 |

## 制約の消費先

C-1〜C-6 は requirements(C-5 のテスト可能化)・design(C-2/C-6 の被覆設計)・code-generation(C-3/C-4 の検証列)が消費する — 各ステージ成果物に対応 AC として現れることをレビュー観点にする。
