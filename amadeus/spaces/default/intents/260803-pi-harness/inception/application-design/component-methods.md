# Pi Coding Agent対応 — コンポーネント公開メソッド

## 契約方針と上流トレーサビリティ

公開メソッドは`requirements`のFR-LIF、FR-GAT、FR-SUB、FR-DOC、FR-DST、FR-VALを直接検証できる粒度に限定する。`architecture`が定めるcore/overlay分離と、`component-inventory`にあるmanifest、doctor、swarm/pool、packagerの既存契約を再利用する。`stories`はscope上存在しないためSCN-001〜009を呼出しシナリオとし、`team-practices`は生成物ではなく解決済みmemory ruleから適用する。

すべての結果はdiscriminated unionで表し、必須能力の欠落、native failure、timeout、cancel、version/platform不一致を例外の握り潰しや成功値へ変換しない。秘密値、prompt本文、home絶対pathはerror detailへ含めない。

## Pi harnessとlifecycle

```ts
export function createPiHarnessManifest(): HarnessManifest;

export function registerAmadeusPiExtension(
  pi: ExtensionAPI,
  ports: PiExtensionPorts,
): PiExtensionRegistrationResult;

export function normalizePiEvent(
  event: SupportedPiEvent,
  context: PiEventContext,
): CanonicalHookInvocation | NoopOutcome | BlockedOutcome;

export async function handlePiInput(
  event: PiInputEvent,
  context: PiEventContext,
  ports: PresencePorts,
): Promise<PresenceOutcome>;

export async function handlePiSettled(
  event: PiAgentSettledEvent,
  context: PiEventContext,
  ports: ContinuationPorts,
): Promise<ContinuationOutcome>;
```

| メソッド | 目的 | 入力 / 出力 | failure契約 |
|---|---|---|---|
| `createPiHarnessManifest` | `.pi`、`stageEntry`、authored files、projectionを宣言 | 入力なし / schema-valid manifest | schema不整合はpackage時に失敗 |
| `registerAmadeusPiExtension` | Pi公開eventへhandlerを一度だけ登録 | Extension API、明示ports / `registered`または`blocked` | 必須port欠落・重複登録・unsupported capabilityをtyped resultで返す。read-only portは分離 |
| `normalizePiEvent` | version付きnative payloadをcanonical hookへ変換 | supported union / invocation、noop、blocked | 未知の必須event/versionはblocked。安全な非対象eventだけnoop |
| `handlePiInput` | human presence候補を分類し重複排除 | source、session/turn identity / minted、duplicate、ignored、blocked | `rpc`と`extension` sourceはignored。`interactive`のmint失敗はblocked |
| `handlePiSettled` | settle後のcontinuationを高々1回要求 | settled identity、pending state / continued、noop、blocked | `agent_end`は型として受け付けない。continuation失敗はblocked |

`PiExtensionRegistrationResult`は`{ kind: "registered"; capabilities: ... }`または`BlockedOutcome`である。呼出側は`registered`以外でworkflow-changing handlerを有効化せず、read-only status/doctor handlerだけを登録できる。`PiExtensionPorts`はcore CLI/hookを呼ぶ狭いport、clock/id factory、read-only diagnostic portから成る。テストはfake portへversion付きcaptured fixtureを再生し、model/networkを使わずevent mappingとidempotencyを検証する。

## Subagent driver

```ts
export type PiChildRole = "support" | "reviewer" | "construction";

type NonEmptyId<T extends string> = string & { readonly __brand: T };

export interface PiChildRequest {
  executionId: NonEmptyId<"execution">;
  childId: NonEmptyId<"child">;
  parentId: NonEmptyId<"parent">;
  role: PiChildRole;
  workspace: string;
  task: string;
  persona: string;
  timeoutMs: number;
}

export type PiChildResult =
  | { kind: "succeeded"; executionId: string; childId: string; sessionId: string; output: string }
  | { kind: "failed"; executionId: string; childId: string; sessionId: string | null; code: PiChildFailureCode; detail: string }
  | { kind: "timed-out"; executionId: string; childId: string; sessionId: string | null; timeoutMs: number }
  | { kind: "cancelled"; executionId: string; childId: string; sessionId: string | null; reason: string };

export type PiChildFailureCode =
  | "delivery-in-progress" | "idempotency-conflict"
  | "pi-not-found" | "pi-probe-failed" | "unsupported-pi-version" | "unsupported-platform"
  | "spawn-failed" | "launch-intent-audit-failed" | "guardian-protocol-failed" | "process-accept-audit-failed" | "session-identity-audit-failed"
  | "lifecycle-reserve-failed" | "pending-terminal-read-failed" | "stale-execution-scan-failed"
  | "rpc-handshake-failed" | "rpc-framing-invalid" | "rpc-response-invalid" | "prompt-rejected"
  | "agent-error" | "extension-error" | "process-exited-before-settled" | "output-capacity-exceeded"
  | "process-reap-failed" | "terminal-audit-failed" | "replay-payload-unavailable" | "stale-execution-recovered"
  | "quarantine-index-read-failed" | "reconciliation-quarantined" | "reconciliation-visibility-failed";

export type PiChildAdmissionFailure = {
  kind: "admission-failed";
  code: "invalid-request" | "invalid-role" | "invalid-workspace" | "invalid-timeout";
  field: string;
  detail: string;
};

export type PiReconciliationBatchOutcome =
  | { kind: "completed"; batchId: string; attempted: number; committed: number; failures: ReadonlyArray<{ keyDigest: string; code: PiReconciliationFailureCode; visibility: "lifecycle-audit" | "emergency-diagnostic" }> }
  | { kind: "visibility-failed"; batchId: string | null; code: "reconciliation-visibility-failed"; detail: string };

export type PiReconciliationFailureCode =
  | "terminal-audit-failed"
  | "pending-terminal-read-failed"
  | "stale-execution-detected"
  | "reconciliation-quarantined";

export type PiChildExecutionResponse =
  | PiChildAdmissionFailure
  | { kind: "durable-result"; reconciliation: PiReconciliationBatchOutcome; result: PiChildResult; acknowledgment: PiChildAcknowledgmentHandle }
  | { kind: "non-acknowledgeable-failure"; reconciliation: PiReconciliationBatchOutcome; result: Extract<PiChildResult, { kind: "failed" }>; acknowledgment: null };

export type PiChildAcknowledgmentHandle = string & { readonly __brand: "pi-child-ack-v1" };

export async function executePiChild(
  input: unknown,
  signal: AbortSignal,
  ports: PiChildProcessPorts,
): Promise<PiChildExecutionResponse>;

export async function acknowledgePiChildResult(
  handle: PiChildAcknowledgmentHandle,
  ports: Pick<PiChildProcessPorts, "lifecycle">,
): Promise<{ kind: "acknowledged" | "already-acknowledged" } | { kind: "failed"; code: "replay-ack-failed"; detail: string }>;
```

`executePiChild`はraw inputをall-or-nothingでadmitし、失敗時はidentityを持たない`PiChildAdmissionFailure`を返す。original resultをreplay可能なterminal commit/replayはopaque acknowledgment handle付き`durable-result`、terminal audit未確定またはpayload復元不能のfailureはhandleなし`non-acknowledgeable-failure`となる。parentはresult取込み後に公開`acknowledgePiChildResult`へhandleをそのまま返し、digest/keyを構成しない。成功時だけnon-empty branded identityを持つ`PiChildRequest`を内部spawn pathへ渡すため、`executionId`と`childId`は全`PiChildResult`で必須かつ同一である。

## Doctor、配布、検証

```ts
export async function probePiEnvironment(
  input: PiDoctorInput,
  ports: PiDoctorPorts,
): Promise<PiDoctorReport>;

export function projectPiPackage(
  input: PiProjectionInput,
): PiPackageProjection;

export function comparePiResourceManifests(
  setup: NormalizedResourceManifest,
  packageView: NormalizedResourceManifest,
): ParityResult;

export async function recoverSetupTransaction(
  target: string,
  ports: SetupTransactionPorts,
): Promise<SetupRecoveryResult>;

export function planSetupTransaction(
  plan: Plan,
  target: string,
): Result<SetupTransactionPlan, SetupTransactionRefusal>;

export async function applySetupTransaction(
  transaction: SetupTransactionPlan,
  ports: SetupTransactionPorts,
): Promise<SetupTransactionResult>;

export async function runPiLiveJourney(
  input: PiLiveJourneyInput,
  signal: AbortSignal,
): Promise<PiLiveJourneyResult>;
```

| メソッド | 目的 | 主な結果 |
|---|---|---|
| `probePiEnvironment` | version、OS、Bun、trust、skills、extensions、package resource、driverを独立check | check id、observed、expected、remediationを持つreport。Pi-only fixtureで他harness要件なし |
| `projectPiPackage` | authored manifestからsetup payloadとPi Package viewを生成 | resource list、相対path、sha256、provenance。出力先は生成面のみ |
| `comparePiResourceManifests` | 二つの導入経路の同一性を判定 | missing/extra/hash mismatchのclosed diff。完全一致時だけ`equal` |
| `recoverSetupTransaction` | 前回中断したwrite-ahead journalを先に回収 | recovered、clean、blocked。回収不能時は新規apply禁止 |
| `planSetupTransaction` | 全file action/conflictとrollback材料をmutation前に確定 | staged entries、backup map、journal path、commit manifest。conflict時はwrite 0 |
| `applySetupTransaction` | stage→journal→apply→commitまたは逆順rollbackを所有 | committed、rolled-back、recovery-required。途中failureをsuccessへ変換しない |
| `runPiLiveJourney` | RPCでskill、gate、audit、continuationを縦断 | exit、Pi version、OS、provider識別子、commit、assertion一覧。skipは日常CI用の別結果で正式完了証拠にならない |

## 共通結果型とエラー処理

```ts
export type BlockReason =
  | "unsupported-pi-version"
  | "unsupported-platform"
  | "project-untrusted"
  | "missing-extension-capability"
  | "missing-core-port"
  | "rpc-handshake-failed"
  | "resource-parity-failed";

export interface BlockedOutcome {
  kind: "blocked";
  reason: BlockReason;
  checkId: string;
  remediation: readonly string[];
}
```

workflow-changing methodは`BlockedOutcome`を受け取った時点でstate/artifact mutationを開始しない。既に開始したsetup updateはtransaction plan全体をrollbackする。diagnostic methodは同じ欠落状態を観測できるが、trust承認・file修復・再実行を自動化しない。

setup transactionのcommit pointは、全managed file actionが完了し、新しいinstall manifestをsame-directory atomic renameで置換した時点である。それ以前のfailureはjournalの逆順actionとbackupから元状態へ戻す。process interruptionで同期rollbackできなかった場合はjournalを残し、次回`recoverSetupTransaction`が完了するまでinstall/upgradeをfail-closedにする。
