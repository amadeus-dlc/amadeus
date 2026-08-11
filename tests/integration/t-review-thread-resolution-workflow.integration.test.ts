import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const CI_WORKFLOW_PATH = ".github/workflows/ci.yml";
const REFRESH_WORKFLOW_PATH = ".github/workflows/review-thread-resolution.yml";
const SHARED_CI_SHA = "9cf0e9a8cd74c72de704763025003ed3b7608c65";
const SHARED_WORKFLOW = `j5ik2o/ci/.github/workflows/review-thread-resolution.yml@${SHARED_CI_SHA}`;

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
  readonly permissions?: Readonly<Record<string, string>>;
  readonly jobs?: Readonly<Record<string, WorkflowJob>>;
}

function parseWorkflow(path: string): Workflow {
  return Bun.YAML.parse(readFileSync(path, "utf8")) as Workflow;
}

describe("review-thread resolution CI gate", () => {
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
    expect(workflow.on?.schedule).toEqual([{ cron: "*/15 * * * *" }]);
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
      ci_ref: SHARED_CI_SHA,
    });
    expect(ciSuccess?.needs).toBeArray();
    expect(ciSuccess?.needs).toContain("review-thread-resolution");
    expect(ciSuccess?.steps?.[0]?.run).toContain("needs['review-thread-resolution'].result");
  });
});
