# Build Instructions：B001 walking skeleton

このリポジトリはコンパイル工程を持たない。build 相当は次の 2 点である。

1. skill の昇格: `bun run dev-scripts/promote-skill.ts amadeus-intent-capture` および `bun run dev-scripts/promote-skill.ts amadeus-grilling --replace`
2. settings の構文確認: `bun -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8'))"`

エンジンは Bun で直接実行するため、依存インストールは不要である。
