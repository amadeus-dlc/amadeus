import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const WORKTREE_GC = join(ROOT, "scripts/worktree-gc.sh");
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]) {
  const result = Bun.spawnSync({ cmd: ["git", ...args], cwd, stderr: "pipe", stdout: "pipe" });
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  return result.stdout.toString().trim();
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "amadeus-worktree-gc-"));
  tempDirs.push(root);
  const repo = join(root, "repo");
  const worktrees = join(root, "worktrees");

  git(root, "init", "-q", "-b", "main", repo);
  git(repo, "config", "user.email", "worktree-gc@example.com");
  git(repo, "config", "user.name", "Worktree GC Test");
  writeFileSync(join(repo, "README.md"), "fixture\n");
  git(repo, "add", "README.md");
  git(repo, "commit", "-qm", "fixture");

  return { repo, worktrees };
}

function run(repo: string, ...args: string[]) {
  return Bun.spawnSync({
    cmd: ["bash", WORKTREE_GC, ...args],
    cwd: repo,
    stderr: "pipe",
    stdout: "pipe",
  });
}

describe("worktree-gc", () => {
  test("dry-run reports a clean merged worktree without deleting it", () => {
    const fixture = createFixture();
    const merged = join(fixture.worktrees, "merged");
    git(fixture.repo, "worktree", "add", "-q", "-b", "cleanup/merged", merged, "HEAD");

    const result = run(fixture.repo);

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain(`[dry-run] remove ${realpathSync(merged)}`);
    expect(existsSync(fixture.repo)).toBe(true);
    expect(existsSync(merged)).toBe(true);
  });

  test("--apply removes a clean merged worktree and keeps its branch", () => {
    const fixture = createFixture();
    const merged = join(fixture.worktrees, "merged");
    git(fixture.repo, "worktree", "add", "-q", "-b", "cleanup/merged", merged, "HEAD");

    const result = run(fixture.repo, "--apply");

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain(`[removed] ${realpathSync(fixture.worktrees)}/merged`);
    expect(existsSync(merged)).toBe(false);
    expect(git(fixture.repo, "show-ref", "--verify", "refs/heads/cleanup/merged")).not.toBe("");
  });

  test("--apply keeps a dirty worktree", () => {
    const fixture = createFixture();
    const dirty = join(fixture.worktrees, "dirty");
    git(fixture.repo, "worktree", "add", "-q", "-b", "cleanup/dirty", dirty, "HEAD");
    writeFileSync(join(dirty, "untracked.txt"), "do not delete\n");

    const result = run(fixture.repo, "--apply");

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain(`[kept: dirty] ${realpathSync(dirty)}`);
    expect(existsSync(dirty)).toBe(true);
  });

  test("--apply keeps a clean worktree with unmerged commits", () => {
    const fixture = createFixture();
    const unmerged = join(fixture.worktrees, "unmerged");
    git(fixture.repo, "worktree", "add", "-q", "-b", "cleanup/unmerged", unmerged, "HEAD");
    writeFileSync(join(unmerged, "feature.txt"), "unique work\n");
    git(unmerged, "add", "feature.txt");
    git(unmerged, "commit", "-qm", "unique work");

    const result = run(fixture.repo, "--apply");

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain(`[kept: unmerged] ${realpathSync(unmerged)}`);
    expect(existsSync(unmerged)).toBe(true);
  });

  test("--apply keeps a locked worktree", () => {
    const fixture = createFixture();
    const locked = join(fixture.worktrees, "locked");
    git(fixture.repo, "worktree", "add", "-q", "-b", "cleanup/locked", locked, "HEAD");
    git(fixture.repo, "worktree", "lock", "--reason", "still in use", locked);

    const result = run(fixture.repo, "--apply");

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain(`[kept: locked] ${realpathSync(locked)}`);
    expect(existsSync(locked)).toBe(true);
  });

  test("--apply keeps the main and current worktrees", () => {
    const fixture = createFixture();
    const current = join(fixture.worktrees, "current");
    git(fixture.repo, "worktree", "add", "-q", "-b", "cleanup/current", current, "HEAD");

    const result = run(current, "--apply");

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain(`[kept: main] ${realpathSync(fixture.repo)}`);
    expect(result.stdout.toString()).toContain(`[kept: current] ${realpathSync(current)}`);
    expect(existsSync(fixture.repo)).toBe(true);
    expect(existsSync(current)).toBe(true);
  });

  test("the default base is the main worktree HEAD, not the current feature HEAD", () => {
    const fixture = createFixture();
    const current = join(fixture.worktrees, "current");
    const featureCopy = join(fixture.worktrees, "feature-copy");
    git(fixture.repo, "worktree", "add", "-q", "-b", "feature/current", current, "HEAD");
    writeFileSync(join(current, "feature.txt"), "feature commit\n");
    git(current, "add", "feature.txt");
    git(current, "commit", "-qm", "feature commit");
    git(fixture.repo, "worktree", "add", "-q", "--detach", featureCopy, "feature/current");
    const featureCopyPath = realpathSync(featureCopy);

    const result = run(current, "--apply");

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain(`[kept: unmerged] ${featureCopyPath}`);
    expect(existsSync(featureCopy)).toBe(true);
  });

  test("--base overrides the merge target", () => {
    const fixture = createFixture();
    const current = join(fixture.worktrees, "current");
    const featureCopy = join(fixture.worktrees, "feature-copy");
    git(fixture.repo, "worktree", "add", "-q", "-b", "feature/current", current, "HEAD");
    writeFileSync(join(current, "feature.txt"), "feature commit\n");
    git(current, "add", "feature.txt");
    git(current, "commit", "-qm", "feature commit");
    git(fixture.repo, "worktree", "add", "-q", "--detach", featureCopy, "feature/current");
    const featureCopyPath = realpathSync(featureCopy);

    const result = run(current, "--apply", "--base", "feature/current");

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain(`[removed] ${featureCopyPath}`);
    expect(existsSync(featureCopy)).toBe(false);
  });

  test("dry-run reports stale worktree metadata without pruning it", () => {
    const fixture = createFixture();
    const stale = join(fixture.worktrees, "stale");
    git(fixture.repo, "worktree", "add", "-q", "-b", "cleanup/stale", stale, "HEAD");
    const stalePath = realpathSync(stale);
    rmSync(stale, { recursive: true, force: true });

    const result = run(fixture.repo);

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain(`[dry-run] prune ${stalePath}`);
    expect(git(fixture.repo, "worktree", "list", "--porcelain")).toContain(stalePath);
  });

  test("--apply prunes stale worktree metadata and keeps its branch", () => {
    const fixture = createFixture();
    const stale = join(fixture.worktrees, "stale");
    git(fixture.repo, "worktree", "add", "-q", "-b", "cleanup/stale", stale, "HEAD");
    const stalePath = realpathSync(stale);
    rmSync(stale, { recursive: true, force: true });

    const result = run(fixture.repo, "--apply");

    expect(result.exitCode, result.stderr.toString()).toBe(0);
    expect(result.stdout.toString()).toContain("Removing worktrees/stale:");
    expect(git(fixture.repo, "worktree", "list", "--porcelain")).not.toContain(stalePath);
    expect(git(fixture.repo, "show-ref", "--verify", "refs/heads/cleanup/stale")).not.toBe("");
  });
});
