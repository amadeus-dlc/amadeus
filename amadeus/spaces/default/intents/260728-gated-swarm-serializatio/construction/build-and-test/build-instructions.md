# Build Instructions — 260728-gated-swarm-serializatio

上流入力(consumes 全数): code-generation-plan.md、code-summary.md — 対象変更面(正本 amadeus-orchestrate.ts / amadeus-bolt.ts、SKILL.md 5ハーネス、docs EN/JA、dist 7+self-install 5)は code-summary.md の実 diff 目録から、ビルド手順の適用順は code-generation-plan.md Step 8 から導出。

## ビルド手順

本リポジトリはトランスパイル不要(Bun 直接実行)。「ビルド」= 生成物の再生成と drift 検査:

1. 正本編集後: `bun scripts/package.ts`(dist 7ハーネス再生成)
2. `bun run promote:self`(self-install 5ツリー反映)
3. drift 検査: `bun run dist:check` / `bun run promote:self:check`(いずれも exit 0 必須)

## 型検査・lint

- `bun run typecheck`(tsc --noEmit strict)
- `bun run lint`(Biome、フォーマッタ無効)
