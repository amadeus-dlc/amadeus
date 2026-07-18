import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  constants as fsConstants,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  ACTIVE_HOOKS_PATH,
  CANONICAL_HOOKS_PATH,
  codexHooksDoctorCheck,
  hookTuplesMatch,
  inspectCodexHooks,
  type CodexHookTuple,
} from "./amadeus-codex-hooks-contract.ts";

export interface CodexHooksMigrationResult {
  backupPath: string;
  sha256: string;
  targetCommit: string;
}

export class CodexHooksMigrationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CodexHooksMigrationError";
  }
}

const HELPER_PATHS = [
  ".codex/tools/amadeus-codex-hooks.ts",
  ".codex/tools/amadeus-codex-hooks-contract.ts",
  ".codex/tools/amadeus-codex-hooks-migration.ts",
];
const SELF_REPOSITORY_URL = "https://github.com/amadeus-dlc/amadeus";

interface GitTextResult {
  status: number;
  stdout: string;
}

function gitEnvironment(readOnly: boolean): NodeJS.ProcessEnv {
  return readOnly ? { ...process.env, GIT_OPTIONAL_LOCKS: "0" } : process.env;
}

function runGit(projectDir: string, args: string[], readOnly = false): GitTextResult {
  const result = spawnSync("git", args, {
    cwd: projectDir,
    encoding: "utf8",
    env: gitEnvironment(readOnly),
  });
  return { status: result.status ?? 1, stdout: result.stdout ?? "" };
}

function runGitBuffer(projectDir: string, args: string[]): { status: number; stdout: Buffer } {
  const result = spawnSync("git", args, {
    cwd: projectDir,
    env: gitEnvironment(true),
  });
  return {
    status: result.status ?? 1,
    stdout: Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.alloc(0),
  };
}

function gitOutput(
  projectDir: string,
  args: string[],
  code: string,
  message: string,
): string {
  const result = runGit(projectDir, args, true);
  if (result.status !== 0) {
    throw new CodexHooksMigrationError(code, `${message} (git exit ${result.status})`);
  }
  return result.stdout;
}

function gitBufferOutput(
  projectDir: string,
  args: string[],
  code: string,
  message: string,
): Buffer {
  const result = runGitBuffer(projectDir, args);
  if (result.status !== 0) {
    throw new CodexHooksMigrationError(code, `${message} (git exit ${result.status})`);
  }
  return result.stdout;
}

function gitBlob(projectDir: string, commit: string, path: string): string | null {
  const result = runGit(projectDir, ["show", `${commit}:${path}`], true);
  return result.status === 0 ? result.stdout : null;
}

function gitTracks(projectDir: string, commit: string, path: string): boolean {
  return runGit(projectDir, ["cat-file", "-e", `${commit}:${path}`], true).status === 0;
}

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function isolatedGitEnvironment(
  emptyConfig: string,
  emptyTemplate: string,
  emptyHome: string,
  emptyXdgConfig: string,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_CONFIG_GLOBAL: emptyConfig,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_SYSTEM: emptyConfig,
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TEMPLATE_DIR: emptyTemplate,
    HOME: emptyHome,
    XDG_CONFIG_HOME: emptyXdgConfig,
  };
  delete env.GIT_CONFIG;
  delete env.GIT_CONFIG_PARAMETERS;
  for (const key of Object.keys(env)) {
    if (/^GIT_CONFIG_(?:COUNT|KEY_\d+|VALUE_\d+)$/.test(key)) delete env[key];
  }
  return env;
}

function targetIgnoresActive(
  rawGitignore: string,
  rawCodexGitignore: string | null,
): boolean {
  const probeDir = mkdtempSync(join(tmpdir(), "amadeus-codex-ignore-"));
  try {
    const emptyConfig = join(probeDir, "empty-gitconfig");
    const emptyTemplate = join(probeDir, "empty-template");
    const emptyHome = join(probeDir, "empty-home");
    const emptyXdgConfig = join(probeDir, "empty-xdg");
    writeFileSync(emptyConfig, "");
    mkdirSync(emptyTemplate);
    mkdirSync(emptyHome);
    mkdirSync(emptyXdgConfig);
    const env = isolatedGitEnvironment(
      emptyConfig,
      emptyTemplate,
      emptyHome,
      emptyXdgConfig,
    );
    const initialized = spawnSync("git", ["init", "-q"], {
      cwd: probeDir,
      encoding: "utf8",
      env,
    });
    if (initialized.status !== 0) return false;
    writeFileSync(join(probeDir, ".gitignore"), rawGitignore);
    mkdirSync(join(probeDir, ".codex"));
    if (rawCodexGitignore !== null) {
      writeFileSync(join(probeDir, ".codex", ".gitignore"), rawCodexGitignore);
    }
    writeFileSync(join(probeDir, ACTIVE_HOOKS_PATH), "");
    return (
      spawnSync(
        "git",
        [
          "-c",
          `core.excludesFile=${emptyConfig}`,
          "check-ignore",
          "--no-index",
          "-q",
          "--",
          ACTIVE_HOOKS_PATH,
        ],
        { cwd: probeDir, encoding: "utf8", env },
      ).status === 0
    );
  } finally {
    rmSync(probeDir, { recursive: true, force: true });
  }
}

function isSelfCommit(projectDir: string, commit: string): boolean {
  const packageJson = gitBlob(projectDir, commit, "package.json");
  if (
    packageJson === null ||
    !gitTracks(projectDir, commit, "scripts/package.ts") ||
    !gitTracks(projectDir, commit, "scripts/promote-self.ts")
  ) {
    return false;
  }
  try {
    const parsed = JSON.parse(packageJson) as { private?: unknown; repository?: unknown };
    const repository = parsed.repository;
    return (
      parsed.private === true &&
      repository !== null &&
      typeof repository === "object" &&
      !Array.isArray(repository) &&
      (repository as { url?: unknown }).url === SELF_REPOSITORY_URL
    );
  } catch {
    return false;
  }
}

const UNMERGED_CODES = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]);
const ACTIVE_PATH_BYTES = Buffer.from(ACTIVE_HOOKS_PATH);

function splitNul(buffer: Buffer): Buffer[] {
  const entries: Buffer[] = [];
  let start = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] !== 0) continue;
    if (i > start) entries.push(buffer.subarray(start, i));
    start = i + 1;
  }
  if (start < buffer.length) entries.push(buffer.subarray(start));
  return entries;
}

function safeGitPath(path: Buffer): string {
  const decoded = path.toString("utf8");
  return Buffer.from(decoded, "utf8").equals(path)
    ? JSON.stringify(decoded)
    : JSON.stringify(`hex:${path.toString("hex")}`);
}

function assertCleanMigrationWorkspace(projectDir: string): void {
  const porcelain = gitBufferOutput(
    projectDir,
    ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignore-submodules=none"],
    "GIT_STATUS_FAILED",
    "unable to inspect the self repository worktree",
  );
  for (const entry of splitNul(porcelain)) {
    if (entry.length < 4) {
      throw new CodexHooksMigrationError("GIT_STATUS_INVALID", "git status returned an invalid record");
    }
    const status = entry.subarray(0, 2).toString("ascii");
    const path = entry.subarray(3);
    const renderedPath = safeGitPath(path);
    if (UNMERGED_CODES.has(status)) {
      throw new CodexHooksMigrationError(
        "UNMERGED_PATHS",
        `unmerged path must be resolved first: ${renderedPath}`,
      );
    }
    if (status === "??") {
      throw new CodexHooksMigrationError(
        "UNTRACKED_CHANGES",
        `untracked path blocks migration: ${renderedPath}`,
      );
    }
    if (status[0] !== " ") {
      throw new CodexHooksMigrationError(
        "STAGED_CHANGES",
        `staged path blocks migration: ${renderedPath}`,
      );
    }
    if (status !== " M" || !path.equals(ACTIVE_PATH_BYTES)) {
      throw new CodexHooksMigrationError(
        "UNRELATED_TRACKED_CHANGES",
        `tracked path blocks migration: ${renderedPath}`,
      );
    }
  }
}

function isPathWithin(parent: string, candidate: string): boolean {
  const delta = relative(resolve(parent), resolve(candidate));
  return delta === "" || (delta !== ".." && !delta.startsWith(`..${sep}`) && !isAbsolute(delta));
}

function restoreActiveFromBackup(
  activePath: string,
  backupPath: string,
  expectedSha: string,
): boolean {
  try {
    if (!existsSync(activePath)) {
      copyFileSync(backupPath, activePath, fsConstants.COPYFILE_EXCL);
    }
    return sha256File(activePath) === expectedSha;
  } catch {
    return false;
  }
}

function throwBackupFinalizationError(
  activePath: string,
  backupPath: string,
  expectedSha: string,
  code: string,
  message: string,
): never {
  const restored = restoreActiveFromBackup(activePath, backupPath, expectedSha);
  throw new CodexHooksMigrationError(
    restored ? code : "RECOVERY_REQUIRED",
    restored
      ? `${message}; active hooks were restored and backup remains at ${backupPath}`
      : `${message}; active hooks require recovery from ${backupPath}`,
  );
}

function copyActiveAcrossDevices(
  activePath: string,
  backupPath: string,
  expectedSha: string,
): void {
  try {
    copyFileSync(activePath, backupPath, fsConstants.COPYFILE_EXCL);
    chmodSync(backupPath, 0o600);
  } catch {
    throw new CodexHooksMigrationError(
      "BACKUP_COPY_FAILED",
      "cross-device backup copy failed before source removal",
    );
  }
  let backupSha: string;
  try {
    backupSha = sha256File(backupPath);
  } catch {
    throw new CodexHooksMigrationError(
      "BACKUP_COPY_VERIFY_FAILED",
      "cross-device backup could not be verified before source removal",
    );
  }
  if (backupSha !== expectedSha) {
    throw new CodexHooksMigrationError(
      "BACKUP_SHA_MISMATCH",
      "backup SHA-256 verification failed before source removal",
    );
  }
  try {
    unlinkSync(activePath);
  } catch {
    throw new CodexHooksMigrationError(
      "BACKUP_SOURCE_REMOVE_FAILED",
      "backup succeeded but the active source could not be removed",
    );
  }
}

function moveActiveToPrivateBackup(
  projectDir: string,
  commonGitDir: string,
  activePath: string,
  expectedSha: string,
): string {
  let backupDir: string;
  try {
    backupDir = mkdtempSync(join(tmpdir(), "amadeus-codex-hooks-"));
    chmodSync(backupDir, 0o700);
  } catch {
    throw new CodexHooksMigrationError(
      "BACKUP_DIRECTORY_FAILED",
      "unable to create the private backup directory",
    );
  }
  let backupRealPath: string;
  try {
    backupRealPath = realpathSync(backupDir);
  } catch {
    rmSync(backupDir, { recursive: true, force: true });
    throw new CodexHooksMigrationError(
      "BACKUP_LOCATION_UNREADABLE",
      "unable to canonicalize the private backup directory",
    );
  }
  if (
    isPathWithin(realpathSync(projectDir), backupRealPath) ||
    isPathWithin(realpathSync(commonGitDir), backupRealPath)
  ) {
    rmSync(backupDir, { recursive: true, force: true });
    throw new CodexHooksMigrationError(
      "BACKUP_LOCATION_UNSAFE",
      "the private backup directory resolved inside the repository",
    );
  }
  const backupPath = join(backupDir, "hooks.json");
  try {
    renameSync(activePath, backupPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") {
      throw new CodexHooksMigrationError("BACKUP_MOVE_FAILED", "unable to move active hooks to backup");
    }
    copyActiveAcrossDevices(activePath, backupPath, expectedSha);
  }
  try {
    chmodSync(backupPath, 0o600);
  } catch {
    throwBackupFinalizationError(
      activePath,
      backupPath,
      expectedSha,
      "BACKUP_PERMISSION_FAILED",
      "unable to set private backup permissions",
    );
  }
  let backupSha: string;
  try {
    backupSha = sha256File(backupPath);
  } catch {
    throwBackupFinalizationError(
      activePath,
      backupPath,
      expectedSha,
      "BACKUP_READ_FAILED",
      "unable to verify the private backup SHA-256",
    );
  }
  if (backupSha !== expectedSha) {
    throwBackupFinalizationError(
      activePath,
      backupPath,
      expectedSha,
      "BACKUP_SHA_MISMATCH",
      "backup SHA-256 verification failed",
    );
  }
  return backupPath;
}

interface MigrationPreflight {
  activePath: string;
  commonGitDir: string;
  originalHead: string;
  originalSha: string;
  stashBefore: string;
  targetCommit: string;
}

function targetCanonicalForMigration(
  projectDir: string,
  targetCommit: string,
): CodexHookTuple[] {
  if (gitTracks(projectDir, targetCommit, ACTIVE_HOOKS_PATH)) {
    throw new CodexHooksMigrationError(
      "TARGET_ACTIVE_TRACKED",
      "target ref still tracks the active hooks file",
    );
  }
  const canonicalRaw = gitBlob(projectDir, targetCommit, CANONICAL_HOOKS_PATH);
  if (canonicalRaw === null) {
    throw new CodexHooksMigrationError(
      "TARGET_CANONICAL_MISSING",
      "target ref does not track the canonical hooks example",
    );
  }
  const canonical = inspectCodexHooks(canonicalRaw);
  if (canonical.kind === "json-invalid") {
    throw new CodexHooksMigrationError(
      "TARGET_CANONICAL_JSON_INVALID",
      "target canonical hooks example contains invalid JSON",
    );
  }
  if (canonical.kind === "structure-invalid") {
    throw new CodexHooksMigrationError(
      "TARGET_CANONICAL_STRUCTURE_INVALID",
      "target canonical hooks example has invalid hook structure",
    );
  }
  if (canonical.tuples.length === 0) {
    throw new CodexHooksMigrationError(
      "TARGET_CANONICAL_TUPLES_MISSING",
      "target canonical hooks example wires no Amadeus adapter commands",
    );
  }
  const targetGitignore = gitBlob(projectDir, targetCommit, ".gitignore");
  const targetCodexGitignore = gitBlob(projectDir, targetCommit, ".codex/.gitignore");
  if (
    targetGitignore === null ||
    !targetIgnoresActive(targetGitignore, targetCodexGitignore)
  ) {
    throw new CodexHooksMigrationError(
      "TARGET_IGNORE_MISSING",
      "target ref does not ignore the active hooks file",
    );
  }
  if (HELPER_PATHS.some((path) => !gitTracks(projectDir, targetCommit, path))) {
    throw new CodexHooksMigrationError(
      "TARGET_HELPER_MISSING",
      "target ref does not contain the complete Codex hooks helper",
    );
  }
  return canonical.tuples;
}

function migrationPreflight(projectDir: string, targetRef: string): MigrationPreflight {
  const originalHead = gitOutput(
    projectDir,
    ["rev-parse", "--verify", "HEAD"],
    "NOT_GIT_REPOSITORY",
    "project directory is not a Git repository",
  ).trim();
  const gitRoot = gitOutput(
    projectDir,
    ["rev-parse", "--show-toplevel"],
    "NOT_GIT_REPOSITORY",
    "project directory is not a Git repository",
  ).trim();
  if (realpathSync(projectDir) !== realpathSync(gitRoot)) {
    throw new CodexHooksMigrationError(
      "PROJECT_DIR_NOT_GIT_ROOT",
      "--project-dir must point at the Git worktree root",
    );
  }
  const targetCommit = gitOutput(
    projectDir,
    ["rev-parse", "--verify", "--end-of-options", `${targetRef}^{commit}`],
    "TARGET_REF_NOT_FOUND",
    "target ref is not available locally; fetch it before migration",
  ).trim();
  if (!isSelfCommit(projectDir, originalHead) || !isSelfCommit(projectDir, targetCommit)) {
    throw new CodexHooksMigrationError(
      "NOT_SELF_REPOSITORY",
      "migrate-self is only valid for the Amadeus self repository",
    );
  }
  if (!gitTracks(projectDir, originalHead, ACTIVE_HOOKS_PATH)) {
    throw new CodexHooksMigrationError(
      "CURRENT_ACTIVE_NOT_TRACKED",
      "current HEAD does not track the active hooks file",
    );
  }
  const activePath = join(projectDir, ACTIVE_HOOKS_PATH);
  try {
    const activeStat = lstatSync(activePath);
    if (!activeStat.isFile() || activeStat.isSymbolicLink()) throw new Error("not regular");
  } catch {
    throw new CodexHooksMigrationError(
      "CURRENT_ACTIVE_NOT_REGULAR",
      "current active hooks must be a regular file",
    );
  }
  const targetCanonical = targetCanonicalForMigration(projectDir, targetCommit);
  const ancestor = runGit(
    projectDir,
    ["merge-base", "--is-ancestor", originalHead, targetCommit],
    true,
  );
  if (ancestor.status !== 0) {
    throw new CodexHooksMigrationError(
      "NON_FAST_FORWARD",
      `target ref is not a fast-forward descendant of current HEAD (git exit ${ancestor.status})`,
    );
  }
  assertCleanMigrationWorkspace(projectDir);
  let activeRaw: string;
  try {
    activeRaw = readFileSync(activePath, "utf8");
  } catch {
    throw new CodexHooksMigrationError("ACTIVE_READ_FAILED", "unable to read current active hooks");
  }
  const active = inspectCodexHooks(activeRaw);
  if (active.kind === "json-invalid") {
    throw new CodexHooksMigrationError(
      "ACTIVE_JSON_INVALID",
      "current active hooks contain invalid JSON",
    );
  }
  if (active.kind === "structure-invalid") {
    throw new CodexHooksMigrationError(
      "ACTIVE_STRUCTURE_INVALID",
      "current active hooks have invalid hook structure",
    );
  }
  if (!hookTuplesMatch(targetCanonical, active.tuples)) {
    throw new CodexHooksMigrationError(
      "ACTIVE_TARGET_CONTRACT_MISMATCH",
      "current active hooks do not match the target canonical Amadeus tuples",
    );
  }
  const commonGitRaw = gitOutput(
    projectDir,
    ["rev-parse", "--git-common-dir"],
    "GIT_COMMON_DIR_FAILED",
    "unable to resolve the Git common directory",
  ).trim();
  const commonGitDir = isAbsolute(commonGitRaw) ? commonGitRaw : resolve(projectDir, commonGitRaw);
  const stashBefore = gitOutput(
    projectDir,
    ["stash", "list", "--format=%H"],
    "STASH_INSPECTION_FAILED",
    "unable to inspect the stash list",
  );
  return {
    activePath,
    commonGitDir,
    originalHead,
    originalSha: sha256File(activePath),
    stashBefore,
    targetCommit,
  };
}

function assertMigrationPostconditions(
  projectDir: string,
  preflight: MigrationPreflight,
  backupPath: string,
): void {
  const head = gitOutput(
    projectDir,
    ["rev-parse", "--verify", "HEAD"],
    "POST_HEAD_UNREADABLE",
    "unable to verify HEAD after migration",
  ).trim();
  if (head !== preflight.targetCommit) {
    throw new CodexHooksMigrationError(
      "POST_HEAD_MISMATCH",
      "HEAD does not equal the resolved target commit after migration",
    );
  }
  if (!existsSync(preflight.activePath) || sha256File(preflight.activePath) !== preflight.originalSha) {
    throw new CodexHooksMigrationError(
      "POST_ACTIVE_SHA_MISMATCH",
      "active hooks SHA-256 changed during migration",
    );
  }
  if (gitTracks(projectDir, "HEAD", ACTIVE_HOOKS_PATH)) {
    throw new CodexHooksMigrationError(
      "POST_ACTIVE_TRACKED",
      "active hooks remain tracked after migration",
    );
  }
  if (runGit(projectDir, ["check-ignore", "-q", "--", ACTIVE_HOOKS_PATH], true).status !== 0) {
    throw new CodexHooksMigrationError(
      "POST_ACTIVE_NOT_IGNORED",
      "active hooks are not ignored after migration",
    );
  }
  if (!gitTracks(projectDir, "HEAD", CANONICAL_HOOKS_PATH)) {
    throw new CodexHooksMigrationError(
      "POST_CANONICAL_UNTRACKED",
      "canonical hooks example is not tracked after migration",
    );
  }
  if (
    runGit(projectDir, ["ls-files", "--error-unmatch", "--", CANONICAL_HOOKS_PATH], true)
      .status !== 0
  ) {
    throw new CodexHooksMigrationError(
      "POST_CANONICAL_NOT_IN_INDEX",
      "canonical hooks example is missing from the index after migration",
    );
  }
  const unmerged = gitBufferOutput(
    projectDir,
    ["diff", "--name-only", "--diff-filter=U", "-z"],
    "POST_UNMERGED_INSPECTION_FAILED",
    "unable to inspect unmerged paths after migration",
  );
  if (unmerged.length !== 0) {
    throw new CodexHooksMigrationError("POST_UNMERGED_PATHS", "unmerged paths remain after migration");
  }
  const stashAfter = gitOutput(
    projectDir,
    ["stash", "list", "--format=%H"],
    "POST_STASH_INSPECTION_FAILED",
    "unable to inspect the stash list after migration",
  );
  if (stashAfter !== preflight.stashBefore) {
    throw new CodexHooksMigrationError("POST_STASH_CHANGED", "stash list changed during migration");
  }
  const status = gitBufferOutput(
    projectDir,
    ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignore-submodules=none"],
    "POST_STATUS_FAILED",
    "unable to inspect worktree status after migration",
  );
  if (status.length !== 0) {
    throw new CodexHooksMigrationError("POST_WORKTREE_DIRTY", "worktree is not clean after migration");
  }
  const doctor = codexHooksDoctorCheck(projectDir);
  if (!doctor.pass) throw new CodexHooksMigrationError("POST_DOCTOR_FAILED", doctor.label);
  if (!existsSync(backupPath) || sha256File(backupPath) !== preflight.originalSha) {
    throw new CodexHooksMigrationError(
      "POST_BACKUP_SHA_MISMATCH",
      "retained backup does not match the original active hooks",
    );
  }
}

export function migrateSelfCodexHooks(
  projectDir: string,
  targetRef: string,
): CodexHooksMigrationResult {
  const absoluteProjectDir = resolve(projectDir);
  const preflight = migrationPreflight(absoluteProjectDir, targetRef);
  const backupPath = moveActiveToPrivateBackup(
    absoluteProjectDir,
    preflight.commonGitDir,
    preflight.activePath,
    preflight.originalSha,
  );
  const merge = runGit(absoluteProjectDir, [
    "-c",
    "merge.autoStash=false",
    "merge",
    "--ff-only",
    preflight.targetCommit,
  ]);
  if (merge.status !== 0) {
    const currentHead = runGit(absoluteProjectDir, ["rev-parse", "--verify", "HEAD"], true);
    if (!restoreActiveFromBackup(preflight.activePath, backupPath, preflight.originalSha)) {
      throw new CodexHooksMigrationError(
        "RECOVERY_REQUIRED",
        `merge failed and active hooks require recovery from ${backupPath}`,
      );
    }
    if (currentHead.status !== 0 || currentHead.stdout.trim() !== preflight.originalHead) {
      throw new CodexHooksMigrationError(
        "RECOVERY_REQUIRED",
        `merge failed after HEAD changed; active hooks were restored and backup remains at ${backupPath}`,
      );
    }
    throw new CodexHooksMigrationError(
      "MERGE_FAILED",
      `fast-forward merge failed; active hooks were restored and backup remains at ${backupPath}`,
    );
  }
  try {
    copyFileSync(backupPath, preflight.activePath, fsConstants.COPYFILE_EXCL);
  } catch {
    throw new CodexHooksMigrationError(
      "RECOVERY_REQUIRED",
      `target merged but active hooks require recovery from ${backupPath}`,
    );
  }
  try {
    assertMigrationPostconditions(absoluteProjectDir, preflight, backupPath);
  } catch (error) {
    if (error instanceof CodexHooksMigrationError) {
      throw new CodexHooksMigrationError(
        error.code,
        `${error.message}; backup remains at ${backupPath}`,
      );
    }
    throw error;
  }
  return {
    backupPath,
    sha256: preflight.originalSha,
    targetCommit: preflight.targetCommit,
  };
}
