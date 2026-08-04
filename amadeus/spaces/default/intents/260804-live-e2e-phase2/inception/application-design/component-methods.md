# Component Methods — live E2E Phase 2

## 入力と型の基準

公開シグネチャは [requirements.md](../requirements-analysis/requirements.md)、[architecture.md](../../../../../codekb/amadeus/architecture.md)、[component-inventory.md](../../../../../codekb/amadeus/component-inventory.md) と既存 `adapter.ts` の`LiveAdapter`/`LiveJourney`を基準にする。以下は実装時の契約であり、詳細なbusiness ruleはFunctional Designへ委ねる。

## Common Live Kernel（既存維持）

```ts
export async function runLiveJourney(
  adapter: LiveAdapter,
  journey: LiveJourney,
  context: LiveRunContext,
): Promise<Result<LiveRunReceipt, LiveRunError>>;

export function evaluateLiveGate(
  env: Readonly<Record<string, string | undefined>>,
  capability: LiveCapability,
): GateDecision;

export function buildChildEnvironment(
  parent: Readonly<Record<string, string | undefined>>,
  declaration: EnvironmentDeclaration,
): Result<Readonly<Record<string, string>>, PolicyViolation>;
```

Phase 2 adapterはこの順序を迂回しない。skipはscratch/spawn/ledger前、PASS receiptはcleanup barrier後という既存契約を維持する。

## Kimi Print Adapter

```ts
export interface KimiPrintAdapterOptions {
  readonly executable?: string;
  readonly distDir?: string;
  readonly sourceHome?: string;
  readonly spawn?: KimiSpawnPort;
}

export interface KimiSpawnPort {
  run(input: Readonly<{
    cwd: string;
    executable: string;
    args: readonly string[];
    env: Readonly<Record<string, string>>;
    signal: AbortSignal;
  }>): Promise<AdapterExecution>;
}

export class KimiPrintAdapter implements LiveAdapter {
  readonly capability: LiveCapability;
  preflight(context: PreflightContext): Promise<PreflightResult>;
  prepare(context: PrepareContext): Promise<Result<PreparedRun, AdapterError>>;
  execute(run: PreparedRun, signal: AbortSignal): Promise<AdapterExecution>;
  cleanup(target: CleanupTarget): Promise<CleanupReceipt>;
}
```

`prepare`はcredential symlink/config/homeを作成前にplanned登録し、成功時だけcreatedへ遷移する。`execute`は`process.env`を直接展開せず、capabilityのenvironment declarationから構築したenvだけを渡す。

## Kiro ACP Adapter

```ts
export interface KiroAcpTransportPort {
  probe(executable: string): Promise<Readonly<{ version: string; ready: boolean }>>;
  drive(input: Readonly<{
    executable: string;
    cwd: string;
    env: Readonly<Record<string, string>>;
    prompt: string;
    signal: AbortSignal;
  }>): Promise<AdapterExecution>;
  terminate(): Promise<Readonly<{ reaped: boolean; failures: readonly string[] }>>;
}

export class KiroAcpAdapter implements LiveAdapter {
  readonly capability: LiveCapability;
  preflight(context: PreflightContext): Promise<PreflightResult>;
  prepare(context: PrepareContext): Promise<Result<PreparedRun, AdapterError>>;
  execute(run: PreparedRun, signal: AbortSignal): Promise<AdapterExecution>;
  cleanup(target: CleanupTarget): Promise<CleanupReceipt>;
}
```

既存`driveKiroAcp`/`AcpSession`のJSON-RPC mechanicsをport背後へ再利用する。abort時はACP cancelだけで完了扱いせず、子孫processのreap receiptまでcleanupへ渡す。

## Kiro TUI Adapter

```ts
export interface KiroTmuxPort {
  start(input: Readonly<{ socket: string; session: string; cwd: string; env: Readonly<Record<string, string>> }>): TmuxCommandResult;
  send(socket: string, session: string, text: string): TmuxCommandResult;
  capture(socket: string, session: string, byteLimit: number): TmuxCommandResult;
  killServer(socket: string): TmuxCommandResult;
}

export class KiroTuiAdapter implements LiveAdapter {
  readonly capability: LiveCapability;
  preflight(context: PreflightContext): Promise<PreflightResult>;
  prepare(context: PrepareContext): Promise<Result<PreparedRun, AdapterError>>;
  execute(run: PreparedRun, signal: AbortSignal): Promise<AdapterExecution>;
  cleanup(target: CleanupTarget): Promise<CleanupReceipt>;
}
```

socket/sessionはrun-private IDとし、tmux serverをresource登録する。assertionの正本はscratch内file/state anchorで、pane captureはbounded diagnosticに限定する。

## Registry and evidence

```ts
export type LiveAdapterId =
  | "codex-exec" | "claude-print" | "claude-sdk" | "claude-tui"
  | "kimi-print" | "kiro-acp" | "kiro-tui";

export function validateCapabilityRegistry(
  capabilities: readonly LiveCapability[],
): readonly RegistryFinding[];

export function renderCapabilityMatrix(
  capabilities: readonly LiveCapability[],
  receipts: readonly RecordedLiveRunReceipt[],
): Result<string, MatrixError>;
```

`supported`はadapter/contract/live greenが成立したtransportだけに使う。接続不能または未検証は`followUpIssue`必須とし、状態を曖昧な自由文で表現しない。

## Error handling

- binary/version/dist/auth不足は例外でなく`PreflightResult.kind="skip"`。
- environment declaration違反、invalid SHA/timeout、scratch allocator失敗は`contract-invalid`。
- transport exit/abortはcanonical execution failure、assertion不成立はassertion failure、timeoutはjourney timeout。
- cleanup漏洩は元の実行結果より優先して`cleanup-barrier-failed`とし、PASSを記録しない。
- ledger failureはreceiptを保持した`ledger-write-failed`として回復可能にする。

