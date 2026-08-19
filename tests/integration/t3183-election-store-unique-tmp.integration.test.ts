// covers: function:writeStoreFile function:createOnly object:ElectionStore function:commitTally
//
// t3183 — the election store's atomic-write primitives derived their staging
// file name from the destination alone (`${path}.tmp`), so two writers aiming
// at the SAME destination always shared one staging path. The module's own
// comment calls the primitive a "project idiom — writeFileAtomic class", but
// the canonical idiom (amadeus-lib.ts `writeFileAtomic`) has carried a
// per-process nonce since #1424; these two copies never followed. The shared
// name produces two distinct cross-process failures:
//
//   writeStoreFile — the winner's renameSync consumes the shared tmp, so the
//   loser's own renameSync observes ENOENT and the call reports "io-error"
//   even though nothing about its request was wrong.
//
//   createOnly     — stages with `flag: "wx"`, so the second writer's create
//   throws EEXIST, and its catch arm then runs
//   `rmSync(`${path}.tmp`, { force: true })` on the SHARED name, deleting the
//   first writer's in-flight staging. Both writers fail.
//
// Mechanism of these tests: deterministic, not timing-dependent. Each test
// occupies the fixed `${path}.tmp` name up front with a foreign entry standing
// in for a concurrent peer's staging, which is exactly what a real race
// produces at the instant the second writer arrives. A primitive that derives
// a per-process staging name cannot see that entry at all; a primitive that
// uses the fixed name either fails on it or destroys it. The probabilistic
// counterpart (real OS processes racing appendPending) lives in t3046.

import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CanonicalElectionDefinition, CanonicalTally } from "../../packages/framework/core/tools/amadeus-election-codec.ts";
import { ElectionStore, resolveElectionDir, writeStoreFile } from "../../packages/framework/core/tools/amadeus-election-store.ts";

const DEFINITION: CanonicalElectionDefinition = {
  schemaVersion: 2,
  electionId: "E-TMP-3183",
  kind: "decision",
  questions: [
    { questionId: "q1", text: "First?", choices: [{ internalNo: 1, label: "yes" }, { internalNo: 2, label: "no" }] },
  ],
  voters: ["alice", "bob"],
};

const TALLY: CanonicalTally = {
  schemaVersion: 2,
  runId: "run-1",
  targetQuestionIds: ["q1"],
  results: [
    {
      questionId: "q1",
      kind: "hold",
      reason: "quorum-short",
      counts: { favor: 0, against: 0, abstain: 0, discuss: 0 },
    },
  ],
  preservedResultDigest: null,
  talliedAt: "2026-08-18T11:00:00Z",
};

function freshDir(): string {
  return mkdtempSync(join(tmpdir(), "election-tmp-3183-"));
}

describe("t3183 election store staging files carry a per-process name (#3183)", () => {
  // The falling proof for writeStoreFile: a concurrent peer's staging file
  // occupies the fixed name. A destination-derived tmp name collides with it
  // (writeFileSync onto a directory throws EISDIR -> "io-error"); a
  // per-process name never touches it.
  test("writeStoreFile succeeds while the fixed `${path}.tmp` name is occupied by a foreign entry", () => {
    const dir = freshDir();
    try {
      const target = join(dir, "elections.json");
      // A directory (rather than a file) so the collision is unambiguous:
      // the fixed-name primitive cannot write through it under any flag.
      mkdirSync(`${target}.tmp`);
      const written = writeStoreFile(target, '{"rows":[]}');
      expect(written.ok).toBe(true);
      expect(readFileSync(target, "utf8")).toBe('{"rows":[]}');
      // The peer's staging entry is untouched: this writer never addressed it.
      expect(existsSync(`${target}.tmp`)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // Per-process names are unique per call, so a failed write can no longer be
  // cleaned up by the next one overwriting the same name. The primitive must
  // remove its own staging file, matching the canonical writeFileAtomic.
  test("writeStoreFile removes its own staging file when the rename fails", () => {
    const dir = freshDir();
    try {
      // Renaming a file onto an existing directory fails (EISDIR), so the
      // staging file is written and then stranded unless the catch cleans up.
      const target = join(dir, "occupied");
      mkdirSync(target);
      const written = writeStoreFile(target, "payload");
      expect(written).toMatchObject({ ok: false, error: "io-error" });
      expect(readdirSync(dir)).toEqual(["occupied"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // The falling proof for createOnly: its catch arm removed the SHARED staging
  // name, so a losing writer destroyed the winner's in-flight file. With a
  // per-process name the foreign staging file is neither read nor removed.
  test("commitTally writes tally history without disturbing a foreign staging file", () => {
    const root = freshDir();
    try {
      expect(ElectionStore.create(root, DEFINITION).ok).toBe(true);
      expect(ElectionStore.setState(root, DEFINITION.electionId, "collecting").ok).toBe(true);
      const historyDir = join(resolveElectionDir(root, DEFINITION.electionId), "tallies");
      mkdirSync(historyDir, { recursive: true });
      const foreignStaging = join(historyDir, `${TALLY.runId}.json.tmp`);
      writeFileSync(foreignStaging, "peer-staging");

      const committed = ElectionStore.commitTally(root, DEFINITION.electionId, TALLY, {
        expectedState: "collecting",
        nextState: "partial",
      });
      expect(committed.ok).toBe(true);
      expect(existsSync(join(historyDir, `${TALLY.runId}.json`))).toBe(true);
      // Never adopted, never deleted — the peer still owns its staging file.
      expect(readFileSync(foreignStaging, "utf8")).toBe("peer-staging");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
