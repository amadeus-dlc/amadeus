import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";

const harness = resolve("tests/formal-verif/support/tla-skeleton-harness.ts");

describe("TLA invalid-timestamp skeleton spawned integration", () => {
  test("bridges U4 through U3 and commits one U1 pass without fan-out", () => {
    const spawned = Bun.spawnSync([process.execPath, harness], { cwd: resolve("."), stdout: "pipe", stderr: "pipe" });
    expect(spawned.exitCode).toBe(0);
    expect(spawned.stderr.toString()).toBe("");
    const value = JSON.parse(spawned.stdout.toString());
    expect(value).toMatchObject({ kind: "SkeletonPassDraft", terminalOutcome: "pass", recovered: false });
    expect(value.attempts.map((attempt: { runNo: number }) => attempt.runNo)).toEqual([1, 2]);
    expect(new Set(value.attempts.map((attempt: { counterexampleIdentity: string }) => attempt.counterexampleIdentity)).size).toBe(1);
    expect(new Set(value.attempts.map((attempt: { bundleId: string }) => attempt.bundleId)).size).toBe(2);
    expect(value.u4CallOrders).toEqual(Array.from({ length: 2 }, () => ["acquire", "verifyOffline", "prepare", "run", "normalize"]));
    for (const identity of [value.executionManifestIdentity, value.summaryIdentity, value.ciReceiptIdentity, value.transactionId]) expect(identity).toMatch(/^[0-9a-f]{64}$/);
  });
});
