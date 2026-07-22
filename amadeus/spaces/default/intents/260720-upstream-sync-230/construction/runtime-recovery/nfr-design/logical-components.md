# Logical Components — runtime-recovery

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。既存orchestrate、runtime compiler、state、audit-lock、package/test境界だけをcomponent inventoryとして明示する。

## Component inventory

| Component | Responsibility | Input/Output | Failure domain |
|---|---|---|---|
| Canonical DAG Parser | dependency artifactをvalidated batchesへparse | artifact bytes→batches/error | artifact単位 |
| DAG Recovery Resolver | `recoverBoltDag`でcacheとcanonicalを比較 | cache+source→none/ok/malformed | resolution invocation |
| Unit Consumer Adapter | 単一resultを3 consumerへ渡す | batches→per-unit/coverage/swarm | current workflow snapshot |
| Audit Event Normalizer | 関連6 eventをfilter/sort | shards→chronological events | intent audit set |
| Revision Evidence Predicate | `recoverGateRevision`でclosed evidenceを判定 | events+contract→false/recovered | stage approval |
| Recovery Batch Builder | Recovered 3 + normal 2とfinal stateをmemory生成 | predicate→validated buffers | approve transaction |
| Existing Audit-lock Committer | 5 blockを単一atomic commit | validated batch→audit bytes | active intent audit |
| Existing State Writer | commit後にfinal stateを1回write | final buffer→state bytes | active intent state |
| Runtime Compiler | read-side healを次transitionで永続化 | canonical graph→runtime cache | compile transition |
| Package Projector | authored sourceを6 harnessへ生成 | source/manifest→projection | package gate |
| Self-install Projector | closed list 4面をpromote/check | generated source→install面 | self-install gate |
| Verification Fixtures | DAG/audit/atomicity/projectionを対照検査 | fixtures→evidence | test process |

## Public・internal boundary

公開面は次の正準2 seamだけである。

```ts
function recoverBoltDag(runtimeCache: RuntimeDagCache, dependencyArtifact: DependencyArtifact | undefined): BoltDagRecovery;
function recoverGateRevision(events: readonly AuditEvent[], stageContract: StageContract): GateRevisionRecovery;
```

parser、event filter/sorter、predicate helpers、batch builder/validator、complete-batch detectorは内部helperであり、追加public APIではない。transaction identityとpath ownershipは既存形式を再利用する。

## Interaction sequence

1. DAG Resolverがcacheとcanonical artifactを検証し、単一resultを3 consumerへ渡す。healed時もread-side writeはしない。
2. approve直前にEvent Normalizerが関連6 eventを一意順序化し、Evidence Predicateがclosed条件を評価する。
3. recovered時はBatch Builderが5 blockとfinal stateをmemory上で生成・検証する。
4. Audit-lock Committerが5 blockを単一commitし、成功後だけState Writerがfinal stateを一度writeする。
5. state write failureの再実行はcomplete-batch detectorがaudit追加を抑止し、stateだけを同じ最終値へ収束させる。
6. ProjectorとFixturesが3/5/6/4 matrixとfailure boundaryを全数検査する。

## Isolation・shared resources

shared resourceはcanonical dependency artifact、runtime cache、intent audit/state、package manifestだけである。read-side recoveryはpersistent writeせず、approve mutationは既存lock内に隔離する。new service、database、queue、network、別transaction log/cache storeを持たない。

## トレーサビリティ

inventoryは`business-logic-model.md`の責務境界/DAG/Gate recovery、`performance-requirements.md`の有界処理、`security-requirements.md`のtrust boundary、`scalability-requirements.md`の3/5/6/4 closed set、`reliability-requirements.md`のfailure matrix、`tech-stack-decisions.md`のsource/test ownershipへ対応する。
