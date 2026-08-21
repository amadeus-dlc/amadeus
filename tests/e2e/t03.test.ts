// covers: subcommand:amadeus-worktree:merge
//
// CLI-contract port of tests/e2e/t03-worktree-merge.sh (TAP plan 13),
// mechanism = cli. The .sh drives `amadeus-worktree.ts merge` — the subcommand
// that runs a REAL `git merge --squash` (and rebase) after an audit-first
// WORKTREE_MERGED emit, then either cleans up the worktree (success) or
// preserves it (conflict). The covers UNIT credited is
// subcommand:amadeus-worktree:merge.
//
// MECHANISM: this is a .cli file, so every observable is taken at the PROCESS
// boundary — SPAWN the real binary via spawnSync (BUN + the tool .ts path) and
// assert on res.status / res.stdout / res.stderr plus the real git side effects
// (worktree directory removed-or-preserved). An in-process twin would lose the
// stdout-JSON contract ('"emitted":"WORKTREE_MERGED"', the conflict envelope)
// and the real git-merge / git-worktree-remove side effects the .sh relies on.
//
// FIXTURE: amadeus-worktree.ts asserts it runs from the main checkout
// (resolveWorktreeAnchor, amadeus-worktree.ts) and runs real git, so each
// case needs an ACTUAL git repo on `main` with one commit plus an amadeus-docs/
// dir. setupWorktreeFixture (tests/harness/fixtures.ts) builds exactly that;
// the tool is spawned with cwd = the fixture so its HEAD / rev-parse resolves
// to the main checkout (the merge subcommand's defensive HEAD check requires
// the cwd to have <target> checked out). cleanupWorktreeFixture prunes child
// worktrees then rm -rf's the parent. Nothing is written under tests/fixtures/**.
//
// The .sh's `EDITOR=false` guard (so a stray `git commit` without --no-edit
// fails loudly instead of hanging) is reproduced via env on every spawn.
//
// PARITY NOTES — every .sh assertion has an equal-or-stronger counterpart:
//   .sh T1  squash merge exits 0                              -> Test "1-3" (same)
//   .sh T2  stdout contains '"emitted":"WORKTREE_MERGED"'     -> Test "1-3" (same)
//   .sh T3  worktree dir gone after successful squash merge   -> Test "1-3" (same)
//   .sh T4  merge with wrong cwd HEAD exits non-zero          -> Test "4-5" (same)
//   .sh T5  error names actual branch                         -> Test "4-5" (same:
//           "expected branch main, found other-branch")
//   .sh T6  conflicted merge exits non-zero                   -> Test "6-9" (same)
//   .sh T7  conflict envelope '"status":"conflict"'           -> Test "6-9" (same)
//   .sh T8  conflict envelope '"detail":"Merge produced ...'  -> Test "6-9" (same)
//   .sh T9  conflict_files == ["conflict.txt"]                -> Test "6-9" (same:
//           the exact JSON fragment '"conflict_files":["conflict.txt"]')
//   .sh T10 worktree preserved on conflict (not removed)      -> Test "6-9" (same)
//   .sh T11 rebase-without-remote exits non-zero              -> Test "10-12" (same)
//   .sh T12 error names missing remote                        -> Test "10-12" (same:
//           "rebase strategy requires a remote")
//   .sh T13 worktree preserved after pre-audit rebase reject  -> Test "10-12" (same)
//
// 13 .sh asserts -> 13 expect()s across 4 test() cases (grouped where the .sh
// shared one fixture). STRONGER: the success case also asserts the audit.md
// recorded a WORKTREE_MERGED row for the slug (the audit-first emit the JSON
// merely claims); the rebase-rejection case also asserts NO WORKTREE_MERGED
// audit row landed (the .sh's "pre-audit" intent, which it only documented in
// comments).
//
// REGRESSION #3197: merge must reject a dirty source worktree before either
// audit emission or target-checkout mutation, preserving the source worktree.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { auditRowsFrom } from "../harness/audit-records.ts";
import {
  AMADEUS_SRC,
  cleanupWorktreeFixture,
  seededAuditDir,
  seededStateFile,
  setupWorktreeFixture,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const TOOL = join(AMADEUS_SRC, "tools", "amadeus-worktree.ts");

// Force a non-interactive editor so any unexpected `git commit` without
// `--no-edit` fails loudly instead of hanging (mirrors the .sh's EDITOR=false).
const ENV = {
  ...process.env,
  EDITOR: "false",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@x",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@x",
};

const fixtures: string[] = [];
afterAll(() => {
  for (const f of fixtures) cleanupWorktreeFixture(f);
});

/** Fresh git-repo fixture on `main` with the per-intent workspace shell. Seed a
 *  state file into the default record so the active-intent cursor resolves (the
 *  fixture's record is stateless; without amadeus-state.md the cursor is rejected
 *  and the WORKTREE_MERGED audit lands at the bare space root, not the record).
 *  Registered for cleanup. */
function freshFixture(): string {
  const p = setupWorktreeFixture();
  fixtures.push(p);
  writeFileSync(seededStateFile(p), "- **Current Stage**: code-generation\n", "utf-8");
  return p;
}

interface CliResult {
  status: number;
  out: string; // combined stdout+stderr (mirrors the .sh's 2>&1)
  stdout: string;
}

/** Spawn `bun amadeus-worktree.ts <sub> ... --project-dir <p>` from cwd=<p>. */
function tool(
  p: string,
  args: string[],
  envOverrides: NodeJS.ProcessEnv = {},
): CliResult {
  const res = spawnSync(BUN, [TOOL, ...args, "--project-dir", p], {
    cwd: p,
    encoding: "utf-8",
    env: { ...ENV, ...envOverrides },
  });
  const stdout = res.stdout ?? "";
  return { status: res.status ?? -1, out: `${stdout}${res.stderr ?? ""}`, stdout };
}

/** Plain git invocation in a given cwd (for inline fixture setup). */
function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { cwd, encoding: "utf-8", env: ENV });
  if (r.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${r.stderr?.trim() || r.stdout?.trim() || `exit ${r.status}`}`,
    );
  }
}

/** Git stdout for assertions, failing loudly when fixture setup is invalid. */
function gitOutput(cwd: string, args: string[]): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf-8", env: ENV });
  if (r.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${r.stderr?.trim() || r.stdout?.trim() || `exit ${r.status}`}`,
    );
  }
  return (r.stdout ?? "").trim();
}

const wtPath = (p: string, slug: string): string =>
  join(p, ".amadeus", "worktrees", `bolt-${slug}`);

function gitStatus(cwd: string, args: string[]): number {
  return spawnSync("git", args, { cwd, encoding: "utf-8", env: ENV }).status ?? -1;
}

function writeFixtureFile(root: string, relativePath: string, contents: string): void {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

/**
 * Seed .gitignore.
 *
 * A rule that names a DIRECTORY (`/dist/`) and a rule that names its CONTENTS
 * (`/dist/**`) both hide the same files, but they do NOT produce the same
 * `git status --ignored=matching` output, and the difference moved between git
 * releases. Measured 2026-08-21 on the identical tree:
 *
 *   rule        git 2.43.0 / 2.47.3            git 2.55.0
 *   /dist/**    `!! dist/generated.js`         `!! dist/`
 *   /dist/      `!! dist/`                     `!! dist/`
 *
 * Only the newer git collapses a directory whose CONTENTS are ignored; the
 * older one collapses only when the directory ITSELF is ignored. The merge
 * subcommand reads that trailing slash as "generated-output territory"
 * (classifySourcePaths), so a contents-form rule made these cases pass on a
 * developer's git and fail on CI's — the whole of #3391 class 4.
 *
 * Cases that mean "this whole directory is build output" therefore say so with
 * a directory rule. Cases about a single ignored FILE are unaffected and keep
 * their own rule shape.
 */
function commitIgnoreRules(p: string, rules: readonly string[]): void {
  writeFixtureFile(p, ".gitignore", `${rules.join("\n")}\n`);
  git(p, ["add", "--", ".gitignore"]);
  git(p, [
    "-c", "user.email=t@x",
    "-c", "user.name=t",
    "commit", "-qm", "seed generated output ignores", "--", ".gitignore",
  ]);
}

function commitWorkerSource(
  p: string,
  slug: string,
  relativePath = "worker-source.txt",
): string {
  const wt = wtPath(p, slug);
  writeFixtureFile(wt, relativePath, "committed worker source\n");
  git(wt, ["add", "--", relativePath]);
  git(wt, [
    "-c", "user.email=t@x",
    "-c", "user.name=t",
    "commit", "-qm", "add worker source", "--", relativePath,
  ]);
  const committed = gitOutput(wt, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]);
  if (committed !== relativePath) {
    throw new Error(`worker commit must contain only ${relativePath}; got ${committed || "<empty>"}`);
  }
  return wt;
}

function gitTraceArgv(tracePath: string): string[][] {
  return readFileSync(tracePath, "utf-8")
    .split("\n")
    .flatMap((line): string[][] => {
      if (line.length === 0) return [];
      const event = JSON.parse(line) as { argv?: unknown };
      const argv = event.argv;
      if (!Array.isArray(argv) || !argv.every((arg) => typeof arg === "string")) return [];
      return [argv as string[]];
    });
}

/** Concatenate every audit shard (audit/*.jsonl) for the seeded record. */
function readAudit(p: string): string {
  const dir = seededAuditDir(p);
  let names: string[];
  try {
    names = readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort();
  } catch {
    return "";
  }
  return names.map((n) => readFileSync(join(dir, n), "utf-8")).join("\n");
}

/** True if the audit shards carry a WORKTREE_MERGED record for the given slug.
 *  Record-scoped: the event and the slug must ride on the SAME ledger line. */
function hasMergedAudit(p: string, slug: string): boolean {
  return auditRowsFrom(readAudit(p)).some(
    (r) => r.event === "WORKTREE_MERGED" && r.fields?.["Bolt slug"] === slug,
  );
}

describe("t03 amadeus-worktree merge (migrated from t03-worktree-merge.sh, plan 13)", () => {
  test("1-3: squash merge happy path — exit 0, emits WORKTREE_MERGED, non-force cleanup", () => {
    const p = freshFixture();
    const tracePath = join(p, "git-trace2-event.jsonl");
    expect(tool(p, ["create", "--slug", "demo", "--base", "main"]).status).toBe(0);

    // Make a commit in the worktree so the squash has something to merge.
    const wt = wtPath(p, "demo");
    writeFileSync(join(wt, "feature.txt"), "feature\n");
    git(wt, ["add", "feature.txt"]);
    git(wt, ["-c", "user.email=t@x", "-c", "user.name=t", "commit", "-qm", "add feature"]);

    const r = tool(p, [
      "merge",
      "--slug", "demo",
      "--target", "main",
      "--strategy", "squash",
      "--message", "Bolt demo",
    ], { GIT_TRACE2_EVENT: tracePath });

    expect(r.status).toBe(0); // T1
    expect(r.out).toContain('"emitted":"WORKTREE_MERGED"'); // T2
    expect(existsSync(wt)).toBe(false); // T3: worktree gone after success
    // STRONGER: the audit-first WORKTREE_MERGED emit actually landed on disk.
    expect(hasMergedAudit(p, "demo")).toBe(true);
    const worktreeRemoveCalls = gitTraceArgv(tracePath).filter(
      (argv) => argv.includes("worktree") && argv.includes("remove"),
    );
    expect(worktreeRemoveCalls.length).toBeGreaterThan(0);
    expect(worktreeRemoveCalls.some((argv) => argv.includes("--force"))).toBe(false);
  }, scaleTestTime(30000));

  test("issue #3197: exclusive ignored build outputs are cleaned by exact path before non-force merge", () => {
    const p = freshFixture();
    const outputRoots = ["dist", "node_modules", "packages/setup/dist"];
    const outputFiles = [
      "dist/generated.js",
      "node_modules/example/generated.js",
      "packages/setup/dist/cli.js",
    ];
    commitIgnoreRules(p, ["/dist/", "/node_modules/", "/packages/setup/dist/"]);
    expect(tool(p, ["create", "--slug", "generated-only", "--base", "main"]).status).toBe(0);
    const wt = commitWorkerSource(p, "generated-only");
    for (const output of outputFiles) {
      writeFixtureFile(wt, output, `generated ${output}\n`);
      expect(gitOutput(wt, ["check-ignore", "--", output])).toBe(output);
    }
    const targetHeadBefore = gitOutput(p, ["rev-parse", "HEAD"]);
    const tracePath = join(p, "generated-clean-trace.jsonl");

    const r = tool(p, [
      "merge",
      "--slug", "generated-only",
      "--target", "main",
      "--strategy", "squash",
      "--message", "Bolt generated-only",
    ], { GIT_TRACE2_EVENT: tracePath });

    expect(r.status).toBe(0);
    expect(gitOutput(p, ["rev-parse", "HEAD"])).not.toBe(targetHeadBefore);
    expect(gitOutput(p, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"])).toBe(
      "worker-source.txt",
    );
    expect(readFileSync(join(p, "worker-source.txt"), "utf-8")).toBe(
      "committed worker source\n",
    );
    for (const output of outputFiles) expect(existsSync(join(p, output))).toBe(false);
    expect(existsSync(wt)).toBe(false);
    expect(gitStatus(p, ["rev-parse", "--verify", "refs/heads/bolt-generated-only"])).not.toBe(0);
    expect(hasMergedAudit(p, "generated-only")).toBe(true);

    const traceArgv = gitTraceArgv(tracePath);
    const cleanPathTails = traceArgv
      .filter((argv) => argv.includes("clean"))
      .flatMap((argv) => {
        const separator = argv.indexOf("--");
        return separator < 0 ? [] : [argv.slice(separator + 1)];
      });
    const expectedRoots = [...outputRoots].sort();
    expect(
      cleanPathTails.some((paths) =>
        paths.map((path) => path.replace(/\/$/, "")).sort().join("\0") === expectedRoots.join("\0")
      ),
    ).toBe(true);
    const forbiddenBroadRoots = new Set([
      ".",
      ".agents",
      ".claude",
      ".codex",
      ".cursor",
      ".kimi-code",
      ".opencode",
      ".pi",
    ]);
    expect(
      cleanPathTails.flat().some((path) => forbiddenBroadRoots.has(path.replace(/\/$/, ""))),
    ).toBe(false);
    expect(cleanPathTails.flat().some((path) => /[*?[\]]/.test(path))).toBe(false);
    const removeCalls = traceArgv.filter(
      (argv) => argv.includes("worktree") && argv.includes("remove"),
    );
    expect(removeCalls.length).toBeGreaterThan(0);
    expect(removeCalls.some((argv) => argv.includes("--force"))).toBe(false);
  }, scaleTestTime(30000));

  test("issue #3197: unknown ignored source blocks cleanup of otherwise-known output", () => {
    const p = freshFixture();
    commitIgnoreRules(p, ["/dist/", "*.draft"]);
    expect(tool(p, ["create", "--slug", "generated-unknown", "--base", "main"]).status).toBe(0);
    const wt = commitWorkerSource(p, "generated-unknown");
    writeFixtureFile(wt, "dist/generated.js", "known generated output\n");
    writeFixtureFile(wt, "notes.draft", "unknown ignored source\n");
    expect(gitOutput(wt, ["check-ignore", "--", "dist/generated.js"])).toBe(
      "dist/generated.js",
    );
    expect(gitOutput(wt, ["check-ignore", "--", "notes.draft"])).toBe("notes.draft");
    const targetHeadBefore = gitOutput(p, ["rev-parse", "HEAD"]);
    const targetStatusBefore = gitOutput(p, ["status", "--porcelain"]);

    const r = tool(p, [
      "merge",
      "--slug", "generated-unknown",
      "--target", "main",
      "--strategy", "squash",
      "--message", "Bolt generated-unknown",
    ]);

    expect(r.status).not.toBe(0);
    expect(r.out).toContain("notes.draft");
    expect(r.out).not.toContain("dist/");
    expect(gitOutput(p, ["rev-parse", "HEAD"])).toBe(targetHeadBefore);
    expect(gitOutput(p, ["status", "--porcelain"])).toBe(targetStatusBefore);
    expect(existsSync(join(p, "worker-source.txt"))).toBe(false);
    expect(hasMergedAudit(p, "generated-unknown")).toBe(false);
    expect(existsSync(wt)).toBe(true);
    expect(gitStatus(p, ["rev-parse", "--verify", "refs/heads/bolt-generated-unknown"])).toBe(0);
    expect(existsSync(join(wt, "dist", "generated.js"))).toBe(true);
    expect(readFileSync(join(wt, "notes.draft"), "utf-8")).toBe("unknown ignored source\n");
  }, scaleTestTime(30000));

  test("issue #3197: preserved self-install leaf blocks cleanup beside generated leaf", () => {
    const p = freshFixture();
    commitIgnoreRules(p, [
      "/.claude/tools/amadeus-state.ts",
      "/.claude/settings.local.json",
    ]);
    expect(tool(p, ["create", "--slug", "self-install-preserved", "--base", "main"]).status).toBe(0);
    const wt = commitWorkerSource(p, "self-install-preserved");
    const generatedLeaf = ".claude/tools/amadeus-state.ts";
    const preservedLeaf = ".claude/settings.local.json";
    writeFixtureFile(wt, generatedLeaf, "generated tool\n");
    writeFixtureFile(wt, preservedLeaf, '{"local":true}\n');
    expect(gitOutput(wt, ["check-ignore", "--", generatedLeaf])).toBe(generatedLeaf);
    expect(gitOutput(wt, ["check-ignore", "--", preservedLeaf])).toBe(preservedLeaf);
    const targetHeadBefore = gitOutput(p, ["rev-parse", "HEAD"]);
    const targetStatusBefore = gitOutput(p, ["status", "--porcelain"]);

    const r = tool(p, [
      "merge",
      "--slug", "self-install-preserved",
      "--target", "main",
      "--strategy", "squash",
      "--message", "Bolt self-install-preserved",
    ]);

    expect(r.status).not.toBe(0);
    expect(r.out).toContain(preservedLeaf);
    expect(r.out).not.toContain(generatedLeaf);
    expect(gitOutput(p, ["rev-parse", "HEAD"])).toBe(targetHeadBefore);
    expect(gitOutput(p, ["status", "--porcelain"])).toBe(targetStatusBefore);
    expect(hasMergedAudit(p, "self-install-preserved")).toBe(false);
    expect(existsSync(wt)).toBe(true);
    expect(gitStatus(p, ["rev-parse", "--verify", "refs/heads/bolt-self-install-preserved"])).toBe(0);
    expect(readFileSync(join(wt, generatedLeaf), "utf-8")).toBe("generated tool\n");
    expect(readFileSync(join(wt, preservedLeaf), "utf-8")).toBe('{"local":true}\n');
  }, scaleTestTime(30000));

  test("issue #3197: force-added known output is rejected and remains staged", () => {
    const p = freshFixture();
    commitIgnoreRules(p, ["/dist/**"]);
    expect(tool(p, ["create", "--slug", "generated-staged", "--base", "main"]).status).toBe(0);
    const wt = commitWorkerSource(p, "generated-staged");
    const stagedOutput = "dist/generated.js";
    writeFixtureFile(wt, stagedOutput, "force-added generated output\n");
    git(wt, ["add", "-f", "--", stagedOutput]);
    const targetHeadBefore = gitOutput(p, ["rev-parse", "HEAD"]);
    const targetStatusBefore = gitOutput(p, ["status", "--porcelain"]);

    const r = tool(p, [
      "merge",
      "--slug", "generated-staged",
      "--target", "main",
      "--strategy", "squash",
      "--message", "Bolt generated-staged",
    ]);

    expect(r.status).not.toBe(0);
    expect(r.out).toContain(stagedOutput);
    expect(gitOutput(p, ["rev-parse", "HEAD"])).toBe(targetHeadBefore);
    expect(gitOutput(p, ["status", "--porcelain"])).toBe(targetStatusBefore);
    expect(hasMergedAudit(p, "generated-staged")).toBe(false);
    expect(existsSync(wt)).toBe(true);
    expect(gitStatus(p, ["rev-parse", "--verify", "refs/heads/bolt-generated-staged"])).toBe(0);
    expect(gitOutput(wt, ["diff", "--cached", "--name-only", "--", stagedOutput])).toBe(
      stagedOutput,
    );
    expect(readFileSync(join(wt, stagedOutput), "utf-8")).toBe(
      "force-added generated output\n",
    );
  }, scaleTestTime(30000));

  test("issue #3197: dirty source worktree is rejected before audit or target Git mutation", () => {
    const p = freshFixture();
    expect(tool(p, ["create", "--slug", "dirty", "--base", "main"]).status).toBe(0);

    const wt = wtPath(p, "dirty");
    writeFileSync(join(wt, "uncommitted.txt"), "worker draft\n");
    const targetHeadBefore = gitOutput(p, ["rev-parse", "HEAD"]);
    const targetStatusBefore = gitOutput(p, ["status", "--porcelain"]);

    const r = tool(p, [
      "merge",
      "--slug", "dirty",
      "--target", "main",
      "--strategy", "squash",
      "--message", "Bolt dirty",
    ]);

    expect(r.status).not.toBe(0);
    expect(gitOutput(p, ["rev-parse", "HEAD"])).toBe(targetHeadBefore);
    expect(gitOutput(p, ["status", "--porcelain"])).toBe(targetStatusBefore);
    expect(hasMergedAudit(p, "dirty")).toBe(false);
    expect(existsSync(wt)).toBe(true);
    expect(gitOutput(wt, ["status", "--porcelain", "--", "uncommitted.txt"])).toBe(
      "?? uncommitted.txt",
    );
  }, scaleTestTime(30000));

  test("issue #3197: staged target changes are rejected before audit or source contamination", () => {
    const p = freshFixture();
    writeFileSync(join(p, "target-staged.txt"), "committed target\n");
    git(p, ["add", "--", "target-staged.txt"]);
    git(p, [
      "-c", "user.email=t@x",
      "-c", "user.name=t",
      "commit", "-qm", "seed tracked target", "--", "target-staged.txt",
    ]);
    expect(tool(p, ["create", "--slug", "target-staged", "--base", "main"]).status).toBe(0);

    const wt = wtPath(p, "target-staged");
    writeFileSync(join(wt, "worker-source.txt"), "committed worker source\n");
    git(wt, ["add", "--", "worker-source.txt"]);
    git(wt, [
      "-c", "user.email=t@x",
      "-c", "user.name=t",
      "commit", "-qm", "add worker source", "--", "worker-source.txt",
    ]);

    writeFileSync(join(p, "target-staged.txt"), "staged target change\n");
    git(p, ["add", "--", "target-staged.txt"]);
    const targetHeadBefore = gitOutput(p, ["rev-parse", "HEAD"]);
    const targetStatusBefore = gitOutput(p, ["status", "--porcelain"]);
    expect(gitOutput(p, ["diff", "--cached", "--name-only", "--", "target-staged.txt"])).toBe(
      "target-staged.txt",
    );

    const r = tool(p, [
      "merge",
      "--slug", "target-staged",
      "--target", "main",
      "--strategy", "squash",
      "--message", "Bolt target-staged",
    ]);

    expect(r.status).not.toBe(0);
    expect(gitOutput(p, ["rev-parse", "HEAD"])).toBe(targetHeadBefore);
    expect(gitOutput(p, ["status", "--porcelain"])).toBe(targetStatusBefore);
    expect(existsSync(join(p, "worker-source.txt"))).toBe(false);
    expect(hasMergedAudit(p, "target-staged")).toBe(false);
    expect(existsSync(wt)).toBe(true);
    expect(
      gitOutput(p, ["rev-parse", "--verify", "refs/heads/bolt-target-staged"]).length,
    ).toBeGreaterThan(0);
    expect(gitOutput(p, ["diff", "--cached", "--name-only", "--", "target-staged.txt"])).toBe(
      "target-staged.txt",
    );
    expect(gitOutput(p, ["show", "HEAD:target-staged.txt"])).toBe("committed target");
    expect(readFileSync(join(p, "target-staged.txt"), "utf-8")).toBe("staged target change\n");
  }, scaleTestTime(30000));

  test("issue #3197: ignored uncommitted source is rejected pre-audit and retained", () => {
    const p = freshFixture();
    writeFileSync(join(p, ".gitignore"), "*.draft\n");
    git(p, ["add", "--", ".gitignore"]);
    git(p, [
      "-c", "user.email=t@x",
      "-c", "user.name=t",
      "commit", "-qm", "ignore worker drafts", "--", ".gitignore",
    ]);
    expect(tool(p, ["create", "--slug", "ignored-dirty", "--base", "main"]).status).toBe(0);

    const wt = wtPath(p, "ignored-dirty");
    writeFileSync(join(wt, "feature.txt"), "committed source\n");
    git(wt, ["add", "--", "feature.txt"]);
    git(wt, [
      "-c", "user.email=t@x",
      "-c", "user.name=t",
      "commit", "-qm", "add committed source", "--", "feature.txt",
    ]);
    writeFileSync(join(wt, "notes.draft"), "uncommitted ignored source\n");
    expect(gitOutput(wt, ["check-ignore", "--", "notes.draft"])).toBe("notes.draft");
    expect(gitOutput(wt, ["status", "--porcelain", "--", "notes.draft"])).toBe("");

    const targetHeadBefore = gitOutput(p, ["rev-parse", "HEAD"]);
    const targetStatusBefore = gitOutput(p, ["status", "--porcelain"]);
    const r = tool(p, [
      "merge",
      "--slug", "ignored-dirty",
      "--target", "main",
      "--strategy", "squash",
      "--message", "Bolt ignored-dirty",
    ]);

    expect(r.status).not.toBe(0);
    expect(gitOutput(p, ["rev-parse", "HEAD"])).toBe(targetHeadBefore);
    expect(gitOutput(p, ["status", "--porcelain"])).toBe(targetStatusBefore);
    expect(hasMergedAudit(p, "ignored-dirty")).toBe(false);
    expect(existsSync(wt)).toBe(true);
    expect(readFileSync(join(wt, "notes.draft"), "utf-8")).toBe(
      "uncommitted ignored source\n",
    );
  }, scaleTestTime(30000));

  test("4-5: defensive HEAD check fails when cwd is on a different branch", () => {
    const p = freshFixture();
    expect(tool(p, ["create", "--slug", "demo", "--base", "main"]).status).toBe(0);
    git(p, ["-c", "user.email=t@x", "-c", "user.name=t", "checkout", "-qb", "other-branch"]);

    const r = tool(p, ["merge", "--slug", "demo", "--target", "main", "--strategy", "squash"]);

    expect(r.status).not.toBe(0); // T4
    expect(r.out).toContain("expected branch main, found other-branch"); // T5
  }, scaleTestTime(30000));

  test("6-9: conflict envelope shape — non-zero, status/detail/conflict_files, worktree preserved", () => {
    const p = freshFixture();

    // Seed main with content the bolt will conflict against.
    writeFileSync(join(p, "conflict.txt"), "main version\n");
    git(p, ["add", "conflict.txt"]);
    git(p, ["-c", "user.email=t@x", "-c", "user.name=t", "commit", "-qm", "main writes conflict.txt"]);

    expect(tool(p, ["create", "--slug", "demo", "--base", "main"]).status).toBe(0);

    const wt = wtPath(p, "demo");
    writeFileSync(join(wt, "conflict.txt"), "bolt version\n");
    git(wt, ["add", "conflict.txt"]);
    git(wt, ["-c", "user.email=t@x", "-c", "user.name=t", "commit", "-qm", "bolt writes conflict.txt"]);

    // Now mutate main again so squash produces a conflict.
    writeFileSync(join(p, "conflict.txt"), "main version 2\n");
    git(p, ["add", "conflict.txt"]);
    git(p, ["-c", "user.email=t@x", "-c", "user.name=t", "commit", "-qm", "main writes conflict.txt v2"]);

    const r = tool(p, ["merge", "--slug", "demo", "--target", "main", "--strategy", "squash"]);

    expect(r.status).not.toBe(0); // T6
    expect(r.out).toContain('"status":"conflict"'); // T7
    expect(r.out).toContain('"detail":"Merge produced conflicts'); // T8
    // T9: conflict_files lists exactly the conflicting path (pins both
    // non-empty AND the right path — listConflictFiles uses
    // `git diff --name-only --diff-filter=U`, deterministic).
    expect(r.out).toContain('"conflict_files":["conflict.txt"]');
    expect(existsSync(wt)).toBe(true); // T10: worktree preserved on conflict
  }, scaleTestTime(30000));

  test("10-12: rebase strategy rejected pre-audit when no remote — non-zero, names remote, worktree preserved", () => {
    const p = freshFixture();
    expect(tool(p, ["create", "--slug", "demo", "--base", "main"]).status).toBe(0);

    const r = tool(p, ["merge", "--slug", "demo", "--target", "main", "--strategy", "rebase"]);

    expect(r.status).not.toBe(0); // T11
    expect(r.out).toContain("rebase strategy requires a remote"); // T12
    // T13: worktree preserved — rebase failed pre-audit, never started.
    expect(existsSync(wtPath(p, "demo"))).toBe(true);
    // STRONGER: pre-audit rejection means NO WORKTREE_MERGED row landed.
    expect(hasMergedAudit(p, "demo")).toBe(false);
  }, scaleTestTime(30000));
});
