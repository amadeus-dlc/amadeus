import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Result } from "./contract.ts";
import type {
  CiAcceptanceEvidence,
  CiModelCheckRunEvidence,
} from "./ci-model-check-domain.ts";
import { verifyCiAcceptanceArtifacts } from "./ci-model-check-artifacts.ts";
import { FIXED_DOCKER_IMAGE } from "./tlc-spawn-planner.ts";
import { FIXED_TLC_ARTIFACT_DESCRIPTOR } from "./tlc-toolchain.ts";

export interface CiAcceptanceFailure {
  readonly code: string;
  readonly detail: string;
}

export interface CiAcceptanceRuntime {
  readonly bunVersion: string;
  readonly runnerOs: string;
  readonly runnerArch: string;
  readonly githubRunId: string;
  readonly githubRunAttempt: string;
  readonly headSha: string;
}

export interface CiAcceptanceRunRequest {
  readonly evidenceRoot: string;
  readonly outDir: string;
  readonly kind: "warm-up" | "measured";
  readonly index: number;
}

export interface CiAcceptancePort {
  bootstrap(evidenceRoot: string): Promise<Result<void, CiAcceptanceFailure>>;
  run(
    request: CiAcceptanceRunRequest,
  ): Promise<Result<CiModelCheckRunEvidence, CiAcceptanceFailure>>;
}

export interface CiAcceptanceOptions {
  readonly evidenceRoot: string;
  readonly runtime: CiAcceptanceRuntime;
}

export interface CiAcceptanceResult {
  readonly exitCode: 0 | 2;
  readonly reason: "NOT_DETECTED" | "BOOTSTRAP_FAILURE" | "RUN_FAILURE" | "ARTIFACT_VERIFY_FAILURE";
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function recordFailure(
  root: string,
  fileName: string,
  schema: string,
  failure: CiAcceptanceFailure,
  runtime: CiAcceptanceRuntime,
): void {
  writeJson(join(root, fileName), {
    schema,
    step: failure.code,
    errorCode: failure.code,
    detail: failure.detail,
    imageRef: FIXED_DOCKER_IMAGE,
    jar: {
      version: FIXED_TLC_ARTIFACT_DESCRIPTOR.version,
      url: FIXED_TLC_ARTIFACT_DESCRIPTOR.url,
      sha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
    },
    runtime,
  });
}

export async function executeCiModelCheckAcceptance(
  options: CiAcceptanceOptions,
  port: CiAcceptancePort,
): Promise<CiAcceptanceResult> {
  mkdirSync(options.evidenceRoot, { recursive: true, mode: 0o700 });
  const bootstrapped = await port.bootstrap(options.evidenceRoot);
  if (!bootstrapped.ok) {
    recordFailure(
      options.evidenceRoot,
      "bootstrap-failure.json",
      "amadeus.ci-model-check-bootstrap-failure.v1",
      bootstrapped.error,
      options.runtime,
    );
    return { exitCode: 2, reason: "BOOTSTRAP_FAILURE" };
  }

  const specs = [
    { kind: "warm-up", index: 0 },
    { kind: "measured", index: 1 },
    { kind: "measured", index: 2 },
    { kind: "measured", index: 3 },
    { kind: "measured", index: 4 },
    { kind: "measured", index: 5 },
  ] as const;
  mkdirSync(join(options.evidenceRoot, "runs"), { recursive: true, mode: 0o700 });
  const runs: CiModelCheckRunEvidence[] = [];
  for (const spec of specs) {
    const artifactDirectory = `runs/${spec.kind}-${spec.index}`;
    const executed = await port.run({
      evidenceRoot: options.evidenceRoot,
      outDir: join(options.evidenceRoot, artifactDirectory),
      kind: spec.kind,
      index: spec.index,
    });
    if (!executed.ok) {
      recordFailure(
        options.evidenceRoot,
        "run-failure.json",
        "amadeus.ci-model-check-run-failure.v1",
        executed.error,
        options.runtime,
      );
      writeJson(join(options.evidenceRoot, "verification.json"), {
        schema: "amadeus.ci-model-check-verification.v1",
        pass: false,
        errorCode: executed.error.code,
        detail: executed.error.detail,
        completedRuns: runs.length,
      });
      return { exitCode: 2, reason: "RUN_FAILURE" };
    }
    runs.push(executed.value);
  }

  const evidence: CiAcceptanceEvidence = {
    schema: "amadeus.ci-model-check-acceptance.v1",
    imageRef: FIXED_DOCKER_IMAGE,
    jar: {
      version: FIXED_TLC_ARTIFACT_DESCRIPTOR.version,
      url: FIXED_TLC_ARTIFACT_DESCRIPTOR.url,
      sha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
    },
    runtime: { ...options.runtime },
    runs,
  };
  writeJson(join(options.evidenceRoot, "acceptance.json"), evidence);
  const verified = verifyCiAcceptanceArtifacts(options.evidenceRoot);
  writeJson(join(options.evidenceRoot, "verification.json"), {
    schema: "amadeus.ci-model-check-verification.v1",
    pass: verified.ok,
    errorCode: verified.ok ? null : "ARTIFACT_VERIFY",
    detail: verified.ok ? "" : verified.error,
    completedRuns: runs.length,
  });
  if (!verified.ok) return { exitCode: 2, reason: "ARTIFACT_VERIFY_FAILURE" };
  return { exitCode: 0, reason: "NOT_DETECTED" };
}
