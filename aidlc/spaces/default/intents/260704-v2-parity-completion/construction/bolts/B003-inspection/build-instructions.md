# Build Instructions：B003 検査整備

1. パリティ基準の再生成（上流更新時のみ）: `npm run parity:baseline:generate`
2. validator の昇格同期: `bun run dev-scripts/promote-skill.ts amadeus-validator --replace`
