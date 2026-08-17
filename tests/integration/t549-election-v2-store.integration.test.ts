import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  CanonicalBallot,
  CanonicalElectionDefinition,
  CanonicalQuestionResult,
  CanonicalTally,
} from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import {
  electionsRegistryPath,
  ElectionStore,
  type ElectionState,
  resolveElectionDir,
} from "../../packages/framework/core/tools/amadeus-election-store.ts";

const DEFINITION: CanonicalElectionDefinition = {
  schemaVersion: 2,
  electionId: "E-V2-STORE",
  kind: "decision",
  questions: [
    {
      questionId: "q1",
      text: "First?",
      choices: [{ internalNo: 1, label: "yes" }, { internalNo: 2, label: "no" }],
    },
    {
      questionId: "q2",
      text: "Second?",
      choices: [{ internalNo: 1, label: "yes" }, { internalNo: 2, label: "no" }],
    },
  ],
  voters: ["alice", "bob"],
};

function ballot(voter: string, choice = 1): CanonicalBallot {
  return {
    schemaVersion: 2,
    kind: "original",
    electionId: DEFINITION.electionId,
    voter,
    voterKind: "member",
    responses: DEFINITION.questions.map((question) => ({
      questionId: question.questionId,
      choiceInternalNo: choice,
      goa: 1,
      reservation: null,
      rationale: null,
    })),
    submittedAt: voter === "alice" ? "2026-08-13T10:00:00Z" : "2026-08-13T10:00:01Z",
    receivedAt: voter === "alice" ? "2026-08-13T10:00:02Z" : "2026-08-13T10:00:03Z",
  };
}

function established(questionId: string, choice = 1): CanonicalQuestionResult {
  const question = DEFINITION.questions.find((candidate) => candidate.questionId === questionId);
  if (question === undefined) throw new Error("fixture question missing");
  const winner = question.choices.find((candidate) => candidate.internalNo === choice);
  if (winner === undefined) throw new Error("fixture choice missing");
  return {
    questionId,
    kind: "established",
    winner: { internalNo: winner.internalNo, label: winner.label },
    choiceCounts: question.choices.map((candidate) => ({
      internalNo: candidate.internalNo,
      label: candidate.label,
      count: candidate.internalNo === choice ? 2 : 0,
    })),
    goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
  };
}

function hold(questionId: string): CanonicalQuestionResult {
  return {
    questionId,
    kind: "hold",
    reason: "tie",
    counts: { favor: 1, against: 1, abstain: 0, discuss: 0 },
  };
}

function tally(
  runId: string,
  targetQuestionIds: readonly string[],
  results: readonly CanonicalQuestionResult[],
  preservedResultDigest: string | null,
): CanonicalTally {
  return {
    schemaVersion: 2,
    runId,
    targetQuestionIds,
    results,
    preservedResultDigest,
    talliedAt: runId === "run-1" ? "2026-08-13T11:00:00Z" : "2026-08-13T12:00:00Z",
  };
}

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "election-v2-store-"));
  expect(ElectionStore.create(root, DEFINITION).ok).toBe(true);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function electionDir(): string {
  return resolveElectionDir(root, DEFINITION.electionId);
}

function state(expected: ElectionState): void {
  const set = ElectionStore.setState(root, DEFINITION.electionId, expected);
  expect(set.ok).toBe(true);
}

describe("t549 election v2 store", () => {
  test("canonical reads distinguish missing, corrupt, and unsupported without rewriting bytes", () => {
    const electionPath = join(electionDir(), "election.json");
    const unsupported = JSON.stringify({ ...DEFINITION, schemaVersion: 99, state: "draft" });
    writeFileSync(electionPath, unsupported);
    const unsupportedRead = ElectionStore.load(root, DEFINITION.electionId);
    expect(unsupportedRead).toMatchObject({ ok: false, error: "unsupported" });
    expect(readFileSync(electionPath, "utf8")).toBe(unsupported);

    const corrupt = "{not-json";
    writeFileSync(electionPath, corrupt);
    expect(ElectionStore.load(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    expect(readFileSync(electionPath, "utf8")).toBe(corrupt);
    expect(ElectionStore.load(root, "missing")).toMatchObject({ ok: false, error: "missing" });
  });

  test("pending append is byte-idempotent, conflicts on the same identity, and does not touch ledger or state", () => {
    const ledgerPath = join(electionDir(), "ledger.json");
    const electionPath = join(electionDir(), "election.json");
    const ledgerBefore = readFileSync(ledgerPath, "utf8");
    const electionBefore = readFileSync(electionPath, "utf8");
    const first = ballot("alice");

    expect(ElectionStore.appendPending(root, DEFINITION.electionId, first).ok).toBe(true);
    const pendingPath = join(electionDir(), "pending", "alice.json");
    expect(JSON.parse(readFileSync(pendingPath, "utf8"))).toMatchObject({
      schemaVersion: 2,
      electionId: DEFINITION.electionId,
      voter: "alice",
    });
    const retry = ElectionStore.appendPending(root, DEFINITION.electionId, first);
    expect(retry).toMatchObject({ ok: true, value: { idempotent: true } });
    const conflict = ElectionStore.appendPending(root, DEFINITION.electionId, {
      ...first,
      responses: first.responses.map((response) => ({ ...response, choiceInternalNo: 2 })),
    });
    expect(conflict).toMatchObject({ ok: false, error: "duplicate" });
    const mismatched = JSON.parse(readFileSync(pendingPath, "utf8"));
    mismatched.electionId = "OTHER";
    writeFileSync(pendingPath, JSON.stringify(mismatched, null, 2));
    // ADR-5 (#3046): appendPending now reads only the CALLING voter's own
    // pending file (read set == write set), so probing this forged
    // alice.json requires calling appendPending AS alice — a "bob" call
    // would never touch alice's file and so could never observe the forgery.
    expect(ElectionStore.appendPending(root, DEFINITION.electionId, ballot("alice"))).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    mismatched.electionId = DEFINITION.electionId;
    mismatched.voter = "bob";
    writeFileSync(pendingPath, JSON.stringify(mismatched, null, 2));
    expect(ElectionStore.appendPending(root, DEFINITION.electionId, ballot("alice"))).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    expect(readFileSync(ledgerPath, "utf8")).toBe(ledgerBefore);
    expect(readFileSync(electionPath, "utf8")).toBe(electionBefore);
  });

  test("integration orders pending arrivals, materializes v2 ballots, and retries after a durable ledger write", () => {
    expect(ElectionStore.appendPending(root, DEFINITION.electionId, ballot("bob")).ok).toBe(true);
    expect(ElectionStore.appendPending(root, DEFINITION.electionId, ballot("alice")).ok).toBe(true);
    writeFileSync(join(electionDir(), "ballots"), "blocked");

    const failed = ElectionStore.integratePending(root, DEFINITION.electionId, ["alice", "bob"]);
    expect(failed).toMatchObject({ ok: false, error: "io-error" });
    expect(existsSync(join(electionDir(), "pending", "alice.json"))).toBe(true);
    const durableLedger = JSON.parse(readFileSync(join(electionDir(), "ledger.json"), "utf8"));
    // ADR-5 (#3046): arrivalSequence is now scoped per voter, so bob's and
    // alice's first-ever ballots both land arrivalSequence 0 (each is the
    // first entry in its own file) rather than a globally incrementing
    // counter tied to call order. The tie is broken by the shared
    // (arrivalSequence, voter) lexicographic order, so alice sorts before
    // bob even though bob's appendPending call happened first.
    expect(durableLedger.ballots.map((entry: CanonicalBallot) => entry.voter)).toEqual(["alice", "bob"]);

    rmSync(join(electionDir(), "ballots"));
    const repaired = ElectionStore.integratePending(root, DEFINITION.electionId, ["alice", "bob"]);
    expect(repaired).toMatchObject({ ok: true });
    expect(existsSync(join(electionDir(), "pending"))).toBe(false);
    const ledger = JSON.parse(readFileSync(join(electionDir(), "ledger.json"), "utf8"));
    expect(ledger.ballots).toHaveLength(2);
    expect(JSON.parse(readFileSync(join(electionDir(), "ballots", "alice.json"), "utf8"))).toMatchObject({
      schemaVersion: 2,
      voter: "alice",
    });
  });

  test("same-run retry repairs missing steps, while different bytes conflict and timeline deduplicates", () => {
    state("collecting");
    const first = tally("run-1", ["q1", "q2"], [established("q1"), hold("q2")], null);
    rmSync(join(electionDir(), "timeline.json"));
    mkdirSync(join(electionDir(), "timeline.json"), { recursive: false });
    const failed = ElectionStore.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    });
    expect(failed).toMatchObject({
      ok: false,
      error: "io-error",
      durable: ["history", "current", "state", "registry"],
    });
    expect(existsSync(join(electionDir(), "tallies", "run-1.json"))).toBe(true);

    rmSync(join(electionDir(), "timeline.json"), { recursive: true });
    writeFileSync(join(electionDir(), "timeline.json"), "[]");
    const repaired = ElectionStore.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    });
    expect(repaired).toMatchObject({ ok: true, value: { repaired: true } });
    expect(ElectionStore.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    }).ok).toBe(true);
    const timeline = JSON.parse(readFileSync(join(electionDir(), "timeline.json"), "utf8"));
    expect(timeline.filter((event: { runId?: string }) => event.runId === "run-1")).toHaveLength(1);

    const conflicting = { ...first, talliedAt: "2026-08-13T11:00:01Z" };
    expect(ElectionStore.commitTally(root, DEFINITION.electionId, conflicting, {
      expectedState: "collecting",
      nextState: "partial",
    })).toMatchObject({ ok: false, error: "run-conflict" });
  });

  test("same-run retry advances when history is durable but current was not written", () => {
    state("collecting");
    const first = tally("run-1", ["q1", "q2"], [established("q1"), hold("q2")], null);
    mkdirSync(join(electionDir(), "tally.json.tmp"));
    const failed = ElectionStore.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    });
    expect(failed).toMatchObject({ ok: false, error: "io-error", durable: ["history"] });
    rmSync(join(electionDir(), "tally.json.tmp"), { recursive: true });

    const repaired = ElectionStore.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    });
    expect(repaired).toMatchObject({ ok: true, value: { repaired: true } });
    expect(ElectionStore.verify(root, DEFINITION.electionId).ok).toBe(true);
  });

  test("file-backed voter and run identifiers reject path traversal", () => {
    const escapedBallot = { ...ballot("alice"), voter: "../escape" };
    expect(ElectionStore.appendPending(root, DEFINITION.electionId, escapedBallot)).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    const escapedRun = tally("../escape", ["q1", "q2"], [established("q1"), hold("q2")], null);
    expect(ElectionStore.commitTally(root, DEFINITION.electionId, escapedRun, {
      expectedState: "draft",
      nextState: "partial",
    })).toMatchObject({ ok: false, error: "corrupt", durable: [] });
    expect(existsSync(join(electionDir(), "escape.json"))).toBe(false);
  });

  test("a mixed partial tally can be followed by a hold-only run with preserved established results", () => {
    state("collecting");
    const first = tally("run-1", ["q1", "q2"], [established("q1"), hold("q2")], null);
    expect(ElectionStore.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    }).ok).toBe(true);
    const digest = ElectionStore.establishedResultsDigest(root, DEFINITION.electionId, first);
    if (!digest.ok) throw new Error("fixture digest must succeed");
    const followUp = tally(
      "run-2",
      ["q2"],
      [established("q1"), established("q2", 2)],
      digest.value,
    );
    expect(ElectionStore.commitTally(root, DEFINITION.electionId, followUp, {
      expectedState: "partial",
      nextState: "tallied",
    }).ok).toBe(true);
    const history = ElectionStore.readTallyHistory(root, DEFINITION.electionId);
    expect(history).toMatchObject({ ok: true });
    if (history.ok) expect(history.value.map((entry) => entry.runId)).toEqual(["run-1", "run-2"]);
    expect(ElectionStore.verify(root, DEFINITION.electionId).ok).toBe(true);
  });

  test("a run that would not sort last in history is rejected before any durable write", () => {
    state("collecting");
    const first = tally("run-1", ["q1", "q2"], [established("q1"), hold("q2")], null);
    expect(ElectionStore.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    }).ok).toBe(true);
    const digest = ElectionStore.establishedResultsDigest(root, DEFINITION.electionId, first);
    if (!digest.ok) throw new Error("fixture digest must succeed");
    const followUp = tally("run-2", ["q2"], [established("q1"), established("q2", 2)], digest.value);

    const older = { ...followUp, talliedAt: "2026-08-13T10:00:00Z" };
    expect(ElectionStore.commitTally(root, DEFINITION.electionId, older, {
      expectedState: "partial",
      nextState: "tallied",
    })).toMatchObject({ ok: false, error: "tally-order-conflict", durable: [] });
    expect(existsSync(join(electionDir(), "tallies", "run-2.json"))).toBe(false);

    const tied = { ...followUp, runId: "run-0", talliedAt: first.talliedAt };
    expect(ElectionStore.commitTally(root, DEFINITION.electionId, tied, {
      expectedState: "partial",
      nextState: "tallied",
    })).toMatchObject({ ok: false, error: "tally-order-conflict", durable: [] });
    expect(existsSync(join(electionDir(), "tallies", "run-0.json"))).toBe(false);

    expect(ElectionStore.commitTally(root, DEFINITION.electionId, followUp, {
      expectedState: "partial",
      nextState: "tallied",
    }).ok).toBe(true);
    expect(ElectionStore.verify(root, DEFINITION.electionId).ok).toBe(true);
  });

  test("corrupt inputs and registry/state or history/current drift fail closed without repair", () => {
    state("collecting");
    const first = tally("run-1", ["q1", "q2"], [established("q1"), hold("q2")], null);
    expect(ElectionStore.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    }).ok).toBe(true);
    const currentPath = join(electionDir(), "tally.json");
    const before = readFileSync(currentPath, "utf8");
    writeFileSync(currentPath, JSON.stringify({ ...first, runId: "other" }));
    const drifted = readFileSync(currentPath, "utf8");
    expect(ElectionStore.verify(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "history-mismatch",
    });
    expect(readFileSync(currentPath, "utf8")).toBe(drifted);

    writeFileSync(currentPath, before);
    rmSync(join(electionDir(), "tallies"), { recursive: true });
    expect(ElectionStore.verify(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "history-mismatch",
    });
    mkdirSync(join(electionDir(), "tallies"));
    writeFileSync(join(electionDir(), "tallies", "run-1.json"), before);
    const registry = JSON.parse(readFileSync(electionsRegistryPath(root), "utf8"));
    registry[0].status = "open";
    writeFileSync(electionsRegistryPath(root), JSON.stringify(registry, null, 2));
    expect(ElectionStore.load(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "registry-mismatch",
    });
  });

  test("remaining store failure arms stay fail-closed", () => {
    expect(ElectionStore.create(root, { ...DEFINITION, electionId: "../escape" })).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    expect(ElectionStore.create(root, DEFINITION)).toMatchObject({
      ok: false,
      error: "duplicate",
    });
    expect(ElectionStore.integratePending(root, DEFINITION.electionId, ["alice", "alice"])).toMatchObject({
      ok: false,
      error: "duplicate",
    });
    expect(ElectionStore.integratePending(root, DEFINITION.electionId, ["../escape"])).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    writeFileSync(join(electionDir(), "tally.json"), JSON.stringify({ schemaVersion: 2, runId: 1 }));
    expect(ElectionStore.readSnapshot(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    rmSync(join(electionDir(), "tally.json"));
    const electionJson = join(electionDir(), "election.json");
    mkdirSync(`${electionJson}.tmp`);
    expect(ElectionStore.setState(root, DEFINITION.electionId, "open")).toMatchObject({
      ok: false,
      error: "io-error",
    });
    rmSync(`${electionJson}.tmp`, { recursive: true });

    const registry = JSON.parse(readFileSync(electionsRegistryPath(root), "utf8"));
    const originalDirName = registry[0].dirName;
    registry[0].dirName = "../escape";
    writeFileSync(electionsRegistryPath(root), JSON.stringify(registry, null, 2));
    expect(ElectionStore.load(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    registry[0].dirName = originalDirName;
    writeFileSync(electionsRegistryPath(root), JSON.stringify(registry, null, 2));

    writeFileSync(join(electionDir(), "ledger.json"), JSON.stringify({
      schemaVersion: 3,
      ballots: [],
    }));
    expect(ElectionStore.readSnapshot(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "unsupported",
    });
    writeFileSync(join(electionDir(), "ledger.json"), JSON.stringify({ schemaVersion: 2, ballots: [] }, null, 2));

    mkdirSync(join(electionDir(), "pending"));
    writeFileSync(join(electionDir(), "pending", "alice.json"), JSON.stringify({
      schemaVersion: 2,
      electionId: DEFINITION.electionId,
      voter: "alice",
      events: [{ arrivalSequence: -1, ballot: ballot("alice") }],
    }));
    // ADR-5 (#3046): probe as alice — appendPending only reads the calling
    // voter's own file, so this negative-sequence forgery in alice.json is
    // only observable when alice herself appends.
    expect(ElectionStore.appendPending(root, DEFINITION.electionId, ballot("alice"))).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    rmSync(join(electionDir(), "pending"), { recursive: true });
    writeFileSync(join(electionDir(), "pending"), "not-a-directory");
    expect(ElectionStore.appendPending(root, DEFINITION.electionId, ballot("alice"))).toMatchObject({
      ok: false,
      error: "io-error",
    });
    rmSync(join(electionDir(), "pending"));

    writeFileSync(join(electionDir(), "tallies"), "not-a-directory");
    expect(ElectionStore.readTallyHistory(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "io-error",
    });
    expect(ElectionStore.commitTally(root, DEFINITION.electionId, tally("run-1", ["q1", "q2"], [established("q1"), hold("q2")], null), {
      expectedState: "draft",
      nextState: "partial",
    })).toMatchObject({ ok: false, error: "io-error" });
    rmSync(join(electionDir(), "tallies"));

    state("collecting");
    const first = tally("run-1", ["q1", "q2"], [established("q1"), hold("q2")], null);
    writeFileSync(join(electionDir(), "tally.json"), JSON.stringify(first, null, 2));
    expect(ElectionStore.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    })).toMatchObject({ ok: false, error: "history-mismatch" });
    rmSync(join(electionDir(), "tally.json"));

    expect(ElectionStore.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    }).ok).toBe(true);
    const digest = ElectionStore.establishedResultsDigest(root, DEFINITION.electionId, first);
    if (!digest.ok) throw new Error("digest");
    expect(ElectionStore.commitTally(root, DEFINITION.electionId, tally(
      "run-full",
      ["q1", "q2"],
      [established("q1"), established("q2")],
      digest.value,
    ), { expectedState: "partial", nextState: "tallied" })).toMatchObject({
      ok: false,
      error: "history-mismatch",
    });
    expect(ElectionStore.commitTally(root, DEFINITION.electionId, tally(
      "run-changed",
      ["q2"],
      [established("q1", 2), established("q2")],
      digest.value,
    ), { expectedState: "partial", nextState: "tallied" })).toMatchObject({
      ok: false,
      error: "history-mismatch",
    });
    expect(ElectionStore.commitTally(root, DEFINITION.electionId, tally(
      "run-digest",
      ["q2"],
      [established("q1"), established("q2")],
      `sha256:${"0".repeat(64)}`,
    ), { expectedState: "partial", nextState: "tallied" })).toMatchObject({
      ok: false,
      error: "history-mismatch",
    });
  });

  test("readSnapshot fail-closes when the current tally has no history", () => {
    state("collecting");
    const committed = ElectionStore.commitTally(
      root,
      DEFINITION.electionId,
      tally("run-1", ["q1", "q2"], [established("q1"), established("q2")], null),
      { expectedState: "collecting", nextState: "tallied" },
    );
    expect(committed.ok).toBe(true);
    rmSync(join(electionDir(), "tallies"), { recursive: true, force: true });
    expect(ElectionStore.verify(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "history-mismatch",
    });
    expect(ElectionStore.readSnapshot(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "history-mismatch",
    });
  });

  test("appendPending keeps previously stored ballots in canonical encoded form", () => {
    state("collecting");
    expect(ElectionStore.appendPending(root, DEFINITION.electionId, ballot("alice")).ok).toBe(true);
    const amend: CanonicalBallot = {
      ...ballot("alice", 2),
      kind: "amend",
      ref: {
        electionId: DEFINITION.electionId,
        voter: "alice",
        submittedAt: ballot("alice").submittedAt,
      },
      submittedAt: "2026-08-13T10:05:00Z",
    };
    expect(ElectionStore.appendPending(root, DEFINITION.electionId, amend).ok).toBe(true);
    const file = JSON.parse(
      readFileSync(join(electionDir(), "pending", "alice.json"), "utf8"),
    ) as { events: { ballot: Record<string, unknown> }[] };
    expect(file.events).toHaveLength(2);
    // Every stored event must carry the codec's canonical serialization, which
    // always leads with schemaVersion then kind; a decoded object re-serialized
    // with JSON.stringify would lead with kind instead.
    for (const event of file.events) {
      expect(Object.keys(event.ballot).slice(0, 2)).toEqual(["schemaVersion", "kind"]);
    }
  });

  // ADR-5 (#3046) revised this pin: arrivalSequence used to be a single
  // global counter (read across every voter's pending file), so two voters
  // reusing the same value was corruption. It is now scoped per voter, so
  // the SAME raw value recurring across different voters is the expected
  // shape (each voter numbers independently) — readAllPending's
  // (voter, arrivalSequence) composite key must accept it. Only a duplicate
  // arrivalSequence WITHIN one voter's own file remains corrupt.
  test("readAllPending accepts the same raw arrivalSequence reused across different voters (ADR-5 contract 2)", () => {
    state("collecting");
    // Pin the arrivalSequence values directly on the append results — a
    // regression back to global numbering would give bob arrivalSequence 1
    // (not 0), which a voter-membership-only assertion below would miss.
    expect(ElectionStore.appendPending(root, DEFINITION.electionId, ballot("alice"))).toMatchObject({
      ok: true,
      value: { idempotent: false, arrivalSequence: 0 },
    });
    // bob's own first-ever ballot legitimately lands arrivalSequence 0 too —
    // no forgery needed, this is just two voters' independent numbering.
    expect(ElectionStore.appendPending(root, DEFINITION.electionId, ballot("bob", 2))).toMatchObject({
      ok: true,
      value: { idempotent: false, arrivalSequence: 0 },
    });
    const snapshot = ElectionStore.readSnapshot(root, DEFINITION.electionId);
    expect(snapshot.ok).toBe(true);
    // Assert the actual returned order (no .sort() here, which would discard
    // the ordering the (arrivalSequence, voter) comparator produced): alice
    // and bob tie at arrivalSequence 0, so the voter tiebreak puts alice
    // first — deterministic and worth pinning verbatim.
    if (snapshot.ok) expect(snapshot.value.pending.map((b) => b.voter)).toEqual(["alice", "bob"]);
    expect(ElectionStore.verify(root, DEFINITION.electionId).ok).toBe(true);
  });

  test("readAllPending still fail-closes on a duplicate arrivalSequence WITHIN one voter's own file (ADR-5 contract 2)", () => {
    state("collecting");
    expect(ElectionStore.appendPending(root, DEFINITION.electionId, ballot("alice")).ok).toBe(true);
    // Forge a second event into alice's own file reusing her own sequence 0 —
    // this can never happen through the real append path (own-file
    // monotonicity is enforced), only via direct corruption of the file.
    const alicePath = join(electionDir(), "pending", "alice.json");
    const alicePending = JSON.parse(readFileSync(alicePath, "utf8")) as {
      events: { arrivalSequence: number; ballot: Record<string, unknown> }[];
    };
    const forged = {
      ...JSON.parse(readFileSync(alicePath, "utf8")),
      events: [...alicePending.events, { arrivalSequence: 0, ballot: { ...alicePending.events[0]?.ballot } }],
    };
    writeFileSync(alicePath, JSON.stringify(forged, null, 2));
    // Probe as alice — appendPending only reads the calling voter's own file.
    expect(ElectionStore.appendPending(root, DEFINITION.electionId, ballot("alice", 2))).toMatchObject({
      ok: false,
      error: "corrupt",
    });
  });
});
