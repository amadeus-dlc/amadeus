# Build Instructions — 260816-open-bug-batch-7

depth = Minimal。本 intent のビルド面は既存リポジトリ標準に従う(新規ビルド機構なし — application-design の reuse inventory どおり)。

## コマンド

- 依存: `bun install --frozen-lockfile`
- ビルド(全ハーネス投影 + self-install): `bun run build`(pi-distribution により投影先に `.pi/` が加わる)
- 境界検査: `bun run source-only:check`

## 本 intent 固有の確認点

- pi-distribution は `packages/framework/core/` 正本を変更するため、build 後に追跡ファイルが不変であること(`git status --porcelain` 前後比較)— conductor 統合断面で exit 0 を実測済み
- 配送先述語: `.pi/agents/` ⇔ `dist/pi/.pi/agents/` の集合一致(t2363 が機械述語化)
