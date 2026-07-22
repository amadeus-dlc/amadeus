# Domain Entities — execution-evidence

## 上流境界

本モデルは`unit-of-work.md` のexecution-evidence境界、`unit-of-work-story-map.md` のS-3/S-4/S-6/S-8/S-9、`requirements.md` のdeterministic verdict / raw evidence、`components.md` のCell Runner / Evidence Store、`component-methods.md` の`CellResult` / `ArmSuiteResult`、`services.md` のrun / benchmark commandを入力とする。raw evidenceを正本とし、eligibilityやreportを保存entityへ混在させない。

## Value types

| Type | Shape / invariant | Owner |
| --- | --- | --- |
| `SubjectId` | `HEALTHY_BASELINE`またはpromoted fixture alias | Runner |
| `SampleKey` | `WARMUP/0`または`MEASURED/1..5`のclosed value | Runner |
| `InputSetHash` | canonical subject列のSHA-256 | Runner |
| `VerifiedExecutionReceipt` | runner/store独立ledgerのhash chain cross-referenceから再構築するproof | Runner / Evidence Store |
| `RawStream` | bytes、length、SHA-256。text変換しない | Evidence Store |
| `CellResultIdentity` | canonical `CellResult`のSHA-256 | Experiment Contract |
| `EvidenceBundleId` | domain-separated canonical payload manifestのSHA-256 | Evidence Store |
| `SuiteIdentity` | ordered bundle ID列とsuite metadataのSHA-256 | Evidence Store |
| `MatrixValidationResult` | complete proofまたはtyped incomplete findingsを持つclosed union | Evidence Store |

`VerifiedExecutionReceipt`とcomplete proofはconstructorを公開しない。前者はrunner-owned suite ledgerとstore append ledgerのprevious-head hash chainを再計算し、同じinvocation / cell key / bundle IDへのcross-referenceが一致した場合だけ再構築する。filesystem上のbundle JSONをparseしただけでは生成できない。

## Evidence bundle

`EvidenceBundle`は1 process invocationへ対応するimmutable entityである。

| Field | Invariant |
| --- | --- |
| `bundleId` | index外のcanonical payload manifestから再計算一致 |
| `cellKey` | arm、subject、sample kind、runNoのtuple。warmupとmeasuredは非衝突 |
| `armSha` / `baselineSha` | lowercase commit SHA、suite metadataと一致 |
| `inputSetHash` | suite開始時のcanonical input hashと一致 |
| `ledgerCoordinates` | runner/store両ledgerのexpected previous heads / next sequences。current entry hashを含めない |
| `resultIdentity` | strict parsed `CellResult`のcanonical identity |
| `payloadManifest` | closed 5 payloadのlogical role、SHA-256、byte length。index / pathを含めない |
| `publishedAt` | Coordinator UTC。duration計算には使わない |
| `envelopeHash` | bundle ID、manifest、publishedAt、ledger coordinatesのdomain-separated hash |

relationは `ArmSuite 1 -> exactly N EvidenceBundle` であり、Nは`1 + D-COUNT`である。bundleは1 suite indexからだけ参照され、同じbundle IDを別cell keyとして再利用できない。

## Suite and matrix entities

`ArmSuite`は `{ suiteId, arm, freezeSha, baselineSha, runnerClass, sampleKey, inputSetHash, orderedSubjects, orderedBundleIds, startedMono, finishedMono, durationMs }` を持つ。`sampleKey`は`WARMUP/0 | MEASURED/1..5`のclosed unionである。ordered subjectsとbundle IDsは同じlength・index対応を持つ。deadline前に期待keyを完走できない場合は同じmetadataとverified partial bundles、missing keys、`SUITE_TIMEOUT`を持つ`IncompleteSuite`を返す。

`ExperimentMatrix`は永続raw entityではなく、promoted manifestと検証済みsuite indexからvalidatorが導出するviewである。期待keyは `arms × measured runs × canonical subjects`、別枠で `arms × 1 warmup × canonical subjects` を持つ。`verifyMatrix`は次を全て満たした場合だけ`CompleteMatrix` proofを返す。

1. expected keyとactual keyが順序込みで完全一致する。
2. 各keyがexactly one bundleと有効な`VerifiedExecutionReceipt`を持つ。
3. 全suiteでbaseline SHA、input set hash、runner classが比較可能である。
4. measured 5 runsの対応cell verdictが一致する。
5. bundle、suite、manifestのcontent identityを再計算できる。

検査結果は`CompleteMatrix(proof) | IncompleteMatrix(expectedKeys, verifiedBundles, findings)`である。findingsは`HARNESS_ERROR_CELL / SUITE_TIMEOUT / MISSING / DUPLICATE / HANDWRITTEN / METADATA_DRIFT / IDENTITY_CORRUPTION / CHAIN_DRIFT / STORE_FAILURE`をclosed discriminatorとして区別し、対象identityとcauseを保持する。結果自体はeligibilityを含まないが、後続Evaluatorはcomplete matrix内の`HARNESS_ERROR`とincomplete findingsの両方をfail-closedな失格または実験無効根拠として受け取れる。

## Ports and operations

| Port / operation | Input → Output | Failure |
| --- | --- | --- |
| `ProcessRunner.execute` | argv / cwd / env allowlist / deadline → raw process outcome | spawn、signal、timeout |
| `CellNormalizer.normalize` | process outcome / arm proof → `CellResult` | schema、oracle proof不足 |
| `RunnerLedger.append` | invocation / cell key / bundle link → chained runner entry | head conflict、partial transaction |
| `EvidenceStore.publishCell` | expected heads / bundle / invocation proof → locked atomic transaction receipt | head conflict、lock、partial、identity、collision、I/O |
| `EvidenceStore.read` | bundle ID + both ledger heads → verified bundle / receipt | missing、hash / length / chain drift |
| `SuiteValidator.verify` | suite metadata / ordered bundles → verified suite | missing、duplicate、drift |
| `MatrixValidator.verify` | manifest / verified suites / incomplete suites → validation result | findingsをclosed unionで返す |

portsはinjected interfaceであり、U3はTLC、Bun test harness、Registry、Evaluator、Rendererのconcrete implementationをimportしない。

## Error taxonomy and lifecycle

| Error | Meaning | Retry stance |
| --- | --- | --- |
| `ExecutionInputError` | frozen SHA、subject、run metadata不正 | input是正まで不可 |
| `ProcessError` | spawn、signal、timeoutのraw failure | result bundleへ根拠を保存 |
| `NormalizationError` | arm resultをclosed schemaへ変換不能 | `HARNESS_ERROR` evidenceを生成 |
| `EvidenceIdentityError` | file / result / index identity不一致 | fail-fast、上書き不可 |
| `EvidencePublishError` | atomic publish不能または結果不明 | target再照合後だけ再送可 |
| `EvidenceCorruptionError` | 同一identityに異bytesまたは既存bytes drift | retry不可 |
| `SuiteCompletenessError` | cell欠損・重複・順序 / metadata drift | `IncompleteSuite` findingとして保持 |
| `MatrixCompletenessError` | expected matrixと検証済みsuiteが不一致 | typed incomplete resultをEvaluatorへ渡す |

process failureとnormalization failureはarm実行境界でevidence付き`HARNESS_ERROR`になり得るが、store / identity / completeness failureはverdictではない。後者を成功resultへ丸めず、raw bundleとderived proofの境界を維持する。
