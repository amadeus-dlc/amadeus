// Pure seams for the release-land path (#2888).
//
// After the main ruleset required merge queue and dropped the GitHub App
// bypass, release-it can no longer push a bump commit to main. The bump
// lands through a bot PR + `gh pr merge --auto`; the tag is applied to the
// squash commit, not the pre-merge branch tip.

export const RELEASE_BRANCH_PREFIX = "release/v";
export const RELEASE_PR_MARKER = "<!-- amadeus:release-bump:v1 -->";

export type ReleaseBump = "patch" | "minor" | "major";

export type ReleasePrObservation = {
  readonly state: "OPEN" | "MERGED" | "CLOSED";
  readonly url: string;
  readonly mergeCommitSha: string | null;
  readonly failedRequiredChecks: readonly string[];
};

export type ReleaseLandWaitVerdict = "ready" | "pending" | "failed" | "timeout";

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

export function releaseBranchName(version: string): string {
  return `${RELEASE_BRANCH_PREFIX}${version}`;
}

export function releaseTagName(version: string): string {
  return `v${version}`;
}

export function replaceSetupPackageVersion(raw: string, next: string): string {
  const accept = /"version":\s*"[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?"/;
  if (!accept.test(raw)) throw new Error("packages/setup/package.json has no version field");
  return raw.replace(accept, `"version": "${next}"`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFailedConclusion(conclusion: string | null): boolean {
  return (
    conclusion === "FAILURE" ||
    conclusion === "CANCELLED" ||
    conclusion === "TIMED_OUT" ||
    conclusion === "ACTION_REQUIRED" ||
    conclusion === "STARTUP_FAILURE"
  );
}

export function parseReleasePrView(value: unknown, source: string): ReleasePrObservation {
  if (!isRecord(value)) throw new Error(`${source} is not an object`);
  const state = value.state;
  if (state !== "OPEN" && state !== "MERGED" && state !== "CLOSED") {
    throw new Error(`${source} has an invalid state`);
  }
  const url = value.url;
  if (typeof url !== "string" || url.length === 0) throw new Error(`${source} is missing url`);
  let mergeCommitSha: string | null = null;
  if (value.mergeCommit !== null && value.mergeCommit !== undefined) {
    if (!isRecord(value.mergeCommit) || typeof value.mergeCommit.oid !== "string") {
      throw new Error(`${source} has an invalid mergeCommit`);
    }
    if (!isFullSha(value.mergeCommit.oid)) throw new Error(`${source} mergeCommit.oid is not a full SHA`);
    mergeCommitSha = value.mergeCommit.oid;
  }
  const failedRequiredChecks: string[] = [];
  const rollup = value.statusCheckRollup;
  if (rollup !== undefined && rollup !== null) {
    if (!Array.isArray(rollup)) throw new Error(`${source} statusCheckRollup is not an array`);
    for (const item of rollup) {
      if (!isRecord(item)) continue;
      if (item.name !== "CI Success") continue;
      const conclusion = typeof item.conclusion === "string" ? item.conclusion : null;
      if (isFailedConclusion(conclusion)) failedRequiredChecks.push("CI Success");
    }
  }
  return { state, url, mergeCommitSha, failedRequiredChecks };
}

export function classifyReleaseLandWait(input: {
  readonly observation: ReleasePrObservation;
  readonly nowMs: number;
  readonly deadlineMs: number;
}): ReleaseLandWaitVerdict {
  if (input.observation.state === "MERGED") {
    return input.observation.mergeCommitSha !== null ? "ready" : "failed";
  }
  if (input.observation.state === "CLOSED") return "failed";
  if (input.observation.failedRequiredChecks.length > 0) return "failed";
  if (input.nowMs >= input.deadlineMs) return "timeout";
  return "pending";
}

export type ReleaseLandArgs = {
  readonly bump: ReleaseBump;
  readonly bootstrap: boolean;
  readonly dryRun: boolean;
  readonly deadlineMs: number;
  readonly pollIntervalMs: number;
};

export type ReleaseLandResult = {
  readonly version: string;
  readonly sha: string;
  readonly pullRequestUrl: string | null;
  readonly dryRun: boolean;
};

export type ReleaseLandPort = {
  currentSetupVersion(): string;
  currentHeadSha(): string;
  tagExists(tag: string): boolean;
  checkoutReleaseBranch(branch: string): void;
  writeSetupVersion(version: string): void;
  syncVersionSurfaces(version: string): void;
  createBumpCommit(version: string): void;
  pushReleaseBranch(branch: string): void;
  findOpenReleasePr(branch: string): string | null;
  createReleasePr(branch: string, version: string): string;
  enableAutoMerge(url: string): void;
  observePr(url: string): ReleasePrObservation;
  createAndPushTag(version: string, sha: string): void;
  nowMs(): number;
  sleep(milliseconds: number): Promise<void>;
};

export async function runReleaseLand(port: ReleaseLandPort, args: ReleaseLandArgs): Promise<ReleaseLandResult> {
  const current = port.currentSetupVersion();
  const version = args.bootstrap ? current : incrementReleaseVersion(current, args.bump);
  if (args.dryRun) {
    return { version, sha: port.currentHeadSha(), pullRequestUrl: null, dryRun: true };
  }
  if (port.tagExists(releaseTagName(version))) {
    throw new Error(`tag ${releaseTagName(version)} already exists`);
  }
  if (args.bootstrap) {
    const sha = port.currentHeadSha();
    port.createAndPushTag(version, sha);
    return { version, sha, pullRequestUrl: null, dryRun: false };
  }

  const branch = releaseBranchName(version);
  let pullRequestUrl = port.findOpenReleasePr(branch);
  if (pullRequestUrl === null) {
    port.checkoutReleaseBranch(branch);
    port.writeSetupVersion(version);
    port.syncVersionSurfaces(version);
    port.createBumpCommit(version);
    port.pushReleaseBranch(branch);
    pullRequestUrl = port.findOpenReleasePr(branch) ?? port.createReleasePr(branch, version);
  }
  port.enableAutoMerge(pullRequestUrl);

  while (true) {
    const observation = port.observePr(pullRequestUrl);
    const verdict = classifyReleaseLandWait({
      observation,
      nowMs: port.nowMs(),
      deadlineMs: args.deadlineMs,
    });
    if (verdict === "ready") {
      const sha = observation.mergeCommitSha;
      if (sha === null) throw new Error(`merged ${pullRequestUrl} has no merge commit SHA`);
      port.createAndPushTag(version, sha);
      return { version, sha, pullRequestUrl, dryRun: false };
    }
    if (verdict === "failed") {
      const checks =
        observation.failedRequiredChecks.length > 0
          ? `: ${observation.failedRequiredChecks.join(", ")}`
          : "";
      throw new Error(`release PR ${pullRequestUrl} did not land (${observation.state}${checks})`);
    }
    if (verdict === "timeout") {
      throw new Error(`timed out waiting for release PR ${pullRequestUrl} to land`);
    }
    await port.sleep(args.pollIntervalMs);
  }
}
