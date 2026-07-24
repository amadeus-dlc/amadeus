import { join } from "node:path";
import type {
  PlannedTlcOutcome,
  PreparedPlannedTlcRun,
} from "../../../scripts/formal-verif/fs-tlc-toolchain.ts";
import {
  runModelCheck,
  runModelCheckMain,
  type PlannedModelCheckToolchain,
  type RunModelCheckDependencies,
} from "../../../scripts/formal-verif/run-model-check.ts";
import { beginModelCheckArtifacts } from "../../../scripts/formal-verif/run-model-check-artifacts.ts";
import { DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER } from "../../../scripts/formal-verif/run-model-check-execution.ts";
import { NODE_RUN_MODEL_CHECK_FILESYSTEM } from "../../../scripts/formal-verif/run-model-check-paths.ts";
import { StderrModelCheckReporter } from "../../../scripts/formal-verif/run-model-check-reporter.ts";
import type {
  EnvReceipt,
} from "../../../scripts/formal-verif/run-model-check-domain.ts";
import {
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
  type TlcExploration,
  type VerifiedTlcArtifact,
} from "../../../scripts/formal-verif/tlc-toolchain.ts";

const RUN_ID = "00000000-0000-4000-8000-000000000001";
const encoder = new TextEncoder();

function exploration(): TlcExploration {
  if (process.env.AMADEUS_MODEL_CHECK_FIXTURE_OUTCOME === "DETECTED") {
    return {
      kind: "COUNTEREXAMPLE",
      invariant: "TypeOK",
      sourceLocation: { line: 1, column: 1 },
      trace: [],
      counterexampleIdentity: "d".repeat(64),
      generatedStates: 3,
      distinctStates: 3,
      statesLeftOnQueue: 0,
      searchDepth: 3,
    };
  }
  return {
    kind: "COMPLETE",
    generatedStates: 3,
    distinctStates: 2,
    statesLeftOnQueue: 0,
    searchDepth: 2,
    completionMarker: "Model checking completed. No error has been found.",
    terminationReason: "EXHAUSTED",
  };
}

function outcome(value: TlcExploration): PlannedTlcOutcome {
  const receipt: EnvReceipt = {
    schema: "amadeus.env-receipt.v1",
    runId: RUN_ID,
    planner: "subprocess-fixture",
    inspections: [
      { id: "image-digest", status: "passed", expected: "image", observed: "image", reason: "" },
      { id: "jar-sha256", status: "passed", expected: "jar", observed: "jar", reason: "" },
      { id: "network-deny", status: "passed", expected: "none", observed: "none", reason: "" },
      { id: "jdk-snapshot", status: "not-applicable", expected: null, observed: null, reason: "fixture" },
      { id: "sandbox-profile", status: "not-applicable", expected: null, observed: null, reason: "fixture" },
    ],
  };
  return {
    exploration: value,
    environmentReceipt: receipt,
    raw: {
      exitCode: value.kind === "COMPLETE" ? 0 : 12,
      signal: null,
      stdoutChunks: [encoder.encode("fixture-tlc")],
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

function dependencies(): RunModelCheckDependencies {
  const artifact: VerifiedTlcArtifact = Object.freeze({
    kind: "VerifiedTlcArtifact",
    descriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
    actualSha256: FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256,
    byteLength: 1,
    cachePath: join(process.cwd(), ".fixture-cache", "tla2tools.jar"),
    receiptIdentity: "c".repeat(64),
  });
  const toolchain: PlannedModelCheckToolchain = {
    acquire: async () => ({ ok: true, value: artifact }),
    preparePlanned: async (input) => ({
      ok: true,
      value: {
        ...input,
        cwd: process.cwd(),
        standardModuleDirectory: join(input.scratchRoot, ".tlc-stdlib"),
        manifestArgv: [],
        environmentSnapshot: {
          kind: "DOCKER",
          plannerIdentity: "fixture",
          imageRef: "image",
          jarSha256: artifact.actualSha256,
        },
        environment: { LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8", TZ: "UTC" },
      } as PreparedPlannedTlcRun,
    }),
    runPlanned: async () => ({ ok: true, value: outcome(exploration()) }),
  };
  const failure = process.env.AMADEUS_MODEL_CHECK_FIXTURE_FAILURE;
  let publishAttempts = 0;
  return {
    randomUuid: () => RUN_ID,
    utcNow: (() => {
      let second = 0;
      return () => `2026-07-24T00:00:0${second++}.000Z`;
    })(),
    platform: "linux",
    environment: {
      inspectDarwin: async () => { throw new Error("not used"); },
      inspectDocker: async () => { throw new Error("not used"); },
    },
    filesystem: {
      ...NODE_RUN_MODEL_CHECK_FILESYSTEM,
      ...(failure === "REALPATH"
        ? { realpath: () => { throw new Error("injected realpath failure"); } }
        : {}),
      ...(failure === "CACHE_MKDIR"
        ? { mkdir: () => { throw new Error("injected cache mkdir failure"); } }
        : {}),
    },
    publisher: failure === "PUBLISHER_THROW_ONCE"
      ? {
          publish: (input) => {
            publishAttempts += 1;
            if (publishAttempts === 1) throw new Error("injected publisher failure");
            return DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER.publish(input);
          },
        }
      : DEFAULT_MODEL_CHECK_ARTIFACT_PUBLISHER,
    reserveArtifacts: beginModelCheckArtifacts,
    createToolchain: () => toolchain,
    reporter: new StderrModelCheckReporter(
      (line) => process.stderr.write(`${line}\n`),
    ),
  };
}

await runModelCheckMain(true, process.argv.slice(2), {
  run: (argv) => runModelCheck(argv, dependencies()),
  setExitCode: (exitCode) => { process.exitCode = exitCode; },
});
