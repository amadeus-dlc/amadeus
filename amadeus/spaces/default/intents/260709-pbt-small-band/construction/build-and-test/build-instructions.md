# Build Instructions — pbt-small-band

Bun 直接実行リポジトリのため「ビルド」=生成ツリー再生成と同期検証。`bun install`(fast-check ^4.9.0 は root devDependencies)→ `bun scripts/package.ts` / `bun run promote:self`(B4 のみ core 波及)→ `bun run dist:check` / `bun run promote:self:check` / `bun run typecheck` / `bun run lint`(全 exit 0 必須)。
