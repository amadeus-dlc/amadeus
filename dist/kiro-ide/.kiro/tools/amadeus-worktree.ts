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
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { appendAuditEntry } from "./amadeus-audit.ts";
import {
  emitError,
  errorMessage,
  findAllEvents,
  getField,
  readAllAuditShards,
  resolveConstructionRepo,
  resolveProjectDir,
  worktreePath,
  worktreeStateFilePath,
} from "./amadeus-lib.js";

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

// --- Flag parsing (mirrors amadeus-bolt.ts:30-46) ---

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) continue;
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
  const result = appendAuditEntry(eventType, fields, pd, intent, space);
  return result.timestamp;
}

// --- Git invocation ---

interface GitResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number;
}

function runGit(args: string[], cwd?: string): GitResult {
  const r = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
    env: { ...process.env, EDITOR: process.env.EDITOR ?? "false" },
  });
  return {
    ok: r.status === 0,
    stdout: (r.stdout ?? "").toString(),
    stderr: (r.stderr ?? "").toString(),
    code: r.status ?? 1,
  };
}

// --- Worktree anchor resolution ---
//
// The MAIN checkout is the shared anchor for BOTH the write subcommands (which must
// operate on it even when invoked from a sibling worktree) and the read-only `list`
// namespace filter (which must find Bolt worktrees that live under it). Both go
// through the one pure resolver below so the git-common-dir → main-checkout grammar
// is defined once.
//
// `resolveMainCheckout` is a read-only git probe: it returns the caller cwd's own
// toplevel and its main checkout (`git rev-parse --git-common-dir`'s parent,
// canonicalised because macOS symlinks `/var → /private/var`), or null when the cwd
// is not a git repo / the common dir can't be resolved. No rejection, no side
// effects — callers decide what to do with the classification.
function resolveMainCheckout(
  gitCwd?: string
): { cwdTop: string; mainCheckout: string } | null {
  const top = runGit(["rev-parse", "--show-toplevel"], gitCwd);
  if (!top.ok) return null;
  const cwdTop = canonicalise(top.stdout.trim());
  const common = runGit(["rev-parse", "--git-common-dir"], gitCwd);
  if (!common.ok) return null;
  const commonAbs = resolve(cwdTop, common.stdout.trim());
  return { cwdTop, mainCheckout: canonicalise(dirname(commonAbs)) };
}

// `resolveWorktreeAnchor` classifies the WRITE caller's cwd for create/merge/discard:
//
//   - cwd IS the main checkout   → { gitCwd: repoCwd, anchored: false }. Byte-identical
//       legacy behaviour: git ops and the worktree path keep the caller's RAW repoCwd,
//       so no canonicalised path leaks into audit fields or output JSON.
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

// Resolve the base dir the Bolt worktree namespace hangs under, shared by the write
// paths and `list`. A legacy single-repo intent (the repo IS the projectDir) executed
// from a sibling worktree pins the namespace at the MAIN checkout so worktrees are
// siblings of it, not nested under the caller's cwd. Multi-repo (P7: the repo is a
// child dir, != pd) and main-checkout runs keep the workspace-roof/pd anchor
// (byte-identical). `legacySingleRepo` and `anchored` are computed by each caller
// from the shared `resolveMainCheckout` classification.
function worktreeBaseDir(
  pd: string,
  mainCheckout: string,
  anchored: boolean,
  legacySingleRepo: boolean
): string {
  return anchored && legacySingleRepo ? mainCheckout : pd;
}

function canonicalise(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

function pathKey(p: string): string {
  const normalised = canonicalise(resolve(p)).replace(/\\/g, "/");
  return process.platform === "win32" ? normalised.toLowerCase() : normalised;
}

// --- Validation helpers ---

function validateSlug(slug: string | undefined): string {
  if (!slug) error("Missing --slug <slug>");
  if (!SLUG_RE.test(slug)) {
    error(
      `Invalid --slug: "${slug}". Must be kebab-case (lowercase letter then [a-z0-9-]).`
    );
  }
  return slug;
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
// Usage: amadeus-worktree create --slug <slug> --base <branch> [--repo <name>]
//                              [--intent <dir>] [--space <name>]
//
// --repo (P7): the sibling repo to fork the worktree inside (a multi-repo intent
// requires it; a single-repo intent infers the lone repo; a legacy intent with no
// recorded repos runs in the projectDir, today's behaviour).
function handleCreate(args: string[]): void {
  const flags = parseFlags(args);
  const slug = validateSlug(flags.slug);
  if (!flags.base) errorWithSlug(slug, "Missing --base <branch>");

  const pd = resolveProjectDir(projectDir);
  // P7: resolve the target sibling repo (or the projectDir for a legacy single-repo
  // intent), then resolve the worktree anchor — the main checkout when the caller
  // runs from a sibling worktree, otherwise the caller's own repoCwd.
  const repoCwd = resolveRepoCwd(pd, flags, slug);
  const { gitCwd, anchored } = resolveWorktreeAnchor(repoCwd);

  // Pre-audit checks: every failure here exits without emitting.
  const baseExists = runGit(["rev-parse", "--verify", flags.base], gitCwd);
  if (!baseExists.ok) {
    errorWithSlug(slug, `Base branch does not exist locally: ${flags.base}`);
  }

  const wtPath = worktreePath(worktreeBaseDir(pd, gitCwd, anchored, pathKey(repoCwd) === pathKey(pd)), slug);
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
  // semantics — see docs/reference/12-state-machine.md).
  let auditTs: string;
  try {
    auditTs = emitAudit(pd, "WORKTREE_CREATED", {
      "Bolt slug": slug,
      "Worktree path": wtPath,
      "Branch name": branchName,
      "Base branch": flags.base,
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
//                        [--message <msg>] [--repo <name>] [--intent <dir>] [--space <name>]
//
// --repo (P7): the sibling repo the merge lands in — same resolution as `create`.
function handleMerge(args: string[]): void {
  const flags = parseFlags(args);
  const slug = validateSlug(flags.slug);
  if (!flags.target) errorWithSlug(slug, "Missing --target <branch>");
  const strategy = validateStrategy(flags.strategy);
  const message = flags.message ?? `Bolt ${slug}`;

  const pd = resolveProjectDir(projectDir);
  // P7: resolve the target sibling repo, then the worktree anchor. The merge runs
  // IN the main checkout (squash/merge/ff/commit/worktree-remove/branch-D); the
  // rebase still runs in the worktree (wtPath). When the caller runs from a sibling
  // worktree, gitCwd is the main checkout; otherwise it is the caller's own repoCwd.
  const repoCwd = resolveRepoCwd(pd, flags, slug);
  const { gitCwd, anchored } = resolveWorktreeAnchor(repoCwd);

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

  const wtPath = worktreePath(worktreeBaseDir(pd, gitCwd, anchored, pathKey(repoCwd) === pathKey(pd)), slug);
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
function handleDiscard(args: string[]): void {
  const flags = parseFlags(args);
  const slug = validateSlug(flags.slug);
  const pd = resolveProjectDir(projectDir);
  // P7: resolve the target sibling repo (or projectDir for legacy), then the
  // worktree anchor — the main checkout when the caller runs from a sibling worktree.
  const repoCwd = resolveRepoCwd(pd, flags, slug);
  const { gitCwd, anchored } = resolveWorktreeAnchor(repoCwd);

  const wtPath = worktreePath(worktreeBaseDir(pd, gitCwd, anchored, pathKey(repoCwd) === pathKey(pd)), slug);
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
function handleList(_args: string[]): void {
  const pd = resolveProjectDir(projectDir);
  const here = resolveMainCheckout();
  const pdRepo = resolveMainCheckout(pd);
  const anchored = here !== null && here.cwdTop !== here.mainCheckout;
  const legacySingleRepo =
    here !== null &&
    pdRepo !== null &&
    pathKey(pdRepo.mainCheckout) === pathKey(here.mainCheckout);
  const base = worktreeBaseDir(pd, here?.mainCheckout ?? pd, anchored, legacySingleRepo);
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
// Greps `amadeus-docs/audit.md` for the most recent block matching both
// `**Event**: <event>` and `**Bolt slug**: <slug>`. Read-only — no audit
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
function handleInfo(args: string[]): void {
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

  const pathMatch = match.block.match(/^\*\*Worktree path\*\*:\s*(.+?)\s*$/m);
  const branchMatch = match.block.match(/^\*\*Branch name\*\*:\s*(.+?)\s*$/m);
  if (!pathMatch || !branchMatch) {
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
  const wtStatePath = worktreeStateFilePath(pathMatch[1]);
  if (existsSync(wtStatePath)) {
    const wtContent = readFileSync(wtStatePath, "utf-8");
    mergeHeld = getField(wtContent, "Merge-Held") === "true";
  }

  console.log(
    JSON.stringify({
      slug,
      path: pathMatch[1],
      branch_name: branchMatch[1],
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
