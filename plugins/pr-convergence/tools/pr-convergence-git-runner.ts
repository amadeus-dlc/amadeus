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

export function verifyCreatePrerequisites(
  cwd: string,
  head: string,
  requestedBase: string | null,
  git: GitSpawn = nodeGitSpawn,
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
  const status = run(git, cwd, ["status", "--porcelain", "--untracked-files=no"]);
  if (status.code !== 0 || status.stdout.trim() !== "") {
    return { ok: false, message: "tracked worktree is dirty; commit or restore tracked changes before create" };
  }
  const remote = run(git, cwd, ["ls-remote", "--exit-code", "--heads", "origin", head]);
  const remoteHead = remote.stdout.trim().split(/\s+/)[0] ?? "";
  if (remote.code !== 0 || !/^[0-9a-f]{40,64}$/i.test(remoteHead)) {
    return { ok: false, message: `remote branch origin/${head} is missing; push the branch before create` };
  }
  const localHead = local.stdout.trim();
  if (localHead !== remoteHead) {
    return { ok: false, message: `local HEAD and origin/${head} differ; push the current HEAD before create` };
  }
  return { ok: true, localHead, remoteHead, base };
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
  const status = run(git, cwd, ["status", "--porcelain", "--untracked-files=no"]);
  if (status.code !== 0 || status.stdout.trim() !== "") return { ok: false, message: "tracked worktree is dirty; commit or restore it" };
  const remote = run(git, cwd, ["ls-remote", "--exit-code", "--heads", "origin", head]);
  const remoteHead = remote.stdout.trim().split(/\s+/)[0] ?? "";
  if (remote.code !== 0 || remoteHead === "") return { ok: false, message: `remote branch origin/${head} is missing; push it` };
  if (localHead !== remoteHead || localHead !== expected.oid) {
    return { ok: false, message: "local HEAD, remote branch, and PR head must be identical; push and refresh the PR" };
  }
  return { ok: true, localHead, remoteHead, base: "" };
}
