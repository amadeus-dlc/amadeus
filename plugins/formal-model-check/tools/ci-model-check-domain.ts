import type { Result } from "./contract.ts";
import { FIXED_DOCKER_IMAGE } from "./tlc-spawn-planner.ts";
import { FIXED_TLC_ARTIFACT_DESCRIPTOR } from "./tlc-toolchain.ts";

export type CiRunKind = "warm-up" | "measured";
export type CiVerificationLayer = "frozen" | "verified-source";

export interface CiModelTarget {
  readonly name: string;
  readonly modelPath: string;
  readonly cfgPath: string;
  readonly layer: CiVerificationLayer;
}

interface VerifiedModelTargetSource {
  readonly model: {
    readonly name: string;
    readonly model: { readonly path: string };
    readonly cfg: { readonly path: string };
  };
}

export function ciModelTargetFor(source: VerifiedModelTargetSource): CiModelTarget {
  return {
    name: source.model.name,
    modelPath: source.model.model.path,
    cfgPath: source.model.cfg.path,
    layer: source.model.name === "FormalElection" ? "frozen" : "verified-source",
  };
}

export interface ModelTlcEvidence {
  readonly model: string;
  readonly completionMarker: boolean;
  readonly generatedStates: number | null;
  readonly distinctStates: number | null;
  readonly statesLeftOnQueue: number | null;
  readonly searchDepth: number | null;
}

export interface CiDockerCommandReceipt {
  imageRef: string;
  argv: string[];
  exitCode: number;
}

export interface CiCleanupReceipt {
  containerName: string;
  remainingContainers: number;
  forced: boolean;
}

export interface CiModelCheckRunEvidence {
  readonly model: string;
  readonly kind: CiRunKind;
  readonly index: number;
  readonly runId: string;
  readonly artifactDirectory: string;
  readonly outcome: "NOT_DETECTED" | "DETECTED" | "HARNESS_ERROR";
  readonly exitCode: 0 | 1 | 2;
  readonly cliMs: number;
  readonly spawnMs: number;
  readonly docker: CiDockerCommandReceipt;
  readonly cleanup: CiCleanupReceipt;
  readonly stats: ModelTlcEvidence;
}

export interface CiAcceptanceEvidence {
  schema: "amadeus.ci-model-check-acceptance.v1";
  imageRef: string;
  jar: {
    version: string;
    url: string;
    sha256: string;
  };
  runtime: {
    bunVersion: string;
    runnerOs: string;
    runnerArch: string;
    githubRunId: string;
    githubRunAttempt: string;
    headSha: string;
  };
  runs: CiModelCheckRunEvidence[];
}

export interface CiTerminalInputs {
  readonly bootstrapFailed: boolean;
  readonly modelExitCode: 0 | 1 | 2;
  readonly artifactVerifyFailed: boolean;
  readonly uploadFailed: boolean;
}

export interface CiTerminalState {
  readonly exitCode: 0 | 1 | 2;
  readonly reason:
    | "BOOTSTRAP_FAILURE"
    | "MODEL_CHECK_HARNESS_ERROR"
    | "ARTIFACT_VERIFY_FAILURE"
    | "UPLOAD_FAILURE"
    | "DETECTED"
    | "NOT_DETECTED";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const GIT_SHA = /^[0-9a-f]{40,64}$/;

function invalid(detail: string): Result<void, string> {
  return { ok: false, error: detail };
}

function hasPair(argv: readonly string[], flag: string, value: string): boolean {
  return argv.some((argument, index) => argument === flag && argv[index + 1] === value);
}

function validateDockerReceipt(run: CiModelCheckRunEvidence): Result<void, string> {
  const expectedName = `amadeus-tlc-${run.runId}`;
  if (run.docker.imageRef !== FIXED_DOCKER_IMAGE || run.docker.exitCode !== 0) {
    return invalid(`run ${run.index} Docker image or exit drifted`);
  }
  if (
    run.docker.argv[0] !== "run"
    || !run.docker.argv.includes("--rm")
    || !hasPair(run.docker.argv, "--network=none", "--name")
    || !hasPair(run.docker.argv, "--name", expectedName)
    || !run.docker.argv.includes(FIXED_DOCKER_IMAGE)
    || run.docker.argv.includes("--privileged")
  ) {
    return invalid(`run ${run.index} Docker isolation arguments are invalid`);
  }
  const mounts = run.docker.argv.filter((argument) => argument.startsWith("type=bind,"));
  if (
    !mounts.includes("type=bind,src=$WORKSPACE/specs/tla,dst=$WORKSPACE/specs/tla,readonly")
    || !mounts.includes("type=bind,src=$JAR,dst=$JAR,readonly")
    || !mounts.includes("type=bind,src=$SCRATCH,dst=$SCRATCH")
  ) {
    return invalid(`run ${run.index} Docker mount policy is invalid`);
  }
  if (
    run.cleanup.containerName !== expectedName
    || run.cleanup.remainingContainers !== 0
    || run.cleanup.forced
  ) {
    return invalid(`run ${run.index} left a Docker container behind`);
  }
  return { ok: true, value: undefined };
}

function validateRun(
  run: CiModelCheckRunEvidence,
  expectedModel: string,
  expectedKind: CiRunKind,
  expectedIndex: number,
): Result<void, string> {
  const identity = validateRunIdentity(run, expectedModel, expectedKind, expectedIndex);
  if (!identity.ok) return identity;
  const execution = validateRunExecution(run, expectedModel, expectedKind, expectedIndex);
  if (!execution.ok) return execution;
  return validateDockerReceipt(run);
}

function validateRunIdentity(
  run: CiModelCheckRunEvidence,
  expectedModel: string,
  expectedKind: CiRunKind,
  expectedIndex: number,
): Result<void, string> {
  if (
    run.model !== expectedModel
    || run.kind !== expectedKind
    || run.index !== expectedIndex
    || !UUID.test(run.runId)
    || run.artifactDirectory !== `${expectedModel}/runs/${expectedKind}-${expectedIndex}`
  ) {
    return invalid(`run ${expectedIndex} identity or ordering is invalid`);
  }
  if (run.outcome !== "NOT_DETECTED" || run.exitCode !== 0) {
    return invalid(`run ${expectedIndex} did not complete with NOT_DETECTED`);
  }
  return { ok: true, value: undefined };
}

function validateRunExecution(
  run: CiModelCheckRunEvidence,
  expectedModel: string,
  expectedKind: CiRunKind,
  expectedIndex: number,
): Result<void, string> {
  if (!Number.isFinite(run.cliMs) || run.cliMs < 0 || run.cliMs >= 180_000) {
    return invalid(`run ${expectedIndex} CLI duration is outside the 180 second budget`);
  }
  if (!Number.isFinite(run.spawnMs) || run.spawnMs < 0 || run.spawnMs >= 180_000) {
    return invalid(`run ${expectedIndex} spawn duration is outside the 180 second budget`);
  }
  if (run.stats.model !== expectedModel || !run.stats.completionMarker) {
    return invalid(`run ${expectedIndex} TLC completion evidence is invalid`);
  }
  if (expectedModel === "MirrorLifecycle" && expectedKind === "measured" && (
    run.stats.generatedStates !== 208_628
    || run.stats.distinctStates !== 89_099
    || run.stats.statesLeftOnQueue !== 0
    || run.stats.searchDepth !== 18
  )) {
    return invalid(`run ${expectedIndex} MirrorLifecycle statistics drifted`);
  }
  return { ok: true, value: undefined };
}

const EXPECTED_RUNS = [
  ["warm-up", 0],
  ["measured", 1],
  ["measured", 2],
  ["measured", 3],
  ["measured", 4],
  ["measured", 5],
] as const;

function validateAcceptanceDescriptor(evidence: CiAcceptanceEvidence): Result<void, string> {
  if (
    evidence.schema !== "amadeus.ci-model-check-acceptance.v1"
    || evidence.imageRef !== FIXED_DOCKER_IMAGE
    || evidence.jar.version !== FIXED_TLC_ARTIFACT_DESCRIPTOR.version
    || evidence.jar.url !== FIXED_TLC_ARTIFACT_DESCRIPTOR.url
    || evidence.jar.sha256 !== FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256
  ) {
    return invalid("canonical image or jar descriptor drifted");
  }
  return { ok: true, value: undefined };
}

function validateAcceptanceRuntime(evidence: CiAcceptanceEvidence): Result<void, string> {
  if (
    evidence.runtime.bunVersion !== "1.3.13"
    || evidence.runtime.githubRunId.length === 0
    || evidence.runtime.githubRunAttempt.length === 0
    || !GIT_SHA.test(evidence.runtime.headSha)
  ) {
    return invalid("runtime receipt is incomplete");
  }
  if (evidence.runs.length === 0 || evidence.runs.length % EXPECTED_RUNS.length !== 0) {
    return invalid("acceptance requires six runs for every selected model");
  }
  return { ok: true, value: undefined };
}

function validateModelRuns(
  runs: readonly CiModelCheckRunEvidence[],
  offset: number,
  seen: Set<string>,
  modelNames: Set<string>,
): Result<void, string> {
  const expectedModel = runs[offset]!.model;
  if (expectedModel.length === 0 || modelNames.has(expectedModel)) {
    return invalid("acceptance model ordering is invalid");
  }
  modelNames.add(expectedModel);
  for (let index = 0; index < EXPECTED_RUNS.length; index += 1) {
    const run = runs[offset + index]!;
    if (seen.has(run.runId)) return invalid(`run ${run.index} reused a runId`);
    seen.add(run.runId);
    const verified = validateRun(
      run,
      expectedModel,
      EXPECTED_RUNS[index]![0],
      EXPECTED_RUNS[index]![1],
    );
    if (!verified.ok) return verified;
  }
  return { ok: true, value: undefined };
}

export function validateCiAcceptanceEvidence(
  evidence: CiAcceptanceEvidence,
): Result<void, string> {
  const descriptor = validateAcceptanceDescriptor(evidence);
  if (!descriptor.ok) return descriptor;
  const runtime = validateAcceptanceRuntime(evidence);
  if (!runtime.ok) return runtime;
  const seen = new Set<string>();
  const modelNames = new Set<string>();
  for (let offset = 0; offset < evidence.runs.length; offset += EXPECTED_RUNS.length) {
    const verified = validateModelRuns(evidence.runs, offset, seen, modelNames);
    if (!verified.ok) return verified;
  }
  return { ok: true, value: undefined };
}

export function resolveCiTerminalState(input: CiTerminalInputs): CiTerminalState {
  if (input.bootstrapFailed) return { exitCode: 2, reason: "BOOTSTRAP_FAILURE" };
  if (input.modelExitCode === 2) {
    return { exitCode: 2, reason: "MODEL_CHECK_HARNESS_ERROR" };
  }
  if (input.artifactVerifyFailed) {
    return { exitCode: 2, reason: "ARTIFACT_VERIFY_FAILURE" };
  }
  if (input.uploadFailed) return { exitCode: 2, reason: "UPLOAD_FAILURE" };
  if (input.modelExitCode === 1) return { exitCode: 1, reason: "DETECTED" };
  return { exitCode: 0, reason: "NOT_DETECTED" };
}
