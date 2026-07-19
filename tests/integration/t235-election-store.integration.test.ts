// t235 — U2 election-store real-FS tests (Bolt 1 walking-skeleton core).
// Layer: integration (touches a tmp elections root — fs-tests-integration-first).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Election, Goa } from "../../scripts/amadeus-election-model";
import { Store, writeStoreFile } from "../../scripts/amadeus-election-store";

const DEF = {
  electionId: "E-STORE-1",
  kind: "zero-confirm",
  question: "q",
  choices: [{ internalNo: 1, label: "a" }],
  voters: ["alice", "bob"],
};

function election() {
  const parsed = Election.parse(DEF);
  if (!parsed.ok) throw new Error("definition must parse");
  return parsed.value;
}

function ballot(voter: string) {
  const goa = Goa.parse(1);
  if (!goa.ok) throw new Error("goa must parse");
  return {
    kind: "original" as const,
    electionId: "E-STORE-1",
    voter,
    voterKind: "member" as const,
    choiceInternalNo: 1,
    goa: goa.value,
    reservation: null,
    rationale: null,
    submittedAt: "2026-07-19T00:00:00Z",
  };
}

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "election-store-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("t235 election-store", () => {
  test("create/load round-trip persists the definition with an explicit draft state", () => {
    expect(Store.create(root, election()).ok).toBe(true);
    const loaded = Store.load(root, "E-STORE-1");
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.state).toBe("draft");
      expect(loaded.value.election.voters).toEqual(["alice", "bob"]);
    }
    const dup = Store.create(root, election());
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error).toBe("exists");
  });

  test("appendBallot rejects a second non-amend ballot from the same voter", () => {
    expect(Store.create(root, election()).ok).toBe(true);
    expect(Store.appendBallot(root, "E-STORE-1", ballot("alice")).ok).toBe(true);
    const second = Store.appendBallot(root, "E-STORE-1", ballot("alice"));
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("duplicate");
    const status = Store.status(root, "E-STORE-1");
    expect(status.ok).toBe(true);
    if (status.ok) {
      expect(status.value.voted).toEqual(["alice"]);
      expect(status.value.pending).toEqual(["bob"]);
    }
  });

  test("fail-closed load: a corrupt election.json rejects with corrupt, never re-initializes", () => {
    expect(Store.create(root, election()).ok).toBe(true);
    const path = join(root, "E-STORE-1", "election.json");
    writeFileSync(path, '{"electionId": "E-STORE-1", "state": ');
    const loaded = Store.load(root, "E-STORE-1");
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toBe("corrupt");
    // The broken bytes stay untouched on disk (no silent recovery).
    expect(readFileSync(path, "utf8")).toBe('{"electionId": "E-STORE-1", "state": ');
    const missing = Store.load(root, "E-NOPE");
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error).toBe("not-found");
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

  test("io-error branches: unreadable file, dir-blocked create, dir-blocked materialize", () => {
    // (1) readJson catch: file exists but is unreadable (permission 000)
    expect(Store.create(root, election()).ok).toBe(true);
    const path = join(root, "E-STORE-1", "election.json");
    chmodSync(path, 0o000);
    const unreadable = Store.load(root, "E-STORE-1");
    chmodSync(path, 0o644);
    expect(unreadable.ok).toBe(false);
    if (!unreadable.ok) expect(unreadable.error).toBe("io-error");
    // (2) create catch: the election dir path is blocked by a plain file
    writeFileSync(join(root, "E-BLOCKED"), "not a dir");
    const blocked = Store.create(root, { ...election(), electionId: "E-BLOCKED" });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toBe("io-error");
    // (3) materialize catch: ballots/ path is blocked by a plain file
    writeFileSync(join(root, "E-STORE-1", "ballots"), "not a dir");
    const mat = Store.materialize(
      root,
      "E-STORE-1",
      { kind: "hold", reason: "tie", counts: { favor: 0, against: 0, abstain: 0, discuss: 0 } },
      "2026-07-19T01:00:00Z",
    );
    expect(mat.ok).toBe(false);
    if (!mat.ok) expect(mat.error).toBe("io-error");
    rmSync(join(root, "E-STORE-1", "ballots"));
    // (4) writeStoreFile catch: tmp write into a missing parent dir throws
    const w = writeStoreFile(join(root, "no-such-dir", "x.json"), "DATA");
    expect(w.ok).toBe(false);
    if (!w.ok) expect(w.error).toBe("io-error");
  });

  test("amend coexistence: the original ballot survives and both rows stay on the ledger (ADR-5)", () => {
    expect(Store.create(root, election()).ok).toBe(true);
    const original = ballot("alice");
    expect(Store.appendBallot(root, "E-STORE-1", original).ok).toBe(true);
    const amend = {
      ...ballot("alice"),
      kind: "amend" as const,
      ref: { electionId: "E-STORE-1", voter: "alice", submittedAt: original.submittedAt },
      submittedAt: "2026-07-19T00:30:00Z",
    };
    expect(Store.appendBallot(root, "E-STORE-1", amend).ok).toBe(true);
    const ledger = Store.ledger(root, "E-STORE-1");
    expect(ledger.ok).toBe(true);
    if (ledger.ok) {
      expect(ledger.value.ballots.length).toBe(2);
      expect(ledger.value.ballots[0]).toEqual(original); // original byte-identical
      expect(ledger.value.ballots[1]?.kind).toBe("amend");
    }
    // voted collapses duplicates: alice appears once
    const status = Store.status(root, "E-STORE-1");
    if (status.ok) expect(status.value.voted).toEqual(["alice"]);
  });

  test("late lane: post-tally ballots are recorded late with reexamRequired on GoA 8 (FR-3d)", () => {
    expect(Store.create(root, election()).ok).toBe(true);
    expect(Store.appendBallot(root, "E-STORE-1", ballot("alice")).ok).toBe(true);
    const result = {
      kind: "established" as const,
      outcome: "adopted" as const,
      counts: { favor: 1, against: 0, abstain: 0, discuss: 0 },
    };
    expect(Store.materialize(root, "E-STORE-1", result, "2026-07-19T01:00:00Z").ok).toBe(true);
    expect(Store.setState(root, "E-STORE-1", "tallied").ok).toBe(true);
    // bob arrives after the tally time -> late lane, no reexam (GoA 1)
    const lateBob = { ...ballot("bob"), submittedAt: "2026-07-19T02:00:00Z" };
    expect(Store.appendBallot(root, "E-STORE-1", lateBob).ok).toBe(true);
    const ledger = Store.ledger(root, "E-STORE-1");
    expect(ledger.ok).toBe(true);
    if (ledger.ok) {
      expect(ledger.value.ballots.length).toBe(1); // fixed set unchanged (BR-R2 side)
      expect(ledger.value.late.length).toBe(1);
      expect(ledger.value.late[0]?.reexamRequired).toBe(false);
    }
    // duplicate check spans the late lane: bob cannot vote again
    const again = { ...ballot("bob"), submittedAt: "2026-07-19T03:00:00Z" };
    const rejected = Store.appendBallot(root, "E-STORE-1", again);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error).toBe("duplicate");
    // a late GoA 8 persists reexamRequired
    const goa8 = Goa.parse(8);
    if (!goa8.ok) throw new Error("goa must parse");
    const wide = { ...election(), voters: ["alice", "bob", "carol"] };
    expect(Store.create(root, { ...wide, electionId: "E-LATE-8" }).ok).toBe(true);
    expect(
      Store.materialize(
        root,
        "E-LATE-8",
        { kind: "hold", reason: "tie", counts: { favor: 0, against: 0, abstain: 0, discuss: 0 } },
        "2026-07-19T01:00:00Z",
      ).ok,
    ).toBe(true);
    expect(Store.setState(root, "E-LATE-8", "hold").ok).toBe(true);
    const lateBlock = {
      ...ballot("carol"),
      electionId: "E-LATE-8",
      goa: goa8.value,
      submittedAt: "2026-07-19T02:00:00Z",
    };
    expect(Store.appendBallot(root, "E-LATE-8", lateBlock).ok).toBe(true);
    const l2 = Store.ledger(root, "E-LATE-8");
    if (l2.ok) expect(l2.value.late[0]?.reexamRequired).toBe(true);
    const timeline = JSON.parse(
      readFileSync(join(root, "E-LATE-8", "timeline.json"), "utf8"),
    );
    expect(timeline.some((e: { kind: string }) => e.kind === "late")).toBe(true);
  });

  test("materialize fixes the ballot set and books a tallied timeline event", () => {
    expect(Store.create(root, election()).ok).toBe(true);
    expect(Store.appendBallot(root, "E-STORE-1", ballot("alice")).ok).toBe(true);
    const result = {
      kind: "established" as const,
      outcome: "adopted" as const,
      counts: { favor: 1, against: 0, abstain: 0, discuss: 0 },
    };
    expect(Store.materialize(root, "E-STORE-1", result, "2026-07-19T01:00:00Z").ok).toBe(true);
    const tallyFile = JSON.parse(readFileSync(join(root, "E-STORE-1", "tally.json"), "utf8"));
    expect(tallyFile.result.kind).toBe("established");
    expect(tallyFile.ballots.length).toBe(1);
    const materialized = JSON.parse(
      readFileSync(join(root, "E-STORE-1", "ballots", "alice.json"), "utf8"),
    );
    expect(materialized.voter).toBe("alice");
    const timeline = JSON.parse(readFileSync(join(root, "E-STORE-1", "timeline.json"), "utf8"));
    expect(timeline.some((e: { kind: string }) => e.kind === "tallied")).toBe(true);
  });
});
