// Explicitly opt-in live Pi RPC journey. It never configures or persists provider credentials.

import { createHash, randomUUID } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  createExecutionLifecycleCoordinator,
  createMemoryExecutionRepository,
  type ExecutionLifecycleCoordinator,
} from "../packages/framework/core/tools/amadeus-execution-lifecycle.ts";
import { readAllAuditShards } from "../packages/framework/core/tools/amadeus-lib.ts";
import { executePiChild } from "../packages/framework/harness/pi/drivers/amadeus-pi-driver.ts";
import { isSupportedPiVersion } from "./pi-conformance-evidence.ts";

export const PI_LIVE_SKIP_REASONS = [
  "opt-in-disabled",
  "unsupported-platform",
  "pi-unavailable",
  "provider-unavailable",
  "candidate-unavailable",
] as const;
export type PiLiveSkipReason = (typeof PI_LIVE_SKIP_REASONS)[number];

export type PiLiveRpcResult =
  | { readonly status: "skipped"; readonly reason: PiLiveSkipReason }
  | { readonly status: "failed"; readonly reason: string }
  | {
      readonly status: "passed";
      readonly platform: "darwin" | "linux";
      readonly piVersion: string;
      readonly providerId: string;
      readonly modelId: string;
      readonly verificationCommit: string;
      readonly executedAt: string;
      readonly assertions: {
        readonly rpcChildSucceeded: true;
        readonly humanTurnCount: 0;
        readonly gateApprovedCount: 0;
        readonly outputDigest: string;
      };
    };

type LiveEnvironment = Readonly<Record<string, string | undefined>>;

function countMarker(content: string, marker: "HUMAN_TURN" | "GATE_APPROVED"): number {
  return content.split(`"Event":"${marker}"`).length - 1;
}

function safeProviderId(value: string | undefined): string | null {
  return value !== undefined
      && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value)
      && !value.includes("://")
    ? value
    : null;
}

type LiveProviderSelection =
  | { readonly ok: false }
  | { readonly ok: true; readonly providerId: string; readonly modelId?: string };

type LiveOutcomeValidation =
  | { readonly ok: false; readonly reason: string }
  | { readonly ok: true; readonly providerId: string; readonly modelId: string };

function liveProviderSelection(environment: LiveEnvironment): LiveProviderSelection {
  const providerId = safeProviderId(environment.AMADEUS_PI_LIVE_PROVIDER_ID);
  if (providerId === null) return { ok: false };
  const configuredModelId = environment.AMADEUS_PI_LIVE_MODEL_ID;
  if (configuredModelId === undefined) return { ok: true, providerId };
  const modelId = safeProviderId(configuredModelId);
  if (modelId === null) return { ok: false };
  return { ok: true, providerId, modelId };
}

function livePlatform(): "darwin" | "linux" | null {
  if (process.platform === "darwin") return "darwin";
  if (process.platform === "linux") return "linux";
  return null;
}

function providerBelongsToFamily(providerId: string, familyId: string): boolean {
  return providerId === familyId || new RegExp(`^${familyId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-account-\\d+$`).test(providerId);
}

function observedProvider(
  providerId: string | undefined,
  modelId: string | undefined,
): { readonly providerId: string; readonly modelId: string } | null {
  return providerId === undefined || modelId === undefined ? null : { providerId, modelId };
}

function validateLiveOutcome(
  requestedProviderId: string,
  actualProviderId: string | undefined,
  actualModelId: string | undefined,
  humanTurnCount: number,
  gateApprovedCount: number,
  output: string,
): LiveOutcomeValidation {
  const provider = observedProvider(actualProviderId, actualModelId);
  if (provider === null) return { ok: false, reason: "provider-observation-missing" };
  if (!providerBelongsToFamily(provider.providerId, requestedProviderId)) {
    return { ok: false, reason: "provider-family-mismatch" };
  }
  if (humanTurnCount !== 0 || gateApprovedCount !== 0) {
    return { ok: false, reason: "rpc-presence-boundary-violated" };
  }
  if (!output.includes("AMADEUS_PI_LIVE_OK")) return { ok: false, reason: "live-output-mismatch" };
  return { ok: true, ...provider };
}

function gitIdentity(projectDir: string): { readonly commit: string; readonly clean: boolean } | null {
  const commit = spawnSync("git", ["-C", projectDir, "rev-parse", "HEAD"], { encoding: "utf8" });
  const status = spawnSync("git", ["-C", projectDir, "status", "--porcelain"], { encoding: "utf8" });
  const revision = commit.status === 0 ? commit.stdout.trim() : "";
  if (!/^[a-f0-9]{40}$/.test(revision) || status.status !== 0) return null;
  return { commit: revision, clean: status.stdout.length === 0 };
}

function piVersion(piExecutable: string): string | null {
  const probe = spawnSync(piExecutable, ["--version"], { encoding: "utf8", timeout: 5_000 });
  if (probe.status !== 0) return null;
  return /(?:^|\s)(\d+\.\d+\.\d+)(?:\s|$)/.exec(probe.stdout.trim())?.[1] ?? null;
}

function liveLifecycle() {
  const repository = createMemoryExecutionRepository();
  return createExecutionLifecycleCoordinator({
    repository,
    clock: { wallNow: () => new Date().toISOString(), monotonicNowMs: () => performance.now() },
    projectionSink: {
      projectRequired(eventSet) {
        return {
          digest: eventSet.digest,
          stateProjectionReceiptId: `state-${eventSet.digest}`,
          runtimeProjectionReceiptId: `runtime-${eventSet.digest}`,
        };
      },
      rebuildRequired() {
        throw new Error("live Pi RPC does not rebuild a projection");
      },
      projectTelemetry() {
        return { projected: false };
      },
    },
  });
}

type PiLiveDispatch = typeof executePiChild;

export function dispatchPiLiveChild(
  request: Parameters<PiLiveDispatch>[0],
  lifecycle: ExecutionLifecycleCoordinator,
  providerId: string,
  modelId: string | undefined,
  dispatch: PiLiveDispatch = executePiChild,
) {
  return dispatch(request, { lifecycle, providerId, ...(modelId === undefined ? {} : { modelId }) });
}

/**
 * Run only when AMADEUS_PI_LIVE_RPC=1. The provider identifier is evidence
 * metadata; provider credentials stay in Pi's normal user configuration.
 */
export async function runPiLiveRpc(
  environment: LiveEnvironment = process.env,
  cwd = process.cwd(),
): Promise<PiLiveRpcResult> {
  if (environment.AMADEUS_PI_LIVE_RPC !== "1") return { status: "skipped", reason: "opt-in-disabled" };
  const platform = livePlatform();
  if (platform === null) return { status: "skipped", reason: "unsupported-platform" };
  const piExecutable = Bun.which("pi");
  if (piExecutable === null) return { status: "skipped", reason: "pi-unavailable" };
  const selection = liveProviderSelection(environment);
  if (!selection.ok) {
    return { status: "skipped", reason: "provider-unavailable" };
  }
  const { providerId, modelId } = selection;
  const projectDir = realpathSync(environment.AMADEUS_PI_LIVE_PROJECT_DIR ?? cwd);
  if (!existsSync(join(projectDir, ".pi", "tools", "data", "harness.json"))) {
    return { status: "skipped", reason: "candidate-unavailable" };
  }
  const identity = gitIdentity(projectDir);
  if (identity === null || !identity.clean) return { status: "failed", reason: "formal-source-not-clean" };
  const version = piVersion(piExecutable);
  if (version === null) return { status: "failed", reason: "pi-version-unavailable" };
  if (!isSupportedPiVersion(version)) return { status: "failed", reason: "pi-version-unsupported" };

  const lifecycle = liveLifecycle();
  const parent = lifecycle.startOperation({
    idempotencyKey: `pi-live-root:${identity.commit}`,
    input: {
      intentUuid: "pi-live-conformance",
      stageSlug: "code-generation",
      stageInstanceId: `pi-live-${randomUUID()}`,
      revision: 1,
      kind: "stage",
      origin: { stage: "code-generation", agent: "amadeus-developer-agent", tool: "pi-live-rpc" },
    },
  });
  if (!parent.ok) return { status: "failed", reason: "parent-operation-not-started" };

  const before = readAllAuditShards(projectDir);
  const result = await dispatchPiLiveChild({
    schemaVersion: 1,
    deliveryKey: `pi-live:${identity.commit}:${Date.now()}`,
    role: "support",
    prompt: "Reply with exactly AMADEUS_PI_LIVE_OK and do not call tools.",
    projectDir,
    parentExecution: {
      operationId: parent.value.operation.operationId,
      rootOperationId: parent.value.operation.rootOperationId,
    },
    childOrdinal: 1,
    timeoutMs: 120_000,
    outputLimitBytes: 64 * 1024,
  }, lifecycle, providerId, modelId);
  const after = readAllAuditShards(projectDir);
  const humanTurnCount = countMarker(after, "HUMAN_TURN") - countMarker(before, "HUMAN_TURN");
  const gateApprovedCount = countMarker(after, "GATE_APPROVED") - countMarker(before, "GATE_APPROVED");
  if (result.kind !== "succeeded") return { status: "failed", reason: `driver-${result.kind}` };
  const outcome = validateLiveOutcome(
    providerId,
    result.providerId,
    result.modelId,
    humanTurnCount,
    gateApprovedCount,
    result.output,
  );
  if (!outcome.ok) return { status: "failed", reason: outcome.reason };
  return {
    status: "passed",
    platform,
    piVersion: version,
    providerId: outcome.providerId,
    modelId: outcome.modelId,
    verificationCommit: identity.commit,
    executedAt: new Date().toISOString(),
    assertions: {
      rpcChildSucceeded: true,
      humanTurnCount: 0,
      gateApprovedCount: 0,
      outputDigest: createHash("sha256").update(result.output).digest("hex"),
    },
  };
}

async function main(): Promise<void> {
  try {
    const result = await runPiLiveRpc();
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.status === "failed" ? 1 : 0;
  } catch {
    process.stdout.write(`${JSON.stringify({ status: "failed", reason: "live-run-threw" })}\n`);
    process.exitCode = 1;
    return;
  }
}

if (import.meta.main) await main();
