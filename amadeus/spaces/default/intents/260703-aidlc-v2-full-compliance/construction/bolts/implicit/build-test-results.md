# Build Test Results：implicit

## 実行記録

- 実行時刻: 2026-07-03T07:55:20Z
- 実行コマンド: `npm run test:all`
- 結果: exit 0（pass）

## 内訳

`npm run test:all` は次を順に実行し、すべて成功した。

| 検証 | コマンド | 結果 |
|---|---|---|
| 型検査 | `tsc --noEmit` | pass |
| lint（複雑度、公開型） | `bun run lints/check.ts --check` | pass（2 checks） |
| 契約 catalog | `dev-scripts/check-amadeus-contracts.ts` | pass |
| host 配線 | `dev-scripts/check-claude-host-wiring.ts` | pass |
| eval 13 本 | `test:it:all`（templates、lints、public-type-file、ts-complexity、contracts、aidlc-state、validator、validator-domain、promote-skill、claude-host-wiring、llm-runner、llm-provider、index-generate、migrate-workspace） | すべて ok |
| mock e2e 4 モード | `test:e2e:ci:mock`（steering / event-storming の initial と rerun） | すべて ok |
| examples 検証 | `validate-amadeus-examples.ts --all`（workspace 4、Intent 4、provenance、invariants 4、generation plan） | すべて pass |
| 差分検査 | `git diff --check` | pass |

## 補足

- examples 4 snapshot は real provider（claude）で再生成済みであり、生成直後と commit 後の両方で validator と invariants を pass した。
- 実行ログ: 開発環境の scratchpad に保存（build-test-run.log）。CI では同じ `npm run test:all` を再実行する。
