# Build Instructions — 260719-cursor-complete-clear

上流入力(consumes 全数): code-generation-plan, code-summary

## 対象

code-generation-plan の変更ファイル目録(正本3+dist/self-install+テスト)を対象に、ビルドは Bun 直接実行(コンパイル不要)+配布物生成で構成する。

## 手順

1. `bun install`(依存導入 — lockfile 準拠)
2. `bun scripts/package.ts` — 正本 `packages/framework/core/tools/{amadeus-lib,amadeus-audit,amadeus-state}.ts` から dist 6ハーネスを再生成
3. `bun run promote:self` — self-install ツリーへ反映
4. 検証: `bun run dist:check` / `bun run promote:self:check`(いずれも exit 0 必須 — code-summary の実測どおり)
