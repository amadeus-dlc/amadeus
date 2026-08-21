// t3413 — the measured reproduction of #3413 and the proof that the seam closes
// it, driven through the real chain: a commit made from a LINKED WORKTREE, the
// pre-commit hook git starts for it, and a fixture-shaped git call inside that
// hook.
//
// WHAT #3413 IS. git exports an absolute GIT_DIR and GIT_INDEX_FILE into hook
// processes started from a linked worktree. Both outrank `cwd:` and `-C <dir>`,
// so a fixture that names an explicit scratch directory on every single
// invocation — which is how every git-using test in this repository is already
// written — still reaches the real repository:
//   GIT_DIR        -> `git -C <scratch> config ...` writes the REAL shared config
//   GIT_INDEX_FILE -> `git -C <scratch> add ...`    stages into the REAL index,
//                     so the in-flight commit records a foreign tree
// and a `git commit` inside the hook's own test run re-enters the same hook.
//
// The two vectors are INDEPENDENT: the `index-only` arm below removes GIT_DIR
// and shows GIT_INDEX_FILE alone still corrupts the commit. Removing the whole
// binding — not pinning GIT_CONFIG_* — is the fix; the config pinning is
// auxiliary hardening for host state.
//
// WHAT IS REAL HERE. Every repository in this file is a throwaway built under
// the OS temp dir; the "real" repository whose pollution is asserted is a dummy.
// The leaky arms intentionally damage it — that is the falling proof — and the
// hermetic arm asserts the identical operations leave it byte-identical.
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  HERMETIC_GLOBAL_GITCONFIG,
  HERMETIC_SYSTEM_GITCONFIG,
  materializeHermeticGitConfig,
} from "../lib/hermetic-git-env.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const SEAM_MODULE = join(REPO_ROOT, "tests", "lib", "hermetic-git-env.ts");
const LEAKED_EMAIL = "leaked@example.invalid";
const LEAKED_FILE = "leaked-index.txt";

const IDENTITY = ["-c", "user.email=t3413@example.invalid", "-c", "user.name=t3413"];

type Mode = "raw" | "index-only" | "hermetic";

function git(cwd: string, args: string[]): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf-8" });
  if (r.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed in ${cwd}: ${r.stderr?.trim() || r.stdout?.trim() || `exit ${r.status}`}`,
    );
  }
  return (r.stdout ?? "").trim();
}

/** The body of the pre-commit hook: fixture-shaped git calls that name their
 *  scratch repository explicitly on every invocation, exactly as this
 *  repository's own tests do. `T3413_MODE` selects the environment they run on:
 *  `raw` = whatever the hook inherited, `index-only` = GIT_DIR removed but
 *  GIT_INDEX_FILE kept (a partial fix), `hermetic` = through the seam. */
function hookScriptSource(): string {
  return [
    'import { spawnSync } from "node:child_process";',
    'import { writeFileSync } from "node:fs";',
    'import { join } from "node:path";',
    `import { hermeticGitEnv, materializeHermeticGitConfig } from ${JSON.stringify(SEAM_MODULE)};`,
    "",
    "const scratch = process.env.T3413_SCRATCH ?? '';",
    "const observed = process.env.T3413_OBSERVED ?? '';",
    "const mode = process.env.T3413_MODE ?? 'raw';",
    "",
    "// Re-entry: this hook was started by a commit made from inside the hook's",
    "// own run. Record it and stop, so the reproduction stays bounded.",
    "if (process.env.T3413_DEPTH !== undefined) {",
    "  writeFileSync(`${observed}.reentered`, 'reentered\\n', 'utf-8');",
    "  process.exit(0);",
    "}",
    "",
    "writeFileSync(",
    "  observed,",
    "  JSON.stringify({",
    "    gitDir: process.env.GIT_DIR ?? null,",
    "    gitIndexFile: process.env.GIT_INDEX_FILE ?? null,",
    "  }),",
    "  'utf-8',",
    ");",
    "",
    "const inherited: NodeJS.ProcessEnv = { ...process.env, T3413_DEPTH: '1' };",
    "let env = inherited;",
    "if (mode === 'hermetic') {",
    "  env = hermeticGitEnv(inherited, materializeHermeticGitConfig());",
    "} else if (mode === 'index-only') {",
    "  env = { ...inherited };",
    "  delete env.GIT_DIR;",
    "  delete env.GIT_WORK_TREE;",
    "  delete env.GIT_COMMON_DIR;",
    "}",
    "",
    "// Vector 1: a config write, fully -C-qualified.",
    "spawnSync('git', ['-C', scratch, 'config', 'user.email', " +
      `${JSON.stringify(LEAKED_EMAIL)}], { env, encoding: 'utf-8' });`,
    "",
    "// Vector 2: staging a file that exists only in the scratch work tree.",
    `writeFileSync(join(scratch, ${JSON.stringify(LEAKED_FILE)}), 'leaked\\n', 'utf-8');`,
    `spawnSync('git', ['-C', scratch, 'add', ${JSON.stringify(LEAKED_FILE)}], { env, encoding: 'utf-8' });`,
    "",
    "// Re-entry probe. Skipped for index-only, whose borrowed index would make",
    "// the in-flight outer commit unobservable.",
    "if (mode !== 'index-only') {",
    "  spawnSync(",
    "    'git',",
    "    ['-C', scratch, 'commit', '--allow-empty', '-q', '-m', 'fixture commit'],",
    "    { env, encoding: 'utf-8' },",
    "  );",
    "}",
    "",
  ].join("\n");
}

interface Fixture {
  readonly root: string;
  /** The stand-in for the developer's real repository. */
  readonly dummy: string;
  /** Its linked worktree — the context that makes git export the binding. */
  readonly worktree: string;
  readonly sharedConfig: string;
  readonly worktreeHead: string;
  readonly scratch: string;
  readonly observed: string;
}

let fixture: Fixture | null = null;

function makeFixture(): Fixture {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t3413-"));
  const dummy = join(root, "dummy");
  const worktree = join(root, "dummy-wt");
  const scratch = join(root, "scratch");
  const hookScript = join(root, "hook.ts");

  git(root, ["init", "-q", "--initial-branch=main", dummy]);
  git(dummy, ["config", "user.email", "dummy@example.invalid"]);
  git(dummy, ["config", "user.name", "dummy"]);
  writeFileSync(join(dummy, "seed.txt"), "seed\n", "utf-8");
  git(dummy, ["add", "seed.txt"]);
  git(dummy, [...IDENTITY, "commit", "-q", "-m", "seed"]);
  git(dummy, ["worktree", "add", "-q", "-b", "feat", worktree]);

  git(root, ["init", "-q", "--initial-branch=main", scratch]);
  git(scratch, ["config", "user.email", "scratch@example.invalid"]);
  git(scratch, ["config", "user.name", "scratch"]);

  writeFileSync(hookScript, hookScriptSource(), "utf-8");
  const hook = join(dummy, ".git", "hooks", "pre-commit");
  writeFileSync(
    hook,
    `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(hookScript)}\n`,
    "utf-8",
  );
  chmodSync(hook, 0o755);

  return {
    root,
    dummy,
    worktree,
    sharedConfig: join(dummy, ".git", "config"),
    worktreeHead: join(dummy, ".git", "worktrees", "dummy-wt", "HEAD"),
    scratch,
    observed: join(root, "observed.json"),
  };
}

/** Commit from the LINKED WORKTREE, which is what makes git export the binding
 *  into the hook. Returns the hook's own view of its environment. */
function commitFromWorktree(
  f: Fixture,
  mode: Mode,
): { gitDir: string | null; gitIndexFile: string | null; commitStatus: number | null } {
  writeFileSync(join(f.worktree, "probe.txt"), `${mode}\n`, "utf-8");
  spawnSync("git", [...IDENTITY, "add", "probe.txt"], { cwd: f.worktree, encoding: "utf-8" });
  const commit = spawnSync("git", [...IDENTITY, "commit", "-q", "-m", `probe ${mode}`], {
    cwd: f.worktree,
    encoding: "utf-8",
    env: { ...process.env, T3413_MODE: mode, T3413_SCRATCH: f.scratch, T3413_OBSERVED: f.observed },
  });
  const seen = JSON.parse(readFileSync(f.observed, "utf-8")) as {
    gitDir: string | null;
    gitIndexFile: string | null;
  };
  return { ...seen, commitStatus: commit.status };
}

/** The staged paths in the LINKED WORKTREE's own index, read with a clean
 *  environment so the reading itself cannot be misdirected. */
function stagedPaths(f: Fixture): string[] {
  return git(f.worktree, ["ls-files"]).split("\n").filter((line) => line.length > 0);
}

afterEach(() => {
  if (fixture !== null) rmSync(fixture.root, { recursive: true, force: true });
  fixture = null;
});

describe("ambient git binding leaks out of a linked-worktree hook (#3413)", () => {
  test("vector 1 — GIT_DIR: an explicit -C does NOT keep a config write inside the fixture", () => {
    fixture = makeFixture();
    const before = readFileSync(fixture.sharedConfig, "utf-8");

    const seen = commitFromWorktree(fixture, "raw");

    // Precondition, measured rather than assumed: git handed the hook an
    // absolute binding to the dummy repository's worktree git dir.
    expect(seen.gitDir).not.toBeNull();
    expect(seen.gitDir ?? "").toContain(join(".git", "worktrees"));

    // The leak itself. The call named `-C <scratch>`; it landed here.
    const after = readFileSync(fixture.sharedConfig, "utf-8");
    expect(after).toContain(LEAKED_EMAIL);
    expect(after).not.toBe(before);

    // And the fixture's own repository never received the write it asked for.
    expect(readFileSync(join(fixture.scratch, ".git", "config"), "utf-8")).not.toContain(
      LEAKED_EMAIL,
    );
  });

  test("vector 2 — GIT_INDEX_FILE survives removing GIT_DIR and still corrupts the commit", () => {
    fixture = makeFixture();

    const seen = commitFromWorktree(fixture, "index-only");

    expect(seen.gitIndexFile).not.toBeNull();
    // GIT_DIR was removed, so the config write stayed in the fixture...
    expect(readFileSync(fixture.sharedConfig, "utf-8")).not.toContain(LEAKED_EMAIL);
    expect(readFileSync(join(fixture.scratch, ".git", "config"), "utf-8")).toContain(LEAKED_EMAIL);
    // ...but `git -C <scratch> add` still staged into the REAL index, whose
    // entry names a blob that only exists in the scratch object database.
    expect(stagedPaths(fixture)).toContain(LEAKED_FILE);
    // The measured consequence: the in-flight commit cannot build a tree
    // ("invalid object ... Error building trees") and the index stays wedged —
    // every later commit in that worktree fails until someone unstages it.
    expect(seen.commitStatus).not.toBe(0);
    expect(git(fixture.worktree, ["log", "--format=%s", "-1"])).toBe("seed");
  });

  test("raw hook environment: the fixture's commit re-enters the pre-commit hook", () => {
    fixture = makeFixture();

    commitFromWorktree(fixture, "raw");

    // `git -C <scratch> commit` resolved to the dummy repository instead, so the
    // dummy's own pre-commit hook fired from inside the hook's run. Bounded here
    // by the depth marker; unbounded in production.
    expect(existsSync(`${fixture.observed}.reentered`)).toBe(true);
  });

  test("hermetic environment: the same calls leave the real repository untouched", () => {
    fixture = makeFixture();
    const before = readFileSync(fixture.sharedConfig, "utf-8");
    const headBefore = readFileSync(fixture.worktreeHead, "utf-8");

    const seen = commitFromWorktree(fixture, "hermetic");

    // Same precondition: git still exported the binding into the hook. The
    // difference is only that the seam removed it before the fixture ran.
    expect(seen.gitDir).not.toBeNull();
    expect(seen.gitIndexFile).not.toBeNull();

    expect(readFileSync(fixture.sharedConfig, "utf-8")).toBe(before);
    // HEAD matters on its own: a swapped worktree HEAD makes `git status` read
    // as "every file deleted", which turns the next `git add -A` destructive.
    expect(readFileSync(fixture.worktreeHead, "utf-8")).toBe(headBefore);
    expect(existsSync(`${fixture.observed}.reentered`)).toBe(false);
    // Neither vector: the real index never saw the fixture's file, and the
    // commit the developer actually asked for completed.
    expect(stagedPaths(fixture)).not.toContain(LEAKED_FILE);
    expect(seen.commitStatus).toBe(0);
    expect(git(fixture.worktree, ["log", "--format=%s", "-1"])).toBe("probe hermetic");
  });

  test("hermetic environment: the writes land in the fixture that asked for them", () => {
    fixture = makeFixture();

    commitFromWorktree(fixture, "hermetic");

    expect(readFileSync(join(fixture.scratch, ".git", "config"), "utf-8")).toContain(LEAKED_EMAIL);
    expect(git(fixture.scratch, ["log", "--format=%s", "-1"])).toBe("fixture commit");
    expect(git(fixture.scratch, ["show", "--name-only", "--format=", "HEAD"]).split("\n")).toContain(
      LEAKED_FILE,
    );
  });
});

describe("the seam is wired into every spawn face (#3413)", () => {
  test.each([
    ["bunfig.toml", "tests/harness/hermetic-git-setup.ts"],
    ["tests/run-tests.ts", "applyHermeticGitEnv(process.env"],
    ["scripts/precommit-related-unit-tests.ts", "hermeticGitEnv(process.env"],
  ])("%s applies it", (file, marker) => {
    expect(readFileSync(join(REPO_ROOT, file), "utf-8")).toContain(marker);
  });
});

// The pinned config files are written by the seam itself, and git has to be
// able to READ them — a pin pointing at a file git rejects would silently give
// back whatever fallback git chooses. Driven at an explicit directory so the
// shared default location is never disturbed.
describe("pinned git config materialisation (#3413)", () => {
  let dir: string | null = null;

  afterEach(() => {
    if (dir !== null) rmSync(dir, { recursive: true, force: true });
    dir = null;
  });

  test("creates both files when the directory holds nothing yet", () => {
    dir = join(mkdtempSync(join(tmpdir(), "amadeus-t3413-cfg-")), "nested");

    const paths = materializeHermeticGitConfig(dir);

    expect(readFileSync(paths.global, "utf-8")).toBe(HERMETIC_GLOBAL_GITCONFIG);
    expect(readFileSync(paths.system, "utf-8")).toBe(HERMETIC_SYSTEM_GITCONFIG);
    // Write-then-rename must leave no staging file behind.
    expect(readdirSync(dir).sort()).toEqual(["global.gitconfig", "system.gitconfig"]);
  });

  test("a second call with the files already correct rewrites nothing", () => {
    dir = mkdtempSync(join(tmpdir(), "amadeus-t3413-cfg-"));
    const first = materializeHermeticGitConfig(dir);
    const stamp = statSync(first.global).mtimeMs;

    const second = materializeHermeticGitConfig(dir);

    expect(second.global).toBe(first.global);
    expect(statSync(second.global).mtimeMs).toBe(stamp);
  });

  test("a stale or corrupted file is replaced", () => {
    dir = mkdtempSync(join(tmpdir(), "amadeus-t3413-cfg-"));
    const paths = materializeHermeticGitConfig(dir);
    writeFileSync(paths.global, "[user]\n\temail = stale@example.invalid\n", "utf-8");

    materializeHermeticGitConfig(dir);

    expect(readFileSync(paths.global, "utf-8")).toBe(HERMETIC_GLOBAL_GITCONFIG);
  });

  test("git itself reads the pinned files and reports the identity they declare", () => {
    dir = mkdtempSync(join(tmpdir(), "amadeus-t3413-cfg-"));
    const paths = materializeHermeticGitConfig(dir);

    const read = spawnSync("git", ["config", "--global", "user.email"], {
      encoding: "utf-8",
      env: { ...process.env, GIT_CONFIG_GLOBAL: paths.global, GIT_CONFIG_SYSTEM: paths.system },
    });

    expect(read.status).toBe(0);
    expect((read.stdout ?? "").trim()).toBe("amadeus-test@example.invalid");
  });
});
