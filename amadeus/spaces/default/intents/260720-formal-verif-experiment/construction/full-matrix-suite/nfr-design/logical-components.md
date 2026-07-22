# Logical Components — full-matrix-suite

## 上流と ownership

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。serial matrix/costを所有し、manifest/promotion/oracle/eligibility/winner/reportを所有しない。

## Component inventory

| Component | Owns | Depends on |
| --- | --- | --- |
| `CanonicalInputBuilder` | baseline-first 8/6 subjects identity | promoted manifest |
| `SchedulePolicy` | hash-derived 12 entries | InputSetIdentity |
| `ResourceLeaseController` | cpuset/memory/telemetry identity | OS provider |
| `ResourceLeaseStore` | durable owner、RESUMED、normal/crash release | filesystem、liveness |
| `CapacityReservationStore` | physical backing、ACTIVE/RELEASED | filesystem capacity |
| `BenchmarkControlStore` | claims/start/terminal/ordinal ledger | filesystem transaction |
| `SuiteCoordinator` | serial U4/U6 over U3 execution | deadlines、U3/U4/U6 |
| `MatrixValidator` | 96/72 key/repeat completeness | U3 manifests/bundles |
| `GitCostAdapter` | isolated Git identityとnumstat receipt | frozen Git executable |
| `CostMeter` | LOC/elapsed/median source receipts | GitCostAdapter/U1/U3 |
| `FullMatrixEvidenceStore` | raw refsとderived identities | matrix/cost results |

## Dependency direction

U3 resultをU7 terminalより先にcommitし、両store再読後だけsuccessorへ進む。CostMeterはincompleteを比較値へ変換しない。U3/U4/U5未再review履歴を保持しcompletionを先取りしない。

## Test seams

clock/process/resource/Git/U3/storeをport化し、schedule、timeout、crash、matrix、LOC、medianを検証する。
