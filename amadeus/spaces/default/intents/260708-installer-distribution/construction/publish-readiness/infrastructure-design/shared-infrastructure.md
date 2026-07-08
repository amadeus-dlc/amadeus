# Shared Infrastructure — publish-readiness

> ステージ: infrastructure-design (3.4) / 作成: 2026-07-08
> 出典: `../nfr-design/logical-components.md`

## 共有面

| 共有物 | 提供元 | 消費者 |
|--------|--------|--------|
| tests/lib/setup-pack-contract.ts(PackContract 単一定義) | U4 | U4 の2テストファイル(将来の publish 関連テストも) |
| 遅延ビルドヘルパー `tests/lib/setup-lazy-build.ts`(`ensureSetupCliBuilt()`) | **U1**(FR-002 スモーク E2E で初出 — U1 infrastructure-design/cicd-pipeline.md が契約定義) | U4 の pack 契約テスト(dist/cli.js の遅延セットアップ) |
| publish 手順書(docs/guide/publishing-setup.md) | U4 | メンテナ(運用)、U5(タグ発行の接続先) |
