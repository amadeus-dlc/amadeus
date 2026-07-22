import { describe, expect, test } from "bun:test";
import {
  createFrozenTlaModelReceipt,
  generateFrozenTlaModel,
} from "../../scripts/formal-verif/tla-arm.ts";
import {
  FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
  parseTlcOutput174,
} from "../../scripts/formal-verif/tlc-toolchain.ts";

const encoder = new TextEncoder();

function envelope(code: number, severity: number, payload: string): string {
  return `@!@!@STARTMSG ${code}:${severity} @!@!@\n${payload}\n@!@!@ENDMSG ${code} @!@!@\n`;
}

const lifecyclePrefix = [
  envelope(2262, 0, "TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)"),
  envelope(2187, 0, "Running breadth-first search Model-Checking with fp 92 and seed 5 with 1 worker."),
  envelope(2220, 0, "Starting SANY..."),
  [
    "Parsing file /workspace/FormalElection.tla",
    "Parsing file /fixed/Naturals.tla",
    "Parsing file /fixed/Sequences.tla",
    "Parsing file /fixed/FiniteSets.tla",
    "Parsing file /fixed/TLC.tla",
    "Semantic processing of module Naturals",
    "Semantic processing of module Sequences",
    "Semantic processing of module FiniteSets",
    "Semantic processing of module TLC",
    "Semantic processing of module FormalElection",
    "",
  ].join("\n"),
  envelope(2219, 0, "SANY finished."),
  envelope(2185, 0, "Starting... (2026-07-21 09:26:25)"),
  envelope(2189, 0, "Computing initial states..."),
  envelope(2190, 0, "Finished computing initial states: 1 distinct state generated at 2026-07-21 09:26:25."),
].join("");

const completionPayload = [
  "Model checking completed. No error has been found.",
  "  Estimates of the probability that TLC did not check all reachable states",
  "  because two distinct states had the same fingerprint:",
  "  calculated (optimistic):  val = 1.1E-19",
  "  based on the actual fingerprints:  val = 2.4E-8",
].join("\n");

const successOutput = [
  lifecyclePrefix,
  envelope(2200, 0, "Progress(1) at 2026-07-21 09:26:25: 1 states generated (60 s/min), 1 distinct states found (60 ds/min), 1 states left on queue."),
  envelope(2193, 0, completionPayload),
  envelope(2200, 0, "Progress(1): 1 states generated, 1 distinct states found, 1 states left on queue."),
  envelope(2200, 0, "Progress(2): 3 states generated, 2 distinct states found, 0 states left on queue."),
  envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue."),
  envelope(2194, 0, "The depth of the complete state graph search is 2."),
  envelope(2268, 0, "The average outdegree of the complete state graph is 1 (minimum is 0, the maximum 3 and the 95th percentile is 2)."),
  envelope(2186, 0, "Finished in 272ms at (2026-07-21 09:26:25)"),
].join("");

function state(ordinal: number, label: string, _body: string): string {
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

function counterexampleOutput(ordinals: readonly number[] = [1, 2, 3]): string {
  const states = [
    state(ordinals[0]!, "Initial predicate", "/\\ accepted = <<>>\n/\\ late = <<>>"),
    state(ordinals[1]!, "Next line 160, col 8 to line 161, col 66 of module FormalElection", "/\\ accepted = <<[voter |-> \"V1\", choice |-> \"C1\"]>>"),
    state(ordinals[2]!, "Next line 170, col 8 to line 171, col 66 of module FormalElection", "/\\ winner = \"C1\""),
  ].join("");
  return [
    lifecyclePrefix,
    envelope(2110, 1, "Invariant InvalidTimestampRejected is violated."),
    envelope(2121, 1, "The behavior up to this point is:"),
    states,
    envelope(2200, 0, "Progress(3): 3 states generated, 3 distinct states found, 0 states left on queue."),
    envelope(2199, 0, "3 states generated, 3 distinct states found, 0 states left on queue."),
    envelope(2194, 0, "The depth of the complete state graph search is 3."),
    envelope(2186, 0, "Finished in 311ms at (2026-07-21 09:26:26)"),
  ].join("");
}

const frozenModel = generateFrozenTlaModel({ publicContractIdentity: "a".repeat(64) });
const modelReceipt = createFrozenTlaModelReceipt(frozenModel);

const context = {
  expectedModuleName: "FormalElection",
  expectedModulePath: "/workspace/FormalElection.tla",
  expectedStandardModuleDirectory: "/fixed",
  verifiedArtifactDescriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
  modelReceipt,
};

function parse(
  output: string,
  outcome: { exitCode?: number | null; signal?: string | null; timedOut?: boolean } = {},
  chunks?: Uint8Array[],
) {
  return parseTlcOutput174({
    chunks: chunks ?? [encoder.encode(output)],
    exitCode: outcome.exitCode ?? 0,
    signal: outcome.signal ?? null,
    timedOut: outcome.timedOut ?? false,
    ...context,
  });
}

function expectHarnessError(
  output: string,
  outcome: { exitCode?: number | null; signal?: string | null; timedOut?: boolean } = {},
): void {
  expect(parse(output, outcome).kind).toBe("HARNESS_ERROR");
}

function withoutEnvelope(output: string, code: number): string {
  return output.replace(
    new RegExp(`@!@!@STARTMSG ${code}:\\d+ @!@!@\\n[\\s\\S]*?@!@!@ENDMSG ${code} @!@!@\\n`),
    "",
  );
}

describe("TLC 1.7.4 -tool closed output grammar", () => {
  test("requires the exact ordered SANY module transcript", () => {
    expect(parse(successOutput).kind).toBe("COMPLETE");
    expect(parseTlcOutput174({
      chunks: [encoder.encode(successOutput)],
      exitCode: 0,
      signal: null,
      timedOut: false,
      ...context,
      verifiedArtifactDescriptorIdentity: "0".repeat(64),
    }).kind).toBe("HARNESS_ERROR");
    for (const override of [
      { expectedModuleName: "OtherModule" },
      { expectedModulePath: "/workspace/OtherModule.tla" },
      { expectedStandardModuleDirectory: "relative/stdlib" },
    ]) {
      expect(parseTlcOutput174({
        chunks: [encoder.encode(successOutput)],
        exitCode: 0,
        signal: null,
        timedOut: false,
        ...context,
        ...override,
      }).kind).toBe("HARNESS_ERROR");
    }

    const missingExpectedPair = successOutput
      .replace("Parsing file /workspace/FormalElection.tla\n", "")
      .replace("Semantic processing of module FormalElection\n", "");
    const extraIntegersPair = successOutput
      .replace("Parsing file /fixed/Naturals.tla\n", "Parsing file /fixed/Integers.tla\nParsing file /fixed/Naturals.tla\n")
      .replace("Semantic processing of module Naturals\n", "Semantic processing of module Integers\nSemantic processing of module Naturals\n");
    const extraStdlibPair = successOutput
      .replace("Parsing file /fixed/Naturals.tla\n", "Parsing file /fixed/Json.tla\nParsing file /fixed/Naturals.tla\n")
      .replace("Semantic processing of module Naturals\n", "Semantic processing of module Json\nSemantic processing of module Naturals\n");
    const outOfOrder = successOutput
      .replace("Parsing file /fixed/Naturals.tla\nParsing file /fixed/Sequences.tla\n", "Parsing file /fixed/Sequences.tla\nParsing file /fixed/Naturals.tla\n");
    const duplicatePair = successOutput
      .replace("Parsing file /fixed/Naturals.tla\n", "Parsing file /fixed/Naturals.tla\nParsing file /fixed/Naturals.tla\n")
      .replace("Semantic processing of module Naturals\n", "Semantic processing of module Naturals\nSemantic processing of module Naturals\n");
    const missingStandardPair = successOutput
      .replace("Parsing file /fixed/TLC.tla\n", "")
      .replace("Semantic processing of module TLC\n", "");
    const forgedStandardOrigins = [
      "/tmp/attacker/Naturals.tla",
      "relative/Naturals.tla",
      "evil.jar!/Naturals.tla",
    ].map((path) => successOutput.replace("/fixed/Naturals.tla", path));

    for (const candidate of [missingExpectedPair, extraIntegersPair, extraStdlibPair, outOfOrder, duplicatePair, missingStandardPair, ...forgedStandardOrigins]) {
      expectHarnessError(candidate);
    }
  });

  test("binds the optional outdegree envelope to the exact TLC numeric grammar", () => {
    expect(parse(successOutput).kind).toBe("COMPLETE");
    expect(parse(withoutEnvelope(successOutput, 2268)).kind).toBe("COMPLETE");

    for (const payload of [
      "The average outdegree of the complete state graph is 1.",
      "The average outdegree of the complete state graph is -1 (minimum is 0, the maximum 3 and the 95th percentile is 2).",
      "The average outdegree of the complete state graph is 1.5 (minimum is 0, the maximum 3 and the 95th percentile is 2).",
      "The average outdegree of the complete state graph is 9007199254740992 (minimum is 0, the maximum 3 and the 95th percentile is 2).",
      "The average outdegree of the complete state graph is 1 (minimum is 0, maximum is 3 and the 95th percentile is 2).",
      "The average outdegree of the complete state graph is 1 (minimum is 0, the maximum 3 and the 95th percentile is 2). forged",
    ]) {
      expectHarnessError(successOutput.replace(
        envelope(2268, 0, "The average outdegree of the complete state graph is 1 (minimum is 0, the maximum 3 and the 95th percentile is 2)."),
        envelope(2268, 0, payload),
      ));
    }
  });

  test("accepts one fully closed successful exit-0 exploration", () => {
    expect(parse(successOutput)).toEqual({
      kind: "COMPLETE",
      generatedStates: 3,
      distinctStates: 2,
      statesLeftOnQueue: 0,
      searchDepth: 2,
      completionMarker: "Model checking completed. No error has been found.",
      terminationReason: "EXHAUSTED",
    });
    expect(parse(successOutput.replace("\n  based on the actual fingerprints:  val = 2.4E-8", ""))).toEqual(parse(successOutput));
    const commaFormattedProgress = successOutput
      .replace(
        "Progress(1): 1 states generated, 1 distinct states found, 1 states left on queue.",
        "Progress(1): 1,000 states generated, 900 distinct states found, 800 states left on queue.",
      )
      .replace(
        "Progress(2): 3 states generated, 2 distinct states found, 0 states left on queue.",
        "Progress(2): 5,203,730 states generated, 529,692 distinct states found, 0 states left on queue.",
      );
    expect(parse(commaFormattedProgress).kind).toBe("COMPLETE");
  });

  test("accepts one fully closed exit-12 named counterexample with ordered states", () => {
    const result = parse(counterexampleOutput(), { exitCode: 12 });
    expect(result).toMatchObject({
      kind: "COUNTEREXAMPLE",
      invariant: "InvalidTimestampRejected",
      sourceLocation: frozenModel.invariantSourceMap.InvalidTimestampRejected,
      generatedStates: 3,
      distinctStates: 3,
      statesLeftOnQueue: 0,
      searchDepth: 3,
      trace: [
        { ordinal: 1, label: "<Initial predicate>" },
        { ordinal: 2, label: "<Next line 160, col 8 to line 161, col 66 of module FormalElection>" },
        { ordinal: 3, label: "<Next line 170, col 8 to line 171, col 66 of module FormalElection>" },
      ],
    });
    expect((result as { counterexampleIdentity?: string }).counterexampleIdentity).toMatch(/^[0-9a-f]{64}$/);
  });

  test("is invariant to adversarial stream chunk boundaries", () => {
    const bytes = encoder.encode(successOutput);
    const oneByteChunks = Array.from(bytes, (byte) => Uint8Array.of(byte));
    expect(parse(successOutput, {}, oneByteChunks)).toEqual(parse(successOutput));

    const splitInsideStartMarker = successOutput.indexOf("STARTMSG 2193") + 6;
    expect(parse(successOutput, {}, [
      encoder.encode(successOutput.slice(0, splitInsideStartMarker)),
      encoder.encode(successOutput.slice(splitInsideStartMarker)),
    ])).toEqual(parse(successOutput));
  });

  test("rejects unknown, unpaired, nested, and illegally repeated envelopes", () => {
    const unknown = successOutput.replace(
      envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue."),
      envelope(9999, 0, "unknown") + envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue."),
    );
    const unpaired = successOutput.replace("@!@!@ENDMSG 2199 @!@!@", "@!@!@ENDMSG 2194 @!@!@");
    const nested = successOutput.replace(
      "3 states generated, 2 distinct states found, 0 states left on queue.",
      "3 states generated\n@!@!@STARTMSG 2194:0 @!@!@\nnested",
    );
    const duplicateSingleton = successOutput.replace(
      envelope(2194, 0, "The depth of the complete state graph search is 2."),
      envelope(2194, 0, "The depth of the complete state graph search is 2.").repeat(2),
    );
    const repeatedLifecycle = lifecyclePrefix + successOutput;

    for (const candidate of [unknown, unpaired, nested, duplicateSingleton, repeatedLifecycle]) {
      expectHarnessError(candidate);
    }
  });

  test("allows only strictly increasing counterexample state ordinals", () => {
    expectHarnessError(counterexampleOutput([1, 2, 2]), { exitCode: 12 });
    expectHarnessError(counterexampleOutput([1, 3, 2]), { exitCode: 12 });
    expectHarnessError(counterexampleOutput([0, 1, 2]), { exitCode: 12 });
  });

  test("rejects an initial-state violation and a one-state behavior trace", () => {
    const initialViolation = counterexampleOutput()
      .replace("STARTMSG 2110:1", "STARTMSG 2107:1")
      .replace("ENDMSG 2110", "ENDMSG 2107");
    const oneState = counterexampleOutput().replace(
      state(2, "Next line 160, col 8 to line 161, col 66 of module FormalElection", "")
        + state(3, "Next line 170, col 8 to line 171, col 66 of module FormalElection", ""),
      "",
    );
    expectHarnessError(initialViolation, { exitCode: 12 });
    expectHarnessError(oneState, { exitCode: 12 });
  });

  test("rejects every counterexample terminal-prefix cut", () => {
    const output = counterexampleOutput();
    const finalState = output.lastIndexOf("@!@!@STARTMSG 2217:4");
    const finalStateEnd = output.indexOf("@!@!@ENDMSG 2217", finalState);
    const statistics = output.indexOf("@!@!@STARTMSG 2199:0", finalState);
    const depth = output.indexOf("@!@!@STARTMSG 2194:0", statistics);
    const finished = output.indexOf("@!@!@STARTMSG 2186:0", depth);

    for (const prefix of [
      output.slice(0, finalStateEnd),
      output.slice(0, statistics),
      output.slice(0, depth),
      output.slice(0, finished),
      output.slice(0, output.length - 1),
    ]) {
      expectHarnessError(prefix, { exitCode: 12 });
    }
  });

  test("rejects semantic or progress markers after Finished and out-of-order terminals", () => {
    const progressAfterFinished = successOutput + envelope(2200, 0, "Progress(3): 3 states generated, 2 distinct states found, 0 states left on queue.");
    const successTerminal = envelope(2193, 0, completionPayload);
    const successAfterFinished = successOutput.replace(successTerminal, "") + successTerminal;
    const finalCounterState = state(3, "Next line 170, col 8 to line 171, col 66 of module FormalElection", "");
    const counterStateAfterFinished = counterexampleOutput().replace(finalCounterState, "") + finalCounterState;

    expectHarnessError(progressAfterFinished);
    expectHarnessError(successAfterFinished);
    expectHarnessError(counterStateAfterFinished, { exitCode: 12 });
  });

  test("rejects severity-3 output and plain-mode fallback markers", () => {
    const warning = successOutput.replace(
      envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue."),
      envelope(2401, 3, "Warning: throughput optimized GC is not configured")
        + envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue."),
    );
    const arbitrarySeverityThree = successOutput.replace("STARTMSG 2268:0", "STARTMSG 2268:3");
    const plainMarkers = ["Warning: fallback", "Error: fallback", "State 1: <fallback>"];
    expectHarnessError(warning);
    expectHarnessError(arbitrarySeverityThree);
    for (const marker of plainMarkers) expectHarnessError(successOutput.replace("Parsing file", `${marker}\nParsing file`));
  });

  test("rejects split, partial, duplicated, and contradictory success terminals", () => {
    const splitSuccess = successOutput.replace(
      "Model checking completed. No error has been found.",
      "Model checking completed.\nNo error has been found.",
    );
    const partialSuccess = successOutput.replace(
      "Model checking completed. No error has been found.",
      "Model checking completed. No error has been found",
    );
    const duplicateSuccess = successOutput.replace(
      envelope(2193, 0, completionPayload),
      envelope(2193, 0, completionPayload).repeat(2),
    );
    const contradictory = successOutput.replace(
      envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue."),
      envelope(2110, 1, "Invariant InvalidTimestampRejected is violated.")
        + envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue."),
    );
    const missingFingerprintBlock = successOutput.replace(`\n${completionPayload.split("\n").slice(1).join("\n")}`, "");
    const appendedFingerprintLine = successOutput.replace("  calculated (optimistic):  val = 1.1E-19", "  calculated (optimistic):  val = 1.1E-19\nforged suffix");
    const malformedActualFingerprint = successOutput.replace("  based on the actual fingerprints:  val = 2.4E-8", "based on the actual fingerprints: val = 2.4E-8");
    const duplicateActualFingerprint = successOutput.replace(
      "  based on the actual fingerprints:  val = 2.4E-8",
      "  based on the actual fingerprints:  val = 2.4E-8\n  based on the actual fingerprints:  val = 2.4E-8",
    );
    for (const candidate of [
      splitSuccess,
      partialSuccess,
      duplicateSuccess,
      contradictory,
      missingFingerprintBlock,
      appendedFingerprintLine,
      malformedActualFingerprint,
      duplicateActualFingerprint,
    ]) {
      expectHarnessError(candidate);
    }
  });

  test("rejects invalid UTF-8 and a lone carriage return", () => {
    const bytes = encoder.encode(successOutput);
    const invalidUtf8 = new Uint8Array(bytes.length + 2);
    invalidUtf8.set(bytes.subarray(0, 10));
    invalidUtf8.set([0xc3, 0x28], 10);
    invalidUtf8.set(bytes.subarray(10), 12);
    expect(parseTlcOutput174({
      chunks: [invalidUtf8],
      exitCode: 0,
      signal: null,
      timedOut: false,
      ...context,
    }).kind).toBe("HARNESS_ERROR");
    expectHarnessError(successOutput.replace("\nSemantic processing", "\rSemantic processing"));
  });

  test("rejects every unframed blank outside envelope payloads", () => {
    const statistics = envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue.");
    for (const candidate of [
      `\n${successOutput}`,
      successOutput.replace(statistics, `${statistics}\n`),
      `${successOutput}\n`,
    ]) {
      expectHarnessError(candidate);
    }
  });

  test("requires queue zero, statistics, depth, completion, and finished closure", () => {
    const queueNonZero = successOutput.replace(
      envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue."),
      envelope(2199, 0, "3 states generated, 2 distinct states found, 1 states left on queue."),
    );
    const overflow = successOutput.replace(
      envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue."),
      envelope(2199, 0, "9007199254740992 states generated, 2 distinct states found, 0 states left on queue."),
    );
    for (const candidate of [
      queueNonZero,
      overflow,
      withoutEnvelope(successOutput, 2193),
      withoutEnvelope(successOutput, 2199),
      withoutEnvelope(successOutput, 2194),
      withoutEnvelope(successOutput, 2186),
    ]) {
      expectHarnessError(candidate);
    }
  });

  test("rejects malformed progress, impossible statistics, and open trace payloads", () => {
    const malformedProgress = successOutput.replace(
      "Progress(1): 1 states generated, 1 distinct states found, 1 states left on queue.",
      "THIS IS NOT A TLC PROGRESS PAYLOAD",
    );
    const impossibleStatistics = successOutput.replace(
      "3 states generated, 2 distinct states found, 0 states left on queue.",
      "1 states generated, 2 distinct states found, 0 states left on queue.",
    );
    const forgedLabel = counterexampleOutput().replace(
      "<Next line 160, col 8 to line 161, col 66 of module FormalElection>",
      "<ForgedAction>",
    );
    const forgedBody = counterexampleOutput().replace("/\\ initialBudget =", "/\\ forged =");

    expectHarnessError(malformedProgress);
    expectHarnessError(impossibleStatistics);
    expectHarnessError(forgedLabel, { exitCode: 12 });
    expectHarnessError(forgedBody, { exitCode: 12 });
  });

  test("binds grammar to the exact process outcome", () => {
    expectHarnessError(counterexampleOutput(), { exitCode: 0 });
    expectHarnessError(successOutput, { exitCode: 12 });
    expectHarnessError(successOutput, { exitCode: 2 });
    expectHarnessError(successOutput, { exitCode: null, signal: "SIGTERM" });
    expectHarnessError(successOutput, { exitCode: null, timedOut: true });
  });

  test("rejects a counterexample whose invariant is forged into a caller-supplied receipt", () => {
    const forgedReceipt = {
      ...modelReceipt,
      invariantSourceMap: {
        ...modelReceipt.invariantSourceMap,
        ForgedInvariant: { line: 999, column: 1 },
      },
    };
    const result = parseTlcOutput174({
      chunks: [encoder.encode(counterexampleOutput().replace("InvalidTimestampRejected", "ForgedInvariant"))],
      exitCode: 12,
      signal: null,
      timedOut: false,
      expectedModuleName: "FormalElection",
      expectedModulePath: "/workspace/FormalElection.tla",
      expectedStandardModuleDirectory: "/fixed",
      verifiedArtifactDescriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
      modelReceipt: forgedReceipt,
    });
    expect(result.kind).toBe("HARNESS_ERROR");
  });
});

// ---------------------------------------------------------------------------
// Initial-state invariant violation (MSG 2107, issue #1359). TLC aborts while
// COMPUTING INITIAL STATES: no 2190/2199/2194, no behavior trace — a single
// 2107 envelope carries the message line plus one full state dump. Measured
// 2026-07-22 against the real D4 invalid-timestamp fixture (real TLC 1.7.4).
// ---------------------------------------------------------------------------
describe("initial-state invariant violation (MSG 2107, #1359)", () => {
  const initialStateBody = [
    "/\\ initialBudget = (V1 :> 1 @@ V2 :> 1 @@ V3 :> 1)",
    "/\\ amendBudget = (V1 :> 1 @@ V2 :> 1 @@ V3 :> 1)",
    "/\\ accepted = (V1 :> [choice |-> C1])",
    "/\\ holdMarkers = <<>>",
    "/\\ holdBudget = 1",
    "/\\ tally = [kind |-> \"NONE\"]",
    "/\\ reexamRequired = FALSE",
  ].join("\n");
  const prefixWithout2190 = lifecyclePrefix.replace(
    envelope(2190, 0, "Finished computing initial states: 1 distinct state generated at 2026-07-21 09:26:25."),
    "",
  );
  const initialViolationOutput = (invariant = "InvalidTimestampRejected"): string =>
    [
      prefixWithout2190,
      envelope(2107, 1, `Invariant ${invariant} is violated by the initial state:\n${initialStateBody}`),
      envelope(2186, 0, "Finished in 311ms at (2026-07-21 09:26:26)"),
    ].join("");

  test("a MSG 2107 violation is a DETECTED counterexample with a one-state trace and null statistics", () => {
    const result = parse(initialViolationOutput(), { exitCode: 12 });
    expect(result.kind).toBe("COUNTEREXAMPLE");
    if (result.kind !== "COUNTEREXAMPLE") return;
    expect(result.invariant).toBe("InvalidTimestampRejected");
    expect(result.trace).toHaveLength(1);
    expect(result.trace[0]!.label).toBe("Invariant InvalidTimestampRejected is violated by the initial state:");
    expect(result.counterexampleIdentity).toMatch(/^[0-9a-f]{64}$/);
    // TLC prints no statistics for this shape — null, never an invented count.
    expect(result.generatedStates).toBeNull();
    expect(result.distinctStates).toBeNull();
    expect(result.statesLeftOnQueue).toBeNull();
    expect(result.searchDepth).toBeNull();
  });

  test("the counterexample identity is deterministic across parses", () => {
    const first = parse(initialViolationOutput(), { exitCode: 12 });
    const second = parse(initialViolationOutput(), { exitCode: 12 });
    expect(first.kind === "COUNTEREXAMPLE" && second.kind === "COUNTEREXAMPLE" && first.counterexampleIdentity === second.counterexampleIdentity).toBe(true);
  });

  test("an invariant outside the frozen set is rejected, not detected", () => {
    expectHarnessError(initialViolationOutput("SmuggledInvariant"), { exitCode: 12 });
  });

  test("exit code other than 12 contradicts the 2107 marker", () => {
    expectHarnessError(initialViolationOutput(), { exitCode: 0 });
  });

  test("a 2107 stream carrying post-init lifecycle codes is rejected", () => {
    const withPostInit = initialViolationOutput().replace(
      envelope(2186, 0, "Finished in 311ms at (2026-07-21 09:26:26)"),
      envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue.")
        + envelope(2186, 0, "Finished in 311ms at (2026-07-21 09:26:26)"),
    );
    expectHarnessError(withPostInit, { exitCode: 12 });
  });

  test("a state dump with drifted variable order is rejected", () => {
    const drifted = initialViolationOutput().replace("/\\ reexamRequired = FALSE", "/\\ zz = FALSE");
    expectHarnessError(drifted, { exitCode: 12 });
  });
});
