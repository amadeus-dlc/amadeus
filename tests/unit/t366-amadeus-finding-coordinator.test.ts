// covers: function:fileAmadeusFinding
// size: small

import { describe, expect, test } from "bun:test";
import {
  fileAmadeusFinding,
  type FindingCoordinatorDependencies,
} from "../../packages/framework/core/tools/amadeus-finding.ts";
import type {
  GatewayOutcome,
  RemoteMirrorIssue,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

function ok<T>(value: T): GatewayOutcome<T> {
  return { kind: "ok", value };
}

describe("fileAmadeusFinding", () => {
  test.each([
    ["off", "disabled"],
    ["prompt", "approval-required"],
  ] as const)("%s mode does not access GitHub without approval", async (mode, expected) => {
    const unexpected = async (): Promise<never> => {
      throw new Error("GitHub must not be accessed");
    };
    const outcome = await fileAmadeusFinding(
      {
        projectDir: "/project",
        kind: "concern",
        title: "Finding",
        body: "Evidence",
        fingerprint: `mode:${mode}`,
      },
      {
        resolveConfig: () => ({
          kind: "resolved",
          config: {
            autoMirror: "prompt",
            projects: [],
            autoSoloElection: false,
            autoFileFindings: mode,
          },
          sources: ["/project/amadeus/config.json"],
        }),
        gateway: {
          readiness: unexpected,
          findIssuesByMarker: unexpected,
          createFindingIssue: unexpected,
        },
      },
    );

    expect(outcome.kind).toBe(expected);
  });

  test("auto mode creates once and reuses the marker match on retry", async () => {
    const issues: RemoteMirrorIssue[] = [];
    let createCalls = 0;
    const dependencies: FindingCoordinatorDependencies = {
      resolveConfig: () => ({
        kind: "resolved",
        config: {
          autoMirror: "prompt",
          projects: [],
          autoSoloElection: false,
          autoFileFindings: "auto",
        },
        sources: ["/project/amadeus/config.json"],
      }),
      gateway: {
        readiness: async () => ok(undefined),
        findIssuesByMarker: async (_repository, marker) =>
          ok(issues.filter((issue) => issue.body.includes(marker))),
        createFindingIssue: async (_permit, input) => {
          createCalls += 1;
          const issue: RemoteMirrorIssue = {
            repository: {
              owner: "amadeus-dlc",
              name: "amadeus",
              canonical: "amadeus-dlc/amadeus",
            },
            number: 42,
            title: input.title,
            body: input.body,
            state: "OPEN",
          };
          issues.push(issue);
          return ok(issue);
        },
      },
    };
    const input = {
      projectDir: "/project",
      kind: "defect" as const,
      title: "Default test parallelism is documented incorrectly",
      body: "The public runner and the guide disagree.",
      fingerprint: "tests:default-parallelism-doc-drift",
    };

    const created = await fileAmadeusFinding(input, dependencies);
    const retried = await fileAmadeusFinding(input, dependencies);

    expect(created).toMatchObject({
      kind: "created",
      issueNumber: 42,
      issueUrl: "https://github.com/amadeus-dlc/amadeus/issues/42",
    });
    expect(retried).toMatchObject({
      kind: "existing",
      issueNumber: 42,
      issueUrl: "https://github.com/amadeus-dlc/amadeus/issues/42",
    });
    expect(createCalls).toBe(1);
  });

  test("auto mode fails closed when more than one issue has the marker", async () => {
    let createCalls = 0;
    const duplicate = (number: number): RemoteMirrorIssue => ({
      repository: {
        owner: "amadeus-dlc",
        name: "amadeus",
        canonical: "amadeus-dlc/amadeus",
      },
      number,
      title: "Duplicate",
      body: "marker is filtered by the fake gateway",
      state: "OPEN",
    });
    const outcome = await fileAmadeusFinding(
      {
        projectDir: "/project",
        kind: "defect",
        title: "Finding",
        body: "Evidence",
        fingerprint: "duplicate-marker",
      },
      {
        resolveConfig: () => ({
          kind: "resolved",
          config: {
            autoMirror: "prompt",
            projects: [],
            autoSoloElection: false,
            autoFileFindings: "auto",
          },
          sources: ["/project/amadeus/config.json"],
        }),
        gateway: {
          readiness: async () => ok(undefined),
          findIssuesByMarker: async () => ok([duplicate(41), duplicate(42)]),
          createFindingIssue: async () => {
            createCalls += 1;
            return ok(duplicate(43));
          },
        },
      },
    );

    expect(outcome).toMatchObject({
      kind: "failure",
      reason: "ambiguous-marker",
    });
    expect(createCalls).toBe(0);
  });
});
