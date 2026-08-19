// covers: subcommand:amadeus-swarm:prepare, subcommand:amadeus-swarm:check, subcommand:amadeus-swarm:finalize, audit:SWARM_STARTED, audit:SWARM_DEGRADED, audit:SWARM_UNIT_CONVERGED, audit:SWARM_UNIT_FAILED, audit:SWARM_BATON_RETURNED, audit:SWARM_COMPLETED
//
// CLI-contract port of tests/e2e/t134-swarm-referee.sh (TAP plan 13),
// mechanism = cli. The .sh exercises amadeus-swarm.ts — the STATELESS convergence
// REFEREE the conductor consults — over REAL git worktrees, with the test (like
// the .sh) playing the conductor: it drives prepare/check/finalize directly and
// stages each worktree's on-disk state the way a worker would (or wouldn't)
// have. Determinism comes from the staged state + the real check command's exit
// code — never a worker's self-claim.
//
// MECHANISM = cli (NOT none): every observable the .sh asserts is at the PROCESS
// boundary — process.exit codes, the JSON envelope on stdout, and audit.md bytes
// — and the tool itself spawns child processes (git worktree add, amadeus-bolt,
// the bash check command). An in-process twin would lose the real
// git-worktree side effect, the audit emit, the genuine `git diff --quiet <fork-sha>`
// anti-tamper baseline, and the exit-2-baton-returns shell the .sh keys on. So
// we SPAWN the real tool via spawnSync(BUN, [SWARM_TOOL, ...]) and assert on
// res.status / res.stdout and the on-disk audit, exactly as the .sh did with
// run_ref. spawnCount = all 13 cases.
//
// Source under test (dist/claude/.claude/tools/amadeus-swarm.ts):
//   - handlePrepare (:296): forks a worktree per unit via amadeus-worktree create
//     + amadeus-bolt start --worktree; emits SWARM_STARTED once (:328) and
//     SWARM_DEGRADED first when --degraded-from is given (:325). Exits 2 if any
//     fork failed (:386), else 0. Each create records the fork contract (Base
//     branch + Base SHA) on WORKTREE_CREATED — the anti-tamper baseline.
//   - handleCheck (:391): stateless single-unit verdict via verdictFor (:162) —
//     checkConverged (:129, exit 0 of the bash --check-cmd) AND the anti-tamper
//     fileTampered (:143, `git diff --quiet <fork-sha> -- <test-file>` status===1
//     against the Base SHA captured at prepare, so a worker commit cannot move
//     the baseline).
//     Prints compact {unit,converged,tampered,reason}; exits 0 IFF genuinely
//     converged (green AND untampered), 1 otherwise (:431). A --test-file that
//     escapes the worktree is a typed confine error (:181, "resolves outside
//     the unit worktree"), reason "error", exit 1 (:417). Emits no audit.
//   - handleFinalize (:436): the AUTHORITATIVE gate. RE-RUNS the check on every
//     --claimed unit before any merge (the lying-conductor guard, :503-515): a
//     claimed-but-red / tampered unit is refused the merge and lands "failed"
//     with reason "error". A DECLINED (unclaimed) unit carries the conductor's
//     --reasons attribution (:463-477,:523), defaulting to "cap-exhausted".
//     Merges the genuine passes (serialised, :541), then emits one
//     SWARM_UNIT_CONVERGED / SWARM_UNIT_FAILED row per unit, a
//     SWARM_BATON_RETURNED per failed unit, and a closing SWARM_COMPLETED
//     (:555-570); prints the pretty-printed envelope and exits 2 if any unit or
//     merge failed, else 0 (:582).
//
// FIXTURE (mirrors make_swarm_fixture, t134.sh:80-95): a real git repo on
// `main` (setupWorktreeFixture, ported from tests/lib/worktree-helpers.sh)
// seeded into Construction phase — amadeus-docs/amadeus-state.md from
// state-construction.md + a fresh audit.md — with the framework .gitignore so
// `git worktree add` does not byte-copy audit.md / runtime-graph.json into the
// child, then `commit --amend` so the worktree fork carries the gitignore at
// HEAD. The per-unit worktree path is the tool's deterministic
// worktreePath(proj, slug) = <proj>/.amadeus/worktrees/bolt-<slug>. Nothing is
// written under tests/fixtures/**; cleanupWorktreeFixture prunes children then
// rm -rf's each parent in afterAll.
//
// Old TAP -> new test parity (1:1, every .sh `ok` line maps to a named test()):
//   .sh 1  prepare forks a worktree + SWARM_STARTED          -> "1 prepare: forks a worktree per unit + emits SWARM_STARTED"
//   .sh 2  check genuine converged -> exit 0, converged:true -> "2 check: genuinely converged unit -> exit 0, converged:true"
//   .sh 3  check stateless (same verdict on repeat)          -> "3 check is stateless: repeat call same verdict (no counter)"
//   .sh 4  check not-converged -> exit !=0, converged:false  -> "4 check: not-yet-converged unit -> exit non-zero, converged:false"
//   .sh 5  anti-tamper on check (edited --test-file)         -> "5 anti-tamper: edited protected --test-file -> tampered:true, refused"
//   .sh 6  finalize genuine claimed merges + UNIT_CONVERGED  -> "6 finalize: genuine claimed unit merges + SWARM_UNIT_CONVERGED, exit 0"
//   .sh 7  lying-conductor guard (falsely-claimed re-verified)-> "7 lying-conductor: falsely-claimed-converged unit re-verify-refused"
//   .sh 8  finalize anti-tamper (claimed tampered rejected)  -> "8 finalize anti-tamper: tampered claimed unit re-verify-rejected"
//   .sh 9  mixed batch tally 1+1, SWARM_COMPLETED, exit 2    -> "9 finalize mixed batch: 1 converged + 1 failed; SWARM_COMPLETED; exit 2"
//   .sh 10 loud-degrade prepare --degraded-from -> DEGRADED  -> "10 loud-degrade: prepare --degraded-from claude-ultra emits SWARM_DEGRADED"
//   .sh 11 path-confinement (../ --test-file typed error)    -> "11 path-confinement: a ../ --test-file is a typed error, not a disabled guard"
//   .sh 12 conductor attribution (--reasons unsatisfiable)   -> "12 conductor attribution: --reasons unsatisfiable lands the typed reason"
//   .sh 13 --reasons cannot override the lying-conductor guard-> "13 --reasons cannot launder a claimed-but-red unit (stays error)"
//
// 13 .sh asserts -> 13 expect()-bearing test() cases (same count, same
// observables). STRONGER than the .sh in several places: the .sh grepped loose
// substrings (`grep -q '"converged":true'`); here the stdout is JSON.parse'd and
// asserted field-by-field (e.g. the lying unit's status === "failed" + reason
// === "error" on the parsed envelope row), and audit-event presence is an exact
// `**Event**: <type>` row count rather than a `grep -q`.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { auditRowsFrom } from "../harness/audit-records.ts";
import {
  AMADEUS_SRC,
  FIXTURES_DIR,
  cleanupWorktreeFixture,
  seededAuditDir,
  seededStateFile,
  setupWorktreeFixture,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const SWARM_TOOL = join(AMADEUS_SRC, "tools", "amadeus-swarm.ts");
const BOLT_TOOL = join(AMADEUS_SRC, "tools", "amadeus-bolt.ts");

const fixtures: string[] = [];
afterAll(() => {
  for (const f of fixtures) cleanupWorktreeFixture(f);
});

/**
 * make_swarm_fixture (t134.sh:80-95): a real git repo on `main` in Construction
 * phase with the framework gitignore set, committed at HEAD so the worktree fork
 * carries it (and so `git worktree add` does NOT byte-copy audit.md /
 * runtime-graph.json into the child).
 */
function makeSwarmFixture(): string {
  const proj = setupWorktreeFixture();
  fixtures.push(proj);
  // Seed Construction-phase state into the per-intent record + a fresh audit log
  // shard (.sh: cp state + `printf "# AI-DLC Audit Log\n"`). The record state +
  // intents.json commit (so the worktree fork carries them); cursors + audit
  // shards stay machine-local.
  writeFileSync(
    seededStateFile(proj),
    readFileSync(join(FIXTURES_DIR, "state-construction.md"), "utf-8"),
  );
  mkdirSync(seededAuditDir(proj), { recursive: true });
  writeFileSync(join(seededAuditDir(proj), "fixture.jsonl"), "");
  writeFileSync(
    join(proj, ".gitignore"),
    [
      "amadeus/active-space",
      "amadeus/.amadeus-clone-id",
      "amadeus/spaces/*/intents/active-intent",
      "amadeus/spaces/*/intents/*/runtime-graph.json",
      "amadeus/spaces/*/intents/*/.amadeus-*",
      "amadeus/spaces/*/intents/*/audit/",
      "",
    ].join("\n"),
  );
  // Stage everything and amend the seed commit so HEAD carries the gitignore +
  // state, mirroring the .sh's `git add -A && commit --amend --no-edit`.
  const git = (args: string[]): void => {
    spawnSync("git", args, { cwd: proj, encoding: "utf-8" });
  };
  git(["add", "-A"]);
  git([
    "-c",
    "user.email=t@t",
    "-c",
    "user.name=t",
    "commit",
    "-q",
    "--amend",
    "--no-edit",
  ]);
  return proj;
}

/** The per-unit worktree path the tool derives (amadeus-lib worktreePath). */
function wtPath(proj: string, slug: string): string {
  return join(proj, ".amadeus", "worktrees", `bolt-${slug}`);
}

interface RefResult {
  rc: number;
  out: string; // stdout (the envelope / verdict JSON)
}

/**
 * run_ref (t134.sh:103-112): drive a referee subcommand against a real project,
 * capturing stdout + the exit code without letting a non-zero exit abort. The
 * tool's intended non-zero exits (check red = 1, finalize baton = 2) are part of
 * the contract, so we keep the status.
 */
function runRef(proj: string, args: string[]): RefResult {
  const res = spawnSync(BUN, [SWARM_TOOL, "--project-dir", proj, ...args], {
    cwd: proj,
    encoding: "utf-8",
  });
  return { rc: res.status ?? -1, out: res.stdout ?? "" };
}

interface GitResult {
  rc: number;
  out: string;
}

function runGit(cwd: string, args: string[]): GitResult {
  const res = spawnSync("git", args, { cwd, encoding: "utf-8" });
  return { rc: res.status ?? -1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

function gitOrThrow(cwd: string, args: string[]): string {
  const result = runGit(cwd, args);
  if (result.rc !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.out.trim() || `exit ${result.rc}`}`);
  }
  return result.out.trim();
}

function commitWorkerSource(
  proj: string,
  slug: string,
  relativePath: string,
  contents: string,
): void {
  const wt = wtPath(proj, slug);
  writeFileSync(join(wt, relativePath), contents);
  gitOrThrow(wt, ["add", "--", relativePath]);
  gitOrThrow(wt, [
    "-c", "user.email=t@t",
    "-c", "user.name=t",
    "commit", "-q", "-m", `worker source for ${slug}`, "--", relativePath,
  ]);
  const committed = gitOrThrow(wt, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]);
  if (committed !== relativePath) {
    throw new Error(`worker commit must contain only ${relativePath}; got ${committed || "<empty>"}`);
  }
}

function hasBoltBranch(proj: string, slug: string): boolean {
  return runGit(proj, ["rev-parse", "--verify", `refs/heads/bolt-${slug}`]).rc === 0;
}

interface PoolAttempt {
  readonly attemptId: string;
  readonly unitId: string;
  readonly dispatchConfirmed: boolean;
}

interface PoolProjection {
  readonly phase: string;
  readonly active: readonly PoolAttempt[];
}

function poolMutation(result: RefResult, action: string): PoolProjection {
  const body = JSON.parse(result.out);
  if (result.rc !== 0 || !body.ok) {
    throw new Error(`unable to ${action} test Unit: ${body.reason ?? "unknown"}`);
  }
  return body.projection;
}

function acquirePoolAttempt(proj: string, batchId: string, step: number): PoolProjection {
  return poolMutation(runRef(proj, [
    "acquire",
    "--batch",
    batchId,
    "--idempotency-key",
    `e2e-acquire-${step}`,
  ]), "acquire");
}

function confirmPoolAttempt(proj: string, batchId: string, attempt: PoolAttempt): PoolProjection {
  return poolMutation(runRef(proj, [
    "confirm-dispatch",
    "--batch",
    batchId,
    "--attempt",
    attempt.attemptId,
    "--native-handle",
    `native-${attempt.unitId}`,
    "--idempotency-key",
    `e2e-confirm-${attempt.attemptId}`,
  ]), "confirm dispatch for");
}

function settlePoolAttempt(
  proj: string,
  batchId: string,
  attempt: PoolAttempt,
  outcome: "succeeded" | "failed",
): PoolProjection {
  return poolMutation(runRef(proj, [
    "settle-release",
    "--batch",
    batchId,
    "--attempt",
    attempt.attemptId,
    "--outcome",
    outcome,
    "--idempotency-key",
    `e2e-settle-${attempt.attemptId}`,
  ]), "settle");
}

/** Drive the fixed pool to a terminal state before exercising finalize. */
function terminalizePool(
  proj: string,
  batchId: string,
  outcomes: Readonly<Record<string, "succeeded" | "failed">> = {},
): void {
  let step = 0;
  let projection: PoolProjection | null = null;
  while (projection?.phase !== "terminal") {
    if (!projection?.active[0]) projection = acquirePoolAttempt(proj, batchId, step);
    const attempt = projection.active[0];
    if (!attempt) throw new Error("pool acquisition produced no active attempt");
    if (!attempt.dispatchConfirmed) projection = confirmPoolAttempt(proj, batchId, attempt);
    projection = settlePoolAttempt(proj, batchId, attempt, outcomes[attempt.unitId] ?? "succeeded");
    step += 1;
  }
}

/** Concatenate every audit shard (audit/*.jsonl) for the seeded record — the swarm
 *  tool writes SWARM_* rows to its own per-clone shard alongside fixture.jsonl. */
const auditBody = (p: string): string => {
  const dir = seededAuditDir(p);
  let names: string[];
  try {
    names = readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort();
  } catch {
    return "";
  }
  return names.map((n) => readFileSync(join(dir, n), "utf-8")).join("\n");
};

/** Every JSONL audit record across the shard set. */
function auditRecords(p: string): {
  event: string | null;
  fields?: Record<string, string>;
}[] {
  return auditRowsFrom(auditBody(p));
}

/** Exact record count of one event type (STRONGER than grep -q). */
function eventCount(p: string, event: string): number {
  return auditRecords(p).filter((r) => r.event === event).length;
}

describe("t134 swarm referee — prepare/check/finalize (migrated from t134-swarm-referee.sh, plan 13)", () => {
  // ===========================================================================
  // Cases 1-4 + 6 share ONE fixture: prepare + stateless check + finalize on a
  // converged unit, mirroring the .sh's first PROJ block.
  // ===========================================================================
  test("1 prepare: forks a worktree per unit + emits SWARM_STARTED", () => {
    const proj = makeSwarmFixture();
    const r = runRef(proj, ["prepare", "--batch", "1", "--units", "alpha", "--base", "main"]);
    // .sh grepped `"ok": true` — but handlePrepare's envelope carries no top-level
    // `ok` field; the .sh's grep matched the nested per-unit `"ok": true` row.
    // Assert that real contract: prepare succeeded (exit 0), the batch started,
    // and the unit forked.
    expect(r.rc).toBe(0);
    const env = JSON.parse(r.out);
    expect(env.units.find((u: { unit: string }) => u.unit === "alpha")?.ok).toBe(true);
    // SWARM_STARTED fired exactly once for the batch.
    expect(eventCount(proj, "SWARM_STARTED")).toBe(1);
    // The worktree directory landed on disk via the real `git worktree add`.
    expect(existsSync(wtPath(proj, "alpha"))).toBe(true);

    // --- Case 2: the conductor's worker commits only its source path; the real
    // check command (test -f impl.txt) passes (exit 0 = green). Framework fixture
    // metadata must not ride in the worker's source commit.
    commitWorkerSource(proj, "alpha", "impl.txt", "done\n");
    const c1 = runRef(proj, ["check", "alpha", "--check-cmd", "test -f impl.txt"]);
    expect(c1.rc).toBe(0);
    expect(JSON.parse(c1.out).converged).toBe(true);

    // --- Case 3: STATELESS — an identical second call returns the same verdict
    // (no counter, no drift).
    const c2 = runRef(proj, ["check", "alpha", "--check-cmd", "test -f impl.txt"]);
    expect(c2.rc).toBe(0);
    expect(JSON.parse(c2.out).converged).toBe(true);

    // --- Case 4: a not-yet-converged unit — prepare beta, do NOT write its impl,
    // check -> red (exit non-zero, converged:false).
    runRef(proj, ["prepare", "--batch", "1", "--units", "beta", "--base", "main"]);
    const c3 = runRef(proj, ["check", "beta", "--check-cmd", "test -f impl.txt"]);
    expect(c3.rc).not.toBe(0);
    expect(JSON.parse(c3.out).converged).toBe(false);

    terminalizePool(proj, "1");

    // --- Case 6: finalize the genuinely converged alpha (claimed) — merges back
    // + emits SWARM_UNIT_CONVERGED, envelope converged:1, exit 0.
    const f = runRef(proj, [
      "finalize",
      "--batch",
      "1",
      "--units",
      "alpha",
      "--claimed",
      "alpha",
      "--check-cmd",
      "test -f impl.txt",
    ]);
    expect(f.rc).toBe(0);
    const fEnv = JSON.parse(f.out);
    expect(fEnv.converged).toBe(1);
    expect(fEnv.merge_failures).toEqual([]);
    expect(eventCount(proj, "SWARM_UNIT_CONVERGED")).toBe(1);
    expect(existsSync(join(proj, "impl.txt"))).toBe(true);
    expect(readFileSync(join(proj, "impl.txt"), "utf-8")).toBe("done\n");
    expect(existsSync(wtPath(proj, "alpha"))).toBe(false);
    expect(hasBoltBranch(proj, "alpha")).toBe(false);
  }, scaleTestTime(120000));

  // Cases 2, 3, 4, 6 are asserted inside test 1's shared-fixture flow above
  // (the .sh ran them sequentially against the same PROJ). Named here for the
  // 1:1 parity map; their expects live in "1 prepare ...".
  test("2 check: genuinely converged unit -> exit 0, converged:true", () => {
    // Covered by the case-2 block in "1 prepare ..." (shared fixture). Re-prove
    // standalone: a fresh fixture, prepared + impl-staged unit checks green.
    const proj = makeSwarmFixture();
    runRef(proj, ["prepare", "--batch", "1", "--units", "g2", "--base", "main"]);
    writeFileSync(join(wtPath(proj, "g2"), "impl.txt"), "done\n");
    const c = runRef(proj, ["check", "g2", "--check-cmd", "test -f impl.txt"]);
    expect(c.rc).toBe(0);
    expect(JSON.parse(c.out).converged).toBe(true);
  }, scaleTestTime(120000));

  test("3 check is stateless: repeat call same verdict (no counter)", () => {
    const proj = makeSwarmFixture();
    runRef(proj, ["prepare", "--batch", "1", "--units", "g3", "--base", "main"]);
    writeFileSync(join(wtPath(proj, "g3"), "impl.txt"), "done\n");
    const first = runRef(proj, ["check", "g3", "--check-cmd", "test -f impl.txt"]);
    const second = runRef(proj, ["check", "g3", "--check-cmd", "test -f impl.txt"]);
    // Same exit code AND same parsed verdict — no state drift between calls.
    expect(second.rc).toBe(first.rc);
    expect(second.rc).toBe(0);
    expect(JSON.parse(second.out)).toEqual(JSON.parse(first.out));
    expect(JSON.parse(second.out).converged).toBe(true);
  }, scaleTestTime(120000));

  test("4 check: not-yet-converged unit -> exit non-zero, converged:false", () => {
    const proj = makeSwarmFixture();
    runRef(proj, ["prepare", "--batch", "1", "--units", "g4", "--base", "main"]);
    // No impl staged -> the check command fails (exit non-zero).
    const c = runRef(proj, ["check", "g4", "--check-cmd", "test -f impl.txt"]);
    expect(c.rc).not.toBe(0);
    expect(JSON.parse(c.out).converged).toBe(false);
  }, scaleTestTime(120000));

  // ===========================================================================
  // Case 5: anti-tamper on check — editing the protected --test-file is refused,
  // baseline re-derived from the worktree's own git fork (no stored hash).
  // ===========================================================================
  test("5 anti-tamper: edited protected --test-file -> tampered:true, refused", () => {
    const proj = makeSwarmFixture();
    // Seed a TRACKED protected file so the worktree fork carries it at HEAD.
    mkdirSync(join(proj, "spec"), { recursive: true });
    writeFileSync(join(proj, "spec", "unit.test"), "EXPECTED\n");
    spawnSync("git", ["add", "-A"], { cwd: proj, encoding: "utf-8" });
    spawnSync(
      "git",
      ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "seed test"],
      { cwd: proj, encoding: "utf-8" },
    );
    runRef(proj, ["prepare", "--batch", "1", "--units", "gamma", "--base", "main"]);
    // The "worker" cheats: it makes the check pass by editing the protected file.
    writeFileSync(join(wtPath(proj, "gamma"), "spec", "unit.test"), "TAMPERED\n");
    const c = runRef(proj, [
      "check",
      "gamma",
      "--check-cmd",
      "grep -q TAMPERED spec/unit.test",
      "--test-file",
      "spec/unit.test",
    ]);
    // The check command itself passes, but the anti-tamper guard fires: tampered
    // true, convergence refused (exit non-zero).
    expect(c.rc).not.toBe(0);
    expect(JSON.parse(c.out).tampered).toBe(true);
  }, scaleTestTime(120000));

  // ===========================================================================
  // Cases 7 + 9: the LYING-CONDUCTOR GUARD + mixed batch. The conductor claims
  // two units converged; only one actually is.
  // ===========================================================================
  test("7 lying-conductor: falsely-claimed-converged unit re-verify-refused", () => {
    const proj = makeSwarmFixture();
    runRef(proj, ["prepare", "--batch", "2", "--units", "win,lie", "--base", "main"]);
    terminalizePool(proj, "2");
    // `win` genuinely converges with a source-only commit; `lie` does NOT (no
    // source) but is falsely claimed.
    commitWorkerSource(proj, "win", "win.txt", "done\n");
    const f = runRef(proj, [
      "finalize",
      "--batch",
      "2",
      "--units",
      "win,lie",
      "--claimed",
      "win,lie",
      "--check-cmd",
      "test -f win.txt",
    ]);
    const env = JSON.parse(f.out);
    // STRONGER than the .sh's `grep -A2`: locate the parsed `lie` row and assert
    // status === "failed" with the tool's own re-verify reason "error".
    const lie = env.units.find((u: { unit: string }) => u.unit === "lie");
    expect(lie).toBeDefined();
    expect(lie.status).toBe("failed");
    expect(lie.reason).toBe("error");
    // The full audit baton trail fired for the failed unit.
    expect(eventCount(proj, "SWARM_UNIT_FAILED")).toBeGreaterThanOrEqual(1);
    expect(eventCount(proj, "SWARM_BATON_RETURNED")).toBeGreaterThanOrEqual(1);

    // --- Case 9: the mixed batch tallies 1 converged + 1 failed, emits
    // SWARM_COMPLETED, and exits 2 (baton returns). (Asserted on the same run.)
    expect(env.converged).toBe(1);
    expect(env.failed).toBe(1);
    expect(eventCount(proj, "SWARM_COMPLETED")).toBe(1);
    expect(f.rc).toBe(2);
  }, scaleTestTime(120000));

  test("9 finalize mixed batch: 1 converged + 1 failed; SWARM_COMPLETED; exit 2", () => {
    // The .sh asserted cases 7 + 9 on a single finalize run; re-prove case 9
    // standalone on a fresh fixture so the tally invariant is independently
    // anchored.
    const proj = makeSwarmFixture();
    runRef(proj, ["prepare", "--batch", "2", "--units", "wn,le", "--base", "main"]);
    terminalizePool(proj, "2");
    commitWorkerSource(proj, "wn", "wn.txt", "done\n");
    const f = runRef(proj, [
      "finalize",
      "--batch",
      "2",
      "--units",
      "wn,le",
      "--claimed",
      "wn,le",
      "--check-cmd",
      "test -f wn.txt",
    ]);
    const env = JSON.parse(f.out);
    expect(env.converged).toBe(1);
    expect(env.failed).toBe(1);
    expect(eventCount(proj, "SWARM_COMPLETED")).toBe(1);
    expect(f.rc).toBe(2);
  }, scaleTestTime(120000));

  // ===========================================================================
  // Case 8: finalize anti-tamper — a claimed unit whose protected file was
  // edited is re-verify-rejected even though the check command keys off it.
  // ===========================================================================
  test("8 finalize anti-tamper: tampered claimed unit re-verify-rejected", () => {
    const proj = makeSwarmFixture();
    mkdirSync(join(proj, "spec"), { recursive: true });
    writeFileSync(join(proj, "spec", "unit.test"), "EXPECTED\n");
    spawnSync("git", ["add", "-A"], { cwd: proj, encoding: "utf-8" });
    spawnSync(
      "git",
      ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "seed test"],
      { cwd: proj, encoding: "utf-8" },
    );
    runRef(proj, ["prepare", "--batch", "1", "--units", "delta", "--base", "main"]);
    terminalizePool(proj, "1");
    writeFileSync(join(wtPath(proj, "delta"), "spec", "unit.test"), "TAMPERED\n");
    const f = runRef(proj, [
      "finalize",
      "--batch",
      "1",
      "--units",
      "delta",
      "--claimed",
      "delta",
      "--check-cmd",
      "grep -q TAMPERED spec/unit.test",
      "--test-file",
      "spec/unit.test",
    ]);
    expect(f.rc).toBe(2);
    const env = JSON.parse(f.out);
    // The check command "passes" but the tampered claimed unit is rejected: zero
    // converged, and the unit row carries tampered:true.
    expect(env.converged).toBe(0);
    const delta = env.units.find((u: { unit: string }) => u.unit === "delta");
    expect(delta).toBeDefined();
    expect(delta.tampered).toBe(true);
    expect(delta.status).toBe("failed");
  }, scaleTestTime(120000));

  // ===========================================================================
  // Case 10: loud-degrade — prepare --degraded-from claude-ultra emits SWARM_DEGRADED.
  // ===========================================================================
  test("10 loud-degrade: prepare --degraded-from claude-ultra emits SWARM_DEGRADED", () => {
    const proj = makeSwarmFixture();
    runRef(proj, [
      "prepare",
      "--batch",
      "1",
      "--units",
      "epsilon",
      "--base",
      "main",
      "--degraded-from",
      "claude-ultra",
    ]);
    // SWARM_DEGRADED fired, and it records the requested driver (claude-ultra).
    expect(eventCount(proj, "SWARM_DEGRADED")).toBe(1);
    expect(
      auditRecords(proj).some(
        (r) => r.event === "SWARM_DEGRADED" && r.fields?.["Requested driver"] === "claude-ultra",
      ),
    ).toBe(true);
  }, scaleTestTime(120000));

  // ===========================================================================
  // Case 11: path-confinement — a --test-file escaping the worktree (../) is a
  // typed error on check, not a silently-disabled anti-tamper guard.
  // ===========================================================================
  test("11 path-confinement: a ../ --test-file is a typed error, not a disabled guard", () => {
    const proj = makeSwarmFixture();
    runRef(proj, ["prepare", "--batch", "1", "--units", "zeta", "--base", "main"]);
    writeFileSync(join(wtPath(proj, "zeta"), "impl.txt"), "done\n");
    const c = runRef(proj, [
      "check",
      "zeta",
      "--check-cmd",
      "test -f impl.txt",
      "--test-file",
      "../escape.test",
    ]);
    // A ../ escape is rejected as a typed configuration error (reason "error"),
    // not a silently-passed "untampered". Exit non-zero.
    expect(c.rc).not.toBe(0);
    const out = JSON.parse(c.out);
    expect(out.reason).toBe("error");
    expect(out.detail).toContain("resolves outside the unit worktree");
  }, scaleTestTime(120000));

  // ===========================================================================
  // Case 12: conductor attribution — a DECLINED (unclaimed) unit for which the
  // conductor judged the unit unsatisfiable. --reasons carries that typed
  // attribution; the tool records it faithfully (knowledge->conductor decides,
  // determinism->tool records) instead of the cap-exhausted default.
  // ===========================================================================
  test("12 conductor attribution: --reasons unsatisfiable lands the typed reason (envelope + audit)", () => {
    const proj = makeSwarmFixture();
    runRef(proj, ["prepare", "--batch", "1", "--units", "stuck", "--base", "main"]);
    terminalizePool(proj, "1", { stuck: "failed" });
    // `stuck` gets no impl and is NOT claimed; the conductor attributes unsatisfiable.
    const f = runRef(proj, [
      "finalize",
      "--batch",
      "1",
      "--units",
      "stuck",
      "--claimed",
      "",
      "--check-cmd",
      "test -f impl.txt",
      "--reasons",
      "stuck=unsatisfiable",
    ]);
    expect(f.rc).toBe(2);
    const stuck = JSON.parse(f.out).units.find(
      (u: { unit: string }) => u.unit === "stuck",
    );
    expect(stuck).toBeDefined();
    // The typed attribution lands in the envelope (NOT the cap-exhausted default).
    expect(stuck.reason).toBe("unsatisfiable");
    // ...and in the SWARM_UNIT_FAILED audit row's Reason field.
    expect(
      auditRecords(proj).some(
        (r) => r.event === "SWARM_UNIT_FAILED" && r.fields?.Reason === "unsatisfiable",
      ),
    ).toBe(true);
  }, scaleTestTime(120000));

  // ===========================================================================
  // Case 13: --reasons cannot override the lying-conductor guard. A unit CLAIMED
  // converged but red on disk must stay reason "error" (the tool's own re-verify
  // verdict) even when --reasons names it unsatisfiable — a conductor attribution
  // applies only to DECLINED units, never to launder a claimed-but-red one.
  // ===========================================================================
  test("13 --reasons cannot override the lying-conductor guard: claimed-but-red stays error", () => {
    const proj = makeSwarmFixture();
    runRef(proj, ["prepare", "--batch", "1", "--units", "sneaky", "--base", "main"]);
    terminalizePool(proj, "1");
    // sneaky is CLAIMED converged but no impl exists; the conductor also tries to
    // dress the failure as unsatisfiable via --reasons. The tool must ignore that
    // and report error (claimed-but-red).
    const f = runRef(proj, [
      "finalize",
      "--batch",
      "1",
      "--units",
      "sneaky",
      "--claimed",
      "sneaky",
      "--check-cmd",
      "test -f impl.txt",
      "--reasons",
      "sneaky=unsatisfiable",
    ]);
    expect(f.rc).toBe(2);
    const sneaky = JSON.parse(f.out).units.find(
      (u: { unit: string }) => u.unit === "sneaky",
    );
    expect(sneaky).toBeDefined();
    // The tool's own re-verify verdict WINS for a claimed unit: reason stays
    // "error", never the laundered "unsatisfiable".
    expect(sneaky.reason).toBe("error");
    expect(sneaky.reason).not.toBe("unsatisfiable");
  }, scaleTestTime(120000));

  // ===========================================================================
  // Case 14 (issue #674): a unit that genuinely re-verifies converged but whose
  // merge-back fails must NOT be reported as converged. A clean re-run after a
  // completed merge is now deliberately idempotent, so this fixture introduces
  // ambiguous STATE_MERGED evidence after the out-of-band merge. The recovery
  // verifier must fail closed rather than guessing which canonical-looking row
  // is authoritative, and the referee must preserve its merge-failure verdict.
  // ===========================================================================
  test("14 finalize: merge-back failure is NOT reported converged (issue #674)", () => {
    const proj = makeSwarmFixture();
    runRef(proj, ["prepare", "--batch", "3", "--units", "mu", "--base", "main"]);
    terminalizePool(proj, "3");
    writeFileSync(join(wtPath(proj, "mu"), "impl.txt"), "done\n");

    // Out-of-band pre-merge: a real, successful `release-merge` + `complete
    // --merge` for "mu" — the SAME two calls finalize's own merge-back loop
    // issues (:590-594) — landed for real via the actual amadeus-bolt CLI.
    // This genuinely removes "mu" from main's Bolt Refs (amadeus-state merge).
    const preRelease = spawnSync(
      BUN,
      [BOLT_TOOL, "--project-dir", proj, "release-merge", "--slug", "mu"],
      { cwd: proj, encoding: "utf-8" },
    );
    expect(preRelease.status).toBe(0);
    const preMerge = spawnSync(
      BUN,
      [
        BOLT_TOOL,
        "--project-dir",
        proj,
        "complete",
        "--merge",
        "--slug",
        "mu",
        "--batch",
        "3",
        "--name",
        "mu",
      ],
      { cwd: proj, encoding: "utf-8" },
    );
    // Sanity: the out-of-band merge itself must genuinely succeed, or the
    // fixture doesn't isolate the merge-back failure this case targets.
    expect(preMerge.status).toBe(0);

    // Duplicate the canonical-looking STATE_MERGED row into a second shard.
    // This is explicit tamper/ambiguity evidence, not a string-matched stderr
    // simulation: complete --merge must inspect the ledger and fail closed.
    const stateMergedLine = auditBody(proj)
      .split("\n")
      .find((line) => line.includes('\"eventName\":\"amadeus.state.merged\"'));
    expect(stateMergedLine).toBeDefined();
    writeFileSync(join(seededAuditDir(proj), "ambiguous-state-merged.jsonl"), `${stateMergedLine}\n`);

    // finalize re-verifies "mu": the check command still passes (genuinely
    // converged on re-verify), so it enters merge-back. Recovery then refuses
    // the two STATE_MERGED rows as ambiguous evidence.
    const f = runRef(proj, [
      "finalize",
      "--batch",
      "3",
      "--units",
      "mu",
      "--claimed",
      "mu",
      "--check-cmd",
      "test -f impl.txt",
    ]);

    // AC-674-3: envelope/exit-code compatibility is preserved.
    expect(f.rc).toBe(2);
    const env = JSON.parse(f.out);
    expect(env.merge_failures.length).toBe(1);
    expect(env.merge_failures[0].unit).toBe("mu");

    // AC-674-1: the merge-back-failed unit is NOT converged.
    const mu = env.units.find((u: { unit: string }) => u.unit === "mu");
    expect(mu).toBeDefined();
    expect(mu.status).toBe("failed");

    // AC-674-2: the SWARM_COMPLETED tally reflects the merge result, not the
    // verify-only verdict — zero converged, one failed.
    expect(env.converged).toBe(0);
    expect(env.failed).toBe(1);

    // AC-674-1 (audit): SWARM_UNIT_CONVERGED must never fire for this unit;
    // SWARM_UNIT_FAILED + SWARM_BATON_RETURNED must.
    expect(eventCount(proj, "SWARM_UNIT_CONVERGED")).toBe(0);
    expect(eventCount(proj, "SWARM_UNIT_FAILED")).toBe(1);
    expect(eventCount(proj, "SWARM_BATON_RETURNED")).toBe(1);
    expect(eventCount(proj, "SWARM_COMPLETED")).toBe(1);
  }, scaleTestTime(120000));

  // ===========================================================================
  // Issue #3197: committing a protected test does not erase the fork-time
  // baseline. Both advisory check and authoritative finalize reject the worker,
  // and no committed source is delivered while the recovery state stays intact.
  // ===========================================================================
  test("issue #3197: committed protected-test tampering is rejected without source delivery", () => {
    const proj = makeSwarmFixture();
    mkdirSync(join(proj, "spec"), { recursive: true });
    writeFileSync(join(proj, "spec", "protected.test"), "EXPECTED\n");
    gitOrThrow(proj, ["add", "--", "spec/protected.test"]);
    gitOrThrow(proj, ["commit", "-q", "-m", "seed protected test", "--", "spec/protected.test"]);

    const prepared = runRef(proj, [
      "prepare",
      "--batch", "4",
      "--units", "committed-tamper",
      "--base", "main",
    ]);
    expect(prepared.rc).toBe(0);

    const wt = wtPath(proj, "committed-tamper");
    writeFileSync(join(wt, "spec", "protected.test"), "TAMPERED\n");
    writeFileSync(join(wt, "worker-source.txt"), "must not land\n");
    gitOrThrow(wt, ["add", "--", "spec/protected.test", "worker-source.txt"]);
    gitOrThrow(wt, [
      "-c", "user.email=t@t",
      "-c", "user.name=t",
      "commit", "-q", "-m", "worker tampers with protected test",
      "--", "spec/protected.test", "worker-source.txt",
    ]);

    const checked = runRef(proj, [
      "check",
      "committed-tamper",
      "--check-cmd", "test -f worker-source.txt",
      "--test-file", "spec/protected.test",
    ]);
    const checkedEnvelope = JSON.parse(checked.out);
    terminalizePool(proj, "4");
    const targetBefore = gitOrThrow(proj, ["rev-parse", "main"]);

    const finalized = runRef(proj, [
      "finalize",
      "--batch", "4",
      "--units", "committed-tamper",
      "--claimed", "committed-tamper",
      "--check-cmd", "test -f worker-source.txt",
      "--test-file", "spec/protected.test",
    ]);
    const finalizedEnvelope = JSON.parse(finalized.out);
    const unit = finalizedEnvelope.units.find(
      (entry: { unit: string }) => entry.unit === "committed-tamper",
    );

    expect({
      checkStatus: checked.rc,
      checkConverged: checkedEnvelope.converged,
      checkTampered: checkedEnvelope.tampered,
      finalizeStatus: finalized.rc,
      finalizedConverged: finalizedEnvelope.converged,
      finalizedFailed: finalizedEnvelope.failed,
      unitStatus: unit?.status,
      unitTampered: unit?.tampered,
      targetUnchanged: gitOrThrow(proj, ["rev-parse", "main"]) === targetBefore,
      sourceLanded: existsSync(join(proj, "worker-source.txt")),
      worktreePreserved: existsSync(wt),
      branchPreserved: hasBoltBranch(proj, "committed-tamper"),
    }).toEqual({
      checkStatus: 1,
      checkConverged: true,
      checkTampered: true,
      finalizeStatus: 2,
      finalizedConverged: 0,
      finalizedFailed: 1,
      unitStatus: "failed",
      unitTampered: true,
      targetUnchanged: true,
      sourceLanded: false,
      worktreePreserved: true,
      branchPreserved: true,
    });
  }, scaleTestTime(120000));

  test("issue #3197: finalize delivers source to the non-main base captured by prepare", () => {
    const proj = makeSwarmFixture();
    gitOrThrow(proj, ["checkout", "-q", "-b", "delivery"]);
    const mainBefore = gitOrThrow(proj, ["rev-parse", "main"]);
    const deliveryBefore = gitOrThrow(proj, ["rev-parse", "delivery"]);

    const prepared = runRef(proj, [
      "prepare",
      "--batch", "5",
      "--units", "prepared-target",
      "--base", "delivery",
    ]);
    expect(prepared.rc).toBe(0);
    expect(JSON.parse(prepared.out).base).toBe("delivery");
    commitWorkerSource(proj, "prepared-target", "delivery-source.txt", "delivery only\n");
    terminalizePool(proj, "5");

    const finalized = runRef(proj, [
      "finalize",
      "--batch", "5",
      "--units", "prepared-target",
      "--claimed", "prepared-target",
      "--check-cmd", "test -f delivery-source.txt",
    ]);
    const envelope = JSON.parse(finalized.out);
    const deliveryAfter = gitOrThrow(proj, ["rev-parse", "delivery"]);

    expect({
      finalizeStatus: finalized.rc,
      converged: envelope.converged,
      failed: envelope.failed,
      mergeFailures: envelope.merge_failures,
      mainUnchanged: gitOrThrow(proj, ["rev-parse", "main"]) === mainBefore,
      deliveryAdvanced: deliveryAfter !== deliveryBefore,
      sourceOnDelivery: runGit(proj, ["cat-file", "-e", `${deliveryAfter}:delivery-source.txt`]).rc === 0,
      sourceOnMain: runGit(proj, ["cat-file", "-e", `main:delivery-source.txt`]).rc === 0,
      worktreePreserved: existsSync(wtPath(proj, "prepared-target")),
      branchPreserved: hasBoltBranch(proj, "prepared-target"),
    }).toEqual({
      finalizeStatus: 0,
      converged: 1,
      failed: 0,
      mergeFailures: [],
      mainUnchanged: true,
      deliveryAdvanced: true,
      sourceOnDelivery: true,
      sourceOnMain: false,
      worktreePreserved: false,
      branchPreserved: false,
    });
  }, scaleTestTime(120000));

  test("issue #3197: partial source-merge retry preserves completed units and converges the remainder", () => {
    const proj = makeSwarmFixture();
    writeFileSync(join(proj, "shared-recovery.txt"), "base\n");
    gitOrThrow(proj, ["add", "--", "shared-recovery.txt"]);
    gitOrThrow(proj, ["commit", "-q", "-m", "seed recovery conflict", "--", "shared-recovery.txt"]);

    const prepared = runRef(proj, [
      "prepare",
      "--batch", "6",
      "--units", "alpha-source,beta-source",
      "--base", "main",
    ]);
    expect(prepared.rc).toBe(0);
    commitWorkerSource(proj, "alpha-source", "alpha-source.txt", "alpha landed once\n");
    commitWorkerSource(proj, "beta-source", "shared-recovery.txt", "worker beta\n");

    writeFileSync(join(proj, "shared-recovery.txt"), "target beta\n");
    gitOrThrow(proj, ["add", "--", "shared-recovery.txt"]);
    gitOrThrow(proj, ["commit", "-q", "-m", "advance recovery target", "--", "shared-recovery.txt"]);
    terminalizePool(proj, "6");

    const finalizeArgs = [
      "finalize",
      "--batch", "6",
      "--units", "alpha-source,beta-source",
      "--claimed", "alpha-source,beta-source",
      "--check-cmd",
      "test -f alpha-source.txt || grep -Eq '^(worker beta|recovered beta)$' shared-recovery.txt",
    ];
    const first = runRef(proj, finalizeArgs);
    const firstEnvelope = JSON.parse(first.out);
    const alphaAfterFirst = firstEnvelope.units.find(
      (entry: { unit: string }) => entry.unit === "alpha-source",
    );
    const betaAfterFirst = firstEnvelope.units.find(
      (entry: { unit: string }) => entry.unit === "beta-source",
    );
    const firstConflictPaths = gitOrThrow(proj, ["diff", "--name-only", "--diff-filter=U"]);
    const alphaCleanupAfterFirst = {
      worktreeRemoved: !existsSync(wtPath(proj, "alpha-source")),
      branchRemoved: !hasBoltBranch(proj, "alpha-source"),
      sourceLanded: readFileSync(join(proj, "alpha-source.txt"), "utf-8") === "alpha landed once\n",
    };

    if (firstConflictPaths.length > 0) gitOrThrow(proj, ["reset", "--merge", "HEAD"]);
    const betaWt = wtPath(proj, "beta-source");
    const recoveryMerge = runGit(betaWt, ["-c", "merge.ff=false", "merge", "--no-ff", "main", "--no-edit"]);
    // The intent is "merging main conflicts on the shared file", not a specific
    // git exit code — pin the unmerged path instead.
    const recoveryMergeConflicted =
      recoveryMerge.rc !== 0 &&
      gitOrThrow(betaWt, ["diff", "--name-only", "--diff-filter=U"]) === "shared-recovery.txt";
    writeFileSync(join(betaWt, "shared-recovery.txt"), "recovered beta\n");
    gitOrThrow(betaWt, ["add", "--", "shared-recovery.txt", "alpha-source.txt"]);
    gitOrThrow(betaWt, [
      "-c", "user.email=t@t",
      "-c", "user.name=t",
      "commit", "-q", "-m", "resolve beta source conflict",
    ]);

    const beforeRetry = gitOrThrow(proj, ["rev-parse", "main"]);
    const second = runRef(proj, finalizeArgs);
    const secondEnvelope = JSON.parse(second.out);
    const alphaAfterRetry = secondEnvelope.units.find(
      (entry: { unit: string }) => entry.unit === "alpha-source",
    );
    const betaAfterRetry = secondEnvelope.units.find(
      (entry: { unit: string }) => entry.unit === "beta-source",
    );
    const afterRetry = gitOrThrow(proj, ["rev-parse", "main"]);

    expect({
      firstStatus: first.rc,
      firstConverged: firstEnvelope.converged,
      firstFailed: firstEnvelope.failed,
      alphaFirstStatus: alphaAfterFirst?.status,
      betaFirstStatus: betaAfterFirst?.status,
      betaMergeFailure: firstEnvelope.merge_failures.some(
        (entry: { unit: string }) => entry.unit === "beta-source",
      ),
      firstConflictPaths,
      alphaCleanupAfterFirst,
      recoveryMergeConflicted,
      retryStatus: second.rc,
      retryConverged: secondEnvelope.converged,
      retryFailed: secondEnvelope.failed,
      alphaRetryStatus: alphaAfterRetry?.status,
      betaRetryStatus: betaAfterRetry?.status,
      retryCommitCount: Number(gitOrThrow(proj, ["rev-list", "--count", `${beforeRetry}..${afterRetry}`])),
      alphaSource: readFileSync(join(proj, "alpha-source.txt"), "utf-8"),
      betaSource: readFileSync(join(proj, "shared-recovery.txt"), "utf-8"),
      betaWorktreeRemoved: !existsSync(betaWt),
      betaBranchRemoved: !hasBoltBranch(proj, "beta-source"),
    }).toEqual({
      firstStatus: 2,
      firstConverged: 1,
      firstFailed: 1,
      alphaFirstStatus: "converged",
      betaFirstStatus: "failed",
      betaMergeFailure: true,
      firstConflictPaths: "shared-recovery.txt",
      alphaCleanupAfterFirst: {
        worktreeRemoved: true,
        branchRemoved: true,
        sourceLanded: true,
      },
      recoveryMergeConflicted: true,
      retryStatus: 0,
      retryConverged: 2,
      retryFailed: 0,
      alphaRetryStatus: "converged",
      betaRetryStatus: "converged",
      retryCommitCount: 1,
      alphaSource: "alpha landed once\n",
      betaSource: "recovered beta\n",
      betaWorktreeRemoved: true,
      betaBranchRemoved: true,
    });
  }, scaleTestTime(120000));

  // ===========================================================================
  // Issue #3197: metadata convergence cannot substitute for source integration.
  // A genuine unit whose committed source conflicts with main must return the
  // baton, preserve its worktree/branch, and expose the source merge failure.
  // ===========================================================================
  test("issue #3197: source conflict fails finalize and preserves recovery state", () => {
    const proj = makeSwarmFixture();
    writeFileSync(join(proj, "source-conflict.txt"), "base version\n");
    gitOrThrow(proj, ["add", "--", "source-conflict.txt"]);
    gitOrThrow(proj, ["commit", "-q", "-m", "seed source conflict", "--", "source-conflict.txt"]);

    const prepared = runRef(proj, [
      "prepare",
      "--batch", "4",
      "--units", "source-conflict",
      "--base", "main",
    ]);
    expect(prepared.rc).toBe(0);
    commitWorkerSource(proj, "source-conflict", "source-conflict.txt", "worker version\n");

    writeFileSync(join(proj, "source-conflict.txt"), "main version\n");
    gitOrThrow(proj, ["add", "--", "source-conflict.txt"]);
    gitOrThrow(proj, ["commit", "-q", "-m", "advance main conflict", "--", "source-conflict.txt"]);
    terminalizePool(proj, "4");

    const f = runRef(proj, [
      "finalize",
      "--batch", "4",
      "--units", "source-conflict",
      "--claimed", "source-conflict",
      "--check-cmd", "grep -q '^worker version$' source-conflict.txt",
    ]);

    try {
      expect(f.rc).toBe(2);
      const env = JSON.parse(f.out);
      expect(env.converged).toBe(0);
      expect(env.failed).toBe(1);
      expect(env.merge_failures).toHaveLength(1);
      expect(env.merge_failures[0].unit).toBe("source-conflict");
      const unit = env.units.find((entry: { unit: string }) => entry.unit === "source-conflict");
      expect(unit).toBeDefined();
      expect(unit.status).toBe("failed");
      expect(unit.reason).toBe("error");
      expect(existsSync(wtPath(proj, "source-conflict"))).toBe(true);
      expect(hasBoltBranch(proj, "source-conflict")).toBe(true);
      expect(gitOrThrow(proj, ["diff", "--name-only", "--diff-filter=U"])).toBe(
        "source-conflict.txt",
      );
    } finally {
      // `merge --squash` does not reliably leave MERGE_HEAD, so reset --merge is
      // the portable abort for its unmerged index/worktree state.
      const conflicts = gitOrThrow(proj, ["diff", "--name-only", "--diff-filter=U"]);
      if (conflicts.length > 0) gitOrThrow(proj, ["reset", "--merge", "HEAD"]);
    }
  }, scaleTestTime(120000));
});
