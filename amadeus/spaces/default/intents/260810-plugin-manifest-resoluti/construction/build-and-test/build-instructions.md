# Build Instructions — 260810-plugin-manifest-resoluti

Depth: Minimal。 upstream: `construction/fix-2823-plugin-manifest-resolution/code-generation/code-generation-plan.md` / `code-summary.md`

## コマンド

```sh
bun install --frozen-lockfile   # 依存は導入済みのはず。変更なし
bun run build                   # packages/framework → dist/* 再生成
bun run lint                    # Biome。exit 0 が期待値(complexity warning は既存 baseline)
bun run typecheck               # tsc --noEmit。exit 0 が期待値
```

## 環境

- Bun 1.3.13(`.bun/bin` が PATH に無い場合は `export PATH="$HOME/.bun/bin:$PATH"`)
- 追加の env var・ローカルサービスは不要
