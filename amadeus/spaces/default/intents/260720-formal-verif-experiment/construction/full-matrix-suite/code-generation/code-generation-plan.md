# Code Generation Plan — full-matrix-suite (U7 / Bolt 3)

## 上流入力(consumes 全数)

- `construction/full-matrix-suite/functional-design/business-logic-model.md`
- `construction/full-matrix-suite/functional-design/business-rules.md`
- `construction/full-matrix-suite/functional-design/domain-entities.md`
- `construction/full-matrix-suite/nfr-design/logical-components.md`
- `construction/full-matrix-suite/nfr-design/performance-design.md`
- `construction/full-matrix-suite/nfr-design/reliability-design.md`
- `construction/full-matrix-suite/nfr-design/scalability-design.md`
- `construction/full-matrix-suite/nfr-design/security-design.md`
- `inception/units-generation/unit-of-work.md`(§ full-matrix-suite)
- `inception/requirements-analysis/requirements.md`(FR-4/FR-5/FR-9, NFR-1/NFR-2)
- `inception/delivery-planning/bolt-plan.md`(§ B3)

## 責務と境界(完成条件)

- 昇格済み manifest の hash を検証して consume し、canonical input set(baseline 先頭 + D-COUNT alias)と serial full suites を実行する。
- `ARM_AUTHORING_STARTED`→`ARM_FROZEN` の Coordinator UTC 差から authoring elapsed、arm-owned numstat から `ARM_AUTHORED_LOC` を読み、suite timings とともに raw cost を保存する。
- 完成条件: 1 warmup + 5 measured suites(arm ごと)、各 120 秒、全 run verdict 一致、全 raw sample 保存。
- **非所有**: manifest 生成 / promotion 判断、eligibility / winner 決定、report 表現(U8)。

## 既存 reuse(reuse inventory)

新規機構は既存で代替できない箇所のみ導入する。以下は再利用し二重実装しない:

- `execution-evidence.ts`: `runArmSuite`(arm 内 subject の serial 実行 + 120 秒 timeout + HARNESS_ERROR 後続継続)を `SuiteRunnerPort` の実装として利用。`SampleKey`, `SuiteRunResult`, `CellExecutionResult` を再利用。
- `canonical.ts`: `canonicalIdentity`(全 identity の content-address 化)。
- `contract.ts`: `ArmId`, `Result`, `Verdict`, `CellResult`, `isUtcInstant`。
- `fixture-registry.ts`: `PromotedFixtureManifest`(baselineSha / dCount / orderedEntries / manifestIdentity)。
- `fixture-registry-domain.ts`: `DCount`(7 | 5)。
- `provenance.ts`: `ProvenanceEvent`(`ARM_AUTHORING_STARTED` / `ARM_FROZEN` の Coordinator event)。

## 生成ファイルと概算 LOC

| File | Owns | 概算 LOC |
| --- | --- | --- |
| `scripts/formal-verif/full-matrix.ts` | InputSet compile / Schedule compile / suite coordinator + SuiteStartReceipt chain / matrix validation / timing aggregate(median)/ evidence build | 200–230 |
| `scripts/formal-verif/full-matrix-cost.ts` | ArmAuthoredLoc(numstat port + arm-owned allowlist)/ AuthoringElapsed(provenance event 差) | 70–90 |
| `scripts/formal-verif/index.ts`(追記) | 上記 2 モジュールの export | +2 |

概算合計 270–320。budget 180–300 の上端付近。`runArmSuite` 等の再利用で coordinator を薄く保つ。実装中に 300 を明確に超える見込みが出た場合は追加を止めて申告する。

## モジュール設計(functional-domain-modeling-ts)

type + closed discriminated union + companion 関数、identity は `canonicalIdentity` 由来の SHA 文字列。impure 面は port interface で分離。

### full-matrix.ts

- `CanonicalInputSet = { schemaVersion, baselineSha, manifestIdentity, dCount, orderedSubjects, inputSetIdentity }`。`compileInputSet(manifest, expectedBaselineSha) → Result<CanonicalInputSet, InputSetError>`: baseline を index 0、`orderedEntries` の alias を 1..D-COUNT。D-COUNT=7→8 subjects、5→6 subjects 以外を拒否。再 sort / arm 別順序禁止。
- `MeasurementSchedule` + `ScheduleEntry[12]`。`compileSchedule(inputSetIdentity) → Result<MeasurementSchedule, ScheduleError>`: `firstArm = SHA-256(inputSetIdentity||"suite-order-v1") 最下位 bit`。warmup = opposite→first、measured odd = first→opposite、even = 逆。global ordinal 0..11、`WARMUP/0` / `MEASURED/1..5` の sample key。3 対 2 先行偏りを metadata に保持。
- `SuiteStartReceipt = { scheduleId, globalOrdinal, scheduleEntryIdentity, arm, sampleKey, position, predecessorReceiptIdentity }`。append-only。
- `SuiteRunnerPort.run(entry, subjects, deadlineMs) → SuiteRunResult`(既存 `runArmSuite` 型)。
- `runFullMatrix(schedule, inputSet, deps) → FullMatrixRun`: ordinal 昇順で SuiteStartReceipt を発行(ordinal 0 以外は直前 receipt を参照)し port を呼ぶ。`MeasuredSuite` / `IncompleteSuite` を分類。
- `verifyMatrix(inputSet, schedule, run) → MatrixValidationResult(CompleteMatrix | IncompleteMatrix)`: expected/actual cell key bijection、schedule↔receipt bijection・strict ordinal・predecessor chain、5 measured の対応 cell verdict / counterexample 一致。findings は `HARNESS_ERROR_CELL / SUITE_TIMEOUT / MISSING / DUPLICATE / IDENTITY_CORRUPTION / CHAIN_DRIFT / NON_DETERMINISTIC` の closed union。
- `aggregateTiming(arm, warmupRaw, measuredSuites, preparationRawMs) → SuiteTimingAggregate(Complete | Incomplete)`: 5 complete 時のみ sort → index 2 を median。warmup / timeout / partial を除外。raw / sorted / median source / position を保存。不完全なら median 無し。
- `buildMatrixEvidence(inputSet, schedule, run, matrix, loc, elapsed, timing, refs) → Result<FullMatrixEvidence, MatrixEvidenceError>`: raw refs と derived identity を content-address で結ぶ。eligibility discriminator を持たない。derived を再計算し identity 一致を検証。

### full-matrix-cost.ts

- `NumstatRow = { additions, deletions, path }`、`NumstatPort.numstat(baselineSha, freezeSha) → readonly NumstatRow[] | binary marker`。
- `measureArmAuthoredLoc(input, port) → Result<LocMeasurement, LocMeasurementError>`: arm-owned source/test/config allowlist に限定、additions+deletions 合計。binary `-` / rename ambiguity / allowlist 外 / shared path を拒否。shared は `SharedLocMeasurement` へ別計上。
- `measureAuthoringElapsed(events, arm) → Result<AuthoringElapsed, ElapsedMeasurementError>`: 対応する `ARM_AUTHORING_STARTED` / `ARM_FROZEN` の UTC 差。event identity・arm/author/worktree/public input hash 連続性を検証。負値・時刻形式 / order 不正は結果を作らない。commit/会話時刻を使わない。

## テスト計画(tests/unit/, 純関数・fake port)

`tests/unit/t-formal-verif-full-matrix.test.ts` と `t-formal-verif-full-matrix-cost.test.ts`。実 FS 不使用(fake SuiteRunnerPort / NumstatPort)のため unit 層。

happy path + エラー / エッジ最低 2 件ずつ:
- D-COUNT 7/5 の subject count(8/6)、baseline-first、alias 順、件数外拒否。
- hash-derived firstArm、warmup 順、measured odd/even 反転、3 対 2 偏りの明示。
- schedule ordinal / predecessor 欠損・重複・順序違反。
- warmup / measured key 非衝突、120 秒 timeout の incomplete、HARNESS_ERROR 後続継続、missing / duplicate cell。
- 5-run verdict 一致 / 非一致(NON_DETERMINISTIC)。
- complete 5-value median、不完全 suite で median 生成禁止。
- arm-owned LOC 合計、binary / shared / allowlist 外 path 拒否。
- authoring elapsed(event 差)、負値 / order 不正 / 会話時刻拒否。
- U3/U4/U5 未裁定 status(`DESIGNED_BLOCKED_ON_U3_U4_U5_GATE`)を保持し completion を主張しない。

## 検証コマンド(同期実行 · exit code 記録)

- `bun x tsc --noEmit -p tsconfig.json`(自 unit エラー 0)
- `bun x tsc --noEmit -p tsconfig.tests.json`(自 unit エラー 0。B1 skeleton 既存 red 9 件はスコープ外・baseline)
- `bun x biome check <変更ファイル>`
- `bun test tests/unit/t-formal-verif-full-matrix.test.ts tests/unit/t-formal-verif-full-matrix-cost.test.ts`(path 実在確認 + "Ran ... across N files" 照合)
- 回帰 spot `bun test tests/unit/t-formal-verif-contract.test.ts`
- deslop 後に全検証再実行

## 逸脱

現時点で FD / 要件からの逸脱なし。budget 上端付近のため、実装中に 300 LOC を明確に超える見込みが出た場合は停止して申告する。
