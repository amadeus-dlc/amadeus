// covers: subcommand:amadeus-utility:issue-evidence
// size: medium
//
// t3181 — the `issue-evidence fetch` verb (#3181 C2): capture, write, and the
// loud-fail paths.
//
// The verb is what makes FR-EVD-1 mechanical rather than manual: the evidence
// lands in the record as a file a third party can open, so requirements.md's
// citations resolve to something. Two properties carry the weight:
//
//   * ALL issues or NONE (FR-EVD-1 / C2 "部分書込なし"). A batch that fails on
//     its second issue must leave no file and no half file — a partial capture
//     would read as a complete record of the cross-review.
//   * gh trouble is LOUD, never silent (FR-EVD-5). readiness, API and parse
//     failures exit non-zero with a redacted reason; the workflow continues on
//     the free-text fallback because the CONDUCTOR decides that, not the verb.
//
// The gateway is injected as a fake, so nothing here reaches GitHub. The last
// describe spawns the real CLI to pin the argv dispatch itself.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  cleanupTestProject,
  createTestProject,
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  resetAidlcEnv,
  seedStateFile,
} from "../harness/fixtures.ts";
import { amadeusToolTarget } from "../harness/cli-target.ts";
import { runIssueEvidenceFetch } from "../../packages/framework/core/tools/amadeus-utility.ts";
import { issueEvidencePath } from "../../packages/framework/core/tools/amadeus-lib.ts";
import type {
  EvidenceGitHubGateway,
  RemoteGitHubIssueComment,
} from "../../packages/framework/core/tools/amadeus-github-gateway.ts";
import type {
  GitHubGatewayOutcome,
  GitHubRepository,
  RemoteGitHubIssue,
} from "../../packages/framework/core/tools/amadeus-github-types.ts";

resetAidlcEnv();

const REPO: GitHubRepository = {
  owner: "amadeus-dlc",
  name: "amadeus",
  canonical: "amadeus-dlc/amadeus",
};
const SHA = "0b652d2cd1a6fbf2d5a905736d3a3eb887e9d810";

let project: string | undefined;
afterEach(() => {
  cleanupTestProject(project);
  project = undefined;
});

// A record dir only counts as an intent once it holds amadeus-state.md, and the
// verb resolves its write target from the ACTIVE intent — so the fixture needs
// the state file, not just the shell.
function seededProject(): string {
  const proj = createTestProject();
  seedStateFile(proj, "state-mid-ideation.md");
  return proj;
}

const failure = (
  classification: "not-installed" | "unauthenticated" | "api" | "invalid-response",
): GitHubGatewayOutcome<never> => ({
  kind: "failure",
  classification,
  summary: `GitHub unavailable (${classification}; no-effect-confirmed; exit=1; http=none)`,
  retryable: false,
  effect: "no-effect-confirmed",
});

function issue(number: number): RemoteGitHubIssue {
  return {
    repository: REPO,
    number,
    title: `issue ${number}`,
    body: `body of ${number}`,
    state: "OPEN",
  };
}

function reviewComment(number: number, reviewer: string): RemoteGitHubIssueComment {
  return {
    id: number * 10,
    body: `<!-- issue-cross-review\nreview-run-id: xrev-${number}\nreviewer-id: ${reviewer}\ntarget-sha: ${SHA}\n-->\n\nverdict body`,
    createdAt: "2026-08-17T10:00:00Z",
    authorLogin: "reviewer-bot",
    htmlUrl: `https://github.com/amadeus-dlc/amadeus/issues/${number}#issuecomment-${number * 10}`,
  };
}

type GatewayScript = Readonly<{
  readiness?: GitHubGatewayOutcome<void>;
  viewIssue?: (n: number) => GitHubGatewayOutcome<RemoteGitHubIssue>;
  listComments?: (n: number) => GitHubGatewayOutcome<readonly RemoteGitHubIssueComment[]>;
}>;

function fakeGateway(script: GatewayScript = {}): EvidenceGitHubGateway {
  return {
    readiness: () =>
      Promise.resolve(script.readiness ?? { kind: "ok", value: undefined }),
    viewIssue: (_repo, n) =>
      Promise.resolve(script.viewIssue?.(n) ?? { kind: "ok", value: issue(n) }),
    listComments: (_repo, n) =>
      Promise.resolve(
        script.listComments?.(n) ?? {
          kind: "ok",
          value: [reviewComment(n, "reviewer-1"), reviewComment(n, "reviewer-2")],
        },
      ),
  };
}

function fetchWith(
  proj: string,
  flags: Record<string, string>,
  script: GatewayScript = {},
): ReturnType<typeof runIssueEvidenceFetch> {
  return runIssueEvidenceFetch(proj, ["fetch"], flags, {
    gateway: fakeGateway(script),
    now: () => new Date("2026-08-18T01:02:03.456Z"),
    resolveRepository: () => REPO,
  });
}

function evidenceFile(proj: string): string {
  const path = issueEvidencePath(proj, DEFAULT_RECORD_DIR, DEFAULT_SPACE);
  if (path === null) throw new Error("fixture resolved no intent");
  return path;
}

describe("t3181 issue-evidence fetch — capture (FR-EVD-1)", () => {
  test("writes one artifact carrying every requested issue and its comments", async () => {
    project = seededProject();
    const outcome = await fetchWith(project, { issues: "3181,2415" });
    expect(outcome).toEqual({ kind: "ok", path: evidenceFile(project), issues: 2 });

    const body = readFileSync(evidenceFile(project), "utf-8");
    expect(body).toContain("## Issue #3181: issue 3181");
    expect(body).toContain("## Issue #2415: issue 2415");
    expect(body).toContain("body of 3181");
    expect(body).toContain(`target-sha: ${SHA}`);
    expect(body).toContain("- fetched-at: 2026-08-18T01:02:03Z");
    expect(body).toContain("独立レビュアー: 2名");
  });

  test("overwrites in full on a re-run instead of appending", async () => {
    project = seededProject();
    await fetchWith(project, { issues: "3181,2415" });
    const outcome = await fetchWith(project, { issues: "3181" });
    expect(outcome.kind).toBe("ok");

    const body = readFileSync(evidenceFile(project), "utf-8");
    expect(body).toContain("## Issue #3181:");
    expect(body).not.toContain("## Issue #2415:");
    expect(body.match(/^## Issue #/gmu)).toHaveLength(1);
  });

  test("leaves no temporary file behind", async () => {
    project = seededProject();
    await fetchWith(project, { issues: "3181" });
    const entries = readdirSync(dirname(evidenceFile(project)));
    expect(entries).toEqual(["issue-evidence.md"]);
  });
});

describe("t3181 issue-evidence fetch — loud failure (FR-EVD-5)", () => {
  test("refuses and writes nothing when gh is not installed", async () => {
    project = seededProject();
    const outcome = await fetchWith(project, { issues: "3181" }, {
      readiness: failure("not-installed"),
    });
    expect(outcome.kind).toBe("error");
    if (outcome.kind !== "error") throw new Error("expected an error");
    expect(outcome.message).toContain("not-installed");
    expect(existsSync(evidenceFile(project))).toBe(false);
  });

  test("refuses and writes nothing when gh is unauthenticated", async () => {
    project = seededProject();
    const outcome = await fetchWith(project, { issues: "3181" }, {
      readiness: failure("unauthenticated"),
    });
    expect(outcome.kind).toBe("error");
    expect(existsSync(evidenceFile(project))).toBe(false);
  });

  test("writes NOTHING when the second issue of a batch fails", async () => {
    project = seededProject();
    const outcome = await fetchWith(project, { issues: "3181,2415" }, {
      viewIssue: (n) => (n === 2415 ? failure("api") : { kind: "ok", value: issue(n) }),
    });
    expect(outcome.kind).toBe("error");
    if (outcome.kind !== "error") throw new Error("expected an error");
    expect(outcome.message).toContain("2415");
    expect(existsSync(evidenceFile(project))).toBe(false);
  });

  test("does not replace an earlier capture when a later run fails", async () => {
    project = seededProject();
    await fetchWith(project, { issues: "3181" });
    const before = readFileSync(evidenceFile(project), "utf-8");

    const outcome = await fetchWith(project, { issues: "3181" }, {
      listComments: () => failure("invalid-response"),
    });
    expect(outcome.kind).toBe("error");
    expect(readFileSync(evidenceFile(project), "utf-8")).toBe(before);
  });

  test.each([
    ["an absent --issues flag", {}],
    ["an empty --issues list", { issues: "" }],
    ["a non-numeric issue", { issues: "3181,abc" }],
    ["a zero issue number", { issues: "0" }],
    ["a negative issue number", { issues: "-3181" }],
    ["a malformed --repo", { issues: "3181", repo: "not-a-slug" }],
  ])("rejects %s before any request", async (_label, flags) => {
    project = seededProject();
    const outcome = await fetchWith(project, flags as Record<string, string>);
    expect(outcome.kind).toBe("error");
    expect(existsSync(evidenceFile(project))).toBe(false);
  });

  test("rejects an unknown sub-verb", async () => {
    project = seededProject();
    const outcome = await runIssueEvidenceFetch(project, ["push"], { issues: "3181" }, {
      gateway: fakeGateway(),
      now: () => new Date("2026-08-18T01:02:03Z"),
      resolveRepository: () => REPO,
    });
    expect(outcome.kind).toBe("error");
    if (outcome.kind !== "error") throw new Error("expected an error");
    expect(outcome.message).toContain("fetch");
  });

  test("refuses when the repository cannot be resolved", async () => {
    project = seededProject();
    const outcome = await runIssueEvidenceFetch(project, ["fetch"], { issues: "3181" }, {
      gateway: fakeGateway(),
      now: () => new Date("2026-08-18T01:02:03Z"),
      resolveRepository: () => null,
    });
    expect(outcome.kind).toBe("error");
    if (outcome.kind !== "error") throw new Error("expected an error");
    expect(outcome.message).toContain("--repo");
  });
});

describe("t3181 issue-evidence argv dispatch", () => {
  const TOOL = amadeusToolTarget(
    join(
      import.meta.dir,
      "..",
      "..",
      "dist",
      "claude",
      ".claude",
      "tools",
      "amadeus-utility.ts",
    ),
  );

  test("routes the verb to its own handler and fails loud on a bad issue list", () => {
    project = seededProject();
    const result = spawnSync(
      "bun",
      [TOOL, "issue-evidence", "fetch", "--issues", "abc", "--project-dir", project],
      { encoding: "utf-8" },
    );
    expect(result.status).not.toBe(0);
    // The handler's own message, not the top-level usage line — proof the
    // dispatch reached this arm rather than falling through to `default`.
    expect(result.stderr).toContain("--issues");
    expect(result.stderr).not.toContain("Usage: amadeus-utility <help|version");
  });

  test("lists the verb in the top-level usage line", () => {
    const result = spawnSync("bun", [TOOL, "no-such-verb"], { encoding: "utf-8" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("issue-evidence");
  });
});
