# Logical Components — swarm-and-next-stage

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Component inventory

| Component | Responsibility | Isolation boundary |
|---|---|---|
| Batch Selector | BoltDag順で最初の未完了batchと未完了unitを返す | pure、currentRunだけを完了根拠にする |
| Convergence Classifier | currentRun evidenceとmerge resultを完了/未完了へ分類 | merge failureと別run claimを拒否 |
| Stage Resolver | CompiledGridから次のin-scope stageまたは`null`を返す | pure、SKIP/placeholder非出力 |
| Gate Projector | resolver resultをgateの`next_stage`へ表示 | domain resultを別slugへ置換しない |
| Engine Directive Projector | 同じresolver resultを次directiveへ変換 | gateと意味を共有 |
| Existing Swarm Owner | dispatch、check、merge、convergence記録 | decision seam外の既存transaction |
| Existing State/Audit Owner | state mutationとaudit emission | decision seamから分離 |

## Data flow

U02が回復したBoltDagとcurrentRun evidenceをConvergence Classifierへ渡し、Batch SelectorがDAG記録順でselectionを返す。その後のdispatch/check/mergeはExisting Swarm Ownerが担い、selector自身は副作用を持たない。

C1がcompileしたCompiledGridとcurrent slugをStage Resolverへ渡す。resolver resultはGate ProjectorとEngine Directive Projectorへ同一値として供給し、gate表示と次のengine routingを一致させる。public seamはBatch SelectorとStage Resolverに対応する正準2関数だけである。

## Failure domainとblast radius

- stale/別run evidence: Convergence Classifier内で未完了扱いとし、batch advanceへ伝播させない。
- merge failure: 対象unitを同batchへ残し、後続batch dispatchを起動しない。
- SKIP chain: Stage Resolver内で除外し、projectorへSKIP slugを渡さない。
- terminal: `null`を両projectorへ共有し、架空stageを生成しない。
- malformed input: 既存C1/C2 validation境界へ留保し、新failure ownershipを追加しない。

shared resourceはimmutable BoltDag、currentRun evidence、CompiledGridだけである。cache、queue、database、network、runtime service、credential、new audit streamは存在しない。

## NFR mapping

`performance-requirements.md`の有界同期評価はBatch Selector/Stage Resolver、`security-requirements.md`のintegrityはConvergence Classifier/Projectors、`scalability-requirements.md`の順序保存は2 resolver、`reliability-requirements.md`のconsistencyは両Projector、`tech-stack-decisions.md`の既存C2 stackはExisting Owners、`business-logic-model.md`の2 workflowはcomponent接続へ反映する。
