import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Result } from "./contract.ts";
import {
  EXPECTED_RUNS,
  type CiAcceptanceEvidence,
  type CiModelTarget,
  type CiModelCheckRunEvidence,
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
  readonly model: CiModelTarget;
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
  readonly models: readonly CiModelTarget[];
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
  model?: string,
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
    ...(model === undefined ? {} : { model }),
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

  const runs: CiModelCheckRunEvidence[] = [];
  for (const model of options.models) {
    mkdirSync(join(options.evidenceRoot, model.name, "runs"), {
      recursive: true,
      mode: 0o700,
    });
    for (const [kind, index] of EXPECTED_RUNS) {
      const artifactDirectory = `${model.name}/runs/${kind}-${index}`;
      const executed = await port.run({
        evidenceRoot: options.evidenceRoot,
        outDir: join(options.evidenceRoot, artifactDirectory),
        model,
        kind,
        index,
      });
      if (!executed.ok) {
        recordFailure(
          options.evidenceRoot,
          "run-failure.json",
          "amadeus.ci-model-check-run-failure.v1",
          executed.error,
          options.runtime,
          model.name,
        );
        writeJson(join(options.evidenceRoot, "verification.json"), {
          schema: "amadeus.ci-model-check-verification.v1",
          pass: false,
          errorCode: executed.error.code,
          detail: executed.error.detail,
          model: model.name,
          completedRuns: runs.length,
        });
        return { exitCode: 2, reason: "RUN_FAILURE" };
      }
      runs.push(executed.value);
    }
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
  const verified = verifyCiAcceptanceArtifacts(
    options.evidenceRoot,
    options.models.map((model) => model.name),
  );
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
