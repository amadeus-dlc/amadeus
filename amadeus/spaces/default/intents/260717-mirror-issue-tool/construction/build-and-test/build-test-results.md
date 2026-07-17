# Build & Test Results — 260717-mirror-issue-tool

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(amadeus-mirror-cli)

## 実測結果(2026-07-18、worktree bolt/amadeus-mirror-cli @ 532b59dbe 以降)

| コマンド | exit(自己捕捉) |
|---|---|
| bun test(t232 unit+integration) | 0 — 29 pass / 0 fail / 60 expect |
| bun run typecheck | 0 |
| bun run lint(新規3ファイル警告0) | 0 |
| bun tests/gen-coverage-registry.ts --check | 0(fresh, guards green, ratchet held) |
| bash tests/run-tests.sh --ci | 0(RESULT: PASS) |
| lcov(scripts/amadeus-mirror.ts) | 未カバー 0行(DA 全行 hit) |
## 判定

全コマンド exit 0・lcov 未カバー 0行 — Bolt 1 の検証は green(確定値。集計コマンドは各行に記載)。
