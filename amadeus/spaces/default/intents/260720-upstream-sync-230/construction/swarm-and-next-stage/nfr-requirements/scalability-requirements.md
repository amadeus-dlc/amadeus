# Scalability Requirements — swarm-and-next-stage

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。service scalingではなく、DAG batch/Unit数とcompiled stage数に対する順序保存の線形判定を対象とする。

## Capacity境界

| ID | Dimension | Target |
|---|---|---|
| SCALE-U03-01 | batch selection | BoltDag順で最初の未完了batchだけ。 |
| SCALE-U03-02 | unit selection | 選択batch内のcurrentRun未完了unitだけ。 |
| SCALE-U03-03 | stage resolution | current後方の最初のin-scope stageだけ。 |
| SCALE-U03-04 | ownership | U03はitems 3/10、U12は全体ledger集約だけ。 |

独自priority queue、cross-batch fan-out、consumer別ordering、precomputed別indexを追加しない。

## Scaling strategyと検証

順序の正本をBoltDag/CompiledGridへ一本化し、input sequenceをそのまま評価する。2+ batch、mixed convergence、SKIP chain、terminalをtable-driven testで検証し、規模増加が別tie-breakへ変化しないことを保証する。

## トレーサビリティ

SCALE-U03-01〜04は`business-rules.md`のBR-U03-01〜15、`business-logic-model.md`のworkflow/ownership、`requirements.md`のNFR-1/4/7、`technology-stack.md`に対応する。
