// covers: harness-instrument:amadeus-leader-sync
//
// t245 — filesystem/process boundary coverage for leader-owned record sync.
// Uses mkdtemp workspaces and injected Git/Gh ports; production code contains
// no fixture mode.

import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import * as realOs from "node:os";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  analyzeOwnedContents,
  collectDiff,
  type CommandResult,
  type CommandRunner,
  checkExclusions,
  handleCreate,
  handlePlan,
  handleStatus,
  main,
  nextBranchName,
  parseNumstat,
  readCloneId,
  reportPassed,
  resolveOwnedSet,
  restoreMemoryLayer,
  selfCheck,
  shardBasename,
  spawnGh,
  spawnGit,
  syncStatus,
  SYNC_BRANCH_RESERVATION_ATTEMPTS,
  SYNC_SPLIT_FILE_LIMIT,
} from "../../scripts/amadeus-leader-sync";

const roots: string[] = [];
const CLONE = "abc123";
const SHARD = shardBasename(realOs.hostname(), CLONE);
const ELECTION = "amadeus/spaces/default/elections/E-NEW/definition.json";
const AUDIT = `amadeus/spaces/default/intents/260720-sync/audit/${SHARD}`;

afterEach(() => {
  mock.restore();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), "leader-sync-t245-"));
  roots.push(root);
  mkdirSync(join(root, "amadeus"), { recursive: true });
  writeFileSync(join(root, "amadeus", ".amadeus-clone-id"), `${CLONE}\n`);
  mkdirSync(join(root, "amadeus", "spaces", "default", "elections", "E-NEW"), { recursive: true });
  writeFileSync(join(root, ELECTION), '{"electionId":"E-NEW"}\n');
  mkdirSync(join(root, "amadeus", "spaces", "default", "intents", "260720-sync", "audit"), { recursive: true });
  writeFileSync(join(root, AUDIT), "old audit\nnew audit\n");
  return root;
}

function fakeRunner(
  handler: (args: string[], cwd?: string) => CommandResult,
): { run: CommandRunner; calls: Array<{ args: string[]; cwd?: string }> } {
  const calls: Array<{ args: string[]; cwd?: string }> = [];
  return {
    calls,
    run: (args, cwd) => {
      calls.push({ args, cwd });
      return handler(args, cwd);
    },
  };
}

function ok(stdout = ""): CommandResult {
  return { kind: "ok", stdout };
}

function gitStdout(args: string[], cwd: string): string {
  const result = spawnGit(args, cwd);
  expect(result.kind).toBe("ok");
  if (result.kind === "error") throw new Error(result.stderr);
  return result.stdout;
}

function createFlowGitHandler(args: string[]): CommandResult {
  const command = args.slice(0, 3).join(" ");
  if (command === "diff --name-status origin/main") {
    return ok(`A\t${ELECTION}\nM\t${AUDIT}\n`);
  }
  if (command === "diff --name-status origin/main...HEAD") {
    return ok(`A\t${ELECTION}\nM\t${AUDIT}\n`);
  }
  if (args[0] === "show" && args[1] === `origin/main:${AUDIT}`) return ok("old audit\n");
  if (args[0] === "ls-files") return ok("");
  return ok();
}

function seedCreateWorktree(args: string[]): void {
  if (args.slice(0, 3).join(" ") !== "worktree add -b") return;
  const worktree = args[4] ?? "";
  mkdirSync(join(worktree, "amadeus", "spaces", "default", "memory"), { recursive: true });
  writeFileSync(join(worktree, "amadeus", "spaces", "default", "memory", "team.md"), "base\n");
}

describe("t245 real filesystem ownership and transient corpus", () => {
  test("prepare materializes origin/main in a single-branch shallow clone", () => {
    const remote = mkdtempSync(join(tmpdir(), "leader-sync-shallow-origin-"));
    const source = mkdtempSync(join(tmpdir(), "leader-sync-shallow-source-"));
    const clone = mkdtempSync(join(tmpdir(), "leader-sync-shallow-clone-"));
    roots.push(remote, source, clone);
    gitStdout(["init", "--bare"], remote);
    gitStdout(["init", "-b", "main"], source);
    gitStdout(["config", "user.email", "t245@example.com"], source);
    gitStdout(["config", "user.name", "t245"], source);
    mkdirSync(join(source, ELECTION, ".."), { recursive: true });
    writeFileSync(join(source, ELECTION), '{"electionId":"E-NEW"}\n');
    writeFileSync(join(source, ".gitignore"), "amadeus/.amadeus-clone-id\n");
    gitStdout(["add", "--", ".gitignore", ELECTION], source);
    gitStdout(["commit", "-m", "seed main"], source);
    gitStdout(["remote", "add", "origin", remote], source);
    gitStdout(["push", "origin", "main", "main:feature"], source);
    rmSync(clone, { recursive: true, force: true });
    gitStdout([
      "clone", "--depth", "1", "--single-branch", "--branch", "feature",
      `file://${remote}`, clone,
    ], source);
    mkdirSync(join(clone, "amadeus"), { recursive: true });
    writeFileSync(join(clone, "amadeus", ".amadeus-clone-id"), `${CLONE}\n`);

    expect(spawnGit(["rev-parse", "--verify", "origin/main"], clone).kind).toBe("error");
    expect(handlePlan(clone, spawnGit)).toBe(0);
    expect(spawnGit(["rev-parse", "--verify", "origin/main"], clone).kind).toBe("ok");
  });

  test("resolves all election files and only this clone shard", () => {
    const root = workspace();
    const other = join(root, "amadeus", "spaces", "default", "intents", "other", "audit");
    mkdirSync(other, { recursive: true });
    writeFileSync(join(other, "other-zzz.md"), "other\n");
    expect(resolveOwnedSet(root, SHARD)).toEqual({
      electionPaths: [ELECTION],
      shardPaths: [AUDIT],
    });
  });

  test("clone-id read fails closed for missing, invalid, and symlink paths", () => {
    const root = mkdtempSync(join(tmpdir(), "leader-sync-clone-id-"));
    roots.push(root);
    expect(readCloneId(root)).toBeNull();
    mkdirSync(join(root, "amadeus"), { recursive: true });
    writeFileSync(join(root, "amadeus", ".amadeus-clone-id"), "INVALID\n");
    expect(readCloneId(root)).toBeNull();
    rmSync(join(root, "amadeus", ".amadeus-clone-id"));
    const target = join(root, "clone-target");
    writeFileSync(target, "abc123\n");
    symlinkSync(target, join(root, "amadeus", ".amadeus-clone-id"));
    expect(readCloneId(root)).toBeNull();
  });

  test("selfCheck reads materialized files and numstat rejects malformed rows", () => {
    const root = workspace();
    const owned = resolveOwnedSet(root, SHARD);
    const report = selfCheck(
      root,
      [{ status: "A", path: ELECTION }, { status: "M", path: AUDIT }],
      owned,
      new Map([[AUDIT, "old audit\n"]]),
    );
    expect(reportPassed(report)).toBe(true);
    expect(parseNumstat("2\t3\tfile\n-\t-\tbinary\n")).toBe(5);
    expect(() => parseNumstat("broken\n")).toThrow();
    expect(() => parseNumstat("x\t1\tfile\n")).toThrow();
  });

  test("accepts collect-wait, hold, and views-only election corpus shapes", async () => {
    const root = workspace();
    const elections = join(root, "amadeus", "spaces", "default", "elections");
    const shapes: Array<[string, Array<[string, string]>]> = [
      ["E-COLLECT", [["definition.json", "{}\n"], ["ballots/e1.json", "{}\n"]]],
      ["E-HOLD", [["definition.json", "{}\n"], ["tally.json", '{"state":"hold"}\n']]],
      ["E-VIEWS", [["definition.json", "{}\n"], ["views/e1.json", "{}\n"]]],
    ];
    for (const [id, files] of shapes) {
      for (const [path, content] of files) {
        const target = join(elections, id, path);
        mkdirSync(join(target, ".."), { recursive: true });
        writeFileSync(target, content);
      }
    }
    const owned = resolveOwnedSet(root, SHARD);
    const contents = new Map(owned.electionPaths.map((path) => [path, Bun.file(join(root, path))]));
    const materialized = new Map<string, string>();
    for (const [path, file] of contents) materialized.set(path, await file.text());
    materialized.set(AUDIT, "old audit\nnew audit\n");
    const diffs = [
      ...owned.electionPaths.map((path) => ({ status: "A" as const, path })),
      { status: "M" as const, path: AUDIT },
    ];
    const report = analyzeOwnedContents(
      diffs,
      owned,
      materialized,
      new Map([[AUDIT, "old audit\n"]]),
    );
    expect(reportPassed(report)).toBe(true);
  });

  test("sweeps every origin/main election file through real selfCheck and exclusions", () => {
    const projectDir = process.cwd();
    const scratch = mkdtempSync(join(tmpdir(), "leader-sync-origin-corpus-"));
    roots.push(scratch);
    const root = join(scratch, "worktree");
    gitStdout([
      "fetch", "origin", "+refs/heads/main:refs/remotes/origin/main",
    ], projectDir);
    gitStdout(["worktree", "add", "--detach", root, "origin/main"], projectDir);
    try {
      const owned = resolveOwnedSet(root, SHARD);
      expect(owned.electionPaths.length).toBeGreaterThan(0);
      const diffs = owned.electionPaths.map((path) => ({ status: "A" as const, path }));
      expect(checkExclusions(diffs, owned)).toEqual([]);
      expect(reportPassed(selfCheck(root, diffs, owned, new Map()))).toBe(true);
    } finally {
      gitStdout(["worktree", "remove", "--force", root], projectDir);
    }
  });
});

describe("t245 E-PM10A falling proofs", () => {
  test("real sync branch round-trip restores memory while snapshot remains red until removed", () => {
    const remote = mkdtempSync(join(tmpdir(), "leader-sync-origin-"));
    const root = mkdtempSync(join(tmpdir(), "leader-sync-branch-"));
    roots.push(remote, root);
    gitStdout(["init", "--bare"], remote);
    gitStdout(["init", "-b", "main"], root);
    gitStdout(["config", "user.email", "t245@example.com"], root);
    gitStdout(["config", "user.name", "t245"], root);
    const memory = "amadeus/spaces/default/memory/team.md";
    const snapshot = "amadeus/spaces/default/intents/member/amadeus-state.md";
    mkdirSync(join(root, memory, ".."), { recursive: true });
    writeFileSync(join(root, memory), "one commit old\n");
    gitStdout(["add", "--", memory], root);
    gitStdout(["commit", "-m", "seed old memory"], root);
    gitStdout(["remote", "add", "origin", remote], root);
    gitStdout(["push", "-u", "origin", "main"], root);
    writeFileSync(join(root, memory), "current memory\n");
    gitStdout(["add", "--", memory], root);
    gitStdout(["commit", "-m", "advance memory"], root);
    gitStdout(["push", "origin", "main"], root);
    gitStdout(["switch", "-c", "sync/t245", "origin/main"], root);

    gitStdout(["checkout", "HEAD~1", "--", memory], root);
    mkdirSync(join(root, snapshot, ".."), { recursive: true });
    writeFileSync(join(root, snapshot), "snapshot\n");
    gitStdout(["add", "-N", "--", snapshot], root);
    const owned = resolveOwnedSet(root, SHARD);
    const injected = collectDiff(spawnGit, root);
    expect(injected).toEqual([
      { status: "A", path: snapshot },
      { status: "M", path: memory },
    ]);
    expect(checkExclusions(injected, owned)).toEqual([
      { kind: "snapshot-carry", path: snapshot },
      { kind: "memory-touch", path: memory },
    ]);

    restoreMemoryLayer(spawnGit, root);
    const afterRestore = collectDiff(spawnGit, root);
    expect(afterRestore).toEqual([{ status: "A", path: snapshot }]);
    expect(checkExclusions(afterRestore, owned)).toEqual([
      { kind: "snapshot-carry", path: snapshot },
    ]);

    rmSync(join(root, snapshot));
    gitStdout(["reset", "--", snapshot], root);
    const clean = collectDiff(spawnGit, root);
    expect(clean).toEqual([]);
    expect(checkExclusions(clean, owned)).toEqual([]);
  });
});

describe("t245 status/plan/create through fake Git/Gh ports", () => {
  test("empty shard ownership is a no-op and never runs an unscoped numstat", () => {
    const root = workspace();
    const git = fakeRunner((args) => {
      if (args.slice(0, 3).join(" ") === "ls-tree -d --name-only") return ok("E-NEW\n");
      if (args[0] === "diff" && args[1] === "--numstat") {
        return args.at(-1)?.endsWith("memory") === true
          ? ok("2\t0\tmemory/team.md\n")
          : ok("99\t0\tscripts/foreign.ts\n");
      }
      return ok();
    });
    expect(syncStatus(root, { electionPaths: [ELECTION], shardPaths: [] }, git.run)).toEqual({
      unsyncedElections: 0,
      shardDeltaLines: 0,
      normDeltaLines: 2,
      thresholdExceeded: false,
    });
    expect(git.calls.some((call) =>
      call.args.length === 4 && call.args.join(" ") === "diff --numstat origin/main --"
    )).toBe(false);
  });

  test("status and plan are deterministic and plan is read-only", () => {
    const root = workspace();
    const git = fakeRunner((args) => {
      const key = args.slice(0, 3).join(" ");
      if (key === "ls-tree -d --name-only") return ok("");
      if (key === "diff --name-status origin/main") return ok(`A\t${ELECTION}\nM\t${AUDIT}\n`);
      if (key === "ls-files --others --exclude-standard") return ok("");
      if (args[0] === "diff" && args[1] === "--numstat") return ok("1\t0\tx\n");
      return ok();
    });
    expect(handleStatus(root, git.run)).toBe(0);
    expect(handlePlan(root, git.run)).toBe(0);
    expect(git.calls.some((call) => ["add", "commit", "push", "switch"].includes(call.args[0] ?? ""))).toBe(false);
  });

  test("plan returns 1 for a foreign modification and status fails for a missing clone-id", () => {
    const root = workspace();
    const git = fakeRunner((args) => {
      if (args.slice(0, 3).join(" ") === "diff --name-status origin/main") {
        return ok("M\tscripts/foreign.ts\n");
      }
      if (args[0] === "ls-files") return ok("");
      return ok();
    });
    expect(handlePlan(root, git.run)).toBe(1);
    rmSync(join(root, "amadeus", ".amadeus-clone-id"));
    expect(handleStatus(root, git.run)).toBe(1);
  });

  test("plan reports a Git preparation failure loud", () => {
    const root = workspace();
    const git = fakeRunner((args) => args[0] === "fetch"
      ? { kind: "error", exitCode: 1, stderr: "offline" }
      : ok());
    expect(handlePlan(root, git.run)).toBe(1);
  });

  test("create uses an isolated origin/main worktree, pushes, and only opens a PR", () => {
    const root = workspace();
    const git = fakeRunner((args) => {
      seedCreateWorktree(args);
      return createFlowGitHandler(args);
    });
    const gh = fakeRunner((args) => {
      expect(args.slice(0, 2)).toEqual(["pr", "create"]);
      expect(args).not.toContain("merge");
      expect(args[args.indexOf("--body") + 1]).toContain("pureAddition: true");
      return ok("https://github.com/amadeus-dlc/amadeus/pull/9999\n");
    });
    expect(handleCreate(root, git.run, gh.run, new Date("2026-07-20T00:00:00Z"))).toBe(0);
    expect(git.calls.some((call) => call.args.slice(0, 3).join(" ") === "worktree add -b")).toBe(true);
    expect(git.calls.some((call) => call.args[0] === "push")).toBe(true);
    const restoreIndex = git.calls.findIndex((call) => call.args[0] === "checkout");
    const generatedDiffIndex = git.calls.findIndex((call, index) =>
      index > restoreIndex && call.args.slice(0, 3).join(" ") === "diff --name-status origin/main"
    );
    const commitIndex = git.calls.findIndex((call) => call.args[0] === "commit");
    expect(restoreIndex).toBeGreaterThan(-1);
    expect(generatedDiffIndex).toBeGreaterThan(restoreIndex);
    expect(commitIndex).toBeGreaterThan(generatedDiffIndex);
    expect(gh.calls.length).toBe(1);
  });

  test("branch sequence includes uncached remote refs and retries collisions with a new sequence", () => {
    const root = workspace();
    const sequenceGit = fakeRunner((args) => {
      if (args[0] === "branch" && args[1] === "--format=%(refname:short)") {
        return ok("sync/leader-20260720-2\n");
      }
      if (args[0] === "ls-remote") {
        return ok("0123456789abcdef\trefs/heads/sync/leader-20260720-7\n");
      }
      return ok();
    });
    expect(nextBranchName(sequenceGit.run, root, new Date("2026-07-20T00:00:00Z"))).toBe(
      "sync/leader-20260720-8",
    );
    expect(sequenceGit.calls.some((call) => call.args[0] === "ls-remote")).toBe(true);

    let reservations = 0;
    const git = fakeRunner((args) => {
      if (args.slice(0, 3).join(" ") === "worktree add -b") {
        reservations++;
        if (reservations === 1) {
          return { kind: "error", exitCode: 255, stderr: "fatal: a branch named candidate already exists" };
        }
        seedCreateWorktree(args);
      }
      return createFlowGitHandler(args);
    });
    const gh = fakeRunner(() => ok("https://github.com/amadeus-dlc/amadeus/pull/9999\n"));
    expect(handleCreate(root, git.run, gh.run, new Date("2026-07-20T00:00:00Z"))).toBe(0);
    const candidates = git.calls
      .filter((call) => call.args.slice(0, 3).join(" ") === "worktree add -b")
      .map((call) => call.args[3]);
    expect(candidates).toEqual(["sync/leader-20260720-1", "sync/leader-20260720-2"]);
  });

  test("Git failure is loud and prevents gh", () => {
    const root = workspace();
    const git = fakeRunner((args) => args[0] === "fetch"
      ? { kind: "error", exitCode: 1, stderr: "offline" }
      : ok());
    const gh = fakeRunner(() => ok("unexpected"));
    expect(handleCreate(root, git.run, gh.run)).toBe(1);
    expect(gh.calls.length).toBe(0);
  });

  test("create leaves a foreign source diff out of the generated branch", () => {
    const root = workspace();
    const git = fakeRunner((args, cwd) => {
      seedCreateWorktree(args);
      if (args.slice(0, 3).join(" ") === "diff --name-status origin/main" && cwd === root) {
        return ok(`A\t${ELECTION}\nM\t${AUDIT}\nM\tscripts/foreign.ts\n`);
      }
      return createFlowGitHandler(args);
    });
    const gh = fakeRunner(() => ok("https://github.com/amadeus-dlc/amadeus/pull/9999\n"));
    expect(handleCreate(root, git.run, gh.run, new Date("2026-07-20T00:00:00Z"))).toBe(0);
    const staged = git.calls.find((call) => call.args[0] === "add")?.args ?? [];
    expect(staged).not.toContain("scripts/foreign.ts");
    expect(gh.calls).toHaveLength(1);
  });

  test("create rejects a member snapshot injected into the generated worktree after restore", () => {
    const root = workspace();
    const snapshot = "amadeus/spaces/default/intents/member/amadeus-state.md";
    const git = fakeRunner((args, cwd) => {
      if (args.slice(0, 3).join(" ") === "worktree add -b") {
        seedCreateWorktree(args);
        const worktree = args[4] ?? "";
        mkdirSync(join(worktree, snapshot, ".."), { recursive: true });
        writeFileSync(join(worktree, snapshot), "snapshot\n");
      }
      if (args.slice(0, 3).join(" ") === "diff --name-status origin/main" && cwd !== root) {
        return ok(`A\t${ELECTION}\nM\t${AUDIT}\nA\t${snapshot}\n`);
      }
      return createFlowGitHandler(args);
    });
    const gh = fakeRunner(() => ok("unexpected"));
    expect(handleCreate(root, git.run, gh.run, new Date("2026-07-20T00:00:00Z"))).toBe(1);
    expect(git.calls.some((call) => call.args[0] === "commit")).toBe(false);
    expect(git.calls.some((call) => call.args[0] === "push")).toBe(false);
    expect(gh.calls).toHaveLength(0);
  });

  test("create rejects unparseable gh output after push and still removes the worktree", () => {
    const root = workspace();
    const git = fakeRunner((args) => {
      seedCreateWorktree(args);
      return createFlowGitHandler(args);
    });
    const gh = fakeRunner(() => ok("not-a-pr-url\n"));
    expect(handleCreate(root, git.run, gh.run, new Date("2026-07-20T00:00:00Z"))).toBe(1);
    expect(git.calls.some((call) => call.args.slice(0, 2).join(" ") === "worktree remove")).toBe(true);
    expect(git.calls.some((call) => call.args.slice(0, 2).join(" ") === "branch -D")).toBe(true);
  });

  test("cleanup failures are loud and local branch deletion is still attempted", () => {
    const root = workspace();
    const git = fakeRunner((args) => {
      seedCreateWorktree(args);
      if (args.slice(0, 2).join(" ") === "worktree remove") {
        return { kind: "error", exitCode: 1, stderr: "worktree busy" };
      }
      return createFlowGitHandler(args);
    });
    const gh = fakeRunner(() => ok("https://github.com/amadeus-dlc/amadeus/pull/9999\n"));
    expect(handleCreate(root, git.run, gh.run, new Date("2026-07-20T00:00:00Z"))).toBe(1);
    expect(git.calls.some((call) => call.args.slice(0, 2).join(" ") === "branch -D")).toBe(true);
  });

  test("a local branch deletion failure makes an otherwise successful create fail loud", () => {
    const root = workspace();
    const git = fakeRunner((args) => {
      seedCreateWorktree(args);
      if (args.slice(0, 2).join(" ") === "branch -D") {
        return { kind: "error", exitCode: 1, stderr: "branch retained" };
      }
      return createFlowGitHandler(args);
    });
    const gh = fakeRunner(() => ok("https://github.com/amadeus-dlc/amadeus/pull/9999\n"));
    expect(handleCreate(root, git.run, gh.run, new Date("2026-07-20T00:00:00Z"))).toBe(1);
  });

  test("branch reservation exhaustion is a git fault and never repeats a sequence", () => {
    const root = workspace();
    const git = fakeRunner((args) => {
      if (args.slice(0, 3).join(" ") === "worktree add -b") {
        return { kind: "error", exitCode: 255, stderr: "fatal: branch already exists" };
      }
      return createFlowGitHandler(args);
    });
    expect(handleCreate(root, git.run, fakeRunner(() => ok()).run, new Date("2026-07-20T00:00:00Z"))).toBe(1);
    const candidates = git.calls
      .filter((call) => call.args.slice(0, 3).join(" ") === "worktree add -b")
      .map((call) => call.args[3]);
    expect(candidates).toHaveLength(SYNC_BRANCH_RESERVATION_ATTEMPTS);
    expect(new Set(candidates).size).toBe(SYNC_BRANCH_RESERVATION_ATTEMPTS);
  });

  test("create refuses empty and over-limit plans before creating a worktree", () => {
    const root = workspace();
    const gh = fakeRunner(() => ok("unexpected"));
    const empty = fakeRunner((args) => args[0] === "ls-files" ? ok("") : ok());
    expect(handleCreate(root, empty.run, gh.run)).toBe(1);

    const rows = Array.from({ length: SYNC_SPLIT_FILE_LIMIT + 1 }, (_, index) => {
      const path = `amadeus/spaces/default/elections/E-${index}/definition.json`;
      mkdirSync(join(root, "amadeus", "spaces", "default", "elections", `E-${index}`), { recursive: true });
      writeFileSync(join(root, path), "{}\n");
      return `A\t${path}`;
    }).join("\n");
    const over = fakeRunner((args) => {
      if (args.slice(0, 3).join(" ") === "diff --name-status origin/main") return ok(`${rows}\n`);
      if (args[0] === "ls-files") return ok("");
      return ok();
    });
    expect(handleCreate(root, over.run, gh.run)).toBe(1);
    expect(over.calls.some((call) => call.args[0] === "worktree")).toBe(false);
    expect(gh.calls.length).toBe(0);
  });

  test("main preserves exit 2 usage and dispatches all three verbs through injected ports", () => {
    const root = workspace();
    const git = fakeRunner((args) => {
      if (args.slice(0, 3).join(" ") === "ls-tree -d --name-only") return ok("");
      if (args.slice(0, 3).join(" ") === "diff --name-status origin/main") return ok("");
      if (args[0] === "ls-files") return ok("");
      if (args[0] === "diff" && args[1] === "--numstat") return ok("");
      return ok();
    });
    const gh = fakeRunner(() => ok());
    expect(main(["bogus"], root, git.run, gh.run)).toBe(2);
    expect(main(["status"], root, git.run, gh.run)).toBe(0);
    expect(main(["plan"], root, git.run, gh.run)).toBe(0);
    expect(main(["create"], root, git.run, gh.run)).toBe(1);
  });

  test("real no-shell runners return child status for success and failure", () => {
    expect(spawnGit(["--version"]).kind).toBe("ok");
    const badGit = spawnGit(["definitely-not-a-git-command"]);
    expect(badGit.kind).toBe("error");
    const oldPath = process.env.PATH;
    process.env.PATH = "/nonexistent-leader-sync-path";
    try {
      expect(spawnGh(["auth", "status"]).kind).toBe("error");
    } finally {
      process.env.PATH = oldPath;
    }
  });
});

describe("t245 auditShardName drift detection", () => {
  test("matches package implementation for normal, symbolic, long hosts and clone ids 1..32", async () => {
    const cases = [
      ["normal-host", "a"],
      ["Symbol.Host!", "ab12"],
      [`Long.${"x".repeat(80)}`, "c".repeat(12)],
      ["edge", "z".repeat(32)],
    ] as const;
    for (let index = 0; index < cases.length; index++) {
      const [host, cloneId] = cases[index];
      mock.module("node:os", () => ({ ...realOs, hostname: () => host }));
      const lib = await import(`../../packages/framework/core/tools/amadeus-lib.ts?leader-sync-drift=${index}`);
      const root = mkdtempSync(join(tmpdir(), "leader-sync-drift-"));
      roots.push(root);
      mkdirSync(join(root, "amadeus"), { recursive: true });
      writeFileSync(join(root, "amadeus", ".amadeus-clone-id"), `${cloneId}\n`);
      lib._resetCloneIdForTests();
      expect(lib.auditShardName(root)).toBe(shardBasename(host, cloneId));
    }
  });
});
