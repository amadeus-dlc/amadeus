// covers: function:gitHasSourceWork
// size: medium
//
// t206 - intent-span & bolt-branch source-work detection (issue #731).
//
// gitHasSourceWork is the git-aware half of the workspace_requires guard: it
// answers "did this intent produce real source work?" so a docs-only
// code-generation approve is refused while a real one passes. Before #731 it
// looked only at the working tree and the LAST commit (git diff HEAD~1 HEAD).
// Two conductor record-branch patterns defeat that narrow window:
//   (A) code is merged into the record branch via an EARLIER merge commit, then
//       checkpoint/delegate DOC commits are stacked on top -> HEAD~1..HEAD is
//       doc-only, so the guard FALSE-REFUSED a stage whose code was merged; and
//   (B) code lives on an UNMERGED bolt branch (bolt worktree isolation) and the
//       record branch only ever carries doc commits -> the record branch history
//       never shows the code at all.
//
// The fix widens the doc-only fallback: (A) scans the net diff from the intent's
// birth commit (the one that ADDED this intent's record amadeus-state.md) to
// HEAD; (B) reads this intent's bolt slugs from the first-class `Bolt Refs` state
// field and checks each bolt branch for non-doc work vs its merge-base with HEAD.
// Both probes stay scoped to THIS intent, so a brownfield src/ or a stale bolt
// branch from another intent cannot false-pass a genuine "nothing built".
//
// This file drives the function IN-PROCESS (not via a spawned tool) against real
// git fixtures so the new lines are measured by the coverage run, which does not
// instrument spawned children. Import surface mirrors t205 (dist/claude copy, not
// core) so coverage remaps to packages/framework/core.

import { afterEach, beforeEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { gitHasSourceWork } from "../../dist/claude/.claude/tools/amadeus-state.ts";
import {
  cleanupTestProject,
  createTestProject,
  seededRecordDir,
} from "../harness/fixtures.ts";

let proj: string;

function git(args: string[]): string {
  const r = spawnSync("git", args, { cwd: proj, encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  return (r.stdout ?? "").trim();
}

function initGitRepo(): void {
  git(["init", "-q"]);
  git(["config", "user.email", "t206@example.com"]);
  git(["config", "user.name", "t206"]);
  git(["config", "commit.gpgsign", "false"]);
}

// Write this intent's record amadeus-state.md (optionally with a `Bolt Refs`
// list) and commit ONLY the amadeus/ tree. This is the intent BIRTH commit - a
// doc-only commit, exactly as intent creation produces on a record branch.
function commitIntentBirth(boltSlugs: string[] = []): void {
  const refs = boltSlugs.length === 0 ? "[empty list]" : `[${boltSlugs.join(", ")}]`;
  writeFileSync(
    join(seededRecordDir(proj), "amadeus-state.md"),
    `# State\n\n- **Bolt Refs**: ${refs}\n`,
    "utf-8",
  );
  git(["add", "amadeus"]);
  git(["commit", "-q", "-m", "birth: create intent record"]);
}

// Write a file at a path RELATIVE to the project (workspace) root.
function writeFileAt(rel: string, body: string): void {
  const abs = join(proj, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body, "utf-8");
}

// Write a file under this intent's absolute record dir.
function writeRecordFile(name: string, body: string): void {
  const abs = join(seededRecordDir(proj), name);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body, "utf-8");
}

// Append a doc-only change to the record and commit it (a checkpoint/delegate
// commit in the record-branch pattern).
function commitDoc(name: string, body: string): void {
  writeRecordFile(name, body);
  git(["add", "amadeus"]);
  git(["commit", "-q", "-m", `doc: ${name}`]);
}

// Land a workspace (non-doc) file via a NON-fast-forward merge commit, mirroring
// the Bolt-PR -> main -> record-branch merge that carries the real code.
function mergeCodeBranch(path: string): void {
  const base = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  git(["checkout", "-q", "-b", "feature-code"]);
  writeFileAt(path, "export const x = 1;\n");
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "code: bolt output"]);
  git(["checkout", "-q", base]);
  git(["merge", "-q", "--no-ff", "feature-code", "-m", "Merge Bolt PR into record branch"]);
}

// Create an UNMERGED bolt branch off the current HEAD carrying `files`, then
// return to the original branch WITHOUT merging. Each file is committed on the
// bolt branch only.
function unmergedBoltBranch(branch: string, files: Record<string, string>): void {
  const base = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  git(["checkout", "-q", "-b", branch]);
  for (const [path, body] of Object.entries(files)) {
    writeFileAt(path, body);
  }
  git(["add", "-A"]);
  git(["commit", "-q", "-m", `bolt work on ${branch}`]);
  git(["checkout", "-q", base]);
}

beforeEach(() => {
  proj = createTestProject();
});

afterEach(() => {
  cleanupTestProject(proj);
});

// (A) Pattern A repro: code arrives via an earlier merge commit, then two
// doc-only commits are stacked on top so HEAD~1..HEAD is doc-only. The
// intent-span scan must still find the merged code and return true (PASS).
test("recognises code merged before trailing doc commits (issue #731 pattern A)", () => {
  initGitRepo();
  commitIntentBirth();
  mergeCodeBranch("src/auth/login.ts");
  commitDoc("audit/checkpoint.md", "checkpoint\n");
  commitDoc("audit/delegate.md", "delegate approval\n");
  expect(gitHasSourceWork(proj)).toBe(true);
});

// (B) Pattern B repro: the record branch carries ONLY doc commits; the code
// lives on an unmerged bolt branch named in `Bolt Refs`. The bolt-branch probe
// must find it and return true (PASS). Uses the `bolt/<slug>` naming of the
// production case (bolt/dynamic-test-size, #732), exercising both candidate
// branch names in the probe loop.
test("recognises code on an unmerged bolt branch (issue #731 pattern B)", () => {
  initGitRepo();
  commitIntentBirth(["dynamic-test-size"]);
  unmergedBoltBranch("bolt/dynamic-test-size", { "src/runner/size.ts": "export const s = 1;\n" });
  commitDoc("audit/checkpoint.md", "checkpoint\n");
  commitDoc("audit/delegate.md", "delegate approval\n");
  expect(gitHasSourceWork(proj)).toBe(true);
});

// Brownfield edge: src/ committed BEFORE the intent birth, only doc commits
// during the intent. The net diff birth..HEAD excludes the pre-existing src/, so
// the verdict must be a definitive false (REFUSE) - unchanged by #731.
test("refuses when src/ predates the intent birth (brownfield)", () => {
  initGitRepo();
  writeFileAt("src/legacy/old.ts", "export const legacy = 1;\n");
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "baseline brownfield code"]);
  commitIntentBirth();
  commitDoc("audit/checkpoint.md", "checkpoint\n");
  expect(gitHasSourceWork(proj)).toBe(false);
});

// Negative (anti-theatre): a bolt branch is listed in `Bolt Refs` and DOES exist,
// but it carries only doc commits (no code). The probe references real branch
// content, so it must NOT hollow-pass - the verdict is false (REFUSE).
test("refuses when the listed bolt branch carries only doc commits", () => {
  initGitRepo();
  commitIntentBirth(["docs-only-bolt"]);
  unmergedBoltBranch("bolt/docs-only-bolt", {
    "amadeus/spaces/default/intents/notes.md": "just notes\n",
  });
  commitDoc("audit/checkpoint.md", "checkpoint\n");
  expect(gitHasSourceWork(proj)).toBe(false);
});

// Negative: a bolt branch WITH code exists but belongs to ANOTHER intent (not in
// THIS intent's Bolt Refs). The probe is intent-scoped, so it must be ignored and
// the verdict stays false (REFUSE) - a stale sibling branch cannot false-pass.
test("refuses when the only code is on an out-of-scope (unlisted) bolt branch", () => {
  initGitRepo();
  commitIntentBirth(); // empty Bolt Refs for THIS intent
  unmergedBoltBranch("bolt/other-intent", { "src/other/thing.ts": "export const o = 1;\n" });
  commitDoc("audit/checkpoint.md", "checkpoint\n");
  expect(gitHasSourceWork(proj)).toBe(false);
});

// Fallback edge: the last commit is doc-only AND the birth commit is
// undiscoverable (this intent's amadeus-state.md was never committed), with no
// code and no bolt branches. The scans find nothing and fall through to the
// definitive false (REFUSE).
test("refuses when the birth commit is undiscoverable and no code exists", () => {
  initGitRepo();
  writeFileAt("amadeus/root.md", "root\n");
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "init amadeus root doc"]);
  writeFileAt("amadeus/root2.md", "root2\n");
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "another doc-only commit"]);
  expect(gitHasSourceWork(proj)).toBe(false);
});
