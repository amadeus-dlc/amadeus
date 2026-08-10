# Build Test Results

## Build

`bun run build`、`bun run typecheck`、`bun run lint`、`bun run source-only:check` はすべて exit 0。

## Tests

U1 の focused suite は 153/153、U2 の targeted suite は 20/20。PR required CI は #2864 と #2865 とも全 check success。

## Known limitation

全 suite 並列実行では team-up の既存 safety-wait/active-run race による timeout が発生したが、対象外の isolated suite は成功し、今回変更の失敗ではない。
