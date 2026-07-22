上流入力(consumes 全数): code-generation-plan, code-summary

# ビルド手順

## 前提

- bun(全ハーネス共通の唯一の必須ランタイム)。リポジトリルートで実行する。
- 本 intent はアプリケーションビルドを持たない(CLI ツール群は bun 直接実行)。「ビルド」に相当するのは配布物の再生成である。

## 手順

1. `bun scripts/package.ts` — 正本(packages/framework/core, harness)から `dist/<harness>/` 6面を再生成(code-generation-plan の変更ファイル一覧どおり amadeus-state.ts が全面へ投影される)
2. `bun run promote:self` — このリポジトリ自身のセルフインストールツリーを更新
3. 検証: `bun run dist:check` / `bun run promote:self:check`(バイトパリティのドリフトガード。code-summary の検証表で exit 0 実測済み)

## 型検査・リント

- `bun run typecheck`(tsc --noEmit ×2 構成)
- `bun run lint`(Biome。フォーマッタ無効)
