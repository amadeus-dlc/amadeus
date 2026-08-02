import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  NodeCiModelCheckPort,
  type NodeCiModelCheckDependencies,
} from "../../plugins/formal-model-check/tools/node-ci-model-check-port.ts";
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

const FORMAL_ELECTION = {
  name: "FormalElection",
  modelPath: "specs/tla/FormalElection.tla",
  cfgPath: "specs/tla/FormalElection.cfg",
  layer: "frozen" as const,
};

const roots: string[] = [];

afterEach(() => {
  roots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

function dependencies(
  workspace: string,
  digest: string = FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
): NodeCiModelCheckDependencies {
  const times = [0, 100_000];
  return {
    resolveDocker: () => "/usr/bin/docker",
    download: async () => new Uint8Array([1, 2, 3]),
    digest: () => digest,
    nowMs: () => times.shift() ?? 100_000,
    randomUuid: () => "00000000-0000-4000-8000-000000000002",
    command: (executable, argv, options) => {
      if (executable === process.execPath) {
        const outDir = argv[argv.indexOf("--out") + 1]!;
        const trace = readFileSync(
          join(workspace, ".amadeus-ci-docker-wrapper", "trace-prefix"),
          "utf8",
        ).trim();
        expect(trace.endsWith("docker-FormalElection-measured-1")).toBe(true);
        expect(options.env.AMADEUS_REAL_DOCKER).toBeUndefined();
        expect(options.env.AMADEUS_DOCKER_TRACE).toBeUndefined();
        const runId = "00000000-0000-4000-8000-000000000001";
        const dockerArgs = [
          "run", "--rm", "--network=none", "--name", `amadeus-tlc-${runId}`,
          "--mount", `type=bind,src=${join(workspace, "specs/tla")},dst=${join(workspace, "specs/tla")},readonly`,
          "--mount", "type=bind,src=/cache/tla2tools.jar,dst=/cache/tla2tools.jar,readonly",
          "--mount", "type=bind,src=/scratch/.scratch,dst=/scratch/.scratch",
          FIXED_DOCKER_IMAGE,
        ];
        writeFileSync(`${trace}.argv`, `${dockerArgs.join("\0")}\0`);
        writeFileSync(`${trace}.timing`, "1000000000\n100000000000\n0\n");
        const reserved = beginModelCheckArtifacts(outDir, runId);
        if (!reserved.ok) throw new Error(reserved.error.detail);
        const published = publishModelCheckArtifacts({
          workspace: reserved.value,
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
        return { status: 0, stdout: "", stderr: "" };
      }
      if (argv[0] === "image") {
        return { status: 0, stdout: `eclipse-temurin${FIXED_DOCKER_IMAGE.slice(FIXED_DOCKER_IMAGE.indexOf("@sha256:"))}\n`, stderr: "" };
      }
      if (argv[0] === "ps") return { status: 0, stdout: "", stderr: "" };
      return { status: 0, stdout: "", stderr: "" };
    },
  };
}

describe("Node CI model-check port", () => {
  test("bootstraps pinned supply and records the real Docker run boundary", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "node-ci-port-workspace-"));
    const evidenceRoot = mkdtempSync(join(tmpdir(), "node-ci-port-evidence-"));
    roots.push(workspace, evidenceRoot);
    mkdirSync(join(evidenceRoot, "FormalElection/runs"), { recursive: true });
    const port = new NodeCiModelCheckPort(workspace, dependencies(workspace));
    expect(await port.bootstrap(evidenceRoot)).toEqual({ ok: true, value: undefined });
    const result = await port.run({
      evidenceRoot,
      outDir: join(evidenceRoot, "FormalElection/runs/measured-1"),
      model: FORMAL_ELECTION,
      kind: "measured",
      index: 1,
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.spawnMs).toBe(99_000);
    expect(result.ok && result.value.cliMs).toBe(100_000);
    expect(result.ok && result.value.docker.argv).toContain("--network=none");
    expect(result.ok && result.value.cleanup).toEqual({
      containerName: "amadeus-tlc-00000000-0000-4000-8000-000000000001",
      remainingContainers: 0,
      forced: false,
    });
  });

  test("fails bootstrap on jar checksum drift", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "node-ci-port-checksum-"));
    const evidenceRoot = mkdtempSync(join(tmpdir(), "node-ci-port-checksum-evidence-"));
    roots.push(workspace, evidenceRoot);
    const port = new NodeCiModelCheckPort(workspace, dependencies(workspace, "b".repeat(64)));
    const result = await port.bootstrap(evidenceRoot);
    expect(result).toEqual({
      ok: false,
      error: { code: "JAR_CHECKSUM", detail: "downloaded tla2tools.jar checksum drifted" },
    });
  });

  test("runs a verified-source model directly and records exact TLC statistics", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "node-ci-port-verified-workspace-"));
    const evidenceRoot = mkdtempSync(join(tmpdir(), "node-ci-port-verified-evidence-"));
    roots.push(workspace, evidenceRoot);
    mkdirSync(join(evidenceRoot, "MirrorLifecycle/runs"), { recursive: true });
    const deps = dependencies(workspace);
    const port = new NodeCiModelCheckPort(workspace, {
      ...deps,
      command: (executable, argv, options) => {
        if (argv[0] === "run" && executable.endsWith("/docker")) {
          expect(options.env.AMADEUS_REAL_DOCKER).toBeUndefined();
          expect(options.env.AMADEUS_DOCKER_TRACE).toBeUndefined();
          const trace = readFileSync(
            join(workspace, ".amadeus-ci-docker-wrapper", "trace-prefix"),
            "utf8",
          ).trim();
          writeFileSync(`${trace}.argv`, `${argv.join("\0")}\0`);
          writeFileSync(`${trace}.timing`, "1000000000\n100000000000\n0\n");
          return {
            status: 0,
            stdout: [
              "208,628 states generated, 89,099 distinct states found, 0 states left on queue.",
              "The depth of the complete state graph search is 18.",
              "Model checking completed. No error has been found.",
            ].join("\n"),
            stderr: "",
          };
        }
        return deps.command(executable, argv, options);
      },
    });
    expect(await port.bootstrap(evidenceRoot)).toEqual({ ok: true, value: undefined });
    const result = await port.run({
      evidenceRoot,
      outDir: join(evidenceRoot, "MirrorLifecycle/runs/measured-1"),
      model: {
        name: "MirrorLifecycle",
        modelPath: "specs/tla/MirrorLifecycle.tla",
        cfgPath: "specs/tla/MirrorLifecycle.cfg",
        layer: "verified-source",
      },
      kind: "measured",
      index: 1,
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.value.stats).toEqual({
      model: "MirrorLifecycle",
      completionMarker: true,
      generatedStates: 208_628,
      distinctStates: 89_099,
      statesLeftOnQueue: 0,
      searchDepth: 18,
    });
  });
});
