# Logical Components — execution-evidence

## 上流と ownership

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とし、execution-evidence Unit の非機能責務を arm-neutral な論理 component に割り当てる。arm oracle、fixture generation、eligibility、Pareto、report rendering は所有しない。

## Component inventory

| Component | Owns | Depends on |
| --- | --- | --- |
| `ExecutionPolicy` | executable/path/env/identity の spawn 前認可 | frozen contract reader、filesystem realpath |
| `SuiteDeadline` | monotonic absolute deadline と remaining budget | injected monotonic clock |
| `CellCoordinator` | serial cell lifecycle と typed failure separation | `ExecutionPolicy`、`SuiteDeadline`、`ProcessPort` |
| `CellStreamCollector` | bounded stream write、hash、length、partial receipt | staging filesystem、SHA-256 |
| `EvidenceTransactionBuilder` | closed 5-role manifest、envelope、両 ledger entry | canonical encoders |
| `EvidencePublisher` | single-writer lock、exclusive rename、directory sync | filesystem adapter、ledger heads |
| `StoreRecovery` | transaction lookup、orphan/fork/corruption rejection | `EvidencePublisher` layout、verifiers |
| `ExpectedCellIndex` | 72/96 closed keys と cardinality | promoted registry identity |
| `CapacityGuard` | worst-case bytes と durable reservation の開始前検査 | `CapacityReservationPort`、filesystem capacity |
| `CapacityReservationStoreAdapter` | physical preallocation、revision-bound ACTIVE/consumption/CLOSED/ABORTED/RELEASED receipts、crash resume | `StoreWriterLock`、filesystem capacity / allocation port |
| `StoreWriterLock` | owner identity、stale 判定、単一 writer | filesystem mkdir/rename、process liveness port |
| `MatrixEvidenceIndex` | verified identity/coordinate の bounded index | `ExpectedCellIndex`、receipt verifier |

## Dependency direction

`CellCoordinator` は arm-neutral `ProcessPort` を呼び、成功・失敗の raw outcome を `EvidenceTransactionBuilder` へ渡す。builder は store を変更せず immutable transaction input を作る。`EvidencePublisher` だけが store root と両 ledger successor を変更でき、`StoreRecovery` は read/verify のみ行う。`MatrixEvidenceIndex` は verified receipt だけを受け取り、filesystem enumeration や handwritten result を入力にしない。

`CapacityGuard` は計算だけを行い、`CapacityReservationStoreAdapter` が同じstore lock下でphysical allocationとappend-only reservation lifecycleを唯一publishする。startup recovery、same-revision retry、close/abort後のreleaseも同adapterが所有する。`ExecutionPolicy` は最初の spawn より前、`SuiteDeadline` は publish reserve を差し引いて各 spawn/publish 前に評価する。これにより capacity/security failure は process result と混ざらず、store failure は arm verdict に変換されない。

## Test seams と blast radius

clock、process、filesystem、capacity、hash は port として注入し、production adapter は Bun/TypeScript と `node:fs`/`node:crypto` に限定する。crash tests は publisher/recovery、path/secret tests は policy、limit tests は collector/capacity、72/96 cardinality tests は expected index に局所化する。bundle schema を変える変更だけが builder、publisher、recovery、index の合同更新を要求し、それ以外の component は closed interface で隔離する。
