// t371 — regression for Issue #1750: the first Mirror create must not wait for
// a phase boundary in a scope that SKIPs Ideation.
//
// Defect: the only create opportunities before a phase was verified were
// `intent-capture-approved` and `phase-verified`. A scope such as `self-fix`
// SKIPs intent-capture, and `currentMirrorBoundaryPhase` refuses a phase whose
// roll-up reads `Skipped` rather than `Verified`, so the first eligible boundary
// was Inception's — the Issue appeared only after Requirements Analysis closed.
//
// The fix adds the scope-independent `intent-initialized` boundary, settled on
// its own receipt axis (`Mirror Initial Create Receipt`) so it never shares a
// slot with the three-phase `Mirror Boundary Receipts` vocabulary.
//
// The engine drive imports the SHIPPED dist tree (the core tools resolve their
// data files relative to their own directory) and runs in-process so the added
// branches register in lcov, which a spawn cannot do.
//
// covers: subcommand:amadeus-state:mirror-initial-create
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handleNext } from "../../dist/claude/.claude/tools/amadeus-orchestrate.ts";
import { handleMirrorInitialCreate } from "../../dist/claude/.claude/tools/amadeus-state.ts";
import {
  parseMirrorLifecycleArgs,
} from "../../packages/framework/core/tools/amadeus-mirror-lifecycle.ts";
import { MIRROR_USER_CONTRACT } from "../../packages/framework/core/tools/amadeus-mirror-presentation.ts";
import { decideMirrorAction } from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import {
  EMPTY_MIRROR_STATE,
  renderMirrorStateBlock,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import {
  cleanupTestProject,
  createTestProject,
  DEFAULT_INTENT_UUID,
  DEFAULT_RECORD_DIR,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedStateFile,
  seededStateFile,
} from "../harness/fixtures.ts";

// A recorded mirror as a real create writes it: the v1 block's issueNumber and
// provenance are the authority the boundary decision reads.
const RECORDED_MIRROR = renderMirrorStateBlock({
  ...EMPTY_MIRROR_STATE,
  issueNumber: 1748,
  provenance: {
    schema: 1,
    createIdentity: {
      schema: 1,
      intentUuid: DEFAULT_INTENT_UUID,
      intentDir: DEFAULT_RECORD_DIR,
      repository: { owner: "acme", name: "app", canonical: "acme/app" },
      operationId: "op-1750",
      preparedAt: "2026-07-30T00:00:00Z",
    },
    issueNumber: 1748,
    createdAt: "2026-07-30T00:00:00Z",
  },
});

const projects: string[] = [];
afterEach(() => {
  for (const project of projects.splice(0)) cleanupTestProject(project);
});

class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

function captureRun(fn: () => void): {
  exited: boolean;
  stdout: string;
  stderr: string;
} {
  let stdout = "";
  let stderr = "";
  const originalExit = process.exit;
  const originalLog = console.log;
  const originalError = console.error;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.log = (...args: unknown[]) => {
    stdout += `${args.map(String).join(" ")}\n`;
  };
  console.error = (...args: unknown[]) => {
    stderr += `${args.map(String).join(" ")}\n`;
  };
  let exited = false;
  try {
    fn();
  } catch (cause) {
    if (cause instanceof ExitSignal) exited = true;
    else throw cause;
  } finally {
    process.exit = originalExit;
    console.log = originalLog;
    console.error = originalError;
  }
  return { exited, stdout, stderr };
}

// A brand-new Intent under a scope that SKIPs Ideation: the state-fix-postinit
// fixture carries `Ideation: Skipped`, Lifecycle Phase INCEPTION, and the first
// business stage (reverse-engineering) as Current Stage — exactly the shape
// #1750 was reported against.
function seedIntent(
  options: {
    mode?: "off" | "prompt" | "auto";
    fixture?: string;
    receipt?: "pending" | "completed";
    mirrorRecorded?: boolean;
  } = {},
): string {
  resetAidlcEnv();
  const project = createTestProject();
  projects.push(project);
  seedStateFile(
    project,
    join(FIXTURES_DIR, options.fixture ?? "state-fix-postinit.md"),
  );
  if (options.mode !== undefined) {
    writeFileSync(
      join(project, "amadeus", "config.json"),
      JSON.stringify({ "intent-mirror": { github: { issue: { consent: options.mode } } } }),
    );
  }
  const path = seededStateFile(project);
  let state = readFileSync(path, "utf-8");
  if (options.receipt !== undefined) {
    state = state.replace(
      "## Runtime State",
      `## Runtime State\n- **Mirror Initial Create Receipt**: ${options.receipt}`,
    );
  }
  if (options.mirrorRecorded) state = `${state.trimEnd()}\n\n${RECORDED_MIRROR}\n`;
  writeFileSync(path, state);
  return project;
}

function nextDirective(project: string): { kind: string; message?: string } {
  const run = captureRun(() => handleNext([], project));
  const lines = run.stdout.trim().split("\n");
  return JSON.parse(lines[lines.length - 1]) as {
    kind: string;
    message?: string;
  };
}

describe("t371 intent-initialized boundary emission", () => {
  test("auto fires the first create before the first business stage", () => {
    const project = seedIntent({ mode: "auto" });
    const directive = nextDirective(project);
    expect(directive.kind).toBe("print");
    expect(directive.message).toContain(
      "amadeus-mirror-lifecycle.ts boundary intent-initialized",
    );
    // The receipt is prepared first and settled after, so an interrupted
    // attempt is recoverable rather than silently repeated.
    expect(directive.message).toContain(
      "mirror-initial-create pending --from absent",
    );
    expect(directive.message).toContain(
      "mirror-initial-create completed --from pending",
    );
    // The gap #1750 reported: the Issue exists before reverse-engineering runs.
    expect(directive.message).not.toContain("reverse-engineering");
  });

  test("the boundary is scope-independent, not tied to a SKIPped Ideation", () => {
    const project = seedIntent({
      mode: "auto",
      fixture: "state-mid-ideation.md",
    });
    expect(nextDirective(project).message).toContain(
      "boundary intent-initialized",
    );
  });

  test.each([
    ["unset", undefined],
    ["off", "off" as const],
    ["prompt", "prompt" as const],
  ])("%s leaves routing untouched", (_label, mode) => {
    const project = seedIntent(mode === undefined ? {} : { mode });
    const directive = nextDirective(project);
    expect(directive.kind).toBe("run-stage");
    expect(JSON.stringify(directive)).not.toContain("intent-initialized");
  });
});

describe("t371 established boundaries keep their behaviour", () => {
  // A verified phase with an unrecorded receipt is still the phase boundary's
  // to answer: the initial-create branch must not intercept it.
  function seedVerifiedPhase(): string {
    const project = seedIntent({ mode: "auto" });
    const path = seededStateFile(project);
    const state = readFileSync(path, "utf-8")
      .replace(/- \*\*Ideation\*\*: [^\n]+/, "- **Ideation**: Verified")
      .replace(/- \*\*Current Stage\*\*: [^\n]+/, "- **Current Stage**: reverse-engineering");
    writeFileSync(path, state);
    return project;
  }

  test("a verified phase still routes to the phase boundary", () => {
    const directive = nextDirective(seedVerifiedPhase());
    expect(directive.kind).toBe("print");
    expect(directive.message).toContain("boundary phase --phase ideation");
    expect(directive.message).toContain("mirror-boundary ideation pending --from absent");
    expect(directive.message).not.toContain("intent-initialized");
  });

  test("a completed phase receipt falls through to the initial create", () => {
    const project = seedVerifiedPhase();
    const path = seededStateFile(project);
    writeFileSync(
      path,
      readFileSync(path, "utf-8").replace(
        "## Runtime State",
        '## Runtime State\n- **Mirror Boundary Receipts**: {"ideation":"completed"}',
      ),
    );
    expect(nextDirective(project).message).toContain("boundary intent-initialized");
  });

  test("an unreadable initial-create receipt fails closed", () => {
    const project = seedIntent({ mode: "auto" });
    const path = seededStateFile(project);
    writeFileSync(
      path,
      readFileSync(path, "utf-8").replace(
        "## Runtime State",
        "## Runtime State\n- **Mirror Initial Create Receipt**: maybe",
      ),
    );
    const directive = nextDirective(project);
    expect(directive.kind).toBe("error");
    expect(directive.message).toContain("must be pending or completed");
  });
});

describe("t371 initial-create idempotency", () => {
  test("a completed receipt settles the boundary", () => {
    const project = seedIntent({ mode: "auto", receipt: "completed" });
    expect(nextDirective(project).kind).toBe("run-stage");
  });

  test("a recorded Issue settles the boundary without a second create", () => {
    const project = seedIntent({ mode: "auto", mirrorRecorded: true });
    expect(nextDirective(project).kind).toBe("run-stage");
  });

  test("a pending receipt is reissued without re-preparing it", () => {
    const project = seedIntent({ mode: "auto", receipt: "pending" });
    const directive = nextDirective(project);
    expect(directive.kind).toBe("print");
    expect(directive.message).toContain("boundary intent-initialized");
    expect(directive.message).not.toContain("pending --from absent");
    expect(directive.message).toContain(
      "the pending receipt makes a later retry safe",
    );
  });

  // A pending receipt is not a first firing: an operation already started, so it
  // is reissued wherever a pending PHASE receipt would be. Only the first firing
  // is auto-only.
  test("a pending receipt is reissued in prompt, like a pending phase receipt", () => {
    const project = seedIntent({ mode: "prompt", receipt: "pending" });
    const directive = nextDirective(project);
    expect(directive.kind).toBe("print");
    expect(directive.message).toContain("boundary intent-initialized");
    expect(directive.message).toContain(
      "mirror-initial-create completed --from pending",
    );
  });

  test("prompt still does not fire the first create itself", () => {
    expect(nextDirective(seedIntent({ mode: "prompt" })).kind).toBe("run-stage");
  });

  test("off suppresses a pending receipt, as it does a pending phase receipt", () => {
    const project = seedIntent({ mode: "off", receipt: "pending" });
    const before = readFileSync(seededStateFile(project), "utf-8");
    expect(nextDirective(project).kind).toBe("run-stage");
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
  });

  test("a pending receipt over a recorded Issue still resolves to no new create", () => {
    const project = seedIntent({
      mode: "auto",
      receipt: "pending",
      mirrorRecorded: true,
    });
    expect(nextDirective(project).message).toContain(
      "boundary intent-initialized",
    );
    // With an Issue recorded the coordinator selects sync, not a second create.
    const decision = decideMirrorAction({
      kind: "lifecycle",
      mode: "auto",
      event: {
        intentUuid: DEFAULT_INTENT_UUID,
        boundary: { kind: "intent-initialized", instance: "intent-initialized" },
        operation: "sync",
      },
      state: EMPTY_MIRROR_STATE,
    });
    expect(decision.kind).toBe("execute");
  });

  test("the instance is fixed so every retry lands on one receipt", () => {
    const first = seedIntent({ mode: "auto" });
    const second = seedIntent({ mode: "auto" });
    expect(nextDirective(first).message).toContain(
      '--instance "intent-initialized"',
    );
    expect(nextDirective(second).message).toContain(
      '--instance "intent-initialized"',
    );
  });
});

describe("t371 initial-create receipt axis", () => {
  function receiptRun(project: string, args: string[]) {
    const saved = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = project;
    try {
      return captureRun(() => handleMirrorInitialCreate(args));
    } finally {
      if (saved === undefined) delete process.env.CLAUDE_PROJECT_DIR;
      else process.env.CLAUDE_PROJECT_DIR = saved;
    }
  }

  test("absent to pending to completed writes its own field", () => {
    const project = seedIntent({ mode: "auto" });
    expect(
      receiptRun(project, ["pending", "--from", "absent"]).exited,
    ).toBe(false);
    const prepared = readFileSync(seededStateFile(project), "utf-8");
    expect(prepared).toContain("**Mirror Initial Create Receipt**: pending");
    // The three-phase receipt vocabulary is a separate axis and stays untouched.
    expect(prepared).not.toContain("Mirror Boundary Receipts");

    expect(
      receiptRun(project, ["completed", "--from", "pending"]).exited,
    ).toBe(false);
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain(
      "**Mirror Initial Create Receipt**: completed",
    );
  });

  test("a mismatched expectation is refused and leaves the bytes unchanged", () => {
    const project = seedIntent({ mode: "auto", receipt: "pending" });
    const before = readFileSync(seededStateFile(project), "utf-8");
    const run = receiptRun(project, ["completed", "--from", "absent"]);
    expect(run.exited).toBe(true);
    expect(run.stderr).toContain("Mirror initial create expected absent");
    expect(readFileSync(seededStateFile(project), "utf-8")).toBe(before);
  });

  test("the shipped CLI routes the subcommand the directive names", () => {
    const project = seedIntent({ mode: "auto" });
    const tool = join(
      import.meta.dir,
      "..",
      "..",
      "dist",
      "claude",
      ".claude",
      "tools",
      "amadeus-state.ts",
    );
    const result = spawnSync(
      process.execPath,
      [tool, "mirror-initial-create", "pending", "--from", "absent"],
      { encoding: "utf-8", env: { ...process.env, CLAUDE_PROJECT_DIR: project } },
    );
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({
      updated: true,
      status: "pending",
    });
    expect(readFileSync(seededStateFile(project), "utf-8")).toContain(
      "**Mirror Initial Create Receipt**: pending",
    );
  });

  test("an unknown status is refused as usage", () => {
    const project = seedIntent({ mode: "auto" });
    const run = receiptRun(project, ["done", "--from", "absent"]);
    expect(run.exited).toBe(true);
    expect(run.stderr).toContain("mirror-initial-create");
  });
});

describe("t371 lifecycle boundary contract", () => {
  test("the CLI accepts the intent-initialized boundary", () => {
    const parsed = parseMirrorLifecycleArgs([
      "boundary",
      "intent-initialized",
      "--instance",
      "intent-initialized",
    ]);
    expect(parsed.kind).toBe("request");
    if (parsed.kind !== "request") return;
    expect(parsed.request.boundary).toEqual({
      kind: "intent-initialized",
      instance: "intent-initialized",
    });
  });

  test("the boundary joins the published contract", () => {
    expect(MIRROR_USER_CONTRACT.boundaries).toContain("intent-initialized");
    expect(
      MIRROR_USER_CONTRACT.boundaryCommands.some(
        (command) =>
          command.path[0] === "boundary" &&
          command.path[1] === "intent-initialized",
      ),
    ).toBe(true);
  });

  test("an unknown boundary sub-verb is still usage", () => {
    expect(
      parseMirrorLifecycleArgs([
        "boundary",
        "intent-initialised",
        "--instance",
        "typo",
      ]).kind,
    ).toBe("usage");
  });
});
