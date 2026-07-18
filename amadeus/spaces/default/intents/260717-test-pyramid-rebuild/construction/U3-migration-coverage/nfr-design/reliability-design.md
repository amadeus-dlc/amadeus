上流入力(consumes 全数): performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, tech-stack-decisions.md, business-logic-model.md

# 信頼性設計 — U3 移設選定台帳と層別カバレッジ整合計画

本設計は `performance-requirements.md` の閉じた決定表、`security-requirements.md` のfail-closed、`scalability-requirements.md` の安定順序、`reliability-requirements.md` の再現性、`tech-stack-decisions.md` のEvidence/coverage状態、および `business-logic-model.md` の選定・整合フローを論理resultへ落とす。

## REL-D1: atomic な論理result

質問Q2の決定により、U3 planning全体の論理resultを次の3 variantに閉じる。具体的なexported型名、serialization、stderr、exit code、CI赤化は後続実装へ残すが、variantの意味とfield有無は変えない。

```text
AuditEventRef = {
  path: LogicalRepoPath,
  eventTimestamp: ISO8601,
  eventOrdinal: non-negative-integer
}

ApprovalProof = verified-human-turn {
  approvedAt: ISO8601,
  auditRef: AuditEventRef,
  approvedDigest: Sha256Digest
}

EvidenceRef = {
  payloadPath: LogicalRepoPath,
  schemaVersion: 1,
  observedRef: string,
  evidenceDigest: Sha256Digest,
  approval: ApprovalProof
}

BucketCount = { signals: KnownSignal[]; count: non-negative-integer }

PlanningObservation = {
  observedRef: string,
  totalRows: non-negative-integer,
  unitNonSmallCount: non-negative-integer,
  bucketCounts: BucketCount[],
  signalCounts: {
    network: non-negative-integer,
    spawn: non-negative-integer,
    filesystem: non-negative-integer,
    timer: non-negative-integer
  },
  reviewCount: non-negative-integer,
  migrationCount: non-negative-integer
}

ReviewQueueItem = {
  file: LogicalRepoPath,
  measured: "medium" | "large",
  signals: KnownSignal[],
  finalState: "classification-review"
}

MigrationQueueItem = {
  file: LogicalRepoPath,
  measured: "medium" | "large",
  signals: KnownSignal[],
  finalState: "seam-to-small" | "retier-to-integration" | "retier-to-e2e",
  rank: 0 | 1
}

CoverageTierBinding<TierName: NamedTier> = {
  tier: TierName,
  ledgerKeys: LedgerKey[],
  pathState: PathState,
  ciParticipation: CiParticipation
}

AuxiliaryCoverageObservation = {
  tier: Tier excluding NamedTier,
  pathState: not-applicable(reason),
  ciParticipation: not-applicable
}

CoveragePlan = {
  combinedObservation: {
    pathState: existing("coverage/lcov.info"),
    ciParticipation: executed
  },
  bindings: readonly [
    CoverageTierBinding<"unit">,
    CoverageTierBinding<"integration">,
    CoverageTierBinding<"e2e">,
    CoverageTierBinding<"smoke">
  ],
  auxiliaryObservations: AuxiliaryCoverageObservation[]
}

U3PlanningResult =
  | { kind: "invalid-input"; diagnostics: readonly [PlanInputFailure, ...PlanInputFailure[]] }
  | {
      kind: "open-review",
      evidenceRef: EvidenceRef,
      observation: PlanningObservation,
      reviewQueue: readonly [ReviewQueueItem, ...ReviewQueueItem[]],
      migrationQueue: readonly MigrationQueueItem[],
      coveragePlan: CoveragePlan
    }
  | {
      kind: "ready",
      evidenceRef: EvidenceRef,
      observation: PlanningObservation,
      reviewQueue: readonly [],
      migrationQueue: readonly MigrationQueueItem[],
      coveragePlan: CoveragePlan
    }
```

`LedgerKey` はmatrixに実在する `${NamedTier}_${TestSize}`、`PathState` と `CiParticipation` はTECH-4の閉じたunionである。各bindingはtuple位置と同じtierだけを許す。補助観測はU1 ledgerに実在する非NamedTierをfile code-unit順で過不足なく持ち、現行はharness/libである。

`invalid-input` は1件以上のdiagnosticsだけを持ち、observation、reviewQueue、migrationQueue、coveragePlanを持たない。`open-review` のmigrationQueueは確定候補の可視化に限り、result kindがreadyでないためactionableではない。`ready` は空のreviewQueueを構造的に示し、このvariantだけを後続移設intentの入力にできる。

EvidenceRefは具体payload生成後の別HUMAN_TURNをAudit Approval Resolverが検証した場合だけ構成できる。今回のQ1/Q3の設計方針承認からは構成しない。`payloadPath` は実在するversioned EvidencePayload artifactへのrepository相対pathであり、本intentは将来path名を発明しない。

## REL-D2: 閉じた input failure

```text
PlanInputFailure =
  | ledger-not-complete
  | ledger-invalid { reason: observed-ref-empty | row-invariant | candidate-signals-empty }
  | payload-invalid { reason: not-object | observed-ref-invalid | candidates-not-array }
  | schema-version-unsupported
  | payload-digest-invalid
  | payload-digest-mismatch
  | approval-missing
  | approval-reference-invalid
  | approval-reference-unresolvable
  | approval-not-human
  | approval-digest-mismatch
  | payload-ref-mismatch
  | candidate-invalid { candidateIndex, reason: not-object | signals-not-array }
  | candidate-schema-version-unsupported { candidateIndex }
  | candidate-ref-mismatch { candidateIndex }
  | candidate-file-invalid { candidateIndex }
  | candidate-missing { file: LogicalRepoPath }
  | candidate-unexpected { file: LogicalRepoPath }
  | candidate-duplicate { file: LogicalRepoPath }
  | signal-invalid { candidateIndex, signalIndex }
  | signal-unknown { candidateIndex, signalIndex }
  | signal-missing { file: LogicalRepoPath, signal: KnownSignal }
  | signal-unexpected { file: LogicalRepoPath, signal: KnownSignal }
  | signal-duplicate { file: LogicalRepoPath, signal: KnownSignal }
  | locator-invalid { candidateIndex, signalIndex }
  | locator-file-mismatch { file: LogicalRepoPath, signal: KnownSignal }
  | locator-unresolvable { file: LogicalRepoPath, signal: KnownSignal }
  | fact-invalid { file: LogicalRepoPath, signal: KnownSignal }
  | disposition-invalid { candidateIndex, signalIndex }
```

`KnownSignal` の値と順序は `network → spawn → filesystem → timer` とする。各failureのpredicateを次で閉じる。

| Failure | exact predicate |
| --- | --- |
| ledger-not-complete | U1 outcome tagがcompleteでない |
| ledger-invalid | complete ledgerのobserved refが空、U1 row/matrix不変条件違反、またはunit非small行のsignalsが空 |
| payload-invalid | payloadがobjectでない、observedRefがnon-empty stringでない、またはcandidatesがarrayでない |
| schema-version-unsupported | payload.schemaVersionが1でない |
| payload-digest-invalid / mismatch | digestがSHA-256形式でない / canonical payload再計算値と不一致 |
| approval-missing | ApprovalProof入力がない |
| approval-reference-invalid | auditRefのpath/timestamp/ordinalが型契約を満たさない |
| approval-reference-unresolvable | auditRefに一致するeventがappend-only auditに存在しない |
| approval-not-human | eventが実ユーザー入力由来のHUMAN_TURNでない |
| approval-digest-mismatch | eventが明示したdigest、proof.approvedDigest、payload digestのいずれかが不一致 |
| payload-ref-mismatch | payload.observedRefとledger.observedRefが不一致 |
| candidate-invalid | candidateがobjectでない、またはsignalsがarrayでない |
| candidate-schema-version-unsupported | CandidateEvidence.schemaVersionが1でない |
| candidate-ref-mismatch | CandidateEvidence.observedRefがpayload.observedRefと不一致 |
| candidate-file-invalid | CandidateEvidence.fileがLogicalRepoPathでない |
| candidate-missing / unexpected / duplicate | ledger候補にあるfileがpayloadにない / payloadだけにあるvalid file / payload内に同じvalid fileが複数ある |
| signal-invalid | SignalEvidence配列要素がobjectでない |
| signal-unknown | SignalEvidence.signalがKnownSignalでない |
| signal-missing / unexpected / duplicate | ledgerの当該signalに対応するevidenceがない / ledgerにないKnownSignal evidenceがある / 同じKnownSignal evidenceが複数ある |
| locator-invalid | locatorのpath/正整数line/`startLine <= endLine` が型契約を満たさない |
| locator-file-mismatch | valid locator.fileとCandidateEvidence.fileが不一致 |
| locator-unresolvable | observed refの対象fileに指定line範囲が存在しない |
| fact-invalid | factがstringでない、trimした結果が空、CR/LFを含む、またはC0制御文字を含む |
| disposition-invalid | dispositionが4値unionに属さない |

invalid raw path/signal/disposition/fact/sourceは診断へ複製しない。診断のtotal sort keyを次に固定する。

- global variants: `[0, globalKindRank, globalDetailRank]`。globalKindRankは上記unionの宣言順、globalDetailRankはledger-invalidまたはpayload-invalidなら各reasonの宣言順、それ以外は0。
- index-located variants（candidate-invalid/schema/ref/file、signal-invalid/unknown、locator-invalid、disposition-invalid）: `[1, candidateIndex, signalIndexOrMinus1, kindRank, detailRank]`。indexはraw payload配列のzero-based位置、detailRankはcandidate-invalidならreasonの宣言順、それ以外は0。
- safe-file variants（candidate集合、signal集合、locator-file/unresolvable、fact）: `[2, fileCodeUnit, knownSignalRankOrMinus1, kindRank]`。

この3つのtuple familyはscope先頭値で交差せず、各family内も全fieldでtie-breakする。同一predicate・同一keyのdiagnosticは1件へdeduplicateしてからsortするため、ledgerに存在しないunexpected候補やinvalid fileを含めて全diagnosticsを一意に順序付ける。

全failureを安全に収集して返してよいが、1件でもあれば即座にresultはatomic `invalid-input` となり、正常候補のpartial queueを返さない。構造的にvalidだが判断未確定な `unknown|lexical-false-positive` はfailureでなくclassification-reviewであり、両者を混ぜない。

## REL-D3: admission と分類順序

処理順を次に固定する。

1. U1 outcomeがcomplete、ledger refがnon-empty、行不変条件がvalidであることを確認する。
2. EvidencePayloadのschema/ref/fieldをparseし、canonical payloadをSHA-256で再計算してevidenceDigestと一致させる。
3. Audit Approval Resolverがpayload生成後の別HUMAN_TURNを解決し、human originとevent digestを検証したbranded ApprovalProofを構成する。解決不能ならfailureを返す。
4. unit非small候補file集合とCandidateEvidence集合、各ledger signalsとSignalEvidence集合の全単射を確認する。unit非smallなのにsignalsが空の行はledger-invalidとする。
5. locator/fact/dispositionを上表のpredicateで検証し、failureがあればtotal sortしてinvalid-inputを返す。
6. valid evidenceだけを次の順で分類する。
   - unknownまたはlexical-false-positiveあり → classification-review
   - behavior-essential networkあり → retier-to-e2e
   - essential networkなし、behavior-essential spawn/timerあり → retier-to-integration
   - 全signalがseam-removable → seam-to-small
   - その他（例: behavior-essential filesystem）→ classification-review
7. observation、queue、coverage planを投影し、reviewQueue非空ならopen-review、空ならreadyを返す。

## REL-D4: 不変条件

- `observation.unitNonSmallCount = reviewQueue.length + migrationQueue.length` はvalid resultでだけ成立し、両queueのfile集合は排他的である。
- `observation.totalRows = ledger.rows.length`、`sum(bucketCounts.count) = observation.unitNonSmallCount` である。各bucket内のsignalsはKnownSignal順、bucket配列はsignals配列のlexicographic順とする。
- `observation.signalCounts` は全候補のemitted signal出現数を種類別に数え、`reviewCount` / `migrationCount` は各queue.lengthと一致する。signalCountsの総和はunitNonSmallCountと一致しなくてよい。
- 1 candidateはfinal stateをちょうど1つ持つ。review stateはrankなし、migration stateはseam=0またはretier=1だけを持つ。
- `ready ⇔ reviewQueue.length = 0`。open-reviewのmigrationQueueはactionableでない。
- ApprovalProofはpayload生成後の別HUMAN_TURNがschemaVersion・observedRef・候補集合全体のcanonical digestを承認した証拠であり、refまたは内容変更で失効する。
- EvidenceRefはpayloadPath、schemaVersion、observedRef、digest、verified proofを保持する。候補ごとのevidence/final state/queue/rankはversioned payloadとqueueが保持し、coveragePlanがledgerKeys/path/CI状態を保持する。
- 同じledger、EvidencePayload、verified ApprovalProofから同じdiagnostics、observation、final states、queue、rank、順序、ledgerKeysを得る。
- 現measurement refの回帰oracleは全442、unit非small163、排他的bucket合計163、signal出現数254であるが、result型へ固定しない。

## REL-D5: coverage plan の完全性

valid resultのcoveragePlanは、binding外のcombined観測1件と、4 NamedTier bindingをexact順 `unit|integration|e2e|smoke` で持つ。各bindingのledgerKeysは重複せず、該当tierのcount>0なmatrix keyを `small|medium|large` 順で過不足なく持つ。

状態は次に固定する。

| 対象 | PathState | CiParticipation |
| --- | --- | --- |
| combined観測 | existing(`coverage/lcov.info`) | executed |
| unit/integration/smoke binding | pending(follow-up) | executed |
| e2e binding | pending(follow-up) | not-executed |
| harness/lib補助観測 | not-applicable(標準runner外) | not-applicable |

pending ownerは番号未定のper-tier coverage follow-upであり、閉鎖済みIssue #683へ付け替えない。実在pathとCI実行証拠が別々に得られるまで状態を独立更新する。

## REL-D6: 回復と適用外

invalid-inputは根本のledger/evidence/approvalを修正し、同一pipelineを全体再実行して回復する。open-reviewは `EvidencePayload` を更新し、その新しいcanonical digestを別HUMAN_TURNで承認した `ApprovalProof` を得てから再評価する。localで決定的な入力不正へretry、backoff、fallback、circuit breakerを追加しない。

常駐service、request path、永続store、remote dependencyがないためavailability SLO、RTO/RPO、backup、replication、multi-AZ、health endpoint、failoverはN/Aである。監査はversioned artifactsと既存auditに限定する。
