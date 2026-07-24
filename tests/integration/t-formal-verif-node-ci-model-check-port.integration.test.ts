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
} from "../../scripts/formal-verif/node-ci-model-check-port.ts";
import {
  beginModelCheckArtifacts,
  publishModelCheckArtifacts,
} from "../../scripts/formal-verif/run-model-check-artifacts.ts";
import {
  buildEnvReceipt,
  notApplicableInspection,
  passedInspection,
} from "../../scripts/formal-verif/run-model-check-domain.ts";
import { FIXED_DOCKER_IMAGE } from "../../scripts/formal-verif/tlc-spawn-planner.ts";
import { FIXED_TLC_ARTIFACT_DESCRIPTOR } from "../../scripts/formal-verif/tlc-toolchain.ts";

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
    command: (executable, argv, options) => {
      if (executable === process.execPath) {
        const outDir = argv[argv.indexOf("--out") + 1]!;
        const trace = readFileSync(
          join(workspace, ".amadeus-ci-docker-wrapper", "trace-prefix"),
          "utf8",
        ).trim();
        expect(options.env.AMADEUS_REAL_DOCKER).toBeUndefined();
        expect(options.env.AMADEUS_DOCKER_TRACE).toBeUndefined();
        const runId = "00000000-0000-4000-8000-000000000001";
        const dockerArgs = [
          "run", "--rm", "--network=none", "--name", `amadeus-tlc-${runId}`,
          "--mount", `type=bind,src=${workspace},dst=${workspace},readonly`,
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
    mkdirSync(join(evidenceRoot, "runs"));
    const port = new NodeCiModelCheckPort(workspace, dependencies(workspace));
    expect(await port.bootstrap(evidenceRoot)).toEqual({ ok: true, value: undefined });
    const result = await port.run({
      evidenceRoot,
      outDir: join(evidenceRoot, "runs/measured-1"),
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
});
