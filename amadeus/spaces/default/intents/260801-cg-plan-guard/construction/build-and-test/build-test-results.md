# Build & Test Results — 260801-cg-plan-guard

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(4 unit: dag-integrity / issuance-guard / approve-reconciliation / docs-sync)

測定 ref: conductor 統合断面 `764661954`(origin/main へ全4 PR squash 着地後の系譜)。数値は全てコマンド出力からの転記。

## 結果表

| 検証 | exit | 出力(要点) |
|---|---|---|
| `bun run typecheck` | 0 | strict tsc 2構成 |
| `bun run lint` | 0 | Biome、error 0 |
| `bun run dist:check` | 0 | 7ハーネス dist drift 0 |
| `bun run promote:self:check` | 0 | self-install drift 0 |
| `bun run coverage:ci` | 0 | Failed files: 0 / Total assertions: 9,792 / Failed assertions: 0 / RESULT: PASS |
| `bun tests/coverage-patch-gate.ts --check` | 0 | measured added lines: 0(統合断面は着地済み diff なし — 各 Bolt 断面では 71/93→88/59 covered、allowlist 追加 0) |
| `bun tests/coverage-project-gate.ts --check` | 0 | baseline 上回り |
| `bun tests/complexity-gate.ts --check` | 0 | new violations 0 |

## E-CPG-U2ABS 留保転記の閉包確認(U1 follow-up)

`readBoltDagAbsence`(orchestrate :1577-)と `graph.bolt_dag_absence`(runtime :857 が書く)の production consumer は本 intent 完了時点で**ゼロのまま**(grep 実測: `readBoltDagAbsence` の呼出し元は tests/integration/t399 のみ、`graph.bolt_dag_absence` の assert は t399 と tests/unit/t133-bolt-dag-compile.test.ts の2ファイル — E-CPG-BTS13 投票者訂正反映)。これは E-CPG-U2ABS 裁定が予定した状態 — U1 成果物として存続(AC-3c を t399 が pin)し、消費者は U3 FD の将来条項どおり必要時に生む。無音で消えていないことを本欄で明示記録する。

## 既知の残余

- #1953(approve 突合の実績鮮度相関)— 設計拡張として起票済み、docs に既知制約を明記済み。
- CG PR 4件のレビュー指摘は全件是正・スレッド解決済み(#1928: 5件 / #1939: 4件 / #1948: 1件→#1953 / #1954: 3件)。

## 判定

READY — 統合断面で全 blocking gate green。条件・未検証面の残余は上記2点のみ(いずれも記録・追跡済み)。
