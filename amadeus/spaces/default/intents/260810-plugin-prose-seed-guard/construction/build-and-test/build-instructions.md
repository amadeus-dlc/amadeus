# Build Instructions

## 入力

- Unit: `fix-2810-prose-tokenization`
- 計画: `construction/fix-2810-prose-tokenization/code-generation/code-generation-plan.md`
- 実装要約: `construction/fix-2810-prose-tokenization/code-generation/code-summary.md`

## 前提

- Bun 1.3.13
- 依存関係は `bun install --frozen-lockfile` 済み
- 長時間稼働サービス、DB、追加環境変数は不要

## コマンド

```bash
bun run build
bun run typecheck
bun run lint
```

## 成功条件

- 3コマンドが exit 0
- lint の既存 warning は許容するが error は0件
- `dist/` と self-install 面は生成物としてコミットしない
