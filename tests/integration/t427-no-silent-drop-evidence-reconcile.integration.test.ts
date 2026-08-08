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
  normalizeSpawnOutcome,
  systemCommandRunner,
} from "../../scripts/no-silent-drop-evidence-adapter.ts";
import {
  applyReboundBundle,
  buildReboundBundle,
  EVIDENCE_BUNDLE_PATHS,
  EVIDENCE_REGISTRY_PATH,
} from "../no-silent-drop/evidence-rebind.ts";

const SOURCE_ROOT = join(import.meta.dir, "../..");
const tempRoots: string[] = [];
const NUL = String.fromCharCode(0);
// What `git status --porcelain=v1 -z --branch` prints for a clean worktree: the header, nothing else.
const CLEAN_STATUS = `## main${NUL}`;
const MOCK_EVENT = "e".repeat(40);
const MOCK_EVENT_PARENT = "a".repeat(40);
const MOCK_PULL_REQUEST_HEAD = "c".repeat(40);
// #2338: reconcile no longer ratchets previousDigest ledger files.

// Same fail-closed discipline as `systemCommandRunner` (#2397): a spawn that sets `error` did not
// deliver what was asked for even when it reports exit 0, and the error detail always reaches
// stderr so a failure here is diagnosable rather than a silently truncated stdout.
function command(cwd: string, args: readonly string[]): CommandResult {
  const result = spawnSync(args[0], args.slice(1), { cwd, encoding: "utf8", env: process.env });
  return normalizeSpawnOutcome(result, 0);
}

function commandResult(status = 0, stdout = "", stderr = ""): CommandResult {
  return { status, stdout, stderr };
}

function commandKey(args: readonly string[]): string {
  return `${args[0] ?? ""} ${args[1] ?? ""}`;
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
  must(root, ["git", "config", "core.fileMode", "true"]);
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
// "outside": landing differs from the pull-request head on a path the proof does not own — base
// advance, which reconcile must tolerate. "freshness": landing differs on the gate's own
// implementation (EVIDENCE_FRESHNESS_PATHSPECS), which the proof must still reject.
type LandingDrift = "outside" | "freshness";
const LANDING_DRIFT_PATHS: Record<LandingDrift, string> = {
  outside: "landing-drift.ts",
  freshness: "tests/no-silent-drop/landing-drift.ts",
};

type ReconcileRunnerOptions = {
  pages?: unknown;
  remoteTip?: string;
  remoteTips?: string[];
  failPush?: boolean;
  failCommit?: boolean;
  failRollback?: boolean;
  failFocused?: boolean;
  failGate?: boolean;
  failGitHub?: boolean;
};

function squashFixture(options: { pullRequestDrift?: PullRequestDrift; landingDrift?: LandingDrift } = {}): SquashFixture {
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
  if (options.landingDrift !== undefined) {
    const driftPath = LANDING_DRIFT_PATHS[options.landingDrift];
    writeFileSync(join(root, driftPath), "export const drift = true;\n");
    must(root, ["git", "add", "--", driftPath]);
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
  options: ReconcileRunnerOptions = {},
): CommandRunner {
  const pullRequest = {
    number: 7,
    state: "closed",
    merged_at: "2026-08-04T00:00:00Z",
    merge_commit_sha: fixture.landing,
    base: { ref: "main" },
  };
  const remoteTips = [...(options.remoteTips ?? [])];
  return {
    run(args, runOptions = {}) {
      return interceptedCommand(args, options, pullRequest, remoteTips) ?? command(runOptions.cwd ?? fixture.root, args);
    },
  };
}

function interceptedCommand(
  args: readonly string[],
  options: ReconcileRunnerOptions,
  pullRequest: unknown,
  remoteTips: string[],
): CommandResult | undefined {
  const key = commandKey(args);
  if (key === "gh api") {
    if (options.failGitHub) return { status: 1, stdout: "", stderr: "credential rejected" };
    return { status: 0, stdout: JSON.stringify(options.pages ?? [[pullRequest]]), stderr: "" };
  }
  if (key === "bun test") {
    return options.failFocused
      ? { status: 1, stdout: "", stderr: "focused failure" }
      : { status: 0, stdout: "10 pass\n0 fail\n", stderr: "" };
  }
  if (key === "bun tests/no-silent-drop-gate.ts") {
    if (options.failGate) return { status: 2, stdout: "", stderr: "no-silent-drop failure" };
    return { status: 0, stdout: '{"status":"pass","code":"NO_SILENT_DROP_OK"}\n', stderr: "" };
  }
  if (key === "git ls-remote") {
    const remoteTip = remoteTips.shift() ?? options.remoteTip;
    if (remoteTip !== undefined) return commandResult(0, `${remoteTip}\trefs/heads/main\n`);
  }
  if (key === "git push" && options.failPush) {
    return { status: 1, stdout: "", stderr: "push rejected" };
  }
  if (key === "git commit" && options.failCommit) {
    return { status: 1, stdout: "", stderr: "commit rejected" };
  }
  if (key === "git reset" && options.failRollback) {
    return { status: 1, stdout: "", stderr: "rollback rejected" };
  }
  return undefined;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("t427 pure rebind trust boundary", () => {
  test("fails closed when a system command exceeds its finite deadline", () => {
    const result = systemCommandRunner.run(
      [process.execPath, "-e", "setTimeout(() => {}, 10_000)"],
      { timeoutMs: 10 },
    );
    expect(result.status).toBe(124);
    expect(result.stderr).toContain("command timed out after 10ms (SIGTERM)");
  });

  test("does not misclassify a child-initiated SIGTERM as a timeout", () => {
    const result = systemCommandRunner.run(
      [process.execPath, "-e", 'process.kill(process.pid, "SIGTERM")'],
      { timeoutMs: 1_000 },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain("command timed out");
  });

  test("captures a two-megabyte command output", () => {
    const expectedBytes = 2_000_000;
    const result = systemCommandRunner.run([
      process.execPath,
      "-e",
      `process.stdout.write("x".repeat(${expectedBytes}))`,
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout).toHaveLength(expectedBytes);
    expect(result.stderr).toBe("");
  });

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

  // #2397: `git status -z` can exit 0 with truncated stdout under load — t427 caught the
  // `git ls-tree -z` face of it. Cleanliness has to survive a cut at ANY offset, and the two
  // guards divide that job: NUL termination catches a record that stops mid-write (including a
  // cut inside the header itself), while `--branch` catches the cut to "", which is
  // byte-identical to a clean worktree and which no termination check can see. Each case below
  // pins one cut offset; drop either guard and one of them reads as clean.
  test("asks git for the branch header so an empty answer cannot pass as clean", () => {
    const root = initRepository();
    let asked: readonly string[] = [];
    const runner: CommandRunner = {
      run(args, options = {}) {
        if (commandKey(args) === "git status") {
          asked = args;
          return commandResult(0, "");
        }
        return command(options.cwd ?? root, args);
      },
    };

    expect(() => new NoSilentDropEvidenceAdapter(root, runner).assertClean())
      .toThrow("git status output is truncated");
    expect(asked).toContain("--branch");
  });

  test("rejects every truncated status shape instead of reading it as clean", () => {
    const root = initRepository();
    const statusRunner = (stdout: string): CommandRunner => ({
      run(args, options = {}) {
        return commandKey(args) === "git status" ? commandResult(0, stdout) : command(options.cwd ?? root, args);
      },
    });

    // Cut after the header's bytes but before its NUL, and cut inside the header. Both leave a
    // string whose only entry starts with "##", so the header check alone would call them clean.
    for (const truncated of ["## main", "## ma", `## main${NUL} M implementation`.slice(0, -3)]) {
      expect(() => new NoSilentDropEvidenceAdapter(root, statusRunner(truncated)).assertClean(), truncated)
        .toThrow("git status output is truncated");
    }
    // Terminated, but git never omits the header — an answer without one is not a clean worktree.
    expect(() => new NoSilentDropEvidenceAdapter(root, statusRunner(` M implementation.ts${NUL}`)).assertClean())
      .toThrow("git status output is missing the branch header");
  });

  test("separates a clean worktree from a dirty one by what follows the branch header", () => {
    const root = initRepository();
    const statusRunner = (stdout: string): CommandRunner => ({
      run(args, options = {}) {
        return commandKey(args) === "git status" ? commandResult(0, stdout) : command(options.cwd ?? root, args);
      },
    });

    expect(() => new NoSilentDropEvidenceAdapter(root, statusRunner(`## main${NUL}`)).assertClean()).not.toThrow();
    expect(() =>
      new NoSilentDropEvidenceAdapter(root, statusRunner(`## main${NUL} M implementation.ts${NUL}`)).assertClean()
    ).toThrow("index and working tree must be clean before rebind");
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

  test("covers changed and already-bound pure rebind outcomes in-process", () => {
    const changedRoot = initRepository();
    const head = must(changedRoot, ["git", "rev-parse", "HEAD"]);
    expect(runEvidenceCommand(["rebind", "--target-revision", head], { repositoryRoot: changedRoot })).toMatchObject({
      status: "changed",
      code: "REBIND_OK",
      bindingRevision: expect.any(String),
      targetRevision: head,
    });

    const noOpRoot = initRepository();
    applyReboundBundle(noOpRoot, buildReboundBundle(noOpRoot, MOCK_EVENT));
    const runner: CommandRunner = {
      run(args) {
        if (args[0] === "git" && args[1] === "rev-parse") return { status: 0, stdout: `${MOCK_EVENT}\n`, stderr: "" };
        if (args[0] === "git" && args[1] === "symbolic-ref") {
          return { status: 0, stdout: "refs/heads/evidence-test\n", stderr: "" };
        }
        if (args[0] === "git" && args[1] === "status") return { status: 0, stdout: CLEAN_STATUS, stderr: "" };
        return { status: 0, stdout: "", stderr: "" };
      },
    };
    expect(runEvidenceCommand(["rebind", "--target-revision", MOCK_EVENT], {
      repositoryRoot: noOpRoot,
      runner,
    })).toMatchObject({ status: "no-op", code: "REBIND_NOOP", bindingRevision: MOCK_EVENT });
  });

  test("reports a rollback failure when both file and index recovery fail", () => {
    const root = initRepository();
    let statusCalls = 0;
    const handlers: Record<string, () => CommandResult> = {
      "git rev-parse": () => commandResult(0, `${MOCK_EVENT}\n`),
      "git symbolic-ref": () => commandResult(0, "refs/heads/evidence-test\n"),
      "git status": () => {
        statusCalls += 1;
        if (statusCalls === 2) rmSync(join(root, "tests", "no-silent-drop"), { recursive: true });
        // A clean worktree still carries the `## <branch>` header assertClean requires.
        return commandResult(0, CLEAN_STATUS);
      },
      "git restore": () => commandResult(1, "", "index recovery rejected"),
    };
    const runner: CommandRunner = {
      run(args) {
        return handlers[commandKey(args)]?.() ?? commandResult();
      },
    };
    expect(runEvidenceCommand(["rebind", "--target-revision", MOCK_EVENT], { repositoryRoot: root, runner })).toMatchObject({
      status: "error",
      code: "REBIND_ROLLBACK_FAILED",
    });
  });
});

function syntheticReconcileRunner(
  root: string,
  options: { bindingExists: boolean; mutateEvidenceTo?: string },
): CommandRunner {
  let catFileCalls = 0;
  const handlers: Record<string, (args: readonly string[]) => CommandResult> = {
    "git cat-file": () => {
      catFileCalls += 1;
      return commandResult(catFileCalls === 1 || options.bindingExists ? 0 : 1);
    },
    "git rev-parse": (args) => {
      if (args[2]?.startsWith("refs/no-silent-drop/")) return commandResult(0, `${MOCK_PULL_REQUEST_HEAD}\n`);
      return commandResult(0, `${MOCK_EVENT}\n`);
    },
    "git status": () => commandResult(0, CLEAN_STATUS),
    "git ls-tree": () => commandResult(),
    "gh api": () => {
      if (options.mutateEvidenceTo !== undefined) {
        applyReboundBundle(root, buildReboundBundle(root, options.mutateEvidenceTo));
      }
      return commandResult(0, JSON.stringify([[
        {
          number: 7,
          state: "closed",
          merged_at: "2026-08-04T00:00:00Z",
          merge_commit_sha: MOCK_EVENT,
          base: { ref: "main" },
        },
      ]]));
    },
  };
  return {
    run(args) {
      return handlers[commandKey(args)]?.(args) ?? commandResult();
    },
  };
}

type FocusedRunnerOptions = { parentStdout?: string; parentStatus?: number };

/** Records every argv the adapter issues so focused validation's gate base can be asserted exactly. */
function recordingFocusedRunner(options: FocusedRunnerOptions = {}): {
  runner: CommandRunner;
  commands: string[][];
} {
  const commands: string[][] = [];
  const handlers: Record<string, () => CommandResult> = {
    "git rev-parse": () => commandResult(options.parentStatus ?? 0, options.parentStdout ?? `${MOCK_EVENT_PARENT}\n`),
    "bun test": () => commandResult(0, "10 pass\n0 fail\n"),
    "bun tests/no-silent-drop-gate.ts": () => commandResult(0, '{"status":"pass","code":"NO_SILENT_DROP_OK"}\n'),
  };
  return {
    commands,
    runner: {
      run(args) {
        commands.push([...args]);
        return handlers[commandKey(args)]?.() ?? commandResult();
      },
    },
  };
}

function gateInvocation(commands: readonly string[][]): string[] | undefined {
  return commands.find((argv) => argv[1] === "tests/no-silent-drop-gate.ts");
}

describe("t427 focused validation base revision", () => {
  // The reconcile checkout puts HEAD at the event revision, and the gate requires its trusted base
  // to be a STRICT ancestor of HEAD (tests/no-silent-drop/bootstrap.ts assertStrictAncestorOfHead),
  // so passing the event revision itself is always BASELINE_INVALID.
  test("checks the gate against the landing commit's resolved first parent", () => {
    const { runner, commands } = recordingFocusedRunner();
    new NoSilentDropEvidenceAdapter(SOURCE_ROOT, runner).runFocusedValidation(MOCK_EVENT);

    expect(commands).toContainEqual(["git", "rev-parse", `${MOCK_EVENT}^`]);
    expect(gateInvocation(commands)).toEqual([
      "bun",
      "tests/no-silent-drop-gate.ts",
      "check",
      "--base-revision",
      MOCK_EVENT_PARENT,
    ]);
    expect(gateInvocation(commands)).not.toContain(MOCK_EVENT);
  });

  test("fails closed without running the gate when the first parent is unresolvable or malformed", () => {
    const cases: FocusedRunnerOptions[] = [
      { parentStatus: 128, parentStdout: "" },
      { parentStdout: `${MOCK_EVENT}^\n` },
      { parentStdout: "aaaaaaa\n" },
      { parentStdout: `${"0".repeat(40)}\n` },
    ];
    for (const [index, options] of cases.entries()) {
      const { runner, commands } = recordingFocusedRunner(options);
      expect(
        () => new NoSilentDropEvidenceAdapter(SOURCE_ROOT, runner).runFocusedValidation(MOCK_EVENT),
        `case ${index}`,
      ).toThrow("first parent");
      expect(gateInvocation(commands), `case ${index}`).toBeUndefined();
    }
  });
});

describe("t427 squash identity proof and main convergence", () => {
  test("fails closed if the binding changes during reconciliation and no-ops an already-bound bundle", () => {
    const changedRoot = initRepository();
    const changedResult = runEvidenceCommand([
      "reconcile",
      "--event-revision",
      MOCK_EVENT,
      "--repository",
      "amadeus-dlc/amadeus",
    ], {
      repositoryRoot: changedRoot,
      runner: syntheticReconcileRunner(changedRoot, { bindingExists: false, mutateEvidenceTo: "d".repeat(40) }),
    });
    expect(changedResult).toMatchObject({ status: "error", code: "REBIND_BINDING_CHANGED" });

    const noOpRoot = initRepository();
    applyReboundBundle(noOpRoot, buildReboundBundle(noOpRoot, MOCK_EVENT));
    const noOpResult = runEvidenceCommand([
      "reconcile",
      "--event-revision",
      MOCK_EVENT,
      "--repository",
      "amadeus-dlc/amadeus",
    ], {
      repositoryRoot: noOpRoot,
      runner: syntheticReconcileRunner(noOpRoot, { bindingExists: false }),
    });
    expect(noOpResult).toMatchObject({ status: "no-op", code: "REBIND_NOOP", bindingRevision: MOCK_EVENT });
  });

  test("proves both trees, pushes one evidence-and-ledger commit, then no-ops on the rebind commit push", () => {
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
      [...EVIDENCE_BUNDLE_PATHS].sort(),
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

  test("rejects add, byte, rename, mode, and object-type binding-to-PR drift plus proven-path landing drift", () => {
    const cases: Array<{
      options: { pullRequestDrift?: PullRequestDrift; landingDrift?: LandingDrift };
      expected: string;
    }> = [
      { options: { pullRequestDrift: "add" }, expected: "differ outside the three derived evidence files" },
      { options: { pullRequestDrift: "byte" }, expected: "differ outside the three derived evidence files" },
      { options: { pullRequestDrift: "rename" }, expected: "differ outside the three derived evidence files" },
      { options: { pullRequestDrift: "mode" }, expected: "differ outside the three derived evidence files" },
      { options: { pullRequestDrift: "object" }, expected: "differ outside the three derived evidence files" },
      { options: { landingDrift: "freshness" }, expected: "differ on proven evidence paths" },
    ];
    for (const { options, expected } of cases) {
      const fixture = squashFixture(options);
      const adapter = new NoSilentDropEvidenceAdapter(fixture.root, hybridRunner(fixture));
      expect(() =>
        adapter.proveIdentityOnlyRebind(fixture.landing, fixture.binding, "amadeus-dlc/amadeus")
      ).toThrow(expected);
      expect(must(fixture.root, ["git", "rev-parse", "HEAD"])).toBe(fixture.landing);
    }
  });

  test("names the drifted proven path and tolerates landing drift the proof does not own", () => {
    const drifted = squashFixture({ landingDrift: "freshness" });
    const driftedAdapter = new NoSilentDropEvidenceAdapter(drifted.root, hybridRunner(drifted));
    expect(() => driftedAdapter.proveIdentityOnlyRebind(drifted.landing, drifted.binding, "amadeus-dlc/amadeus"))
      .toThrow("tests/no-silent-drop/landing-drift.ts");

    const advanced = squashFixture({ landingDrift: "outside" });
    const advancedAdapter = new NoSilentDropEvidenceAdapter(advanced.root, hybridRunner(advanced));
    expect(advancedAdapter.proveIdentityOnlyRebind(advanced.landing, advanced.binding, "amadeus-dlc/amadeus"))
      .toMatchObject({ pullRequestNumber: 7, pullRequestHead: advanced.pullRequestHead });
    expect(must(advanced.root, ["git", "rev-parse", `${advanced.landing}^{tree}`]))
      .not.toBe(must(advanced.root, ["git", "rev-parse", `${advanced.pullRequestHead}^{tree}`]));
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

  test("rolls back focused validation failures and supersedes a stale remote tip without pushing", () => {
    for (const mode of ["focused", "gate", "stale"] as const) {
      const fixture = squashFixture();
      const reconcilePaths = [...EVIDENCE_BUNDLE_PATHS];
      const original = reconcilePaths.map((path) => readFileSync(join(fixture.root, path)));
      const result = runEvidenceCommand([
        "reconcile",
        "--event-revision",
        fixture.landing,
        "--repository",
        "amadeus-dlc/amadeus",
      ], {
        repositoryRoot: fixture.root,
        runner: hybridRunner(fixture, mode === "focused"
          ? { failFocused: true }
          : mode === "gate"
            ? { failGate: true }
            : { remoteTip: "d".repeat(40) }),
      });
      expect(result.status).toBe(mode === "stale" ? "superseded" : "error");
      expect(reconcilePaths.map((path) => readFileSync(join(fixture.root, path)))).toEqual(original);
      expect(must(fixture.root, ["git", "rev-parse", "HEAD"])).toBe(fixture.landing);
    }
  });

  test("keeps remote main unchanged when the fast-forward push fails", () => {
    const fixture = squashFixture();
    const reconcilePaths = [...EVIDENCE_BUNDLE_PATHS];
    const original = reconcilePaths.map((path) => readFileSync(join(fixture.root, path)));
    const result = runEvidenceCommand([
      "reconcile",
      "--event-revision",
      fixture.landing,
      "--repository",
      "amadeus-dlc/amadeus",
    ], { repositoryRoot: fixture.root, runner: hybridRunner(fixture, { failPush: true }) });
    expect(result).toMatchObject({ status: "error", code: "REBIND_PUSH_FAILED" });
    expect(must(fixture.root, ["git", "ls-remote", "--heads", "origin", "refs/heads/main"]).split(/\s+/)[0]).toBe(fixture.landing);
    expect(reconcilePaths.map((path) => readFileSync(join(fixture.root, path)))).toEqual(original);
    expect(must(fixture.root, ["git", "rev-parse", "HEAD"])).toBe(fixture.landing);
    expect(command(fixture.root, ["git", "status", "--porcelain=v1"]).stdout).toBe("");
  });

  test("rolls back pre-push failures but preserves an unknown push outcome for recovery", () => {
    const beforePush = squashFixture();
    const reconcilePaths = [...EVIDENCE_BUNDLE_PATHS];
    const beforePushOriginal = reconcilePaths.map((path) => readFileSync(join(beforePush.root, path)));
    const beforePushResult = runEvidenceCommand([
      "reconcile",
      "--event-revision",
      beforePush.landing,
      "--repository",
      "amadeus-dlc/amadeus",
    ], {
      repositoryRoot: beforePush.root,
      runner: hybridRunner(beforePush, { remoteTips: [beforePush.landing, "unavailable"] }),
    });
    expect(beforePushResult).toMatchObject({ status: "error", code: "REBIND_REMOTE_TIP_FAILED" });
    expect(reconcilePaths.map((path) => readFileSync(join(beforePush.root, path)))).toEqual(beforePushOriginal);
    expect(must(beforePush.root, ["git", "rev-parse", "HEAD"])).toBe(beforePush.landing);
    expect(command(beforePush.root, ["git", "status", "--porcelain=v1"]).stdout).toBe("");

    const unknownPush = squashFixture();
    const unknownOriginal = reconcilePaths.map((path) => readFileSync(join(unknownPush.root, path)));
    const unknownResult = runEvidenceCommand([
      "reconcile",
      "--event-revision",
      unknownPush.landing,
      "--repository",
      "amadeus-dlc/amadeus",
    ], {
      repositoryRoot: unknownPush.root,
      runner: hybridRunner(unknownPush, {
        failPush: true,
        remoteTips: [unknownPush.landing, unknownPush.landing, "unavailable"],
      }),
    });
    expect(unknownResult).toMatchObject({ status: "error", code: "REBIND_PUSH_OUTCOME_UNKNOWN" });
    expect(unknownResult.error?.message).toContain("reconcile commit retained");
    expect(unknownResult.error?.message).toContain("verify origin/main before retrying from the event revision");
    expect(reconcilePaths.map((path) => readFileSync(join(unknownPush.root, path)))).not.toEqual(unknownOriginal);
    expect(must(unknownPush.root, ["git", "rev-parse", "HEAD^"])).toBe(unknownPush.landing);
    expect(must(unknownPush.root, ["git", "diff", "--name-only", `${unknownPush.landing}..HEAD`]).split("\n").sort())
      .toEqual([...reconcilePaths].sort());
    expect(command(unknownPush.root, ["git", "status", "--porcelain=v1"]).stdout).toBe("");
    expect(must(unknownPush.root, ["git", "ls-remote", "--heads", "origin", "refs/heads/main"]).split(/\s+/)[0]).toBe(unknownPush.landing);
  });

  test("reports a committed rollback failure after a pre-push error", () => {
    const fixture = squashFixture();
    const result = runEvidenceCommand([
      "reconcile",
      "--event-revision",
      fixture.landing,
      "--repository",
      "amadeus-dlc/amadeus",
    ], {
      repositoryRoot: fixture.root,
      runner: hybridRunner(fixture, {
        remoteTips: [fixture.landing, "unavailable"],
        failRollback: true,
      }),
    });
    expect(result).toMatchObject({ status: "error", code: "REBIND_ROLLBACK_FAILED" });
    expect(result.error?.message).toContain("committed rollback failed");
    expect(result.error?.message).toContain("rollback rejected");
    expect(must(fixture.root, ["git", "rev-parse", "HEAD^"])).toBe(fixture.landing);
    expect(command(fixture.root, ["git", "status", "--porcelain=v1"]).stdout).toBe("");
    expect(must(fixture.root, ["git", "ls-remote", "--heads", "origin", "refs/heads/main"]).split(/\s+/)[0]).toBe(fixture.landing);
  });

  test("reports supersession after commit and after a rejected push", () => {
    const afterCommit = squashFixture();
    const reconcilePaths = [...EVIDENCE_BUNDLE_PATHS];
    const afterCommitOriginal = reconcilePaths.map((path) => readFileSync(join(afterCommit.root, path)));
    const afterCommitResult = runEvidenceCommand([
      "reconcile",
      "--event-revision",
      afterCommit.landing,
      "--repository",
      "amadeus-dlc/amadeus",
    ], {
      repositoryRoot: afterCommit.root,
      runner: hybridRunner(afterCommit, { remoteTips: [afterCommit.landing, "d".repeat(40)] }),
    });
    expect(afterCommitResult).toMatchObject({ status: "superseded", code: "REBIND_SUPERSEDED" });
    expect(reconcilePaths.map((path) => readFileSync(join(afterCommit.root, path)))).toEqual(afterCommitOriginal);
    expect(must(afterCommit.root, ["git", "rev-parse", "HEAD"])).toBe(afterCommit.landing);
    expect(command(afterCommit.root, ["git", "status", "--porcelain=v1"]).stdout).toBe("");

    const afterPush = squashFixture();
    const afterPushOriginal = reconcilePaths.map((path) => readFileSync(join(afterPush.root, path)));
    const afterPushResult = runEvidenceCommand([
      "reconcile",
      "--event-revision",
      afterPush.landing,
      "--repository",
      "amadeus-dlc/amadeus",
    ], {
      repositoryRoot: afterPush.root,
      runner: hybridRunner(afterPush, {
        failPush: true,
        remoteTips: [afterPush.landing, afterPush.landing, "d".repeat(40)],
      }),
    });
    expect(afterPushResult).toMatchObject({ status: "superseded", code: "REBIND_SUPERSEDED" });
    expect(reconcilePaths.map((path) => readFileSync(join(afterPush.root, path)))).toEqual(afterPushOriginal);
    expect(must(afterPush.root, ["git", "rev-parse", "HEAD"])).toBe(afterPush.landing);
    expect(command(afterPush.root, ["git", "status", "--porcelain=v1"]).stdout).toBe("");
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
