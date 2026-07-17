# Build Instructions — 260716-t224-size-large

## 上流入力

上流成果物 `code-generation-plan.md`(変更目録: 1ファイル1行)と `code-summary.md`(AC 閉包表)に基づく。本 intent はビルド成果物を持たない(tests/ 直下のコメント1行のみ、dist/self-install 非関与)。

## ビルド相当の検査手順

- `bun run typecheck`(tsc --noEmit)
- `bun run lint`(Biome)
- `bun run dist:check` / `bun run promote:self:check`(不変確認 — 正本非編集の裏取り)

## 前提

`bun install --frozen-lockfile` 済みの作業ツリー(bolt/260716-t224-size-large)。
