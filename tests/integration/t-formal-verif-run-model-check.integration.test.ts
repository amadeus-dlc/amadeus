import { afterEach, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type {
  PlannedModelCheckToolchain,
  RunModelCheckDependencies,
} from "../../scripts/formal-verif/run-model-check.ts";
import { runModelCheck } from "../../scripts/formal-verif/run-model-check.ts";
import { beginModelCheckArtifacts } from "../../scripts/formal-verif/run-model-check-artifacts.ts";
import { DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER } from "../../scripts/formal-verif/run-model-check-execution.ts";
import { NODE_RUN_MODEL_CHECK_FILESYSTEM } from "../../scripts/formal-verif/run-model-check-paths.ts";
import { StderrModelCheckReporter } from "../../scripts/formal-verif/run-model-check-reporter.ts";
import type { EnvReceipt } from "../../scripts/formal-verif/run-model-check-domain.ts";
import type { PlannedTlcOutcome } from "../../scripts/formal-verif/fs-tlc-toolchain.ts";
import {
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
  type TlcExploration,
  type VerifiedTlcArtifact,
} from "../../scripts/formal-verif/tlc-toolchain.ts";

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
    const rootSource = readFileSync("scripts/formal-verif/run-model-check.ts", "utf8");
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
      | "PUBLISH_ERROR"
      | "PUBLISH_THROW_ONCE"
      | "TOOLCHAIN_THROW"
      | "CACHE_ERROR",
    provider: "docker" | "sandbox-exec" = "docker",
    platform: NodeJS.Platform = "linux",
  ): Promise<{ result: Awaited<ReturnType<typeof runModelCheck>>; stderr: string[] }> {
    const root = mkdtempSync(join(tmpdir(), "run-model-check-"));
    roots.push(root);
    const workspace = join(root, "workspace");
    mkdirSync(workspace);
    const model = join(workspace, "FormalElection.tla");
    const cfg = join(workspace, "FormalElection.cfg");
    cpSync("specs/tla/FormalElection.tla", model);
    cpSync("specs/tla/FormalElection.cfg", cfg);
    const stderr: string[] = [];
    const artifact: VerifiedTlcArtifact = Object.freeze({
      kind: "VerifiedTlcArtifact",
      descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
      actualSha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
      byteLength: 1,
      cachePath: join(root, "cache", "tla2tools.jar"),
      receiptIdentity: "c".repeat(64),
    });
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
      preparePlanned: async (input) => exploration === "PREPARE_ERROR"
        ? {
            ok: false,
            error: {
              kind: "PreparationError",
              code: "SOURCE_DRIFT",
              message: "injected prepare failure",
            },
          }
        : ({ ok: true, value: Object.freeze({
        artifact,
        modelReceipt: input.modelReceipt,
        modulePath: input.modulePath,
        cfgPath: input.cfgPath,
        cwd: workspace,
        standardModuleDirectory: join(input.scratchRoot, ".tlc-stdlib"),
        scratchRoot: input.scratchRoot,
        deadlineMs: input.deadlineMs,
        manifestArgv: [],
        planner: input.planner,
        environmentSnapshot: {
          kind: "DOCKER" as const,
          plannerIdentity: "test",
          imageRef: "image",
          jarSha256: artifact.actualSha256,
        },
        environment: { LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8", TZ: "UTC" },
      }) }),
      runPlanned: async (prepared) => {
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
      environment: {
        inspectDarwin: async () => { throw new Error("not used"); },
        inspectDocker: async () => { throw new Error("not used"); },
      },
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

  test("fails before toolchain creation for CLI, source, and output path errors", async () => {
    const root = mkdtempSync(join(tmpdir(), "run-model-check-boundary-"));
    roots.push(root);
    const workspace = join(root, "workspace");
    mkdirSync(workspace);
    const model = join(workspace, "FormalElection.tla");
    const cfg = join(workspace, "FormalElection.cfg");
    cpSync("specs/tla/FormalElection.tla", model);
    cpSync("specs/tla/FormalElection.cfg", cfg);
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
    cpSync("specs/tla/FormalElection.tla", model);
    cpSync("specs/tla/FormalElection.cfg", cfg);
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
