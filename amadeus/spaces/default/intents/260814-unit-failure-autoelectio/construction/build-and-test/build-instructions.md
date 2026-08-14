# Build Instructions — Issue #2976

上流: `construction/unit-failure-autoelectio/code-generation/code-generation-plan.md` と `code-summary.md`。

## 環境と依存関係

- Bun 1.3.13を使用する。
- `bun install --frozen-lockfile` で依存関係を復元する。
- 長時間稼働サービス、データベース、追加の環境変数は不要。

## Buildと検証

```bash
bun run build
bun run source-only:check
bun run graph:check
bun run typecheck
bun run lint
```

CIでは隔離した2回のbuildを比較し、生成物がbyte-identicalであることも確認する。
