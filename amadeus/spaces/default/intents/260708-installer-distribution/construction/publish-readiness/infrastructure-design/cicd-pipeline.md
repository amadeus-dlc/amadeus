# CI/CD Pipeline — publish-readiness

> ステージ: infrastructure-design (3.4) / Unit: publish-readiness / 作成: 2026-07-08
> 出典: `../nfr-design/performance-design.md`(pack 3回・≤28秒)・`logical-components.md`(tests/lib+integration 配置)、`../../setup-foundation/infrastructure-design/cicd-pipeline.md`(遅延ビルドヘルパー `tests/lib/setup-lazy-build.ts` の提供元・契約定義)、BR-P04

## CI への組み込み(新規ジョブなし)

- pack 契約テスト+ドリフトテストは既存 tests 実行(`bash tests/run-tests.sh --ci`)の integration 層に同乗
- pack 契約テストが必要とする `dist/cli.js` は **U1 提供の遅延ビルドヘルパー `tests/lib/setup-lazy-build.ts`(`ensureSetupCliBuilt()`)**で取得する — U4 が独自のビルドロジックを持たない(CI に独立ビルドステップを追加しない設計の維持)
- npm CLI は ubuntu-latest ランナーの標準プリインストールを使用(前提は初回 CI 実行で実測確認 — nfr-requirements の注記どおり)
- publish 自体は CI 外(手動)— パイプラインに publish ステップを追加しない(CON-004)
