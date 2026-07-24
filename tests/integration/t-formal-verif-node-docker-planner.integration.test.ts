import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FIXED_DOCKER_IMAGE,
  NodeDockerCommandPort,
  NodePlannerEnvironmentPort,
  type DockerCommandPort,
} from "../../scripts/formal-verif/tlc-spawn-planner.ts";
import type { EnvVerifyContext } from "../../scripts/formal-verif/run-model-check-domain.ts";
import { FIXED_TLC_ARTIFACT_DESCRIPTOR } from "../../scripts/formal-verif/tlc-toolchain.ts";

describe("Node Docker planner adapter", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  function context(): EnvVerifyContext {
    const root = mkdtempSync(join(tmpdir(), "node-docker-planner-"));
    roots.push(root);
    const jarPath = join(root, "tla2tools.jar");
    writeFileSync(jarPath, "jar");
    return {
      runId: "00000000-0000-4000-8000-000000000001",
      workspaceRoot: root,
      scratchRoot: root,
      jarPath,
      jarSha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
      deadlineMs: 120_000,
    };
  }

  test("maps a digest-pinned Docker inspection into a planner observation", async () => {
    const commands: DockerCommandPort = {
      inspectImage: () => ({
        executable: "/usr/bin/docker",
        observedReference: `repository${FIXED_DOCKER_IMAGE.slice(FIXED_DOCKER_IMAGE.indexOf("@sha256:"))}`,
      }),
    };
    const observation = await new NodePlannerEnvironmentPort(commands).inspectDocker({
      imageRef: FIXED_DOCKER_IMAGE,
      jarPath: "/cache/tla2tools.jar",
      jarSha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
    }, context());
    expect(observation).toMatchObject({
      imageRef: FIXED_DOCKER_IMAGE,
      dockerExecutable: "/usr/bin/docker",
    });
  });

  test("rejects an observed image with a different digest", async () => {
    const commands: DockerCommandPort = {
      inspectImage: () => ({
        executable: "/usr/bin/docker",
        observedReference: `repository@sha256:${"0".repeat(64)}`,
      }),
    };
    await expect(new NodePlannerEnvironmentPort(commands).inspectDocker({
      imageRef: FIXED_DOCKER_IMAGE,
      jarPath: "/cache/tla2tools.jar",
      jarSha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
    }, context())).rejects.toThrow("Docker image digest differs");
  });

  test("fails loudly when Docker image inspection fails", () => {
    const port = new NodeDockerCommandPort(
      () => ({ status: 1, stdout: "", stderr: "daemon unavailable" }),
      () => "/usr/bin/docker",
    );
    expect(() => port.inspectImage(FIXED_DOCKER_IMAGE, 10_000)).toThrow(
      "pinned Docker image is unavailable",
    );
  });

  const dockerAvailable = spawnSync("/usr/bin/env", ["which", "docker"], {
    encoding: "utf8",
  }).status === 0;
  test.skipIf(!dockerAvailable)("resolves the real Docker executable without invoking the daemon", () => {
    const port = new NodeDockerCommandPort(
      (_command, _args, options) => {
        expect(options.shell).toBe(false);
        return { status: 0, stdout: FIXED_DOCKER_IMAGE, stderr: "" };
      },
    );
    expect(port.inspectImage(FIXED_DOCKER_IMAGE, 10_000).executable).toContain("docker");
  });

  test.skipIf(!dockerAvailable)("invokes Docker through the shell-free default command runner", () => {
    expect(() => new NodeDockerCommandPort().inspectImage(
      "missing.invalid/amadeus/tlc@sha256:3f2d8f89e7e5b2e950a71a37d7ff746e4db545f9e6cf06358457ca3b4d4c4e63",
      1_000,
    )).toThrow("pinned Docker image is unavailable");
  });
});
