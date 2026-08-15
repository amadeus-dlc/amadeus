# Build Instructions — intent 260815-stale-epoch-landed

> depth Minimal — コマンドと env のみ。

- 依存: `bun install` / env 追加なし
- ビルド: `bun run build`(追跡 drift は本変更の stage 文書のみが正)
- 検証: `bun run typecheck` / `bun run lint` / `bun run source-only:check`
