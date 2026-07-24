import { describe, expect, test } from "bun:test";
import {
  resolveCiTerminalState,
  validateCiAcceptanceEvidence,
  type CiAcceptanceEvidence,
  type CiTerminalInputs,
} from "../../scripts/formal-verif/ci-model-check-domain.ts";
import { FIXED_DOCKER_IMAGE } from "../../scripts/formal-verif/tlc-spawn-planner.ts";
import { FIXED_TLC_ARTIFACT_DESCRIPTOR } from "../../scripts/formal-verif/tlc-toolchain.ts";

const SHA = "a".repeat(64);

function run(kind: "warm-up" | "measured", index: number) {
  const runId = `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
  return {
    kind,
    index,
    runId,
    artifactDirectory: `runs/${kind}-${index}`,
    outcome: "NOT_DETECTED" as const,
    exitCode: 0 as const,
    cliMs: 100_000,
    spawnMs: 99_000,
    docker: {
      imageRef: FIXED_DOCKER_IMAGE,
      argv: [
        "run",
        "--rm",
        "--network=none",
        "--name",
        `amadeus-tlc-${runId}`,
        "--mount",
        "type=bind,src=$WORKSPACE,dst=$WORKSPACE,readonly",
        "--mount",
        "type=bind,src=$JAR,dst=$JAR,readonly",
        "--mount",
        "type=bind,src=$SCRATCH,dst=$SCRATCH",
        FIXED_DOCKER_IMAGE,
      ],
      exitCode: 0,
    },
    cleanup: { containerName: `amadeus-tlc-${runId}`, remainingContainers: 0, forced: false },
  };
}

function evidence(): CiAcceptanceEvidence {
  return {
    schema: "amadeus.ci-model-check-acceptance.v1",
    imageRef: FIXED_DOCKER_IMAGE,
    jar: {
      version: FIXED_TLC_ARTIFACT_DESCRIPTOR.version,
      url: FIXED_TLC_ARTIFACT_DESCRIPTOR.url,
      sha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
    },
    runtime: {
      bunVersion: "1.3.13",
      runnerOs: "Linux",
      runnerArch: "X64",
      githubRunId: "123",
      githubRunAttempt: "1",
      headSha: SHA,
    },
    runs: [
      run("warm-up", 0),
      ...[1, 2, 3, 4, 5].map((index) => run("measured", index)),
    ],
  };
}

describe("CI model-check acceptance domain", () => {
  test("accepts exactly one warm-up and five bounded Docker measurements", () => {
    expect(validateCiAcceptanceEvidence(evidence())).toEqual({ ok: true, value: undefined });
  });

  test("rejects threshold equality, non-canonical supply data, and residual containers", () => {
    const value = evidence();
    value.runs[1] = { ...value.runs[1]!, spawnMs: 120_000 };
    expect(validateCiAcceptanceEvidence(value)).toEqual({
      ok: false,
      error: expect.stringContaining("spawn"),
    });

    const drifted = evidence();
    drifted.imageRef = "eclipse-temurin:latest";
    expect(validateCiAcceptanceEvidence(drifted).ok).toBe(false);

    const leaked = evidence();
    leaked.runs[0] = {
      ...leaked.runs[0]!,
      cleanup: { ...leaked.runs[0]!.cleanup, remainingContainers: 1 },
    };
    expect(validateCiAcceptanceEvidence(leaked).ok).toBe(false);
  });

  test("falls when Docker network, mount, privilege, or jar supply guards are removed", () => {
    for (const mutate of [
      (value: CiAcceptanceEvidence) => {
        value.runs[0]!.docker.argv = value.runs[0]!.docker.argv.filter(
          (argument) => argument !== "--network=none",
        );
      },
      (value: CiAcceptanceEvidence) => {
        value.runs[0]!.docker.argv = value.runs[0]!.docker.argv.filter(
          (argument) => !argument.includes("$WORKSPACE"),
        );
      },
      (value: CiAcceptanceEvidence) => {
        value.runs[0]!.docker.argv.push("--privileged");
      },
      (value: CiAcceptanceEvidence) => {
        value.jar.sha256 = "b".repeat(64);
      },
      (value: CiAcceptanceEvidence) => {
        value.runs[0]!.cleanup.forced = true;
      },
    ]) {
      const value = evidence();
      mutate(value);
      expect(validateCiAcceptanceEvidence(value).ok).toBe(false);
    }
  });

  test("rejects malformed runtime, run identity, outcomes, bounds, and duplicate runs", () => {
    const mutations: Array<(value: CiAcceptanceEvidence) => void> = [
      (value) => { value.runtime.bunVersion = "latest"; },
      (value) => { value.runtime.githubRunId = ""; },
      (value) => { value.runtime.githubRunAttempt = ""; },
      (value) => { value.runtime.headSha = "not-a-sha"; },
      (value) => { value.runs.pop(); },
      (value) => { value.runs[1]!.runId = value.runs[0]!.runId; },
      (value) => { value.runs[0]!.kind = "measured"; },
      (value) => { value.runs[0]!.runId = "invalid"; },
      (value) => { value.runs[0]!.artifactDirectory = "runs/other"; },
      (value) => { value.runs[0]!.outcome = "DETECTED"; value.runs[0]!.exitCode = 1; },
      (value) => { value.runs[0]!.cliMs = -1; },
      (value) => { value.runs[0]!.spawnMs = -1; },
      (value) => { value.runs[0]!.docker.exitCode = 1; },
    ];
    for (const mutate of mutations) {
      const value = evidence();
      mutate(value);
      expect(validateCiAcceptanceEvidence(value).ok).toBe(false);
    }
  });

  test("preserves the documented terminal failure priority", () => {
    const base: CiTerminalInputs = {
      bootstrapFailed: false,
      modelExitCode: 0,
      artifactVerifyFailed: false,
      uploadFailed: false,
    };
    expect(resolveCiTerminalState(base)).toEqual({ exitCode: 0, reason: "NOT_DETECTED" });
    expect(resolveCiTerminalState({ ...base, modelExitCode: 2 })).toEqual({
      exitCode: 2,
      reason: "MODEL_CHECK_HARNESS_ERROR",
    });
    expect(resolveCiTerminalState({ ...base, artifactVerifyFailed: true })).toEqual({
      exitCode: 2,
      reason: "ARTIFACT_VERIFY_FAILURE",
    });
    expect(resolveCiTerminalState({ ...base, modelExitCode: 1 })).toEqual({
      exitCode: 1,
      reason: "DETECTED",
    });
    expect(resolveCiTerminalState({ ...base, uploadFailed: true, modelExitCode: 1 })).toEqual({
      exitCode: 2,
      reason: "UPLOAD_FAILURE",
    });
    expect(resolveCiTerminalState({
      ...base,
      bootstrapFailed: true,
      modelExitCode: 2,
      artifactVerifyFailed: true,
      uploadFailed: true,
    })).toEqual({ exitCode: 2, reason: "BOOTSTRAP_FAILURE" });
  });
});
