# Scalability Design — plugin-composition

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Contribution capacity model

本Unitのscalabilityはservice scalingではなく、plugin、declared contribution、write-set、crash境界が増えた場合の決定性である。inspectは対象pluginのdeclared入力を既決順で全件検査し、shared contributionsはrecordされた適用順で構成する。dropは対象寄与だけを除き、baseと残存寄与から同じbytesへ再構築する。

plugin数やshared file数が増えても別ownership index、priority queue、parallel applicationへ切り替えない。U11 reference内容、deferred plugin面、cross-workspace batchingへcapacity scopeを広げない。

## Transaction capacity

canonical mutation前に三面の全write-set/preimageを一つのworkspace transactionへ固定する。partial journalを作らず、全対象をPREPAREDへ記録してからmutationする。recoveryはworkspace単位の未完了PREPAREDだけを同一lock下で処理する。

| Dimension | Boundary |
|---|---|
| inspection | declared入力の全件検査 |
| contribution | recorded orderで適用・除去・再構築 |
| transaction | 三面の全write-set/preimage |
| recovery | workspaceごとの未完了PREPARED |

## Capacity verification

単一/複数plugin、単一/複数shared file、host各write、record write、audit write前後、COMMITTED直前/直後をtable-driven fixture化する。入力数が増えても適用順、期待post-state、PREPARED回復、COMMITTED維持が変化しないことを確認する。新threshold、auto-scaling、retry policyは追加しない。

## トレーサビリティ

本設計は`scalability-requirements.md`のSCALE-U10-01〜04を中心に、`performance-requirements.md`の有界pipeline、`security-requirements.md`のownership、`reliability-requirements.md`のcrash matrix、`tech-stack-decisions.md`のfilesystem/WAL、`business-logic-model.md`のAtomic workflowsへ対応する。
