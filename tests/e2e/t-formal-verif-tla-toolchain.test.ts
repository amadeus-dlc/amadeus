import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  findModelMapModel,
  parseTlaModelMap,
} from "../../plugins/formal-model-check/tools/tla-model-map.ts";
import {
  FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
  traceVocabularyFor,
} from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";

const expectedCallOrder = ["acquire", "verifyOffline", "prepare", "run", "normalize"];
const harness = resolve("tests/formal-verif/support/tla-toolchain-harness.ts");

/**
 * The invariant the synthetic counterexample must name. Read from the model
 * map, like the harness does, rather than written out as a literal: the
 * classifier only accepts a name inside the model's frozen set, so a literal
 * here silently rots the moment the model is rewritten — which is exactly what
 * left this file red on main (#3391 class 2).
 */
const expectedInvariant: string = (() => {
  const parsed = parseTlaModelMap(
    new Uint8Array(readFileSync(resolve("amadeus/spaces/default/specs/tla/model-map.json"))),
  );
  if (!parsed.ok) throw new Error(parsed.error.detail);
  const model = findModelMapModel(parsed.value, "FormalElection");
  if (model === undefined) throw new Error("FormalElection is not registered in the model map");
  const vocabulary = traceVocabularyFor(model);
  if (!vocabulary.ok) throw new Error(vocabulary.error.detail);
  const [first] = vocabulary.value.namedInvariants;
  if (first === undefined) throw new Error("FormalElection declares no named invariants");
  return first;
})();

function run(scenario: "complete" | "counterexample" | "timeout") {
  const spawned = Bun.spawnSync([process.execPath, harness, scenario], {
    cwd: resolve("."),
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: spawned.exitCode,
    stderr: spawned.stderr.toString(),
    stdout: spawned.stdout.toString(),
    value: JSON.parse(spawned.stdout.toString()),
  };
}

describe("formal verification TLC toolchain spawned lifecycle", () => {
  test("drives one complete model through all five explicit operations", () => {
    const completed = run("complete");

    expect(completed.exitCode).toBe(0);
    expect(completed.stderr).toBe("");
    expect(completed.value.callOrder).toEqual(expectedCallOrder);
    expect(completed.value.result).toMatchObject({
      ok: true,
      value: {
        arm: "tla",
        fixtureId: "OPAQUE_SUBJECT",
        verdict: "NOT_DETECTED",
        exitCode: 0,
        counterexampleId: null,
      },
    });
    expect(completed.value.exploration).toEqual({
      kind: "COMPLETE",
      generatedStates: 3,
      distinctStates: 2,
      statesLeftOnQueue: 0,
      searchDepth: 2,
    });
    expect(completed.value.raw.stderrBytes).toEqual([]);
    expect(completed.value.model.modelIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(completed.value.manifest.runIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(completed.value.manifest).toMatchObject({
      artifactDescriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
      modelIdentity: completed.value.model.modelIdentity,
      moduleIdentity: completed.value.model.moduleIdentity,
      cfgIdentity: completed.value.model.cfgIdentity,
    });
  });

  test("normalizes one named counterexample with at least two ordered states", () => {
    const counterexample = run("counterexample");

    expect(counterexample.exitCode).toBe(0);
    expect(counterexample.stderr).toBe("");
    expect(counterexample.value.callOrder).toEqual(expectedCallOrder);
    expect(counterexample.value.result).toMatchObject({
      ok: true,
      value: {
        verdict: "DETECTED",
        exitCode: 12,
      },
    });
    expect(counterexample.value.result.value.counterexampleId).toMatch(/^[0-9a-f]{64}$/);
    expect(counterexample.value.exploration).toMatchObject({
      kind: "COUNTEREXAMPLE",
      invariant: expectedInvariant,
      traceLength: 3,
      generatedStates: 3,
      distinctStates: 3,
    });
    expect(counterexample.value.raw.stderrBytes).toEqual([]);
  });

  test("replays the frozen model and normalized result byte-for-byte", () => {
    const first = run("complete");
    const replay = run("complete");

    expect(first.exitCode).toBe(0);
    expect(replay.exitCode).toBe(0);
    expect(replay.stdout).toBe(first.stdout);
    expect(replay.value.raw.stdoutBytes).toEqual(first.value.raw.stdoutBytes);
    expect(replay.value.model).toEqual(first.value.model);
    expect(replay.value.result).toEqual(first.value.result);
  });

  test("fails closed on timeout without skipping normalization", () => {
    const timeout = run("timeout");

    expect(timeout.exitCode).toBe(0);
    expect(timeout.stderr).toBe("");
    expect(timeout.value.callOrder).toEqual(expectedCallOrder);
    expect(timeout.value.exploration).toEqual({
      kind: "HARNESS_ERROR",
      reason: "TIMEOUT",
    });
    expect(timeout.value.result).toMatchObject({
      ok: true,
      value: {
        verdict: "HARNESS_ERROR",
        exitCode: null,
        counterexampleId: null,
      },
    });
    expect(timeout.value.raw.stderrBytes).toEqual([]);
  });
});
