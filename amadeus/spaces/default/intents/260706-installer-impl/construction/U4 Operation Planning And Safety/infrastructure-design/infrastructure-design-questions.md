# Infrastructure Design Questions — U4 Operation Planning And Safety

> Stage: construction / infrastructure-design  
> Unit: U4 Operation Planning And Safety

## Questions

### Q1. U4にdaemon、queue、database、またはtarget-local lock infrastructureを導入するか

[Answer]: No. U4はlocal in-process pure plannerとして実装し、`FileOperationPlan` を返すだけにする。filesystem write、prompt、reporter、applier、manifest write、target lock、daemon、queue、database、hosted monitoringは導入しない。

## Ambiguity Analysis

曖昧な回答はない。`business-logic-model.md` はU4をsource metadata、target detection、target snapshotから `FileOperationPlan` を作る単位として定義し、`logical-components.md` はprompt、live filesystem、copy、manifest writeを境界外に置いている。

矛盾はない。`performance-design.md` と `scalability-design.md` はpure in-memory planning、one timestamp、injected predicate、no shared mutable stateを要求し、`security-design.md` と `reliability-design.md` は unsafe `canApply:true` を防ぐPlanValidatorとbackup-before-overwriteを要求している。Infrastructure Designはlocal process boundary、fake-port CI fixtures、blocking planner invariant testsに限定する。

不足情報はない。具体的な `FileOperationPlan` 型、planner fixture、branch tests、benchmarkは code-generation/build-and-test が所有する。

## Upstream Coverage

- `performance-design.md`: O(n) planning、backup predicate、no filesystem/network/prompt boundaryを反映する。
- `security-design.md`: destructive-operation prevention、`--force` / `--yes` limits、source integrity、plan traceabilityを反映する。
- `scalability-design.md`: local process、2,000 files、500 backups、no shared mutable stateを反映する。
- `reliability-design.md`: plan state machine、ordering invariants、stable reason codes、backup path portabilityを反映する。
- `logical-components.md`: OperationPlanner、VersionPolicy、TargetStatePolicy、CollisionPolicy、BackupPlanner、PlanValidatorを前提にする。
- `components.md`: Operation Planner、Backup Planner/Writer、File Applier、Reporter、Prompt Adapterのownership境界を参照する。
- `services.md`: Planning Service、Reporter/Applier contract、GitHub Actions PR gatesを反映する。
- `business-logic-model.md`: install/upgrade planning workflow、backup path workflow、output contractを反映する。
