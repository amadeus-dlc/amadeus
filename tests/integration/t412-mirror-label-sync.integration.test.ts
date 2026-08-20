// t412 — Intent Mirror in-progress label sync (#1990): boundary wiring over a
// real record on disk. The start boundary labels related + mirror issues, the
// completion boundary unlabels them, and a suppressed mirror stays silent.
// covers: packages/framework/core/tools/amadeus-mirror-lifecycle.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { MirrorLabelGateway } from "../../packages/framework/core/tools/amadeus-mirror-labels.ts";
import { runMirrorLifecycleBoundary } from "../../packages/framework/core/tools/amadeus-mirror-lifecycle.ts";
import type { MirrorBoundary } from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import {
  createProjectFixture,
  type FixtureOptions,
  INTENT_DIR,
  ISSUE,
  linkedState,
  NOW,
  markerBody,
  ProjectGateway,
  REPO,
} from "./t346-amadeus-mirror-lifecycle-projects.fixture.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

type LabelCall = { op: "add" | "remove"; issue: number; label: string };

function fakeLabelGateway(
  prNumbers: ReadonlySet<number> = new Set(),
): { gateway: MirrorLabelGateway; calls: LabelCall[] } {
  const calls: LabelCall[] = [];
  return {
    calls,
    gateway: {
      async addIssueLabels(_repo, issueNumber, labels) {
        for (const label of labels) calls.push({ op: "add", issue: issueNumber, label });
        return { kind: "ok", value: undefined };
      },
      async removeIssueLabel(_repo, issueNumber, label) {
        calls.push({ op: "remove", issue: issueNumber, label });
        return { kind: "ok", value: undefined };
      },
      async isPullRequest(_repo, issueNumber) {
        return { kind: "ok", value: prNumbers.has(issueNumber) };
      },
    },
  };
}

// The shared fixture pins `- **Project**: Project status sync`; rewrite it so
// the intent declares related issues the way real records do.
function fixtureWithRefs(options: FixtureOptions = {}) {
  const fx = createProjectFixture(options);
  roots.push(fx.root);
  const statePath = join(
    fx.root,
    "amadeus",
    "spaces",
    fx.space,
    "intents",
    INTENT_DIR,
    "amadeus-state.md",
  );
  const state = readFileSync(statePath, "utf-8");
  writeFileSync(
    statePath,
    state.replace(
      "- **Project**: Project status sync",
      "- **Project**: GitHub issue #684 (and #688)",
    ),
  );
  return fx;
}

function boundaryRequest(fx: ReturnType<typeof createProjectFixture>, boundary: MirrorBoundary) {
  return {
    projectDir: fx.root,
    space: fx.space,
    intentDir: INTENT_DIR,
    repository: REPO,
    boundary,
  };
}

describe("mirror boundary label sync wiring", () => {
  test("intent-initialized labels related issues and the created mirror issue", async () => {
    const fx = fixtureWithRefs();
    const gateway = new ProjectGateway(markerBody());
    const labels = fakeLabelGateway();
    const outcome = await runMirrorLifecycleBoundary(
      boundaryRequest(fx, { kind: "intent-initialized", instance: "b-1" }),
      {
        gateway,
        ports: fx.ports,
        now: () => NOW,
        newOperationId: () => "op-1",
        labelGateway: labels.gateway,
      },
    );
    expect(outcome.kind).toBe("ok");
    expect(labels.calls).toEqual([
      { op: "add", issue: 684, label: "in-progress" },
      { op: "add", issue: 688, label: "in-progress" },
      { op: "add", issue: ISSUE, label: "in-progress" },
    ]);
  });

  // #2020: a `#N` reference in the Project field can be a PR number appended
  // after the intent's issue was approved. Confirm the wiring end-to-end:
  // the gateway's isPullRequest check keeps a confirmed PR out of the add plan.
  test("intent-initialized skips a Project reference the gateway confirms is a pull request", async () => {
    const fx = fixtureWithRefs();
    const gateway = new ProjectGateway(markerBody());
    const labels = fakeLabelGateway(new Set([688]));
    const outcome = await runMirrorLifecycleBoundary(
      boundaryRequest(fx, { kind: "intent-initialized", instance: "b-1" }),
      {
        gateway,
        ports: fx.ports,
        now: () => NOW,
        newOperationId: () => "op-1",
        labelGateway: labels.gateway,
      },
    );
    expect(outcome.kind).toBe("ok");
    expect(labels.calls).toEqual([
      { op: "add", issue: 684, label: "in-progress" },
      { op: "add", issue: ISSUE, label: "in-progress" },
    ]);
  });

  test("workflow-completed removes the label from related and mirror issues", async () => {
    const fx = fixtureWithRefs({
      lifecyclePhase: "CONSTRUCTION",
      completionInstance: "wc-1",
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());
    const labels = fakeLabelGateway();
    const outcome = await runMirrorLifecycleBoundary(
      boundaryRequest(fx, { kind: "workflow-completed", instance: "wc-1" }),
      {
        gateway,
        ports: fx.ports,
        now: () => NOW,
        newOperationId: () => "op-1",
        labelGateway: labels.gateway,
      },
    );
    expect(outcome.kind).toBe("ok");
    expect(labels.calls.map((c) => ({ op: c.op, issue: c.issue }))).toEqual([
      { op: "remove", issue: 684 },
      { op: "remove", issue: 688 },
      { op: "remove", issue: ISSUE },
    ]);
  });

  test("a suppressed mirror (intent-mirror.github.issue.mode off) performs no label operations", async () => {
    const fx = fixtureWithRefs({ mode: "off" });
    const gateway = new ProjectGateway(markerBody());
    const labels = fakeLabelGateway();
    const outcome = await runMirrorLifecycleBoundary(
      boundaryRequest(fx, { kind: "intent-initialized", instance: "b-2" }),
      {
        gateway,
        ports: fx.ports,
        now: () => NOW,
        newOperationId: () => "op-1",
        labelGateway: labels.gateway,
      },
    );
    expect(outcome.kind).toBe("ok");
    expect(labels.calls).toEqual([]);
  });

  test("label failures warn on stderr and never change the boundary outcome", async () => {
    const fx = fixtureWithRefs();
    const gateway = new ProjectGateway(markerBody());
    const failing: MirrorLabelGateway = {
      async addIssueLabels() {
        return {
          kind: "failure",
          classification: "network",
          summary: "gh down",
          retryable: true,
          effect: "not-started",
        };
      },
      async removeIssueLabel() {
        return {
          kind: "failure",
          classification: "network",
          summary: "gh down",
          retryable: true,
          effect: "not-started",
        };
      },
      async isPullRequest() {
        return { kind: "ok", value: false };
      },
    };
    const outcome = await runMirrorLifecycleBoundary(
      boundaryRequest(fx, { kind: "intent-initialized", instance: "b-3" }),
      {
        gateway,
        ports: fx.ports,
        now: () => NOW,
        newOperationId: () => "op-1",
        labelGateway: failing,
      },
    );
    expect(outcome.kind).toBe("ok");
  });

  test("a label gateway that throws is contained by the fail-open catch", async () => {
    const fx = fixtureWithRefs();
    const gateway = new ProjectGateway(markerBody());
    const throwing: MirrorLabelGateway = {
      async addIssueLabels() {
        throw new Error("label gateway exploded");
      },
      async removeIssueLabel() {
        throw new Error("label gateway exploded");
      },
      async isPullRequest() {
        return { kind: "ok", value: false };
      },
    };
    const outcome = await runMirrorLifecycleBoundary(
      boundaryRequest(fx, { kind: "intent-initialized", instance: "b-4" }),
      {
        gateway,
        ports: fx.ports,
        now: () => NOW,
        newOperationId: () => "op-1",
        labelGateway: throwing,
      },
    );
    expect(outcome.kind).toBe("ok");
  });

  test("phase-verified boundaries stay label-silent", async () => {
    const fx = fixtureWithRefs({ state: linkedState() });
    const gateway = new ProjectGateway(markerBody());
    const labels = fakeLabelGateway();
    await runMirrorLifecycleBoundary(
      boundaryRequest(fx, { kind: "phase-verified", phase: "ideation", instance: "p-1" }),
      {
        gateway,
        ports: fx.ports,
        now: () => NOW,
        newOperationId: () => "op-1",
        labelGateway: labels.gateway,
      },
    );
    expect(labels.calls).toEqual([]);
  });
});
