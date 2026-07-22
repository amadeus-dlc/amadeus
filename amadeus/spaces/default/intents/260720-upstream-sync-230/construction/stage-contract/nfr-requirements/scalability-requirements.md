# Scalability Requirements — stage-contract

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。service scalingではなく、stage/Unit増加時も単一contract pipelineを維持することを対象とする。

## Capacity境界

| ID | Dimension | Target |
|---|---|---|
| SCALE-U01-01 | vocabulary | 5 UnitKindをlib単一定義から全consumerが参照。 |
| SCALE-U01-02 | current intent | 12 Unitの承認済みkind mappingを使用。 |
| SCALE-U01-03 | distribution | sourceから6 harnessへ決定的projection、4 self-install境界不変。 |
| SCALE-U01-04 | pruning | tagged Unitだけpruneし、untaggedはfull matrix。 |

5/12/6/4は既決closed inventoryである。新kind/Unit/harnessは正本承認なしに追加せず、consumer別filterへ分岐させない。

## Scaling strategyと検証

graph compile時にtyped snapshotを作り、directive、coverage、approval guardが共有する。mixed DAG、vacuous/non-vacuous、required/optionalを対照fixture化し、Unit増加が第二語彙や第二parserを生まないことを検証する。

## トレーサビリティ

SCALE-U01-01〜04は`business-rules.md`のUnit classification/applicability、`business-logic-model.md`のCoverage tree、`requirements.md`のNFR-1/4、`technology-stack.md`に対応する。
