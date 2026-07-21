# Domain Entities — tla-invalid-timestamp-skeleton

## 上流境界

本モデルは`unit-of-work.md` のU5 integration境界、`unit-of-work-story-map.md` のS-2/S-4/S-8、`requirements.md` のrisk-first skeleton、`components.md` のCoordinator / Registry / TLA / Evidence、`component-methods.md` のfreeze / reveal / run、`services.md` の中央orchestrationを入力とする。Arm S、full matrix、promotion、eligibility、final rootをentityへ含めない。

U3はE-FVEU3FD1、U4はE-FVEU4FD1によりREADYではなく、両方ともiteration 2後是正の第三review未実施である。`SkeletonIntegrationStatus`は最終FD人間裁定まで`DESIGNED_BLOCKED_ON_U3_U4_GATE`だけを許す。

## Value types

| Type | Shape / invariant | Owner |
| --- | --- | --- |
| `SkeletonRunId` | precondition snapshotとattempt identityのSHA-256 | U5 harness |
| `PreconditionSnapshotId` | baseline / freeze / fixture / model / tool identity集合のSHA-256 | U5 harness |
| `CompositionHeadId` | base / ordered overlays / resulting tree / commitのSHA-256 | U5 harness |
| `SkeletonSubject` | sealed #1252 opaque aliasとinjection identity | U2 Registry |
| `ReplayRunNo` | `1`または`2` | U5 harness |
| `SkeletonEvidenceId` | 2 verified bundle IDsとcounterexample identityのSHA-256 | U5 harness |
| `CiReceiptId` | provider run / job / head / artifact identityのSHA-256 | U5 harness |
| `SkeletonSummaryId` | 全trace linksのcanonical manifest identity | U5 harness |

identityはstrict parsed canonical JSONから生成し、branch名、会話時刻、local pathを根拠にしない。

## Integration entities

`SkeletonPreconditions`は `{ compositionHeadId, resultingCommitSha, resultingTreeHash, tFrozenEventId, tFreezeSha, publicInputHash, fixtureAlias, injectionSha, sealIdentity, disclosureGrantIdentity, modelIdentity, jarIdentity, jdkIdentity, profileIdentity, evidenceRootIdentity }` を持つ。全参照を再検証したopaque ready valueであり、raw inputから直接constructorを呼べない。

`CompositionHead`は `{ baseSha, armFreezeSha, armOwnedDiffIdentity, injectionSha, injectionPatchIdentity, applicationOrder, armOverlayTree, injectionOverlayTree, resultingCommitSha }` を持つ。application orderは`ARM_T_OWNED_DIFF_THEN_1252_PATCH`のliteralで、専用integration branchだけにcommitしmainへmergeしない。

`WorktreeExecutionReceipt`は `{ compositionHeadId, expectedCommitSha, actualHeadSha, expectedTreeHash, actualTreeHash, clean, verifiedImmediatelyBefore }` を持つ。全一致の場合だけprocessを起動できる。

`SkeletonAttempt`はrun 1 / 2ごとに `{ runId, runNo, preconditionSnapshotId, compositionHeadId, resultingCommitSha, worktreeExecutionReceipt, commandIdentity, processReceiptIdentity, cellResultIdentity, bundleId, counterexampleIdentity, durationMs }` を持つ。両attemptはrunNo / bundle以外のidentityが一致する。

`SkeletonEvidence`はexactly two attempts、verdict `DETECTED`、同一counterexample identity、runner/store ledger verification receiptsを持つ。どれか不一致ならsuccess entityを作らず`DeterminismError`を返す。

`SkeletonExecutionManifest`はcomposition head、precondition snapshot、local 2 attempts / evidence / semantic tuple、CI command、expected CI attempt keys 1 / 2、artifact schema identityを持つCI前identityであり、CI receiptやfinal summaryを含まない。

`SkeletonCiArtifact`は `{ schemaVersion, executionManifestIdentity, compositionHeadId, resultingCommitSha, inputIdentity, attempts }` を持つ。attemptsはrunNo 1 / 2とのbijectionで、各rowがDETECTED、counterexample / CellResult / bundle / raw stream / command / process receipt identitiesを持つ。`VerifiedCiArtifactProof`は全row再hashとlocal semantic tuple一致後だけmintする。

`CiExecutionReceipt`は `{ provider, workflow, job, runId, runUrl, headSha, commandIdentity, startedAt, finishedAt, exitCode, artifactIdentity, verifiedArtifactProof, executionManifestIdentity }` を持つ。provider取得済みmachine-readable metadata、artifact hash、attempt bijectionを再検証した場合だけmintする。

`SkeletonSummary`はexecution manifestとCI receiptを結ぶ最終immutable trace manifestである。CI receiptはsummary identityを含まないため循環せず、全edgeは相手identityを含み、orphan referenceを許さない。

## State transition entities

`SkeletonOutcome`は次のclosed unionである。

- `SkeletonPass`: summary identity、evidence identity、CI receipt、expected ledger head、transaction IDを持ち、U1 `SkeletonPassed` eventへ写像する。
- `SkeletonFailure`: domain reason、verified partial identities、expected ledger head、transaction IDを持ち、U1 terminal `SkeletonFailed` eventへ写像する。

failure reasonは`PRECONDITION / DISCLOSURE / NOT_DETECTED / HARNESS_ERROR / NON_DETERMINISTIC / EVIDENCE / CI / TRACE`を区別する。transport / head conflict / lookup / corruptionは`SkeletonCommitError`としてevent外へ返す。failure後はledger suffixで禁止command 0件を証明する`StopReceipt`を生成する。

## Ports and errors

| Port / operation | Input → Output | Failure |
| --- | --- | --- |
| `SkeletonPreflight.verify` | U1/U2/U4 refs → preconditions | state、freeze、seal、tool drift |
| `Registry.materialize` | event-bound grant / target → subject receipt | order、arm、worktree、identity |
| `TlaCell.execute` | preconditions / composition-bound execution receipt / runNo → raw + normalized result | HEAD / tree drift、tool、timeout、parse |
| `Evidence.publish` | result / streams → verified bundle receipt | store、identity、chain |
| `ReplayVerifier.verify` | two attempts → skeleton evidence | verdict / counterexample / input drift |
| `CiVerifier.verify` | run metadata / artifact → CI receipt | head、command、artifact、status |
| `SkeletonLedger.record` | outcome / expected head → state event | head conflict、partial append |
| `SkeletonLedger.findTransaction` | transaction ID → committed outcome / absent | read、identity、corruption |
| `StopVerifier.verify` | failure event / ledger suffix → stop receipt | forbidden transition |

errorsは`SkeletonPreconditionError / DisclosureError / ExecutionError / EvidenceError / DeterminismError / CiReceiptError / TraceError / SkeletonTransitionError / SkeletonCommitError`のclosed unionで、run / artifact identityとcauseを保持する。U3/U4のunresolved reviewer statusはerrorへ丸めず、外部gate blockerとして別管理する。
