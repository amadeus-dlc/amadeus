// covers: function:gitHasSourceWork
// size: medium
//
// t206 - intent-SCOPED source-work detection (issue #731 + PR #733 review).
//
// gitHasSourceWork is the git-aware half of the workspace_requires guard: it
// answers "did THIS intent produce real source work?" so a docs-only
// code-generation approve is refused while a real one passes. Before #731 it
// looked only at the working tree and the LAST commit (git diff HEAD~1 HEAD),
// which false-REFUSED the conductor record-branch pattern (code committed or
// merged earlier, then trailing checkpoint/delegate DOC commits).
//
// The fix widens the doc-only fallback to two INTENT-SCOPED probes (never a
// blanket post-birth diff, which would count a sibling intent's merged code -
// the PR #733 review counterexample):
//   (3) recordBranchSourceWork: a non-doc path in a NON-merge commit on HEAD's
//       first-parent chain since the intent birth commit - code the conductor
//       committed directly onto the record branch. Merge-arrived code is
//       excluded (it may be another intent's).
//   (4) bolt refs: a non-doc path on any of THIS intent's bolt branches (from
//       the first-class `Bolt Refs` field), resolved local + remote and via
//       merge-base so a squash-merged branch still counts. Remotes matter
//       because a merged bolt branch is pruned locally but survives on origin.
//
// Driven IN-PROCESS (not via a spawned tool) against real git fixtures so the
// new lines are measured by the coverage run, which does not instrument spawned
// children. Import mirrors t205 (dist/claude copy) so coverage remaps to core.

import { afterEach, beforeEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gitHasSourceWork, workspaceHasSourceFile } from "../../dist/claude/.claude/tools/amadeus-state.ts";
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
  // Pin the initial branch to `main` (env-independent): CI runners leave
  // init.defaultBranch at `master`, but the fixtures reference `main` explicitly
  // (checkout/merge). symbolic-ref renames the unborn HEAD on every git version.
  git(["init", "-q"]);
  git(["symbolic-ref", "HEAD", "refs/heads/main"]);
  git(["config", "user.email", "t206@example.com"]);
  git(["config", "user.name", "t206"]);
  git(["config", "commit.gpgsign", "false"]);
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

// Write this intent's record amadeus-state.md (optionally with a `Bolt Refs`
// list and `Project` issue refs) and commit ONLY the amadeus/ tree - the intent
// BIRTH commit (doc-only).
function commitIntentBirth(boltSlugs: string[] = [], projectIssues: number[] = []): void {
  const refs = boltSlugs.length === 0 ? "[empty list]" : `[${boltSlugs.join(", ")}]`;
  const project =
    projectIssues.length === 0
      ? ""
      : `- **Project**: GitHub issue ${projectIssues.map((n) => `#${n}`).join(" = ")}\n`;
  writeRecordFile("amadeus-state.md", `# State\n\n${project}- **Bolt Refs**: ${refs}\n`);
  git(["add", "amadeus"]);
  git(["commit", "-q", "-m", "birth: create intent record"]);
}

// Squash-merge a subject-tagged code commit onto `main`, then merge main into the
// current (record) branch - models a Bolt PR merged to main and pulled into the
// record branch. The code arrives via a merge commit (invisible to probe 3a); the
// squash commit's subject carries the issue reference probe 3c attributes on.
function mergeTaggedPrThroughMain(subject: string, path: string, body: string): void {
  const base = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  git(["checkout", "-q", "main"]);
  writeFileAt(path, body);
  git(["add", "-A"]);
  git(["commit", "-q", "-m", subject]);
  git(["checkout", "-q", base]);
  git(["merge", "-q", "--no-ff", "main", "-m", "Merge main into record"]);
}

// A doc-only checkpoint/delegate commit on the current (record) branch.
function commitDoc(name: string, body: string): void {
  writeRecordFile(name, body);
  git(["add", "amadeus"]);
  git(["commit", "-q", "-m", `doc: ${name}`]);
}

// A non-doc file committed DIRECTLY on the current (record) branch.
function commitDirectCode(path: string, body: string): void {
  writeFileAt(path, body);
  git(["add", "-A"]);
  git(["commit", "-q", "-m", `code: ${path}`]);
}

// Land a workspace (non-doc) file via a NON-fast-forward MERGE commit from a
// throwaway branch - models a sibling intent's PR pulled into the record branch.
function mergeCodeBranch(path: string): void {
  const base = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  git(["checkout", "-q", "-b", "sibling-intent"]);
  writeFileAt(path, "export const x = 1;\n");
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "sibling intent code"]);
  git(["checkout", "-q", base]);
  git(["merge", "-q", "--no-ff", "sibling-intent", "-m", "Merge sibling intent PR into record"]);
}

// Create an UNMERGED bolt branch off HEAD carrying `files`, then return to the
// original branch WITHOUT merging (the code lives only on the bolt branch).
function unmergedBoltBranch(branch: string, files: Record<string, string>): void {
  const base = git(["rev-parse", "--abbrev-ref", "HEAD"]);
  git(["checkout", "-q", "-b", branch]);
  for (const [path, body] of Object.entries(files)) writeFileAt(path, body);
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

// (3) Direct code committed onto the record branch before trailing doc commits.
// recordBranchSourceWork sees the non-merge commit on the first-parent chain.
test("recognises code committed directly on the record branch (probe 3)", () => {
  initGitRepo();
  commitIntentBirth();
  commitDirectCode("src/mine/thing.ts", "export const m = 1;\n");
  commitDoc("audit/checkpoint.md", "checkpoint\n");
  commitDoc("audit/delegate.md", "delegate approval\n");
  expect(gitHasSourceWork(proj)).toBe(true);
});

// (4) Code on an UNMERGED local bolt branch named in `Bolt Refs`. The bolt-ref
// probe finds it via merge-base with HEAD.
test("recognises code on an unmerged local bolt branch (probe 4)", () => {
  initGitRepo();
  commitIntentBirth(["dynamic-test-size"]);
  unmergedBoltBranch("bolt/dynamic-test-size", { "src/runner/size.ts": "export const s = 1;\n" });
  commitDoc("audit/checkpoint.md", "checkpoint\n");
  commitDoc("audit/delegate.md", "delegate approval\n");
  expect(gitHasSourceWork(proj)).toBe(true);
});

// (4, remote) The real #731 shape: the bolt PR was SQUASH-merged to main, main
// was merged into the record branch (so the code arrives via a merge commit,
// invisible to probe 3), the local bolt branch was pruned, and only the origin
// remote-tracking ref survives. The bolt-ref probe resolves the code through
// refs/remotes/origin and merge-base (the squash sha is not on the branch).
test("recognises code on a remote-only bolt ref after squash-to-main (probe 4)", () => {
  initGitRepo();
  // main baseline, then a record branch whose birth records the bolt slug.
  commitDirectCode("README.md", "root\n");
  git(["checkout", "-q", "-b", "record"]);
  commitIntentBirth(["dynamic-test-size"]);
  // bolt branch off main carries the real code.
  git(["checkout", "-q", "main"]);
  git(["checkout", "-q", "-b", "bolt/dynamic-test-size"]);
  writeFileAt("src/runner/size.ts", "export const s = 1;\n");
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "bolt code"]);
  const boltSha = git(["rev-parse", "HEAD"]);
  // squash-merge the bolt PR into main; origin retains the original branch.
  git(["checkout", "-q", "main"]);
  git(["merge", "-q", "--squash", "bolt/dynamic-test-size"]);
  git(["commit", "-q", "-m", "squash Bolt PR into main"]);
  git(["update-ref", "refs/remotes/origin/bolt/dynamic-test-size", boltSha]);
  git(["branch", "-q", "-D", "bolt/dynamic-test-size"]);
  // record branch merges main (code arrives via a merge commit), then doc commits.
  git(["checkout", "-q", "record"]);
  git(["merge", "-q", "--no-ff", "main", "-m", "Merge main into record"]);
  commitDoc("audit/checkpoint.md", "checkpoint\n");
  commitDoc("audit/delegate.md", "delegate approval\n");
  expect(gitHasSourceWork(proj)).toBe(true);
});

// (3c) Merged-PR attribution: this intent's `Project` declares issue #697; a Bolt
// PR "test #697: ... (#726)" was squash-merged to main and pulled into the record
// branch via a merge (invisible to probe 3a). The subject references the intent's
// issue and the commit touches src/, so probe 3c attributes it -> true.
test("recognises a merged Bolt PR by its Project issue reference (probe 3c)", () => {
  initGitRepo();
  commitDirectCode("README.md", "root\n");
  git(["checkout", "-q", "-b", "record"]);
  commitIntentBirth([], [697, 684, 688]);
  mergeTaggedPrThroughMain(
    "test #697: manifest roundtrip properties (B2) (#726)",
    "src/pbt/prop.ts",
    "export const p = 1;\n",
  );
  commitDoc("audit/checkpoint.md", "checkpoint\n");
  commitDoc("audit/delegate.md", "delegate approval\n");
  expect(gitHasSourceWork(proj)).toBe(true);
});

// (3c negative i) The record declares issue #697, but the only merged code is a
// SIBLING PR referencing a DIFFERENT issue (#999). The subject does not match this
// intent's issue, so it is not attributed -> false (REFUSE).
test("refuses when merged code references a different issue than the Project (probe 3c)", () => {
  initGitRepo();
  commitDirectCode("README.md", "root\n");
  git(["checkout", "-q", "-b", "record"]);
  commitIntentBirth([], [697]);
  mergeTaggedPrThroughMain(
    "fix #999: unrelated sibling work (#800)",
    "src/other/x.ts",
    "export const o = 1;\n",
  );
  commitDoc("audit/checkpoint.md", "checkpoint\n");
  expect(gitHasSourceWork(proj)).toBe(false);
});

// (3c negative ii) A merged commit references this intent's issue #697 in its
// subject but touches ONLY doc paths. Attribution requires a real non-doc change,
// so it does not hollow-pass -> false (REFUSE).
test("refuses when the issue-referencing commit touches only docs (probe 3c)", () => {
  initGitRepo();
  commitDirectCode("README.md", "root\n");
  git(["checkout", "-q", "-b", "record"]);
  commitIntentBirth([], [697]);
  mergeTaggedPrThroughMain(
    "docs #697: planning notes (#726)",
    "amadeus/spaces/default/intents/notes.md",
    "just notes\n",
  );
  commitDoc("audit/checkpoint.md", "checkpoint\n");
  expect(gitHasSourceWork(proj)).toBe(false);
});

// Counterexample (PR #733 review): a SIBLING intent's code was merged into the
// record branch after THIS intent's birth, but this intent produced nothing and
// its `Bolt Refs` is empty. Merge-arrived code is not attributable, so the
// verdict must be false (REFUSE). This is the regression the review caught.
test("refuses when only a sibling intent's code was merged after birth", () => {
  initGitRepo();
  commitIntentBirth(); // empty Bolt Refs; this intent produces no source
  mergeCodeBranch("src/other-intent/feature.ts");
  commitDoc("audit/checkpoint.md", "checkpoint\n");
  expect(gitHasSourceWork(proj)).toBe(false);
});

// Brownfield edge: src/ committed BEFORE the intent birth, only doc commits
// during the intent - no attributable work, so a definitive false (REFUSE).
test("refuses when src/ predates the intent birth (brownfield)", () => {
  initGitRepo();
  commitDirectCode("src/legacy/old.ts", "export const legacy = 1;\n");
  commitIntentBirth();
  commitDoc("audit/checkpoint.md", "checkpoint\n");
  expect(gitHasSourceWork(proj)).toBe(false);
});

// Negative (anti-theatre): a bolt branch listed in `Bolt Refs` DOES exist but
// carries only doc commits. The probe references real branch content, so it must
// not hollow-pass - the verdict is false (REFUSE).
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
// THIS intent's Bolt Refs). The probe is intent-scoped, so it is ignored and the
// verdict stays false (REFUSE) - a stale sibling branch cannot false-pass.
test("refuses when the only code is on an out-of-scope (unlisted) bolt branch", () => {
  initGitRepo();
  commitIntentBirth(); // empty Bolt Refs for THIS intent
  unmergedBoltBranch("bolt/other-intent", { "src/other/thing.ts": "export const o = 1;\n" });
  commitDoc("audit/checkpoint.md", "checkpoint\n");
  expect(gitHasSourceWork(proj)).toBe(false);
});

// Fallback edge: the last commit is doc-only AND the birth commit is
// undiscoverable (this intent's amadeus-state.md was never committed), with no
// code and no bolt branches. Both probes find nothing -> definitive false.
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

// Fail-safe: reading the state file must never throw. The birth commit is
// discoverable (amadeus-state.md was committed), but the working-tree copy has
// since been replaced by a DIRECTORY, so both readers (intentBoltSlugs and
// intentIssueRefs) hit readFileSync EISDIR and swallow it. The guard degrades to
// a safe refuse rather than crashing.
test("refuses (does not throw) when the state file is unreadable", () => {
  initGitRepo();
  commitIntentBirth(); // commits amadeus-state.md as a FILE -> birth discoverable
  const statePath = join(seededRecordDir(proj), "amadeus-state.md");
  rmSync(statePath);
  mkdirSync(statePath); // now a directory -> readFileSync throws EISDIR
  writeFileAt("amadeus/other.md", "other\n");
  git(["add", "-A"]); // stages the state-file deletion + a new doc
  git(["commit", "-q", "-m", "doc: replace state file"]);
  expect(gitHasSourceWork(proj)).toBe(false);
});

// --- workspaceHasSourceFile: the FS-fallback half of the same guard ------------
// (in-process for the same coverage reason as gitHasSourceWork above)

test("workspaceHasSourceFile: harness/doc dirs alone are not source work", () => {
  const dir = mkdtempSync(join(tmpdir(), "t206-fsprobe-"));
  try {
    mkdirSync(join(dir, "amadeus", "spaces"), { recursive: true });
    writeFileSync(join(dir, "amadeus", "spaces", "notes.md"), "doc\n", "utf-8");
    mkdirSync(join(dir, ".claude"), { recursive: true });
    expect(workspaceHasSourceFile(dir)).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("workspaceHasSourceFile: a root file or a nested src file counts; missing dir is false", () => {
  const dir = mkdtempSync(join(tmpdir(), "t206-fsprobe-"));
  try {
    expect(workspaceHasSourceFile(join(dir, "does-not-exist"))).toBe(false);
    mkdirSync(join(dir, "src"), { recursive: true });
    expect(workspaceHasSourceFile(dir)).toBe(false); // empty src/ only
    writeFileSync(join(dir, "src", "index.ts"), "export {};\n", "utf-8");
    expect(workspaceHasSourceFile(dir)).toBe(true); // nested source file
    rmSync(join(dir, "src"), { recursive: true, force: true });
    writeFileSync(join(dir, "README.txt"), "root\n", "utf-8");
    expect(workspaceHasSourceFile(dir)).toBe(true); // file at workspace root
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
