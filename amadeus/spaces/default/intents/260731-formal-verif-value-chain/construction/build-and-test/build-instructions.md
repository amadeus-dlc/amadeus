# Build Instructions — formal-verif-value-chain

上流入力(consumes 全数): requirements, code-generation(各 unit の code-summary), unit-of-work

本 intent のビルドは既存の Bun 直接実行構成(technology-stack — TypeScript/ESM、tsc --noEmit、Biome)をそのまま使う。新規ビルド機構は導入していない(reuse inventory: 既存 CI ジョブ・既存 package.ts を全面再利用)。

## コマンド(実測済み — build-test-results.md に exit code)

1. `bun run typecheck` — strict tsc --noEmit(plugins/*/tools は u1 の tsconfig 配線で母集団に含まれる)
2. `bun run lint` — Biome(plugins/ は u1 の lint 配線で対象)
3. `bun scripts/package.ts` → `bun run dist:check` — dist 7 ハーネス+中立バンドルの再生成と drift 検査(u1 の T3 複製同期 = model-map companion の byte 一致検査を含む)
4. `bun run promote:self` → `bun run promote:self:check` — self-install 面の同期検査
5. `bun tests/gen-coverage-registry.ts --check` — coverage registry 鮮度

## 本 intent 固有のビルド面

- plugin 正本(`plugins/formal-model-check/tools/` 25 ファイル)は dist 8 変種へ projection(u1)+compose の manifest `tools` 宣言配布(u4)。
- `specs/tla/` の model-map v2(u7)は `dist:check` の複製同期対象。
- 一括 compose: `bun .claude/tools/amadeus-plugin.ts compose --all-harnesses`(u4 新設 verb)。
