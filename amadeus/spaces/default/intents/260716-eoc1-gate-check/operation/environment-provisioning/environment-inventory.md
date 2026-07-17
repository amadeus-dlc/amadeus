# Environment Inventory — eoc1-gate-check

## 上流入力(consumes 全数)

`../deployment-pipeline/cd-config.md`(CD 基盤なし)、`../deployment-pipeline/deployment-strategy.md`、`../../construction/eoc1-gate-guard/infrastructure-design/deployment-architecture.md`。

## インベントリ(provisioning:c3 — 実在と N/A の分離)

| 対象 | 区分 | 根拠 |
|------|------|------|
| 開発 worktree(各メンバー) | 実在 | main fetch/merge で新ガード取得(本 intent は e4 ツリーでミラー先行適用 — dogfooding 4回の実測環境) |
| CI(GitHub Actions) | 実在 | 既存 ci.yml — PR #1106 で走行中 |
| ステージング/本番環境 | **N/A(根拠)** | デプロイ基盤なし(project.md Deployment 既定 — npm 配布+タグのみ)。provisioning すべきリソース不在は infrastructure-design の「インフラ変更ゼロ」に帰着(反証可能: リポジトリに IaC・環境定義ファイルが存在しない) |
