import { createHash } from "node:crypto";
import { canonicalIdentity } from "./canonical.ts";
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
  type TlcSpawnPlanner,
} from "./run-model-check-domain.ts";
import type { TlcExploration } from "./tlc-toolchain.ts";
import {
  cfgConstants,
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
  planner?: TlcSpawnPlanner,
): EnvReceipt {
  const receipt = (error as TlcToolchainError & { readonly environmentReceipt?: EnvReceipt })
    .environmentReceipt;
  return receipt ?? createNotRunPlannerReceipt(
    input.provider,
    dependencies.platform,
    workspace.runId,
    "code" in error ? error.code : error.kind,
    planner?.identity,
  );
}

function publish(
  input: RunModelCheckInput,
  source: RunModelCheckSource,
  workspace: ArtifactWorkspace,
  outcome: ModelCheckOutcome,
  receipt: EnvReceipt,
  stdout: Uint8Array,
  stderr: Uint8Array,
  startedAt: string,
  dependencies: ReservedModelCheckDependencies,
  exploration?: TlcExploration,
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
        ...(input.advisory === undefined ? {} : { advisory: input.advisory }),
        sourceProvenance: sourceProvenance(source),
        ...(exploration === undefined ? {} : { exploration }),
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

function sourceProvenance(source: RunModelCheckSource) {
  const body = {
    modelPath: source.source.model.model.path,
    cfgPath: source.source.model.cfg.path,
    modelIdentity: source.modelReceipt.modelIdentity,
    moduleIdentity: source.source.moduleIdentity,
    cfgIdentity: source.source.cfgIdentity,
    moduleSha256: createHash("sha256").update(source.source.moduleBytes).digest("hex"),
    cfgSha256: createHash("sha256").update(source.source.cfgBytes).digest("hex"),
    auxiliaries: source.source.auxIdentities.map(({ path, identity }) => ({ path, identity })),
    implementations: source.source.model.entries.map(({ implPath, sha256 }) => ({
      path: implPath,
      identity: sha256,
    })),
    constants: cfgConstants(source.source.cfgSource),
  };
  return {
    ...body,
    sourceIdentity: canonicalIdentity(body, "amadeus.formal-verif.model-check-source.v1").sha256,
  };
}

function publishToolchainFailure(
  error: TlcToolchainError,
  input: RunModelCheckInput,
  source: RunModelCheckSource,
  workspace: ArtifactWorkspace,
  startedAt: string,
  dependencies: ReservedModelCheckDependencies,
  planner?: TlcSpawnPlanner,
): RunModelCheckResult {
  const outcome = toolchainErrorOutcome(error);
  return publish(
    input,
    source,
    workspace,
    outcome,
    receiptFromError(error, input, workspace, dependencies, planner),
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
  // Held outside the try so an unexpected throw still publishes the plan of the
  // provider that was actually selected.
  let selected: TlcSpawnPlanner | undefined;
  try {
    const cache = prepareModelCheckCache(workspace, dependencies.filesystem);
    if (!cache.ok) {
      return publish(
        input,
        source,
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
      return publishToolchainFailure(acquired.error, input, source, workspace, startedAt, dependencies);
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
      return publishToolchainFailure(planner.error, input, source, workspace, startedAt, dependencies);
    }
    selected = planner.value;
    const prepared = await toolchain.preparePlanned({
      artifact: acquired.value,
      modelReceipt: source.modelReceipt,
      vocabulary: source.vocabulary,
      modulePath: source.modelPath,
      cfgPath: source.cfgPath,
      subjectAlias: "run-model-check",
      deadlineMs: 180_000,
      runId: workspace.runId,
      scratchRoot: workspace.scratchRoot,
      planner: planner.value,
    });
    if (!prepared.ok) {
      return publishToolchainFailure(prepared.error, input, source, workspace, startedAt, dependencies, planner.value);
    }
    const executed = await toolchain.runPlanned(prepared.value);
    if (!executed.ok) {
      return publishToolchainFailure(executed.error, input, source, workspace, startedAt, dependencies, planner.value);
    }
    return publish(
      input,
      source,
      workspace,
      toModelCheckOutcome(executed.value.exploration),
      executed.value.environmentReceipt,
      joinChunks(executed.value.raw.stdoutChunks),
      joinChunks(executed.value.raw.stderrChunks),
      startedAt,
      dependencies,
      executed.value.exploration,
    );
  } catch {
    const outcome = failure("UNEXPECTED_RUNTIME", "reserved model-check execution failed");
    return publish(
      input,
      source,
      workspace,
      outcome,
      createNotRunPlannerReceipt(input.provider, dependencies.platform, workspace.runId, outcome.code, selected?.identity),
      new Uint8Array(),
      new TextEncoder().encode(`${outcome.code}\n`),
      startedAt,
      dependencies,
    );
  }
}
