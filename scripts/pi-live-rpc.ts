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
  dispatch: PiLiveDispatch = executePiChild,
) {
  return dispatch(request, { lifecycle, providerId });
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
  if (process.platform !== "darwin" && process.platform !== "linux") {
    return { status: "skipped", reason: "unsupported-platform" };
  }
  const piExecutable = Bun.which("pi");
  if (piExecutable === null) return { status: "skipped", reason: "pi-unavailable" };
  const providerId = safeProviderId(environment.AMADEUS_PI_LIVE_PROVIDER_ID);
  if (providerId === null) return { status: "skipped", reason: "provider-unavailable" };
  const projectDir = realpathSync(environment.AMADEUS_PI_LIVE_PROJECT_DIR ?? cwd);
  if (!existsSync(join(projectDir, ".pi", "tools", "data", "harness.json"))) {
    return { status: "skipped", reason: "candidate-unavailable" };
  }
  const identity = gitIdentity(projectDir);
  if (identity === null || !identity.clean) return { status: "failed", reason: "formal-source-not-clean" };
  const version = piVersion(piExecutable);
  if (version === null) return { status: "failed", reason: "pi-version-unavailable" };

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
  }, lifecycle, providerId);
  const after = readAllAuditShards(projectDir);
  const humanTurnCount = countMarker(after, "HUMAN_TURN") - countMarker(before, "HUMAN_TURN");
  const gateApprovedCount = countMarker(after, "GATE_APPROVED") - countMarker(before, "GATE_APPROVED");
  if (result.kind !== "succeeded") return { status: "failed", reason: `driver-${result.kind}` };
  if (humanTurnCount !== 0 || gateApprovedCount !== 0) {
    return { status: "failed", reason: "rpc-presence-boundary-violated" };
  }
  if (!result.output.includes("AMADEUS_PI_LIVE_OK")) return { status: "failed", reason: "live-output-mismatch" };
  return {
    status: "passed",
    platform: process.platform,
    piVersion: version,
    providerId,
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
