# Build and Test Summary

## 入力成果物

この summary は、各 Unit の `code-generation-plan` と `code-summary` を入力として作成した。

対象は U001、U002、U003 の 3 Unit である。

## Build Status

Build readiness は条件付きで ready である。

`typecheck`、`lint:check`、`contracts:check`、`claude-wiring:check`、`diff:check` は成功した。

`npm run test:all` は `parity:check` で停止した。

この停止は parity lock 対象ファイルの hash 不一致によるものであり、`dev-scripts/data/parity-map.json` は変更していない。

## Test Type Inventory

| Test type | Status | Evidence |
|---|---|---|
| Unit eval | Passed | U001、U002、U003 の個別 eval |
| Integration eval | Passed | `npm run test:it:all`、`npm run test:it:engine-e2e` |
| Performance check | Passed as local fixture | 個別 eval と `test:it:all` が CI budget 内で完了 |
| Security check | Passed with dependency scan | `bun audit` は脆弱性なし |
| Validator | Passed | Amadeus Validator は pass |
| Parity | Failed | 8 件の engine file hash 不一致 |

## Coverage Expectations

R001、R002、R003 は U001 の deterministic eval で確認済みである。

R004 は U002 の deterministic eval で確認済みである。

R005、R006、R009 は U003 の deterministic eval で確認済みである。

R007 と R008 は package script 連結、audit taxonomy 維持、validator、integration eval で確認済みである。

## Readiness Assessment

Test-ready は yes である。

Build-ready は parity resolution を除いて yes である。

Deployment-ready は no である。

理由は、この Intent が local tooling の変更であり、parity boundary の解決方針が未承認だからである。

## Known Limitations

`npm run test:all` は `parity:check` で停止する。

Parity failure には今回変更した `hooks/aidlc-log-subagent.ts`、`tools/aidlc-lib.ts`、`tools/aidlc-orchestrate.ts`、`tools/aidlc-utility.ts` が含まれる。

Parity failure には既存差分の `aidlc-common/stages/inception/practices-discovery.md`、`knowledge/aidlc-shared/audit-format.md`、`tools/aidlc-state.ts`、`tools/data/stage-graph.json` も含まれる。

人間の明示承認なしに parity exception は追加していない。
