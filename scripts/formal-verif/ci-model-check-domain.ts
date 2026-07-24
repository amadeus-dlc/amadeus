import type { Result } from "./contract.ts";
import { FIXED_DOCKER_IMAGE } from "./tlc-spawn-planner.ts";
import { FIXED_TLC_ARTIFACT_DESCRIPTOR } from "./tlc-toolchain.ts";

export type CiRunKind = "warm-up" | "measured";

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
  kind: CiRunKind;
  index: number;
  runId: string;
  artifactDirectory: string;
  outcome: "NOT_DETECTED" | "DETECTED" | "HARNESS_ERROR";
  exitCode: 0 | 1 | 2;
  cliMs: number;
  spawnMs: number;
  docker: CiDockerCommandReceipt;
  cleanup: CiCleanupReceipt;
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
  expectedKind: CiRunKind,
  expectedIndex: number,
): Result<void, string> {
  if (
    run.kind !== expectedKind
    || run.index !== expectedIndex
    || !UUID.test(run.runId)
    || run.artifactDirectory !== `runs/${expectedKind}-${expectedIndex}`
  ) {
    return invalid(`run ${expectedIndex} identity or ordering is invalid`);
  }
  if (run.outcome !== "NOT_DETECTED" || run.exitCode !== 0) {
    return invalid(`run ${expectedIndex} did not complete with NOT_DETECTED`);
  }
  if (!Number.isFinite(run.cliMs) || run.cliMs < 0 || run.cliMs >= 180_000) {
    return invalid(`run ${expectedIndex} CLI duration is outside the 180 second budget`);
  }
  if (!Number.isFinite(run.spawnMs) || run.spawnMs < 0 || run.spawnMs >= 180_000) {
    return invalid(`run ${expectedIndex} spawn duration is outside the 180 second budget`);
  }
  return validateDockerReceipt(run);
}

export function validateCiAcceptanceEvidence(
  evidence: CiAcceptanceEvidence,
): Result<void, string> {
  if (
    evidence.schema !== "amadeus.ci-model-check-acceptance.v1"
    || evidence.imageRef !== FIXED_DOCKER_IMAGE
    || evidence.jar.version !== FIXED_TLC_ARTIFACT_DESCRIPTOR.version
    || evidence.jar.url !== FIXED_TLC_ARTIFACT_DESCRIPTOR.url
    || evidence.jar.sha256 !== FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256
  ) {
    return invalid("canonical image or jar descriptor drifted");
  }
  if (
    evidence.runtime.bunVersion !== "1.3.13"
    || evidence.runtime.githubRunId.length === 0
    || evidence.runtime.githubRunAttempt.length === 0
    || !GIT_SHA.test(evidence.runtime.headSha)
  ) {
    return invalid("runtime receipt is incomplete");
  }
  if (evidence.runs.length !== 6) {
    return invalid("acceptance requires one warm-up and five measured runs");
  }
  const expected = [
    ["warm-up", 0],
    ["measured", 1],
    ["measured", 2],
    ["measured", 3],
    ["measured", 4],
    ["measured", 5],
  ] as const;
  const seen = new Set<string>();
  for (let index = 0; index < expected.length; index += 1) {
    const run = evidence.runs[index]!;
    if (seen.has(run.runId)) return invalid(`run ${run.index} reused a runId`);
    seen.add(run.runId);
    const verified = validateRun(run, expected[index]![0], expected[index]![1]);
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
