import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join } from "node:path";
import {
  ciModelTargetFor,
  type CiModelTarget,
} from "./ci-model-check-domain.ts";
import {
  digestCiArtifact,
  downloadCiArtifact,
  resolveDockerExecutable,
} from "./node-ci-model-check-port.ts";
import { FIXED_DOCKER_IMAGE } from "./tlc-spawn-planner.ts";
import {
  FIXED_JDK_RUN_PROFILE,
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
} from "./tlc-toolchain.ts";
import {
  loadVerifiedTlaSources,
  selectVerifiedModel,
} from "./tla-model-loader.ts";
import { resolveSpecRoots } from "./tla-model-map.ts";

export const DIAGNOSTIC_TIMEOUT_MS = 300_000;
const MAX_DIAGNOSTIC_OUTPUT_BYTES = 16 * 1024 * 1024;
const COMPLETION_MARKER = "Model checking completed. No error has been found.";

export interface DiagnosticCommandResult {
  readonly status: number | null;
  readonly signal: string | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
}

interface DiagnosticCommandOptions {
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
}

export interface DiagnosticDependencies {
  readonly resolveDocker: () => string;
  readonly download: (url: string, maxBytes: number) => Promise<Uint8Array>;
  readonly digest: (bytes: Uint8Array) => string;
  readonly command: (
    executable: string,
    argv: readonly string[],
    options: DiagnosticCommandOptions,
  ) => DiagnosticCommandResult;
  readonly randomUuid: () => string;
  readonly nowMs: () => number;
}

export interface DiagnosticInput {
  readonly workspaceRoot: string;
  readonly evidenceRoot: string;
  readonly model: CiModelTarget;
}

interface DiagnosticStatistics {
  readonly generatedStates: number | null;
  readonly distinctStates: number | null;
  readonly statesLeftOnQueue: number | null;
  readonly searchDepth: number | null;
  readonly completionMarker: typeof COMPLETION_MARKER | null;
}

export interface DiagnosticResult extends DiagnosticStatistics {
  readonly schema: "amadeus.model-check-diagnostic.v1";
  readonly profile: "non-acceptance-diagnostic";
  readonly model: string;
  readonly runId: string;
  readonly imageRef: string;
  readonly jar: {
    readonly version: string;
    readonly url: string;
    readonly sha256: string;
  };
  readonly argv: readonly string[];
  readonly timeoutMs: typeof DIAGNOSTIC_TIMEOUT_MS;
  readonly elapsedMs: number;
  readonly spawnMs: number;
  readonly totalElapsedMs: number;
  readonly timedOut: boolean;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly errorCode: string | null;
  readonly cleanup: {
    readonly containerName: string;
    readonly remainingContainers: number;
    readonly forced: boolean;
  };
}

function baseEnvironment(): Record<string, string> {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    LANG: "en_US.UTF-8",
    LC_ALL: "en_US.UTF-8",
    TZ: "UTC",
  };
}

export function runDiagnosticCommand(
  executable: string,
  argv: readonly string[],
  options: DiagnosticCommandOptions,
): DiagnosticCommandResult {
  const result = spawnSync(executable, [...argv], {
    cwd: options.cwd,
    env: { ...options.env },
    encoding: "utf8",
    shell: false,
    timeout: options.timeoutMs,
    maxBuffer: MAX_DIAGNOSTIC_OUTPUT_BYTES,
  });
  return {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    timedOut: (result.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT",
  };
}

const DEFAULT_DEPENDENCIES: DiagnosticDependencies = {
  resolveDocker: resolveDockerExecutable,
  download: downloadCiArtifact,
  digest: digestCiArtifact,
  command: runDiagnosticCommand,
  randomUuid: randomUUID,
  nowMs: performance.now.bind(performance),
};

function parsedInteger(value: string): number | null {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function lastMatch(source: string, pattern: RegExp): RegExpExecArray | null {
  let latest: RegExpExecArray | null = null;
  for (const match of source.matchAll(pattern)) latest = match;
  return latest;
}

export function extractDiagnosticStatistics(stdout: string): DiagnosticStatistics {
  const terminal = lastMatch(
    stdout,
    /([0-9][0-9,]*) states generated, ([0-9][0-9,]*) distinct states found, ([0-9][0-9,]*) states left on queue\./g,
  );
  const progress = lastMatch(
    stdout,
    /Progress\(([0-9]+)\)[^\n]*?: ([0-9][0-9,]*) states generated(?: \([^)]+\))?, ([0-9][0-9,]*) distinct states found(?: \([^)]+\))?, ([0-9][0-9,]*) states left on queue\./g,
  );
  const depth = lastMatch(
    stdout,
    /The depth of the complete state graph search is ([0-9]+)\./g,
  );
  const statistics = terminal
    ? [terminal[1], terminal[2], terminal[3]]
    : progress
      ? [progress[2], progress[3], progress[4]]
      : [];
  return {
    generatedStates: statistics[0] ? parsedInteger(statistics[0]) : null,
    distinctStates: statistics[1] ? parsedInteger(statistics[1]) : null,
    statesLeftOnQueue: statistics[2] ? parsedInteger(statistics[2]) : null,
    searchDepth: depth?.[1]
      ? parsedInteger(depth[1])
      : progress?.[1]
        ? parsedInteger(progress[1])
        : null,
    completionMarker: stdout.includes(COMPLETION_MARKER) ? COMPLETION_MARKER : null,
  };
}

function remainingContainers(
  docker: string,
  workspaceRoot: string,
  containerName: string,
  dependencies: DiagnosticDependencies,
): number {
  const result = dependencies.command(
    docker,
    ["ps", "-a", "--filter", `name=^/${containerName}$`, "--format", "{{.ID}}"],
    { cwd: workspaceRoot, env: baseEnvironment(), timeoutMs: 10_000 },
  );
  if (result.status !== 0) return 1;
  return result.stdout.split("\n").filter((line) => line.trim().length > 0).length;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

export async function runModelCheckDiagnostic(
  input: DiagnosticInput,
  dependencies: DiagnosticDependencies = DEFAULT_DEPENDENCIES,
): Promise<DiagnosticResult> {
  const workspaceRoot = realpathSync(input.workspaceRoot);
  const evidenceRoot = realpathSync(input.evidenceRoot);
  const diagnosticRoot = join(evidenceRoot, "diagnostic", input.model.name);
  const supplyRoot = join(diagnosticRoot, "supply");
  const scratchRoot = join(diagnosticRoot, "scratch");
  const statesRoot = join(scratchRoot, "states");
  mkdirSync(supplyRoot, { recursive: true, mode: 0o700 });
  mkdirSync(scratchRoot, { mode: 0o700 });
  mkdirSync(statesRoot, { mode: 0o700 });
  const runId = dependencies.randomUuid();
  const containerName = `amadeus-tlc-${runId}`;
  const jarPath = join(supplyRoot, "tla2tools.jar");
  const modelRoot = resolveSpecRoots(workspaceRoot).tlaDir;
  const modelPath = join(workspaceRoot, input.model.modelPath);
  const cfgPath = join(workspaceRoot, input.model.cfgPath);
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
    "-config", cfgPath, modelPath,
  ] as const;
  let output: DiagnosticCommandResult = {
    status: null,
    signal: null,
    stdout: "",
    stderr: "",
    timedOut: false,
  };
  let errorCode: string | null = null;
  let docker: string | null = null;
  let spawnMs = 0;
  const totalStartedAt = dependencies.nowMs();
  try {
    docker = dependencies.resolveDocker();
    const jar = await dependencies.download(
      FIXED_TLC_ARTIFACT_DESCRIPTOR.url,
      FIXED_TLC_ARTIFACT_DESCRIPTOR.maxBytes,
    );
    if (dependencies.digest(jar) !== FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256) {
      errorCode = "JAR_CHECKSUM";
    } else {
      writeFileSync(jarPath, jar, { mode: 0o400 });
      const spawnStartedAt = dependencies.nowMs();
      output = dependencies.command(docker, argv, {
        cwd: workspaceRoot,
        env: baseEnvironment(),
        timeoutMs: DIAGNOSTIC_TIMEOUT_MS,
      });
      spawnMs = dependencies.nowMs() - spawnStartedAt;
      if (output.timedOut) errorCode = "TIMEOUT";
      else if (output.status !== 0) errorCode = "DIAGNOSTIC_EXIT";
    }
  } catch {
    errorCode = "DIAGNOSTIC_SETUP";
  }
  const totalElapsedMs = dependencies.nowMs() - totalStartedAt;
  writeFileSync(join(diagnosticRoot, "tlc-stdout.bin"), output.stdout, { mode: 0o600 });
  writeFileSync(join(diagnosticRoot, "tlc-stderr.bin"), output.stderr, { mode: 0o600 });
  const remainingBefore = docker
    ? remainingContainers(docker, workspaceRoot, containerName, dependencies)
    : 0;
  const forced = remainingBefore > 0;
  if (forced && docker) {
    dependencies.command(docker, ["rm", "-f", containerName], {
      cwd: workspaceRoot,
      env: baseEnvironment(),
      timeoutMs: 10_000,
    });
  }
  const remaining = docker
    ? remainingContainers(docker, workspaceRoot, containerName, dependencies)
    : 0;
  if (remaining > 0) errorCode = "CONTAINER_CLEANUP";
  const statistics = extractDiagnosticStatistics(output.stdout);
  const result: DiagnosticResult = {
    schema: "amadeus.model-check-diagnostic.v1",
    profile: "non-acceptance-diagnostic",
    model: input.model.name,
    runId,
    imageRef: FIXED_DOCKER_IMAGE,
    jar: {
      version: FIXED_TLC_ARTIFACT_DESCRIPTOR.version,
      url: FIXED_TLC_ARTIFACT_DESCRIPTOR.url,
      sha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
    },
    argv,
    timeoutMs: DIAGNOSTIC_TIMEOUT_MS,
    elapsedMs: spawnMs,
    spawnMs,
    totalElapsedMs,
    ...statistics,
    timedOut: output.timedOut,
    exitCode: output.status,
    signal: output.signal,
    errorCode,
    cleanup: { containerName, remainingContainers: remaining, forced },
  };
  writeJson(join(diagnosticRoot, "result.json"), result);
  writeJson(join(diagnosticRoot, "completion-marker.json"), {
    complete: statistics.completionMarker !== null && output.status === 0 && !output.timedOut,
    runId,
    timedOut: output.timedOut,
    exitCode: output.status,
  });
  return result;
}

interface DiagnosticMainDependencies {
  readonly run: (
    input: DiagnosticInput,
  ) => Promise<{ readonly errorCode: string | null }>;
  readonly writeError: (value: string) => void;
  readonly loadSources: typeof loadVerifiedTlaSources;
  readonly selectModel: typeof selectVerifiedModel;
}

const DEFAULT_DIAGNOSTIC_MAIN_DEPENDENCIES: DiagnosticMainDependencies = {
  run: runModelCheckDiagnostic,
  writeError: (value) => process.stderr.write(value),
  loadSources: loadVerifiedTlaSources,
  selectModel: selectVerifiedModel,
};

export async function runModelCheckDiagnosticMain(
  argv: readonly string[],
  overrides: Partial<DiagnosticMainDependencies> = {},
): Promise<0 | 2> {
  const dependencies = { ...DEFAULT_DIAGNOSTIC_MAIN_DEPENDENCIES, ...overrides };
  const validRoot = argv[0] === "--root" && Boolean(argv[1]) && isAbsolute(argv[1]!);
  const selectedName = argv.length === 4 && argv[2] === "--model" && argv[3]
    ? argv[3]
    : null;
  if (!validRoot || (argv.length !== 2 && selectedName === null)) {
    dependencies.writeError(
      "usage: run-model-check-diagnostic.ts --root <absolute-path> [--model <registered-name>]\n",
    );
    return 2;
  }
  const loaded = dependencies.loadSources();
  if (!loaded.ok) {
    dependencies.writeError(`${JSON.stringify(loaded.error)}\n`);
    return 2;
  }
  let selected = loaded.value.models;
  if (selectedName !== null) {
    const model = dependencies.selectModel(loaded.value, selectedName);
    if (!model.ok) {
      dependencies.writeError(`${JSON.stringify(model.error)}\n`);
      return 2;
    }
    selected = [model.value];
  }
  let exitCode: 0 | 2 = 0;
  for (const source of selected) {
    const result = await dependencies.run({
      workspaceRoot: process.cwd(),
      evidenceRoot: argv[1]!,
      model: ciModelTargetFor(source),
    });
    dependencies.writeError(`${JSON.stringify(result)}\n`);
    if (result.errorCode !== null) exitCode = 2;
  }
  return exitCode;
}

if (import.meta.main) process.exitCode = await runModelCheckDiagnosticMain(process.argv.slice(2));
