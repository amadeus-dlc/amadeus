// covers: packages/framework/core/tools/amadeus-github-gateway.ts
// size: small
//
// t3181 — the evidence read adapter (#3181 C1): the third gateway adapter,
// read-only, added beside the mirror and finding ones.
//
// It reuses the proven read surface (readiness / viewArgv / parseIssueObject)
// and adds exactly one new transport: the issue comments walk. The whole
// surface runs against a FAKE process runner — the gateway takes the runner as
// a port — so no test here talks to GitHub.
//
// Two properties the failure cases pin, both from the gateway's standing
// contract: a failure never carries raw stdout/stderr (the summary is rebuilt
// from the redaction template), and a partial comment list is never returned as
// a success (fail-closed).

import { describe, expect, test } from "bun:test";
import {
  commentsArgv,
  createEvidenceGitHubGatewayAdapter,
  FIND_PER_PAGE,
  parseGitHubRepository,
  parseIssueComments,
} from "../../packages/framework/core/tools/amadeus-github-gateway.ts";
import type { GitHubRepository } from "../../packages/framework/core/tools/amadeus-github-types.ts";
import type {
  MirrorProcessRequest,
  MirrorProcessResult,
  MirrorProcessRunner,
} from "../../packages/framework/core/tools/amadeus-process-runner.ts";

const REPO: GitHubRepository = {
  owner: "amadeus-dlc",
  name: "amadeus",
  canonical: "amadeus-dlc/amadeus",
};
const REPO_URL = "https://api.github.com/repos/amadeus-dlc/amadeus";

function fakeRunner(results: MirrorProcessResult[]): {
  runner: MirrorProcessRunner;
  requests: MirrorProcessRequest[];
} {
  const requests: MirrorProcessRequest[] = [];
  const queue = [...results];
  return {
    requests,
    runner: {
      run(request) {
        requests.push(request);
        const next = queue.shift();
        if (next === undefined) throw new Error("fake runner: queue exhausted");
        return Promise.resolve(next);
      },
    },
  };
}

const exited = (
  exitCode: number,
  stdout: Buffer = Buffer.alloc(0),
  stderrTail = "",
): MirrorProcessResult => ({ kind: "exited", exitCode, stdout, stderrTail });

// The real `gh api --include` envelope shape (status line LF, headers CRLF).
function envelope(status: number, obj: unknown): Buffer {
  return Buffer.from(
    `HTTP/2.0 ${status} OK\ncontent-type: application/json; charset=utf-8\r\n\r\n${JSON.stringify(obj)}`,
    "utf-8",
  );
}
// `--paginate` without `--include` streams one merged JSON array, no envelope.
const bare = (value: unknown): Buffer =>
  Buffer.from(JSON.stringify(value), "utf-8");

function comment(id: number, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    body: `body-${id}`,
    created_at: "2026-08-17T10:00:00Z",
    user: { login: "reviewer-bot" },
    html_url: `https://github.com/amadeus-dlc/amadeus/issues/3181#issuecomment-${id}`,
    issue_url: `${REPO_URL}/issues/3181`,
    ...extra,
  };
}

describe("t3181 commentsArgv", () => {
  test("asks the comments endpoint for every page, read-only, at the full page size", () => {
    expect(commentsArgv(REPO, 3181)).toEqual([
      "api",
      "--paginate",
      "--method",
      "GET",
      "repos/amadeus-dlc/amadeus/issues/3181/comments",
      "-f",
      `per_page=${FIND_PER_PAGE}`,
    ]);
  });
});

describe("t3181 parseIssueComments", () => {
  test("maps a well-formed page onto the evidence DTO", () => {
    const parsed = parseIssueComments([comment(11)], REPO);
    expect(parsed).toEqual({
      kind: "ok",
      value: [
        {
          id: 11,
          body: "body-11",
          createdAt: "2026-08-17T10:00:00Z",
          authorLogin: "reviewer-bot",
          htmlUrl:
            "https://github.com/amadeus-dlc/amadeus/issues/3181#issuecomment-11",
        },
      ],
    });
  });

  test("reads a null body as empty rather than rejecting the comment", () => {
    const parsed = parseIssueComments([comment(11, { body: null })], REPO);
    expect(parsed.kind === "ok" && parsed.value[0].body).toBe("");
  });

  // GitHub echoes the repository's REAL casing in issue_url while our canonical
  // is lowercased, so an owner or name with a capital letter must still bind.
  test("binds a mixed-case repository to its normalized canonical", () => {
    const mixed = parseGitHubRepository("Amadeus-DLC", "Amadeus");
    if (mixed === null) throw new Error("fixture repo failed to parse");
    const parsed = parseIssueComments(
      [
        comment(11, {
          issue_url: "https://api.github.com/repos/Amadeus-DLC/Amadeus/issues/3181",
        }),
      ],
      mixed,
    );
    expect(parsed.kind).toBe("ok");
  });

  test.each([
    ["a non-array payload", { not: "an array" }],
    ["a non-object element", ["nope"]],
    ["a missing author", [comment(11, { user: null })]],
    ["a non-string timestamp", [comment(11, { created_at: 17 })]],
    ["a non-positive id", [comment(0)]],
    [
      "an element bound to another repository",
      [comment(11, { issue_url: "https://api.github.com/repos/other/repo/issues/1" })],
    ],
    // The issue_url guards, one arm each: unparsable, wrong scheme, wrong host,
    // wrong path shape. Each would otherwise let a comment from somewhere else
    // into this intent's evidence.
    ["an unparsable issue url", [comment(11, { issue_url: "not a url" })]],
    [
      "an issue url that is not https",
      [comment(11, { issue_url: "http://api.github.com/repos/amadeus-dlc/amadeus/issues/1" })],
    ],
    [
      "an issue url on another host",
      [comment(11, { issue_url: "https://example.com/repos/amadeus-dlc/amadeus/issues/1" })],
    ],
    [
      "an issue url with too few path segments",
      [comment(11, { issue_url: "https://api.github.com/repos/amadeus-dlc/amadeus" })],
    ],
    [
      "an issue url whose path is not issue-scoped",
      [comment(11, { issue_url: "https://api.github.com/repos/amadeus-dlc/amadeus/pulls/1" })],
    ],
  ])("rejects %s", (_label, payload) => {
    const parsed = parseIssueComments(payload, REPO);
    expect(parsed.kind).toBe("failure");
    if (parsed.kind !== "failure") throw new Error("expected a failure");
    expect(parsed.classification).toBe("invalid-response");
    expect(parsed.effect).toBe("no-effect-confirmed");
  });
});

describe("t3181 evidence adapter", () => {
  test("probes gh version then auth for readiness", async () => {
    const { runner, requests } = fakeRunner([exited(0), exited(0)]);
    const outcome = await createEvidenceGitHubGatewayAdapter(runner).readiness();
    expect(outcome.kind).toBe("ok");
    expect(requests.map((r) => r.args)).toEqual([
      ["--version"],
      ["auth", "status", "--hostname", "github.com"],
    ]);
  });

  test("reports a gh that is not installed", async () => {
    const { runner } = fakeRunner([exited(1)]);
    const outcome = await createEvidenceGitHubGatewayAdapter(runner).readiness();
    expect(outcome.kind).toBe("failure");
    if (outcome.kind !== "failure") throw new Error("expected a failure");
    expect(outcome.classification).toBe("not-installed");
  });

  test("reports an unauthenticated gh without leaking its stderr", async () => {
    const { runner } = fakeRunner([exited(0), exited(1, Buffer.alloc(0), "token abc123 rejected")]);
    const outcome = await createEvidenceGitHubGatewayAdapter(runner).readiness();
    expect(outcome.kind).toBe("failure");
    if (outcome.kind !== "failure") throw new Error("expected a failure");
    expect(outcome.classification).toBe("unauthenticated");
    expect(outcome.summary).not.toContain("abc123");
  });

  test("reads the issue through the existing single-issue read path", async () => {
    const { runner, requests } = fakeRunner([
      exited(
        0,
        envelope(200, {
          number: 3181,
          title: "t",
          body: "b",
          state: "open",
          repository_url: REPO_URL,
        }),
      ),
    ]);
    const outcome = await createEvidenceGitHubGatewayAdapter(runner).viewIssue(REPO, 3181);
    expect(outcome).toEqual({
      kind: "ok",
      value: { repository: REPO, number: 3181, title: "t", body: "b", state: "OPEN" },
    });
    expect(requests[0].args).toEqual([
      "api",
      "--include",
      "--method",
      "GET",
      "repos/amadeus-dlc/amadeus/issues/3181",
    ]);
  });

  test("lists every comment page through one paginated read", async () => {
    const { runner, requests } = fakeRunner([
      exited(0, bare([comment(11), comment(12)])),
    ]);
    const outcome = await createEvidenceGitHubGatewayAdapter(runner).listComments(REPO, 3181);
    expect(outcome.kind).toBe("ok");
    if (outcome.kind !== "ok") throw new Error("expected ok");
    expect(outcome.value.map((c) => c.id)).toEqual([11, 12]);
    expect(requests[0].profile).toBe("paginated");
    expect(requests[0].args).toEqual(commentsArgv(REPO, 3181));
  });

  test("fails closed when the comment walk exits non-zero", async () => {
    const { runner } = fakeRunner([
      exited(1, bare([comment(11)]), "could not resolve host: api.github.com"),
    ]);
    const outcome = await createEvidenceGitHubGatewayAdapter(runner).listComments(REPO, 3181);
    expect(outcome.kind).toBe("failure");
    if (outcome.kind !== "failure") throw new Error("expected a failure");
    expect(outcome.classification).toBe("network");
    expect(outcome.retryable).toBe(true);
    expect(outcome.summary).not.toContain("api.github.com");
  });

  test("classifies an unparseable comment payload as an invalid response", async () => {
    const { runner } = fakeRunner([exited(0, Buffer.from("{not json", "utf-8"))]);
    const outcome = await createEvidenceGitHubGatewayAdapter(runner).listComments(REPO, 3181);
    expect(outcome.kind).toBe("failure");
    if (outcome.kind !== "failure") throw new Error("expected a failure");
    expect(outcome.classification).toBe("invalid-response");
  });

  test("classifies a missing gh binary as not-installed", async () => {
    const { runner } = fakeRunner([{ kind: "spawn-error" }]);
    const outcome = await createEvidenceGitHubGatewayAdapter(runner).listComments(REPO, 3181);
    expect(outcome.kind).toBe("failure");
    if (outcome.kind !== "failure") throw new Error("expected a failure");
    expect(outcome.classification).toBe("not-installed");
  });
});
