import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { canonicalIdentity } from "./canonical.ts";
import type { Result } from "./contract.ts";
import {
  DarwinSandboxExecProvider,
  NodeTlcProcessPort,
} from "./fs-tlc-toolchain.ts";
import {
  buildEnvReceipt,
  buildNotRunEnvReceipt,
  failedInspection,
  notApplicableInspection,
  passedInspection,
  type EnvInspectionPlan,
  type DockerPlannerConfig,
  type EnvReceipt,
  type EnvSnapshot,
  type EnvVerifyContext,
  type ModelCheckProvider,
  type TlcSpawnPlanner,
} from "./run-model-check-domain.ts";
import {
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  type TlcToolchainError,
} from "./tlc-toolchain.ts";

export const FIXED_DOCKER_IMAGE =
  "eclipse-temurin:26-jdk@sha256:939e35776c4582f5454276c42a9ca3825df1b4a983ed2edd4cd9b4e130bb0eeb";
export const DARWIN_TLC_PLANNER_IDENTITY = canonicalIdentity(
  { provider: "sandbox-exec", profile: "network-deny", version: 1 },
  "amadeus.formal-verif.tlc-spawn-planner.v1",
).sha256;
export const DOCKER_TLC_PLANNER_IDENTITY = canonicalIdentity(
  { provider: "docker", image: FIXED_DOCKER_IMAGE, network: "none", version: 1 },
  "amadeus.formal-verif.tlc-spawn-planner.v1",
).sha256;

const DARWIN_NETWORK_DENY_PROFILE =
  "(version 1)(deny default)(allow process*)(allow file*)(allow system*)(allow mach*)(allow ipc*)(allow sysctl*)(deny network*)(allow network-inbound (local tcp \"localhost:*\"))";
const SHA256 = /^[0-9a-f]{64}$/;
const DIGEST_IMAGE = /^[a-z0-9./_-]+(?::[a-z0-9._-]+)?@sha256:[0-9a-f]{64}$/;

export const DARWIN_INSPECTION_PLAN: readonly EnvInspectionPlan[] = Object.freeze([
  { id: "image-digest", expected: null, notApplicableReason: "Darwin sandbox-exec does not use a container image" },
  { id: "jar-sha256", expected: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256, notApplicableReason: null },
  { id: "network-deny", expected: "sandbox network-deny", notApplicableReason: null },
  { id: "jdk-snapshot", expected: "OpenJDK 26.0.1", notApplicableReason: null },
  { id: "sandbox-profile", expected: "network-deny", notApplicableReason: null },
]);

export const DOCKER_INSPECTION_PLAN: readonly EnvInspectionPlan[] = Object.freeze([
  { id: "image-digest", expected: FIXED_DOCKER_IMAGE, notApplicableReason: null },
  { id: "jar-sha256", expected: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256, notApplicableReason: null },
  { id: "network-deny", expected: "--network=none", notApplicableReason: null },
  { id: "jdk-snapshot", expected: null, notApplicableReason: "Docker image supplies the isolated JDK" },
  { id: "sandbox-profile", expected: null, notApplicableReason: "Docker isolation replaces sandbox-exec" },
]);

export function createNotRunPlannerReceipt(
  provider: ModelCheckProvider,
  platform: NodeJS.Platform,
  runId: string,
  priorFailureCode: string,
): EnvReceipt {
  const docker = provider === "docker" || (provider === "auto" && platform !== "darwin");
  return buildNotRunEnvReceipt(
    runId,
    docker ? "docker-unavailable" : "sandbox-exec-unavailable",
    docker ? DOCKER_INSPECTION_PLAN : DARWIN_INSPECTION_PLAN,
    `not run because ${priorFailureCode} occurred before environment verification`,
  );
}

function invocationError(code: string, message: string, cause?: unknown): TlcToolchainError {
  return {
    kind: "InvocationError",
    code,
    message,
    ...(cause === undefined ? {} : { cause: String(cause) }),
  };
}

export interface PlannerEnvironmentObservation {
  readonly jarSha256: string;
  readonly jdkIdentity?: string;
  readonly sandboxIdentity?: string;
  readonly imageRef?: string;
  readonly dockerExecutable?: string;
}

export interface PlannerEnvironmentPort {
  inspectDarwin(context: EnvVerifyContext): Promise<PlannerEnvironmentObservation>;
  inspectDocker(
    config: DockerPlannerConfig,
    context: EnvVerifyContext,
  ): Promise<PlannerEnvironmentObservation>;
}

export interface DockerCommandPort {
  inspectImage(
    imageRef: string,
    deadlineMs: number,
  ): { readonly executable: string; readonly observedReference: string };
}

function digestFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function absoluteCommand(name: string): string {
  const result = spawnSync("/usr/bin/env", ["which", name], {
    shell: false,
    encoding: "utf8",
    timeout: 5_000,
  });
  const executable = result.status === 0 ? result.stdout.trim() : "";
  if (executable.length === 0 || !existsSync(executable)) {
    throw new Error(`${name} executable is unavailable`);
  }
  return realpathSync(executable);
}

export class NodePlannerEnvironmentPort implements PlannerEnvironmentPort {
  constructor(
    private readonly dockerCommands: DockerCommandPort = new NodeDockerCommandPort(),
  ) {}

  async inspectDarwin(context: EnvVerifyContext): Promise<PlannerEnvironmentObservation> {
    if (process.platform !== "darwin") throw new Error("sandbox-exec requires Darwin");
    const javaHome = process.env.JAVA_HOME;
    if (!javaHome) throw new Error("JAVA_HOME is required");
    const canonicalJavaHome = realpathSync(javaHome);
    const javaExecutable = realpathSync(join(canonicalJavaHome, "bin", "java"));
    const version = spawnSync(javaExecutable, ["-version"], {
      cwd: canonicalJavaHome,
      env: {
        JAVA_HOME: canonicalJavaHome,
        LANG: "en_US.UTF-8",
        LC_ALL: "en_US.UTF-8",
        TZ: "UTC",
      },
      shell: false,
      encoding: "utf8",
      timeout: Math.min(context.deadlineMs, 5_000),
    });
    const versionOutput = `${version.stdout}${version.stderr}`;
    if (
      version.status !== 0
      || !/^openjdk version "26\.0\.1(?:"|\+)/m.test(versionOutput)
      || !versionOutput.includes("OpenJDK")
    ) {
      throw new Error("OpenJDK 26.0.1 verification failed");
    }
    const probe = new DarwinSandboxExecProvider(new NodeTlcProcessPort(), process.execPath);
    if (!probe.available()) throw new Error("sandbox-exec provider is unavailable");
    const observations = [];
    for (const kind of ["TCP_LOOPBACK", "UDP_LOOPBACK", "DNS"] as const) {
      observations.push(await probe.probe(kind, {
        executable: "/usr/bin/sandbox-exec",
        profile: DARWIN_NETWORK_DENY_PROFILE,
        deadlineMs: Math.min(context.deadlineMs, 5_000),
      }));
    }
    if (observations.some(({ denied }) => !denied)) {
      throw new Error("sandbox network-deny probe was not denied");
    }
    return {
      jarSha256: digestFile(context.jarPath),
      jdkIdentity: canonicalIdentity(
        { javaHome: canonicalJavaHome, javaExecutable, versionOutput },
        "amadeus.formal-verif.run-model-check.jdk.v1",
      ).sha256,
      sandboxIdentity: canonicalIdentity(
        { profile: DARWIN_NETWORK_DENY_PROFILE, observations },
        "amadeus.formal-verif.run-model-check.sandbox.v1",
      ).sha256,
    };
  }

  async inspectDocker(
    config: DockerPlannerConfig,
    context: EnvVerifyContext,
  ): Promise<PlannerEnvironmentObservation> {
    const inspected = this.dockerCommands.inspectImage(
      config.imageRef,
      Math.min(context.deadlineMs, 10_000),
    );
    const observed = inspected.observedReference;
    const expectedDigest = config.imageRef.slice(config.imageRef.indexOf("@sha256:"));
    if (!observed.endsWith(expectedDigest)) {
      throw new Error("Docker image digest differs from the pinned reference");
    }
    return {
      jarSha256: digestFile(context.jarPath),
      imageRef: config.imageRef,
      dockerExecutable: inspected.executable,
    };
  }
}

interface CommandResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

type CommandRunner = (
  command: string,
  args: readonly string[],
  options: {
    readonly shell: false;
    readonly encoding: "utf8";
    readonly timeout: number;
    readonly env: Readonly<Record<string, string>>;
  },
) => CommandResult;

const NODE_COMMAND_RUNNER: CommandRunner = (command, args, options) => {
  const result = spawnSync(command, [...args], options);
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

export class NodeDockerCommandPort implements DockerCommandPort {
  constructor(
    private readonly run: CommandRunner = NODE_COMMAND_RUNNER,
    private readonly resolveCommand: (name: string) => string = absoluteCommand,
  ) {}

  inspectImage(
    imageRef: string,
    deadlineMs: number,
  ): { executable: string; observedReference: string } {
    const executable = this.resolveCommand("docker");
    const inspected = this.run(
      executable,
      ["image", "inspect", "--format", "{{index .RepoDigests 0}}", imageRef],
      {
        shell: false,
        encoding: "utf8",
        timeout: deadlineMs,
        env: { PATH: process.env.PATH ?? "/usr/bin:/bin" },
      },
    );
    if (inspected.status !== 0) {
      throw new Error(`pinned Docker image is unavailable: ${inspected.stderr.trim()}`);
    }
    return { executable, observedReference: inspected.stdout.trim() };
  }
}

function observedInspection(
  id: EnvInspectionPlan["id"],
  expected: string,
  observed: string | undefined,
  reason: string,
  matches: boolean = observed === expected,
) {
  const actual = observed ?? "missing";
  return matches
    ? passedInspection(id, expected)
    : failedInspection(id, expected, actual, reason);
}

export class DarwinTlcSpawnPlanner implements TlcSpawnPlanner {
  readonly identity = DARWIN_TLC_PLANNER_IDENTITY;
  readonly #snapshots = new WeakMap<EnvSnapshot, EnvVerifyContext>();

  constructor(private readonly environment: PlannerEnvironmentPort) {}

  buildArgv(manifestArgv: readonly string[]): readonly string[] {
    if (manifestArgv.length === 0) throw new TypeError("manifest argv must not be empty");
    return ["/usr/bin/sandbox-exec", "-p", DARWIN_NETWORK_DENY_PROFILE, ...manifestArgv];
  }

  async snapshotEnvironment(
    context: EnvVerifyContext,
  ): Promise<Result<EnvSnapshot, TlcToolchainError>> {
    try {
      const observation = await this.environment.inspectDarwin(context);
      if (
        observation.jarSha256 !== context.jarSha256
        || !SHA256.test(observation.jdkIdentity ?? "")
        || !SHA256.test(observation.sandboxIdentity ?? "")
      ) {
        return {
          ok: false,
          error: invocationError("ENVIRONMENT_DRIFT", "Darwin environment snapshot differs from the fixed profile"),
        };
      }
      const snapshot: EnvSnapshot = Object.freeze({
        kind: "DARWIN",
        plannerIdentity: this.identity,
        jarSha256: observation.jarSha256,
        jdkIdentity: observation.jdkIdentity!,
        sandboxIdentity: observation.sandboxIdentity!,
      });
      this.#snapshots.set(snapshot, context);
      return { ok: true, value: snapshot };
    } catch (cause) {
      return {
        ok: false,
        error: invocationError("ENVIRONMENT_UNAVAILABLE", "Darwin environment inspection failed", cause),
      };
    }
  }

  async verifyEnvironment(snapshot: EnvSnapshot): Promise<Result<EnvReceipt, TlcToolchainError>> {
    if (snapshot.kind !== "DARWIN" || snapshot.plannerIdentity !== this.identity) {
      return { ok: false, error: invocationError("ENVIRONMENT_CAPABILITY", "foreign Darwin environment snapshot") };
    }
    const context = this.#snapshots.get(snapshot);
    if (!context) {
      return { ok: false, error: invocationError("ENVIRONMENT_CAPABILITY", "unissued Darwin environment snapshot") };
    }
    try {
      const observed = await this.environment.inspectDarwin(context);
      if (
        observed.jarSha256 !== snapshot.jarSha256
        || observed.jdkIdentity !== snapshot.jdkIdentity
        || observed.sandboxIdentity !== snapshot.sandboxIdentity
      ) {
        return {
          ok: false,
          error: Object.assign(
            invocationError("ENVIRONMENT_DRIFT", "Darwin environment changed before spawn"),
            {
              environmentReceipt: buildEnvReceipt(context.runId, this.identity, [
                notApplicableInspection("image-digest", DARWIN_INSPECTION_PLAN[0]!.notApplicableReason!),
                observedInspection("jar-sha256", snapshot.jarSha256, observed.jarSha256, "value changed before spawn"),
                observedInspection("network-deny", snapshot.sandboxIdentity, observed.sandboxIdentity, "value changed before spawn"),
                observedInspection("jdk-snapshot", snapshot.jdkIdentity, observed.jdkIdentity, "value changed before spawn"),
                observedInspection("sandbox-profile", snapshot.sandboxIdentity, observed.sandboxIdentity, "value changed before spawn"),
              ]),
            },
          ),
        };
      }
      return {
        ok: true,
        value: buildEnvReceipt(context.runId, this.identity, [
          notApplicableInspection("image-digest", DARWIN_INSPECTION_PLAN[0]!.notApplicableReason!),
          passedInspection("jar-sha256", snapshot.jarSha256),
          passedInspection("network-deny", snapshot.sandboxIdentity),
          passedInspection("jdk-snapshot", snapshot.jdkIdentity),
          passedInspection("sandbox-profile", snapshot.sandboxIdentity),
        ]),
      };
    } catch (cause) {
      return {
        ok: false,
        error: invocationError("ENVIRONMENT_UNAVAILABLE", "Darwin environment reinspection failed", cause),
      };
    }
  }
}

export class DockerTlcSpawnPlanner implements TlcSpawnPlanner {
  readonly identity = DOCKER_TLC_PLANNER_IDENTITY;
  readonly #snapshots = new WeakMap<EnvSnapshot, EnvVerifyContext>();
  #dockerExecutable: string | undefined;
  #context: EnvVerifyContext | undefined;

  constructor(
    readonly config: DockerPlannerConfig,
    private readonly environment: PlannerEnvironmentPort,
  ) {}

  buildArgv(manifestArgv: readonly string[]): readonly string[] {
    const context = this.#context;
    const dockerExecutable = this.#dockerExecutable;
    if (!context || !dockerExecutable || manifestArgv.length === 0) {
      throw new TypeError("Docker environment must be snapshotted before argv construction");
    }
    const javaArgs = manifestArgv.slice(1).map((argument) => argument.startsWith("-Djava.io.tmpdir=")
      ? `-Djava.io.tmpdir=${context.scratchRoot}`
      : argument);
    return [
      dockerExecutable,
      "run",
      "--rm",
      "--network=none",
      "--name",
      `amadeus-tlc-${context.runId}`,
      "--mount",
      `type=bind,src=${context.workspaceRoot},dst=${context.workspaceRoot},readonly`,
      "--mount",
      `type=bind,src=${context.jarPath},dst=${context.jarPath},readonly`,
      "--mount",
      `type=bind,src=${context.scratchRoot},dst=${context.scratchRoot}`,
      "--workdir",
      context.scratchRoot,
      this.config.imageRef,
      "java",
      ...javaArgs,
    ];
  }

  async snapshotEnvironment(
    context: EnvVerifyContext,
  ): Promise<Result<EnvSnapshot, TlcToolchainError>> {
    try {
      const observed = await this.environment.inspectDocker(this.config, context);
      if (
        observed.jarSha256 !== context.jarSha256
        || observed.imageRef !== this.config.imageRef
        || !observed.dockerExecutable
      ) {
        return {
          ok: false,
          error: invocationError("ENVIRONMENT_DRIFT", "Docker environment snapshot differs from the fixed profile"),
        };
      }
      const snapshot: EnvSnapshot = Object.freeze({
        kind: "DOCKER",
        plannerIdentity: this.identity,
        imageRef: observed.imageRef,
        jarSha256: observed.jarSha256,
      });
      this.#dockerExecutable = observed.dockerExecutable;
      this.#context = context;
      this.#snapshots.set(snapshot, context);
      return { ok: true, value: snapshot };
    } catch (cause) {
      return {
        ok: false,
        error: invocationError("ENVIRONMENT_UNAVAILABLE", "Docker environment inspection failed", cause),
      };
    }
  }

  async verifyEnvironment(snapshot: EnvSnapshot): Promise<Result<EnvReceipt, TlcToolchainError>> {
    if (snapshot.kind !== "DOCKER" || snapshot.plannerIdentity !== this.identity) {
      return { ok: false, error: invocationError("ENVIRONMENT_CAPABILITY", "foreign Docker environment snapshot") };
    }
    const context = this.#snapshots.get(snapshot);
    if (!context) {
      return { ok: false, error: invocationError("ENVIRONMENT_CAPABILITY", "unissued Docker environment snapshot") };
    }
    try {
      const observed = await this.environment.inspectDocker(this.config, context);
      if (
        observed.jarSha256 !== snapshot.jarSha256
        || observed.imageRef !== snapshot.imageRef
        || observed.dockerExecutable !== this.#dockerExecutable
      ) {
        return {
          ok: false,
          error: Object.assign(
            invocationError("ENVIRONMENT_DRIFT", "Docker environment changed before spawn"),
            {
              environmentReceipt: buildEnvReceipt(context.runId, this.identity, [
                observedInspection("image-digest", snapshot.imageRef, observed.imageRef, "value changed before spawn"),
                observedInspection("jar-sha256", snapshot.jarSha256, observed.jarSha256, "value changed before spawn"),
                observedInspection(
                  "network-deny",
                  "--network=none",
                  observed.dockerExecutable,
                  "Docker executable changed before spawn",
                  observed.dockerExecutable === this.#dockerExecutable,
                ),
                notApplicableInspection("jdk-snapshot", DOCKER_INSPECTION_PLAN[3]!.notApplicableReason!),
                notApplicableInspection("sandbox-profile", DOCKER_INSPECTION_PLAN[4]!.notApplicableReason!),
              ]),
            },
          ),
        };
      }
      return {
        ok: true,
        value: buildEnvReceipt(context.runId, this.identity, [
          passedInspection("image-digest", snapshot.imageRef),
          passedInspection("jar-sha256", snapshot.jarSha256),
          passedInspection("network-deny", "--network=none"),
          notApplicableInspection("jdk-snapshot", DOCKER_INSPECTION_PLAN[3]!.notApplicableReason!),
          notApplicableInspection("sandbox-profile", DOCKER_INSPECTION_PLAN[4]!.notApplicableReason!),
        ]),
      };
    } catch (cause) {
      return {
        ok: false,
        error: invocationError("ENVIRONMENT_UNAVAILABLE", "Docker environment reinspection failed", cause),
      };
    }
  }
}

export function createDockerPlannerConfig(
  input: DockerPlannerConfig,
): Result<DockerPlannerConfig, TlcToolchainError> {
  if (
    !DIGEST_IMAGE.test(input.imageRef)
    || !SHA256.test(input.jarSha256)
    || input.jarPath.length === 0
  ) {
    return {
      ok: false,
      error: invocationError("DOCKER_CONFIG", "Docker image must be digest-pinned and jar checksum must be SHA-256"),
    };
  }
  return { ok: true, value: Object.freeze({ ...input }) };
}

export function selectTlcSpawnPlanner(
  provider: ModelCheckProvider,
  config: DockerPlannerConfig,
  environment: PlannerEnvironmentPort,
  platform: NodeJS.Platform = process.platform,
): Result<TlcSpawnPlanner, TlcToolchainError> {
  const selected = provider === "auto"
    ? (platform === "darwin" ? "sandbox-exec" : "docker")
    : provider;
  if (selected === "sandbox-exec") {
    if (platform !== "darwin") {
      return { ok: false, error: invocationError("PROVIDER_PLATFORM", "sandbox-exec is available only on Darwin") };
    }
    return { ok: true, value: new DarwinTlcSpawnPlanner(environment) };
  }
  const parsed = createDockerPlannerConfig(config);
  return parsed.ok
    ? { ok: true, value: new DockerTlcSpawnPlanner(parsed.value, environment) }
    : parsed;
}
