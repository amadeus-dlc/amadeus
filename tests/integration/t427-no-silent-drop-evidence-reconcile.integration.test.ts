// covers: cli:no-silent-drop-evidence, workflow:no-silent-drop-evidence-reconcile, contract:no-silent-drop:identity-only-rebind
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runEvidenceCommand } from "../../scripts/no-silent-drop-evidence.ts";
import {
  type CommandResult,
  type CommandRunner,
  NoSilentDropEvidenceAdapter,
} from "../../scripts/no-silent-drop-evidence-adapter.ts";
import {
  applyReboundBundle,
  buildReboundBundle,
  EVIDENCE_BUNDLE_PATHS,
  EVIDENCE_REGISTRY_PATH,
} from "../no-silent-drop/evidence-rebind.ts";

const SOURCE_ROOT = join(import.meta.dir, "../..");
const tempRoots: string[] = [];

function command(cwd: string, args: readonly string[]): CommandResult {
  const result = spawnSync(args[0], args.slice(1), { cwd, encoding: "utf8", env: process.env });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? (result.error === undefined ? "" : String(result.error)),
  };
}

function must(cwd: string, args: readonly string[]): string {
  const result = command(cwd, args);
  if (result.status !== 0) throw new Error(`${args.join(" ")}: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function initRepository(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-evidence-rebind-integration-"));
  tempRoots.push(root);
  mkdirSync(join(root, "tests"), { recursive: true });
  cpSync(join(SOURCE_ROOT, "tests", "no-silent-drop"), join(root, "tests", "no-silent-drop"), { recursive: true });
  mkdirSync(join(root, "packages", "framework", "core", "tools"), { recursive: true });
  writeFileSync(join(root, "packages", "framework", "core", "tools", "fixture.ts"), "export const base = true;\n");
  must(root, ["git", "init", "-q"]);
  must(root, ["git", "config", "user.name", "Evidence Bot"]);
  must(root, ["git", "config", "user.email", "evidence@example.test"]);
  must(root, ["git", "add", "."]);
  must(root, ["git", "commit", "-qm", "base"]);
  return root;
}

type SquashFixture = {
  root: string;
  remote: string;
  base: string;
  binding: string;
  pullRequestHead: string;
  landing: string;
};

type PullRequestDrift = "add" | "byte" | "rename" | "mode" | "object";

function squashFixture(options: { pullRequestDrift?: PullRequestDrift; landingDrift?: boolean } = {}): SquashFixture {
  const root = initRepository();
  const base = must(root, ["git", "rev-parse", "HEAD"]);
  writeFileSync(join(root, "implementation.ts"), "export const implemented = true;\n");
  must(root, ["git", "add", "implementation.ts"]);
  must(root, ["git", "commit", "-qm", "implementation"]);
  const binding = must(root, ["git", "rev-parse", "HEAD"]);
  applyReboundBundle(root, buildReboundBundle(root, binding));
  if (options.pullRequestDrift === "add") writeFileSync(join(root, "unexpected.ts"), "export const drift = true;\n");
  if (options.pullRequestDrift === "byte") writeFileSync(join(root, "implementation.ts"), "export const implemented = false;\n");
  if (options.pullRequestDrift === "rename") renameSync(join(root, "implementation.ts"), join(root, "renamed.ts"));
  if (options.pullRequestDrift === "mode") chmodSync(join(root, "implementation.ts"), 0o755);
  if (options.pullRequestDrift === "object") {
    rmSync(join(root, "implementation.ts"));
    mkdirSync(join(root, "implementation.ts"));
    writeFileSync(join(root, "implementation.ts", "nested.ts"), "export const nested = true;\n");
  }
  must(root, ["git", "add", "."]);
  must(root, ["git", "commit", "-qm", "evidence"]);
  const pullRequestHead = must(root, ["git", "rev-parse", "HEAD"]);
  const remote = mkdtempSync(join(tmpdir(), "amadeus-evidence-rebind-remote-"));
  tempRoots.push(remote);
  must(remote, ["git", "init", "--bare", "-q"]);
  must(root, ["git", "remote", "add", "origin", remote]);
  must(root, ["git", "push", "-q", "origin", `${pullRequestHead}:refs/pull/7/head`]);
  let tree = must(root, ["git", "rev-parse", `${pullRequestHead}^{tree}`]);
  if (options.landingDrift) {
    writeFileSync(join(root, "landing-drift.ts"), "export const drift = true;\n");
    must(root, ["git", "add", "landing-drift.ts"]);
    tree = must(root, ["git", "write-tree"]);
    must(root, ["git", "reset", "--hard", "-q", pullRequestHead]);
  }
  const landing = must(root, ["git", "commit-tree", tree, "-p", base, "-m", "squash landing"]);
  must(root, ["git", "reset", "--hard", "-q", landing]);
  must(root, ["git", "push", "-q", "origin", `${landing}:refs/heads/main`]);
  must(root, ["git", "checkout", "--detach", "-q", landing]);
  return { root, remote, base, binding, pullRequestHead, landing };
}

function hybridRunner(
  fixture: SquashFixture,
  options: {
    pages?: unknown;
    remoteTip?: string;
    failPush?: boolean;
    failCommit?: boolean;
    failFocused?: boolean;
    failGitHub?: boolean;
  } = {},
): CommandRunner {
  const pullRequest = {
    number: 7,
    state: "closed",
    merged_at: "2026-08-04T00:00:00Z",
    merge_commit_sha: fixture.landing,
    base: { ref: "main" },
  };
  return {
    run(args, runOptions = {}) {
      return interceptedCommand(args, options, pullRequest) ?? command(runOptions.cwd ?? fixture.root, args);
    },
  };
}

function interceptedCommand(
  args: readonly string[],
  options: {
    pages?: unknown;
    remoteTip?: string;
    failPush?: boolean;
    failCommit?: boolean;
    failFocused?: boolean;
    failGitHub?: boolean;
  },
  pullRequest: unknown,
): CommandResult | undefined {
  if (args[0] === "gh") {
    if (options.failGitHub) return { status: 1, stdout: "", stderr: "credential rejected" };
    return { status: 0, stdout: JSON.stringify(options.pages ?? [[pullRequest]]), stderr: "" };
  }
  if (args[0] === "bun" && args[1] === "test") {
    return options.failFocused
      ? { status: 1, stdout: "", stderr: "focused failure" }
      : { status: 0, stdout: "10 pass\n0 fail\n", stderr: "" };
  }
  if (args[0] === "git" && args[1] === "ls-remote" && options.remoteTip !== undefined) {
    return { status: 0, stdout: `${options.remoteTip}\trefs/heads/main\n`, stderr: "" };
  }
  if (args[0] === "git" && args[1] === "push" && options.failPush) {
    return { status: 1, stdout: "", stderr: "push rejected" };
  }
  if (args[0] === "git" && args[1] === "commit" && options.failCommit) {
    return { status: 1, stdout: "", stderr: "commit rejected" };
  }
  return undefined;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("t427 pure rebind trust boundary", () => {
  test("accepts only a clean target equal to HEAD and emits one JSON line from the CLI", () => {
    const root = initRepository();
    const head = must(root, ["git", "rev-parse", "HEAD"]);
    const script = join(SOURCE_ROOT, "scripts", "no-silent-drop-evidence.ts");
    const result = command(root, ["bun", script, "rebind", "--target-revision", head]);
    expect(result.status).toBe(0);
    expect(result.stdout.endsWith("\n")).toBeTrue();
    expect(result.stdout.split("\n")).toHaveLength(2);
    const envelope = JSON.parse(result.stdout);
    expect(envelope).toMatchObject({ status: "changed", code: "REBIND_OK", targetRevision: head, changed: true });
    expect(envelope.paths).toEqual([...EVIDENCE_BUNDLE_PATHS]);

    const invalid = command(root, ["bun", script, "rebind", "--target-revision", "abc123"]);
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toBe("");
    expect(invalid.stdout.endsWith("\n")).toBeTrue();
    expect(invalid.stdout.split("\n")).toHaveLength(2);
    expect(JSON.parse(invalid.stdout)).toMatchObject({ status: "error", code: "REBIND_INPUT_INVALID" });
  });

  test("rejects ancestor, dirty index, dirty worktree, and unresolved targets before changing evidence", () => {
    for (const mutation of ["ancestor", "index", "worktree", "unresolved"] as const) {
      const root = initRepository();
      const original = readFileSync(join(root, EVIDENCE_REGISTRY_PATH));
      const first = must(root, ["git", "rev-parse", "HEAD"]);
      writeFileSync(join(root, "later.ts"), "export const later = true;\n");
      must(root, ["git", "add", "later.ts"]);
      must(root, ["git", "commit", "-qm", "later"]);
      let target = must(root, ["git", "rev-parse", "HEAD"]);
      if (mutation === "ancestor") target = first;
      if (mutation === "index") {
        writeFileSync(join(root, "index.ts"), "export const dirty = true;\n");
        must(root, ["git", "add", "index.ts"]);
      }
      if (mutation === "worktree") writeFileSync(join(root, "later.ts"), "dirty\n");
      if (mutation === "unresolved") target = "f".repeat(40);
      const result = runEvidenceCommand(["rebind", "--target-revision", target], { repositoryRoot: root });
      expect(result.status).toBe("error");
      expect(readFileSync(join(root, EVIDENCE_REGISTRY_PATH))).toEqual(original);
    }
  });

  test("rejects a clean detached HEAD before changing evidence", () => {
    const root = initRepository();
    const target = must(root, ["git", "rev-parse", "HEAD"]);
    const original = readFileSync(join(root, EVIDENCE_REGISTRY_PATH));
    must(root, ["git", "checkout", "--detach", "-q", target]);

    const result = runEvidenceCommand(["rebind", "--target-revision", target], { repositoryRoot: root });
    expect(result).toMatchObject({ status: "error", code: "REBIND_DETACHED_HEAD" });
    expect(readFileSync(join(root, EVIDENCE_REGISTRY_PATH))).toEqual(original);
    expect(command(root, ["git", "status", "--porcelain=v1"]).stdout).toBe("");
  });
});

describe("t427 squash identity proof and main convergence", () => {
  test("proves both trees, pushes one evidence commit, then no-ops on the rebind commit push", () => {
    const fixture = squashFixture();
    const first = runEvidenceCommand([
      "reconcile",
      "--event-revision",
      fixture.landing,
      "--repository",
      "amadeus-dlc/amadeus",
    ], { repositoryRoot: fixture.root, runner: hybridRunner(fixture) });
    expect(first).toMatchObject({ status: "changed", code: "REBIND_OK", targetRevision: fixture.landing });
    const rebindCommit = must(fixture.root, ["git", "rev-parse", "HEAD"]);
    expect(rebindCommit).not.toBe(fixture.landing);
    expect(must(fixture.root, ["git", "ls-remote", "--heads", "origin", "refs/heads/main"]).split(/\s+/)[0]).toBe(rebindCommit);
    expect(must(fixture.root, ["git", "diff", "--name-only", `${fixture.landing}..${rebindCommit}`]).split("\n").sort()).toEqual(
      [...EVIDENCE_BUNDLE_PATHS],
    );

    const second = runEvidenceCommand([
      "reconcile",
      "--event-revision",
      rebindCommit,
      "--repository",
      "amadeus-dlc/amadeus",
    ], { repositoryRoot: fixture.root, runner: hybridRunner({ ...fixture, landing: rebindCommit }) });
    expect(second).toMatchObject({
      status: "no-op",
      code: "REBIND_NOOP",
      bindingRevision: fixture.landing,
      targetRevision: null,
      changed: false,
    });
    expect(must(fixture.root, ["git", "rev-parse", "HEAD"])).toBe(rebindCommit);
  });

  test("fails closed for zero, multiple, and incomplete pagination responses", () => {
    const cases: unknown[] = [
      [[]],
      [[
        { number: 7, state: "closed", merged_at: "now", merge_commit_sha: "EVENT", base: { ref: "main" } },
        { number: 8, state: "closed", merged_at: "now", merge_commit_sha: "EVENT", base: { ref: "main" } },
      ]],
      [[{ number: 7, state: "closed", merged_at: "now", merge_commit_sha: "EVENT", base: { ref: "develop" } }]],
      [[{ number: 7, state: "closed", merged_at: "now", merge_commit_sha: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", base: { ref: "main" } }]],
      { not: "pages" },
    ];
    for (const [index, raw] of cases.entries()) {
      const fixture = squashFixture();
      const pages = JSON.parse(JSON.stringify(raw).replaceAll("EVENT", fixture.landing));
      const result = runEvidenceCommand([
        "reconcile",
        "--event-revision",
        fixture.landing,
        "--repository",
        "amadeus-dlc/amadeus",
      ], { repositoryRoot: fixture.root, runner: hybridRunner(fixture, { pages }) });
      expect(result.status, `case ${index}`).toBe("error");
      expect(must(fixture.root, ["git", "rev-parse", "HEAD"])).toBe(fixture.landing);
    }
  });

  test("rejects add, byte, rename, mode, and object-type binding-to-PR drift plus landing root-tree drift", () => {
    const cases: Array<{ pullRequestDrift?: PullRequestDrift; landingDrift?: boolean }> = [
      { pullRequestDrift: "add" },
      { pullRequestDrift: "byte" },
      { pullRequestDrift: "rename" },
      { pullRequestDrift: "mode" },
      { pullRequestDrift: "object" },
      { landingDrift: true },
    ];
    for (const options of cases) {
      const fixture = squashFixture(options);
      const adapter = new NoSilentDropEvidenceAdapter(fixture.root, hybridRunner(fixture));
      expect(() => adapter.proveIdentityOnlyRebind(fixture.landing, fixture.binding, "amadeus-dlc/amadeus")).toThrow();
      expect(must(fixture.root, ["git", "rev-parse", "HEAD"])).toBe(fixture.landing);
    }
  });

  test("rejects a non-ancestor binding and an unavailable pull-request head ref", () => {
    const nonAncestor = squashFixture();
    const nonAncestorAdapter = new NoSilentDropEvidenceAdapter(nonAncestor.root, hybridRunner(nonAncestor));
    expect(() =>
      nonAncestorAdapter.proveIdentityOnlyRebind(
        nonAncestor.landing,
        nonAncestor.landing,
        "amadeus-dlc/amadeus",
      )).toThrow("not an ancestor");

    const missingRef = squashFixture();
    must(missingRef.remote, ["git", "update-ref", "-d", "refs/pull/7/head"]);
    const result = runEvidenceCommand([
      "reconcile",
      "--event-revision",
      missingRef.landing,
      "--repository",
      "amadeus-dlc/amadeus",
    ], { repositoryRoot: missingRef.root, runner: hybridRunner(missingRef) });
    expect(result).toMatchObject({ status: "error", code: "REBIND_PR_HEAD_UNAVAILABLE" });
  });

  test("rolls back a focused-validation failure and supersedes a stale remote tip without pushing", () => {
    for (const mode of ["focused", "stale"] as const) {
      const fixture = squashFixture();
      const original = EVIDENCE_BUNDLE_PATHS.map((path) => readFileSync(join(fixture.root, path)));
      const result = runEvidenceCommand([
        "reconcile",
        "--event-revision",
        fixture.landing,
        "--repository",
        "amadeus-dlc/amadeus",
      ], {
        repositoryRoot: fixture.root,
        runner: hybridRunner(fixture, mode === "focused" ? { failFocused: true } : { remoteTip: "d".repeat(40) }),
      });
      expect(result.status).toBe(mode === "focused" ? "error" : "superseded");
      expect(EVIDENCE_BUNDLE_PATHS.map((path) => readFileSync(join(fixture.root, path)))).toEqual(original);
      expect(must(fixture.root, ["git", "rev-parse", "HEAD"])).toBe(fixture.landing);
    }
  });

  test("keeps remote main unchanged when the fast-forward push fails", () => {
    const fixture = squashFixture();
    const result = runEvidenceCommand([
      "reconcile",
      "--event-revision",
      fixture.landing,
      "--repository",
      "amadeus-dlc/amadeus",
    ], { repositoryRoot: fixture.root, runner: hybridRunner(fixture, { failPush: true }) });
    expect(result).toMatchObject({ status: "error", code: "REBIND_PUSH_FAILED" });
    expect(must(fixture.root, ["git", "ls-remote", "--heads", "origin", "refs/heads/main"]).split(/\s+/)[0]).toBe(fixture.landing);
  });

  test("restores both index and worktree when the evidence commit fails", () => {
    const fixture = squashFixture();
    const result = runEvidenceCommand([
      "reconcile",
      "--event-revision",
      fixture.landing,
      "--repository",
      "amadeus-dlc/amadeus",
    ], { repositoryRoot: fixture.root, runner: hybridRunner(fixture, { failCommit: true }) });
    expect(result).toMatchObject({ status: "error", code: "REBIND_COMMIT_FAILED" });
    expect(must(fixture.root, ["git", "rev-parse", "HEAD"])).toBe(fixture.landing);
    expect(command(fixture.root, ["git", "status", "--porcelain=v1"]).stdout).toBe("");
    expect(must(fixture.root, ["git", "ls-remote", "--heads", "origin", "refs/heads/main"]).split(/\s+/)[0]).toBe(fixture.landing);
  });

  test("fails closed before writing when GitHub authentication or pagination transport fails", () => {
    const fixture = squashFixture();
    const before = EVIDENCE_BUNDLE_PATHS.map((path) => readFileSync(join(fixture.root, path)));
    const result = runEvidenceCommand([
      "reconcile",
      "--event-revision",
      fixture.landing,
      "--repository",
      "amadeus-dlc/amadeus",
    ], { repositoryRoot: fixture.root, runner: hybridRunner(fixture, { failGitHub: true }) });
    expect(result).toMatchObject({ status: "error", code: "REBIND_GITHUB_FAILED" });
    expect(EVIDENCE_BUNDLE_PATHS.map((path) => readFileSync(join(fixture.root, path)))).toEqual(before);
  });
});
