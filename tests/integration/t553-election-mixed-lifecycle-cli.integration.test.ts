import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  CanonicalElectionDefinition,
  CanonicalQuestionResult,
  CanonicalTally,
} from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import {
  nextElection,
  notifyElection,
  reportElection,
  renderElection,
  statusElection,
  tallyElection,
  verifyElection,
  voteElection,
} from "../../packages/framework/core/tools/amadeus-election.ts";
import {
  ElectionStore,
  resolveElectionDir,
} from "../../packages/framework/core/tools/amadeus-election-store.ts";

const definition: CanonicalElectionDefinition = {
  schemaVersion: 2,
  electionId: "E-MIXED-CLI",
  kind: "decision",
  questions: [
    { questionId: "q-a", text: "A?", choices: [{ internalNo: 1, label: "yes" }] },
    { questionId: "q-b", text: "B?", choices: [{ internalNo: 1, label: "yes" }] },
    { questionId: "q-c", text: "C?", choices: [{ internalNo: 1, label: "yes" }] },
  ],
  voters: ["alice", "bob"],
};

function established(questionId: string): CanonicalQuestionResult {
  return {
    questionId,
    kind: "established",
    winner: { internalNo: 1, label: "yes" },
    choiceCounts: [{ internalNo: 1, label: "yes", count: 2 }],
    goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
  };
}

function held(questionId: string, reason: "tie" | "block"): CanonicalQuestionResult {
  return {
    questionId,
    kind: "hold",
    reason,
    counts: { favor: 1, against: 1, abstain: 0, discuss: 0 },
  };
}

function treeBytes(root: string): string[] {
  const visit = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? visit(path) : [`${path.slice(root.length)}\0${readFileSync(path, "utf8")}`];
    });
  return visit(root);
}

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "election-v2-cli-"));
  expect(ElectionStore.create(root, definition).ok).toBe(true);
  expect(ElectionStore.setState(root, definition.electionId, "collecting").ok).toBe(true);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("t553 election mixed lifecycle CLI", () => {
  test("status fails closed on malformed canonical state without rewriting it", () => {
    const path = join(resolveElectionDir(root, definition.electionId), "timeline.json");
    const malformed = JSON.stringify({ schemaVersion: 2, events: [] });
    writeFileSync(path, malformed);
    expect(statusElection(root, definition.electionId)).toMatchObject({
      ok: false,
      error: { category: "store" },
    });
    expect(readFileSync(path, "utf8")).toBe(malformed);
  });

  test("partial next preserves every held reason, hold targets, digest, and store bytes", () => {
    const tally: CanonicalTally = {
      schemaVersion: 2,
      runId: "run-mixed-1",
      targetQuestionIds: ["q-a", "q-b", "q-c"],
      results: [established("q-a"), held("q-b", "tie"), held("q-c", "block")],
      preservedResultDigest: null,
      talliedAt: "2026-08-13T10:00:00Z",
    };
    expect(ElectionStore.commitTally(root, definition.electionId, tally, {
      expectedState: "collecting",
      nextState: "partial",
    }).ok).toBe(true);
    const digest = ElectionStore.establishedResultsDigest(root, definition.electionId, tally);
    if (!digest.ok) throw new Error("fixture digest must be available");
    const before = treeBytes(root);

    expect(nextElection(root, definition.electionId)).toEqual({
      ok: true,
      value: {
        kind: "hold",
        electionId: definition.electionId,
        schemaVersion: 2,
        targetQuestionIds: ["q-b", "q-c"],
        preservedResultDigest: digest.value,
        verb: "notify",
        report: "distributed",
        expectedState: "partial",
        expectedRunId: "run-mixed-1",
        held: [
          { questionId: "q-b", reason: "tie" },
          { questionId: "q-c", reason: "block" },
        ],
      },
    });
    expect(treeBytes(root)).toEqual(before);
  });

  test("mixed tally reruns only held questions and rejects stale or established-target ballots", () => {
    const firstBallot = (voter: "alice" | "bob") => ({
      schemaVersion: 2 as const,
      kind: "original" as const,
      electionId: definition.electionId,
      voter,
      voterKind: "member" as const,
      responses: [
        { questionId: "q-a", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
        { questionId: "q-b", choiceInternalNo: 1, goa: voter === "alice" ? 1 : 7, reservation: null, rationale: null },
        { questionId: "q-c", choiceInternalNo: 1, goa: voter === "alice" ? 8 : 1, reservation: null, rationale: null },
      ],
      submittedAt: voter === "alice" ? "2026-08-13T09:00:00Z" : "2026-08-13T09:00:01Z",
    });
    expect(voteElection(root, definition.electionId, firstBallot("alice"), "2026-08-13T09:01:00Z").ok).toBe(true);
    expect(voteElection(root, definition.electionId, firstBallot("bob"), "2026-08-13T09:01:01Z").ok).toBe(true);
    const ready = nextElection(root, definition.electionId);
    if (!ready.ok || ready.value.kind !== "tally-ready") throw new Error("expected tally-ready");
    expect(tallyElection(root, ready.value, "2026-08-13T10:00:00Z")).toMatchObject({
      ok: true,
      value: { to: "partial", runId: "run-1" },
    });
    const partial = nextElection(root, definition.electionId);
    if (!partial.ok || partial.value.kind !== "hold") throw new Error("expected hold");
    expect(partial.value.targetQuestionIds).toEqual(["q-b", "q-c"]);
    expect(notifyElection(root, partial.value).ok).toBe(true);

    const stale = tallyElection(root, ready.value, "2026-08-13T10:00:00Z");
    expect(stale).toMatchObject({ ok: false, error: { category: "stale-directive" } });
    const establishedTargetBallot = {
      ...firstBallot("alice"),
      kind: "amend" as const,
      ref: { electionId: definition.electionId, voter: "alice", submittedAt: "2026-08-13T09:00:00Z" },
      responses: firstBallot("alice").responses,
      submittedAt: "2026-08-13T10:01:00Z",
    };
    expect(voteElection(root, definition.electionId, establishedTargetBallot, "2026-08-13T10:01:01Z")).toMatchObject({
      ok: false,
      error: { category: "coverage" },
    });

    const rerunBallot = (voter: "alice" | "bob") => ({
      schemaVersion: 2 as const,
      kind: "original" as const,
      electionId: definition.electionId,
      voter,
      voterKind: "member" as const,
      responses: [
        { questionId: "q-b", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
        { questionId: "q-c", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
      ],
      submittedAt: voter === "alice" ? "2026-08-13T10:02:00Z" : "2026-08-13T10:02:01Z",
    });
    expect(voteElection(root, definition.electionId, rerunBallot("alice"), "2026-08-13T10:03:00Z").ok).toBe(true);
    expect(voteElection(root, definition.electionId, rerunBallot("bob"), "2026-08-13T10:03:01Z").ok).toBe(true);
    const rerun = nextElection(root, definition.electionId);
    if (!rerun.ok || rerun.value.kind !== "tally-ready") throw new Error("expected rerun tally-ready");
    expect(rerun.value).toMatchObject({ targetQuestionIds: ["q-b", "q-c"], expectedRunId: "run-1" });
    expect(tallyElection(root, rerun.value, "2026-08-13T11:00:00Z")).toMatchObject({
      ok: true,
      value: { to: "tallied", runId: "run-2" },
    });
    expect(reportElection(root, rerun.value, "2026-08-13T11:00:01Z")).toMatchObject({
      ok: true,
      value: { result: "tallied", runId: "run-2" },
    });
    expect(reportElection(root, { ...rerun.value, targetQuestionIds: ["q-c"] }, "2026-08-13T11:00:01Z")).toMatchObject({
      ok: false,
      error: { category: "stale-directive" },
    });
    expect(reportElection(root, { ...rerun.value, preservedResultDigest: `sha256:${"0".repeat(64)}` }, "2026-08-13T11:00:01Z")).toMatchObject({
      ok: false,
      error: { category: "stale-directive" },
    });
    const history = ElectionStore.readTallyHistory(root, definition.electionId);
    if (!history.ok) throw new Error("expected history");
    expect(history.value.map((entry) => entry.runId)).toEqual(["run-1", "run-2"]);
    expect(history.value[1]?.results.find((result) => result.questionId === "q-a")).toEqual(established("q-a"));

    expect(tallyElection(root, rerun.value, "2099-01-01T00:00:00Z")).toMatchObject({
      ok: true,
      value: { repaired: true, runId: "run-2", committedAt: "2026-08-13T11:00:00Z" },
    });
    const timelinePath = join(resolveElectionDir(root, definition.electionId), "timeline.json");
    const timeline = JSON.parse(readFileSync(timelinePath, "utf8"));
    expect(timeline.filter((event: { runId?: string }) => event.runId === "run-2")).toHaveLength(1);

    const render = nextElection(root, definition.electionId);
    if (!render.ok || render.value.kind !== "render") throw new Error("expected render");
    expect(renderElection(root, render.value, "2026-08-13T11:01:00Z").ok).toBe(true);
    const verify = nextElection(root, definition.electionId);
    if (!verify.ok || verify.value.kind !== "verify") throw new Error("expected verify");
    const recordPath = join(resolveElectionDir(root, definition.electionId), "record.md");
    const validRecord = readFileSync(recordPath, "utf8");
    writeFileSync(recordPath, validRecord.replace("Established: yes", "Established: tampered"));
    expect(verifyElection(root, verify.value, "2026-08-13T11:02:00Z")).toMatchObject({
      ok: false,
      error: { category: "verification" },
    });
    expect(ElectionStore.load(root, definition.electionId)).toMatchObject({ ok: true, value: { state: "rendered" } });
    writeFileSync(recordPath, validRecord);
    expect(verifyElection(root, verify.value, "2026-08-13T11:02:00Z")).toMatchObject({
      ok: true,
      value: { to: "recorded", runId: "run-2" },
    });
    expect(nextElection(root, definition.electionId)).toMatchObject({ ok: true, value: { kind: "done" } });
  });
});
