// covers: function:tallyElection
// size: medium
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CanonicalElectionDefinition } from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import {
  nextElection,
  notifyElection,
  openElection,
  renderElection,
  reportElection,
  tallyElection,
  verifyElection,
  voteElection,
} from "../../packages/framework/core/tools/amadeus-election.ts";
import { ElectionStore } from "../../packages/framework/core/tools/amadeus-election-store.ts";

// One question, so a hold puts every question back on the ballot: the re-tally
// target covers the whole definition and nothing survives from the prior run.
const definition: CanonicalElectionDefinition = {
  schemaVersion: 2,
  electionId: "E-FULL-RETALLY",
  kind: "decision",
  questions: [
    {
      questionId: "q-only",
      text: "Only?",
      choices: [
        { internalNo: 1, label: "yes" },
        { internalNo: 2, label: "no" },
      ],
    },
  ],
  voters: ["alice", "bob"],
};

function ballot(voter: "alice" | "bob", goa: number, submittedAt: string) {
  return {
    schemaVersion: 2 as const,
    kind: "original" as const,
    electionId: definition.electionId,
    voter,
    voterKind: "member" as const,
    responses: [{ questionId: "q-only", choiceInternalNo: 1, goa, reservation: null, rationale: null }],
    submittedAt,
  };
}

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "election-full-retally-"));
  expect(openElection(root, definition).ok).toBe(true);
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("t3077 single-question election survives a full re-tally", () => {
  test("hold, redistribute, and re-tally reach a recorded result", () => {
    const opened = nextElection(root, definition.electionId);
    if (!opened.ok || opened.value.kind !== "distribute") throw new Error("expected distribute");
    expect(notifyElection(root, opened.value).ok).toBe(true);

    // goa 8 blocks the only question, so the first run lands on "partial".
    expect(voteElection(root, definition.electionId, ballot("alice", 8, "2026-08-15T09:00:00Z"), "2026-08-15T09:00:10Z").ok).toBe(true);
    expect(voteElection(root, definition.electionId, ballot("bob", 1, "2026-08-15T09:00:01Z"), "2026-08-15T09:00:11Z").ok).toBe(true);
    const first = nextElection(root, definition.electionId);
    if (!first.ok || first.value.kind !== "tally-ready") throw new Error("expected tally-ready");
    expect(tallyElection(root, first.value, "2026-08-15T10:00:00Z")).toMatchObject({
      ok: true,
      value: { to: "partial", runId: "run-1" },
    });
    expect(reportElection(root, first.value, "2026-08-15T10:00:01Z").ok).toBe(true);

    // The hold puts the only question back out: the directive still carries a
    // digest, but the re-tally that follows preserves nothing.
    const hold = nextElection(root, definition.electionId);
    if (!hold.ok || hold.value.kind !== "hold") throw new Error("expected hold");
    expect(hold.value.targetQuestionIds).toEqual(["q-only"]);
    expect(hold.value.preservedResultDigest).not.toBeNull();
    expect(notifyElection(root, hold.value).ok).toBe(true);
    expect(reportElection(root, hold.value, "2026-08-15T10:01:00Z").ok).toBe(true);

    expect(voteElection(root, definition.electionId, ballot("alice", 1, "2026-08-15T10:02:00Z"), "2026-08-15T10:02:10Z").ok).toBe(true);
    expect(voteElection(root, definition.electionId, ballot("bob", 1, "2026-08-15T10:02:01Z"), "2026-08-15T10:02:11Z").ok).toBe(true);
    const rerun = nextElection(root, definition.electionId);
    if (!rerun.ok || rerun.value.kind !== "tally-ready") throw new Error("expected rerun tally-ready");
    expect(rerun.value).toMatchObject({ targetQuestionIds: ["q-only"], expectedRunId: "run-1" });

    expect(tallyElection(root, rerun.value, "2026-08-15T11:00:00Z")).toMatchObject({
      ok: true,
      value: { to: "tallied", runId: "run-2" },
    });
    const stored = ElectionStore.readSnapshot(root, definition.electionId);
    if (!stored.ok) throw new Error("expected a readable store");
    expect(stored.value.currentTally?.preservedResultDigest).toBeNull();
    expect(reportElection(root, rerun.value, "2026-08-15T11:00:01Z")).toMatchObject({
      ok: true,
      value: { result: "tallied", runId: "run-2" },
    });

    const render = nextElection(root, definition.electionId);
    if (!render.ok || render.value.kind !== "render") throw new Error("expected render");
    expect(renderElection(root, render.value, "2026-08-15T11:01:00Z").ok).toBe(true);
    const verify = nextElection(root, definition.electionId);
    if (!verify.ok || verify.value.kind !== "verify") throw new Error("expected verify");
    expect(verifyElection(root, verify.value, "2026-08-15T11:02:00Z")).toMatchObject({
      ok: true,
      value: { to: "recorded", runId: "run-2" },
    });
    expect(nextElection(root, definition.electionId)).toMatchObject({ ok: true, value: { kind: "done" } });
  });

  test("re-committing the full re-tally run is idempotent", () => {
    const opened = nextElection(root, definition.electionId);
    if (!opened.ok || opened.value.kind !== "distribute") throw new Error("expected distribute");
    expect(notifyElection(root, opened.value).ok).toBe(true);
    expect(voteElection(root, definition.electionId, ballot("alice", 8, "2026-08-15T09:00:00Z"), "2026-08-15T09:00:10Z").ok).toBe(true);
    expect(voteElection(root, definition.electionId, ballot("bob", 1, "2026-08-15T09:00:01Z"), "2026-08-15T09:00:11Z").ok).toBe(true);
    const first = nextElection(root, definition.electionId);
    if (!first.ok || first.value.kind !== "tally-ready") throw new Error("expected tally-ready");
    expect(tallyElection(root, first.value, "2026-08-15T10:00:00Z").ok).toBe(true);
    const hold = nextElection(root, definition.electionId);
    if (!hold.ok || hold.value.kind !== "hold") throw new Error("expected hold");
    expect(notifyElection(root, hold.value).ok).toBe(true);
    expect(voteElection(root, definition.electionId, ballot("alice", 1, "2026-08-15T10:02:00Z"), "2026-08-15T10:02:10Z").ok).toBe(true);
    expect(voteElection(root, definition.electionId, ballot("bob", 1, "2026-08-15T10:02:01Z"), "2026-08-15T10:02:11Z").ok).toBe(true);
    const rerun = nextElection(root, definition.electionId);
    if (!rerun.ok || rerun.value.kind !== "tally-ready") throw new Error("expected rerun tally-ready");
    expect(tallyElection(root, rerun.value, "2026-08-15T11:00:00Z").ok).toBe(true);

    // A lost receipt re-runs the same directive: the stored run is recognised
    // and re-committed rather than tallied a second time.
    expect(tallyElection(root, rerun.value, "2099-01-01T00:00:00Z")).toMatchObject({
      ok: true,
      value: { repaired: true, runId: "run-2", committedAt: "2026-08-15T11:00:00Z" },
    });
    const history = ElectionStore.readTallyHistory(root, definition.electionId);
    if (!history.ok) throw new Error("expected history");
    expect(history.value.map((entry) => entry.runId)).toEqual(["run-1", "run-2"]);
  });
});
