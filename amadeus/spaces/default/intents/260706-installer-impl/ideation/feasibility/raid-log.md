# RAID Log — インストーラの実装

> ステージ: feasibility (Ideation) / 作成: 2026-07-07
> 出典: `feasibility-assessment.md` のリスク分析、`../intent-capture/intent-statement.md` の前提事項

## Risks(リスク)

| ID | リスク | 影響 | 緩和策 |
|----|--------|------|--------|
| R1 | npm の `amadeus-dlc` 組織スコープが確保できない | bunx ワンライナー(`bunx @amadeus-dlc/setup`)が成立しない | 公開前に組織スコープを確認・取得。取れない場合は代替名(無スコープ `amadeus-dlc` 等)へフォールバック |
| R2 | インストール時の GitHub 到達不可(プロキシ/オフライン環境) | 導入失敗、成功指標1(1分以内)未達 | 明確なエラーメッセージとリトライ案内。オフライン対応(同梱化)は将来検討 |
| R3 | インストーラ(npm)と配布物(GitHubタグ)のバージョン不整合 | 意図しない版が導入される | インストーラ→タグの対応規約を設計で確定(例: 既定は最新タグ、`--version` で固定) |
| R4 | 差分レポート+非破壊マージの工数が想定超過 | リリース遅延(ただし Q5 でタイムライン制約なし) | 更新機能を導入機能と別マイルストーンに分割可能な設計にする |

## Assumptions(前提)

| ID | 前提 | 検証時期 |
|----|------|----------|
| A1 | フレームワーク利用者は導入時点で bun を導入済みか、導入可能である(npx 経路は bun 未導入者の入口) | user-stories / requirements-analysis |
| A2 | `amadeus-*` プレフィックス規約がフレームワーク所有ファイルの判定基準として概ね機能する(例外は列挙可能な少数) | requirements-analysis |
| A3 | GitHub の公開リポジトリからのタグ付きアーカイブ取得は認証不要で安定している | construction(実測) |

## Issues(既知の問題)

| ID | 問題 | 対応 |
|----|------|------|
| I1 | package.json の `"license": "MIT-0"` が LICENSE-MIT + LICENSE-APACHE(デュアル)と矛盾 | 公開前に正しい SPDX 表現へ是正(このイニシアチブのスコープ内で対応) |
| I2 | package.json の repository URL が旧 `awslabs/amadeus-workflows` を指す(実リモートは `amadeus-dlc/amadeus`) | 公開前に是正 |
| I3 | §13 学習ツール(amadeus-learnings.ts surface)が memory.md エントリを検出しない兆候(`phase: "spaces"` の誤解決) | フレームワーク側の調査候補 — 本イニシアチブのスコープ外、別インテントで対応 |

## Dependencies(依存)

| ID | 依存 | 種別 |
|----|------|------|
| D1 | npm レジストリ(パッケージ公開・取得) | 外部サービス |
| D2 | GitHub(タグ付きアーカイブの配信) | 外部サービス |
| D3 | 既存のバージョンタグ運用・リリース準備サイクル(公開フローの統合先) | 内部プロセス |
| D4 | `scripts/package.ts` が生成する dist/ ツリー(配布物の実体) | 内部成果物 |
