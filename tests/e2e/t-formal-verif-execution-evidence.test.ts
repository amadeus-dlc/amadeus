import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";

describe("formal verification execution evidence spawned lifecycle", () => {
  const harness = resolve("tests/formal-verif/support/execution-evidence-harness.ts");
  const run = (scenario: string) => Bun.spawnSync([process.execPath, harness, scenario], { cwd: resolve("."), stdout: "pipe", stderr: "pipe" });
  test("runs one arm-neutral cell through durable verified completeness", () => { const spawned = run("happy"); expect(spawned.exitCode).toBe(0); const value = JSON.parse(spawned.stdout.toString()); expect(value.ok).toBe(true); expect(value.value.proof).toBe("CompleteSuiteProof"); expect(value.value.rawStdout).toEqual([0, 10, 255]); });
  test("fails closed on a spawned timeout", () => { const spawned = run("timeout"); const value = JSON.parse(spawned.stdout.toString()); expect(spawned.exitCode).toBe(0); expect(value.value.verdict).toBe("HARNESS_ERROR"); expect(value.value.proof).toBe("IncompleteSuiteProof"); });
  test("is byte deterministic across repeated runs", () => { const outputs = Array.from({ length: 5 }, () => run("happy").stdout.toString()); expect(new Set(outputs).size).toBe(1); });
  test("does not emit stderr or invoke a final CLI", () => expect(run("happy").stderr.toString()).toBe(""));
});
