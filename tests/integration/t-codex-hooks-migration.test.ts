import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as nodeFs from "node:fs";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import {
  codexHooksDoctorCheck,
  main as codexHooksMain,
} from "../../packages/framework/harness/codex/tools/amadeus-codex-hooks.ts";

const ROOT = resolve(import.meta.dir, "../..");
const SOURCE_HELPER_DIR = join(
  ROOT,
  "packages/framework/harness/codex/tools",
);
const HELPER_FILES = [
  "amadeus-codex-hooks.ts",
  "amadeus-codex-hooks-contract.ts",
  "amadeus-codex-hooks-migration.ts",
];
const CANONICAL = join(ROOT, ".codex", "hooks.json.example");
const ACTIVE_HOOKS_PATH = ".codex/hooks.json";
const tempDirs: string[] = [];

function isPrivateHooksBackup(path: unknown): boolean {
  const rendered = String(path);
  return (
    basename(rendered) === "hooks.json" &&
    basename(dirname(rendered)).startsWith("amadeus-codex-hooks-")
  );
}

function isPrivateHooksBackupDirectory(path: unknown): boolean {
  return basename(String(path)).startsWith("amadeus-codex-hooks-");
}

function fsError(code: string, message: string): NodeJS.ErrnoException {
  const error = new Error(message) as NodeJS.ErrnoException;
  error.code = code;
  return error;
}

function migrationTempEnv(fixture: MigrationFixture, name: string): Record<string, string> {
  const directory = join(fixture.fixtureRoot, name);
  mkdirSync(directory);
  return { TMPDIR: directory, TEMP: directory, TMP: directory };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function run(cwd: string, cmd: string[], env: Record<string, string> = {}) {
  return Bun.spawnSync({
    cmd,
    cwd,
    env: { ...process.env, ...env },
    stderr: "pipe",
    stdout: "pipe",
  });
}

function git(cwd: string, ...args: string[]): string {
  const result = run(cwd, ["git", ...args]);
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  return result.stdout.toString().trim();
}

function readOnlyStatus(projectDir: string): string {
  const result = Bun.spawnSync({
    cmd: [
      "git",
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      "--ignore-submodules=none",
    ],
    cwd: projectDir,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    stderr: "pipe",
    stdout: "pipe",
  });
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  return result.stdout.toString();
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function copyHelperFiles(destination: string): void {
  mkdirSync(destination, { recursive: true });
  for (const file of HELPER_FILES) {
    copyFileSync(join(SOURCE_HELPER_DIR, file), join(destination, file));
  }
}

function applyWriter(projectDir: string): void {
  const activePath = join(projectDir, ".codex", "hooks.json");
  const active = JSON.parse(readFileSync(activePath, "utf8")) as {
    hooks: Record<string, unknown[]>;
  };
  active.hooks.SessionStart.push({
    hooks: [
      {
        type: "command",
        command: `bash ${join(projectDir, ".agents", "skills", "agmsg", "codex-monitor.sh")}`,
      },
    ],
  });
  writeFileSync(activePath, JSON.stringify(active));
}

function createSelfMigrationFixture(
  options: { repositoryUrl?: string } = {},
) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "amadeus-codex-migration-"));
  tempDirs.push(fixtureRoot);
  const origin = join(fixtureRoot, "origin.git");
  const seed = join(fixtureRoot, "seed");
  const checkout = join(fixtureRoot, "checkout");
  mkdirSync(seed, { recursive: true });
  git(fixtureRoot, "init", "--bare", "-q", origin);
  git(seed, "init", "-q", "-b", "main");
  git(seed, "config", "user.email", "migration@example.com");
  git(seed, "config", "user.name", "Migration Test");
  mkdirSync(join(seed, ".codex"), { recursive: true });
  mkdirSync(join(seed, "scripts"), { recursive: true });
  copyFileSync(CANONICAL, join(seed, ".codex", "hooks.json.example"));
  copyFileSync(CANONICAL, join(seed, ".codex", "hooks.json"));
  writeFileSync(join(seed, ".gitignore"), "# pre-fix\n");
  writeFileSync(
    join(seed, "package.json"),
    `${JSON.stringify({
      name: "codex-hooks-migration-fixture",
      private: true,
      repository: {
        type: "git",
        url: options.repositoryUrl ?? "https://github.com/amadeus-dlc/amadeus",
      },
    })}\n`,
  );
  writeFileSync(join(seed, "scripts", "package.ts"), "// package marker\n");
  writeFileSync(join(seed, "scripts", "promote-self.ts"), "// self marker\n");
  writeFileSync(join(seed, "scripts", "run-codex.sh"), "#!/usr/bin/env bash\n");
  git(seed, "add", ".");
  git(seed, "commit", "-qm", "pre-fix self repository");
  git(seed, "remote", "add", "origin", origin);
  git(seed, "push", "-q", "-u", "origin", "main");

  git(seed, "switch", "-q", "-c", "fix");
  rmSync(join(seed, ".codex", "hooks.json"));
  copyHelperFiles(join(seed, ".codex", "tools"));
  writeFileSync(join(seed, ".gitignore"), ".codex/hooks.json\n");
  git(seed, "add", "-A");
  git(seed, "commit", "-qm", "separate canonical and active hooks");
  git(seed, "push", "-q", "-u", "origin", "fix");

  git(fixtureRoot, "clone", "-q", "--branch", "main", origin, checkout);
  git(checkout, "config", "user.email", "migration@example.com");
  git(checkout, "config", "user.name", "Migration Test");
  applyWriter(checkout);
  git(checkout, "fetch", "-q", "origin", "fix");
  const targetRef = "origin/fix";
  const targetCommit = git(checkout, "rev-parse", targetRef);

  const bootstrapDir = join(fixtureRoot, "bootstrap-helper");
  mkdirSync(bootstrapDir);
  for (const file of HELPER_FILES) {
    const helperProbe = run(checkout, [
      "git",
      "cat-file",
      "-e",
      `HEAD:.codex/tools/${file}`,
    ]);
    expect(helperProbe.exitCode).not.toBe(0);
    const helperBlob = run(checkout, [
      "git",
      "show",
      `${targetRef}:.codex/tools/${file}`,
    ]);
    expect(helperBlob.exitCode, helperBlob.stderr.toString()).toBe(0);
    writeFileSync(join(bootstrapDir, file), helperBlob.stdout);
  }
  const bootstrapHelper = join(bootstrapDir, "amadeus-codex-hooks.ts");

  return { bootstrapHelper, checkout, fixtureRoot, origin, seed, targetCommit, targetRef };
}

type MigrationFixture = ReturnType<typeof createSelfMigrationFixture>;

function spyOnBackupRenameExdev(activePath: string) {
  const originalRenameSync = nodeFs.renameSync;
  return spyOn(nodeFs, "renameSync").mockImplementation((oldPath, newPath) => {
    if (String(oldPath) === activePath && isPrivateHooksBackup(newPath)) {
      throw fsError("EXDEV", "injected cross-device rename");
    }
    originalRenameSync(oldPath, newPath);
  });
}

function runMigration(
  fixture: MigrationFixture,
  targetRef = fixture.targetRef,
  env: Record<string, string> = {},
) {
  return runHelperInProcess(
    [
      "migrate-self",
      "--target-ref",
      targetRef,
      "--project-dir",
      fixture.checkout,
    ],
    env,
  );
}

function runMigrationCli(
  fixture: MigrationFixture,
  targetRef = fixture.targetRef,
  env: Record<string, string> = {},
) {
  return run(fixture.checkout, [
    "bun",
    fixture.bootstrapHelper,
    "migrate-self",
    "--target-ref",
    targetRef,
    "--project-dir",
    fixture.checkout,
  ], env);
}

function runHelperInProcess(argv: string[], env: Record<string, string> = {}) {
  const originalStdout = process.stdout.write;
  const originalStderr = process.stderr.write;
  const originalEnvironment = new Map<string, string | undefined>();
  let stdout = "";
  let stderr = "";

  for (const [key, value] of Object.entries(env)) {
    originalEnvironment.set(key, process.env[key]);
    process.env[key] = value;
  }
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdout += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    stderr += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    return true;
  }) as typeof process.stderr.write;

  try {
    return {
      exitCode: codexHooksMain(argv),
      stdout: Buffer.from(stdout),
      stderr: Buffer.from(stderr),
    };
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
    for (const [key, value] of originalEnvironment) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function expectRejectedWithoutMutation(
  fixture: MigrationFixture,
  code: string,
  targetRef = fixture.targetRef,
  env: Record<string, string> = {},
) {
  const isolatedTmp = join(fixture.fixtureRoot, "rejected-migration-tmp");
  mkdirSync(isolatedTmp, { recursive: true });
  const migrationEnv = {
    TMPDIR: isolatedTmp,
    TEMP: isolatedTmp,
    TMP: isolatedTmp,
    ...env,
  };
  const observedTmp = migrationEnv.TMPDIR;
  const activePath = join(fixture.checkout, ".codex", "hooks.json");
  const headBefore = git(fixture.checkout, "rev-parse", "HEAD");
  const activeBefore = readFileSync(activePath);
  const statusBefore = readOnlyStatus(fixture.checkout);
  const indexPathRaw = git(fixture.checkout, "rev-parse", "--git-path", "index");
  const indexPath = resolve(fixture.checkout, indexPathRaw);
  const indexBefore = readFileSync(indexPath);
  const backupsBefore = readdirSync(observedTmp)
    .filter((entry) => entry.startsWith("amadeus-codex-hooks-"))
    .sort();

  const rejected = runMigration(fixture, targetRef, migrationEnv);

  expect(rejected.exitCode).toBe(1);
  expect(rejected.stderr.toString()).toContain(`[${code}]`);
  expect(git(fixture.checkout, "rev-parse", "HEAD")).toBe(headBefore);
  expect(readFileSync(activePath)).toEqual(activeBefore);
  expect(readFileSync(indexPath)).toEqual(indexBefore);
  expect(readOnlyStatus(fixture.checkout)).toBe(statusBefore);
  expect(
    readdirSync(observedTmp)
      .filter((entry) => entry.startsWith("amadeus-codex-hooks-"))
      .sort(),
  ).toEqual(backupsBefore);
  return rejected;
}

function pushTargetWithoutIgnore(fixture: MigrationFixture): string {
  git(fixture.seed, "switch", "-q", "main");
  git(fixture.seed, "switch", "-q", "-c", "bad-ignore");
  rmSync(join(fixture.seed, ".codex", "hooks.json"));
  copyHelperFiles(join(fixture.seed, ".codex", "tools"));
  writeFileSync(join(fixture.seed, ".gitignore"), "# active hooks are not ignored\n");
  git(fixture.seed, "add", "-A");
  git(fixture.seed, "commit", "-qm", "target missing ignore contract");
  git(fixture.seed, "push", "-q", "origin", "bad-ignore");
  git(fixture.checkout, "fetch", "-q", "origin", "bad-ignore");
  return "origin/bad-ignore";
}

function pushTargetWithLaterIgnoreNegation(fixture: MigrationFixture): string {
  git(fixture.seed, "switch", "-q", "main");
  git(fixture.seed, "switch", "-q", "-c", "negated-ignore");
  rmSync(join(fixture.seed, ".codex", "hooks.json"));
  copyHelperFiles(join(fixture.seed, ".codex", "tools"));
  writeFileSync(
    join(fixture.seed, ".gitignore"),
    ".codex/hooks.json\n!.codex/*\n",
  );
  git(fixture.seed, "add", "-A");
  git(fixture.seed, "commit", "-qm", "target negates the active hooks ignore");
  git(fixture.seed, "push", "-q", "origin", "negated-ignore");
  git(fixture.checkout, "fetch", "-q", "origin", "negated-ignore");
  return "origin/negated-ignore";
}

function pushTargetWithNestedIgnoreNegation(fixture: MigrationFixture): string {
  git(fixture.seed, "switch", "-q", "main");
  git(fixture.seed, "switch", "-q", "-c", "nested-negated-ignore");
  rmSync(join(fixture.seed, ".codex", "hooks.json"));
  copyHelperFiles(join(fixture.seed, ".codex", "tools"));
  writeFileSync(join(fixture.seed, ".gitignore"), ".codex/hooks.json\n");
  writeFileSync(join(fixture.seed, ".codex", ".gitignore"), "!hooks.json\n");
  git(fixture.seed, "add", "-A");
  git(fixture.seed, "commit", "-qm", "nested ignore negates active hooks");
  git(fixture.seed, "push", "-q", "origin", "nested-negated-ignore");
  git(fixture.checkout, "fetch", "-q", "origin", "nested-negated-ignore");
  return "origin/nested-negated-ignore";
}

function pushTargetWithTrackedActive(fixture: MigrationFixture): string {
  git(fixture.seed, "switch", "-q", "main");
  git(fixture.seed, "switch", "-q", "-c", "tracked-active");
  copyHelperFiles(join(fixture.seed, ".codex", "tools"));
  writeFileSync(join(fixture.seed, ".gitignore"), ".codex/hooks.json\n");
  git(fixture.seed, "add", ".");
  git(fixture.seed, "commit", "-qm", "target still tracks active hooks");
  git(fixture.seed, "push", "-q", "origin", "tracked-active");
  git(fixture.checkout, "fetch", "-q", "origin", "tracked-active");
  return "origin/tracked-active";
}

function pushTargetWithoutCanonical(fixture: MigrationFixture): string {
  git(fixture.seed, "switch", "-q", "main");
  git(fixture.seed, "switch", "-q", "-c", "missing-canonical");
  rmSync(join(fixture.seed, ".codex", "hooks.json"));
  rmSync(join(fixture.seed, ".codex", "hooks.json.example"));
  copyHelperFiles(join(fixture.seed, ".codex", "tools"));
  writeFileSync(join(fixture.seed, ".gitignore"), ".codex/hooks.json\n");
  git(fixture.seed, "add", "-A");
  git(fixture.seed, "commit", "-qm", "target missing canonical hooks");
  git(fixture.seed, "push", "-q", "origin", "missing-canonical");
  git(fixture.checkout, "fetch", "-q", "origin", "missing-canonical");
  return "origin/missing-canonical";
}

function pushTargetWithoutHelper(fixture: MigrationFixture): string {
  git(fixture.seed, "switch", "-q", "main");
  git(fixture.seed, "switch", "-q", "-c", "missing-helper");
  rmSync(join(fixture.seed, ".codex", "hooks.json"));
  writeFileSync(join(fixture.seed, ".gitignore"), ".codex/hooks.json\n");
  git(fixture.seed, "add", "-A");
  git(fixture.seed, "commit", "-qm", "target missing hooks helper");
  git(fixture.seed, "push", "-q", "origin", "missing-helper");
  git(fixture.checkout, "fetch", "-q", "origin", "missing-helper");
  return "origin/missing-helper";
}

function pushTargetWithCanonicalContent(
  fixture: MigrationFixture,
  branch: string,
  canonical: string,
): string {
  git(fixture.seed, "switch", "-q", "main");
  git(fixture.seed, "switch", "-q", "-c", branch);
  rmSync(join(fixture.seed, ".codex", "hooks.json"));
  copyHelperFiles(join(fixture.seed, ".codex", "tools"));
  writeFileSync(join(fixture.seed, ".codex", "hooks.json.example"), canonical);
  writeFileSync(join(fixture.seed, ".gitignore"), ".codex/hooks.json\n");
  git(fixture.seed, "add", "-A");
  git(fixture.seed, "commit", "-qm", `target with ${branch} canonical hooks`);
  git(fixture.seed, "push", "-q", "origin", branch);
  git(fixture.checkout, "fetch", "-q", "origin", branch);
  return `origin/${branch}`;
}

function pushTargetWithInvalidCanonical(fixture: MigrationFixture): string {
  return pushTargetWithCanonicalContent(fixture, "invalid-canonical", "{invalid-json");
}

function pushNonFastForwardTarget(fixture: MigrationFixture): string {
  const targetTree = git(fixture.seed, "rev-parse", "fix^{tree}");
  const targetCommit = git(
    fixture.seed,
    "commit-tree",
    targetTree,
    "-m",
    "unrelated ownership target",
  );
  git(
    fixture.seed,
    "push",
    "-q",
    "origin",
    `${targetCommit}:refs/heads/non-fast-forward`,
  );
  git(fixture.checkout, "fetch", "-q", "origin", "non-fast-forward");
  return "origin/non-fast-forward";
}

function createUnmergedIndex(fixture: MigrationFixture): void {
  const ours = join(fixture.fixtureRoot, "ours.txt");
  const theirs = join(fixture.fixtureRoot, "theirs.txt");
  writeFileSync(ours, "ours\n");
  writeFileSync(theirs, "theirs\n");
  const oursBlob = git(fixture.checkout, "hash-object", "-w", ours);
  const theirsBlob = git(fixture.checkout, "hash-object", "-w", theirs);
  const indexInfo =
    `100644 ${oursBlob} 2\tconflict.txt\n` +
    `100644 ${theirsBlob} 3\tconflict.txt\n`;
  const result = spawnSync("git", ["update-index", "--index-info"], {
    cwd: fixture.checkout,
    encoding: "utf8",
    input: indexInfo,
  });
  expect(result.status, result.stderr).toBe(0);
}

describe("Codex hooks self migration", () => {
  test("keeps the real bootstrap helper CLI boundary executable", () => {
    const fixture = createSelfMigrationFixture();

    const migrated = runMigrationCli(fixture);

    expect(migrated.exitCode, migrated.stderr.toString()).toBe(0);
    expect(git(fixture.checkout, "rev-parse", "HEAD")).toBe(fixture.targetCommit);
    const backupMatch = migrated.stdout.toString().match(/^Backup: (.+)$/m);
    expect(backupMatch).not.toBeNull();
    tempDirs.push(dirname(backupMatch![1]));
  });

  test("bootstraps the target helper outside the old checkout and preserves active bytes across fast-forward", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ".codex", "hooks.json");
    const beforeSha = sha256(activePath);
    const stashBefore = git(fixture.checkout, "stash", "list");
    expect(git(fixture.checkout, "status", "--short")).toBe("M .codex/hooks.json");

    const migrated = runMigration(fixture);

    expect(migrated.exitCode, migrated.stderr.toString()).toBe(0);
    expect(git(fixture.checkout, "rev-parse", "HEAD")).toBe(fixture.targetCommit);
    expect(sha256(activePath)).toBe(beforeSha);
    expect(git(fixture.checkout, "ls-files", ".codex/hooks.json")).toBe("");
    expect(run(fixture.checkout, ["git", "check-ignore", "-q", ".codex/hooks.json"]).exitCode).toBe(0);
    expect(git(fixture.checkout, "ls-files", ".codex/hooks.json.example")).toBe(
      ".codex/hooks.json.example",
    );
    expect(git(fixture.checkout, "diff", "--name-only", "--diff-filter=U")).toBe("");
    expect(git(fixture.checkout, "stash", "list")).toBe(stashBefore);
    expect(git(fixture.checkout, "status", "--short")).toBe("");
    expect(codexHooksDoctorCheck(fixture.checkout).pass).toBe(true);

    const backupMatch = migrated.stdout.toString().match(/^Backup: (.+)$/m);
    expect(backupMatch).not.toBeNull();
    expect(existsSync(backupMatch![1])).toBe(true);
    expect(sha256(backupMatch![1])).toBe(beforeSha);
    if (process.platform !== "win32") {
      expect(statSync(dirname(backupMatch![1])).mode & 0o777).toBe(0o700);
      expect(statSync(backupMatch![1]).mode & 0o777).toBe(0o600);
    }
    expect(relative(fixture.checkout, backupMatch![1]).startsWith("..")).toBe(true);
    tempDirs.push(dirname(backupMatch![1]));
  });

  test("accepts a clean tracked active file before migration", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ".codex", "hooks.json");
    copyFileSync(CANONICAL, activePath);
    expect(git(fixture.checkout, "status", "--short")).toBe("");
    const beforeSha = sha256(activePath);

    const migrated = runMigration(fixture);

    expect(migrated.exitCode, migrated.stderr.toString()).toBe(0);
    expect(sha256(activePath)).toBe(beforeSha);
    const backupMatch = migrated.stdout.toString().match(/^Backup: (.+)$/m);
    expect(backupMatch).not.toBeNull();
    tempDirs.push(dirname(backupMatch![1]));
  });

  test("rejects packaged consumers before touching active hooks", () => {
    const fixture = createSelfMigrationFixture({
      repositoryUrl: "https://example.invalid/packaged-consumer",
    });
    expectRejectedWithoutMutation(fixture, "NOT_SELF_REPOSITORY");
  });

  test("rejects staged changes before touching active hooks", () => {
    const fixture = createSelfMigrationFixture();
    writeFileSync(join(fixture.checkout, "scripts", "run-codex.sh"), "staged\n");
    git(fixture.checkout, "add", "scripts/run-codex.sh");
    expectRejectedWithoutMutation(fixture, "STAGED_CHANGES");
  });

  test("rejects unmerged paths before touching active hooks", () => {
    const fixture = createSelfMigrationFixture();
    createUnmergedIndex(fixture);
    expectRejectedWithoutMutation(fixture, "UNMERGED_PATHS");
  });

  test("rejects unrelated tracked changes before touching active hooks", () => {
    const fixture = createSelfMigrationFixture();
    writeFileSync(join(fixture.checkout, "scripts", "run-codex.sh"), "unrelated\n");
    expectRejectedWithoutMutation(fixture, "UNRELATED_TRACKED_CHANGES");
  });

  test("rejects untracked changes before touching active hooks", () => {
    const fixture = createSelfMigrationFixture();
    writeFileSync(join(fixture.checkout, "untracked.txt"), "unrelated\n");
    expectRejectedWithoutMutation(fixture, "UNTRACKED_CHANGES");
  });

  test("escapes control characters in untracked path diagnostics", () => {
    const fixture = createSelfMigrationFixture();
    const relativePath = "untracked\ncontrol.txt";
    writeFileSync(join(fixture.checkout, relativePath), "unrelated\n");

    const rejected = expectRejectedWithoutMutation(fixture, "UNTRACKED_CHANGES");
    const stderr = rejected.stderr.toString();

    expect(stderr).toContain(JSON.stringify(relativePath));
    expect(stderr).not.toContain(relativePath);
  });

  test.skipIf(process.platform !== "linux")(
    "renders invalid UTF-8 path bytes as hexadecimal diagnostics",
    () => {
      const fixture = createSelfMigrationFixture();
      const relativePath = Buffer.from([0x62, 0x61, 0x64, 0x80, 0x2e, 0x74, 0x78, 0x74]);
      const absolutePath = Buffer.concat([
        Buffer.from(`${fixture.checkout}${sep}`),
        relativePath,
      ]);
      writeFileSync(absolutePath, "unrelated\n");

      const rejected = expectRejectedWithoutMutation(fixture, "UNTRACKED_CHANGES");

      expect(rejected.stderr.toString()).toContain(
        JSON.stringify(`hex:${relativePath.toString("hex")}`),
      );
    },
  );

  test("distinguishes invalid JSON and invalid structure in active hooks", () => {
    const invalidJson = createSelfMigrationFixture();
    writeFileSync(join(invalidJson.checkout, ACTIVE_HOOKS_PATH), "{invalid-json");
    expectRejectedWithoutMutation(invalidJson, "ACTIVE_JSON_INVALID");

    const invalidStructure = createSelfMigrationFixture();
    writeFileSync(
      join(invalidStructure.checkout, ACTIVE_HOOKS_PATH),
      '{"hooks":[]}',
    );
    expectRejectedWithoutMutation(invalidStructure, "ACTIVE_STRUCTURE_INVALID");
  });

  test("rejects active hooks that do not match the target canonical tuples", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ".codex", "hooks.json");
    const active = JSON.parse(readFileSync(activePath, "utf8")) as {
      hooks: Record<string, unknown>;
    };
    delete active.hooks.UserPromptSubmit;
    writeFileSync(activePath, JSON.stringify(active));
    expectRejectedWithoutMutation(fixture, "ACTIVE_TARGET_CONTRACT_MISMATCH");
  });

  test.skipIf(process.platform === "win32")(
    "rejects a non-regular active hooks path before touching the repository",
    () => {
      const fixture = createSelfMigrationFixture();
      const activePath = join(fixture.checkout, ".codex", "hooks.json");
      rmSync(activePath);
      symlinkSync("hooks.json.example", activePath);
      expectRejectedWithoutMutation(fixture, "CURRENT_ACTIVE_NOT_REGULAR");
    },
  );

  test.skipIf(process.platform === "win32")(
    "rejects an unreadable active hooks file before touching the repository",
    () => {
      const fixture = createSelfMigrationFixture();
      const activePath = join(fixture.checkout, ACTIVE_HOOKS_PATH);
      const activeBefore = readFileSync(activePath);
      const headBefore = git(fixture.checkout, "rev-parse", "HEAD");
      chmodSync(activePath, 0o000);
      let rejected: ReturnType<typeof runMigration>;
      try {
        rejected = runMigration(fixture);
      } finally {
        chmodSync(activePath, 0o644);
      }

      expect(rejected!.exitCode).toBe(1);
      expect(rejected!.stderr.toString()).toContain("[ACTIVE_READ_FAILED]");
      expect(git(fixture.checkout, "rev-parse", "HEAD")).toBe(headBefore);
      expect(readFileSync(activePath)).toEqual(activeBefore);
    },
  );

  test("rejects a target missing the ignore contract before touching active hooks", () => {
    const fixture = createSelfMigrationFixture();
    const targetRef = pushTargetWithoutIgnore(fixture);
    expectRejectedWithoutMutation(fixture, "TARGET_IGNORE_MISSING", targetRef);
  });

  test("ignores hostile ambient Git excludes when validating the target contract", () => {
    const fixture = createSelfMigrationFixture();
    const targetRef = pushTargetWithoutIgnore(fixture);
    const ambientExcludes = join(fixture.fixtureRoot, "ambient-excludes");
    writeFileSync(ambientExcludes, ".codex/hooks.json\n");

    expectRejectedWithoutMutation(fixture, "TARGET_IGNORE_MISSING", targetRef, {
      GIT_CONFIG_PARAMETERS: `'core.excludesFile=${ambientExcludes}'`,
    });
  });

  test("ignores the XDG default excludes file when validating the target contract", () => {
    const fixture = createSelfMigrationFixture();
    const targetRef = pushTargetWithoutIgnore(fixture);
    const xdgRoot = join(fixture.fixtureRoot, "ambient-xdg");
    mkdirSync(join(xdgRoot, "git"), { recursive: true });
    writeFileSync(join(xdgRoot, "git", "ignore"), ".codex/hooks.json\n");

    expectRejectedWithoutMutation(fixture, "TARGET_IGNORE_MISSING", targetRef, {
      XDG_CONFIG_HOME: xdgRoot,
    });
  });

  test("rejects a target whose later pattern negates the active hooks ignore before touching it", () => {
    const fixture = createSelfMigrationFixture();
    const targetRef = pushTargetWithLaterIgnoreNegation(fixture);
    expectRejectedWithoutMutation(fixture, "TARGET_IGNORE_MISSING", targetRef);
  });

  test("rejects a target whose nested ignore file re-includes active hooks before touching it", () => {
    const fixture = createSelfMigrationFixture();
    const targetRef = pushTargetWithNestedIgnoreNegation(fixture);
    expectRejectedWithoutMutation(fixture, "TARGET_IGNORE_MISSING", targetRef);
  });

  test("rejects a target that still tracks active hooks before touching them", () => {
    const fixture = createSelfMigrationFixture();
    const targetRef = pushTargetWithTrackedActive(fixture);
    expectRejectedWithoutMutation(fixture, "TARGET_ACTIVE_TRACKED", targetRef);
  });

  test("rejects a target missing the canonical example before touching active hooks", () => {
    const fixture = createSelfMigrationFixture();
    const targetRef = pushTargetWithoutCanonical(fixture);
    expectRejectedWithoutMutation(fixture, "TARGET_CANONICAL_MISSING", targetRef);
  });

  test("rejects a target with an invalid canonical example before touching active hooks", () => {
    const fixture = createSelfMigrationFixture();
    const targetRef = pushTargetWithInvalidCanonical(fixture);
    expectRejectedWithoutMutation(fixture, "TARGET_CANONICAL_JSON_INVALID", targetRef);
  });

  test("distinguishes invalid structure and missing tuples in the target canonical example", () => {
    const invalidStructure = createSelfMigrationFixture();
    const invalidStructureRef = pushTargetWithCanonicalContent(
      invalidStructure,
      "invalid-canonical-structure",
      '{"hooks":[]}',
    );
    expectRejectedWithoutMutation(
      invalidStructure,
      "TARGET_CANONICAL_STRUCTURE_INVALID",
      invalidStructureRef,
    );

    const missingTuples = createSelfMigrationFixture();
    const missingTuplesRef = pushTargetWithCanonicalContent(
      missingTuples,
      "canonical-without-tuples",
      '{"hooks":{"Stop":[{"hooks":[{"type":"command","command":"echo unrelated"}]}]}}',
    );
    expectRejectedWithoutMutation(
      missingTuples,
      "TARGET_CANONICAL_TUPLES_MISSING",
      missingTuplesRef,
    );
  });

  test("rejects a target missing the bootstrap helper before touching active hooks", () => {
    const fixture = createSelfMigrationFixture();
    const targetRef = pushTargetWithoutHelper(fixture);
    expectRejectedWithoutMutation(fixture, "TARGET_HELPER_MISSING", targetRef);
  });

  test("rejects a non-fast-forward target before touching active hooks", () => {
    const fixture = createSelfMigrationFixture();
    const targetRef = pushNonFastForwardTarget(fixture);
    expectRejectedWithoutMutation(fixture, "NON_FAST_FORWARD", targetRef);
  });

  test("rejects a symlinked temporary directory that resolves inside the Git common directory", () => {
    const fixture = createSelfMigrationFixture();
    const redirectedTmp = join(fixture.fixtureRoot, "redirected-tmp");
    const commonGitDir = join(fixture.checkout, ".git");
    const entriesBefore = readdirSync(commonGitDir).sort();
    symlinkSync(
      commonGitDir,
      redirectedTmp,
      process.platform === "win32" ? "junction" : "dir",
    );

    expectRejectedWithoutMutation(
      fixture,
      "BACKUP_LOCATION_UNSAFE",
      fixture.targetRef,
      { TMPDIR: redirectedTmp, TEMP: redirectedTmp, TMP: redirectedTmp },
    );
    expect(readdirSync(commonGitDir).sort()).toEqual(entriesBefore);
  });

  test("rejects a symlinked temporary directory that resolves inside the worktree", () => {
    const fixture = createSelfMigrationFixture();
    const redirectedTmp = join(fixture.fixtureRoot, "redirected-worktree-tmp");
    symlinkSync(
      fixture.checkout,
      redirectedTmp,
      process.platform === "win32" ? "junction" : "dir",
    );

    expectRejectedWithoutMutation(
      fixture,
      "BACKUP_LOCATION_UNSAFE",
      fixture.targetRef,
      { TMPDIR: redirectedTmp, TEMP: redirectedTmp, TMP: redirectedTmp },
    );
  });

  test("rejects a project directory below the Git root before touching active hooks", () => {
    const fixture = createSelfMigrationFixture();
    const subdir = join(fixture.checkout, "scripts");
    const activePath = join(fixture.checkout, ".codex", "hooks.json");
    const activeBefore = readFileSync(activePath);
    const headBefore = git(fixture.checkout, "rev-parse", "HEAD");

    const rejected = runHelperInProcess([
      "migrate-self",
      "--target-ref",
      fixture.targetRef,
      "--project-dir",
      subdir,
    ]);

    expect(rejected.exitCode).toBe(1);
    expect(rejected.stderr.toString()).toContain("[PROJECT_DIR_NOT_GIT_ROOT]");
    expect(git(fixture.checkout, "rev-parse", "HEAD")).toBe(headBefore);
    expect(readFileSync(activePath)).toEqual(activeBefore);
  });

  test("requires an explicit local target ref and never fetches implicitly", () => {
    const fixture = createSelfMigrationFixture();
    expectRejectedWithoutMutation(fixture, "TARGET_REF_NOT_FOUND", "origin/not-fetched");

    const missing = runHelperInProcess([
      "migrate-self",
      "--project-dir",
      fixture.checkout,
    ]);
    expect(missing.exitCode).toBe(1);
    expect(missing.stderr.toString()).toContain("[TARGET_REF_REQUIRED]");
  });

  test("restores active hooks when the fast-forward command fails before HEAD changes", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ".codex", "hooks.json");
    const activeBefore = readFileSync(activePath);
    const headBefore = git(fixture.checkout, "rev-parse", "HEAD");
    const statusBefore = readOnlyStatus(fixture.checkout);
    const binDir = join(fixture.fixtureRoot, "git-wrapper");
    mkdirSync(binDir);
    const wrapper = join(binDir, "git");
    const realGit = Bun.which("git");
    expect(realGit).not.toBeNull();
    writeFileSync(
      wrapper,
      `#!/usr/bin/env bash
for arg in "$@"; do
  if [ "$arg" = "merge" ]; then exit 97; fi
done
exec "${realGit}" "$@"
`,
    );
    chmodSync(wrapper, 0o755);

    const rejected = runMigration(fixture, fixture.targetRef, {
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
    });

    expect(rejected.exitCode).toBe(1);
    expect(rejected.stderr.toString()).toContain("[MERGE_FAILED]");
    expect(git(fixture.checkout, "rev-parse", "HEAD")).toBe(headBefore);
    expect(readFileSync(activePath)).toEqual(activeBefore);
    expect(readOnlyStatus(fixture.checkout)).toBe(statusBefore);
    const backupMatch = rejected.stderr.toString().match(/backup remains at (.+)$/m);
    expect(backupMatch).not.toBeNull();
    expect(sha256(backupMatch![1])).toBe(sha256(activePath));
    tempDirs.push(dirname(backupMatch![1]));
  });

  test("requires manual recovery without reset when Git reports failure after HEAD changes", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ".codex", "hooks.json");
    const activeSha = sha256(activePath);
    const binDir = join(fixture.fixtureRoot, "git-wrapper-after-merge");
    mkdirSync(binDir);
    const wrapper = join(binDir, "git");
    const realGit = Bun.which("git");
    expect(realGit).not.toBeNull();
    writeFileSync(
      wrapper,
      `#!/usr/bin/env bash
for arg in "$@"; do
  if [ "$arg" = "merge" ]; then
    "${realGit}" "$@" || exit $?
    exit 97
  fi
done
exec "${realGit}" "$@"
`,
    );
    chmodSync(wrapper, 0o755);

    const rejected = runMigration(fixture, fixture.targetRef, {
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
    });

    expect(rejected.exitCode).toBe(1);
    expect(rejected.stderr.toString()).toContain("[RECOVERY_REQUIRED]");
    expect(git(fixture.checkout, "rev-parse", "HEAD")).toBe(fixture.targetCommit);
    expect(existsSync(activePath)).toBe(true);
    expect(sha256(activePath)).toBe(activeSha);
    const backupMatch = rejected.stderr.toString().match(/backup remains at (.+)$/m);
    expect(backupMatch).not.toBeNull();
    expect(sha256(backupMatch![1])).toBe(activeSha);
    tempDirs.push(dirname(backupMatch![1]));
  });

  test("reports manual recovery when an external merge side effect blocks active restoration", () => {
    const fixture = createSelfMigrationFixture();
    const binDir = join(fixture.fixtureRoot, "git-wrapper-active-blocker");
    mkdirSync(binDir);
    const wrapper = join(binDir, "git");
    const realGit = Bun.which("git");
    expect(realGit).not.toBeNull();
    writeFileSync(
      wrapper,
      `#!/usr/bin/env bash
for arg in "$@"; do
  if [ "$arg" = "merge" ]; then
    "${realGit}" "$@" || exit $?
    mkdir -p "$PWD/.codex/hooks.json"
    exit 0
  fi
done
exec "${realGit}" "$@"
`,
    );
    chmodSync(wrapper, 0o755);

    const rejected = runMigration(fixture, fixture.targetRef, {
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
    });

    expect(rejected.exitCode).toBe(1);
    expect(rejected.stderr.toString()).toContain("[RECOVERY_REQUIRED]");
    expect(rejected.stderr.toString()).toContain(
      "target merged but active hooks require recovery from",
    );
    expect(git(fixture.checkout, "rev-parse", "HEAD")).toBe(fixture.targetCommit);
    expect(statSync(join(fixture.checkout, ACTIVE_HOOKS_PATH)).isDirectory()).toBe(true);
    const backupMatch = rejected.stderr.toString().match(/recovery from (.+)$/m);
    expect(backupMatch).not.toBeNull();
    tempDirs.push(dirname(backupMatch![1]));
  });

  test("falls back to a verified copy when backup rename crosses filesystems", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ACTIVE_HOOKS_PATH);
    const activeSha = sha256(activePath);
    const renameSpy = spyOnBackupRenameExdev(activePath);
    let migrated: ReturnType<typeof runMigration>;
    try {
      migrated = runMigration(
        fixture,
        fixture.targetRef,
        migrationTempEnv(fixture, "exdev-success-tmp"),
      );
    } finally {
      renameSpy.mockRestore();
    }

    expect(migrated!.exitCode, migrated!.stderr.toString()).toBe(0);
    const backupMatch = migrated!.stdout.toString().match(/^Backup: (.+)$/m);
    expect(backupMatch).not.toBeNull();
    expect(sha256(backupMatch![1])).toBe(activeSha);
    expect(sha256(activePath)).toBe(activeSha);
  });

  test("fails closed when the cross-device backup copy fails", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ACTIVE_HOOKS_PATH);
    const renameSpy = spyOnBackupRenameExdev(activePath);
    const originalCopyFileSync = nodeFs.copyFileSync;
    const copySpy = spyOn(nodeFs, "copyFileSync").mockImplementation(
      (source, destination, mode) => {
        if (String(source) === activePath && isPrivateHooksBackup(destination)) {
          throw fsError("EIO", "injected backup copy failure");
        }
        originalCopyFileSync(source, destination, mode);
      },
    );
    let rejected: ReturnType<typeof runMigration>;
    try {
      rejected = runMigration(
        fixture,
        fixture.targetRef,
        migrationTempEnv(fixture, "exdev-copy-failure-tmp"),
      );
    } finally {
      copySpy.mockRestore();
      renameSpy.mockRestore();
    }

    expect(rejected!.exitCode).toBe(1);
    expect(rejected!.stderr.toString()).toContain("[BACKUP_COPY_FAILED]");
    expect(existsSync(activePath)).toBe(true);
  });

  test("fails closed when the cross-device backup copy cannot be verified", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ACTIVE_HOOKS_PATH);
    const renameSpy = spyOnBackupRenameExdev(activePath);
    const originalReadFileSync = nodeFs.readFileSync;
    const readSpy = spyOn(nodeFs, "readFileSync").mockImplementation(
      ((path, options) => {
        if (isPrivateHooksBackup(path)) {
          throw fsError("EIO", "injected backup read failure");
        }
        return originalReadFileSync(path, options);
      }) as typeof nodeFs.readFileSync,
    );
    let rejected: ReturnType<typeof runMigration>;
    try {
      rejected = runMigration(
        fixture,
        fixture.targetRef,
        migrationTempEnv(fixture, "exdev-verify-failure-tmp"),
      );
    } finally {
      readSpy.mockRestore();
      renameSpy.mockRestore();
    }

    expect(rejected!.exitCode).toBe(1);
    expect(rejected!.stderr.toString()).toContain("[BACKUP_COPY_VERIFY_FAILED]");
    expect(existsSync(activePath)).toBe(true);
  });

  test("fails closed when the cross-device backup SHA differs", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ACTIVE_HOOKS_PATH);
    const renameSpy = spyOnBackupRenameExdev(activePath);
    const originalReadFileSync = nodeFs.readFileSync;
    const readSpy = spyOn(nodeFs, "readFileSync").mockImplementation(
      ((path, options) => {
        if (isPrivateHooksBackup(path)) return Buffer.from("injected mismatch");
        return originalReadFileSync(path, options);
      }) as typeof nodeFs.readFileSync,
    );
    let rejected: ReturnType<typeof runMigration>;
    try {
      rejected = runMigration(
        fixture,
        fixture.targetRef,
        migrationTempEnv(fixture, "exdev-sha-failure-tmp"),
      );
    } finally {
      readSpy.mockRestore();
      renameSpy.mockRestore();
    }

    expect(rejected!.exitCode).toBe(1);
    expect(rejected!.stderr.toString()).toContain("[BACKUP_SHA_MISMATCH]");
    expect(existsSync(activePath)).toBe(true);
  });

  test("fails closed when the cross-device source cannot be removed", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ACTIVE_HOOKS_PATH);
    const renameSpy = spyOnBackupRenameExdev(activePath);
    const originalUnlinkSync = nodeFs.unlinkSync;
    const unlinkSpy = spyOn(nodeFs, "unlinkSync").mockImplementation((path) => {
      if (String(path) === activePath) {
        throw fsError("EPERM", "injected source removal failure");
      }
      originalUnlinkSync(path);
    });
    let rejected: ReturnType<typeof runMigration>;
    try {
      rejected = runMigration(
        fixture,
        fixture.targetRef,
        migrationTempEnv(fixture, "exdev-unlink-failure-tmp"),
      );
    } finally {
      unlinkSpy.mockRestore();
      renameSpy.mockRestore();
    }

    expect(rejected!.exitCode).toBe(1);
    expect(rejected!.stderr.toString()).toContain("[BACKUP_SOURCE_REMOVE_FAILED]");
    expect(existsSync(activePath)).toBe(true);
  });

  test("fails closed when the private backup directory cannot be created", () => {
    const fixture = createSelfMigrationFixture();
    const originalMkdtempSync = nodeFs.mkdtempSync;
    const mkdtempSpy = spyOn(nodeFs, "mkdtempSync").mockImplementation(
      ((prefix: string, options?: unknown) => {
        if (prefix.endsWith("amadeus-codex-hooks-")) {
          throw fsError("EACCES", "injected backup directory failure");
        }
        return Reflect.apply(originalMkdtempSync, nodeFs, [prefix, options]);
      }) as unknown as typeof nodeFs.mkdtempSync,
    );
    let rejected: ReturnType<typeof runMigration>;
    try {
      rejected = runMigration(
        fixture,
        fixture.targetRef,
        migrationTempEnv(fixture, "backup-directory-failure-tmp"),
      );
    } finally {
      mkdtempSpy.mockRestore();
    }

    expect(rejected!.exitCode).toBe(1);
    expect(rejected!.stderr.toString()).toContain("[BACKUP_DIRECTORY_FAILED]");
  });

  test("fails closed when the private backup directory cannot be canonicalized", () => {
    const fixture = createSelfMigrationFixture();
    const originalRealpathSync = nodeFs.realpathSync;
    const realpathSpy = spyOn(nodeFs, "realpathSync").mockImplementation(
      ((path: unknown, options?: unknown) => {
        if (isPrivateHooksBackupDirectory(path)) {
          throw fsError("EIO", "injected backup realpath failure");
        }
        return Reflect.apply(originalRealpathSync, nodeFs, [path, options]);
      }) as unknown as typeof nodeFs.realpathSync,
    );
    let rejected: ReturnType<typeof runMigration>;
    try {
      rejected = runMigration(
        fixture,
        fixture.targetRef,
        migrationTempEnv(fixture, "backup-realpath-failure-tmp"),
      );
    } finally {
      realpathSpy.mockRestore();
    }

    expect(rejected!.exitCode).toBe(1);
    expect(rejected!.stderr.toString()).toContain("[BACKUP_LOCATION_UNREADABLE]");
  });

  test("fails closed when active hooks cannot move into the private backup", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ACTIVE_HOOKS_PATH);
    const originalRenameSync = nodeFs.renameSync;
    const renameSpy = spyOn(nodeFs, "renameSync").mockImplementation((oldPath, newPath) => {
      if (String(oldPath) === activePath && isPrivateHooksBackup(newPath)) {
        throw fsError("EPERM", "injected backup move failure");
      }
      originalRenameSync(oldPath, newPath);
    });
    let rejected: ReturnType<typeof runMigration>;
    try {
      rejected = runMigration(
        fixture,
        fixture.targetRef,
        migrationTempEnv(fixture, "backup-move-failure-tmp"),
      );
    } finally {
      renameSpy.mockRestore();
    }

    expect(rejected!.exitCode).toBe(1);
    expect(rejected!.stderr.toString()).toContain("[BACKUP_MOVE_FAILED]");
    expect(existsSync(activePath)).toBe(true);
  });

  test("restores active hooks when the private backup cannot be read", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ACTIVE_HOOKS_PATH);
    const originalReadFileSync = nodeFs.readFileSync;
    const readSpy = spyOn(nodeFs, "readFileSync").mockImplementation(
      ((path, options) => {
        if (isPrivateHooksBackup(path)) {
          throw fsError("EIO", "injected private backup read failure");
        }
        return originalReadFileSync(path, options);
      }) as typeof nodeFs.readFileSync,
    );
    let rejected: ReturnType<typeof runMigration>;
    try {
      rejected = runMigration(
        fixture,
        fixture.targetRef,
        migrationTempEnv(fixture, "backup-read-failure-tmp"),
      );
    } finally {
      readSpy.mockRestore();
    }

    expect(rejected!.exitCode).toBe(1);
    expect(rejected!.stderr.toString()).toContain("[BACKUP_READ_FAILED]");
    expect(existsSync(activePath)).toBe(true);
  });

  test("restores active hooks when the private backup SHA differs", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ACTIVE_HOOKS_PATH);
    const originalReadFileSync = nodeFs.readFileSync;
    const readSpy = spyOn(nodeFs, "readFileSync").mockImplementation(
      ((path, options) => {
        if (isPrivateHooksBackup(path)) return Buffer.from("injected mismatch");
        return originalReadFileSync(path, options);
      }) as typeof nodeFs.readFileSync,
    );
    let rejected: ReturnType<typeof runMigration>;
    try {
      rejected = runMigration(
        fixture,
        fixture.targetRef,
        migrationTempEnv(fixture, "backup-sha-failure-tmp"),
      );
    } finally {
      readSpy.mockRestore();
    }

    expect(rejected!.exitCode).toBe(1);
    expect(rejected!.stderr.toString()).toContain("[BACKUP_SHA_MISMATCH]");
    expect(existsSync(activePath)).toBe(true);
  });

  test("requires manual recovery when backup finalization and restoration both fail", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ACTIVE_HOOKS_PATH);
    const originalChmodSync = nodeFs.chmodSync;
    const originalCopyFileSync = nodeFs.copyFileSync;
    const chmodSpy = spyOn(nodeFs, "chmodSync").mockImplementation((path, mode) => {
      if (isPrivateHooksBackup(path)) {
        throw fsError("EPERM", "injected backup chmod failure");
      }
      originalChmodSync(path, mode);
    });
    const copySpy = spyOn(nodeFs, "copyFileSync").mockImplementation(
      (source, destination, mode) => {
        if (isPrivateHooksBackup(source) && String(destination) === activePath) {
          throw fsError("EIO", "injected active restoration failure");
        }
        originalCopyFileSync(source, destination, mode);
      },
    );
    let rejected: ReturnType<typeof runMigration>;
    try {
      rejected = runMigration(
        fixture,
        fixture.targetRef,
        migrationTempEnv(fixture, "backup-restore-failure-tmp"),
      );
    } finally {
      copySpy.mockRestore();
      chmodSpy.mockRestore();
    }

    expect(rejected!.exitCode).toBe(1);
    expect(rejected!.stderr.toString()).toContain("[RECOVERY_REQUIRED]");
    expect(rejected!.stderr.toString()).toContain("active hooks require recovery from");
    expect(existsSync(activePath)).toBe(false);
  });

  test("propagates an unexpected postcondition filesystem failure", () => {
    const fixture = createSelfMigrationFixture();
    const originalExistsSync = nodeFs.existsSync;
    const existsSpy = spyOn(nodeFs, "existsSync").mockImplementation((path) => {
      if (isPrivateHooksBackup(path)) {
        throw fsError("EIO", "injected postcondition filesystem failure");
      }
      return originalExistsSync(path);
    });
    let rejected: ReturnType<typeof runMigration>;
    try {
      rejected = runMigration(
        fixture,
        fixture.targetRef,
        migrationTempEnv(fixture, "postcondition-filesystem-failure-tmp"),
      );
    } finally {
      existsSpy.mockRestore();
    }

    expect(rejected!.exitCode).toBe(1);
    expect(rejected!.stderr.toString()).toContain(
      "ERROR: injected postcondition filesystem failure",
    );
    expect(rejected!.stderr.toString()).not.toContain("[RECOVERY_REQUIRED]");
  });

  test("restores active hooks and retains the backup when permission finalization fails after rename", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ".codex", "hooks.json");
    const activeSha = sha256(activePath);
    const headBefore = git(fixture.checkout, "rev-parse", "HEAD");
    const originalChmodSync = nodeFs.chmodSync;
    const chmodSpy = spyOn(nodeFs, "chmodSync").mockImplementation((path, mode) => {
      if (isPrivateHooksBackup(path)) {
        throw fsError("EPERM", "injected backup chmod failure");
      }
      originalChmodSync(path, mode);
    });
    let rejected: ReturnType<typeof runMigration>;
    try {
      rejected = runMigration(fixture);
    } finally {
      chmodSpy.mockRestore();
    }

    expect(rejected!.exitCode).toBe(1);
    expect(rejected!.stderr.toString()).toContain("[BACKUP_PERMISSION_FAILED]");
    expect(git(fixture.checkout, "rev-parse", "HEAD")).toBe(headBefore);
    expect(sha256(activePath)).toBe(activeSha);
    const backupMatch = rejected!.stderr.toString().match(/backup remains at (.+)$/m);
    expect(backupMatch).not.toBeNull();
    expect(sha256(backupMatch![1])).toBe(activeSha);
    tempDirs.push(dirname(backupMatch![1]));
  });

  test("retains and reports the backup when a postcondition fails", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ".codex", "hooks.json");
    const activeSha = sha256(activePath);
    const binDir = join(fixture.fixtureRoot, "git-wrapper-postcheck");
    mkdirSync(binDir);
    const wrapper = join(binDir, "git");
    const realGit = Bun.which("git");
    expect(realGit).not.toBeNull();
    writeFileSync(
      wrapper,
      `#!/usr/bin/env bash
for arg in "$@"; do
  if [ "$arg" = "check-ignore" ]; then
    head="$("${realGit}" rev-parse --verify HEAD 2>/dev/null || true)"
    if [ "$head" = "${fixture.targetCommit}" ]; then exit 98; fi
  fi
done
exec "${realGit}" "$@"
`,
    );
    chmodSync(wrapper, 0o755);

    const rejected = runMigration(fixture, fixture.targetRef, {
      PATH: `${binDir}:${process.env.PATH ?? ""}`,
    });

    expect(rejected.exitCode).toBe(1);
    expect(rejected.stderr.toString()).toContain("[POST_ACTIVE_NOT_IGNORED]");
    expect(git(fixture.checkout, "rev-parse", "HEAD")).toBe(fixture.targetCommit);
    expect(sha256(activePath)).toBe(activeSha);
    const backupMatch = rejected.stderr.toString().match(/backup remains at (.+)$/m);
    expect(backupMatch).not.toBeNull();
    expect(sha256(backupMatch![1])).toBe(activeSha);
    tempDirs.push(dirname(backupMatch![1]));
  });
});

describe("unsafe self migration controls", () => {
  test("a direct fast-forward merge refuses dirty tracked active hooks", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ".codex", "hooks.json");
    const headBefore = git(fixture.checkout, "rev-parse", "HEAD");
    const shaBefore = sha256(activePath);

    const merged = run(fixture.checkout, [
      "git",
      "-c",
      "merge.autoStash=false",
      "merge",
      "--ff-only",
      fixture.targetCommit,
    ]);

    expect(merged.exitCode).not.toBe(0);
    expect(git(fixture.checkout, "rev-parse", "HEAD")).toBe(headBefore);
    expect(sha256(activePath)).toBe(shaBefore);
  });

  test("pull with autostash does not establish the clean ownership contract", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ".codex", "hooks.json");
    const shaBefore = sha256(activePath);

    const pulled = run(fixture.checkout, [
      "git",
      "-c",
      "rebase.autoStash=true",
      "pull",
      "--rebase",
      "origin",
      "fix",
    ]);
    const contractEstablished =
      pulled.exitCode === 0 &&
      sha256(activePath) === shaBefore &&
      git(fixture.checkout, "status", "--short") === "" &&
      git(fixture.checkout, "ls-files", ACTIVE_HOOKS_PATH) === "" &&
      run(fixture.checkout, ["git", "check-ignore", "-q", ACTIVE_HOOKS_PATH]).exitCode === 0;

    expect(contractEstablished).toBe(false);
  });

  test("untracking active hooks before update does not establish the clean ownership contract", () => {
    const fixture = createSelfMigrationFixture();
    const activePath = join(fixture.checkout, ".codex", "hooks.json");
    const shaBefore = sha256(activePath);
    git(fixture.checkout, "rm", "--cached", "--", ACTIVE_HOOKS_PATH);

    const merged = run(fixture.checkout, [
      "git",
      "-c",
      "merge.autoStash=false",
      "merge",
      "--ff-only",
      fixture.targetCommit,
    ]);
    const contractEstablished =
      merged.exitCode === 0 &&
      sha256(activePath) === shaBefore &&
      git(fixture.checkout, "status", "--short") === "" &&
      git(fixture.checkout, "ls-files", ACTIVE_HOOKS_PATH) === "" &&
      run(fixture.checkout, ["git", "check-ignore", "-q", ACTIVE_HOOKS_PATH]).exitCode === 0;

    expect(contractEstablished).toBe(false);
  });
});
