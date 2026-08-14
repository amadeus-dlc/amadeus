// t451 — Issue #1946: the ballot receipt stamp is the authoritative axis.
// Layer: integration (real FS via a tmp elections root; in-process CLI handlers
// so the wiring lines stay lcov-visible — seam-export-handler-amend).
//
// The defect this pins: submittedAt is voter-self-reported and compared against
// no clock, so a future-dated original outranked every genuine later amend when
// responses were resolved — a voter could make their own correction unreachable,
// and a block vote raised by amendment vanished from the tally. Ruling Q2=A
// (2026-08-05) moved the axis to the instant the CLI accepts the ballot, which
// `vote` stamps onto the ballot as receivedAt.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type CanonicalElectionDefinition,
  ElectionDefinitionCodec,
} from "../../packages/framework/core/tools/amadeus-election-codec";
import {
  nextElection,
  tallyElection,
  voteElection,
} from "../../packages/framework/core/tools/amadeus-election";
import { ElectionStore } from "../../packages/framework/core/tools/amadeus-election-store";

const ELECTION_ID = "E-RCPT1";
const HIJACK_AT = "2099-01-01T00:00:00Z";

const DEF = {
  schemaVersion: 2,
  electionId: ELECTION_ID,
  kind: "choice",
  questions: [
    {
      questionId: "q1",
      text: "どちらの案か",
      choices: [
        { internalNo: 1, label: "案1" },
        { internalNo: 2, label: "案2" },
      ],
    },
  ],
  voters: ["alice", "bob"],
};

function election(): CanonicalElectionDefinition {
  const decoded = ElectionDefinitionCodec.decode(DEF);
  if (!decoded.ok) throw new Error("definition must decode");
  return decoded.value;
}

function response(goa: number) {
  return { questionId: "q1", choiceInternalNo: 1, goa, reservation: null, rationale: null };
}

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "election-receipt-"));
  expect(ElectionStore.create(root, election()).ok).toBe(true);
  expect(ElectionStore.setState(root, ELECTION_ID, "collecting").ok).toBe(true);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("t451 election receipt stamp", () => {
  test("#1946: a future-dated original cannot discard a later amend — the block holds the tally", () => {
    // alice's original claims an instant 73 years in the future and picks
    // choice 1 in favour. It is received first.
    expect(
      voteElection(
        root,
        ELECTION_ID,
        {
          schemaVersion: 2,
          kind: "original",
          electionId: ELECTION_ID,
          voter: "alice",
          voterKind: "member",
          responses: [response(1)],
          submittedAt: HIJACK_AT,
        },
        "2026-07-19T00:01:00Z",
      ).ok,
    ).toBe(true);

    // She then amends to a GoA 8 block. Its self-reported instant is far BELOW
    // the original's, so a submittedAt axis would discard it.
    expect(
      voteElection(
        root,
        ELECTION_ID,
        {
          schemaVersion: 2,
          kind: "amend",
          electionId: ELECTION_ID,
          voter: "alice",
          voterKind: "member",
          ref: { electionId: ELECTION_ID, voter: "alice", submittedAt: HIJACK_AT },
          responses: [response(8)],
          submittedAt: "2026-07-19T00:02:00Z",
        },
        "2026-07-19T00:03:00Z",
      ).ok,
    ).toBe(true);

    expect(
      voteElection(
        root,
        ELECTION_ID,
        {
          schemaVersion: 2,
          kind: "original",
          electionId: ELECTION_ID,
          voter: "bob",
          voterKind: "member",
          responses: [response(1)],
          submittedAt: "2026-07-19T00:04:00Z",
        },
        "2026-07-19T00:05:00Z",
      ).ok,
    ).toBe(true);

    const directive = nextElection(root, ELECTION_ID);
    expect(directive.ok).toBe(true);
    if (!directive.ok || directive.value.kind !== "tally-ready") {
      throw new Error("every voter has voted, so the loop must be tally-ready");
    }
    const tallied = tallyElection(root, directive.value, "2026-07-19T01:00:00Z");
    expect(tallied.ok).toBe(true);

    // The amend's GoA 8 reached the tally: the question is held for block, not
    // established on the hijacked original's favour vote.
    const snapshot = ElectionStore.readSnapshot(root, ELECTION_ID);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;
    const result = snapshot.value.currentTally?.results[0];
    expect(result?.kind).toBe("hold");
    if (result?.kind === "hold") expect(result.reason).toBe("block");
  });

  test("#1946: every accepted ballot carries the receipt stamp and it, not submittedAt, orders the lane", () => {
    expect(
      voteElection(
        root,
        ELECTION_ID,
        {
          schemaVersion: 2,
          kind: "original",
          electionId: ELECTION_ID,
          voter: "alice",
          voterKind: "member",
          responses: [response(1)],
          submittedAt: HIJACK_AT,
        },
        "2026-07-19T00:01:00Z",
      ).ok,
    ).toBe(true);
    expect(
      voteElection(
        root,
        ELECTION_ID,
        {
          schemaVersion: 2,
          kind: "amend",
          electionId: ELECTION_ID,
          voter: "alice",
          voterKind: "member",
          ref: { electionId: ELECTION_ID, voter: "alice", submittedAt: HIJACK_AT },
          responses: [response(5)],
          submittedAt: "2026-07-19T00:02:00Z",
        },
        "2026-07-19T00:03:00Z",
      ).ok,
    ).toBe(true);

    const pending = ElectionStore.readSnapshot(root, ELECTION_ID);
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;
    // Both ballots are stamped, and the amend's stamp is at or after the
    // original's even though its claimed instant is far below.
    expect(pending.value.pending.every((b) => typeof b.receivedAt === "string")).toBe(true);
    const original = pending.value.pending.find((b) => b.kind === "original");
    const amended = pending.value.pending.find((b) => b.kind === "amend");
    expect((amended?.receivedAt ?? "") >= (original?.receivedAt ?? "")).toBe(true);

    // Integration keeps both rows but materializes the later-RECEIVED amend.
    expect(ElectionStore.integratePending(root, ELECTION_ID, ["alice"]).ok).toBe(true);
    const integrated = ElectionStore.readSnapshot(root, ELECTION_ID);
    expect(integrated.ok).toBe(true);
    if (!integrated.ok) return;
    expect(integrated.value.ledger).toHaveLength(2);
    expect(integrated.value.materialized).toHaveLength(1);
    expect(integrated.value.materialized[0]?.kind).toBe("amend");
    expect(integrated.value.materialized[0]?.responses[0]?.goa).toBe(5);
  });
});
