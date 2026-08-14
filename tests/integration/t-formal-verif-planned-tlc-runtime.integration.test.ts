import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  chmodSync,
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  FIXED_TLC_RESERVATION_BYTES,
  FsTlcToolchain,
  type FsTlcToolchainDependencies,
} from "../../plugins/formal-model-check/tools/fs-tlc-toolchain.ts";
import type {
  EnvSnapshot,
  TlcSpawnPlanner,
} from "../../plugins/formal-model-check/tools/run-model-check-domain.ts";
import { loadRunModelCheckSource } from "../../plugins/formal-model-check/tools/run-model-check-source.ts";
import {
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  MAX_TLC_STREAM_BYTES,
} from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";

const artifactBytes = new TextEncoder().encode("planned-runtime-artifact");
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const envelope = (code: number, payload: string) =>
  `@!@!@STARTMSG ${code}:0 @!@!@\n${payload}\n@!@!@ENDMSG ${code} @!@!@\n`;

// Real TLC 2.19 extracts the standard modules into java.io.tmpdir — the
// manifest points that at `<scratchRoot>/.tlc-stdlib`, and the Parsing lines
// echo THAT directory, not the scratch root itself (#1737: a fixture shaped
// after the parser's expectation instead of real TLC output kept the
// wired-expectation mismatch green).
function completeOutput(
  modelPath: string,
  standardModuleDirectory: string,
  auxiliaryModules: readonly string[] = [],
): Uint8Array {
  const modelName = basename(modelPath, ".tla");
  return new TextEncoder().encode([
    envelope(2262, "TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)"),
    envelope(2187, "Running breadth-first search Model-Checking with fp 33 and seed 1 with 1 worker."),
    envelope(2220, "Starting SANY..."),
    [
      `Parsing file ${modelPath}`,
      ...auxiliaryModules.map(
        (module) => `Parsing file ${join(dirname(modelPath), `${module}.tla`)}`,
      ),
      ...["Naturals", "Sequences", "FiniteSets", "TLC"].map(
        (module) => `Parsing file ${join(standardModuleDirectory, `${module}.tla`)}`,
      ),
      ...[
        "Naturals",
        "Sequences",
        "FiniteSets",
        "TLC",
        ...[...auxiliaryModules].reverse(),
        modelName,
      ].map(
        (module) => `Semantic processing of module ${module}`,
      ),
      "",
    ].join("\n"),
    envelope(2219, "SANY finished."),
    envelope(2185, "Starting... (2026-07-24 07:03:45)"),
    envelope(2189, "Computing initial states..."),
    envelope(2190, "Finished computing initial states: 1 distinct state generated at 2026-07-24 07:03:45."),
    envelope(2193, [
      "Model checking completed. No error has been found.",
      "  Estimates of the probability that TLC did not check all reachable states",
      "  because two distinct states had the same fingerprint:",
      "  calculated (optimistic):  val = 1.3E-7",
      "  based on the actual fingerprints:  val = 1.2E-8",
    ].join("\n")),
    envelope(2199, "5203730 states generated, 529692 distinct states found, 0 states left on queue."),
    envelope(2194, "The depth of the complete state graph search is 9."),
    envelope(2186, "Finished in 161085ms at (2026-07-24 07:06:25)"),
  ].join(""));
}

describe("planned TLC filesystem runtime", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  });

  test("rechecks the planner immediately before spawn and falls closed on drift", async () => {
    const root = mkdtempSync(join(tmpdir(), "planned-tlc-runtime-"));
    roots.push(root);
    const workspace = join(root, "workspace");
    const scratch = join(root, "scratch");
    mkdirSync(workspace);
    mkdirSync(scratch);
    const modelPath = join(workspace, "FormalElection.tla");
    const cfgPath = join(workspace, "FormalElection.cfg");
    cpSync("amadeus/spaces/default/specs/tla/FormalElection.tla", modelPath);
    cpSync("amadeus/spaces/default/specs/tla/FormalElection.cfg", cfgPath);
    cpSync(
      "amadeus/spaces/default/specs/tla/FormalElectionCore.tla",
      join(workspace, "FormalElectionCore.tla"),
    );
    const source = loadRunModelCheckSource(modelPath, cfgPath);
    if (!source.ok) throw new Error(JSON.stringify(source.error));

    let mode: "drift" | "overflow" | "timeout" | "race" | "complete" | "staged-drift" = "drift";
    let activeModelPath = modelPath;
    let activeScratch = scratch;
    let activeAuxiliaryModules: readonly string[] = ["FormalElectionCore"];
    let activeWorkspaceModelPath = modelPath;
    let activeWorkspaceCfgPath = cfgPath;
    let activeWorkspaceAuxiliaryPaths: readonly string[] = [join(workspace, "FormalElectionCore.tla")];
    let stagedModelBytesDuringRace: Uint8Array | undefined;
    let stagedCfgBytesDuringRace: Uint8Array | undefined;
    let stagedAuxiliaryBytesDuringRace: readonly Uint8Array[] = [];
    let spawnedSourcePathsDuringRace: readonly string[] = [];
    let spawns = 0;
    const signals: string[] = [];
    const reservations = new Set<string>();
    const dependencies: FsTlcToolchainDependencies = {
      network: {
        request: async (input) => ({
          status: 200,
          headers: { "content-length": String(artifactBytes.byteLength) },
          connectedAtMs: input.startedAtMs,
          headersAtMs: input.startedAtMs,
          body: (async function* () { yield artifactBytes; })(),
        }),
      },
      digest: {
        createStreamingDigest: () => ({
          update: () => {},
          digest: () => FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
        }),
        digest: (path) => ({
          sha256: readFileSync(path).byteLength === artifactBytes.byteLength
            ? FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256
            : sha256(new Uint8Array(readFileSync(path))),
          byteLength: readFileSync(path).byteLength,
        }),
      },
      reservation: {
        availableBytes: () => FIXED_TLC_RESERVATION_BYTES,
        reserve: (path) => { reservations.add(path); },
        release: (path) => { reservations.delete(path); },
        isReserved: (path) => reservations.has(path),
      },
      clock: { nowMs: () => 0, utcNow: () => "2026-07-24T00:00:00Z" },
      owner: { host: "test-host", pid: 42, processStartedAt: "test-start" },
      liveness: () => "dead",
      randomUuid: () => "00000000-0000-4000-8000-000000000001",
      jdkVersion: "OpenJDK 26.0.1",
      workspaceRoot: workspace,
      timer: {
        wait: () => mode === "timeout"
          ? Promise.resolve()
          : new Promise<void>(() => {}),
      },
      process: {
        spawn: (input) => {
          spawns += 1;
          activeModelPath = input.argv.at(-1)!;
          if (mode === "race") {
            const workspaceModelBytes = new Uint8Array(readFileSync(activeWorkspaceModelPath));
            const workspaceCfgBytes = new Uint8Array(readFileSync(activeWorkspaceCfgPath));
            const workspaceAuxiliaryBytes = activeWorkspaceAuxiliaryPaths.map((path) =>
              new Uint8Array(readFileSync(path))
            );
            const configIndex = input.argv.lastIndexOf("-config");
            const stagedCfgPath = input.argv[configIndex + 1]!;
            writeFileSync(activeWorkspaceModelPath, "---- MODULE Replaced ----\nRace == TRUE\n====\n");
            writeFileSync(activeWorkspaceCfgPath, "SPECIFICATION Race\n");
            for (const path of activeWorkspaceAuxiliaryPaths) {
              writeFileSync(path, "---- MODULE ReplacedAuxiliary ----\nRace == TRUE\n====\n");
            }
            stagedModelBytesDuringRace = new Uint8Array(readFileSync(activeModelPath));
            stagedCfgBytesDuringRace = new Uint8Array(readFileSync(stagedCfgPath));
            const stagedAuxiliaryPaths = activeWorkspaceAuxiliaryPaths.map((path) =>
              join(dirname(activeModelPath), basename(path))
            );
            stagedAuxiliaryBytesDuringRace = stagedAuxiliaryPaths.map((path) =>
              new Uint8Array(readFileSync(path))
            );
            spawnedSourcePathsDuringRace = [stagedCfgPath, activeModelPath, ...stagedAuxiliaryPaths];
            writeFileSync(activeWorkspaceModelPath, workspaceModelBytes);
            writeFileSync(activeWorkspaceCfgPath, workspaceCfgBytes);
            activeWorkspaceAuxiliaryPaths.forEach((path, index) => {
              writeFileSync(path, workspaceAuxiliaryBytes[index]!);
            });
          } else if (mode === "staged-drift") {
            chmodSync(activeModelPath, 0o600);
            writeFileSync(activeModelPath, "---- MODULE FormalElection ----\nStagedDrift == TRUE\n====\n");
          }
          let resolveStatus!: (status: { exitCode: number | null; signal: string | null }) => void;
          const status = mode === "complete" || mode === "race" || mode === "staged-drift"
            ? Promise.resolve({ exitCode: 0, signal: null })
            : new Promise<{ exitCode: number | null; signal: string | null }>(
                (resolve) => { resolveStatus = resolve; },
              );
          return {
            stdout: mode === "overflow"
              ? (async function* () {
                  yield new Uint8Array(MAX_TLC_STREAM_BYTES + 1);
                })()
              : mode === "complete" || mode === "race" || mode === "staged-drift"
                ? (async function* () {
                    yield completeOutput(
                      realpathSync(activeModelPath),
                      join(realpathSync(activeScratch), ".tlc-stdlib"),
                      activeAuxiliaryModules,
                    );
                  })()
                : (async function* () {})(),
            stderr: (async function* () {})(),
            wait: () => status,
            signalGroup: async (signal) => {
              signals.push(signal);
              if (signal === "SIGKILL") resolveStatus({ exitCode: null, signal });
            },
          };
        },
      },
      suiteRemainingMs: () => 130_000,
      evidencePublishReserveMs: 5_000,
    };
    const snapshot: EnvSnapshot = Object.freeze({
      kind: "DOCKER",
      plannerIdentity: "planner",
      imageRef: "image@sha256:a",
      jarSha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
    });
    const planner: TlcSpawnPlanner = {
      identity: "planner",
      buildArgv: (manifestArgv) => {
        if (mode === "drift") throw new Error("buildArgv must not run after drift");
        return ["/usr/bin/true", ...manifestArgv];
      },
      snapshotEnvironment: async () => ({ ok: true, value: snapshot }),
      verifyEnvironment: async () => mode === "drift"
        ? {
            ok: false,
            error: {
              kind: "InvocationError",
              code: "ENVIRONMENT_DRIFT",
              message: "injected Docker jar drift",
            },
          }
        : {
            ok: true,
            value: {
              schema: "amadeus.env-receipt.v1",
              runId: "00000000-0000-4000-8000-000000000001",
              planner: "planner",
              inspections: [],
            },
          },
    };
    const toolchain = new FsTlcToolchain(join(root, "cache"), dependencies);
    const acquired = await toolchain.acquire();
    if (!acquired.ok) throw new Error(JSON.stringify(acquired.error));
    const prepared = await toolchain.preparePlanned({
      artifact: acquired.value,
      modelReceipt: source.value.modelReceipt,
      vocabulary: source.value.vocabulary,
      modulePath: modelPath,
      cfgPath,
      subjectAlias: "run-model-check",
      deadlineMs: 120_000,
      runId: "00000000-0000-4000-8000-000000000001",
      scratchRoot: scratch,
      planner,
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.value.manifestArgv).toContain("-metadir");
    expect(prepared.value.manifestArgv).toContain(
      join(prepared.value.scratchRoot, "states"),
    );

    expect(await toolchain.runPlanned(prepared.value)).toMatchObject({
      ok: false,
      error: { code: "ENVIRONMENT_DRIFT" },
    });
    expect(spawns).toBe(0);

    mode = "overflow";
    const overflow = await toolchain.runPlanned(prepared.value);
    expect(overflow.ok && overflow.value.exploration).toMatchObject({
      kind: "HARNESS_ERROR",
      reason: "OUTPUT_CAPACITY",
    });
    expect(signals.splice(0)).toEqual(["SIGTERM", "SIGKILL"]);

    mode = "timeout";
    const timeout = await toolchain.runPlanned(prepared.value);
    expect(timeout.ok && timeout.value.raw.timedOut).toBe(true);
    expect(timeout.ok && timeout.value.exploration).toMatchObject({
      kind: "HARNESS_ERROR",
      reason: "TIMEOUT",
    });
    expect(signals).toEqual(["SIGTERM", "SIGKILL"]);

    const verifiedModelBytes = new Uint8Array(readFileSync(modelPath));
    const verifiedCfgBytes = new Uint8Array(readFileSync(cfgPath));
    mode = "race";
    const raced = await toolchain.runPlanned(prepared.value);
    expect(raced.ok && raced.value.exploration).toMatchObject({ kind: "COMPLETE" });
    expect(stagedModelBytesDuringRace).toEqual(verifiedModelBytes);
    expect(stagedCfgBytesDuringRace).toEqual(verifiedCfgBytes);
    expect(spawnedSourcePathsDuringRace.every((path) =>
      dirname(path) === join(realpathSync(scratch), ".tlc-inputs")
    )).toBe(true);
    expect(spawnedSourcePathsDuringRace).not.toContain(modelPath);
    expect(spawnedSourcePathsDuringRace).not.toContain(cfgPath);
    expect(new Uint8Array(readFileSync(modelPath))).toEqual(verifiedModelBytes);
    expect(new Uint8Array(readFileSync(cfgPath))).toEqual(verifiedCfgBytes);

    mode = "complete";
    const complete = await toolchain.runPlanned(prepared.value);
    expect(complete.ok && complete.value.exploration).toMatchObject({
      kind: "COMPLETE",
      generatedStates: 5_203_730,
      distinctStates: 529_692,
      statesLeftOnQueue: 0,
      searchDepth: 9,
    });

    mode = "staged-drift";
    expect(await toolchain.runPlanned(prepared.value)).toMatchObject({
      ok: false,
      error: { kind: "NormalizationError", code: "SOURCE_DRIFT" },
    });
    mode = "complete";

    const mirrorScratch = join(root, "mirror-scratch");
    mkdirSync(mirrorScratch);
    const mirrorModelPath = join(workspace, "MirrorLifecycle.tla");
    const mirrorCfgPath = join(workspace, "MirrorLifecycle.cfg");
    const mirrorCorePath = join(workspace, "MirrorLifecycleCore.tla");
    cpSync("amadeus/spaces/default/specs/tla/MirrorLifecycle.tla", mirrorModelPath);
    cpSync("amadeus/spaces/default/specs/tla/MirrorLifecycle.cfg", mirrorCfgPath);
    cpSync("amadeus/spaces/default/specs/tla/MirrorLifecycleCore.tla", mirrorCorePath);
    const mirrorSource = loadRunModelCheckSource(mirrorModelPath, mirrorCfgPath);
    if (!mirrorSource.ok) throw new Error(JSON.stringify(mirrorSource.error));
    const mirrorReceipt = mirrorSource.value.modelReceipt;
    if (!("schema" in mirrorReceipt)) throw new Error("MirrorLifecycle must use a verified receipt");

    const prepareMirror = (modelReceipt: typeof mirrorSource.value.modelReceipt) =>
      toolchain.preparePlanned({
        artifact: acquired.value,
        modelReceipt,
        vocabulary: mirrorSource.value.vocabulary,
        modulePath: mirrorModelPath,
        cfgPath: mirrorCfgPath,
        subjectAlias: "run-model-check",
        deadlineMs: 120_000,
        runId: "00000000-0000-4000-8000-000000000002",
        scratchRoot: mirrorScratch,
        planner,
      });

    expect(await prepareMirror(source.value.modelReceipt)).toMatchObject({
      ok: false,
      error: { code: "SOURCE_IDENTITY" },
    });
    for (const forgedReceipt of [
      { ...mirrorReceipt, modelName: "FormalElection" },
      { ...mirrorReceipt, modelIdentity: "0".repeat(64) },
      { ...mirrorReceipt, moduleBytesIdentity: "0".repeat(64) },
      { ...mirrorReceipt, cfgBytesIdentity: "0".repeat(64) },
      { ...mirrorReceipt, auxiliaryModules: [] },
      { ...mirrorReceipt, vocabulary: { ...mirrorReceipt.vocabulary, moduleName: "FormalElection" } },
      { ...mirrorReceipt, invariantSourceMap: {} },
    ]) {
      expect(await prepareMirror(forgedReceipt)).toMatchObject({
        ok: false,
        error: { code: "MODEL_RECEIPT" },
      });
    }

    writeFileSync(mirrorModelPath, "---- MODULE MirrorLifecycle ----\n====\n");
    expect(await prepareMirror(mirrorSource.value.modelReceipt)).toMatchObject({
      ok: false,
      error: { code: "SOURCE_IDENTITY" },
    });

    cpSync("amadeus/spaces/default/specs/tla/MirrorLifecycle.tla", mirrorModelPath);
    const spawnsBeforeAuxiliaryFailures = spawns;
    rmSync(mirrorCorePath);
    expect((await prepareMirror(mirrorSource.value.modelReceipt)).ok).toBe(false);
    cpSync("amadeus/spaces/default/specs/tla/MirrorLifecycleCore.tla", mirrorCorePath);
    writeFileSync(mirrorCorePath, "---- MODULE MirrorLifecycleCore ----\n====\n");
    expect((await prepareMirror(mirrorSource.value.modelReceipt)).ok).toBe(false);
    expect(spawns).toBe(spawnsBeforeAuxiliaryFailures);
    cpSync("amadeus/spaces/default/specs/tla/MirrorLifecycleCore.tla", mirrorCorePath);

    activeModelPath = mirrorModelPath;
    activeScratch = mirrorScratch;
    activeAuxiliaryModules = ["MirrorLifecycleCore"];
    activeWorkspaceModelPath = mirrorModelPath;
    activeWorkspaceCfgPath = mirrorCfgPath;
    activeWorkspaceAuxiliaryPaths = [mirrorCorePath];
    const mirrorPrepared = await prepareMirror(mirrorSource.value.modelReceipt);
    if (!mirrorPrepared.ok) throw new Error(JSON.stringify(mirrorPrepared.error));
    expect(mirrorPrepared.ok).toBe(true);
    const verifiedMirrorCoreBytes = new Uint8Array(readFileSync(mirrorCorePath));
    mode = "race";
    const mirrorComplete = await toolchain.runPlanned(mirrorPrepared.value);
    expect(mirrorComplete.ok && mirrorComplete.value.exploration).toMatchObject({
      kind: "COMPLETE",
      generatedStates: 5_203_730,
      distinctStates: 529_692,
      statesLeftOnQueue: 0,
      searchDepth: 9,
      completionMarker: "Model checking completed. No error has been found.",
      terminationReason: "EXHAUSTED",
    });
    expect(stagedAuxiliaryBytesDuringRace).toEqual([verifiedMirrorCoreBytes]);
    expect(spawnedSourcePathsDuringRace).not.toContain(mirrorModelPath);
    expect(spawnedSourcePathsDuringRace).not.toContain(mirrorCfgPath);
    expect(spawnedSourcePathsDuringRace).not.toContain(mirrorCorePath);

    mode = "complete";
    for (const auxiliaryModules of [
      [],
      ["MirrorLifecycleCore", "MirrorLifecycleCore"],
      ["MirrorLifecycleCore", "Injected"],
    ]) {
      activeAuxiliaryModules = auxiliaryModules;
      const malformed = await toolchain.runPlanned(mirrorPrepared.value);
      expect(malformed.ok && malformed.value.exploration).toMatchObject({
        kind: "HARNESS_ERROR",
        reason: "GRAMMAR",
      });
    }

    activeAuxiliaryModules = ["MirrorLifecycleCore"];
    const spawnsBeforeSourceRemoval = spawns;
    rmSync(join(dirname(mirrorPrepared.value.modulePath), "MirrorLifecycleCore.tla"));
    expect(await toolchain.runPlanned(mirrorPrepared.value)).toMatchObject({
      ok: false,
      error: { kind: "InvocationError", code: "SOURCE_DRIFT" },
    });
    expect(spawns).toBe(spawnsBeforeSourceRemoval);
  });
});
