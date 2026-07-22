# Logical Components — unit-iteration-and-scope-preview

> 上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Component inventory

| Component | Responsibility | Isolation boundary |
|---|---|---|
| Iteration Validator | state verbの未指定/`unit-major`/invalidを既存規則で判定 | mutation前、new分類なし |
| Construction Step Resolver | stage-majorへ委譲またはUnit外側matrixを走査 | pure、既存eligibility再利用 |
| Scope Summary Deriver | CompiledGridからstage/gate countを一度導出 | pure、第二count正本なし |
| Human Projector | ScopeSummaryを表示 | 再集計・値差替えなし |
| JSON Projector | additive summaryを出力 | 既存field/value/order不変 |
| Scope Consumers | confirmation/birth/change/validate-grid | summary consumer、count ownerでない |
| Existing Transaction Owner | state/audit mutationをcommit | 2 decision seam外 |

## Data flow

WorkflowStateとStageGraphはIteration Validatorを経てConstruction Step Resolverへ渡る。未指定なら既存stage-majorへ委譲し、`unit-major`ならUnit外側・compiled stage内側の最初の実行可能stepを返す。resolver結果のmutationはExisting Transaction Ownerが既存lock/audit境界で行う。

ScopeNameとCompiledGridはScope Summary Deriverへ渡り、一つのScopeSummaryとなる。そのvalueを4 Scope Consumers、Human Projector、JSON Projectorが共有し、各component内でcountを再計算しない。public seamはConstruction Step ResolverとScope Summary Deriverに対応する正準2関数だけである。

## Failure domainとblast radius

- invalid iteration: Validatorで停止し、state/plan/graph/auditを不変に保つ。
- default path: 既存stage-majorへ閉じ、unit-major logicを通さない。
- Unit/stage増加: resolverの一方向走査だけへ影響を限定する。
- grid/scope増加: Summary Deriverだけがcountし、consumer driftを防ぐ。
- projector failure: domain ScopeSummaryを変更せず、既存CLI境界へ留保する。

shared resourceはimmutable WorkflowState、StageGraph、CompiledGrid、ScopeSummaryだけである。cache、queue、database、network、runtime service、credential、新audit streamは存在しない。

## NFR mapping

`performance-requirements.md`の有界decisionはResolver/Deriver、`security-requirements.md`のintegrityはValidator/Projectors、`scalability-requirements.md`のmatrix/grid境界はResolver/Deriver、`reliability-requirements.md`のcompatibility/parityはTransaction Owner/Projectors、`tech-stack-decisions.md`の既存C2 stackは全component、`business-logic-model.md`の2 workflowはcomponent接続へ反映する。
