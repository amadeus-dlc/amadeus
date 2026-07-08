# RAID Log — インストーラの実装(installer-distribution)

> ステージ: feasibility (Ideation) / 作成: 2026-07-08
> 出典: `feasibility-assessment.md` のリスク分析、`../intent-capture/intent-statement.md` の前提事項(`../market-research/` の competitive-analysis / market-trends / build-vs-buy を含む)

## Risks(リスク)

| ID | リスク | 影響 | 緩和策 |
|----|--------|------|--------|
| R1 | npm の `amadeus-dlc` スコープが確保できない | bunx ワンライナー(`bunx @amadeus-dlc/setup`)が成立しない | 公開前にスコープを確認・取得(2026-07-08 実測でパッケージ名は空き、非スコープ `amadeus-dlc` もフォールバック候補として空き) |
| R2 | インストール時の GitHub 到達不可(プロキシ/オフライン環境) | 導入失敗、成功指標1(1分以内)未達 | 明確なエラーメッセージとリトライ案内。オフライン対応(同梱化)は将来検討 |
| R3 | インストーラ(npm)と配布物(GitHub タグ)のバージョン不整合 | 意図しない版が導入される | インストーラ→タグの対応規約を設計で確定(例: 既定は最新タグ、`--version` で固定) |
| R4 | 差分レポート+非破壊マージの工数が想定超過 | リリース遅延(ただし O2 でタイムライン制約なし) | 更新機能を導入機能と別マイルストーンに分割可能な設計にする |

## Assumptions(前提)

| ID | 前提 | 検証時期 |
|----|------|----------|
| A1 | フレームワーク利用者は導入時点で bun を導入済みか、導入可能である(npx 経路は bun 未導入者の入口) | user-stories / requirements-analysis |
| A2 | `amadeus-*` プレフィックス規約がフレームワーク所有ファイルの判定基準として概ね機能する(例外は列挙可能な少数) | requirements-analysis |
| A3 | GitHub の公開リポジトリからのタグ付きアーカイブ取得は認証不要で安定している | construction(実測) |

## Issues(既知の問題)

| ID | 問題 | 対応 |
|----|------|------|
| I1 | package.json の `"license": "MIT-0"` が LICENSE-MIT + LICENSE-APACHE(デュアル)と矛盾(2026-07-08 実測: 未修正) | 公開前に正しい SPDX 表現へ是正(このイニシアチブのスコープ内で対応) |
| I2 | package.json の repository URL が旧 `awslabs/amadeus-workflows` を指す(実リモートは `amadeus-dlc/amadeus`)(2026-07-08 実測: 未修正) | 公開前に是正 |
| I3 | (解消済み)前 intent で報告された §13 学習ツールの memory.md 未検出問題 — 本 intent の intent-capture / market-research 実行で正常動作を確認(2026-07-08) | クローズ |

## Dependencies(依存)

| ID | 依存 | 種別 |
|----|------|------|
| D1 | npm レジストリ(パッケージ公開・取得) | 外部サービス |
| D2 | GitHub(タグ付きアーカイブの配信) | 外部サービス |
| D3 | 既存のバージョンタグ運用・リリース準備サイクル(公開フローの統合先) | 内部プロセス |
| D4 | `scripts/package.ts` が生成する dist/ ツリー(配布物の実体) | 内部成果物 |
| D5 | `packages/setup` の workspace 席(layout-normalization の予約) | 内部成果物 |
