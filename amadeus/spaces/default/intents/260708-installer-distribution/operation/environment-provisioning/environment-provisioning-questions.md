# Environment Provisioning Questions — installer-distribution

> ステージ: environment-provisioning (4.2) / 作成: 2026-07-09
> 新規質問なし — プロビジョニング対象の環境が存在しない(確定済み設計)

## 根拠

deployment-architecture(全ユニット)が確定した2ホスト構成 — npm レジストリ(公開先)と GitHub(タグ/アーカイブ/CI)— はいずれも**外部 SaaS でプロビジョニング不要**。IaC・アカウント・ネットワーク・環境昇格(dev/staging/prod)は存在しない(team.md Deployment「デプロイ基盤は持たず」)
