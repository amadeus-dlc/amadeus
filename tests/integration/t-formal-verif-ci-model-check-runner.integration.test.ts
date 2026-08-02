import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  executeCiModelCheckAcceptance,
  type CiAcceptancePort,
} from "../../plugins/formal-model-check/tools/ci-model-check-runner.ts";
import type { CiModelTarget } from "../../plugins/formal-model-check/tools/ci-model-check-domain.ts";
import {
  beginModelCheckArtifacts,
  publishModelCheckArtifacts,
} from "../../plugins/formal-model-check/tools/run-model-check-artifacts.ts";
import {
  buildEnvReceipt,
  notApplicableInspection,
  passedInspection,
} from "../../plugins/formal-model-check/tools/run-model-check-domain.ts";
import { FIXED_DOCKER_IMAGE } from "../../plugins/formal-model-check/tools/tlc-spawn-planner.ts";
import { FIXED_TLC_ARTIFACT_DESCRIPTOR } from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";

const roots: string[] = [];
const HEAD = "a".repeat(40);
const MODELS: readonly CiModelTarget[] = [
  {
    name: "FormalElection",
    modelPath: "specs/tla/FormalElection.tla",
    cfgPath: "specs/tla/FormalElection.cfg",
    layer: "frozen",
  },
  {
    name: "MirrorLifecycle",
    modelPath: "specs/tla/MirrorLifecycle.tla",
    cfgPath: "specs/tla/MirrorLifecycle.cfg",
    layer: "verified-source",
  },
];

afterEach(() => {
  roots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

function successfulPort(failAt?: number): CiAcceptancePort {
  let call = 0;
  return {
    bootstrap: async () => ({ ok: true, value: undefined }),
    run: async ({ outDir, kind, index, model }) => {
      call += 1;
      const runId = `00000000-0000-4000-8000-${String(call).padStart(12, "0")}`;
      if (call === failAt) {
        return {
          ok: false,
          error: { code: "CLI_FAILED", detail: "injected CLI failure" },
        };
      }
      const workspace = beginModelCheckArtifacts(outDir, runId);
      if (!workspace.ok) throw new Error(workspace.error.detail);
      const published = publishModelCheckArtifacts({
        workspace: workspace.value,
        outcome: { kind: "NOT_DETECTED" },
        exitCode: 0,
        environmentReceipt: buildEnvReceipt(runId, "docker-planner", [
          passedInspection("image-digest", FIXED_DOCKER_IMAGE),
          passedInspection("jar-sha256", FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256),
          passedInspection("network-deny", "--network=none"),
          notApplicableInspection("jdk-snapshot", "Docker image supplies the isolated JDK"),
          notApplicableInspection("sandbox-profile", "Docker isolation replaces sandbox-exec"),
        ]),
        stdout: new TextEncoder().encode("TLC finished\n"),
        stderr: new TextEncoder().encode("OpenJDK diagnostic\n"),
        startedAt: "2026-07-24T00:00:00.000Z",
        finishedAt: "2026-07-24T00:01:40.000Z",
      });
      if (!published.ok) throw new Error(published.error.detail);
      return {
        ok: true,
        value: {
          model: model.name,
          kind,
          index,
          runId,
          artifactDirectory: `${model.name}/runs/${kind}-${index}`,
          outcome: "NOT_DETECTED",
          exitCode: 0,
          cliMs: 100_000,
          spawnMs: 99_000,
          docker: {
            imageRef: FIXED_DOCKER_IMAGE,
            argv: [
              "run", "--rm", "--network=none", "--name", `amadeus-tlc-${runId}`,
              "--mount", "type=bind,src=$WORKSPACE/specs/tla,dst=$WORKSPACE/specs/tla,readonly",
              "--mount", "type=bind,src=$JAR,dst=$JAR,readonly",
              "--mount", "type=bind,src=$SCRATCH,dst=$SCRATCH",
              FIXED_DOCKER_IMAGE,
            ],
            exitCode: 0,
          },
          cleanup: {
            containerName: `amadeus-tlc-${runId}`,
            remainingContainers: 0,
            forced: false,
          },
          stats: {
            model: model.name,
            completionMarker: true,
            generatedStates: model.name === "MirrorLifecycle" ? 208_628 : 1,
            distinctStates: model.name === "MirrorLifecycle" ? 89_099 : 1,
            statesLeftOnQueue: 0,
            searchDepth: model.name === "MirrorLifecycle" ? 18 : 1,
          },
        },
      };
    },
  };
}

function runtime() {
  return {
    bunVersion: "1.3.13",
    runnerOs: "Linux",
    runnerArch: "X64",
    githubRunId: "123",
    githubRunAttempt: "1",
    headSha: HEAD,
  };
}

describe("CI model-check acceptance runner", () => {
  test("publishes one warm-up and five measured runs before verifying the bundle", async () => {
    const root = mkdtempSync(join(tmpdir(), "ci-model-check-runner-"));
    roots.push(root);
    const evidenceRoot = join(root, "evidence");
    mkdirSync(evidenceRoot);

    const result = await executeCiModelCheckAcceptance(
      { evidenceRoot, runtime: runtime(), models: MODELS },
      successfulPort(),
    );

    expect(result).toEqual({ exitCode: 0, reason: "NOT_DETECTED" });
    const acceptance = JSON.parse(readFileSync(join(evidenceRoot, "acceptance.json"), "utf8"));
    expect(acceptance.runs).toHaveLength(12);
    expect(acceptance.runs.map((run: { model: string }) => run.model)).toEqual([
      ...Array(6).fill("FormalElection"),
      ...Array(6).fill("MirrorLifecycle"),
    ]);
    expect(acceptance.runs.slice(0, 6).map((run: { kind: string }) => run.kind)).toEqual([
      "warm-up", "measured", "measured", "measured", "measured", "measured",
    ]);
    expect(JSON.parse(readFileSync(join(evidenceRoot, "verification.json"), "utf8")).pass).toBe(true);
  });

  test("records bootstrap and run failures without claiming acceptance", async () => {
    const root = mkdtempSync(join(tmpdir(), "ci-model-check-runner-failure-"));
    roots.push(root);
    const bootstrapRoot = join(root, "bootstrap");
    mkdirSync(bootstrapRoot);
    const bootstrap = await executeCiModelCheckAcceptance(
      { evidenceRoot: bootstrapRoot, runtime: runtime(), models: MODELS },
      {
        bootstrap: async () => ({ ok: false, error: { code: "DOCKER", detail: "daemon unavailable" } }),
        run: successfulPort().run,
      },
    );
    expect(bootstrap.exitCode).toBe(2);
    expect(readFileSync(join(bootstrapRoot, "bootstrap-failure.json"), "utf8")).toContain("DOCKER");

    const runRoot = join(root, "run");
    mkdirSync(runRoot);
    const runFailure = await executeCiModelCheckAcceptance(
      { evidenceRoot: runRoot, runtime: runtime(), models: MODELS },
      successfulPort(2),
    );
    expect(runFailure.exitCode).toBe(2);
    const verification = JSON.parse(readFileSync(join(runRoot, "verification.json"), "utf8"));
    expect(verification.pass).toBe(false);
    expect(verification.model).toBe("FormalElection");
  });
});
