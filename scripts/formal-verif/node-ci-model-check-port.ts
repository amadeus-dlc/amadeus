import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  realpathSync,
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
  configureDockerTraceWrapper,
  installDockerTraceWrapper,
  parseDockerTrace,
} from "./ci-docker-trace.ts";
import { FIXED_DOCKER_IMAGE } from "./tlc-spawn-planner.ts";
import { FIXED_TLC_ARTIFACT_DESCRIPTOR } from "./tlc-toolchain.ts";

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
    const tracePrefix = join(request.evidenceRoot, `docker-${request.kind}-${request.index}`);
    configureDockerTraceWrapper(this.workspaceRoot, docker, tracePrefix);
    const startedAt = this.dependencies.nowMs();
    const result = this.dependencies.command(
      process.execPath,
      [
        "scripts/formal-verif/run-model-check.ts",
        "--model",
        "specs/tla/FormalElection.tla",
        "--cfg",
        "specs/tla/FormalElection.cfg",
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
      return {
        ok: true,
        value: {
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
        },
      };
    } catch {
      return failure("MANIFEST", `terminal manifest is unavailable for ${basename(request.outDir)}`);
    }
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
