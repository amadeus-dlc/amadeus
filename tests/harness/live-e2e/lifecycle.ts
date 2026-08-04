import type {
  AdapterExecution,
  AssertionResult,
  CleanupReceipt,
  CleanupTarget,
  LiveAdapter,
  LiveJourney,
  LiveRunContext,
  PreparedRun,
  ScratchReceipt,
} from "./adapter.ts";
import {
  digest,
  type LiveOutcome,
  type Result,
  sanitizeOutcome,
  sanitizeText,
  stableJson,
} from "./contract.ts";
import {
  appendRunReceipt,
  type LedgerError,
  type LiveRunReceipt,
  type RecordedLiveRunReceipt,
  type SkippedLiveRunReceipt,
} from "./ledger.ts";
import { evaluateLiveGate, selectPrimaryPreflightCode } from "./policy.ts";
import { validateCapabilityRegistry } from "./registry.ts";
import { ResourceRegistrar } from "./resources.ts";

export type LiveRunError =
  | Readonly<{
      kind: "cleanup-barrier-failed";
      cleanup: CleanupReceipt;
      originalOutcome: LiveOutcome;
    }>
  | Readonly<{
      kind: "ledger-write-failed";
      receipt: RecordedLiveRunReceipt;
      cause: LedgerError;
    }>
  | Readonly<{
      kind: "contract-invalid";
      cause: string;
    }>;

interface StageResult {
  execution?: AdapterExecution;
  assertion?: AssertionResult;
  outcome: LiveOutcome;
}

function outcome(status: LiveOutcome["status"], code: LiveOutcome["code"], diagnostic: string): LiveOutcome {
  return sanitizeOutcome({ status, code, diagnostic, evidence: [] });
}

function validateRunContract(adapter: LiveAdapter, journey: LiveJourney, gitSha: string): string | null {
  const registryFindings = validateCapabilityRegistry([adapter.capability]);
  if (registryFindings.length > 0) return `adapter capability is invalid: ${stableJson(registryFindings)}`;
  if (!Number.isFinite(journey.timeoutMs) || journey.timeoutMs <= 0) return "journey timeout must be positive";
  if (journey.retryPolicy.maxAttempts !== 1 && journey.retryPolicy.maxAttempts !== 2) {
    return "journey maxAttempts must be one or two";
  }
  if (!/^[a-f0-9]{40}$/.test(gitSha)) return "git SHA must be 40 lowercase hexadecimal characters";
  return null;
}

function skippedReceipt(
  adapter: LiveAdapter,
  evaluatedAt: string,
  code: Extract<LiveOutcome["code"], `AMADEUS_LIVE_E2E:SKIP:${string}`>,
  diagnostic: string,
): SkippedLiveRunReceipt {
  return {
    kind: "skipped",
    adapterId: adapter.capability.id,
    evaluatedAt,
    outcome: outcome("skip", code, diagnostic),
  };
}

async function executeWithTimeout(
  adapter: LiveAdapter,
  prepared: PreparedRun,
  timeoutMs: number,
): Promise<AdapterExecution> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timedOut: AdapterExecution = {
    exitCode: null,
    timedOut: true,
    aborted: true,
    stdoutDigest: digest(""),
    stderrDigest: digest("journey timeout"),
  };
  try {
    return await Promise.race([
      adapter.execute(prepared, controller.signal),
      new Promise<AdapterExecution>((resolve) => {
        timeout = setTimeout(() => {
          controller.abort();
          resolve(timedOut);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

function classifyExecution(execution: AdapterExecution, assertion?: AssertionResult): LiveOutcome {
  if (execution.timedOut) {
    return outcome("timeout", "AMADEUS_LIVE_E2E:TIMEOUT:JOURNEY_TIMEOUT", "journey timed out");
  }
  if (execution.exitCode !== 0 || execution.aborted) {
    return outcome("failure", "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED", "adapter execution failed");
  }
  if (assertion === undefined || !assertion.passed) {
    return outcome(
      "failure",
      "AMADEUS_LIVE_E2E:FAIL:ASSERTION_FAILED",
      assertion?.diagnostic ?? "journey assertion was not produced",
    );
  }
  return sanitizeOutcome({
    status: "success",
    code: "AMADEUS_LIVE_E2E:PASS:SUCCESS",
    diagnostic: assertion.diagnostic,
    evidence: assertion.evidence,
  });
}

async function runStages(
  adapter: LiveAdapter,
  journey: LiveJourney,
  context: LiveRunContext,
  scratch: ScratchReceipt,
  registrar: ResourceRegistrar,
): Promise<StageResult> {
  let prepared: PreparedRun | undefined;
  try {
    const preparation = await adapter.prepare({
      scratch,
      registrar,
      credentialSource: context.credentialSource,
    });
    if (!preparation.ok) {
      return { outcome: outcome("failure", "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED", preparation.error.diagnostic) };
    }
    prepared = { ...preparation.value, prompt: journey.prompt };
    const execution = await executeWithTimeout(adapter, prepared, journey.timeoutMs);
    const assertion = execution.timedOut ? undefined : await journey.assert(execution, scratch);
    return { execution, assertion, outcome: classifyExecution(execution, assertion) };
  } catch (error) {
    return {
      outcome: outcome("failure", "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED", String(error)),
    };
  }
}

async function cleanupRun(
  adapter: LiveAdapter,
  context: LiveRunContext,
  target: CleanupTarget,
): Promise<CleanupReceipt> {
  let adapterReceipt: CleanupReceipt | undefined;
  let cleanupFailure: string | undefined;
  try {
    adapterReceipt = await adapter.cleanup(target);
  } catch (error) {
    cleanupFailure = sanitizeText(String(error));
  }
  let commonLeaks: readonly string[] = [];
  let leakFailure: string | undefined;
  try {
    commonLeaks = await context.leakCheck(target);
  } catch (error) {
    leakFailure = sanitizeText(String(error));
  }
  return {
    attemptedResourceIds:
      adapterReceipt?.attemptedResourceIds ?? target.registeredResources.map((resource) => resource.id),
    releasedResourceIds: adapterReceipt?.releasedResourceIds ?? [],
    retainedResourceIds: adapterReceipt?.retainedResourceIds ?? [],
    failures: [
      ...(adapterReceipt?.failures ?? []),
      ...(cleanupFailure === undefined ? [] : [cleanupFailure]),
      ...(leakFailure === undefined ? [] : [leakFailure]),
    ].map((value) => sanitizeText(value)),
    leakFindings: [...(adapterReceipt?.leakFindings ?? []), ...commonLeaks].map((value) => sanitizeText(value)),
  };
}

function cleanupBarrierIsClosed(cleanup: CleanupReceipt): boolean {
  return cleanup.failures.length === 0 &&
    cleanup.leakFindings.length === 0 &&
    cleanup.retainedResourceIds.length === 0;
}

function recordedReceipt(input: {
  adapter: LiveAdapter;
  journey: LiveJourney;
  context: LiveRunContext;
  measuredVersion: string;
  outcome: LiveOutcome;
  cleanup: CleanupReceipt;
}): RecordedLiveRunReceipt {
  const recordedAt = input.context.now().toISOString();
  const identity = stableJson({
    adapterId: input.adapter.capability.id,
    journeyId: input.journey.id,
    recordedAt,
    gitSha: input.context.gitSha,
    outcome: input.outcome.code,
  });
  return {
    kind: "recorded",
    schemaVersion: 1,
    receiptId: digest(identity),
    journeyId: input.journey.id,
    adapterId: input.adapter.capability.id,
    recordedAt,
    gitSha: input.context.gitSha,
    measuredVersion: input.measuredVersion,
    outcome: input.outcome,
    attemptCount: 1,
    timeoutMs: input.journey.timeoutMs,
    cleanup: input.cleanup,
    durability: input.context.durability,
  };
}

export async function runLiveJourney(
  adapter: LiveAdapter,
  journey: LiveJourney,
  context: LiveRunContext,
): Promise<Result<LiveRunReceipt, LiveRunError>> {
  const contractIssue = validateRunContract(adapter, journey, context.gitSha);
  if (contractIssue !== null) return { ok: false, error: { kind: "contract-invalid", cause: contractIssue } };
  const evaluatedAt = context.now().toISOString();
  const gate = evaluateLiveGate(context.env, adapter.capability);
  if (gate.kind === "skip") {
    return { ok: true, value: skippedReceipt(adapter, evaluatedAt, gate.code, gate.diagnostic) };
  }

  const preflight = await adapter.preflight({ credentialSource: context.credentialSource });
  if (preflight.kind === "skip") {
    const code = selectPrimaryPreflightCode(preflight.findings);
    const diagnostic = preflight.findings.map((finding) => finding.diagnostic).join("; ");
    return { ok: true, value: skippedReceipt(adapter, evaluatedAt, code, diagnostic) };
  }

  const registrar = new ResourceRegistrar();
  let scratch: ScratchReceipt;
  try {
    scratch = await context.allocator.allocate(registrar);
  } catch (error) {
    return { ok: false, error: { kind: "contract-invalid", cause: sanitizeText(String(error)) } };
  }
  const stages = await runStages(adapter, journey, context, scratch, registrar);
  const target: CleanupTarget = {
    scratch,
    registeredResources: registrar.snapshot(),
  };
  const cleanup = await cleanupRun(adapter, context, target);
  if (!cleanupBarrierIsClosed(cleanup)) {
    return {
      ok: false,
      error: {
        kind: "cleanup-barrier-failed",
        cleanup,
        originalOutcome: stages.outcome,
      },
    };
  }
  const receipt = recordedReceipt({
    adapter,
    journey,
    context,
    measuredVersion: preflight.measuredVersion,
    outcome: stages.outcome,
    cleanup,
  });
  const appended = await appendRunReceipt(context.ledgerPath, receipt, context.ledgerOptions);
  if (!appended.ok) {
    return { ok: false, error: { kind: "ledger-write-failed", receipt, cause: appended.error } };
  }
  return { ok: true, value: receipt };
}
