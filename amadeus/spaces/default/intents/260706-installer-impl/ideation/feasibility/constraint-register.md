# Constraint Register — インストーラの実装

> ステージ: feasibility (Ideation) / 作成: 2026-07-07
> 出典: `feasibility-questions.md` の回答および `../intent-capture/intent-statement.md`・`../market-research/build-vs-buy.md` からの引き継ぎ

## 技術的制約

| ID | 制約 | 出典 |
|----|------|------|
| T1 | パッケージ名は `@amadeus-dlc/setup` — npm の `amadeus-dlc` 組織スコープ確保が公開の前提条件 | Q1 |
| T2 | npx(Node)/bunx(bun)の両対応 — TypeScript はビルド(JS化)して公開する | Q2 |
| T3 | 配布物は GitHub からタグ指定で取得 — インストール時にネットワーク到達必須 | Q4 |
| T4 | インストーラ自体の実装は bun/TypeScript の完全自作、ランタイム依存ゼロ(ビルド時依存は許容) | build-vs-buy |
| T5 | 非破壊マージは `amadeus-*` プレフィックスによる所有判定を基本とする。プレフィックスなし共有ファイルの扱いは requirements-analysis で確定する | intent-statement |

## 組織的制約

| ID | 制約 | 出典 |
|----|------|------|
| O1 | npm 公開はリポジトリの既存バージョンタグ運用に統合し、publish 手順を team.md 等に明文化する(独立CI自動化は初回スコープ外) | Q3 |
| O2 | タイムライン制約なし — 品質優先で通常リリースサイクルに乗せる | Q5 |
| O3 | ユーザー可視の変更を含むため、既存の Mandated ルール(バージョンバンプ + README バッジ + CHANGELOG 同期)が適用される | project.md |

## 規制・ライセンス制約

| ID | 制約 | 出典 |
|----|------|------|
| C1 | ライセンスは MIT + Apache-2.0 デュアルを正しく継承する。package.json の `"license": "MIT-0"` は誤りであり公開前に是正する | Q6(ユーザー訂正) |
