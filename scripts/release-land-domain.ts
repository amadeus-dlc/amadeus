// Pure seams for the release-land path (#2888).
//
// After the main ruleset required merge queue and dropped the GitHub App
// bypass, a bump cannot be pushed to main. The lander opens a bot PR,
// lands it with `gh pr merge --auto`, and tags the squash commit.

export const RELEASE_PR_MARKER = "<!-- amadeus:release-bump:v1 -->";

export type ReleaseBump = "patch" | "minor" | "major";

export type ReleaseLandMode =
  | { readonly kind: "dry-run"; readonly bump: ReleaseBump }
  | { readonly kind: "bootstrap" }
  | { readonly kind: "land"; readonly bump: ReleaseBump };

export type ReleasePrObservation = {
  readonly state: "OPEN" | "MERGED" | "CLOSED";
  readonly url: string;
  readonly mergeCommitSha: string | null;
  readonly ciSuccessFailed: boolean;
};

export type ReleaseLandWaitVerdict =
  | { readonly kind: "ready"; readonly sha: string }
  | { readonly kind: "pending" }
  | { readonly kind: "failed" }
  | { readonly kind: "timeout" };

export type ReleaseLandArgs = {
  readonly mode: ReleaseLandMode;
  readonly deadlineMs: number;
  readonly pollIntervalMs: number;
};

export type ReleaseLandResult = {
  readonly version: string;
  readonly sha: string;
  readonly pullRequestUrl: string | null;
};

export type ReleaseLandPort = {
  currentSetupVersion(): string;
  currentHeadSha(): string;
  tagExists(tag: string): boolean;
  queueReleasePullRequest(version: string): string;
  observePr(url: string): ReleasePrObservation;
  createAndPushTag(version: string, sha: string): void;
  nowMs(): number;
  sleep(milliseconds: number): Promise<void>;
};

export function isFullSha(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

export function incrementReleaseVersion(version: string, bump: ReleaseBump): string {
  const match = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/.exec(version);
  if (!match) throw new Error(`unsupported version for increment: ${version}`);
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

export function plannedReleaseVersion(current: string, mode: ReleaseLandMode): string {
  return mode.kind === "bootstrap" ? current : incrementReleaseVersion(current, mode.bump);
}

export function releaseBranchName(version: string): string {
  return `release/v${version}`;
}

export function releaseTagName(version: string): string {
  return `v${version}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(label);
  return value;
}

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(label);
  return value;
}

function mergeCommitShaOf(value: unknown, source: string): string | null {
  if (value === null || value === undefined) return null;
  const oid = requireNonEmptyString(requireRecord(value, `${source} has an invalid mergeCommit`).oid, `${source} has an invalid mergeCommit`);
  if (!isFullSha(oid)) throw new Error(`${source} mergeCommit.oid is not a full SHA`);
  return oid;
}

function ciSuccessFailedIn(rollup: unknown, source: string): boolean {
  if (rollup === undefined || rollup === null) return false;
  if (!Array.isArray(rollup)) throw new Error(`${source} statusCheckRollup is not an array`);
  return rollup.some((item) => {
    if (!isRecord(item) || item.name !== "CI Success") return false;
    return (
      item.conclusion === "FAILURE" ||
      item.conclusion === "CANCELLED" ||
      item.conclusion === "TIMED_OUT" ||
      item.conclusion === "ACTION_REQUIRED" ||
      item.conclusion === "STARTUP_FAILURE"
    );
  });
}

export function parseReleasePrView(value: unknown, source: string): ReleasePrObservation {
  const record = requireRecord(value, `${source} is not an object`);
  const state = record.state;
  if (state !== "OPEN" && state !== "MERGED" && state !== "CLOSED") {
    throw new Error(`${source} has an invalid state`);
  }
  return {
    state,
    url: requireNonEmptyString(record.url, `${source} is missing url`),
    mergeCommitSha: mergeCommitShaOf(record.mergeCommit, source),
    ciSuccessFailed: ciSuccessFailedIn(record.statusCheckRollup, source),
  };
}

export function parseOpenReleasePrUrl(
  value: unknown,
  input: { readonly branch: string; readonly botLogin: string },
): string | null {
  if (!Array.isArray(value)) throw new Error("gh pr list did not return an array");
  if (value.length === 0) return null;
  if (value.length !== 1) {
    throw new Error(`expected 0 or 1 open release PRs for ${input.branch}, found ${value.length}`);
  }
  const record = requireRecord(value[0], "gh pr list row is invalid");
  const author = isRecord(record.author) ? record.author.login : undefined;
  const login = typeof author === "string" ? author : "";
  if (login !== input.botLogin) {
    throw new Error(`open PR for ${input.branch} is owned by ${login || "unknown"}, not ${input.botLogin}`);
  }
  return requireNonEmptyString(record.url, "gh pr list row is missing url");
}

export function classifyReleaseLandWait(input: {
  readonly observation: ReleasePrObservation;
  readonly nowMs: number;
  readonly deadlineMs: number;
}): ReleaseLandWaitVerdict {
  if (input.observation.state === "MERGED") {
    return input.observation.mergeCommitSha !== null
      ? { kind: "ready", sha: input.observation.mergeCommitSha }
      : { kind: "failed" };
  }
  if (input.observation.state === "CLOSED" || input.observation.ciSuccessFailed) return { kind: "failed" };
  return input.nowMs >= input.deadlineMs ? { kind: "timeout" } : { kind: "pending" };
}

export async function runReleaseLand(port: ReleaseLandPort, args: ReleaseLandArgs): Promise<ReleaseLandResult> {
  const version = plannedReleaseVersion(port.currentSetupVersion(), args.mode);
  if (args.mode.kind === "dry-run") {
    return { version, sha: port.currentHeadSha(), pullRequestUrl: null };
  }
  if (port.tagExists(releaseTagName(version))) {
    throw new Error(`tag ${releaseTagName(version)} already exists`);
  }
  if (args.mode.kind === "bootstrap") {
    const sha = port.currentHeadSha();
    port.createAndPushTag(version, sha);
    return { version, sha, pullRequestUrl: null };
  }

  const pullRequestUrl = port.queueReleasePullRequest(version);
  while (true) {
    const observation = port.observePr(pullRequestUrl);
    const verdict = classifyReleaseLandWait({
      observation,
      nowMs: port.nowMs(),
      deadlineMs: args.deadlineMs,
    });
    if (verdict.kind === "ready") {
      port.createAndPushTag(version, verdict.sha);
      return { version, sha: verdict.sha, pullRequestUrl };
    }
    if (verdict.kind === "failed") {
      throw new Error(
        `release PR ${pullRequestUrl} did not land (${observation.state}${observation.ciSuccessFailed ? ": CI Success" : ""})`,
      );
    }
    if (verdict.kind === "timeout") {
      throw new Error(`timed out waiting for release PR ${pullRequestUrl} to land`);
    }
    await port.sleep(args.pollIntervalMs);
  }
}
