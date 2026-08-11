// covers: function:acquireAuditLock, function:releaseAuditLock
//
// t428 — 20 parallel processes mutating shared state under the audit lock lose
// nothing, even when every stamp is instantly over-age (issue #1906).
//
// WHY THIS EXISTS SEPARATELY FROM t427: t427 asserts the acquire predicate
// directly (a live owner is not reclaimed; an unstampable acquire fails closed).
// That pins the mechanism but not the SYMPTOM #1906 was filed for — 20 parallel
// state updates where every process exits 0 and the increments silently vanish.
// This test closes that symptom end to end.
//
// THE LOST-UPDATE SHAPE: the audit lock guards a read-modify-write of the state
// file, which is how amadeus-state.md is actually maintained (read wholesale,
// rewrite wholesale). Pre-fix, a waiter judged the LIVE holder over-age and
// stole the lock, so two processes sat in the same section, read the same
// counter, and wrote the same successor — one increment gone, both exit 0.
//
// DETERMINISM (NFR-2): the filed symptom reproduced roughly once in two runs and
// then not at all in seventeen. We do not reproduce it by luck. The only
// precondition for the pre-fix steal is "critical section outlives
// lockStaleMs()", and both sides of that inequality are injectable: pin
// AMADEUS_LOCK_STALE_MS to 1ms and hold the section for HOLD_MS. Every waiter
// then judges the holder over-age on its first reap attempt, so pre-fix loss is
// forced rather than sampled. Measured: this file is red on the pre-fix
// implementation and green on the fixed one (see the intent record).
//
// LAYER: integration — real filesystem lock dirs and 20 real OS processes.
// It cannot be a unit test: a single process cannot exhibit the race.
//
// FIXTURE DISCIPLINE: a per-run private lock base dir (AMADEUS_LOCK_BASE_DIR)
// outside the repository, plus a per-run temp project dir; both rm-rf'd in
// afterAll. Nothing under tests/fixtures/**.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const INTENT = "auth-aaaaaaaa";
const SPACE = "default";

// #1906 was filed against 20 parallel state updates; keep the population equal
// to the filed one so this is a regression test and not a smaller analogue.
const WORKERS = 20;
// Each holder sleeps this long inside the section. It only has to exceed the
// 1ms staleness pin below for the pre-fix steal to be certain; the margin is for
// slow/loaded CI hosts, where a too-small hold could let a section finish before
// any waiter reaps and mask the pre-fix bug (a false green on the OLD code).
const HOLD_MS = 120;
// Budget must cover the fully serialised run: WORKERS * HOLD_MS = 2.4s. 20s of
// retry allows a heavily loaded host to serialise without spurious LOST results.
const MAX_RETRIES = 2000;
const RETRY_MS = 10;

const LOCK_BASE_DIR = mkdtempSync(join(tmpdir(), "amadeus-t428-locks-"));
const proj = mkdtempSync(join(tmpdir(), "amadeus-t428-"));
const statePath = join(proj, "counter.json");
const journalPath = join(proj, "journal.ndjson");

const libPath = join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "amadeus-lib.ts");

afterAll(() => {
  rmSync(LOCK_BASE_DIR, { recursive: true, force: true });
  rmSync(proj, { recursive: true, force: true });
});

// One worker: take the lock, read-modify-write the counter with a hold in the
// middle, append one journal row, release. Prints its verdict so a worker that
// never got in is distinguishable from one that got in and lost its write.
function workerSource(): string {
  return [
    `import { acquireAuditLock, releaseAuditLock } from ${JSON.stringify(libPath)};`,
    `import { appendFileSync, readFileSync, writeFileSync } from "node:fs";`,
    `const id = process.argv[2];`,
    `const won = acquireAuditLock(${JSON.stringify(proj)}, ${MAX_RETRIES}, ${RETRY_MS}, ${JSON.stringify(INTENT)}, ${JSON.stringify(SPACE)});`,
    `if (!won) { process.stdout.write("LOST"); process.exit(0); }`,
    `try {`,
    `  const before = JSON.parse(readFileSync(${JSON.stringify(statePath)}, "utf-8")).count;`,
    // The hold is what makes the section outlive lockStaleMs(); it is the whole
    // reason a pre-fix waiter judges this live owner reapable.
    `  Bun.sleepSync(${HOLD_MS});`,
    `  writeFileSync(${JSON.stringify(statePath)}, JSON.stringify({ count: before + 1 }), "utf-8");`,
    `  appendFileSync(${JSON.stringify(journalPath)}, JSON.stringify({ id, before }) + "\\n", "utf-8");`,
    `} finally {`,
    `  releaseAuditLock(${JSON.stringify(proj)}, ${JSON.stringify(INTENT)}, ${JSON.stringify(SPACE)});`,
    `}`,
    `process.stdout.write("OK");`,
  ].join("\n");
}

describe("t428 — parallel state mutation under the audit lock loses nothing", () => {
  // FR-1 acceptance criterion 3 / NFR-2: the filed symptom, closed.
  test(
    `FR-1: ${WORKERS} parallel processes each land their increment with AMADEUS_LOCK_STALE_MS=1`,
    async () => {
      writeFileSync(statePath, JSON.stringify({ count: 0 }), "utf-8");
      writeFileSync(journalPath, "", "utf-8");
      const driver = join(proj, "worker.ts");
      writeFileSync(driver, workerSource(), "utf-8");

      const env = {
        ...process.env,
        AMADEUS_LOCK_BASE_DIR: LOCK_BASE_DIR,
        // Every stamp is instantly over-age: pre-fix, this is exactly the
        // condition under which a live holder was robbed.
        AMADEUS_LOCK_STALE_MS: "1",
        AMADEUS_LOCK_UNSTAMPED_GRACE_MS: "10000",
      };

      const children = Array.from({ length: WORKERS }, (_, index) =>
        Bun.spawn({
          cmd: [process.execPath, driver, String(index)],
          stdout: "pipe",
          stderr: "pipe",
          env,
        }));

      const verdicts = await Promise.all(children.map(async (child) => {
        const stdout = await new Response(child.stdout).text();
        const stderr = await new Response(child.stderr).text();
        return { code: await child.exited, stdout, stderr };
      }));

      // Every worker must have exited cleanly AND actually entered the section.
      // Asserting on exit codes alone is precisely the blindness #1906 describes:
      // pre-fix every process exited 0 while the increments disappeared.
      expect(verdicts.filter((v) => v.code !== 0)).toEqual([]);
      expect(verdicts.filter((v) => v.stdout !== "OK").map((v) => v.stdout)).toEqual([]);

      // Zero loss: the state counter and the journal both account for all 20.
      const count = JSON.parse(readFileSync(statePath, "utf-8")).count;
      expect(count).toBe(WORKERS);

      const rows = readFileSync(journalPath, "utf-8").trim().split("\n").filter((line) => line !== "");
      expect(rows).toHaveLength(WORKERS);

      // Mutual exclusion, stated positively: if the sections were truly
      // serialised then each worker observed a distinct predecessor value and
      // those values are exactly 0..WORKERS-1. Two processes inside the section
      // would show up here as a duplicated `before`, which pins the lost update
      // to a mutual-exclusion breach rather than to a lost file write.
      const observed = rows.map((line) => JSON.parse(line).before).sort((a: number, b: number) => a - b);
      expect(observed).toEqual(Array.from({ length: WORKERS }, (_, index) => index));
    },
    scaleTestTime(120_000),
  );
});
