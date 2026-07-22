# Domain Entities — full-matrix-suite

## 上流境界

本モデルは`unit-of-work.md` のfull-matrix-suite境界、`unit-of-work-story-map.md` のS-3/S-6/S-8、`requirements.md` のmatrix / cost、`components.md` のRunner / Evidence Store、`component-methods.md` のsuite / benchmark、`services.md` のbenchmark commandを入力とする。manifest生成、arm oracle、eligibility、Pareto、reportをentityへ含めない。

U3/U4/U5はE-FVEU3FD1/U4FD1/U5FD1によりREADYではなく、iteration 2後是正の第三review未実施である。`MatrixIntegrationStatus`は最終FD人間裁定まで`DESIGNED_BLOCKED_ON_U3_U4_U5_GATE`だけを許す。

## Value types

| Type | Shape / invariant | Owner |
| --- | --- | --- |
| `InputSetIdentity` | baseline + manifest / ordered subjectsのSHA-256 | U7 |
| `MeasurementScheduleId` | arm / sample / run / order列のSHA-256 | U7 |
| `SampleKey` | `WARMUP/0`または`MEASURED/1..5` | U7 |
| `MatrixCellKey` | arm / sample / run / subject tuple | U7 |
| `ArmAuthoredLoc` | arm-owned numstat additions + deletions | U7 |
| `AuthoringElapsedMs` | Coordinator start / freeze UTC差 | U7 |
| `SuiteMedianMs` | exactly 5 measured durationsのmiddle value | U7 |
| `FullMatrixEvidenceId` | verified matrix / raw cost / source refsのSHA-256 | U7 |

identityはcanonical parsed dataから生成し、filesystem列挙順、mtime、会話時刻を根拠にしない。

## Input and schedule entities

`CanonicalInputSet`は `{ schemaVersion, baselineSha, manifestIdentity, dCount, orderedSubjects, orderedInjectionTrees, inputSetIdentity }` を持つ。ordered subjectsはbaseline + exactly D-COUNT aliasesで、manifest順と一致する。

`MeasurementSchedule`はinput set hashから導出したfirstArm、warmup 2件、measured 10件のglobal ordinal 0..11、arm / sample / position、entry identityを持つ。warmupはopposite / first、odd measuredはfirst / opposite、evenは逆のclosed scheduleであり、3対2の先行偏りをmetadataとして保持する。

`MeasurementPreconditions`はskeleton pass、T/S freeze、manifest、input set、runner class、resource / network profile、U3/U4/U6 tool identitiesを束ねるopaque valueである。全参照成功時だけconstructorを公開する。

## Suite and matrix entities

`SuiteStartReceipt`は `{ scheduleId, globalOrdinal, scheduleEntryIdentity, arm, sampleKey, position, predecessorReceiptIdentity }` を持つappend-only entryである。ordinal 0以外は直前receiptを参照する。

`MeasuredSuite`は `{ scheduleId, scheduleEntryIdentity, globalOrdinal, startReceiptIdentity, arm, sampleKey, position, inputSetIdentity, runnerClass, orderedSubjects, orderedBundleIds, startedMono, finishedMono, durationMs }` を持つ。ordered bundleはsubjectsとbijectionで、各bundleがverified runner/store receiptを持つ。

`IncompleteSuite`はverified partial bundles、missing keys、timeout / identity / chain / runner findingを持つ。HARNESS_ERROR bundleはmissingではなく存在cellとして扱う。

`MatrixValidationResult`は`CompleteMatrix | IncompleteMatrix`のclosed unionである。complete variantはexpected / actual key bijection、all bundle receipts、input / runner equality、measured verdict agreementを持つ。incomplete variantは`HARNESS_ERROR_CELL / SUITE_TIMEOUT / MISSING / DUPLICATE / HANDWRITTEN / IDENTITY_CORRUPTION / CHAIN_DRIFT / INPUT_DRIFT / NON_DETERMINISTIC` findingsとcauseを保持する。

## Cost entities

`LocMeasurement`はarm、baseline / freeze SHA、owned path manifest、numstat rows、additions、deletions、total、dependency / config countsを持つ。binary row、shared / unknown pathがあればvalid measurementを作らない。`SharedLocMeasurement`は同じschemaでshared pathだけを別集計する。

`AuthoringElapsed`はstart / freeze event IDs、actor / worktree / input hash continuity、UTC instants、durationMsを持つ。event順とidentityを検証した場合だけmintする。

`SuiteTimingAggregate`はclosed unionである。`CompleteTimingAggregate`はarm、warmup raw、5 complete measured raw valuesとposition、sorted values、median index 2 / source run、preparation raw cost、exclusion policy identityを持つ。`IncompleteTimingAggregate`はcomplete / partial raw tracesとfindingsを持つが`SuiteMedianMs`を持てない。

`FullMatrixEvidence`はinput set / schedule / preconditions、all suites、matrix validation、LOC / elapsed / timing、source command / CI / artifact refsを結ぶimmutable derived manifestである。eligibility discriminatorを持たない。

## Ports and errors

| Port / operation | Input → Output | Failure |
| --- | --- | --- |
| `InputSet.compile` | promoted manifest / baseline → canonical input | count、order、identity |
| `Schedule.compile` | constants / arms → fixed schedule | count、order、mutation |
| `SuiteRunner.run` | arm / sample / input / deadline → suite result | timeout、cell、evidence |
| `MatrixValidator.verify` | expected keys / suites → validation result | typed findings |
| `LocMeter.measure` | baseline / freeze / owned paths → LOC | binary、rename、path |
| `ElapsedMeter.measure` | start / freeze events → elapsed | identity、order、format |
| `Timing.aggregate` | schedule receipts + warmup + 5 measured → complete / incomplete timing union | count、order、completeness、median、drift |
| `MatrixEvidence.build` | matrix / costs / refs → derived manifest | source、identity、trace |

errorsは`InputSetError / ScheduleError / SuiteError / MatrixError / LocMeasurementError / ElapsedMeasurementError / TimingError / MatrixEvidenceError`のclosed unionで、arm / sample / source identityとcauseを保持する。U3/U4/U5 unresolved statusはdomain errorへ丸めず外部gateとして保持する。
