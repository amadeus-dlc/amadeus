import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { amadeusToolTarget } from "../harness/cli-target.ts";
import {
  handleReport,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  handleCompleteWorkflow,
} from "../../packages/framework/core/tools/amadeus-state.ts";
import {
  mirrorEventIdentity,
  mirrorEventKey,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import {
  cleanupTestProject,
  createTestProject,
  DEFAULT_INTENT_UUID,
  DEFAULT_RECORD_DIR,
  FIXTURES_DIR,
  seededStateFile,
  seedGoalReceiptForFinalStage,
  seedStateFile,
} from "../harness/fixtures.ts";
import {
  EMPTY_MIRROR_STATE,
  parseMirrorStateDocument,
  renderMirrorStateBlock,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import type {
  MirrorOperation,
  MirrorOperationReceipt,
  MirrorReceiptStatus,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import {
  captureStdout,
  cleanupSoloGateRoots,
} from "../harness/solo-gate-fixture.ts";

const SEEDED_CREATE_IDENTITY = {
  schema: 1 as const,
  intentUuid: "019f7003-e273-7c0b-85ba-0a6c99d0aa9d",
  intentDir: "amadeus/spaces/default/intents/seed",
  repository: {
    owner: "acme",
    name: "app",
    canonical: "acme/app" as const,
  },
  operationId: "op-seed",
  preparedAt: "2026-07-26T00:00:00Z",
};

// A recorded mirror lives in the v1 mirror-state block (issueNumber +
// provenance), which is the authority the boundary decision reads — never the
// legacy "Mirror Issue" field. Seed the block the way a real create writes it,
// optionally with the create receipt that create wrote: that receipt is the
// evidence the boundary report reads for `--user-input create` (Issue #1752).
function seededMirrorBlock(createReceipt?: MirrorReceiptStatus): string {
  const receipts: Record<string, MirrorOperationReceipt> = {};
  if (createReceipt !== undefined) {
    const event = mirrorEventIdentity(
      DEFAULT_INTENT_UUID,
      { kind: "phase-verified", phase: "inception", instance: "t265-seed" },
      "create",
    );
    const key = mirrorEventKey(event);
    receipts[key] = {
      key,
      event,
      operationId: "t265-create-receipt",
      status: createReceipt,
      preparedAt: "2026-07-26T00:00:00Z",
      attemptedAt: "2026-07-26T00:00:01Z",
      ...(createReceipt === "succeeded"
        ? { completedAt: "2026-07-26T00:00:02Z" }
        : {}),
    };
  }
  const block = renderMirrorStateBlock({
    ...EMPTY_MIRROR_STATE,
    issueNumber: 123,
    provenance: {
      schema: 1,
      createIdentity: SEEDED_CREATE_IDENTITY,
      issueNumber: 123,
      createdAt: "2026-07-26T00:00:00Z",
    },
    receipts,
  });
  // An invalid block parses as "no mirror recorded", which would make a
  // rejection test pass for the wrong reason. Fail the fixture instead.
  const parsed = parseMirrorStateDocument(block);
  if (parsed.kind !== "ok") {
    throw new Error(`seeded mirror block is invalid: ${JSON.stringify(parsed)}`);
  }
  return block;
}

const SEEDED_MIRROR_BLOCK = seededMirrorBlock();

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
const ENGINE = join(
  ROOT,
  "dist/claude/.claude/tools/amadeus-orchestrate.ts",
);
const STATE_TOOL = join(
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
let project = "";

function run(tool: string, args: string[]) {
  const result = spawnSync(process.execPath, [
    amadeusToolTarget(tool),
    ...args,
    "--project-dir",
    project,
  ], { encoding: "utf-8" });
  return {
    code: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function parseDirective(result: ReturnType<typeof run>, expectedCode = 0): {
  kind: string;
  question?: string;
  message?: string;
} {
  expect(result.code).toBe(expectedCode);
  expect(result.stderr).toBe("");
  const trimmed = result.stdout.trim();
  expect(trimmed).not.toBe("");
  return JSON.parse(trimmed) as {
    kind: string;
    question?: string;
    message?: string;
  };
}

function seedBoundary(
  phase: "ideation" | "inception" | "construction",
  options: {
    auto?: boolean;
    mode?: "off" | "prompt" | "auto";
    mirror?: boolean;
    mirrorCreateReceipt?: MirrorReceiptStatus;
    receipts?: string;
  } = {},
): void {
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
  let state = readFileSync(seededStateFile(project), "utf-8");
  const lifecycle =
    phase === "ideation"
      ? "INCEPTION"
      : phase === "inception"
        ? "CONSTRUCTION"
        : "CONSTRUCTION";
  state = state.replace(
    /- \*\*Lifecycle Phase\*\*: [^\n]+/,
    `- **Lifecycle Phase**: ${lifecycle}`,
  );
  const firstStage =
    phase === "ideation"
      ? "reverse-engineering"
      : phase === "inception"
        ? "code-generation"
        : "none";
  state = state.replace(
    /- \*\*Current Stage\*\*: [^\n]+/,
    `- **Current Stage**: ${firstStage}`,
  );
  const label = phase[0].toUpperCase() + phase.slice(1);
  state = state.replace(
    new RegExp(`- \\*\\*${label}\\*\\*: [^\\n]+`),
    `- **${label}**: Verified`,
  );
  if (phase === "construction") {
    state = state.replace(
      /- \*\*Status\*\*: [^\n]+/,
      "- **Status**: Completed",
    );
  }
  if (options.mirror) {
    const block = seededMirrorBlock(options.mirrorCreateReceipt);
    state = `${state.trimEnd()}\n\n${block}\n`;
  }
  if (options.receipts) {
    state = state.replace(
      "## Runtime State",
      `## Runtime State\n- **Mirror Boundary Receipts**: ${options.receipts}`,
    );
  }
  writeFileSync(seededStateFile(project), state);
  if (options.auto !== undefined || options.mode !== undefined) {
    writeFileSync(
      join(project, "amadeus", "config.json"),
      JSON.stringify({
        "intent-mirror": {
          github: {
            issue: {
              mode: options.mode ?? (options.auto ? "auto" : "prompt"),
            },
          },
        },
      }),
    );
  }
}

class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

function captureExit(fn: () => void): {
  readonly code: number | null;
  readonly stderr: string;
} {
  const originalExit = process.exit;
  const originalError = console.error;
  let code: number | null = null;
  let stderr = "";
  process.exit = ((value?: number) => {
    throw new ExitSignal(value ?? 0);
  }) as typeof process.exit;
  console.error = (...args: unknown[]) => {
    stderr += `${args.map(String).join(" ")}\n`;
  };
  try {
    fn();
  } catch (error) {
    if (error instanceof ExitSignal) code = error.code;
    else throw error;
  } finally {
    process.exit = originalExit;
    console.error = originalError;
  }
  return { code, stderr };
}

function directCompletionFailure(args: string[]): string {
  const savedProjectDir = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = project;
  try {
    const result = captureExit(() => handleCompleteWorkflow(args));
    expect(result.code).toBe(1);
    const lastLine = result.stderr.trim().split("\n").at(-1);
    if (lastLine !== undefined) {
      try {
        return (JSON.parse(lastLine) as { error: string }).error;
      } catch {
        // Preserve a future non-JSON error boundary verbatim.
      }
    }
    return result.stderr;
  } finally {
    if (savedProjectDir === undefined) {
      delete process.env.CLAUDE_PROJECT_DIR;
    } else {
      process.env.CLAUDE_PROJECT_DIR = savedProjectDir;
    }
  }
}

function seedFinalCompletionProject(
  config: unknown = { "intent-mirror": { github: { issue: { mode: "auto" } } } },
): string {
  project = createTestProject();
  seedStateFile(
    project,
    join(FIXTURES_DIR, "state-fix-final-construction.md"),
  );
  const statePath = seededStateFile(project);
  writeFileSync(
    statePath,
    readFileSync(statePath, "utf-8")
      .replace(
        "- [-] build-and-test — EXECUTE",
        "- [?] build-and-test — EXECUTE",
      )
      .replace("## Current Status", `## Current Status\n${SEEDED_MIRROR_BLOCK}`),
  );
  writeFileSync(
    join(project, "amadeus", "config.json"),
    JSON.stringify(config),
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
  seedGoalReceiptForFinalStage(project, "build-and-test");
  return statePath;
}

function prepareWorkflowCompletion(): {
  readonly statePath: string;
  readonly completionInstance: string;
} {
  const statePath = seedFinalCompletionProject();
  const directive = JSON.parse(
    captureStdout(() => {
      handleReport(
        [
          "--stage",
          "build-and-test",
          "--result",
          "approved",
          "--user-input",
          "approved",
        ],
        project,
      );
    }),
  ) as { kind: string };
  expect(directive.kind).toBe("print");
  const completionInstance = readFileSync(statePath, "utf-8").match(
    /- \*\*Workflow Completion Instance\*\*: ([^\n]+)/,
  )?.[1];
  if (!completionInstance) {
    throw new Error("prepared completion identity is unavailable");
  }
  return { statePath, completionInstance };
}

function replaceCompletionMirrorState(
  statePath: string,
  completionInstance: string,
  operation?: MirrorOperation,
  status?: "skipped-for-event" | "safety-blocked",
): void {
  const receipts: Record<string, MirrorOperationReceipt> = {};
  const snapshot = {
    ...EMPTY_MIRROR_STATE,
    issueNumber: 123,
    provenance: {
      schema: 1 as const,
      createIdentity: MIRROR_IDENTITY,
      issueNumber: 123,
      createdAt: "2026-07-28T00:00:00Z",
    },
    receipts,
  };
  if (operation !== undefined && status !== undefined) {
    const event = mirrorEventIdentity(
      DEFAULT_INTENT_UUID,
      { kind: "workflow-completed", instance: completionInstance },
      operation,
    );
    const key = mirrorEventKey(event);
    receipts[key] = {
      key,
      event,
      operationId: "t265-completion-receipt",
      status,
      preparedAt: "2026-07-29T00:00:00Z",
      ...(status === "skipped-for-event"
        ? { completedAt: "2026-07-29T00:00:01Z" }
        : {
            failureClass: "state-parse" as const,
            lastEffect: "not-started" as const,
          }),
    };
  }
  writeFileSync(
    statePath,
    readFileSync(statePath, "utf-8").replace(
      /<!-- amadeus:mirror-state:v1:start -->[\s\S]*?<!-- amadeus:mirror-state:v1:end -->/u,
      renderMirrorStateBlock(snapshot),
    ),
  );
}

function replaceCompletionMirrorStateWithAuditOutbox(statePath: string): void {
  writeFileSync(
    statePath,
    readFileSync(statePath, "utf-8").replace(
      /<!-- amadeus:mirror-state:v1:start -->[\s\S]*?<!-- amadeus:mirror-state:v1:end -->/u,
      renderMirrorStateBlock({
        ...EMPTY_MIRROR_STATE,
        issueNumber: 123,
        provenance: {
          schema: 1,
          createIdentity: MIRROR_IDENTITY,
          issueNumber: 123,
          createdAt: "2026-07-28T00:00:00Z",
        },
        auditOutbox: {
          transactionId: "t265-pending-audit",
          digest: "t265-digest",
          fields: { Artifact: "amadeus-state.md" },
        },
      }),
    ),
  );
}

function finalReport(root: string): {
  kind: string;
  message?: string;
} {
  return JSON.parse(
    captureStdout(() => {
      handleReport(
        [
          "--stage",
          "build-and-test",
          "--result",
          "approved",
          "--user-input",
          "approved",
        ],
        root,
      );
    }),
  );
}

afterEach(() => {
  cleanupTestProject(project);
  cleanupSoloGateRoots();
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

  test("auto execution names only the fixed lifecycle command", () => {
    const functionBody =
      CORE_ENGINE.match(
        /function mirrorLifecyclePrint\([\s\S]*?\n}\n\nfunction emitMirrorBoundaryIfNeeded/,
      )?.[0] ?? "";
    expect(functionBody).toContain("amadeus-mirror-lifecycle.ts boundary");
    expect(functionBody).not.toContain("amadeus-mirror.ts create");
    expect(functionBody).not.toContain("amadeus-mirror.ts sync");
    expect(functionBody).not.toContain("amadeus-mirror.ts close");
    expect(functionBody).not.toContain("eval(");
  });

  test("reuses ask and print without extending directive kinds", () => {
    expect(CORE_ENGINE).toContain("askDirective(");
    expect(CORE_ENGINE).toContain("printDirective(");
    expect(CORE_ENGINE).not.toContain('kind: "mirror-');
  });

  test("generated CLI resumes pending sync then returns to normal routing", () => {
    seedBoundary("inception", { auto: true, mirror: true });
    const initial = parseDirective(run(ENGINE, ["next"]));
    expect(initial.kind).toBe("print");
    expect(initial.message).toContain("amadeus-mirror-lifecycle.ts boundary");

    expect(
      run(STATE_TOOL, [
        "mirror-boundary",
        "inception",
        "pending",
        "--from",
        "absent",
      ]).code,
    ).toBe(0);
    const resumed = parseDirective(run(ENGINE, ["next"]));
    expect(resumed.kind).toBe("print");
    expect(resumed.message).toContain("inception completed --from pending");
    expect(resumed.message).toContain(
      "Only after both the mirror operation and receipt update succeed, re-run `next`.",
    );
    expect(resumed.message).toContain(
      "If either fails, stop without re-running `next`",
    );

    expect(
      run(STATE_TOOL, [
        "mirror-boundary",
        "inception",
        "completed",
        "--from",
        "pending",
      ]).code,
    ).toBe(0);
    expect(parseDirective(run(ENGINE, ["next"])).kind).toBe("run-stage");
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain(
      '{"inception":"completed"}',
    );
  });
});

describe("t265 engine boundary mode and issue matrix", () => {
  const cells = (["ideation", "inception", "construction"] as const).flatMap(
    (phase) =>
      (["off", "prompt", "auto"] as const).flatMap((mode) =>
        ([false, true] as const).map((mirror) => ({
          phase,
          mode,
          mirror,
        })),
      ),
  );

  test.each(cells)(
    "$phase mode=$mode mirror=$mirror",
    ({ phase, mode, mirror }) => {
      seedBoundary(phase, { mode, mirror });
      const before = readFileSync(seededStateFile(project), "utf-8");
      const result = run(ENGINE, ["next"]);
      const directive = parseDirective(result);
      if (mode === "auto") {
        expect(directive.kind).toBe("print");
      } else if (mode === "prompt") {
        expect(directive.kind).toBe("ask");
      } else {
        expect(["ask", "print"]).not.toContain(directive.kind);
      }
      const prose = directive.message ?? directive.question ?? "";
      expect(prose.includes("amadeus-mirror-lifecycle.ts boundary")).toBe(
        mode === "auto",
      );
      expect(prose.includes("Choose create")).toBe(
        mode === "prompt" && !mirror,
      );
      expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
    },
  );
});

describe("t265 receipt recovery and reports", () => {
  test("completion identity is not suppressed by a completed construction receipt", () => {
    seedBoundary("construction", {
      auto: true,
      mirror: true,
      receipts: '{"construction":"completed"}',
    });
    const statePath = seededStateFile(project);
    writeFileSync(
      statePath,
      readFileSync(statePath, "utf-8").replace(
        "## Runtime State",
        "## Runtime State\n" +
          "- **Workflow Completion Instance**: completion-instance-1\n" +
          "- **Workflow Completion Stage**: build-and-test\n" +
          "- **Workflow Completion Status**: pending",
      ),
    );
    seedGoalReceiptForFinalStage(
      project,
      "build-and-test",
      "completion-instance-1",
    );
    const first = parseDirective(run(ENGINE, ["next"]));
    expect(first.kind).toBe("print");
    expect(first.message).toContain(
      'boundary completion --instance "completion-instance-1"',
    );
    expect(first.message).toContain(`--intent "fixture-8000000000000001"`);
    expect(first.message).toContain('--space "default"');
    const second = parseDirective(run(ENGINE, ["next"]));
    expect(second).toEqual(first);
  });

  test("off suppresses a pending boundary and falls through without mutation", () => {
    seedBoundary("inception", {
      mode: "off",
      mirror: true,
      receipts: '{"inception":"pending"}',
    });
    const before = readFileSync(seededStateFile(project), "utf-8");
    const directive = parseDirective(run(ENGINE, ["next"]));
    expect(directive.kind).toBe("run-stage");
    expect(directive.message ?? "").not.toContain("amadeus-mirror.ts");
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
  });

  test("processes the oldest pending receipt only", () => {
    seedBoundary("construction", {
      auto: true,
      mirror: true,
      receipts:
        '{"ideation":"pending","inception":"pending","construction":"pending"}',
    });
    const result = run(ENGINE, ["next"]);
    expect(result.stdout).toContain("ideation completed --from pending");
    expect(result.stdout).not.toContain("inception completed --from pending");
  });

  test("sync failure leaves pending and the next session reissues it", () => {
    seedBoundary("inception", { auto: true, mirror: true });
    expect(
      run(STATE_TOOL, [
        "mirror-boundary",
        "inception",
        "pending",
        "--from",
        "absent",
      ]).code,
    ).toBe(0);
    const pending = readFileSync(seededStateFile(project), "utf-8");
    const first = parseDirective(run(ENGINE, ["next"]));
    expect(first.message).toContain("amadeus-mirror-lifecycle.ts boundary");
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(pending);
    const resumed = parseDirective(run(ENGINE, ["next"]));
    expect(resumed).toEqual(first);
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(pending);
  });

  test("receipt update failure preserves pending for an idempotent sync retry", () => {
    seedBoundary("inception", {
      auto: true,
      mirror: true,
      receipts: '{"inception":"pending"}',
    });
    const before = readFileSync(seededStateFile(project), "utf-8");
    const failed = run(STATE_TOOL, [
      "mirror-boundary",
      "inception",
      "completed",
      "--from",
      "absent",
    ]);
    expect(failed.code).not.toBe(0);
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
    expect(parseDirective(run(ENGINE, ["next"])).message).toContain(
      "amadeus-mirror-lifecycle.ts boundary",
    );
  });

  test("completes only the first pending receipt and handles the next one later", () => {
    seedBoundary("construction", {
      auto: true,
      mirror: true,
      receipts: '{"ideation":"pending","inception":"pending"}',
    });
    expect(
      run(STATE_TOOL, [
        "mirror-boundary",
        "ideation",
        "completed",
        "--from",
        "pending",
      ]).code,
    ).toBe(0);
    const state = readFileSync(seededStateFile(project), "utf-8");
    expect(state).toContain(
      '{"ideation":"completed","inception":"pending"}',
    );
    const next = parseDirective(run(ENGINE, ["next"]));
    expect(next.message).toContain("inception completed --from pending");
    expect(next.message).not.toContain("ideation completed --from pending");
  });

  test("a completed current boundary falls through to normal routing", () => {
    seedBoundary("inception", {
      auto: true,
      mirror: true,
      receipts: '{"inception":"completed"}',
    });
    const before = readFileSync(seededStateFile(project), "utf-8");
    const directive = parseDirective(run(ENGINE, ["next"]));
    expect(directive.kind).toBe("run-stage");
    expect(directive.message ?? "").not.toContain("amadeus-mirror.ts sync");
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
  });

  test("invalid config fails closed without changing state", () => {
    seedBoundary("inception", { mirror: true });
    writeFileSync(join(project, "amadeus", "config.json"), '{"intent-mirror":{"github":{"issue":{"mode":"yes"}}}}');
    const before = readFileSync(seededStateFile(project), "utf-8");
    const result = run(ENGINE, ["next"]);
    expect(result.stdout).toContain('"kind":"error"');
    expect(result.stdout).toContain("Invalid mirror configuration");
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
  });

  test("malformed receipts fail safe", () => {
    seedBoundary("inception", { receipts: "{" });
    const result = run(ENGINE, ["next"]);
    expect(result.stdout).toContain('"kind":"error"');
    expect(result.stdout).toContain("invalid JSON");
  });

  test("state transition failure leaves bytes unchanged", () => {
    seedBoundary("inception", {
      receipts: '{"inception":"pending"}',
    });
    const before = readFileSync(seededStateFile(project), "utf-8");
    const result = run(STATE_TOOL, [
      "mirror-boundary",
      "inception",
      "completed",
      "--from",
      "absent",
    ]);
    expect(result.code).not.toBe(0);
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
  });

  test("ask report records completed directly without pending", () => {
    seedBoundary("inception", { auto: false, mirror: true });
    const result = run(ENGINE, [
      "report",
      "--mirror-boundary",
      "inception",
      "--result",
      "completed",
      "--user-input",
      "sync",
    ]);
    expect(result.stdout).toContain('"kind":"print"');
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain(
      '{"inception":"completed"}',
    );
  });

  test("ask report rejects close and preserves state", () => {
    seedBoundary("inception", { auto: false, mirror: true });
    const before = readFileSync(seededStateFile(project), "utf-8");
    const result = run(ENGINE, [
      "report",
      "--mirror-boundary",
      "inception",
      "--result",
      "completed",
      "--user-input",
      "close",
    ]);
    expect(result.stdout).toContain('"kind":"error"');
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
  });

  // Issue #1752: the answer `create` is accepted on the evidence that a create
  // ran — a succeeded create receipt — not on the absence of an Issue. Doing a
  // manual create as the ask instructs records the Issue, so re-reading the
  // Issue at report time made a successful create reject its own report.
  test("ask report accepts create backed by a succeeded create receipt", () => {
    seedBoundary("inception", {
      auto: false,
      mirror: true,
      mirrorCreateReceipt: "succeeded",
    });
    const directive = JSON.parse(
      captureStdout(() => {
        handleReport(
          [
            "--mirror-boundary",
            "inception",
            "--result",
            "completed",
            "--user-input",
            "create",
          ],
          project,
        );
      }),
    ) as { kind: string };
    expect(directive.kind).toBe("print");
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain(
      '{"inception":"completed"}',
    );
  });

  test("ask report rejects create whose receipt has not succeeded", () => {
    seedBoundary("inception", {
      auto: false,
      mirror: true,
      mirrorCreateReceipt: "attempted",
    });
    const before = readFileSync(seededStateFile(project), "utf-8");
    const directive = JSON.parse(
      captureStdout(() => {
        handleReport(
          [
            "--mirror-boundary",
            "inception",
            "--result",
            "completed",
            "--user-input",
            "create",
          ],
          project,
        );
      }),
    ) as { kind: string };
    expect(directive.kind).toBe("error");
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
  });

  test.each([
    ["phase mismatch", "ideation", "sync"],
    // An Issue is recorded but no create receipt exists, so `create` was never
    // offered and stays rejected (Issue #1752 keeps this half unchanged).
    ["unoffered create", "inception", "create"],
    ["free-form answer", "inception", "please sync"],
  ] as const)("ask report rejects %s", (_, phase, answer) => {
    seedBoundary("inception", { auto: false, mirror: true });
    const before = readFileSync(seededStateFile(project), "utf-8");
    const directive = parseDirective(
      run(ENGINE, [
        "report",
        "--mirror-boundary",
        phase,
        "--result",
        "completed",
        "--user-input",
        answer,
      ]),
    );
    expect(directive.kind).toBe("error");
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
  });

  test("ask skip transitions absent directly to completed", () => {
    seedBoundary("ideation", { auto: false, mirror: false });
    const directive = parseDirective(
      run(ENGINE, [
        "report",
        "--mirror-boundary",
        "ideation",
        "--result",
        "completed",
        "--user-input",
        "skip",
      ]),
    );
    expect(directive.kind).toBe("print");
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain(
      '{"ideation":"completed"}',
    );
  });

  test("a second answer for the same ask is rejected", () => {
    seedBoundary("inception", { auto: false, mirror: true });
    const args = [
      "report",
      "--mirror-boundary",
      "inception",
      "--result",
      "completed",
      "--user-input",
      "sync",
    ];
    expect(parseDirective(run(ENGINE, args)).kind).toBe("print");
    const completed = readFileSync(seededStateFile(project), "utf-8");
    expect(parseDirective(run(ENGINE, args)).kind).toBe("error");
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(completed);
  });
});

describe("t265 in-process completion and carrier boundaries", () => {
  test("explicitly skipped completion receipt permits the terminal workflow commit", () => {
    const { statePath, completionInstance } = prepareWorkflowCompletion();
    replaceCompletionMirrorState(
      statePath,
      completionInstance,
      "sync",
      "skipped-for-event",
    );

    expect(
      run(STATE_TOOL, [
        "complete-workflow",
        "build-and-test",
        "--completion-instance",
        completionInstance,
      ]).code,
    ).toBe(0);
    expect(readFileSync(statePath, "utf-8")).toContain(
      "- **Status**: Completed",
    );
  });

  test("final report refuses an invalid completion mirror configuration before mutation", () => {
    const statePath = seedFinalCompletionProject({ "intent-mirror": { github: { issue: { mode: true } } } });
    const before = readFileSync(statePath, "utf-8");

    const directive = finalReport(project);

    expect(directive.kind).toBe("error");
    expect(directive.message).toContain(
      "expected off | prompt | auto, got boolean",
    );
    expect(readFileSync(statePath, "utf-8")).toBe(before);
  });

  test("repeated final report re-emits the prepared completion boundary without mutation", () => {
    const { statePath } = prepareWorkflowCompletion();
    const before = readFileSync(statePath, "utf-8");

    const directive = finalReport(project);

    expect(directive.kind).toBe("print");
    expect(directive.message).toContain(
      "amadeus-mirror-lifecycle.ts boundary completion",
    );
    expect(readFileSync(statePath, "utf-8")).toBe(before);
  });

  test("prepared completion in off mode prints the direct terminal command without mutation", () => {
    const { statePath } = prepareWorkflowCompletion();
    writeFileSync(
      join(project, "amadeus", "config.json"),
      '{"intent-mirror":{"github":{"issue":{"mode":"off"}}}}',
    );
    const before = readFileSync(statePath, "utf-8");

    const directive = finalReport(project);

    expect(directive.kind).toBe("print");
    expect(directive.message).toContain("Intent Mirror is off");
    expect(directive.message).toContain("complete-workflow");
    expect(readFileSync(statePath, "utf-8")).toBe(before);
  });

  test("repeated final report fails closed on malformed prepared completion state", () => {
    const { statePath } = prepareWorkflowCompletion();
    writeFileSync(
      statePath,
      readFileSync(statePath, "utf-8").replace(
        "- **Workflow Completion Status**: pending",
        "- **Workflow Completion Status**: malformed",
      ),
    );

    const directive = finalReport(project);

    expect(directive.kind).toBe("error");
    expect(directive.message).toContain("status is invalid");
  });

  test.each([
    [
      "missing",
      (state: string) => state.replace(/- \*\*Scope\*\*: [^\n]+\n/u, ""),
      "requires a Scope field",
    ],
    [
      "invalid",
      (state: string) =>
        state.replace(/- \*\*Scope\*\*: [^\n]+/u, "- **Scope**: not-a-scope"),
      "invalid Scope",
    ],
  ])(
    "terminal commit rejects a %s Scope through the in-process audit boundary",
    (_name, mutate, expected) => {
      const { statePath, completionInstance } = prepareWorkflowCompletion();
      replaceCompletionMirrorState(
        statePath,
        completionInstance,
        "sync",
        "skipped-for-event",
      );
      writeFileSync(statePath, mutate(readFileSync(statePath, "utf-8")));

      expect(
        directCompletionFailure([
          "build-and-test",
          "--completion-instance",
          completionInstance,
        ]),
      ).toContain(expected);
    },
  );

  test("prepared completion refuses a different terminal stage", () => {
    const { completionInstance } = prepareWorkflowCompletion();

    expect(
      directCompletionFailure([
        "code-generation",
        "--completion-instance",
        completionInstance,
      ]),
    ).toContain(
      'Workflow completion was prepared for "build-and-test", not "code-generation".',
    );
  });

  test("targeted terminal completion rejects a missing stage before mutation", () => {
    const statePath = seedFinalCompletionProject();
    const before = readFileSync(statePath, "utf-8");

    expect(
      directCompletionFailure([
        "--intent",
        DEFAULT_RECORD_DIR,
        "--space",
        "default",
      ]),
    ).toContain("Usage: amadeus-state.ts complete-workflow");
    expect(readFileSync(statePath, "utf-8")).toBe(before);
  });

  test("prepared completion requires its completion instance", () => {
    prepareWorkflowCompletion();

    expect(
      directCompletionFailure(["build-and-test"]),
    ).toContain("requires --completion-instance");
  });

  test("prepared completion refuses a different completion instance", () => {
    prepareWorkflowCompletion();

    expect(
      directCompletionFailure([
        "build-and-test",
        "--completion-instance",
        "t265-wrong-completion-instance",
      ]),
    ).toContain("Workflow completion instance mismatch");
  });

  test("prepared completion refuses invalid mirror configuration", () => {
    const { completionInstance } = prepareWorkflowCompletion();
    writeFileSync(
      join(project, "amadeus", "config.json"),
      '{"intent-mirror":{"github":{"issue":{"mode":true}}}}',
    );

    expect(
      directCompletionFailure([
        "build-and-test",
        "--completion-instance",
        completionInstance,
      ]),
    ).toContain("cannot resolve mirror configuration");
  });

  test("prepared completion requires exactly one matching Intent registry row", () => {
    const { completionInstance } = prepareWorkflowCompletion();
    writeFileSync(
      join(
        project,
        "amadeus",
        "spaces",
        "default",
        "intents",
        "intents.json",
      ),
      "[]\n",
    );

    expect(
      directCompletionFailure([
        "build-and-test",
        "--completion-instance",
        completionInstance,
      ]),
    ).toContain("exactly one Intent registry row");
  });

  test("prepared completion refuses invalid mirror state", () => {
    const { statePath, completionInstance } = prepareWorkflowCompletion();
    writeFileSync(
      statePath,
      readFileSync(statePath, "utf-8").replace(
        /<!-- amadeus:mirror-state:v1:start -->[\s\S]*?<!-- amadeus:mirror-state:v1:end -->/u,
        "<!-- amadeus:mirror-state:v1:start -->\n{}\n<!-- amadeus:mirror-state:v1:end -->",
      ),
    );

    expect(
      directCompletionFailure([
        "build-and-test",
        "--completion-instance",
        completionInstance,
      ]),
    ).toContain("invalid mirror state");
  });

  test("prepared completion refuses a pending mirror audit outbox", () => {
    const { statePath, completionInstance } = prepareWorkflowCompletion();
    replaceCompletionMirrorStateWithAuditOutbox(statePath);

    expect(
      directCompletionFailure([
        "build-and-test",
        "--completion-instance",
        completionInstance,
      ]),
    ).toContain(
      "Prepared workflow completion still has a pending mirror audit outbox.",
    );
  });

  test("prepared completion refuses a safety-blocked receipt", () => {
    const { statePath, completionInstance } = prepareWorkflowCompletion();
    replaceCompletionMirrorState(
      statePath,
      completionInstance,
      "sync",
      "safety-blocked",
    );

    expect(
      directCompletionFailure([
        "build-and-test",
        "--completion-instance",
        completionInstance,
      ]),
    ).toContain('operation "sync" is safety-blocked');
  });

  test("prepared completion refuses an unsettled mirror operation", () => {
    const { completionInstance } = prepareWorkflowCompletion();

    expect(
      directCompletionFailure([
        "build-and-test",
        "--completion-instance",
        completionInstance,
      ]),
    ).toContain('operation "sync" is still pending');
  });

});
