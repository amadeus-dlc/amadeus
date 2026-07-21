# Scalability Design — stage-contract

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。stage/Unit増加時も単一contract pipelineとclosed inventoryを維持する。

## Closed capacity matrix

| Axis | Closed set | Design |
|---|---|---|
| UnitKind vocabulary | 5 kinds | lib単一定義を全consumerが参照 |
| current intent | 12 Units | 承認済みkind mappingをedge/runtime graphへ投影 |
| package projection | 6 harness | authored sourceからgenerator導出 |
| self-install | 4 surfaces | closed listをpromote/check |
| pruning | tagged Unitだけ | untagged/maplessはfull matrix |

5/12/6/4は既決inventoryであり、正本承認なしに新kind/Unit/harness/install面を追加しない。

## Deterministic scaling

compile時にtyped snapshotを一度生成し、directive、coverage、approval guardが共有する。required+optional unionの一回filterによりUnit数増加が第二parser、第二filter、consumer別mappingを生まない。

mixed DAG、kindless graph、mapless stage、required/optional、vacuous/non-vacuousをtable-drivenで対照し、compile再実行のbyte差分を0にする。service、worker、database、queue、autoscaling infrastructureを追加しない。

## トレーサビリティ

本設計は`scalability-requirements.md`のSCALE-U01-01〜04、`performance-requirements.md`のsingle-pass、`security-requirements.md`のclosed vocabulary、`reliability-requirements.md`のunder-prune、`tech-stack-decisions.md`の6/4境界、`business-logic-model.md`のCurrent intent kind mapping/Coverageへ対応する。
