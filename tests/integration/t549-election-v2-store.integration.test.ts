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
  ElectionV2Store,
  type ElectionV2State,
} from "../../packages/framework/core/tools/amadeus-election-v2-store.ts";
import {
  electionsRegistryPath,
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
  expect(ElectionV2Store.create(root, DEFINITION).ok).toBe(true);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function electionDir(): string {
  return resolveElectionDir(root, DEFINITION.electionId).dir;
}

function state(expected: ElectionV2State): void {
  const set = ElectionV2Store.setState(root, DEFINITION.electionId, expected);
  expect(set.ok).toBe(true);
}

describe("t549 election v2 store", () => {
  test("canonical reads distinguish missing, corrupt, and unsupported without rewriting bytes", () => {
    const electionPath = join(electionDir(), "election.json");
    const unsupported = JSON.stringify({ ...DEFINITION, schemaVersion: 99, state: "draft" });
    writeFileSync(electionPath, unsupported);
    const unsupportedRead = ElectionV2Store.load(root, DEFINITION.electionId);
    expect(unsupportedRead).toMatchObject({ ok: false, error: "unsupported" });
    expect(readFileSync(electionPath, "utf8")).toBe(unsupported);

    const corrupt = "{not-json";
    writeFileSync(electionPath, corrupt);
    expect(ElectionV2Store.load(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    expect(readFileSync(electionPath, "utf8")).toBe(corrupt);
    expect(ElectionV2Store.load(root, "missing")).toMatchObject({ ok: false, error: "missing" });
  });

  test("legacy hold is normalized in memory and read-only verbs leave every byte unchanged", () => {
    const electionPath = join(electionDir(), "election.json");
    const legacy = {
      electionId: DEFINITION.electionId,
      kind: "decision",
      question: "Legacy?",
      choices: [{ internalNo: 1, label: "yes" }],
      voters: ["alice", "bob"],
      state: "hold",
    };
    const bytes = JSON.stringify(legacy, null, 2);
    writeFileSync(electionPath, bytes);
    const registry = JSON.parse(readFileSync(electionsRegistryPath(root), "utf8"));
    registry[0].status = "hold";
    writeFileSync(electionsRegistryPath(root), JSON.stringify(registry, null, 2));
    const beforeRegistry = readFileSync(electionsRegistryPath(root), "utf8");

    expect(ElectionV2Store.load(root, DEFINITION.electionId)).toMatchObject({
      ok: true,
      value: { state: "partial", legacy: true },
    });
    expect(ElectionV2Store.verify(root, DEFINITION.electionId).ok).toBe(true);
    expect(readFileSync(electionPath, "utf8")).toBe(bytes);
    expect(readFileSync(electionsRegistryPath(root), "utf8")).toBe(beforeRegistry);
  });

  test("pending append is byte-idempotent, conflicts on the same identity, and does not touch ledger or state", () => {
    const ledgerPath = join(electionDir(), "ledger.json");
    const electionPath = join(electionDir(), "election.json");
    const ledgerBefore = readFileSync(ledgerPath, "utf8");
    const electionBefore = readFileSync(electionPath, "utf8");
    const first = ballot("alice");

    expect(ElectionV2Store.appendPending(root, DEFINITION.electionId, first).ok).toBe(true);
    const pendingPath = join(electionDir(), "pending", "alice.json");
    expect(JSON.parse(readFileSync(pendingPath, "utf8"))).toMatchObject({
      schemaVersion: 2,
      electionId: DEFINITION.electionId,
      voter: "alice",
    });
    const retry = ElectionV2Store.appendPending(root, DEFINITION.electionId, first);
    expect(retry).toMatchObject({ ok: true, value: { idempotent: true } });
    const conflict = ElectionV2Store.appendPending(root, DEFINITION.electionId, {
      ...first,
      responses: first.responses.map((response) => ({ ...response, choiceInternalNo: 2 })),
    });
    expect(conflict).toMatchObject({ ok: false, error: "duplicate" });
    const mismatched = JSON.parse(readFileSync(pendingPath, "utf8"));
    mismatched.electionId = "OTHER";
    writeFileSync(pendingPath, JSON.stringify(mismatched, null, 2));
    expect(ElectionV2Store.appendPending(root, DEFINITION.electionId, ballot("bob"))).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    mismatched.electionId = DEFINITION.electionId;
    mismatched.voter = "bob";
    writeFileSync(pendingPath, JSON.stringify(mismatched, null, 2));
    expect(ElectionV2Store.appendPending(root, DEFINITION.electionId, ballot("bob"))).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    expect(readFileSync(ledgerPath, "utf8")).toBe(ledgerBefore);
    expect(readFileSync(electionPath, "utf8")).toBe(electionBefore);
  });

  test("integration orders pending arrivals, materializes v2 ballots, and retries after a durable ledger write", () => {
    expect(ElectionV2Store.appendPending(root, DEFINITION.electionId, ballot("bob")).ok).toBe(true);
    expect(ElectionV2Store.appendPending(root, DEFINITION.electionId, ballot("alice")).ok).toBe(true);
    writeFileSync(join(electionDir(), "ballots"), "blocked");

    const failed = ElectionV2Store.integratePending(root, DEFINITION.electionId, ["alice", "bob"]);
    expect(failed).toMatchObject({ ok: false, error: "io-error" });
    expect(existsSync(join(electionDir(), "pending", "alice.json"))).toBe(true);
    const durableLedger = JSON.parse(readFileSync(join(electionDir(), "ledger.json"), "utf8"));
    expect(durableLedger.ballots.map((entry: CanonicalBallot) => entry.voter)).toEqual(["bob", "alice"]);

    rmSync(join(electionDir(), "ballots"));
    const repaired = ElectionV2Store.integratePending(root, DEFINITION.electionId, ["alice", "bob"]);
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
    const failed = ElectionV2Store.commitTally(root, DEFINITION.electionId, first, {
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
    const repaired = ElectionV2Store.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    });
    expect(repaired).toMatchObject({ ok: true, value: { repaired: true } });
    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    }).ok).toBe(true);
    const timeline = JSON.parse(readFileSync(join(electionDir(), "timeline.json"), "utf8"));
    expect(timeline.filter((event: { runId?: string }) => event.runId === "run-1")).toHaveLength(1);

    const conflicting = { ...first, talliedAt: "2026-08-13T11:00:01Z" };
    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, conflicting, {
      expectedState: "collecting",
      nextState: "partial",
    })).toMatchObject({ ok: false, error: "run-conflict" });
  });

  test("same-run retry advances when history is durable but current was not written", () => {
    state("collecting");
    const first = tally("run-1", ["q1", "q2"], [established("q1"), hold("q2")], null);
    mkdirSync(join(electionDir(), "tally.json.tmp"));
    const failed = ElectionV2Store.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    });
    expect(failed).toMatchObject({ ok: false, error: "io-error", durable: ["history"] });
    rmSync(join(electionDir(), "tally.json.tmp"), { recursive: true });

    const repaired = ElectionV2Store.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    });
    expect(repaired).toMatchObject({ ok: true, value: { repaired: true } });
    expect(ElectionV2Store.verify(root, DEFINITION.electionId).ok).toBe(true);
  });

  test("file-backed voter and run identifiers reject path traversal", () => {
    const escapedBallot = { ...ballot("alice"), voter: "../escape" };
    expect(ElectionV2Store.appendPending(root, DEFINITION.electionId, escapedBallot)).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    const escapedRun = tally("../escape", ["q1", "q2"], [established("q1"), hold("q2")], null);
    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, escapedRun, {
      expectedState: "draft",
      nextState: "partial",
    })).toMatchObject({ ok: false, error: "corrupt", durable: [] });
    expect(existsSync(join(electionDir(), "escape.json"))).toBe(false);
  });

  test("a mixed partial tally can be followed by a hold-only run with preserved established results", () => {
    state("collecting");
    const first = tally("run-1", ["q1", "q2"], [established("q1"), hold("q2")], null);
    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    }).ok).toBe(true);
    const digest = ElectionV2Store.establishedResultsDigest(root, DEFINITION.electionId, first);
    if (!digest.ok) throw new Error("fixture digest must succeed");
    const followUp = tally(
      "run-2",
      ["q2"],
      [established("q1"), established("q2", 2)],
      digest.value,
    );
    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, followUp, {
      expectedState: "partial",
      nextState: "tallied",
    }).ok).toBe(true);
    const history = ElectionV2Store.readTallyHistory(root, DEFINITION.electionId);
    expect(history).toMatchObject({ ok: true });
    if (history.ok) expect(history.value.map((entry) => entry.runId)).toEqual(["run-1", "run-2"]);
    expect(ElectionV2Store.verify(root, DEFINITION.electionId).ok).toBe(true);
  });

  test("a run that would not sort last in history is rejected before any durable write", () => {
    state("collecting");
    const first = tally("run-1", ["q1", "q2"], [established("q1"), hold("q2")], null);
    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    }).ok).toBe(true);
    const digest = ElectionV2Store.establishedResultsDigest(root, DEFINITION.electionId, first);
    if (!digest.ok) throw new Error("fixture digest must succeed");
    const followUp = tally("run-2", ["q2"], [established("q1"), established("q2", 2)], digest.value);

    const older = { ...followUp, talliedAt: "2026-08-13T10:00:00Z" };
    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, older, {
      expectedState: "partial",
      nextState: "tallied",
    })).toMatchObject({ ok: false, error: "tally-order-conflict", durable: [] });
    expect(existsSync(join(electionDir(), "tallies", "run-2.json"))).toBe(false);

    const tied = { ...followUp, runId: "run-0", talliedAt: first.talliedAt };
    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, tied, {
      expectedState: "partial",
      nextState: "tallied",
    })).toMatchObject({ ok: false, error: "tally-order-conflict", durable: [] });
    expect(existsSync(join(electionDir(), "tallies", "run-0.json"))).toBe(false);

    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, followUp, {
      expectedState: "partial",
      nextState: "tallied",
    }).ok).toBe(true);
    expect(ElectionV2Store.verify(root, DEFINITION.electionId).ok).toBe(true);
  });

  test("corrupt inputs and registry/state or history/current drift fail closed without repair", () => {
    state("collecting");
    const first = tally("run-1", ["q1", "q2"], [established("q1"), hold("q2")], null);
    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    }).ok).toBe(true);
    const currentPath = join(electionDir(), "tally.json");
    const before = readFileSync(currentPath, "utf8");
    writeFileSync(currentPath, JSON.stringify({ ...first, runId: "other" }));
    const drifted = readFileSync(currentPath, "utf8");
    expect(ElectionV2Store.verify(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "history-mismatch",
    });
    expect(readFileSync(currentPath, "utf8")).toBe(drifted);

    writeFileSync(currentPath, before);
    rmSync(join(electionDir(), "tallies"), { recursive: true });
    expect(ElectionV2Store.verify(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "history-mismatch",
    });
    mkdirSync(join(electionDir(), "tallies"));
    writeFileSync(join(electionDir(), "tallies", "run-1.json"), before);
    const registry = JSON.parse(readFileSync(electionsRegistryPath(root), "utf8"));
    registry[0].status = "open";
    writeFileSync(electionsRegistryPath(root), JSON.stringify(registry, null, 2));
    expect(ElectionV2Store.load(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "registry-mismatch",
    });
  });

  test("remaining store failure arms stay fail-closed", () => {
    expect(ElectionV2Store.create(root, { ...DEFINITION, electionId: "../escape" })).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    expect(ElectionV2Store.create(root, DEFINITION)).toMatchObject({
      ok: false,
      error: "duplicate",
    });
    expect(ElectionV2Store.integratePending(root, DEFINITION.electionId, ["alice", "alice"])).toMatchObject({
      ok: false,
      error: "duplicate",
    });
    expect(ElectionV2Store.integratePending(root, DEFINITION.electionId, ["../escape"])).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    writeFileSync(join(electionDir(), "tally.json"), JSON.stringify({ schemaVersion: 2, runId: 1 }));
    expect(ElectionV2Store.readSnapshot(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    rmSync(join(electionDir(), "tally.json"));
    const electionJson = join(electionDir(), "election.json");
    mkdirSync(`${electionJson}.tmp`);
    expect(ElectionV2Store.setState(root, DEFINITION.electionId, "open")).toMatchObject({
      ok: false,
      error: "io-error",
    });
    rmSync(`${electionJson}.tmp`, { recursive: true });

    const registry = JSON.parse(readFileSync(electionsRegistryPath(root), "utf8"));
    const originalDirName = registry[0].dirName;
    registry[0].dirName = "../escape";
    writeFileSync(electionsRegistryPath(root), JSON.stringify(registry, null, 2));
    expect(ElectionV2Store.load(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    registry[0].dirName = originalDirName;
    writeFileSync(electionsRegistryPath(root), JSON.stringify(registry, null, 2));

    writeFileSync(join(electionDir(), "ledger.json"), JSON.stringify({
      schemaVersion: 3,
      ballots: [],
    }));
    expect(ElectionV2Store.readSnapshot(root, DEFINITION.electionId)).toMatchObject({
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
    expect(ElectionV2Store.appendPending(root, DEFINITION.electionId, ballot("bob"))).toMatchObject({
      ok: false,
      error: "corrupt",
    });
    rmSync(join(electionDir(), "pending"), { recursive: true });
    writeFileSync(join(electionDir(), "pending"), "not-a-directory");
    expect(ElectionV2Store.appendPending(root, DEFINITION.electionId, ballot("alice"))).toMatchObject({
      ok: false,
      error: "io-error",
    });
    rmSync(join(electionDir(), "pending"));

    writeFileSync(join(electionDir(), "tallies"), "not-a-directory");
    expect(ElectionV2Store.readTallyHistory(root, DEFINITION.electionId)).toMatchObject({
      ok: false,
      error: "io-error",
    });
    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, tally("run-1", ["q1", "q2"], [established("q1"), hold("q2")], null), {
      expectedState: "draft",
      nextState: "partial",
    })).toMatchObject({ ok: false, error: "io-error" });
    rmSync(join(electionDir(), "tallies"));

    state("collecting");
    const first = tally("run-1", ["q1", "q2"], [established("q1"), hold("q2")], null);
    writeFileSync(join(electionDir(), "tally.json"), JSON.stringify(first, null, 2));
    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    })).toMatchObject({ ok: false, error: "history-mismatch" });
    rmSync(join(electionDir(), "tally.json"));

    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, first, {
      expectedState: "collecting",
      nextState: "partial",
    }).ok).toBe(true);
    const digest = ElectionV2Store.establishedResultsDigest(root, DEFINITION.electionId, first);
    if (!digest.ok) throw new Error("digest");
    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, tally(
      "run-full",
      ["q1", "q2"],
      [established("q1"), established("q2")],
      digest.value,
    ), { expectedState: "partial", nextState: "tallied" })).toMatchObject({
      ok: false,
      error: "history-mismatch",
    });
    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, tally(
      "run-changed",
      ["q2"],
      [established("q1", 2), established("q2")],
      digest.value,
    ), { expectedState: "partial", nextState: "tallied" })).toMatchObject({
      ok: false,
      error: "history-mismatch",
    });
    expect(ElectionV2Store.commitTally(root, DEFINITION.electionId, tally(
      "run-digest",
      ["q2"],
      [established("q1"), established("q2")],
      `sha256:${"0".repeat(64)}`,
    ), { expectedState: "partial", nextState: "tallied" })).toMatchObject({
      ok: false,
      error: "history-mismatch",
    });
  });
});
