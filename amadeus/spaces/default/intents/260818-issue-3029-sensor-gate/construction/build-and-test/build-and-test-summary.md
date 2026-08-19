# Build and Test Summary

## Status

| 項目 | 結果 |
|---|---|
| Dependency / build | `bun install --frozen-lockfile` / `bun run build` 成功 |
| Typecheck / lint | `bun run typecheck` 成功、`bun run lint` 成功（既存 warning 474 件） |
| Unit tests | 対象 t511/t92 111 pass / 0 fail |
| Integration tests | 対象 t511/t92 111 pass / 0 fail、t517 30 pass / 0 fail |
| Performance | N/A（目標 NFR なし） |
| Security | N/A（新規 security boundary なし） |

## Readiness

build-ready / targeted-test-ready である。`bun run source-only:check` と `bun run distribution:check` も成功した。初回 `bun run test:ci` は既定並列下で 16 files / 67 assertions、timeout-raised serial 再実行は 16 files / 64 assertions の失敗を記録したが、model-map impl-only 再ピン後の formal 対象群、complexity、t435、approve-batch、t517 は個別再実行で green になった。失敗集合は base worktree でも OTel workspace invariant の一部が再現し、許可面外の複雑な baseline/環境面を含むため、残りの full CI 収束は push-first のリモート CI で確認する。
