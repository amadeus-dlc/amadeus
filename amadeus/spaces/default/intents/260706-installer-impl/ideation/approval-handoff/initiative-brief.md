# Initiative Brief — インストーラの実装

> ステージ: approval-handoff (Ideation) / 作成: 2026-07-07 / 判定: **GO(承認済み)**
> 統合元: `../intent-capture/intent-statement.md`、`../market-research/competitive-analysis.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`、`../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`、`../team-formation/team-assessment.md`、`../rough-mockups/wireframes.md`

## 意図と課題

Amadeus の現行配布(`git clone` + `dist/<harness>/` の手動コピー)には、初回導入の摩擦・アップグレード手段の不在・ヒューマンエラーという3つの構造的問題がある(intent-statement)。パッチ版が頻繁に積み上がるリリース運用の下で、既存導入先が古いバージョンに取り残されている。**1コマンド導入 + 非破壊アップグレードを提供するインストーラ CLI を実装する。**

## 市場検証の要約

直接競合(cc-sdd、GitHub spec-kit)はいずれも `npx`/`init` ワンライナーを標準装備しており、1コマンド導入はテーブルステークス(competitive-analysis)。一方、**適用前の差分レポートと構造的な非破壊マージはどちらも持たない** — ここが差別化ポイント。

## 実現性とリスクの要点

**実現可能性: 高、GO 判定**(feasibility-assessment)。既存資産(package.ts / promote-self.ts)を再利用可能。主要リスク: npm 組織スコープ確保(R1、オーナー: メンテナ、公開前タスク)、インストール時ネットワーク依存(R2、明確なエラー表示で緩和)。既存不整合2件(license `MIT-0` 表記・旧 repository URL)を公開前に是正する(constraint-register C1、raid-log I1/I2)。

## スコープ境界

- **IN**: `init` + `upgrade`(対話式ウィザード / 非対話フラグ / `--force` 二段階確認)、ファイルレベル差分レポート、npm 公開(`@amadeus-dlc/setup`、bin `amadeus-setup`、npx/bunx 両対応)、README 置換
- **OUT**: 組織一括展開 / オフライン導入 / ロールバック / 既存導入自動検出 / provenance・CI 自動公開 / doctor / 内容 diff(intent-backlog W1〜W7)

## コンセプトビジュアル

ターミナル UX モックアップ7画面(wireframes M1〜M5)がレビュー済み(product-lead: READY)。`bunx @amadeus-dlc/setup` → ハーネス選択 → 1分以内に導入完了、が中核体験。

## 体制

ソロメンテナ + AI エージェント(AI-DLC ドッグフーディング)。npm 公開権限はメンテナが保有・取得。Bolt 運用はデフォルト(walking skeleton ゲート + ladder)(team-assessment)。

## Go/No-Go 判定

**GO** — 全承認ゲート通過(intent-capture / market-research / feasibility / scope-definition / team-formation / rough-mockups)。持ち越し事項2件は decision-log に記録済み。Inception(requirements-analysis 以降)へ移行する。
