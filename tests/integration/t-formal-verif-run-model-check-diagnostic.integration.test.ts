import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  DIAGNOSTIC_TIMEOUT_MS,
  extractDiagnosticStatistics,
  runDiagnosticCommand,
  runModelCheckDiagnostic,
  runModelCheckDiagnosticMain,
  type DiagnosticCommandResult,
  type DiagnosticDependencies,
} from "../../scripts/formal-verif/run-model-check-diagnostic.ts";
import { FIXED_DOCKER_IMAGE } from "../../scripts/formal-verif/tlc-spawn-planner.ts";
import {
  FIXED_JDK_RUN_PROFILE,
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
} from "../../scripts/formal-verif/tlc-toolchain.ts";

const roots: string[] = [];
const RUN_ID = "00000000-0000-4000-8000-000000000001";

afterEach(() => {
  roots.splice(0).forEach((root) => {
    rmSync(root, { recursive: true, force: true });
  });
});

function fixture(): { workspaceRoot: string; evidenceRoot: string } {
  const workspaceRoot = resolve(".");
  const evidenceRoot = realpathSync(mkdtempSync(join(tmpdir(), "formal-diagnostic-")));
  roots.push(evidenceRoot);
  return { workspaceRoot, evidenceRoot };
}

function dependencies(
  run: DiagnosticDependencies["command"],
  nowMs?: () => number,
): DiagnosticDependencies {
  let now = 1_000;
  return {
    resolveDocker: () => "/usr/bin/docker",
    download: async () => new Uint8Array([1, 2, 3]),
    digest: () => FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
    command: run,
    randomUuid: () => RUN_ID,
    nowMs: nowMs ?? (() => {
      now += 250;
      return now;
    }),
  };
}

function successOutput(): string {
  return [
    "@!@!@STARTMSG 2199:0 @!@!@",
    "121 states generated, 63 distinct states found, 0 states left on queue.",
    "@!@!@ENDMSG 2199 @!@!@",
    "@!@!@STARTMSG 2194:0 @!@!@",
    "The depth of the complete state graph search is 9.",
    "@!@!@ENDMSG 2194 @!@!@",
    "Model checking completed. No error has been found.",
  ].join("\n");
}

describe("non-acceptance model-check diagnostic", () => {
  test("extracts terminal and progress statistics without treating them as acceptance", () => {
    expect(extractDiagnosticStatistics(successOutput())).toEqual({
      generatedStates: 121,
      distinctStates: 63,
      statesLeftOnQueue: 0,
      searchDepth: 9,
      completionMarker: "Model checking completed. No error has been found.",
    });
    expect(extractDiagnosticStatistics(
      "Progress(7) at 2026-07-24 00:00:00: 80 states generated, 50 distinct states found, 12 states left on queue.",
    )).toEqual({
      generatedStates: 80,
      distinctStates: 50,
      statesLeftOnQueue: 12,
      searchDepth: 7,
      completionMarker: null,
    });
  });

  test("runs one exact fixed Docker/TLC invocation and writes diagnostic evidence", async () => {
    const paths = fixture();
    const calls: Array<{ executable: string; argv: readonly string[]; timeoutMs: number }> = [];
    const command = (
      executable: string,
      argv: readonly string[],
      options: { readonly timeoutMs: number },
    ): DiagnosticCommandResult => {
      calls.push({ executable, argv, timeoutMs: options.timeoutMs });
      return argv[0] === "run"
        ? { status: 0, signal: null, stdout: successOutput(), stderr: "", timedOut: false }
        : { status: 0, signal: null, stdout: "", stderr: "", timedOut: false };
    };

    const result = await runModelCheckDiagnostic(paths, dependencies(command));
    const diagnosticRoot = join(paths.evidenceRoot, "diagnostic");
    const jarPath = join(diagnosticRoot, "supply", "tla2tools.jar");
    const scratchPath = join(diagnosticRoot, "scratch");
    const statesPath = join(scratchPath, "states");
    const modelRoot = join(paths.workspaceRoot, "specs/tla");
    const modelPath = join(paths.workspaceRoot, "specs/tla/FormalElection.tla");
    const cfgPath = join(paths.workspaceRoot, "specs/tla/FormalElection.cfg");
    const dockerRun = calls.find(({ argv }) => argv[0] === "run")!;

    expect(dockerRun).toEqual({
      executable: "/usr/bin/docker",
      timeoutMs: DIAGNOSTIC_TIMEOUT_MS,
      argv: [
        "run", "--rm", "--network=none", "--name", `amadeus-tlc-${RUN_ID}`,
        "--mount", `type=bind,src=${modelRoot},dst=${modelRoot},readonly`,
        "--mount", `type=bind,src=${jarPath},dst=${jarPath},readonly`,
        "--mount", `type=bind,src=${scratchPath},dst=${scratchPath}`,
        "--workdir", scratchPath,
        FIXED_DOCKER_IMAGE,
        "java",
        ...FIXED_JDK_RUN_PROFILE.jvmArgs,
        `-Djava.io.tmpdir=${scratchPath}`,
        "-cp", jarPath,
        "tlc2.TLC", "-workers", "1", "-tool", "-metadir", statesPath,
        "-config", cfgPath, modelPath,
      ],
    });
    expect(result).toMatchObject({
      profile: "non-acceptance-diagnostic",
      elapsedMs: 250,
      spawnMs: 250,
      totalElapsedMs: 750,
      generatedStates: 121,
      distinctStates: 63,
      statesLeftOnQueue: 0,
      searchDepth: 9,
      timedOut: false,
      exitCode: 0,
      cleanup: { containerName: `amadeus-tlc-${RUN_ID}`, remainingContainers: 0 },
    });
    expect(JSON.parse(readFileSync(join(diagnosticRoot, "result.json"), "utf8"))).toEqual(result);
    expect(JSON.parse(readFileSync(join(diagnosticRoot, "completion-marker.json"), "utf8"))).toEqual({
      complete: true,
      runId: RUN_ID,
      timedOut: false,
      exitCode: 0,
    });
  });

  test("records timeout statistics and force-removes only the exact container", async () => {
    const paths = fixture();
    const calls: readonly string[][] = [];
    const mutableCalls = calls as string[][];
    let psCount = 0;
    const command: DiagnosticDependencies["command"] = (_executable, argv) => {
      mutableCalls.push([...argv]);
      if (argv[0] === "run") {
        return {
          status: null,
          signal: "SIGTERM",
          stdout: "Progress(4): 20 states generated, 11 distinct states found, 3 states left on queue.",
          stderr: "timed out",
          timedOut: true,
        };
      }
      if (argv[0] === "ps") {
        psCount += 1;
        return {
          status: 0,
          signal: null,
          stdout: psCount === 1 ? "container-id\n" : "",
          stderr: "",
          timedOut: false,
        };
      }
      return { status: 0, signal: null, stdout: "", stderr: "", timedOut: false };
    };

    const times = [0, 10, 300_010, 300_020];
    const result = await runModelCheckDiagnostic(
      paths,
      dependencies(command, () => times.shift()!),
    );
    expect(result).toMatchObject({
      generatedStates: 20,
      distinctStates: 11,
      statesLeftOnQueue: 3,
      searchDepth: 4,
      completionMarker: null,
      timedOut: true,
      elapsedMs: 300_000,
      spawnMs: 300_000,
      totalElapsedMs: 300_020,
      exitCode: null,
      signal: "SIGTERM",
      cleanup: { remainingContainers: 0, forced: true },
    });
    expect(mutableCalls).toContainEqual(["rm", "-f", `amadeus-tlc-${RUN_ID}`]);
    expect(mutableCalls.filter((argv) => argv[0] === "run")).toHaveLength(1);
  });

  test("always records a terminal result when Docker setup fails before spawn", async () => {
    const paths = fixture();
    const unavailable = dependencies(() => {
      throw new Error("command must not run");
    });
    const result = await runModelCheckDiagnostic(paths, {
      ...unavailable,
      resolveDocker: () => {
        throw new Error("docker unavailable");
      },
    });
    expect(result).toMatchObject({
      errorCode: "DIAGNOSTIC_SETUP",
      timedOut: false,
      exitCode: null,
      elapsedMs: 0,
      spawnMs: 0,
      totalElapsedMs: 250,
      cleanup: {
        containerName: `amadeus-tlc-${RUN_ID}`,
        remainingContainers: 0,
        forced: false,
      },
    });
    expect(JSON.parse(
      readFileSync(join(paths.evidenceRoot, "diagnostic/result.json"), "utf8"),
    )).toEqual(result);
  });

  test("records checksum setup failure without starting the diagnostic container", async () => {
    const paths = fixture();
    const calls: string[][] = [];
    const base = dependencies((_executable, argv) => {
      calls.push([...argv]);
      return { status: 0, signal: null, stdout: "", stderr: "", timedOut: false };
    });
    const result = await runModelCheckDiagnostic(paths, {
      ...base,
      digest: () => "0".repeat(64),
    });
    expect(result.errorCode).toBe("JAR_CHECKSUM");
    expect(calls.some((argv) => argv[0] === "run")).toBe(false);
  });

  test("exposes shell-free command and CLI boundaries", async () => {
    expect(runDiagnosticCommand("/usr/bin/printf", ["diagnostic"], {
      cwd: resolve("."),
      env: { PATH: "/usr/bin:/bin" },
      timeoutMs: 1_000,
    })).toEqual({
      status: 0,
      signal: null,
      stdout: "diagnostic",
      stderr: "",
      timedOut: false,
    });
    const writes: string[] = [];
    expect(await runModelCheckDiagnosticMain([], {
      run: async () => ({ errorCode: null }),
      writeError: (value) => writes.push(value),
    })).toBe(2);
    expect(writes[0]).toContain("usage:");
    expect(await runModelCheckDiagnosticMain(["--root", "/tmp/evidence"], {
      run: async (input) => ({ errorCode: input.evidenceRoot === "/tmp/evidence" ? null : "DRIFT" }),
      writeError: (value) => writes.push(value),
    })).toBe(0);
    expect(writes.at(-1)).toBe('{"errorCode":null}\n');
  });

  test("workflow runs diagnostics before the unchanged acceptance and ignores its exit", () => {
    const source = readFileSync(".github/workflows/ci.yml", "utf8");
    const diagnostic = `bun scripts/formal-verif/run-model-check-diagnostic.ts --root "\${EVIDENCE_ROOT}"`;
    const acceptance = `bun scripts/formal-verif/run-model-check-ci.ts run --root "\${EVIDENCE_ROOT}"`;
    expect(source).toContain(diagnostic);
    expect(source.indexOf(diagnostic)).toBeLessThan(source.indexOf(acceptance));
    expect(source).toContain("diagnostic_status=$?");
    expect(source).toContain(`echo "diagnostic-exit-code=\${diagnostic_status}"`);
    expect(source).toContain("status=$?");
    expect(source).toContain(`exit "\${status}"`);
  });
});
