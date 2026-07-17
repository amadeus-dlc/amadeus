# Rollback Runbook — Issue #1048

上流入力(consumes 全数): `../ci-pipeline/ci-config.md`、`../ci-pipeline/quality-gates.md`、`../installer-enum-extension/infrastructure-design/deployment-architecture.md`、`../installer-enum-extension/infrastructure-design/cicd-pipeline.md`。

## 手順(deployment-pipeline:c3 定型)

1. main 上の欠陥コミット(6f11f6d5c = PR #1109 スカッシュ)を `git revert` する通常 PR を作成(履歴 rewrite・force push・branch protection 緩和は禁止)
2. collector/schema 欠陥なら修正 test/code と revert を同一 PR に、一時入力異常のみ単独 revert
3. revert PR も全 CI ゲート+人間承認マージ(conflict 時は停止)
4. 正本 revert 後に `bun scripts/package.ts`+`bun run promote:self` で8ミラー再同期(drift guard で機械検証)
5. npm 公開済みの場合は次回 release.yml で修正版を publish(unpublish はしない)

## 検証

revert 後の確認 = 契約テスト(4値へ戻ることの red/green)+ --ci — 手順は unit/integration-test-instructions と同一。
