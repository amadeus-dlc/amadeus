# Deployment Architecture — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../nfr-design/performance-design.md`、`../nfr-design/security-design.md`、`../nfr-design/scalability-design.md`、`../nfr-design/reliability-design.md`、`../nfr-design/logical-components.md`、`../../../inception/application-design/components.md`、`../../../inception/application-design/services.md`、`../functional-design/business-logic-model.md`。

## 配置(embedded — 新規デプロイ単位なし)

- installer 面(C1〜C5): `packages/setup` 既存 npm パッケージへ embedded。公開は release.yml(workflow_dispatch → release-it)の既存一本 — 本 unit はバージョン・タグ・リリースノートに一切触れない(project.md Mandated)
- runtime 面(C6a/C6b): `packages/framework/core` の2ツール変更 → `bun scripts/package.ts`(dist 6ツリー)+`bun run promote:self`(self-install 2ツリー)で計8ミラーへ regen(logical-components.md の配置節と同一機構)
- README(C7): リポジトリ直下の静的文書 — デプロイ機構なし

## ロールバック

通常 PR の git revert(project.md deployment-pipeline:c3 — 履歴 rewrite・force push 禁止)。npm 公開後の巻き戻しは release.yml の次リリースで行い、本 unit は公開ライフサイクルへ非接触。

## 環境

ステージング・本番の環境分離なし(デプロイ基盤不保持 — 反証可能な N/A 根拠: project.md Deployment「デプロイ基盤は持たず」)。
