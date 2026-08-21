// covers: subcommand:amadeus-swarm:check, function:ignoredStatusPaths, function:ancestorDirsOf, function:ignoredTerritoryRoots
// size: medium
//
// Issue #746: after #670/#727, `amadeus-worktree create` anchors a Bolt worktree
// at the MAIN checkout when run from a sibling dev worktree, but the read-side
// consumers (`amadeus-swarm verdictFor` and every raw `worktreePath(projectDir,
// slug)` caller) still re-derived the path under projectDir — so a sibling swarm
// pipeline lost the worktree that create produced. The fix promotes the anchor
// resolver into `amadeus-lib` and makes `worktreePath` apply it, so read and write
// agree on one location.
//
// Two arms:
//   - PURE SEAM: `resolveWorktreeBaseDir` is exercised in-process so coverage sees
//     both the anchored (sibling single-repo) and the pass-through (main checkout /
//     null probe / multi-repo mismatch) branches without spawning git.
//   - ORIGIN REPRO (verbatim #746): a real clone + sibling dev worktree, `create`
//     spawned from the sibling (anchors at main), then the main reader `swarm check`
//     spawned from the same sibling must resolve the SAME anchored path. Red before
//     the fix ("no worktree for unit"), green after.
//
// No test changes process.cwd(); each spawned tool runs with cwd pinned to the
// fixture, and a failed git setup throws immediately so a command can never
// continue in an unintended repository.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { resolveWorktreeBaseDir } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  ancestorDirsOf,
  classifySourcePaths,
  gitRunDetail,
  handleCreate,
  ignoredStatusPaths,
  ignoredTerritoryRoots,
  handleDiscard,
  handleList,
  handleMerge,
  isSelfInstallLeaf,
  resolveSelfInstallRoot,
} from "../../packages/framework/core/tools/amadeus-worktree.ts";
import {
  REPO_ROOT,
  seededAuditDir,
  seededStateFile,
  seedWorkspaceShell,
  shouldRetryWorktreeAdd,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

describe("t209 worktreeBaseDir anchor rule (#746) — pure seam", () => {
  test("sibling worktree of a legacy single-repo intent anchors at the main checkout", () => {
    const here = {
      cwdTop: "/repo/.claude/worktrees/dev-x",
      mainCheckout: "/repo",
    };
    const pdRepo = {
      cwdTop: "/repo/.claude/worktrees/dev-x",
      mainCheckout: "/repo",
    };
    expect(
      resolveWorktreeBaseDir("/repo/.claude/worktrees/dev-x", here, pdRepo),
    ).toBe("/repo");
  });

  test("main-checkout session keeps projectDir (byte-identical)", () => {
    const here = { cwdTop: "/repo", mainCheckout: "/repo" };
    const pdRepo = { cwdTop: "/repo", mainCheckout: "/repo" };
    expect(resolveWorktreeBaseDir("/repo", here, pdRepo)).toBe("/repo");
  });

  test("outside a git repo (null probe) keeps projectDir", () => {
    expect(resolveWorktreeBaseDir("/some/roof", null, null)).toBe("/some/roof");
  });

  test("multi-repo roof under a foreign worktree does NOT anchor (main-checkout mismatch)", () => {
    // The session sits in a sibling dev worktree of the DEV repo, but the
    // projectDir is a workspace roof whose own repo is a DIFFERENT checkout →
    // legacySingleRepo is false, so the roof anchor is kept (no false anchor).
    const here = { cwdTop: "/dev/.claude/worktrees/agent", mainCheckout: "/dev" };
    const pdRepo = { cwdTop: "/other", mainCheckout: "/other" };
    expect(resolveWorktreeBaseDir("/workspace-roof", here, pdRepo)).toBe(
      "/workspace-roof",
    );
  });
});

const BUN = process.execPath;
const WORKTREE_TOOL = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-worktree.ts",
);
const SWARM_TOOL = join(
  REPO_ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-swarm.ts",
);

interface SiblingScratch {
  root: string;
  clone: string;
  sibling: string;
}

let scratch: SiblingScratch;

function git(cwd: string, args: string[]): string {
  const run = () => spawnSync("git", args, { cwd, encoding: "utf-8" });
  let result = run();
  // Narrow retry (#3088): a `worktree add` can lose a sub-millisecond race
  // against a concurrent prune/gc that deletes its still-empty metadata dir
  // before the `locked` marker is written. See shouldRetryWorktreeAdd.
  if (result.status !== 0 && shouldRetryWorktreeAdd(args, result.stderr ?? "")) {
    result = run();
  }
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed in ${cwd}: ${result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`}`,
    );
  }
  return (result.stdout ?? "").trim();
}

// origin bare <- publisher -> clone (main checkout) -> sibling dev worktree
function makeSiblingScratch(): SiblingScratch {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t209-"));
  const origin = join(root, "origin.git");
  const publisher = join(root, "publisher");
  const clone = join(root, "clone");
  const sibling = join(clone, ".claude", "worktrees", "dev-x");
  try {
    git(root, ["init", "-q", "--bare", "--initial-branch=main", origin]);
    git(root, ["init", "-q", "--initial-branch=main", publisher]);
    git(publisher, ["config", "user.email", "t209@example.com"]);
    git(publisher, ["config", "user.name", "t209"]);
    writeFileSync(join(publisher, "README.md"), "initial\n", "utf-8");
    git(publisher, ["add", "README.md"]);
    git(publisher, ["commit", "-q", "-m", "initial"]);
    git(publisher, ["remote", "add", "origin", origin]);
    git(publisher, ["push", "-q", "-u", "origin", "main"]);
    git(root, ["clone", "-q", origin, clone]);
    // A sibling dev worktree of the clone — the supported #670 conductor context.
    git(clone, ["worktree", "add", "-q", "-b", "dev-x", sibling, "main"]);
    // Both the projectDir (sibling) and the main checkout carry a workspace shell
    // so `create` reads state on the sibling and lands the worktree under main.
    seedWorkspaceShell(clone);
    writeFileSync(
      seededStateFile(clone),
      "- **Current Stage**: code-generation\n",
      "utf-8",
    );
    seedWorkspaceShell(sibling);
    writeFileSync(
      seededStateFile(sibling),
      "- **Current Stage**: code-generation\n",
      "utf-8",
    );
    return { root, clone, sibling };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

beforeEach(() => {
  scratch = makeSiblingScratch();
});

afterEach(() => {
  rmSync(scratch.root, { recursive: true, force: true });
  // The write handlers bootstrap OTel for the scratch clone on their audit
  // emit; the per-process one-workspace invariant must be dropped before the
  // next test mints a different scratch clone.
  resetOtelPerProject();
});

describe("t209 sibling swarm pipeline resolves the anchored worktree (#746)", () => {
  test("create from a sibling anchors at main, and swarm check from the sibling finds it", () => {
    const create = spawnSync(
      BUN,
      [
        WORKTREE_TOOL,
        "create",
        "--slug",
        "u1",
        "--base",
        "main",
        "--project-dir",
        scratch.sibling,
      ],
      { cwd: scratch.sibling, encoding: "utf-8" },
    );
    expect(create.status).toBe(0);

    const mainAnchored = join(
      scratch.clone,
      ".amadeus",
      "worktrees",
      "bolt-u1",
    );
    const siblingLocal = join(
      scratch.sibling,
      ".amadeus",
      "worktrees",
      "bolt-u1",
    );
    // create anchored the Bolt worktree at the MAIN checkout (#727), never under
    // the sibling projectDir.
    expect(existsSync(mainAnchored)).toBe(true);
    expect(existsSync(siblingLocal)).toBe(false);

    // The main reader (swarm verdictFor) runs from the SAME sibling session. Before
    // the fix it re-derived the path under the sibling and reported "no worktree";
    // after the fix it resolves the anchored main path and converges.
    const check = spawnSync(
      BUN,
      [
        SWARM_TOOL,
        "check",
        "u1",
        "--check-cmd",
        "true",
        "--project-dir",
        scratch.sibling,
      ],
      { cwd: scratch.sibling, encoding: "utf-8" },
    );
    const output = `${check.stdout ?? ""}${check.stderr ?? ""}`;
    expect(output).not.toContain("no worktree for unit");
    expect(check.status).toBe(0);
    expect(JSON.parse(check.stdout ?? "{}")).toMatchObject({
      unit: "u1",
      converged: true,
    });
  });
});

// In-process seam for the WRITE handlers (norm: spawn-blindspot-seam-export).
// The spawned origin repro above exercises the same call sites, but bun
// --coverage cannot measure spawned subprocesses, so the #746 anchor call
// sites inside handleMerge / handleDiscard / handleList would land uncovered.
// These tests drive the exported handlers directly against the same fixture.
function captureStdout(fn: () => void): string {
  const orig = console.log;
  let buf = "";
  console.log = (...args: unknown[]) => {
    buf += `${args.join(" ")}\n`;
  };
  try {
    fn();
  } finally {
    console.log = orig;
  }
  return buf;
}

describe("t209 write-handler seam: merge/discard/list resolve the same anchor (#746)", () => {
  test("merge squashes a Bolt worktree back onto the target from the main checkout", () => {
    captureStdout(() =>
      handleCreate(["--slug", "seam-m", "--base", "main"], scratch.clone),
    );
    const wt = join(scratch.clone, ".amadeus", "worktrees", "bolt-seam-m");
    expect(existsSync(wt)).toBe(true);
    git(wt, ["config", "user.email", "t209@example.com"]);
    git(wt, ["config", "user.name", "t209"]);
    writeFileSync(join(wt, "seam.txt"), "seam\n", "utf-8");
    git(wt, ["add", "seam.txt"]);
    git(wt, ["commit", "-q", "-m", "seam change"]);

    captureStdout(() =>
      handleMerge(
        [
          "--slug",
          "seam-m",
          "--target",
          "main",
          "--strategy",
          "squash",
          "--message",
          "seam squash",
        ],
        scratch.clone,
      ),
    );
    expect(git(scratch.clone, ["log", "-1", "--format=%s"])).toBe("seam squash");
  });

  test("discard of an unknown slug reports already-discarded without mutating git", () => {
    const out = captureStdout(() =>
      handleDiscard(["--slug", "seam-none"], scratch.clone),
    );
    expect(out).toContain("already-discarded");
  });

  test("list filters to bolt worktrees under the anchored base dir", () => {
    const out = captureStdout(() => handleList([], scratch.clone));
    const parsed = JSON.parse(out.trim()) as { worktrees: unknown[] };
    expect(Array.isArray(parsed.worktrees)).toBe(true);
  });
});

// --- #3197 merge source hygiene: the preflight classification and its ------
// --- rejection arms, driven in-process (bun coverage cannot measure ---------
// --- spawned CLI runs) -------------------------------------------------------

/** Drive a rejection path in-process: process.exit throws, stderr is captured. */
function captureRejection(fn: () => void): { message: string; exitCode: number } {
  const originalExit = process.exit;
  const originalError = console.error;
  let message = "";
  let exitCode = -1;
  process.exit = ((code?: number) => {
    exitCode = code ?? 0;
    throw new Error(`exit ${exitCode}`);
  }) as typeof process.exit;
  console.error = (value: unknown) => {
    message = String(value);
  };
  try {
    fn();
  } catch (cause) {
    if (!(cause instanceof Error && cause.message === `exit ${exitCode}`)) throw cause;
  } finally {
    process.exit = originalExit;
    console.error = originalError;
  }
  return { message, exitCode };
}

const MANAGED = {
  state: "amadeus/spaces/default/intents/rec/amadeus-state.md",
  runtimeGraph: "amadeus/spaces/default/intents/rec/runtime-graph.json",
  auditDir: "amadeus/spaces/default/intents/rec/audit",
  scratchPrefix: "amadeus/spaces/default/intents/rec/.amadeus-",
};

/** Commit on the scratch clone with an explicit identity (CI has no global one). */
function cloneCommit(cwd: string, message: string): void {
  git(cwd, [
    "-c",
    "user.email=t209@example.com",
    "-c",
    "user.name=t209",
    "commit",
    "-q",
    "-m",
    message,
  ]);
}

describe("t209 source classification (#3197) — pure seam", () => {
  test("gitRunDetail prefers stderr, then stdout, then the exit code", () => {
    expect(gitRunDetail({ ok: false, stdout: "out", stderr: " err ", code: 1 })).toBe("err");
    expect(gitRunDetail({ ok: false, stdout: " out ", stderr: "", code: 1 })).toBe("out");
    expect(gitRunDetail({ ok: false, stdout: "", stderr: "", code: 128 })).toBe("exit 128");
  });

  test("classifySourcePaths: wholly-ignored dirs are disposable, unknown ignored files block", () => {
    const porcelain = ["!! dist/", "!! notes.draft", ""].join("\0");
    expect(classifySourcePaths(porcelain, MANAGED)).toEqual({
      blocking: ["notes.draft"],
      disposable: ["dist/"],
    });
  });

  test("classifySourcePaths: a self-install leaf is disposable, other ignored files block", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-t209-install-"));
    try {
      const installRoot = join(root, ".claude");
      mkdirSync(join(installRoot, "tools"), { recursive: true });
      writeFileSync(join(installRoot, "tools", "amadeus-worktree.ts"), "// installed\n");
      const porcelain = ["!! .claude/tools/amadeus-worktree.ts", "!! .claude/nope.txt", ""].join(
        "\0",
      );
      expect(classifySourcePaths(porcelain, MANAGED, installRoot)).toEqual({
        blocking: [".claude/nope.txt"],
        disposable: [".claude/tools/amadeus-worktree.ts"],
      });
      // Without a resolved install root every ignored file blocks (fail closed).
      expect(classifySourcePaths(porcelain, MANAGED, null)).toEqual({
        blocking: [".claude/tools/amadeus-worktree.ts", ".claude/nope.txt"],
        disposable: [],
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // #3391: `git status --ignored=matching` only collapses a wholly-ignored
  // directory to `!! dir/` when the DIRECTORY itself matches a pattern. A
  // contents-only rule (`/dist/**`) leaves git naming each file, and before
  // the territory seam those files read as hand-authored source — so every
  // Bolt merge failed on any machine without a `dist/` global excludes rule.
  // These cases pin both shapes to the same classification without depending
  // on the ambient git config the e2e path is at the mercy of.
  test("classifySourcePaths: an ignored file inside generated territory is disposable by its root", () => {
    const porcelain = [
      "!! dist/generated.js",
      "!! node_modules/example/",
      "!! packages/setup/dist/cli.js",
      "!! notes.draft",
      "",
    ].join("\0");
    const territory = new Map([
      ["dist/generated.js", "dist"],
      ["node_modules/example/", "node_modules"],
      ["packages/setup/dist/cli.js", "packages/setup/dist"],
    ]);
    expect(
      classifySourcePaths(porcelain, MANAGED, null, (path) => territory.get(path) ?? null),
    ).toEqual({
      blocking: ["notes.draft"],
      disposable: ["dist", "node_modules", "packages/setup/dist"],
    });
  });

  // The two-probe territory check is only load-bearing if its refusal survives
  // the next line. `!! dir/` is a RENDERING, not a verdict: git 2.55 collapses a
  // directory whose contents are all ignored even when the rules name two exact
  // files, so a directory swallowing exactly those two looks identical to one
  // under a blanket rule. Falling back to the shape there would delete source
  // the probe had just refused to call generated.
  test("classifySourcePaths: a resolver's refusal outranks git's collapsed-directory shape", () => {
    const porcelain = ["!! dist/", "!! notes.draft", ""].join("\0");
    expect(classifySourcePaths(porcelain, MANAGED, null, () => null)).toEqual({
      blocking: ["dist/", "notes.draft"],
      disposable: [],
    });
    // With no resolver supplied the seam keeps its prior default, so callers
    // that ask no question are unaffected.
    expect(classifySourcePaths(porcelain, MANAGED, null)).toEqual({
      blocking: ["notes.draft"],
      disposable: ["dist/"],
    });
  });

  test("classifySourcePaths: a resolved territory root collapses sibling entries to one pathspec", () => {
    const porcelain = ["!! dist/a.js", "!! dist/nested/b.js", ""].join("\0");
    expect(classifySourcePaths(porcelain, MANAGED, null, () => "dist")).toEqual({
      blocking: [],
      disposable: ["dist"],
    });
  });

  test("ignoredStatusPaths reads only the ignored records of a NUL-separated status", () => {
    const porcelain = ["?? new.ts", "!! dist/generated.js", "M  tracked.ts", "!! dist/", ""].join(
      "\0",
    );
    expect(ignoredStatusPaths(porcelain)).toEqual(["dist/generated.js", "dist/"]);
  });

  // Real-git fixture: the territory probe must not classify a directory as
  // generated output when the ignore rule matches only the probe's own literal
  // name (or one probe's stem) — only a rule broad enough to swallow BOTH
  // dissimilar probe names (`dir/**`, `dir/*`) counts. Uses a throwaway repo so
  // the verdict comes from git itself, independent of ambient git config.
  test("ignoredTerritoryRoots: a probe-name-only ignore rule does not create territory", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-t209-probe-"));
    // Isolate from ambient git config: a developer-machine global excludes
    // rule like `dist/` would legitimately make dist territory (status and
    // check-ignore read the same config — that self-consistency IS the fix),
    // but this case must exercise exactly the rules the fixture writes.
    const saved = {
      GIT_CONFIG_GLOBAL: process.env.GIT_CONFIG_GLOBAL,
      GIT_CONFIG_SYSTEM: process.env.GIT_CONFIG_SYSTEM,
      GIT_CONFIG_NOSYSTEM: process.env.GIT_CONFIG_NOSYSTEM,
      HOME: process.env.HOME,
      XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
    };
    process.env.GIT_CONFIG_GLOBAL = "/dev/null";
    process.env.GIT_CONFIG_SYSTEM = "/dev/null";
    process.env.GIT_CONFIG_NOSYSTEM = "1";
    // GIT_CONFIG_GLOBAL does not disable the DEFAULT excludes file
    // (~/.config/git/ignore); pointing HOME/XDG at the empty fixture does.
    process.env.HOME = root;
    process.env.XDG_CONFIG_HOME = join(root, ".xdg");
    try {
      git(root, ["init", "-q", "--initial-branch=main", root]);
      mkdirSync(join(root, "dist"), { recursive: true });
      mkdirSync(join(root, "out"), { recursive: true });
      writeFileSync(
        join(root, ".gitignore"),
        // out/** genuinely swallows any name; the dist rules name only the
        // probe literal and the first probe's stem, so dist must stay blocking.
        ["/out/**", "/dist/amadeus-worktree-ignore-probe", "/dist/amadeus-*", ""].join("\n"),
      );
      writeFileSync(join(root, "dist", "generated.js"), "");
      writeFileSync(join(root, "out", "bundle.js"), "");
      const roots = ignoredTerritoryRoots(
        root,
        ["dist/generated.js", "out/bundle.js"],
        "t209",
        "",
      );
      expect(roots.get("out/bundle.js")).toBe("out");
      expect(roots.has("dist/generated.js")).toBe(false);

      // Root-level fail-closed: once a probe name is ignored at the worktree
      // root, no directory is distinguishable from that blanket rule — nothing
      // is territory, not even out/ which qualified above.
      writeFileSync(
        join(root, ".gitignore"),
        ["/out/**", "amadeus-worktree-ignore-probe", ""].join("\n"),
      );
      const blanket = ignoredTerritoryRoots(root, ["out/bundle.js"], "t209", "");
      expect(blanket.size).toBe(0);
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("ancestorDirsOf lists dirs shallowest-first, excluding the root and the file name", () => {
    expect(ancestorDirsOf("packages/setup/dist/cli.js")).toEqual(["packages", "packages/setup", "packages/setup/dist"]);
    // A trailing-slash record names a directory, so it is its own last ancestor.
    expect(ancestorDirsOf("node_modules/example/")).toEqual(["node_modules", "node_modules/example"]);
    expect(ancestorDirsOf("notes.draft")).toEqual([]);
  });

  test("classifySourcePaths: untracked, staged, and malformed records block", () => {
    const porcelain = ["?? new.ts", "M  tracked.ts", "M\x00", ""].join("\0");
    const result = classifySourcePaths(porcelain, MANAGED);
    expect(result.blocking).toEqual(["new.ts", "tracked.ts", "<malformed-git-status>"]);
    expect(result.disposable).toEqual([]);
  });

  test("classifySourcePaths: a rename record without its origin path is malformed", () => {
    expect(classifySourcePaths("R  new-name.ts\0", MANAGED)).toEqual({
      blocking: ["<malformed-git-status>", "new-name.ts"],
      disposable: [],
    });
  });

  test("classifySourcePaths: rename records consume the origin path; managed paths skip", () => {
    const porcelain = [
      "R  new-name.ts",
      "old-name.ts",
      "!! amadeus/spaces/default/intents/rec/audit/",
      "M  amadeus/spaces/default/intents/rec/amadeus-state.md",
      "",
    ].join("\0");
    expect(classifySourcePaths(porcelain, MANAGED)).toEqual({
      blocking: ["new-name.ts", "old-name.ts"],
      disposable: [],
    });
  });

  test("isSelfInstallLeaf requires the harness dir prefix and an installed counterpart", () => {
    const root = mkdtempSync(join(tmpdir(), "amadeus-t209-leaf-"));
    try {
      const installRoot = join(root, ".claude");
      mkdirSync(join(installRoot, "tools"), { recursive: true });
      writeFileSync(join(installRoot, "tools", "amadeus-worktree.ts"), "// installed\n");
      expect(isSelfInstallLeaf(".claude/tools/amadeus-worktree.ts", installRoot)).toBe(true);
      expect(isSelfInstallLeaf(".claude/does-not-exist.txt", installRoot)).toBe(false);
      expect(isSelfInstallLeaf("other/tools/amadeus-worktree.ts", installRoot)).toBe(false);
      expect(isSelfInstallLeaf(".claude", installRoot)).toBe(false);
      expect(isSelfInstallLeaf(".claude/tools/amadeus-worktree.ts", null)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("resolveSelfInstallRoot accepts only a harness-shaped <root>/<.harness>/tools module dir", () => {
    expect(resolveSelfInstallRoot("/ws/.claude/tools")).toBe("/ws/.claude");
    expect(resolveSelfInstallRoot("/ws/.cursor/tools")).toBe("/ws/.cursor");
    // A source-tree import runs from packages/framework/core/tools — "core"
    // is not a harness dir, so there is no install root (fail closed).
    expect(resolveSelfInstallRoot("/repo/packages/framework/core/tools")).toBeNull();
    expect(resolveSelfInstallRoot("/ws/.claude/hooks")).toBeNull();
  });
});

describe("t209 merge source hygiene (#3197) — handler seam", () => {
  test("merge rejects a worktree with uncommitted source before any mutation", () => {
    captureStdout(() =>
      handleCreate(["--slug", "seam-dirty", "--base", "main"], scratch.clone),
    );
    const wt = join(scratch.clone, ".amadeus", "worktrees", "bolt-seam-dirty");
    writeFileSync(join(wt, "dirty.txt"), "uncommitted\n", "utf-8");
    const headBefore = git(scratch.clone, ["rev-parse", "HEAD"]);

    const rejection = captureRejection(() =>
      handleMerge(
        ["--slug", "seam-dirty", "--target", "main", "--strategy", "squash"],
        scratch.clone,
      ),
    );
    expect(rejection.exitCode).toBe(1);
    expect(rejection.message).toContain("uncommitted");
    expect(rejection.message).toContain("dirty.txt");
    expect(git(scratch.clone, ["rev-parse", "HEAD"])).toBe(headBefore);
    expect(existsSync(wt)).toBe(true);
  });

  test("merge rejects a target checkout with staged changes", () => {
    captureStdout(() =>
      handleCreate(["--slug", "seam-staged", "--base", "main"], scratch.clone),
    );
    const wt = join(scratch.clone, ".amadeus", "worktrees", "bolt-seam-staged");
    git(wt, ["config", "user.email", "t209@example.com"]);
    git(wt, ["config", "user.name", "t209"]);
    writeFileSync(join(wt, "staged-src.txt"), "committed\n", "utf-8");
    git(wt, ["add", "staged-src.txt"]);
    git(wt, ["commit", "-q", "-m", "worker source"]);
    writeFileSync(join(scratch.clone, "staged-target.txt"), "staged\n", "utf-8");
    git(scratch.clone, ["add", "staged-target.txt"]);

    const rejection = captureRejection(() =>
      handleMerge(
        ["--slug", "seam-staged", "--target", "main", "--strategy", "squash"],
        scratch.clone,
      ),
    );
    expect(rejection.exitCode).toBe(1);
    expect(rejection.message).toContain("staged changes");
    expect(rejection.message).toContain("staged-target.txt");
    git(scratch.clone, ["reset", "-q", "HEAD", "--", "staged-target.txt"]);
  });

  test("merge cleans wholly-ignored output roots by exact path before non-force removal", () => {
    writeFileSync(join(scratch.clone, ".gitignore"), "/gen-out/\n", "utf-8");
    git(scratch.clone, ["add", ".gitignore"]);
    cloneCommit(scratch.clone, "ignore generated output");
    // Keep origin/main in step so create's stale-base guard sees a fresh base.
    git(scratch.clone, ["push", "-q", "origin", "main"]);
    captureStdout(() =>
      handleCreate(["--slug", "seam-gen", "--base", "main"], scratch.clone),
    );
    const wt = join(scratch.clone, ".amadeus", "worktrees", "bolt-seam-gen");
    git(wt, ["config", "user.email", "t209@example.com"]);
    git(wt, ["config", "user.name", "t209"]);
    writeFileSync(join(wt, "gen-src.txt"), "committed\n", "utf-8");
    git(wt, ["add", "gen-src.txt"]);
    git(wt, ["commit", "-q", "-m", "worker source"]);
    mkdirSync(join(wt, "gen-out"), { recursive: true });
    writeFileSync(join(wt, "gen-out", "generated.js"), "generated\n", "utf-8");

    const out = captureStdout(() =>
      handleMerge(
        ["--slug", "seam-gen", "--target", "main", "--strategy", "squash"],
        scratch.clone,
      ),
    );
    expect(out).toContain("WORKTREE_MERGED");
    expect(readFileSync(join(scratch.clone, "gen-src.txt"), "utf-8")).toBe("committed\n");
    expect(existsSync(wt)).toBe(false);
  });

  /** Commit the seeded record so a fresh worktree TRACKS the managed paths. */
  function commitSeededRecord(): void {
    git(scratch.clone, ["add", "-A", "--", "amadeus"]);
    cloneCommit(scratch.clone, "seed tracked record");
    git(scratch.clone, ["push", "-q", "origin", "main"]);
  }

  function commitWorkerSource(wt: string, name: string): void {
    git(wt, ["config", "user.email", "t209@example.com"]);
    git(wt, ["config", "user.name", "t209"]);
    writeFileSync(join(wt, name), "committed\n", "utf-8");
    git(wt, ["add", "--", name]);
    git(wt, ["commit", "-q", "-m", "worker source"]);
  }

  test("merge fails loudly when the disposable source cleanup cannot remove", () => {
    writeFileSync(join(scratch.clone, ".gitignore"), "/gen-out/\n", "utf-8");
    git(scratch.clone, ["add", ".gitignore"]);
    cloneCommit(scratch.clone, "ignore generated output");
    git(scratch.clone, ["push", "-q", "origin", "main"]);
    captureStdout(() =>
      handleCreate(["--slug", "seam-genfail", "--base", "main"], scratch.clone),
    );
    const wt = join(scratch.clone, ".amadeus", "worktrees", "bolt-seam-genfail");
    commitWorkerSource(wt, "genfail-src.txt");
    // An unremovable entry under the wholly-ignored output root.
    const locked = join(wt, "gen-out", "locked");
    mkdirSync(locked, { recursive: true });
    writeFileSync(join(locked, "generated.js"), "generated\n", "utf-8");
    chmodSync(locked, 0o555);
    try {
      const rejection = captureRejection(() =>
        handleMerge(
          ["--slug", "seam-genfail", "--target", "main", "--strategy", "squash"],
          scratch.clone,
        ),
      );
      expect(rejection.exitCode).toBe(1);
      expect(rejection.message).toContain("disposable source cleanup failed");
    } finally {
      chmodSync(locked, 0o755);
    }
  });

  test("merge fails loudly when the source worktree status cannot be inspected", () => {
    captureStdout(() =>
      handleCreate(["--slug", "seam-nogit", "--base", "main"], scratch.clone),
    );
    const wt = join(scratch.clone, ".amadeus", "worktrees", "bolt-seam-nogit");
    // A corrupted gitfile makes every git command in the worktree fail; the
    // preflight inspect is the first one handleMerge runs.
    writeFileSync(join(wt, ".git"), "gitdir: /nonexistent\n", "utf-8");
    const rejection = captureRejection(() =>
      handleMerge(
        ["--slug", "seam-nogit", "--target", "main", "--strategy", "squash"],
        scratch.clone,
      ),
    );
    expect(rejection.exitCode).toBe(1);
    expect(rejection.message).toContain("could not inspect source worktree status");
  });

  test("merge fails loudly when the target index cannot be inspected", () => {
    captureStdout(() =>
      handleCreate(["--slug", "seam-badix", "--base", "main"], scratch.clone),
    );
    const wt = join(scratch.clone, ".amadeus", "worktrees", "bolt-seam-badix");
    commitWorkerSource(wt, "badix-src.txt");
    // A corrupt main-checkout index fails `git diff --cached` with a fatal
    // exit (not the staged-changes 1); the worktree keeps its own index, so
    // the source preflight still passes and the target arm is what rejects.
    writeFileSync(join(scratch.clone, ".git", "index"), "garbage\n", "utf-8");
    const rejection = captureRejection(() =>
      handleMerge(
        ["--slug", "seam-badix", "--target", "main", "--strategy", "squash"],
        scratch.clone,
      ),
    );
    expect(rejection.exitCode).toBe(1);
    expect(rejection.message).toContain("could not inspect staged target changes");
  });

  test("merge fails loudly when the managed record root cannot be enumerated", () => {
    captureStdout(() =>
      handleCreate(["--slug", "seam-noread", "--base", "main"], scratch.clone),
    );
    const wt = join(scratch.clone, ".amadeus", "worktrees", "bolt-seam-noread");
    commitWorkerSource(wt, "noread-src.txt");
    // git status silently skips an unreadable untracked dir (exit 0, empty
    // porcelain), so the preflight passes and the post-merge scratch
    // enumeration is what throws.
    const recordRoot = dirname(seededStateFile(wt));
    mkdirSync(join(recordRoot, "audit"), { recursive: true });
    chmodSync(recordRoot, 0o000);
    try {
      const rejection = captureRejection(() =>
        handleMerge(
          ["--slug", "seam-noread", "--target", "main", "--strategy", "squash"],
          scratch.clone,
        ),
      );
      expect(rejection.exitCode).toBe(1);
      expect(rejection.message).toContain("could not enumerate managed worktree metadata");
    } finally {
      chmodSync(recordRoot, 0o755);
    }
  });

  test("merge restores tracked managed metadata to HEAD instead of carrying its drift", () => {
    commitSeededRecord();
    captureStdout(() =>
      handleCreate(["--slug", "seam-track", "--base", "main"], scratch.clone),
    );
    const wt = join(scratch.clone, ".amadeus", "worktrees", "bolt-seam-track");
    commitWorkerSource(wt, "track-src.txt");
    // The state fork already rewrote the tracked file; make the drift explicit.
    writeFileSync(seededStateFile(wt), "- **Current Stage**: code-generation\ndrift\n", "utf-8");

    const out = captureStdout(() =>
      handleMerge(
        ["--slug", "seam-track", "--target", "main", "--strategy", "squash"],
        scratch.clone,
      ),
    );
    expect(out).toContain("WORKTREE_MERGED");
    // The squash commit carries only worker source — managed drift was restored.
    expect(git(scratch.clone, ["show", "--name-only", "--format=", "HEAD"])).toBe("track-src.txt");
    expect(existsSync(wt)).toBe(false);
  });

  test("merge fails loudly when the managed metadata restore cannot write", () => {
    commitSeededRecord();
    captureStdout(() =>
      handleCreate(["--slug", "seam-rofail", "--base", "main"], scratch.clone),
    );
    const wt = join(scratch.clone, ".amadeus", "worktrees", "bolt-seam-rofail");
    commitWorkerSource(wt, "rofail-src.txt");
    const stateFile = seededStateFile(wt);
    writeFileSync(stateFile, "- **Current Stage**: code-generation\ndrift\n", "utf-8");
    const recordDir = dirname(stateFile);
    chmodSync(stateFile, 0o444);
    chmodSync(recordDir, 0o555);
    try {
      const rejection = captureRejection(() =>
        handleMerge(
          ["--slug", "seam-rofail", "--target", "main", "--strategy", "squash"],
          scratch.clone,
        ),
      );
      expect(rejection.exitCode).toBe(1);
      expect(rejection.message).toContain("managed metadata restore failed");
    } finally {
      chmodSync(recordDir, 0o755);
      chmodSync(stateFile, 0o644);
    }
  });

  test("merge fails loudly when the managed metadata cleanup cannot remove", () => {
    captureStdout(() =>
      handleCreate(["--slug", "seam-clfail", "--base", "main"], scratch.clone),
    );
    const wt = join(scratch.clone, ".amadeus", "worktrees", "bolt-seam-clfail");
    commitWorkerSource(wt, "clfail-src.txt");
    // An unremovable entry under the audit dir: a file inside a read-only dir.
    const locked = join(seededAuditDir(wt), "locked");
    mkdirSync(locked, { recursive: true });
    writeFileSync(join(locked, "inner.jsonl"), "{}\n", "utf-8");
    chmodSync(locked, 0o555);
    try {
      const rejection = captureRejection(() =>
        handleMerge(
          ["--slug", "seam-clfail", "--target", "main", "--strategy", "squash"],
          scratch.clone,
        ),
      );
      expect(rejection.exitCode).toBe(1);
      expect(rejection.message).toContain("managed metadata cleanup failed");
    } finally {
      chmodSync(locked, 0o755);
    }
  });
});
