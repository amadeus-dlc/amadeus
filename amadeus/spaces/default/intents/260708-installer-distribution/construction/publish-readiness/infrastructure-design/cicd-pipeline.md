# CI/CD Pipeline — publish-readiness

> ステージ: infrastructure-design (3.4) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../nfr-design/performance-design.md`(pack 3回・≤28秒)・`logical-components.md`(tests/lib+integration 配置)、BR-P04

## CI への組み込み(新規ジョブなし)

- pack 契約テスト+ドリフトテストは既存 tests 実行(`bash tests/run-tests.sh --ci`)の integration 層に同乗
- npm CLI は ubuntu-latest ランナーの標準プリインストールを使用(前提は初回 CI 実行で実測確認 — nfr-requirements の注記どおり)
- publish 自体は CI 外(手動)— パイプラインに publish ステップを追加しない(CON-004)
