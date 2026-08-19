// The 2026-08-19 release run failed with GH013: main now requires a pull
// request, merge queue, and CI Success, and the ruleset has no bypass
// actors (#2888 rollout). The lander must increment, open a bot PR, call
// `gh pr merge --auto` with no strategy/delete flags, and tag the squash
// commit — never `git push` to main.

import { describe, expect, test } from "bun:test";
import {
  classifyReleaseLandWait,
  incrementReleaseVersion,
  parseReleasePrView,
  releaseBranchName,
  releaseTagName,
  replaceSetupPackageVersion,
  runReleaseLand,
  type ReleaseLandPort,
  type ReleasePrObservation,
} from "../../scripts/release-land-domain.ts";
import {
  type CommandRunner,
  parseReleaseLandArgs,
  ReleaseLandCliPort,
} from "../../scripts/release-land.ts";

const PR_URL = "https://example.test/pull/42";
const MERGE_SHA = "b".repeat(40);
const HEAD_SHA = "a".repeat(40);

function observation(overrides: Partial<ReleasePrObservation> = {}): ReleasePrObservation {
  return {
    state: "OPEN",
    url: PR_URL,
    mergeCommitSha: null,
    failedRequiredChecks: [],
    ...overrides,
  };
}

function fakePort(overrides: Partial<ReleaseLandPort> = {}): {
  port: ReleaseLandPort;
  calls: string[];
} {
  const calls: string[] = [];
  const port: ReleaseLandPort = {
    currentSetupVersion: () => "0.1.7",
    currentHeadSha: () => HEAD_SHA,
    tagExists: () => false,
    checkoutReleaseBranch: (branch) => {
      calls.push(`checkout:${branch}`);
    },
    writeSetupVersion: (version) => {
      calls.push(`write:${version}`);
    },
    syncVersionSurfaces: (version) => {
      calls.push(`sync:${version}`);
    },
    createBumpCommit: (version) => {
      calls.push(`commit:${version}`);
    },
    pushReleaseBranch: (branch) => {
      calls.push(`push:${branch}`);
    },
    findOpenReleasePr: () => null,
    createReleasePr: (branch, version) => {
      calls.push(`pr:${branch}:${version}`);
      return PR_URL;
    },
    enableAutoMerge: (url) => {
      calls.push(`auto-merge:${url}`);
    },
    observePr: () => observation({ state: "MERGED", mergeCommitSha: MERGE_SHA }),
    createAndPushTag: (version, sha) => {
      calls.push(`tag:v${version}:${sha}`);
    },
    nowMs: () => 0,
    sleep: async () => {
      calls.push("sleep");
    },
    ...overrides,
  };
  return { port, calls };
}

describe("release-land version increment", () => {
  test("patch/minor/major advance a stable X.Y.Z version", () => {
    expect(incrementReleaseVersion("0.1.7", "patch")).toBe("0.1.8");
    expect(incrementReleaseVersion("0.1.7", "minor")).toBe("0.2.0");
    expect(incrementReleaseVersion("0.1.7", "major")).toBe("1.0.0");
  });

  test("refuses a prerelease so dispatch cannot invent a next number", () => {
    expect(() => incrementReleaseVersion("0.1.7-rc.1", "patch")).toThrow("unsupported version");
  });

  test("names the release branch and tag from the bumped version", () => {
    expect(releaseBranchName("0.1.8")).toBe("release/v0.1.8");
    expect(releaseTagName("0.1.8")).toBe("v0.1.8");
  });

  test("replaces only the setup package version field", () => {
    const raw = `{\n  "name": "@amadeus-dlc/setup",\n  "version": "0.1.7"\n}\n`;
    expect(replaceSetupPackageVersion(raw, "0.1.8")).toBe(
      `{\n  "name": "@amadeus-dlc/setup",\n  "version": "0.1.8"\n}\n`,
    );
  });
});

describe("release-land PR observation", () => {
  test("reads a merged squash commit and ignores non-required check failures", () => {
    const parsed = parseReleasePrView(
      {
        state: "MERGED",
        url: PR_URL,
        mergeCommit: { oid: MERGE_SHA },
        statusCheckRollup: [
          { name: "CI Success", conclusion: "SUCCESS" },
          { name: "CodeRabbit", conclusion: "FAILURE" },
        ],
      },
      "gh pr view",
    );
    expect(parsed).toEqual({
      state: "MERGED",
      url: PR_URL,
      mergeCommitSha: MERGE_SHA,
      failedRequiredChecks: [],
    });
  });

  test("treats a failed CI Success check as a required failure", () => {
    const parsed = parseReleasePrView(
      {
        state: "OPEN",
        url: PR_URL,
        mergeCommit: null,
        statusCheckRollup: [{ name: "CI Success", conclusion: "FAILURE" }],
      },
      "gh pr view",
    );
    expect(parsed.failedRequiredChecks).toEqual(["CI Success"]);
  });
});

describe("release-land wait classifier", () => {
  test("ready only after merge with a full SHA", () => {
    expect(
      classifyReleaseLandWait({
        observation: observation({ state: "MERGED", mergeCommitSha: MERGE_SHA }),
        nowMs: 10,
        deadlineMs: 5,
      }),
    ).toBe("ready");
  });

  test("failed when the PR closes without merging or CI Success fails", () => {
    expect(
      classifyReleaseLandWait({
        observation: observation({ state: "CLOSED" }),
        nowMs: 0,
        deadlineMs: 10,
      }),
    ).toBe("failed");
    expect(
      classifyReleaseLandWait({
        observation: observation({ failedRequiredChecks: ["CI Success"] }),
        nowMs: 0,
        deadlineMs: 10,
      }),
    ).toBe("failed");
  });

  test("timeout beats an still-open PR with no required failure", () => {
    expect(
      classifyReleaseLandWait({
        observation: observation(),
        nowMs: 10,
        deadlineMs: 10,
      }),
    ).toBe("timeout");
  });
});

describe("runReleaseLand", () => {
  test("dry-run increments without writing, pushing, or tagging", async () => {
    const { port, calls } = fakePort();
    const result = await runReleaseLand(port, {
      bump: "patch",
      bootstrap: false,
      dryRun: true,
      deadlineMs: 10,
      pollIntervalMs: 1,
    });
    expect(result).toEqual({ version: "0.1.8", sha: HEAD_SHA, pullRequestUrl: null, dryRun: true });
    expect(calls).toEqual([]);
  });

  test("bootstrap tags the current HEAD and does not open a PR", async () => {
    const { port, calls } = fakePort();
    const result = await runReleaseLand(port, {
      bump: "patch",
      bootstrap: true,
      dryRun: false,
      deadlineMs: 10,
      pollIntervalMs: 1,
    });
    expect(result).toEqual({ version: "0.1.7", sha: HEAD_SHA, pullRequestUrl: null, dryRun: false });
    expect(calls).toEqual([`tag:v0.1.7:${HEAD_SHA}`]);
  });

  test("reuses an already-open release PR instead of pushing a second bump", async () => {
    const { port, calls } = fakePort({
      findOpenReleasePr: () => PR_URL,
    });
    const result = await runReleaseLand(port, {
      bump: "patch",
      bootstrap: false,
      dryRun: false,
      deadlineMs: 10,
      pollIntervalMs: 1,
    });
    expect(result.pullRequestUrl).toBe(PR_URL);
    expect(calls).toEqual([`auto-merge:${PR_URL}`, `tag:v0.1.8:${MERGE_SHA}`]);
  });

  test("dispatch lands through a PR and tags the squash SHA, not HEAD", async () => {
    const { port, calls } = fakePort();
    const result = await runReleaseLand(port, {
      bump: "patch",
      bootstrap: false,
      dryRun: false,
      deadlineMs: 10,
      pollIntervalMs: 1,
    });
    expect(result).toEqual({ version: "0.1.8", sha: MERGE_SHA, pullRequestUrl: PR_URL, dryRun: false });
    expect(calls).toEqual([
      "checkout:release/v0.1.8",
      "write:0.1.8",
      "sync:0.1.8",
      "commit:0.1.8",
      "push:release/v0.1.8",
      "pr:release/v0.1.8:0.1.8",
      `auto-merge:${PR_URL}`,
      `tag:v0.1.8:${MERGE_SHA}`,
    ]);
  });

  test("refuses to wait past a failed CI Success check", async () => {
    const { port } = fakePort({
      observePr: () => observation({ failedRequiredChecks: ["CI Success"] }),
    });
    await expect(
      runReleaseLand(port, {
        bump: "patch",
        bootstrap: false,
        dryRun: false,
        deadlineMs: 10,
        pollIntervalMs: 1,
      }),
    ).rejects.toThrow("did not land");
  });
});

describe("release-land CLI merge-queue compatibility", () => {
  test("parses the workflow dispatch flags", () => {
    expect(
      parseReleaseLandArgs([
        "--repository",
        "amadeus-dlc/amadeus",
        "--bot-login",
        "amadeus-dlc-bot[bot]",
        "--bump",
        "patch",
      ]),
    ).toEqual({
      repository: "amadeus-dlc/amadeus",
      botLogin: "amadeus-dlc-bot[bot]",
      bump: "patch",
      bootstrap: false,
      dryRun: false,
      deadlineSeconds: 4800,
      pollSeconds: 15,
    });
  });

  test("enableAutoMerge issues no rejected merge-queue flags", () => {
    const commands: string[][] = [];
    const runner: CommandRunner = {
      run(command) {
        commands.push(command);
        return { stdout: "", stderr: "" };
      },
    };
    const port = new ReleaseLandCliPort({
      repoRoot: "/tmp/amadeus-release-land",
      repository: "amadeus-dlc/amadeus",
      botLogin: "amadeus-dlc-bot[bot]",
      runner,
    });

    port.enableAutoMerge(PR_URL);

    expect(commands).toEqual([["gh", "pr", "merge", "--auto", PR_URL]]);
    expect(commands[0]).not.toContain("--squash");
    expect(commands[0]).not.toContain("--delete-branch");
  });

  test("branch and tag pushes never target main", () => {
    const commands: string[][] = [];
    const runner: CommandRunner = {
      run(command) {
        commands.push(command);
        if (command[0] === "gh" && command[1] === "pr" && command[2] === "view") {
          return {
            stdout: JSON.stringify({
              state: "MERGED",
              url: PR_URL,
              mergeCommit: { oid: MERGE_SHA },
              statusCheckRollup: [],
            }),
            stderr: "",
          };
        }
        return { stdout: "", stderr: "" };
      },
    };
    const port = new ReleaseLandCliPort({
      repoRoot: "/tmp/amadeus-release-land",
      repository: "amadeus-dlc/amadeus",
      botLogin: "amadeus-dlc-bot[bot]",
      runner,
    });

    port.pushReleaseBranch("release/v0.1.8");
    port.createAndPushTag("0.1.8", MERGE_SHA);

    const pushed = commands.filter((command) => command[0] === "git" && command[1] === "push");
    expect(pushed).toEqual([
      ["git", "push", "--force-with-lease=refs/heads/release/v0.1.8:", "origin", "HEAD:refs/heads/release/v0.1.8"],
      ["git", "push", "origin", "v0.1.8"],
    ]);
    for (const command of pushed) {
      expect(command.includes("main")).toBe(false);
      expect(command.includes("HEAD:main")).toBe(false);
      expect(command.includes("HEAD:refs/heads/main")).toBe(false);
    }
  });
});
