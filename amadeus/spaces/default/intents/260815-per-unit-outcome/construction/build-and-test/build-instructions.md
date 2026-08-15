# Build Instructions — intent 260815-per-unit-outcome

> depth Minimal — コマンドと env のみ。

## 依存・環境

- ランタイム: Bun(PATH 必須)。追加 env 不要
- 取得: `bun install`

## ビルド

- `bun run build` — 全ハーネス dist + self-install 面の再生成(追跡ファイル不変であること)
- 検証: `bun run typecheck` / `bun run lint` / `bun run source-only:check`
