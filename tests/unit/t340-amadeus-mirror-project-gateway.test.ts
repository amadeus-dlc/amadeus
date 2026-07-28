// t340 — C5 Project GraphQL family via a fake process runner: exact argv, the
// -f/-F variable split, envelope + body interpretation, response parsing,
// permit enforcement, and the absence of out-of-scope mutation paths.
// covers: packages/framework/core/tools/amadeus-mirror-gateway.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  createMirrorMutationPermit,
  createMirrorProjectMutationPermit,
} from "../../packages/framework/core/tools/amadeus-mirror-capability.ts";
import * as gateway from "../../packages/framework/core/tools/amadeus-mirror-gateway.ts";
import {
  ADD_PROJECT_ITEM_MUTATION,
  createMirrorGitHubGateway,
  graphqlArgv,
  interpretGraphqlResult,
  LIST_PROJECT_ITEMS_QUERY,
  parseHttpEnvelope,
  parseProjectItemsView,
  parseProjectStatusField,
  PROJECT_ITEMS_PER_PAGE,
  RESOLVE_PROJECT_STATUS_FIELD_QUERY,
  UPDATE_PROJECT_ITEM_STATUS_MUTATION,
} from "../../packages/framework/core/tools/amadeus-mirror-gateway.ts";
import type {
  MirrorProjectMutation,
  MirrorProjectMutationPermit,
  MirrorProjectRef,
  RemoteMirrorIssue,
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
const PROJECT: MirrorProjectRef = { owner: "amadeus-dlc", number: 5 };
// The real Project node id measured on the target board during the ruling probe.
const PROJECT_NODE_ID = "PVT_kwDOEcw2nM4BeiIO";
const ISSUE_NODE_ID = "I_kwDOEcw2nM6abcde";

const ISSUE: RemoteMirrorIssue = {
  repository: REPO,
  number: 42,
  title: "Mirror",
  body: "body",
  state: "OPEN",
};

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

// The `gh --include` envelope shape measured on gh 2.96.0: a bare-LF status line
// followed by CRLF headers, then the body with no trailing newline.
function envelope(status: number, body: unknown): Buffer {
  return Buffer.from(
    `HTTP/2.0 ${status} OK\n` +
      "content-type: application/json; charset=utf-8\r\n" +
      "\r\n" +
      JSON.stringify(body),
    "utf-8",
  );
}

function itemNode(
  overrides: Partial<{
    id: string;
    projectId: string;
    number: number;
    login: string;
    status: string | null;
    workflowStatus: string | null;
    phaseField: string;
  }> = {},
): unknown {
  const status = overrides.status === undefined ? "Ideation" : overrides.status;
  const workflowStatus =
    overrides.workflowStatus === undefined ? "In progress" : overrides.workflowStatus;
  const phaseField = overrides.phaseField ?? "Intent Phase";
  const fieldValues = [
    ...(status === null
      ? []
      : [{ name: status, field: { name: phaseField } }]),
    ...(workflowStatus === null
      ? []
      : [{ name: workflowStatus, field: { name: "Status" } }]),
  ];
  return {
    id: overrides.id ?? "PVTI_item1",
    project: {
      id: overrides.projectId ?? PROJECT_NODE_ID,
      number: overrides.number ?? 5,
      __typename: "Organization",
      owner: { __typename: "Organization", login: overrides.login ?? "amadeus-dlc" },
    },
    fieldValues: { nodes: [{}, ...fieldValues] },
  };
}

function itemsBody(nodes: unknown[]): unknown {
  return {
    data: {
      repository: {
        issue: { id: ISSUE_NODE_ID, projectItems: { nodes } },
      },
    },
  };
}

function statusFieldBody(options: unknown[]): unknown {
  return {
    data: {
      organization: {
        projectV2: {
          id: PROJECT_NODE_ID,
          intentPhase: { id: "PVTSSF_intent_phase", options },
          workflowStatus: {
            id: "PVTSSF_status",
            options: [
              { id: "opt-in-progress", name: "In progress" },
              { id: "opt-done", name: "Done" },
            ],
          },
        },
      },
    },
  };
}

function projectPermit(
  mutation: MirrorProjectMutation,
): MirrorProjectMutationPermit {
  return createMirrorProjectMutationPermit({
    event: {
      intentUuid: "u",
      boundary: { kind: "manual", instance: "m" },
      operation: "sync",
    },
    repository: REPO,
    mutation,
    project: PROJECT,
  });
}

describe("t340 graphqlArgv", () => {
  test("strings use -f and numbers use -F, after the query field", () => {
    expect(graphqlArgv("query{x}", { a: "one", b: 2 })).toEqual([
      "api",
      "graphql",
      "--include",
      "-f",
      "query=query{x}",
      "-f",
      "a=one",
      "-F",
      "b=2",
    ]);
  });

  test("a caller string that looks like a file reference stays a literal -f", () => {
    // -F would make gh read `@/etc/passwd` from disk; -f never does.
    const args = graphqlArgv("query{x}", { name: "@/etc/passwd" });
    expect(args).toContain("-f");
    expect(args).not.toContain("-F");
    expect(args[args.length - 2]).toBe("-f");
    expect(args[args.length - 1]).toBe("name=@/etc/passwd");
  });

  test("a caller string that looks numeric or boolean stays a literal -f", () => {
    for (const value of ["5", "true", "null"]) {
      const args = graphqlArgv("query{x}", { v: value });
      expect(args).not.toContain("-F");
      expect(args[args.length - 1]).toBe(`v=${value}`);
    }
  });

  test("no variables yields the query field alone", () => {
    expect(graphqlArgv("query{x}", {})).toEqual([
      "api",
      "graphql",
      "--include",
      "-f",
      "query=query{x}",
    ]);
  });
});

describe("t340 exact argv", () => {
  test("listProjectItems binds owner, name, issue number, and page size", async () => {
    const { runner, requests } = fakeRunner([
      exited(0, envelope(200, itemsBody([]))),
    ]);
    await createMirrorGitHubGateway(runner).listProjectItems(ISSUE);
    expect(requests).toHaveLength(1);
    expect(requests[0].executable).toBe("gh");
    expect(requests[0].args).toEqual([
      "api",
      "graphql",
      "--include",
      "-f",
      `query=${LIST_PROJECT_ITEMS_QUERY}`,
      "-f",
      "owner=amadeus-dlc",
      "-f",
      "name=amadeus",
      "-F",
      "number=42",
      "-F",
      `first=${PROJECT_ITEMS_PER_PAGE}`,
    ]);
  });

  test("resolveProjectStatusField binds the organization, number, and configured phase field", async () => {
    const { runner, requests } = fakeRunner([
      exited(0, envelope(200, statusFieldBody([]))),
    ]);
    await createMirrorGitHubGateway(runner).resolveProjectStatusField(
      PROJECT,
      "Lifecycle",
    );
    expect(requests[0].args).toEqual([
      "api",
      "graphql",
      "--include",
      "-f",
      `query=${RESOLVE_PROJECT_STATUS_FIELD_QUERY}`,
      "-f",
      "owner=amadeus-dlc",
      "-F",
      "number=5",
      "-f",
      "phaseField=Lifecycle",
    ]);
  });

  test("the Project resolution query is organization-scoped with no user fallback", () => {
    expect(RESOLVE_PROJECT_STATUS_FIELD_QUERY).toContain("organization(login:$owner)");
    expect(RESOLVE_PROJECT_STATUS_FIELD_QUERY).not.toContain("user(");
  });

  test("Project reads target Intent Phase and auxiliary Status fields", () => {
    expect(LIST_PROJECT_ITEMS_QUERY).toContain("fieldValues(first:");
    expect(RESOLVE_PROJECT_STATUS_FIELD_QUERY).toContain(
      "intentPhase:field(name:$phaseField)",
    );
    expect(RESOLVE_PROJECT_STATUS_FIELD_QUERY).toContain(
      'workflowStatus:field(name:"Status")',
    );
  });

  test("addProjectItem binds the project and issue node ids", async () => {
    const { runner, requests } = fakeRunner([
      exited(
        0,
        envelope(200, {
          data: { addProjectV2ItemById: { item: { id: "PVTI_new" } } },
        }),
      ),
    ]);
    await createMirrorGitHubGateway(runner).addProjectItem(
      projectPermit("add-project-item"),
      PROJECT_NODE_ID,
      ISSUE_NODE_ID,
    );
    expect(requests[0].args).toEqual([
      "api",
      "graphql",
      "--include",
      "-f",
      `query=${ADD_PROJECT_ITEM_MUTATION}`,
      "-f",
      `projectId=${PROJECT_NODE_ID}`,
      "-f",
      `contentId=${ISSUE_NODE_ID}`,
    ]);
  });

  test("updateProjectItemStatus binds every id as a literal string", async () => {
    const { runner, requests } = fakeRunner([
      exited(
        0,
        envelope(200, {
          data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: "PVTI_item1" } } },
        }),
      ),
    ]);
    await createMirrorGitHubGateway(runner).updateProjectItemStatus(
      projectPermit("update-project-item-status"),
      PROJECT_NODE_ID,
      "PVTI_item1",
      "PVTSSF_status",
      "opt-ideation",
    );
    expect(requests[0].args).toEqual([
      "api",
      "graphql",
      "--include",
      "-f",
      `query=${UPDATE_PROJECT_ITEM_STATUS_MUTATION}`,
      "-f",
      `projectId=${PROJECT_NODE_ID}`,
      "-f",
      "itemId=PVTI_item1",
      "-f",
      "fieldId=PVTSSF_status",
      "-f",
      "optionId=opt-ideation",
    ]);
  });
});

describe("t340 response parsing", () => {
  test("the membership query yields the issue node id and its items", async () => {
    const { runner } = fakeRunner([
      exited(0, envelope(200, itemsBody([itemNode()]))),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).listProjectItems(ISSUE);
    expect(outcome).toEqual({
      kind: "ok",
      value: {
        issueNodeId: ISSUE_NODE_ID,
        items: [
          {
            projectId: PROJECT_NODE_ID,
            projectNumber: 5,
            projectOwner: "amadeus-dlc",
            itemId: "PVTI_item1",
            currentStatus: "Ideation",
            workflowStatus: "In progress",
            fieldValues: {
              "Intent Phase": "Ideation",
              Status: "In progress",
            },
          },
        ],
      },
    });
  });

  test("an item with no Intent Phase value reports a null current phase", () => {
    const parsed = parseProjectItemsView(
      (itemsBody([itemNode({ status: null })]) as { data: Record<string, unknown> }).data,
    );
    expect(parsed?.items[0].currentStatus).toBeNull();
  });

  test("membership parsing preserves a custom phase field value", () => {
    const parsed = parseProjectItemsView(
      (itemsBody([itemNode({ phaseField: "Lifecycle" })]) as {
        data: Record<string, unknown>;
      }).data,
    );
    expect(parsed?.items[0].fieldValues?.Lifecycle).toBe("Ideation");
  });

  test("an empty membership list still yields the issue node id", () => {
    const parsed = parseProjectItemsView(
      (itemsBody([]) as { data: Record<string, unknown> }).data,
    );
    expect(parsed).toEqual({ issueNodeId: ISSUE_NODE_ID, items: [] });
  });

  test.each([
    ["a null issue", { repository: { issue: null } }],
    ["a missing repository", {}],
    ["an issue without a node id", { repository: { issue: { id: "", projectItems: { nodes: [] } } } }],
    ["non-array nodes", { repository: { issue: { id: "I_x", projectItems: { nodes: {} } } } }],
  ])("rejects %s", (_label, data) => {
    expect(parseProjectItemsView(data as Record<string, unknown>)).toBeNull();
  });

  test("a non-integer project number is rejected", () => {
    const data = (itemsBody([itemNode({ number: 1.5 })]) as {
      data: Record<string, unknown>;
    }).data;
    expect(parseProjectItemsView(data)).toBeNull();
  });

  test("an item node missing its project identity is rejected outright", () => {
    const data = (itemsBody([{ id: "PVTI_x", project: null }]) as {
      data: Record<string, unknown>;
    }).data;
    expect(parseProjectItemsView(data)).toBeNull();
  });

  test("the field query yields Intent Phase and auxiliary Status metadata", () => {
    const parsed = parseProjectStatusField(
      (statusFieldBody([
        { id: "opt-a", name: "Ideation" },
        { id: "opt-b", name: "Done" },
      ]) as { data: Record<string, unknown> }).data,
    );
    expect(parsed).toEqual({
      projectId: PROJECT_NODE_ID,
      fieldId: "PVTSSF_intent_phase",
      options: [
        { id: "opt-a", name: "Ideation" },
        { id: "opt-b", name: "Done" },
      ],
      workflowStatusField: {
        fieldId: "PVTSSF_status",
        options: [
          { id: "opt-in-progress", name: "In progress" },
          { id: "opt-done", name: "Done" },
        ],
      },
    });
  });

  test("an invalid auxiliary Status field does not invalidate Intent Phase", () => {
    const data = (statusFieldBody([]) as { data: Record<string, unknown> }).data;
    const organization = data.organization as {
      projectV2: Record<string, unknown>;
    };
    organization.projectV2.workflowStatus = { id: "not-single-select" };

    expect(parseProjectStatusField(data)).toEqual({
      projectId: PROJECT_NODE_ID,
      fieldId: "PVTSSF_intent_phase",
      options: [],
      workflowStatusField: null,
    });
  });

  test.each([
    ["an unresolved organization", { organization: null }],
    ["an unresolved project", { organization: { projectV2: null } }],
    [
      "an absent Intent Phase field",
      { organization: { projectV2: { id: PROJECT_NODE_ID, intentPhase: null } } },
    ],
    [
      "an Intent Phase field that is not single-select",
      {
        organization: {
          projectV2: { id: PROJECT_NODE_ID, intentPhase: { id: "F" } },
        },
      },
    ],
  ])("rejects %s", (_label, data) => {
    expect(parseProjectStatusField(data as Record<string, unknown>)).toBeNull();
  });

  test("a mutation response without the expected node is an invalid response", async () => {
    const { runner } = fakeRunner([
      exited(0, envelope(200, { data: { addProjectV2ItemById: null } })),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).addProjectItem(
      projectPermit("add-project-item"),
      PROJECT_NODE_ID,
      ISSUE_NODE_ID,
    );
    expect(outcome.kind).toBe("failure");
    if (outcome.kind === "failure") {
      expect(outcome.classification).toBe("invalid-response");
      expect(outcome.effect).toBe("outcome-unknown");
    }
  });
});

describe("t340 interpretGraphqlResult", () => {
  function parsed(body: unknown) {
    return parseHttpEnvelope(envelope(200, body), "single");
  }

  test("a body with data and no errors is ok", () => {
    expect(interpretGraphqlResult(parsed({ data: { x: 1 } }))).toEqual({
      kind: "ok",
      data: { x: 1 },
    });
  });

  test.each([
    ["RATE_LIMITED", "rate-limit", true],
    ["FORBIDDEN", "permission", false],
    ["INSUFFICIENT_SCOPES", "permission", false],
    ["UNAUTHORIZED", "unauthenticated", false],
    ["SERVICE_UNAVAILABLE", "api", true],
    ["INTERNAL", "api", true],
    ["NOT_FOUND", "api", false],
  ] as ReadonlyArray<[string, string, boolean]>)(
    "maps error type %s to %s",
    (type, classification, retryable) => {
      expect(
        interpretGraphqlResult(parsed({ data: null, errors: [{ type }] })),
      ).toEqual({
        kind: "errors",
        classification: classification as "api",
        retryable,
      });
    },
  );

  test("an unrecognised error type falls back to a non-retryable api class", () => {
    expect(
      interpretGraphqlResult(parsed({ errors: [{ type: "SOMETHING_NEW" }] })),
    ).toEqual({ kind: "errors", classification: "api", retryable: false });
  });

  test("an error with no type at all falls back to the same conservative class", () => {
    expect(
      interpretGraphqlResult(parsed({ errors: [{ message: "boom" }] })),
    ).toEqual({ kind: "errors", classification: "api", retryable: false });
  });

  test("a retryable error wins over a terminal one in a mixed batch", () => {
    expect(
      interpretGraphqlResult(
        parsed({ errors: [{ type: "NOT_FOUND" }, { type: "RATE_LIMITED" }] }),
      ),
    ).toEqual({ kind: "errors", classification: "rate-limit", retryable: true });
  });

  test("an empty errors array is not a failure", () => {
    expect(interpretGraphqlResult(parsed({ data: {}, errors: [] }))).toEqual({
      kind: "ok",
      data: {},
    });
  });

  test.each([
    ["a body that is not an object", parsed([1, 2])],
    ["a body with no data key", parsed({ ok: true })],
    ["a body whose data is null", parsed({ data: null })],
  ])("reports %s as malformed", (_label, envelopeParse) => {
    expect(interpretGraphqlResult(envelopeParse).kind).toBe("malformed");
  });

  test("a body that is not valid JSON is malformed", () => {
    expect(
      interpretGraphqlResult({
        kind: "ok",
        statuses: [200],
        jsonText: '{"data":}',
      }).kind,
    ).toBe("malformed");
  });

  test("a top-level array body is malformed even when the envelope parsed", () => {
    expect(
      interpretGraphqlResult({ kind: "ok", statuses: [200], jsonText: "[1,2]" }).kind,
    ).toBe("malformed");
  });

  test("a gateway call over an unparseable body reports an invalid response", async () => {
    const { runner } = fakeRunner([
      exited(0, Buffer.from(`${"HTTP/2.0 200 OK\n"}\r\n{"data":}`, "utf-8")),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).listProjectItems(ISSUE);
    expect(outcome.kind).toBe("failure");
    if (outcome.kind === "failure") {
      expect(outcome.classification).toBe("invalid-response");
    }
  });

  test("a non-ok envelope is malformed without inspecting a body", () => {
    expect(interpretGraphqlResult({ kind: "malformed" }).kind).toBe("malformed");
    expect(
      interpretGraphqlResult({ kind: "http-error", status: 500 }).kind,
    ).toBe("malformed");
  });

  test("GraphQL errors reaching the gateway carry no remote text in the summary", async () => {
    const { runner } = fakeRunner([
      exited(
        0,
        envelope(200, {
          data: null,
          errors: [{ type: "FORBIDDEN", message: "ghp_secretTokenLeak" }],
        }),
      ),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).listProjectItems(ISSUE);
    expect(outcome.kind).toBe("failure");
    if (outcome.kind === "failure") {
      expect(outcome.classification).toBe("permission");
      expect(outcome.summary).not.toContain("ghp_secretTokenLeak");
      expect(outcome.summary).toBe(
        "GitHub unavailable (permission; no-effect-confirmed; exit=0; http=none)",
      );
    }
  });

  test("an HTTP-level failure classifies from the status, not the body", async () => {
    const { runner } = fakeRunner([exited(0, envelope(429, { data: null }))]);
    const outcome = await createMirrorGitHubGateway(runner).listProjectItems(ISSUE);
    expect(outcome.kind).toBe("failure");
    if (outcome.kind === "failure") {
      expect(outcome.classification).toBe("rate-limit");
      expect(outcome.retryable).toBe(true);
    }
  });

  test("a mutation that failed to spawn reports not-started", async () => {
    const { runner } = fakeRunner([{ kind: "spawn-error" }]);
    const outcome = await createMirrorGitHubGateway(runner).updateProjectItemStatus(
      projectPermit("update-project-item-status"),
      PROJECT_NODE_ID,
      "PVTI_item1",
      "PVTSSF_status",
      "opt-a",
    );
    expect(outcome.kind).toBe("failure");
    if (outcome.kind === "failure") {
      expect(outcome.classification).toBe("not-installed");
      expect(outcome.effect).toBe("not-started");
    }
  });

  test("a transport failure on a mutation leaves the outcome unknown", async () => {
    const { runner } = fakeRunner([
      exited(1, Buffer.from("boom", "utf-8"), "dial tcp: i/o timeout"),
    ]);
    const outcome = await createMirrorGitHubGateway(runner).addProjectItem(
      projectPermit("add-project-item"),
      PROJECT_NODE_ID,
      ISSUE_NODE_ID,
    );
    expect(outcome.kind).toBe("failure");
    if (outcome.kind === "failure") {
      expect(outcome.classification).toBe("network");
      expect(outcome.effect).toBe("outcome-unknown");
    }
  });
});

describe("t340 permit enforcement", () => {
  test("a forged Project permit is rejected before any process starts", async () => {
    const { runner, requests } = fakeRunner([]);
    const forged = {
      event: {
        intentUuid: "u",
        boundary: { kind: "manual", instance: "m" },
        operation: "sync",
      },
      repository: REPO,
      mutation: "add-project-item",
      project: PROJECT,
    } as unknown as MirrorProjectMutationPermit;
    await expect(
      createMirrorGitHubGateway(runner).addProjectItem(
        forged,
        PROJECT_NODE_ID,
        ISSUE_NODE_ID,
      ),
    ).rejects.toThrow("rejected Project mutation permit");
    expect(requests).toHaveLength(0);
  });

  test("a permit bound to the other Project mutation is rejected", async () => {
    const { runner, requests } = fakeRunner([]);
    await expect(
      createMirrorGitHubGateway(runner).addProjectItem(
        projectPermit("update-project-item-status"),
        PROJECT_NODE_ID,
        ISSUE_NODE_ID,
      ),
    ).rejects.toThrow("rejected Project mutation permit");
    expect(requests).toHaveLength(0);
  });

  test("an Issue permit cannot authorize a Project mutation", async () => {
    const { runner, requests } = fakeRunner([]);
    const issuePermit = createMirrorMutationPermit({
      event: {
        intentUuid: "u",
        boundary: { kind: "manual", instance: "m" },
        operation: "sync",
      },
      repository: REPO,
      operation: "sync",
      issueNumber: 42,
    });
    await expect(
      createMirrorGitHubGateway(runner).addProjectItem(
        issuePermit as unknown as MirrorProjectMutationPermit,
        PROJECT_NODE_ID,
        ISSUE_NODE_ID,
      ),
    ).rejects.toThrow("rejected Project mutation permit");
    expect(requests).toHaveLength(0);
  });

  test("the two read methods take no permit and spawn a read-only profile", async () => {
    const { runner, requests } = fakeRunner([
      exited(0, envelope(200, itemsBody([]))),
      exited(0, envelope(200, statusFieldBody([]))),
    ]);
    const gh = createMirrorGitHubGateway(runner);
    await gh.listProjectItems(ISSUE);
    await gh.resolveProjectStatusField(PROJECT, "Intent Phase");
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request.args).not.toContain("--method");
      expect(request.args.some((arg) => arg.startsWith("query=mutation"))).toBe(
        false,
      );
    }
  });
});

// BR-U1-10: the gateway offers no path to remove, archive, or otherwise reach
// beyond adding an Issue to a board and setting its Status. This asserts over
// every exported argv builder and every embedded query, so a future builder that
// reintroduces one of these verbs fails here rather than in review.
describe("t340 out-of-scope mutations are absent", () => {
  const FORBIDDEN_VERBS: string[] = [
    "deleteProjectV2Item",
    "archiveProjectV2Item",
    "unarchiveProjectV2Item",
    "deleteProjectV2",
    "mergePullRequest",
    "createPullRequest",
    "closePullRequest",
    "createRelease",
    "updateRelease",
    "createDeployment",
    "pulls/",
    "releases",
    "deployments",
    "/merge",
  ];

  function allArgvStrings(): string[] {
    const strings: string[] = [];
    for (const key of Object.keys(gateway)) {
      const value = (gateway as Record<string, unknown>)[key];
      if (typeof value === "string") strings.push(value);
    }
    strings.push(...gateway.listProjectItemsArgv(ISSUE));
    strings.push(
      ...gateway.resolveProjectStatusFieldArgv(PROJECT, "Intent Phase"),
    );
    strings.push(...gateway.addProjectItemArgv(PROJECT_NODE_ID, ISSUE_NODE_ID));
    strings.push(
      ...gateway.updateProjectItemStatusArgv(
        PROJECT_NODE_ID,
        "PVTI_item1",
        "PVTSSF_status",
        "opt-a",
      ),
    );
    return strings;
  }

  test("the enumerated surface is non-empty, so the scan cannot pass vacuously", () => {
    const strings = allArgvStrings();
    expect(strings.length).toBeGreaterThan(20);
    expect(strings.join("\n")).toContain("addProjectV2ItemById");
    expect(strings.join("\n")).toContain("updateProjectV2ItemFieldValue");
  });

  test.each(FORBIDDEN_VERBS)("no argv or query mentions %s", (verb) => {
    const haystack = allArgvStrings().join("\n");
    expect(haystack).not.toContain(verb);
  });

  test("the only exported Project mutations are add and update", () => {
    const mutationQueries = Object.keys(gateway).filter((key) => {
      const value = (gateway as Record<string, unknown>)[key];
      return typeof value === "string" && value.startsWith("mutation(");
    });
    expect(mutationQueries.sort()).toEqual([
      "ADD_PROJECT_ITEM_MUTATION",
      "UPDATE_PROJECT_ITEM_STATUS_MUTATION",
    ]);
  });
});
