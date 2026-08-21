// amadeus-worktree.ts — Construction-phase worktree primitive.
//
// Five subcommands: create, merge, discard, list, verify. Audit-first
// (audit-of-intent semantics — see docs/reference/12-state-machine.md
// § Audit-first atomicity). The orchestrator dispatches amadeus-pipeline-deploy-agent
// to read team practices, the agent invokes this tool with resolved flags,
// then the orchestrator calls `verify` as a deterministic post-dispatch
// backstop confirming the audit event landed.
//
// Worktree anchoring: the write subcommands (create/merge/discard) resolve the
// MAIN checkout as the anchor for every git op and for the Bolt worktree path,
// so a session running from a sibling dev worktree still creates/merges/discards
// Bolt worktrees against the main checkout (siblings of it, never nested).
// Running from inside a Bolt worktree itself (true nesting) is still rejected.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { emitAuditEvent } from "../otel/audit-emit.ts";
import {
  auditBlockField,
  emitError,
  errorMessage,
  findAllEvents,
  getField,
  normalizeWorktreeSlug,
  pathKey,
  readAllAuditShards,
  relativeRecordDir,
  resolveConstructionRepo,
  resolveMainCheckout,
  resolveProjectDir,
  worktreeBaseDir,
  worktreePath,
  worktreeRuntimeGraphPath,
  worktreeStateFilePath,
} from "./amadeus-lib.js";
import { observeSubprocessSpan } from "../otel/subprocess-span.ts";
import { isHarnessDirName } from "./amadeus-harness.ts";
import { initProcessObservability } from "./amadeus-observability.ts";

// kebab-case slug shape: lowercase letter, then lowercase letters / digits /
// hyphens. Mirrors stage-schema.ts:95+:101 — the codebase already duplicates
// this regex across conceptual domains; a one-line constant beats a cross-
// module import for a tool-local check.
const SLUG_RE = /^[a-z][a-z0-9-]*$/;

const VALID_STRATEGIES = new Set(["squash", "merge", "rebase"]);
const VALID_VERIFY_EVENTS = new Set([
  "WORKTREE_CREATED",
  "WORKTREE_MERGED",
  "WORKTREE_DISCARDED",
]);
const CREATE_BOOLEAN_FLAGS = new Set(["--allow-stale"]);

// --- Flag parsing (mirrors amadeus-bolt.ts:30-46) ---

function parseFlags(
  args: string[],
  booleanFlags?: ReadonlySet<string>,
): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) continue;
    if (booleanFlags?.has(a)) {
      flags[a.slice(2)] = "true";
      continue;
    }
    if (i + 1 >= args.length) {
      error(`${a} expects a value, got end of arguments.`);
    }
    const val = args[i + 1];
    if (val.startsWith("--")) {
      error(`${a} expects a value, got another flag: "${val}". Did you forget the value?`);
    }
    flags[a.slice(2)] = val;
    i++;
  }
  return flags;
}

// --- Audit emit shorthand ---

function emitAudit(
  pd: string,
  eventType: string,
  fields: Record<string, string>,
  intent?: string,
  space?: string
): string {
  // The canonical path, targeted: --intent/--space name the ledger this
  // worktree operation belongs to, and the target drives BOTH the shard the
  // row lands in and the row's own identity fields (E-U8PRE O-T1). The
  // returned timestamp is the one the emit actually stamped, so the caller's
  // correlation tag quotes a real value rather than minting its own.
  const result = emitAuditEvent(eventType, fields, pd, intent, space);
  return result.timestamp;
}

// --- Git invocation ---

interface GitResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number;
}

// Telemetry project dir for subprocess spans. Resolved fail-open: a telemetry
// lookup must never change a git invocation's behaviour, and an unresolvable
// project simply reads as observability-disabled.
function telemetryProjectDir(): string {
  try {
    return resolveProjectDir(projectDir);
  } catch {
    return "";
  }
}

function runGit(args: string[], cwd?: string, input?: string): GitResult {
  const r = observeSubprocessSpan(telemetryProjectDir(), "git", () =>
    spawnSync("git", args, {
      cwd,
      encoding: "utf-8",
      ...(input === undefined ? {} : { input }),
      env: { ...process.env, EDITOR: process.env.EDITOR ?? "false" },
    }),
  );
  return {
    ok: r.status === 0,
    stdout: (r.stdout ?? "").toString(),
    stderr: (r.stderr ?? "").toString(),
    code: r.status ?? 1,
  };
}

// Shared failure detail for the merge preflight/cleanup errors. A dedicated
// helper keeps the call sites free of nested template literals.
export function gitRunDetail(result: GitResult): string {
  return result.stderr.trim() || result.stdout.trim() || `exit ${result.code}`;
}

export function assertLocalBaseFresh({
  base,
  gitCwd,
  allowStale,
}: {
  base: string;
  gitCwd: string;
  allowStale: boolean;
}): void {
  if (allowStale) return;
  if (base.startsWith("origin/")) return;

  const local = runGit(["rev-parse", "--verify", `refs/heads/${base}^{commit}`], gitCwd);
  if (!local.ok) return;

  const origin = runGit(["remote", "get-url", "origin"], gitCwd);
  if (!origin.ok) return;

  const remote = runGit(
    ["rev-parse", "--verify", `refs/remotes/origin/${base}^{commit}`],
    gitCwd,
  );
  if (!remote.ok) return;

  const localSha = local.stdout.trim();
  const remoteSha = remote.stdout.trim();
  if (localSha === remoteSha) return;

  throw new Error(
    `Local base branch "${base}" differs from origin/${base}: local SHA ${localSha}, remote SHA ${remoteSha}. Run git fetch origin and fast-forward "${base}", or rerun with --allow-stale to intentionally use the local SHA.`,
  );
}

// --- Worktree anchor resolution (WRITE classification) ---
//
// The shared main-checkout probe (`resolveMainCheckout`), the base-dir rule
// (`worktreeBaseDir`), and the path-key helpers now live in amadeus-lib so BOTH the
// write subcommands here and every read consumer of `worktreePath` apply one anchor
// rule (#746). This module keeps only the WRITE-specific classification, which adds
// the true-nesting rejection and the byte-identical raw-repoCwd behaviour.
//
// `resolveWorktreeAnchor` classifies the WRITE caller's cwd for create/merge/discard:
//
//   - cwd IS the main checkout   → { gitCwd: repoCwd, anchored: false }. Byte-identical
//       legacy behaviour: git ops keep the caller's RAW repoCwd, so no canonicalised
//       path leaks into audit fields or output JSON.
//   - cwd is a Bolt worktree     → rejected (true nesting: a Bolt worktree must not
//       fork another). Bolt-detection matches `handleList`'s filter (basename `bolt-*`
//       AND parent is `<mainCheckout>/.amadeus/worktrees`).
//   - cwd is any other worktree  → { gitCwd: mainCheckout, anchored: true }. Every git
//       op runs in the main checkout so the Bolt worktree lands as its sibling.
//
// P7 (multi-repo): `repoCwd` is the TARGET sibling repo dir; the classification runs
// against that repo's own git context, so the anchor is that repo's main checkout.
function resolveWorktreeAnchor(repoCwd: string): {
  gitCwd: string;
  anchored: boolean;
} {
  const resolved = resolveMainCheckout(repoCwd);
  if (!resolved) {
    error("Not a git repository (or any of the parent directories).");
  }
  const { cwdTop, mainCheckout } = resolved;

  if (cwdTop === mainCheckout) {
    // Main checkout: keep the raw repoCwd (see byte-identical note above).
    return { gitCwd: repoCwd, anchored: false };
  }

  // True nesting: reject a WRITE call from inside a Bolt worktree.
  const boltsDir = pathKey(join(mainCheckout, ".amadeus", "worktrees"));
  if (basename(cwdTop).startsWith("bolt-") && pathKey(dirname(cwdTop)) === boltsDir) {
    error(
      `amadeus-worktree cannot run from inside a Bolt worktree at ${cwdTop} (true nesting: a Bolt worktree must not fork another worktree). Run from the main checkout or a sibling dev worktree.`
    );
  }

  // Sibling worktree: anchor every git op to the main checkout.
  return { gitCwd: mainCheckout, anchored: true };
}

// --- Validation helpers ---

// Exported for the in-process coverage seam (t220); production callers reach it
// through main()'s handler dispatch. Record-side display names (Unnn-<slug>
// form carrying uppercase) are accepted and derived artifacts (dir name, branch
// name) are normalized to the lowercase canonical form via the shared choke
// point (Issue #478 gap2 / #885).
export function validateSlug(slug: string | undefined): string {
  if (!slug) error("Missing --slug <slug>");
  const normalized = normalizeWorktreeSlug(slug);
  if (!SLUG_RE.test(normalized)) {
    error(
      `Invalid --slug: "${slug}". Must be kebab-case (lowercase letter then [a-z0-9-]).`
    );
  }
  return normalized;
}

function validateStrategy(strategy: string | undefined): string {
  if (!strategy) error("Missing --strategy <squash|merge|rebase>");
  if (!VALID_STRATEGIES.has(strategy)) {
    error(
      `Invalid --strategy: "${strategy}". Must be one of: squash, merge, rebase.`
    );
  }
  return strategy;
}

// Resolve the cwd every git op in a construction handler must run in (P7). With
// `--repo <name>` it is the sibling repo dir; absent it the lone recorded repo is
// inferred (or the projectDir for a legacy single-repo intent). A disambiguation
// failure (multi-repo intent without --repo, or an out-of-set name) errors before
// any audit emit. `flags.intent`/`flags.space` select the intent whose repo set is
// consulted (same selector the audit emit threads).
function resolveRepoCwd(
  pd: string,
  flags: Record<string, string>,
  slug: string,
): string {
  try {
    return resolveConstructionRepo(pd, flags.repo, flags.intent, flags.space).cwd;
  } catch (e) {
    errorWithSlug(slug, errorMessage(e));
  }
}

// --- Subcommand: create ---
//
// Usage: amadeus-worktree create --slug <slug> --base <branch> [--allow-stale]
//                              [--repo <name>]
//                              [--intent <dir>] [--space <name>]
//
// --repo (P7): the sibling repo to fork the worktree inside (a multi-repo intent
// requires it; a single-repo intent infers the lone repo; a legacy intent with no
// recorded repos runs in the projectDir, today's behaviour).
export function handleCreate(
  args: string[],
  explicitProjectDir?: string,
): void {
  const flags = parseFlags(args, CREATE_BOOLEAN_FLAGS);
  const slug = validateSlug(flags.slug);
  if (!flags.base) errorWithSlug(slug, "Missing --base <branch>");

  const pd = resolveProjectDir(explicitProjectDir ?? projectDir);
  // P7: resolve the target sibling repo (or the projectDir for a legacy single-repo
  // intent), then resolve the worktree anchor — the main checkout when the caller
  // runs from a sibling worktree, otherwise the caller's own repoCwd.
  const repoCwd = resolveRepoCwd(pd, flags, slug);
  const { gitCwd } = resolveWorktreeAnchor(repoCwd);

  // Pre-audit checks: every failure here exits without emitting.
  const baseExists = runGit(["rev-parse", "--verify", flags.base], gitCwd);
  if (!baseExists.ok) {
    errorWithSlug(slug, `Base branch does not exist locally: ${flags.base}`);
  }

  try {
    assertLocalBaseFresh({
      base: flags.base,
      gitCwd,
      allowStale: flags["allow-stale"] === "true",
    });
  } catch (e) {
    throw new Error(`[slug=${slug}] ${errorMessage(e)}`);
  }

  const wtPath = worktreePath(pd, slug);
  if (existsSync(wtPath)) {
    errorWithSlug(slug, `Worktree directory already exists: ${wtPath}`);
  }

  const branchName = `bolt-${slug}`;
  const branchExists = runGit(["rev-parse", "--verify", `refs/heads/${branchName}`], gitCwd);
  if (branchExists.ok) {
    errorWithSlug(slug, `Branch already exists: ${branchName}`);
  }

  // Audit-first: emit BEFORE git so a kill-9 between emit and git surfaces
  // as "phantom WORKTREE_CREATED" reconciled by doctor (audit-of-intent
  // semantics — see docs/reference/12-state-machine.md). The Base SHA pins the
  // fork point: `amadeus-swarm check/finalize` read it back as the anti-tamper
  // baseline, so a worker commit cannot move the baseline by committing.
  let auditTs: string;
  try {
    auditTs = emitAudit(pd, "WORKTREE_CREATED", {
      "Bolt slug": slug,
      "Worktree path": wtPath,
      "Branch name": branchName,
      "Base branch": flags.base,
      "Base SHA": baseExists.stdout.trim(),
    }, flags.intent, flags.space);
  } catch (e) {
    errorWithSlug(slug, `Audit emission failed: ${errorMessage(e)}`);
  }

  const add = runGit(["worktree", "add", wtPath, "-b", branchName, flags.base], gitCwd);
  if (!add.ok) {
    errorWithSlug(
      slug,
      `git worktree add failed: ${add.stderr.trim() || add.stdout.trim() || `exit ${add.code}`}`
    );
  }

  console.log(
    JSON.stringify({
      emitted: "WORKTREE_CREATED",
      slug,
      worktree_path: wtPath,
      branch: branchName,
      base: flags.base,
      audit_timestamp: auditTs,
    })
  );
}

// --- Subcommand: merge ---
//
// Usage:
//   amadeus-worktree merge --slug <slug> --target <branch> --strategy <squash|merge|rebase>
//                        [--message <msg>] [--repo <name>]
//                        [--intent <dir>] [--space <name>]
//
// --repo (P7): the sibling repo the merge lands in — same resolution as `create`.

export function handleMerge(
  args: string[],
  explicitProjectDir?: string,
): void {
  const flags = parseFlags(args);
  const slug = validateSlug(flags.slug);
  if (!flags.target) errorWithSlug(slug, "Missing --target <branch>");
  const strategy = validateStrategy(flags.strategy);
  const message = flags.message ?? `Bolt ${slug}`;

  const pd = resolveProjectDir(explicitProjectDir ?? projectDir);
  // P7: resolve the target sibling repo, then the worktree anchor. The merge runs
  // IN the main checkout (squash/merge/ff/commit/worktree-remove/branch-D); the
  // rebase still runs in the worktree (wtPath). When the caller runs from a sibling
  // worktree, gitCwd is the main checkout; otherwise it is the caller's own repoCwd.
  const repoCwd = resolveRepoCwd(pd, flags, slug);
  const { gitCwd } = resolveWorktreeAnchor(repoCwd);
  const wtPath = worktreePath(pd, slug);
  const sourceManaged = managedWorktreePaths(pd, wtPath, flags);

  // Refuse uncommitted, staged, or unknown-ignored source before the
  // WORKTREE_MERGED audit row and before any mutating git command. The worktree
  // fork's state/audit/runtime mirrors are metadata already handled by
  // complete --merge, not source input. Disposable ignored paths (generated
  // output roots, self-install copies) are remembered for post-merge cleanup.
  const disposableSource = preflightDirtySource(wtPath, slug, sourceManaged);
  preflightDirtyTarget(gitCwd, slug);

  // Defensive HEAD check: the main checkout must have <target> checked out.
  const head = runGit(["rev-parse", "--abbrev-ref", "HEAD"], gitCwd);
  if (!head.ok) {
    errorWithSlug(slug, "Cannot resolve HEAD.");
  }
  const actual = head.stdout.trim();
  if (actual === "HEAD") {
    errorWithSlug(
      slug,
      `expected branch ${flags.target}, found detached HEAD`
    );
  }
  if (actual !== flags.target) {
    errorWithSlug(
      slug,
      `expected branch ${flags.target}, found ${actual}`
    );
  }

  const branchName = `bolt-${slug}`;

  // Rebase requires a remote for <target>. The remote-existence check is
  // a pre-audit guard (no state change). The actual `git fetch` is post-
  // audit because fetch mutates remote-tracking refs — running it before
  // the audit emit would leave a kill-9 window where refs moved without
  // a corresponding audit row.
  let rebaseRemote = "";
  if (strategy === "rebase") {
    const remote = runGit(["config", `branch.${flags.target}.remote`], gitCwd);
    if (!remote.ok || !remote.stdout.trim()) {
      errorWithSlug(
        slug,
        `rebase strategy requires a remote for ${flags.target}; got none`
      );
    }
    rebaseRemote = remote.stdout.trim();
  }

  // Audit-first: emit BEFORE any state-mutating git command (including the
  // rebase pre-fetch).
  let auditTs: string;
  try {
    auditTs = emitAudit(pd, "WORKTREE_MERGED", {
      "Bolt slug": slug,
      "Worktree path": wtPath,
      "Target branch": flags.target,
      Strategy: strategy,
    }, flags.intent, flags.space);
  } catch (e) {
    errorWithSlug(slug, `Audit emission failed: ${errorMessage(e)}`);
  }

  if (strategy === "rebase") {
    const fetch = runGit(["fetch", rebaseRemote], wtPath);
    if (!fetch.ok) {
      errorWithSlug(
        slug,
        `git fetch failed: ${fetch.stderr.trim() || fetch.stdout.trim() || `exit ${fetch.code}`}`
      );
    }
  }

  let commitSha = "";
  // conflictCwd records which checkout the conflicting state lives in:
  // squash/merge run in the main checkout (cwd = gitCwd), rebase runs in the
  // worktree (cwd = wtPath). For conflict-file enumeration, we query
  // `git diff --name-only --diff-filter=U` in the SAME cwd so the index reflects
  // the real conflict. (gitCwd is the main checkout: the sibling repo, the
  // projectDir for a legacy single-repo intent, or its main checkout when the
  // caller ran from a sibling worktree.)
  let conflictCwd: string | undefined = gitCwd;
  let conflictHit = false;
  switch (strategy) {
    case "squash": {
      const m = runGit(["-c", "merge.ff=true", "merge", "--squash", branchName], gitCwd);
      if (!m.ok) {
        if (isConflict(m)) {
          conflictHit = true;
          break;
        }
        errorWithSlug(
          slug,
          `git merge --squash failed: ${m.stderr.trim() || `exit ${m.code}`}`
        );
      }
      const c = runGit(["commit", "--no-edit", "-m", message], gitCwd);
      if (!c.ok) {
        errorWithSlug(
          slug,
          `git commit failed: ${c.stderr.trim() || `exit ${c.code}`}`
        );
      }
      commitSha = currentSha(gitCwd);
      break;
    }
    case "merge": {
      const m = runGit([
        "merge",
        "--no-ff",
        "--no-edit",
        "-m",
        `Merge bolt ${slug}`,
        branchName,
      ], gitCwd);
      if (!m.ok) {
        if (isConflict(m)) {
          conflictHit = true;
          break;
        }
        errorWithSlug(
          slug,
          `git merge --no-ff failed: ${m.stderr.trim() || `exit ${m.code}`}`
        );
      }
      commitSha = currentSha(gitCwd);
      break;
    }
    case "rebase": {
      const r = runGit(["rebase", flags.target], wtPath);
      if (!r.ok) {
        if (isConflict(r)) {
          conflictHit = true;
          conflictCwd = wtPath;
          break;
        }
        errorWithSlug(
          slug,
          `git rebase failed: ${r.stderr.trim() || `exit ${r.code}`}`
        );
      }
      const ff = runGit(["merge", "--ff-only", branchName], gitCwd);
      if (!ff.ok) {
        errorWithSlug(
          slug,
          `git merge --ff-only failed: ${ff.stderr.trim() || `exit ${ff.code}`}`
        );
      }
      commitSha = currentSha(gitCwd);
      break;
    }
  }

  if (conflictHit) {
    const files = listConflictFiles(conflictCwd);
    process.stdout.write(
      `${JSON.stringify({
        status: "conflict",
        slug,
        worktree_path: wtPath,
        conflict_files: files,
        detail: `Merge produced conflicts in worktree at ${wtPath}. Worktree preserved for inspection.`,
      })}\n`
    );
    process.exit(1);
  }

  // Cleanup: remove worktree + delete branch. The merge commit at
  // <commitSha> is now permanent on <target> — failures here leave an
  // orphan worktree directory and/or branch but DO NOT roll back the
  // merge. Tag the error message with [merge-succeeded:<sha>] so the
  // ERROR_LOGGED row carries enough state for doctor to tell
  // "merge failed entirely" from "merge landed, cleanup orphan remains"
  // — these need different recovery actions.
  const cleanupTag = `[merge-succeeded:${commitSha}]`;
  // Remove the disposable ignored paths captured at preflight (generated output
  // roots, self-install copies) by exact pathspec, then discard only the
  // fork-managed metadata that complete --merge has already converged. Restore
  // tracked metadata to the source branch's HEAD, then remove untracked/ignored
  // metadata through explicit pathspecs. Re-run the source preflight before
  // non-force removal so a late source write is preserved.
  if (disposableSource.length > 0) {
    const cleaned = runGit(["clean", "-fdx", "--", ...disposableSource], wtPath);
    if (!cleaned.ok) {
      errorWithSlug(
        slug,
        `${cleanupTag} disposable source cleanup failed: ${gitRunDetail(cleaned)}`,
      );
    }
  }
  cleanupManagedWorktreeMetadata(wtPath, slug, sourceManaged, cleanupTag);
  preflightDirtySource(wtPath, slug, sourceManaged, cleanupTag);
  const rm = runGit(["worktree", "remove", wtPath], gitCwd);
  if (!rm.ok) {
    errorWithSlug(
      slug,
      `${cleanupTag} worktree remove failed: ${rm.stderr.trim() || `exit ${rm.code}`}`
    );
  }
  const del = runGit(["branch", "-D", branchName], gitCwd);
  if (!del.ok) {
    errorWithSlug(
      slug,
      `${cleanupTag} branch -D ${branchName} failed: ${del.stderr.trim() || `exit ${del.code}`}`
    );
  }

  console.log(
    JSON.stringify({
      emitted: "WORKTREE_MERGED",
      slug,
      worktree_path: wtPath,
      target: flags.target,
      strategy,
      commit_sha: commitSha,
      audit_timestamp: auditTs,
    })
  );
}

interface ManagedWorktreePaths {
  readonly state: string;
  readonly runtimeGraph: string;
  readonly auditDir: string;
  readonly scratchPrefix: string;
}

function gitRelativePath(wtPath: string, path: string): string {
  return relative(wtPath, path).split(sep).join("/");
}

function managedWorktreePaths(
  pd: string,
  rootPath: string,
  flags: Record<string, string>,
): ManagedWorktreePaths {
  const recordPrefix = relativeRecordDir(pd, flags.intent, flags.space);
  const statePath = worktreeStateFilePath(rootPath, recordPrefix);
  const recordRoot = dirname(statePath);
  const recordRootRel = gitRelativePath(rootPath, recordRoot);
  return {
    state: gitRelativePath(rootPath, statePath),
    runtimeGraph: gitRelativePath(
      rootPath,
      worktreeRuntimeGraphPath(rootPath, recordPrefix),
    ),
    auditDir: `${recordRootRel}/audit`,
    scratchPrefix: `${recordRootRel}/.amadeus-`,
  };
}

function hasPathPrefix(path: string, prefix: string): boolean {
  return prefix.length > 0 && (path === prefix || path.startsWith(`${prefix}/`));
}

function isManagedWorktreePath(path: string, managed: ManagedWorktreePaths): boolean {
  return (
    path === managed.state ||
    path === managed.runtimeGraph ||
    hasPathPrefix(path, managed.auditDir) ||
    path.startsWith(managed.scratchPrefix)
  );
}

// The harness self-install root this tool runs from (…/<harness>/tools →
// …/<harness>, e.g. dist/claude/.claude). An ignored worktree FILE that also
// exists in this tree is a regenerable self-install copy, not source; any
// other ignored file may be hand-authored and must block the merge loudly.
// Shape-validated: when the module does NOT run from a harness install (a
// source-tree import, a relocated bundle), there is no install root and no
// ignored file is disposable — fail closed instead of deriving a root from an
// arbitrary parent directory, because this classification feeds `git clean`.
export function resolveSelfInstallRoot(moduleDir: string): string | null {
  if (basename(moduleDir) !== "tools") return null;
  const harnessDirPath = dirname(moduleDir);
  return isHarnessDirName(basename(harnessDirPath)) ? harnessDirPath : null;
}

const HARNESS_INSTALL_ROOT = resolveSelfInstallRoot(dirname(fileURLToPath(import.meta.url)));

export function isSelfInstallLeaf(
  relPath: string,
  installRoot: string | null = HARNESS_INSTALL_ROOT,
): boolean {
  if (installRoot === null) return false;
  const [head, ...rest] = relPath.split("/");
  return (
    rest.length > 0 &&
    head === basename(installRoot) &&
    existsSync(join(installRoot, ...rest))
  );
}

interface SourceInspection {
  readonly blocking: string[];
  readonly disposable: string[];
}

// Resolves an ignored worktree path to the generated-output directory that
// owns it, or null when no directory does. `git status --ignored=matching`
// only collapses a wholly-ignored directory to a `!! dir/` entry when the
// DIRECTORY ITSELF matches an ignore pattern; the far more common
// contents-only pattern (`/dist/**`) leaves git listing each file
// individually (`!! dist/generated.js`), which the trailing-slash test alone
// reads as hand-authored source. See ignoredTerritoryRoots.
export type TerritoryResolver = (relPath: string) => string | null;

// Fail-closed default: without a resolver only git's own collapsed-directory
// entries count as generated output, exactly as before this seam existed.
const NO_TERRITORY: TerritoryResolver = () => null;

export function classifySourcePaths(
  porcelain: string,
  managed: ManagedWorktreePaths,
  installRoot: string | null = HARNESS_INSTALL_ROOT,
  territoryRootOf: TerritoryResolver = NO_TERRITORY,
): SourceInspection {
  const records = porcelain.split("\0");
  const blocking: string[] = [];
  const disposable: string[] = [];
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    if (record.length === 0) continue;
    if (record.length < 4 || record[2] !== " ") {
      blocking.push("<malformed-git-status>");
      continue;
    }
    const status = record.slice(0, 2);
    const paths = [record.slice(3)];
    if (/[RC]/.test(status)) {
      const originalPath = records[index + 1];
      if (originalPath === undefined || originalPath.length === 0) {
        blocking.push("<malformed-git-status>");
      } else {
        paths.push(originalPath);
        index += 1;
      }
    }
    for (const path of paths) {
      if (isManagedWorktreePath(path, managed)) continue;
      if (status === "!!") {
        // Generated output territory is removable by exact path before worktree
        // removal. Prefer the resolved territory root so the pathspec is the
        // directory the ignore rule names, whichever shape git reported the
        // entry in; fall back to git's own collapsed `!! dir/` entry.
        const territory = territoryRootOf(path);
        if (territory !== null) disposable.push(territory);
        else if (path.endsWith("/") || isSelfInstallLeaf(path, installRoot)) disposable.push(path);
        else blocking.push(path);
      } else {
        blocking.push(path);
      }
    }
  }
  return { blocking: [...new Set(blocking)], disposable: [...new Set(disposable)] };
}

// Names no ignore rule should plausibly carry, used only as synthetic probe
// paths — never created on disk. TWO deliberately dissimilar names (no shared
// stem, prefix, extension, or the word "probe") are probed per directory, and
// a directory only counts as territory when BOTH are ignored: a rule that
// happens to name one probe literally (or glob its stem) cannot also match the
// other, while any rule broad enough to swallow both (`dir/*`, `dir/**`, `*`)
// genuinely swallows arbitrary new names — which is exactly the property being
// tested for.
const IGNORE_PROBE_NAMES = [
  "amadeus-worktree-ignore-probe",
  "zz7q-territory-canary.tmpx",
] as const;

/** The `!! `-prefixed paths of a NUL-separated porcelain=v1 status. */
export function ignoredStatusPaths(porcelain: string): string[] {
  return porcelain
    .split("\0")
    .filter((record) => record.startsWith("!! "))
    .map((record) => record.slice(3));
}

/** Every ancestor directory of `relPath`, shallowest first (root excluded). */
export function ancestorDirsOf(relPath: string): string[] {
  const segments = relPath.replace(/\/+$/, "").split("/");
  // A trailing-slash record names a directory, so it is its own last ancestor;
  // a file record's last segment is the file name and is dropped.
  const depth = relPath.endsWith("/") ? segments.length : segments.length - 1;
  const dirs: string[] = [];
  for (let i = 1; i <= depth; i++) dirs.push(segments.slice(0, i).join("/"));
  return dirs;
}

/**
 * Maps each ignored path to the shallowest ancestor directory that is
 * generated-output territory — a directory whose ignore rules would swallow
 * ANY new name inside it (`/dist/**` does; `*.draft` and a literal
 * `/.claude/settings.local.json` do not).
 *
 * Asking git this directly, with one batched `check-ignore` over synthetic
 * probe paths, is what makes the classification independent of how git chose
 * to render the status: `--ignored=matching` only collapses a directory to
 * `!! dir/` when the directory itself matches a pattern, so a repository whose
 * .gitignore says `/dist/**` reports `!! dist/generated.js` while one that
 * also carries a `dist/` rule (commonly from the user's global excludes file)
 * reports `!! dist/`. Both must classify the same way; before #3391 only the
 * latter did, so on a machine without those global rules every Bolt merge
 * failed claiming the build output was hand-authored source.
 *
 * Fails closed: if the probe NAME is itself ignored at the worktree root, no
 * directory can be told apart from a blanket rule, so nothing is territory.
 */
export function ignoredTerritoryRoots(
  wtPath: string,
  ignoredPaths: readonly string[],
  slug: string,
  failurePrefix: string,
): Map<string, string> {
  const roots = new Map<string, string>();
  const dirs = new Set<string>();
  for (const path of ignoredPaths) for (const dir of ancestorDirsOf(path)) dirs.add(dir);
  if (dirs.size === 0) return roots;

  const probes = [
    ...IGNORE_PROBE_NAMES,
    ...[...dirs].flatMap((dir) => IGNORE_PROBE_NAMES.map((name) => `${dir}/${name}`)),
  ];
  const checked = runGit(
    ["check-ignore", "-z", "--no-index", "--stdin"],
    wtPath,
    probes.map((probe) => `${probe}\0`).join(""),
  );
  // check-ignore exits 1 when nothing matched — that is an answer, not a fault.
  if (!checked.ok && checked.code !== 1) {
    errorWithSlug(
      slug,
      `${failurePrefix}could not classify ignored source paths: ${gitRunDetail(checked)}`,
    );
  }
  const ignoredProbes = new Set(checked.stdout.split("\0").filter((probe) => probe.length > 0));
  // Fail closed when EITHER probe name is ignored at the worktree root: a
  // blanket rule that broad leaves no directory distinguishable from it.
  if (IGNORE_PROBE_NAMES.some((name) => ignoredProbes.has(name))) return roots;

  const swallowsAnyName = (dir: string): boolean =>
    IGNORE_PROBE_NAMES.every((name) => ignoredProbes.has(`${dir}/${name}`));
  for (const path of ignoredPaths) {
    const territory = ancestorDirsOf(path).find(swallowsAnyName);
    if (territory !== undefined) roots.set(path, territory);
  }
  return roots;
}

function inspectSourceWorktree(
  wtPath: string,
  slug: string,
  managed: ManagedWorktreePaths,
  failureTag = "",
): SourceInspection {
  const failurePrefix = failureTag.length > 0 ? `${failureTag} ` : "";
  const status = runGit(
    [
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      "--ignored=matching",
    ],
    wtPath,
  );
  if (!status.ok) {
    errorWithSlug(
      slug,
      `${failurePrefix}could not inspect source worktree status: ${gitRunDetail(status)}`,
    );
  }
  const territory = ignoredTerritoryRoots(
    wtPath,
    ignoredStatusPaths(status.stdout),
    slug,
    failurePrefix,
  );
  return classifySourcePaths(status.stdout, managed, HARNESS_INSTALL_ROOT, (path) =>
    territory.get(path) ?? null,
  );
}

// Refuse source the merge must not lose: uncommitted or staged tracked changes,
// untracked files, and ignored files that are neither generated-output roots nor
// regenerable self-install copies. Returns the disposable ignored paths so the
// post-merge cleanup can remove them by exact pathspec before the non-force
// worktree removal.
function preflightDirtySource(
  wtPath: string,
  slug: string,
  managed: ManagedWorktreePaths,
  failureTag = "",
): string[] {
  const failurePrefix = failureTag.length > 0 ? `${failureTag} ` : "";
  const inspection = inspectSourceWorktree(wtPath, slug, managed, failureTag);
  if (inspection.blocking.length === 0) return inspection.disposable;
  errorWithSlug(
    slug,
    `${failurePrefix}source worktree has uncommitted, staged, or ignored changes: ${inspection.blocking.join(", ")}. Commit or remove them before merge.`,
  );
}

function preflightDirtyTarget(gitCwd: string, slug: string): void {
  const staged = runGit(["diff", "--cached", "--quiet", "--exit-code"], gitCwd);
  if (!staged.ok) {
    if (staged.code !== 1) {
      errorWithSlug(
        slug,
        `could not inspect staged target changes: ${gitRunDetail(staged)}`,
      );
    }
    const names = runGit(["diff", "--cached", "--name-only", "-z"], gitCwd);
    if (!names.ok) {
      errorWithSlug(
        slug,
        `could not list staged target changes: ${gitRunDetail(names)}`,
      );
    }
    const paths = names.stdout.split("\0").filter((path) => path.length > 0);
    errorWithSlug(
      slug,
      `target checkout has staged changes: ${paths.join(", ") || "<unknown>"}. Commit or remove them before merge.`,
    );
  }
}

function managedMetadataCleanupPaths(
  wtPath: string,
  slug: string,
  managed: ManagedWorktreePaths,
): string[] {
  const separator = managed.scratchPrefix.lastIndexOf("/");
  const recordRoot = managed.scratchPrefix.slice(0, separator);
  const scratchNamePrefix = managed.scratchPrefix.slice(separator + 1);
  const absoluteRecordRoot = resolve(wtPath, recordRoot);
  let scratchPaths: string[] = [];
  if (existsSync(absoluteRecordRoot)) {
    try {
      scratchPaths = readdirSync(absoluteRecordRoot)
        .filter((name) => name.startsWith(scratchNamePrefix))
        .map((name) => `${recordRoot}/${name}`);
    } catch (cause) {
      errorWithSlug(
        slug,
        `could not enumerate managed worktree metadata: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
  }
  return [managed.state, managed.runtimeGraph, managed.auditDir, ...scratchPaths];
}

function cleanupManagedWorktreeMetadata(
  wtPath: string,
  slug: string,
  managed: ManagedWorktreePaths,
  cleanupTag: string,
): void {
  const tracked = runGit(["ls-files", "-z"], wtPath);
  if (!tracked.ok) {
    errorWithSlug(
      slug,
      `${cleanupTag} could not inspect tracked worktree metadata: ${gitRunDetail(tracked)}`,
    );
  }
  const trackedManaged = tracked.stdout
    .split("\0")
    .filter((path) => path.length > 0 && isManagedWorktreePath(path, managed));
  if (trackedManaged.length > 0) {
    const restored = runGit(
      ["restore", "--source=HEAD", "--staged", "--worktree", "--", ...trackedManaged],
      wtPath,
    );
    if (!restored.ok) {
      errorWithSlug(
        slug,
        `${cleanupTag} managed metadata restore failed: ${gitRunDetail(restored)}`,
      );
    }
  }

  const cleanupPaths = managedMetadataCleanupPaths(wtPath, slug, managed);
  const cleaned = runGit(["clean", "-fdx", "--", ...cleanupPaths], wtPath);
  if (!cleaned.ok) {
    errorWithSlug(
      slug,
      `${cleanupTag} managed metadata cleanup failed: ${gitRunDetail(cleaned)}`,
    );
  }
}

function currentSha(cwd?: string): string {
  const r = runGit(["rev-parse", "HEAD"], cwd);
  return r.ok ? r.stdout.trim() : "";
}

function isConflict(r: GitResult): boolean {
  // Anchor on git's canonical CONFLICT marker prefix. The previous
  // permissive form (`/conflict/i` etc.) false-positived on stdout that
  // happened to contain the substring "conflict" — including unrelated
  // hint text in future git releases.
  const blob = `${r.stdout}\n${r.stderr}`;
  return /^CONFLICT \(/m.test(blob);
}

function listConflictFiles(cwd?: string): string[] {
  // `git diff --name-only --diff-filter=U` enumerates unmerged paths in
  // the index. Deterministic across all conflict shapes (content, rename/
  // rename, modify/delete) — beats parsing git's prose stderr, which has
  // varied across git releases.
  const r = runGit(["diff", "--name-only", "--diff-filter=U"], cwd);
  if (!r.ok) return [];
  return r.stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// --- Subcommand: discard ---
//
// Usage: amadeus-worktree discard --slug <slug> [--repo <name>]
//                               [--intent <dir>] [--space <name>]
//
// --repo (P7): the sibling repo the worktree was forked in — same resolution as
// `create`. Idempotent: if neither directory nor branch exists, succeeds silently
// without re-emitting audit.
export function handleDiscard(
  args: string[],
  explicitProjectDir?: string,
): void {
  const flags = parseFlags(args);
  const slug = validateSlug(flags.slug);
  const pd = resolveProjectDir(explicitProjectDir ?? projectDir);
  // P7: resolve the target sibling repo (or projectDir for legacy), then the
  // worktree anchor — the main checkout when the caller runs from a sibling worktree.
  const repoCwd = resolveRepoCwd(pd, flags, slug);
  const { gitCwd } = resolveWorktreeAnchor(repoCwd);

  const wtPath = worktreePath(pd, slug);
  const branchName = `bolt-${slug}`;
  const dirExists = existsSync(wtPath);
  const branchExists = runGit([
    "rev-parse",
    "--verify",
    `refs/heads/${branchName}`,
  ], gitCwd).ok;

  if (!dirExists && !branchExists) {
    console.log(
      JSON.stringify({
        emitted: null,
        slug,
        worktree_path: wtPath,
        reason: "already-discarded",
      })
    );
    return;
  }

  let auditTs: string;
  try {
    auditTs = emitAudit(pd, "WORKTREE_DISCARDED", {
      "Bolt slug": slug,
      "Worktree path": wtPath,
      Reason: "agent-discard",
    }, flags.intent, flags.space);
  } catch (e) {
    errorWithSlug(slug, `Audit emission failed: ${errorMessage(e)}`);
  }

  if (dirExists) {
    const rm = runGit(["worktree", "remove", "--force", wtPath], gitCwd);
    if (!rm.ok) {
      errorWithSlug(
        slug,
        `git worktree remove failed: ${rm.stderr.trim() || `exit ${rm.code}`}`
      );
    }
  }
  if (branchExists) {
    const del = runGit(["branch", "-D", branchName], gitCwd);
    if (!del.ok) {
      errorWithSlug(
        slug,
        `branch -D ${branchName} failed: ${del.stderr.trim() || `exit ${del.code}`}`
      );
    }
  }

  console.log(
    JSON.stringify({
      emitted: "WORKTREE_DISCARDED",
      slug,
      worktree_path: wtPath,
      reason: "agent-discard",
      audit_timestamp: auditTs,
    })
  );
}

// --- Subcommand: list ---
//
// Usage: amadeus-worktree list
//
// Filters `git worktree list --porcelain` output to entries that are AIDLC
// Bolt worktrees: parent path is the bolts dir AND the basename starts with
// `bolt-`. Both conditions are required so an unrelated worktree someone happens
// to name `bolt-other` outside our namespace doesn't masquerade as a Bolt.
// Read-only — no audit emission, no true-nest rejection (list works from anywhere,
// including from inside a Bolt worktree).
//
// The bolts dir is anchored to the MAIN checkout by the SAME rule the write paths
// use (`worktreeBaseDir` over the shared `resolveMainCheckout` classification): run
// from a sibling worktree of a legacy single-repo intent, the namespace resolves at
// the main checkout so `list` sees the Bolts that an anchored `create` produced.
// Run from the main checkout, or a multi-repo intent (pd is the non-git workspace
// roof), or outside a git repo — the pd anchor is kept (byte-identical), and the
// non-git case lets `git worktree list` surface its existing error.
export function handleList(
  _args: string[],
  explicitProjectDir?: string,
): void {
  const pd = resolveProjectDir(explicitProjectDir ?? projectDir);
  const base = worktreeBaseDir(pd);
  const boltsDir = pathKey(resolve(base, ".amadeus", "worktrees"));

  const r = runGit(["worktree", "list", "--porcelain"]);
  if (!r.ok) {
    error(`git worktree list failed: ${r.stderr.trim() || `exit ${r.code}`}`);
  }

  interface WT {
    path: string;
    branch: string;
  }
  // Type guard — a Partial<WT> with .path defined narrows to WT since
  // branch defaults to "" at construction (the "worktree " branch below).
  function isCompleteWT(p: Partial<WT>): p is WT {
    return p.path !== undefined;
  }
  const all: WT[] = [];
  let cur: Partial<WT> = {};
  for (const line of r.stdout.split(/\r?\n/)) {
    if (line.startsWith("worktree ")) {
      if (isCompleteWT(cur)) all.push({ ...cur, branch: cur.branch ?? "" });
      cur = { path: line.slice("worktree ".length), branch: "" };
    } else if (line.startsWith("branch ")) {
      cur.branch = line.slice("branch ".length).replace(/^refs\/heads\//, "");
    } else if (line === "") {
      if (isCompleteWT(cur)) {
        all.push({ ...cur, branch: cur.branch ?? "" });
        cur = {};
      }
    }
  }
  if (isCompleteWT(cur)) all.push({ ...cur, branch: cur.branch ?? "" });

  const bolts = all
    .filter((w) => {
      const base = w.path.split(/[\\/]/).filter(Boolean).pop() ?? "";
      if (!base.startsWith("bolt-")) return false;
      // Require parent to be the framework-owned bolts directory.
      const parent = pathKey(dirname(w.path));
      return parent === boltsDir;
    })
    .map((w) => ({
      slug: (w.path.split(/[\\/]/).filter(Boolean).pop() ?? "").slice("bolt-".length),
      worktree_path: w.path,
      branch: w.branch,
    }));

  console.log(JSON.stringify({ worktrees: bolts }));
}

// --- Subcommand: verify ---
//
// Usage: amadeus-worktree verify --event <WORKTREE_*> --slug <slug>
//                              [--max-age-seconds <n>]
//
// Scans the intent's audit shards for the most recent record matching both
// Event <event> and Bolt slug <slug>. Read-only — no audit
// emission. The orchestrator's deterministic post-dispatch backstop.
function handleVerify(args: string[]): void {
  const flags = parseFlags(args);
  if (!flags.event) error("Missing --event <WORKTREE_CREATED|WORKTREE_MERGED|WORKTREE_DISCARDED>");
  if (!VALID_VERIFY_EVENTS.has(flags.event)) {
    error(
      `Invalid --event: "${flags.event}". Must be one of: WORKTREE_CREATED, WORKTREE_MERGED, WORKTREE_DISCARDED.`
    );
  }
  const slug = validateSlug(flags.slug);
  const maxAge = flags["max-age-seconds"]
    ? Number(flags["max-age-seconds"])
    : 60;
  if (!Number.isFinite(maxAge) || maxAge < 0) {
    error(`Invalid --max-age-seconds: "${flags["max-age-seconds"]}".`);
  }

  const pd = resolveProjectDir(projectDir);
  // Read across every per-clone audit shard (single shard in the common case).
  const audit = readAllAuditShards(pd, flags.intent, flags.space);
  if (audit.length === 0) {
    process.stdout.write(
      `${JSON.stringify({
        verified: false,
        event: flags.event,
        slug,
        reason: "absent",
      })}\n`
    );
    process.exit(1);
  }

  const match = findLatestEvent(audit, flags.event, slug);
  if (!match) {
    process.stdout.write(
      `${JSON.stringify({
        verified: false,
        event: flags.event,
        slug,
        reason: "absent",
      })}\n`
    );
    process.exit(1);
  }

  const ageMs = Date.now() - new Date(match.timestamp).getTime();
  if (ageMs > maxAge * 1000) {
    process.stdout.write(
      `${JSON.stringify({
        verified: false,
        event: flags.event,
        slug,
        reason: `stale (last seen ${match.timestamp})`,
      })}\n`
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      verified: true,
      event: flags.event,
      slug,
      audit_timestamp: match.timestamp,
    })
  );
}

// --- Subcommand: info ---
//
// Usage: amadeus-worktree info --slug <slug>
//
// Reads the most-recent WORKTREE_CREATED audit block for `slug`, parses the
// `Worktree path` and `Branch name` fields, emits JSON to stdout, exits 0.
// On miss or malformed-block, prints an error to stderr and exits non-zero.
//
// The halt-and-ask flow calls this to interpolate the worktree path and
// branch name into the AskUserQuestion prompt body. Schema pinned in
// `knowledge/amadeus-shared/worktree-info-schema.md`.
export function handleInfo(args: string[]): void {
  const flags = parseFlags(args);
  const slug = validateSlug(flags.slug);

  const pd = resolveProjectDir(projectDir);
  // Read across every per-clone audit shard (single shard in the common case).
  const audit = readAllAuditShards(pd, flags.intent, flags.space);
  if (audit.length === 0) {
    process.stderr.write(
      `error: no WORKTREE_CREATED audit entry for slug ${slug} (audit log absent)\n`
    );
    process.exit(1);
  }

  const match = findLatestEvent(audit, "WORKTREE_CREATED", slug);
  if (!match) {
    process.stderr.write(
      `error: no WORKTREE_CREATED audit entry for slug ${slug}\n`
    );
    process.exit(1);
  }

  const worktreePathField = auditBlockField(match.block, "Worktree path");
  const branchNameField = auditBlockField(match.block, "Branch name");
  if (worktreePathField === null || branchNameField === null) {
    process.stderr.write(
      `error: malformed WORKTREE_CREATED block at ${match.timestamp} (missing Worktree path or Branch name field)\n`
    );
    process.exit(1);
  }

  // Read the per-Bolt forked state file for the Merge-Held marker if present.
  // Absence of the file or the field both resolve to merge_held=false — the
  // resume-path check is "do not dispatch a merge that's actively held",
  // not "every Bolt has had its hold state explicitly initialised".
  let mergeHeld = false;
  const wtStatePath = worktreeStateFilePath(worktreePathField);
  if (existsSync(wtStatePath)) {
    const wtContent = readFileSync(wtStatePath, "utf-8");
    mergeHeld = getField(wtContent, "Merge-Held") === "true";
  }

  console.log(
    JSON.stringify({
      slug,
      path: worktreePathField,
      branch_name: branchNameField,
      audit_timestamp: match.timestamp,
      merge_held: mergeHeld,
    })
  );
}

interface AuditMatch {
  timestamp: string;
  block: string;
}

function findLatestEvent(
  audit: string,
  event: string,
  slug: string
): AuditMatch | null {
  // Select the CHRONOLOGICALLY-newest matching block (max **Timestamp**), NOT
  // the last block by buffer position. The audit string is a readAllAuditShards
  // glob-merge that concatenates per-clone shards in FILENAME (lexical) order,
  // so it is NOT time-ordered across shards — a buffer-position "last match
  // wins" walk could return an OLDER block from a lexically-later shard (e.g.
  // `worktree verify --max-age-seconds` reporting a fresh worktree STALE, or
  // `worktree info` returning a stale path/branch). Delegate to findAllEvents,
  // which CRLF-normalizes before splitting and sorts ascending by ISO-8601
  // timestamp with a buffer-position tiebreak — the SAME ordering fix the other
  // readers (findAllEvents / buildWorkflowHeader / hasStageAuditEvent) already
  // use — then take the last (newest) match. Returns null on no match.
  const matches = findAllEvents(audit, event, slug);
  if (matches.length === 0) return null;
  const newest = matches[matches.length - 1];
  return { timestamp: newest.timestamp, block: newest.block };
}

// --- CLI entry point ---

let projectDir: string | undefined;

function main(): void {
  const rawArgs = process.argv.slice(2);

  const filteredArgs: string[] = [];
  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i] === "--project-dir" && i + 1 < rawArgs.length) {
      projectDir = rawArgs[i + 1];
      i++;
    } else {
      filteredArgs.push(rawArgs[i]);
    }
  }

  const subcommand = filteredArgs[0];

  try {
    switch (subcommand) {
      case "create":

  // Telemetry process span (opt-in; no-op unless observability.enabled).
  // Resolution failures must not change the CLI contract — skip silently.
  try {
    initProcessObservability(`tool:amadeus-worktree:${subcommand ?? "?"}`, resolveProjectDir(projectDir));
  } catch {
    // no resolvable workflow -> nothing to observe
  }

        handleCreate(filteredArgs.slice(1));
        break;
      case "merge":
        handleMerge(filteredArgs.slice(1));
        break;
      case "discard":
        handleDiscard(filteredArgs.slice(1));
        break;
      case "list":
        handleList(filteredArgs.slice(1));
        break;
      case "verify":
        handleVerify(filteredArgs.slice(1));
        break;
      case "info":
        handleInfo(filteredArgs.slice(1));
        break;
      default:
        error(
          `Unknown subcommand: ${subcommand}. Valid: create, merge, discard, list, verify, info`
        );
    }
  } catch (e) {
    error(errorMessage(e));
  }
}

// errorWithSlug — emits ERROR_LOGGED via emitError with `[slug=<slug>]`
// prepended to the message so doctor's regex `\[slug=([a-z0-9-]+)\]` can
// correlate the error with the affected Bolt without re-engineering
// emitError's field set.
function errorWithSlug(slug: string, msg: string): never {
  error(`[slug=${slug}] ${msg}`);
}

function error(msg: string): never {
  const pd = resolveProjectDir(projectDir);
  const command = `amadeus-worktree ${process.argv.slice(2).join(" ")}`.trim();
  emitError(pd, "amadeus-worktree", command, msg);
}

if (import.meta.main) {
  main();
}
