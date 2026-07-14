# Swarm Driver 公開メソッド設計

## 上流コンテキスト

`requirements`のFR-01〜FR-26とNFR-01〜NFR-12、brownfieldの`architecture`・`component-inventory`、`team-practices`を契約の根拠とする。`stories`は計画上SKIPされたため、利用シナリオUSR-01〜USR-10を外部振る舞いとして使用する。

以下はApplication Design時点の公開境界である。詳細な条件分岐とprovider event field pathはFunctional Designで固定するが、型の開閉、所有権、fail-closed境界はここで確定する。

## 共通型

```ts
type Harness = "claude" | "codex" | "kiro" | "kiro-ide";

type RequestedDriver =
  | "auto"
  | "claude-agent-teams"
  | "claude-ultracode"
  | "codex-ultra"
  | "kiro-subagent";

type NativeDriver = Exclude<RequestedDriver, "auto">;
type FloorDriver =
  | "claude-task-floor"
  | "codex-exec-floor"
  | "kiro-subagent-floor";
type SelectedDriver = NativeDriver | FloorDriver;
type ExecutionMode = "native" | "floor" | "legacy";
type LegacyExecution =
  | "claude-dynamic-workflow"
  | "claude-task-floor"
  | "codex-exec-floor"
  | "kiro-subagent-floor";

type Topology = "coordinated" | "independent" | "unknown";
type TopologyReason =
  | "coordination-signal"
  | "independent-signal"
  | "coordination-precedence"
  | "no-signal";

type FallbackReason =
  | "none"
  | "cli-unavailable"
  | "authentication-unavailable"
  | "native-surface-unavailable"
  | "native-evidence-unavailable"
  | "trust-unavailable"
  | "capability-probe-failed";

type ProbeStatus = "available" | "unavailable" | "error";
type ActiveAttemptState =
  | "probing"
  | "selected"
  | "prepared"
  | "dispatched"
  | "evidence-verified"
  | "referee-running";
type AttemptState =
  | ActiveAttemptState
  | "succeeded"
  | "failed-resumable"
  | "failed-terminal";

type ExecutionFailureCode =
  | "INPUT_INVALID"
  | "EXPLICIT_DRIVER_UNAVAILABLE"
  | "COORDINATOR_FAILED"
  | "NATIVE_MODE_NOT_CONFIRMED"
  | "NATIVE_EVIDENCE_MISSING"
  | "NATIVE_EVIDENCE_CORRELATION_FAILED"
  | "NATIVE_CHILD_FAILED"
  | "REFEREE_RESULT_MISMATCH"
  | "REFEREE_RESUMABLE_FAILURE"
  | "REFEREE_TERMINAL_FAILURE"
  | "ATTEMPT_LEASE_ACTIVE"
  | "ATTEMPT_LIVENESS_UNKNOWN"
  | "ORPHAN_PROCESS_GROUP_ACTIVE"
  | "PERSISTENCE_FAILED";

type RefereeFailureCode =
  | "CHECK_NOT_CONVERGED"
  | "CHECK_PROCESS_FAILED"
  | "FINALIZE_PROCESS_FAILED"
  | "MERGE_FAILED"
  | "REFEREE_AUDIT_FAILED"
  | "PROTECTED_SPEC_BINDING_INVALID"
  | "LYING_CONDUCTOR_DETECTED"
  | "BATCH_BINDING_MISMATCH"
  | "ENVELOPE_SCHEMA_INVALID";
```

`RequestedDriver`と`SelectedDriver`を分離し、`selected="auto"`を型で不可能にする。floorは公開env値として受理せず、内部結果にだけ現れる。`native-evidence-unavailable`はpreflightでevidence capture surface自体を利用できない場合だけの`FallbackReason`である。dispatch後の証跡欠落は別unionの`ExecutionFailureCode`を使い、fallbackへ流さない。

## C-01 `SwarmDriverCoordinator`

```ts
interface SwarmDriverCoordinator {
  resolve(input: ResolveInput): Promise<ResolutionPlan>;
  run(input: RunInput): Promise<DriverRunResult | FloorExecutionPlan | LegacyHarnessExecutionPlan>;
  resume(input: ResumeInput): Promise<ResolutionPlan>;
  recordFloor(input: RecordFloorInput): Promise<FloorRunResult>;
  recordLegacy(input: RecordLegacyInput): Promise<LegacyRunResult>;
  recordFinalize(input: RecordFinalizeInput): Promise<AttemptSummary>;
  status(input: StatusInput): Promise<AttemptSummary | null>;
}

interface ResolveInput {
  projectDir: string;
  recordDir: string;
  harness: Harness;
  batch: number;
  units: readonly UnitManifestEntry[];
  topologySignals: readonly TopologySignal[];
  env: SwarmEnvironment;
}

type ResolutionPlan = DriverPlan | LegacyExecutionPlan;

interface DriverPlan {
  kind: "driver-plan";
  schemaVersion: 1;
  executionId: string;
  attemptId: string;
  requested: RequestedDriver;
  selected: SelectedDriver;
  executionMode: "native" | "floor";
  harness: Harness;
  batch: number;
  topology: Topology;
  topologyReason: TopologyReason;
  fallbackReason: FallbackReason;
  probe: ProbeResult;
  waves: readonly UnitWave[];
  planDigest: string;
  attemptNonceHash: string;
}

interface LegacyExecutionPlan {
  kind: "legacy-execution-plan";
  schemaVersion: 1;
  executionId: string;
  attemptId: string;
  harness: Harness;
  batch: number;
  source: "legacy-env";
  legacyEnabled: boolean;
  execution: LegacyExecution;
  selectedFloor?: FloorDriver;
  degradedFrom?: "claude-dynamic-workflow" | "ultracode";
  warningCode: "AMADEUS_USE_SWARM_DEPRECATED";
  planDigest: string;
  attemptNonceHash: string;
}

interface RunInput {
  executionId: string;
  attemptId: string;
  preparedUnits: readonly PreparedUnit[];
  convergenceCommand: string;
  protectedSpec?: string;
}

interface DriverRunResult {
  executionId: string;
  attemptId: string;
  selected: NativeDriver;
  evidence: EvidenceVerdict;
  completedUnits: readonly string[];
  failedUnits: readonly UnitFailure[];
  coordinatorExitCode: number;
}

interface FloorExecutionPlan {
  kind: "floor-execution-plan";
  executionId: string;
  attemptId: string;
  selected: FloorDriver;
  units: readonly PreparedUnit[];
  planDigest: string;
}

interface LegacyHarnessExecutionPlan {
  kind: "legacy-harness-execution-plan";
  executionId: string;
  attemptId: string;
  execution: LegacyExecution;
  units: readonly PreparedUnit[];
  planDigest: string;
}

interface RecordFloorInput {
  executionId: string;
  attemptId: string;
  selected: FloorDriver;
  unitResults: readonly FloorUnitResult[];
}

interface RecordLegacyInput {
  executionId: string;
  attemptId: string;
  execution: LegacyExecution;
  planDigest: string;
  unitResults: readonly FloorUnitResult[];
}

interface UnitManifestEntry {
  unit: string;
  dependencies: readonly string[];
  coordinationSignals: ReadonlyArray<TopologySignal["kind"]>;
}

interface UnitWave {
  index: number;
  units: readonly string[];
}

interface PreparedUnit {
  unit: string;
  worktreePath: string;
  branchName: string;
}

interface UnitFailure {
  unit: string;
  code: string;
}

interface FloorUnitResult {
  unit: string;
  outcome: "completed" | "failed";
  workerCorrelationId?: string;
}

interface FloorRunResult {
  executionId: string;
  attemptId: string;
  selected: FloorDriver;
  completedUnits: readonly string[];
  failedUnits: readonly UnitFailure[];
}

interface LegacyRunResult {
  executionId: string;
  attemptId: string;
  execution: LegacyExecution;
  completedUnits: readonly string[];
  failedUnits: readonly UnitFailure[];
}

interface ResumeInput {
  projectDir: string;
  recordDir: string;
  batch: number;
}

interface RecordFinalizeInput {
  executionId: string;
  attemptId: string;
  refereeResult: RefereeFinalizeEnvelope;
}

interface StatusInput {
  recordDir: string;
  batch: number;
}

interface AttemptSummary {
  executionId: string;
  attemptId: string;
  batch: number;
  state: AttemptState;
  selected?: SelectedDriver;
  legacyExecution?: LegacyExecution;
  completedUnits: readonly string[];
  failedUnits: readonly string[];
}

interface RefereeFinalizeEnvelope {
  schemaVersion: 1;
  executionId: string;
  attemptId: string;
  finalizeInvocationId: string;
  batch: number;
  planDigest: string;
  worktreeManifestDigest: string;
  mergedUnits: readonly string[];
  failedUnits: readonly RefereeUnitFailure[];
  mergeCompleted: boolean;
  unitMerges: readonly UnitMergeResult[];
  resultDigest: string;
}

interface UnitMergeResult {
  unit: string;
  unitHeadCommit: string;
  trunkCommitBefore: string;
  trunkCommitAfter: string;
  mergeCommit?: string;
}

interface RefereeUnitFailure {
  unit: string;
  code: RefereeFailureCode;
}
```

### メソッド契約

| Method | 事前条件 | 成功結果 | 失敗時 |
|---|---|---|---|
| `resolve` | multi-Unit `invoke-swarm`、正のbatch、重複なしUnit | batch内1回のprobeと決定的planをatomic保存 | env不正・明示driver不一致・明示probe失敗はworktree/worker作成前のhard error |
| `run` | 同じattemptが`selected`、全Unitのreferee worktreeが存在 | nativeは閉じたtransportでcoordinator 1 processを起動してevidence verifiedまで進める。floor/legacy harnessはconductor用planを返す | dispatch後のevidence欠落は`failed-resumable`。fallback禁止 |
| `resume` | stateが`failed-resumable`、または期限切れleaseを持つactive stateをrecovery可能 | 同じexecution ID、新attempt ID、新lease/fencing tokenでprobeから再開 | 生存owner、liveness不明、checkpoint破損、batch不一致、`succeeded`、`failed-terminal`はfail-closed |
| `recordFloor` | conductorがplanどおり既存floorを実行し、全Unit結果を返す | native証跡不要のfloor完了を記録 | plan外Unit、driver不一致、結果欠落はfail-closed |
| `recordLegacy` | legacy planどおり現行ハーネス挙動を実行した | 0.1.x結果を新driverへ読み替えず記録 | execution/plan digest/Unit不一致はfail-closed |
| `recordFinalize` | referee envelopeのexecution/attempt/plan/worktree/finalize IDとdigestが現在attemptに一致 | 全Unit merge commitとresult digest一致時だけ`succeeded`、再試行可能な失敗は`failed-resumable` | stale envelope、相関不一致、audit/checkpoint書込失敗は成功を返さない |
| `status` | recordDirが解決できる | redaction済み要約 | checkpoint不在は`null`、parse失敗は診断error |

CLIは各methodへ薄く対応し、stdoutへversioned JSON 1件、stderrへ人向け診断を出す。prompt本文とprovider生出力はどちらにも出さない。

## C-03 `DriverSelector`

```ts
interface DriverSelector {
  parseRequest(env: SwarmEnvironment): ParsedRequest;
  classifyTopology(signals: readonly TopologySignal[]): TopologyDecision;
  select(input: SelectionInput): SelectionDecision;
  splitWaves(driver: SelectedDriver, units: readonly UnitManifestEntry[]): readonly UnitWave[];
}

interface SwarmEnvironment {
  AMADEUS_SWARM_DRIVER?: string;
  AMADEUS_USE_SWARM?: string;
}

interface TopologyDecision {
  topology: Topology;
  reason: TopologyReason;
  signals: readonly TopologySignal[];
}

interface SelectionDecision {
  selected: SelectedDriver;
  executionMode: "native" | "floor";
  fallbackReason: FallbackReason;
}

type ParsedRequest =
  | { source: "default"; requested: "auto" }
  | { source: "new-env"; requested: RequestedDriver }
  | { source: "legacy-env"; rawValueClass: "enabled" | "other"; enabled: boolean };

interface TopologySignal {
  unit: string;
  kind:
    | "shared-task"
    | "direct-message"
    | "mutual-coordination"
    | "independent-fanout"
    | "iterative-convergence";
}

interface SelectionInput {
  request: ParsedRequest;
  harness: Harness;
  topology: TopologyDecision;
  capabilities: ReadonlyMap<NativeDriver, ProbeResult>;
}
```

### Error契約

```ts
type SelectorError =
  | { code: "INVALID_DRIVER"; accepted: readonly RequestedDriver[] }
  | { code: "CONFLICTING_ENV"; variables: readonly [string, string] }
  | { code: "HARNESS_DRIVER_MISMATCH"; harness: Harness; requested: NativeDriver }
  | { code: "EXPLICIT_DRIVER_UNAVAILABLE"; requested: NativeDriver; reason: FallbackReason };
```

- 設定済み空文字、大小文字違い、floor ID、未知値は`INVALID_DRIVER`。
- 新旧envが両方存在すれば値にかかわらず`CONFLICTING_ENV`。
- 明示native driverはfallback pathを返さない。
- `auto`だけが要求仕様の固定順で次候補またはfloorへ進む。
- Kiroの`splitWaves`は、`waveCount = ceil(unitCount / 4)`、`base = floor(unitCount / waveCount)`、先頭`unitCount % waveCount` waveへ1件ずつ加算する。multi-Unit入力では各waveが必ず2〜4件になり、5件は3+2、9件は3+3+3、13件は4+3+3+3となる。他driverはbatch全体を1 waveとする。

### 0.1.x legacy解決表

`AMADEUS_SWARM_DRIVER`が存在する行では、旧変数の値にかかわらず`CONFLICTING_ENV`となる。以下は新変数が未設定の場合の全契約である。「other」は`0`、空文字、未知文字列を含む旧変数の任意の非`1`値であり、0.1.x互換上はinvalid errorではなくdisabled扱いになる。

| Harness | 旧変数state | 実行plan | `selectedFloor` | warning | audit | error |
|---|---|---|---|---|---|---|
| Claude | unset | 新契約`requested=auto` | auto解決後の値 | なし | 新契約driver event | なし |
| Claude | enabled (`1`) | `claude-dynamic-workflow`。surface unavailable時だけfloor | degrade時`claude-task-floor` | 毎attempt | legacy利用。degrade時`SWARM_DEGRADED` | workflow実行後failureは代替なし |
| Claude | other | 既存floor | `claude-task-floor` | 毎attempt | legacy利用、degradeなし | なし |
| Claude | 新旧併存 | 実行しない | — | なし | conflict error | `CONFLICTING_ENV` |
| Codex | unset | 新契約`requested=auto` | auto解決後の値 | なし | 新契約driver event | なし |
| Codex | enabled (`1`) | 既存floor | `codex-exec-floor` | 毎attempt | legacy利用 + `SWARM_DEGRADED`（degraded from ultracode） | なし |
| Codex | other | 既存floor | `codex-exec-floor` | 毎attempt | legacy利用、degradeなし | なし |
| Codex | 新旧併存 | 実行しない | — | なし | conflict error | `CONFLICTING_ENV` |
| Kiro | unset | 新契約`requested=auto` | auto解決後の値 | なし | 新契約driver event | なし |
| Kiro | enabled (`1`) | 既存floor | `kiro-subagent-floor` | 毎attempt | legacy利用 + `SWARM_DEGRADED`（degraded from ultracode） | なし |
| Kiro | other | 既存floor | `kiro-subagent-floor` | 毎attempt | legacy利用、degradeなし | なし |
| Kiro | 新旧併存 | 実行しない | — | なし | conflict error | `CONFLICTING_ENV` |
| Kiro IDE | unset | 新契約`requested=auto` | auto解決後の値 | なし | 新契約driver event | なし |
| Kiro IDE | enabled (`1`) | 既存floor | `kiro-subagent-floor` | 毎attempt | legacy利用 + `SWARM_DEGRADED`（degraded from ultracode） | なし |
| Kiro IDE | other | 既存floor | `kiro-subagent-floor` | 毎attempt | legacy利用、degradeなし | なし |
| Kiro IDE | 新旧併存 | 実行しない | — | なし | conflict error | `CONFLICTING_ENV` |

## C-04〜C-07 Adapter interface

```ts
interface DriverAdapter {
  readonly driver: NativeDriver;
  supports(harness: Harness): boolean;
  probe(input: ProbeInput): Promise<ProbeResult>;
  buildExecution(input: LaunchInput): AdapterExecutionPlan;
  resolveCaptureBinding(input: CaptureBindingInput): CaptureBindingResolution;
  observeControl(input: LiveEvidenceInputs, context: NormalizeContext): AsyncIterable<DriverControlSignal>;
  normalize(input: EvidenceInputs, context: NormalizeContext): AsyncIterable<NormalizedDriverEvent>;
}

interface ProbeInput {
  projectDir: string;
  batch: number;
  timeoutMs: number;
  environment: Readonly<Record<string, string>>;
}

interface LaunchInput {
  plan: DriverPlan;
  wave: UnitWave;
  preparedUnits: readonly PreparedUnit[];
  convergenceCommand: string;
  protectedSpec?: string;
  evidenceDir: string;
}

interface ProbeResult {
  status: ProbeStatus;
  reason: FallbackReason;
  cliVersion?: string;
  modeIdentifier?: string;
  checks: readonly ProbeCheck[];
}

interface ProbeCheck {
  name: "cli" | "auth" | "mode" | "trust" | "handshake";
  ok: boolean;
  diagnosticCode: string;
}

interface AdapterExecutionPlan {
  launch: LaunchSpec;
  capture: EvidenceCapturePlan;
  captureIdentity: CaptureIdentity;
}

interface LaunchSpec {
  executable: string;
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string>>;
  transport: CoordinatorTransport;
  timeoutMs: number;
}

type CoordinatorTransport =
  | {
      kind: "stdio-json";
      stdin: "closed" | Uint8Array;
      output: "stream-json" | "jsonl";
    }
  | {
      kind: "pty-interactive";
      initialInput: Uint8Array;
      columns: 120;
      rows: 40;
      exitOnSignal: "ready-for-graceful-exit";
      gracefulExitInput: Uint8Array;
      controlTimeoutMs: number;
      gracefulExitTimeoutMs: number;
    };

type EvidenceCapturePlan =
  | {
      kind: "fixed-provider-path";
      initialBinding: FixedCaptureBinding;
      hookDir: string;
    }
  | {
      kind: "event-bound-provider-path";
      hookDir: string;
    }
  | {
      kind: "hook-only";
      hookDir: string;
    };

interface CaptureIdentity {
  executionId: string;
  attemptId: string;
  attemptNonceHash: string;
  planDigest: string;
  waveIndex: number;
  waveDigest: string;
}

interface FixedCaptureBinding {
  kind: "fixed-provider-path";
  nativeRunId: string;
  exactPaths: readonly string[];
  exactPathDigest: string;
  sourcePlanDigest: string;
}

interface EventBoundCaptureBinding {
  kind: "event-bound-provider-path";
  nativeRunId: string;
  exactPaths: readonly string[];
  exactPathDigest: string;
  sourceEventDigest: string;
}

type CaptureBinding = FixedCaptureBinding | EventBoundCaptureBinding;

interface CaptureBindingInput {
  plan: Extract<EvidenceCapturePlan, { kind: "event-bound-provider-path" }>;
  identity: CaptureIdentity;
  event: RawNativeEvent;
}

type CaptureBindingResolution =
  | { kind: "not-binding" }
  | { kind: "bound"; binding: EventBoundCaptureBinding }
  | { kind: "invalid"; diagnosticCode: string };

interface RawNativeEvent {
  source: "stream" | "hook";
  bytes: Uint8Array;
}

interface LiveEvidenceInputs {
  providerState: AsyncIterable<Uint8Array>;
  nativeEvents: AsyncIterable<RawNativeEvent>;
}

interface DriverControlSignal {
  kind: "ready-for-graceful-exit";
  driver: NativeDriver;
  executionId: string;
  attemptId: string;
  attemptNonceHash: string;
  planDigest: string;
  waveIndex: number;
  waveDigest: string;
  coveredUnits: readonly string[];
  liveEvidenceDigest: string;
}

interface EvidenceInputs extends LiveEvidenceInputs {
  processTerminal: {
    transport: CoordinatorTransport["kind"];
    exitCode: number;
    processGroupId: number;
  };
}

interface NormalizeContext {
  driver: NativeDriver;
  executionId: string;
  attemptId: string;
  attemptNonceHash: string;
  planDigest: string;
  waveIndex: number;
  waveDigest: string;
  expectedUnits: readonly string[];
}
```

`buildExecution`はshell文字列を返さず、executableとargvを分離してcommand injectionを防ぐ。`EvidenceCapturePlan`の`fixed-provider-path`はAgent Teams等、`event-bound-provider-path`はUltra/Kiro等、`hook-only`はCodex等を表し、runtimeへprovider名の分岐を持ち込まない。fixed variantはadapterがattempt専用session等のlaunch planからarm前に`initialBinding`を構築し、`sourcePlanDigest`へ束縛する。event-bound variantだけが`resolveCaptureBinding`を呼び、provider eventをnative run IDとexact pathへ変換する。hook-only variantはbindingを持たずresolverを呼ばない。

runtimeはbindingのraw absolute pathを永続化せず、variant、native run ID、path digest、source plan/event digestだけをaudit-firstでcheckpointへ保存してからobserverへexact pathを渡す。fixedでinitial binding欠落、event-boundでarm前bindingあり、hook-onlyでbindingあり、resolverの`invalid`、2件目の異なるbinding、binding前のstate readはfail-closedとする。

capture supervisorはprovider stateとsource-tag付きstream/hook eventをlive projectionとterminal後のretained projectionへfan-outする。PTY transportでは`observeControl`がlive projectionからprovider固有の完了条件を判定し、全expected Unitを覆う`ready-for-graceful-exit`だけをruntimeへ返す。runtimeはcorrelationとdigestを検査して`gracefulExitInput`をPTYへ1回だけ送信し、その後にprocess group terminalを待つ。このsignalは終了制御だけに使い、native successには数えない。timeout、partial/unknown/failed stateではsignalを生成せず、runtimeがprocess groupを停止して`failed-resumable`にする。stdio transportはcontrol signalを要求せずprocess terminalを直接待つ。

全transportの順序は、capture observer開始 → capture identity/planの`prepared-dispatched`保存 → provider arm/spawn → event-bound `capture-bound`保存（state read前）→ PTYだけlive control signalとgraceful-exit入力 → process group terminal → observer `stopAndWait` → retained 3-channel `EvidenceInputs`の`normalize`、とする。capture開始前のprovider arm、binding前のprovider state read、PTY signal前のgraceful-exit、process terminal前のjoin、join失敗後の空evidence成功を禁止する。`probe`はversionだけでavailableを返さず、CLI・auth・mode/trust・非破壊handshakeの全checkを要求する。timeoutは`CLI_METADATA_TIMEOUT_MS=5_000`、`AUTH_STATUS_TIMEOUT_MS=10_000`、`BEHAVIOR_HANDSHAKE_TIMEOUT_MS=30_000`、1候補の総deadlineを`45_000`とする。timeout値は共通定数を正本とし、環境変数では任意変更させない。

### Driver固有mode識別子

| Driver | Launchの必須指定 | `modeIdentifier` | native成功証跡 |
|---|---|---|---|
| `claude-agent-teams` | `pty-interactive`、Agent Teams env、in-process teammate mode、attempt専用session ID、Task/Teammate hook | `claude-agent-teams-v1` | exact `session-<id8>` team、2 members以上、共有taskのUnit割当、全owner idle |
| `claude-ultracode` | `stdio-json`、`claude -p --verbose --effort ultracode --output-format stream-json --include-hook-events` | `claude-dynamic-workflow-v1` | workflow run ID、completed snapshot、2 native task/agent以上、journal/hookとのID一致、Unit割当 |
| `codex-ultra` | `codex exec --json`、`model_reasoning_effort="ultra"`、`features.multi_agent=true`、attempt専用Subagent hooks | `codex-ultra-v1:<resolved-model-id>` | resolved modelのUltra受理、thread ID、2 child agent ID以上、Unit割当 |
| `kiro-subagent` | `chat --no-interactive`、trusted subagent設定、balanced wave 2〜4 | `kiro-subagent-v1` | parent session ID、予定数のchild session、Unit全単射、全child completed stop |

`codex-ultra`の識別子はAmadeus内部contractである。model slugは型へ固定せず、実行時catalog/configとbehavior probeから、解決modelがUltra reasoningを受理することを判定する。`ultra`不受理、`xhigh`へのdowngrade、model不明はいずれもcapability failureとする。

## C-08 `NativeEvidenceVerifier`

```ts
type EvidenceSource =
  | "model-handshake"
  | "provider-state"
  | "session-metadata"
  | "process-lifecycle"
  | "stream"
  | "hook";

interface EvidenceEventBase {
  v: 1;
  driver: NativeDriver;
  source: EvidenceSource;
  executionId: string;
  attemptId: string;
  attemptNonceHash: string;
  planDigest: string;
  waveIndex: number;
  waveDigest: string;
  nativeRunId: string;
}

interface UnitChildBinding {
  unit: string;
  childId: string;
}

type NormalizedDriverEvent =
  | (EvidenceEventBase & {
      kind: "mode-confirmed";
      source: "model-handshake" | "provider-state" | "session-metadata" | "stream";
      modeIdentifier: string;
      resolvedModelId?: string;
    })
  | (EvidenceEventBase & {
      kind: "coordinator-started";
      source: "process-lifecycle";
      coordinatorId: string;
    })
  | (EvidenceEventBase & {
      kind: "native-state-observed";
      source: "provider-state" | "session-metadata" | "hook";
      snapshotDigest: string;
      bindings: readonly UnitChildBinding[];
    })
  | (EvidenceEventBase & {
      kind: "native-child-started";
      source: "stream" | "hook" | "provider-state" | "session-metadata";
      childId: string;
      unit: string;
    })
  | (EvidenceEventBase & {
      kind: "native-child-stopped";
      source: "stream" | "hook" | "provider-state" | "session-metadata";
      childId: string;
      unit: string;
      outcome: "completed" | "failed";
    })
  | (EvidenceEventBase & {
      kind: "native-coordination";
      source: "stream" | "hook";
      marker: NativeMarker;
    })
  | (EvidenceEventBase & {
      kind: "coordinator-stopped";
      source: "process-lifecycle";
      coordinatorId: string;
      exitCode: number;
    });

type NativeMarker =
  | "claude-team-membership"
  | "claude-shared-task"
  | "claude-workflow"
  | "codex-subagent-hook"
  | "kiro-parent-child-session";

interface NativeEvidenceVerifier {
  verify(input: EvidenceInput): EvidenceVerdict;
}

interface EvidenceInput {
  driver: NativeDriver;
  executionId: string;
  attemptId: string;
  attemptNonceHash: string;
  planDigest: string;
  expectedWaves: readonly ExpectedWave[];
  events: readonly NormalizedDriverEvent[];
}

interface ExpectedWave {
  index: number;
  digest: string;
  units: readonly string[];
}

interface EvidenceVerdict {
  ok: boolean;
  markers: readonly NativeMarker[];
  sources: readonly EvidenceSource[];
  nativeRunIds: readonly string[];
  childCount: number;
  completedChildCount: number;
  coveredUnits: readonly string[];
  missingUnits: readonly string[];
  failedUnits: readonly string[];
  verifiedWaveDigests: readonly string[];
  diagnosticCode: string;
  failureCode?: ExecutionFailureCode;
}
```

生eventのmessage/prompt/output textはnormalized unionに存在しない。adapterが未知schemaを見た場合はeventを捨てて`UNKNOWN_NATIVE_EVENT`を件数だけ診断へ加える。

verifierは次のAND条件を全waveへ適用する。

1. 全eventのdriver、execution/attempt、attempt nonce hash、plan digest、wave index/digestが期待値と完全一致する。
2. driver別に独立sourceを要求する。Agent Teamsは`provider-state + hook`、Claude Ultraは`provider-state + stream + hook`、Codex Ultraは`model-handshake + stream + hook`、Kiroは`session-metadata + stream`を必須にする。`process-lifecycle`はcoordinatorの生存・終了相関にだけ使い、native delegationの独立source数へ算入しない。
3. 各waveにcoordinator startとexit 0のstopがあり、同じcoordinator/native runへ相関する。
4. `native-state-observed.bindings`がwave Unitsとchild IDsの全単射であり、重複・余分・欠落がない。
5. 全bindingについてchild startと`outcome=completed`のchild stopが存在する。startedだけ、failed stop、coordinatorだけの成功を拒否する。
6. driver固有markerとmode confirmationが存在する。Codexはresolved modelのUltra受理も別途必須にする。

いずれかを満たさなければ`ExecutionFailureCode`で`ok=false`とし、`FallbackReason`へ変換しない。worktree成果はさらにC-11の`check` / `finalize`を通る。

## C-09 `DriverAttemptStore`

```ts
interface DriverAttemptStore {
  begin(plan: ResolutionPlan): Promise<AttemptCheckpoint>;
  transition(input: AttemptTransition): Promise<AttemptCheckpoint>;
  read(batch: number): Promise<AttemptCheckpoint | null>;
  beginResume(input: BeginResumeInput): Promise<AttemptCheckpoint>;
}

interface BeginResumeInput {
  batch: number;
  newOwner: ProcessIdentity;
}

interface ProcessIdentity {
  cloneId: string;
  hostHash: string;
  pid: number;
  processStartTokenHash: string;
  processGroupId: number;
}

interface AttemptLease {
  leaseId: string;
  fencingToken: number;
  owner: ProcessIdentity;
  heartbeatAt: string;
  expiresAt: string;
}

interface AttemptTransitionBase {
  batch: number;
  executionId: string;
  attemptId: string;
  leaseId: string;
  fencingToken: number;
  transitionId: string;
  preDigest: string;
  postDigest: string;
}

type AttemptTransition =
  | (AttemptTransitionBase & {
      edge: "probe-selected";
      from: "probing";
      to: "selected";
      details: {
        selected?: SelectedDriver;
        legacyExecution?: LegacyExecution;
        probeDigest: string;
        planDigest: string;
      };
    })
  | (AttemptTransitionBase & {
      edge: "selected-prepared";
      from: "selected";
      to: "prepared";
      details: { worktreeManifestDigest: string; units: readonly string[] };
    })
  | (AttemptTransitionBase & {
      edge: "prepared-dispatched";
      from: "prepared";
      to: "dispatched";
      details: {
        capture: CaptureCheckpoint;
        waveDigests: readonly string[];
      };
    })
  | (AttemptTransitionBase & {
      edge: "capture-bound";
      from: "dispatched";
      to: "dispatched";
      details: {
        captureKind: "event-bound-provider-path";
        nativeRunId: string;
        exactPathDigest: string;
        sourceEventDigest: string;
      };
    })
  | (AttemptTransitionBase & {
      edge: "dispatch-evidence-verified";
      from: "dispatched";
      to: "evidence-verified";
      details: { evidenceDigest: string; coveredUnits: readonly string[] };
    })
  | (AttemptTransitionBase & {
      edge: "evidence-referee-running";
      from: "evidence-verified";
      to: "referee-running";
      details: { finalizeInvocationId: string; claimedUnits: readonly string[] };
    })
  | (AttemptTransitionBase & {
      edge: "referee-succeeded";
      from: "referee-running";
      to: "succeeded";
      details: { finalizeInvocationId: string; refereeResultDigest: string; unitMergesDigest: string };
    })
  | (AttemptTransitionBase & {
      edge: "attempt-failed";
      from: ActiveAttemptState;
      to: "failed-resumable" | "failed-terminal";
      details: { failureCode: ExecutionFailureCode; diagnosticCode: string; affectedUnits: readonly string[] };
    })
  | (AttemptTransitionBase & {
      edge: "active-attempt-recovered";
      from: ActiveAttemptState;
      to: "failed-resumable";
      details: {
        expiredLeaseId: string;
        previousFencingToken: number;
        ownerLiveness: "not-running" | "process-start-mismatch";
        orphanProcessGroupAction: "none" | "terminated";
        recoveredCheckpointDigest: string;
      };
    })
  | (AttemptTransitionBase & {
      edge: "attempt-resumed";
      from: "failed-resumable";
      to: "probing";
      details: { previousAttemptId: string; newAttemptId: string; reusedConvergedUnits: readonly string[] };
    });

interface AttemptCheckpoint {
  schemaVersion: 1;
  executionId: string;
  attemptId: string;
  batch: number;
  state: AttemptState;
  lease: AttemptLease;
  planDigest: string;
  attemptNonceHash: string;
  selected?: SelectedDriver;
  legacyExecution?: LegacyExecution;
  worktreeManifestDigest?: string;
  capture?: CaptureCheckpoint;
  unitStates: Readonly<Record<string, "pending" | "dispatched" | "evidence-seen" | "referee-converged" | "failed">>;
  previousAttemptId?: string;
  lastTransitionId: string;
  stateDigest: string;
}

type CaptureCheckpoint =
  | {
      kind: "fixed-provider-path";
      identityDigest: string;
      capturePlanDigest: string;
      transport: CoordinatorTransport["kind"];
      binding: {
        nativeRunId: string;
        exactPathDigest: string;
        sourcePlanDigest: string;
      };
    }
  | {
      kind: "event-bound-provider-path";
      identityDigest: string;
      capturePlanDigest: string;
      transport: CoordinatorTransport["kind"];
      binding?: {
        nativeRunId: string;
        exactPathDigest: string;
        sourceEventDigest: string;
      };
    }
  | {
      kind: "hook-only";
      identityDigest: string;
      capturePlanDigest: string;
      transport: CoordinatorTransport["kind"];
    };
```

`transition`は上のclosed unionにあるstate edgeだけを受理し、batch、lease ID、単調増加するfencing tokenが現在checkpointと一致しないwriterを拒否する。`capture-bound`だけは`dispatched → dispatched`のmetadata self-edgeであり、未boundの`event-bound-provider-path`へ最初の1回だけ適用できる。fixed-pathとhook-onlyではこのedgeを型とruntime validatorの両方で拒否し、異なるrun/pathへの再bindingも拒否する。

`prepared-dispatched`はcapture observer開始後かつprovider arm前にvariant付きcapture checkpointを保存する。fixed-pathはadapterがlaunch planから作ったnative run ID、exact path digest、source plan digestを含むinitial bindingを必須とし、event-boundはbindingなし、hook-onlyはbinding field自体を持たない。event-bound modeでは`capture-bound`成功前にprovider stateを読まない。これによりstoreはprovider名やargvを解析せず、capture kindだけで許可edgeと必須fieldを検証できる。

既存audit-first規則に従い、同じlock内で一意なtransition IDとpre/post digestを含む`SWARM_DRIVER_TRANSITION`を先にappendし、その後checkpointをatomic replaceする。どちらかが失敗しても成功応答を返さない。audit成功・checkpoint失敗のcrash windowはresumeが`lastTransitionId`とdigestを照合し、idempotentに再適用した結果を`SWARM_DRIVER_RECONCILED`へ記録する。provider arm直前、spawn直後、binding直前のcrashもlease/process-group recoveryと同じfencing tokenで回収し、旧attemptのobserver・PTY・bindingを新attemptへ再利用しない。

leaseは固定30秒、heartbeatは固定5秒とし、利用者設定にはしない。heartbeatはlease metadataだけのatomic compare-and-setで、lifecycle `stateDigest`から除外する。通常edgeは現在checkpointのlease/fencing token一致を要求する。`active-attempt-recovered`だけはaudit lock下で期限切れleaseのtokenに1を加えたrecovery claimをcompare-and-setする特例である。

`beginResume`はaudit lock下でcheckpointを再読する。`failed-resumable`なら次fencing tokenを採番する。active stateならlease期限切れに加え、host/process start identityから旧ownerが非生存であることを証明できる場合だけrecovery claimを獲得する。旧process groupが残っていればattempt由来identityを照合して終了させ、exitを確認する。liveness不明、owner生存、process group終了失敗はfail-closedにする。claim取得後は`active-attempt-recovered`をaudit-firstで適用し、続けて`attempt-resumed`でexecution IDを維持した新attempt/leaseへ移る。旧ownerが復帰しても古いfencing tokenではtransitionを保存できない。`referee-converged`以外をpendingへ戻し、`succeeded`と`failed-terminal`からのresumeは拒否する。

referee error codeのterminalityは閉じた対応とする。`CHECK_NOT_CONVERGED`、`CHECK_PROCESS_FAILED`、`FINALIZE_PROCESS_FAILED`、`MERGE_FAILED`、`REFEREE_AUDIT_FAILED`は`failed-resumable`へ写像する。`PROTECTED_SPEC_BINDING_INVALID`、`LYING_CONDUCTOR_DETECTED`、`BATCH_BINDING_MISMATCH`、`ENVELOPE_SCHEMA_INVALID`は入力・相関・security policyを変えない限り再試行不能なため`failed-terminal`へ写像する。未知codeはparse時に拒否し、成功も再試行可能とも推測しない。

## C-10 `DriverAuditEmitter`

```ts
interface DriverAuditEmitter {
  attemptStarted(checkpoint: AttemptCheckpoint, input: RedactedSelectionInput): Promise<void>;
  driverSelected(plan: ResolutionPlan): Promise<void>;
  transitionIntent(input: AttemptTransition): Promise<void>;
  transitionReconciled(input: ReconciliationResult): Promise<void>;
  nativeEvidence(attempt: AttemptCheckpoint, verdict: EvidenceVerdict): Promise<void>;
  degraded(plan: ResolutionPlan): Promise<void>;
}

interface ReconciliationResult {
  batch: number;
  executionId: string;
  attemptId: string;
  leaseId: string;
  fencingToken: number;
  transitionId: string;
  action: "reapplied" | "already-materialized" | "discarded" | "marked-failed";
  reasonCode: string;
  checkpointDigest: string;
}

type RedactedSelectionInput = {
  harness: Harness;
  batch: number;
  topology: Topology;
  capabilityCodes: readonly string[];
} & (
  | { source: "default" | "new-env"; requested: RequestedDriver }
  | { source: "legacy-env"; rawValueClass: "enabled" | "other"; legacyEnabled: boolean }
);
```

全methodはexecution ID、attempt ID、batchを必須相関keyとする。CLI versionとmode identifierは許可するが、command全文、argv内prompt、env値、credential、provider raw payloadは拒否する。audit schema validatorが未知fieldまたはsecret-like field名を検出した場合は書込を拒否し、batchを成功扱いしない。

## Error分類と利用者表示

| Class | 例 | `auto` fallback | Exit | 表示 |
|---|---|---|---|---|
| Input | invalid/empty/競合/別harness | 不可 | 2 | 受理値、検出harness、修正方法 |
| Preflight unavailable | CLI/auth/mode/trust | 可 | plan内で継続 | requested、selected、reasonをstderrとauditへ表示 |
| Explicit preflight | 明示driver unavailable | 不可 | 3 | 代替実行0件を明記 |
| Dispatch | process timeout/non-zero | 不可 | 4 | execution/attempt、再開command |
| Evidence | 必須native証跡欠落 | 不可 | 5 | evidence kindと不足Unit。生payloadなし |
| Persistence | checkpoint/audit失敗 | 不可 | 6 | 成功未確定、再開可能性 |
| Referee | check/finalize/merge failure | 不可 | referee既存code | worktree保全とbaton情報 |

exit codeは実装時に既存toolとの衝突を確認して最終固定する。分類の意味とfallback可否は変更しない。
