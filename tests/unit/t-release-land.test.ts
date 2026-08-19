// The 2026-08-19 release run failed with GH013: main now requires a pull
// request, merge queue, and CI Success, and the ruleset has no bypass
// actors (#2888 rollout). The lander must increment, open a bot PR, call
// `gh pr merge --auto` with no strategy/delete flags, and tag the squash
// commit — never `git push` to main.

import { describe, expect, test } from "bun:test";
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
  setupPackageVersionOf,
  type ReleaseLandPort,
  type ReleasePrObservation,
} from "../../scripts/release-land-domain.ts";
import {
  type CommandRunner,
  parseReleaseLandArgs,
  ReleaseLandCliPort,
  releaseLandMain,
  systemCommandRunner,
} from "../../scripts/release-land.ts";
import { VERSION_SURFACES } from "../../scripts/release-version-sync-plan.ts";

const REPO_ROOT = join(import.meta.dir, "../..");

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

  test("reads the setup package version without a JSON.parse cast", () => {
    expect(setupPackageVersionOf({ version: "0.1.7" })).toBe("0.1.7");
    expect(() => setupPackageVersionOf([])).toThrow("is not an object");
    expect(() => setupPackageVersionOf({ version: 1 })).toThrow("is missing version");
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

  test("refuses an invalid PR state and more than one open release PR", () => {
    expect(() => parseReleasePrView({ state: "DRAFT", url: PR_URL }, "gh pr view")).toThrow(
      "invalid state",
    );
    expect(() =>
      parseOpenReleasePrUrl(
        [
          { url: PR_URL, author: { login: BOT_LOGIN } },
          { url: `${PR_URL}2`, author: { login: BOT_LOGIN } },
        ],
        { branch: "release/v0.1.8", botLogin: BOT_LOGIN },
      ),
    ).toThrow("expected 0 or 1 open release PRs");
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

  test("merged without a squash SHA is failed, not ready", () => {
    expect(
      classifyReleaseLandWait({
        observation: observation({ state: "MERGED", mergeCommitSha: null }),
        nowMs: 0,
        deadlineMs: 10,
      }),
    ).toEqual({ kind: "failed" });
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
    await expect(runReleaseLand(port, landArgs())).rejects.toThrow("did not land (OPEN: CI Success)");
  });

  test("refuses when the planned tag already exists", async () => {
    const { port } = fakePort({ tagExists: () => true });
    await expect(runReleaseLand(port, landArgs())).rejects.toThrow("already exists");
  });

  test("times out when the PR stays open past the deadline", async () => {
    const { port } = fakePort({
      observePr: () => observation(),
      nowMs: () => 10,
    });
    await expect(runReleaseLand(port, landArgs())).rejects.toThrow("timed out waiting for release PR");
  });

  test("sleeps once while the PR is still pending, then tags the squash SHA", async () => {
    let polls = 0;
    const { port, calls } = fakePort({
      observePr: () => {
        polls += 1;
        return polls === 1
          ? observation()
          : observation({ state: "MERGED", mergeCommitSha: MERGE_SHA });
      },
    });
    const result = await runReleaseLand(port, landArgs());
    expect(result).toEqual({ version: "0.1.8", sha: MERGE_SHA, pullRequestUrl: PR_URL });
    expect(calls).toEqual([`queue:0.1.8`, "sleep", `tag:v0.1.8:${MERGE_SHA}`]);
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

  test("parseOpenReleasePrUrl accepts every spelling of the same bot and refuses foreigners", () => {
    const row = (login: string) => [{ url: PR_URL, author: { login } }];
    const input = { branch: "release/v0.1.8", botLogin: BOT_LOGIN };
    // gh renders a GitHub App author as app/<slug>; the API says <slug>[bot].
    expect(parseOpenReleasePrUrl(row("app/amadeus-dlc-bot"), input)).toBe(PR_URL);
    expect(parseOpenReleasePrUrl(row("amadeus-dlc-bot[bot]"), input)).toBe(PR_URL);
    expect(parseOpenReleasePrUrl(row("amadeus-dlc-bot"), input)).toBe(PR_URL);
    expect(() => parseOpenReleasePrUrl(row("someone-else"), input)).toThrow("is owned by");
    expect(() => parseOpenReleasePrUrl(row(""), input)).toThrow("is owned by");
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
      repoRoot: "/tmp/amadeus-release-land",
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

  test("rejects a non-positive deadline or poll interval", () => {
    const required = ["--repository", "amadeus-dlc/amadeus", "--bot-login", BOT_LOGIN, "--bump", "patch"];
    expect(() => parseReleaseLandArgs([...required, "--deadline-seconds", "0"])).toThrow(
      "--deadline-seconds requires a positive integer",
    );
    expect(() => parseReleaseLandArgs([...required, "--poll-seconds", "x"])).toThrow(
      "--poll-seconds requires a positive integer",
    );
    expect(parseReleaseLandArgs([...required, "--deadline-seconds", "30", "--poll-seconds", "2"])).toMatchObject({
      deadlineSeconds: 30,
      pollSeconds: 2,
    });
  });

  test("reads the setup version, observes the PR, and reports tag presence", () => {
    const runner: CommandRunner = {
      run(command) {
        if (command[0] === "git" && command[1] === "rev-parse") return { stdout: HEAD_SHA, stderr: "" };
        if (command[0] === "git" && command[1] === "tag") return { stdout: "", stderr: "" };
        if (command[0] === "git" && command[1] === "ls-remote") {
          return { stdout: `${HEAD_SHA}\trefs/tags/v0.1.8`, stderr: "" };
        }
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
        throw new Error(`unexpected command: ${command.join(" ")}`);
      },
    };
    // A pinned committed fixture, NOT the live repo root: a release PR bumps
    // the real packages/setup/package.json to the next version, so a literal
    // expectation against the live tree goes red on exactly the PR this CLI
    // exists to land (measured: release/v0.1.8, run 32219696862).
    const port = new ReleaseLandCliPort({
      repoRoot: join(import.meta.dir, "..", "fixtures", "release-land-repo"),
      repository: "amadeus-dlc/amadeus",
      botLogin: BOT_LOGIN,
      runner,
    });
    expect(port.currentSetupVersion()).toBe("0.1.7");
    expect(port.currentHeadSha()).toBe(HEAD_SHA);
    expect(port.tagExists("v0.1.8")).toBe(true);
    expect(port.observePr(PR_URL)).toEqual({
      state: "MERGED",
      url: PR_URL,
      mergeCommitSha: MERGE_SHA,
      ciSuccessFailed: false,
    });
    expect(port.nowMs()).toBeGreaterThan(0);
  });

  test("treats a locally listed tag as present without asking the remote", () => {
    const commands: string[][] = [];
    const port = new ReleaseLandCliPort({
      repoRoot: REPO_ROOT,
      repository: "amadeus-dlc/amadeus",
      botLogin: BOT_LOGIN,
      runner: {
        run(command) {
          commands.push(command);
          return { stdout: "v0.1.8", stderr: "" };
        },
      },
    });
    expect(port.tagExists("v0.1.8")).toBe(true);
    expect(commands).toEqual([["git", "tag", "--list", "v0.1.8"]]);
  });

  test("rejects invalid JSON from gh pr view", () => {
    const port = new ReleaseLandCliPort({
      repoRoot: REPO_ROOT,
      repository: "amadeus-dlc/amadeus",
      botLogin: BOT_LOGIN,
      runner: { run: () => ({ stdout: "not-json", stderr: "" }) },
    });
    expect(() => port.observePr(PR_URL)).toThrow("gh pr view returned invalid JSON");
  });
});

describe("releaseLandMain", () => {
  const dispatchArgs = [
    "--repository",
    "amadeus-dlc/amadeus",
    "--bot-login",
    BOT_LOGIN,
    "--bump",
    "patch",
    "--dry-run",
  ];

  test("returns 2 when the dispatch flags are invalid", async () => {
    expect(await releaseLandMain([])).toBe(2);
  });

  test("dry-run writes GitHub outputs and returns 0", async () => {
    const previous = process.env.GITHUB_OUTPUT;
    const runner = {
      run(command: string[]) {
        if (command[0] === "git" && command[1] === "rev-parse") {
          return { stdout: HEAD_SHA, stderr: "" };
        }
        throw new Error(`unexpected command: ${command.join(" ")}`);
      },
    };
    try {
      process.env.GITHUB_OUTPUT = join(tmpdir(), `release-land-github-output-${Date.now()}`);
      expect(await releaseLandMain(dispatchArgs, { repoRoot: REPO_ROOT, runner })).toBe(0);
      process.env.GITHUB_OUTPUT = "";
      expect(await releaseLandMain(dispatchArgs, { repoRoot: REPO_ROOT, runner })).toBe(0);
      delete process.env.GITHUB_OUTPUT;
      expect(await releaseLandMain(dispatchArgs, { repoRoot: REPO_ROOT, runner })).toBe(0);
    } finally {
      if (previous === undefined) delete process.env.GITHUB_OUTPUT;
      else process.env.GITHUB_OUTPUT = previous;
    }
  });

  test("returns 1 when landing fails and skips empty GitHub output", async () => {
    const previous = process.env.GITHUB_OUTPUT;
    process.env.GITHUB_OUTPUT = "";
    try {
      expect(
        await releaseLandMain(
          ["--repository", "amadeus-dlc/amadeus", "--bot-login", BOT_LOGIN, "--bump", "patch"],
          {
            repoRoot: REPO_ROOT,
            runner: {
              run(command) {
                if (command[0] === "git" && command[1] === "tag") return { stdout: "v0.1.8", stderr: "" };
                throw new Error(`unexpected command: ${command.join(" ")}`);
              },
            },
          },
        ),
      ).toBe(1);
    } finally {
      if (previous === undefined) delete process.env.GITHUB_OUTPUT;
      else process.env.GITHUB_OUTPUT = previous;
    }
  });

  test("systemCommandRunner reports a failing process", () => {
    expect(systemCommandRunner.run(["git", "--version"]).stdout.length).toBeGreaterThan(0);
    expect(() =>
      systemCommandRunner.run(["git", "rev-parse", "--verify", "refs/does-not-exist-for-release-land"]),
    ).toThrow("git rev-parse");
  });

  test("sleep resolves without using a test-file timer", async () => {
    const port = new ReleaseLandCliPort({
      repoRoot: REPO_ROOT,
      repository: "amadeus-dlc/amadeus",
      botLogin: BOT_LOGIN,
      runner: { run: () => ({ stdout: "", stderr: "" }) },
    });
    await port.sleep(0);
  });
});
