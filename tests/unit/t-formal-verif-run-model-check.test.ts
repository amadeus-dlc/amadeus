import { describe, expect, test } from "bun:test";
import {
  modelCheckExitCode,
  parseRunModelCheckArgs,
  toModelCheckOutcome,
} from "../../scripts/formal-verif/index.ts";
import { runModelCheckMain } from "../../scripts/formal-verif/run-model-check.ts";

describe("run-model-check public contract", () => {
  test("parses one variable model run with the automatic provider", () => {
    expect(parseRunModelCheckArgs([
      "--model",
      "/workspace/Model.tla",
      "--cfg",
      "/workspace/Model.cfg",
      "--out",
      "/evidence/run-1",
    ])).toEqual({
      ok: true,
      value: {
        modelPath: "/workspace/Model.tla",
        cfgPath: "/workspace/Model.cfg",
        outDir: "/evidence/run-1",
        provider: "auto",
      },
    });
  });

  test("rejects missing, unknown, duplicate, and invalid provider arguments", () => {
    expect(parseRunModelCheckArgs(["--model"])).toMatchObject({
      ok: false,
      error: { kind: "MISSING_ARG" },
    });
    expect(parseRunModelCheckArgs(["--model", "a.tla"])).toMatchObject({
      ok: false,
      error: { kind: "MISSING_ARG" },
    });
    expect(parseRunModelCheckArgs(["--wat"])).toMatchObject({
      ok: false,
      error: { kind: "UNKNOWN_ARG" },
    });
    expect(parseRunModelCheckArgs([
      "--model", "a.tla", "--model", "b.tla", "--cfg", "a.cfg", "--out", "out",
    ])).toMatchObject({ ok: false, error: { kind: "UNKNOWN_ARG" } });
    expect(parseRunModelCheckArgs([
      "--model", "a.tla", "--cfg", "a.cfg", "--out", "out", "--provider", "podman",
    ])).toMatchObject({ ok: false, error: { kind: "INVALID_PROVIDER" } });
  });

  test("maps normalized exploration to the closed exit contract", () => {
    const complete = toModelCheckOutcome({
      kind: "COMPLETE",
      generatedStates: 3,
      distinctStates: 2,
      statesLeftOnQueue: 0,
      searchDepth: 2,
      completionMarker: "Model checking completed. No error has been found.",
      terminationReason: "EXHAUSTED",
    });
    const detected = toModelCheckOutcome({
      kind: "COUNTEREXAMPLE",
      invariant: "TypeOK",
      sourceLocation: { line: 1, column: 1 },
      trace: [],
      counterexampleIdentity: "a".repeat(64),
      generatedStates: 3,
      distinctStates: 3,
      statesLeftOnQueue: 0,
      searchDepth: 3,
    });
    const failed = toModelCheckOutcome({ kind: "HARNESS_ERROR", reason: "TIMEOUT", detail: "late" });

    expect([complete, detected, failed].map(modelCheckExitCode)).toEqual([0, 1, 2]);
  });

  test("drives the same minimal main seam for import and CLI execution", async () => {
    let runs = 0;
    const observed: { exitCode: number | null } = { exitCode: null };
    const dependencies = {
      run: async () => {
        runs += 1;
        return {
          exitCode: 1 as const,
          outcome: {
            kind: "DETECTED" as const,
            counterexampleIdentity: "counterexample",
          },
          publishedDirectory: "/out",
        };
      },
      setExitCode: (code: 0 | 1 | 2) => { observed.exitCode = code; },
    };

    await runModelCheckMain(false, [], dependencies);
    expect(runs).toBe(0);
    expect(observed.exitCode).toBeNull();

    await runModelCheckMain(true, ["--model"], dependencies);
    expect(runs).toBe(1);
    expect(observed.exitCode).toBe(1);
  });
});
