import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import {
  FsTlcToolchain,
  NodeArtifactNetworkPort,
  NodeFileDigestPort,
  NodePhysicalReservationPort,
  NodeTlcProcessPort,
} from "./fs-tlc-toolchain.ts";
import {
  executeReservedModelCheck,
  DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER,
  type ModelCheckArtifactPublisher,
  type PlannedModelCheckToolchain,
  type RunModelCheckResult,
} from "./run-model-check-execution.ts";
import {
  parseRunModelCheckArgs,
} from "./run-model-check-domain.ts";
import {
  beginModelCheckArtifacts,
  type ArtifactPublishError,
  type ArtifactWorkspace,
} from "./run-model-check-artifacts.ts";
import {
  NODE_RUN_MODEL_CHECK_FILESYSTEM,
  validateModelCheckOutputPath,
  type RunModelCheckFilesystemPort,
} from "./run-model-check-paths.ts";
import {
  StderrModelCheckReporter,
  type ModelCheckReporter,
} from "./run-model-check-reporter.ts";
import { loadRunModelCheckSource } from "./run-model-check-source.ts";
import {
  NodePlannerEnvironmentPort,
  type PlannerEnvironmentPort,
} from "./tlc-spawn-planner.ts";
import type { Result } from "./contract.ts";

export type {
  ModelCheckArtifactPublisher,
  PlannedModelCheckToolchain,
  RunModelCheckResult,
} from "./run-model-check-execution.ts";

export interface RunModelCheckDependencies {
  readonly randomUuid: () => string;
  readonly utcNow: () => string;
  readonly platform: NodeJS.Platform;
  readonly environment: PlannerEnvironmentPort;
  readonly filesystem: RunModelCheckFilesystemPort;
  readonly publisher: ModelCheckArtifactPublisher;
  readonly reserveArtifacts: (
    outDir: string,
    runId: string,
  ) => Result<ArtifactWorkspace, ArtifactPublishError>;
  readonly createToolchain: (
    cacheRoot: string,
    workspaceRoot: string,
  ) => PlannedModelCheckToolchain;
  readonly reporter: ModelCheckReporter;
}

export interface RunModelCheckMainDependencies {
  readonly run: (argv: readonly string[]) => Promise<RunModelCheckResult>;
  readonly setExitCode: (exitCode: 0 | 1 | 2) => void;
}

export function createDefaultModelCheckToolchain(
  cacheRoot: string,
  workspaceRoot: string,
  processes: NodeTlcProcessPort = new NodeTlcProcessPort(),
): PlannedModelCheckToolchain {
  return new FsTlcToolchain(cacheRoot, {
    network: new NodeArtifactNetworkPort(),
    digest: new NodeFileDigestPort(),
    reservation: new NodePhysicalReservationPort(),
    clock: { nowMs: Date.now, utcNow: () => new Date().toISOString() },
    owner: {
      host: hostname(),
      pid: process.pid,
      processStartedAt: new Date(Date.now() - process.uptime() * 1_000).toISOString(),
    },
    liveness: () => "unknown",
    randomUuid: randomUUID,
    jdkVersion: "OpenJDK 26.0.1",
    workspaceRoot,
    process: processes,
    suiteRemainingMs: () => 180_000,
    evidencePublishReserveMs: 5_000,
  });
}

const DEFAULT_DEPENDENCIES: RunModelCheckDependencies = {
  randomUuid: randomUUID,
  utcNow: () => new Date().toISOString(),
  platform: process.platform,
  environment: new NodePlannerEnvironmentPort(),
  filesystem: NODE_RUN_MODEL_CHECK_FILESYSTEM,
  publisher: DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER,
  reserveArtifacts: beginModelCheckArtifacts,
  createToolchain: createDefaultModelCheckToolchain,
  reporter: new StderrModelCheckReporter(
    (line) => process.stderr.write(`${line}\n`),
  ),
};

function failedResult(
  code: string,
  detail: string,
): RunModelCheckResult {
  return {
    exitCode: 2,
    outcome: { kind: "HARNESS_ERROR", code, detail },
    publishedDirectory: null,
  };
}

function report(
  dependencies: RunModelCheckDependencies,
  runId: string | null,
  result: RunModelCheckResult,
): RunModelCheckResult {
  try {
    dependencies.reporter.report(runId, result.outcome);
  } catch {
    return failedResult("REPORT_FAILURE", "terminal report could not be written");
  }
  return result;
}

export async function runModelCheck(
  argv: readonly string[],
  dependencies: RunModelCheckDependencies = DEFAULT_DEPENDENCIES,
): Promise<RunModelCheckResult> {
  try {
    const parsed = parseRunModelCheckArgs(argv);
    if (!parsed.ok) {
      return report(dependencies, null, failedResult(parsed.error.kind, parsed.error.detail));
    }
    const source = loadRunModelCheckSource(parsed.value.modelPath, parsed.value.cfgPath);
    if (!source.ok) {
      return report(dependencies, null, failedResult(source.error.code, source.error.detail));
    }
    const path = validateModelCheckOutputPath(
      parsed.value,
      source.value.workspaceRoot,
      dependencies.filesystem,
    );
    if (!path.ok) {
      return report(dependencies, null, failedResult(path.error.code, path.error.detail));
    }
    const runId = dependencies.randomUuid();
    const artifacts = dependencies.reserveArtifacts(parsed.value.outDir, runId);
    if (!artifacts.ok) {
      return report(dependencies, runId, failedResult(artifacts.error.code, artifacts.error.detail));
    }
    const result = await executeReservedModelCheck(
      parsed.value,
      source.value,
      artifacts.value,
      dependencies.utcNow(),
      dependencies,
    );
    return report(dependencies, runId, result);
  } catch {
    return report(
      dependencies,
      null,
      failedResult("BOUNDARY_FAILURE", "model-check boundary failed before artifact reservation"),
    );
  }
}

export async function runModelCheckMain(
  isMain: boolean,
  argv: readonly string[],
  dependencies: RunModelCheckMainDependencies = {
    run: runModelCheck,
    setExitCode: (exitCode) => { process.exitCode = exitCode; },
  },
): Promise<void> {
  if (!isMain) return;
  const result = await dependencies.run(argv);
  dependencies.setExitCode(result.exitCode);
}

await runModelCheckMain(import.meta.main, process.argv.slice(2));
