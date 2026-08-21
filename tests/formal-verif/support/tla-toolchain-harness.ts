import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalIdentity } from "../../../plugins/formal-model-check/tools/canonical.ts";
import { parseCellResult, type CellResult, type Result } from "../../../plugins/formal-model-check/tools/contract.ts";
import {
  createFrozenTlaModelReceipt,
  generateFrozenTlaModel,
  type FrozenTlaModelBundle,
} from "../../../plugins/formal-model-check/tools/tla-arm.ts";
import {
  findModelMapModel,
  parseTlaModelMap,
} from "../../../plugins/formal-model-check/tools/tla-model-map.ts";
import {
  DARWIN_NETWORK_DENY_POLICY_IDENTITY,
  DARWIN_SANDBOX_PROVIDER_IDENTITY,
  FIXED_JDK_RUN_PROFILE,
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
  createJdkDistributionManifest,
  createJdkSnapshotIdentity,
  createSandboxProbeReceipt,
  createTlcRunManifest,
  parseTlcOutput174,
  traceVocabularyFor,
  type PreparedTlcRun,
  type RawTlcOutcome,
  type TlcCellBinding,
  type TlcExploration,
  type TlcPrepareInput,
  type TlcToolchainError,
  type TlcToolchainFacade,
  type TraceVocabulary,
  type VerifiedJdkSnapshot,
  type VerifiedSandbox,
  type VerifiedTlcArtifact,
} from "../../../plugins/formal-model-check/tools/tlc-toolchain.ts";

export type SyntheticTlcScenario = "complete" | "counterexample" | "timeout";
type ToolchainCall = "acquire" | "verifyOffline" | "prepare" | "run" | "normalize";

const MODULE_NAME = "FormalElection";
const MODULE_PATH = "/synthetic/FormalElection.tla";
const CFG_PATH = "/synthetic/FormalElection.cfg";
const RUN_ROOT = "/synthetic";
const JDK_ROOT = "/synthetic/jdk";

// The synthetic module is FormalElection, so its trace vocabulary comes from
// the real model-map declaration (the single source) — never duplicated here.
const REPOSITORY_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const VOCABULARY: TraceVocabulary = (() => {
  const parsed = parseTlaModelMap(
    new Uint8Array(readFileSync(join(REPOSITORY_ROOT, "amadeus/spaces/default/specs/tla/model-map.json"))),
  );
  if (!parsed.ok) throw new Error(parsed.error.detail);
  const model = findModelMapModel(parsed.value, MODULE_NAME);
  if (model === undefined) throw new Error(`${MODULE_NAME} is not registered in the model map`);
  const vocabulary = traceVocabularyFor(model);
  if (!vocabulary.ok) throw new Error(vocabulary.error.detail);
  return vocabulary.value;
})();
const PUBLIC_CONTRACT_IDENTITY = canonicalIdentity(
  { schemaVersion: 1, contract: "frozen-election-public-contract" },
  "amadeus.formal-verif.test.public-contract.v1",
).sha256;

function identity(value: unknown, label: string): string {
  return canonicalIdentity(value, `amadeus.formal-verif.test.${label}.v1`).sha256;
}

function operationFailure(
  kind: "PreparationError" | "InvocationError" | "NormalizationError",
  code: string,
  message: string,
): Result<never, TlcToolchainError> {
  return { ok: false, error: { kind, code, message } };
}

function envelope(code: number, severity: number, payload: string): string {
  return `@!@!@STARTMSG ${code}:${severity} @!@!@\n${payload}\n@!@!@ENDMSG ${code} @!@!@\n`;
}

const STANDARD_MODULES = ["Naturals", "Sequences", "FiniteSets", "TLC"] as const;

/**
 * The SANY transcript a real TLC run prints for THIS model. The auxiliary
 * module names are read off the frozen model's own receipt rather than written
 * out here, because a hard-coded copy silently rots: when the election model
 * grew the `FormalElectionCore` auxiliary, this fixture kept emitting the old
 * transcript and the classifier — correctly — rejected it as a module graph
 * that does not match the receipt, which surfaced as HARNESS_ERROR:GRAMMAR on a
 * TLC run that had in fact succeeded (#3391 class 2).
 *
 * Ordering mirrors SANY: the root module is parsed first, then everything it
 * pulls in; semantic processing then runs dependencies-first with the root
 * last. Auxiliaries sit beside the module, standard modules under the run's
 * stdlib directory — the two locations the classifier resolves.
 */
function sanyTranscript(auxiliaryModules: readonly string[]): string {
  return [
    `Parsing file ${MODULE_PATH}`,
    ...STANDARD_MODULES.map((module) => `Parsing file ${RUN_ROOT}/.tlc-stdlib/${module}.tla`),
    ...auxiliaryModules.map((module) => `Parsing file ${RUN_ROOT}/${module}.tla`),
    ...STANDARD_MODULES.map((module) => `Semantic processing of module ${module}`),
    ...auxiliaryModules.map((module) => `Semantic processing of module ${module}`),
    `Semantic processing of module ${MODULE_NAME}`,
    "",
  ].join("\n");
}

function lifecyclePrefix(auxiliaryModules: readonly string[]): string {
  return [
    envelope(2262, 0, "TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)"),
    envelope(2187, 0, "Running breadth-first search Model-Checking with fp 92 and seed 5 with 1 worker."),
    envelope(2220, 0, "Starting SANY..."),
    sanyTranscript(auxiliaryModules),
    envelope(2219, 0, "SANY finished."),
    envelope(2185, 0, "Starting... (2026-07-21 09:26:25)"),
    envelope(2189, 0, "Computing initial states..."),
    envelope(2190, 0, "Finished computing initial states: 1 distinct state generated at 2026-07-21 09:26:25."),
  ].join("");
}

function completeOutput(auxiliaryModules: readonly string[]): string {
  const completion = [
    "Model checking completed. No error has been found.",
    "  Estimates of the probability that TLC did not check all reachable states",
    "  because two distinct states had the same fingerprint:",
    "  calculated (optimistic):  val = 1.1E-19",
  ].join("\n");
  return [
    lifecyclePrefix(auxiliaryModules),
    envelope(2193, 0, completion),
    envelope(2200, 0, "Progress(1): 1 states generated, 1 distinct states found, 1 states left on queue."),
    envelope(2200, 0, "Progress(2): 3 states generated, 2 distinct states found, 0 states left on queue."),
    envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue."),
    envelope(2194, 0, "The depth of the complete state graph search is 2."),
    envelope(2268, 0, "The average outdegree of the complete state graph is 1 (minimum is 0, the maximum 3 and the 95th percentile is 2)."),
    envelope(2186, 0, "Finished in 272ms at (2026-07-21 09:26:25)"),
  ].join("");
}

/**
 * The invariant the synthetic counterexample reports. Taken from the model
 * map's own frozen set rather than written out here: the classifier rejects any
 * name outside that set, and a hard-coded name is exactly what went stale when
 * the election model was rewritten (#3391 class 2).
 */
const VIOLATED_INVARIANT: string = (() => {
  const [first] = VOCABULARY.namedInvariants;
  if (first === undefined) throw new Error(`${MODULE_NAME} declares no named invariants`);
  return first;
})();

/**
 * One state dump. The variable NAMES must equal the frozen trace vocabulary
 * exactly — the classifier compares the whole set — so they are projected from
 * it. The values are opaque filler: nothing asserts on them, and inventing
 * model-shaped values here would be a second place to keep in sync.
 */
function state(ordinal: number, label: string): string {
  const body = VOCABULARY.traceStateVariables
    .map((name, index) => `/\\ ${name} = ${index}`)
    .join("\n");
  return envelope(2217, 4, `${ordinal}: <${label}>\n${body}`);
}

function counterexampleOutput(auxiliaryModules: readonly string[]): string {
  return [
    lifecyclePrefix(auxiliaryModules),
    envelope(2110, 1, `Invariant ${VIOLATED_INVARIANT} is violated.`),
    envelope(2121, 1, "The behavior up to this point is:"),
    state(1, "Initial predicate"),
    state(2, "Next line 160, col 8 to line 161, col 66 of module FormalElection"),
    state(3, "Next line 170, col 8 to line 171, col 66 of module FormalElection"),
    envelope(2200, 0, "Progress(3): 3 states generated, 3 distinct states found, 0 states left on queue."),
    envelope(2199, 0, "3 states generated, 3 distinct states found, 0 states left on queue."),
    envelope(2194, 0, "The depth of the complete state graph search is 3."),
    envelope(2186, 0, "Finished in 311ms at (2026-07-21 09:26:26)"),
  ].join("");
}

function splitBytes(bytes: Uint8Array): Uint8Array[] {
  if (bytes.byteLength === 0) return [];
  const first = Math.min(37, bytes.byteLength);
  const second = Math.min(401, bytes.byteLength);
  return [bytes.slice(0, first), bytes.slice(first, second), bytes.slice(second)];
}

function flatten(chunks: readonly Uint8Array[]): number[] {
  return chunks.flatMap((chunk) => [...chunk]);
}

function createVerifiedArtifact(): VerifiedTlcArtifact {
  return Object.freeze({
    kind: "VerifiedTlcArtifact",
    descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
    actualSha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
    byteLength: 2_274_532,
    cachePath: "/synthetic/tla2tools.jar",
    receiptIdentity: identity(FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY, "artifact-receipt"),
  });
}

function createVerifiedJdk(): VerifiedJdkSnapshot {
  const javaSha = identity("synthetic-java", "jdk-entry");
  const javaVersionReceiptIdentity = identity("synthetic-java-version", "jdk-version-receipt");
  const manifest = createJdkDistributionManifest({
    vendor: "OpenJDK",
    version: "26.0.1",
    javaExecutablePath: "bin/java",
    javaExecutableSha256: javaSha,
    entries: [
      { kind: "FILE", path: "bin/java", target: null, byteLength: 10, sha256: javaSha },
      {
        kind: "FILE",
        path: "conf/security/java.security",
        target: null,
        byteLength: 20,
        sha256: identity("synthetic-security", "jdk-entry"),
      },
      {
        kind: "FILE",
        path: "lib/libjava.dylib",
        target: null,
        byteLength: 30,
        sha256: identity("synthetic-libjava", "jdk-entry"),
      },
      {
        kind: "FILE",
        path: "lib/modules",
        target: null,
        byteLength: 40,
        sha256: identity("synthetic-modules", "jdk-entry"),
      },
    ],
  });
  if (!manifest.ok) throw new Error(manifest.error.message);
  return Object.freeze({
    kind: "VerifiedJdkSnapshot",
    manifest: manifest.value,
    manifestIdentity: manifest.value.manifestIdentity,
    snapshotIdentity: createJdkSnapshotIdentity(manifest.value, javaVersionReceiptIdentity),
    javaVersionReceiptIdentity,
    snapshotRoot: JDK_ROOT,
    javaExecutablePath: manifest.value.javaExecutablePath,
    verifiedAt: "2026-07-21T09:26:20Z",
  });
}

function createVerifiedSandbox(): VerifiedSandbox {
  const receipt = createSandboxProbeReceipt({
    providerIdentity: DARWIN_SANDBOX_PROVIDER_IDENTITY,
    policyIdentity: DARWIN_NETWORK_DENY_POLICY_IDENTITY,
    checkedAt: "2026-07-21T09:26:21Z",
    probes: ["TCP_LOOPBACK", "UDP_LOOPBACK", "DNS"].map((kind, index) => ({
      kind: kind as "TCP_LOOPBACK" | "UDP_LOOPBACK" | "DNS",
      denied: true,
      exitCode: 1,
      signal: null,
      evidenceIdentity: identity({ kind, index }, "sandbox-probe"),
    })),
  });
  if (!receipt.ok) throw new Error(receipt.error.message);
  return Object.freeze({
    kind: "VerifiedSandbox",
    providerIdentity: receipt.value.providerIdentity,
    policyIdentity: receipt.value.policyIdentity,
    receiptIdentity: receipt.value.receiptIdentity,
    checkedAt: receipt.value.checkedAt,
  });
}

function rawOutcome(
  scenario: SyntheticTlcScenario,
  auxiliaryModules: readonly string[],
): RawTlcOutcome {
  const stdout = new TextEncoder().encode(
    scenario === "counterexample"
      ? counterexampleOutput(auxiliaryModules)
      : scenario === "complete"
        ? completeOutput(auxiliaryModules)
        : "",
  );
  const stderr = new Uint8Array();
  return Object.freeze({
    exitCode: scenario === "complete" ? 0 : scenario === "counterexample" ? 12 : null,
    signal: null,
    stdoutChunks: splitBytes(stdout),
    stderrChunks: [],
    stdoutIdentity: identity([...stdout], "tlc-stdout"),
    stderrIdentity: identity([...stderr], "tlc-stderr"),
    startedAtMs: 1_000,
    finishedAtMs: scenario === "timeout" ? 121_000 : scenario === "counterexample" ? 1_311 : 1_272,
    timedOut: scenario === "timeout",
    outputLimitExceeded: false,
  });
}

interface SyntheticFacade {
  facade: TlcToolchainFacade;
  calls: ToolchainCall[];
  exploration: () => TlcExploration | null;
}

/** Test-only structural adapter; it does not mint a production spawn capability. */
function createSyntheticFacade(
  scenario: SyntheticTlcScenario,
  auxiliaryModules: readonly string[],
): SyntheticFacade {
  const artifact = createVerifiedArtifact();
  const issuedPrepared = new WeakSet<PreparedTlcRun>();
  const calls: ToolchainCall[] = [];
  let observedExploration: TlcExploration | null = null;
  const facade: TlcToolchainFacade = {
    acquire: async () => {
      calls.push("acquire");
      return { ok: true, value: artifact };
    },
    verifyOffline: () => {
      calls.push("verifyOffline");
      return { ok: true, value: artifact };
    },
    prepare: async (input: TlcPrepareInput) => {
      calls.push("prepare");
      const jdk = createVerifiedJdk();
      const sandbox = createVerifiedSandbox();
      const manifest = createTlcRunManifest({
        ...input,
        jdk,
        sandbox,
        argv: [
          `${JDK_ROOT}/bin/java`,
          ...FIXED_JDK_RUN_PROFILE.jvmArgs,
          `-Djava.io.tmpdir=${RUN_ROOT}/.tlc-stdlib`,
          "-cp",
          input.artifact.cachePath,
          "tlc2.TLC",
          "-workers",
          "1",
          "-tool",
          "-config",
          input.cfgPath,
          input.modulePath,
        ],
        cwd: RUN_ROOT,
      });
      if (!manifest.ok) return manifest;
      const prepared: PreparedTlcRun = Object.freeze({
        artifact: input.artifact,
        jdk,
        sandbox,
        modelReceipt: input.modelReceipt,
        vocabulary: input.vocabulary,
        manifest: manifest.value,
        environment: {
          JAVA_HOME: JDK_ROOT,
          LANG: "en_US.UTF-8" as const,
          LC_ALL: "en_US.UTF-8" as const,
          TZ: "UTC" as const,
        },
      });
      issuedPrepared.add(prepared);
      return { ok: true, value: prepared };
    },
    run: async (prepared: PreparedTlcRun) => {
      calls.push("run");
      if (!issuedPrepared.has(prepared)) {
        return operationFailure("InvocationError", "SYNTHETIC_PREPARED_REJECTED", "prepared run was not issued by this test adapter");
      }
      return { ok: true, value: rawOutcome(scenario, auxiliaryModules) };
    },
    normalize: ({ prepared, outcome, binding }) => {
      calls.push("normalize");
      if (!issuedPrepared.has(prepared)) {
        return operationFailure("NormalizationError", "SYNTHETIC_PREPARED_REJECTED", "prepared run was not issued by this test adapter");
      }
      observedExploration = parseTlcOutput174({
        chunks: [...outcome.stdoutChunks],
        exitCode: outcome.exitCode,
        signal: outcome.signal,
        timedOut: outcome.timedOut,
        expectedModuleName: MODULE_NAME,
        expectedModulePath: prepared.manifest.modulePath,
        expectedStandardModuleDirectory: `${prepared.manifest.cwd}/.tlc-stdlib`,
        verifiedArtifactDescriptorIdentity: prepared.artifact.descriptorIdentity,
        modelReceipt: prepared.modelReceipt,
        vocabulary: prepared.vocabulary,
      });
      const normalized = parseCellResult({
        schemaVersion: 1,
        arm: "tla",
        fixtureId: binding.fixtureId,
        baselineSha: binding.baselineSha,
        armSha: binding.armSha,
        verdict: observedExploration.kind === "COMPLETE"
          ? "NOT_DETECTED"
          : observedExploration.kind === "COUNTEREXAMPLE" ? "DETECTED" : "HARNESS_ERROR",
        exitCode: outcome.exitCode,
        toolVersions: { tlc: "1.7.4" },
        seedOrBound: { workers: 1, voters: 3, choices: 3, maxInitialPerVoter: 1, maxAmendPerVoter: 1, maxHold: 1 },
        startedAt: binding.startedAt,
        finishedAt: binding.finishedAt,
        counterexampleId: observedExploration.kind === "COUNTEREXAMPLE" ? observedExploration.counterexampleIdentity : null,
        evidencePaths: [...binding.evidencePaths],
      });
      return normalized.ok
        ? normalized
        : operationFailure("NormalizationError", "SYNTHETIC_CELL_REJECTED", `${normalized.error.path}: ${normalized.error.message}`);
    },
  };
  return { facade, calls, exploration: () => observedExploration };
}

function summarizeExploration(exploration: TlcExploration | null) {
  if (exploration === null) return null;
  if (exploration.kind === "HARNESS_ERROR") return { kind: exploration.kind, reason: exploration.reason };
  if (exploration.kind === "COUNTEREXAMPLE") {
    return {
      kind: exploration.kind,
      invariant: exploration.invariant,
      traceLength: exploration.trace.length,
      generatedStates: exploration.generatedStates,
      distinctStates: exploration.distinctStates,
      statesLeftOnQueue: exploration.statesLeftOnQueue,
      searchDepth: exploration.searchDepth,
    };
  }
  return {
    kind: exploration.kind,
    generatedStates: exploration.generatedStates,
    distinctStates: exploration.distinctStates,
    statesLeftOnQueue: exploration.statesLeftOnQueue,
    searchDepth: exploration.searchDepth,
  };
}

function failedDriverResult(
  result: Result<never, TlcToolchainError>,
  calls: readonly ToolchainCall[],
  model: FrozenTlaModelBundle,
) {
  return {
    result,
    callOrder: [...calls],
    exploration: null,
    raw: { stdoutBytes: [], stderrBytes: [] },
    model: {
      modelIdentity: model.modelIdentity,
      moduleIdentity: model.moduleBytesIdentity,
      cfgIdentity: model.cfgBytesIdentity,
      moduleBytes: [...model.moduleBytes],
      cfgBytes: [...model.cfgBytes],
    },
    manifest: { runIdentity: null },
  };
}

export async function driveSyntheticTlcToolchain(scenario: SyntheticTlcScenario) {
  const model = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY });
  const modelReceipt = createFrozenTlaModelReceipt(model);
  // The transcript the fake TLC prints is derived from the receipt's own module
  // graph, so a model that grows or loses an auxiliary keeps this fixture honest
  // instead of drifting away from the classifier (#3391).
  const synthetic = createSyntheticFacade(
    scenario,
    modelReceipt.auxiliaryModules.map(({ name }) => name),
  );
  const acquired = await synthetic.facade.acquire();
  if (!acquired.ok) return failedDriverResult(acquired, synthetic.calls, model);
  const verified = synthetic.facade.verifyOffline();
  if (!verified.ok) return failedDriverResult(verified, synthetic.calls, model);
  if (verified.value.descriptorIdentity !== acquired.value.descriptorIdentity) {
    return failedDriverResult(
      operationFailure("PreparationError", "SYNTHETIC_ARTIFACT_MISMATCH", "acquired and offline artifacts differ"),
      synthetic.calls,
      model,
    );
  }
  const prepared = await synthetic.facade.prepare({
    artifact: acquired.value,
    modelReceipt,
    vocabulary: VOCABULARY,
    modulePath: MODULE_PATH,
    cfgPath: CFG_PATH,
    subjectAlias: "opaque-subject",
    deadlineMs: 120_000,
  });
  if (!prepared.ok) return failedDriverResult(prepared, synthetic.calls, model);
  const outcome = await synthetic.facade.run(prepared.value);
  if (!outcome.ok) return failedDriverResult(outcome, synthetic.calls, model);
  const binding: TlcCellBinding = {
    fixtureId: "OPAQUE_SUBJECT",
    baselineSha: identity("synthetic-baseline", "baseline"),
    armSha: identity("synthetic-tla-arm", "arm"),
    startedAt: "2026-07-21T09:26:25Z",
    finishedAt: scenario === "timeout" ? "2026-07-21T09:28:25Z" : "2026-07-21T09:26:26Z",
    evidencePaths: [],
  };
  const result: Result<CellResult, TlcToolchainError> = synthetic.facade.normalize({
    prepared: prepared.value,
    outcome: outcome.value,
    binding,
  });
  return {
    result,
    callOrder: [...synthetic.calls],
    exploration: summarizeExploration(synthetic.exploration()),
    raw: {
      stdoutBytes: flatten(outcome.value.stdoutChunks),
      stderrBytes: flatten(outcome.value.stderrChunks),
      stdoutIdentity: outcome.value.stdoutIdentity,
      stderrIdentity: outcome.value.stderrIdentity,
    },
    model: {
      modelIdentity: model.modelIdentity,
      moduleIdentity: model.moduleBytesIdentity,
      cfgIdentity: model.cfgBytesIdentity,
      moduleBytes: [...model.moduleBytes],
      cfgBytes: [...model.cfgBytes],
    },
    manifest: {
      runIdentity: prepared.value.manifest.runIdentity,
      artifactDescriptorIdentity: prepared.value.manifest.artifactDescriptorIdentity,
      modelIdentity: prepared.value.manifest.modelIdentity,
      moduleIdentity: prepared.value.manifest.moduleIdentity,
      cfgIdentity: prepared.value.manifest.cfgIdentity,
    },
  };
}

if (import.meta.main) {
  const scenario = process.argv[2];
  if (scenario !== "complete" && scenario !== "counterexample" && scenario !== "timeout") {
    process.stdout.write(`${JSON.stringify({ error: "unknown synthetic TLC scenario" })}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`${JSON.stringify(await driveSyntheticTlcToolchain(scenario))}\n`);
  }
}
