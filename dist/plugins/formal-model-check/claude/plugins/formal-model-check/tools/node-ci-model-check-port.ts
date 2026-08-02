import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative } from "node:path";
import type { Result } from "./contract.ts";
import type {
  CiAcceptanceFailure,
  CiAcceptancePort,
  CiAcceptanceRunRequest,
} from "./ci-model-check-runner.ts";
import type { CiModelCheckRunEvidence } from "./ci-model-check-domain.ts";
import {
  beginModelCheckArtifacts,
  publishModelCheckArtifacts,
} from "./run-model-check-artifacts.ts";
import {
  buildEnvReceipt,
  notApplicableInspection,
  passedInspection,
} from "./run-model-check-domain.ts";
import {
  configureDockerTraceWrapper,
  installDockerTraceWrapper,
  parseDockerTrace,
} from "./ci-docker-trace.ts";
import { FIXED_DOCKER_IMAGE } from "./tlc-spawn-planner.ts";
import {
  FIXED_JDK_RUN_PROFILE,
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
} from "./tlc-toolchain.ts";

export interface CiCommandOptions {
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
}

export interface CiCommandResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

export interface NodeCiModelCheckDependencies {
  readonly resolveDocker: () => string;
  readonly command: (
    executable: string,
    argv: readonly string[],
    options: CiCommandOptions,
  ) => CiCommandResult;
  readonly download: (url: string, maxBytes: number) => Promise<Uint8Array>;
  readonly digest: (bytes: Uint8Array) => string;
  readonly nowMs: () => number;
  readonly randomUuid: () => string;
}

export const runCiCommand = (
  executable: string,
  argv: readonly string[],
  options: CiCommandOptions,
): CiCommandResult => {
  const result = spawnSync(executable, [...argv], {
    cwd: options.cwd,
    env: { ...options.env },
    encoding: "utf8",
    shell: false,
    timeout: options.timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

export async function downloadCiArtifact(
  url: string,
  maxBytes: number,
  fetcher: (
    input: string,
    init: { readonly redirect: "follow" },
  ) => Promise<Response> = fetch,
): Promise<Uint8Array> {
  const response = await fetcher(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`download returned HTTP ${response.status}`);
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) > maxBytes) {
    throw new Error("download exceeds the fixed byte limit");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) {
    throw new Error("download size is outside the fixed byte limit");
  }
  return bytes;
}

export function resolveDockerExecutable(
  run: typeof spawnSync = spawnSync,
  realpath: (path: string) => string = realpathSync,
): string {
  const resolved = run("/usr/bin/env", ["which", "docker"], {
    encoding: "utf8",
    shell: false,
    timeout: 5_000,
  });
  if (resolved.status !== 0 || resolved.stdout.trim().length === 0) {
    throw new Error("docker executable is unavailable");
  }
  return realpath(resolved.stdout.trim());
}

export function digestCiArtifact(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const DEFAULT_DEPENDENCIES: NodeCiModelCheckDependencies = {
  resolveDocker: resolveDockerExecutable,
  command: runCiCommand,
  download: downloadCiArtifact,
  digest: digestCiArtifact,
  nowMs: performance.now.bind(performance),
  randomUuid: randomUUID,
};

function failure(code: string, detail: string): Result<never, CiAcceptanceFailure> {
  return { ok: false, error: { code, detail } };
}

function baseEnvironment(): Record<string, string> {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    LANG: "en_US.UTF-8",
    LC_ALL: "en_US.UTF-8",
    TZ: "UTC",
    HOME: process.env.HOME ?? "/tmp",
  };
}

export class NodeCiModelCheckPort implements CiAcceptancePort {
  #docker: string | null = null;
  #jarPath: string | null = null;
  readonly #wrapperDirectory: string;

  constructor(
    private readonly workspaceRoot: string,
    private readonly dependencies: NodeCiModelCheckDependencies = DEFAULT_DEPENDENCIES,
  ) {
    this.#wrapperDirectory = join(workspaceRoot, ".amadeus-ci-docker-wrapper");
  }

  async bootstrap(evidenceRoot: string): Promise<Result<void, CiAcceptanceFailure>> {
    try {
      this.#docker = this.dependencies.resolveDocker();
      mkdirSync(join(evidenceRoot, "bootstrap"), { recursive: true, mode: 0o700 });
      installDockerTraceWrapper(this.workspaceRoot);
      configureDockerTraceWrapper(this.workspaceRoot, this.#docker);
      const env = baseEnvironment();
      for (const argv of [["info"], ["pull", FIXED_DOCKER_IMAGE]] as const) {
        const result = this.dependencies.command(this.#docker, argv, {
          cwd: this.workspaceRoot,
          env,
          timeoutMs: argv[0] === "pull" ? 300_000 : 10_000,
        });
        if (result.status !== 0) {
          return failure("DOCKER_BOOTSTRAP", result.stderr || `docker ${argv[0]} failed`);
        }
      }
      const inspected = this.dependencies.command(
        this.#docker,
        ["image", "inspect", "--format", "{{index .RepoDigests 0}}", FIXED_DOCKER_IMAGE],
        { cwd: this.workspaceRoot, env, timeoutMs: 10_000 },
      );
      const expectedDigest = FIXED_DOCKER_IMAGE.slice(FIXED_DOCKER_IMAGE.indexOf("@sha256:"));
      if (inspected.status !== 0 || !inspected.stdout.trim().endsWith(expectedDigest)) {
        return failure("IMAGE_DIGEST", "pulled image does not match the fixed digest");
      }
      const jar = await this.dependencies.download(
        FIXED_TLC_ARTIFACT_DESCRIPTOR.url,
        FIXED_TLC_ARTIFACT_DESCRIPTOR.maxBytes,
      );
      const jarSha256 = this.dependencies.digest(jar);
      if (jarSha256 !== FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256) {
        return failure("JAR_CHECKSUM", "downloaded tla2tools.jar checksum drifted");
      }
      this.#jarPath = join(evidenceRoot, "bootstrap", "tla2tools.jar");
      writeFileSync(this.#jarPath, jar, { mode: 0o400 });
      writeFileSync(
        join(evidenceRoot, "bootstrap", "supply-receipt.json"),
        `${JSON.stringify({
          schema: "amadeus.ci-model-check-supply.v1",
          imageRef: FIXED_DOCKER_IMAGE,
          jar: FIXED_TLC_ARTIFACT_DESCRIPTOR,
        }, null, 2)}\n`,
        { mode: 0o600 },
      );
      return { ok: true, value: undefined };
    } catch (cause) {
      return failure("BOOTSTRAP", String(cause));
    }
  }

  async run(
    request: CiAcceptanceRunRequest,
  ): Promise<Result<CiModelCheckRunEvidence, CiAcceptanceFailure>> {
    const docker = this.#docker;
    if (!docker) return failure("DOCKER_BOOTSTRAP", "Docker was not bootstrapped");
    if (request.model.layer === "verified-source") {
      return this.runVerifiedSource(request, docker);
    }
    const tracePrefix = join(
      request.evidenceRoot,
      `docker-${request.model.name}-${request.kind}-${request.index}`,
    );
    configureDockerTraceWrapper(this.workspaceRoot, docker, tracePrefix);
    const startedAt = this.dependencies.nowMs();
    const result = this.dependencies.command(
      process.execPath,
      [
        "plugins/formal-model-check/tools/run-model-check.ts",
        "--model",
        request.model.modelPath,
        "--cfg",
        request.model.cfgPath,
        "--out",
        request.outDir,
        "--provider",
        "docker",
      ],
      {
        cwd: this.workspaceRoot,
        env: {
          ...baseEnvironment(),
          PATH: `${this.#wrapperDirectory}:${baseEnvironment().PATH}`,
        },
        timeoutMs: 190_000,
      },
    );
    const cliMs = this.dependencies.nowMs() - startedAt;
    const trace = parseDockerTrace(tracePrefix, this.workspaceRoot);
    if (!trace.ok) return trace;
    const containerName = `amadeus-tlc-${trace.value.runId}`;
    const remainingBefore = this.remainingContainers(containerName);
    let forced = false;
    if (remainingBefore > 0) {
      forced = true;
      this.dependencies.command(docker, ["rm", "-f", containerName], {
        cwd: this.workspaceRoot,
        env: baseEnvironment(),
        timeoutMs: 10_000,
      });
    }
    const remainingContainers = this.remainingContainers(containerName);
    if (result.status !== 0 || trace.value.exitCode !== 0) {
      return failure(
        result.status === 1 ? "DETECTED" : "HARNESS_ERROR",
        result.stderr || `run-model-check exited ${result.status}`,
      );
    }
    try {
      const manifest = JSON.parse(readFileSync(join(request.outDir, "manifest.json"), "utf8"));
      if (manifest.runId !== trace.value.runId || manifest.outcome !== "NOT_DETECTED") {
        return failure("MANIFEST", "terminal manifest does not match the Docker run");
      }
      const { extractDiagnosticStatistics } = await import("./run-model-check-diagnostic.ts");
      const statistics = extractDiagnosticStatistics(
        readFileSync(join(request.outDir, "tlc-stdout.bin"), "utf8"),
      );
      return {
        ok: true,
        value: {
          model: request.model.name,
          kind: request.kind,
          index: request.index,
          runId: manifest.runId,
          artifactDirectory: relative(request.evidenceRoot, request.outDir),
          outcome: manifest.outcome,
          exitCode: manifest.exitCode,
          cliMs,
          spawnMs: trace.value.spawnMs,
          docker: {
            imageRef: FIXED_DOCKER_IMAGE,
            argv: trace.value.argv,
            exitCode: trace.value.exitCode,
          },
          cleanup: { containerName, remainingContainers, forced },
          stats: {
            model: request.model.name,
            completionMarker: statistics.completionMarker !== null,
            generatedStates: statistics.generatedStates,
            distinctStates: statistics.distinctStates,
            statesLeftOnQueue: statistics.statesLeftOnQueue,
            searchDepth: statistics.searchDepth,
          },
        },
      };
    } catch {
      return failure("MANIFEST", `terminal manifest is unavailable for ${basename(request.outDir)}`);
    }
  }

  private async runVerifiedSource(
    request: CiAcceptanceRunRequest,
    docker: string,
  ): Promise<Result<CiModelCheckRunEvidence, CiAcceptanceFailure>> {
    const jarPath = this.#jarPath;
    if (!jarPath) return failure("JAR_CHECKSUM", "TLC artifact was not bootstrapped");
    const runId = this.dependencies.randomUuid();
    const artifacts = beginModelCheckArtifacts(request.outDir, runId);
    if (!artifacts.ok) return failure(artifacts.error.code, artifacts.error.detail);
    const scratchRoot = artifacts.value.scratchRoot;
    const statesRoot = join(scratchRoot, "states");
    mkdirSync(statesRoot, { mode: 0o700 });
    const modelRoot = join(this.workspaceRoot, "specs", "tla");
    const containerName = `amadeus-tlc-${runId}`;
    const argv = [
      "run", "--rm", "--network=none", "--name", containerName,
      "--mount", `type=bind,src=${modelRoot},dst=${modelRoot},readonly`,
      "--mount", `type=bind,src=${jarPath},dst=${jarPath},readonly`,
      "--mount", `type=bind,src=${scratchRoot},dst=${scratchRoot}`,
      "--workdir", scratchRoot,
      FIXED_DOCKER_IMAGE,
      "java",
      ...FIXED_JDK_RUN_PROFILE.jvmArgs,
      `-Djava.io.tmpdir=${scratchRoot}`,
      "-cp", jarPath,
      "tlc2.TLC", "-workers", "1", "-tool", "-metadir", statesRoot,
      "-config", join(this.workspaceRoot, request.model.cfgPath),
      join(this.workspaceRoot, request.model.modelPath),
    ] as const;
    const tracePrefix = join(request.evidenceRoot, `docker-${request.model.name}-${request.kind}-${request.index}`);
    configureDockerTraceWrapper(this.workspaceRoot, docker, tracePrefix);
    const startedAt = new Date().toISOString();
    const startedMs = this.dependencies.nowMs();
    const output = this.dependencies.command(join(this.#wrapperDirectory, "docker"), argv, {
      cwd: this.workspaceRoot,
      env: baseEnvironment(),
      timeoutMs: 190_000,
    });
    const cliMs = this.dependencies.nowMs() - startedMs;
    const finishedAt = new Date().toISOString();
    const trace = parseDockerTrace(tracePrefix, this.workspaceRoot);
    if (!trace.ok) {
      rmSync(artifacts.value.temporaryDir, { recursive: true, force: true });
      return trace;
    }
    const remainingBefore = this.remainingContainers(containerName);
    const forced = remainingBefore > 0;
    if (forced) {
      this.dependencies.command(docker, ["rm", "-f", containerName], {
        cwd: this.workspaceRoot,
        env: baseEnvironment(),
        timeoutMs: 10_000,
      });
    }
    const remainingContainers = this.remainingContainers(containerName);
    const { extractDiagnosticStatistics } = await import("./run-model-check-diagnostic.ts");
    const statistics = extractDiagnosticStatistics(output.stdout);
    if (
      output.status !== 0
      || trace.value.exitCode !== 0
      || output.stderr.length > 0
      || statistics.completionMarker === null
      || remainingContainers > 0
    ) {
      rmSync(artifacts.value.temporaryDir, { recursive: true, force: true });
      return failure(
        output.status === 1 ? "DETECTED" : "HARNESS_ERROR",
        output.stderr || `verified-source model check exited ${output.status}`,
      );
    }
    const published = publishModelCheckArtifacts({
      workspace: artifacts.value,
      outcome: { kind: "NOT_DETECTED" },
      exitCode: 0,
      environmentReceipt: buildEnvReceipt(runId, "docker-planner", [
        passedInspection("image-digest", FIXED_DOCKER_IMAGE),
        passedInspection("jar-sha256", FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256),
        passedInspection("network-deny", "--network=none"),
        notApplicableInspection("jdk-snapshot", "Docker image supplies the isolated JDK"),
        notApplicableInspection("sandbox-profile", "Docker isolation replaces sandbox-exec"),
      ]),
      stdout: new TextEncoder().encode(output.stdout),
      stderr: new TextEncoder().encode(output.stderr),
      startedAt,
      finishedAt,
    });
    if (!published.ok) {
      rmSync(artifacts.value.temporaryDir, { recursive: true, force: true });
      return failure(published.error.code, published.error.detail);
    }
    return {
      ok: true,
      value: {
        model: request.model.name,
        kind: request.kind,
        index: request.index,
        runId,
        artifactDirectory: relative(request.evidenceRoot, request.outDir),
        outcome: "NOT_DETECTED",
        exitCode: 0,
        cliMs,
        spawnMs: trace.value.spawnMs,
        docker: {
          imageRef: FIXED_DOCKER_IMAGE,
          argv: trace.value.argv,
          exitCode: trace.value.exitCode,
        },
        cleanup: { containerName, remainingContainers, forced },
        stats: {
          model: request.model.name,
          completionMarker: true,
          generatedStates: statistics.generatedStates,
          distinctStates: statistics.distinctStates,
          statesLeftOnQueue: statistics.statesLeftOnQueue,
          searchDepth: statistics.searchDepth,
        },
      },
    };
  }

  private remainingContainers(containerName: string): number {
    const docker = this.#docker;
    if (!docker) return 1;
    const result = this.dependencies.command(
      docker,
      ["ps", "-a", "--filter", `name=^/${containerName}$`, "--format", "{{.ID}}"],
      { cwd: this.workspaceRoot, env: baseEnvironment(), timeoutMs: 10_000 },
    );
    if (result.status !== 0) return 1;
    return result.stdout.split("\n").filter((line) => line.trim().length > 0).length;
  }
}
