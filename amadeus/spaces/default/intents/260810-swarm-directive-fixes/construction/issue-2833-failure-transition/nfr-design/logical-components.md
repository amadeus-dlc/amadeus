# Logical Components — issue-2833-failure-transition

入力: [`business-logic-model.md`](../functional-design/business-logic-model.md)。NFR Requirementsはself-feature scopeでexpected skipのため、宣言済みperformance / security / scalability / reliability identifierは存在しない。

## Component Inventory

| Component | Responsibility | Side effects | Failure boundary |
|---|---|---|---|
| CanonicalAuditReader（既存） | current intentのmerged canonical sequenceを読む | read only | read失敗は全projection中止 |
| ConstructionOutcomeProjection（新規） | dedupe、correlation、terminal fold、diagnostics | none | malformed / ambiguous / contradictory入力を`ok:false`へ集約 |
| FailureTransitionResolver（新規pure seam） | unresolved Unit ZへRetry / Skip / Abort / awaitを決定 | none | siblingsを変更せずtyped transitionを返す |
| OrchestratorFailureAdapter（既存拡張） | projectionを既存directiveとaudit writerへ接続 | existing audit/state writes only | error時cursor不変、Abort時parked |
| RetryDispatchAdapter（既存拡張） | prepared batch / retry Unit相関を既存invoke-swarmへ付与 | none | 再prepareと孤立attemptを禁止 |
| UnitPool / Swarm Evidence Writers（既存） | Unit outcome、BOLT_FAILED、SWARM_BATON_RETURNEDを記録 | append-only evidence | partial batchは裁定対象にしない |
| Stop Hook（既存・変更なし） | parkedを終端として許可 | existing stop decision | 本Unitのblast radius外 |

`business-logic-model.md:5-13`のEvidence Projectionはreader→projection、`:15-33`のstate machineはresolver、`:35-43`のDirective Selectionはadapterの責務へ対応する。

## Dependency Direction

```text
CanonicalAuditReader -> ConstructionOutcomeProjection -> FailureTransitionResolver
                                                    -> OrchestratorFailureAdapter
UnitPool / Swarm Evidence Writers ------------------------------^
OrchestratorFailureAdapter -> existing parked / run-stage / invoke-swarm directive
```

pure componentsはorchestrator、filesystem、Stop hookへ逆依存しない。adapterは既存型への変換だけを所有し、#2834のconsume resolutionを参照・変更しない。

RetryDispatchAdapterは新kindを作らず、optional相関がある場合だけ既存poolのacquireへ分岐させる。soloでは既存BOLT event familyのstart/fail/terminalへ同じexplicit batch / attempt identityをthreadし、Unit Poolへ移植しない。

## Failure Domains and Blast Radius

- record decode / correlation failure: current `next`だけをerrorで停止し、audit・cursor・Unit outcomeを変更しない。
- single Unit failure: Unit Zだけを裁定対象にし、成功・cancelled siblingを再dispatchしない。
- batch Abort: 全parallel Task帰還後にConstructionをparkし、sibling outcomeと未実行Unitを保存する。
- crash / retry: 永続cacheを持たず、canonical auditから同じprojectionを再構成する。
- Stop hook: 既存parked処理を再利用するため変更blast radiusはない。

## Resource and Deployment Model

短命なBun CLI process内で同期実行するshared / embedded libraryであり、daemon、database、queue、network service、AWS resourceを追加しない。入力規模はcurrent intentのauditとUnit数に限定され、in-memory fold後にprocess終了時破棄する。性能・scalabilityの独立成果物はlibrary kindに非適用で、engine directiveにもproduceされていない。

## Verification Boundaries

pure projection / transition tableをunit test、swarm / solo directive選択をintegration test、Stop hook不変をpublic regressionで検証する。テストはevent emitの存在だけでなく、reader→projection→selectorの実消費をassertする。
