# Logical Components — live-e2e-common-hardening

## 上流入力と境界

本設計は`business-logic-model.md:3-11`を入力とし、同成果物が指定する既存production C2/C4/C8/C9 entry point（`business-logic-model.md:19`）を呼ぶtest-only libraryを定義する。`LC-LIVE-*`をruntime symbolとしてimportせず、production API/schema/taxonomyは所有しない。

## Component Inventory

| ID | Component | Responsibility |
|---|---|---|
| LC-TEST-01 | `ContractCaseSchema` | seed、fault、expected terminalを検証 |
| LC-TEST-02 | `FixtureRoot` | fresh filesystem/canary/resource lifecycle |
| LC-TEST-03 | `FakeLiveAdapter` | closed SpawnSpec、env/cwd observation |
| LC-TEST-04 | `FakeJourney` | structured anchor success/failure |
| LC-TEST-05 | `FaultInjector` | 単一lifecycle/I/O/process fault |
| LC-TEST-06 | `BoundedFakeProcess` | supervisor crash、PID reuse、output flood |
| LC-TEST-07 | `ObservationCollector` | count/digest/bytes/state snapshot |
| LC-TEST-08 | `ContractOracle` | outcome、order、leak、durability判定 |
| LC-TEST-09 | `ScopedIoSubstitution` | child worker限定I/O barrier/failure |
| LC-TEST-10 | `CrashWorkerHarness` | kill/recovery/concurrency編成 |
| LC-TEST-11 | `MatrixDriftOracle` | deterministic projectionとmanual drift |
| LC-TEST-12 | `RedGreenEvidenceBuilder` | sanitized baseline/mutant evidence |

## Dependency Direction

```text
ContractCaseSchema -> FixtureRoot
FixtureRoot -> FakeLiveAdapter + FakeJourney + FaultInjector
test -> existing exported C2/C4/C8/C9 entry points
ObservationCollector -> ContractOracle -> RedGreenEvidenceBuilder
CrashWorkerHarness -> ScopedIoSubstitution -> U01 RunLedger public API
MatrixDriftOracle -> U01 registry/ledger/projector public API
```

test componentsは既存exported production seamへ一方向依存し、production componentからimportされない。この境界はproduction変更禁止（`business-logic-model.md:7-10`）とcontract workflow（`business-logic-model.md:13-23`）に対応する。transport UnitはLC-TEST-01〜08を再利用し、固有fakeだけを追加する。

## Failure Domains

fixture failureは当該case、worker crashはfresh child、module substitutionはchild module cache、filesystem faultはfresh ledgerに封じる。case終了時にroot、process group、credential canary、substitution残存があればsuite全体をfailureにする。

## Resource and Concurrency Model

各caseは独立root/seed/clock/process groupを持つ。real live laneとledgerを共有しない。contract caseはserial、ledger concurrency caseだけ明示worker群で実行し、barrierが順序を決定する。

## Handoff

U03〜U11は既存C2/C4/C8/C9 public seamと本UnitのLC-TEST-01〜08を必須利用する。production branch、test-only env flag、transport横断の別taxonomyを追加しない。bounded outputを検証するadapterは`OUTPUT_BOUNDED_DRAIN`を必須assertionとして登録する。
