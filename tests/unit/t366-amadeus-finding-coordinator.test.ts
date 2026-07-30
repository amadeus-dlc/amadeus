// covers: function:fileAmadeusFinding
// size: small

import { describe, expect, test } from "bun:test";
import {
  fileAmadeusFinding,
  type FindingCoordinatorDependencies,
} from "../../packages/framework/core/tools/amadeus-finding.ts";
import type {
  GitHubGatewayOutcome,
  RemoteGitHubIssue,
} from "../../packages/framework/core/tools/amadeus-github-types.ts";

function ok<T>(value: T): GitHubGatewayOutcome<T> {
  return { kind: "ok", value };
}

const githubFailure: Extract<GitHubGatewayOutcome<unknown>, { kind: "failure" }> = {
  kind: "failure",
  classification: "api",
  summary: "GitHub request failed",
  retryable: false,
  effect: "no-effect-confirmed",
};

describe("fileAmadeusFinding", () => {
  test("invalid configuration fails closed without accessing GitHub", async () => {
    const unexpected = async (): Promise<never> => {
      throw new Error("GitHub must not be accessed");
    };
    const outcome = await fileAmadeusFinding(
      {
        projectDir: "/project",
        kind: "defect",
        title: "Finding",
        body: "Evidence",
        fingerprint: "invalid-config",
      },
      {
        resolveConfig: () => ({
          kind: "invalid",
          issues: [],
        }),
        gateway: {
          readiness: unexpected,
          findIssuesByMarker: unexpected,
          createFindingIssue: unexpected,
        },
      },
    );

    expect(outcome).toMatchObject({
      kind: "failure",
      reason: "invalid-config",
    });
  });

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
          autoFileFindings: mode,
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
    const issues: RemoteGitHubIssue[] = [];
    let createCalls = 0;
    let createLabels: readonly string[] = [];
    const dependencies: FindingCoordinatorDependencies = {
      resolveConfig: () => ({
        kind: "resolved",
        autoFileFindings: "auto",
      }),
      gateway: {
        readiness: async () => ok(undefined),
        findIssuesByMarker: async (_repository, marker) =>
          ok(issues.filter((issue) => issue.body.includes(marker))),
        createFindingIssue: async (_permit, input) => {
          createCalls += 1;
          createLabels = input.labels;
          const issue: RemoteGitHubIssue = {
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
      issueState: "OPEN",
    });
    expect(retried).toMatchObject({
      kind: "existing",
      issueNumber: 42,
      issueUrl: "https://github.com/amadeus-dlc/amadeus/issues/42",
      issueState: "OPEN",
    });
    expect(createCalls).toBe(1);
    expect(createLabels).toEqual(["bug"]);
  });

  test("a closed marker match is reported as CLOSED, never re-created", async () => {
    let createCalls = 0;
    const outcome = await fileAmadeusFinding(
      {
        projectDir: "/project",
        kind: "defect" as const,
        title: "Regression of a previously fixed defect",
        body: "The fixed symptom is observable again.",
        fingerprint: "tests:regression-fingerprint",
      },
      {
        resolveConfig: () => ({
          kind: "resolved",
          autoFileFindings: "auto",
        }),
        gateway: {
          readiness: async () => ok(undefined),
          findIssuesByMarker: async () =>
            ok([
              {
                repository: {
                  owner: "amadeus-dlc",
                  name: "amadeus",
                  canonical: "amadeus-dlc/amadeus",
                },
                number: 7,
                title: "Original defect",
                body: "<!-- marker -->",
                state: "CLOSED",
              },
            ] as const),
          createFindingIssue: async () => {
            createCalls += 1;
            throw new Error("a closed match must not trigger a create");
          },
        },
      },
    );

    // The protocol treats a CLOSED match as a possible regression to surface
    // to the human; the coordinator's job is to expose the state faithfully
    // while still never re-creating the fingerprint.
    expect(outcome).toMatchObject({
      kind: "existing",
      issueNumber: 7,
      issueState: "CLOSED",
    });
    expect(createCalls).toBe(0);
  });

  test("maps an actionable concern to the existing enhancement label", async () => {
    let createLabels: readonly string[] = [];
    const outcome = await fileAmadeusFinding(
      {
        projectDir: "/project",
        kind: "concern",
        title: "Finding",
        body: "Evidence",
        fingerprint: "concern-label",
      },
      {
        resolveConfig: () => ({
          kind: "resolved",
          autoFileFindings: "auto",
        }),
        gateway: {
          readiness: async () => ok(undefined),
          findIssuesByMarker: async () => ok([]),
          createFindingIssue: async (_permit, input) => {
            createLabels = input.labels;
            return ok({
              repository: {
                owner: "amadeus-dlc",
                name: "amadeus",
                canonical: "amadeus-dlc/amadeus",
              },
              number: 43,
              title: input.title,
              body: input.body,
              state: "OPEN",
            });
          },
        },
      },
    );

    expect(outcome.kind).toBe("created");
    expect(createLabels).toEqual(["enhancement"]);
  });

  test.each(["readiness", "search", "create"] as const)(
    "maps a %s failure to the typed GitHub outcome",
    async (failureAt) => {
      const outcome = await fileAmadeusFinding(
        {
          projectDir: "/project",
          kind: "defect",
          title: "Finding",
          body: "Evidence",
          fingerprint: `github-failure:${failureAt}`,
        },
        {
          resolveConfig: () => ({
            kind: "resolved",
            autoFileFindings: "auto",
          }),
          gateway: {
            readiness: async () =>
              failureAt === "readiness" ? githubFailure : ok(undefined),
            findIssuesByMarker: async () =>
              failureAt === "search" ? githubFailure : ok([]),
            createFindingIssue: async (_permit, input) =>
              failureAt === "create"
                ? githubFailure
                : ok({
                    repository: {
                      owner: "amadeus-dlc",
                      name: "amadeus",
                      canonical: "amadeus-dlc/amadeus",
                    },
                    number: 44,
                    title: input.title,
                    body: input.body,
                    state: "OPEN",
                  }),
          },
        },
      );

      expect(outcome).toMatchObject({
        kind: "failure",
        reason: "github",
      });
    },
  );

  test("auto mode fails closed when more than one issue has the marker", async () => {
    let createCalls = 0;
    const duplicate = (number: number): RemoteGitHubIssue => ({
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
          autoFileFindings: "auto",
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
