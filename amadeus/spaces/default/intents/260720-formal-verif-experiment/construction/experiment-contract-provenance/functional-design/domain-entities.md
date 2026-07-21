# Domain Entities — experiment-contract-provenance

## 上流境界

本モデルは`unit-of-work.md` のExperiment Contract/Provenance境界、`unit-of-work-story-map.md` のU1 coverage、`requirements.md` のblind・deterministic verdict・cost provenance、`components.md` のCoordinator、`component-methods.md` の共通型、`services.md` のtyped CLI commandを入力とする。永続domain aggregateは導入せず、immutable valueとappend-only event列で構成する。

## Value types

| Type | Shape / invariant | Owner |
| --- | --- | --- |
| `ArmId` | `tla | ts` | Experiment Contract |
| `Verdict` | `DETECTED | NOT_DETECTED | HARNESS_ERROR` | Experiment Contract |
| `Sha256` | lowercase 64 hex。検証済みbytesからのみ生成 | Experiment Contract |
| `UtcInstant` | 実在するISO-8601 `Z`。文字列patternだけで受理しない | Provenance |
| `RelativeRepoPath` | 絶対path、`..`、NULを拒否 | Provenance |
| `PublicInputHash` | 正準化済み公開manifestの`Sha256` | Blind Coordinator |
| `TransactionId` | domain separation、expected head、IDを除外したcanonical event payload列の`Sha256` | Provenance |
| `ActualInputManifestIdentity` | session/worktreeが実際に読んだ入力manifestの`Sha256` | Blind Coordinator |
| `ForbiddenPathScanReceipt` | scan対象・禁止分類・match 0件・tool identityを持つ検証済みreceipt | Blind Coordinator |
| `ExperimentConfig` | 裁定済みnamed literalだけを持つclosed value | Experiment Contract |
| `TlcProfile` | 3 voters/3 choices/固定token/各上限1/workers1 | Experiment Contract |
| `CellResult` | schemaVersion=1の完全な1 cell evidence index | Experiment Contract |
| `ArmSuiteResult` | 1 arm/run/input hashとcanonical順cells | Experiment Contract |

`ExperimentConfig`、`CellResult`、`ArmSuiteResult`はconstructorを公開せず、unknownからのparserだけが生成する。検証結果をbooleanで捨てず、parsed valueが不変条件の証明を運ぶ。

## Provenance events

全eventは共通field `{ eventId, transactionId, kind, at, sequence, actorId, sessionId, worktree, baseSha, publicInputHash }` を持つclosed unionである。`transactionId`はcanonical event payloadに含めず、hash確定後にevent envelopeへ付与する。

| Event | Additional fields | Preconditions |
| --- | --- | --- |
| `ArmAuthoringStarted` | `arm`, `cleanReceipt`, `inputManifestHash`, `actualInputManifestIdentity`, `actualInputManifestRef`, `forbiddenPathScanReceipt` | Tはinitial、Sはskeleton pass後、申告/実入力一致、禁止入力0件 |
| `ArmFrozen` | `arm`, `freezeSha`, `testReceipt`, `ownedPathsHash`, `cleanReceipt`, `actualInputManifestIdentity`, `actualInputManifestRef`, `forbiddenPathScanReceipt` | 対応start、hash/実入力継続、clean/test green、禁止入力0件 |
| `FixtureRevealed` | `arm=tla`, `fixtureAlias`, `frozenEventId`, `disclosureHash` | T freeze後、skeleton #1252だけ |
| `SkeletonPassed` | `cellResultIdentity`, `evidenceBundleHash` | reveal後、deterministic evidence complete |
| `SkeletonFailed` | `reason`, `evidenceBundleHash` | reveal後、唯一のfailure terminal |

fixtureの実defect ID、branch、patch、期待failureはU2のsealed entityであり、U1 eventにはfreeze前に格納しない。`fixtureAlias`は意味を漏らさないopaque identifierとする。

## Derived state

`BlindState`は保存entityではなく`ProvenanceLedger.fold()`の戻り値である。

| State | Allowed next command |
| --- | --- |
| `READY_FOR_T_AUTHORING` | `start(tla)` |
| `T_AUTHORING` | `freeze(tla)` |
| `T_FROZEN` | `reveal(tla, skeletonAlias)` |
| `SKELETON_REVEALED` | `recordSkeleton(pass|fail)` |
| `SKELETON_PASSED` | `start(ts)` |
| `S_AUTHORING` | `freeze(ts)` |
| `S_FROZEN` | `requestManifestPromotion` |
| `MANIFEST_PROMOTABLE` | composition rootによるRegistry commandだけ |
| `SKELETON_FAILED` | none |

ledger relationは `ProvenanceLedger 1 -> many ProvenanceEvent`、start/freezeはarmごとに1対0..1、reveal/pass-or-failは1対1である。fold中に関係違反があればstateを返さず`TransitionError`にする。

## Commands and ports

`ExperimentCommand`は次のclosed unionを持つ。

```text
FixtureSeal | AuthoringStart | ArmFreeze | FixtureReveal | FetchTlc |
SkeletonRecord | ManifestPromotionRequest | RunCell | BenchmarkArm |
EvaluateMatrix | RenderReport
```

`SkeletonRecord`は`pass | fail`とskeleton evidence identityを持ち、`SKELETON_REVEALED`から対応するclosed eventへ写像する。`ManifestPromotionRequest`は`S_FROZEN`からpermission receiptを生成し、composition rootのRegistry handlerへrouteするが、U1自身はpromotion I/Oを行わない。

`CommandHandler<C>`は`handle(command, context) -> Result<CommandReceipt, ExperimentError>`を公開する。`HandlerRegistry`は全kindの一意handlerを起動時に検証し、dispatcherはregistryだけへ依存する。concrete handler、filesystem、Git、subprocess、clock、hash実装はportとして注入する。ledger永続化は`appendBatch(expectedHead, transactionId, events)`と`findTransaction(transactionId)`を持つatomic store portに限定する。

`CommandReceipt`はcommand identity、before/after state identity、生成event identity、external artifact referenceを持つ。receipt自体で成功を捏造できず、handlerのdomain proofからのみ生成する。

## Error taxonomy and lifecycle

| Error | Meaning | Retry stance |
| --- | --- | --- |
| `SchemaError` | inputがclosed schemaを満たさない | 同じinputでは不可 |
| `CanonicalizationError` | JSON外値・正準bytes生成不能 | defect、fail-fast |
| `TransitionError` | event順・state・armが不正 | 順序/入力是正まで不可 |
| `IsolationError` | private/foreign pathまたはhash drift | freeze禁止 |
| `FreezeError` | dirty tree、test red、SHA/receipt不正 | 新しいproofが必要 |
| `HandlerRegistryError` | handler欠損・重複・未知kind | 起動不可 |
| `DependencyError` | port/Git/filesystem/subprocess失敗 | callerへ保持して返す |
| `HeadConflictError` | expected ledger headがcommit時に変化 | 最新ledgerをfoldしてcommand再評価 |
| `TransactionCorruptionError` | 同一transaction IDに異なるcanonical bytes | retry不可、fail-fast |
| `CommitUnknownError` | append応答喪失でcommit成否不明 | transaction lookup後だけ再送可 |

errorは`HARNESS_ERROR` verdictではない。arm実行境界がevidenceとともに`HARNESS_ERROR`をmintするまで、U1はtyped infrastructure/domain errorとして保持する。
