// t373 — Issue #1773: accepted ballots must stay out of the shared, tracked
// ledger.json while an election is still collecting. Until tally, each accepted
// ballot lives in a per-voter file under the election's gitignored pending/
// directory, so a voter who has not voted yet cannot read a peer's choice/GoA/
// rationale through a file-change notification or `git status` / `git diff`.
// Layer: integration (real tmp elections root + a real `git check-ignore` run).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Election, Goa } from "../../packages/framework/core/tools/amadeus-election-model";
import {
  pendingDir,
  resolveElectionDir,
  Store,
} from "../../packages/framework/core/tools/amadeus-election-store";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const IGNORE_PATTERN = "amadeus/spaces/*/elections/*/pending/";

const DEF = {
  electionId: "E-BLIND-1",
  kind: "clarification",
  question: "q",
  choices: [
    { internalNo: 1, label: "a" },
    { internalNo: 2, label: "b" },
  ],
  voters: ["alice", "bob"],
};

const SECRET_RESERVATION = "SECRET-RESERVATION-TEXT";
const SECRET_RATIONALE = "SECRET-RATIONALE-TEXT";

function election(overrides: Partial<typeof DEF> = {}) {
  const parsed = Election.parse({ ...DEF, ...overrides });
  if (!parsed.ok) throw new Error("definition must parse");
  return parsed.value;
}

function ballot(voter: string, goaRaw = 2, electionId = "E-BLIND-1") {
  const goa = Goa.parse(goaRaw);
  if (!goa.ok) throw new Error("goa must parse");
  return {
    kind: "original" as const,
    electionId,
    voter,
    voterKind: "member" as const,
    choiceInternalNo: 1,
    goa: goa.value,
    reservation: SECRET_RESERVATION,
    rationale: SECRET_RATIONALE,
    submittedAt: "2026-07-31T00:00:00Z",
  };
}

const RECV = "2026-07-31T00:00:00Z";
const RECV_LATE = "2026-07-31T02:00:00Z";

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "election-blind-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function dirOf(electionId = "E-BLIND-1"): string {
  return resolveElectionDir(root, electionId).dir;
}

function rawLedger(electionId = "E-BLIND-1"): string {
  return readFileSync(join(dirOf(electionId), "ledger.json"), "utf8");
}

describe("t373 election ballot blind storage (#1773)", () => {
  test("a ballot accepted while collecting never reaches the shared ledger.json", () => {
    expect(Store.create(root, election()).ok).toBe(true);
    expect(Store.setState(root, "E-BLIND-1", "collecting").ok).toBe(true);
    expect(Store.appendBallot(root, "E-BLIND-1", ballot("alice"), RECV).ok).toBe(true);

    // (a) the tracked shared file carries no ballot body at all
    const raw = rawLedger();
    expect(raw).not.toContain(SECRET_RESERVATION);
    expect(raw).not.toContain(SECRET_RATIONALE);
    expect(raw).not.toContain("alice");
    expect(JSON.parse(raw).ballots).toEqual([]);

    // (b) the body is in the per-voter pending file instead
    const pending = pendingDir(dirOf());
    expect(existsSync(join(pending, "alice.json"))).toBe(true);
    expect(readFileSync(join(pending, "alice.json"), "utf8")).toContain(SECRET_RATIONALE);

    // (c) the status contract is unchanged (voted/pending derive from pending)
    const status = Store.status(root, "E-BLIND-1");
    expect(status.ok).toBe(true);
    if (status.ok) {
      expect(status.value.voted).toEqual(["alice"]);
      expect(status.value.pending).toEqual(["bob"]);
      expect(status.value.state).toBe("collecting");
    }

    // (d) the timeline event for the acceptance is unchanged (FR-1d)
    const timeline = JSON.parse(readFileSync(join(dirOf(), "timeline.json"), "utf8"));
    expect(
      timeline.some((e: { kind: string; detail?: string }) => e.detail === "ballot accepted: alice"),
    ).toBe(true);
  });

  test("tally integrates every pending ballot into ledger.json in a deterministic order", () => {
    expect(Store.create(root, election()).ok).toBe(true);
    expect(Store.setState(root, "E-BLIND-1", "collecting").ok).toBe(true);
    expect(Store.appendBallot(root, "E-BLIND-1", ballot("bob"), RECV).ok).toBe(true);
    expect(Store.appendBallot(root, "E-BLIND-1", ballot("alice"), RECV).ok).toBe(true);

    // pre-tally the merged read already shows both (arrival order preserved)
    const before = Store.ledger(root, "E-BLIND-1");
    expect(before.ok).toBe(true);
    if (before.ok) expect(before.value.ballots.map((b) => b.voter)).toEqual(["bob", "alice"]);

    const result = {
      kind: "established" as const,
      winner: { internalNo: 1, label: "a" },
      choiceCounts: [
        { internalNo: 1, label: "a", count: 2 },
        { internalNo: 2, label: "b", count: 0 },
      ],
      goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
    };
    expect(Store.materialize(root, "E-BLIND-1", result, "2026-07-31T01:00:00Z").ok).toBe(true);

    // ledger.json now holds the integrated set, pending/ is drained
    const raw = JSON.parse(rawLedger());
    expect(raw.ballots.map((b: { voter: string }) => b.voter)).toEqual(["bob", "alice"]);
    expect(raw.late).toEqual([]);
    const pending = pendingDir(dirOf());
    expect(existsSync(pending) ? readdirSync(pending) : []).toEqual([]);

    // the fixed tally set and the materialized per-voter files are unchanged
    const tallyFile = JSON.parse(readFileSync(join(dirOf(), "tally.json"), "utf8"));
    expect(tallyFile.ballots.length).toBe(2);
    expect(JSON.parse(readFileSync(join(dirOf(), "ballots", "alice.json"), "utf8")).voter).toBe(
      "alice",
    );

    // integration is idempotent (a re-tally does not duplicate rows)
    expect(Store.materialize(root, "E-BLIND-1", result, "2026-07-31T01:30:00Z").ok).toBe(true);
    expect(JSON.parse(rawLedger()).ballots.length).toBe(2);
  });

  test("pending storage preserves amend coexistence, duplicate rejection and the late lane", () => {
    expect(Store.create(root, election()).ok).toBe(true);
    expect(Store.setState(root, "E-BLIND-1", "collecting").ok).toBe(true);
    const original = ballot("alice");
    expect(Store.appendBallot(root, "E-BLIND-1", original, RECV).ok).toBe(true);

    // duplicate detection spans the pending lane
    const dup = Store.appendBallot(root, "E-BLIND-1", ballot("alice"), RECV);
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error).toBe("duplicate");

    // an amend whose ref points at a pending ballot resolves (BR-3, not unknown-ref)
    const amend = {
      ...ballot("alice"),
      kind: "amend" as const,
      ref: { electionId: "E-BLIND-1", voter: "alice", submittedAt: original.submittedAt },
      submittedAt: "2026-07-31T00:30:00Z",
    };
    expect(Store.appendBallot(root, "E-BLIND-1", amend, RECV).ok).toBe(true);
    const badAmend = {
      ...amend,
      ref: { electionId: "E-BLIND-1", voter: "alice", submittedAt: "2026-07-30T00:00:00Z" },
    };
    const rejected = Store.appendBallot(root, "E-BLIND-1", badAmend, RECV);
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error).toBe("unknown-ref");

    expect(Store.appendBallot(root, "E-BLIND-1", ballot("bob"), RECV).ok).toBe(true);
    const result = {
      kind: "established" as const,
      winner: { internalNo: 1, label: "a" },
      choiceCounts: [
        { internalNo: 1, label: "a", count: 3 },
        { internalNo: 2, label: "b", count: 0 },
      ],
      goa: { favor: 3, against: 0, abstain: 0, discuss: 0 },
    };
    expect(Store.materialize(root, "E-BLIND-1", result, "2026-07-31T01:00:00Z").ok).toBe(true);
    expect(Store.setState(root, "E-BLIND-1", "tallied").ok).toBe(true);

    const integrated = JSON.parse(rawLedger());
    expect(integrated.ballots.map((b: { voter: string; kind: string }) => `${b.voter}:${b.kind}`)).toEqual([
      "alice:original",
      "alice:amend",
      "bob:original",
    ]);

    // late lane still lands on the ledger's late array, fixed set untouched
    const carolRoot = election({ electionId: "E-BLIND-2", voters: ["alice", "carol"] });
    expect(Store.create(root, carolRoot).ok).toBe(true);
    expect(
      Store.materialize(
        root,
        "E-BLIND-2",
        { kind: "hold", reason: "tie", counts: { favor: 0, against: 0, abstain: 0, discuss: 0 } },
        "2026-07-31T01:00:00Z",
      ).ok,
    ).toBe(true);
    expect(Store.setState(root, "E-BLIND-2", "hold").ok).toBe(true);
    const lateCarol = {
      ...ballot("carol", 8, "E-BLIND-2"),
      submittedAt: "2026-07-31T02:00:00Z",
    };
    expect(Store.appendBallot(root, "E-BLIND-2", lateCarol, RECV_LATE).ok).toBe(true);
    const l2 = Store.ledger(root, "E-BLIND-2");
    expect(l2.ok).toBe(true);
    if (l2.ok) {
      expect(l2.value.ballots.length).toBe(0);
      expect(l2.value.late.length).toBe(1);
      expect(l2.value.late[0]?.reexamRequired).toBe(true);
    }
  });

  test("io-error branches of the pending lane: unreadable dir, blocked mkdir, undeletable drain", () => {
    // (1) readPending readdir catch — the pending directory exists but cannot
    // be listed (permission 000), so every reader fails loudly.
    expect(Store.create(root, election()).ok).toBe(true);
    expect(Store.setState(root, "E-BLIND-1", "collecting").ok).toBe(true);
    expect(Store.appendBallot(root, "E-BLIND-1", ballot("alice"), RECV).ok).toBe(true);
    const pending = pendingDir(dirOf());
    chmodSync(pending, 0o000);
    const unreadable = Store.ledger(root, "E-BLIND-1");
    chmodSync(pending, 0o755);
    expect(unreadable.ok).toBe(false);
    if (!unreadable.ok) expect(unreadable.error).toBe("io-error");

    // (2) integratePending rmSync catch — the drain cannot remove the entries
    // because the pending directory itself is not writable.
    chmodSync(pending, 0o555);
    const blockedDrain = Store.materialize(
      root,
      "E-BLIND-1",
      { kind: "hold", reason: "tie", counts: { favor: 0, against: 0, abstain: 0, discuss: 0 } },
      "2026-07-31T01:00:00Z",
    );
    chmodSync(pending, 0o755);
    expect(blockedDrain.ok).toBe(false);
    if (!blockedDrain.ok) expect(blockedDrain.error).toBe("io-error");

    // (3) appendPending mkdir catch — the election directory is not writable,
    // so the pending directory cannot be created. The directory is still
    // readable, so the read side returns an empty pending set and the failure
    // is genuinely the mkdir (not the listing branch above).
    expect(Store.create(root, election({ electionId: "E-BLIND-3" })).ok).toBe(true);
    expect(Store.setState(root, "E-BLIND-3", "collecting").ok).toBe(true);
    chmodSync(dirOf("E-BLIND-3"), 0o555);
    const blockedMkdir = Store.appendBallot(
      root,
      "E-BLIND-3",
      ballot("alice", 2, "E-BLIND-3"),
      RECV,
    );
    chmodSync(dirOf("E-BLIND-3"), 0o755);
    expect(blockedMkdir.ok).toBe(false);
    if (!blockedMkdir.ok) expect(blockedMkdir.error).toBe("io-error");
  });

  test("the pending directory is gitignored in this repo and in every shipped harness gitignore", () => {
    // (a) the repo's own ignore rule matches a concrete pending ballot path
    const probe = "amadeus/spaces/default/elections/260731-e-blind/pending/alice.json";
    const checked = Bun.spawnSync(["git", "check-ignore", "-q", probe], { cwd: REPO_ROOT });
    expect(checked.exitCode).toBe(0);

    // (b) the pattern is present in the repo gitignore and in each harness's
    // shipped dot-gitignore (the same leak exists in a user's workspace)
    const sources = [join(REPO_ROOT, ".gitignore")];
    const harnessRoot = join(REPO_ROOT, "packages", "framework", "harness");
    for (const harness of readdirSync(harnessRoot)) {
      const shipped = join(harnessRoot, harness, "dot-gitignore");
      if (existsSync(shipped)) sources.push(shipped);
    }
    expect(sources.length).toBeGreaterThan(1);
    for (const source of sources) {
      expect(readFileSync(source, "utf8")).toContain(IGNORE_PATTERN);
    }
  });
});
