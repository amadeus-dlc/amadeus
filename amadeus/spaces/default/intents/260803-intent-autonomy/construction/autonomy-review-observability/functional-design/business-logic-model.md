# Business Logic Model — autonomy-review-observability

## 上流入力と設計範囲

本設計は`units-generation/unit-of-work.md`、`units-generation/unit-of-work-story-map.md`、`requirements-analysis/requirements.md`、`application-design/components.md`、`application-design/component-methods.md`、`application-design/services.md`を正本とする。対象はU4 `autonomy-review-observability`、FR-OBS-001〜007、2067-AC18〜21、およびU4へ割り当てられたstatus / privacy / telemetry contractである。

実装範囲はM05 decision record / query refinement、M07 read model・protected review append・status・Event Registry / OTel、M06 CLI projection / UX、M09の5 harness contract snapshotである。U3のimmutable `AutoDecisionRecord`を消費し、Intent reopen、rollback、過去event変更、新Intent自動作成、terminal live completionを所有しない。

## Public contract refinement

| Contract | U4 refinement | Owner |
|---|---|---|
| `DecisionQuery` | explicit Intent UUID、lifecycle、review state、stable cursorを束縛 | M05 / M07 |
| `DecisionDetail` | question / options / selected / decider / basis / grant / redacted evidence / degradation / reviewを返す | M05 |
| `DecisionReviewCommand` | target Intent、decision、choice、flag metadataを同じreal human turnへ束縛 | M06 / M07 |
| `DecisionReviewProjection` | unreviewed / accepted / flaggedとreview event identityを保持 | M05 / M07 |
| `PostSealReviewExtension` | completed sealを変更せずreview eventだけをhash-chain append | M07 |
| `RemediationSuggestion` | self-fix / self-featureの非実行提案を返す | M06 |
| `MachineStatus` | mode / workflow / grant / stop / resume / unreviewed countをstrict schemaで返す | M07 |

U4は上流の概念的APIを次のclosed public schemaへ具体化する。`StableId`、`Sha256Digest`、`AutonomyMode`、`WorkflowExecutionState`、`GrantState`、`VerifiedHumanTurn`、`AuditEventPlan`、`CanonicalAuditEvent`、`AuditCommitReceipt`、`AutoDecisionRecord`、`AutonomyProjection`、`WorkflowResult`、`ResumeCondition`、`ContractError`、`ContractResult<T>`は上流M00 / M04 / M05 / M07の定義をそのまま使う。既存`AutoDecisionRecord`はprotected reducer inputに留め、public read APIからraw payloadを返さない。

```ts
type DecisionSourceKind = AutoDecisionRecord["decider"];
type DecisionReviewState = AutoDecisionRecord["reviewState"];
type ReviewChoice = "accept" | "flag";
type IntentLifecycle = "active" | "completed";
type RedactionStatus = "redacted" | "withheld";

type SafeDecisionOption = {
  optionId: StableId;
  safeLabel: string | null;
  labelDigest: Sha256Digest | null;
  redactionStatus: RedactionStatus;
};
type SafeEvidenceReference = {
  evidenceFingerprint: Sha256Digest | null;
  safeKind: StableId;
  redactionStatus: RedactionStatus;
};
type SafeSubjectReference = {
  subjectRef: StableId | null;
  redactionStatus: RedactionStatus;
};
type DecisionReviewReceipt = {
  reviewId: StableId;
  reviewEventId: StableId;
  auditTransactionId: StableId;
  committedEventIdentities: readonly [StableId];
  stateProjectionRevision: number;
  state: "accepted" | "flagged";
  remediation: "self-fix" | "self-feature" | "self-fix-with-feature-alternative" | null;
};
type DecisionSummary = {
  intentUuid: StableId;
  decisionId: StableId;
  questionId: StableId;
  occurrenceId: StableId;
  safeQuestion: string | null;
  questionDigest: Sha256Digest | null;
  selectedOptionId: StableId;
  decisionSource: DecisionSourceKind;
  safeBasisDigest: Sha256Digest | null;
  decisionPrincipal: SafeSubjectReference;
  decisionActor: SafeSubjectReference;
  grantId: StableId | null;
  evidenceFingerprint: Sha256Digest | null;
  degradedCapability: StableId | null;
  reviewState: DecisionReviewState;
  redactionStatus: RedactionStatus;
};
type DecisionCursor = {
  intentUuid: StableId;
  queryFingerprint: Sha256Digest;
  targetAuditRevision: number;
  reviewExtensionHead: StableId | null;
  projectionEventSetDigest: Sha256Digest;
  lastOccurrenceId: StableId;
  lastDecisionId: StableId;
  cursorDigest: Sha256Digest;
};
type DecisionQuery = {
  intentUuid: StableId;
  lifecycle: IntentLifecycle | "either";
  reviewState?: DecisionReviewState;
  pageSize: number;
  cursor?: DecisionCursor;
};
type DecisionPage = {
  items: readonly DecisionSummary[];
  nextCursor: DecisionCursor | null;
  queryFingerprint: Sha256Digest;
};
type DecisionDetail = DecisionSummary & {
  options: readonly SafeDecisionOption[];
  evidence: readonly SafeEvidenceReference[];
  graphRevision: Sha256Digest;
  auditEventId: StableId;
  reviewReceipt: DecisionReviewReceipt | null;
};

type HumanReviewCommandBinding = {
  sourceIntentUuid: StableId;
  targetIntentUuid: StableId;
  decisionId: StableId;
  choice: ReviewChoice;
  commandOccurrenceId: StableId;
  flagClassification: "contract-defect" | "specification-change" | "unspecified" | null;
  safeNoteDigest: Sha256Digest | null;
};
type HumanReviewTurnBindingPayloadV1 = HumanReviewCommandBinding & {
  schemaVersion: "1";
  sourceHumanTurnId: StableId;
  commandBindingDigest: Sha256Digest;
};
type HumanReviewAuthorizationInput = {
  command: HumanReviewCommandBinding;
  sourceHumanTurnId: StableId;
  sourceHumanTurnEventId: StableId;
};
type HumanReviewAuthorizationReceipt = HumanReviewCommandBinding & {
  sourceHumanTurnId: StableId;
  sourceHumanTurnEventId: StableId;
  sourceAuditRevision: number;
  principalId: StableId;
  reviewActorId: StableId;
  commandBindingDigest: Sha256Digest;
};
type CanonicalReviewSourceSnapshot = {
  sourceIntentUuid: StableId;
  lifecycle: "active";
  sourceProjectionRevision: number;
  humanTurn: VerifiedHumanTurn;
  humanTurnEvent: CanonicalAuditEvent;
  humanTurnCommitReceipt: AuditCommitReceipt;
};
type CanonicalReviewSourceReader = {
  readActiveSource(
    sourceIntentUuid: StableId,
    sourceHumanTurnId: StableId,
    sourceHumanTurnEventId: StableId,
  ): ContractResult<CanonicalReviewSourceSnapshot>;
};
type RegisteredDecisionActor = {
  actorRef: StableId;
  actorRegistryEntryId: StableId;
  kind: "core-engine" | "harness-adapter";
};
type DecisionActorRegistryReader = {
  readRegisteredActor(actorRegistryEntryId: StableId): ContractResult<RegisteredDecisionActor>;
};
type CanonicalAutonomyProvenanceSnapshot = {
  intentUuid: StableId;
  audit: readonly CanonicalAuditEvent[];
  auditRevision: number;
  stateProjectionRevision: number;
};
type CanonicalAutonomyProvenanceReader = {
  readIntentSnapshot(intentUuid: StableId): ContractResult<CanonicalAutonomyProvenanceSnapshot>;
};
type AutoDecisionPrincipalAuthorizationReceipt =
  | {
      schemaVersion: "1";
      kind: "mode-semi";
      intentUuid: StableId;
      decisionId: StableId;
      occurrenceId: StableId;
      principalRef: StableId;
      principalProvenanceEventId: StableId;
      sourceAuditRevision: number;
      modeProjectionRevision: number;
      gateOccurrenceId: StableId;
      grantId: null;
      grantExerciseId: null;
      receiptDigest: Sha256Digest;
    }
  | {
      schemaVersion: "1";
      kind: "full-grant";
      intentUuid: StableId;
      decisionId: StableId;
      occurrenceId: StableId;
      principalRef: StableId;
      principalProvenanceEventId: StableId;
      sourceAuditRevision: number;
      modeProjectionRevision: number;
      gateOccurrenceId: null;
      grantId: StableId;
      grantExerciseId: StableId;
      receiptDigest: Sha256Digest;
    };
type AutoDecisionPrincipalAuthorizationRequest = {
  intentUuid: StableId;
  decisionId: StableId;
  occurrenceId: StableId;
  authorization: AutoDecisionCommitAuthorization;
};
type AutoDecisionPrincipalAuthorizer = {
  authorize(
    request: AutoDecisionPrincipalAuthorizationRequest,
  ): ContractResult<AutoDecisionPrincipalAuthorizationReceipt>;
  verify(
    receipt: AutoDecisionPrincipalAuthorizationReceipt,
  ): ContractResult<AutoDecisionPrincipalAuthorizationReceipt>;
};
type AutoDecisionSubjectInput = {
  intentUuid: StableId;
  decisionId: StableId;
  actorRegistryEntryId: StableId;
};
type AutoDecisionSubjectPayloadV1 = {
  schemaVersion: "1";
  authorizationKind: AutoDecisionPrincipalAuthorizationReceipt["kind"];
  principalRef: StableId;
  principalProvenanceEventId: StableId;
  principalAuthorizationReceiptDigest: Sha256Digest;
  sourceAuditRevision: number;
  actorRef: StableId;
  actorRegistryEntryId: StableId;
  actorKind: RegisteredDecisionActor["kind"];
};
type AutoDecisionCommitAuthorization =
  | {
      kind: "mode-semi";
      intentUuid: StableId;
      modeProjectionRevision: number;
      modeProvenanceEventId: StableId;
      gateOccurrenceId: StableId;
    }
  | {
      kind: "full-grant";
      exercise: ReservedGrantExercise;
    };
type AutoDecisionCommitInput = {
  decision: AutoDecisionRecord;
  principalAuthorization: AutoDecisionPrincipalAuthorizationReceipt;
  subject: AutoDecisionSubjectInput;
};
type AutoDecisionCommitPlan = AuditEventPlan & {
  eventType: "AUTO_DECIDED";
  eventIdentity: StableId;
  intentUuid: StableId;
  fields: {
    decision_v1: string;
    subject_v1: string;
  };
};
type AutoDecisionCommitPlanner = {
  plan(input: AutoDecisionCommitInput): ContractResult<AutoDecisionCommitPlan>;
};
type DecisionReviewCommand = {
  targetIntentUuid: StableId;
  decisionId: StableId;
  choice: ReviewChoice;
  expectedTargetAuditRevision: number;
  expectedCompletionSealDigest: Sha256Digest | null;
  humanAuthorization: HumanReviewAuthorizationReceipt;
};
type AutoDecisionReviewedPayloadV1 = {
  schemaVersion: "1";
  targetIntentUuid: StableId;
  decisionId: StableId;
  reviewId: StableId;
  choice: ReviewChoice;
  reviewPrincipalRef: StableId;
  reviewActorRef: StableId;
  decisionPrincipalRef: StableId | null;
  decisionPrincipalStatus: RedactionStatus;
  decisionActorRef: StableId | null;
  decisionActorStatus: RedactionStatus;
  decisionSource: DecisionSourceKind;
  safeBasisDigest: Sha256Digest | null;
  grantId: StableId | null;
  sourceIntentUuid: StableId;
  sourceHumanTurnId: StableId;
  sourceHumanTurnEventId: StableId;
  commandOccurrenceId: StableId;
  commandBindingDigest: Sha256Digest;
  auditTransactionId: StableId;
  receiptProjectionRevision: number;
  lifecycleAtReview: IntentLifecycle;
  remediation: DecisionReviewReceipt["remediation"];
  flagClassification: HumanReviewCommandBinding["flagClassification"];
  safeNoteDigest: Sha256Digest | null;
  redactionStatus: RedactionStatus;
};
type AutoDecisionReviewedEventPlan = {
  eventType: "AUTO_DECISION_REVIEWED";
  eventIdentity: StableId;
  intentUuid: StableId;
  payload: AutoDecisionReviewedPayloadV1;
  payloadDigest: Sha256Digest;
};
type PostSealReviewExtension = {
  schemaVersion: "1";
  targetIntentUuid: StableId;
  completionSealDigest: Sha256Digest;
  previousExtensionId: StableId | null;
  reviewEventId: StableId;
  reviewPayloadDigest: Sha256Digest;
  auditTransactionId: StableId;
  extensionRevision: number;
  extensionId: StableId;
};

type DecisionReviewCounts = {
  total: number;
  unreviewed: number;
  accepted: number;
  flagged: number;
};
type SafeGrantScopeSummary = {
  scopeFingerprint: Sha256Digest;
  selfScopeId: StableId;
  allowedInteractionKinds: readonly ("stage-gate" | "phase-gate" | "walking-skeleton" | "question")[];
};
type SafeMigrationDiagnostic = {
  status: "legacy-non-authoritative";
  legacyGrantIds: readonly StableId[];
  recommendedHumanAction: "select-none" | "select-semi" | "issue-full";
};
type ReviewStatusInput = {
  intentUuid: StableId;
  lifecycle: IntentLifecycle;
  autonomy: AutonomyProjection;
  workflowResult: WorkflowResult | null;
  currentGrantScope: SafeGrantScopeSummary | null;
  decisionPolicyCount: number;
  decisionCounts: DecisionReviewCounts;
  reviewExtensionHead: StableId | null;
  legacyDiagnostic: SafeMigrationDiagnostic | null;
};
type GrantStatusView = {
  grantId: StableId;
  state: GrantState;
  scope: SafeGrantScopeSummary;
};
type MachineStatus = {
  intentUuid: StableId;
  lifecycle: IntentLifecycle;
  autonomyMode: AutonomyMode;
  workflowExecutionState: WorkflowExecutionState;
  grant: GrantStatusView | null;
  decisionPolicyCount: number;
  decisionCount: number;
  unreviewedDecisionCount: number;
  acceptedDecisionCount: number;
  flaggedDecisionCount: number;
  suspendedReason: WorkflowResult["reasonCode"];
  stopReason: WorkflowResult["reasonCode"];
  resumeCondition: ResumeCondition | null;
  legacyDiagnostic: SafeMigrationDiagnostic | null;
};

function listAutoDecisions(query: DecisionQuery): ContractResult<DecisionPage>;
function getAutoDecision(intentUuid: StableId, decisionId: StableId): ContractResult<DecisionDetail>;
function authorizeHumanReview(input: HumanReviewAuthorizationInput): ContractResult<HumanReviewAuthorizationReceipt>;
function createAutoDecisionCommitPlanner(deps: {
  actorRegistry: DecisionActorRegistryReader;
  principalAuthorizer: AutoDecisionPrincipalAuthorizer;
}): AutoDecisionCommitPlanner;
function createAutoDecisionPrincipalAuthorizer(deps: {
  provenanceReader: CanonicalAutonomyProvenanceReader;
}): AutoDecisionPrincipalAuthorizer;
function serializeHumanReviewTurnBinding(
  payload: HumanReviewTurnBindingPayloadV1,
): ContractResult<string>;
function appendDecisionReview(input: DecisionReviewCommand): ContractResult<DecisionReviewReceipt>;
function serializeAutoDecisionReviewed(plan: AutoDecisionReviewedEventPlan): ContractResult<AuditEventPlan>;
function validatePostSealReviewExtension(value: unknown): ContractResult<PostSealReviewExtension>;
function projectHumanStatus(input: ReviewStatusInput): ContractResult<string>;
function projectMachineStatus(input: ReviewStatusInput): ContractResult<MachineStatus>;
```

`CanonicalReviewSourceReader`はM07内部のstore dependencyであり、command / adapter inputではない。`authorizeHumanReview`はcallerからaudit / commit receipt / lifecycleを受け取らない。このreaderが`sourceIntentUuid`からcurrent projection、source audit、commit receiptsを直接取得し、source lifecycle=active、`HUMAN_TURN` event identity / turn ID / Intent / principal、event fieldsのcommand occurrence / binding digest、そのeventを含むcommit receipt / source audit revisionをexact matchする。`appendDecisionReview`もreceiptをbearer tokenとして信用せず、同じM07 readerでsource referenceを再検証する。

UserPromptSubmit adapterはreal human turnを記録する同じ`HUMAN_TURN` eventのreserved field `review_command_v1`へ、`HumanReviewTurnBindingPayloadV1`を型宣言順canonical JSONで保存する。bindingはflag classificationとsafe note digestをexplicit nullを含めて保持する。M07はunknown / missing field、binding digest mismatch、turn / source mismatchを拒否する。このfieldはreview commandが明示されたturnだけに存在し、通常のhuman turn schemaをreview authorizationへ暗黙変換しない。

新規`AUTO_DECIDED` producerの実入口はM05-owned `AutoDecisionCommitPlanner.plan`だけである。その前段でM06はM04-owned `AutoDecisionPrincipalAuthorizer.authorize`へdecision identityとclosed authorization unionを渡す。authorizerはcaller projectionを受けず、M04-owned `CanonicalAutonomyProvenanceReader` portを通じてclosed `CanonicalAutonomyProvenanceSnapshot`を読み、snapshot.auditから`replayAutonomy`とgrant exercise replayを内部実行する。M07 adapterがこのportをM00 eventとnumberだけで実装するため、M04からM07へのimportはない。

M07 adapterの`readIntentSnapshot`はcanonical multi-shard audit、`appendProtectedEvents`の`AuditTransaction.expectedRevision`に使うauthoritative audit lock revision、最新`AuditCommitReceipt.stateProjectionRevision`を同じread lock / snapshot transaction内で返す。event件数、shard sequence最大値、timestampからrevisionを合成しない。authorizerの`sourceAuditRevision`はsnapshot.auditRevision、`modeProjectionRevision`はsnapshot.stateProjectionRevisionを正本とし、request側値と違えば拒否する。

authorizerは`mode-semi`ではgrant不要のmode revision / mode provenance event / gate occurrenceとprincipalをcanonical auditから解決し、`full-grant`ではreserved exercise / active grant / grant issuance principalを解決するclosed receiptを返す。receiptはdecision / occurrence / principal / provenance event / source audit revision / mode revision / nullable grant / exerciseへ束縛したcanonical digestを持つ。semi variantはdecision.grantId=null、full variantはdecision / exercise candidate / grant一致を必須にするため、grantのないsemiへfull reservationを捏造しない。入力にprincipal refやprovenance eventを受けず、M06がそれらを組み立てる余地を残さない。

M06は取得したreceiptとactor registry entry IDだけをM05 plannerへ渡す。M05は許可済みM04 public interfaceの`AutoDecisionPrincipalAuthorizer.verify`を呼び、authorizerは新しい同一snapshot readでreceipt digest、principal event、audit / projection revision、mode / grant / exerciseを再検証する。revisionが変わっていれば古いreceiptを返さず`CONFLICT`とし、M06はauthorizeからやり直す。actorはM05-owned `DecisionActorRegistryReader` portをM07 canonical Event Registry adapterが実装してplanner生成時に注入し、M05からM07をimportしない。plannerはportからactor ref / kindを取得し、caller提供actor payloadを信用しない。decision / receipt / subjectのIntent・decision一致とcanonical registry rowを検証し、同じ完全な`AuditEventPlan`のclosed fieldsへ`decision_v1`と`subject_v1`を必須生成する。

`subject_v1`はauthorization kind、principal ref / provenance event、receipt digest、source audit revision、actor ref / registry entry / kindをclosed schemaで保存する。M06はM04 exercise event、M05 decision event、workflow effect eventを集約する`AuditTransaction.expectedRevision`へreceipt.sourceAuditRevisionをそのまま設定する。M07はappend lock内のauthoritative audit revisionとCASし、driftなら全eventを拒否する。これによりauthorize / verify後のmode・grant・provenance変更もcommitされない。

`AutoDecisionCommitPlan`は上流`AuditEventPlan`を満たし、event type / event identity / Intent / fieldsを欠かさない。event identityは後述`amadeus.auto-decided-event.v1` tupleから決定し、M06は返却planを変換せずM07 transactionへ渡す。subject欠落・不一致・registry mismatchは`PROVENANCE_REQUIRED`でevent planを返さない。別のsubject無しproducer overload、partial plan serializer、caller提供Registry snapshotは公開しない。field導入前のreplayだけをnull / withheld legacy projectionとする。

`DecisionReviewCommand`はclassification / noteの自由入力を持たない。M06 / M07は再検証済み`HumanReviewAuthorizationReceipt`に束縛された値だけからremediationと`AutoDecisionReviewedPayloadV1.flagClassification / safeNoteDigest`を生成する。`accept`は両fieldをexplicit nullに限定し、`flag`だけがclassificationとsafe note digestを利用できる。これによりhuman turn commit後の差替えはbinding digest不一致として拒否される。

review commandのprincipalとactorは別fieldだが、生成規則は`reviewPrincipalRef = receipt.principalId`、`reviewActorRef = receipt.reviewActorId = receipt.principalId`である。real human本人がreview actionを実行するためであり、代理actorを創作しない。decision principal / actorはcanonical `AUTO_DECIDED.subject_v1`だけから投影する。field導入前eventに限り各ref=null、status=withheldとし、`AutoDecisionRecord`から推測しない。

`DecisionSummary.decisionSource`は上流`AutoDecisionRecord.decider`を値変更なしで写す。`basis`はfree-form raw textを公開せず、共通redactor成功時だけcanonical value digestを返す。redaction失敗時はnullと`redactionStatus=withheld`にし、raw basisからqueue eligibilityを導出しない。

### Canonical identity encoding v1

すべてのU4 identity / digestは曖昧な文字列連結を禁止し、`canonical-tuple-v1`を使う。tupleはASCII domain tagと順序付きatomからなる。atomは`tag`と`text | null` variantを持つ。byte encodingは次で固定する。

```text
u32be(domainUtf8Length) || domainUtf8 ||
u32be(atomCount) ||
for each atom:
  u32be(tagUtf8Length) || tagUtf8 ||
  variantByte(0x00=null, 0x01=text) ||
  if text: u64be(valueUtf8Length) || valueUtf8
```

値は上流canonical ID / enum、または共通redactorがNFCで返したsafe textだけをUTF-8 encodeする。hashはSHA-256、表示は`sha256:<lowercase-hex>`である。domain、atom順、tag、null variantを含むため、field境界の異なるtupleは同じpreimageにならない。

| Identity | Domain | Ordered atoms |
|---|---|---|
| auto decision event ID | `amadeus.auto-decided-event.v1` | intent、decision、occurrence、graph-revision、decision-payload-digest、subject-payload-digest |
| principal authorization receipt | `amadeus.auto-decision-principal-authorization.v1` | kind、intent、decision、occurrence、principal、provenance-event、source-audit-revision、mode-revision、gate-occurrence(null可)、grant(null可)、exercise(null可) |
| command binding | `amadeus.review-command-binding.v1` | source-intent、target-intent、decision、choice、command-occurrence、flag-classification(null可)、safe-note-digest(null可)、human-turn |
| review ID | `amadeus.decision-review.v1` | target-intent、decision、source-human-turn-event、choice |
| review transaction ID | `amadeus.decision-review-transaction.v1` | target-intent、review、target-audit-revision、completion-seal(null可) |
| review event ID | `amadeus.decision-review-event.v1` | review、command-occurrence、target-audit-revision、review-payload-digest |
| extension ID | `amadeus.review-extension.v1` | completion-seal、previous-extension(null可)、review-event、review-payload-digest、transaction、extension-revision |
| query fingerprint | `amadeus.decision-query.v1` | target-intent、lifecycle、review-state(null可)、page-size |
| projection event entry digest | `amadeus.decision-projection-event.v1` | event-type、event-id、decision-payload-digest(null可)、subject-payload-digest(null可)、review-payload-digest(null可) |
| projection event-set digest | `amadeus.decision-projection-event-set.v1` | target-intent、event-count、event-entry-digestの反復 |
| cursor digest | `amadeus.decision-cursor.v1` | query-fingerprint、target-audit-revision、review-extension-head(null可)、projection-event-set-digest、last-occurrence、last-decision |
| safe basis / note digest | `amadeus.redacted-value.v1` | value-kind、NFC redacted value |

projection event-setの対象はexplicit target Intent partition内でclosed parserを通過した`AUTO_DECIDED`と`AUTO_DECISION_REVIEWED`だけであり、その他のevent typeは集合へ含めない。entryはevent typeのclosed order（`AUTO_DECIDED`、`AUTO_DECISION_REVIEWED`）、次にcanonical event IDのUTF-8 byte昇順でsortする。`AUTO_DECIDED` entryはdecision / subject payload digestをnon-null、review payload digestをnullとし、`AUTO_DECISION_REVIEWED` entryは前2つをnull、review payload digestをnon-nullとする。同じevent IDかつ同じentry digestは1件へdedupeし、同じevent IDでentry digestが違う場合は`ContractError(code=CONFLICT,locus=projectionEventSet)`とする。対象eventのunknown / missing field、invalid ID / payload digest、Intent mismatchはdigestを生成せず`ContractError(code=MALFORMED,locus=projectionEventSet)`へ閉じる。set tupleはtarget Intent、dedupe後の件数、sort済みentry digestを同じ`event` atom tagで順にencodeする。

5 harnessはprojection event entry / setについてempty、decision-only、decision+review、同一duplicate、衝突duplicate、順序違いのgolden byte / digest vectorを含む同じbyte encoder fixtureを共有し、native JSON stringifyや区切り文字連結でidentityを作らない。

### Canonical contract value encoding v1

contract success値のdigestはidentity tupleとは別の`canonical-value-v1`で生成する。各schemaは`HumanReviewAuthorizationReceipt / DecisionPage / DecisionDetail / DecisionReviewReceipt / MachineStatus / PersistenceReloadObservation / HumanStatusString / ContractError`のclosed IDを持つ。encoding grammarは次で固定する。

| Value | Byte encoding |
|---|---|
| null | `0x00` |
| false / true | `0x01 0x00` / `0x01 0x01` |
| non-negative integer | `0x02 || u64be(value)` |
| string / enum / ID / digest | `0x03 || u64be(utf8Length) || utf8` |
| array | `0x04 || u32be(count) || encoded items in declared order` |
| object | `0x05 || u32be(fieldCount) || each(field-tag length + field-tag + encoded value)` |

object field順は上記public type宣言順、nullable fieldも必ずnullをencodeし、unknown / missing fieldを拒否する。optionsはcanonical question order、DecisionPage itemsはoccurrence / decision order、evidenceはsafeKind→nullable fingerprint、terminal review receiptsはreview ID昇順とする。`DecisionPage.nextCursor`のgolden vectorは`DecisionCursor`の宣言順でsnapshot 3値を含み、projection event-setのgolden vectorを参照して5 harnessでexact bytesを共有する。integerはsafe non-negative range外を拒否する。human status stringはCRLF / CRをLFへ変換し、Unicode NFC、末尾改行exactly oneにしてencodeする。

digest preimageは`u32be(domainUtf8Length) || domainUtf8 || u64be(valueByteLength) || canonicalValueBytes`とし、domain=`amadeus.contract-value.<schema-id>.v1`で分離してSHA-256する。fixtureはschema IDとgolden byte vectorを持ち、全5 harnessが同じnested object / array / number / human string digestを得ることを先に検証する。

## 1. Decision read model

M07はexplicit `intentUuid`からcanonical auditを読み、M05 reducerでU3の`AUTO_DECIDED`とU4の`AUTO_DECISION_REVIEWED`を同じIntent partition内だけに投影する。decision IDからIntentを逆引きしない。

### List contract

1. target Intentの存在とlifecycle=`active | completed`を検証する。
2. `lifecycle=active | completed | either` filterと実際のlifecycleを照合する。
3. review queueでは上流`AutoDecisionRecord.decider=solo-election | agent-recommendation`かつ`reviewState=unreviewed`だけを返す。`confirmed-policy / norm-history`はqueue外であり、display文やfree-form basisから判定しない。
4. history表示ではmode / grant gate、confirmed policy、norm、historyを含む全decisionを返せるが、これらは`not-applicable`でqueue件数へ加えない。
5. 並び順はcanonical occurrence sequence、同順位はdecision ID昇順とする。query fingerprintはIntent / lifecycle / review state / page sizeだけから導出して全pageで不変とする。cursorがないfirst pageではtarget audit revision、nullable review extension head、canonical decision / review event-set digest、itemsをM07の同一read snapshotから取得する。cursor digestはquery fingerprint、snapshot 3値、last occurrence / decision IDから別domainで導出し、時刻や表示文へ依存しない。cursor内fingerprintとcurrent filter fingerprintが違えば`MALFORMED`、subsequent pageでauthoritative snapshot 3値のいずれかがcursorと違えばitemsを返さず`ContractError(code=CONFLICT,locus=cursorSnapshot)`で拒否する。historical snapshotを推測して再構成せず、callerはfirst pageから再取得する。

### Detail contract

detailはquestion / gate identity、redacted question、canonical option ID / safe label、selected option、safe principal / actor reference、decision source、safe basis digest、nullable grant ID、nullable evidence fingerprint、degraded capability、decision / graph revision、review projectionを返す。credential、secret、raw provider prompt、未redact host / tool payloadは返さない。redactionに失敗したfieldは値とdigestをnullにして`redaction-status=withheld`を表示し、raw fallbackを禁止する。

## 2. Review eligibilityとhuman provenance

`accept / flag`の対象はsolo electionまたはagent recommendationにより作られ、current review stateが`unreviewed`のdecisionだけである。policy / norm / history / gate decisionは履歴として閲覧できるがreview command対象ではない。

M06は`DecisionReviewCommand`にtarget Intent UUID、decision ID、choice、expected revision / seal、`HumanReviewAuthorizationReceipt`を要求する。command occurrence、flag classification、safe note digestはreceipt内のhuman-bound値だけを使い、command側から上書きできない。receiptはreal `VerifiedHumanTurn`からだけ生成し、headless / agent / harness / legacy eventからsynthetic human turnを作らない。

active targetではsource Intent=target Intentとし、通常のUserPromptSubmit経路がreal `HUMAN_TURN`をtarget auditへcommitした後にreviewをappendする。completed targetでは、現在のactive Intentをsource review contextとして使う。source側のreal `HUMAN_TURN` command payload digestはcompleted target UUID、decision ID、choice、command occurrence IDを明示的に束縛する。M07はsource canonical auditとcommit receiptを検証して`HumanReviewAuthorizationReceipt`を作り、target側eventはそのstable referenceを保存する。source turnからtargetを推測せず、active source Intentがなければ既存`ContractError(code=PROVENANCE_REQUIRED,locus=sourceIntentUuid)`でstateを変えない。

source turn commitとtarget review appendはcross-Intent原子transactionにしない。先にcommitされたsource human turnはauthorization evidenceであってtarget stateを変えず、target append失敗時は同じreceiptでidempotent retryできる。target側でreviewがterminal化した後は再利用できない。

検証順序は次のとおりである。

1. explicit target Intentとactive / completed lifecycleを解決する。
2. decisionがそのIntent partitionに実在することを検証する。別Intentの同一形式IDは存在を開示せず`ContractError(code=CONFLICT,locus=decisionId)`とする。
3. decisionがreview eligibleかつunreviewedであることを検証する。
4. active source auditのreal human turn、command binding digest、target / decision / choice / flag classification / safe note digest / principalを検証し、authorization receiptを作る。
5. canonical tupleからreview ID / transaction IDを作り、`receiptProjectionRevision=expectedTargetAuditRevision+1`をpayloadへ束縛する。payloadのcanonical-value digestを計算後、そのdigestを含むtupleからevent IDを作る。
6. activeなら通常のprotected append、completedなら次節のcompleted-only validatorでcommitする。

同じreview IDの再送はpayloadから`DecisionReviewReceipt(reviewId, reviewEventId, auditTransactionId, [reviewEventId], receiptProjectionRevision, state, remediation)`を再構築して同じ値を返す。accepted / flagged済みdecisionへの同じchoiceはこの既存receipt、異なるchoiceは`ContractError(code=CONFLICT,locus=reviewState)`で拒否し、過去reviewを上書きしない。

## 3. Completed Intentの限定追記

completed Intentのlifecycle sealとartifact digestはimmutableである。M07の`CompletedDecisionReviewValidator`だけが次をすべて満たす場合に`AUTO_DECISION_REVIEWED`をappendできる。

- event typeがexactly `AUTO_DECISION_REVIEWED`である。
- explicit target Intentがcompletedであり、decisionがそのsealed auditに存在する。
- `HumanReviewAuthorizationReceipt`のsource Intentがactiveで、source human turn / audit revision / command binding digestがcanonical auditと一致する。
- event payloadがclosed `AutoDecisionReviewedPayloadV1`のrequired / explicit-null fieldsだけを含み、review principal / actor、decision principal / actor / source / basisを別fieldで保持する。
- expected completion seal digestとcurrent review-extension headが一致する。
- transaction内にlifecycle / artifact / grant / workflow / decision mutation eventがない。

original completion sealは書き換えない。post-seal review extensionは`amadeus.review-extension.v1` tupleでIDを作る別hash chainであり、各entryはoriginal seal digest、nullable previous head、review event、dense extension revisionへ束縛される。canonical audit readはoriginal sealed historyとvalidated extension chainを合成するが、completion identity、artifact digest、workflow lifecycleは変えない。一般append例外へ再利用できるAPIを公開しない。

`AUTO_DECISION_REVIEWED`のwire表現は`AuditEventPlan.fields`をexactly one key `payload_v1`に限定し、その値を`AutoDecisionReviewedPayloadV1`のfixed-key-order canonical JSON（型宣言のfield順、UTF-8、whitespaceなし、全nullable fieldをexplicit null）とする。runtime parserはrequired key、closed enum、nullabilityを検証し、unknown / missing keyを拒否する。payload digestは`canonical-value-v1(auto-decision-reviewed-payload)`から再計算し、review event IDへ含める。`PostSealReviewExtension`も型宣言順のfixed-key-order canonical JSON規則を使い、current head一致、`extensionRevision=current+1`、event type / ID / payload digest / transaction一致を検証する。

## 4. Accept / flagとremediation提案

`accept`はdecision review stateをacceptedへ投影するだけで、decision effectを再実行しない。

`flag`はreview stateをflaggedへ投影するが、active / completedを問わずrollback、Intent reopen、grant変更、成果物変更を行わない。M06は次の非実行`RemediationSuggestion`をstatus / receiptへ返す。

- existing requirement / contract / declared verificationへの違反としてflagした場合は`self-fix`をprimary提案とする。
- 新しいbehavior、scope追加、既存仕様変更としてflagした場合は`self-feature`をprimary提案とする。
- classification未指定時は安全側の`self-fix`をprimary、`self-feature`を「仕様変更なら選択」のalternativeとして表示する。

optional classification / safe noteは`review_command_v1`でreal human turnへ束縛されたsafe enum / digestだけをeventへ保存する。提案はscope commandを実行せず、新Intentを作らず、現在Intentのstateを変更しない。

## 5. Statusとresult projection

human-readable statusは主要語彙を「自律レベル、grant、grant scope、事前裁定方針、自動裁定、grant行使、停止理由」に限定し、次を表示する。

- target Intentとlifecycle
- autonomy mode、workflow execution state
- nullable grant ID / state / scopeとpolicy count
- suspended reason、stop reason、resume condition
- decision count、unreviewed decision count、accepted / flagged count
- legacy diagnostic、mode別grant説明

machine-readable statusは同じ値をstable enum / nullable fieldで返し、illegal combinationをparse時に拒否する。completedはworkflow=null、current grant=null、unreviewed queueは存在可能であり、後続reviewでcompletion resultを変更しない。

M07は`ReviewStatusInput`だけをstatus projectorへ渡す。`currentGrantScope`はgrant issuance eventから再生し、active fullでは`autonomy.currentGrant.scopeFingerprint`とのexact matchを検証する。`decisionPolicyCount`もgrant eventのconfirmed policy setから再生し、active fullではcurrent grant、completedではterminal completed grant、none / semiでfull grant historyがなければ0へ対応させる。`decisionCounts(total/unreviewed/accepted/flagged)`はdecision reducerから渡す明示fieldである。lifecycle、scope、policy source、stop / resumeを含む必須入力が欠ける場合は推測せず`MALFORMED / ILLEGAL_STATE`を返す。human / machine formatterは同じvalidated inputを消費する。

## 6. Event RegistryとOTel

`AUTO_DECISION_REVIEWED`を既存Event Registryへ登録し、event identity、Intent UUID、decision ID、review ID、choice、review principal / actor、decision principal / actor / source / basis、source human turn reference、nullable grant ID、lifecycle-at-review、remediation kind、trace correlationを既存schemaへ射影する。

OTelはsafe stable ID / enum / digestだけをattributeにし、question text、option raw payload、evidence raw payload、credentialを載せない。decision trace、review trace、grant exercise、stop / resumeはIntent UUID / decision ID / audit transaction IDで相互参照する。別telemetry store / schemaを作らない。

| Registry / OTel attribute | Cardinality | Value / redaction |
|---|---|---|
| `amadeus.intent.id`、`amadeus.decision.id`、`amadeus.review.id` | 1 | stable safe ID |
| `amadeus.review.choice`、`amadeus.review.lifecycle` | 1 | closed enum |
| `amadeus.review.principal_ref`、`amadeus.review.source_turn_ref` | 1 | pseudonymous stable reference |
| `amadeus.review.actor_ref` | 1 | reviewを実行したhuman actor reference |
| `amadeus.decision.principal_ref`、`amadeus.decision.actor_ref` | 0..1 | safe projection、withheld時はomission |
| `amadeus.decision.source` | 1 | `AutoDecisionRecord.decider` closed enum |
| `amadeus.decision.basis_digest` | 0..1 | redaction成功後のsafe digest |
| `amadeus.grant.id` | 0..1 | stable ID、grantなしはattribute omission |
| `amadeus.review.note_digest` | 0..1 | redaction後canonical noteのdigestのみ |
| `amadeus.redaction.status` | 1 | `redacted / withheld` |
| `amadeus.audit.transaction_id` | 1 | review appendのstable transaction ID |
| `amadeus.trace.id`、`amadeus.span.id` | 1 | existing OTel correlation format |

redaction / access control / retentionはevent計画前とspan attribute生成前の共通safe projectionで一度だけ適用する。redaction失敗時は`amadeus.redaction.status=withheld`とID / enum correlationだけを残し、note / question / evidence digestも生成しない。

## 7. Five harness contract

Claude Code、Codex、Cursor、OpenCode、Kimi Codeは同じCore list / detail / review / status fixtureとhuman / machine snapshotを実行する。native adapterは既存CLI / skill entrypointへ引数と表示を投影するだけで、eligibility、seal validator、redaction、remediation classificationを複製しない。

```ts
type ReviewHarnessId = "claude" | "codex" | "cursor" | "opencode" | "kimi";
type RequiredReviewHarnesses = readonly ["claude", "codex", "cursor", "opencode", "kimi"];
const REQUIRED_REVIEW_HARNESSES: RequiredReviewHarnesses =
  ["claude", "codex", "cursor", "opencode", "kimi"];

type ExpectedContractResult<T> =
  | { outcome: "success"; value: T }
  | { outcome: "error"; error: ContractError };
type ContractValueSchemaId =
  | "human-review-authorization-receipt"
  | "auto-decision-reviewed-payload"
  | "post-seal-review-extension"
  | "decision-page"
  | "decision-detail"
  | "decision-review-receipt"
  | "machine-status"
  | "persistence-reload-observation"
  | "human-status-string"
  | "contract-error";
type CanonicalValueGoldenVector = {
  vectorId: StableId;
  schemaId: ContractValueSchemaId;
  value: unknown;
  expectedBytesHex: string;
  expectedDigest: Sha256Digest;
};
type ContractCaseResult = {
  caseId: StableId;
  passed: boolean;
  observedOutcome: "success" | "error";
  observedValueDigest: Sha256Digest | null;
  observedError: ContractError | null;
};
type PersistenceBoundary = "session" | "process" | "compaction" | "clone";
type PersistenceReloadInput = {
  checkpointId: StableId;
  boundary: PersistenceBoundary;
  sourceIntentUuid: StableId;
  targetIntentUuid: StableId;
};
type PersistenceReloadObservation = {
  checkpointId: StableId;
  boundary: PersistenceBoundary;
  sourceAuditRevision: number;
  targetAuditRevision: number;
  reviewExtensionHead: StableId | null;
  queue: DecisionPage;
  terminalReviewReceipts: readonly DecisionReviewReceipt[];
};
type ReviewHarnessContractFixture = {
  fixtureId: StableId;
  contractRevision: Sha256Digest;
  requiredHarnesses: RequiredReviewHarnesses;
  canonicalValueVectors: readonly CanonicalValueGoldenVector[];
  sourceIntentAudit: readonly CanonicalAuditEvent[];
  targetIntentAudit: readonly CanonicalAuditEvent[];
  authorizationCases: readonly {
    caseId: StableId;
    input: HumanReviewAuthorizationInput;
    expected: ExpectedContractResult<HumanReviewAuthorizationReceipt>;
  }[];
  listCases: readonly {
    caseId: StableId;
    query: DecisionQuery;
    expected: ExpectedContractResult<DecisionPage>;
  }[];
  detailCases: readonly {
    caseId: StableId;
    intentUuid: StableId;
    decisionId: StableId;
    expected: ExpectedContractResult<DecisionDetail>;
  }[];
  reviewCases: readonly {
    caseId: StableId;
    command: DecisionReviewCommand;
    expected: ExpectedContractResult<DecisionReviewReceipt>;
  }[];
  statusCases: readonly {
    caseId: StableId;
    input: ReviewStatusInput;
    expectedMachine: ExpectedContractResult<MachineStatus>;
    expectedHuman: ExpectedContractResult<string>;
  }[];
  persistenceCases: readonly {
    caseId: StableId;
    afterCaseId: StableId;
    input: PersistenceReloadInput;
    expected: ExpectedContractResult<PersistenceReloadObservation>;
  }[];
};
type ReviewHarnessContractResult = {
  harnessId: ReviewHarnessId;
  fixtureId: StableId;
  contractRevision: Sha256Digest;
  passed: boolean;
  caseResults: readonly ContractCaseResult[];
};
type ReviewHarnessAdapter = {
  harnessId: ReviewHarnessId;
  invokeAuthorize(input: HumanReviewAuthorizationInput): Promise<ContractResult<HumanReviewAuthorizationReceipt>>;
  invokeList(query: DecisionQuery): Promise<ContractResult<DecisionPage>>;
  invokeDetail(intentUuid: StableId, decisionId: StableId): Promise<ContractResult<DecisionDetail>>;
  invokeReview(command: DecisionReviewCommand): Promise<ContractResult<DecisionReviewReceipt>>;
  invokeMachineStatus(input: ReviewStatusInput): Promise<ContractResult<MachineStatus>>;
  invokeHumanStatus(input: ReviewStatusInput): Promise<ContractResult<string>>;
  reload(input: PersistenceReloadInput): Promise<ContractResult<PersistenceReloadObservation>>;
};
type ReviewHarnessSuiteResult = {
  fixtureId: StableId;
  contractRevision: Sha256Digest;
  requiredHarnesses: RequiredReviewHarnesses;
  receipts: readonly ReviewHarnessContractResult[];
  passed: boolean;
};
function runReviewHarnessContract(
  adapter: ReviewHarnessAdapter,
  fixture: ReviewHarnessContractFixture,
): Promise<ContractResult<ReviewHarnessContractResult>>;
function canonicalContractValueDigest(
  schemaId: ContractValueSchemaId,
  value: unknown,
): ContractResult<Sha256Digest>;
function evaluateReviewHarnessSuite(
  fixture: ReviewHarnessContractFixture,
  receipts: readonly ReviewHarnessContractResult[],
): ContractResult<ReviewHarnessSuiteResult>;
```

fixtureはsource human turn、target review queue、active / completed両方を含む。`canonicalValueVectors`を最初に検証し、1件でもbyte / digestが違えばbehavior caseを実行しない。`persistenceCases.afterCaseId`はどのreview後にreloadするかを固定し、session / process / compaction / cloneごとにcanonical revisions、extension head、queue page、full terminal review receiptsを再読する。negative casesはcross-Intent detail / reviewを`CONFLICT`、missing / mismatched humanを`PROVENANCE_REQUIRED`、terminal choice競合を`CONFLICT`、malformed cursor / statusを`MALFORMED | ILLEGAL_STATE`のexact `ContractError`として固定する。

suite evaluatorはfixtureのrequired tupleと同じ5 harness IDがexactly once存在し、全receiptのfixture ID / contract revisionが一致し、全caseがpassした場合だけ`passed=true`を返す。runnerはsuccessならcanonical value digestとerror=null、failureならvalue digest=nullとexact `ContractError(code,locus,detail)`を`ContractCaseResult`へ保存してexpectedと比較する。欠損、重複、未知harness、success/error取り違え、error code / locus / detail差、machine / human digest差、reload後revision / queue / receipt差はfailである。表示成功だけでpassにしない。

将来harnessはdescriptor registry row、adapter projection、同じcontract fixtureの追加で閉じる。U4はcredential-attested live completionを有効化せず、Kiro / Kiro IDEを今回のlive対応済みと扱わない。

## 8. Verification scenarios

| Scenario | Oracle |
|---|---|
| active queue list | election / recommendationのunreviewedだけ、stable order |
| completed queue list | completionを変更せずunreviewedを表示 |
| history list | policy / norm / history / gateをnot-applicableとして表示、queue外 |
| detail | question/options/selected/decider/basis/grant/safe evidence/degradation |
| cross-Intent ID | explicit target partitionでnot found、逆引きなし |
| missing / synthetic human | review eventなし、state不変 |
| active accept | protected `AUTO_DECISION_REVIEWED`、acceptedへ投影 |
| completed flag | original seal不変、extension chainへreviewだけappend |
| duplicate review | same choiceはsame receipt、conflicting choiceは拒否 |
| review payload tamper | payload / event / extension digest mismatchでreplay拒否 |
| flag contract defect | rollbackなし、self-fix提案のみ |
| flag specification change | rollbackなし、self-feature提案のみ |
| redaction failure | raw fallbackなし、withheld表示 |
| completed status | workflow/grant terminalを維持しqueue count更新 |
| compaction / clone reload | full receipt、queue、extension headが同一 |
| 5 harness snapshot | byte-equivalent machine projection、同じhuman用語 |

## 要件・AC追跡

| Design behavior | Requirement / AC |
|---|---|
| active / completed list-detail、queue | FR-DEC-007、FR-OBS-001〜002、2067-AC18 |
| real human accept / flag、protected append | FR-OBS-003〜004、NFR-SAF-002、2067-AC19 |
| no rollback、remediation proposal | FR-OBS-005、2067-AC20 |
| human / machine status | FR-STP-005〜006、FR-OBS-006、NFR-UX-001〜003、2067-AC21 |
| registry / telemetry | FR-GRT-008、FR-OBS-007、NFR-OBS-001、2067-AC16 secondary |
| privacy / replay / harness | FR-HAR-004、NFR-DET-001〜002、NFR-REL-001〜003、NFR-PRV-001〜002 |

## 非目標

- Intent reopen、過去decision / effect変更、rollback、成果物変更。
- self-fix / self-feature Intentの自動作成またはscope command自動実行。
- 一般的なcompleted audit append例外。
- PR / GitHub / merge / convergence、runner / scheduler、常駐supervisor。
- terminal live completion、credential保存、raw evidence / host payload表示。

## Historical Review Cycle 1 — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:34:56Z
- **Iteration:** 1
- **Scope decision:** none

completed Intentのhuman provenanceと、query・status・5 harness検証の公開契約が閉じておらず、FR-OBS-001〜006および2067-AC18〜21を推測なしに実装できない。

### Findings

- BLOCKER | completed reviewのreal human provenanceが成立しない。sealed targetへAUTO_DECISION_REVIEWED以外を追記できず、別active sourceのturnとcompleted target review commandを結ぶ型・検証規則がない。
- BLOCKER | list/detail契約が上流公開APIと不整合である。cursor/page size、DecisionDetail、redaction境界、queue判定fieldを具体的な公開契約へ反映する必要がある。
- BLOCKER | status projectionの要求値を上流関数入力から生成できない。lifecycle、scope、policy count、stop reason、decision/review countsをpublic input/outputへ追加する必要がある。
- BLOCKER | 5 harness contract snapshotの検証面が公開されていない。decision query、review receipt、machine/human statusをfixture/result schemaへ含める必要がある。
- FOLLOW-UP | Event Registry / OTelのsafe属性名、cardinality、redaction/retention適用点とredaction失敗時の残存情報を固定すると検証可能性が上がる。

## Historical Review Cycle 1 — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:42:41Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の4 BLOCKERはいずれも公開型またはfixture schema上で未解消であり、completed review、query/detail、status、5 harness検証を推測なしに実装できない。

### Findings

- BLOCKER | completed Intent reviewのhuman provenance生成契約が閉じていない。HumanReviewAuthorizationInputとsource audit / commit receipt / command bindingの検証入力が未定義である。
- BLOCKER | query/detail公開契約が依然として未完である。DecisionSummary、DecisionCursor、DecisionReviewReceipt、safe option/evidence型、DigestとbasisKind変換規則が未定義である。
- BLOCKER | status入力から要求出力を生成できない。safe grant scope、decisionPolicyCount、DecisionReviewCountsの入力契約が未定義である。
- BLOCKER | 5 harness contract fixtureはfixture/harness identity、必須5 harness集合、negative ContractError oracleを表現できない。
- FOLLOW-UP | OTel表へaudit transaction IDとtrace/spanの具体的attribute名・cardinalityを追加するとNFR-OBS-001をschema testできる。

## Historical Review Cycle 2 — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T13:54:27Z
- **Iteration:** 1
- **Scope decision:** none

主要契約は具体化されたが、human provenanceの信頼境界、review event・extensionのclosed schema、redaction失敗表現、決定的identity encodingに実装不能な欠落が残る。

### Findings

- BLOCKER | caller提供のaudit配列とreceiptだけではsynthetic sourceを排除できず、M07-owned canonical readまたは偽造不能trusted snapshotが必要。
- BLOCKER | AUTO_DECISION_REVIEWED payloadとPostSealReviewExtensionのclosed public schema、canonical serializationが未定義。
- BLOCKER | redaction failureでdigestを生成しない規則とnon-null evidenceFingerprintが矛盾する。
- BLOCKER | H(a+b+...)にlength prefix / type tag / canonical tuple encodingがなくidentity collision境界が曖昧。
- FOLLOW-UP | DecisionDetailへsafe principal/actor projection、OTelへactor keyを追加するとFR-GRT-008をschema testできる。
- FOLLOW-UP | 5-harness fixtureへsession/process/clone reload stepsとobserved success/errorを追加するとFR-HAR-004を検証できる。

## Historical Review Cycle 2 — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:04:11Z
- **Iteration:** 2
- **Scope decision:** none

主要なIteration 1指摘は具体化されたが、主体情報の生成元、5 harness成功値digest、compaction永続化の契約が未閉鎖であり実装判断が残る。

### Findings

- BLOCKER | reviewActorRefとdecision principal/actorのcanonical生成元が未定義でclosed payloadとRegistry射影を構築できない。
- BLOCKER | DecisionPage/Detail/MachineStatus/配列/数値/human stringのschema別canonical success value encodingがなく5 harness digestを一致させられない。
- BLOCKER | PersistenceBoundaryにcompactionがなくFR-HAR-004の明示要件を検証できない。

## Historical Review Cycle 3 — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:19:53Z
- **Iteration:** 1
- **Scope decision:** none

review主体・canonical-value-v1・compaction列挙は改善されたが、主体生成、pagination identity、receipt永続化、post-seal integrityが未閉鎖であり実装可能ではない。

### Findings

- BLOCKER | decision principal/actorの新規AUTO_DECIDED producer入力と生成規則がなくRegistry射影を満たせない。
- BLOCKER | query fingerprintとcursor digestが同一identity定義でpage位置の包含有無が矛盾する。
- BLOCKER | AUTO_DECISION_REVIEWEDからtransaction receiptを再構築できず境界越しsame receiptを満たせない。
- BLOCKER | post-seal extension identityがclosed review payload digestへ束縛されず内容改変を検知できない。

## Historical Review Cycle 3 — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:28:16Z
- **Iteration:** 2
- **Scope decision:** none

query/cursorのdomain分離、receipt再構築、payload digest付きchainは解消したが、AUTO_DECIDED主体のproducer配線とreview付随情報のhuman provenanceが未閉鎖である。

### Findings

- BLOCKER | planAutoDecisionSubject payloadを実producer planAutoDecisionCommit / event-planへ渡してAUTO_DECIDED.subject_v1を必須commitする経路がない。
- BLOCKER | flagClassificationとsafeNoteDigestがreview_command_v1 human bindingに含まれずhuman認可後の差替えを防げない。

## Historical Review Cycle 4 — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:35:49Z
- **Iteration:** 1
- **Scope decision:** none

U4のreview・seal・query契約は詳細化されているが、AUTO_DECIDEDの主体情報追加経路に3件の実装不能な不整合がある。

### Findings

- BLOCKER | `AutoDecisionSubjectInput.authorizationKind`は`mode-semi`を許容する一方、唯一のproducerである`planAutoDecisionCommit`は常に`ReservedGrantExercise`を要求する。requirements.mdのFR-AUT-005/FR-GRT-004はsemiのgrantをnullとし、component-methods.mdの`ReservedGrantExercise`はfull grantの予約でしか生成できないため、semiの自動裁定へ必須`subject_v1`を記録する入力を構築できない。semi用の非grant認可証跡をclosed unionとしてcommit入力へ追加するか、mode別producer契約を定義する必要がある。
- BLOCKER | `planAutoDecisionCommit`が返す`AutoDecisionCommitPlan`には`eventIdentity`がなく、M00の`AuditEventPlan`必須schemaを満たさない。別のserializerまたはevent identity生成関数も公開されていない一方、この関数以外のAUTO_DECIDED producerは禁止されているため、M06は生成結果をM07 transactionへappendできない。戻り値を完全な`AuditEventPlan`へするか、決定的event identityを生成して変換するclosed APIが必要である。
- BLOCKER | 設計はM05が`actorRegistryEntryId`の実在・一致を再検証すると規定するが、`AutoDecisionSubjectInput`にはcaller提供の`RegisteredDecisionActor`しかなく、Event Registryをcanonicalに読むportやtrusted receiptがない。component-methods.mdはM07がM05を一方向importし、domain moduleからM07への逆importを禁止しているため、M05が直接Registryを読む実装は循環依存となり、入力を信用する実装ではregistry mismatchを検出できない。非循環なregistry lookup portまたはM07発行の再検証可能receiptを定義する必要がある。

## Historical Review Cycle 4 — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:38:51Z
- **Iteration:** 2
- **Scope decision:** none

前回のevent plan欠落とRegistry循環は解消されたが、semi/full双方のcanonical principal provenanceを生成・再検証する公開経路がなく、AUTO_DECIDED producerを実装できない。

### Findings

- BLOCKER | `AutoDecisionCommitAuthorization`のsemi branchは`modeProjectionRevision / modeProvenanceEventId`を要求し、full branchの`ReservedGrantExercise`にもprincipal provenanceは含まれないが、M04の公開契約にはこれらとcanonical principalを生成するproducerがない。`AutonomyProjection`もmode/grantのprincipal・provenance event・projection revisionを保持せず、`AutoDecisionCommitPlanner`へ注入されるdependencyはactor用`DecisionActorRegistryReader`だけである。そのためM06はsemi authorizationを型どおり構築できず、semi/fullともcaller提供`subject.principalRef / principalProvenanceEventId`をM05がcanonical M04 stateへ再検証できない。M04-owned authorization producerまたは非循環なcanonical provenance reader/receiptを定義し、planner入力とprincipalを一意に生成・検証可能にする必要がある。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:45:53Z
- **Iteration:** 1
- **Scope decision:** none

M04 authorizer/receiptとM05再検証経路は成立したが、receiptをM07のlock revisionへ束縛するcanonical read契約が不足している。

### Findings

- BLOCKER | `CanonicalAutonomyProvenanceReader.readIntentAudit`は`CanonicalAuditEvent[]`だけを返す一方、M04 receiptは`sourceAuditRevision / modeProjectionRevision`を必須とし、M07は`receipt.sourceAuditRevision`をtransactionの`expectedRevision`と一致させる。M00の`CanonicalAuditEvent`には`stateProjectionRevision`やlock revisionがなく、複数shardのevent列からM07の現在revisionを一意に導出できない。audit件数を代用することもNFR-DET-003に反する。このためauthorizerは検証可能なrevisionをreceiptへ格納できず、authorize時に読んだauditとM07 lockの同一snapshot性も保証できない。M07 adapterのread結果を、canonical auditとM07のauthoritative lock/state projection revisionを同一snapshotで返すclosed型へ変更し、そのrevisionをauthorize・verify・append CASで一貫して使用する必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:47:36Z
- **Iteration:** 2
- **Scope decision:** none

前回BLOCKERは解消済み。canonical multi-shard audit、authoritative audit lock revision、state projection revisionを同一snapshotで取得し、M04 authorize・M05経由の再verify・M07 append CASまで同じaudit revisionへ束縛される。revision driftはCONFLICTまたはtransaction全体拒否となり、実装可能性・依存方向・原子性に未解決BLOCKERはない。

### Findings

- None
