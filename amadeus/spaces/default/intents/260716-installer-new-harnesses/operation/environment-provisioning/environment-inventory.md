# Environment Inventory — Issue #1048(provisioning:c3 様式 — 実在/N/A 分離)

上流入力(consumes 全数): `../../construction/installer-enum-extension/infrastructure-design/deployment-architecture.md`、`../../construction/installer-enum-extension/infrastructure-design/infrastructure-services.md`、`../deployment-pipeline/cd-config.md`。

## 目録

| 対象 | 分類 | 状態 | 根拠 |
|---|---|---|---|
| GitHub リポジトリ+Actions | 実在 | 変更なし | 既存 CI が唯一の正本(ci-pipeline:c2)— PR #1109 で発火実績 |
| npm レジストリ(amadeus-setup) | 実在 | 変更なし | 公開は release.yml の別ライフサイクル(本 intent 非接触) |
| 開発者ローカル環境(Bun) | 実在 | 変更なし | 依存追加ゼロ(bun.lock 不変を diff 実測) |
| クラウドインフラ(AWS 等) | N/A | — | project.md Deployment「デプロイ基盤は持たず」(人間決定・反証可能) |
| DB / キュー / キャッシュ | N/A | — | 単発 CLI・永続データなし(technology-stack.md 実測) |
| ステージング / 本番環境 | N/A | — | 環境分離なし(deployment-architecture.md の根拠付き N/A) |

## 新規プロビジョニング

0件 — 実行・検証すべき環境構築作業が存在しない。
