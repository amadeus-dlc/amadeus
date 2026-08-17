// covers: object:ElectionStore function:appendPending function:readAllPending function:readPendingVoter
//
// t3046 — ADR-5 (#3046): appendPending's arrival-sequence numbering used to
// read every voter's pending file and take a global max+1 before writing only
// the calling voter's own file. Two different voters racing that
// read-then-write window could both compute the same next sequence, and the
// subsequent global-uniqueness check in readAllPending would then fail the
// whole store closed with "corrupt" (no CLI repair path exists). ADR-5 scopes
// numbering to each voter's own pending file (read set == write set) and
// switches the uniqueness/ordering check from a bare arrivalSequence to the
// composite key (voter, arrivalSequence), so cross-voter sequence overlap is
// the expected shape rather than corruption.
//
// Mechanism: real OS processes (Bun.spawn), not an in-process simulation —
// the defect IS inter-process timing, so an in-process call sequence could
// never exercise it (mirrors t33's rationale for the audit-logger lock).
// Two sibling processes busy-wait on a shared barrier file (no sleep, to
// avoid reintroducing timing scatter) so they enter appendPending's
// read-then-write window at (near) the same instant.

import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import fc from "fast-check";
import type { CanonicalElectionDefinition } from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import { ElectionStore, resolveElectionDir } from "../../packages/framework/core/tools/amadeus-election-store.ts";
import { raceBallot } from "../helpers/election-append-race-child.ts";
import { resolveTestTimeFactor, scaleTestTime } from "../lib/test-time-factor.ts";

const BUN = process.execPath;
const CHILD = join(__dirname, "..", "helpers", "election-append-race-child.ts");

// Fixed seed: deterministic replay of any counterexample (mirrors t417 convention #1).
const OPTS = { seed: 0x30_46 };

const DEFINITION: CanonicalElectionDefinition = {
  schemaVersion: 2,
  electionId: "E-RACE-3046",
  kind: "decision",
  questions: [
    { questionId: "q1", text: "First?", choices: [{ internalNo: 1, label: "yes" }, { internalNo: 2, label: "no" }] },
  ],
  voters: ["alice", "bob", "carol"],
};

interface RaceEntry {
  readonly voter: string;
  readonly choice: number;
  readonly submittedAt: string;
}

interface RaceResult {
  readonly voter: string;
  readonly stdout: string;
}

/**
 * Spawn one real process per entry, hold every one of them on a shared
 * barrier until all have signalled readiness, then release the barrier so
 * every process enters ElectionStore.appendPending at (near) the same
 * instant. Returns each child's raw stdout (one JSON line) in entry order.
 *
 * Ready paths are keyed by each entry's ARRAY INDEX, not by voter: contract
 * 4 races two entries for the SAME voter, and keying by voter would collapse
 * both ready signals onto one path — the barrier would then release as soon
 * as the first sibling signalled, before the second had even started its
 * busy-wait, silently weakening the race.
 */
async function race(root: string, entries: readonly RaceEntry[]): Promise<RaceResult[]> {
  const barrierPath = join(root, `barrier-${Math.random().toString(36).slice(2)}`);
  const procs = entries.map((entry, index) =>
    Bun.spawn({
      cmd: [
        BUN,
        CHILD,
        root,
        DEFINITION.electionId,
        entry.voter,
        String(entry.choice),
        entry.submittedAt,
        String(index),
        barrierPath,
      ],
      stdout: "pipe",
      stderr: "pipe",
    }),
  );
  const readyPaths = entries.map((_, index) => `${barrierPath}.ready.${index}`);
  const deadline = Date.now() + scaleTestTime(10_000, resolveTestTimeFactor());
  while (!readyPaths.every((p) => existsSync(p))) {
    if (Date.now() > deadline) throw new Error("t3046: siblings never signalled ready");
  }
  writeFileSync(barrierPath, "go");
  const stdouts = await Promise.all(procs.map((p) => new Response(p.stdout).text()));
  const stderrs = await Promise.all(procs.map((p) => new Response(p.stderr).text()));
  await Promise.all(procs.map((p) => p.exited));
  return entries.map((entry, i) => {
    if (stdouts[i]?.trim() === "") {
      throw new Error(`t3046: child for ${entry.voter} produced no stdout; stderr: ${stderrs[i]}`);
    }
    return { voter: entry.voter, stdout: stdouts[i] as string };
  });
}

function parseResult(
  raw: string,
): { ok: boolean; value?: { idempotent: boolean; arrivalSequence: number }; error?: string } {
  return JSON.parse(raw.trim());
}

function freshRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "election-race-3046-"));
  expect(ElectionStore.create(root, DEFINITION).ok).toBe(true);
  expect(ElectionStore.setState(root, DEFINITION.electionId, "collecting").ok).toBe(true);
  return root;
}

// Delegates to the same factory the race child uses, so a ballot built here
// (for direct in-process appendPending calls and forged pending files) can
// never drift from what the spawned siblings build for themselves.
function ballotFor(voter: string, choice: number, submittedAt: string) {
  return raceBallot(DEFINITION.electionId, voter, choice, submittedAt);
}

describe("t3046 concurrent-voter appendPending numbering (#3046, ADR-5)", () => {
  // The falling proof: before ADR-5, two different voters racing appendPending
  // could both compute arrivalSequence 0 (global max+1 over ALL pending files),
  // after which the store is corrupt forever (no repair verb). ADR-5's fix scopes
  // numbering to each voter's own file, so two different voters can NEVER collide
  // — every attempt must both succeed AND land arrivalSequence 0 in its own file
  // (each is genuinely that voter's first-ever ballot), and the store must never
  // report corrupt. Repeated across many attempts to rule out lucky scheduling.
  test("two different voters racing appendPending never corrupt the store (falling proof for #3046)", async () => {
    const ATTEMPTS = 15;
    for (let i = 0; i < ATTEMPTS; i++) {
      const root = freshRoot();
      try {
        const [aliceRes, bobRes] = await race(root, [
          { voter: "alice", choice: 1, submittedAt: "2026-08-17T00:00:00Z" },
          { voter: "bob", choice: 2, submittedAt: "2026-08-17T00:00:01Z" },
        ]);
        const alice = parseResult(aliceRes.stdout);
        const bob = parseResult(bobRes.stdout);
        expect(alice).toMatchObject({ ok: true, value: { idempotent: false, arrivalSequence: 0 } });
        expect(bob).toMatchObject({ ok: true, value: { idempotent: false, arrivalSequence: 0 } });
        const verified = ElectionStore.verify(root, DEFINITION.electionId);
        expect(verified.ok).toBe(true);
        const snapshot = ElectionStore.readSnapshot(root, DEFINITION.electionId);
        expect(snapshot.ok).toBe(true);
        if (snapshot.ok) {
          expect(snapshot.value.pending.map((b) => b.voter).sort()).toEqual(["alice", "bob"]);
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  // ADR-5 contract 1: appendPending's numbering must never read another
  // voter's pending file. Forge a much higher arrival sequence into bob's
  // file first — carol's own numbering must be entirely unaffected by its
  // contents (a global-max reader would instead skip ahead to 100).
  test("appendPending numbers strictly from the calling voter's own file, never from readAllPending (ADR-5 contract 1)", () => {
    const root = freshRoot();
    try {
      expect(
        ElectionStore.appendPending(root, DEFINITION.electionId, ballotFor("alice", 1, "2026-08-17T00:00:00Z")).ok,
      ).toBe(true);
      const pendingDir = join(resolveElectionDir(root, DEFINITION.electionId), "pending");
      writeFileSync(
        join(pendingDir, "bob.json"),
        JSON.stringify({
          schemaVersion: 2,
          electionId: DEFINITION.electionId,
          voter: "bob",
          events: [{ arrivalSequence: 99, ballot: ballotFor("bob", 2, "2026-08-17T00:00:02Z") }],
        }),
      );
      const carol = ElectionStore.appendPending(root, DEFINITION.electionId, ballotFor("carol", 1, "2026-08-17T00:00:04Z"));
      expect(carol).toMatchObject({ ok: true, value: { idempotent: false, arrivalSequence: 0 } });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // ADR-5 contract 4: the SAME voter double-posting the identical ballot
  // concurrently (e.g. a client retry racing itself) is last-write-wins, not
  // corruption — writeStoreFile's tmp+rename means whichever write's rename
  // lands last fully replaces the file; the store stays a single
  // well-formed event, never zero (torn write) and never a hybrid.
  //
  // NOTE ON THE LOSING CALLER'S RETURN VALUE: writeStoreFile (pre-existing,
  // shared by every store write, not part of ADR-5) uses a fixed `${path}.tmp`
  // name. When two processes race a write to the SAME final path, the loser's
  // own renameSync can observe ENOENT (the winner already renamed the shared
  // tmp file away) and report "io-error" for its own call — a benign,
  // retry-safe "lost the instant" signal, not corruption: the store's final
  // state is still exactly one well-formed event. ADR-5's contract is that the
  // STORE never corrupts under this race, not that every concurrent caller's
  // own return value is ok:true; making every caller observe a clean result
  // would need per-writer tmp names, which is the "並行 voter の実運用化"
  // the code-generation plan explicitly defers to a future intent.
  test("concurrent double-post from the SAME voter is last-write-wins and never corrupts the store (ADR-5 contract 4)", async () => {
    const ATTEMPTS = 10;
    for (let i = 0; i < ATTEMPTS; i++) {
      const root = freshRoot();
      try {
        const [resA, resB] = await race(root, [
          { voter: "alice", choice: 1, submittedAt: "2026-08-17T00:00:00Z" },
          { voter: "alice", choice: 1, submittedAt: "2026-08-17T00:00:00Z" },
        ]);
        const a = parseResult(resA.stdout);
        const b = parseResult(resB.stdout);
        // At least one of the two racers observes a clean result (it won the
        // race, or read the sibling's already-persisted identical ballot);
        // the other may see the loser's retry-safe "io-error" documented
        // above, but never anything else (a real content conflict is
        // impossible here since both submit the exact same ballot).
        expect(a.ok || b.ok).toBe(true);
        if (!a.ok) expect(a.error).toBe("io-error");
        if (!b.ok) expect(b.error).toBe("io-error");
        const snapshot = ElectionStore.readSnapshot(root, DEFINITION.electionId);
        expect(snapshot.ok).toBe(true);
        if (!snapshot.ok) continue;
        // Exactly one surviving event — never zero (torn write) and never two
        // (which would imply the lock-free writes actually merged).
        expect(snapshot.value.pending).toHaveLength(1);
        const survivor = snapshot.value.pending[0];
        expect(survivor?.voter).toBe("alice");
        expect(survivor?.responses[0]?.choiceInternalNo).toBe(1);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    }
  });

  // ADR-5 contract 2/3: within one voter's own pending file, arrivalSequence
  // must be strictly increasing — a forged file that violates that is
  // rejected fail-closed, never silently re-sorted.
  test("P1: a single voter's pending file with non-monotonic arrivalSequence is rejected fail-closed", () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer({ min: 0, max: 20 }), { minLength: 2, maxLength: 6 }), (values) => {
        const sorted = [...values].sort((x, y) => x - y);
        fc.pre(values.join(",") !== sorted.join(",")); // exercise only out-of-order shapes
        const root = freshRoot();
        try {
          const pendingDir = join(resolveElectionDir(root, DEFINITION.electionId), "pending");
          mkdirSync(pendingDir, { recursive: true });
          writeFileSync(
            join(pendingDir, "alice.json"),
            JSON.stringify({
              schemaVersion: 2,
              electionId: DEFINITION.electionId,
              voter: "alice",
              events: values.map((arrivalSequence, index) => ({
                arrivalSequence,
                ballot: ballotFor("alice", 1, `2026-08-17T00:${String(index).padStart(2, "0")}:00Z`),
              })),
            }),
          );
          const verified = ElectionStore.verify(root, DEFINITION.electionId);
          expect(verified.ok).toBe(false);
          if (!verified.ok) expect(verified.error).toBe("corrupt");
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      }),
      OPTS,
    );
  });

  // Renumbers a voter's raw generated sequence values into the 0..k-1 shape
  // that own-file monotonicity requires (P1 covers that guard separately),
  // then forges the voter's pending file to hold it. Returns the entry count
  // written, so the caller can assert nothing was lost or duplicated.
  function forgeVoterPendingFile(pendingDir: string, voter: string, rawSeqs: readonly number[]): number {
    const localSeqs = [...new Set(rawSeqs)].sort((a, b) => a - b).map((_, index) => index);
    writeFileSync(
      join(pendingDir, `${voter}.json`),
      JSON.stringify({
        schemaVersion: 2,
        electionId: DEFINITION.electionId,
        voter,
        events: localSeqs.map((arrivalSequence) => ({
          arrivalSequence,
          ballot: ballotFor(voter, 1, `2026-08-17T01:${String(arrivalSequence).padStart(2, "0")}:00Z`),
        })),
      }),
    );
    return localSeqs.length;
  }

  // Decodes each ballot's embedded arrivalSequence (the submittedAt minute
  // field it was encoded into) and asserts the sequence is non-decreasing
  // with voter breaking ties — the DEFINING property of (arrivalSequence,
  // voter) order, checked pairwise rather than via a second sort
  // implementation (pbt-oracle-cancellation: the oracle must not
  // re-implement the very invariant under test).
  function assertOrderedByArrivalSequenceThenVoter(pending: readonly { voter: string; submittedAt: string }[]) {
    const decoded = pending.map((b) => ({ voter: b.voter, seq: Number(b.submittedAt.slice(14, 16)) }));
    for (let i = 1; i < decoded.length; i++) {
      const prev = decoded[i - 1];
      const cur = decoded[i];
      if (prev === undefined || cur === undefined) continue;
      expect(prev.seq < cur.seq || (prev.seq === cur.seq && prev.voter < cur.voter)).toBe(true);
    }
  }

  // ADR-5 contract 2/3: cross-voter arrivalSequence overlap is expected, not
  // corruption — readAllPending must accept it and the resulting global order
  // must be exactly (arrivalSequence, voter) lexicographic.
  test("P2: readAllPending accepts overlapping cross-voter sequences and orders them by (arrivalSequence, voter) (ADR-5 contract 2/3)", () => {
    const voterSeqArb = fc.record({
      voter: fc.constantFrom("alice", "bob", "carol"),
      seq: fc.integer({ min: 0, max: 5 }),
    });
    fc.assert(
      fc.property(
        fc.uniqueArray(voterSeqArb, { minLength: 2, maxLength: 8, selector: (e) => `${e.voter}:${e.seq}` }),
        (entries) => {
          const byVoter = new Map<string, number[]>();
          for (const e of entries) byVoter.set(e.voter, [...(byVoter.get(e.voter) ?? []), e.seq]);
          const root = freshRoot();
          try {
            const pendingDir = join(resolveElectionDir(root, DEFINITION.electionId), "pending");
            mkdirSync(pendingDir, { recursive: true });
            let expectedTotal = 0;
            for (const [voter, seqs] of byVoter) {
              expectedTotal += forgeVoterPendingFile(pendingDir, voter, seqs);
            }
            const snapshot = ElectionStore.readSnapshot(root, DEFINITION.electionId);
            expect(snapshot.ok).toBe(true);
            if (!snapshot.ok) return;
            // Oracle 1: a legitimate cross-voter overlap is never rejected,
            // and nothing is lost or duplicated.
            expect(snapshot.value.pending).toHaveLength(expectedTotal);
            // Oracle 2: the returned order matches the defining relation.
            assertOrderedByArrivalSequenceThenVoter(snapshot.value.pending);
          } finally {
            rmSync(root, { recursive: true, force: true });
          }
        },
      ),
      OPTS,
    );
  });
});
