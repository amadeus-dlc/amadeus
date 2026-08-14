// covers: object:ElectionStore
// size: medium
//
// t417 — fail-closed read path for election.json. The write path runs every
// definition through the canonical codec, so the read path must be its mirror: a
// file whose JSON is syntactically fine but whose definition breaks a canonical
// invariant is rejected as corrupt, and the write-back read site (setState) must
// refuse rather than spread the broken definition into a fresh write.
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
import {
  type CanonicalElectionDefinition,
  ElectionDefinitionCodec,
} from "../../packages/framework/core/tools/amadeus-election-codec";
import {
  ElectionStore,
  resolveElectionDir,
} from "../../packages/framework/core/tools/amadeus-election-store";

// Fixed seed: deterministic replay of any counterexample (convention #1).
const PBT_SEED = 0x19_80e2;
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
// PR CI: default numRuns (100). Deep tier: a large budget, opt-in via env.
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };
// P-EL4 mints and tears down a whole election tree per run (~3ms of real
// filesystem work), so the 50k deep budget would cost ~150s — over the deep
// job's 30s x TEST_TIME_FACTOR per-test timeout and a third of its 5-minute
// wall clock. Its deep tier is sized to that budget instead: 2k runs is ~20x
// the PR tier and still finishes in seconds. Measured with `bun test` on this
// file: 100 runs ~0.3s, 2000 runs ~5s, 50000 runs ~63s (timed out).
const BOUNDARY_OPTS = DEEP ? { seed: PBT_SEED, numRuns: 2_000 } : { seed: PBT_SEED };

const ELECTION_ID = "E-RP-1";

// The definition as it sits on disk after create: canonical wire fields plus the
// storage-only `state`, which the registry row mirrors ("draft" right after
// create). Every case below keeps the state at "draft" so the differentiator is
// always the broken definition invariant, never a registry/state divergence.
const DEF = {
  schemaVersion: 2,
  electionId: ELECTION_ID,
  kind: "zero-confirm",
  questions: [
    { questionId: "q1", text: "q one", choices: [{ internalNo: 1, label: "a" }] },
    { questionId: "q2", text: "q two", choices: [{ internalNo: 1, label: "b" }] },
  ],
  voters: ["alice", "bob"],
};

function election(): CanonicalElectionDefinition {
  const decoded = ElectionDefinitionCodec.decode(DEF);
  if (!decoded.ok) throw new Error("definition must decode");
  return decoded.value;
}

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "election-readpath-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function electionJsonPath(): string {
  return join(resolveElectionDir(root, ELECTION_ID), "election.json");
}

// ElectionStore.load resolves through the registry, so every case starts from a
// real created election and overwrites its definition file in place.
function createElection(): void {
  expect(ElectionStore.create(root, election()).ok).toBe(true);
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

// Definitions the codec accepts, shaped EXACTLY like CanonicalElectionDefinition
// so a value carrying extra keys (which the closed wire format rejects) can never
// appear. Uniqueness is produced BY CONSTRUCTION (fc.uniqueArray), never by
// generating and filtering — a post-hoc filter would re-implement the codec's own
// rejection rule inside the generator.
const textArb = fc.string({ maxLength: 12 });
const choiceArb = fc
  .tuple(fc.integer({ min: -20, max: 20 }), textArb, fc.boolean(), textArb)
  .map(([internalNo, label, hasDescription, description]) =>
    hasDescription ? { internalNo, label, description } : { internalNo, label },
  );
const questionArb = fc.record({
  questionId: fc.integer({ min: 0, max: 10_000 }).map((value) => `q-${value}`),
  text: fc.integer().map((value) => `question-${value}`),
  choices: fc.uniqueArray(choiceArb, {
    minLength: 1,
    maxLength: 4,
    selector: (choice) => choice.internalNo,
  }),
});
// Voter ids are also file names in the pending/ and ballots/ lanes, so the
// generator stays inside the single-path-segment vocabulary the store accepts.
const validDefinitionArb: fc.Arbitrary<CanonicalElectionDefinition> = fc
  .record({
    schemaVersion: fc.constant(2 as const),
    electionId: fc.integer({ min: 0, max: 10_000 }).map((value) => `E-RT-${value}`),
    kind: textArb,
    questions: fc.uniqueArray(questionArb, {
      minLength: 1,
      maxLength: 3,
      selector: (question) => question.questionId,
    }),
    voters: fc.uniqueArray(fc.integer({ min: 0, max: 10_000 }).map((value) => `v-${value}`), {
      minLength: 1,
      maxLength: 4,
    }),
  })
  .map((definition) => definition as CanonicalElectionDefinition);

// Payloads with EXACTLY ONE broken canonical invariant, each produced by
// construction so the property never has to decide invalidity itself (which
// would re-implement the codec inside the generator).
const labelArb = fc.string({ maxLength: 8 });
const nonStringArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.integer(),
  fc.constant(null),
  fc.array(fc.integer(), { maxLength: 2 }),
  fc.boolean(),
);
const file = { ...DEF, state: "draft" };

const invalidElectionFileArb: fc.Arbitrary<unknown> = fc.oneof(
  // duplicated choice internalNo inside one question
  labelArb.map((label) => ({
    ...file,
    questions: [
      { ...file.questions[0], choices: [...file.questions[0].choices, { internalNo: 1, label }] },
      file.questions[1],
    ],
  })),
  // empty choice list
  fc.constant({
    ...file,
    questions: [{ ...file.questions[0], choices: [] }, file.questions[1]],
  }),
  // duplicated questionId
  fc.constant({ ...file, questions: [file.questions[0], { ...file.questions[1], questionId: "q1" }] }),
  // empty question list
  fc.constant({ ...file, questions: [] }),
  // duplicated voter
  fc.constant({ ...file, voters: [...file.voters, "alice"] }),
  // empty voter list
  fc.constant({ ...file, voters: [] }),
  // blank electionId
  fc.constant({ ...file, electionId: "" }),
  // a required field replaced by a value of the wrong type
  fc
    .tuple(
      fc.constantFrom("electionId", "kind", "questions", "voters", "state"),
      nonStringArb,
    )
    .map(([field, value]) => ({ ...file, [field]: value })),
  // a non-string choice description
  nonStringArb.map((value) => ({
    ...file,
    questions: [
      {
        ...file.questions[0],
        choices: [{ ...file.questions[0].choices[0], description: value }],
      },
      file.questions[1],
    ],
  })),
  // an unknown extra field on the definition (the wire format is closed)
  labelArb.map((value) => ({ ...file, note: value })),
);

describe("t417 election-store fail-closed read path", () => {
  // Pin #1: a duplicated choice internalNo splits one choice into two rows
  // counting the same responses.
  test("load rejects a definition with a duplicated choice internalNo", () => {
    seedAndOverwrite({
      ...file,
      questions: [
        {
          ...DEF.questions[0],
          choices: [
            { internalNo: 1, label: "a" },
            { internalNo: 1, label: "b" },
          ],
        },
        DEF.questions[1],
      ],
    });
    const loaded = ElectionStore.load(root, ELECTION_ID);
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toBe("corrupt");
  });

  // The write-back read site is the other half of the pair: reading an invalid
  // definition there would spread it into a fresh write, pinning the broken
  // definition on disk under a new state.
  test("setState rejects an invalid definition and leaves the bytes untouched", () => {
    const bytes = seedAndOverwrite({ ...file, voters: ["alice", "alice"] });
    const result = ElectionStore.setState(root, ELECTION_ID, "open");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("corrupt");
    expect(readFileSync(electionJsonPath(), "utf8")).toBe(bytes);
  });

  // The state field is storage-only, so the definition codec never sees it: the
  // vocabulary check is the composer's own second step.
  test("load rejects a valid definition carrying an unknown state", () => {
    seedAndOverwrite({ ...file, state: "unknown-state" });
    const loaded = ElectionStore.load(root, ELECTION_ID);
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toBe("corrupt");
  });

  // A schemaVersion other than 2 is unsupported, NOT corrupt: the wire format
  // stamp is reported as its own arm so no reader retries under an older shape.
  test("load reports a non-canonical schemaVersion as unsupported", () => {
    seedAndOverwrite({ ...file, schemaVersion: 1 });
    const loaded = ElectionStore.load(root, ELECTION_ID);
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toBe("unsupported");
  });

  // Pin #2: an empty question list degenerates the tally (no result rows at all).
  test("load rejects a definition with an empty question list", () => {
    seedAndOverwrite({ ...file, questions: [] });
    const loaded = ElectionStore.load(root, ELECTION_ID);
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toBe("corrupt");
  });

  // Pin #3: a duplicated voter inflates quorum and leaves the pending set
  // permanently unsatisfiable.
  test("load rejects a definition with a duplicated voter", () => {
    seedAndOverwrite({ ...file, voters: ["alice", "alice"] });
    const loaded = ElectionStore.load(root, ELECTION_ID);
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error).toBe("corrupt");
  });

  // P-EL4: the store is a persistence boundary, so its write and its read must
  // be inverses — a definition that went through create() comes back from load()
  // unchanged, and a state transition changes the state and NOTHING else. The
  // oracle is the input value itself, never a re-implementation of the codec, so
  // a shared blind spot between subject and oracle cannot cancel out.
  test("P-EL4: a definition survives the store write/read boundary unchanged", () => {
    fc.assert(
      fc.property(validDefinitionArb, (definition) => {
        const boundaryRoot = mkdtempSync(join(tmpdir(), "election-roundtrip-"));
        try {
          expect(ElectionStore.create(boundaryRoot, definition).ok).toBe(true);
          const created = ElectionStore.load(boundaryRoot, definition.electionId);
          expect(created.ok).toBe(true);
          if (!created.ok) return;
          expect(created.value.definition).toEqual(definition);
          expect(created.value.state).toBe("draft");

          expect(ElectionStore.setState(boundaryRoot, definition.electionId, "collecting").ok).toBe(true);
          const moved = ElectionStore.load(boundaryRoot, definition.electionId);
          expect(moved.ok).toBe(true);
          if (!moved.ok) return;
          expect(moved.value.definition).toEqual(definition);
          expect(moved.value.state).toBe("collecting");
        } finally {
          rmSync(boundaryRoot, { recursive: true, force: true });
        }
      }),
      BOUNDARY_OPTS,
    );
  });

  // P-EL2: every payload with exactly one broken invariant is rejected on read.
  // The assertion is only "rejected, and never ok" — WHY it is invalid is decided
  // by the subject alone, never re-derived here.
  test("P-EL2: a payload breaking one invariant never loads", () => {
    createElection();
    fc.assert(
      fc.property(invalidElectionFileArb, (payload) => {
        overwrite(payload);
        const loaded = ElectionStore.load(root, ELECTION_ID);
        expect(loaded.ok).toBe(false);
        if (!loaded.ok) expect(loaded.error).toBe("corrupt");
      }),
      OPTS,
    );
  });
});
