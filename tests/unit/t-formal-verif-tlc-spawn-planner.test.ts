import { describe, expect, test } from "bun:test";
import {
  DarwinTlcSpawnPlanner,
  DockerTlcSpawnPlanner,
  FIXED_DOCKER_IMAGE,
  createDockerPlannerConfig,
  createNotRunPlannerReceipt,
  selectTlcSpawnPlanner,
  type PlannerEnvironmentObservation,
  type PlannerEnvironmentPort,
} from "../../scripts/formal-verif/tlc-spawn-planner.ts";
import type { EnvVerifyContext } from "../../scripts/formal-verif/run-model-check-domain.ts";

const SHA = "a".repeat(64);
const OTHER_SHA = "b".repeat(64);
const context: EnvVerifyContext = {
  runId: "00000000-0000-4000-8000-000000000001",
  workspaceRoot: "/workspace with spaces",
  scratchRoot: "/evidence/run.tmp",
  jarPath: "/cache/tla2tools.jar",
  jarSha256: SHA,
  deadlineMs: 120_000,
};

class SequenceEnvironment implements PlannerEnvironmentPort {
  constructor(
    private readonly darwin: PlannerEnvironmentObservation[],
    private readonly docker: PlannerEnvironmentObservation[],
  ) {}

  async inspectDarwin(): Promise<PlannerEnvironmentObservation> {
    return this.darwin.shift()!;
  }

  async inspectDocker(): Promise<PlannerEnvironmentObservation> {
    return this.docker.shift()!;
  }
}

describe("TLC spawn planners", () => {
  test("Darwin emits byte-stable sandbox argv and all five receipt inspections", async () => {
    const observation = { jarSha256: SHA, jdkIdentity: SHA, sandboxIdentity: OTHER_SHA };
    const planner = new DarwinTlcSpawnPlanner(new SequenceEnvironment(
      [observation, observation],
      [],
    ));
    const snapshot = await planner.snapshotEnvironment(context);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;

    const argv = planner.buildArgv(["/jdk/bin/java", "-cp", context.jarPath]);
    expect(argv.slice(0, 3)).toEqual([
      "/usr/bin/sandbox-exec",
      "-p",
      "(version 1)(deny default)(allow process*)(allow file*)(allow system*)(allow mach*)(allow ipc*)(allow sysctl*)(deny network*)(allow network-inbound (local tcp \"localhost:*\"))",
    ]);
    const receipt = await planner.verifyEnvironment(snapshot.value);
    expect(receipt.ok).toBe(true);
    if (!receipt.ok) return;
    expect(receipt.value.inspections.map(({ id, status }) => [id, status])).toEqual([
      ["image-digest", "not-applicable"],
      ["jar-sha256", "passed"],
      ["network-deny", "passed"],
      ["jdk-snapshot", "passed"],
      ["sandbox-profile", "passed"],
    ]);
  });

  test("Docker pins image/network/mounts and declares host checks not applicable", async () => {
    const observation = {
      jarSha256: SHA,
      imageRef: FIXED_DOCKER_IMAGE,
      dockerExecutable: "/usr/bin/docker",
    };
    const config = { imageRef: FIXED_DOCKER_IMAGE, jarPath: context.jarPath, jarSha256: SHA };
    const planner = new DockerTlcSpawnPlanner(
      config,
      new SequenceEnvironment([], [observation, observation]),
    );
    const snapshot = await planner.snapshotEnvironment(context);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;

    const argv = planner.buildArgv([
      "/host/jdk/bin/java",
      `-Djava.io.tmpdir=${context.workspaceRoot}/.tlc-stdlib`,
      "-cp",
      context.jarPath,
      "tlc2.TLC",
    ]);
    expect(argv).toContain("--network=none");
    expect(argv).toContain(FIXED_DOCKER_IMAGE);
    expect(argv).toContain(`type=bind,src=${context.jarPath},dst=${context.jarPath},readonly`);
    expect(argv).toContain(`-Djava.io.tmpdir=${context.scratchRoot}`);
    const receipt = await planner.verifyEnvironment(snapshot.value);
    expect(receipt.ok).toBe(true);
    if (!receipt.ok) return;
    expect(receipt.value.inspections.slice(3).map(({ status }) => status)).toEqual([
      "not-applicable",
      "not-applicable",
    ]);
  });

  test("both planners fall closed when the environment drifts before spawn", async () => {
    const darwin = new DarwinTlcSpawnPlanner(new SequenceEnvironment([
      { jarSha256: SHA, jdkIdentity: SHA, sandboxIdentity: SHA },
      { jarSha256: SHA, jdkIdentity: OTHER_SHA, sandboxIdentity: SHA },
    ], []));
    const docker = new DockerTlcSpawnPlanner(
      { imageRef: FIXED_DOCKER_IMAGE, jarPath: context.jarPath, jarSha256: SHA },
      new SequenceEnvironment([], [
        { jarSha256: SHA, imageRef: FIXED_DOCKER_IMAGE, dockerExecutable: "/usr/bin/docker" },
        { jarSha256: OTHER_SHA, imageRef: FIXED_DOCKER_IMAGE, dockerExecutable: "/usr/bin/docker" },
      ]),
    );
    const darwinSnapshot = await darwin.snapshotEnvironment(context);
    const dockerSnapshot = await docker.snapshotEnvironment(context);
    if (!darwinSnapshot.ok || !dockerSnapshot.ok) throw new Error("snapshot fixture failed");
    const darwinDrift = await darwin.verifyEnvironment(darwinSnapshot.value);
    const dockerDrift = await docker.verifyEnvironment(dockerSnapshot.value);
    expect(darwinDrift).toMatchObject({
      ok: false,
      error: {
        code: "ENVIRONMENT_DRIFT",
        environmentReceipt: {
          inspections: [
            { status: "not-applicable" },
            { status: "passed" },
            { status: "passed" },
            { status: "failed" },
            { status: "passed" },
          ],
        },
      },
    });
    expect(dockerDrift).toMatchObject({
      ok: false,
      error: {
        code: "ENVIRONMENT_DRIFT",
        environmentReceipt: {
          inspections: [
            { status: "passed" },
            { status: "failed" },
            { status: "passed" },
            { status: "not-applicable" },
            { status: "not-applicable" },
          ],
        },
      },
    });
  });

  test("marks pre-verification checks not-run without misusing failed or not-applicable", () => {
    const docker = createNotRunPlannerReceipt("docker", "linux", context.runId, "NETWORK");
    const darwin = createNotRunPlannerReceipt("sandbox-exec", "darwin", context.runId, "NETWORK");
    expect(docker.inspections.map(({ status }) => status)).toEqual([
      "not-run",
      "not-run",
      "not-run",
      "not-applicable",
      "not-applicable",
    ]);
    expect(darwin.inspections.map(({ status }) => status)).toEqual([
      "not-applicable",
      "not-run",
      "not-run",
      "not-run",
      "not-run",
    ]);
    for (const inspection of [...docker.inspections, ...darwin.inspections]) {
      if (inspection.status === "not-run") {
        expect(inspection.observed).toBeNull();
        expect(inspection.reason).toBe("not run because NETWORK occurred before environment verification");
      }
    }
  });

  test("rejects Docker tags and selects auto provider by platform", () => {
    expect(createDockerPlannerConfig({
      imageRef: "eclipse-temurin:26-jdk",
      jarPath: context.jarPath,
      jarSha256: SHA,
    })).toMatchObject({ ok: false, error: { code: "DOCKER_CONFIG" } });
    const environment = new SequenceEnvironment([], []);
    const config = { imageRef: FIXED_DOCKER_IMAGE, jarPath: context.jarPath, jarSha256: SHA };
    expect(selectTlcSpawnPlanner("auto", config, environment, "darwin").ok).toBe(true);
    expect(selectTlcSpawnPlanner("auto", config, environment, "linux").ok).toBe(true);
    expect(selectTlcSpawnPlanner("sandbox-exec", config, environment, "linux")).toMatchObject({
      ok: false,
      error: { code: "PROVIDER_PLATFORM" },
    });
  });
});
