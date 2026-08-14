// t373 — Issue #1773: accepted ballots must stay out of the shared, tracked
// ledger.json while an election is still collecting. Until integration, each
// accepted ballot lives in a per-voter file under the election's gitignored
// pending/ directory, so a voter who has not voted yet cannot read a peer's
// choice/GoA/rationale through a file-change notification or `git status` /
// `git diff`.
// Layer: integration (real tmp elections root + a real `git check-ignore` run).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
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
} from "../../packages/framework/core/tools/amadeus-election-store";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const IGNORE_PATTERN = "amadeus/spaces/*/elections/*/pending/";

const ELECTION_ID = "E-BLIND-1";

const DEF = {
  schemaVersion: 2,
  electionId: ELECTION_ID,
  kind: "clarification",
  questions: [
    {
      questionId: "q1",
      text: "q",
      choices: [
        { internalNo: 1, label: "a" },
        { internalNo: 2, label: "b" },
      ],
    },
  ],
  voters: ["alice", "bob"],
};

const SECRET_RESERVATION = "SECRET-RESERVATION-TEXT";
const SECRET_RATIONALE = "SECRET-RATIONALE-TEXT";

function election(): CanonicalElectionDefinition {
  const decoded = ElectionDefinitionCodec.decode(DEF);
  if (!decoded.ok) throw new Error("definition must decode");
  return decoded.value;
}

function ballot(voter: string, submittedAt = "2026-07-31T00:00:00Z"): CanonicalBallot {
  return {
    schemaVersion: 2,
    kind: "original",
    electionId: ELECTION_ID,
    voter,
    voterKind: "member",
    responses: [
      {
        questionId: "q1",
        choiceInternalNo: 1,
        goa: 2,
        reservation: SECRET_RESERVATION,
        rationale: SECRET_RATIONALE,
      },
    ],
    submittedAt,
  };
}

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "election-blind-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function dirOf(): string {
  return resolveElectionDir(root, ELECTION_ID);
}

function pendingDir(): string {
  return join(dirOf(), "pending");
}

function rawLedger(): string {
  return readFileSync(join(dirOf(), "ledger.json"), "utf8");
}

function openCollecting(): void {
  expect(ElectionStore.create(root, election()).ok).toBe(true);
  expect(ElectionStore.setState(root, ELECTION_ID, "collecting").ok).toBe(true);
}

describe("t373 election ballot blind storage (#1773)", () => {
  test("a ballot accepted while collecting never reaches the shared ledger.json", () => {
    openCollecting();
    expect(ElectionStore.appendPending(root, ELECTION_ID, ballot("alice")).ok).toBe(true);

    // (a) the tracked shared file carries no ballot body at all
    const raw = rawLedger();
    expect(raw).not.toContain(SECRET_RESERVATION);
    expect(raw).not.toContain(SECRET_RATIONALE);
    expect(raw).not.toContain("alice");

    // (b) the body is in the per-voter pending file instead
    expect(existsSync(join(pendingDir(), "alice.json"))).toBe(true);
    expect(readFileSync(join(pendingDir(), "alice.json"), "utf8")).toContain(SECRET_RATIONALE);

    // (c) the snapshot separates the two lanes: pending holds the body, the
    // ledger is still empty
    const snapshot = ElectionStore.readSnapshot(root, ELECTION_ID);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;
    expect(snapshot.value.pending.map((b) => b.voter)).toEqual(["alice"]);
    expect(snapshot.value.ledger).toEqual([]);
    expect(snapshot.value.materialized).toEqual([]);
    expect(snapshot.value.state).toBe("collecting");
  });

  test("integration moves every pending ballot into ledger.json and drains the blind lane", () => {
    openCollecting();
    expect(ElectionStore.appendPending(root, ELECTION_ID, ballot("bob")).ok).toBe(true);
    expect(
      ElectionStore.appendPending(root, ELECTION_ID, ballot("alice", "2026-07-31T00:01:00Z")).ok,
    ).toBe(true);

    const integrated = ElectionStore.integratePending(root, ELECTION_ID, ["alice", "bob"]);
    expect(integrated.ok).toBe(true);
    if (integrated.ok) expect(integrated.value.integrated).toBe(2);

    // The bodies are now on the shared ledger — the blindness window closed at
    // integration, not before.
    const raw = rawLedger();
    expect(raw).toContain(SECRET_RATIONALE);
    const snapshot = ElectionStore.readSnapshot(root, ELECTION_ID);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;
    expect(snapshot.value.pending).toEqual([]);
    expect(snapshot.value.ledger).toHaveLength(2);
    // Deterministic order regardless of the arrival order above.
    expect(snapshot.value.materialized.map((b) => b.voter)).toEqual(["alice", "bob"]);
    // The drained pending directory leaves no per-voter file behind.
    expect(existsSync(join(pendingDir(), "alice.json"))).toBe(false);
    expect(existsSync(join(pendingDir(), "bob.json"))).toBe(false);
  });

  test("a peer's pending file is never read into another voter's view of the ledger", () => {
    openCollecting();
    expect(ElectionStore.appendPending(root, ELECTION_ID, ballot("alice")).ok).toBe(true);
    // Integrating only bob (who has not voted) must not pull alice's body across.
    const integrated = ElectionStore.integratePending(root, ELECTION_ID, ["bob"]);
    expect(integrated.ok).toBe(true);
    if (integrated.ok) expect(integrated.value.integrated).toBe(0);
    expect(rawLedger()).not.toContain(SECRET_RATIONALE);
    expect(existsSync(join(pendingDir(), "alice.json"))).toBe(true);
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
