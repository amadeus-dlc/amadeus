# Build Instructions

## Prerequisites

- Bun 1.3.13 以上を使用する。
- リポジトリルートで `bun install --frozen-lockfile` を実行する。

## Build

`bun run build` を実行し、生成物の整合性を確認する。続けて `bun run typecheck`、`bun run lint`、`bun run source-only:check` を実行する。

## Verification

終了コード 0 と、生成物の差分・未追跡生成ファイルがないことを確認する。

## Troubleshooting

統合テストのタイムアウトは対象ファイルを `bun test --timeout 120000 <file>` で単独再実行し、再現性を確認する。
