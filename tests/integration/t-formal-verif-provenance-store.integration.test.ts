import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { hostname } from "node:os";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FsProvenanceStoreAdapter, type DurabilityPhase, type StoreObjectKind } from "../../scripts/formal-verif/fs-provenance-store.ts";
import { createTransaction, type ProvenanceEvent } from "../../scripts/formal-verif/provenance.ts";
import { event } from "../formal-verif/support/contract-provenance-harness.ts";

function transaction(expectedHead: string | null, raw: readonly ProvenanceEvent[]) {
  return createTransaction(expectedHead, raw.map(({ transactionId: _, ...payload }) => payload));
}

function lockOwner(pid: number, nonce: string, processStart = "1970-01-01T00:00:00.000Z") {
  return { version: 1, host: hostname(), pid, processStartedAt: processStart, nonce, createdAt: new Date().toISOString() };
}

function currentProcessStart(): string {
  const output = spawnSync("ps", ["-o", "lstart=", "-p", String(process.pid)], { encoding: "utf8" }).stdout.trim();
  return new Date(Date.parse(output)).toISOString();
}

describe("formal verification provenance filesystem store", () => {
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); }));
  const store = (inject?: ConstructorParameters<typeof FsProvenanceStoreAdapter>[2]) => { const root = mkdtempSync(join(tmpdir(), "fv-store-")); roots.push(root); return { root, value: new FsProvenanceStoreAdapter(root, "default", inject) }; };
  const append = (value: FsProvenanceStoreAdapter, head: string | null, raw: readonly ProvenanceEvent[]) => { const tx = transaction(head, raw); return { tx, result: value.appendBatch(head, tx.transactionId, tx.events) }; };

  test("commits a canonical transaction and returns a content head", async () => { const { value } = store(); const { result } = append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]); expect((await result).ok).toBe(true); });
  test("looks up a committed transaction", async () => { const { value } = store(); const { tx, result } = append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]); await result; const found = await value.findTransaction(tx.transactionId); expect(found.ok && found.value).not.toBeNull(); });
  test("returns null for unknown transaction", async () => expect((await store().value.findTransaction("a".repeat(64)))).toEqual({ ok: true, value: null }));
  test("idempotently returns the same receipt", async () => { const { value } = store(); const tx = transaction(null, [event("ARM_AUTHORING_STARTED", 0, "tla")]); const first = await value.appendBatch(null, tx.transactionId, tx.events); const second = await value.appendBatch(null, tx.transactionId, tx.events); expect(second).toEqual(first); });
  test("rejects an envelope transaction mismatch", async () => { const { value } = store(); const tx = transaction(null, [event("ARM_AUTHORING_STARTED", 0, "tla")]); const events = tx.events.map((item) => ({ ...item, transactionId: "f".repeat(64) })); const result = await value.appendBatch(null, tx.transactionId, events); expect(!result.ok && result.error.kind).toBe("TransactionCorruptionError"); });
  test("rejects a transaction preimage mismatch", async () => { const { value } = store(); const tx = transaction(null, [event("ARM_AUTHORING_STARTED", 0, "tla")]); const events = tx.events.map((item) => ({ ...item, actorId: "changed" })); expect((await value.appendBatch(null, tx.transactionId, events)).ok).toBe(false); });
  test("rejects stale expected head", async () => { const { value } = store(); const first = append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]); await first.result; const stale = transaction(null, [event("ARM_FROZEN", 1, "tla")]); const result = await value.appendBatch(null, stale.transactionId, stale.events); expect(!result.ok && result.error.kind).toBe("HeadConflictError"); });
  test("accepts the current expected head", async () => { const { value } = store(); const first = await append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]).result; if (!first.ok) throw new Error("setup"); expect((await append(value, first.value.head, [event("ARM_FROZEN", 1, "tla")]).result).ok).toBe(true); });
  test("detects a corrupt immutable object on lookup", async () => { const { root, value } = store(); const { tx, result } = append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]); await result; writeFileSync(join(root, `transactions/${tx.transactionId}.json`), "{}\n"); expect((await value.findTransaction(tx.transactionId)).ok).toBe(false); });
  test("recomputes transaction identity on lookup", async () => { const { root, value } = store(); const { tx, result } = append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]); await result; const path = join(root, `transactions/${tx.transactionId}.json`); const stored = JSON.parse(readFileSync(path, "utf8")); stored.events[0].actorId = "tampered"; writeFileSync(path, `${JSON.stringify(stored)}\n`); expect((await value.findTransaction(tx.transactionId)).ok).toBe(false); });
  test("rejects mismatched event envelopes on lookup", async () => { const { root, value } = store(); const { tx, result } = append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]); await result; const path = join(root, `transactions/${tx.transactionId}.json`); const stored = JSON.parse(readFileSync(path, "utf8")); stored.events[0].transactionId = "f".repeat(64); writeFileSync(path, `${JSON.stringify(stored)}\n`); expect((await value.findTransaction(tx.transactionId)).ok).toBe(false); });
  test("writes an immutable successor on success", async () => { const { root, value } = store(); const result = await append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]).result; if (!result.ok) throw new Error("setup"); expect(readFileSync(join(root, `successors/default/${result.value.head}.json`), "utf8")).toContain("transactionId"); });
  test("rejects a successor whose body does not match its filename and transaction", async () => { const { root, value } = store(); const { tx, result } = append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]); const committed = await result; if (!committed.ok) throw new Error("setup"); writeFileSync(join(root, `successors/default/${committed.value.head}.json`), `${JSON.stringify({ head: "f".repeat(64), previousHead: null, transactionId: tx.transactionId })}\n`); expect((await value.findTransaction(tx.transactionId)).ok).toBe(false); });
  test.each([
    ["transaction", "after-write"], ["transaction", "after-file-sync"], ["transaction", "after-rename"], ["transaction", "after-directory-sync"],
    ["successor", "after-write"], ["successor", "after-file-sync"], ["successor", "after-rename"], ["successor", "after-directory-sync"],
  ] as [StoreObjectKind, DurabilityPhase][])("recovers after injected %s %s failure", async (targetKind, targetPhase) => {
    let injected = false; const { value } = store((kind, phase) => { if (!injected && kind === targetKind && phase === targetPhase) { injected = true; throw new Error("simulated-crash"); } });
    const tx = transaction(null, [event("ARM_AUTHORING_STARTED", 0, "tla")]);
    expect((await value.appendBatch(null, tx.transactionId, tx.events)).ok).toBe(false);
    expect((await value.appendBatch(null, tx.transactionId, tx.events)).ok).toBe(true);
  });
  test("rejects a complete live owner record", async () => { const { root, value } = store(); mkdirSync(join(root, "locks"), { recursive: true }); writeFileSync(join(root, "locks/default"), `${JSON.stringify(lockOwner(process.pid, "live", currentProcessStart()))}\n`); const result = await append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]).result; expect(!result.ok && result.error.message).toContain("live"); });
  test("rejects an unknown owner record", async () => { const { root, value } = store(); mkdirSync(join(root, "locks"), { recursive: true }); writeFileSync(join(root, "locks/default"), "{}\n"); const result = await append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]).result; expect(!result.ok && result.error.message).toContain("unknown"); });
  test("quarantines a complete dead owner then acquires", async () => { const { root, value } = store(); mkdirSync(join(root, "locks"), { recursive: true }); writeFileSync(join(root, "locks/default"), `${JSON.stringify(lockOwner(2147483647, "dead"))}\n`); expect((await append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]).result).ok).toBe(true); expect(existsSync(join(root, "quarantine/dead-lock-default-dead.json.receipt.json"))).toBe(true); });
  test("nonce-safe release never deletes a replacement owner", async () => { const { root, value } = store((kind, phase) => { if (kind === "transaction" && phase === "after-write") { writeFileSync(join(root, "locks/default"), `${JSON.stringify({ version: 1, pid: process.pid, nonce: "replacement", createdAt: new Date().toISOString() })}\n`); throw new Error("stop"); } }); const result = await append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]).result; expect(result.ok).toBe(false); expect(readFileSync(join(root, "locks/default"), "utf8")).toContain("replacement"); });
  test("quarantines an orphan temporary with a receipt before retry", async () => { const { root, value } = store(); mkdirSync(join(root, "transactions"), { recursive: true }); writeFileSync(join(root, "transactions/ghost.json.tmp-1"), "partial"); await append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]).result; expect(existsSync(join(root, "quarantine/ghost.json.tmp-1.orphan.receipt.json"))).toBe(true); });
  test("quarantines an orphan staged lock owner before retry", async () => { const { root, value } = store(); mkdirSync(join(root, "locks"), { recursive: true }); writeFileSync(join(root, "locks/default.tmp-owner-dead"), "partial"); await append(value, null, [event("ARM_AUTHORING_STARTED", 0, "tla")]).result; expect(existsSync(join(root, "quarantine/default.tmp-owner-dead.orphan.receipt.json"))).toBe(true); });
});
