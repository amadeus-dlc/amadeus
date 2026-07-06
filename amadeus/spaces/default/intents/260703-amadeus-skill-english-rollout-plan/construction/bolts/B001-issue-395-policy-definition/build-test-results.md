# Build Test Results：B001 #395 方針確定

## 実行記録

- 実行時刻: 2026-07-03T12:34:57Z
- 実行コマンド: `npm run test:all`
- 結果: exit 0（pass）

## 内訳

`npm run test:all` は次を順に実行し、すべて成功した。

| 検証 | コマンド | 結果 |
|---|---|---|
| 型検査 | `tsc --noEmit` | pass |
| lint | `bun run lints/check.ts --check` | pass（public type file と TypeScript complexity） |
| Amadeus 契約 | `bun run dev-scripts/check-amadeus-contracts.ts` | pass |
| host 配線 | `bun run dev-scripts/check-claude-host-wiring.ts` | pass |
| 単体評価と契約評価 | `npm run test:it:all` | pass |
| mock e2e | `npm run test:e2e:ci:mock` | pass |
| examples 検証 | `npm run test:examples` | pass |
| 差分検査 | `git diff --check` | pass |

## 補足

- `test:examples` では、既存の `staleReason` がある snapshot が「stale（許容）」として報告された。
- `provenance: ok`、`generation plan: ok`、`validate amadeus examples: ok` で完了した。
