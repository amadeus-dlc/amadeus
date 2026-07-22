import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { FsProvenanceStoreAdapter, type DurabilityPhase, type StoreObjectKind } from "../../scripts/formal-verif/fs-provenance-store.ts";
import { createTransaction } from "../../scripts/formal-verif/provenance.ts";
import { event } from "../formal-verif/support/contract-provenance-harness.ts";

describe("formal verification contract provenance spawned lifecycle", () => {
  const harness = resolve("tests/formal-verif/support/contract-provenance-harness.ts");
  const run = (scenario: string) => Bun.spawnSync([process.execPath, harness, scenario], { cwd: resolve("."), stdout: "pipe", stderr: "pipe" });
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); }));
  test("happy lifecycle reaches promotion permission", () => {
    const spawned = run("happy");
    expect(spawned.exitCode).toBe(0);
    const parsed = JSON.parse(spawned.stdout.toString());
    expect(parsed.ok).toBe(true);
    expect(parsed.value.state).toBe("MANIFEST_PROMOTABLE");
    expect(parsed.value.ledgerHead).toBe("5-ARM_FROZEN");
  });
  test.each([
    ["dirty-freeze", "IsolationError"], ["private-input", "IsolationError"], ["bad-order", "TransitionError"],
    ["capacity", "CapacityError"], ["unknown-command", "CommandError"], ["unknown-scenario", "ScenarioError"],
  ])("%s fails closed as %s", (scenario, kind) => {
    const spawned = run(scenario);
    const parsed = JSON.parse(spawned.stdout.toString());
    expect(parsed.ok).toBe(false);
    expect(parsed.error.kind).toBe(kind);
  });
  test("skeleton failure is terminal", () => {
    const parsed = JSON.parse(run("skeleton-failure").stdout.toString());
    expect(parsed.ok).toBe(true);
    expect(parsed.value.state).toBe("SKELETON_FAILED");
  });
  test("same transaction retry has stable identity", () => expect(JSON.parse(run("retry").stdout.toString())).toEqual({ ok: true, same: true }));
  test("single dispatch invokes one handler", () => {
    const parsed = JSON.parse(run("single-dispatch").stdout.toString());
    expect(parsed.ok).toBe(true);
    expect(parsed.calls).toEqual(["run"]);
  });
  test("executes decode, fold, proof, handler, and durable store as one pipeline", () => { const parsed = JSON.parse(run("pipeline").stdout.toString()); expect(parsed.ok).toBe(true); expect(parsed.calls).toEqual(["request-promotion"]); expect(parsed.value.handlerIdentity).toBe("filesystem-store"); expect(parsed.value.detail).toMatch(/^[0-9a-f]{64}$/); });
  test.each([
    ["transaction", "after-write"], ["transaction", "after-file-sync"], ["transaction", "after-rename"], ["transaction", "after-directory-sync"],
    ["successor", "after-write"], ["successor", "after-file-sync"], ["successor", "after-rename"], ["successor", "after-directory-sync"],
    ["lock", "after-write"], ["lock", "after-file-sync"], ["lock", "after-rename"], ["lock", "after-directory-sync"],
  ] as [StoreObjectKind, DurabilityPhase][])("recovers after real child termination at %s %s", async (kind, phase) => {
    const root = mkdtempSync(join(tmpdir(), "fv-child-crash-")); roots.push(root);
    const child = Bun.spawnSync([process.execPath, harness, "store-crash-child", root, kind, phase], { cwd: resolve("."), stdout: "pipe", stderr: "pipe" });
    expect(child.exitCode).not.toBe(0);
    const payload = [event("ARM_AUTHORING_STARTED", 0, "tla")].map(({ transactionId: _, ...value }) => value);
    const tx = createTransaction(null, payload);
    const recovered = await new FsProvenanceStoreAdapter(root).appendBatch(null, tx.transactionId, tx.events);
    expect(recovered.ok).toBe(true);
  });
  test("recovers the committed receipt after response loss", () => { const parsed = JSON.parse(run("response-loss").stdout.toString()); expect(parsed.ok).toBe(true); expect(parsed.recoveredHead).toMatch(/^[0-9a-f]{64}$/); });
  test("ten repeated happy runs are byte deterministic", () => {
    const outputs = Array.from({ length: 10 }, () => run("happy").stdout.toString());
    expect(new Set(outputs).size).toBe(1);
  });
  test("does not create a concrete provider or final CLI side effect", () => {
    const spawned = run("happy");
    expect(spawned.stderr.toString()).toBe("");
  });
});
