// The 2026-08-19 release run failed with GH013: main now requires a pull
// request, merge queue, and CI Success, and the ruleset has no bypass
// actors (#2888 rollout). The lander must increment, open a bot PR, call
// `gh pr merge --auto` with no strategy/delete flags, and tag the squash
// commit — never `git push` to main.

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  classifyReleaseLandWait,
  incrementReleaseVersion,
  parseOpenReleasePrUrl,
  parseReleasePrView,
  plannedReleaseVersion,
  releaseBranchName,
  releaseTagName,
  runReleaseLand,
  type ReleaseLandPort,
  type ReleasePrObservation,
} from "../../scripts/release-land-domain.ts";
import {
  type CommandRunner,
  parseReleaseLandArgs,
  ReleaseLandCliPort,
} from "../../scripts/release-land.ts";
import { SETUP_PACKAGE_REL, VERSION_SURFACES } from "../../scripts/release-version-sync-plan.ts";

const PR_URL = "https://example.test/pull/42";
const MERGE_SHA = "b".repeat(40);
const HEAD_SHA = "a".repeat(40);
const BOT_LOGIN = "amadeus-dlc-bot[bot]";

function observation(overrides: Partial<ReleasePrObservation> = {}): ReleasePrObservation {
  return {
    state: "OPEN",
    url: PR_URL,
    mergeCommitSha: null,
    ciSuccessFailed: false,
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
    queueReleasePullRequest: (version) => {
      calls.push(`queue:${version}`);
      return PR_URL;
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

function landArgs() {
  return {
    mode: { kind: "land" as const, bump: "patch" as const },
    deadlineMs: 10,
    pollIntervalMs: 1,
  };
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

  test("planned version stays current only in bootstrap mode", () => {
    expect(plannedReleaseVersion("0.1.7", { kind: "bootstrap" })).toBe("0.1.7");
    expect(plannedReleaseVersion("0.1.7", { kind: "dry-run", bump: "minor" })).toBe("0.2.0");
    expect(plannedReleaseVersion("0.1.7", { kind: "land", bump: "patch" })).toBe("0.1.8");
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
      ciSuccessFailed: false,
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
    expect(parsed.ciSuccessFailed).toBe(true);
  });

  test("accepts a single bot-owned open release PR", () => {
    expect(
      parseOpenReleasePrUrl([{ url: PR_URL, author: { login: BOT_LOGIN } }], {
        branch: "release/v0.1.8",
        botLogin: BOT_LOGIN,
      }),
    ).toBe(PR_URL);
  });

  test("refuses an open release PR owned by someone else", () => {
    expect(() =>
      parseOpenReleasePrUrl([{ url: PR_URL, author: { login: "other" } }], {
        branch: "release/v0.1.8",
        botLogin: BOT_LOGIN,
      }),
    ).toThrow("not amadeus-dlc-bot[bot]");
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
    ).toEqual({ kind: "ready", sha: MERGE_SHA });
  });

  test("failed when the PR closes without merging or CI Success fails", () => {
    expect(
      classifyReleaseLandWait({
        observation: observation({ state: "CLOSED" }),
        nowMs: 0,
        deadlineMs: 10,
      }),
    ).toEqual({ kind: "failed" });
    expect(
      classifyReleaseLandWait({
        observation: observation({ ciSuccessFailed: true }),
        nowMs: 0,
        deadlineMs: 10,
      }),
    ).toEqual({ kind: "failed" });
  });

  test("timeout beats an still-open PR with no required failure", () => {
    expect(
      classifyReleaseLandWait({
        observation: observation(),
        nowMs: 10,
        deadlineMs: 10,
      }),
    ).toEqual({ kind: "timeout" });
  });
});

describe("runReleaseLand", () => {
  test("dry-run increments without writing, pushing, or tagging", async () => {
    const { port, calls } = fakePort();
    const result = await runReleaseLand(port, {
      mode: { kind: "dry-run", bump: "patch" },
      deadlineMs: 10,
      pollIntervalMs: 1,
    });
    expect(result).toEqual({ version: "0.1.8", sha: HEAD_SHA, pullRequestUrl: null });
    expect(calls).toEqual([]);
  });

  test("bootstrap tags the current HEAD and does not open a PR", async () => {
    const { port, calls } = fakePort();
    const result = await runReleaseLand(port, {
      mode: { kind: "bootstrap" },
      deadlineMs: 10,
      pollIntervalMs: 1,
    });
    expect(result).toEqual({ version: "0.1.7", sha: HEAD_SHA, pullRequestUrl: null });
    expect(calls).toEqual([`tag:v0.1.7:${HEAD_SHA}`]);
  });

  test("dispatch lands through a PR and tags the squash SHA, not HEAD", async () => {
    const { port, calls } = fakePort();
    const result = await runReleaseLand(port, landArgs());
    expect(result).toEqual({ version: "0.1.8", sha: MERGE_SHA, pullRequestUrl: PR_URL });
    expect(calls).toEqual([`queue:0.1.8`, `tag:v0.1.8:${MERGE_SHA}`]);
  });

  test("refuses to wait past a failed CI Success check", async () => {
    const { port } = fakePort({
      observePr: () => observation({ ciSuccessFailed: true }),
    });
    await expect(runReleaseLand(port, landArgs())).rejects.toThrow("did not land");
  });
});

describe("release-land CLI merge-queue compatibility", () => {
  test("parses the workflow dispatch flags", () => {
    expect(
      parseReleaseLandArgs([
        "--repository",
        "amadeus-dlc/amadeus",
        "--bot-login",
        BOT_LOGIN,
        "--bump",
        "patch",
      ]),
    ).toEqual({
      repository: "amadeus-dlc/amadeus",
      botLogin: BOT_LOGIN,
      mode: { kind: "land", bump: "patch" },
      deadlineSeconds: 4800,
      pollSeconds: 15,
    });
  });

  test("queueReleasePullRequest reuses an open bot PR and issues no rejected merge-queue flags", () => {
    const commands: string[][] = [];
    const runner: CommandRunner = {
      run(command) {
        commands.push(command);
        if (command[0] === "gh" && command[1] === "pr" && command[2] === "list") {
          return {
            stdout: JSON.stringify([{ url: PR_URL, author: { login: BOT_LOGIN } }]),
            stderr: "",
          };
        }
        return { stdout: "", stderr: "" };
      },
    };
    const port = new ReleaseLandCliPort({
      repoRoot: "/tmp/amadeus-release-land",
      repository: "amadeus-dlc/amadeus",
      botLogin: BOT_LOGIN,
      runner,
    });

    expect(port.queueReleasePullRequest("0.1.8")).toBe(PR_URL);
    expect(commands).toEqual([
      [
        "gh",
        "pr",
        "list",
        "--repo",
        "amadeus-dlc/amadeus",
        "--base",
        "main",
        "--head",
        "release/v0.1.8",
        "--state",
        "open",
        "--json",
        "url,author",
      ],
      ["gh", "pr", "merge", "--auto", PR_URL],
    ]);
    expect(commands[1]).not.toContain("--squash");
    expect(commands[1]).not.toContain("--delete-branch");
  });

  test("branch and tag pushes never target main", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "amadeus-release-land-"));
    mkdirSync(join(repoRoot, "packages/setup"), { recursive: true });
    writeFileSync(join(repoRoot, SETUP_PACKAGE_REL), `{\n  "name": "@amadeus-dlc/setup",\n  "version": "0.1.7"\n}\n`);

    const commands: string[][] = [];
    const runner: CommandRunner = {
      run(command) {
        commands.push(command);
        if (command[0] === "gh" && command[1] === "pr" && command[2] === "list") {
          return { stdout: "[]", stderr: "" };
        }
        if (command[0] === "gh" && command[1] === "pr" && command[2] === "create") {
          return { stdout: PR_URL, stderr: "" };
        }
        return { stdout: "", stderr: "" };
      },
    };
    const port = new ReleaseLandCliPort({
      repoRoot,
      repository: "amadeus-dlc/amadeus",
      botLogin: BOT_LOGIN,
      runner,
    });

    expect(port.queueReleasePullRequest("0.1.8")).toBe(PR_URL);
    port.createAndPushTag("0.1.8", MERGE_SHA);

    const added = commands.find((command) => command[0] === "git" && command[1] === "add");
    expect(added).toEqual(["git", "add", "--", ...VERSION_SURFACES.map((surface) => surface.relPath)]);

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
