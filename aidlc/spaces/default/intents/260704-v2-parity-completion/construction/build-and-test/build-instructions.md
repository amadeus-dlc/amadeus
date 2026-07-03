# Build Instructions

この Intent はコンパイル工程を持たない。build 相当は次である。

1. skill の昇格: `bun run dev-scripts/promote-skill.ts <name> --replace`
2. 契約の再生成: `bun run dev-scripts/generate-amadeus-contracts.ts`
3. パリティ基準の再生成（上流更新時のみ）: `npm run parity:baseline:generate`

Bolt ごとの詳細は `construction/bolts/<bolt-id>/build-instructions.md` を参照する。
