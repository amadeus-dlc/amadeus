# Scalability Design — workspace-inspection

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。workspace sizeに対するdepth-1有界走査とclosed projection inventoryを設計する。

## Closed capacity matrix

| Axis | Closed set | Design |
|---|---|---|
| discovery depth | root + direct childの1 depth | deeper container探索なし |
| nested attribution | single hitだけnestedRoot | 2+はsorted candidates、auto-selectなし |
| submodule display | first 5 + `(+N more)` | unbounded outputなし |
| consumers | birth/detect/doctor/auditの4面 | single immutable snapshot共有 |
| distribution | 6 package / 4 self-install | generator/promote closed list |

1/5/4/6/4は既決contract/inventoryであり、新thresholdではない。

## Deterministic scaling

root signalでfallbackを打ち切り、既存workspaceのscan量を増やさない。candidateとsafe submodule pathはcanonical sortし、filesystem orderへ依存しない。invocation-local snapshotを共有し、persistent index、consumer別scanner、worker pool、watcher、network crawlerを追加しない。

## Capacity fixture

candidate集合の大小、single/multiple/depth2、submodule 1/5/6+、4 consumer projection、6/4 distributionをtable-drivenで検証する。scope増加でdepthやprojectionを黙って拡張しない。

## トレーサビリティ

本設計は`scalability-requirements.md`のSCALE-U06-01〜05、`performance-requirements.md`のearly stop、`security-requirements.md`のsafe path、`reliability-requirements.md`のdeterminism、`tech-stack-decisions.md`のprojection stack、`business-logic-model.md`のpipeline/projection rulesへ対応する。
