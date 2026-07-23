// amadeus-leader-sync.ts — deterministic transport for leader-owned records.
//
// The source workspace is read-only. `create` builds an isolated worktree from
// origin/main, copies only the owned set, verifies the resulting commit, pushes
// a short-lived branch, and opens a PR. It never merges a PR.

import {
  closeSync,
  constants as fsConstants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { electionsRoot } from "./amadeus-election-store";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(SCRIPT_DIR, "..");
// Repo-relative form is intentionally separate: startsWith filtering and git
// pathspecs consume repository paths, not absolute filesystem paths.
const ELECTIONS_ROOT_RELATIVE = "amadeus/spaces/default/elections";
const INTENTS_ROOT = "amadeus/spaces/default/intents";
const MEMORY_ROOT = "amadeus/spaces/default/memory";
const CLONE_ID_PATH = "amadeus/.amadeus-clone-id";
const USAGE = "Usage: bun scripts/amadeus-leader-sync.ts <status|plan|create>";

export const SYNC_ELECTION_THRESHOLD = 10;
export const SYNC_SPLIT_FILE_LIMIT = 300;
export const SYNC_BRANCH_RESERVATION_ATTEMPTS = 5;

export type ArgsOutcome =
  | { kind: "status" | "plan" | "create" }
  | { kind: "usage"; message: string };

export type CommandResult =
  | { kind: "ok"; stdout: string }
  | { kind: "error"; exitCode: number; stderr: string };

export type CommandRunner = (args: string[], cwd?: string) => CommandResult;
export type GitRunner = CommandRunner;
export type GhRunner = CommandRunner;

export type SyncError = Readonly<
  | { kind: "clone-id-missing"; detail: string }
  | { kind: "git-failed"; detail: string }
  | { kind: "gh-failed"; detail: string }
  | { kind: "usage"; detail: string }
>;

class SyncFault extends Error {
  constructor(readonly syncError: SyncError) {
    super(syncError.detail);
  }
}

type DetectionFailure = Readonly<{
  kind: "exclusion-violation" | "self-check-failed" | "no-owned-files" | "split-required";
  detail: unknown;
}>;

class DetectionFault extends Error {
  constructor(readonly detection: DetectionFailure) {
    super(detection.kind);
  }
}

function throwDetection(kind: DetectionFailure["kind"], detail: unknown): never {
  throw new DetectionFault(Object.freeze({ kind, detail }));
}

export type FileStatus = "A" | "M" | "D" | "R" | "C" | "T" | "U";
export type FileDiff = Readonly<{ status: FileStatus; path: string }>;

export type OwnedSet = Readonly<{
  electionPaths: readonly string[];
  shardPaths: readonly string[];
}>;

export type ExclusionViolation = Readonly<{
  kind: "foreign-modify" | "memory-touch" | "snapshot-carry";
  path: string;
}>;

export type MarkerHit = Readonly<{ path: string; count: number }>;

export type SelfCheckReport = Readonly<{
  pureAddition: boolean;
  parseFailures: readonly string[];
  markerHits: readonly MarkerHit[];
}>;

export type SyncStatus = Readonly<{
  unsyncedElections: number;
  shardDeltaLines: number;
  normDeltaLines: number;
  thresholdExceeded: boolean;
}>;

export function parseArgs(argv: string[]): ArgsOutcome {
  if (argv.length !== 1) return { kind: "usage", message: USAGE };
  const verb = argv[0];
  if (verb !== "status" && verb !== "plan" && verb !== "create") {
    return { kind: "usage", message: USAGE };
  }
  return { kind: verb };
}

export function shardBasename(host: string, cloneId: string): string {
  if (!/^[a-z0-9]{1,32}$/.test(cloneId)) {
    throw new Error("clone-id must match ^[a-z0-9]{1,32}$");
  }
  const normalized = host
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "host";
  return `${normalized}-${cloneId}.md`;
}

export function readCloneId(projectDir: string): string | null {
  const path = join(projectDir, CLONE_ID_PATH);
  let fd: number | null = null;
  try {
    const noFollow = typeof fsConstants.O_NOFOLLOW === "number" ? fsConstants.O_NOFOLLOW : 0;
    fd = openSync(path, fsConstants.O_RDONLY | noFollow);
    const value = readFileSync(fd, "utf-8").trim();
    return /^[a-z0-9]{1,32}$/.test(value) ? value : null;
  } catch {
    return null;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

function toRepoPath(projectDir: string, path: string): string {
  return relative(projectDir, path).split(sep).join("/");
}

function walkFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) break;
    const entries = readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  return files.sort();
}

export function resolveOwnedSet(projectDir: string, cloneShardName: string): OwnedSet {
  const allPaths = [
    ...walkFiles(electionsRoot(projectDir)),
    ...walkFiles(join(projectDir, INTENTS_ROOT)),
  ].map((path) => toRepoPath(projectDir, path));
  return resolveOwnedCandidates(allPaths, cloneShardName);
}

export function resolveOwnedCandidates(
  allPaths: readonly string[],
  cloneShardName: string,
): OwnedSet {
  const electionPaths = allPaths
    .filter((path) => path.startsWith(`${ELECTIONS_ROOT_RELATIVE}/`))
    .sort();
  const shardPaths = allPaths
    .filter((path) => basename(path) === cloneShardName && basename(dirname(path)) === "audit")
    .sort();
  return Object.freeze({
    electionPaths: Object.freeze(electionPaths),
    shardPaths: Object.freeze(shardPaths),
  });
}

export function ownedPaths(owned: OwnedSet): string[] {
  return [...owned.electionPaths, ...owned.shardPaths].sort();
}

export function parseNameStatus(output: string): FileDiff[] {
  const diffs: FileDiff[] = [];
  for (const line of output.split("\n")) {
    if (line === "") continue;
    const fields = line.split("\t");
    const code = fields[0]?.charAt(0) as FileStatus;
    if (!/[AMDRCTU]/.test(code) || fields.length < 2) {
      throw new Error(`unparseable git name-status row: ${line}`);
    }
    const path = code === "R" || code === "C" ? fields[2] : fields[1];
    if (path === undefined || path === "") {
      throw new Error(`missing path in git name-status row: ${line}`);
    }
    diffs.push(Object.freeze({ status: code, path }));
  }
  return diffs.sort((a, b) => a.path.localeCompare(b.path));
}

function isMemberSnapshot(path: string, owned: ReadonlySet<string>): boolean {
  return path.startsWith(`${INTENTS_ROOT}/`) && !owned.has(path);
}

export function checkExclusions(
  diffs: readonly FileDiff[],
  owned: OwnedSet,
): ExclusionViolation[] {
  const allowed = new Set(ownedPaths(owned));
  const violations: ExclusionViolation[] = [];
  for (const diff of diffs) {
    if (diff.path === MEMORY_ROOT || diff.path.startsWith(`${MEMORY_ROOT}/`)) {
      violations.push(Object.freeze({ kind: "memory-touch", path: diff.path }));
    } else if (isMemberSnapshot(diff.path, allowed)) {
      violations.push(Object.freeze({ kind: "snapshot-carry", path: diff.path }));
    } else if (!allowed.has(diff.path)) {
      violations.push(Object.freeze({ kind: "foreign-modify", path: diff.path }));
    }
  }
  return violations;
}

const MARKER_RE = /^(<<<<<<<|>>>>>>>|\|\|\|\|\|\|\|)/;

export function selfCheck(
  projectDir: string,
  diffs: readonly FileDiff[],
  owned: OwnedSet,
  baseContents: ReadonlyMap<string, string>,
): SelfCheckReport {
  const contents = new Map<string, string>();
  for (const path of ownedPaths(owned)) {
    const absolute = join(projectDir, path);
    if (!existsSync(absolute)) continue;
    contents.set(path, readFileSync(absolute, "utf-8"));
  }
  return analyzeOwnedContents(diffs, owned, contents, baseContents);
}

export function analyzeOwnedContents(
  diffs: readonly FileDiff[],
  owned: OwnedSet,
  contents: ReadonlyMap<string, string>,
  baseContents: ReadonlyMap<string, string> = new Map(),
): SelfCheckReport {
  const pureAddition = isPureAddition(diffs, owned, contents, baseContents);
  const parseFailures: string[] = [];
  const markerHits: MarkerHit[] = [];
  for (const path of ownedPaths(owned)) {
    const content = contents.get(path);
    if (content === undefined) continue;
    const inspection = inspectContent(path, content);
    if (inspection.parseFailed) parseFailures.push(path);
    if (inspection.markerCount > 0) {
      markerHits.push(Object.freeze({ path, count: inspection.markerCount }));
    }
  }
  return Object.freeze({
    pureAddition,
    parseFailures: Object.freeze(parseFailures.sort()),
    markerHits: Object.freeze(markerHits.sort((a, b) => a.path.localeCompare(b.path))),
  });
}

function inspectContent(
  path: string,
  content: string,
): { parseFailed: boolean; markerCount: number } {
  let parseFailed = false;
  if (path.endsWith(".json")) {
    try {
      JSON.parse(content);
    } catch {
      parseFailed = true;
    }
  }
  let markerCount = 0;
  for (const line of content.split("\n")) if (MARKER_RE.test(line)) markerCount++;
  return { parseFailed, markerCount };
}

function isPureAddition(
  diffs: readonly FileDiff[],
  owned: OwnedSet,
  contents: ReadonlyMap<string, string>,
  baseContents: ReadonlyMap<string, string>,
): boolean {
  const allowed = new Set(ownedPaths(owned));
  const shardSet = new Set(owned.shardPaths);
  return diffs.every((diff) => {
    if (!allowed.has(diff.path)) return false;
    if (diff.status === "A") return true;
    if (diff.status !== "M" || !shardSet.has(diff.path)) return false;
    const before = baseContents.get(diff.path);
    const after = contents.get(diff.path);
    return before !== undefined && after?.startsWith(before) === true;
  });
}

export function reportPassed(report: SelfCheckReport): boolean {
  return report.pureAddition && report.parseFailures.length === 0 && report.markerHits.length === 0;
}

export function parseNumstat(output: string): number {
  let total = 0;
  for (const line of output.split("\n")) {
    if (line === "") continue;
    const [added, deleted] = line.split("\t");
    if (added === undefined || deleted === undefined) throw new Error(`unparseable numstat row: ${line}`);
    for (const count of [added, deleted]) {
      if (count === "-") continue;
      if (!/^(0|[1-9][0-9]*)$/.test(count)) throw new Error(`unparseable numstat row: ${line}`);
      total += Number.parseInt(count, 10);
    }
  }
  return total;
}

export function deriveSyncStatus(
  sourceElectionDirs: readonly string[],
  baseElectionDirs: readonly string[],
  shardDeltaLines: number,
  normDeltaLines: number,
): SyncStatus {
  const base = new Set(baseElectionDirs);
  const unsyncedElections = sourceElectionDirs.filter((name) => !base.has(name)).length;
  return Object.freeze({
    unsyncedElections,
    shardDeltaLines,
    normDeltaLines,
    thresholdExceeded: unsyncedElections > SYNC_ELECTION_THRESHOLD,
  });
}

function spawnCommand(command: string, args: string[], cwd: string = PROJECT_DIR): CommandResult {
  let child: ReturnType<typeof Bun.spawnSync>;
  try {
    child = Bun.spawnSync({
      cmd: [command, ...args],
      cwd,
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch (error) {
    return { kind: "error", exitCode: 127, stderr: `${command} not runnable: ${String(error)}` };
  }
  const stdout = child.stdout ? new TextDecoder().decode(child.stdout) : "";
  const stderr = child.stderr ? new TextDecoder().decode(child.stderr) : "";
  if (child.exitCode !== 0) return { kind: "error", exitCode: child.exitCode ?? 1, stderr };
  return { kind: "ok", stdout };
}

export function spawnGit(args: string[], cwd?: string): CommandResult {
  return spawnCommand("git", args, cwd);
}

export function spawnGh(args: string[], cwd?: string): CommandResult {
  return spawnCommand("gh", args, cwd);
}

function syncError(kind: SyncError["kind"], detail: string): SyncError {
  return Object.freeze({ kind, detail: detail.replace(/\s*\r?\n\s*/g, " | ") }) as SyncError;
}

function throwSync(kind: SyncError["kind"], detail: string): never {
  throw new SyncFault(syncError(kind, detail));
}

function requireOk(
  result: CommandResult,
  label: string,
  kind: "git-failed" | "gh-failed" = "git-failed",
): string {
  if (result.kind === "error") throwSync(kind, `${label}: ${result.stderr.trim()}`);
  return result.stdout;
}

export function syncErrorExitCode(error: SyncError): 1 | 2 {
  switch (error.kind) {
    case "clone-id-missing":
    case "git-failed":
    case "gh-failed":
      return 1;
    case "usage":
      return 2;
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
}

export function renderSyncError(error: SyncError): string {
  switch (error.kind) {
    case "clone-id-missing":
    case "git-failed":
    case "gh-failed":
    case "usage":
      return `amadeus-leader-sync: ${error.kind}: ${error.detail}`;
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
}

function normalizeFault(error: unknown, fallback: "git-failed" | "gh-failed" = "git-failed"): SyncError {
  if (error instanceof SyncFault) return error.syncError;
  return syncError(fallback, String(error));
}

function failSync(error: SyncError): number {
  console.error(renderSyncError(error));
  return syncErrorExitCode(error);
}

function incrementBranchSequence(branch: string): string {
  const match = branch.match(/^(.*-)([0-9]+)$/);
  if (match === null) throwSync("git-failed", `invalid sync branch candidate: ${branch}`);
  return `${match[1]}${Number.parseInt(match[2], 10) + 1}`;
}

function electionDirNames(projectDir: string): string[] {
  const root = electionsRoot(projectDir);
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function baseElectionDirNames(git: GitRunner, projectDir: string): string[] {
  const output = requireOk(
    git(
      ["ls-tree", "-d", "--name-only", `origin/main:${ELECTIONS_ROOT_RELATIVE}`],
      projectDir,
    ),
    "git ls-tree elections",
  );
  return output.split("\n")
    .filter((line) => line !== "")
    .sort();
}

export function collectDiff(git: GitRunner, projectDir: string): FileDiff[] {
  const tracked = parseNameStatus(requireOk(
    git(["diff", "--name-status", "origin/main"], projectDir),
    "git diff --name-status",
  ));
  const untracked = requireOk(
    git(["ls-files", "--others", "--exclude-standard"], projectDir),
    "git ls-files --others",
  ).split("\n").filter((path) => path !== "").map((path) => ({ status: "A" as const, path }));
  const byPath = new Map<string, FileDiff>();
  for (const diff of [...tracked, ...untracked]) byPath.set(diff.path, diff);
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function syncStatus(
  projectDir: string,
  owned: OwnedSet,
  git: GitRunner,
): SyncStatus {
  const shardNumstat = owned.shardPaths.length === 0
    ? ""
    : requireOk(
      git(["diff", "--numstat", "origin/main", "--", ...owned.shardPaths], projectDir),
      "git diff shard numstat",
    );
  const normNumstat = requireOk(
    git(["diff", "--numstat", "origin/main", "--", MEMORY_ROOT], projectDir),
    "git diff memory numstat",
  );
  return deriveSyncStatus(
    electionDirNames(projectDir),
    baseElectionDirNames(git, projectDir),
    parseNumstat(shardNumstat),
    parseNumstat(normNumstat),
  );
}

export function restoreMemoryLayer(git: GitRunner, worktreeDir: string): void {
  requireOk(git(["checkout", "origin/main", "--", MEMORY_ROOT], worktreeDir), "restore memory");
}

export function renderPrBody(report: SelfCheckReport, fileCount: number): string {
  return [
    "## 同期対象",
    "",
    `- files: ${fileCount}`,
    "- owner classes: elections store + leader clone audit shard",
    "",
    "## Self Check(機械転記)",
    "",
    `- pureAddition: ${report.pureAddition}`,
    `- parseFailures: ${JSON.stringify(report.parseFailures)}`,
    `- markerHits: ${JSON.stringify(report.markerHits)}`,
    "",
    "この PR は作成のみです。自動マージは行いません。",
    "",
  ].join("\n");
}

function copyFiles(sourceDir: string, targetDir: string, paths: readonly string[]): void {
  for (const path of paths) {
    const source = join(sourceDir, path);
    if (!existsSync(source)) continue;
    const target = join(targetDir, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(source));
  }
}

function readBaseContents(
  git: GitRunner,
  projectDir: string,
  paths: readonly string[],
): Map<string, string> {
  const contents = new Map<string, string>();
  for (const path of paths) {
    contents.set(path, requireOk(
      git(["show", `origin/main:${path}`], projectDir),
      `git show origin/main:${path}`,
    ));
  }
  return contents;
}

export function nextBranchName(git: GitRunner, projectDir: string, now: Date): string {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const prefix = `sync/leader-${date}-`;
  const localRefs = requireOk(
    git(["branch", "--format=%(refname:short)", "--list", `${prefix}*`], projectDir),
    "git branch list",
  );
  const remoteRefs = requireOk(
    git(["ls-remote", "--heads", "origin", `refs/heads/${prefix}*`], projectDir),
    "git ls-remote sync branches",
  );
  let max = 0;
  const refs = [
    ...localRefs.split("\n"),
    ...remoteRefs.split("\n").map((line) => line.split("\t")[1]?.replace(/^refs\/heads\//, "") ?? ""),
  ];
  for (const ref of refs) {
    const match = ref.match(new RegExp(`${prefix}(\\d+)$`));
    if (match !== null) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return `${prefix}${max + 1}`;
}

function prepare(
  projectDir: string,
  git: GitRunner,
): { owned: OwnedSet; diffs: FileDiff[]; cloneShardName: string } {
  requireOk(
    git(["fetch", "origin", "+refs/heads/main:refs/remotes/origin/main"], projectDir),
    "git fetch origin main into origin/main",
  );
  const cloneId = readCloneId(projectDir);
  if (cloneId === null) {
    throwSync("clone-id-missing", "amadeus/.amadeus-clone-id is absent or invalid");
  }
  const cloneShardName = shardBasename(hostname(), cloneId);
  const owned = resolveOwnedSet(projectDir, cloneShardName);
  return { owned, diffs: collectDiff(git, projectDir), cloneShardName };
}

export function handleStatus(projectDir: string, git: GitRunner): number {
  try {
    const { owned } = prepare(projectDir, git);
    console.log(JSON.stringify(syncStatus(projectDir, owned, git), null, 2));
    return 0;
  } catch (error) {
    return failSync(normalizeFault(error));
  }
}

export function handlePlan(projectDir: string, git: GitRunner): number {
  try {
    const { owned, diffs } = prepare(projectDir, git);
    const violations = checkExclusions(diffs, owned);
    const files = diffs.map((diff) => diff.path);
    console.log(JSON.stringify({
      files,
      fileCount: files.length,
      splitRecommended: files.length > SYNC_SPLIT_FILE_LIMIT,
      violations,
    }, null, 2));
    return violations.length === 0 ? 0 : 1;
  } catch (error) {
    return failSync(normalizeFault(error));
  }
}

type CreateContext = {
  worktreeDir: string | null;
  scratchRoot: string | null;
  branch: string | null;
  pushed: boolean;
};

type CreateOutcome =
  | { kind: "success"; url: string }
  | { kind: "fault"; error: SyncError }
  | { kind: "detection"; failure: DetectionFailure };

function sourceOwnedFiles(diffs: readonly FileDiff[], owned: OwnedSet): string[] {
  const allowed = new Set(ownedPaths(owned));
  const files = diffs.filter((diff) => allowed.has(diff.path)).map((diff) => diff.path);
  if (files.length === 0) throwDetection("no-owned-files", []);
  if (files.length > SYNC_SPLIT_FILE_LIMIT) {
    throwDetection("split-required", { fileCount: files.length, limit: SYNC_SPLIT_FILE_LIMIT });
  }
  return files;
}

function reserveWorktree(
  context: CreateContext,
  projectDir: string,
  git: GitRunner,
  now: Date,
): void {
  context.scratchRoot = mkdtempSync(join(tmpdir(), "amadeus-leader-sync-"));
  context.worktreeDir = join(context.scratchRoot, "worktree");
  const attempted = new Set<string>();
  let lastError = "";
  for (let count = 0; count < SYNC_BRANCH_RESERVATION_ATTEMPTS; count++) {
    let candidate = nextBranchName(git, projectDir, now);
    while (attempted.has(candidate)) candidate = incrementBranchSequence(candidate);
    attempted.add(candidate);
    const result = git(
      ["worktree", "add", "-b", candidate, context.worktreeDir, "origin/main"],
      projectDir,
    );
    if (result.kind === "ok") {
      context.branch = candidate;
      return;
    }
    lastError = result.stderr.trim();
    if (!/already exists|already checked out/.test(lastError)) {
      throwSync("git-failed", `git worktree add: ${lastError}`);
    }
  }
  throwSync(
    "git-failed",
    `git worktree add: branch reservation exhausted after ${SYNC_BRANCH_RESERVATION_ATTEMPTS} attempts: ${lastError}`,
  );
}

function requireNoExclusions(diffs: readonly FileDiff[], owned: OwnedSet): void {
  const violations = checkExclusions(diffs, owned);
  if (violations.length > 0) throwDetection("exclusion-violation", violations);
}

function executeCreate(
  context: CreateContext,
  projectDir: string,
  git: GitRunner,
  gh: GhRunner,
  now: Date,
): string {
  const prepared = prepare(projectDir, git);
  const files = sourceOwnedFiles(prepared.diffs, prepared.owned);
  reserveWorktree(context, projectDir, git, now);
  const worktreeDir = context.worktreeDir as string;
  const branch = context.branch as string;
  copyFiles(projectDir, worktreeDir, files);
  restoreMemoryLayer(git, worktreeDir);
  const generatedDiff = collectDiff(git, worktreeDir);
  const generatedOwned = resolveOwnedSet(worktreeDir, prepared.cloneShardName);
  requireNoExclusions(generatedDiff, generatedOwned);
  const generatedFiles = generatedDiff.map((diff) => diff.path);
  if (generatedFiles.length === 0) throwDetection("no-owned-files", []);
  requireOk(git(["add", "--", ...generatedFiles], worktreeDir), "git add owned files");
  requireOk(git(["commit", "-m", "chore: sync leader-owned records"], worktreeDir), "git commit");
  const committedDiff = parseNameStatus(requireOk(
    git(["diff", "--name-status", "origin/main...HEAD"], worktreeDir),
    "git diff committed tree",
  ));
  const committedOwned = resolveOwnedSet(worktreeDir, prepared.cloneShardName);
  const modifiedShards = committedDiff
    .filter((diff) => diff.status === "M" && committedOwned.shardPaths.includes(diff.path))
    .map((diff) => diff.path);
  const report = selfCheck(
    worktreeDir,
    committedDiff,
    committedOwned,
    readBaseContents(git, worktreeDir, modifiedShards),
  );
  if (!reportPassed(report)) throwDetection("self-check-failed", report);
  requireOk(git(["push", "-u", "origin", branch], worktreeDir), "git push");
  context.pushed = true;
  const title = `chore: sync leader-owned records (${now.toISOString().slice(0, 10)})`;
  const created = requireOk(gh([
    "pr", "create", "--base", "main", "--head", branch, "--title", title,
    "--body", renderPrBody(report, committedDiff.length),
  ], worktreeDir), "gh pr create", "gh-failed").trim();
  if (!/^https:\/\/github\.com\/.+\/pull\/\d+$/.test(created)) {
    throwSync("gh-failed", `could not parse PR URL from gh output: ${created}`);
  }
  return created;
}

function outcomeFrom(error: unknown, context: CreateContext): CreateOutcome {
  if (error instanceof DetectionFault) return { kind: "detection", failure: error.detection };
  const normalized = normalizeFault(error);
  const detail = context.pushed && context.branch !== null
    ? `${normalized.detail}; remote branch retained: ${context.branch}`
    : normalized.detail;
  return { kind: "fault", error: syncError(normalized.kind, detail) };
}

function cleanupCreate(context: CreateContext, projectDir: string, git: GitRunner): SyncError | null {
  const failures: string[] = [];
  let removeFailed = false;
  if (context.branch !== null && context.worktreeDir !== null) {
    const removed = git(["worktree", "remove", "--force", context.worktreeDir], projectDir);
    if (removed.kind === "error") {
      removeFailed = true;
      failures.push(`worktree remove: ${removed.stderr.trim()}`);
    }
  }
  if (context.scratchRoot !== null && existsSync(context.scratchRoot)) {
    try {
      rmSync(context.scratchRoot, { recursive: true, force: true });
    } catch (error) {
      failures.push(`scratch remove: ${String(error)}`);
    }
  }
  if (removeFailed) {
    const pruned = git(["worktree", "prune"], projectDir);
    if (pruned.kind === "error") failures.push(`worktree prune: ${pruned.stderr.trim()}`);
  }
  if (context.branch !== null) {
    const deleted = git(["branch", "-D", context.branch], projectDir);
    if (deleted.kind === "error") failures.push(`local branch delete: ${deleted.stderr.trim()}`);
  }
  return failures.length === 0
    ? null
    : syncError("git-failed", `cleanup failed: ${failures.join("; ")}`);
}

function finishCreate(outcome: CreateOutcome): number {
  if (outcome.kind === "fault") return failSync(outcome.error);
  if (outcome.kind === "detection") {
    console.error(JSON.stringify(outcome.failure));
    return 1;
  }
  console.log(outcome.url);
  return 0;
}

export function handleCreate(
  projectDir: string,
  git: GitRunner,
  gh: GhRunner,
  now: Date = new Date(),
): number {
  const context: CreateContext = {
    worktreeDir: null,
    scratchRoot: null,
    branch: null,
    pushed: false,
  };
  let outcome: CreateOutcome;
  try {
    outcome = { kind: "success", url: executeCreate(context, projectDir, git, gh, now) };
  } catch (error) {
    outcome = outcomeFrom(error, context);
  }
  const cleanupError = cleanupCreate(context, projectDir, git);
  return cleanupError === null ? finishCreate(outcome) : failSync(cleanupError);
}

export function main(
  argv: string[],
  projectDir: string = PROJECT_DIR,
  git: GitRunner = spawnGit,
  gh: GhRunner = spawnGh,
): number {
  const parsed = parseArgs(argv);
  if (parsed.kind === "usage") {
    return failSync(syncError("usage", parsed.message));
  }
  if (parsed.kind === "status") return handleStatus(projectDir, git);
  if (parsed.kind === "plan") return handlePlan(projectDir, git);
  return handleCreate(projectDir, git, gh);
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
