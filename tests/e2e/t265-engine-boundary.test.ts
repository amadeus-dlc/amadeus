import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { amadeusToolTarget } from "../harness/cli-target.ts";
import {
  EMPTY_MIRROR_STATE,
  renderMirrorStateBlock,
} from "../../dist/claude/.claude/tools/amadeus-mirror-state-codec.ts";
import { renderMirrorMarker } from "../../dist/claude/.claude/tools/amadeus-mirror-provenance.ts";
import { runMirrorLifecycleBoundary } from "../../packages/framework/core/tools/amadeus-mirror-lifecycle.ts";
import type {
  GatewayOutcome,
  MirrorGitHubGateway,
  MirrorMutationPermit,
  RemoteMirrorIssue,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import {
  cleanupTestProject,
  createTestProject,
  DEFAULT_INTENT_UUID,
  DEFAULT_RECORD_DIR,
  FIXTURES_DIR,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const ROOT = join(import.meta.dir, "..", "..");
const CORE_ENGINE = readFileSync(
  join(ROOT, "packages/framework/core/tools/amadeus-orchestrate.ts"),
  "utf-8",
);
const CORE_STATE = readFileSync(
  join(ROOT, "packages/framework/core/tools/amadeus-state.ts"),
  "utf-8",
);
const harnesses = [
  ["claude", ".claude"],
  ["codex", ".codex"],
  ["cursor", ".cursor"],
  ["kiro", ".kiro"],
  ["kiro-ide", ".kiro"],
  ["opencode", ".opencode"],
] as const;
const CLAUDE_ENGINE = join(
  ROOT,
  "dist/claude/.claude/tools/amadeus-orchestrate.ts",
);
const CLAUDE_STATE = join(
  ROOT,
  "dist/claude/.claude/tools/amadeus-state.ts",
);
const MIRROR_REPOSITORY: RepositoryIdentity = {
  owner: "amadeus-dlc",
  name: "amadeus",
  canonical: "amadeus-dlc/amadeus",
};
const MIRROR_IDENTITY = {
  schema: 1 as const,
  intentUuid: DEFAULT_INTENT_UUID,
  intentDir: DEFAULT_RECORD_DIR,
  operationId: "t265-fixture-op",
  preparedAt: "2026-07-28T00:00:00Z",
  repository: MIRROR_REPOSITORY,
};

function gatewayOk<T>(value: T): GatewayOutcome<T> {
  return { kind: "ok", value };
}

class CompletionGateway implements MirrorGitHubGateway {
  readonly history: string[] = [];
  issue: RemoteMirrorIssue = {
    repository: MIRROR_REPOSITORY,
    number: 123,
    title: "Mirror",
    body: renderMirrorMarker(MIRROR_IDENTITY),
    state: "OPEN",
  };

  async readiness(): Promise<GatewayOutcome<void>> {
    return gatewayOk(undefined);
  }
  async createIssue(
    _permit: MirrorMutationPermit,
    content: { title: string; body: string },
  ): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("create");
    this.issue = { ...this.issue, title: content.title, body: content.body };
    return gatewayOk(this.issue);
  }
  async findIssuesByMarker(
    _repository: RepositoryIdentity,
    marker: string,
  ): Promise<GatewayOutcome<readonly RemoteMirrorIssue[]>> {
    return gatewayOk(this.issue.body.includes(marker) ? [this.issue] : []);
  }
  async viewIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    return gatewayOk(this.issue);
  }
  async editIssue(
    _permit: MirrorMutationPermit,
    body: string,
  ): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("edit");
    this.issue = { ...this.issue, body };
    return gatewayOk(this.issue);
  }
  async closeIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("close");
    this.issue = { ...this.issue, state: "CLOSED" };
    return gatewayOk(this.issue);
  }
  async listProjectItems(
    ..._args: Parameters<MirrorGitHubGateway["listProjectItems"]>
  ): ReturnType<MirrorGitHubGateway["listProjectItems"]> {
    throw new Error("CompletionGateway must not query Projects");
  }
  async resolveProjectFields(
    ..._args: Parameters<MirrorGitHubGateway["resolveProjectFields"]>
  ): ReturnType<MirrorGitHubGateway["resolveProjectFields"]> {
    throw new Error("CompletionGateway must not resolve Project fields");
  }
  async addProjectItem(
    ..._args: Parameters<MirrorGitHubGateway["addProjectItem"]>
  ): ReturnType<MirrorGitHubGateway["addProjectItem"]> {
    throw new Error("CompletionGateway must not add Project items");
  }
  async updateProjectItemSingleSelectField(
    ..._args: Parameters<
      MirrorGitHubGateway["updateProjectItemSingleSelectField"]
    >
  ): ReturnType<MirrorGitHubGateway["updateProjectItemSingleSelectField"]> {
    throw new Error("CompletionGateway must not update Project fields");
  }
}

// A recorded mirror issue. The engine reads it through the mirror-state codec
// (mirrorIssueNumberFromDocument), so the precondition is the sentinel-wrapped
// state block — the legacy `- **Mirror Issue**: #123` line is no longer read.
// issueNumber is only valid alongside a full provenance record.
const MIRROR_ISSUE_BLOCK = renderMirrorStateBlock({
  ...EMPTY_MIRROR_STATE,
  issueNumber: 123,
  provenance: {
    schema: 1,
    createIdentity: MIRROR_IDENTITY,
    issueNumber: 123,
    createdAt: "2026-07-28T00:00:00Z",
  },
});

let project = "";

process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";

function run(tool: string, args: string[]) {
  const result = spawnSync(
    process.execPath,
    [amadeusToolTarget(tool), ...args, "--project-dir", project],
    { encoding: "utf-8" },
  );
  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  return JSON.parse(result.stdout.trim()) as {
    kind: string;
    message?: string;
  };
}

afterEach(() => {
  cleanupTestProject(project);
  project = "";
});

describe("t265 mirror boundary distribution", () => {
  test.each(harnesses)("%s ships the engine and receipt state machine", (name, dir) => {
    expect(
      readFileSync(
        join(ROOT, "dist", name, dir, "tools", "amadeus-orchestrate.ts"),
        "utf-8",
      ),
    ).toBe(CORE_ENGINE);
    expect(
      readFileSync(
        join(ROOT, "dist", name, dir, "tools", "amadeus-state.ts"),
        "utf-8",
      ),
    ).toBe(CORE_STATE);
  });

  test("auto execution names only the fixed sync command", () => {
    const functionBody =
      CORE_ENGINE.match(
        /function mirrorSyncPrint\([\s\S]*?\n}\n\nfunction emitMirrorBoundaryIfNeeded/,
      )?.[0] ?? "";
    expect(functionBody).toContain("amadeus-mirror-lifecycle.ts boundary");
    expect(functionBody).not.toContain("amadeus-mirror.ts create");
    expect(functionBody).not.toContain("amadeus-mirror.ts close");
    expect(functionBody).not.toContain("eval(");
  });

  test("reuses ask and print without extending directive kinds", () => {
    expect(CORE_ENGINE).toContain("askDirective(");
    expect(CORE_ENGINE).toContain("printDirective(");
    expect(CORE_ENGINE).not.toContain('kind: "mirror-');
  });

  test("generated CLI resumes pending sync then returns to normal routing", () => {
    project = createTestProject();
    const knowledgeDir = join(
      project,
      ".claude",
      "knowledge",
      "amadeus-shared",
    );
    mkdirSync(knowledgeDir, { recursive: true });
    copyFileSync(
      join(ROOT, ".claude/knowledge/amadeus-shared/memory-template.md"),
      join(knowledgeDir, "memory-template.md"),
    );
    seedStateFile(project, join(FIXTURES_DIR, "state-mid-inception.md"));
    let state = readFileSync(seededStateFile(project), "utf-8")
      .replace(
        /- \*\*Lifecycle Phase\*\*: [^\n]+/,
        "- **Lifecycle Phase**: CONSTRUCTION",
      )
      .replace(
        /- \*\*Current Stage\*\*: [^\n]+/,
        "- **Current Stage**: code-generation",
      )
      .replace(
        /- \*\*Inception\*\*: [^\n]+/,
        "- **Inception**: Verified",
      )
      .replace("## Current Status", `## Current Status\n${MIRROR_ISSUE_BLOCK}`);
    writeFileSync(seededStateFile(project), state);
    writeFileSync(
      join(project, "amadeus", "config.json"),
      '{"auto-mirror":"auto"}',
    );

    const initial = run(CLAUDE_ENGINE, ["next"]);
    expect(initial.kind).toBe("print");
    expect(initial.message).toContain("amadeus-mirror-lifecycle.ts boundary");

    run(CLAUDE_STATE, [
      "mirror-boundary",
      "inception",
      "pending",
      "--from",
      "absent",
    ]);
    const resumed = run(CLAUDE_ENGINE, ["next"]);
    expect(resumed.kind).toBe("print");
    expect(resumed.message).toContain("inception completed --from pending");

    run(CLAUDE_STATE, [
      "mirror-boundary",
      "inception",
      "completed",
      "--from",
      "pending",
    ]);
    const routed = run(CLAUDE_ENGINE, ["next"]);
    expect(routed.kind).toBe("run-stage");
    state = readFileSync(seededStateFile(project), "utf-8");
    expect(state).toContain('{"inception":"completed"}');
  });

  test("final report keeps a multi-intent workflow addressable until completion mirror settles", async () => {
    project = createTestProject();
    seedStateFile(
      project,
      join(FIXTURES_DIR, "state-bugfix-final-construction.md"),
    );
    const statePath = seededStateFile(project);
    writeFileSync(
      statePath,
      readFileSync(statePath, "utf-8")
        .replace(
          "- [-] build-and-test — EXECUTE",
          "- [?] build-and-test — EXECUTE",
        )
        .replace("## Current Status", `## Current Status\n${MIRROR_ISSUE_BLOCK}`),
    );
    writeFileSync(
      join(project, "amadeus", "config.json"),
      '{"auto-mirror":"auto"}',
    );
    const record = join(
      project,
      "amadeus",
      "spaces",
      "default",
      "intents",
      DEFAULT_RECORD_DIR,
    );
    mkdirSync(join(record, "construction", "build-and-test"), {
      recursive: true,
    });
    writeFileSync(
      join(
        record,
        "construction",
        "build-and-test",
        "build-and-test-summary.md",
      ),
      "# Build and Test Summary\n",
    );
    mkdirSync(join(record, "verification"), { recursive: true });
    writeFileSync(
      join(record, "verification", "phase-check-construction.md"),
      "# Construction Phase Check\n",
    );

    const intents = join(
      project,
      "amadeus",
      "spaces",
      "default",
      "intents",
    );
    const registryPath = join(intents, "intents.json");
    const registry = JSON.parse(
      readFileSync(registryPath, "utf-8"),
    ) as Array<Record<string, unknown>>;
    registry.push({
      uuid: "00000000-0000-7000-8000-000000000002",
      slug: "other",
      status: "in-flight",
    });
    writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
    mkdirSync(join(intents, "other-8000000000000002"), { recursive: true });
    writeFileSync(
      join(intents, "other-8000000000000002", "amadeus-state.md"),
      "# Other active workflow\n",
    );

    const report = run(CLAUDE_ENGINE, [
      "report",
      "--stage",
      "build-and-test",
      "--result",
      "approved",
      "--user-input",
      "approved",
    ]);
    expect(report).toMatchObject({ kind: "print" });

    const afterRegistry = JSON.parse(
      readFileSync(registryPath, "utf-8"),
    ) as Array<{ uuid: string; status: string }>;
    expect(
      afterRegistry.find((entry) =>
        entry.uuid === "00000000-0000-7000-8000-000000000001"
      )?.status,
    ).toBe("in-flight");
    expect(
      readFileSync(join(intents, "active-intent"), "utf-8").trim(),
    ).toBe(DEFAULT_RECORD_DIR);
    expect(existsSync(join(intents, "active-intent"))).toBe(true);
    const prepared = readFileSync(statePath, "utf-8");
    expect(prepared).toContain("- **Status**: Running");
    expect(prepared).toContain("- **Workflow Completion Instance**:");
    const auditDir = join(record, "audit");
    const preparedAudit = readdirSync(auditDir)
      .filter((name) => name.endsWith(".jsonl"))
      .map((name) => readFileSync(join(auditDir, name), "utf-8"))
      .join("");
    expect(preparedAudit).not.toContain("STAGE_COMPLETED");
    expect(report.message).toContain(
      "amadeus-mirror-lifecycle.ts boundary completion",
    );
    expect(report.message).toContain(`--intent "${DEFAULT_RECORD_DIR}"`);
    expect(report.message).toContain('--space "default"');

    const completionInstance = prepared.match(
      /- \*\*Workflow Completion Instance\*\*: ([^\n]+)/,
    )?.[1];
    expect(completionInstance).toBeDefined();
    const missingIdentity = spawnSync(
      process.execPath,
      [
        amadeusToolTarget(CLAUDE_STATE),
        "complete-workflow",
        "build-and-test",
        "--project-dir",
        project,
      ],
      { encoding: "utf-8" },
    );
    expect(missingIdentity.status).not.toBe(0);
    expect(missingIdentity.stderr).toContain("requires --completion-instance");
    const premature = spawnSync(
      process.execPath,
      [
        amadeusToolTarget(CLAUDE_STATE),
        "complete-workflow",
        "build-and-test",
        "--completion-instance",
        completionInstance ?? "",
        "--project-dir",
        project,
      ],
      { encoding: "utf-8" },
    );
    expect(premature.status).not.toBe(0);
    expect(premature.stderr).toContain("mirror boundary settles");
    expect(existsSync(join(intents, "active-intent"))).toBe(true);
    expect(
      (JSON.parse(readFileSync(registryPath, "utf-8")) as Array<{
        uuid: string;
        status: string;
      }>).find((entry) =>
        entry.uuid === "00000000-0000-7000-8000-000000000001"
      )?.status,
    ).toBe("in-flight");
    writeFileSync(join(intents, "active-intent"), "other-8000000000000002\n");
    const otherBefore = readFileSync(
      join(intents, "other-8000000000000002", "amadeus-state.md"),
      "utf-8",
    );
    const otherAuditBefore = existsSync(
      join(intents, "other-8000000000000002", "audit"),
    );
    if (!completionInstance) {
      throw new Error("prepared completion identity is unavailable");
    }
    const gateway = new CompletionGateway();
    const lifecycle = await runMirrorLifecycleBoundary(
      {
        projectDir: project,
        space: "default",
        intentDir: DEFAULT_RECORD_DIR,
        repository: MIRROR_REPOSITORY,
        boundary: {
          kind: "workflow-completed",
          instance: completionInstance,
        },
      },
      {
        gateway,
        now: () => "2026-07-29T10:00:00Z",
        newOperationId: (() => {
          let sequence = 0;
          return () => `t265-operation-${++sequence}`;
        })(),
      },
    );
    expect(lifecycle.kind).toBe("ok");
    expect(gateway.history.filter((entry) => entry === "edit")).toHaveLength(1);
    expect(gateway.history.filter((entry) => entry === "close")).toHaveLength(1);
    expect(gateway.issue.state).toBe("CLOSED");
    expect(readFileSync(join(intents, "active-intent"), "utf-8").trim()).toBe(
      "other-8000000000000002",
    );
    expect(
      readFileSync(
        join(intents, "other-8000000000000002", "amadeus-state.md"),
        "utf-8",
      ),
    ).toBe(otherBefore);
    expect(
      existsSync(join(intents, "other-8000000000000002", "audit")),
    ).toBe(otherAuditBefore);
    run(CLAUDE_STATE, [
      "complete-workflow",
      "build-and-test",
      "--completion-instance",
      completionInstance,
      "--intent",
      DEFAULT_RECORD_DIR,
      "--space",
      "default",
    ]);
    const terminalRegistry = JSON.parse(
      readFileSync(registryPath, "utf-8"),
    ) as Array<{ uuid: string; status: string }>;
    expect(
      terminalRegistry.find((entry) =>
        entry.uuid === "00000000-0000-7000-8000-000000000001"
      )?.status,
    ).toBe("complete");
    expect(readFileSync(join(intents, "active-intent"), "utf-8").trim()).toBe(
      "other-8000000000000002",
    );
    expect(
      readFileSync(
        join(intents, "other-8000000000000002", "amadeus-state.md"),
        "utf-8",
      ),
    ).toBe(otherBefore);
    expect(readFileSync(statePath, "utf-8")).toContain(
      "- **Status**: Completed",
    );
    const terminalAudit = readdirSync(auditDir)
      .filter((name) => name.endsWith(".jsonl"))
      .map((name) => readFileSync(join(auditDir, name), "utf-8"))
      .join("");
    expect(terminalAudit.match(/STAGE_COMPLETED/g)).toHaveLength(1);
  });
});
