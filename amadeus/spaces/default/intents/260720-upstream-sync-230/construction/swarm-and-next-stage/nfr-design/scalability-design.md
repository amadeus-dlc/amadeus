# Scalability Design — swarm-and-next-stage

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Order-preserving capacity model

本Unitのscalabilityはservice scalingではなく、BoltDagのbatch/unit数とCompiledGridのstage数に対する決定の順序保存である。batchのpriorityはBoltDagの記録順だけ、stageのpriorityはCompiledGridのcompiled orderだけとし、入力規模に応じて別tie-breakや別sortへ切り替えない。

batch選択は最初の未完了batch一つに閉じ、そのbatch外のunitを同一selectionへ混在させない。stage解決はcurrent後方の最初のin-scope stage一つに閉じる。全候補を跨ぐfan-out、consumer別ordering、独自priority queueを追加しない。

## Scaling boundaries

| Dimension | Boundary |
|---|---|
| batch | DAG順で最初の未完了batchだけ |
| unit | 選択batch内のcurrentRun未完了unitだけ |
| stage | current後方の最初のin-scope stageだけ |
| ownership | U03はFR-1 item 3 / FR-2 item 10、U12はledger集約 |

2+ batch、mixed convergence、merge failure、複数SKIP、terminalをtable-driven fixtureで増やし、規模増加がselection/resolution意味を変えないことを証明する。新index、scheduler、parallelism policy、capacity threshold、auto-scaling ruleは追加しない。

## Isolation

decision seamはworker executionやmergeを起動しないため、選択対象の増加が副作用のblast radiusを広げない。結果consumerは既存swarm/gate/engine ownerに限定し、consumerごとのfallback orderingを持たせない。

## トレーサビリティ

本設計は`scalability-requirements.md`のSCALE-U03-01〜04を中心に、`performance-requirements.md`の有界選択、`security-requirements.md`のscope bypass防止、`reliability-requirements.md`のdeterminism、`tech-stack-decisions.md`の既存runtime、`business-logic-model.md`のDAG/Grid workflowへ対応する。
