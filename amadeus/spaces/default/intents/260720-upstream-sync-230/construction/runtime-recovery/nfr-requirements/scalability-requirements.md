# Scalability Requirements — runtime-recovery

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。service scalingではなく、Unit DAG・audit shard数に対する決定的な有界処理と6 harness projectionを対象とする。

## Capacity境界

| ID | Dimension | Target | Evidence |
|---|---|---|---|
| SCALE-U02-01 | Unit consumers | per-unit loop、coverage guard、swarmの3 consumerが同じresolved batchesを使う。 | Unit集合差分0。 |
| SCALE-U02-02 | audit chronology | cross-shard Timestamp collisionはfail-closedにし、衝突がない関連eventだけをTimestamp+shard-local buffer positionで単一順序へ正規化する。 | filename順逆転fixtureでも同一predicate、collision fixtureは常にbackfillなし。 |
| SCALE-U02-03 | package projection | authored sourceから現行6 harnessへ決定的に投影する。 | source/projection drift 0。 |
| SCALE-U02-04 | self-install | 現行4面closed listを変更しない。 | promote-self checkで対象不変。 |

3/6/4は既決inventoryである。新consumerやlayoutを追加する場合は正本承認なしにresolution/revision scopeを拡張しない。

## Scaling strategy

- canonical DAGを一度resolveし、consumer別再構築をしない。
- audit evidenceは対象stageと関連event/path suffixへfilterし、unrelated artifactをrevision evidenceへ入れない。
- read-side recoveryはwrite amplificationを発生させず、persistent healを既存runtime compileへ集約する。
- service、worker pool、database、queue、autoscaling infrastructureを追加しない。

## Validation

large/multi-shard fixtureでもdeterministic ordering、same Unit set、second-run no-opを検証する。cache mismatch、cycle、unknown edge、同一shard timestamp tie、cross-shard timestamp collisionのfail-closedを対照fixtureで固定する。

## トレーサビリティ

SCALE-U02-01〜04は`business-rules.md`のBR-U02-01〜16、`business-logic-model.md`のConsumer/Evidence flow、`requirements.md`のNFR-1、NFR-4、`technology-stack.md`の6/4配布構成に対応する。
