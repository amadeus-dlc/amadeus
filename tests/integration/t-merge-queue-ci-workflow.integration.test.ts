import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const WORKFLOW_PATH = ".github/workflows/ci.yml";

interface WorkflowStep {
  readonly name?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly run?: string;
}

interface WorkflowJob {
  readonly if?: string;
  readonly steps?: readonly WorkflowStep[];
}

interface Workflow {
  readonly on?: Readonly<Record<string, unknown>>;
  readonly jobs?: Readonly<Record<string, WorkflowJob>>;
}

function step(job: WorkflowJob | undefined, name: string): WorkflowStep | undefined {
  return job?.steps?.find((candidate) => candidate.name === name);
}

describe("merge queue CI contract", () => {
  const workflow = Bun.YAML.parse(readFileSync(WORKFLOW_PATH, "utf8")) as Workflow;

  test("requests required checks for merge groups", () => {
    expect(workflow.on?.merge_group).toEqual({ types: ["checks_requested"] });
  });

  test("detects the queued change set from trusted merge-group SHAs", () => {
    const detect = step(workflow.jobs?.changes, "Detect CI-relevant changes");

    expect(detect?.env?.BASE_SHA).toContain("github.event.merge_group.base_sha");
    expect(detect?.env?.HEAD_SHA).toContain("github.event.merge_group.head_sha");
    expect(detect?.run).toContain('if [[ "${EVENT_NAME}" == "pull_request" || "${EVENT_NAME}" == "merge_group" ]]');
  });

  test("uses the merge-group base for the no-silent-drop ratchet", () => {
    const guard = step(workflow.jobs?.lint, "No silent drop (trusted base ratchet)");

    expect(guard?.env?.MERGE_GROUP_BASE_SHA).toBe("${{ github.event.merge_group.base_sha }}");
    expect(guard?.run).toContain('merge_group) BASE_REVISION="${MERGE_GROUP_BASE_SHA}" ;;');
  });

  test("keeps PR-only review evaluation and push-only metrics publication isolated", () => {
    expect(workflow.jobs?.["review-thread-resolution"]?.if).toBe("github.event_name == 'pull_request'");
    expect(workflow.jobs?.["metrics-snapshot"]?.if).toContain("github.event_name == 'push'");

    const ciSuccess = step(workflow.jobs?.["ci-success"], "All checks passed");
    expect(ciSuccess?.run).toContain('if [[ "${{ github.event_name }}" == "pull_request" ]]');
    expect(ciSuccess?.run).toContain("expected skipped");
  });
});
