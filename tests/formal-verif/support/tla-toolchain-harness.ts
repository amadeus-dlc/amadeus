import { canonicalIdentity } from "../../../scripts/formal-verif/canonical.ts";
import type { CellResult, Result } from "../../../scripts/formal-verif/contract.ts";
import {
  createFrozenTlaModelReceipt,
  generateFrozenTlaModel,
  normalizeTlcExploration,
  parseTlcOutput174,
  type FrozenTlaModelBundle,
  type TlcExploration,
} from "../../../scripts/formal-verif/tla-arm.ts";
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
  type PreparedTlcRun,
  type RawTlcOutcome,
  type TlcCellBinding,
  type TlcPrepareInput,
  type TlcToolchainError,
  type TlcToolchainFacade,
  type VerifiedJdkSnapshot,
  type VerifiedSandbox,
  type VerifiedTlcArtifact,
} from "../../../scripts/formal-verif/tlc-toolchain.ts";

export type SyntheticTlcScenario = "complete" | "counterexample" | "timeout";
type ToolchainCall = "acquire" | "verifyOffline" | "prepare" | "run" | "normalize";

const MODULE_NAME = "FormalElection";
const MODULE_PATH = "/synthetic/FormalElection.tla";
const CFG_PATH = "/synthetic/FormalElection.cfg";
const RUN_ROOT = "/synthetic";
const JDK_ROOT = "/synthetic/jdk";
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

function lifecyclePrefix(): string {
  return [
    envelope(2262, 0, "TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)"),
    envelope(2187, 0, "Running breadth-first search Model-Checking with fp 92 and seed 5 with 1 worker."),
    envelope(2220, 0, "Starting SANY..."),
    [
      `Parsing file ${MODULE_PATH}`,
      `Parsing file ${RUN_ROOT}/.tlc-stdlib/Naturals.tla`,
      `Parsing file ${RUN_ROOT}/.tlc-stdlib/Sequences.tla`,
      `Parsing file ${RUN_ROOT}/.tlc-stdlib/FiniteSets.tla`,
      `Parsing file ${RUN_ROOT}/.tlc-stdlib/TLC.tla`,
      "Semantic processing of module Naturals",
      "Semantic processing of module Sequences",
      "Semantic processing of module FiniteSets",
      "Semantic processing of module TLC",
      `Semantic processing of module ${MODULE_NAME}`,
      "",
    ].join("\n"),
    envelope(2219, 0, "SANY finished."),
    envelope(2185, 0, "Starting... (2026-07-21 09:26:25)"),
    envelope(2189, 0, "Computing initial states..."),
    envelope(2190, 0, "Finished computing initial states: 1 distinct state generated at 2026-07-21 09:26:25."),
  ].join("");
}

function completeOutput(): string {
  const completion = [
    "Model checking completed. No error has been found.",
    "  Estimates of the probability that TLC did not check all reachable states",
    "  because two distinct states had the same fingerprint:",
    "  calculated (optimistic):  val = 1.1E-19",
  ].join("\n");
  return [
    lifecyclePrefix(),
    envelope(2193, 0, completion),
    envelope(2200, 0, "Progress(1): 1 states generated, 1 distinct states found, 1 states left on queue."),
    envelope(2200, 0, "Progress(2): 3 states generated, 2 distinct states found, 0 states left on queue."),
    envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue."),
    envelope(2194, 0, "The depth of the complete state graph search is 2."),
    envelope(2268, 0, "The average outdegree of the complete state graph is 1 (minimum is 0, the maximum 3 and the 95th percentile is 2)."),
    envelope(2186, 0, "Finished in 272ms at (2026-07-21 09:26:25)"),
  ].join("");
}

function state(ordinal: number, label: string): string {
  const body = [
    "/\\ initialBudget = (V1 :> 1 @@ V2 :> 1 @@ V3 :> 1)",
    "/\\ amendBudget = (V1 :> 1 @@ V2 :> 1 @@ V3 :> 1)",
    "/\\ accepted = (V1 :> [choice |-> C1])",
    "/\\ holdMarkers = <<>>",
    "/\\ holdBudget = 1",
    "/\\ tally = [kind |-> \"NONE\"]",
    "/\\ reexamRequired = FALSE",
  ].join("\n");
  return envelope(2217, 4, `${ordinal}: <${label}>\n${body}`);
}

function counterexampleOutput(): string {
  return [
    lifecyclePrefix(),
    envelope(2110, 1, "Invariant InvalidTimestampRejected is violated."),
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

function rawOutcome(scenario: SyntheticTlcScenario): RawTlcOutcome {
  const stdout = new TextEncoder().encode(
    scenario === "counterexample" ? counterexampleOutput() : scenario === "complete" ? completeOutput() : "",
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
function createSyntheticFacade(scenario: SyntheticTlcScenario): SyntheticFacade {
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
      return { ok: true, value: rawOutcome(scenario) };
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
      });
      const normalized = normalizeTlcExploration({
        exploration: observedExploration,
        fixtureId: binding.fixtureId,
        baselineSha: binding.baselineSha,
        armSha: binding.armSha,
        exitCode: outcome.exitCode,
        startedAt: binding.startedAt,
        finishedAt: binding.finishedAt,
        evidencePaths: [...binding.evidencePaths],
      });
      return normalized.ok
        ? normalized
        : operationFailure("NormalizationError", "SYNTHETIC_CELL_REJECTED", normalized.error.message);
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
  const synthetic = createSyntheticFacade(scenario);
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
