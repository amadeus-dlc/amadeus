# Build Instructions — 260723-t241-ci-residency

上流入力(consumes 全数): code-generation-plan、code-summary(construction/fix-1294-t241-residency/code-generation/)。

## ビルド手順

本 intent の変更は tests/ のみ(t241 移設+registry pin 更新+t257 ガード新規 — code-summary の変更目録どおり)で、TS 正本(packages/framework/)には触れない。ビルド相当の検査:

1. `bun run typecheck` — リポ全体の TS 型検査(移設・新規テスト TS を含む)
2. `bun run lint` — Biome(tests/ スコープ)
3. `bun run dist:check` / `bun run promote:self:check` — 配布物・セルフインストール非交差の確認

## 前提

Bun ^1.3、リポジトリルート。追加セットアップ不要(code-generation-plan の検証節どおり)。
