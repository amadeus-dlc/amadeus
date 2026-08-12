import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const CI_WORKFLOW_PATH = ".github/workflows/ci.yml";
const REFRESH_WORKFLOW_PATH = ".github/workflows/review-thread-resolution.yml";
const SHARED_CI_SHA = "9cf0e9a8cd74c72de704763025003ed3b7608c65";
const SHARED_WORKFLOW = `j5ik2o/ci/.github/workflows/review-thread-resolution.yml@${SHARED_CI_SHA}`;
const IGNORED_CURSOR_USAGE_LIMIT = "cursor\tBugbot couldn't run - usage limit reached";

interface WorkflowJob {
  readonly if?: string;
  readonly needs?: string | readonly string[];
  readonly permissions?: Readonly<Record<string, string>>;
  readonly steps?: readonly { readonly run?: string }[];
  readonly uses?: string;
  readonly with?: Readonly<Record<string, unknown>>;
}

interface Workflow {
  readonly on?: Readonly<Record<string, unknown>>;
  readonly concurrency?: { readonly group?: string; readonly "cancel-in-progress"?: boolean };
  readonly permissions?: Readonly<Record<string, string>>;
  readonly jobs?: Readonly<Record<string, WorkflowJob>>;
}

function parseWorkflow(path: string): Workflow {
  return Bun.YAML.parse(readFileSync(path, "utf8")) as Workflow;
}

describe("review-thread resolution CI gate", () => {
  // #2947: a bot review fires one event per comment (14 concurrent runs
  // measured on #2939), and every run holds a hosted-runner slot while it
  // waits for the PR's other checks — the waiters starve the CI they wait on.
  // The concurrency group collapses each PR's burst to one live run; schedule
  // and dispatch runs key on the event name so they never cancel a PR-scoped
  // refresh, and a PR refresh never cancels the recovery schedule.
  test("collapses per-PR event bursts under a concurrency group (#2947)", () => {
    const workflow = parseWorkflow(REFRESH_WORKFLOW_PATH);
    const group = workflow.concurrency?.group ?? "";

    expect(workflow.concurrency?.["cancel-in-progress"]).toBe(true);
    // Review events key on the PR, comment events on the issue, and the
    // schedule/dispatch fallback keys on the event name — in that order, so a
    // PR-scoped run never shares a group with the cron sweep.
    expect(group).toContain("github.event.pull_request.number");
    expect(group).toContain("github.event.issue.number");
    expect(group).toContain("github.event_name");
    expect(group.indexOf("github.event.pull_request.number")).toBeLessThan(
      group.indexOf("github.event.issue.number"),
    );
    expect(group.indexOf("github.event.issue.number")).toBeLessThan(
      group.indexOf("github.event_name"),
    );
  });

  test("refreshes the synthetic status after review activity and on a recovery schedule", () => {
    const workflow = parseWorkflow(REFRESH_WORKFLOW_PATH);
    const refresh = workflow.jobs?.refresh;

    expect(Object.keys(workflow.on ?? {}).sort()).toEqual([
      "issue_comment",
      "pull_request_review",
      "pull_request_review_comment",
      "schedule",
      "workflow_dispatch",
    ]);
    expect(workflow.on?.pull_request_review).toEqual({
      types: ["submitted", "edited", "dismissed"],
    });
    expect(workflow.on?.pull_request_review_comment).toEqual({
      types: ["created", "edited", "deleted"],
    });
    expect(workflow.on?.issue_comment).toEqual({
      types: ["created", "edited", "deleted"],
    });
    expect(workflow.on?.schedule).toEqual([{ cron: "*/15 * * * *" }]);
    expect(workflow.on?.workflow_dispatch).toEqual({
      inputs: {
        pr_number: {
          description: "PR number to refresh. Leave empty to refresh all open main PRs.",
          required: false,
          type: "string",
        },
        wait_for_other_checks: {
          description: "Wait for other PR checks before evaluating review threads.",
          required: false,
          default: "true",
          type: "choice",
          options: ["true", "false"],
        },
      },
    });
    expect(workflow.permissions).toEqual({
      contents: "read",
      checks: "write",
      issues: "read",
      "pull-requests": "read",
      statuses: "write",
    });
    expect(refresh?.uses).toBe(SHARED_WORKFLOW);
    expect(refresh?.with).toMatchObject({
      base_branch: "main",
      required_context: "Check unresolved comments",
      extra_ignored_auto_report_author_patterns: IGNORED_CURSOR_USAGE_LIMIT,
      ci_ref: SHARED_CI_SHA,
    });
  });

  test("fails pull-request CI and makes CI Success depend on the gate", () => {
    const workflow = parseWorkflow(CI_WORKFLOW_PATH);
    const gate = workflow.jobs?.["review-thread-resolution"];
    const ciSuccess = workflow.jobs?.["ci-success"];

    expect(gate?.if).toBe("github.event_name == 'pull_request'");
    expect(gate?.permissions).toEqual({
      contents: "read",
      checks: "write",
      issues: "read",
      "pull-requests": "read",
      statuses: "write",
    });
    expect(gate?.uses).toBe(SHARED_WORKFLOW);
    expect(gate?.with).toMatchObject({
      wait_for_other_checks: "false",
      base_branch: "main",
      required_context: "Check unresolved comments",
      extra_ignored_auto_report_author_patterns: IGNORED_CURSOR_USAGE_LIMIT,
      ci_ref: SHARED_CI_SHA,
    });
    expect(ciSuccess?.needs).toBeArray();
    expect(ciSuccess?.needs).toContain("review-thread-resolution");
    const ciSuccessScript = ciSuccess?.steps?.[0]?.run;
    expect(ciSuccessScript).toMatch(
      /if \[\[ "\$\{\{ github\.event_name \}\}" == "pull_request" \]\]/,
    );
    expect(ciSuccessScript).toMatch(
      /require_result "review-thread-resolution" "\$\{\{ needs\['review-thread-resolution'\]\.result \}\}"/,
    );
    expect(ciSuccessScript).toMatch(
      /elif \[\[ "\$\{\{ needs\['review-thread-resolution'\]\.result \}\}" != "skipped" \]\]/,
    );
    expect(ciSuccessScript).toContain("expected skipped");
  });
});
