// covers: function:main, function:terminateRoundElection, object:ElectionStore function:terminateRound
//
// t3256 — the election CLI (v2) directive loop has no verb to terminate a
// re-vote round that is stuck in "collecting": once notify(hold) re-opens
// held questions for a fresh round, the ONLY way out of "collecting" is a
// full tally (every voter casting a ballot). When the underlying decision is
// settled another way (e.g. a user-delegated ruling) and voters never
// finish casting ballots for that round, the election is permanently
// orphaned in "collecting" — team.md's "open済みは直接編集せず terminal まで
// 実行する" norm forbids hand-editing the store, and no verb existed to reach
// a terminal state through the CLI.
//
// This adds a `terminate` verb (ElectionStore.terminateRound at the store
// layer, terminateRoundElection at the CLI layer) that moves a "collecting"
// round to a new terminal ElectionState ("terminated") and appends a
// "round-terminated" event to the election's timeline.json, carrying the
// caller-supplied reason and an optional supersededBy reference.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main, terminateRoundElection } from "../../packages/framework/core/tools/amadeus-election.ts";
import type { CanonicalElectionDefinition } from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import { ElectionStore, electionsRoot, resolveElectionDir } from "../../packages/framework/core/tools/amadeus-election-store.ts";

const DEFINITION: CanonicalElectionDefinition = {
  schemaVersion: 2,
  electionId: "E-TERMINATE-3256",
  kind: "decision",
  questions: [
    { questionId: "q1", text: "First?", choices: [{ internalNo: 1, label: "yes" }, { internalNo: 2, label: "no" }] },
  ],
  voters: ["alice", "bob"],
};

// ---------------------------------------------------------------------------
// Store-layer coverage: ElectionStore.terminateRound
// ---------------------------------------------------------------------------

let storeRoot = "";

function freshStoreRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "election-round-terminate-store-"));
  expect(ElectionStore.create(dir, DEFINITION).ok).toBe(true);
  return dir;
}

afterEach(() => {
  if (storeRoot !== "") {
    rmSync(storeRoot, { recursive: true, force: true });
    storeRoot = "";
  }
});

describe("t3256 ElectionStore.terminateRound", () => {
  test("terminates a round stuck in collecting: status becomes terminated and a round-terminated event is appended (falling proof)", () => {
    storeRoot = freshStoreRoot();
    expect(ElectionStore.setState(storeRoot, DEFINITION.electionId, "collecting").ok).toBe(true);

    const terminated = ElectionStore.terminateRound(storeRoot, DEFINITION.electionId, {
      reason: "settled by user-delegated ruling; voters never finished this round",
      supersededBy: "E-DELEGATED-260819",
      terminatedAt: "2026-08-19T00:00:00Z",
    });
    expect(terminated).toMatchObject({ ok: true, value: { repaired: false } });

    const snapshot = ElectionStore.readSnapshot(storeRoot, DEFINITION.electionId);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;
    expect(snapshot.value.state).toBe("terminated");
    expect(snapshot.value.timeline).toEqual([
      {
        schemaVersion: 2,
        kind: "round-terminated",
        reason: "settled by user-delegated ruling; voters never finished this round",
        supersededBy: "E-DELEGATED-260819",
        at: "2026-08-19T00:00:00Z",
      },
    ]);
  });

  test("terminate is idempotent when retried with the same reason/supersededBy, and a distinct timeline event is never duplicated", () => {
    storeRoot = freshStoreRoot();
    expect(ElectionStore.setState(storeRoot, DEFINITION.electionId, "collecting").ok).toBe(true);
    const input = { reason: "duplicate submission cancelled the round", supersededBy: null, terminatedAt: "2026-08-19T00:00:00Z" };

    const first = ElectionStore.terminateRound(storeRoot, DEFINITION.electionId, input);
    expect(first).toMatchObject({ ok: true, value: { repaired: false } });

    const retry = ElectionStore.terminateRound(storeRoot, DEFINITION.electionId, input);
    expect(retry).toMatchObject({ ok: true, value: { repaired: true } });

    const snapshot = ElectionStore.readSnapshot(storeRoot, DEFINITION.electionId);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;
    expect(snapshot.value.timeline).toHaveLength(1);
  });

  test("a retry with a DIFFERENT reason is a conflict, not a silent overwrite of the recorded rationale", () => {
    storeRoot = freshStoreRoot();
    expect(ElectionStore.setState(storeRoot, DEFINITION.electionId, "collecting").ok).toBe(true);
    const first = ElectionStore.terminateRound(storeRoot, DEFINITION.electionId, {
      reason: "first reason",
      supersededBy: null,
      terminatedAt: "2026-08-19T00:00:00Z",
    });
    expect(first.ok).toBe(true);

    const conflicting = ElectionStore.terminateRound(storeRoot, DEFINITION.electionId, {
      reason: "a different reason entirely",
      supersededBy: null,
      terminatedAt: "2026-08-19T00:00:01Z",
    });
    expect(conflicting).toMatchObject({ ok: false, error: "run-conflict" });

    // The original event survives unmodified.
    const snapshot = ElectionStore.readSnapshot(storeRoot, DEFINITION.electionId);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;
    expect(snapshot.value.timeline).toHaveLength(1);
    expect(snapshot.value.timeline[0]).toMatchObject({ reason: "first reason" });
  });

  test("terminate is refused from every state other than collecting/terminated (fail-closed state-conflict)", () => {
    for (const state of ["draft", "open", "partial", "tallied", "rendered", "recorded"] as const) {
      storeRoot = freshStoreRoot();
      expect(ElectionStore.setState(storeRoot, DEFINITION.electionId, state).ok).toBe(true);
      const result = ElectionStore.terminateRound(storeRoot, DEFINITION.electionId, {
        reason: "should be refused",
        supersededBy: null,
        terminatedAt: "2026-08-19T00:00:00Z",
      });
      expect(result).toMatchObject({ ok: false, error: "state-conflict" });
      rmSync(storeRoot, { recursive: true, force: true });
    }
    storeRoot = "";
  });

  test("an empty reason is rejected fail-closed without touching the store", () => {
    storeRoot = freshStoreRoot();
    expect(ElectionStore.setState(storeRoot, DEFINITION.electionId, "collecting").ok).toBe(true);
    const result = ElectionStore.terminateRound(storeRoot, DEFINITION.electionId, {
      reason: "   ",
      supersededBy: null,
      terminatedAt: "2026-08-19T00:00:00Z",
    });
    expect(result).toMatchObject({ ok: false, error: "corrupt" });
    const snapshot = ElectionStore.readSnapshot(storeRoot, DEFINITION.electionId);
    expect(snapshot.ok).toBe(true);
    if (snapshot.ok) {
      expect(snapshot.value.state).toBe("collecting");
      expect(snapshot.value.timeline).toEqual([]);
    }
  });

  // isTimelineEvent's kind discriminator now covers "tallied" and
  // "round-terminated"; a third, unrecognized kind must still be rejected
  // fail-closed rather than silently accepted as a valid extension point.
  test("a timeline event with an unrecognized kind is rejected fail-closed, never silently accepted", () => {
    storeRoot = freshStoreRoot();
    expect(ElectionStore.setState(storeRoot, DEFINITION.electionId, "collecting").ok).toBe(true);
    const timelinePath = join(resolveElectionDir(storeRoot, DEFINITION.electionId), "timeline.json");
    writeFileSync(
      timelinePath,
      JSON.stringify([{ schemaVersion: 2, kind: "some-future-event-kind", at: "2026-08-19T00:00:00Z" }]),
    );
    const snapshot = ElectionStore.readSnapshot(storeRoot, DEFINITION.electionId);
    expect(snapshot).toMatchObject({ ok: false, error: "corrupt" });
    const verified = ElectionStore.verify(storeRoot, DEFINITION.electionId);
    expect(verified).toMatchObject({ ok: false, error: "corrupt" });
  });
});

// ---------------------------------------------------------------------------
// CLI-layer coverage: the `terminate` verb end to end through main()
// ---------------------------------------------------------------------------

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const dir = mkdtempSync(join(tmpdir(), "election-round-terminate-cli-"));
  roots.push(dir);
  mkdirSync(join(dir, "amadeus", "spaces", "default", "elections"), { recursive: true });
  return dir;
}

function run(argv: readonly string[]): { code: number; stdout: string; stderr: string } {
  const logs: string[] = [];
  const errors: string[] = [];
  const log = console.log;
  const errFn = console.error;
  console.log = (value?: unknown) => {
    logs.push(String(value ?? ""));
  };
  console.error = (value?: unknown) => {
    errors.push(String(value ?? ""));
  };
  try {
    return { code: main([...argv]), stdout: logs.join("\n"), stderr: errors.join("\n") };
  } finally {
    console.log = log;
    console.error = errFn;
  }
}

// Opens the election and drives it to "collecting" via the real directive
// loop (open -> next(distribute) -> notify), mirroring how a re-vote round
// actually reaches "collecting" in production: no ballots are cast, so the
// round is exactly the "stuck, orphaned" shape #3256 describes.
function openToCollecting(dir: string): void {
  const definitionPath = join(dir, "definition.json");
  writeFileSync(definitionPath, JSON.stringify(DEFINITION));
  expect(run(["open", "--file", definitionPath, "--project", dir]).code).toBe(0);
  const next = run(["next", "--election", DEFINITION.electionId, "--project", dir]);
  expect(next.code).toBe(0);
  const directivePath = join(dir, "directive.json");
  writeFileSync(directivePath, next.stdout);
  expect(run(["notify", "--election", DEFINITION.electionId, "--file", directivePath, "--project", dir]).code).toBe(0);
}

describe("t3256 election CLI terminate verb", () => {
  test("terminate closes a collecting round: status/next report terminal, and the store's timeline records the event (falling proof)", () => {
    const dir = project();
    openToCollecting(dir);

    const terminate = run([
      "terminate",
      "--election",
      DEFINITION.electionId,
      "--reason",
      "settled outside the election by user-delegated ruling",
      "--superseded-by",
      "E-DELEGATED-260819",
      "--project",
      dir,
    ]);
    expect(terminate.code).toBe(0);
    expect(JSON.parse(terminate.stdout)).toMatchObject({
      electionId: DEFINITION.electionId,
      from: "collecting",
      to: "terminated",
      reason: "settled outside the election by user-delegated ruling",
      supersededBy: "E-DELEGATED-260819",
      repaired: false,
    });

    const status = run(["status", "--election", DEFINITION.electionId, "--project", dir]);
    expect(status.code).toBe(0);
    expect(JSON.parse(status.stdout)).toMatchObject({ state: "terminated" });

    const next = run(["next", "--election", DEFINITION.electionId, "--project", dir]);
    expect(next.code).toBe(0);
    expect(JSON.parse(next.stdout)).toMatchObject({ kind: "done" });

    const root = electionsRoot(dir);
    const snapshot = ElectionStore.readSnapshot(root, DEFINITION.electionId);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;
    expect(snapshot.value.timeline).toEqual([
      {
        schemaVersion: 2,
        kind: "round-terminated",
        reason: "settled outside the election by user-delegated ruling",
        supersededBy: "E-DELEGATED-260819",
        at: snapshot.value.timeline[0]?.kind === "round-terminated" ? snapshot.value.timeline[0].at : "",
      },
    ]);
  });

  test("terminate without --reason is a usage failure", () => {
    const dir = project();
    openToCollecting(dir);
    const result = run(["terminate", "--election", DEFINITION.electionId, "--project", dir]);
    expect(result.code).toBe(2);
  });

  test("terminate on a non-collecting election is refused as an invalid transition", () => {
    const dir = project();
    const definitionPath = join(dir, "definition.json");
    writeFileSync(definitionPath, JSON.stringify(DEFINITION));
    expect(run(["open", "--file", definitionPath, "--project", dir]).code).toBe(0);

    const result = run(["terminate", "--election", DEFINITION.electionId, "--reason", "too early", "--project", dir]);
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stderr)).toMatchObject({ category: "invalid-transition" });
  });
});

describe("t3256 terminateRoundElection unit surface", () => {
  test("rejects a whitespace-only reason before touching the store", () => {
    const dir = mkdtempSync(join(tmpdir(), "election-round-terminate-unit-"));
    try {
      const root = electionsRoot(dir);
      expect(ElectionStore.create(root, DEFINITION).ok).toBe(true);
      expect(ElectionStore.setState(root, DEFINITION.electionId, "collecting").ok).toBe(true);
      const result = terminateRoundElection(
        root,
        DEFINITION.electionId,
        { reason: "  ", supersededBy: null },
        "2026-08-19T00:00:00Z",
      );
      expect(result).toMatchObject({ ok: false, error: { category: "decode" } });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
