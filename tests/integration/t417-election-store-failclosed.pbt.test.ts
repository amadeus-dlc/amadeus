// covers: function:parseElectionFile, function:Store.load, function:Store.setState
// size: medium
//
// t417 — fail-closed read path for election.json (#1980, Bolt 1 walking
// skeleton). The write path already runs every definition through
// Election.parse, but the read path used to cast the parsed JSON straight to
// ElectionFile, so a file whose JSON is syntactically fine but whose definition
// is invalid (the #1459 shapes) was accepted on the way back in.
// Layer: integration (touches a tmp elections root — fs-tests-integration-first).
//
// ── PBT CONVENTIONS ─────────────────────────────────────────────────────────
// Mirrors tests/unit/setup-semver.pbt.test.ts (the canonical B1 definition):
// 1. DETERMINISTIC PR CI. Every property runs with a FIXED per-property seed
//    (PBT_SEED below) and fast-check's DEFAULT numRuns (100). A fixed seed makes
//    a red build reproducible: the same counterexample on re-run, in CI too.
// 2. FAILURE OUTPUT. On failure fast-check prints the seed, replay path, and
//    the SHRUNK counterexample — enough to reproduce with no extra wiring.
// 3. PINNING SHRUNK COUNTEREXAMPLES. When a property catches a real bug, copy
//    the shrunk counterexample into an example-based test and commit it as the
//    permanent regression pin; the property keeps hunting.
// 4. DEEP RUNS (opt-in, no new CI job). AMADEUS_PBT_DEEP=1 raises numRuns via
//    the existing `--release` tier; default (CI) runs stay in the small band.
// ────────────────────────────────────────────────────────────────────────────

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import fc from "fast-check";
import { invalidElectionFileArb } from "../helpers/arbitraries/election";
import { Election } from "../../packages/framework/core/tools/amadeus-election-model";
import {
  resolveElectionDir,
  Store,
} from "../../packages/framework/core/tools/amadeus-election-store";

// Fixed seed: deterministic replay of any counterexample (convention #1).
const PBT_SEED = 0x19_80e2;
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
// PR CI: default numRuns (100). Deep tier: a large budget, opt-in via env.
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };

const ELECTION_ID = "E-RP-1";

const DEF = {
  electionId: ELECTION_ID,
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

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "election-readpath-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function electionJsonPath(): string {
  return join(resolveElectionDir(root, ELECTION_ID).dir, "election.json");
}

// Store.load throws for an id that is not in the registry, so every case starts
// from a real created election and overwrites its definition file.
function createElection(): void {
  expect(Store.create(root, election()).ok).toBe(true);
}

function overwrite(content: unknown): string {
  const bytes = JSON.stringify(content);
  writeFileSync(electionJsonPath(), bytes);
  return bytes;
}

function seedAndOverwrite(content: unknown): string {
  createElection();
  return overwrite(content);
}

describe("t417 election-store fail-closed read path", () => {
  // P-EL3 pin #1 (#1459 shape 1): a duplicated choice internalNo splits one
  // choice into two rows counting the same ballots.
  test("load rejects a definition with a duplicated choice internalNo", () => {
    seedAndOverwrite({
      ...DEF,
      choices: [
        { internalNo: 1, label: "a" },
        { internalNo: 1, label: "b" },
      ],
      state: "draft",
    });
    const loaded = Store.load(root, ELECTION_ID);
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toBe("corrupt");
  });

  // The write-back read site is the other half of the pair: reading an invalid
  // definition there used to spread it into a fresh write, pinning the broken
  // definition on disk under a new state.
  test("setState rejects an invalid definition and leaves the bytes untouched", () => {
    const bytes = seedAndOverwrite({
      ...DEF,
      voters: ["alice", "alice"],
      state: "draft",
    });
    const result = Store.setState(root, ELECTION_ID, "open");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("corrupt");
    expect(readFileSync(electionJsonPath(), "utf8")).toBe(bytes);
  });

  // The state field is storage-only, so Election.parse never sees it: the
  // vocabulary check is the composer's own second step.
  test("load rejects a valid definition carrying an unknown state", () => {
    seedAndOverwrite({ ...DEF, state: "unknown-state" });
    const loaded = Store.load(root, ELECTION_ID);
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toBe("corrupt");
  });

  // P-EL3 pin #2 (#1459 shape 2): an empty choice list degenerates the tally the
  // same way (top = 0, no leader).
  test("load rejects a definition with an empty choice list", () => {
    seedAndOverwrite({ ...DEF, choices: [], state: "draft" });
    const loaded = Store.load(root, ELECTION_ID);
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toBe("corrupt");
  });

  // P-EL3 pin #3 (#1459 shape 3): a duplicated voter inflates quorum and leaves
  // the pending set permanently unsatisfiable.
  test("load rejects a definition with a duplicated voter", () => {
    seedAndOverwrite({ ...DEF, voters: ["alice", "alice"], state: "draft" });
    const loaded = Store.load(root, ELECTION_ID);
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toBe("corrupt");
  });

  // P-EL2: every payload with exactly one broken invariant is rejected on read.
  // The assertion is only "rejected, as corrupt" — WHY it is invalid is decided
  // by the subject alone, never re-derived here.
  test("P-EL2: a payload breaking one invariant never loads", () => {
    createElection();
    fc.assert(
      fc.property(invalidElectionFileArb, (payload) => {
        overwrite(payload);
        const loaded = Store.load(root, ELECTION_ID);
        expect(loaded.ok).toBe(false);
        if (!loaded.ok) expect(loaded.error).toBe("corrupt");
      }),
      OPTS,
    );
  });
});
