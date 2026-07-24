import {
  chmodSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { Result } from "./contract.ts";
import type { CiAcceptanceFailure } from "./ci-model-check-runner.ts";

export interface DockerTrace {
  readonly argv: string[];
  readonly exitCode: number;
  readonly spawnMs: number;
  readonly runId: string;
}

function failure(code: string, detail: string): Result<never, CiAcceptanceFailure> {
  return { ok: false, error: { code, detail } };
}

function wrapperSource(): string {
  return `#!/usr/bin/env bash
set -uo pipefail
if [[ "\${1:-}" != "run" ]]; then
  exec "\${AMADEUS_REAL_DOCKER}" "$@"
fi
started="$(date +%s%N)"
printf '%s\\0' "$@" > "\${AMADEUS_DOCKER_TRACE}.argv"
set +e
"\${AMADEUS_REAL_DOCKER}" "$@"
status=$?
set -e
finished="$(date +%s%N)"
printf '%s\\n%s\\n%s\\n' "$started" "$finished" "$status" > "\${AMADEUS_DOCKER_TRACE}.timing"
exit "$status"
`;
}

export function installDockerTraceWrapper(workspaceRoot: string): string {
  const directory = join(workspaceRoot, ".amadeus-ci-docker-wrapper");
  const path = join(directory, "docker");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  writeFileSync(path, wrapperSource(), { mode: 0o700 });
  chmodSync(path, 0o700);
  return directory;
}

function normalizeArgument(
  argument: string,
  workspaceRoot: string,
  jarPath: string,
  scratchPath: string,
): string {
  return argument
    .replaceAll(workspaceRoot, "$WORKSPACE")
    .replaceAll(jarPath, "$JAR")
    .replaceAll(scratchPath, "$SCRATCH");
}

function readTraceFiles(
  prefix: string,
): Result<{ timing: string[]; rawArgs: string[] }, CiAcceptanceFailure> {
  try {
    return {
      ok: true,
      value: {
        timing: readFileSync(`${prefix}.timing`, "utf8").trim().split("\n"),
        rawArgs: readFileSync(`${prefix}.argv`).toString().split("\0").filter(Boolean),
      },
    };
  } catch {
    return failure("DOCKER_TRACE", "Docker run trace could not be read");
  }
}

function mountSource(rawArgs: readonly string[], marker: string): string | null {
  const mount = rawArgs.find(
    (argument) => argument.startsWith("type=bind,") && argument.includes(marker),
  );
  return mount ? (/src=([^,]+)/.exec(mount)?.[1] ?? null) : null;
}

export function parseDockerTrace(
  prefix: string,
  workspaceRoot: string,
): Result<DockerTrace, CiAcceptanceFailure> {
  const files = readTraceFiles(prefix);
  if (!files.ok) return files;
  const { timing, rawArgs } = files.value;
  const nameIndex = rawArgs.indexOf("--name");
  if (timing.length !== 3 || nameIndex < 0) {
    return failure("DOCKER_TRACE", "Docker run trace is incomplete");
  }
  const jarPath = mountSource(rawArgs, "tla2tools.jar");
  const scratchPath = mountSource(rawArgs, ".scratch");
  const containerName = rawArgs[nameIndex + 1] ?? "";
  const startedNs = Number(timing[0]);
  const finishedNs = Number(timing[1]);
  const exitCode = Number(timing[2]);
  if (!jarPath || !scratchPath || !containerName.startsWith("amadeus-tlc-")) {
    return failure("DOCKER_TRACE", "Docker trace identity is invalid");
  }
  if (
    !Number.isFinite(startedNs)
    || !Number.isFinite(finishedNs)
    || finishedNs < startedNs
    || !Number.isInteger(exitCode)
  ) {
    return failure("DOCKER_TRACE", "Docker trace timing is invalid");
  }
  return {
    ok: true,
    value: {
      argv: rawArgs.map((argument) => normalizeArgument(
        argument,
        workspaceRoot,
        jarPath,
        scratchPath,
      )),
      exitCode,
      spawnMs: (finishedNs - startedNs) / 1_000_000,
      runId: containerName.replace(/^amadeus-tlc-/, ""),
    },
  };
}
