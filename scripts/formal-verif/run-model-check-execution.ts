import type { Result } from "./contract.ts";
import type {
  PlannedTlcOutcome,
  PlannedTlcPrepareInput,
  PreparedPlannedTlcRun,
} from "./fs-tlc-toolchain.ts";
import {
  modelCheckExitCode,
  toModelCheckOutcome,
  toolchainErrorOutcome,
  type EnvReceipt,
  type ModelCheckOutcome,
  type RunModelCheckInput,
} from "./run-model-check-domain.ts";
import {
  publishModelCheckArtifacts,
  type ArtifactPublishError,
  type ArtifactWorkspace,
  type ModelCheckArtifactInput,
  type PublishedModelCheckArtifacts,
} from "./run-model-check-artifacts.ts";
import {
  prepareModelCheckCache,
  type RunModelCheckFilesystemPort,
} from "./run-model-check-paths.ts";
import type { RunModelCheckSource } from "./run-model-check-source.ts";
import {
  FIXED_DOCKER_IMAGE,
  createNotRunPlannerReceipt,
  selectTlcSpawnPlanner,
  type PlannerEnvironmentPort,
} from "./tlc-spawn-planner.ts";
import type {
  TlcToolchainError,
  VerifiedTlcArtifact,
} from "./tlc-toolchain.ts";

export interface PlannedModelCheckToolchain {
  acquire(): Promise<Result<VerifiedTlcArtifact, TlcToolchainError>>;
  preparePlanned(
    input: PlannedTlcPrepareInput,
  ): Promise<Result<PreparedPlannedTlcRun, TlcToolchainError>>;
  runPlanned(
    prepared: PreparedPlannedTlcRun,
  ): Promise<Result<PlannedTlcOutcome, TlcToolchainError>>;
}

export interface ModelCheckArtifactPublisher {
  publish(
    input: ModelCheckArtifactInput,
  ): Result<PublishedModelCheckArtifacts, ArtifactPublishError>;
}

export const DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER: ModelCheckArtifactPublisher = {
  publish: publishModelCheckArtifacts,
};

export interface ReservedModelCheckDependencies {
  readonly utcNow: () => string;
  readonly platform: NodeJS.Platform;
  readonly environment: PlannerEnvironmentPort;
  readonly filesystem: RunModelCheckFilesystemPort;
  readonly publisher: ModelCheckArtifactPublisher;
  readonly createToolchain: (
    cacheRoot: string,
    workspaceRoot: string,
  ) => PlannedModelCheckToolchain;
}

export interface RunModelCheckResult {
  readonly exitCode: 0 | 1 | 2;
  readonly outcome: ModelCheckOutcome;
  readonly publishedDirectory: string | null;
}

function joinChunks(chunks: readonly Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(
    chunks.reduce((total, chunk) => total + chunk.byteLength, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function failure(code: string, detail: string): Extract<ModelCheckOutcome, { kind: "HARNESS_ERROR" }> {
  return { kind: "HARNESS_ERROR", code, detail };
}

function receiptFromError(
  error: TlcToolchainError,
  input: RunModelCheckInput,
  workspace: ArtifactWorkspace,
  dependencies: ReservedModelCheckDependencies,
): EnvReceipt {
  const receipt = (error as TlcToolchainError & { readonly environmentReceipt?: EnvReceipt })
    .environmentReceipt;
  return receipt ?? createNotRunPlannerReceipt(
    input.provider,
    dependencies.platform,
    workspace.runId,
    "code" in error ? error.code : error.kind,
  );
}

function publish(
  workspace: ArtifactWorkspace,
  outcome: ModelCheckOutcome,
  receipt: EnvReceipt,
  stdout: Uint8Array,
  stderr: Uint8Array,
  startedAt: string,
  dependencies: ReservedModelCheckDependencies,
): RunModelCheckResult {
  const exitCode = modelCheckExitCode(outcome);
  const attempt = (
    terminalOutcome: ModelCheckOutcome,
    terminalExitCode: 0 | 1 | 2,
  ): Result<PublishedModelCheckArtifacts, ArtifactPublishError> => {
    try {
      return dependencies.publisher.publish({
        workspace,
        outcome: terminalOutcome,
        exitCode: terminalExitCode,
        environmentReceipt: receipt,
        stdout,
        stderr,
        startedAt,
        finishedAt: dependencies.utcNow(),
      });
    } catch {
      return {
        ok: false,
        error: {
          kind: "ARTIFACT_PUBLISH",
          code: "WRITE",
          detail: "artifact publisher raised an exception",
        },
      };
    }
  };
  const published = attempt(outcome, exitCode);
  if (published.ok) {
    return { exitCode, outcome, publishedDirectory: published.value.directory };
  }
  const publishFailure = failure(published.error.code, published.error.detail);
  const recovered = attempt(publishFailure, 2);
  if (recovered.ok) {
    return {
      exitCode: 2,
      outcome: publishFailure,
      publishedDirectory: recovered.value.directory,
    };
  }
  return {
    exitCode: 2,
    outcome: publishFailure,
    publishedDirectory: null,
  };
}

function publishToolchainFailure(
  error: TlcToolchainError,
  input: RunModelCheckInput,
  workspace: ArtifactWorkspace,
  startedAt: string,
  dependencies: ReservedModelCheckDependencies,
): RunModelCheckResult {
  const outcome = toolchainErrorOutcome(error);
  return publish(
    workspace,
    outcome,
    receiptFromError(error, input, workspace, dependencies),
    new Uint8Array(),
    new TextEncoder().encode(`${outcome.code}\n`),
    startedAt,
    dependencies,
  );
}

export async function executeReservedModelCheck(
  input: RunModelCheckInput,
  source: RunModelCheckSource,
  workspace: ArtifactWorkspace,
  startedAt: string,
  dependencies: ReservedModelCheckDependencies,
): Promise<RunModelCheckResult> {
  try {
    const cache = prepareModelCheckCache(workspace, dependencies.filesystem);
    if (!cache.ok) {
      return publish(
        workspace,
        cache.error,
        createNotRunPlannerReceipt(input.provider, dependencies.platform, workspace.runId, cache.error.code),
        new Uint8Array(),
        new TextEncoder().encode(`${cache.error.code}\n`),
        startedAt,
        dependencies,
      );
    }
    const toolchain = dependencies.createToolchain(cache.value, source.workspaceRoot);
    const acquired = await toolchain.acquire();
    if (!acquired.ok) {
      return publishToolchainFailure(acquired.error, input, workspace, startedAt, dependencies);
    }
    const planner = selectTlcSpawnPlanner(
      input.provider,
      {
        imageRef: FIXED_DOCKER_IMAGE,
        jarPath: acquired.value.cachePath,
        jarSha256: acquired.value.actualSha256,
      },
      dependencies.environment,
      dependencies.platform,
    );
    if (!planner.ok) {
      return publishToolchainFailure(planner.error, input, workspace, startedAt, dependencies);
    }
    const prepared = await toolchain.preparePlanned({
      artifact: acquired.value,
      modelReceipt: source.modelReceipt,
      modulePath: source.modelPath,
      cfgPath: source.cfgPath,
      subjectAlias: "run-model-check",
      deadlineMs: 180_000,
      runId: workspace.runId,
      scratchRoot: workspace.scratchRoot,
      planner: planner.value,
    });
    if (!prepared.ok) {
      return publishToolchainFailure(prepared.error, input, workspace, startedAt, dependencies);
    }
    const executed = await toolchain.runPlanned(prepared.value);
    if (!executed.ok) {
      return publishToolchainFailure(executed.error, input, workspace, startedAt, dependencies);
    }
    return publish(
      workspace,
      toModelCheckOutcome(executed.value.exploration),
      executed.value.environmentReceipt,
      joinChunks(executed.value.raw.stdoutChunks),
      joinChunks(executed.value.raw.stderrChunks),
      startedAt,
      dependencies,
    );
  } catch {
    const outcome = failure("UNEXPECTED_RUNTIME", "reserved model-check execution failed");
    return publish(
      workspace,
      outcome,
      createNotRunPlannerReceipt(input.provider, dependencies.platform, workspace.runId, outcome.code),
      new Uint8Array(),
      new TextEncoder().encode(`${outcome.code}\n`),
      startedAt,
      dependencies,
    );
  }
}
