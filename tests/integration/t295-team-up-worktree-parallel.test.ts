// size: large
// Issue #1478: create_run built the member worktrees one at a time — 7.39s of a
// 7-member launch — and tracked what it had built in a CREATED_MEMBERS shell
// variable that rollback_prepared_run read back.
//
// Parallelising it breaks that variable: the work now happens in subshells,
// which cannot write back to their parent. So the ledger is gone and both the
// success check and the rollback set are re-derived by observing what is
// actually there.
//
// The parallel part is the *checkout*, not the add. `git worktree add` scans
// .git/worktrees/ and two of them at once can read a half-written entry
// ("fatal: failed to read .git/worktrees/<other>/commondir") — it does not
// reproduce on macOS but did on Linux CI. Registration is serial and cheap
// (~0.02s/member); the checkout is the cost and is safe to fan out.
//
// These tests pin the things that decision rests on:
//   - registration is serial, so the race cannot come back
//   - checkout concurrency stays at or below WORKTREE_PARALLELISM (an unbounded
//     fan-out measured *slower* than serial, so the cap is the feature)
//   - completion is judged by git's registry *and* the record files, not by
//     directory existence — registration alone no longer implies a populated
//     worktree now that --no-checkout splits the two
//   - a partial failure still rolls the whole run back, and the walk that does
//     it never leaves RUN_ROOT or touches a non-member name
//
// Everything drives the real script through the TEAM_UP_LIB_ONLY=1 seam against
// a throwaway git repo. Real FS and real git, hence the integration layer
// (cid:code-generation:fs-tests-integration-first).
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const TEAM_UP = join(ROOT, "packages/framework/core/tools/team-up.sh");
const REAL_GIT = Bun.which("git");

let work: string;
let repo: string;
let base: string;
let state: string;
let shimDir: string;

/** Absolute path a member's worktree is expected at, for run id "testrun". */
function memberPath(member: string): string {
  return join(base, "runs", "testrun", member);
}

function git(args: string[], cwd: string) {
  const r = Bun.spawnSync({ cmd: [REAL_GIT as string, ...args], cwd, stderr: "pipe", stdout: "pipe" });
  if (r.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr.toString()}`);
  return r.stdout.toString();
}

/**
 * Install a `git` shim earlier on PATH than the real one. `body` is bash run
 * for `worktree add` invocations only, with $WT bound to the target worktree
 * path and $MEMBER to its basename; every other git call passes straight
 * through. Returning non-zero from `body` skips the real add — that is the
 * failure injection.
 *
 * The argv team-up.sh builds is:
 *   -C <repo> worktree add -q --no-checkout -b <branch> <worktree> <commit>
 *    $1  $2      $3     $4  $5      $6      $7   $8        $9        $10
 * so the worktree path is $9. ($8 is the branch, whose basename is also the
 * member name — close enough to look right while pointing somewhere else.)
 */
function installGitShim(body: string) {
  writeFileSync(
    join(shimDir, "git"),
    `#!/usr/bin/env bash
if [ "\${3:-}" = "worktree" ] && [ "\${4:-}" = "add" ]; then
  WT="\${9:-}"
  MEMBER="\${WT##*/}"
  ${body}
fi
exec ${REAL_GIT} "$@"
`,
    { mode: 0o755 },
  );
}

/**
 * Same idea as installGitShim, for the parallel pass. `body` runs for
 * `git -C <worktree> checkout` invocations only, with $WT bound to the worktree
 * and $MEMBER to its basename.
 *
 * The argv team-up.sh builds is:
 *   -C <worktree> checkout -q
 *    $1    $2        $3    $4
 */
function installCheckoutShim(body: string) {
  writeFileSync(
    join(shimDir, "git"),
    `#!/usr/bin/env bash
if [ "\${3:-}" = "checkout" ]; then
  WT="\${2:-}"
  MEMBER="\${WT##*/}"
  ${body}
fi
exec ${REAL_GIT} "$@"
`,
    { mode: 0o755 },
  );
}

/**
 * Source team-up.sh in library mode against the scratch repo and run `snippet`.
 * `set --` clears the bash -c positionals so team-up.sh does not read them as
 * its own flags. AGMSG_RESET points at a path that does not exist, which makes
 * rollback_registered_members a no-op.
 */
function runLib(snippet: string) {
  return Bun.spawnSync({
    cmd: [
      "bash",
      "-c",
      `script="$1"; set --; TEAM_UP_LIB_ONLY=1 source "$script"
INSTANCE_DIR="$TEST_STATE/instances/default"
RUN_NAME=test; TEAM_NAME=amadeus; S=sess; RUNTIME=claude; MSG_BACKEND=agmsg
${snippet}`,
      "_",
      TEAM_UP,
    ],
    // Run from the scratch dir: anything a shim writes relative to cwd lands
    // there rather than in the checkout.
    cwd: work,
    env: {
      ...process.env,
      PATH: `${shimDir}:${process.env.PATH}`,
      TEAM_REPO: repo,
      TEAM_BASE: base,
      TEAM_STATE_DIR: state,
      TEST_STATE: state,
      AGMSG_RESET: join(work, "no-such-reset.sh"),
      TEAM_RUN_ID: "testrun",
      BASE_REF: "",
    },
    stderr: "pipe",
    stdout: "pipe",
  });
}

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "t295-"));
  repo = join(work, "repo");
  base = join(work, "base");
  state = join(work, "state");
  shimDir = join(work, "bin");
  mkdirSync(repo, { recursive: true });
  mkdirSync(shimDir, { recursive: true });
  git(["init", "-q", "-b", "main"], repo);
  git(["config", "user.email", "t295@example.invalid"], repo);
  git(["config", "user.name", "t295"], repo);
  writeFileSync(join(repo, "README.md"), "t295\n");
  git(["add", "-A"], repo);
  git(["commit", "-qm", "init"], repo);
  installGitShim(":");
});

afterEach(() => {
  rmSync(work, { recursive: true, force: true });
});

describe("team-up worktree creation is parallel and bounded (Issue #1478)", () => {
  // BR-P2 / ADR-4: the cap is a measured value, not a guess. Both the value and
  // the measurement that justifies it are pinned — a future edit that changes
  // one without the other should fail here.
  test("WORKTREE_PARALLELISM is 4 and carries its measurement (BR-P2)", () => {
    const result = runLib(`printf '%s\\n' "$WORKTREE_PARALLELISM"`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString().trim()).toBe("4");

    const source = readFileSync(TEAM_UP, "utf8");
    expect(source).toContain("serial 7.39s / 2 -> 4.88s / 3 -> 4.03s / 4 -> 3.32s / 7 -> 7.55s.");
    // The split that removed the race carries its own measurement.
    expect(source).toContain("serial add            13.28 / 10.46 / 10.73s");
    expect(source).toContain("+ parallel checkout 5.39 / 5.41s");
  });

  // BR-P3 / BR-P4: every member ends up with a worktree and with its record
  // metadata, even though the writes happened inside subshells.
  test("all 7 members get a worktree and record metadata (BR-P3, BR-P4)", () => {
    const result = runLib(`TEAM_SIZE=6; create_run`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);

    const members = ["leader", ...Array.from({ length: 6 }, (_, i) => `engineer-${i + 1}`)];
    const registered = git(["worktree", "list", "--porcelain"], repo);
    for (const m of members) {
      expect(existsSync(memberPath(m)), m).toBe(true);
      const record = join(state, "instances/default/runs/testrun/members", m);
      expect(readFileSync(join(record, "path"), "utf8").trim(), m).toBe(memberPath(m));
      expect(readFileSync(join(record, "branch"), "utf8").trim(), m).toBe(`team/testrun/${m}`);
      expect(registered, m).toContain(`${m}\n`);
    }
  });

  // BR-P1 / D-P3: the cap is the requirement, and it applies to the *checkout*.
  // The shim brackets each real checkout with a start/end marker and holds the
  // window open long enough for the batches to overlap; replaying the markers
  // gives the peak concurrency.
  test("checkout concurrency never exceeds WORKTREE_PARALLELISM (BR-P1)", () => {
    const log = join(work, "conc.log");
    installCheckoutShim(`printf 'S\\n' >>"${log}"
  ${REAL_GIT} "$@"; rc=$?
  sleep 0.3
  printf 'E\\n' >>"${log}"
  exit $rc`);

    const result = runLib(`TEAM_SIZE=6; create_run`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);

    let live = 0;
    let peak = 0;
    for (const line of readFileSync(log, "utf8").trim().split("\n")) {
      live += line === "S" ? 1 : -1;
      if (live > peak) peak = live;
    }
    // Bounded by the cap...
    expect(peak).toBeLessThanOrEqual(4);
    // ...and actually concurrent, so the bound above is not passing by accident
    // on a loop that stayed serial.
    expect(peak).toBeGreaterThan(1);
  });

  // The regression this fix exists for. Two `git worktree add` runs at once can
  // read each other's half-written .git/worktrees/ entry, so registration must
  // stay serial. Same marker replay as above, pointed at add instead: the peak
  // must be exactly 1.
  test("worktree registration never runs concurrently (Linux CI race)", () => {
    const log = join(work, "add.log");
    installGitShim(`printf 'S\\n' >>"${log}"
  ${REAL_GIT} "$@"; rc=$?
  sleep 0.1
  printf 'E\\n' >>"${log}"
  exit $rc`);

    const result = runLib(`TEAM_SIZE=6; create_run`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);

    let live = 0;
    let peak = 0;
    for (const line of readFileSync(log, "utf8").trim().split("\n")) {
      live += line === "S" ? 1 : -1;
      if (live > peak) peak = live;
    }
    expect(peak).toBe(1);
  });

  // --no-checkout is not incidental: it is what makes the serial pass cheap
  // enough to be serial. Pin it so a future edit cannot quietly drop it and
  // reintroduce the race by making registration expensive again.
  test("registration passes --no-checkout (D-P3)", () => {
    const log = join(work, "argv.log");
    installGitShim(`printf '%s\\n' "$*" >>"${log}"`);

    const result = runLib(`TEAM_SIZE=6; create_run`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    for (const line of readFileSync(log, "utf8").trim().split("\n")) {
      expect(line).toContain("--no-checkout");
    }
  });
});

describe("team-up completion is judged by git registration (Issue #1478)", () => {
  // BR-P13 / BR-P14: a failed member makes create_run return non-zero, and the
  // stderr line names both the member and its path on one line — several
  // subshells share stderr, so an attribution split over lines would be lost.
  test("a failed checkout fails create_run and names the member (BR-P13, BR-P14)", () => {
    installCheckoutShim(`if [ "$MEMBER" = "engineer-2" ]; then exit 1; fi`);

    const result = runLib(`TEAM_SIZE=6; create_run`);
    expect(result.exitCode).not.toBe(0);
    const stderr = result.stderr.toString();
    expect(stderr).toContain(`ERROR: worktree checkout failed for engineer-2: ${memberPath("engineer-2")}`);
    expect(stderr).toContain("worktree creation incomplete");
    expect(stderr).toContain("engineer-2");
  });

  // Registration is serial, so its failure stops the loop rather than being
  // collected afterwards — a different path from the checkout failure above.
  test("a failed registration fails create_run immediately", () => {
    installGitShim(`if [ "$MEMBER" = "engineer-2" ]; then exit 1; fi`);

    const result = runLib(`TEAM_SIZE=6; create_run`);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain(
      `ERROR: worktree registration failed for engineer-2: ${memberPath("engineer-2")}`,
    );
  });

  // Splitting add from checkout opened a way to be registered without being
  // finished, so the completion check reads the record files too — git's
  // registry alone no longer proves a member is done.
  //
  // Injected by putting a *file* where engineer-3's record directory belongs:
  // the mkdir -p fails, so the record writes fail, while the worktree itself is
  // registered and populated exactly like every other member.
  test("registration alone is not success without the record files (D-R4)", () => {
    const members = join(state, "instances/default/runs/testrun/members");
    installCheckoutShim(`if [ "$MEMBER" = "engineer-3" ]; then
    mkdir -p "${members}"
    : >"${members}/engineer-3"
  fi`);

    const result = runLib(`TEAM_SIZE=6; create_run`);
    expect(result.exitCode).not.toBe(0);
    const stderr = result.stderr.toString();
    expect(stderr).toContain("worktree creation incomplete");
    expect(stderr).toContain("engineer-3");
    // The worktree really was created and registered — the failure is the
    // missing completion evidence, not a missing worktree.
    expect(git(["worktree", "list", "--porcelain"], repo)).toContain("engineer-3\n");
  });

  // D-R4, the reason this check reads the registry instead of the filesystem.
  // `git worktree add` can die during checkout having already created the
  // directory; the husk it leaves would satisfy a `[ -d ]` test. Here the shim
  // reproduces exactly that, and create_run must still report the member as
  // missing.
  test("a directory that git never registered is not success (D-R4)", () => {
    installGitShim(`if [ "$MEMBER" = "engineer-3" ]; then mkdir -p "$WT"; exit 1; fi`);

    const result = runLib(`TEAM_SIZE=6; create_run`);
    // The husk is on disk — the very false positive a directory test would hit.
    expect(existsSync(memberPath("engineer-3"))).toBe(true);
    expect(git(["worktree", "list", "--porcelain"], repo)).not.toContain("engineer-3");
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("engineer-3");
  });
});

describe("team-up rolls a partial run back (Issue #1478)", () => {
  // BR-P10 / BR-P12 / INV-P5, the main correctness risk: the ledger that used
  // to drive rollback is gone, so this proves by injection that the successful
  // worktrees of a partially failed run are still all removed.
  test("a partial failure rolls back every worktree and branch (BR-P10, BR-P12)", () => {
    installGitShim(`if [ "$MEMBER" = "engineer-2" ]; then exit 1; fi`);

    const result = runLib(`TEAM_SIZE=6; create_run || true; rollback_prepared_run`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);

    expect(existsSync(join(base, "runs/testrun"))).toBe(false);
    expect(existsSync(join(state, "instances/default/runs/testrun"))).toBe(false);
    const registered = git(["worktree", "list", "--porcelain"], repo);
    expect(registered).not.toContain("/runs/testrun/");
    expect(git(["branch", "--list", "team/testrun/*"], repo).trim()).toBe("");
  });

  // BR-P11 / D-R3: `git worktree remove` cannot touch a husk, so the
  // unconditional rm -rf at the end of rollback_prepared_run has to stay.
  test("an unregistered husk is removed too (BR-P11)", () => {
    installGitShim(`if [ "$MEMBER" = "engineer-3" ]; then mkdir -p "$WT"; exit 1; fi`);

    const result = runLib(`TEAM_SIZE=6; create_run || true; rollback_prepared_run`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(existsSync(join(base, "runs/testrun"))).toBe(false);
  });

  // BR-P9 / D-S1 layer 2, the safety property. The walk re-derives its targets
  // from disk, so it must reject any name outside the members_for set —
  // otherwise it runs `git worktree remove --force` and `git branch -D` over a
  // stranger that merely happens to sit in the same directory.
  //
  // The observable has to be git state, not the directory: the closing rm -rf
  // clears everything under RUN_ROOT either way, so a surviving directory would
  // prove nothing. A surviving *branch* is what separates "the walk skipped it"
  // from "the walk force-removed it".
  test("the rollback walk only matches member names (BR-P9, D-S1)", () => {
    const stranger = join(base, "runs/testrun/not-a-member");
    const result = runLib(`TEAM_SIZE=2; create_run
git -C "$REPO" worktree add -q -b team/testrun/not-a-member "${stranger}" HEAD
rollback_prepared_run`);
    expect(result.exitCode, result.stderr.toString()).toBe(0);

    // The stranger's branch is intact — layer 2 refused to act on the name...
    expect(git(["branch", "--list", "team/testrun/not-a-member"], repo).trim()).toContain(
      "team/testrun/not-a-member",
    );
    // ...while every real member's branch and registration is gone.
    expect(git(["branch", "--list", "team/testrun/leader"], repo).trim()).toBe("");
    expect(git(["branch", "--list", "team/testrun/engineer-*"], repo).trim()).toBe("");
    expect(existsSync(join(base, "runs/testrun"))).toBe(false);
  });
});
