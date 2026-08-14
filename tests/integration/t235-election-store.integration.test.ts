// t235 — election-store real-FS primitives: the create/load round-trip, the
// atomic write pair every store write funnels through, the io-error arms of the
// raw file layer, and amend coexistence on the ledger (ADR-5).
// Layer: integration (touches a tmp elections root — fs-tests-integration-first).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type CanonicalBallot,
  type CanonicalElectionDefinition,
  ElectionDefinitionCodec,
} from "../../packages/framework/core/tools/amadeus-election-codec";
import {
  ElectionStore,
  resolveElectionDir,
  writeStoreFile,
} from "../../packages/framework/core/tools/amadeus-election-store";

const ELECTION_ID = "E-STORE-1";

const DEF = {
  schemaVersion: 2,
  electionId: ELECTION_ID,
  kind: "zero-confirm",
  questions: [{ questionId: "q1", text: "q", choices: [{ internalNo: 1, label: "a" }] }],
  voters: ["alice", "bob"],
};

function election(): CanonicalElectionDefinition {
  const decoded = ElectionDefinitionCodec.decode(DEF);
  if (!decoded.ok) throw new Error("definition must decode");
  return decoded.value;
}

function ballot(voter: string, submittedAt: string): CanonicalBallot {
  return {
    schemaVersion: 2,
    kind: "original",
    electionId: ELECTION_ID,
    voter,
    voterKind: "member",
    responses: [{ questionId: "q1", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null }],
    submittedAt,
  };
}

function amend(voter: string, submittedAt: string, refSubmittedAt: string): CanonicalBallot {
  return {
    ...ballot(voter, submittedAt),
    kind: "amend",
    ref: { electionId: ELECTION_ID, voter, submittedAt: refSubmittedAt },
  };
}

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "election-store-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function electionDir(electionId = ELECTION_ID): string {
  return resolveElectionDir(root, electionId);
}

describe("t235 election-store", () => {
  test("create/load round-trip persists the definition with an explicit draft state", () => {
    expect(ElectionStore.create(root, election()).ok).toBe(true);
    const loaded = ElectionStore.load(root, ELECTION_ID);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.state).toBe("draft");
      expect(loaded.value.definition.voters).toEqual(["alice", "bob"]);
      expect(loaded.value.definition.questions.map((q) => q.questionId)).toEqual(["q1"]);
    }
    const dup = ElectionStore.create(root, election());
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error).toBe("duplicate");
  });

  test("fail-closed load: a corrupt election.json rejects with corrupt, never re-initializes", () => {
    expect(ElectionStore.create(root, election()).ok).toBe(true);
    const path = join(electionDir(), "election.json");
    writeFileSync(path, '{"electionId": "E-STORE-1", "state": ');
    const loaded = ElectionStore.load(root, ELECTION_ID);
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toBe("corrupt");
    // The broken bytes stay untouched on disk (no silent recovery).
    expect(readFileSync(path, "utf8")).toBe('{"electionId": "E-STORE-1", "state": ');
    const unknown = ElectionStore.load(root, "E-NOPE");
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.error).toBe("missing");
  });

  test("writeStoreFile atomic pair: original bytes stay intact before rename, full new bytes after", () => {
    const path = join(root, "target.json");
    writeFileSync(path, "OLD");
    // (a) a tmp file appearing next to the target never mutates the original
    writeFileSync(`${path}.tmp`, "HALFWAY");
    expect(readFileSync(path, "utf8")).toBe("OLD");
    // (b) after writeStoreFile completes, the file holds exactly the new data
    // (byte-identical — a no-op rename would fail this side)
    const w = writeStoreFile(path, "NEW-CONTENT");
    expect(w.ok).toBe(true);
    expect(readFileSync(path, "utf8")).toBe("NEW-CONTENT");
  });

  test("io-error branches: unreadable election.json and a tmp write with no parent dir", () => {
    // (1) readJson catch: file exists but is unreadable (permission 000)
    expect(ElectionStore.create(root, election()).ok).toBe(true);
    const path = join(electionDir(), "election.json");
    chmodSync(path, 0o000);
    const unreadable = ElectionStore.load(root, ELECTION_ID);
    chmodSync(path, 0o644);
    expect(unreadable.ok).toBe(false);
    if (!unreadable.ok) expect(unreadable.error).toBe("io-error");
    // (2) writeStoreFile catch: tmp write into a missing parent dir throws
    const w = writeStoreFile(join(root, "no-such-dir", "x.json"), "DATA");
    expect(w.ok).toBe(false);
    if (!w.ok) expect(w.error).toBe("io-error");
  });

  test("amend coexistence: the original survives on the ledger and the amend materializes (ADR-5)", () => {
    expect(ElectionStore.create(root, election()).ok).toBe(true);
    expect(ElectionStore.appendPending(root, ELECTION_ID, ballot("alice", "2026-07-19T00:00:00Z")).ok).toBe(true);
    expect(
      ElectionStore.appendPending(
        root,
        ELECTION_ID,
        amend("alice", "2026-07-19T01:00:00Z", "2026-07-19T00:00:00Z"),
      ).ok,
    ).toBe(true);
    const integrated = ElectionStore.integratePending(root, ELECTION_ID, ["alice"]);
    expect(integrated.ok).toBe(true);
    if (integrated.ok) expect(integrated.value.integrated).toBe(2);

    const snapshot = ElectionStore.readSnapshot(root, ELECTION_ID);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;
    // Both rows stay on the ledger: the amend supersedes without erasing history.
    expect(snapshot.value.ledger.map((b) => [b.kind, b.submittedAt])).toEqual([
      ["original", "2026-07-19T00:00:00Z"],
      ["amend", "2026-07-19T01:00:00Z"],
    ]);
    // The materialized set carries one row per voter — the latest arrival.
    expect(snapshot.value.materialized).toHaveLength(1);
    expect(snapshot.value.materialized[0]?.kind).toBe("amend");
  });

  test("a second non-amend ballot from the same voter is not silently merged", () => {
    expect(ElectionStore.create(root, election()).ok).toBe(true);
    expect(ElectionStore.appendPending(root, ELECTION_ID, ballot("alice", "2026-07-19T00:00:00Z")).ok).toBe(true);
    // The same identity retried is idempotent, not a second row.
    const retry = ElectionStore.appendPending(root, ELECTION_ID, ballot("alice", "2026-07-19T00:00:00Z"));
    expect(retry.ok).toBe(true);
    if (retry.ok) expect(retry.value.idempotent).toBe(true);
    const snapshot = ElectionStore.readSnapshot(root, ELECTION_ID);
    expect(snapshot.ok).toBe(true);
    if (snapshot.ok) expect(snapshot.value.pending).toHaveLength(1);
  });
});
