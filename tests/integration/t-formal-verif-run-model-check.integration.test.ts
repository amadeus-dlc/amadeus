import { afterEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type {
  PlannedModelCheckToolchain,
  RunModelCheckDependencies,
} from "../../plugins/formal-model-check/tools/run-model-check.ts";
import { runModelCheck } from "../../plugins/formal-model-check/tools/run-model-check.ts";
import { beginModelCheckArtifacts } from "../../plugins/formal-model-check/tools/run-model-check-artifacts.ts";
import { DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER } from "../../plugins/formal-model-check/tools/run-model-check-execution.ts";
import { NODE_RUN_MODEL_CHECK_FILESYSTEM } from "../../plugins/formal-model-check/tools/run-model-check-paths.ts";
import {
  StderrModelCheckReporter,
  terminalModelCheckLines,
} from "../../plugins/formal-model-check/tools/run-model-check-reporter.ts";
import type { EnvReceipt } from "../../plugins/formal-model-check/tools/run-model-check-domain.ts";
import {
  FIXED_DOCKER_IMAGE,
  type PlannerEnvironmentPort,
} from "../../plugins/formal-model-check/tools/tlc-spawn-planner.ts";
import { toolchainErrorOutcome } from "../../plugins/formal-model-check/tools/run-model-check-domain.ts";
import type { PlannedTlcOutcome } from "../../plugins/formal-model-check/tools/fs-tlc-toolchain.ts";
import {
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
  type TlcExploration,
  type VerifiedTlcArtifact,
} from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";

const RUN_ID = "00000000-0000-4000-8000-000000000001";
const encoder = new TextEncoder();

function raw(exploration: TlcExploration): PlannedTlcOutcome {
  const receipt: EnvReceipt = {
    schema: "amadeus.env-receipt.v1",
    runId: RUN_ID,
    planner: "test-planner",
    inspections: [
      { id: "image-digest", status: "passed", expected: "image", observed: "image", reason: "" },
      { id: "jar-sha256", status: "passed", expected: "jar", observed: "jar", reason: "" },
      { id: "network-deny", status: "passed", expected: "none", observed: "none", reason: "" },
      { id: "jdk-snapshot", status: "not-applicable", expected: null, observed: null, reason: "Docker JDK" },
      { id: "sandbox-profile", status: "not-applicable", expected: null, observed: null, reason: "Docker isolation" },
    ],
  };
  return {
    exploration,
    environmentReceipt: receipt,
    raw: {
      exitCode: exploration.kind === "COMPLETE" ? 0 : 12,
      signal: null,
      stdoutChunks: [encoder.encode("tlc")],
      stderrChunks: [],
      stdoutIdentity: "a".repeat(64),
      stderrIdentity: "b".repeat(64),
      startedAtMs: 0,
      finishedAtMs: 1,
      timedOut: false,
      outputLimitExceeded: false,
    },
  };
}

describe("run-model-check orchestration", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  test("keeps the composition root thin and free of path, receipt, reporting, and publish mechanics", () => {
    const rootSource = readFileSync("plugins/formal-model-check/tools/run-model-check.ts", "utf8");
    expect(rootSource.split("\n").length).toBeLessThan(200);
    for (const forbidden of [
      "node:fs",
      "node:path",
      "EnvInspection",
      "JSON.stringify",
      "publishModelCheckArtifacts",
      "realpathSync",
      "mkdirSync",
    ]) {
      expect(rootSource).not.toContain(forbidden);
    }
    expect(rootSource).toContain("parseRunModelCheckArgs");
    expect(rootSource).toContain("loadRunModelCheckSource");
    expect(rootSource).toContain("validateModelCheckOutputPath");
    expect(rootSource).toContain("executeReservedModelCheck");
  });

  async function execute(
    exploration: TlcExploration
      | "ACQUIRE_ERROR"
      | "PREPARE_ERROR"
      | "RUN_ERROR"
      | "RUN_THROW"
      | "PUBLISH_ERROR"
      | "PUBLISH_THROW_ONCE"
      | "TOOLCHAIN_THROW"
      | "CACHE_ERROR",
    provider: "docker" | "sandbox-exec" | "auto" = "docker",
    platform: NodeJS.Platform = "linux",
    environment?: PlannerEnvironmentPort,
  ): Promise<{ result: Awaited<ReturnType<typeof runModelCheck>>; stderr: string[] }> {
    const root = mkdtempSync(join(tmpdir(), "run-model-check-"));
    roots.push(root);
    const workspace = join(root, "workspace");
    mkdirSync(workspace);
    const model = join(workspace, "FormalElection.tla");
    const cfg = join(workspace, "FormalElection.cfg");
    cpSync("amadeus/spaces/default/specs/tla/FormalElection.tla", model);
    cpSync("amadeus/spaces/default/specs/tla/FormalElection.cfg", cfg);
    const stderr: string[] = [];
    const artifact: VerifiedTlcArtifact = Object.freeze({
      kind: "VerifiedTlcArtifact",
      descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
      actualSha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
      byteLength: 1,
      cachePath: join(root, "cache", "tla2tools.jar"),
      receiptIdentity: "c".repeat(64),
    });
    const plannerEnvironment: PlannerEnvironmentPort = environment ?? {
      inspectDarwin: async () => ({
        jarSha256: artifact.actualSha256,
        jdkIdentity: "e".repeat(64),
        sandboxIdentity: "f".repeat(64),
      }),
      inspectDocker: async () => ({
        jarSha256: artifact.actualSha256,
        imageRef: FIXED_DOCKER_IMAGE,
        dockerExecutable: "/usr/bin/docker",
      }),
    };
    const toolchain: PlannedModelCheckToolchain = {
      acquire: async () => exploration === "ACQUIRE_ERROR"
        ? {
            ok: false,
            error: {
              kind: "AcquisitionError",
              code: "NETWORK",
              message: "network unavailable",
            },
          }
        : { ok: true, value: artifact },
      preparePlanned: async (input) => {
        if (exploration === "PREPARE_ERROR") {
          return {
            ok: false,
            error: {
              kind: "PreparationError",
              code: "SOURCE_DRIFT",
              message: "injected prepare failure",
            },
          };
        }
        // The real toolchain snapshots the environment here, which is where the
        // auto planner resolves which provider owns the rest of the run.
        const snapshot = await input.planner.snapshotEnvironment({
          runId: RUN_ID,
          workspaceRoot: workspace,
          scratchRoot: input.scratchRoot,
          jarPath: artifact.cachePath,
          jarSha256: artifact.actualSha256,
          deadlineMs: input.deadlineMs,
        });
        if (!snapshot.ok) return snapshot;
        return ({ ok: true, value: Object.freeze({
        artifact,
        modelReceipt: input.modelReceipt,
        vocabulary: input.vocabulary,
        modulePath: input.modulePath,
        cfgPath: input.cfgPath,
        cwd: workspace,
        standardModuleDirectory: join(input.scratchRoot, ".tlc-stdlib"),
        scratchRoot: input.scratchRoot,
        deadlineMs: input.deadlineMs,
        manifestArgv: [],
        planner: input.planner,
        environmentSnapshot: snapshot.value,
        environment: { LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8", TZ: "UTC" },
      }) });
      },
      runPlanned: async (prepared) => {
        if (exploration === "RUN_THROW") throw new Error("injected run exception");
        if (exploration === "RUN_ERROR") return {
            ok: false,
            error: {
              kind: "InvocationError",
              code: "TIMEOUT",
              message: "injected run failure",
            },
          };
        if (exploration === "PUBLISH_ERROR" || exploration === "PUBLISH_THROW_ONCE") {
          if (exploration === "PUBLISH_ERROR") {
            rmSync(dirname(prepared.scratchRoot), { recursive: true, force: true });
          }
          return { ok: true, value: raw({
            kind: "COMPLETE",
            generatedStates: 1,
            distinctStates: 1,
            statesLeftOnQueue: 0,
            searchDepth: 1,
            completionMarker: "Model checking completed. No error has been found.",
            terminationReason: "EXHAUSTED",
          }) };
        }
        return { ok: true, value: raw(exploration as TlcExploration) };
      },
    };
    let publishAttempts = 0;
    const dependencies: RunModelCheckDependencies = {
      randomUuid: () => RUN_ID,
      utcNow: (() => {
        let seconds = 0;
        return () => `2026-07-24T00:00:0${seconds++}.000Z`;
      })(),
      platform,
      environment: plannerEnvironment,
      filesystem: exploration === "CACHE_ERROR"
        ? {
            ...NODE_RUN_MODEL_CHECK_FILESYSTEM,
            mkdir: () => { throw new Error("injected cache failure"); },
          }
        : NODE_RUN_MODEL_CHECK_FILESYSTEM,
      publisher: exploration === "PUBLISH_THROW_ONCE"
        ? {
            publish: (input) => {
              publishAttempts += 1;
              if (publishAttempts === 1) throw new Error("injected publisher failure");
              return DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER.publish(input);
            },
          }
        : DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER,
      reserveArtifacts: beginModelCheckArtifacts,
      createToolchain: () => {
        if (exploration === "TOOLCHAIN_THROW") throw new Error("injected toolchain factory failure");
        return toolchain;
      },
      reporter: new StderrModelCheckReporter((line) => { stderr.push(line); }),
    };
    const result = await runModelCheck([
      "--model", model,
      "--cfg", cfg,
      "--out", join(root, "out"),
      "--provider", provider,
    ], dependencies);
    return { result, stderr };
  }

  test("publishes complete and detected outcomes with exits 0 and 1", async () => {
    const complete = await execute({
      kind: "COMPLETE",
      generatedStates: 3,
      distinctStates: 2,
      statesLeftOnQueue: 0,
      searchDepth: 2,
      completionMarker: "Model checking completed. No error has been found.",
      terminationReason: "EXHAUSTED",
    });
    const detected = await execute({
      kind: "COUNTEREXAMPLE",
      invariant: "TypeOK",
      sourceLocation: { line: 1, column: 1 },
      trace: [],
      counterexampleIdentity: "d".repeat(64),
      generatedStates: 3,
      distinctStates: 3,
      statesLeftOnQueue: 0,
      searchDepth: 3,
    });
    expect([complete.result.exitCode, detected.result.exitCode]).toEqual([0, 1]);
    expect([
      complete.result.outcome.kind,
      detected.result.outcome.kind,
    ]).toEqual(["NOT_DETECTED", "DETECTED"]);
    expect(JSON.parse(complete.stderr[0]!)).toMatchObject({
      schema: "amadeus.run-model-check.v1",
      exitCode: 0,
    });
  });

  // #2410: ENVIRONMENT_UNAVAILABLE named a class of failure and nothing else,
  // so four separate intents each rediscovered the same JDK/JAVA_HOME mismatch
  // by reading the planner source. The cause now reaches the terminal output.
  test("ENVIRONMENT_UNAVAILABLE carries its cause; other codes keep withholding it", () => {
    const environment = toolchainErrorOutcome({
      kind: "InvocationError",
      code: "ENVIRONMENT_UNAVAILABLE",
      message: "Darwin environment inspection failed",
      cause: 'Error: OpenJDK major 26 verification failed: expected `openjdk version "26.…"`',
    });
    const [envJson, envHuman] = terminalModelCheckLines("run-env", environment);
    const parsed = JSON.parse(envJson) as { errorDetail: string | null };
    expect(parsed.errorDetail).toContain("Darwin environment inspection failed");
    expect(parsed.errorDetail).toContain("OpenJDK major 26 verification failed");
    expect(envHuman).toContain("HARNESS_ERROR (ENVIRONMENT_UNAVAILABLE)");
    expect(envHuman).toContain("OpenJDK major 26 verification failed");

    // The acquisition contract is unchanged: its message stays off stderr, and
    // the published receipt remains its diagnostic surface. Widening that is a
    // separate ruling, not a side effect of #2410.
    const acquisition = toolchainErrorOutcome({
      kind: "AcquisitionError",
      code: "NETWORK",
      message: "network unavailable",
    });
    const [netJson, netHuman] = terminalModelCheckLines("run-net", acquisition);
    expect((JSON.parse(netJson) as { errorDetail: string | null }).errorDetail).toBeNull();
    expect(netHuman).toBe("run-model-check: HARNESS_ERROR (NETWORK)");
    expect(`${netJson}${netHuman}`).not.toContain("network unavailable");
  });

  test("publishes acquisition failure as an isolated partial receipt with exit 2", async () => {
    const failed = await execute("ACQUIRE_ERROR");
    expect(failed.result).toMatchObject({
      exitCode: 2,
      outcome: { kind: "HARNESS_ERROR", code: "NETWORK" },
    });
    expect(failed.result.publishedDirectory).toContain(`.failure-${RUN_ID}`);
    expect(failed.stderr.every((line) => !line.includes("network unavailable"))).toBe(true);
    const receipt = JSON.parse(readFileSync(
      join(failed.result.publishedDirectory!, "env-receipt.json"),
      "utf8",
    ));
    expect(receipt.inspections.map(({ status }: { status: string }) => status)).toEqual([
      "not-run",
      "not-run",
      "not-run",
      "not-applicable",
      "not-applicable",
    ]);
  });

  test("publishes prepare and run failures without reaching a success manifest", async () => {
    const prepared = await execute("PREPARE_ERROR");
    const executed = await execute("RUN_ERROR");
    expect([prepared.result.exitCode, executed.result.exitCode]).toEqual([2, 2]);
    expect([prepared.result.outcome, executed.result.outcome]).toEqual([
      { kind: "HARNESS_ERROR", code: "SOURCE_DRIFT", detail: "injected prepare failure" },
      { kind: "HARNESS_ERROR", code: "TIMEOUT", detail: "injected run failure" },
    ]);
  });

  test("maps terminal publisher failure to exit 2", async () => {
    const failed = await execute("PUBLISH_ERROR");
    expect(failed.result).toMatchObject({
      exitCode: 2,
      outcome: { kind: "HARNESS_ERROR", code: "WRITE" },
      publishedDirectory: null,
    });
  });

  test("recovers cache, toolchain factory, and first publisher exceptions into terminal failure manifests", async () => {
    const cache = await execute("CACHE_ERROR");
    const toolchain = await execute("TOOLCHAIN_THROW");
    const publisher = await execute("PUBLISH_THROW_ONCE");
    expect([cache, toolchain, publisher].map(({ result }) => result.exitCode)).toEqual([2, 2, 2]);
    expect([cache, toolchain, publisher].map(({ result }) =>
      result.outcome.kind === "HARNESS_ERROR" ? result.outcome.code : result.outcome.kind)).toEqual([
      "CACHE_RESERVATION",
      "UNEXPECTED_RUNTIME",
      "WRITE",
    ]);
    for (const { result } of [cache, toolchain, publisher]) {
      expect(result.publishedDirectory).toContain(`.failure-${RUN_ID}`);
      expect(JSON.parse(readFileSync(join(result.publishedDirectory!, "manifest.json"), "utf8"))).toMatchObject({
        outcome: "HARNESS_ERROR",
        exitCode: 2,
        partial: true,
      });
    }
  });

  test("covers Darwin failure receipts and a provider/platform mismatch", async () => {
    const acquisition = await execute("ACQUIRE_ERROR", "sandbox-exec", "darwin");
    const mismatch = await execute({
      kind: "COMPLETE",
      generatedStates: 1,
      distinctStates: 1,
      statesLeftOnQueue: 0,
      searchDepth: 1,
      completionMarker: "Model checking completed. No error has been found.",
      terminationReason: "EXHAUSTED",
    }, "sandbox-exec", "linux");
    expect(acquisition.result.exitCode).toBe(2);
    expect(mismatch.result).toMatchObject({
      exitCode: 2,
      outcome: { code: "PROVIDER_PLATFORM" },
    });
  });

  // #2361: after auto falls back on Darwin, the published receipt must describe
  // the provider that ran. A Darwin plan here would claim sandbox-exec checks
  // for a Docker run.
  test("publishes the fallback provider's plan when auto falls back on Darwin", async () => {
    const fallenBack = await execute("RUN_ERROR", "auto", "darwin", {
      inspectDarwin: async () => { throw new Error("JAVA_HOME is required"); },
      inspectDocker: async () => ({
        jarSha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
        imageRef: FIXED_DOCKER_IMAGE,
        dockerExecutable: "/usr/bin/docker",
      }),
    });

    const threw = await execute("RUN_THROW", "auto", "darwin", {
      inspectDarwin: async () => { throw new Error("JAVA_HOME is required"); },
      inspectDocker: async () => ({
        jarSha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
        imageRef: FIXED_DOCKER_IMAGE,
        dockerExecutable: "/usr/bin/docker",
      }),
    });

    expect(fallenBack.result).toMatchObject({ exitCode: 2, outcome: { code: "TIMEOUT" } });
    expect(threw.result).toMatchObject({ exitCode: 2, outcome: { code: "UNEXPECTED_RUNTIME" } });
    const unexpected = JSON.parse(readFileSync(
      join(threw.result.publishedDirectory!, "env-receipt.json"),
      "utf8",
    ));
    expect(unexpected.inspections.map(({ status }: { status: string }) => status)).toEqual([
      "not-run",
      "not-run",
      "not-run",
      "not-applicable",
      "not-applicable",
    ]);
    const receipt = JSON.parse(readFileSync(
      join(fallenBack.result.publishedDirectory!, "env-receipt.json"),
      "utf8",
    ));
    expect(receipt.inspections.map(({ id, status }: { id: string; status: string }) => [id, status])).toEqual([
      ["image-digest", "not-run"],
      ["jar-sha256", "not-run"],
      ["network-deny", "not-run"],
      ["jdk-snapshot", "not-applicable"],
      ["sandbox-profile", "not-applicable"],
    ]);
  });

  test("fails before toolchain creation for CLI, source, and output path errors", async () => {
    const root = mkdtempSync(join(tmpdir(), "run-model-check-boundary-"));
    roots.push(root);
    const workspace = join(root, "workspace");
    mkdirSync(workspace);
    const model = join(workspace, "FormalElection.tla");
    const cfg = join(workspace, "FormalElection.cfg");
    cpSync("amadeus/spaces/default/specs/tla/FormalElection.tla", model);
    cpSync("amadeus/spaces/default/specs/tla/FormalElection.cfg", cfg);
    const stderr: string[] = [];
    const dependencies: RunModelCheckDependencies = {
      randomUuid: () => RUN_ID,
      utcNow: () => "2026-07-24T00:00:00.000Z",
      platform: "linux",
      environment: {
        inspectDarwin: async () => { throw new Error("not used"); },
        inspectDocker: async () => { throw new Error("not used"); },
      },
      filesystem: NODE_RUN_MODEL_CHECK_FILESYSTEM,
      publisher: DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER,
      reserveArtifacts: beginModelCheckArtifacts,
      createToolchain: () => { throw new Error("invalid boundary reached toolchain"); },
      reporter: new StderrModelCheckReporter((line) => { stderr.push(line); }),
    };
    const parse = await runModelCheck([], dependencies);
    const source = await runModelCheck([
      "--model", join(workspace, "missing.tla"),
      "--cfg", cfg,
      "--out", join(root, "out-a"),
    ], dependencies);
    const overlap = await runModelCheck([
      "--model", model,
      "--cfg", cfg,
      "--out", join(workspace, "out"),
    ], dependencies);
    const missingParent = await runModelCheck([
      "--model", model,
      "--cfg", cfg,
      "--out", join(root, "missing", "out"),
    ], dependencies);
    mkdirSync(join(root, "occupied"));
    const occupied = await runModelCheck([
      "--model", model,
      "--cfg", cfg,
      "--out", join(root, "occupied"),
    ], dependencies);
    const canonicalization = await runModelCheck([
      "--model", model,
      "--cfg", cfg,
      "--out", join(root, "out-canonicalization"),
    ], {
      ...dependencies,
      filesystem: {
        ...NODE_RUN_MODEL_CHECK_FILESYSTEM,
        realpath: () => { throw new Error("injected realpath failure"); },
      },
    });

    expect([parse, source, overlap, missingParent, occupied, canonicalization].map(({ exitCode }) => exitCode)).toEqual([
      2, 2, 2, 2, 2, 2,
    ]);
    expect([parse, source, overlap, missingParent, occupied, canonicalization].map(({ outcome }) =>
      outcome.kind === "HARNESS_ERROR" ? outcome.code : outcome.kind)).toEqual([
      "MISSING_ARG",
      "MODEL_UNREADABLE",
      "OUT_CONFLICT",
      "OUT_PATH",
      "OUT_CONFLICT",
      "OUT_PATH",
    ]);
    expect(stderr.length).toBe(12);
  });

  test("contains pre-reservation exceptions and reporter failures on exit 2", async () => {
    const root = mkdtempSync(join(tmpdir(), "run-model-check-boundary-throw-"));
    roots.push(root);
    const workspace = join(root, "workspace");
    mkdirSync(workspace);
    const model = join(workspace, "FormalElection.tla");
    const cfg = join(workspace, "FormalElection.cfg");
    cpSync("amadeus/spaces/default/specs/tla/FormalElection.tla", model);
    cpSync("amadeus/spaces/default/specs/tla/FormalElection.cfg", cfg);
    const base: RunModelCheckDependencies = {
      randomUuid: () => { throw new Error("injected UUID failure"); },
      utcNow: () => "2026-07-24T00:00:00.000Z",
      platform: "linux",
      environment: {
        inspectDarwin: async () => { throw new Error("not used"); },
        inspectDocker: async () => { throw new Error("not used"); },
      },
      filesystem: NODE_RUN_MODEL_CHECK_FILESYSTEM,
      publisher: DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER,
      reserveArtifacts: beginModelCheckArtifacts,
      createToolchain: () => { throw new Error("not used"); },
      reporter: new StderrModelCheckReporter(() => {}),
    };
    const boundary = await runModelCheck([
      "--model", model,
      "--cfg", cfg,
      "--out", join(root, "out"),
    ], base);
    const reporter = await runModelCheck([], {
      ...base,
      reporter: { report: () => { throw new Error("injected reporter failure"); } },
    });
    expect(boundary).toMatchObject({
      exitCode: 2,
      outcome: { code: "BOUNDARY_FAILURE" },
    });
    expect(reporter).toMatchObject({
      exitCode: 2,
      outcome: { code: "REPORT_FAILURE" },
    });
  });
});
