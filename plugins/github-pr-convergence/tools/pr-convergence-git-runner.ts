import { spawnSync } from "node:child_process";

export interface GitRunResult { readonly code: number; readonly stdout: string; readonly stderr: string }
export type GitSpawn = (argv: readonly string[], cwd: string) => GitRunResult;

/**
 * How long a single git invocation may run. `ls-remote` talks to the network,
 * so without a deadline an unresponsive remote parks the whole CLI — and the
 * verbs it gates — indefinitely. Expiry is a loud failure, never a pass.
 */
export const GIT_TIMEOUT_MS = 30_000;

export function createNodeGitSpawn(timeoutMs: number): GitSpawn {
  return (argv, cwd) => {
    const [command, ...args] = argv;
    if (command === undefined) return { code: -1, stdout: "", stderr: "empty argv" };
    const result = spawnSync(command, args, { cwd, encoding: "utf-8", timeout: timeoutMs });
    const failure = result.error as NodeJS.ErrnoException | undefined;
    // spawnSync reports the deadline either as an ETIMEDOUT error or, on some
    // platforms, only as the kill signal it used.
    if (failure?.code === "ETIMEDOUT" || (result.status === null && result.signal !== null)) {
      return {
        code: -1,
        stdout: "",
        stderr: `${command} ${args.join(" ")} timed out after ${timeoutMs}ms; the remote or the repository is unresponsive`,
      };
    }
    if (failure !== undefined) return { code: -1, stdout: "", stderr: String(failure) };
    return { code: result.status ?? -1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  };
}

export const nodeGitSpawn: GitSpawn = createNodeGitSpawn(GIT_TIMEOUT_MS);

export type GitPrerequisite =
  | { readonly ok: true; readonly localHead: string; readonly remoteHead: string; readonly base: string }
  | { readonly ok: false; readonly message: string };

function run(git: GitSpawn, cwd: string, args: readonly string[]): GitRunResult {
  return git(["git", ...args], cwd);
}

/**
 * The delivery mechanism's own tracked outputs, which a clean-worktree check
 * must not count against the delivery that just produced them.
 *
 * `create` writes the unit's report and appends the record's audit shard —
 * both tracked. Counting them would deadlock the loop: `report` refuses because
 * they are dirty, and committing them moves the head, staling the attestation
 * they carry. Exactly two paths are exempt, and both are derived from the
 * record and unit this invocation names; everything else still refuses.
 */
interface SelfOutputPaths {
  readonly reports: readonly string[];
  readonly auditDir: string;
}

function selfOutputPaths(prefix: string, units: readonly string[]): SelfOutputPaths {
  return {
    reports: units.map((unit) => `${prefix}construction/${unit}/code-generation/pr-convergence-report.md`),
    auditDir: `${prefix}audit/`,
  };
}

/** The path a `git status --porcelain` line names (root-relative; a rename
 *  reports its destination). */
function statusPath(line: string): string {
  const body = line.slice(3);
  const renamed = body.lastIndexOf(" -> ");
  return renamed === -1 ? body : body.slice(renamed + 4);
}

function isSelfOutput(path: string, self: SelfOutputPaths): boolean {
  if (self.reports.includes(path)) return true;
  if (!path.startsWith(self.auditDir) || !path.endsWith(".jsonl")) return false;
  return !path.slice(self.auditDir.length).includes("/");
}

/**
 * The tracked modifications that are not this delivery's own outputs. An empty
 * result means the worktree is clean as far as this delivery is concerned.
 * The record's repository-relative prefix is read only when something IS dirty,
 * and a prefix that cannot be resolved exempts nothing — the check stays
 * closed rather than guessing which paths are ours.
 */
function foreignDirtyPaths(git: GitSpawn, cwd: string, units: readonly string[] | null): readonly string[] {
  const status = run(git, cwd, ["status", "--porcelain", "--untracked-files=no"]);
  if (status.code !== 0) return ["<git status failed>"];
  const lines = status.stdout.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0 || units === null) return lines.map(statusPath);
  const prefix = run(git, cwd, ["rev-parse", "--show-prefix"]);
  if (prefix.code !== 0) return lines.map(statusPath);
  const self = selfOutputPaths(prefix.stdout.trim(), units);
  return lines.map(statusPath).filter((path) => !isSelfOutput(path, self));
}

/**
 * The SHA origin publishes for exactly `refs/heads/<head>`. `ls-remote`
 * matches patterns against the TAIL of ref names, so a bare branch pattern can
 * return several refs (e.g. `feature/x` also matches `refs/heads/y/feature/x`)
 * and the first line would be an unrelated branch's SHA. Only the line whose
 * ref column equals the fully qualified name is accepted.
 */
function remoteBranchSha(git: GitSpawn, cwd: string, head: string): string {
  const fullRef = `refs/heads/${head}`;
  const remote = run(git, cwd, ["ls-remote", "--exit-code", "--heads", "origin", fullRef]);
  if (remote.code !== 0) return "";
  for (const line of remote.stdout.split("\n")) {
    const [sha, ref] = line.trim().split(/\s+/);
    if (ref === fullRef && sha !== undefined && /^[0-9a-f]{40,64}$/i.test(sha)) return sha;
  }
  return "";
}

export function verifyCreatePrerequisites(
  cwd: string,
  head: string,
  requestedBase: string | null,
  git: GitSpawn = nodeGitSpawn,
  // The member Units whose reports this delivery owns. Omitted (an unlinked
  // caller), no path is exempt from the clean-worktree check.
  units: readonly string[] | null = null,
): GitPrerequisite {
  const top = run(git, cwd, ["rev-parse", "--show-toplevel"]);
  if (top.code !== 0) return { ok: false, message: "not a git worktree; run create from a committed checkout" };
  const base = requestedBase ?? run(git, cwd, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]).stdout.trim().replace(/^origin\//, "");
  if (base === "" || head === base || head === `origin/${base}`) {
    return { ok: false, message: "head must differ from the base branch; create a dedicated branch" };
  }
  const branch = run(git, cwd, ["branch", "--show-current"]);
  if (branch.code !== 0 || branch.stdout.trim() !== head) {
    return { ok: false, message: `checked-out branch must equal --head ${head}; switch branches before create` };
  }
  const local = run(git, cwd, ["rev-parse", "HEAD"]);
  if (local.code !== 0 || !/^[0-9a-f]{40,64}$/i.test(local.stdout.trim())) {
    return { ok: false, message: "local HEAD commit is missing; commit the target changes first" };
  }
  const changed = run(git, cwd, ["diff", "--name-only", `${base}...HEAD`]);
  if (changed.code !== 0 || changed.stdout.trim() === "") {
    return { ok: false, message: "HEAD contains no target changes; commit the implementation first" };
  }
  if (foreignDirtyPaths(git, cwd, units).length > 0) {
    return { ok: false, message: "tracked worktree is dirty; commit or restore tracked changes before create" };
  }
  const remoteHead = remoteBranchSha(git, cwd, head);
  if (remoteHead === "") {
    return { ok: false, message: `remote branch origin/${head} is missing; push the branch before create` };
  }
  const localHead = local.stdout.trim();
  if (localHead !== remoteHead) {
    return { ok: false, message: `local HEAD and origin/${head} differ; push the current HEAD before create` };
  }
  return { ok: true, localHead, remoteHead, base };
}

export type LandedPrerequisite =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

/**
 * What a landed finalisation can still verify locally. The pull request is
 * merged: the merge queue routinely deletes its head branch and the checkout
 * has moved on, so branch identity and head equality no longer describe
 * anything about it — the merge facts and the epoch ancestry bind it instead.
 * What remains local, and still matters, is that no foreign uncommitted work is
 * being folded into the finalisation.
 */
export function verifyLandedPrerequisites(
  cwd: string,
  git: GitSpawn = nodeGitSpawn,
  units: readonly string[] | null = null,
): LandedPrerequisite {
  const dirty = foreignDirtyPaths(git, cwd, units);
  return dirty.length === 0
    ? { ok: true }
    : { ok: false, message: "tracked worktree is dirty; commit or restore it" };
}

/**
 * Evidence that a `created` epoch's attested head is an ancestor of the head
 * the pull request merged. Only `verifyMergedEpochAncestry` mints one, so no
 * caller can assert an ancestry it never measured.
 */
export type LandedEpochProof = {
  readonly attestedPrHead: string;
  readonly mergedHead: string;
  readonly __brand: "LandedEpochProof";
};

export type EpochAncestryResult =
  | { readonly ok: true; readonly proof: LandedEpochProof }
  | { readonly ok: false; readonly message: string };

function epochProof(attestedPrHead: string, mergedHead: string): EpochAncestryResult {
  return { ok: true, proof: { attestedPrHead, mergedHead, __brand: "LandedEpochProof" } };
}

/**
 * Whether the head a `created` epoch attested is an ancestor of the head the
 * pull request merged.
 *
 * Evidence source: `refs/pull/<n>/head`. GitHub keeps that ref after the merge,
 * branch deletion or not, so it answers precisely in the case `origin/<branch>`
 * cannot — and fetching it brings the merged head AND its whole ancestry into
 * this repository, which turns the question into a local, deterministic
 * `git merge-base --is-ancestor` rather than a remote judgement. The merge
 * commit is deliberately NOT the target: `main` squashes, so the attested head
 * is never an ancestor of the merge commit (measured on #3092).
 *
 * A fetch that fails is a loud failure with no second source behind it: an
 * ancestry that cannot be measured must never become an assumed one.
 */
export function verifyMergedEpochAncestry(
  cwd: string,
  prNumber: number,
  attestedPrHead: string,
  mergedHead: string,
  git: GitSpawn = nodeGitSpawn,
): EpochAncestryResult {
  // Nothing was pushed on top of the epoch: the merged head IS the attested
  // one, and no commit needs fetching to say so.
  if (attestedPrHead === mergedHead) return epochProof(attestedPrHead, mergedHead);
  const ref = `refs/pull/${prNumber}/head`;
  const fetched = run(git, cwd, ["fetch", "origin", ref]);
  if (fetched.code !== 0) {
    return {
      ok: false,
      message: `cannot fetch ${ref} to measure the created epoch: ${fetched.stderr.trim()}`,
    };
  }
  const ancestry = run(git, cwd, ["merge-base", "--is-ancestor", attestedPrHead, mergedHead]);
  if (ancestry.code === 0) return epochProof(attestedPrHead, mergedHead);
  if (ancestry.code === 1) {
    return {
      ok: false,
      message: `the created epoch attested ${attestedPrHead}, which is not an ancestor of the merged head ${mergedHead}; this report does not describe the delivery that merged`,
    };
  }
  return {
    ok: false,
    message: `cannot measure whether ${attestedPrHead} is an ancestor of ${mergedHead}: ${ancestry.stderr.trim()}`,
  };
}

/**
 * Evidence that a commit which superseded a unit's own delivery (#3239) is on
 * the trunk the current checkout can already see. Distinct from
 * `LandedEpochProof`: that proof relates a `created` epoch's attested head to
 * the merge that closed it, whereas here there is no epoch and no merge to
 * relate — only the fact that whatever superseded this delivery actually
 * landed. Only `verifySupersedeAncestry` mints one.
 */
export type SupersedeAncestryProof = {
  readonly supersededBy: string;
  readonly localHead: string;
  readonly __brand: "SupersedeAncestryProof";
};

export type SupersedeAncestryResult =
  | { readonly ok: true; readonly proof: SupersedeAncestryProof }
  | { readonly ok: false; readonly message: string };

/**
 * Whether `supersededBy` — the commit that actually delivered this unit's
 * work — is an ancestor of the current checkout's HEAD. A unit's own pull
 * request never merged here, so there is no live branch and no merge fact to
 * bind against; the only thing that can be measured locally is that the
 * commit which superseded it is really on the history this checkout already
 * holds. No fetch is attempted — unlike `verifyMergedEpochAncestry`, there is
 * no `refs/pull/<n>/head` to pull it from, since it may not even be the head
 * of any pull request (a raw commit is accepted too) — so a checkout that has
 * not yet fetched the superseding history fails closed with a message that
 * says so, rather than guessing.
 */
export function verifySupersedeAncestry(
  cwd: string,
  supersededBy: string,
  git: GitSpawn = nodeGitSpawn,
): SupersedeAncestryResult {
  const head = run(git, cwd, ["rev-parse", "HEAD"]);
  const localHead = head.stdout.trim();
  if (head.code !== 0 || !/^[0-9a-f]{40}$/i.test(localHead)) {
    return { ok: false, message: "cannot resolve local HEAD" };
  }
  const ancestry = run(git, cwd, ["merge-base", "--is-ancestor", supersededBy, localHead]);
  if (ancestry.code === 0) {
    return { ok: true, proof: { supersededBy, localHead, __brand: "SupersedeAncestryProof" } };
  }
  if (ancestry.code === 1) {
    return {
      ok: false,
      message:
        `${supersededBy} is not an ancestor of the current checkout ${localHead}; ` +
        "fetch the superseding history and retry",
    };
  }
  return {
    ok: false,
    message: `cannot measure whether ${supersededBy} is an ancestor of ${localHead}: ${ancestry.stderr.trim()}`,
  };
}

/**
 * The pull request the current checkout is allowed to speak for: the same
 * commit AND the same branch name. A SHA alone is not identity — the identical
 * commit published under a second branch would otherwise pass.
 */
export interface ExpectedPrHead {
  readonly oid: string;
  readonly ref: string;
}

export function verifyCurrentPrerequisites(
  cwd: string,
  expected: ExpectedPrHead,
  git: GitSpawn = nodeGitSpawn,
  units: readonly string[] | null = null,
): GitPrerequisite {
  const branch = run(git, cwd, ["branch", "--show-current"]);
  const head = branch.stdout.trim();
  if (branch.code !== 0 || head === "") return { ok: false, message: "detached HEAD; check out the linked PR branch" };
  if (head !== expected.ref) {
    return { ok: false, message: `checked-out branch ${head} is not the PR head branch ${expected.ref}` };
  }
  const local = run(git, cwd, ["rev-parse", "HEAD"]);
  const localHead = local.stdout.trim();
  if (local.code !== 0 || !/^[0-9a-f]{40,64}$/i.test(localHead)) return { ok: false, message: "cannot resolve local HEAD" };
  if (foreignDirtyPaths(git, cwd, units).length > 0) {
    return { ok: false, message: "tracked worktree is dirty; commit or restore it" };
  }
  const remoteHead = remoteBranchSha(git, cwd, head);
  if (remoteHead === "") return { ok: false, message: `remote branch origin/${head} is missing; push it` };
  if (localHead !== remoteHead || localHead !== expected.oid) {
    return { ok: false, message: "local HEAD, remote branch, and PR head must be identical; push and refresh the PR" };
  }
  return { ok: true, localHead, remoteHead, base: "" };
}
