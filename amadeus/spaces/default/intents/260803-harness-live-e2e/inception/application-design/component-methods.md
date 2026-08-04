# Component Methods — ハーネス横断 live E2E

入力参照: `requirements`、`architecture`、`component-inventory`、`team-practices`。`stories`は未生成であり、methodはFR-1〜FR-11と`components`のC1〜C9へtraceする。

## Canonical Types

```ts
type LiveStatus = "success" | "skip" | "timeout" | "failure";

type LiveCode =
  | "AMADEUS_LIVE_E2E:SKIP:CI_FORBIDDEN"
  | "AMADEUS_LIVE_E2E:SKIP:OPT_IN_REQUIRED"
  | "AMADEUS_LIVE_E2E:SKIP:BINARY_MISSING"
  | "AMADEUS_LIVE_E2E:SKIP:VERSION_UNSUPPORTED"
  | "AMADEUS_LIVE_E2E:SKIP:DIST_MISSING"
  | "AMADEUS_LIVE_E2E:SKIP:AUTH_UNAVAILABLE"
  | "AMADEUS_LIVE_E2E:SKIP:CAPABILITY_UNSUPPORTED"
  | "AMADEUS_LIVE_E2E:TIMEOUT:JOURNEY_TIMEOUT"
  | "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED"
  | "AMADEUS_LIVE_E2E:FAIL:ASSERTION_FAILED"
  | "AMADEUS_LIVE_E2E:PASS:SUCCESS";

type LiveOutcome = Readonly<{
  status: LiveStatus;
  code: LiveCode;
  diagnostic: string;
  evidence: readonly SanitizedEvidence[];
}>;
```

`LiveOutcome`はthrowの代替ではない。programmer error/invalid contractはthrowまたは`Result.err`でfail-closedとし、外部substrateの期待される結果だけを`LiveOutcome`へ正規化する。

## C2 Live Policy

```ts
function evaluateLiveGate(
  env: Readonly<Record<string, string | undefined>>,
  capability: LiveCapability,
): GateDecision;

function selectPrimaryPreflightCode(
  findings: readonly PreflightFinding[],
): LiveCode;

function buildChildEnvironment(
  parent: Readonly<Record<string, string | undefined>>,
  declaration: EnvironmentDeclaration,
): Result<Readonly<Record<string, string>>, PolicyViolation>;

function detectSensitiveLeak(
  childEnv: Readonly<Record<string, string | undefined>>,
  scratch: ScratchReceipt,
  declaration: EnvironmentDeclaration,
): readonly PolicyViolation[];
```

契約:

- `evaluateLiveGate`はfilesystem/binary/authを読まない純粋関数。
- `GITHUB_ACTIONS==="true"`をopt-inより先に返す。
- opt-in許可値は厳密に`"1"`。
- `buildChildEnvironment`はambient envのspreadを禁止し、allow-listから構成する。

## C3 Live Adapter Port

```ts
interface LiveAdapter {
  readonly capability: LiveCapability;

  preflight(context: PreflightContext): Promise<PreflightResult>;
  prepare(context: PrepareContext): Promise<Result<PreparedRun, AdapterError>>;
  execute(run: PreparedRun, signal: AbortSignal): Promise<AdapterExecution>;
  cleanup(target: CleanupTarget, mode: CleanupMode): Promise<CleanupReceipt>;
}

type CleanupTarget = Readonly<{
  scratch: ScratchReceipt;
  prepared?: PreparedRun;
  registeredResources: readonly CleanupResource[];
}>;
```

method契約:

- `preflight`: side effectはread-only probeに限定し、課金processを起動しない。
- `prepare`: scratch内だけへ書き、source auth/configを変更しない。副作用より先にcleanup対象を`PrepareContext`へ同期登録する。
- `execute`: transport固有の終了を`AdapterExecution`へ正規化し、assertionを行わない。
- `cleanup`: `PreparedRun`が得られないprepare途中でも呼べる冪等操作。scratch、capability宣言、登録済みresourceから対象を解決し、debug keepでもcredential materialを削除する。

## C4 Live Lifecycle Runner

```ts
async function runLiveJourney(
  adapter: LiveAdapter,
  journey: LiveJourney,
  context: LiveRunContext,
): Promise<Result<LiveRunReceipt, LiveRunError>>;

type LiveRunError =
  | Readonly<{
      kind: "cleanup-barrier-failed";
      cause: CleanupBarrierError;
      secondaryOutcome?: LiveOutcome;
    }>
  | Readonly<{
      kind: "ledger-write-failed";
      receipt: LiveRunReceipt;
      cause: LedgerError;
    }>
  | Readonly<{
      kind: "contract-invalid";
      cause: ContractError;
    }>;

function classifyExecution(
  execution: AdapterExecution,
  assertion: AssertionResult,
): LiveOutcome;

function retryDecision(
  attempt: number,
  failure: AdapterExecution,
  policy: RetryPolicy,
): "retry" | "stop";
```

`runLiveJourney`の順序は固定する。

1. gate
2. preflight
3. scratch確保。allocator自身の失敗時は確保済み断片を自己cleanupする
4. `CleanupTarget`を初期化し、prepare→execute with explicit timeout→deterministic assertionを`try`範囲で実行する
5. 途中のthrow、timeout、abort、`Result.err`を段階付きfailureとして捕捉する
6. `finally`相当の境界でjob/descendant残存0とreapを確認し、opaque matcherが有効な間にstdout/stderrとscratch/config/receiptをscan-before-deleteする。続いてscratch削除、post-delete不存在確認、credential destroy、matcher zeroizeをこの順で試行し、各receiptをcleanup barrierへ集約する
7. cleanup barrierの全receiptが成功した場合だけprimary execution/assertionを`LiveOutcome`へ分類してreceiptを生成する。barrier失敗時はC8を呼ばず`Result.err({ kind: "cleanup-barrier-failed", ... })`を返す
8. receiptをledgerへatomic追記し、append成功または同一receiptのalready-present時だけclosure committedへ遷移する
9. closure committed後だけ`Result.ok(receipt)`、PASS、supported更新、adapter materialization、matrix projectionを解放する

gate/preflightのskipではscratch/prepare/execute/ledger green追記を行わないが、機械可読skip結果はrunnerへ返す。scratch確保開始後はprepareが値を返す前に失敗した場合も、scratch rootと同期登録済みresourceをcleanup対象にする。cleanup failureまたはcredential leak findingは`LiveOutcome`へ偽装せず`cleanup-barrier-failed`をprimary errorとし、元のtimeout/assertion/successをsecondaryとして保持する。cleanupとleak checkの両方が失敗した場合も全診断を集約し、C8 receiptは生成しない。

ledger追記失敗はjourneyのclosed `LiveCode`へ偽装せず、`Result.err({ kind: "ledger-write-failed", receipt, cause })`でtest runnerをhard failureにする。したがって外部実行がgreenでも、永続証跡がない状態で完了成功を返さない。返却されたsanitized receiptは同じ`receiptId`のまま明示的に再記録できる。

## C7 Capability Registry

```ts
const LIVE_CAPABILITIES: readonly LiveCapability[];

function capabilityById(id: LiveAdapterId): Result<LiveCapability, UnknownAdapter>;

function validateCapabilityRegistry(
  capabilities: readonly LiveCapability[],
): readonly RegistryFinding[];
```

validationは重複ID、重複opt-in、未知status、supportedなのにanchor/version無し、unsupportedなのにfollow-up Issue無しを拒否する。

## C8 Run Ledger

```ts
function parseRunLedger(text: string): Result<readonly LiveRunReceipt[], LedgerError>;

function appendRunReceipt(
  path: string,
  receipt: LiveRunReceipt,
): Promise<Result<void, LedgerError>>;

function recoverRunReceipt(
  path: string,
  receipt: LiveRunReceipt,
): Promise<Result<"appended" | "already-present", LedgerError>>;

function inspectLedgerLock(path: string): Result<LedgerLockStatus, LedgerLockError>;

function recoverLedgerLock(
  path: string,
  expectedOwnerToken: string,
): Result<"recovered" | "already-free", LedgerLockError>;

function latestGreenByAdapter(
  receipts: readonly LiveRunReceipt[],
): ReadonlyMap<LiveAdapterId, LiveRunReceipt>;
```

追記前にschema、`receiptId`、adapter ID、40桁Git SHA、UTC timestamp、code/status整合、evidence非秘密性を検証する。`receiptId`はrun identityから決定的に生成し、同一ID・同一内容の再試行は`already-present`、同一ID・異内容はconflict errorとする。

追記は次のatomic contractに従う。

1. 既存`.codex/tools/amadeus-lib.ts`の実証済みalgorithmと同じowner-stamped mkdir lockを、ledger専用identityで取得する。owner tokenはPIDとprocess start epochの組であり、owner stampが書けなければcritical sectionへ入らない。取得は既定5秒のbounded retry後に`lock-timeout`を返す。
2. lock内で現ledgerの全byteを再読込し、全JSONL行をfail-closed検証する。
3. 現byte列を変更せず、validatedな1行を末尾へ加えた内容をmode `0600`のsibling tempへwriteし、fileをfsyncする。
4. tempをledgerへatomic renameする。事前capability probeで親directory fsync対応を判定し、対応時はfsyncして`file-and-directory`、未対応時は`file-only`をreceiptのdurabilityへ記録する。probe結果不明や宣言との不一致は成功扱いにしない。
5. final pathを再検証する。通常return/throwでは`finally`でon-disk owner tokenと取得時tokenの一致を確認してlockを解放する。`process.exit`用safety netも同じowner一致条件で解放し、別ownerのlockを削除しない。

これにより既存行は再整形せず、final pathへ部分JSONL行を公開しない。malformed existing ledger、lock/write/fsync/rename/revalidation failureはすべて`LedgerError`であり、runnerはgreenを返さない。rename成功後に応答だけ失われた場合は、同じreceiptを`recoverRunReceipt`へ渡せばID照合で重複なしに回復する。orphan tempはfinal ledger検証後に同一writer由来と確認できたものだけを除去し、内容を自動採用しない。

SIGKILL等でlockが残った場合は次のclosed recovery contractを使う。

- valid owner stampのPIDへsignal 0を送り、`ESRCH`ならdead ownerとして回収候補にする。`EPERM`、alive、liveness不明は自動解除しない。
- mkdir直後・stamp前に停止したunstamped lockは、directory mtimeが5秒のgraceを超えた場合だけ回収候補にする。
- 複数reaperをsibling reap mutexで直列化し、lock directoryをreaper-private pathへatomic renameしてからowner tokenまたはunstamped mtimeを再検証する。一致時だけ削除し、不一致なら復元する。reap mutex自体の残存も同じCAS renameで回収する。
- 自動回収後もbounded取得に失敗した場合は`lock-timeout`で停止し、sanitized owner tokenと`inspectLedgerLock`結果を表示する。手動手順は、owner processが終了済みであることを確認し、表示されたtokenを`recoverLedgerLock`へ明示する。token不一致、live/unknown owner、fresh unstamped lockは拒否し、強制削除optionは提供しない。
- `acquire→critical section→release`、通常throw、明示`process.exit`、owner SIGKILL、stamp前SIGKILL、PID再利用、二重reaper、manual token mismatchをdeterministic testで固定する。

## C9 Matrix Projector

```ts
function renderCapabilityMatrix(
  capabilities: readonly LiveCapability[],
  receipts: readonly LiveRunReceipt[],
): string;

function checkCapabilityMatrix(
  currentDocument: string,
  expectedBlock: string,
): Result<void, MatrixDrift>;
```

projectionはadapter ID順に決定的sortし、最終greenがないsupported adapterを`UNVERIFIED`、capability未成立を`UNSUPPORTED`+Issue linkで表示する。Markdownは編集入力として読まない。

## Error Ownership

| Error class | Owner | Representation |
|---|---|---|
| CI/opt-in deny | C2 | `skip` code |
| binary/version/dist/auth/capability | C5 preflight + C2 priority | `skip` code |
| timeout | C4 | `timeout` code |
| spawn/CLI non-zero | C5→C4 | `failure:EXECUTION_FAILED` |
| anchor mismatch | C6→C4 | `failure:ASSERTION_FAILED` |
| cleanup/leak | C4/C2 | `LiveRunError.cleanup-barrier-failed`、C8未記録、元outcomeを副診断へ保持 |
| malformed registry/ledger | C7/C8 | fail-closed `Result.err`、実行継続不可 |
| ledger lock/write/fsync/rename/revalidate | C8→C4 | `LiveRunError.ledger-write-failed`、green返却禁止、同一receipt IDで明示回復 |
| ledger lock残存/取得timeout | C8 | dead ownerだけCAS回収。live/unknownまたはtoken不一致は`LedgerLockError`でfail-closedし、明示手動回復 |
