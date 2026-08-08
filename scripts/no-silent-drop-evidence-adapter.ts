import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EVIDENCE_BUNDLE_PATHS,
  EVIDENCE_FRESHNESS_PATHSPECS,
  EVIDENCE_REGISTRY_PATH,
  EvidenceRebindError,
} from "../tests/no-silent-drop/evidence-rebind.ts";
import {
  type EvidenceRegistry,
  validateEvidenceRegistry,
} from "../tests/no-silent-drop/repository-adoption.ts";

export type CommandResult = {
  status: number;
  stdout: string;
  stderr: string;
};

export type CommandRunner = {
  run(command: readonly string[], options?: { cwd?: string; timeoutMs?: number }): CommandResult;
};

export const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;
const COMMAND_MAX_BUFFER_BYTES = 8 * 1024 * 1024;

export const systemCommandRunner: CommandRunner = {
  run(command, options = {}) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = spawnSync(command[0], command.slice(1), {
      cwd: options.cwd,
      encoding: "utf8",
      env: process.env,
      timeout: timeoutMs,
      maxBuffer: COMMAND_MAX_BUFFER_BYTES,
    });
    const timedOut = result.error !== undefined &&
      "code" in result.error &&
      result.error.code === "ETIMEDOUT";
    const stderr = result.stderr ?? "";
    const errorDetail = result.error === undefined ? "" : String(result.error);
    return {
      status: timedOut ? 124 : (result.status ?? 1),
      stdout: result.stdout ?? "",
      stderr: timedOut
        ? [stderr.trim(), `command timed out after ${timeoutMs}ms (SIGTERM)`, errorDetail].filter(Boolean).join("\n")
        : (stderr || errorDetail),
    };
  },
};

type JsonRecord = Record<string, unknown>;

type AssociatedPullRequest = {
  number: number;
  state: string;
  mergedAt: string | null;
  mergeCommitSha: string | null;
  baseRef: string;
};

export type IdentityProof = {
  pullRequestNumber: number;
  pullRequestHead: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fullSha(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value) && !/^0+$/.test(value);
}

function commandDetail(result: CommandResult): string {
  return (result.stderr || result.stdout || `exit ${result.status}`).trim();
}

function parseAssociatedPullRequest(value: unknown, index: number): AssociatedPullRequest {
  if (!isRecord(value) || !Number.isInteger(value.number) || !isRecord(value.base)) {
    throw new EvidenceRebindError("REBIND_GITHUB_RESPONSE_INVALID", `associated pull request ${index} is malformed`);
  }
  const baseRef = value.base.ref;
  const mergedAt = value.merged_at;
  const mergeCommitSha = value.merge_commit_sha;
  if (typeof value.state !== "string" ||
    (mergedAt !== null && typeof mergedAt !== "string") ||
    (mergeCommitSha !== null && !fullSha(mergeCommitSha)) ||
    typeof baseRef !== "string") {
    throw new EvidenceRebindError("REBIND_GITHUB_RESPONSE_INVALID", `associated pull request ${index} is incomplete`);
  }
  return {
    number: value.number as number,
    state: value.state,
    mergedAt,
    mergeCommitSha,
    baseRef,
  };
}

function parseTree(output: string, revision: string): string[] {
  if (!output.endsWith("\0") && output !== "") {
    throw new EvidenceRebindError("REBIND_GIT_TREE_INVALID", `${revision} tree output is not NUL terminated`);
  }
  return output
    .split("\0")
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const tab = entry.indexOf("\t");
      const metadata = tab < 0 ? [] : entry.slice(0, tab).split(" ");
      if (tab < 0 || metadata.length !== 3 || !/^[0-7]{6}$/.test(metadata[0] ?? "") || !fullSha(metadata[2])) {
        throw new EvidenceRebindError("REBIND_GIT_TREE_INVALID", `${revision} tree entry is malformed`);
      }
      return entry;
    });
}

function entryPath(entry: string): string {
  return entry.slice(entry.indexOf("\t") + 1);
}

function parseRegistry(repositoryRoot: string): EvidenceRegistry {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(join(repositoryRoot, EVIDENCE_REGISTRY_PATH), "utf8"));
  } catch (error) {
    throw new EvidenceRebindError("REBIND_IO_READ_FAILED", `cannot read evidence registry: ${String(error)}`);
  }
  if (!isRecord(value) || !fullSha(value.currentRevision)) {
    throw new EvidenceRebindError("REBIND_SCHEMA_INVALID", "evidence registry binding revision is invalid");
  }
  return value as unknown as EvidenceRegistry;
}

export class NoSilentDropEvidenceAdapter {
  constructor(
    readonly repositoryRoot: string,
    readonly runner: CommandRunner = systemCommandRunner,
  ) {}

  private run(command: readonly string[]): CommandResult {
    return this.runner.run(command, { cwd: this.repositoryRoot });
  }

  private mustRun(command: readonly string[], code: string): string {
    const result = this.run(command);
    if (result.status !== 0) {
      throw new EvidenceRebindError(code, `${command[0]} ${command[1] ?? ""}: ${commandDetail(result)}`);
    }
    return result.stdout.trim();
  }

  headRevision(): string {
    const revision = this.mustRun(["git", "rev-parse", "HEAD"], "REBIND_GIT_FAILED");
    if (!fullSha(revision)) throw new EvidenceRebindError("REBIND_GIT_FAILED", "HEAD is not a full commit SHA");
    return revision;
  }

  bindingRevision(): string {
    return parseRegistry(this.repositoryRoot).currentRevision;
  }

  assertCommit(revision: string): void {
    if (!fullSha(revision)) throw new EvidenceRebindError("REBIND_INPUT_INVALID", "revision must be a lowercase full SHA");
    const result = this.run(["git", "cat-file", "-e", `${revision}^{commit}`]);
    if (result.status !== 0) throw new EvidenceRebindError("REBIND_REVISION_UNRESOLVED", `revision is not a local commit: ${revision}`);
  }

  // This is the last gate before the evidence bundle is rewritten, so cleanliness has to survive
  // a cut at ANY offset: under load git exits 0 with its stdout cut short (#2397 caught that on
  // `git ls-tree -z`). Two guards divide the offsets between them and neither covers the other's
  // share. NUL termination catches a record that stops mid-write — including a cut inside the
  // header, which would otherwise leave a lone `## …` entry and read as clean. `--branch` catches
  // the cut all the way to "", which is byte-identical to a clean worktree and which no
  // termination check can see. Only past both is cleanliness the absence of entries after a
  // header we actually saw.
  assertClean(): void {
    const status = this.mustRun(
      ["git", "status", "--porcelain=v1", "-z", "--branch", "--untracked-files=all"],
      "REBIND_GIT_FAILED",
    );
    if (!status.endsWith("\0")) {
      throw new EvidenceRebindError("REBIND_GIT_FAILED", "git status output is truncated: the final record has no NUL");
    }
    const [header, ...entries] = status.split("\0").filter((entry) => entry.length > 0);
    if (header === undefined || !header.startsWith("##")) {
      throw new EvidenceRebindError("REBIND_GIT_FAILED", "git status output is missing the branch header");
    }
    if (entries.length > 0) {
      throw new EvidenceRebindError("REBIND_WORKTREE_DIRTY", "index and working tree must be clean before rebind");
    }
  }

  assertAttachedLocalBranch(): void {
    const result = this.run(["git", "symbolic-ref", "-q", "HEAD"]);
    if (result.status === 1) {
      throw new EvidenceRebindError(
        "REBIND_DETACHED_HEAD",
        "pure rebind requires HEAD to be attached to a local branch",
      );
    }
    if (result.status !== 0) {
      throw new EvidenceRebindError("REBIND_GIT_FAILED", `cannot resolve HEAD symbolic ref: ${commandDetail(result)}`);
    }
    if (!/^refs\/heads\/[^\s]+\n?$/.test(result.stdout)) {
      throw new EvidenceRebindError(
        "REBIND_DETACHED_HEAD",
        "pure rebind requires HEAD to be attached to a local branch",
      );
    }
  }

  assertPureRebindTarget(targetRevision: string): void {
    this.assertCommit(targetRevision);
    const head = this.headRevision();
    if (targetRevision !== head) {
      throw new EvidenceRebindError("REBIND_TARGET_HEAD_MISMATCH", "pure rebind target must equal the clean workspace HEAD");
    }
    this.assertAttachedLocalBranch();
    this.assertClean();
  }

  assertEventCheckout(eventRevision: string): void {
    this.assertCommit(eventRevision);
    if (this.headRevision() !== eventRevision) {
      throw new EvidenceRebindError("REBIND_EVENT_HEAD_MISMATCH", "reconcile event revision must equal checkout HEAD");
    }
    this.assertClean();
  }

  currentBindingIsValidForEvent(eventRevision: string): boolean {
    const registry = parseRegistry(this.repositoryRoot);
    const validation = validateEvidenceRegistry(registry, registry.currentRevision, this.repositoryRoot);
    if (!validation.ok) {
      throw new EvidenceRebindError("REBIND_SOURCE_INVALID", "current evidence bundle is invalid", validation.problems);
    }
    const exists = this.run(["git", "cat-file", "-e", `${registry.currentRevision}^{commit}`]);
    if (exists.status !== 0) return false;
    const ancestor = this.run(["git", "merge-base", "--is-ancestor", registry.currentRevision, eventRevision]);
    if (ancestor.status === 1) return false;
    if (ancestor.status !== 0) {
      throw new EvidenceRebindError("REBIND_GIT_FAILED", `cannot evaluate binding ancestry: ${commandDetail(ancestor)}`);
    }
    const freshness = this.run([
      "git",
      "diff",
      "--quiet",
      `${registry.currentRevision}..${eventRevision}`,
      "--",
      ...EVIDENCE_FRESHNESS_PATHSPECS,
    ]);
    if (freshness.status === 0) return true;
    if (freshness.status === 1) {
      throw new EvidenceRebindError(
        "REBIND_NON_IDENTITY_DRIFT",
        "current binding is reachable but evidence freshness paths changed",
      );
    }
    throw new EvidenceRebindError("REBIND_GIT_FAILED", `cannot evaluate evidence freshness: ${commandDetail(freshness)}`);
  }

  private associatedPullRequests(eventRevision: string, repository: string): AssociatedPullRequest[] {
    if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) {
      throw new EvidenceRebindError("REBIND_INPUT_INVALID", "repository must be owner/name");
    }
    const result = this.run([
      "gh",
      "api",
      "--paginate",
      "--slurp",
      "-H",
      "Accept: application/vnd.github+json",
      `/repos/${repository}/commits/${eventRevision}/pulls?per_page=100`,
    ]);
    if (result.status !== 0) {
      throw new EvidenceRebindError("REBIND_GITHUB_FAILED", `cannot enumerate associated pull requests: ${commandDetail(result)}`);
    }
    let pages: unknown;
    try {
      pages = JSON.parse(result.stdout);
    } catch (error) {
      throw new EvidenceRebindError("REBIND_GITHUB_RESPONSE_INVALID", `associated pull request response is not JSON: ${String(error)}`);
    }
    if (!Array.isArray(pages) || pages.some((page) => !Array.isArray(page))) {
      throw new EvidenceRebindError("REBIND_GITHUB_RESPONSE_INVALID", "paginated pull request response is incomplete");
    }
    return pages.flatMap((page) => page as unknown[]).map(parseAssociatedPullRequest);
  }

  proveIdentityOnlyRebind(eventRevision: string, bindingRevision: string, repository: string): IdentityProof {
    const candidates = this.associatedPullRequests(eventRevision, repository).filter((pullRequest) =>
      pullRequest.baseRef === "main" &&
      pullRequest.state.toLowerCase() === "closed" &&
      pullRequest.mergedAt !== null && pullRequest.mergedAt.length > 0 &&
      pullRequest.mergeCommitSha === eventRevision);
    if (candidates.length !== 1) {
      throw new EvidenceRebindError(
        "REBIND_ASSOCIATED_PR_NOT_UNIQUE",
        `expected one merged main pull request for ${eventRevision}, found ${candidates.length}`,
      );
    }
    const candidate = candidates[0] as AssociatedPullRequest;
    const localRef = `refs/no-silent-drop/reconcile/pr-${candidate.number}-${eventRevision}`;
    const fetch = this.run([
      "git",
      "fetch",
      "--no-tags",
      "origin",
      `+refs/pull/${candidate.number}/head:${localRef}`,
    ]);
    if (fetch.status !== 0) {
      throw new EvidenceRebindError("REBIND_PR_HEAD_UNAVAILABLE", `cannot fetch refs/pull/${candidate.number}/head: ${commandDetail(fetch)}`);
    }
    const pullRequestHead = this.mustRun(["git", "rev-parse", localRef], "REBIND_PR_HEAD_UNAVAILABLE");
    if (!fullSha(pullRequestHead)) {
      throw new EvidenceRebindError("REBIND_PR_HEAD_UNAVAILABLE", "pull request head is not a full SHA");
    }
    const ancestor = this.run(["git", "merge-base", "--is-ancestor", bindingRevision, pullRequestHead]);
    if (ancestor.status !== 0) {
      throw new EvidenceRebindError("REBIND_BINDING_NOT_PR_ANCESTOR", "binding revision is not an ancestor of the final pull request head");
    }
    const bindingEntries = this.recursiveTree(bindingRevision).filter((entry) =>
      !EVIDENCE_BUNDLE_PATHS.includes(entryPath(entry) as (typeof EVIDENCE_BUNDLE_PATHS)[number]));
    const pullRequestEntries = this.recursiveTree(pullRequestHead).filter((entry) =>
      !EVIDENCE_BUNDLE_PATHS.includes(entryPath(entry) as (typeof EVIDENCE_BUNDLE_PATHS)[number]));
    if (bindingEntries.length !== pullRequestEntries.length ||
      bindingEntries.some((entry, index) => entry !== pullRequestEntries[index])) {
      throw new EvidenceRebindError(
        "REBIND_BINDING_PR_TREE_MISMATCH",
        "binding revision and final pull request head differ outside the three derived evidence files",
      );
    }
    this.assertProvenPathsIdentical(pullRequestHead, eventRevision);
    return { pullRequestNumber: candidate.number, pullRequestHead };
  }

  // The squash landing carries whatever main advanced by, so demanding equal root trees would
  // wedge every reconcile that races a merge. What the identity proof actually needs is that the
  // landing did not alter what the evidence attests: the gate's own implementation and the three
  // derived evidence files. Everything else is base advance and is allowed to differ.
  private assertProvenPathsIdentical(pullRequestHead: string, eventRevision: string): void {
    const diff = this.run([
      "git",
      "diff",
      "--name-only",
      "-z",
      pullRequestHead,
      eventRevision,
      "--",
      ...EVIDENCE_FRESHNESS_PATHSPECS,
      ...EVIDENCE_BUNDLE_PATHS,
    ]);
    if (diff.status !== 0) {
      throw new EvidenceRebindError(
        "REBIND_GIT_TREE_INVALID",
        `cannot compare proven evidence paths: ${commandDetail(diff)}`,
      );
    }
    const changed = diff.stdout.split("\0").filter(Boolean).sort();
    if (changed.length > 0) {
      throw new EvidenceRebindError(
        "REBIND_PR_LANDING_TREE_MISMATCH",
        `final pull request head and landing commit differ on proven evidence paths: ${changed.join(", ")}`,
      );
    }
  }

  private recursiveTree(revision: string): string[] {
    const result = this.run(["git", "ls-tree", "-r", "-z", "--full-tree", revision]);
    if (result.status !== 0) throw new EvidenceRebindError("REBIND_GIT_TREE_INVALID", `cannot read ${revision} tree: ${commandDetail(result)}`);
    return parseTree(result.stdout, revision);
  }

  assertOnlyExpectedChanges(expectedPaths: readonly string[]): void {
    const status = this.run(["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"]);
    if (status.status !== 0) {
      throw new EvidenceRebindError("REBIND_GIT_FAILED", `cannot inspect worktree changes: ${commandDetail(status)}`);
    }
    const entries = status.stdout.split("\0").filter(Boolean);
    const paths = entries.map((entry) => {
      if (!/^ M /.test(entry)) {
        throw new EvidenceRebindError("REBIND_UNEXPECTED_CHANGE", `unsupported worktree change: ${entry}`);
      }
      return entry.slice(3);
    }).sort();
    const expected = [...expectedPaths].sort();
    if (JSON.stringify(paths) !== JSON.stringify(expected)) {
      throw new EvidenceRebindError("REBIND_UNEXPECTED_CHANGE", "working tree changes do not match the operation allowlist");
    }
  }

  // The gate requires its trusted base to be a STRICT ancestor of HEAD (assertStrictAncestorOfHead
  // in tests/no-silent-drop/bootstrap.ts) so that an identical base cannot hide event deletions.
  // Reconcile runs with HEAD at the landing commit, so the base has to be the commit before it —
  // the first parent, which for a squash landing on main is the push event's before-SHA. Take the
  // SHA from git's own output rather than handing the gate a `^` suffix to interpret.
  private landingParentRevision(eventRevision: string): string {
    const result = this.run(["git", "rev-parse", `${eventRevision}^`]);
    const parent = result.stdout.trim();
    if (result.status !== 0 || !fullSha(parent)) {
      throw new EvidenceRebindError(
        "REBIND_FOCUSED_VALIDATION_FAILED",
        `cannot resolve the first parent of ${eventRevision}: ${result.status === 0 ? parent : commandDetail(result)}`,
      );
    }
    return parent;
  }

  runFocusedValidation(eventRevision: string): void {
    const baseRevision = this.landingParentRevision(eventRevision);
    const result = this.run([
      "bun",
      "test",
      "--timeout=120000",
      "tests/integration/t413-no-silent-drop-ci-adoption.test.ts",
    ]);
    if (result.status !== 0) {
      throw new EvidenceRebindError("REBIND_FOCUSED_VALIDATION_FAILED", `t413 failed: ${commandDetail(result)}`);
    }
    const gate = this.run([
      "bun",
      "tests/no-silent-drop-gate.ts",
      "check",
      "--base-revision",
      baseRevision,
    ]);
    if (gate.status !== 0) {
      throw new EvidenceRebindError("REBIND_FOCUSED_VALIDATION_FAILED", `no-silent-drop failed: ${commandDetail(gate)}`);
    }
  }

  commitReconcileChanges(paths: readonly string[]): string {
    this.mustRun(["git", "add", "--", ...paths], "REBIND_COMMIT_FAILED");
    const staged = this.mustRun(["git", "diff", "--cached", "--name-only", "-z"], "REBIND_COMMIT_FAILED")
      .split("\0")
      .filter(Boolean)
      .sort();
    if (JSON.stringify(staged) !== JSON.stringify([...paths].sort())) {
      throw new EvidenceRebindError("REBIND_UNEXPECTED_CHANGE", "staged changes do not match the reconcile allowlist");
    }
    this.mustRun(
      ["git", "commit", "-m", "fix(no-silent-drop): rebind adoption evidence"],
      "REBIND_COMMIT_FAILED",
    );
    return this.headRevision();
  }

  rollbackReconcileCommit(eventRevision: string): void {
    this.assertClean();
    const head = this.headRevision();
    const ancestry = this.mustRun(
      ["git", "rev-list", "--parents", "-n", "1", head],
      "REBIND_ROLLBACK_FAILED",
    ).split(/\s+/);
    if (ancestry.length !== 2 || ancestry[0] !== head || ancestry[1] !== eventRevision) {
      throw new EvidenceRebindError(
        "REBIND_ROLLBACK_FAILED",
        "reconcile commit is not a direct child of the event revision",
      );
    }
    this.mustRun(["git", "reset", "--hard", eventRevision], "REBIND_ROLLBACK_FAILED");
    if (this.headRevision() !== eventRevision) {
      throw new EvidenceRebindError("REBIND_ROLLBACK_FAILED", "reconcile commit rollback did not restore event HEAD");
    }
    this.assertClean();
  }

  clearReconcileIndex(paths: readonly string[]): void {
    const result = this.run(["git", "restore", "--staged", "--", ...paths]);
    if (result.status !== 0) {
      throw new EvidenceRebindError(
        "REBIND_ROLLBACK_FAILED",
        `cannot restore evidence index: ${commandDetail(result)}`,
      );
    }
  }

  remoteMainTip(): string {
    const output = this.mustRun(
      ["git", "ls-remote", "--heads", "origin", "refs/heads/main"],
      "REBIND_REMOTE_TIP_FAILED",
    );
    const fields = output.split(/\s+/);
    if (fields.length !== 2 || !fullSha(fields[0]) || fields[1] !== "refs/heads/main") {
      throw new EvidenceRebindError("REBIND_REMOTE_TIP_FAILED", "origin/main did not resolve to exactly one full SHA");
    }
    return fields[0];
  }

  pushFastForward(expectedRemoteTip: string): "pushed" | "superseded" {
    let result: CommandResult;
    try {
      result = this.run(["git", "push", "origin", "HEAD:refs/heads/main"]);
    } catch (error) {
      throw new EvidenceRebindError(
        "REBIND_PUSH_OUTCOME_UNKNOWN",
        `push outcome could not be observed; reconcile commit retained; verify origin/main before retrying from the event revision: ${String(error)}`,
      );
    }
    if (result.status !== 0) {
      let remoteTip: string;
      try {
        remoteTip = this.remoteMainTip();
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new EvidenceRebindError(
          "REBIND_PUSH_OUTCOME_UNKNOWN",
          `push failed and remote state could not be confirmed; reconcile commit retained; verify origin/main before retrying from the event revision: ${detail}`,
        );
      }
      if (remoteTip !== expectedRemoteTip) return "superseded";
      throw new EvidenceRebindError("REBIND_PUSH_FAILED", `fast-forward push failed: ${commandDetail(result)}`);
    }
    return "pushed";
  }
}
