# Pi Conformance Evidence — Domain Entities

## モデル境界と上流トレーサビリティ

`unit-of-work` / `unit-of-work-story-map` / `requirements` が定める全適合面を、`components` / `component-methods` の `PiLiveJourneyHarness` / `runPiLiveJourney` と、`services` の短命 validation lifecycleで表現する。永続databaseやserverはなく、repository上のversioned catalogとcontent-addressed receipt bundleだけを扱う。

## Aggregate roots

### PiConformanceCatalog

verifierと同じversionに束縛された期待契約のaggregate root。

| Field | Type | Rule |
|---|---|---|
| `schemaVersion` | `ConformanceSchemaVersion` | unknownはfail-closed |
| `contractVersion` | `ConformanceContractVersion` | runner/verifierと完全一致 |
| `sourceRevision` | `GitCommitId` | 各inventoryと一致 |
| `requirements` | `RequirementContractSet` | M/SCN/FR/NFRの正準IDとpass predicate |
| `inventories` | `UnitTestInventorySet` | Unit ownerごとの実行可能entry |
| `journeys` | `ConformanceJourneyPlanSet` | cross-unit observable契約 |
| `formalPolicy` | `FormalEvidencePolicy` | 必須environment/tier/negative集合 |
| `trustPolicy` | `FormalEvidenceTrustPolicy` | issuer/recorder/CI/operatorのpublic trust root |
| `payloadDigest` | `Sha256Digest` | canonical serialization |

### ConformanceRunBundle

一回のrunner invocationが生成するappend-only aggregate root。

| Field | Type | Rule |
|---|---|---|
| `runId` | `ConformanceRunId` | reuse不可 |
| `kind` | `deterministic | live-rpc | tui-dogfood` | result unionを決める |
| `environment` | `EnvironmentFingerprint` | secret-free |
| `source` | `SourceFingerprint` | clean/dirtyを型で保持 |
| `candidateDigest` | `Sha256Digest` | tested payload |
| `catalogDigest` | `Sha256Digest` | expected contract |
| `challenge` | `PiEvidenceChallengeReference | null` | formal runは必須 |
| `receipts` | `ExecutionReceiptSet` | actual process/observable |
| `originAttestation` | `RunOriginAttestation | null` | formal runは必須 |
| `status` | `complete | incomplete` | completeだけverification候補 |
| `bundleDigest` | `Sha256Digest` | manifest+receipt digest |

### FormalPiConformanceEvidence

independent verifierだけが構築できるaggregate root。

| Field | Type | Rule |
|---|---|---|
| `evidenceId` | `EvidenceRootDigest` | canonical content address |
| `verifiedSource` | `CleanSourceFingerprint` | dirty不可 |
| `contractDigest` | `Sha256Digest` | trusted catalogと一致 |
| `acceptedRuns` | `AcceptedRunReferenceSet` | skip/failure/incomplete不可 |
| `coverage` | `VerifiedCoverageGraph` | registry全IDをcover |
| `auditChains` | `VerifiedAuditSubchainSet` | required canonical event chain |
| `originChains` | `VerifiedRunOriginChainSet` | challenge→recorder→CI/operator |
| `redaction` | `VerifiedRedactionReceipt` | pass必須 |
| `verifiedAt` | `IsoTimestamp` |合否の根拠には使わない |
| `verificationReceipt` | `EvidenceVerificationReceipt` |別process再検証結果 |

## Environment と source value objects

### FormalEvidenceTrustPolicy

信頼根のpublic情報だけを持つimmutable value object。

| Field | Type | Rule |
|---|---|---|
| `challengeIssuers` | `TrustedKeyFingerprintSet` | SSH/Ed25519 public key、自己署名fallbackなし |
| `recorderDigests` | `Sha256DigestSet` | 同一source revisionからbuildした許可binary |
| `ciWorkloads` | `TrustedCiWorkloadIdentitySet` | OIDC issuer、repository、workflow ref、subject条件 |
| `tuiOperators` | `TrustedSshSignerSet` | operator public-key fingerprintとrole |
| `signatureAlgorithms` | `AllowedSignatureAlgorithmSet` | downgrade不可 |
| `challengeTtl` | `BoundedDuration` | issued/expiry検査 |

private signing key、CI token、provider credentialはmodel外でありrepositoryに保存しない。

### PiEvidenceChallenge

challenge issuerがrun前に署名するvalue object。`challengeId`、256-bit nonce、run ID/kind、expected OS、source commit、candidate/catalog/test-source/Pi executable/recorder digest、recorder ephemeral public key、issuedAt/expiresAt、issuer key ID、issuer signatureを持つ。canonical payloadに一項目でも差分があればsignature validationに失敗する。

### ChallengeLedgerEntry

```text
ChallengeLedgerEntry =
  | Issued(challengeDigest, issuedAt, expiresAt)
  | Consumed(challengeDigest, bundleDigest, consumedAt)
  | Expired(challengeDigest, expiredAt)
```

`Issued → Consumed`はatomic compare-and-swapで一度だけ可能。`Consumed`からの再遷移、別bundle digestでの再利用、ledger欠落はformal rejection。

### RunOriginAttestation

```text
RunOriginAttestation =
  | CiOriginAttestation(challenge, recorderSignature, oidcArtifactAttestation)
  | TuiOriginAttestation(challenge, recorderSignature, operatorSshSignature)
  | UnattestedDevelopmentOrigin(reason)
```

CI attestationはbundle digest、commit、runner OS、repository/workflow/run identityを含む。TUI attestationはbundle/challenge digest、observed OS、interactive checklist completionをoperatorが署名する。development variantは`AcceptedRunReference`を構築できない。

### EnvironmentFingerprint

`os`、`arch`、Pi version、resolved executable digest、Bun version、provider identifier、live flag名、credential source kindを持つ。credential値、username、home pathを持たない。formal positiveは`os ∈ {darwin, linux}`かつPi semver>=0.83.0だけ。

### SourceFingerprint

```text
SourceFingerprint =
  | CleanSource(commit, candidateDigest, catalogDigest, testSourceDigest)
  | DirtySource(commit, trackedDiffDigest, untrackedPathDigest)
```

dirty内容自体をevidenceへコピーしない。`DirtySource`はdevelopment debuggingに使えるがformal policyへ入れない。

## Test inventory model

### UnitTestInventory

Unit ID、inventory schema/source revision/digest、`TestInventoryEntrySet`を持つ。owner Unitだけがentryを定義し、conformance Unitは実行・参照だけを行う。

### TestInventoryEntry

| Field | Type | Description |
|---|---|---|
| `testId` | `PiTestId` | 全Unitで一意 |
| `ownerUnit` | `PiUnitId` | test asset owner |
| `selector` | `RepositoryRelativeTestSelector` | 実行可能な既存Bun test selector |
| `tier` | `contract | integration | e2e | benchmark | live | dogfood` | 実行条件 |
| `requirements` | `RequirementIdSet` | coverする正準ID |
| `observables` | `ObservableExpectationSet` | process外で検証する事実 |
| `environmentPolicy` | `TestEnvironmentPolicy` | deterministic/live/OS/provider条件 |
| `terminalPolicy` | `ExpectedTerminalPolicy` | exit/signal/typed result |

entryは結果statusを持たない。selector path root escape、duplicate test ID、unknown requirement、observable空集合をparse時に拒否する。

## Journey model

### ConformanceJourneyPlan

journey ID、preconditions、ordered steps、cleanup、requirements、observable predicateを持つimmutable value object。stepのcommandはargv token列で保持し、shell補間文字列やsecretを含めない。

### JourneyStep

`setup`、`spawn`、`rpc-send`、`wait-event`、`snapshot`、`assert`、`shutdown`のdiscriminated union。各stepはdeadlineとfailure terminalを持ち、errorをsuccessへ丸めない。`rpc-send`はhuman provenanceを生成できない型である。

## Receipt model

### ExecutionReceipt

```text
ExecutionReceipt =
  | ProcessExecutionReceipt
  | FileSnapshotReceipt
  | AuditObservationReceipt
  | StateObservationReceipt
  | CounterObservationReceipt
  | RedactionScanReceipt
  | HumanTuiReceipt
  | SkipReceipt
```

すべてrun ID、receipt ID、source artifact digest、start/endまたはobservation boundaryを持つ。

### ProcessExecutionReceipt

executable digest、redacted argv、repository-relative cwd、start/end、exit code、signal、stdout/stderr digest、timeout/cancel/reap stateを持つ。output excerptはredaction pass後だけ保存する。

### ObservableAssertion

expected predicate、observed typed value、source receipt IDs、verdictを持つ。verdictは`evaluate(expected, observed)`から導出し、runnerが直接指定できない。

### LiveRunResult

```text
LiveRunResult =
  | LiveSucceeded(VerifiedLiveRun)
  | LiveFailed(LiveFailureReceipt)
  | LiveCancelled(CancellationReceipt)
  | SkippedLiveRun(SkipReason, EnvironmentObservation)
```

`SkippedLiveRun`は`AcceptedRunReference` interfaceを実装しない。開始後のRPC/protocol/model/assertion failureをskipへ変換しない。

### TuiDogfoodReceipt

| Field | Type | Rule |
|---|---|---|
| `runId` | `ConformanceRunId` | environment内一意 |
| `environment` | `SupportedEnvironmentFingerprint` | darwin/linux |
| `nonce` | `ConsumedInteractiveNonce` | 1回限り |
| `humanTurnEvent` | `CanonicalEventReference` | source=interactive |
| `gateEvent` | `CanonicalEventReference` | HUMAN_TURN後、same gate |
| `continuationEvent` | `CanonicalEventReference` | settled後、exactly once |
| `checklist` | `TuiChecklistObservationSet` | UI journey全項目 |
| `auditSubchainDigest` | `Sha256Digest` | session/runに束縛 |
| `recorderKeyId` | `EphemeralRunPublicKey` | challengeに束縛 |
| `recorderSignature` | `DetachedSignature` | receipt+bundle+challenge digest |
| `operatorSignature` | `SshSignature` | bundle/OS/checklist completion |

recorderはTUI input textを保持せず、interactive event metadataとcanonical resultだけを保持する。

## Coverage graph

### RequirementContract

正準ID、kind(M/SCN/FR/NFR)、pass predicate、required evidence tier、source referenceを持つ。ID setはrequirements artifactからpackage時に生成され、evidence packから導出しない。

### VerifiedCoverageEdge

requirement ID、accepted run ID、test/journey ID、observable assertion IDsを結ぶ。単に「test Xがcover」と宣言するだけのedgeは無効で、合格したobservable receiptを最低1件必要とする。

### VerifiedCoverageGraph

`RequirementContractSet`とedge setをaggregateとして持ち、missing requirement、unknown requirement、edge without accepted receipt、formal policy不一致を拒否する。

## Audit verification model

### CanonicalAuditSubchain

run/session/parent-child/gate identityでfilterしたcanonical eventのordered collection。event key、fingerprint、previous digest、payload digestからsubchain digestを再計算する。

### AuditChainExpectation

journeyごとにrequired event、cardinality、partial order、identity joinを定義する。例:

- RPC gate negative: `HUMAN_TURN=0`、`GATE_APPROVED=0`
- TUI gate positive: `interactive HUMAN_TURN=1` → `GATE_APPROVED=1` → settled後continuation=1
- child terminal: parent start → child/session identity → terminal exactly one

## Formal eligibility types

### AcceptedRunReference

verified bundle digest、run kind、source/environment fingerprint、verification receipt ID、verified origin chain IDを持つ。clean source、complete bundle、all assertions pass、trusted challenge issuer、recorder signature、CI artifact attestationまたはoperator signature、challenge atomic consumptionを構築条件にする。

### VerifiedRunOriginChain

challenge issuer key→signed challenge→ephemeral recorder public key→recorder-signed bundle→CI workload attestationまたはoperator SSH signature→consumed ledger entryの順に検証済み参照を持つ。各linkは前linkのdigestを含む。self-signed key、unknown signer、wrong workload、expired/replayed challenge、OS/source/executable/digest mismatchを構築時に拒否する。

### FormalEvidencePolicy

次をfirst-class collectionで保持する。

- required deterministic journey/test ID set
- required TUI OS set `{darwin, linux}`
- minimum live RPC green count `1`
- required negative scenario ID set
- required redaction/audit/catalog verifier ID set

件数1はFR-VAL-002の明示targetであり、その他の集合は正準catalogから導出する。

## State transitions

```text
planned → running → complete → verified → accepted
             │          │          │
             ├→ failed ─┴──────────┘
             ├→ cancelled
             └→ incomplete

live preflight → skipped
live started ─X→ skipped
unattested complete → development-only
```

`skipped`はlive preflightからだけ遷移可能。process spawn後はsuccess/failure/cancel/incompleteのいずれかで、skipへ戻れない。attestationのないcomplete runはdevelopment-onlyでありacceptedへ遷移しない。formal evidenceはaccepted runだけを集約する。

## Ownership

- 各実装 Unit: 自身のfixture/test/benchmark inventoryと局所observable。
- conformance Unit: cross-unit journey、live RPC driver、TUI recorder、catalog aggregation、coverage graph、evidence assembler/verifier。
- 人間: macOS/Linux TUIでinteractive gateを実行し、TUI内のnonce付きevidence commandを確定。
- provider/environment: credentialとmodel availabilityを供給。evidenceへsecretを渡さない。

## 不変条件

1. trusted catalogとraw receiptがなければformal evidenceを構築できない。
2. skip/failure/cancel/incomplete/dirty runはAcceptedRunReferenceにならない。
3. RPC inputはHumanTuiReceiptを生成できない。
4.同一source/catalog digestでmacOS/Linux TUIと最低1 live greenが必要。
5. coverage edgeは実observable assertionへ到達する。
6. evidence verifierはassemblerのsummary/statusを信頼せず全digestとpredicateを再計算する。
7. formal accepted runは事前発行single-use challenge、trusted recorder、CI/operator attestationの検証済み起源chainを持つ。
