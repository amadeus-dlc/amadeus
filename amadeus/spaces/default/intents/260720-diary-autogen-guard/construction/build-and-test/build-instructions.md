# Build Instructions — 260720-diary-autogen-guard

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## ビルド手順

修正面は core 正本(amadeus-lib.ts / amadeus-orchestrate.ts)につき配布再生成が必須(code-generation-plan.md):

1. `bun scripts/package.ts`(dist 6ツリー再生成)
2. `bun run promote:self`(self-install 4ツリー反映)
3. 検査: `bun run dist:check` / `bun run promote:self:check` / `bun run typecheck` / `bun run lint`

## 本 Bolt での実測

bolt `9d99ce9ee`(PR #1288)で全て exit 0(code-summary.md)。lib/orchestrate 各11コピーの同期を機械確認。
