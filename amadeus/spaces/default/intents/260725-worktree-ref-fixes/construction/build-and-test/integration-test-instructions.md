# Integration Test Instructions — 260725-worktree-ref-fixes

上流入力(consumes 全数): `amadeus/spaces/default/intents/260725-worktree-ref-fixes/construction/fix-worktree-ref-family/code-generation/code-generation-plan.md`、`amadeus/spaces/default/intents/260725-worktree-ref-fixes/construction/fix-worktree-ref-family/code-generation/code-summary.md`

- `code-generation-plan.md` Step 2/7 の named-path 検証、`code-summary.md` の落ちる実証を対象として引用した。

## 対象と実行(すべて本 worktree = 被害環境そのもの、named path)

| テスト | 対象 | 実測(2026-07-26T01:31Z) |
|---|---|---|
| `tests/integration/t257-status-registry-migration.test.ts` | FR-1(#1481/#1455)provenance SHA | exit 0(修正前は exit 1 実測) |
| `tests/integration/t258-lifecycle-transaction.test.ts` | 同上 | exit 0(同) |
| `tests/integration/t259-guard-integration.test.ts` | 同上 | exit 0(同) |
| `tests/integration/t296-hook-launch-and-worktree-resolution.test.ts` | FR-3(#1492)起動行硬化+FR-2e 診断 | exit 0(7 pass。無引用×空白パス=赤 / 出荷形=緑 の対照を内包) |

## フルスイート

`bash tests/run-tests.sh --ci` — builder 実測 exit 0、conductor 独立再実行 exit 0(RESULT: PASS)。reviewer の 1 回で t257 growth-ratio の負荷起因 flake を観測(単独再実行 green ×2、fanout-load-settle 既知パターン、本変更の欠陥ではない)
