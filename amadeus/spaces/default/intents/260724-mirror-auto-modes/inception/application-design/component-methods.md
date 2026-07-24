# Component Methods

> 上流入力（consumes 全数）: `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`

## C0 共通型

```ts
export type MirrorMode = "off" | "prompt" | "auto";
export type MirrorOperation = "create" | "sync" | "close";
export type RepositoryIdentity = Readonly<{
  owner: string;
  name: string;
  canonical: `${string}/${string}`;
}>;
export type MirrorBoundary =
  | { kind: "intent-capture-approved"; instance: string }
  | { kind: "phase-verified"; phase: string; instance: string }
  | { kind: "parked"; stage: string; instance: string }
  | { kind: "workflow-completed"; instance: string }
  | { kind: "manual"; instance: string };

export type MirrorEventIdentity = {
  intentUuid: string;
  boundary: MirrorBoundary;
  operation: MirrorOperation;
};

export type MirrorCreateIdentity = Readonly<{
  schema: 1;
  intentUuid: string;
  intentDir: string;
  repository: RepositoryIdentity;
  operationId: string;
  preparedAt: string;
}>;

export type MirrorFailureClass =
  | "configuration"
  | "not-installed"
  | "unauthenticated"
  | "permission"
  | "rate-limit"
  | "network"
  | "api"
  | "command"
  | "invalid-response"
  | "state-write"
  | "state-parse"
  | "provenance"
  | "landing"
  | "ambiguous-create";

export type MirrorReceiptStatus =
  | "prepared"
  | "attempted"
  | "succeeded"
  | "skipped-for-event"
  | "pending"
  | "safety-blocked"
  | "abandoned";

export type MirrorMutationEffect =
  | "not-started"
  | "no-effect-confirmed"
  | "outcome-unknown";

export type MirrorOperationReceipt = Readonly<{
  key: string;
  event: MirrorEventIdentity;
  operationId: string;
  status: MirrorReceiptStatus;
  preparedAt: string;
  attemptedAt?: string;
  completedAt?: string;
  failureClass?: MirrorFailureClass;
  lastEffect?: MirrorMutationEffect;
  createIdentity?: MirrorCreateIdentity;
}>;

export type MirrorProvenance = Readonly<{
  schema: 1;
  createIdentity: MirrorCreateIdentity;
  issueNumber: number;
  createdAt: string;
}>;

export type MirrorWarning = Readonly<{
  operationId: string | null;
  operation: MirrorOperation | null;
  classification: MirrorFailureClass;
  summary: string;
  occurredAt: string;
  retryable: boolean;
  effect: MirrorMutationEffect;
  source: "persisted-receipt" | "persisted-warning" | "current-invocation";
}>;

export type MirrorExpectedPrompt = Readonly<{
  event: MirrorEventIdentity;
  operation: MirrorOperation;
  issuedAt: string;
  retryOf?: Readonly<{ event: MirrorEventIdentity; operationId: string }>;
}>;

export type MirrorAuditContext = Readonly<{
  triggerEvent: MirrorEventIdentity;
  operationEvent?: MirrorEventIdentity;
  operationId?: string;
  reconciliation: boolean;
  classification?: MirrorFailureClass;
}>;

export type MirrorStateSnapshot = Readonly<{
  revision: number;
  issueNumber: number | null;
  provenance: MirrorProvenance | null;
  receipts: Readonly<Record<string, MirrorOperationReceipt>>;
  warnings: readonly MirrorWarning[];
  repairChallenges: Readonly<Record<string, MirrorRepairChallenge>>;
  expectedPrompt?: MirrorExpectedPrompt;
}>;

export type WriteOutcome<T = MirrorStateSnapshot> =
  | { kind: "written"; value: T; document: string }
  | { kind: "unchanged"; value: T; document: string }
  | { kind: "conflict"; actualRevision: number }
  | { kind: "invalid"; issues: readonly string[] }
  | { kind: "io-failure"; summary: string };

export type MarkerOutcome =
  | { kind: "parsed"; identity: MirrorCreateIdentity }
  | { kind: "missing" }
  | { kind: "invalid"; issues: readonly string[] };

export type OwnershipOutcome =
  | { kind: "verified"; issue: RemoteMirrorIssue }
  | { kind: "missing-marker" | "mismatch" | "wrong-repository"; summary: string };

export type CandidateOutcome =
  | { kind: "adopt"; issue: RemoteMirrorIssue; provenance: MirrorProvenance }
  | { kind: "create-new" }
  | { kind: "safety-blocked"; reason: "zero-after-attempt" | "ambiguous" | "mismatch" };

export type GatewayOutcome<T> =
  | { kind: "ok"; value: T }
  | {
      kind: "failure";
      classification: Exclude<MirrorFailureClass, "configuration" | "state-write" | "state-parse" | "provenance" | "landing" | "ambiguous-create">;
      summary: string;
      retryable: boolean;
      effect: MirrorMutationEffect;
    };

export type CreateMirrorIssueInput = Readonly<{
  title: string;
  body: string;
  labels: readonly string[];
}>;

export type MirrorIssueContent = Readonly<{
  title: string;
  body: string;
  labels: readonly string[];
}>;

export type RemoteMirrorIssue = Readonly<{
  repository: RepositoryIdentity;
  number: number;
  title: string;
  body: string;
  state: "OPEN" | "CLOSED";
}>;

declare const mirrorMutationPermitBrand: unique symbol; // internal module only; not exported

export type MirrorMutationPermit = Readonly<{
  [mirrorMutationPermitBrand]: true;
  event: MirrorEventIdentity;
  repository: RepositoryIdentity;
  operation: MirrorOperation;
  issueNumber: number | null;
}>;

export interface MirrorGitHubGateway {
  readiness(repository: RepositoryIdentity): GatewayOutcome<void>;
  createIssue(permit: MirrorMutationPermit, input: CreateMirrorIssueInput): GatewayOutcome<RemoteMirrorIssue>;
  findIssuesByMarker(repository: RepositoryIdentity, marker: string): GatewayOutcome<readonly RemoteMirrorIssue[]>;
  viewIssue(repository: RepositoryIdentity, issueNumber: number): GatewayOutcome<RemoteMirrorIssue>;
  editIssue(permit: MirrorMutationPermit, body: string): GatewayOutcome<RemoteMirrorIssue>;
  closeIssue(permit: MirrorMutationPermit): GatewayOutcome<RemoteMirrorIssue>;
}

export type MirrorExecutionContext = Readonly<{
  statePath: string;
  intentUuid: string;
  intentDir: string;
  repository: RepositoryIdentity;
  triggerEvent: MirrorEventIdentity;
  event: MirrorEventIdentity;
  operation: MirrorOperation;
  issueContent: MirrorIssueContent;
  expectedMirrorRevision: number;
  now: () => string;
  newOperationId: () => string;
  gateway: MirrorGitHubGateway;
}>;

export type MirrorSnapshot = Readonly<{
  intentUuid: string;
  intentDir: string;
  projectSummary: string;
  lifecyclePhase: string;
  currentStage: string;
  status: string;
  updatedAt: string;
}>;

export type MirrorStatusContext = Readonly<{
  mode: MirrorMode;
  configSources: readonly string[];
  state: MirrorStateSnapshot;
  provenanceStatus: "unlinked" | "verified" | "unverified";
}>;

export type MirrorOperationOutcome =
  | { kind: "completed"; operation: MirrorOperation; issueNumber: number }
  | { kind: "skipped"; operation: MirrorOperation }
  | { kind: "suppressed"; operation: MirrorOperation | null; reason: "off" | "not-applicable" | "configuration"; warning?: MirrorWarning }
  | { kind: "pending"; operation: MirrorOperation; warning: MirrorWarning }
  | { kind: "safety-blocked"; operation: MirrorOperation; warning: MirrorWarning }
  | { kind: "repaired"; action: "relink" | "abandon"; issueNumber: number | null };

export type MirrorRepairPlan =
  | { kind: "relink"; repository: RepositoryIdentity; issue: RemoteMirrorIssue; provenance: MirrorProvenance }
  | { kind: "abandon-attempt"; operationId: string; duplicateRisk: true }
  | { kind: "rejected"; reason: string };

export type MirrorRepairChallenge = Readonly<{
  challengeId: string;
  intentUuid: string;
  repository: RepositoryIdentity;
  planDigest: string;
  operationId: string;
  expectedPhrase: string;
  issuedAt: string;
  consumedAt?: string;
}>;

export type MirrorRepairProof = Readonly<{
  challengeId: string;
  intentUuid: string;
  repository: RepositoryIdentity;
  operationId: string;
  planDigest: string;
  exactConfirmation: string;
  checkedAt: string;
}>;

export type MirrorDecision =
  | { kind: "suppress"; reason: "off" | "not-applicable" | "skipped-for-event" }
  | {
      kind: "prompt";
      operation: MirrorOperation;
      event: MirrorEventIdentity;
      retryOf?: Readonly<{ event: MirrorEventIdentity; operationId: string }>;
    }
  | {
      kind: "execute";
      operation: MirrorOperation;
      event: MirrorEventIdentity;
      retryOf?: Readonly<{ event: MirrorEventIdentity; operationId: string }>;
    };
```

型はIntent Mirrorだけを表し、PR merge、release、publish、deploymentを追加できるgeneric external-action unionにしない。

`MirrorEventIdentity`のcanonical keyは、C7がengine-owned boundary instanceを受け取った後、C0のfield順で安定serializeして作る。上記DTOはすべてC0が所有し、C2〜C8は再定義せずimportする。`operationId`と`preparedAt`の候補値はC6が注入されたgeneratorから作るが、有効なcreate identityになるのはC3の`prepare` transitionがreceiptと同じatomic writeへ保存して返した後だけである。同じevent再入ではC3が既存receiptのidentityを返し、新しい候補値を捨てる。

## C1 Mirror Config Resolver

```ts
export type MirrorConfig = Readonly<{ autoMirror: MirrorMode }>;

export type MirrorConfigLayerInput = Readonly<{
  layer: "global" | "space" | "intent";
  path: string;
  present: boolean;
  rawValue: unknown;
}>;

export type MirrorConfigIssue =
  | Readonly<{
      kind: "invalid-value";
      layer: "global" | "space" | "intent";
      path: string;
      key: "auto-mirror";
      actualType: string;
      expected: "off | prompt | auto";
    }>
  | Readonly<{
      kind: "read-failure";
      layer: "global" | "space" | "intent";
      path: string;
      key: "auto-mirror";
      summary: string;
      expected: "readable configuration";
    }>;

export type MirrorConfigReadOutcome =
  | { kind: "ok"; layers: readonly MirrorConfigLayerInput[] }
  | { kind: "failure"; issues: readonly Extract<MirrorConfigIssue, { kind: "read-failure" }>[] };

export type MirrorConfigOutcome =
  | { kind: "resolved"; config: MirrorConfig; sources: readonly string[] }
  | { kind: "invalid"; issues: readonly MirrorConfigIssue[] };

export function resolveMirrorConfig(
  projectDir: string,
  explicitIntentDir?: string,
): MirrorConfigOutcome;

export function readMirrorConfigLayers(
  projectDir: string,
  explicitIntentDir?: string,
): MirrorConfigReadOutcome;

export function parseMirrorConfigLayers(
  layers: readonly MirrorConfigLayerInput[],
): MirrorConfigOutcome;
```

- invalid valueは全件収集する。
- booleanを文字列へcastしない。
- error messageはlayer、path、key、expected valuesを含む。
- `resolveMirrorConfig`はread-only facadeであり、既存workspace selectorでlayerを読んで`parseMirrorConfigLayers`へ判断を委譲する。
- filesystem readとpath解決はC1、precedence／schema判断はpure parserが所有する。C1はwrite、GitHub、lifecycle mutationを行わない。
- absent optional config fileは`present: false`でありfailureではない。permission、I/O、selector ambiguityはredacted `read-failure` issueへ正規化し、throwせず`MirrorConfigOutcome.invalid`として返す。

## C2 Mirror Policy

```ts
export type MirrorPolicyInput =
  | Readonly<{
      kind: "lifecycle";
      mode: MirrorMode;
      event: MirrorEventIdentity;
      state: MirrorStateSnapshot;
    }>
  | Readonly<{
      kind: "manual";
      event: MirrorEventIdentity & { boundary: Extract<MirrorBoundary, { kind: "manual" }> };
      state: MirrorStateSnapshot;
    }>;

export type CompletionPolicyInput = Readonly<{
  intentUuid: string;
  boundary: Extract<MirrorBoundary, { kind: "workflow-completed" }>;
  state: MirrorStateSnapshot;
}>;

export function mirrorEventIdentity(
  intentUuid: string,
  boundary: MirrorBoundary,
  operation: MirrorOperation,
): MirrorEventIdentity;

export function mirrorEventKey(event: MirrorEventIdentity): string;

export function decideMirrorAction(input: MirrorPolicyInput): MirrorDecision;

export function approveMirrorPrompt(input: Readonly<{
  expected: MirrorExpectedPrompt;
  answer: Readonly<{ event: MirrorEventIdentity; operation: MirrorOperation }>;
  state: MirrorStateSnapshot;
}>): Extract<MirrorDecision, { kind: "execute" }> | Extract<MirrorDecision, { kind: "suppress" }>;

export function nextCompletionOperation(
  input: CompletionPolicyInput,
): MirrorOperation | null;
```

- 同一inputは常に同じdecisionを返す。
- lifecycle inputでは`off`をpendingより先に評価する。
- manual inputはCLI invocation自体を明示同意としてmode解決を行わず`execute`を返す。C6はmanualを含む全operationでprovenance／repository／landing guardを必ず適用する。
- `skipped-for-event`は同一eventだけをsuppressする。
- completionはcreate→sync→close以外の順序を返さない。

`mirrorEventKey`はFR-10の一意性をそのまま表すversioned tuple `["mirror-event", 1, intentUuid, boundary.kind, boundary.instance, operation]`をUTF-8 JSON arrayとしてserializeし、base64url（RFC 4648 URL-safe alphabet、paddingなし）へ変換して`mirror-event:v1:`をprefixする。phase名／stage名などの表示用detailはidentityへ含めない。`boundary.instance`はengine-owned transition identityであり、同じtransitionへのresume中は不変である。JSON arrayの位置でfield順を固定し、object key順に依存しない。C2とC3はこの関数だけでreceipt keyを生成する。

`nextCompletionOperation`はinputのworkflow completion boundaryからcreate／sync／closeのeventを生成し、同じboundary instanceのreceiptだけを参照する。別phase、別completion instance、manual operationのreceiptは選択に含めない。

current operation receiptが`prepared | attempted | pending`なら同じoperationを返し、C6のreconcile／retryへ送る。`succeeded`なら次operationを評価する。`skipped-for-event | safety-blocked | abandoned`なら`null`を返して同じcompletion boundaryの後段を抑止する。

## C3 Mirror State Store

C3はC0のstate DTOを使用し、型を所有しない。

```ts
export type MirrorTransition =
  | {
      kind: "prepare";
      event: MirrorEventIdentity;
      operationId: string;
      preparedAt: string;
      createIdentityBase?: Readonly<{
        intentDir: string;
        repository: RepositoryIdentity;
      }>;
    }
  | { kind: "mark-attempted"; key: string; attemptedAt: string }
  | { kind: "claim-create-attempt"; key: string; attemptedAt: string }
  | { kind: "retry-after-no-effect"; key: string; attemptedAt: string }
  | { kind: "claim-observed-retry"; key: string; attemptedAt: string; observation: "sync-body-differs" | "issue-still-open" }
  | { kind: "complete"; key: string; completedAt: string; issueNumber: number; provenance?: MirrorProvenance }
  | { kind: "skip-for-event"; event: MirrorEventIdentity; operationId: string; preparedAt: string; completedAt: string }
  | { kind: "set-warning"; key: string; warning: MirrorWarning }
  | { kind: "set-global-warning"; warning: MirrorWarning }
  | { kind: "clear-global-warning"; classification: "configuration" }
  | { kind: "set-expected-prompt"; prompt: MirrorExpectedPrompt }
  | { kind: "consume-expected-prompt"; event: MirrorEventIdentity; operation: MirrorOperation }
  | { kind: "mark-pending"; key: string; effect: Exclude<MirrorMutationEffect, "not-started">; warning: MirrorWarning }
  | { kind: "mark-safety-blocked"; key: string; warning: MirrorWarning }
  | { kind: "issue-repair-challenge"; challenge: MirrorRepairChallenge }
  | { kind: "repair-link"; key: string; provenance: MirrorProvenance; proof: MirrorRepairProof }
  | { kind: "abandon-attempt"; key: string; reason: string; completedAt: string; proof: MirrorRepairProof };

export type MirrorStateOutcome =
  | { kind: "ok"; state: MirrorStateSnapshot; document: string }
  | { kind: "invalid"; issues: readonly string[] }
  | { kind: "conflict"; actualRevision: number };

export function readMirrorState(stateContent: string): MirrorStateOutcome;

export function transitionMirrorOperation(
  stateContent: string,
  transition: MirrorTransition,
): MirrorStateOutcome;

export function mutateMirrorStateAtomic(
  statePath: string,
  expectedMirrorRevision: number,
  transition: MirrorTransition,
  audit: MirrorAuditContext,
): WriteOutcome;
```

- parseはduplicate key、未知schema、未知statusを拒否する。
- mutationは既存state／audit lock内で最新document全体を再読込する。
- 最新documentのMirror revisionだけをexpected valueと比較し、非Mirror fieldは最新bytesからそのまま保持する。
- state-changing transitionはMirror field群をmemory上で一括生成し、revisionを1増やしてdocumentを一度だけatomic replaceする。同値のidempotent再入は`unchanged`を返し、revision増加もwriteも行わない。
- `prepare`はevent keyが未登録なら受け取った候補値からreceiptを作り、createの場合は`MirrorCreateIdentity`を同じwriteへ保存して返す。既存keyなら保存済みreceiptを返し、候補値を使用しない。
- provenanceと`succeeded` receiptは単一`complete` transitionで同じwriteへ入れる。
- `retry-after-no-effect`は`pending + lastEffect=no-effect-confirmed`だけを同じoperationIdの`attempted`へ戻し、attemptedAtを更新してlastEffectをclearする。`outcome-unknown`には使用できない。
- `claim-create-attempt`はfresh `prepared` create receiptだけをCASで`attempted`へ進める。candidate 0件確認後、このwriteを成功させたcallerだけがcreate permitを得る。既にattemptedならconflictとなり、新規createを禁止する。
- `claim-observed-retry`はsyncのbody不一致またはcloseのopen状態をremote viewで確認した`pending + outcome-unknown`だけをCASでattemptedへ戻す。write winnerだけが同じIssueへ冪等PATCHできる。
- `skip-for-event`はexpected promptのevent／operation一致を検証してbindingを消費し、receipt absentでもevent／operationId／preparedAt／completedAtからterminal receiptを同じatomic writeで作成できる。既存receiptではevent／operation完全一致時だけskipへ遷移する。
- `set-warning`はreceipt statusを変えず、同じoperationIdのwarningを保存する。`prepared`へのwarningはeffect=`not-started`だけを許可する。
- `set-global-warning`はreceiptなしのconfiguration warningだけを保存し、operation／operationIdはnull、effectはnot-startedとする。valid configを確認した次boundaryで`clear-global-warning`がconfiguration warningだけを消す。
- `set-expected-prompt`は同じevent／operationの再入なら`unchanged`、別promptが未消費ならconflictとする。`consume-expected-prompt`はevent／operation完全一致時だけ同じatomic writeでbindingを削除する。
- warning解消は同じoperationIdだけを対象にする。`mark-pending`は`attempted`後だけに許可し、effect=`no-effect-confirmed | outcome-unknown`をreceiptとwarningへ保存する。readiness失敗は`prepared`のままなので、次回もremote未開始と判断できる。
- status別不変条件: `prepared`はoperationId必須かつattemptedAtなし、`attempted`はattemptedAt必須、`pending`はattemptedAtとlastEffect必須、`succeeded | abandoned`はcompletedAt必須、createの`succeeded`はprovenance必須、`pending`／`safety-blocked`は同じoperationIdのwarning必須。
- repair challengeはsnapshot内へchallengeId keyで保存する。`repair-link`／`abandon-attempt`は同じlock内でproofと未消費・10分以内のchallengeを照合し、repair mutationと`consumedAt`設定を同じatomic writeで行う。
- 全mutationは`MirrorAuditContext`を必須とし、state toolが既存`ARTIFACT_UPDATED` Contextへtrigger event、operation event／ID、reconciliation、classificationを転記する。

## C4 Mirror Provenance Verifier

```ts
export function renderMirrorMarker(identity: MirrorCreateIdentity): string;

export function parseMirrorMarker(issueBody: string): MarkerOutcome;

export function verifyMirrorOwnership(
  local: MirrorProvenance,
  remote: RemoteMirrorIssue,
): OwnershipOutcome;

export function classifyMirrorCandidates(
  receipt: MirrorOperationReceipt,
  localProvenance: MirrorProvenance | null,
  candidates: readonly RemoteMirrorIssue[],
): CandidateOutcome;
```

`OwnershipOutcome`と`CandidateOutcome`はC0の判別unionを返し、booleanだけに潰さない。

## C5 Mirror GitHub Gateway

```ts
export class GhMirrorGateway implements MirrorGitHubGateway {
  // C0のrepository-bound contractを実装する。
}
```

`GatewayOutcome`はC0で定義したclassificationを返す。stderrは秘密値をredactしたsummaryへ変換する。

Gateway implementationは`gh api repos/{owner}/{name}/issues...`としてrepositoryを全request pathへ明示し、responseの`repository_url`から得たidentityがpermit／引数と一致しない場合は`invalid-response`とする。`mirrorMutationPermitBrand`とpermit factoryはinternal capability moduleだけが所有し、package exportへ公開しない。C6だけがそのinternal factoryをimportし、guard通過後に`MirrorMutationPermit`を生成できる。C5を含む他moduleはtypeだけを参照でき、object literalやtype assertionによるpermit生成をlint／dependency testで拒否する。

mutation前に`readiness`が成功していることをC6が必須とし、その後に`attempted` receiptを保存する。Gateway failureの`effect`が`not-started | no-effect-confirmed`なら同じoperationを安全にretryでき、`outcome-unknown`ならcreateは候補reconciliation、edit／closeはremote viewによる収束判定へ送る。

## C6 Mirror Operation Executor

```ts
export function executeMirrorOperation(
  context: MirrorExecutionContext,
): MirrorOperationOutcome;

export function reconcileCreate(
  context: MirrorExecutionContext,
  receipt: MirrorOperationReceipt,
): MirrorOperationOutcome;
```

createの呼出し順は`operationId／preparedAt候補生成 → prepare atomic write → 永続create identityとcurrent context照合 → readiness → marker候補検索／分類 → fresh prepared＋候補0件ならclaim-create-attempt atomic write → create permit発行／remote create → provenance + succeededの単一complete write`とする。candidate検索中は`prepared`を維持する。`claim-create-attempt`を成功させたcallerだけが初回createでき、CAS conflict後にattemptedを読んだcallerは候補0件で新規createせずsafety-blockedにする。候補1件ならadopt、複数／mismatchはblockする。readiness失敗またはclaim write失敗ではremote callを行わない。`pending + no-effect-confirmed`は候補検索後に`retry-after-no-effect`を成功させたcallerだけが同じoperation identityでretryする。remote outcome不明後は候補1件adopt以外で新規createへ戻らない。markerは永続identity、title／body／labelsはC7がC8から得てcontextへ注入した`issueContent`だけを使う。

sync／closeの呼出し順は`read state → view issue → ownership verify → operation-specific guard → prepare receipt（未作成時） → readiness → attempted write → mutation → complete write`とする。readiness失敗時は`prepared`のまま、attempted write失敗時はremote mutationなしとする。

## C7 Mirror Lifecycle Coordinator

```ts
export type MirrorBoundaryContext = Readonly<{
  projectDir: string;
  intentDir: string;
  intentUuid: string;
  repository: RepositoryIdentity;
  boundary: MirrorBoundary;
  expectedPrompt?: MirrorExpectedPrompt;
}>;

export type MirrorBoundaryOutcome =
  | { kind: "none" }
  | { kind: "ask"; question: string; event: MirrorEventIdentity }
  | { kind: "continued"; mirror: readonly MirrorOperationOutcome[]; workflowMayAdvance: true };

export function driveMirrorBoundary(
  context: MirrorBoundaryContext,
): MirrorBoundaryOutcome;

export function reportMirrorChoice(
  context: MirrorBoundaryContext,
  answer: Readonly<{
    choice: "create" | "sync" | "close" | "skip";
    event: MirrorEventIdentity;
    operation: MirrorOperation;
  }>,
): MirrorBoundaryOutcome;
```

`driveMirrorBoundary`はpolicyを再評価し、workflow completionの`auto`だけ同じboundary instanceで最大3 operationをcreate→sync→closeの順にloopする。Intent Capture／phase／park／manualは最初のoperation resultでterminalにする。`prompt`では1 operationだけを`ask`として返す。`reportMirrorChoice`はstored expected promptとanswerを`approveMirrorPrompt`へ渡し、通常policyへ戻らずapproved executionまたはsuppressを得る。completionの成功後だけ同じcontextでdriverへ戻り、次のaskまたはterminal outcomeを返す。

別boundaryで未完了receiptをretryする場合、current boundaryの新eventを`triggerEvent`、元receipt eventをexecution `event`として分離し、元operationIdを継承する。old pendingをcurrent triggerの新operationより先にreconcileする。C7はcurrent `MirrorSnapshot`とC4 markerをC8へ渡して`MirrorIssueContent`を描画し、C6 contextへ注入する。

Mirror failureでも`workflowMayAdvance`はtrueである。config invalidはoperation／operationIdがまだない場合もC3のreceipt非依存`set-global-warning`でconfiguration warningをbest-effort永続化し、C0の`suppressed` outcomeを返す。warning writeも失敗した場合だけcurrent-invocation warningへfallbackする。safety-blockedと同様にIssue mutationを抑止した`continued`として返し、engine routingを置き換えない。

engine-owned boundary instanceは、Intent Capture approval receipt、phase verification receipt、park receipt、workflow completion receiptの永続IDから渡す。timestampや呼出し回数から再生成しない。

## C8 Presentation

```ts
export function renderMirrorStatus(context: MirrorStatusContext): string;
export function renderMirrorPrompt(decision: Extract<MirrorDecision, { kind: "prompt" }>): string;
export function renderMirrorIssue(snapshot: MirrorSnapshot, marker: string): MirrorIssueContent;
export function redactMirrorError(error: unknown): string;
```

statusはC1が解決したmode／sourceとC3 state、C4 provenance verificationを`MirrorStatusContext`へ明示的に集約し、mode、Issue番号、provenance、pending、warningを一画面でscanできる順序にする。modeは永続stateへ複製しない。warningはoperationと次アクションを含み、credentialやraw tokenを含まない。C7がcurrent `MirrorSnapshot`とmarkerをC8へ渡して`MirrorIssueContent`を生成し、C6のcontextへ注入する。C6はC8をimportせず、描画済みcontentだけをcreate／syncへ渡す。

## Manual repair methods

```ts
export function inspectMirrorRepair(
  context: MirrorExecutionContext,
  issueNumber?: number,
): GatewayOutcome<MirrorRepairPlan>;

export function applyMirrorRepair(
  context: MirrorExecutionContext,
  plan: MirrorRepairPlan,
  challenge: MirrorRepairChallenge,
  exactConfirmation: string,
): MirrorOperationOutcome;
```

CLIは`repair status`（read-only）、`repair relink --issue <n>`、`repair abandon --operation <id>`を提供する。relink／abandonは`auto`の継続同意に含めず、常に対象Intent・repository・operationとduplicate riskを示す人間promptを要求する。relink provenanceのcreatedAtはinspection時の注入clockで生成し、plan digestへfreezeする。prompt前にC3がchallengeを永続化し、human answerは`expectedPhrase`との完全一致を要求する。apply時はIntent UUID、repository、operationId、plan canonical digest、未消費challenge、10分以内を同じlockで検証し、repair transitionと同じatomic writeでchallengeを消費する。成功時は`repaired` outcomeを返す。再利用、別plan、別Intent、別repository、期限切れはmutationなしで拒否する。marker欠落Issueは自動relinkせず、利用者がGitHub側markerを修復した後に再検証する。

## State-write failure invariant

remote mutationを行う前に`attempted` receiptの永続化成功を必須とする。readiness失敗または`prepare`後の`attempted` write失敗では、永続済み`prepared`を維持し、`set-warning(effect=not-started)`で原因をbest-effort保存してremote callを行わない。warning writeも失敗した場合はcurrent invocation warningを表示する。最初の`prepare` write自体が失敗した場合だけreceiptも永続warningも不可能なので、current invocationの`state-write` warningを必ず表示し、次boundaryで同eventを再評価する。remote成功後の`complete` writeが失敗しても、既に永続化済みの`attempted` receiptとIssue markerのoperationIdから、次回statusは未解消warningを導出し、次境界はcandidate reconciliationへ入る。したがってpost-remote warningの正本は「`attempted` receiptが未完了であること」であり、失敗後に別warning writeが成功することへ依存しない。

## Error mapping

| 発生元 | component outcome | workflow効果 |
|---|---|---|
| config invalid | `suppressed: configuration` + operationIdなしのcurrent-invocation warning | mutationなし、warning表示、継続 |
| gateway一時障害 | `pending` | warning、次境界retry、継続 |
| provenance不一致 | `safety-blocked` | mutationなし、手動修復待ち、継続 |
| landing不成立 | `safety-blocked` | final sync／closeなし、継続 |
| state CAS不一致 | 再読込後に同eventを再評価 | 重複operation禁止 |
| `prepare` write失敗 | current-invocation `state-write` warning | receiptなし、remote callなし、次境界retry |
| `attempted` write失敗 | `prepared`維持＋best-effort `set-warning(effect=not-started)` | remote callなし、次境界retry |
| state parse不正 | `safety-blocked` | mutationなし、修復案表示 |
