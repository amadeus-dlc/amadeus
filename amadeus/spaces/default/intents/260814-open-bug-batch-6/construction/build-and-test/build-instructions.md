# Build Instructions — intent 260814-open-bug-batch-6

> depth Minimal — コマンドと env のみ。

- 依存: `bun install` / env 追加なし
- ビルド: `bun run build`(全ハーネス投影 + self-install、追跡ファイル不変)
- 検証: `bun run typecheck` / `bun run lint` / `bun run source-only:check`
