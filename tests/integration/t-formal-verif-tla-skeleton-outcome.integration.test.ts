import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../scripts/formal-verif/canonical.ts";
import { FsProvenanceStoreAdapter } from "../../scripts/formal-verif/fs-provenance-store.ts";
import { createTransaction, foldLedger, type FoldedLedger, type FreezeProof, type ProvenanceEvent, type ProvenanceStorePort } from "../../scripts/formal-verif/provenance.ts";
import {
  TlaSkeletonCoordinator,
  commitSkeletonOutcome,
  verifySkeletonStop,
  type SkeletonFailureDraft,
} from "../../scripts/formal-verif/tla-skeleton.ts";
import { createIssuedSkeletonPrecondition } from "../formal-verif/support/tla-skeleton-preconditions.ts";

const roots: string[] = [];
const disposers: Array<() => void> = [];
const sha = (value: string) => canonicalIdentity(value, "test.formal-verif.skeleton-outcome.v1").sha256;
const at = (second: number) => `2026-07-20T00:00:0${second}Z`;

afterEach(() => {
  disposers.splice(0).forEach((dispose) => { dispose(); });
  roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); });
});

function eventBase(sequence: number) {
  return { eventId: sha(`event-${sequence}`), at: at(sequence), sequence, actorId: "actor", sessionId: "session", worktree: "integration-worktree", baseSha: sha("base"), publicInputHash: sha("public") };
}

function seedTransaction() {
  const startProof = { publicInputHash: sha("public"), actualInputManifestIdentity: sha("public"), actualInputManifestRef: "inputs/public.json", forbiddenScanReceiptIdentity: sha("scan"), forbiddenMatchCount: 0 as const, clean: true as const };
  const freezeProof: FreezeProof = { ...startProof, testsGreen: true, freezeSha: sha("freeze"), ownedPathsHash: sha("owned"), testsReceiptIdentity: sha("tests"), freezeCommitVerified: true };
  const start: Omit<Extract<ProvenanceEvent, { kind: "ARM_AUTHORING_STARTED" }>, "transactionId"> = { ...eventBase(0), kind: "ARM_AUTHORING_STARTED", arm: "tla", proof: startProof };
  const freeze: Omit<Extract<ProvenanceEvent, { kind: "ARM_FROZEN" }>, "transactionId"> = { ...eventBase(1), kind: "ARM_FROZEN", arm: "tla", proof: freezeProof };
  const reveal: Omit<Extract<ProvenanceEvent, { kind: "FIXTURE_REVEALED" }>, "transactionId"> = { ...eventBase(2), kind: "FIXTURE_REVEALED", arm: "tla", frozenEventId: sha("event-1"), disclosureHash: sha("materialized") };
  const payloads = [start, freeze, reveal];
  return createTransaction(null, payloads);
}

async function seededStore(): Promise<{ root: string; store: FsProvenanceStoreAdapter; storeHead: string; ledger: FoldedLedger }> {
  const root = mkdtempSync(join(tmpdir(), "fv-skeleton-outcome-"));
  roots.push(root);
  const store = new FsProvenanceStoreAdapter(root);
  const seed = seedTransaction();
  const committed = await store.appendBatch(null, seed.transactionId, seed.events);
  if (!committed.ok) throw new Error(committed.error.message);
  const ledger = foldLedger(seed.events);
  if (!ledger.ok) throw new Error(ledger.error.message);
  return { root, store, storeHead: committed.value.head, ledger: ledger.value };
}

// A deterministic terminal failure draft: prepare() rejects a genuine store-issued precondition whose revision does
// not match the requested one (PRECONDITION), yielding a module-issued SkeletonFailureDraft to commit. The draft is
// independent of the commit context ledger, which commitSkeletonOutcome binds separately.
async function failureDraft(): Promise<SkeletonFailureDraft> {
  const never = { execute: async () => { throw new Error("attempt port must not run"); } };
  const ci = { collect: async () => { throw new Error("CI port must not run"); } };
  const { input, dispose } = await createIssuedSkeletonPrecondition();
  disposers.push(dispose);
  const result = await new TlaSkeletonCoordinator(never, ci, { read: async () => ({ ok: true, value: input }) }).prepare(sha("mismatched-revision"));
  if (!result.ok || result.value.kind !== "SkeletonFailureDraft") throw new Error("expected deterministic failure draft");
  return result.value;
}

function context(ledger: FoldedLedger, expectedStoreHead: string) {
  return { ledger, expectedStoreHead, actorId: "actor", sessionId: "session", worktree: "integration-worktree", baseSha: sha("base"), publicInputHash: sha("public"), at: at(3), sequence: 3 };
}

describe("TLA skeleton outcome transaction", () => {
  test("atomically commits a verified terminal failure", async () => {
    const seeded = await seededStore();
    const result = await commitSkeletonOutcome(await failureDraft(), context(seeded.ledger, seeded.storeHead), seeded.store);
    expect(result.ok && result.value.outcome).toBe("fail");
    const stored = result.ok ? JSON.parse(readFileSync(join(seeded.root, `transactions/${result.value.transactionId}.json`), "utf8")) : null;
    expect(stored.events[0].kind).toBe("SKELETON_FAILED");
    const folded = foldLedger([...seeded.ledger.events, ...stored.events]);
    expect(folded.ok && folded.value).toMatchObject({ state: "SKELETON_FAILED" });
  });

  test("recovers the exact committed transaction after response loss", async () => {
    const seeded = await seededStore();
    let lost = false;
    const port: ProvenanceStorePort = {
      appendBatch: async (head, transactionId, events) => {
        const committed = await seeded.store.appendBatch(head, transactionId, events);
        if (!lost && committed.ok) { lost = true; return { ok: false, error: { kind: "CommitUnknownError", message: "response lost" } }; }
        return committed;
      },
      findTransaction: (transactionId) => seeded.store.findTransaction(transactionId),
    };
    const result = await commitSkeletonOutcome(await failureDraft(), context(seeded.ledger, seeded.storeHead), port);
    expect(result.ok && result.value.recovered).toBe(true);
  });

  test("does not turn a head conflict into a domain failure or transaction lookup", async () => {
    const seeded = await seededStore();
    let lookups = 0;
    const port: ProvenanceStorePort = {
      appendBatch: async () => ({ ok: false, error: { kind: "HeadConflictError", message: "stale head" } }),
      findTransaction: async () => { lookups++; return { ok: true, value: null }; },
    };
    const result = await commitSkeletonOutcome(await failureDraft(), context(seeded.ledger, seeded.storeHead), port);
    expect(!result.ok && result.error.operation).toBe("PROVENANCE_APPEND");
    expect(lookups).toBe(0);
  });

  test("rejects a forged failure draft before append", async () => {
    const seeded = await seededStore();
    let appends = 0;
    const port: ProvenanceStorePort = {
      appendBatch: async () => { appends++; return { ok: false, error: { kind: "CommitUnknownError", message: "unexpected" } }; },
      findTransaction: (transactionId) => seeded.store.findTransaction(transactionId),
    };
    const draft = { ...(await failureDraft()), evidenceBundleHash: sha("forged") };
    const result = await commitSkeletonOutcome(draft, context(seeded.ledger, seeded.storeHead), port);
    expect(result.ok).toBe(false);
    expect(appends).toBe(0);
  });

  test("proves an empty post-failure suffix and rejects fan-out", async () => {
    const seeded = await seededStore();
    const committed = await commitSkeletonOutcome(await failureDraft(), context(seeded.ledger, seeded.storeHead), seeded.store);
    if (!committed.ok) throw new Error(committed.error.message);
    const source = (activities: readonly { kind: "ARM_S_STARTED"; afterEventId: string; activityIdentity: string }[]) => ({ readSuffix: async () => ({ ok: true as const, value: activities }) });
    expect((await verifySkeletonStop(committed.value, source([]))).ok).toBe(true);
    const failureEventId = committed.value.eventId;
    const activity = { kind: "ARM_S_STARTED" as const, afterEventId: failureEventId, activityIdentity: sha("activity") };
    expect((await verifySkeletonStop(committed.value, source([activity]))).ok).toBe(false);
    const forgedAnchor = { ...activity, afterEventId: sha("other-failure") };
    expect((await verifySkeletonStop(committed.value, source([forgedAnchor]))).ok).toBe(false);
    expect((await verifySkeletonStop({ ...committed.value }, source([]))).ok).toBe(false);
  });

  test("keeps suffix source failures external and rejects malformed evidence", async () => {
    const seeded = await seededStore();
    const committed = await commitSkeletonOutcome(await failureDraft(), context(seeded.ledger, seeded.storeHead), seeded.store);
    if (!committed.ok) throw new Error(committed.error.message);
    const unavailable = await verifySkeletonStop(committed.value, { readSuffix: async () => ({ ok: false, error: { kind: "LookupError", message: "suffix unavailable" } }) });
    expect(!unavailable.ok && unavailable.error).toMatchObject({ operation: "PROVENANCE_LOOKUP" });
    const exploded = await verifySkeletonStop(committed.value, { readSuffix: async () => { throw new Error("suffix exploded"); } });
    expect(!exploded.ok && exploded.error).toMatchObject({ operation: "PROVENANCE_LOOKUP", message: "provenance_lookup port threw" });
    const malformed = await verifySkeletonStop(committed.value, { readSuffix: async () => ({ ok: true, value: [{ kind: "ARM_S_STARTED", afterEventId: "not-a-sha", activityIdentity: sha("activity") }] as never }) });
    expect(!malformed.ok && malformed.error).toMatchObject({ kind: "StopError", message: "stop evidence schema is invalid" });
  });
});
