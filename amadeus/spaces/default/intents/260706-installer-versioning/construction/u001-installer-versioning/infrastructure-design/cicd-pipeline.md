# CI/CD Pipeline — u001-installer-versioning（260706-installer-versioning）

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)

## 適用判断

CI の変更は不要。既存 GitHub Actions（mock = `npm run test:all`）が installer eval（`test:it:installer`）を連鎖に含むため、本 Intent の eval 追加は自動的に CI へ乗る。新規 workflow・pipeline 設定は作らない。

デプロイ（配布）は git リポジトリそのものであり、release パイプラインは存在しない（#451 と同一）。
