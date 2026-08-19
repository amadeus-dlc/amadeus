# Build Instructions

## 前提

- Bun 1.3.13 とリポジトリの lockfile を使用する。
- 入力成果物は `construction/bolt-pr-attestation/code-generation/code-generation-plan.md` と `code-summary.md`。
- 長時間サービス、データベース、追加の環境変数は不要。

## コマンド

```sh
bun install --frozen-lockfile
bun run typecheck
bun run build
bun run distribution:check
bun run source-only:check
```

## 成功条件

全コマンドが exit 0 で終了し、生成物が Git 境界を越えず、配布投影が一致すること。
