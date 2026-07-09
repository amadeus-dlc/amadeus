// covers: subcommand:amadeus-worktree:create, subcommand:amadeus-worktree:merge, subcommand:amadeus-worktree:discard
//
// Sibling-worktree anchoring (Issue #670). The write subcommands
// (create/merge/discard) anchor every git op and the Bolt worktree path to the
// MAIN checkout, so a session running from a sibling dev worktree still
// creates/merges/discards Bolt worktrees against the main checkout — while a call
// from INSIDE a Bolt worktree (true nesting) stays rejected pre-audit.
//
// This replaces the pre-#670 t06 (which asserted `create` from ANY sibling was
// rejected with "must run from the main repo checkout"). That contract is gone:
// running from a sibling is now the supported multi-worktree flow.
//
// MECHANISM: this is a .cli file, so every observable is taken at the PROCESS
// boundary — SPAWN the real binary via spawnSync (BUN + the tool .ts path) and
// assert on res.status / combined stdout+stderr. The anchor resolution fires
// inside the real process from the real cwd, so an in-process twin would not
// reproduce the `git rev-parse --show-toplevel` / `--git-common-dir` resolution
// that drives the main-checkout-vs-sibling classification.
//
// FIXTURE: setupWorktreeFixture builds the parent git repo on `main` with one
// commit + the per-intent workspace shell. addSibling adds a REAL sibling worktree
// under <fixture>/.claude/worktrees/dev-slug AND seeds its own workspace shell so
// audit rows emitted with `--project-dir <sibling>` land in the sibling's record.
// addBoltWorktree adds a REAL Bolt worktree under <fixture>/.amadeus/worktrees/
// bolt-<slug> (the true-nest source). cleanupWorktreeFixture prunes child
// worktrees then rm -rf's the parent.
//
// COVERAGE:
//   T1  create from a sibling worktree             -> exit 0, worktree at the MAIN
//         checkout side, NOT nested under the sibling, WORKTREE_CREATED in the
//         sibling's (--project-dir) record.
//   T2  create from the main checkout              -> exit 0 (regression: unchanged).
//   T3  create from inside a Bolt worktree         -> rejected pre-audit (true nest):
//         no audit row, no worktree, new true-nesting error message.
//   T4  merge --strategy squash from a sibling     -> exit 0, worktree removed.
//   T5  discard from a sibling                     -> exit 0, worktree removed.
//   T6  list from a sibling AND the main checkout  -> exit 0 both (unchanged).

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupWorktreeFixture,
  seededAuditDir,
  seededStateFile,
  seedWorkspaceShell,
  setupWorktreeFixture,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const TOOL = join(AMADEUS_SRC, "tools", "amadeus-worktree.ts");

const fixtures: string[] = [];
afterAll(() => {
  for (const f of fixtures) cleanupWorktreeFixture(f);
});

/** Fresh git-repo fixture on `main` + workspace shell, registered for cleanup.
 *  Seed a state file so the active-intent cursor resolves and the audit lands in
 *  the record (a stateless record makes the emit fall back to the bare space root). */
function freshFixture(): string {
  const p = setupWorktreeFixture();
  fixtures.push(p);
  writeFileSync(seededStateFile(p), "- **Current Stage**: code-generation\n", "utf-8");
  return p;
}

/** Add a real sibling worktree at <fixture>/.claude/worktrees/dev-slug on a new
 *  dev-branch, then seed its own workspace shell so `--project-dir <sibling>`
 *  audit emits resolve the sibling's record. */
function addSibling(fixture: string): string {
  const sibling = join(fixture, ".claude", "worktrees", "dev-slug");
  const r = spawnSync(
    "git",
    ["-C", fixture, "worktree", "add", "-q", sibling, "-b", "dev-branch"],
    { encoding: "utf-8" },
  );
  if (r.status !== 0) {
    throw new Error(
      `git worktree add (sibling) failed: ${r.stderr?.trim() || r.stdout?.trim() || `exit ${r.status}`}`,
    );
  }
  // The record is created post-seed-commit in the main checkout, so it does not
  // travel to a fresh worktree checkout — seed the sibling's shell + state file so
  // its active-intent cursor resolves and audit rows land in the sibling record.
  seedWorkspaceShell(sibling);
  writeFileSync(seededStateFile(sibling), "- **Current Stage**: code-generation\n", "utf-8");
  return sibling;
}

/** Add a real Bolt worktree at <fixture>/.amadeus/worktrees/bolt-<slug> on branch
 *  bolt-<slug> — the true-nesting source for T3. */
function addBoltWorktree(fixture: string, slug: string): string {
  const path = wtPath(fixture, slug);
  const r = spawnSync(
    "git",
    ["-C", fixture, "worktree", "add", "-q", path, "-b", `bolt-${slug}`, "main"],
    { encoding: "utf-8" },
  );
  if (r.status !== 0) {
    throw new Error(
      `git worktree add (bolt) failed: ${r.stderr?.trim() || r.stdout?.trim() || `exit ${r.status}`}`,
    );
  }
  return path;
}

/** Commit a file inside a worktree so a squash merge has real content to land. */
function commitFileIn(wt: string, name: string, content: string, msg: string): void {
  writeFileSync(join(wt, name), content);
  const add = spawnSync("git", ["-C", wt, "add", name], { encoding: "utf-8" });
  if (add.status !== 0) {
    throw new Error(`git add failed: ${add.stderr?.trim() || `exit ${add.status}`}`);
  }
  const c = spawnSync(
    "git",
    ["-C", wt, "-c", "user.email=t@x", "-c", "user.name=t", "commit", "-qm", msg],
    { encoding: "utf-8" },
  );
  if (c.status !== 0) {
    throw new Error(`git commit failed: ${c.stderr?.trim() || `exit ${c.status}`}`);
  }
}

interface CliResult {
  status: number;
  out: string; // combined stdout+stderr
}

/** Spawn `bun amadeus-worktree.ts <sub> ... --project-dir <projectDir>` from cwd. */
function run(
  sub: string,
  cwd: string,
  projectDir: string,
  args: string[],
): CliResult {
  const res = spawnSync(
    BUN,
    [TOOL, sub, ...args, "--project-dir", projectDir],
    { cwd, encoding: "utf-8" },
  );
  return {
    status: res.status ?? -1,
    out: `${res.stdout ?? ""}${res.stderr ?? ""}`,
  };
}

/** Every `**Bolt slug**: <slug>` row across a record's audit shards (audit/*.md).
 *  A dir with no seeded record has no shard dir -> [] (the pre-audit negative). */
function boltSlugRows(dir: string): string[] {
  const auditDir = seededAuditDir(dir);
  let names: string[];
  try {
    names = readdirSync(auditDir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const n of names) {
    for (const line of readFileSync(join(auditDir, n), "utf-8").split("\n")) {
      const m = line.match(/^\*\*Bolt slug\*\*:\s*(\S+)/);
      if (m) out.push(m[1]);
    }
  }
  return out;
}

const wtPath = (dir: string, slug: string): string =>
  join(dir, ".amadeus", "worktrees", `bolt-${slug}`);

describe("t06 amadeus-worktree sibling anchoring (#670)", () => {
  test("T1: create from a sibling worktree anchors the Bolt worktree to the main checkout", () => {
    const fixture = freshFixture();
    const sibling = addSibling(fixture);

    const r = run("create", sibling, sibling, ["--slug", "demo", "--base", "main"]);

    expect(r.status).toBe(0);
    // Anchored to the MAIN checkout, NOT nested under the sibling.
    expect(existsSync(wtPath(fixture, "demo"))).toBe(true);
    expect(existsSync(wtPath(sibling, "demo"))).toBe(false);
    // WORKTREE_CREATED landed in the --project-dir (sibling) record.
    expect(boltSlugRows(sibling)).toContain("demo");
  }, 30000);

  test("T2: create from the main checkout is unchanged (regression)", () => {
    const fixture = freshFixture();

    const r = run("create", fixture, fixture, ["--slug", "demo2", "--base", "main"]);

    expect(r.status).toBe(0);
    expect(existsSync(wtPath(fixture, "demo2"))).toBe(true);
    expect(boltSlugRows(fixture)).toContain("demo2");
  }, 30000);

  test("T3: create from inside a Bolt worktree is rejected pre-audit (true nesting)", () => {
    const fixture = freshFixture();
    const boltWt = addBoltWorktree(fixture, "nest");

    const r = run("create", boltWt, boltWt, ["--slug", "nested", "--base", "main"]);

    expect(r.status).not.toBe(0);
    expect(r.out).toContain("cannot run from inside a Bolt worktree");
    expect(r.out).toContain("true nesting");
    // Pre-audit: no row landed anywhere, and no new worktree was created.
    expect(boltSlugRows(boltWt)).not.toContain("nested");
    expect(boltSlugRows(fixture)).not.toContain("nested");
    expect(existsSync(wtPath(boltWt, "nested"))).toBe(false);
    expect(existsSync(wtPath(fixture, "nested"))).toBe(false);
  }, 30000);

  test("T4: merge --strategy squash from a sibling lands on the main checkout", () => {
    const fixture = freshFixture();
    const sibling = addSibling(fixture);

    const created = run("create", sibling, sibling, ["--slug", "m1", "--base", "main"]);
    expect(created.status).toBe(0);
    // Give the Bolt branch a commit so the squash has real content.
    commitFileIn(wtPath(fixture, "m1"), "feature.txt", "change\n", "bolt m1 change");

    const merged = run("merge", sibling, sibling, [
      "--slug",
      "m1",
      "--target",
      "main",
      "--strategy",
      "squash",
    ]);

    expect(merged.status).toBe(0);
    expect(merged.out).toContain("WORKTREE_MERGED");
    // Cleanup ran: the worktree dir is gone.
    expect(existsSync(wtPath(fixture, "m1"))).toBe(false);
    expect(boltSlugRows(sibling)).toContain("m1");
  }, 30000);

  test("T5: discard from a sibling removes the main-checkout Bolt worktree", () => {
    const fixture = freshFixture();
    const sibling = addSibling(fixture);

    const created = run("create", sibling, sibling, ["--slug", "d1", "--base", "main"]);
    expect(created.status).toBe(0);
    expect(existsSync(wtPath(fixture, "d1"))).toBe(true);

    const discarded = run("discard", sibling, sibling, ["--slug", "d1"]);

    expect(discarded.status).toBe(0);
    expect(discarded.out).toContain("WORKTREE_DISCARDED");
    expect(existsSync(wtPath(fixture, "d1"))).toBe(false);
  }, 30000);

  test("T6: list succeeds from both a sibling and the main checkout (unchanged)", () => {
    const fixture = freshFixture();
    const sibling = addSibling(fixture);

    expect(run("list", sibling, sibling, []).status).toBe(0);
    expect(run("list", fixture, fixture, []).status).toBe(0);
  }, 30000);
});
