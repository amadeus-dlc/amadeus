# Shared Infrastructure — publish-readiness

> ステージ: infrastructure-design (3.4) / 作成: 2026-07-08
> 出典: `../nfr-design/logical-components.md`

## 共有面

| 共有物 | 提供元 | 消費者 |
|--------|--------|--------|
| tests/lib/setup-pack-contract.ts(PackContract 単一定義) | U4 | U4 の2テストファイル(将来の publish 関連テストも) |
| publish 手順書(docs/guide/publishing-setup.md) | U4 | メンテナ(運用)、U5(タグ発行の接続先) |
