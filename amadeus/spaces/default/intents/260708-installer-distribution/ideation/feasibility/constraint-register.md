# Constraint Register — インストーラの実装(installer-distribution)

> ステージ: feasibility (Ideation) / 作成: 2026-07-08
> 出典: `feasibility-questions.md` の回答および `../intent-capture/intent-statement.md`・`../market-research/build-vs-buy.md`(`../market-research/competitive-analysis.md`・`../market-research/market-trends.md` の差別化決定を含む)からの引き継ぎ

## 技術的制約

| ID | 制約 | 出典 |
|----|------|------|
| T1 | パッケージ名は `@amadeus-dlc/setup` — npm の `amadeus-dlc` スコープ確保が公開の前提条件(2026-07-08 実測: 名前は空き、スコープ保有者は未確定) | Q1 |
| T2 | npx(Node)/bunx(bun)の両対応 — TypeScript はビルド(JS 化)して公開する | Q2 |
| T3 | 配布物は GitHub からタグ指定で取得 — インストール時にネットワーク到達必須 | Q2 |
| T4 | インストーラ自体の実装は bun/TypeScript の完全自作、ランタイム依存ゼロ(ビルド時依存は許容) | build-vs-buy |
| T5 | 非破壊マージは `amadeus-*` プレフィックスによる所有判定を基本とする。プレフィックスなし共有ファイルの扱いは requirements-analysis で確定する | intent-statement |
| T6 | 実装先は `packages/setup`(bun workspace)— layout-normalization の予約に従う | intent-statement |

## 組織的制約

| ID | 制約 | 出典 |
|----|------|------|
| O1 | npm publish はリポジトリの既存バージョンタグ運用に統合し、手順を明文化する(独立 CI 自動化は初回スコープ外) | Q3 |
| O2 | タイムライン制約なし — 品質優先で通常リリースサイクルに乗せる | Q3 |
| O3 | ユーザー可視の変更を含むため、既存の Mandated ルール(バージョンバンプ + README バッジ + CHANGELOG 同期)が適用される | project.md |

## 規制・ライセンス制約

| ID | 制約 | 出典 |
|----|------|------|
| C1 | ライセンスは MIT + Apache-2.0 デュアルを正しく継承する。package.json の `"license": "MIT-0"` は誤りであり公開前に是正する(2026-07-08 実測: 未修正で残存) | Q3 |
| C2 | テレメトリ・外部データ送信を持たない。PCI/HIPAA/SOC2 等の規制要件は該当なし | Q3 |
