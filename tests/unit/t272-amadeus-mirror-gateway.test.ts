// t272 — G3/G5/G6/G7/G8 gateway matrix via a fake process runner: exact argv,
// envelope grammar, PR exclusion, marker filter, redaction, effect, permits.
// covers: packages/framework/core/tools/amadeus-mirror-gateway.ts
// size: small

import { describe, expect, test } from "bun:test";
import { createMirrorMutationPermit } from "../../packages/framework/core/tools/amadeus-mirror-capability.ts";
import {
  createMirrorGitHubGateway,
  FIND_PER_PAGE,
  scanBodies,
} from "../../packages/framework/core/tools/amadeus-mirror-gateway.ts";
import type {
  MirrorEventIdentity,
  MirrorMutationPermit,
  MirrorOperation,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import type {
  MirrorProcessRequest,
  MirrorProcessResult,
  MirrorProcessRunner,
} from "../../packages/framework/core/tools/amadeus-mirror-runner.ts";

const REPO: RepositoryIdentity = {
  owner: "amadeus-dlc",
  name: "amadeus",
  canonical: "amadeus-dlc/amadeus",
};
const REPO_URL = "https://api.github.com/repos/amadeus-dlc/amadeus";

// --- fake runner (test-side only; production takes the port) -----------------

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

// --- envelope fixtures (independent golden, not the parser) ------------------
//
// Two byte shapes are covered on purpose, because the real `gh` envelope mixes
// line terminators and the previous all-CRLF fixture hid that (issue #1498):
//
//   ghBlock() — the REAL shape. Captured with
//     gh api --include --method GET \
//       repos/amadeus-dlc/amadeus/labels -f per_page=20 -f page=1 | od -c
//     on `gh version 2.96.0 (nixpkgs)` (2026-07-26). The status line ends with
//     a BARE LF ("HTTP/2.0 200 OK\n"), header lines end with CRLF, the header
//     block ends with CRLF CRLF, and the body has NO trailing newline. The two
//     header names below are the first two of that capture, verbatim.
//
//   block()   — an all-CRLF envelope, kept so both terminators stay covered.

function ghBlock(status: number): string {
  return (
    `HTTP/2.0 ${status} OK\n` +
    "Access-Control-Allow-Origin: *\r\n" +
    "content-type: application/json; charset=utf-8\r\n" +
    "\r\n"
  );
}
function ghSingleEnvelope(status: number, obj: unknown): Buffer {
  return Buffer.from(`${ghBlock(status)}${JSON.stringify(obj)}`, "utf-8");
}
// One `gh api --include` request without --paginate: exactly one HTTP block
// followed by that page's JSON array.
function ghPageEnvelope(page: unknown[], status = 200): Buffer {
  return Buffer.from(`${ghBlock(status)}${JSON.stringify(page)}`, "utf-8");
}
function block(status: number): string {
  return `HTTP/2 ${status} OK\r\ncontent-type: application/json\r\n\r\n`;
}
function singleEnvelope(status: number, obj: unknown): Buffer {
  return Buffer.from(`${block(status)}${JSON.stringify(obj)}\n`, "utf-8");
}
// CRLF counterpart of ghPageEnvelope, for the terminator-symmetry cases.
function crlfPageEnvelope(page: unknown[], status = 200): Buffer {
  return Buffer.from(`${block(status)}${JSON.stringify(page)}\n`, "utf-8");
}
function issue(
  number: number,
  extra: Partial<{ title: string; body: string; state: string; url: string }> = {},
): Record<string, unknown> {
  return {
    number,
    title: extra.title ?? "t",
    body: extra.body ?? "b",
    state: extra.state ?? "open",
    repository_url: extra.url ?? REPO_URL,
  };
}

function event(operation: MirrorOperation): MirrorEventIdentity {
  return { intentUuid: "u", boundary: { kind: "manual", instance: "m" }, operation };
}
function permit(
  operation: MirrorOperation,
  issueNumber: number | null,
): MirrorMutationPermit {
  return createMirrorMutationPermit({
    event: event(operation),
    repository: REPO,
    operation,
    issueNumber,
  });
}

describe("body scanner", () => {
  test("accepts every valid escape width including a surrogate pair", () => {
    expect(
      scanBodies(
        String.raw`{"body":"\"\\\/\b\f\n\r\t\u007f\u07ff\u0800\uD83D\uDE00"}`,
      ),
    ).toBe("ok");
  });

  test.each([
    `{"body":"${"\\"}`,
    String.raw`{"body":"\x"}`,
    String.raw`{"body":"\u12xz"}`,
    String.raw`{"body":"unterminated}`,
  ])("rejects malformed JSON string scanning: %s", (text) => {
    expect(scanBodies(text)).toBe("malformed");
  });
});

// --- readiness ---------------------------------------------------------------

describe("readiness", () => {
  test("ok runs --version then auth status, no mutation", async () => {
    const { runner, requests } = fakeRunner([exited(0), exited(0)]);
    const outcome = await createMirrorGitHubGateway(runner).readiness(REPO);
    expect(outcome.kind).toBe("ok");
    expect(requests[0].args).toEqual(["--version"]);
    expect(requests[1].args).toEqual([
      "auth",
      "status",
      "--hostname",
      "github.com",
    ]);
    expect(requests.every((r) => !r.args.includes("--method"))).toBe(true);
  });

  test("missing gh yields not-installed / no-effect-confirmed", async () => {
    const { runner } = fakeRunner([{ kind: "spawn-error" }]);
    const outcome = await createMirrorGitHubGateway(runner).readiness(REPO);
    expect(outcome).toEqual({
      kind: "failure",
      classification: "not-installed",
      retryable: false,
      effect: "no-effect-confirmed",
      summary:
        "GitHub unavailable (not-installed; no-effect-confirmed; exit=none; http=none)",
    });
  });

  test("auth failure yields unauthenticated", async () => {
    const { runner } = fakeRunner([exited(0), exited(1)]);
    const outcome = await createMirrorGitHubGateway(runner).readiness(REPO);
    expect(outcome.kind).toBe("failure");
    if (outcome.kind === "failure") {
      expect(outcome.classification).toBe("unauthenticated");
      expect(outcome.effect).toBe("no-effect-confirmed");
    }
  });
});

// --- create ------------------------------------------------------------------

describe("createIssue", () => {
  test("builds exact POST argv and returns the parsed issue once", async () => {
    const { runner, requests } = fakeRunner([exited(0, singleEnvelope(201, issue(10)))]);
    const outcome = await createMirrorGitHubGateway(runner).createIssue(
      permit("create", null),
      { title: "Hello", body: "World", labels: ["intent-mirror", "enhancement"] },
    );
    expect(requests).toHaveLength(1);
    expect(requests[0].args).toEqual([
      "api",
      "--include",
      "--method",
      "POST",
      "repos/amadeus-dlc/amadeus/issues",
      "-f",
      "title=Hello",
      "-f",
      "body=World",
      "-f",
      "labels[]=intent-mirror",
      "-f",
      "labels[]=enhancement",
    ]);
    expect(outcome).toEqual({
      kind: "ok",
      value: { repository: REPO, number: 10, title: "t", body: "b", state: "OPEN" },
    });
  });

  test("passes shell metacharacters as single arguments", async () => {
    const { runner, requests } = fakeRunner([exited(0, singleEnvelope(201, issue(1)))]);
    const meta = '"; rm -rf / $(whoami) `id` && echo';
    await createMirrorGitHubGateway(runner).createIssue(permit("create", null), {
      title: meta,
      body: `line1\nline2 ${meta}`,
      labels: ["intent-mirror"],
    });
    expect(requests[0].args).toContain(`title=${meta}`);
    expect(requests[0].args).toContain(`body=line1\nline2 ${meta}`);
  });

  test("rejects a forged permit before spawning", async () => {
    const { runner, requests } = fakeRunner([]);
    const forged = {
      event: event("create"),
      repository: REPO,
      operation: "create",
      issueNumber: null,
    } as unknown as MirrorMutationPermit;
    await expect(
      createMirrorGitHubGateway(runner).createIssue(forged, {
        title: "x",
        body: "y",
        labels: [],
      }),
    ).rejects.toThrow(/permit/);
    expect(requests).toHaveLength(0);
  });

  test("mutation timeout is network / outcome-unknown", async () => {
    const { runner } = fakeRunner([
      { kind: "timed-out", termination: { kind: "clean" } },
    ]);
    const outcome = await createMirrorGitHubGateway(runner).createIssue(
      permit("create", null),
      { title: "x", body: "y", labels: [] },
    );
    expect(outcome).toMatchObject({
      kind: "failure",
      classification: "network",
      retryable: true,
      effect: "outcome-unknown",
    });
  });

  test("mutation termination-failed is command / outcome-unknown", async () => {
    const { runner } = fakeRunner([
      {
        kind: "timed-out",
        termination: { kind: "termination-failed", residualDescendantPossible: true },
      },
    ]);
    const outcome = await createMirrorGitHubGateway(runner).createIssue(
      permit("create", null),
      { title: "x", body: "y", labels: [] },
    );
    expect(outcome).toMatchObject({
      kind: "failure",
      classification: "command",
      effect: "outcome-unknown",
    });
  });
});

// --- find --------------------------------------------------------------------

// A page is "full" at FIND_PER_PAGE elements; a shorter page ends the walk.
const PER_PAGE = FIND_PER_PAGE;

function fullPage(firstNumber: number, marked: readonly number[] = []): unknown[] {
  return Array.from({ length: PER_PAGE }, (_v, i) => {
    const number = firstNumber + i;
    return issue(number, { body: marked.includes(number) ? "x MK" : "plain" });
  });
}

function pageArgv(page: number): string[] {
  return [
    "api",
    "--include",
    "--method",
    "GET",
    "repos/amadeus-dlc/amadeus/issues",
    "-f",
    "state=all",
    "-f",
    `per_page=${PER_PAGE}`,
    "-f",
    `page=${page}`,
  ];
}

describe("findIssuesByMarker", () => {
  test("walks page by page, excludes PRs, keeps 2 marker matches", async () => {
    const marker = "<!-- mirror:abc -->";
    const page1 = fullPage(101);
    page1[0] = issue(1, { body: `has ${marker}` });
    page1[1] = {
      ...issue(2, { body: `pr ${marker}` }),
      pull_request: { url: "x" },
    };
    const page2 = [issue(3, { body: "no marker" }), issue(4, { body: `also ${marker}` })];
    const { runner, requests } = fakeRunner([
      exited(0, ghPageEnvelope(page1)),
      exited(0, ghPageEnvelope(page2)),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).findIssuesByMarker(
      REPO,
      marker,
    );
    expect(requests).toHaveLength(2);
    expect(requests[0].args).toEqual(pageArgv(1));
    expect(requests[1].args).toEqual(pageArgv(2));
    expect(requests.every((r) => !r.args.includes("--slurp"))).toBe(true);
    expect(requests.every((r) => !r.args.includes("--paginate"))).toBe(true);
    expect(outcome.kind).toBe("ok");
    if (outcome.kind === "ok") {
      expect(outcome.value.map((i) => i.number)).toEqual([1, 4]);
    }
  });

  test("a short first page ends the walk after one request", async () => {
    const { runner, requests } = fakeRunner([
      exited(0, ghPageEnvelope([issue(1, { body: "x MK" }), issue(2, { body: "y MK" })])),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).findIssuesByMarker(
      REPO,
      "MK",
    );
    expect(requests).toHaveLength(1);
    if (outcome.kind === "ok") expect(outcome.value).toHaveLength(2);
    else throw new Error("expected ok");
  });

  test("an empty page after a full page ends the walk", async () => {
    const { runner, requests } = fakeRunner([
      exited(0, ghPageEnvelope(fullPage(1, [43]))),
      exited(0, ghPageEnvelope([])),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).findIssuesByMarker(
      REPO,
      "MK",
    );
    expect(requests).toHaveLength(2);
    if (outcome.kind === "ok") expect(outcome.value.map((i) => i.number)).toEqual([43]);
    else throw new Error("expected ok");
  });

  test("100 full pages are walked in order", async () => {
    const results = Array.from({ length: 100 }, (_v, p) =>
      exited(0, ghPageEnvelope(fullPage(p * PER_PAGE + 1, p === 42 ? [4243] : []))),
    );
    results.push(exited(0, ghPageEnvelope([])));
    const { runner, requests } = fakeRunner(results);
    const outcome = await createMirrorGitHubGateway(runner).findIssuesByMarker(
      REPO,
      "MK",
    );
    expect(requests).toHaveLength(101);
    expect(requests[100].args).toEqual(pageArgv(101));
    if (outcome.kind === "ok") expect(outcome.value.map((i) => i.number)).toEqual([4243]);
    else throw new Error("expected ok");
  });

  test("a CRLF page envelope is accepted the same way", async () => {
    const { runner } = fakeRunner([
      exited(0, crlfPageEnvelope([issue(1, { body: "x MK" })])),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).findIssuesByMarker(
      REPO,
      "MK",
    );
    if (outcome.kind === "ok") expect(outcome.value.map((i) => i.number)).toEqual([1]);
    else throw new Error("expected ok");
  });

  test("cross-repository response is invalid-response", async () => {
    const env = ghPageEnvelope([
      issue(1, { url: "https://api.github.com/repos/evil/other" }),
    ]);
    const { runner } = fakeRunner([exited(0, env)]);
    const outcome = await createMirrorGitHubGateway(runner).findIssuesByMarker(
      REPO,
      "x",
    );
    expect(outcome).toMatchObject({
      kind: "failure",
      classification: "invalid-response",
      effect: "no-effect-confirmed",
    });
  });

  test("malformed page element fails the whole search (no zero rounding)", async () => {
    const env = ghPageEnvelope([{ title: "no number", state: "open" }]);
    const { runner } = fakeRunner([exited(0, env)]);
    const outcome = await createMirrorGitHubGateway(runner).findIssuesByMarker(
      REPO,
      "x",
    );
    expect(outcome).toMatchObject({ kind: "failure", classification: "invalid-response" });
  });

  test("more than one HTTP block in one page response is invalid-response", async () => {
    // One request must yield exactly one HTTP block; a slurped multi-block
    // stream is no longer a shape this verb can produce.
    const env = Buffer.from(
      `${ghBlock(200)}${JSON.stringify([issue(1)])}${ghBlock(200)}${JSON.stringify([issue(2)])}`,
      "utf-8",
    );
    const { runner } = fakeRunner([exited(0, env)]);
    const outcome = await createMirrorGitHubGateway(runner).findIssuesByMarker(
      REPO,
      "x",
    );
    expect(outcome).toMatchObject({ kind: "failure", classification: "invalid-response" });
  });

  test("capacity failure is invalid-response / no-effect-confirmed", async () => {
    const { runner } = fakeRunner([
      { kind: "capacity-exceeded", termination: { kind: "clean" } },
    ]);
    const outcome = await createMirrorGitHubGateway(runner).findIssuesByMarker(
      REPO,
      "x",
    );
    expect(outcome).toMatchObject({
      kind: "failure",
      classification: "invalid-response",
      effect: "no-effect-confirmed",
    });
  });

  test("oversize body is rejected before JSON.parse is called", async () => {
    const big = "a".repeat(256 * 1024 + 1);
    const env = ghPageEnvelope([issue(1, { body: big })]);
    const { runner } = fakeRunner([exited(0, env)]);
    const originalParse = JSON.parse;
    let parseCalls = 0;
    JSON.parse = ((...args: Parameters<typeof originalParse>) => {
      parseCalls += 1;
      return originalParse(...args);
    }) as typeof JSON.parse;
    try {
      const outcome = await createMirrorGitHubGateway(runner).findIssuesByMarker(
        REPO,
        "x",
      );
      expect(outcome).toMatchObject({ kind: "failure", classification: "invalid-response" });
    } finally {
      JSON.parse = originalParse;
    }
    expect(parseCalls).toBe(0);
  });
});

// --- view --------------------------------------------------------------------

describe("viewIssue", () => {
  test("builds exact GET argv and parses the issue", async () => {
    const { runner, requests } = fakeRunner([exited(0, singleEnvelope(200, issue(3)))]);
    const outcome = await createMirrorGitHubGateway(runner).viewIssue(REPO, 3);
    expect(requests[0].args).toEqual([
      "api",
      "--include",
      "--method",
      "GET",
      "repos/amadeus-dlc/amadeus/issues/3",
    ]);
    expect(outcome.kind).toBe("ok");
  });

  test("rejects a non-positive issue number without spawning", async () => {
    const { runner, requests } = fakeRunner([]);
    const outcome = await createMirrorGitHubGateway(runner).viewIssue(REPO, 0);
    expect(outcome).toMatchObject({ kind: "failure", classification: "invalid-response" });
    expect(requests).toHaveLength(0);
  });

  test("normalizes a null body to empty string", async () => {
    const raw = { ...issue(9), body: null };
    const { runner } = fakeRunner([exited(0, singleEnvelope(200, raw))]);
    const outcome = await createMirrorGitHubGateway(runner).viewIssue(REPO, 9);
    if (outcome.kind === "ok") expect(outcome.value.body).toBe("");
    else throw new Error("expected ok");
  });
});

// --- HTTP status classification + redaction ---------------------------------

describe("http status classification and redaction", () => {
  test.each([
    [429, "rate-limit", true],
    [401, "unauthenticated", false],
    [403, "permission", false],
    [404, "api", false],
    [500, "api", true],
  ])("status %p maps to %s", async (status, classification, retryable) => {
    const env = Buffer.from(`${block(status)}{"message":"e"}\n`, "utf-8");
    const { runner } = fakeRunner([exited(1, env)]);
    const outcome = await createMirrorGitHubGateway(runner).viewIssue(REPO, 5);
    expect(outcome).toMatchObject({ kind: "failure", classification, retryable });
    if (outcome.kind === "failure") {
      expect(outcome.summary).toContain(`http=${status}`);
    }
  });

  test("network summary never transcribes stderr sentinels", async () => {
    const stderr =
      "fatal: could not resolve host: api.github.com token=ghp_SECRET /Users/me/.netrc";
    const { runner } = fakeRunner([exited(1, Buffer.alloc(0), stderr)]);
    const outcome = await createMirrorGitHubGateway(runner).viewIssue(REPO, 5);
    expect(outcome).toMatchObject({ kind: "failure", classification: "network" });
    if (outcome.kind === "failure") {
      expect(outcome.summary).toBe(
        "GitHub unavailable (network; no-effect-confirmed; exit=1; http=none)",
      );
      expect(outcome.summary).not.toContain("ghp_SECRET");
      expect(outcome.summary).not.toContain("/Users");
    }
  });

  test("non-transport exit is generic command", async () => {
    const { runner } = fakeRunner([exited(1, Buffer.alloc(0), "usage: gh api ...")]);
    const outcome = await createMirrorGitHubGateway(runner).viewIssue(REPO, 5);
    expect(outcome).toMatchObject({ kind: "failure", classification: "command" });
  });
});

// --- edit / close ------------------------------------------------------------

describe("editIssue / closeIssue", () => {
  test("edit builds a one-way PATCH body argv", async () => {
    const { runner, requests } = fakeRunner([exited(0, singleEnvelope(200, issue(4)))]);
    await createMirrorGitHubGateway(runner).editIssue(permit("sync", 4), "new body");
    expect(requests[0].args).toEqual([
      "api",
      "--include",
      "--method",
      "PATCH",
      "repos/amadeus-dlc/amadeus/issues/4",
      "-f",
      "body=new body",
    ]);
    expect(requests).toHaveLength(1);
  });

  test("close builds a PATCH state=closed argv", async () => {
    const { runner, requests } = fakeRunner([
      exited(0, singleEnvelope(200, issue(4, { state: "closed" }))),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).closeIssue(
      permit("close", 4),
    );
    expect(requests[0].args).toEqual([
      "api",
      "--include",
      "--method",
      "PATCH",
      "repos/amadeus-dlc/amadeus/issues/4",
      "-f",
      "state=closed",
    ]);
    if (outcome.kind === "ok") expect(outcome.value.state).toBe("CLOSED");
    else throw new Error("expected ok");
  });

  test("edit rejects a permit minted for a different operation", async () => {
    const { runner, requests } = fakeRunner([]);
    // editIssue expects operation "sync"; a close-bound permit must be refused
    // before any process starts.
    const wrong = permit("close", 4);
    await expect(
      createMirrorGitHubGateway(runner).editIssue(wrong, "x"),
    ).rejects.toThrow(/permit/);
    expect(requests).toHaveLength(0);
  });
});

// --- real `gh` envelope bytes across every verb (#1498) ----------------------

describe("real gh envelope (bare-LF status line)", () => {
  test("create parses a real-shaped 201 envelope", async () => {
    const { runner } = fakeRunner([exited(0, ghSingleEnvelope(201, issue(10)))]);
    const outcome = await createMirrorGitHubGateway(runner).createIssue(
      permit("create", null),
      { title: "t", body: "b", labels: [] },
    );
    expect(outcome).toEqual({
      kind: "ok",
      value: { repository: REPO, number: 10, title: "t", body: "b", state: "OPEN" },
    });
  });

  test("view parses a real-shaped 200 envelope", async () => {
    const { runner } = fakeRunner([exited(0, ghSingleEnvelope(200, issue(3)))]);
    const outcome = await createMirrorGitHubGateway(runner).viewIssue(REPO, 3);
    expect(outcome.kind).toBe("ok");
  });

  test("edit parses a real-shaped 200 envelope", async () => {
    const { runner } = fakeRunner([exited(0, ghSingleEnvelope(200, issue(4)))]);
    const outcome = await createMirrorGitHubGateway(runner).editIssue(
      permit("sync", 4),
      "new body",
    );
    expect(outcome.kind).toBe("ok");
  });

  test("close parses a real-shaped 200 envelope", async () => {
    const { runner } = fakeRunner([
      exited(0, ghSingleEnvelope(200, issue(4, { state: "closed" }))),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).closeIssue(
      permit("close", 4),
    );
    if (outcome.kind === "ok") expect(outcome.value.state).toBe("CLOSED");
    else throw new Error("expected ok");
  });

  test("a real-shaped non-2xx envelope still classifies by status", async () => {
    const { runner } = fakeRunner([
      exited(1, ghSingleEnvelope(404, { message: "Not Found" })),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).viewIssue(REPO, 5);
    expect(outcome).toMatchObject({ kind: "failure", classification: "api" });
    if (outcome.kind === "failure") expect(outcome.summary).toContain("http=404");
  });
});

describe("malformed response fail-closed matrix", () => {
  test("rejects a non-array paginated envelope", async () => {
    const { runner } = fakeRunner([
      exited(0, Buffer.from(`${block(200)}{}\n`)),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).findIssuesByMarker(
      REPO,
      "marker",
    );
    expect(outcome).toMatchObject({
      kind: "failure",
      classification: "invalid-response",
    });
  });

  test("rejects an exit-zero malformed envelope", async () => {
    const { runner } = fakeRunner([exited(0, Buffer.from("not-http"))]);
    const outcome = await createMirrorGitHubGateway(runner).createIssue(
      permit("create", null),
      { title: "t", body: "b", labels: [] },
    );
    expect(outcome).toMatchObject({
      kind: "failure",
      classification: "invalid-response",
    });
  });

  test("rejects an HTTP-success envelope paired with a non-zero exit", async () => {
    const { runner } = fakeRunner([
      exited(1, singleEnvelope(200, issue(1))),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).createIssue(
      permit("create", null),
      { title: "t", body: "b", labels: [] },
    );
    expect(outcome).toMatchObject({
      kind: "failure",
      classification: "invalid-response",
    });
  });

  test("rejects malformed JSON after a valid single envelope", async () => {
    const { runner } = fakeRunner([
      exited(0, Buffer.from(`${block(200)}{"number":\n`)),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).viewIssue(REPO, 1);
    expect(outcome).toMatchObject({
      kind: "failure",
      classification: "invalid-response",
    });
  });

  test("rejects malformed JSON after a valid paginated envelope", async () => {
    const { runner } = fakeRunner([
      exited(0, Buffer.from(`${block(200)}[broken\n`)),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).findIssuesByMarker(
      REPO,
      "marker",
    );
    expect(outcome).toMatchObject({
      kind: "failure",
      classification: "invalid-response",
    });
  });
});
