import type { LiveCapability } from "./registry.ts";
import type { LiveCode, Result, SanitizedEvidence } from "./contract.ts";
import type { LedgerOptions } from "./ledger.ts";
import type { CleanupResource, ResourceRegistrar } from "./resources.ts";

export interface PreflightFinding {
  readonly code: Extract<LiveCode, `AMADEUS_LIVE_E2E:SKIP:${string}`>;
  readonly diagnostic: string;
}

export type PreflightResult =
  | Readonly<{ kind: "ready"; measuredVersion: string; findings: readonly PreflightFinding[] }>
  | Readonly<{
      kind: "skip";
      measuredVersion?: string;
      findings: readonly PreflightFinding[];
    }>;

export interface CredentialDeclaration {
  readonly childKey: string;
}

export interface CredentialBinding {
  readonly key: string;
  expose(): string;
  release(): Promise<void>;
}

export interface CredentialSourcePort {
  canLease(declaration: CredentialDeclaration): Promise<boolean>;
  lease(declaration: CredentialDeclaration): Promise<CredentialBinding>;
}

export interface ScratchReceipt {
  readonly root: string;
  readonly homeDir: string;
  readonly projectDir: string;
  readonly state: "ready" | "cleaned" | "cleanup-failed";
}

export interface ScratchAllocator {
  allocate(registrar: ResourceRegistrar): Promise<ScratchReceipt>;
}

export interface PreflightContext {
  readonly credentialSource: CredentialSourcePort;
}

export interface PrepareContext {
  readonly scratch: ScratchReceipt;
  readonly registrar: ResourceRegistrar;
  readonly credentialSource: CredentialSourcePort;
}

export interface PreparedRun {
  readonly cwd: string;
  readonly executable: string;
  readonly args: readonly string[];
  readonly environmentKeys: readonly string[];
  readonly resolveEnvironment: () => Readonly<Record<string, string>>;
  readonly registeredResourceIds: readonly string[];
  readonly prompt?: string;
}

export interface AdapterExecution {
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly aborted: boolean;
  readonly stdoutDigest: string;
  readonly stderrDigest: string;
  readonly structured?: Readonly<Record<string, unknown>>;
}

export interface AssertionResult {
  readonly passed: boolean;
  readonly diagnostic: string;
  readonly evidence: readonly SanitizedEvidence[];
}

export interface CleanupReceipt {
  readonly attemptedResourceIds: readonly string[];
  readonly releasedResourceIds: readonly string[];
  readonly retainedResourceIds: readonly string[];
  readonly failures: readonly string[];
  readonly leakFindings: readonly string[];
}

export interface CleanupTarget {
  readonly scratch: ScratchReceipt;
  readonly prepared?: PreparedRun;
  readonly registeredResources: readonly CleanupResource[];
}

export interface AdapterError {
  readonly kind: "prepare-failed";
  readonly diagnostic: string;
}

export interface LiveAdapter {
  readonly capability: LiveCapability;
  preflight(context: PreflightContext): Promise<PreflightResult>;
  prepare(context: PrepareContext): Promise<Result<PreparedRun, AdapterError>>;
  execute(run: PreparedRun, signal: AbortSignal): Promise<AdapterExecution>;
  cleanup(target: CleanupTarget): Promise<CleanupReceipt>;
}

export interface RetryPolicy {
  readonly maxAttempts: 1 | 2;
}

export interface LiveJourney {
  readonly id: string;
  readonly prompt: string;
  readonly timeoutMs: number;
  readonly retryPolicy: RetryPolicy;
  assert(execution: AdapterExecution, scratch: ScratchReceipt): Promise<AssertionResult> | AssertionResult;
}

export interface LiveRunContext {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly gitSha: string;
  readonly now: () => Date;
  readonly ledgerPath: string;
  readonly durability: "file-and-directory" | "file-only";
  readonly ledgerOptions?: LedgerOptions;
  readonly credentialSource: CredentialSourcePort;
  readonly allocator: ScratchAllocator;
  readonly leakCheck: (target: CleanupTarget) => Promise<readonly string[]>;
}
