# Scalability Design — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## Scaling Boundary

`scalability-requirements.md` は固定2 pathと`O(N)` bounded scanを要求し、runtime loadを持たない。`performance-requirements.md` の12-field set、`security-requirements.md` のsame-SHA isolation、`reliability-requirements.md` のfail-closed recovery、`tech-stack-decisions.md` のnew dependency 0、`business-logic-model.md` のevidence flowをそのまま設計境界とする。

## Data and Work Partitioning

Logical partition keyは`MeasurementRef.sha`である。1 SHAのevidence setは次をatomicな単位として扱う。

- 2 target paths。
- 8 marker counts。
- 4 heading counts。
- 1 ancestry evidence。
- 1 admissibility aggregate。

path単位のscanを並列化してもよいが、aggregateは全fieldが同じSHAで揃うまで構築しない。異なるSHA間でcache、partial count、approval evidenceを共有しない。

## Scaling Pattern Decisions

| Pattern | Decision | Reason |
|---|---|---|
| Horizontal / vertical scaling | 非該当 | deployable process / capacity targetなし |
| Load balancer | 不採用 | request endpointなし |
| Sharding / database partition | 不採用 | persistent data storeなし |
| Distributed cache | 不採用 | ref isolationを損ない、bounded scanに不要 |
| Queue decoupling | 不採用 | fixed local workflowでbacklogなし |
| Auto-scaling | 不採用 | metric / resource / cost targetなし |
| Ref-level isolation | 採用 | 複数measurementのcross-contamination防止 |

## Capacity and Complexity

総行数`N`に対する処理はlinear boundednessを維持し、unbounded rescanを行わない。一致行数`M`のdiagnostic storageは`O(M)`とし、markerが0件なら空listとする。target cardinalityの変更はruntime scalingではなくrequirements contract変更として扱い、設計・reviewをやり直す。

## Contention and Failure Domains

- Immutable Git blob readはshared mutable stateを持たない。
- State / audit transitionはtool-owned lockへ委ね、独自lockやdistributed coordinatorを追加しない。
- 1 measurement失敗は他SHAのcomplete evidenceを変更しない。
- Resource pressure時はsamplingへdegradeせず、当該setをfail-fastしてcomplete再実行する。

## Validation

Build and Testは固定cardinality、same-SHA aggregation、linear boundedness、unbounded rescan 0、mixed-ref 0を検査する。production load / spike / soak / multi-region / cost capacity testは非該当である。
