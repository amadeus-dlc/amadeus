# Build Test Results — leader-sync-tool(U1)

上流入力: `code-generation-plan.md`、`code-summary.md`

## Green checks

- focused: 35 pass / 0 fail / 124 assertions / 2 files、exit 0。
- lcov: `scripts/amadeus-leader-sync.ts` LF 593 / LH 593。
- typecheck: exit 0。対象 Biome: warning 0 / exit 0。
- coverage registry: freshness / guards / ratchet OK。dist:check: 6 harness OK。
- security grep: `GH_TOKEN|gh pr merge|--shell|shell:` の実装ヒット 0 件。

## #1314 着地後の最終再検証

- GitHub 正本で PR #1314 の merge `44ec1481b6cb9efc74654080f68bc5fdec6c4996` と Issue #1313 の CLOSED を確認し、`origin/main` を 2-parent merge `a66582b05f82899f0fa760a6f0f0885932ca1028` で再接地した。競合 index は 0 件。
- `bun test tests/integration/t199-generated-prefix-contract.test.ts`: 8 pass / 0 fail / 35 assertions / 1 file、exit 0。
- `bun run test:ci`: 393 files / 5566 assertions / failed files 0 / failed assertions 0、exit 0、RESULT PASS。
- runner が明示した Claude substrate 不在の derived live tests は契約どおり SKIP。AWS credential 不正による live SDK/substrate skip も同じく既存の環境契約であり、failed files / assertions には含まれない。

## 残るゲート条件

- 最終センサー、incremental reviewer、§13、GitHub CI Success、期限内 grant を確認する。これらの成立前は Completed としない。
