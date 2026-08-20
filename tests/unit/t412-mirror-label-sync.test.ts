// t412 — Intent Mirror in-progress label sync (#1990): the pure planning layer.
// covers: packages/framework/core/tools/amadeus-mirror-labels.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  addLabelsArgv,
  createMirrorLabelGateway,
  removeLabelArgv,
  viewArgv,
} from "../../packages/framework/core/tools/amadeus-github-gateway.ts";
import {
  IN_PROGRESS_LABEL,
  mirrorLabelSyncPlan,
  relatedIssueNumbers,
  runMirrorLabelSync,
} from "../../packages/framework/core/tools/amadeus-mirror-labels.ts";
import type { MirrorLabelGateway } from "../../packages/framework/core/tools/amadeus-mirror-labels.ts";
import type { RepositoryIdentity } from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import type {
  MirrorProcessResult,
  MirrorProcessRunner,
} from "../../packages/framework/core/tools/amadeus-process-runner.ts";

const STATE_WITH_PROJECT = [
  "# Amadeus State",
  "",
  "- **Current Stage**: intent-capture",
  "- **Project**: GitHub issue #697 (= #684 Phase B, #688)",
  "",
].join("\n");

const STATE_WITHOUT_PROJECT = [
  "# Amadeus State",
  "",
  "- **Current Stage**: intent-capture",
  "",
].join("\n");

describe("relatedIssueNumbers", () => {
  test("extracts unique issue numbers from the Project field", () => {
    expect(relatedIssueNumbers(STATE_WITH_PROJECT)).toEqual([697, 684, 688]);
  });

  test("returns [] when the Project field is absent", () => {
    expect(relatedIssueNumbers(STATE_WITHOUT_PROJECT)).toEqual([]);
  });

  test("deduplicates repeated references", () => {
    const state = "- **Project**: #12 then #12 again and #7";
    expect(relatedIssueNumbers(state)).toEqual([12, 7]);
  });
});

describe("mirrorLabelSyncPlan", () => {
  test("intent-initialized adds in-progress to related and mirror issues", () => {
    const plan = mirrorLabelSyncPlan("intent-initialized", STATE_WITH_PROJECT, 900);
    expect(plan).toEqual({
      add: [697, 684, 688, 900],
      remove: [],
    });
  });

  test("intent-capture-approved also adds (idempotent retry boundary)", () => {
    const plan = mirrorLabelSyncPlan("intent-capture-approved", STATE_WITH_PROJECT, null);
    expect(plan).toEqual({ add: [697, 684, 688], remove: [] });
  });

  test("workflow-completed removes in-progress from related and mirror issues", () => {
    const plan = mirrorLabelSyncPlan("workflow-completed", STATE_WITH_PROJECT, 900);
    expect(plan).toEqual({ add: [], remove: [697, 684, 688, 900] });
  });

  test("mirror issue is not duplicated when it already appears in Project refs", () => {
    const state = "- **Project**: mirror #900 and #7";
    const plan = mirrorLabelSyncPlan("intent-initialized", state, 900);
    expect(plan).toEqual({ add: [900, 7], remove: [] });
  });

  test("phase-verified, parked and manual boundaries are no-ops", () => {
    for (const kind of ["phase-verified", "parked", "manual"] as const) {
      expect(mirrorLabelSyncPlan(kind, STATE_WITH_PROJECT, 900)).toEqual({
        add: [],
        remove: [],
      });
    }
  });

  test("empty state with no mirror issue yields an empty plan", () => {
    expect(mirrorLabelSyncPlan("intent-initialized", STATE_WITHOUT_PROJECT, null)).toEqual({
      add: [],
      remove: [],
    });
  });
});

const REPO: RepositoryIdentity = {
  owner: "acme",
  name: "widgets",
  canonical: "acme/widgets",
};

type Call = { op: "add" | "remove"; issue: number };

function fakeGateway(
  failOn: ReadonlySet<number> = new Set(),
  prNumbers: ReadonlySet<number> = new Set(),
): {
  gateway: MirrorLabelGateway;
  calls: Call[];
} {
  const calls: Call[] = [];
  return {
    calls,
    gateway: {
      async addIssueLabels(_repo, issueNumber, _labels) {
        calls.push({ op: "add", issue: issueNumber });
        return failOn.has(issueNumber)
          ? { kind: "failure", classification: "network", summary: "boom", retryable: true, effect: "not-started" }
          : { kind: "ok", value: undefined };
      },
      async removeIssueLabel(_repo, issueNumber, _label) {
        calls.push({ op: "remove", issue: issueNumber });
        return failOn.has(issueNumber)
          ? { kind: "failure", classification: "network", summary: "boom", retryable: true, effect: "not-started" }
          : { kind: "ok", value: undefined };
      },
      async isPullRequest(_repo, issueNumber) {
        return { kind: "ok", value: prNumbers.has(issueNumber) };
      },
    },
  };
}

describe("runMirrorLabelSync", () => {
  test("executes the whole plan and reports zero failures", async () => {
    const { gateway, calls } = fakeGateway();
    const report = await runMirrorLabelSync(
      { add: [1, 2], remove: [3] },
      REPO,
      gateway,
    );
    expect(report.attempted).toBe(3);
    expect(report.failures).toEqual([]);
    expect(calls).toEqual([
      { op: "add", issue: 1 },
      { op: "add", issue: 2 },
      { op: "remove", issue: 3 },
    ]);
  });

  test("is fail-open: one failure never stops the remaining operations", async () => {
    const { gateway, calls } = fakeGateway(new Set([2]));
    const report = await runMirrorLabelSync(
      { add: [1, 2, 3], remove: [] },
      REPO,
      gateway,
    );
    expect(calls.length).toBe(3);
    expect(report.attempted).toBe(3);
    expect(report.failures).toEqual([
      { issue: 2, operation: "add", label: IN_PROGRESS_LABEL, detail: "boom" },
    ]);
  });

  test("an empty plan performs no gateway calls", async () => {
    const { gateway, calls } = fakeGateway();
    const report = await runMirrorLabelSync({ add: [], remove: [] }, REPO, gateway);
    expect(report.attempted).toBe(0);
    expect(calls).toEqual([]);
  });

  test("a remove failure is reported with the remove operation", async () => {
    const { gateway } = fakeGateway(new Set([9]));
    const report = await runMirrorLabelSync({ add: [], remove: [9, 10] }, REPO, gateway);
    expect(report.attempted).toBe(2);
    expect(report.failures).toEqual([
      { issue: 9, operation: "remove", label: IN_PROGRESS_LABEL, detail: "boom" },
    ]);
  });

  // #2020: a `#N` reference in the Project field can be a PR number appended
  // after the intent's issue was approved. A confirmed PR must never be
  // labelled — the gateway is asked first, and the add is skipped entirely.
  test("a confirmed pull request in the add plan is skipped, never labelled", async () => {
    const { gateway, calls } = fakeGateway(new Set(), new Set([684]));
    const report = await runMirrorLabelSync({ add: [697, 684], remove: [] }, REPO, gateway);
    expect(calls).toEqual([{ op: "add", issue: 697 }]);
    expect(report.attempted).toBe(1);
    expect(report.failures).toEqual([]);
  });

  // The discrimination check is advisory: if it fails or is inconclusive, the
  // module falls back to its existing fail-open contract and still adds.
  test("an inconclusive pull-request check falls open and still adds the label", async () => {
    const calls: Call[] = [];
    const gateway: MirrorLabelGateway = {
      async addIssueLabels(_repo, issueNumber) {
        calls.push({ op: "add", issue: issueNumber });
        return { kind: "ok", value: undefined };
      },
      async removeIssueLabel(_repo, issueNumber) {
        calls.push({ op: "remove", issue: issueNumber });
        return { kind: "ok", value: undefined };
      },
      async isPullRequest() {
        return {
          kind: "failure",
          classification: "network",
          summary: "boom",
          retryable: true,
          effect: "no-effect-confirmed",
        };
      },
    };
    const report = await runMirrorLabelSync({ add: [684], remove: [] }, REPO, gateway);
    expect(calls).toEqual([{ op: "add", issue: 684 }]);
    expect(report.attempted).toBe(1);
    expect(report.failures).toEqual([]);
  });
});

describe("label argv builders", () => {
  test("addLabelsArgv POSTs to the issue labels endpoint", () => {
    expect(addLabelsArgv(REPO, 42, ["in-progress"])).toEqual([
      "api",
      "--include",
      "--method",
      "POST",
      "repos/acme/widgets/issues/42/labels",
      "-f",
      "labels[]=in-progress",
    ]);
  });

  test("removeLabelArgv DELETEs the URL-encoded label", () => {
    expect(removeLabelArgv(REPO, 42, "in progress/x")).toEqual([
      "api",
      "--include",
      "--method",
      "DELETE",
      "repos/acme/widgets/issues/42/labels/in%20progress%2Fx",
    ]);
  });
});

function envelope(status: number, body: string): MirrorProcessResult {
  return {
    kind: "exited",
    exitCode: status < 400 ? 0 : 1,
    stdout: Buffer.from(`HTTP/2.0 ${status} X\r\nContent-Type: json\r\n\r\n${body}\n`),
    stderrTail: "",
  };
}

function fakeRunner(results: MirrorProcessResult[]): {
  runner: MirrorProcessRunner;
  argvs: (readonly string[])[];
} {
  const argvs: (readonly string[])[] = [];
  return {
    argvs,
    runner: {
      async run(request) {
        argvs.push(request.args);
        const next = results.shift();
        if (next === undefined) throw new Error("unexpected extra gh call");
        return next;
      },
    },
  };
}

describe("createMirrorLabelGateway", () => {
  test("add succeeds on 2xx", async () => {
    const { runner, argvs } = fakeRunner([envelope(200, "[]")]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.addIssueLabels(REPO, 7, ["in-progress"]);
    expect(outcome.kind).toBe("ok");
    expect(argvs[0]).toEqual(addLabelsArgv(REPO, 7, ["in-progress"]));
  });

  test("remove treats 404 as idempotent success (label already absent)", async () => {
    const { runner } = fakeRunner([envelope(404, '{"message":"Not Found"}')]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.removeIssueLabel(REPO, 7, "in-progress");
    expect(outcome.kind).toBe("ok");
  });

  test("add classifies a 404 as a failure (issue or repo missing)", async () => {
    const { runner } = fakeRunner([envelope(404, '{"message":"Not Found"}')]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.addIssueLabels(REPO, 7, ["in-progress"]);
    expect(outcome.kind).toBe("failure");
  });

  test("spawn errors surface as failures, not throws", async () => {
    const { runner } = fakeRunner([{ kind: "spawn-error" }]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.removeIssueLabel(REPO, 7, "in-progress");
    expect(outcome.kind).toBe("failure");
  });

  test("remove treats 204 No Content (empty body) as success", async () => {
    const { runner } = fakeRunner([
      {
        kind: "exited",
        exitCode: 0,
        stdout: Buffer.from("HTTP/2.0 204 No Content\r\nServer: GitHub.com\r\n\r\n"),
        stderrTail: "",
      },
    ]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.removeIssueLabel(REPO, 7, "in-progress");
    expect(outcome.kind).toBe("ok");
  });

  test("add succeeds on 2xx even when the body is empty", async () => {
    const { runner } = fakeRunner([
      {
        kind: "exited",
        exitCode: 0,
        stdout: Buffer.from("HTTP/2.0 200 OK\r\nServer: GitHub.com\r\n\r\n"),
        stderrTail: "",
      },
    ]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.addIssueLabels(REPO, 7, ["in-progress"]);
    expect(outcome.kind).toBe("ok");
  });

  test("a malformed HTTP envelope is an invalid-response failure", async () => {
    const { runner } = fakeRunner([
      { kind: "exited", exitCode: 0, stdout: Buffer.from("not-http"), stderrTail: "" },
    ]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.addIssueLabels(REPO, 7, ["in-progress"]);
    expect(outcome.kind).toBe("failure");
    if (outcome.kind === "failure") {
      expect(outcome.classification).toBe("invalid-response");
    }
  });

  // #2020: `gh api --include` prints one status line per hop, so a leading
  // 1xx (informational) or 3xx (redirect) line must not decide the outcome —
  // only the final status line does.
  test("a leading 1xx informational line is skipped; the final 2xx status succeeds", async () => {
    const { runner } = fakeRunner([
      {
        kind: "exited",
        exitCode: 0,
        stdout: Buffer.from(
          "HTTP/1.1 100 Continue\r\n\r\nHTTP/2.0 200 OK\r\nContent-Type: application/json\r\n\r\n[]\n",
        ),
        stderrTail: "",
      },
    ]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.addIssueLabels(REPO, 7, ["in-progress"]);
    expect(outcome.kind).toBe("ok");
  });

  test("a redirect chain's final status decides the outcome, not the first (3xx) line", async () => {
    const { runner } = fakeRunner([
      {
        kind: "exited",
        exitCode: 0,
        stdout: Buffer.from(
          "HTTP/2.0 301 Moved Permanently\r\nLocation: https://api.github.com/x\r\n\r\n" +
            "HTTP/2.0 200 OK\r\nContent-Type: application/json\r\n\r\n[]\n",
        ),
        stderrTail: "",
      },
    ]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.addIssueLabels(REPO, 7, ["in-progress"]);
    expect(outcome.kind).toBe("ok");
  });

  test("a 1xx line ahead of a genuinely bad final status still fails, classified on the final status", async () => {
    const { runner } = fakeRunner([
      {
        kind: "exited",
        exitCode: 1,
        stdout: Buffer.from(
          "HTTP/1.1 100 Continue\r\n\r\nHTTP/2.0 404 Not Found\r\nContent-Type: application/json\r\n\r\n{}\n",
        ),
        stderrTail: "",
      },
    ]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.addIssueLabels(REPO, 7, ["in-progress"]);
    expect(outcome.kind).toBe("failure");
  });

  test("only 1xx status lines observed (no final status) is an invalid-response failure", async () => {
    const { runner } = fakeRunner([
      {
        kind: "exited",
        exitCode: 0,
        stdout: Buffer.from("HTTP/1.1 100 Continue\r\n\r\n"),
        stderrTail: "",
      },
    ]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.addIssueLabels(REPO, 7, ["in-progress"]);
    expect(outcome.kind).toBe("failure");
    if (outcome.kind === "failure") {
      expect(outcome.classification).toBe("invalid-response");
    }
  });

  // #2020: isPullRequest — the advisory discrimination check runMirrorLabelSync
  // uses to avoid mislabelling a PR number picked up from the Project field.
  test("isPullRequest reports true when the remote issue carries a pull_request field", async () => {
    const { runner, argvs } = fakeRunner([
      envelope(200, JSON.stringify({ pull_request: { url: "https://api.github.com/x" } })),
    ]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.isPullRequest(REPO, 684);
    expect(outcome).toEqual({ kind: "ok", value: true });
    expect(argvs[0]).toEqual(viewArgv(REPO, 684));
  });

  test("isPullRequest reports false for a plain issue", async () => {
    const { runner } = fakeRunner([envelope(200, JSON.stringify({ title: "an issue" }))]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.isPullRequest(REPO, 697);
    expect(outcome).toEqual({ kind: "ok", value: false });
  });

  test("isPullRequest surfaces a transport failure as a typed failure (caller falls open)", async () => {
    const { runner } = fakeRunner([{ kind: "spawn-error" }]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.isPullRequest(REPO, 684);
    expect(outcome.kind).toBe("failure");
  });

  test("isPullRequest treats a body JSON.parse cannot decode as an invalid-response failure", async () => {
    // parseHttpEnvelope's own "single" opener check only requires the body to
    // START with `{`, so a truncated/malformed object still reaches
    // isPullRequest's own JSON.parse (as opposed to a body not starting with
    // `{`, which parseHttpEnvelope itself already rejects as malformed before
    // isPullRequest ever runs).
    const { runner } = fakeRunner([envelope(200, "{not valid json")]);
    const gateway = createMirrorLabelGateway(runner);
    const outcome = await gateway.isPullRequest(REPO, 684);
    expect(outcome.kind).toBe("failure");
    if (outcome.kind === "failure") {
      expect(outcome.classification).toBe("invalid-response");
    }
  });
});
