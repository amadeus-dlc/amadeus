# Build Instructions — integrity-batch

このリポジトリはビルド成果物を持たない(Bun 直接実行)。「ビルド」に相当するのは生成ツリーの再生成と同期検証である。

- 依存導入: `bun install`
- 生成ツリー再生成: `bun scripts/package.ts`(core/harness → dist 4ハーネス)
- セルフインストール昇格: `bun run promote:self`
- 同期検証(CI 基準): `bun run dist:check` / `bun run promote:self:check`(いずれも exit 0 必須)
- 型検査: `bun run typecheck`(tsc --noEmit)
- リント: `bun run lint`(Biome、フォーマッタ無効)

integrity-batch の4修正はすべて core 編集→再生成→同一コミット同期の Mandated 手順で実装済み(各 PR で dist:check / promote:self:check exit 0 を実測)。
