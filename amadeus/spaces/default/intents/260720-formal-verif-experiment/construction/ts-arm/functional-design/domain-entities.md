# Domain Entities — ts-arm

## 上流境界

本モデルは`unit-of-work.md` のts-arm境界、`unit-of-work-story-map.md` のS-2/S-3/S-5/S-6/S-8、`requirements.md` のblind deterministic TS arm、`components.md` のArm S Adapter、`component-methods.md` のuniverse / PBT / result contract、`services.md` のBun runを入力とする。TLA、skeleton evidence、fixture expectation、eligibilityはentityへ含めない。

U3はE-FVEU3FD1によりREADYではなく、iteration 2後是正の第三review未実施である。`TsArmIntegrationStatus`は最終FD人間裁定まで`DESIGNED_PENDING_U3_GATE`だけを許す。

## Value types

| Type | Shape / invariant | Owner |
| --- | --- | --- |
| `SubmittedAt` | second-precision UTC Zのopaque brand | Arm S |
| `ReceivedAt` | Coordinator receipt instantの別opaque brand | Arm S |
| `UniverseDescriptorId` | ordered axes / values / versionのSHA-256 | Arm S |
| `UniverseTupleKey` | axis順を保持したcanonical tuple identity | Arm S |
| `UniverseCoverageProofId` | cardinality / unique set / histograms / rolling hash identity | Arm S |
| `ValidationMatrixProofId` | 160 identity precedence cells / class coverageのSHA-256 | Arm S |
| `PropertyId` | closed 7 contract propertyのidentifier | Arm S |
| `CounterexampleId` | property / minimal input / seed / shrink pathのSHA-256 | Arm S |
| `TsRunIdentity` | freeze / subject / universe / tool / seed manifestのSHA-256 | Arm S |

opaque brandはparser success以外のconstructorを公開せず、unsafe castをlint / source scanで拒否する。

## Universe entities

`UniverseAxis`は`VOTER / CHOICE_INPUT / SUBMITTED_TOKEN / RECEIVED_TOKEN / BALLOT_KIND / REF_CLASS / GOA`のclosed unionである。`UniverseDescriptor`は各axisのordered value list、axis cardinality、projection rule、schema versionを持つ。

`UniverseTuple`は7 axisのexactly one valueとmixed-radix index 0..5759を持つ。`RuntimeProjection`はtupleからactual ballot / prior ledger setupへ変換し、projection classとpayload identityを保持する。

`CoreUniverseCoverageProof`は `{ descriptorIdentity, expectedCount: 5760, actualCount, uniqueKeyCount, axisHistograms, firstKey, lastKey, rollingHash }` を持つ。全count一致と全index round-trip成功時だけconstructorを公開する。

`IdentityValidationMatrix`はelection input 2、voter input 4、choice input 4、submitted token 5の160 cellsを持つ。`ValidationMatrixProof`はunique count 160、unknown election / voter / choice / invalid timestampのclass counts、全precedence pair coverage、ledger / budget不変receiptを持つ。

## Brand and property entities

`TimestampTokenMap`はT0/T1/T2を`2026-07-20T00:00:00Z / 00:00:01Z / 00:00:02Z`へ、INVALID_FORMATを`__INVALID_FORMAT__`、INVALID_DATEを`2026-02-30T00:00:00Z`へ写像するclosed entityである。

`SubmittedBallot`はSubmittedAt、arrival sequence、voter、choice、kind / ref、GoAを持つ。`ReceivedEnvelope`はReceivedAtとSubmittedBallotを包むが、SubmittedAtをReceivedAtへ変換しない。

`ContractObservation`はproperty ID、tuple / sequence identity、expected class、actual result、before / after ledger identitiesを持つ。7 propertyごとにsuccessまたはcounterexampleへ分類する。

`SequenceAction`は`SUBMIT_ORIGINAL / SUBMIT_AMEND / TALLY / RECORD_HOLD`のclosed unionである。sequenceはinitial最大3、amend最大3、TALLY exactly one、hold outcome時RECORD_HOLD最大1の合計8以下を満たす。

`PropertyRun`は `{ fastCheckVersion: 4.9.0, seed: 20260720, numRuns: 100, maxActions: 8, runIndex, actionSequence, shrinkPath, observation }` を持つ。failure variantはminimal sequenceのreplay receiptを必須とする。

`TsArmProof`は次のclosed unionである。

- `CounterexampleProof`: exhaustive tupleまたはproperty run、property ID、minimal input、expected / actual、replay receipt、counterexample identity。
- `CompletionProof`: valid core / validation proofs、5760+160 observations、100 green property runs、tool / subject / freeze identities。
- `HarnessFailureProof`: import / schema / tool / coverage / replay failureとraw references。

normalizerはcounterexampleを`DETECTED`、completionを`NOT_DETECTED`、harness failureを`HARNESS_ERROR`へ一意に写像する。

## Ports and errors

| Port / operation | Input → Output | Failure |
| --- | --- | --- |
| `Universe.compile` | public contract / descriptor → universe + proof | axis、count、round-trip、projection |
| `SubmittedAt.parse` | raw token → submitted brand / invalid variant | shape、calendar |
| `ReceivedAt.mint` | Coordinator token → received brand | order、source |
| `SubjectAdapter.load` | frozen subject / public port → adapter | import、surface、blind path |
| `ExhaustiveRunner.run` | universe / adapter → observations | missing、duplicate、subject error |
| `PropertyRunner.run` | descriptor / adapter / fixed config → property runs | seed、shrink、replay |
| `TsNormalizer.normalize` | proof / provenance → `CellResult` | schema、identity |

errorsは`UniverseError / TimestampBrandError / SubjectAdapterError / ExhaustiveError / PropertyError / ReplayError / TsNormalizationError`のclosed unionで、property / tuple / run identityとcauseを保持する。U3 unresolved statusはdomain errorへ丸めず外部gateとして保持する。
