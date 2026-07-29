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
  parseMirrorStateDocument,
  renderMirrorStateBlock,
} from "../../dist/claude/.claude/tools/amadeus-mirror-state-codec.ts";
import {
  mirrorEventIdentity,
  mirrorEventKey,
} from "../../dist/claude/.claude/tools/amadeus-mirror-policy.ts";
import {
  cleanupTestProject,
  createTestProject,
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
// A recorded mirror issue. The engine reads it through the mirror-state codec
// (mirrorIssueNumberFromDocument), so the precondition is the sentinel-wrapped
// state block — the legacy `- **Mirror Issue**: #123` line is no longer read.
// issueNumber is only valid alongside a full provenance record.
const MIRROR_ISSUE_BLOCK = renderMirrorStateBlock({
  ...EMPTY_MIRROR_STATE,
  issueNumber: 123,
  provenance: {
    schema: 1,
    createIdentity: {
      schema: 1,
      intentUuid: "11111111-1111-4111-8111-111111111111",
      intentDir: "fixture-8000000000000001",
      operationId: "t265-fixture-op",
      preparedAt: "2026-07-28T00:00:00Z",
      repository: {
        owner: "amadeus-dlc",
        name: "amadeus",
        canonical: "amadeus-dlc/amadeus",
      },
    },
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

  test("final report keeps a multi-intent workflow addressable until completion mirror settles", () => {
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
    const parsed = parseMirrorStateDocument(prepared);
    if (parsed.kind !== "ok" || parsed.block === null || !completionInstance) {
      throw new Error("prepared completion mirror state is unavailable");
    }
    const completedAt = "2026-07-29T10:00:00Z";
    const syncEvent = mirrorEventIdentity(
      "00000000-0000-7000-8000-000000000001",
      { kind: "workflow-completed", instance: completionInstance },
      "sync",
    );
    const closeEvent = mirrorEventIdentity(
      "00000000-0000-7000-8000-000000000001",
      { kind: "workflow-completed", instance: completionInstance },
      "close",
    );
    const syncKey = mirrorEventKey(syncEvent);
    const closeKey = mirrorEventKey(closeEvent);
    const settledBlock = renderMirrorStateBlock({
      ...parsed.snapshot,
      revision: 2,
      receipts: {
        [syncKey]: {
          key: syncKey,
          event: syncEvent,
          operationId: "sync-op",
          createdRevision: 1,
          status: "succeeded",
          preparedAt: completedAt,
          attemptedAt: completedAt,
          completedAt,
        },
        [closeKey]: {
          key: closeKey,
          event: closeEvent,
          operationId: "close-op",
          createdRevision: 2,
          status: "succeeded",
          preparedAt: completedAt,
          attemptedAt: completedAt,
          completedAt,
        },
      },
      auditOutbox: null,
    });
    writeFileSync(
      statePath,
      prepared.slice(0, parsed.block.start) +
        settledBlock +
        prepared.slice(parsed.block.end),
    );
    run(CLAUDE_STATE, [
      "complete-workflow",
      "build-and-test",
      "--completion-instance",
      completionInstance,
    ]);
    const terminalRegistry = JSON.parse(
      readFileSync(registryPath, "utf-8"),
    ) as Array<{ uuid: string; status: string }>;
    expect(
      terminalRegistry.find((entry) =>
        entry.uuid === "00000000-0000-7000-8000-000000000001"
      )?.status,
    ).toBe("complete");
    expect(existsSync(join(intents, "active-intent"))).toBe(false);
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
