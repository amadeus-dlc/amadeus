import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../scripts/formal-verif/canonical.ts";
import { FsEvidenceStoreAdapter } from "../../scripts/formal-verif/fs-evidence-store.ts";
import type { CellEvidenceInput } from "../../scripts/formal-verif/execution-evidence.ts";

const input = (subject = "HEALTHY_BASELINE"): CellEvidenceInput => ({ revisionIdentity: "9".repeat(64), key: { arm: "tla", subject, sample: { kind: "MEASURED", runNo: 1 } }, inputSetHash: "c".repeat(64), command: { argv: ["bin/tool"], cwd: ".", environmentKeys: [], snapshotIdentity: "d".repeat(64) }, result: { schemaVersion: 1, arm: "tla", fixtureId: subject, baselineSha: "b".repeat(64), armSha: "a".repeat(64), verdict: "NOT_DETECTED", exitCode: 0, toolVersions: { tool: "1" }, seedOrBound: { bound: 1 }, startedAt: "2026-07-20T00:00:00Z", finishedAt: "2026-07-20T00:00:01Z", counterexampleId: null, evidencePaths: [] }, stdout: new Uint8Array([1, 2]), stderr: new Uint8Array([3]), timing: { processDurationMs: 1, cellElapsedMs: 2, suiteElapsedMs: 3 } });

describe("formal verification filesystem evidence store", () => {
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); }));
  const store = () => { const root = mkdtempSync(join(tmpdir(), "fv-evidence-store-")); roots.push(root); const value = new FsEvidenceStoreAdapter(root, { utcNow: () => "2026-07-20T00:00:02Z", nowMs: () => 0 }); value.reserveCapacity(input().revisionIdentity, 64 * 1024); return { root, value }; };

  test("atomically publishes and verifies one cell", async () => {
    const { value } = store();
    const published = await value.publishCell(input(), 100);
    expect(published.ok).toBe(true);
    if (published.ok) {
      const read = value.readCell(published.value.bundleId);
      expect(read.ok && read.value.receipt).toEqual(published.value);
      expect(read.ok && read.value.payloads["stdout.bin"]).toEqual(new Uint8Array([1, 2]));
    }
  });
  test("returns the same verified receipt for an identical retry", async () => { const { value } = store(); const first = await value.publishCell(input(), 100); const second = await value.publishCell(input(), 100); expect(second).toEqual(first); });
  test("chains a second distinct cell on both ledgers", async () => { const { value } = store(); const first = await value.publishCell(input(), 100); const second = await value.publishCell(input("D1"), 100); expect(first.ok && second.ok && second.value.runnerSequence).toBe(1); expect(first.ok && second.ok && first.value.runnerHead).not.toBe(second.ok && second.value.runnerHead); });
  test("rejects the same payload identity for a different cell key", async () => { const { value } = store(); const original = input(); await value.publishCell(original, 100); const result = await value.publishCell({ ...original, key: { ...original.key, subject: "D1" } }, 100); expect(!result.ok && result.error.kind).toBe("EvidenceCorruptionError"); });
  test("rejects a deadline before writing", async () => { const root = mkdtempSync(join(tmpdir(), "fv-evidence-deadline-")); roots.push(root); const value = new FsEvidenceStoreAdapter(root, { utcNow: () => "2026-07-20T00:00:02Z", nowMs: () => 100 }); expect((await value.publishCell(input(), 100)).ok).toBe(false); expect(readdirSync(root)).toEqual([]); });
  test("rejects a live writer lock", async () => { const { root, value } = store(); mkdirSync(join(root, ".writer-lock")); writeFileSync(join(root, ".writer-lock", "owner.json"), JSON.stringify({ host: "remote-live-host", pid: 1, processStartedAt: "unknown", nonce: "00000000-0000-4000-8000-000000000001", createdAt: "2026-07-20T00:00:00Z" })); const result = await value.publishCell(input(), 100); expect(!result.ok && result.error.message).toContain("writer"); });
  test("detects payload tampering on verified read", async () => { const { root, value } = store(); const published = await value.publishCell(input(), 100); if (!published.ok) throw new Error("setup"); const directory = readdirSync(join(root, "transactions"))[0]!; writeFileSync(join(root, "transactions", directory, "stdout.bin"), new Uint8Array([9])); expect(value.readCell(published.value.bundleId).ok).toBe(false); });
  test("detects runner ledger chain drift", async () => { const { root, value } = store(); const published = await value.publishCell(input(), 100); if (!published.ok) throw new Error("setup"); const path = join(root, "transactions", readdirSync(join(root, "transactions"))[0]!, "index.json"); const metadata = JSON.parse(readFileSync(path, "utf8")); metadata.runnerEntry.previousHead = "f".repeat(64); writeFileSync(path, JSON.stringify(metadata)); expect(value.readCell(published.value.bundleId).ok).toBe(false); });
  test("discards staging after a pre-rename failure and permits retry", async () => { const root = mkdtempSync(join(tmpdir(), "fv-evidence-failure-")); roots.push(root); let failed = false; const value = new FsEvidenceStoreAdapter(root, { utcNow: () => "2026-07-20T00:00:02Z", nowMs: () => 0 }, (phase) => { if (!failed && phase === "before-rename") { failed = true; throw new Error("crash"); } }); value.reserveCapacity(input().revisionIdentity, 64 * 1024); expect((await value.publishCell(input(), 100)).ok).toBe(false); expect(readdirSync(root).some((name) => name.startsWith(".staging-"))).toBe(false); expect((await value.publishCell(input(), 100)).ok).toBe(true); });
  test("recovers an idempotent receipt after post-rename response loss", async () => { const root = mkdtempSync(join(tmpdir(), "fv-evidence-response-")); roots.push(root); let failed = false; const value = new FsEvidenceStoreAdapter(root, { utcNow: () => "2026-07-20T00:00:02Z", nowMs: () => 0 }, (phase) => { if (!failed && phase === "after-rename") { failed = true; throw new Error("response lost"); } }); value.reserveCapacity(input().revisionIdentity, 64 * 1024); expect((await value.publishCell(input(), 100)).ok).toBe(false); expect((await value.publishCell(input(), 100)).ok).toBe(true); });
  test("binds, physically allocates, sums, closes, and aborts capacity", () => { const root = mkdtempSync(join(tmpdir(), "fv-evidence-capacity-")); roots.push(root); const value = new FsEvidenceStoreAdapter(root, { utcNow: () => "2026-07-20T00:00:02Z", nowMs: () => 0 }, undefined, 128); const first = "a".repeat(64); const second = "b".repeat(64); expect(value.reserveCapacity(first, 96).ok).toBe(true); expect(statSync(join(root, "reservations", `${first}.bin`)).size).toBe(96); expect(value.reserveCapacity(second, 33).ok).toBe(false); expect(value.closeCapacity(first).ok).toBe(true); expect(value.reserveCapacity(second, 128).ok).toBe(true); expect(value.abortCapacity(second).ok).toBe(true); });
  test("rejects publish without a revision-bound reservation", async () => { const root = mkdtempSync(join(tmpdir(), "fv-evidence-unreserved-")); roots.push(root); const value = new FsEvidenceStoreAdapter(root, { utcNow: () => "2026-07-20T00:00:02Z", nowMs: () => 0 }); const result = await value.publishCell(input(), 100); expect(!result.ok && result.error.message).toContain("unreserved"); });
  test("quarantines a stale owner and preserves its record", () => { const root = mkdtempSync(join(tmpdir(), "fv-evidence-stale-")); roots.push(root); mkdirSync(join(root, ".writer-lock")); writeFileSync(join(root, ".writer-lock", "owner.json"), JSON.stringify({ host: hostname(), pid: 2147483647, processStartedAt: "dead", nonce: "00000000-0000-4000-8000-000000000002", createdAt: "2026-07-20T00:00:00Z" })); const value = new FsEvidenceStoreAdapter(root, { utcNow: () => "2026-07-20T00:00:02Z", nowMs: () => 0 }); expect(value.reserveCapacity("a".repeat(64), 96).ok).toBe(true); const quarantine = join(root, ".lock-quarantine"); expect(readdirSync(quarantine)).toHaveLength(1); expect(readFileSync(join(quarantine, readdirSync(quarantine)[0]!, "owner.json"), "utf8")).toContain("00000000-0000-4000-8000-000000000002"); });
  test("recovers an ownerless lock publication crash", () => { const root = mkdtempSync(join(tmpdir(), "fv-evidence-ownerless-")); roots.push(root); mkdirSync(join(root, ".writer-lock")); const value = new FsEvidenceStoreAdapter(root, { utcNow: () => "2026-07-20T00:00:02Z", nowMs: () => 0 }); expect(value.reserveCapacity("a".repeat(64), 96).ok).toBe(true); expect(readdirSync(join(root, ".lock-quarantine"))).toHaveLength(1); expect(readdirSync(root).some((name) => name.startsWith(".writer-lock-") && name.endsWith(".staging"))).toBe(false); });
  test("fails closed without quarantining parseable malformed local owners", () => {
    const valid = { host: hostname(), pid: 2147483647, processStartedAt: "dead", nonce: "00000000-0000-4000-8000-000000000003", createdAt: "2026-07-20T00:00:00Z" };
    const invalidOwners: unknown[] = [
      { ...valid, host: "" },
      { ...valid, pid: 0 },
      { ...valid, pid: Number.MAX_SAFE_INTEGER + 1 },
      { ...valid, processStartedAt: "" },
      { ...valid, nonce: "not-a-uuid" },
      { ...valid, createdAt: "2026-02-30T00:00:00Z" },
      { ...valid, unexpected: true },
    ];
    for (const owner of invalidOwners) {
      const root = mkdtempSync(join(tmpdir(), "fv-evidence-malformed-owner-")); roots.push(root);
      mkdirSync(join(root, ".writer-lock"));
      writeFileSync(join(root, ".writer-lock", "owner.json"), JSON.stringify(owner));
      const value = new FsEvidenceStoreAdapter(root, { utcNow: () => "2026-07-20T00:00:02Z", nowMs: () => 0 });
      expect(value.reserveCapacity("a".repeat(64), 96).ok).toBe(false);
      expect(readdirSync(join(root, ".writer-lock"))).toEqual(["owner.json"]);
      expect(readdirSync(root).includes(".lock-quarantine")).toBe(false);
    }
  });
  test("returns failure when the deadline expires after durable parent sync", async () => { const root = mkdtempSync(join(tmpdir(), "fv-evidence-late-")); roots.push(root); let now = 0; const value = new FsEvidenceStoreAdapter(root, { utcNow: () => "2026-07-20T00:00:02Z", nowMs: () => now }, (phase) => { if (phase === "after-rename") now = 100; }); value.reserveCapacity(input().revisionIdentity, 64 * 1024); const result = await value.publishCell(input(), 100); expect(!result.ok && result.error.message).toContain("after durable commit"); expect(readdirSync(join(root, "transactions"))).toHaveLength(1); });
  test("detects recomputation gaps and cross-ledger binding drift", async () => { const { root, value } = store(); const published = await value.publishCell(input(), 100); if (!published.ok) throw new Error("setup"); const path = join(root, "transactions", readdirSync(join(root, "transactions"))[0]!, "index.json"); const original = JSON.parse(readFileSync(path, "utf8")); original.resultIdentity = "f".repeat(64); writeFileSync(path, JSON.stringify(original)); expect(value.readCell(published.value.bundleId).ok).toBe(false); original.resultIdentity = original.runnerEntry.linkIdentity; original.envelope.envelopeHash = "e".repeat(64); writeFileSync(path, JSON.stringify(original)); expect(value.readCell(published.value.bundleId).ok).toBe(false); original.envelope.envelopeHash = original.storeEntry.linkIdentity; original.storeEntry.cellKey = { ...original.storeEntry.cellKey, subject: "D1" }; const preimage = { sequence: original.storeEntry.sequence, previousHead: original.storeEntry.previousHead, bundleId: original.storeEntry.bundleId, cellKey: original.storeEntry.cellKey, inputSetHash: original.storeEntry.inputSetHash, linkIdentity: original.storeEntry.linkIdentity }; original.storeEntry.head = canonicalIdentity(preimage, "amadeus.formal-verif.store-ledger.v1").sha256; writeFileSync(path, JSON.stringify(original)); expect(value.readCell(published.value.bundleId).ok).toBe(false); });
});
