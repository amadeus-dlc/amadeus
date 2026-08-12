// TLC prints the variables of a counterexample state in its own internal
// UniqueString order — neither the VARIABLES declaration order nor alphabetical
// order — and prints a single-variable state as a bare `name = value` line with
// no leading `/\` conjunct. parseTrace used to require the conjunct prefix and
// a positional match against the declared tuple, so both shapes fell to
// GRAMMAR (issue #2918). The states below carry the measured shapes: `ticks = 0`
// for the one-variable model, and a print order taken from the measured
// UniqueString example (`workflowDone, artifactsComplete, verdict, ...`, which
// is neither declaration nor alphabetical order) for the three-variable model.

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createRefereeTlaModelReceipt,
  RefereeToolchainInternals,
} from "../../plugins/formal-model-check/tools/tla-referee-toolchain.ts";
import type { RefereeTlaModelReceipt } from "../../plugins/formal-model-check/tools/tla-model-receipt.ts";
import {
  FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
  parseTlcOutput174,
  type TlcExploration,
} from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";

const encoder = new TextEncoder();
const roots: string[] = [];

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

const COUNTER_MODULE = [
  "---- MODULE Counter ----",
  "EXTENDS Naturals",
  "VARIABLE ticks",
  "TypeOK == ticks \\in 0..3",
  "Init == ticks = 0",
  "Next == ticks' = IF ticks < 3 THEN ticks + 1 ELSE ticks",
  "Spec == Init /\\ [][Next]_ticks",
  "====",
  "",
].join("\n");

// The declaration order (zebra, alpha, middle) is neither alphabetical nor the
// print order used by the states below, so a positional match cannot pass.
const TRIO_MODULE = [
  "---- MODULE Trio ----",
  "EXTENDS Naturals",
  "VARIABLES zebra, alpha, middle",
  "TypeOK == zebra \\in 0..3 /\\ alpha \\in 0..3 /\\ middle \\in 0..3",
  "Init == zebra = 0 /\\ alpha = 0 /\\ middle = 0",
  "Next == /\\ zebra' = IF zebra < 3 THEN zebra + 1 ELSE zebra",
  "        /\\ alpha' = alpha",
  "        /\\ middle' = middle",
  "Spec == Init /\\ [][Next]_<<zebra, alpha, middle>>",
  "====",
  "",
].join("\n");

const CONFIG = ["SPECIFICATION Spec", "INVARIANT TypeOK", ""].join("\n");

function refereeReceipt(name: string, module: string): RefereeTlaModelReceipt {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t543-"));
  roots.push(root);
  const modulePath = join(root, `${name}.tla`);
  const configPath = join(root, `${name}.cfg`);
  writeFileSync(modulePath, module, "utf8");
  writeFileSync(configPath, CONFIG, "utf8");
  const described = RefereeToolchainInternals.describeMutant(modulePath, configPath);
  if (!described.ok) throw new Error(JSON.stringify(described.error));
  const receipt = createRefereeTlaModelReceipt(described.value.source);
  if (!receipt.ok) throw new Error(receipt.error.message);
  return receipt.value;
}

const counterReceipt = refereeReceipt("Counter", COUNTER_MODULE);
const trioReceipt = refereeReceipt("Trio", TRIO_MODULE);

function envelope(code: number, severity: number, payload: string): string {
  return `@!@!@STARTMSG ${code}:${severity} @!@!@\n${payload}\n@!@!@ENDMSG ${code} @!@!@\n`;
}

function lifecyclePrefix(name: string, withInitialStates: boolean): string {
  return [
    envelope(2262, 0, "TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)"),
    envelope(2187, 0, "Running breadth-first search Model-Checking with fp 92 and seed 5 with 1 worker."),
    envelope(2220, 0, "Starting SANY..."),
    [
      `Parsing file /workspace/${name}.tla`,
      "Parsing file /workspace/.tlc-stdlib/Naturals.tla",
      "Semantic processing of module Naturals",
      `Semantic processing of module ${name}`,
      "",
    ].join("\n"),
    envelope(2219, 0, "SANY finished."),
    envelope(2185, 0, "Starting... (2026-08-12 09:26:25)"),
    envelope(2189, 0, "Computing initial states..."),
    ...(withInitialStates
      ? [envelope(2190, 0, "Finished computing initial states: 1 distinct state generated at 2026-08-12 09:26:25.")]
      : []),
  ].join("");
}

function counterexampleOutput(name: string, states: readonly (readonly string[])[]): string {
  const traceStates = states.map((body, index) => {
    const label = index === 0
      ? "Initial predicate"
      : `Next line 6, col 9 to line 6, col 60 of module ${name}`;
    return envelope(2217, 4, [`${index + 1}: <${label}>`, ...body].join("\n"));
  }).join("");
  return [
    lifecyclePrefix(name, true),
    envelope(2110, 1, "Invariant TypeOK is violated."),
    envelope(2121, 1, "The behavior up to this point is:"),
    traceStates,
    envelope(2199, 0, "3 states generated, 3 distinct states found, 0 states left on queue."),
    envelope(2194, 0, "The depth of the complete state graph search is 2."),
    envelope(2186, 0, "Finished in 311ms at (2026-08-12 09:26:26)"),
  ].join("");
}

function initialStateOutput(name: string, body: readonly string[]): string {
  return [
    lifecyclePrefix(name, false),
    envelope(2107, 1, ["Invariant TypeOK is violated by the initial state:", ...body].join("\n")),
    envelope(2186, 0, "Finished in 311ms at (2026-08-12 09:26:26)"),
  ].join("");
}

function parse(name: string, receipt: RefereeTlaModelReceipt, output: string): TlcExploration {
  return parseTlcOutput174({
    chunks: [encoder.encode(output)],
    exitCode: 12,
    signal: null,
    timedOut: false,
    expectedModuleName: name,
    expectedModulePath: `/workspace/${name}.tla`,
    expectedStandardModuleDirectory: "/workspace/.tlc-stdlib",
    verifiedArtifactDescriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
    modelReceipt: receipt,
    vocabulary: receipt.vocabulary,
  });
}

describe("a single-variable model prints its state without a conjunct prefix", () => {
  test("the behaviour trace parses as a counterexample", () => {
    const result = parse("Counter", counterReceipt, counterexampleOutput("Counter", [
      ["ticks = 0"],
      ["ticks = 1"],
    ]));
    expect(result.kind).toBe("COUNTEREXAMPLE");
    if (result.kind !== "COUNTEREXAMPLE") return;
    expect(result.invariant).toBe("TypeOK");
    expect(result.trace.map(({ body }) => body)).toEqual([["ticks = 0"], ["ticks = 1"]]);
  });

  test("the initial-state violation parses as a counterexample", () => {
    const result = parse("Counter", counterReceipt, initialStateOutput("Counter", ["ticks = 4"]));
    expect(result.kind).toBe("COUNTEREXAMPLE");
    if (result.kind !== "COUNTEREXAMPLE") return;
    expect(result.trace).toHaveLength(1);
    expect(result.trace[0]!.body).toEqual(["ticks = 4"]);
  });

  test("a bare state line naming a variable outside the declared tuple is refused", () => {
    const result = parse("Counter", counterReceipt, counterexampleOutput("Counter", [
      ["tocks = 0"],
      ["tocks = 1"],
    ]));
    expect(result).toMatchObject({ kind: "HARNESS_ERROR", reason: "GRAMMAR" });
  });
});

describe("a multi-variable model prints its variables in TLC's internal order", () => {
  const printOrder = (zebra: number, alpha: number, middle: number) => [
    `/\\ middle = ${middle}`,
    `/\\ zebra = ${zebra}`,
    `/\\ alpha = ${alpha}`,
  ];

  test("the behaviour trace parses regardless of the print order", () => {
    const result = parse("Trio", trioReceipt, counterexampleOutput("Trio", [
      printOrder(0, 0, 0),
      printOrder(1, 0, 0),
    ]));
    expect(result.kind).toBe("COUNTEREXAMPLE");
    if (result.kind !== "COUNTEREXAMPLE") return;
    expect(result.trace).toHaveLength(2);
    expect(result.trace[0]!.body).toEqual(printOrder(0, 0, 0));
  });

  test("the initial-state violation parses regardless of the print order", () => {
    const result = parse("Trio", trioReceipt, initialStateOutput("Trio", printOrder(4, 0, 0)));
    expect(result.kind).toBe("COUNTEREXAMPLE");
  });

  test("a state missing one of the declared variables is refused", () => {
    const result = parse("Trio", trioReceipt, counterexampleOutput("Trio", [
      ["/\\ middle = 0", "/\\ zebra = 0"],
      ["/\\ middle = 0", "/\\ zebra = 1"],
    ]));
    expect(result).toMatchObject({ kind: "HARNESS_ERROR", reason: "GRAMMAR" });
  });

  test("a state repeating one variable in place of another is refused", () => {
    const result = parse("Trio", trioReceipt, counterexampleOutput("Trio", [
      ["/\\ middle = 0", "/\\ zebra = 0", "/\\ zebra = 0"],
      ["/\\ middle = 0", "/\\ zebra = 1", "/\\ zebra = 1"],
    ]));
    expect(result).toMatchObject({ kind: "HARNESS_ERROR", reason: "GRAMMAR" });
  });

  test("a state naming a variable outside the declared tuple is refused", () => {
    const result = parse("Trio", trioReceipt, counterexampleOutput("Trio", [
      ["/\\ middle = 0", "/\\ zebra = 0", "/\\ omega = 0"],
      ["/\\ middle = 0", "/\\ zebra = 1", "/\\ omega = 0"],
    ]));
    expect(result).toMatchObject({ kind: "HARNESS_ERROR", reason: "GRAMMAR" });
  });
});
