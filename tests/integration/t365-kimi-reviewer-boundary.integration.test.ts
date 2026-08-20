// covers: tool:amadeus-orchestrate:gate-reserve,
//         tool:amadeus-presence-reservation,
//         file:dist/kimi/.kimi-code/agents/amadeus-product-lead-agent.md,
//         file:dist/kimi/.kimi-code/agents/amadeus-architecture-reviewer-agent.md
// size: medium

import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import * as fs from "node:fs";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { plantV1AuditRow } from "../harness/v1-audit-fixture.ts";
import {
  armPresenceReservation,
  cancelArmedPresenceReservation,
  consumePresenceReservation,
  findActivePresenceReservation,
  hostSessionCapability,
  mintArmedPresenceReservation,
  mintHumanPresence,
  readPresenceReservation,
} from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import {
  handleGateReject,
  handleGateReserve,
  handleReport,
  openGateForKimiReservation,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  handleApprove,
  handleGateStart,
  handleReject,
  handleRevise,
} from "../../packages/framework/core/tools/amadeus-state.ts";
import {
  auditBlockField,
  auditShardName,
  readAllAuditShards,
  splitAuditRecords,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  runAdapter,
  updateKimiSubagentRole,
} from "../../packages/framework/harness/kimi/hooks/amadeus-kimi-lib.ts";
import {
  createTestProject,
  DEFAULT_INTENT_UUID,
  seededRecordDir,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const ROOT = join(import.meta.dir, "..", "..");
const ENGINE = join(
  ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-orchestrate.ts",
);
const STATE = join(
  ROOT,
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-state.ts",
);
const MINT = join(
  ROOT,
  "packages",
  "framework",
  "core",
  "hooks",
  "amadeus-mint-presence.ts",
);
const SESSION_START = join(
  ROOT,
  "packages",
  "framework",
  "core",
  "hooks",
  "amadeus-session-start.ts",
);
const GRAPH = join(ROOT, ".codex", "tools", "data", "stage-graph.json");
const REVIEWER_PROFILES = [
  "amadeus-product-lead-agent.md",
  "amadeus-architecture-reviewer-agent.md",
] as const;
const SECOND_INTENT_UUID = "00000000-0000-7000-8000-000000000002";
const SECOND_INTENT_DIR = "alternate-8000000000000002";
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function environment(): Record<string, string | undefined> {
  return {
    ...process.env,
    AMADEUS_HARNESS_DIR: ".kimi-code",
    AMADEUS_HARNESS_TYPE: "kimi",
    AMADEUS_STAGE_GRAPH: GRAPH,
    AMADEUS_SKIP_ARTIFACT_GUARD: "1",
  };
}

function freshWorkflow(): string {
  // Each fixture project is a distinct workspace; the canonical emit path
  // registers OTel providers for one workspace per process, so drop the
  // per-process registrations whenever a new fixture project is minted.
  resetOtelPerProject();
  const root = createTestProject();
  roots.push(root);
  seedStateFile(root, "state-mid-inception.md");
  alignSeededRegistry(root);
  startKimiSession(root);
  return root;
}

function alignSeededRegistry(root: string): void {
  const registryPath = join(
    root,
    "amadeus",
    "spaces",
    "default",
    "intents",
    "intents.json",
  );
  const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
  registry[0].dirName = seededRecordDir(root).split("/").at(-1);
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
}

function startKimiSession(root: string): void {
  mkdirSync(join(root, ".kimi-code", "tools"), { recursive: true });
  const payload = JSON.stringify({
    hook_event_name: "SessionStart",
    source: "startup",
    session_id: "main-session",
    cwd: root,
  });
  runAdapter(
    "session-start",
    payload,
    root,
    () => ({ stdout: "", code: 0 }),
  );
  const child = Bun.spawnSync([process.execPath, SESSION_START], {
    cwd: root,
    stdin: Buffer.from(payload, "utf-8"),
    stdout: "pipe",
    stderr: "pipe",
    env: environment(),
  });
  if (child.exitCode !== 0) {
    throw new Error(child.stderr.toString() || child.stdout.toString());
  }
}

function addSecondIntentAndSelectIt(root: string): string {
  const intentsDir = join(
    root,
    "amadeus",
    "spaces",
    "default",
    "intents",
  );
  const registryPath = join(intentsDir, "intents.json");
  const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
  registry.push({
    uuid: SECOND_INTENT_UUID,
    slug: "alternate",
    status: "in-flight",
    dirName: SECOND_INTENT_DIR,
  });
  writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  const secondState = join(intentsDir, SECOND_INTENT_DIR, "amadeus-state.md");
  mkdirSync(join(intentsDir, SECOND_INTENT_DIR), { recursive: true });
  writeFileSync(secondState, readFileSync(seededStateFile(root), "utf-8"));
  writeFileSync(join(intentsDir, "active-intent"), `${SECOND_INTENT_DIR}\n`);
  return secondState;
}

function runTool(
  root: string,
  tool: string,
  args: string[],
  stdin?: string,
) {
  const child = Bun.spawnSync(
    [process.execPath, tool, ...args, "--project-dir", root],
    {
      cwd: root,
      ...(stdin === undefined ? {} : { stdin: Buffer.from(stdin, "utf-8") }),
      stdout: "pipe",
      stderr: "pipe",
      env: environment(),
    },
  );
  return {
    code: child.exitCode,
    stdout: child.stdout.toString(),
    stderr: child.stderr.toString(),
  };
}

function stopResult(
  root: string,
  caller: "main" | "reviewer",
) {
  const calls: string[] = [];
  const result = runAdapter(
    "stop",
    JSON.stringify({
      hook_event_name: "Stop",
      session_id: caller === "main" ? "main-session" : "",
      cwd: root,
      ...(caller === "reviewer"
        ? { agent_name: "amadeus-architecture-reviewer-agent" }
        : {}),
      stop_hook_active: false,
    }),
    root,
    (hookFile) => {
      calls.push(hookFile);
      return {
        stdout: '{"decision":"block","reason":"must not run"}',
        code: 0,
      };
    },
  );
  return { result, calls };
}

function toolsFromProfile(text: string): string[] {
  const match = /^tools:\s*\[([^\]]*)\]\s*$/m.exec(text);
  if (!match) throw new Error("Kimi reviewer profile has no tools allowlist");
  return match[1]!
    .split(",")
    .map((tool) => tool.trim())
    .filter(Boolean);
}

function withHarness<T>(
  harness: "kimi" | "codex",
  action: () => T,
): T {
  const previousType = process.env.AMADEUS_HARNESS_TYPE;
  const previousDir = process.env.AMADEUS_HARNESS_DIR;
  const previousGraph = process.env.AMADEUS_STAGE_GRAPH;
  process.env.AMADEUS_HARNESS_TYPE = harness;
  process.env.AMADEUS_HARNESS_DIR =
    harness === "kimi" ? ".kimi-code" : ".codex";
  process.env.AMADEUS_STAGE_GRAPH = GRAPH;
  try {
    return action();
  } finally {
    if (previousType === undefined) {
      delete process.env.AMADEUS_HARNESS_TYPE;
    } else {
      process.env.AMADEUS_HARNESS_TYPE = previousType;
    }
    if (previousDir === undefined) {
      delete process.env.AMADEUS_HARNESS_DIR;
    } else {
      process.env.AMADEUS_HARNESS_DIR = previousDir;
    }
    if (previousGraph === undefined) {
      delete process.env.AMADEUS_STAGE_GRAPH;
    } else {
      process.env.AMADEUS_STAGE_GRAPH = previousGraph;
    }
  }
}

function captureDirective(action: () => void): Record<string, unknown> {
  const output: string[] = [];
  const log = spyOn(console, "log").mockImplementation((value) => {
    output.push(String(value));
  });
  try {
    action();
  } finally {
    log.mockRestore();
  }
  if (output.length !== 1) {
    throw new Error(`Expected one directive, received ${output.length}`);
  }
  return JSON.parse(output[0]!) as Record<string, unknown>;
}

class ExitSignal extends Error {
  constructor(readonly code: number) {
    super(`exit ${code}`);
  }
}

function captureExit(action: () => void): {
  readonly code: number | null;
  readonly stderr: string;
} {
  const originalExit = process.exit.bind(process);
  const originalError = console.error;
  let code: number | null = null;
  let stderr = "";
  process.exit = ((value?: number) => {
    throw new ExitSignal(value ?? 0);
  }) as typeof process.exit;
  console.error = (...values: unknown[]) => {
    stderr += values.map(String).join(" ");
  };
  try {
    action();
  } catch (cause) {
    if (cause instanceof ExitSignal) {
      code = cause.code;
    } else {
      throw cause;
    }
  } finally {
    process.exit = originalExit;
    console.error = originalError;
  }
  return { code, stderr };
}

function withStateProject<T>(root: string, action: () => T): T {
  const previous = process.env.CLAUDE_PROJECT_DIR;
  process.env.CLAUDE_PROJECT_DIR = root;
  try {
    return withHarness("kimi", action);
  } finally {
    if (previous === undefined) {
      delete process.env.CLAUDE_PROJECT_DIR;
    } else {
      process.env.CLAUDE_PROJECT_DIR = previous;
    }
  }
}

function reserveInProcess(root: string, stage = "requirements-analysis") {
  return withHarness("kimi", () =>
    captureDirective(() =>
      handleGateReserve(["--stage", stage], root)
    )
  );
}

function mintGateQuestion(root: string, reservationId: string) {
  return runAdapter(
    "mint",
    JSON.stringify({
      hook_event_name: "PostToolUse",
      session_id: "main-session",
      cwd: root,
      tool_name: "AskUserQuestion",
      tool_input: {
        questions: [{
          question:
            `Approve or Request Changes? [Presence Reservation Id: ${reservationId}]`,
          options: [{ label: "Approve" }, { label: "Request Changes" }],
        }],
      },
    }),
    root,
    (_hookFile, input) => {
      const minted = runTool(root, MINT, [], input);
      return { stdout: minted.stdout, code: minted.code };
    },
  );
}

describe("Kimi reviewer boundary and gate provenance", () => {
  // Each case builds its own fixture project; the canonical emit path registers
  // a Logger Provider for one workspace per process, so drop it between cases.
  beforeEach(() => {
    resetOtelPerProject();
  });

  test("projected reviewer profiles expose only the Kimi 0.29 read-tool allowlist", () => {
    for (const profile of REVIEWER_PROFILES) {
      const text = readFileSync(
        join(ROOT, "dist", "kimi", ".kimi-code", "agents", profile),
        "utf-8",
      );
      const tools = toolsFromProfile(text);
      expect(tools).toEqual(["Read", "Grep", "Glob"]);
      expect(tools).not.toContain("Bash");
      expect(tools).not.toContain("Write");
      expect(tools).not.toContain("Edit");
    }
  });

  test("only the host-stamped main Stop forwards to the stateful core hook", () => {
    const root = freshWorkflow();
    const main = stopResult(root, "main");
    expect(main.result).toEqual({
      stdout: '{"decision":"block","reason":"must not run"}',
      exitCode: 0,
      stderr: "",
    });
    expect(main.calls).toEqual(["amadeus-stop.ts"]);

    const reviewer = stopResult(root, "reviewer");
    expect(reviewer.result).toEqual({ stdout: "", exitCode: 0, stderr: "" });
    expect(reviewer.calls).toEqual([]);

    runAdapter(
      "role-start",
      JSON.stringify({
        hook_event_name: "SubagentStart",
        session_id: "",
        cwd: root,
        agent_name: "explore",
      }),
      root,
      () => ({ stdout: "", code: 0 }),
    );
    const mainDuringSubagent = stopResult(root, "main");
    expect(mainDuringSubagent.result).toEqual({
      stdout: "",
      exitCode: 0,
      stderr: "",
    });
    expect(mainDuringSubagent.calls).toEqual([]);

    runAdapter(
      "log-subagent",
      JSON.stringify({
        hook_event_name: "SubagentStop",
        session_id: "",
        cwd: root,
        agent_name: "explore",
      }),
      root,
      () => ({ stdout: "", code: 0 }),
    );
    expect(stopResult(root, "main").calls).toEqual(["amadeus-stop.ts"]);
  });

  test.each([
    "missing",
    "malformed",
    "locked",
    "session-end-lock-race",
  ] as const)(
    "%s Kimi baseline denies mutation without changing state or audit",
    (carrierState) => {
      const root = freshWorkflow();
      const markerPath = join(
        root,
        "amadeus",
        ".amadeus-sessions",
        "kimi-active-subagents.json",
      );
      if (carrierState === "missing") {
        unlinkSync(markerPath);
      } else if (carrierState === "malformed") {
        writeFileSync(markerPath, '{"version":1,"roles":{}}\n');
      } else if (carrierState === "locked") {
        mkdirSync(`${markerPath}.lock`);
      } else {
        mkdirSync(`${markerPath}.lock`);
        runAdapter(
          "session-end",
          JSON.stringify({
            hook_event_name: "SessionEnd",
            session_id: "main-session",
            cwd: root,
            reason: "exit",
          }),
          root,
          () => ({ stdout: "", code: 0 }),
        );
        expect(
          readFileSync(
            join(
              root,
              "amadeus",
              ".amadeus-sessions",
              "kimi-session-ended-deny",
            ),
            "utf-8",
          ),
        ).toContain("session-ended");
      }

      const stateBefore = readFileSync(seededStateFile(root), "utf-8");
      const auditBefore = readAllAuditShards(root);
      const denied = runTool(root, ENGINE, ["next"]);
      expect(denied.stdout || denied.stderr).toContain(
        "is not the main conductor",
      );
      expect(readFileSync(seededStateFile(root), "utf-8")).toBe(stateBefore);
      expect(readAllAuditShards(root)).toBe(auditBefore);
    },
  );

  test("failed SubagentStart persistence leaves a deny latch and state/audit unchanged", () => {
    const root = freshWorkflow();
    updateKimiSubagentRole(
      root,
      "amadeus-architecture-reviewer-agent",
      "start",
      () => {
        throw new Error("injected marker persistence failure");
      },
    );

    const denyPath = join(
      root,
      "amadeus",
      ".amadeus-sessions",
      "kimi-subagent-transition-deny",
    );
    expect(readFileSync(denyPath, "utf-8")).toContain("subagent-start");
    const stateBefore = readFileSync(seededStateFile(root), "utf-8");
    const auditBefore = readAllAuditShards(root);
    const denied = runTool(root, STATE, [
      "set",
      "Test Strategy=Comprehensive",
    ]);
    expect(denied.stdout || denied.stderr).toContain(
      "is not the main conductor",
    );
    expect(readFileSync(seededStateFile(root), "utf-8")).toBe(stateBefore);
    expect(readAllAuditShards(root)).toBe(auditBefore);
  });

  test("ambient Kimi subagent cannot retrieve an existing gate reservation", () => {
    const root = freshWorkflow();
    const reserved = runTool(root, ENGINE, [
      "gate-reserve",
      "--stage",
      "requirements-analysis",
    ]);
    expect(reserved.code).toBe(0);
    expect(JSON.parse(reserved.stdout).kind).toBe("await-approval");

    const roleStarted = runAdapter(
      "role-start",
      JSON.stringify({
        hook_event_name: "SubagentStart",
        session_id: "",
        cwd: root,
        agent_name: "amadeus-architecture-reviewer-agent",
      }),
      root,
    );
    expect(roleStarted.exitCode).toBe(0);

    const stateBefore = readFileSync(seededStateFile(root), "utf-8");
    const auditBefore = readAllAuditShards(root);
    const denied = runTool(root, ENGINE, [
      "gate-reserve",
      "--stage",
      "requirements-analysis",
    ]);

    expect(denied.stdout || denied.stderr).toContain(
      "is not the main conductor",
    );
    expect(readFileSync(seededStateFile(root), "utf-8")).toBe(stateBefore);
    expect(readAllAuditShards(root)).toBe(auditBefore);
  });

  test.each([
    "amadeus-architecture-reviewer-agent",
    "support",
    "explore",
  ])(
    "ambient Kimi %s presence blocks even main-looking engine/state mutations",
    (role) => {
      const root = freshWorkflow();
      const roleStarted = runAdapter(
        "role-start",
        JSON.stringify({
          hook_event_name: "SubagentStart",
          session_id: "",
          cwd: root,
          agent_name: role,
        }),
        root,
        () => ({ stdout: "", code: 0 }),
      );
      expect(roleStarted.exitCode).toBe(0);

      const stateBefore = readFileSync(seededStateFile(root), "utf-8");
      const auditBefore = readAllAuditShards(root);
      const reservationsDir = join(
        root,
        "amadeus",
        ".amadeus-sessions",
        "presence-reservations",
      );
      const reservationsBefore = existsSync(reservationsDir)
        ? readdirSync(reservationsDir).sort()
        : [];
      for (const [tool, args] of [
        [ENGINE, ["next"]],
        [
          ENGINE,
          [
            "report",
            "--stage",
            "requirements-analysis",
            "--result",
            "approved",
            "--user-input",
            "Approve",
          ],
        ],
        [ENGINE, ["park"]],
        [
          ENGINE,
          ["gate-reserve", "--stage", "requirements-analysis"],
        ],
        [
          ENGINE,
          [
            "gate-reject",
            "--stage",
            "requirements-analysis",
            "--target-intent-id",
            "00000000-0000-7000-8000-000000000001",
            "--presence-reservation-id",
            "00000000-0000-4000-8000-000000000001",
          ],
        ],
        [STATE, ["set", "Current Status=COMPLETE"]],
      ] as const) {
        const denied = runTool(root, tool, [...args]);
        const output = denied.stdout || denied.stderr;
        expect(output).toContain("is not the main conductor");
      }
      expect(readFileSync(seededStateFile(root), "utf-8")).toBe(stateBefore);
      expect(readAllAuditShards(root)).toBe(auditBefore);
      expect(
        existsSync(reservationsDir)
          ? readdirSync(reservationsDir).sort()
          : [],
      ).toEqual(reservationsBefore);
      expect(stopResult(root, "main").calls).toEqual([]);

      runAdapter(
        "log-subagent",
        JSON.stringify({
          hook_event_name: "SubagentStop",
          session_id: "",
          cwd: root,
          agent_name: role,
        }),
        root,
        () => ({ stdout: "", code: 0 }),
      );
      const mainNext = runTool(root, ENGINE, ["next"]);
      expect(mainNext.stdout).not.toContain("is not the main conductor");
      expect(JSON.parse(mainNext.stdout).kind).toBe("run-stage");
    },
  );

  test("host-stamped main retains next, report, park, and direct state compatibility", () => {
    const nextRoot = freshWorkflow();
    const next = runTool(nextRoot, ENGINE, ["next"]);
    expect(JSON.parse(next.stdout).kind).toBe("run-stage");

    const reportRoot = freshWorkflow();
    const report = runTool(reportRoot, ENGINE, [
      "report",
      "--stage",
      "requirements-analysis",
      "--result",
      "approved",
      "--user-input",
      "Approve",
    ]);
    expect(report.stdout).not.toContain("is not the main conductor");

    const parkRoot = freshWorkflow();
    const park = runTool(parkRoot, ENGINE, ["park"]);
    expect(JSON.parse(park.stdout).kind).toBe("parked");

    const stateRoot = freshWorkflow();
    const state = runTool(stateRoot, STATE, [
      "set",
      "Test Strategy=Comprehensive",
    ]);
    expect(state.code).toBe(0);
    expect(readFileSync(seededStateFile(stateRoot), "utf-8")).toContain(
      "**Test Strategy**: Comprehensive",
    );
  });

  test("gate-reserve leaves state and audit unchanged for corrupt or conflicting reservations", () => {
    for (const fixture of ["corrupt", "conflicting"] as const) {
      const root = freshWorkflow();
      if (fixture === "corrupt") {
        const reservationDir = join(
          root,
          "amadeus",
          ".amadeus-sessions",
          "presence-reservations",
        );
        mkdirSync(reservationDir, { recursive: true });
        writeFileSync(
          join(
            reservationDir,
            "11111111-1111-4111-8111-111111111111.json",
          ),
          "{\"version\":1}\n",
        );
      } else {
        armPresenceReservation({
          projectDir: root,
          sessionId: "main-session",
          space: "default",
          targetIntentId: DEFAULT_INTENT_UUID,
          stage: "application-design",
          routeId: "22222222-2222-4222-8222-222222222222",
          reservationIdFactory: () =>
            "33333333-3333-4333-8333-333333333333",
        });
      }
      const stateBefore = readFileSync(seededStateFile(root), "utf-8");
      const auditBefore = readAllAuditShards(root);

      const result = runTool(root, ENGINE, [
        "gate-reserve",
        "--stage",
        "requirements-analysis",
      ]);

      expect(JSON.parse(result.stdout).kind).toBe("error");
      expect(readFileSync(seededStateFile(root), "utf-8")).toBe(stateBefore);
      expect(readAllAuditShards(root)).toBe(auditBefore);
    }
  });

  test("in-process gate-reserve covers happy retry, owner, and fail-closed routes", () => {
    const root = freshWorkflow();
    const unreservedApproval = withHarness("kimi", () =>
      captureDirective(() =>
        handleReport([
          "--stage",
          "requirements-analysis",
          "--result",
          "approved",
          "--user-input",
          "Approve",
        ], root)
      )
    );
    expect(unreservedApproval.kind).toBe("error");
    expect(String(unreservedApproval.message)).toContain(
      "requires the stage reservation carrier",
    );

    const completedRoot = freshWorkflow();
    const completedStatePath = seededStateFile(completedRoot);
    const completedState = readFileSync(completedStatePath, "utf-8")
      .replace("- **In Progress**: requirements-analysis", "- **In Progress**: code-generation")
      .replace("- [-] requirements-analysis — EXECUTE", "- [x] requirements-analysis — EXECUTE")
      .replace("- [ ] code-generation — EXECUTE", "- [-] code-generation — EXECUTE")
      .replace("- **Current Stage**: requirements-analysis", "- **Current Stage**: code-generation");
    writeFileSync(completedStatePath, completedState);
    const completedReplay = withHarness("kimi", () =>
      captureDirective(() =>
        handleReport([
          "--stage",
          "requirements-analysis",
          "--result",
          "approved",
        ], completedRoot)
      )
    );
    expect(completedReplay.kind).toBe("committed");
    expect(String(completedReplay.reason)).toContain("idempotent re-report");

    const first = reserveInProcess(root);
    if (first.kind !== "await-approval") {
      throw new Error(JSON.stringify(first));
    }
    expect(first.kind).toBe("await-approval");
    expect(first.target_intent_id).toBe(DEFAULT_INTENT_UUID);
    expect(readFileSync(seededStateFile(root), "utf-8")).toContain(
      "- [?] requirements-analysis",
    );

    const auditAfterFirst = readAllAuditShards(root);
    const repeated = reserveInProcess(root);
    expect(repeated.presence_reservation_id).toBe(
      first.presence_reservation_id,
    );
    expect(readAllAuditShards(root)).toBe(auditAfterFirst);

    const missingStage = withHarness("kimi", () =>
      captureDirective(() => handleGateReserve([], root))
    );
    expect(missingStage.kind).toBe("error");

    // #2326 — the harness override is inert here. This root's real evidence is
    // Kimi (its `.kimi-code/` marker), so a "codex" AMADEUS_HARNESS_TYPE no
    // longer closes gate-reserve; the call is the same idempotent retry as
    // above, down to the reservation id and an unchanged ledger. The genuine
    // wrong-harness refusal — a workspace that really is not Kimi — is pinned
    // in t2326-gating-env-independence.
    const overriddenHarness = withHarness("codex", () =>
      captureDirective(() =>
        handleGateReserve(["--stage", "requirements-analysis"], root)
      )
    );
    expect(overriddenHarness.kind).toBe("await-approval");
    expect(overriddenHarness.presence_reservation_id).toBe(
      first.presence_reservation_id,
    );
    expect(readAllAuditShards(root)).toBe(auditAfterFirst);

    const missingSessionRoot = freshWorkflow();
    unlinkSync(
      join(
        missingSessionRoot,
        "amadeus",
        ".amadeus-sessions",
        ".current-session",
      ),
    );
    expect(reserveInProcess(missingSessionRoot).kind).toBe("error");

    const noOwnerRoot = freshWorkflow();
    addSecondIntentAndSelectIt(noOwnerRoot);
    unlinkSync(
      join(
        noOwnerRoot,
        "amadeus",
        "spaces",
        "default",
        "intents",
        "active-intent",
      ),
    );
    expect(reserveInProcess(noOwnerRoot).kind).toBe("error");

    const wrongStageRoot = freshWorkflow();
    const wrongStage = reserveInProcess(
      wrongStageRoot,
      "application-design",
    );
    expect(wrongStage.kind).toBe("error");
    expect(findActivePresenceReservation(wrongStageRoot, "main-session"))
      .toBeNull();

    const conflictingRoot = freshWorkflow();
    armPresenceReservation({
      projectDir: conflictingRoot,
      sessionId: "main-session",
      space: "default",
      targetIntentId: DEFAULT_INTENT_UUID,
      stage: "application-design",
      routeId: "77777777-7777-4777-8777-777777777777",
      reservationIdFactory: () =>
        "77777777-7777-4777-8777-777777777777",
    });
    expect(reserveInProcess(conflictingRoot).kind).toBe("error");

    const transitionFailureRoot = freshWorkflow();
    const transitionFailureReservation = armPresenceReservation({
      projectDir: transitionFailureRoot,
      sessionId: "main-session",
      space: "default",
      targetIntentId: DEFAULT_INTENT_UUID,
      stage: "requirements-analysis",
      routeId: "12121212-1212-4212-8212-121212121212",
      reservationIdFactory: () =>
        "12121212-1212-4212-8212-121212121212",
    });
    const transitionFailure = withHarness("kimi", () => {
      process.env.AMADEUS_STAGE_GRAPH = join(
        transitionFailureRoot,
        "missing-stage-graph.json",
      );
      return openGateForKimiReservation(
        transitionFailureRoot,
        "requirements-analysis",
        transitionFailureReservation,
      );
    });
    expect(transitionFailure).toContain(
      "Transition rejected by amadeus-state.ts gate-start",
    );
  });

  test("in-process gate-reject covers carrier validation and the successful rotation", () => {
    const root = freshWorkflow();
    const reserved = reserveInProcess(root);
    if (reserved.kind !== "await-approval") {
      throw new Error(JSON.stringify(reserved));
    }
    const reservationId = String(reserved.presence_reservation_id);
    expect(
      mintArmedPresenceReservation({
        projectDir: root,
        sessionId: "main-session",
        requireRouteBinding: true,
        route: {
          eventName: "PostToolUse",
          toolName: "AskUserQuestion",
          purposeText: `Approve? ${reservationId}`,
        },
      }).kind,
    ).toBe("minted");

    const rejected = withHarness("kimi", () =>
      captureDirective(() =>
        handleGateReject([
          "--stage",
          "requirements-analysis",
          "--feedback",
          "Modify",
          "--target-intent-id",
          DEFAULT_INTENT_UUID,
          "--presence-reservation-id",
          reservationId,
        ], root)
      )
    );
    expect(rejected.kind).toBe("print");
    expect(readPresenceReservation(root, reservationId)?.state)
      .toBe("consumed");

    expect(
      withHarness("kimi", () =>
        captureDirective(() => handleGateReject([], root))
      ).kind,
    ).toBe("error");
    expect(
      withHarness("codex", () =>
        captureDirective(() =>
          handleGateReject([
            "--stage",
            "requirements-analysis",
            "--target-intent-id",
            DEFAULT_INTENT_UUID,
            "--presence-reservation-id",
            reservationId,
          ], root)
        )
      ).kind,
    ).toBe("error");

    const missingSessionRoot = freshWorkflow();
    unlinkSync(
      join(
        missingSessionRoot,
        "amadeus",
        ".amadeus-sessions",
        ".current-session",
      ),
    );
    expect(
      withHarness("kimi", () =>
        captureDirective(() =>
          handleGateReject([
            "--stage",
            "requirements-analysis",
            "--target-intent-id",
            DEFAULT_INTENT_UUID,
            "--presence-reservation-id",
            "88888888-8888-4888-8888-888888888888",
          ], missingSessionRoot)
        )
      ).kind,
    ).toBe("error");

    const missingMarker = withHarness("kimi", () =>
      captureDirective(() =>
        handleGateReject([
          "--stage",
          "requirements-analysis",
          "--target-intent-id",
          DEFAULT_INTENT_UUID,
          "--presence-reservation-id",
          "88888888-8888-4888-8888-888888888888",
        ], root)
      )
    );
    expect(missingMarker.kind).toBe("error");

    const corruptRoot = freshWorkflow();
    const reservationDir = join(
      corruptRoot,
      "amadeus",
      ".amadeus-sessions",
      "presence-reservations",
    );
    mkdirSync(reservationDir, { recursive: true });
    const corruptId = "99999999-9999-4999-8999-999999999999";
    writeFileSync(join(reservationDir, `${corruptId}.json`), "{\"version\":1}\n");
    const corrupt = withHarness("kimi", () =>
      captureDirective(() =>
        handleGateReject([
          "--stage",
          "requirements-analysis",
          "--target-intent-id",
          DEFAULT_INTENT_UUID,
          "--presence-reservation-id",
          corruptId,
        ], corruptRoot)
      )
    );
    expect(corrupt.kind).toBe("error");

    const armedRoot = freshWorkflow();
    const armed = reserveInProcess(armedRoot);
    const rejectedArmed = withHarness("kimi", () =>
      captureDirective(() =>
        handleGateReject([
          "--stage",
          "requirements-analysis",
          "--target-intent-id",
          DEFAULT_INTENT_UUID,
          "--presence-reservation-id",
          String(armed.presence_reservation_id),
        ], armedRoot)
      )
    );
    expect(rejectedArmed.kind).toBe("error");
  });

  test("in-process state handlers pin targeted reject and revise to the owner intent", () => {
    const root = freshWorkflow();
    const intent = seededRecordDir(root).split("/").at(-1)!;
    const reserved = reserveInProcess(root);
    const reservationId = String(reserved.presence_reservation_id);
    expect(
      mintArmedPresenceReservation({
        projectDir: root,
        sessionId: "main-session",
        requireRouteBinding: true,
        route: {
          eventName: "PostToolUse",
          toolName: "AskUserQuestion",
          purposeText: `Approve? ${reservationId}`,
        },
      }).kind,
    ).toBe("minted");

    const rejected = withStateProject(root, () =>
      captureDirective(() =>
        handleReject([
          "requirements-analysis",
          "--feedback",
          "Modify",
          "--target-intent-id",
          DEFAULT_INTENT_UUID,
          "--presence-reservation-id",
          reservationId,
          "--intent",
          intent,
          "--space",
          "default",
        ])
      )
    );
    expect(rejected.new_state).toBe("revising");
    expect(readPresenceReservation(root, reservationId)?.state)
      .toBe("consumed");

    const revised = withStateProject(root, () =>
      captureDirective(() =>
        handleRevise([
          "requirements-analysis",
          "--intent",
          intent,
          "--space",
          "default",
        ])
      )
    );
    expect(revised.new_state).toBe("awaiting-approval");

    const missingTargetHalf = withStateProject(root, () =>
      captureExit(() =>
        handleReject([
          "requirements-analysis",
          "--target-intent-id",
          DEFAULT_INTENT_UUID,
        ])
      )
    );
    expect(missingTargetHalf.code).toBe(1);
    expect(missingTargetHalf.stderr).toContain(
      "requires both target intent and presence reservation ids",
    );

    const missingStage = withStateProject(root, () =>
      captureExit(() =>
        handleGateStart([
          "--intent",
          intent,
          "--space",
          "default",
        ])
      )
    );
    expect(missingStage.code).toBe(1);
    expect(missingStage.stderr).toContain("Usage: amadeus-state.ts gate-start");
  });

  test("in-process targeted approval stamps the carrier on both audit records", () => {
    const root = freshWorkflow();
    const reserved = reserveInProcess(root);
    const reservationId = String(reserved.presence_reservation_id);
    expect(
      mintArmedPresenceReservation({
        projectDir: root,
        sessionId: "main-session",
        requireRouteBinding: true,
        route: {
          eventName: "PostToolUse",
          toolName: "AskUserQuestion",
          purposeText: `Approve ${reservationId}`,
        },
      }).kind,
    ).toBe("minted");

    const previousArtifactGuard = process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
    process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
    try {
      const approved = withStateProject(root, () =>
        captureDirective(() =>
          handleApprove([
            "requirements-analysis",
            "--user-input",
            "Approve",
            "--target-intent-id",
            DEFAULT_INTENT_UUID,
            "--presence-reservation-id",
            reservationId,
          ])
        )
      );
      expect(approved.kind).toBe("approved");
    } finally {
      if (previousArtifactGuard === undefined) {
        delete process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
      } else {
        process.env.AMADEUS_SKIP_ARTIFACT_GUARD = previousArtifactGuard;
      }
    }

    const ownRecords = splitAuditRecords(readAllAuditShards(root)).filter(
      (block) =>
        auditBlockField(block, "Presence Reservation Id") === reservationId,
    );
    expect(
      ownRecords.map((block) => auditBlockField(block, "Event")),
    ).toEqual(["HUMAN_TURN", "GATE_APPROVED", "STAGE_COMPLETED"]);
  });

  test("in-process targeted rejection refuses malformed, mismatched, and stale carriers", () => {
    const missingArgsRoot = freshWorkflow();
    const missingArgs = withStateProject(missingArgsRoot, () =>
      captureExit(() => handleReject([]))
    );
    expect(missingArgs.code).toBe(1);
    expect(missingArgs.stderr).toContain("Usage: amadeus-state.ts reject");

    const unmintedRoot = freshWorkflow();
    const unmintedIntent = seededRecordDir(unmintedRoot).split("/").at(-1)!;
    const unminted = reserveInProcess(unmintedRoot);
    const invalidPresence = withStateProject(unmintedRoot, () =>
      captureExit(() =>
        handleReject([
          "requirements-analysis",
          "--target-intent-id",
          DEFAULT_INTENT_UUID,
          "--presence-reservation-id",
          String(unminted.presence_reservation_id),
          "--intent",
          unmintedIntent,
          "--space",
          "default",
        ])
      )
    );
    expect(invalidPresence.code).toBe(1);
    expect(invalidPresence.stderr).toContain("Invalid targeted human presence");

    const noSessionRoot = freshWorkflow();
    const noSessionIntent = seededRecordDir(noSessionRoot).split("/").at(-1)!;
    const noSession = reserveInProcess(noSessionRoot);
    unlinkSync(
      join(
        noSessionRoot,
        "amadeus",
        ".amadeus-sessions",
        ".current-session",
      ),
    );
    const missingSession = withStateProject(noSessionRoot, () =>
      captureExit(() =>
        handleReject([
          "requirements-analysis",
          "--target-intent-id",
          DEFAULT_INTENT_UUID,
          "--presence-reservation-id",
          String(noSession.presence_reservation_id),
          "--intent",
          noSessionIntent,
          "--space",
          "default",
        ])
      )
    );
    expect(missingSession.code).toBe(1);
    expect(missingSession.stderr).toContain("trusted session identity");

    const ownerRoot = freshWorkflow();
    const ownerReservation = reserveInProcess(ownerRoot);
    const ownerReservationId = String(
      ownerReservation.presence_reservation_id,
    );
    expect(
      mintArmedPresenceReservation({
        projectDir: ownerRoot,
        sessionId: "main-session",
        requireRouteBinding: true,
        route: {
          eventName: "PostToolUse",
          toolName: "AskUserQuestion",
          purposeText: `Approve ${ownerReservationId}`,
        },
      }).kind,
    ).toBe("minted");
    addSecondIntentAndSelectIt(ownerRoot);
    const wrongOwner = withStateProject(ownerRoot, () =>
      captureExit(() =>
        handleReject([
          "requirements-analysis",
          "--target-intent-id",
          DEFAULT_INTENT_UUID,
          "--presence-reservation-id",
          ownerReservationId,
          "--intent",
          SECOND_INTENT_DIR,
          "--space",
          "default",
        ])
      )
    );
    expect(wrongOwner.code).toBe(1);
    expect(wrongOwner.stderr).toContain(
      "does not match the targeted rejection owner",
    );

    const staleRoot = freshWorkflow();
    const staleIntent = seededRecordDir(staleRoot).split("/").at(-1)!;
    const stale = reserveInProcess(staleRoot);
    const staleReservationId = String(stale.presence_reservation_id);
    expect(
      mintArmedPresenceReservation({
        projectDir: staleRoot,
        sessionId: "main-session",
        requireRouteBinding: true,
        route: {
          eventName: "PostToolUse",
          toolName: "AskUserQuestion",
          purposeText: `Approve ${staleReservationId}`,
        },
      }).kind,
    ).toBe("minted");
    const shard = join(
      seededRecordDir(staleRoot),
      "audit",
      auditShardName(staleRoot),
    );
    const rows = readFileSync(shard, "utf-8")
      .split("\n")
      .filter((line) => line.trim().length > 0);
    const previous = JSON.parse(rows.at(-1)!) as {
      cloneId: string;
      intentId: string;
    };
    rows.push(JSON.stringify({
      schemaVersion: 1,
      seq: rows.length + 1,
      cloneId: previous.cloneId,
      intentId: previous.intentId,
      timestamp: new Date(Date.now() + 60_000).toISOString(),
      heading: "Stage Awaiting Approval",
      event: "STAGE_AWAITING_APPROVAL",
      fields: { Stage: "requirements-analysis" },
    }));
    writeFileSync(shard, `${rows.join("\n")}\n`);
    const staleResult = withStateProject(staleRoot, () =>
      captureExit(() =>
        handleReject([
          "requirements-analysis",
          "--target-intent-id",
          DEFAULT_INTENT_UUID,
          "--presence-reservation-id",
          staleReservationId,
          "--intent",
          staleIntent,
          "--space",
          "default",
        ])
      )
    );
    expect(staleResult.code).toBe(1);
    expect(staleResult.stderr).toContain("HUMAN_TURN is not fresh");

    const ordinaryRoot = freshWorkflow();
    const ordinaryIntent = seededRecordDir(ordinaryRoot).split("/").at(-1)!;
    reserveInProcess(ordinaryRoot);
    const previousSkip = process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
    process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
    try {
      const ordinary = withStateProject(ordinaryRoot, () =>
        captureDirective(() =>
          handleReject([
            "requirements-analysis",
            "--intent",
            ordinaryIntent,
            "--space",
            "default",
          ])
        )
      );
      expect(ordinary.new_state).toBe("revising");
    } finally {
      if (previousSkip === undefined) {
        delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
      } else {
        process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = previousSkip;
      }
    }

    const missingRevise = withStateProject(ordinaryRoot, () =>
      captureExit(() =>
        handleRevise([
          "--intent",
          ordinaryIntent,
          "--space",
          "default",
        ])
      )
    );
    expect(missingRevise.code).toBe(1);
    expect(missingRevise.stderr).toContain("Usage: amadeus-state.ts revise");
  });

  test("in-process presence routes bind the exact carrier, owner, stage, and state", () => {
    const routeCases = [
      {
        name: "missing route",
        route: undefined,
      },
      {
        name: "wrong event",
        route: {
          eventName: "PreToolUse",
          toolName: "AskUserQuestion",
          purposeText: "",
        },
      },
      {
        name: "wrong tool",
        route: {
          eventName: "PostToolUse",
          toolName: "Bash",
          purposeText: "",
        },
      },
      {
        name: "wrong carrier",
        route: {
          eventName: "PostToolUse",
          toolName: "AskUserQuestion",
          purposeText: "another gate",
        },
      },
    ] as const;
    for (const routeCase of routeCases) {
      const root = freshWorkflow();
      const reserved = reserveInProcess(root);
      const result = mintArmedPresenceReservation({
        projectDir: root,
        sessionId: "main-session",
        requireRouteBinding: true,
        ...(routeCase.route === undefined ? {} : { route: routeCase.route }),
      });
      expect(result.kind, routeCase.name).toBe("none");
      expect(
        readPresenceReservation(
          root,
          String(reserved.presence_reservation_id),
        )?.state,
      ).toBe("armed");
    }

    const switchedRoot = freshWorkflow();
    const switched = reserveInProcess(switchedRoot);
    addSecondIntentAndSelectIt(switchedRoot);
    expect(
      mintArmedPresenceReservation({
        projectDir: switchedRoot,
        sessionId: "main-session",
        requireRouteBinding: true,
        route: {
          eventName: "UserPromptSubmit",
          toolName: null,
          purposeText: `Approve ${String(switched.presence_reservation_id)}`,
        },
      }).kind,
    ).toBe("none");

    const missingStateRoot = freshWorkflow();
    const missingState = reserveInProcess(missingStateRoot);
    unlinkSync(seededStateFile(missingStateRoot));
    expect(
      mintArmedPresenceReservation({
        projectDir: missingStateRoot,
        sessionId: "main-session",
        requireRouteBinding: true,
        route: {
          eventName: "PostToolUse",
          toolName: "AskUserQuestion",
          purposeText:
            `Approve ${String(missingState.presence_reservation_id)}`,
        },
      }).kind,
    ).toBe("none");

    const validRoot = freshWorkflow();
    const valid = reserveInProcess(validRoot);
    expect(
      mintArmedPresenceReservation({
        projectDir: validRoot,
        sessionId: "main-session",
        requireRouteBinding: true,
        route: {
          eventName: "UserPromptSubmit",
          toolName: null,
          purposeText: `Approve ${String(valid.presence_reservation_id)}`,
        },
      }).kind,
    ).toBe("minted");
    expect(
      mintArmedPresenceReservation({
        projectDir: validRoot,
        sessionId: "main-session",
        requireRouteBinding: true,
        route: {
          eventName: "PostToolUse",
          toolName: "AskUserQuestion",
          purposeText: `Approve ${String(valid.presence_reservation_id)}`,
        },
      }).kind,
    ).toBe("already-minted");
  });

  test("in-process reservation lookup and cancellation fail closed", () => {
    const root = freshWorkflow();
    expect(findActivePresenceReservation(root, "main-session")).toBeNull();
    cancelArmedPresenceReservation(
      root,
      "main-session",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );

    const reservation = armPresenceReservation({
      projectDir: root,
      sessionId: "main-session",
      space: "default",
      targetIntentId: DEFAULT_INTENT_UUID,
      stage: "requirements-analysis",
      routeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      reservationIdFactory: () =>
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });
    expect(findActivePresenceReservation(root, "main-session")?.reservationId)
      .toBe(reservation.reservationId);
    expect(() =>
      cancelArmedPresenceReservation(
        root,
        "other-session",
        reservation.reservationId,
      )
    ).toThrow("Only the owning session");
    cancelArmedPresenceReservation(
      root,
      "main-session",
      reservation.reservationId,
    );
    expect(findActivePresenceReservation(root, "main-session")).toBeNull();

    const ambiguousRoot = freshWorkflow();
    const first = armPresenceReservation({
      projectDir: ambiguousRoot,
      sessionId: "main-session",
      space: "default",
      targetIntentId: DEFAULT_INTENT_UUID,
      stage: "requirements-analysis",
      routeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      reservationIdFactory: () =>
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });
    const reservationDir = join(
      ambiguousRoot,
      "amadeus",
      ".amadeus-sessions",
      "presence-reservations",
    );
    const duplicateId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    writeFileSync(
      join(reservationDir, `${duplicateId}.json`),
      `${JSON.stringify({
        ...first,
        reservationId: duplicateId,
        routeId: duplicateId,
      }, null, 2)}\n`,
    );
    expect(() =>
      findActivePresenceReservation(ambiguousRoot, "main-session")
    ).toThrow("ambiguous presence reservations");
    expect(() =>
      mintArmedPresenceReservation({
        projectDir: ambiguousRoot,
        sessionId: "main-session",
      })
    ).toThrow("ambiguous presence reservations");

    const duplicateTurnRoot = freshWorkflow();
    const duplicateTurnIntent =
      seededRecordDir(duplicateTurnRoot).split("/").at(-1)!;
    const duplicateTurn = armPresenceReservation({
      projectDir: duplicateTurnRoot,
      sessionId: "main-session",
      space: "default",
      targetIntentId: DEFAULT_INTENT_UUID,
      stage: "requirements-analysis",
      routeId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      reservationIdFactory: () =>
        "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    });
    for (let i = 0; i < 2; i += 1) {
      plantV1AuditRow(
        "HUMAN_TURN",
        { "Presence Reservation Id": duplicateTurn.reservationId },
        duplicateTurnRoot,
        duplicateTurnIntent,
        "default",
      );
    }
    expect(() =>
      mintArmedPresenceReservation({
        projectDir: duplicateTurnRoot,
        sessionId: "main-session",
      })
    ).toThrow("multiple HUMAN_TURN events");

    const canonicalMintRoot = freshWorkflow();
    const canonicalMint = reserveInProcess(canonicalMintRoot);
    mintHumanPresence({
      projectDir: canonicalMintRoot,
      capability: hostSessionCapability("main-session"),
      requireReservationRoute: true,
      route: {
        eventName: "PostToolUse",
        toolName: "AskUserQuestion",
        purposeText:
          `Approve ${String(canonicalMint.presence_reservation_id)}`,
      },
    });
    expect(
      readPresenceReservation(
        canonicalMintRoot,
        String(canonicalMint.presence_reservation_id),
      )?.state,
    ).toBe("minted");
  });

  test("simultaneous gate-reserve retries converge on one carrier", async () => {
    const root = freshWorkflow();
    const command = [
      process.execPath,
      ENGINE,
      "gate-reserve",
      "--stage",
      "requirements-analysis",
      "--project-dir",
      root,
    ];
    const children = [
      Bun.spawn(command, {
        cwd: root,
        stdout: "pipe",
        stderr: "pipe",
        env: environment(),
      }),
      Bun.spawn(command, {
        cwd: root,
        stdout: "pipe",
        stderr: "pipe",
        env: environment(),
      }),
    ];
    const results = await Promise.all(children.map(async (child) => ({
      code: await child.exited,
      stdout: await new Response(child.stdout).text(),
      stderr: await new Response(child.stderr).text(),
    })));

    expect(results.map((result) => result.code)).toEqual([0, 0]);
    const carriers = results.map((result) => {
      if (result.stderr.length > 0) throw new Error(result.stderr);
      return JSON.parse(result.stdout) as {
        kind: string;
        presence_reservation_id: string;
      };
    });
    expect(carriers.map((carrier) => carrier.kind)).toEqual([
      "await-approval",
      "await-approval",
    ]);
    expect(carriers[0]!.presence_reservation_id).toBe(
      carriers[1]!.presence_reservation_id,
    );
  });

  test("cursor switch after reservation opens only the reserved owner intent", () => {
    const root = freshWorkflow();
    const reservation = armPresenceReservation({
      projectDir: root,
      sessionId: "main-session",
      space: "default",
      targetIntentId: DEFAULT_INTENT_UUID,
      stage: "requirements-analysis",
      routeId: "44444444-4444-4444-8444-444444444444",
      reservationIdFactory: () =>
        "44444444-4444-4444-8444-444444444444",
    });
    const secondState = addSecondIntentAndSelectIt(root);
    const secondStateBefore = readFileSync(secondState, "utf-8");
    const secondAuditBefore = readAllAuditShards(
      root,
      SECOND_INTENT_DIR,
      "default",
    );

    const previousGraph = process.env.AMADEUS_STAGE_GRAPH;
    process.env.AMADEUS_STAGE_GRAPH = GRAPH;
    try {
      expect(
        openGateForKimiReservation(
          root,
          "requirements-analysis",
          reservation,
        ),
      ).toBeNull();
    } finally {
      if (previousGraph === undefined) {
        delete process.env.AMADEUS_STAGE_GRAPH;
      } else {
        process.env.AMADEUS_STAGE_GRAPH = previousGraph;
      }
    }

    expect(readFileSync(seededStateFile(root), "utf-8")).toContain(
      "- [?] requirements-analysis",
    );
    expect(readAllAuditShards(root, seededRecordDir(root).split("/").at(-1), "default"))
      .toContain("STAGE_AWAITING_APPROVAL");
    expect(readFileSync(secondState, "utf-8")).toBe(secondStateBefore);
    expect(readAllAuditShards(root, SECOND_INTENT_DIR, "default")).toBe(
      secondAuditBefore,
    );
  });

  test("grant fallback mints only through its carrier-bearing AskUserQuestion payload", () => {
    const root = freshWorkflow();
    const reservation = armPresenceReservation({
      projectDir: root,
      sessionId: "main-session",
      space: "default",
      targetIntentId: DEFAULT_INTENT_UUID,
      stage: "requirements-analysis",
      // A targeted continuation retains its route id; it is distinct
      // from the newly minted human-continuation reservation id.
      routeId: "55555555-5555-4555-8555-555555555555",
      reservationIdFactory: () =>
        "66666666-6666-4666-8666-666666666666",
    });
    const previousGraph = process.env.AMADEUS_STAGE_GRAPH;
    process.env.AMADEUS_STAGE_GRAPH = GRAPH;
    try {
      expect(
        openGateForKimiReservation(
          root,
          "requirements-analysis",
          reservation,
        ),
      ).toBeNull();
    } finally {
      if (previousGraph === undefined) {
        delete process.env.AMADEUS_STAGE_GRAPH;
      } else {
        process.env.AMADEUS_STAGE_GRAPH = previousGraph;
      }
    }

    const unrelated = runTool(
      root,
      MINT,
      [],
      JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        session_id: "main-session",
        prompt: "unrelated §13 response",
      }),
    );
    expect(unrelated.code).toBe(0);
    expect(readPresenceReservation(root, reservation.reservationId)?.state)
      .toBe("armed");

    const asked = mintGateQuestion(root, reservation.reservationId);
    expect(asked).toEqual({ stdout: "", exitCode: 0, stderr: "" });
    expect(readPresenceReservation(root, reservation.reservationId)?.state)
      .toBe("minted");

    const approved = runTool(root, ENGINE, [
      "report",
      "--stage",
      "requirements-analysis",
      "--result",
      "approved",
      "--user-input",
      "Approve",
      "--target-intent-id",
      DEFAULT_INTENT_UUID,
      "--presence-reservation-id",
      reservation.reservationId,
    ]);
    expect(JSON.parse(approved.stdout).kind).toBe("committed");
    const reservedTurns = splitAuditRecords(readAllAuditShards(root)).filter(
      (block) =>
        auditBlockField(block, "Event") === "HUMAN_TURN" &&
        auditBlockField(block, "Presence Reservation Id") ===
          reservation.reservationId,
    );
    expect(reservedTurns).toHaveLength(1);
  });

  test("Request Changes consumes the old carrier and re-presentation requires a new one", () => {
    const root = freshWorkflow();
    const first = JSON.parse(
      runTool(root, ENGINE, [
        "gate-reserve",
        "--stage",
        "requirements-analysis",
      ]).stdout,
    ) as {
      kind: string;
      target_intent_id: string;
      presence_reservation_id: string;
    };
    expect(first.kind).toBe("await-approval");
    expect(mintGateQuestion(root, first.presence_reservation_id).exitCode)
      .toBe(0);

    const rejected = runTool(root, ENGINE, [
      "gate-reject",
      "--stage",
      "requirements-analysis",
      "--feedback",
      "Modify the error handling",
      "--target-intent-id",
      first.target_intent_id,
      "--presence-reservation-id",
      first.presence_reservation_id,
    ]);
    expect(JSON.parse(rejected.stdout).kind).toBe("print");
    expect(readPresenceReservation(root, first.presence_reservation_id)?.state)
      .toBe("consumed");
    expect(readFileSync(seededStateFile(root), "utf-8")).toContain(
      "- [R] requirements-analysis",
    );

    const second = JSON.parse(
      runTool(root, ENGINE, [
        "gate-reserve",
        "--stage",
        "requirements-analysis",
      ]).stdout,
    ) as {
      kind: string;
      target_intent_id: string;
      presence_reservation_id: string;
    };
    expect(second.kind).toBe("await-approval");
    expect(second.presence_reservation_id).not.toBe(
      first.presence_reservation_id,
    );
    expect(readFileSync(seededStateFile(root), "utf-8")).toContain(
      "- [?] requirements-analysis",
    );

    const oldApproval = runTool(root, ENGINE, [
      "report",
      "--stage",
      "requirements-analysis",
      "--result",
      "approved",
      "--user-input",
      "Approve",
      "--target-intent-id",
      first.target_intent_id,
      "--presence-reservation-id",
      first.presence_reservation_id,
    ]);
    expect(JSON.parse(oldApproval.stdout).kind).toBe("error");
    expect(readFileSync(seededStateFile(root), "utf-8")).toContain(
      "- [?] requirements-analysis",
    );

    expect(mintGateQuestion(root, second.presence_reservation_id).exitCode)
      .toBe(0);
    const approved = runTool(root, ENGINE, [
      "report",
      "--stage",
      "requirements-analysis",
      "--result",
      "approved",
      "--user-input",
      "Approve",
      "--target-intent-id",
      second.target_intent_id,
      "--presence-reservation-id",
      second.presence_reservation_id,
    ]);
    expect(JSON.parse(approved.stdout).kind).toBe("committed");
    expect(readFileSync(seededStateFile(root), "utf-8")).toContain(
      "- [x] requirements-analysis",
    );

    const audit = readAllAuditShards(root);
    const rejectedBlock = splitAuditRecords(audit).find(
      (block) => auditBlockField(block, "Event") === "GATE_REJECTED",
    );
    const approvedBlock = splitAuditRecords(audit).find(
      (block) => auditBlockField(block, "Event") === "GATE_APPROVED",
    );
    expect(auditBlockField(rejectedBlock ?? "", "Presence Reservation Id"))
      .toBe(first.presence_reservation_id);
    expect(auditBlockField(approvedBlock ?? "", "Presence Reservation Id"))
      .toBe(second.presence_reservation_id);
  });

  test("targeted rejection consumes with the session identity it verified", () => {
    const root = freshWorkflow();
    const ownerIntent = seededRecordDir(root).split("/").at(-1)!;
    const reserved = reserveInProcess(root);
    const reservationId = String(reserved.presence_reservation_id);
    expect(
      mintArmedPresenceReservation({
        projectDir: root,
        sessionId: "main-session",
        requireRouteBinding: true,
        route: {
          eventName: "PostToolUse",
          toolName: "AskUserQuestion",
          purposeText: `Request Changes ${reservationId}`,
        },
      }).kind,
    ).toBe("minted");

    const currentSessionPath = join(
      root,
      "amadeus",
      ".amadeus-sessions",
      ".current-session",
    );
    const realReadFileSync = fs.readFileSync;
    let sessionReads = 0;
    const sessionRead = spyOn(fs, "readFileSync").mockImplementation(
      ((path, options) => {
        const value = realReadFileSync(path, options);
        if (path === currentSessionPath && sessionReads++ === 0) {
          writeFileSync(currentSessionPath, "replacement-session\n");
        }
        return value;
      }) as typeof fs.readFileSync,
    );

    let rejected: Record<string, unknown>;
    try {
      rejected = withStateProject(root, () =>
        captureDirective(() =>
          handleReject([
            "requirements-analysis",
            "--feedback",
            "Modify the error handling",
            "--target-intent-id",
            DEFAULT_INTENT_UUID,
            "--presence-reservation-id",
            reservationId,
            "--intent",
            ownerIntent,
            "--space",
            "default",
          ])
        )
      );
    } finally {
      sessionRead.mockRestore();
    }

    expect(sessionReads).toBe(1);
    expect(rejected.new_state).toBe("revising");
    expect(readPresenceReservation(root, reservationId)?.state).toBe("consumed");
  });

  test("an interrupted Request Changes retry retires the stale carrier before approval", () => {
    const root = freshWorkflow();
    const ownerIntent = seededRecordDir(root).split("/").at(-1)!;
    const nonOwnerState = addSecondIntentAndSelectIt(root);
    writeFileSync(
      join(
        root,
        "amadeus",
        "spaces",
        "default",
        "intents",
        "active-intent",
      ),
      `${ownerIntent}\n`,
    );
    const nonOwnerBefore = readFileSync(nonOwnerState, "utf-8");

    const first = reserveInProcess(root);
    if (first.kind !== "await-approval") {
      throw new Error(JSON.stringify(first));
    }
    const firstReservationId = String(first.presence_reservation_id);
    expect(
      mintArmedPresenceReservation({
        projectDir: root,
        sessionId: "main-session",
        requireRouteBinding: true,
        route: {
          eventName: "PostToolUse",
          toolName: "AskUserQuestion",
          purposeText: `Request Changes ${firstReservationId}`,
        },
      }).kind,
    ).toBe("minted");
    const mintedBeforeReject = readPresenceReservation(
      root,
      firstReservationId,
    )!;

    const rejected = withStateProject(root, () =>
      captureDirective(() =>
        handleReject([
          "requirements-analysis",
          "--feedback",
          "Modify the error handling",
          "--target-intent-id",
          DEFAULT_INTENT_UUID,
          "--presence-reservation-id",
          firstReservationId,
          "--intent",
          ownerIntent,
          "--space",
          "default",
        ])
      )
    );
    expect(rejected.new_state).toBe("revising");

    // Reconstruct the durable crash boundary: state and audit committed, but
    // the exact minted reservation did not reach its final consume write.
    writeFileSync(
      join(
        root,
        "amadeus",
        ".amadeus-sessions",
        "presence-reservations",
        `${firstReservationId}.json`,
      ),
      `${JSON.stringify(mintedBeforeReject, null, 2)}\n`,
    );
    expect(readFileSync(seededStateFile(root), "utf-8")).toContain(
      "- [R] requirements-analysis",
    );
    expect(readPresenceReservation(root, firstReservationId)?.state)
      .toBe("minted");

    const second = reserveInProcess(root);
    if (second.kind !== "await-approval") {
      throw new Error(JSON.stringify(second));
    }
    const secondReservationId = String(second.presence_reservation_id);
    expect(secondReservationId).not.toBe(firstReservationId);
    expect(readPresenceReservation(root, firstReservationId)?.state)
      .toBe("consumed");
    expect(readFileSync(seededStateFile(root), "utf-8")).toContain(
      "- [?] requirements-analysis",
    );
    expect(readFileSync(seededStateFile(root), "utf-8")).toContain(
      "- **Revision Count**: 1",
    );

    const afterRetry = splitAuditRecords(readAllAuditShards(root));
    expect(
      afterRetry.filter((block) =>
        auditBlockField(block, "Event") === "GATE_REJECTED"
      ),
    ).toHaveLength(1);
    expect(
      afterRetry.filter((block) =>
        auditBlockField(block, "Event") === "STAGE_REVISING"
      ),
    ).toHaveLength(1);
    expect(readFileSync(nonOwnerState, "utf-8")).toBe(nonOwnerBefore);

    expect(mintGateQuestion(root, secondReservationId).exitCode).toBe(0);
    const previousArtifactGuard = process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
    process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
    let approved: Record<string, unknown>;
    try {
      approved = withStateProject(root, () =>
        captureDirective(() =>
          handleApprove([
            "requirements-analysis",
            "--user-input",
            "Approve",
            "--target-intent-id",
            DEFAULT_INTENT_UUID,
            "--presence-reservation-id",
            secondReservationId,
            "--intent",
            ownerIntent,
            "--space",
            "default",
          ])
        )
      );
    } finally {
      if (previousArtifactGuard === undefined) {
        delete process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
      } else {
        process.env.AMADEUS_SKIP_ARTIFACT_GUARD = previousArtifactGuard;
      }
    }
    expect(approved.kind).toBe("approved");
    const freshTurns = splitAuditRecords(readAllAuditShards(root)).filter(
      (block) =>
        auditBlockField(block, "Event") === "HUMAN_TURN" &&
        auditBlockField(block, "Presence Reservation Id") ===
          secondReservationId,
    );
    expect(freshTurns).toHaveLength(1);
    expect(readFileSync(nonOwnerState, "utf-8")).toBe(nonOwnerBefore);
  });

  test("a preempted Request Changes retry converges on the fresh carrier", () => {
    const root = freshWorkflow();
    const ownerIntent = seededRecordDir(root).split("/").at(-1)!;
    const first = reserveInProcess(root);
    if (first.kind !== "await-approval") {
      throw new Error(JSON.stringify(first));
    }
    const firstReservationId = String(first.presence_reservation_id);
    expect(
      mintArmedPresenceReservation({
        projectDir: root,
        sessionId: "main-session",
        requireRouteBinding: true,
        route: {
          eventName: "PostToolUse",
          toolName: "AskUserQuestion",
          purposeText: `Request Changes ${firstReservationId}`,
        },
      }).kind,
    ).toBe("minted");
    const mintedBeforeReject = readPresenceReservation(
      root,
      firstReservationId,
    )!;

    const rejected = withStateProject(root, () =>
      captureDirective(() =>
        handleReject([
          "requirements-analysis",
          "--feedback",
          "Modify the error handling",
          "--target-intent-id",
          DEFAULT_INTENT_UUID,
          "--presence-reservation-id",
          firstReservationId,
          "--intent",
          ownerIntent,
          "--space",
          "default",
        ])
      )
    );
    expect(rejected.new_state).toBe("revising");
    writeFileSync(
      join(
        root,
        "amadeus",
        ".amadeus-sessions",
        "presence-reservations",
        `${firstReservationId}.json`,
      ),
      `${JSON.stringify(mintedBeforeReject, null, 2)}\n`,
    );

    const statePath = seededStateFile(root);
    const realReadFileSync = fs.readFileSync;
    let preempted = false;
    let winningReservationId = "";
    const stateRead = spyOn(fs, "readFileSync").mockImplementation(
      ((path, options) => {
        if (!preempted && path === statePath) {
          preempted = true;
          const winner = runTool(root, ENGINE, [
            "gate-reserve",
            "--stage",
            "requirements-analysis",
          ]);
          expect(winner.code).toBe(0);
          const directive = JSON.parse(winner.stdout) as {
            readonly kind: string;
            readonly presence_reservation_id: string;
          };
          expect(directive.kind).toBe("await-approval");
          winningReservationId = directive.presence_reservation_id;
        }
        return realReadFileSync(path, options);
      }) as typeof fs.readFileSync,
    );

    let raced: Record<string, unknown>;
    try {
      raced = reserveInProcess(root);
    } finally {
      stateRead.mockRestore();
    }

    expect(preempted).toBe(true);
    expect(winningReservationId).not.toBe(firstReservationId);
    expect(raced.presence_reservation_id).toBe(winningReservationId);
    expect(readPresenceReservation(root, firstReservationId)?.state)
      .toBe("consumed");
    expect(readPresenceReservation(root, winningReservationId)?.state)
      .toBe("armed");
  });

  test("a preempted retry fails closed when its active carrier disappears", () => {
    const root = freshWorkflow();
    const first = reserveInProcess(root);
    if (first.kind !== "await-approval") {
      throw new Error(JSON.stringify(first));
    }
    const reservationId = String(first.presence_reservation_id);
    expect(
      mintArmedPresenceReservation({
        projectDir: root,
        sessionId: "main-session",
        requireRouteBinding: true,
        route: {
          eventName: "PostToolUse",
          toolName: "AskUserQuestion",
          purposeText: `Approve ${reservationId}`,
        },
      }).kind,
    ).toBe("minted");

    const statePath = seededStateFile(root);
    const realReadFileSync = fs.readFileSync;
    let preempted = false;
    const stateRead = spyOn(fs, "readFileSync").mockImplementation(
      ((path, options) => {
        if (!preempted && path === statePath) {
          preempted = true;
          consumePresenceReservation({
            projectDir: root,
            sessionId: "main-session",
            reservationId,
            targetIntentId: DEFAULT_INTENT_UUID,
            stage: "requirements-analysis",
          });
        }
        return realReadFileSync(path, options);
      }) as typeof fs.readFileSync,
    );

    let raced: Record<string, unknown>;
    try {
      raced = reserveInProcess(root);
    } finally {
      stateRead.mockRestore();
    }

    expect(preempted).toBe(true);
    expect(raced.kind).toBe("error");
    expect(String(raced.message)).toContain(
      "Trusted session reservation changed during retry",
    );
    expect(readPresenceReservation(root, reservationId)?.state)
      .toBe("consumed");
  });

  test("reviewer READY and unrelated human turns cannot replace the reserved gate carrier", () => {
    const root = freshWorkflow();

    const reviewerReport = runTool(root, ENGINE, [
      "report",
      "--stage",
      "requirements-analysis",
      "--result",
      "approved",
      "--user-input",
      "READY",
    ]);
    expect(reviewerReport.code).toBe(0);
    expect(JSON.parse(reviewerReport.stdout).kind).toBe("error");
    expect(readFileSync(seededStateFile(root), "utf-8")).toContain(
      "- [-] requirements-analysis",
    );
    expect(readAllAuditShards(root)).not.toContain("GATE_APPROVED");

    const genericTurn = runTool(
      root,
      MINT,
      [],
      JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        session_id: "main-session",
        prompt: "ordinary §13 answer",
      }),
    );
    expect(genericTurn.code).toBe(0);

    const reserved = runTool(root, ENGINE, [
      "gate-reserve",
      "--stage",
      "requirements-analysis",
    ]);
    if (reserved.code !== 0) {
      throw new Error(reserved.stderr || reserved.stdout);
    }
    const carrier = JSON.parse(reserved.stdout) as {
      kind: string;
      message?: string;
      target_intent_id: string;
      presence_reservation_id: string;
    };
    if (carrier.kind === "error") {
      throw new Error(carrier.message ?? reserved.stdout);
    }
    expect(carrier.kind).toBe("await-approval");
    expect(carrier.target_intent_id).toBe(DEFAULT_INTENT_UUID);
    expect(readFileSync(seededStateFile(root), "utf-8")).toContain(
      "- [?] requirements-analysis",
    );
    const recoveredGate = splitAuditRecords(readAllAuditShards(root)).find(
      (block) =>
        auditBlockField(block, "Event") === "STAGE_AWAITING_APPROVAL",
    );
    expect(auditBlockField(recoveredGate ?? "", "Recovered")).toBe("true");

    const auditAfterFirstReservation = readAllAuditShards(root);
    const repeatedReservation = runTool(root, ENGINE, [
      "gate-reserve",
      "--stage",
      "requirements-analysis",
    ]);
    expect(JSON.parse(repeatedReservation.stdout).presence_reservation_id).toBe(
      carrier.presence_reservation_id,
    );
    expect(readAllAuditShards(root)).toBe(auditAfterFirstReservation);

    const stateBeforeSubagentStop = readFileSync(
      seededStateFile(root),
      "utf-8",
    );
    const auditBeforeSubagentStop = readAllAuditShards(root);
    runAdapter(
      "role-start",
      JSON.stringify({
        hook_event_name: "SubagentStart",
        session_id: "",
        cwd: root,
        agent_name: "amadeus-architecture-reviewer-agent",
      }),
      root,
    );
    const subagentStop = stopResult(root, "reviewer");
    expect(subagentStop.result).toEqual({
      stdout: "",
      exitCode: 0,
      stderr: "",
    });
    expect(subagentStop.calls).toEqual([]);
    runAdapter(
      "log-subagent",
      JSON.stringify({
        hook_event_name: "SubagentStop",
        session_id: "",
        cwd: root,
        agent_name: "amadeus-architecture-reviewer-agent",
      }),
      root,
      () => ({ stdout: "", code: 0 }),
    );
    expect(readFileSync(seededStateFile(root), "utf-8")).toBe(
      stateBeforeSubagentStop,
    );
    expect(readAllAuditShards(root)).toBe(auditBeforeSubagentStop);
    expect(readAllAuditShards(root)).not.toContain("GATE_APPROVED");

    const unrelatedTurn = runTool(
      root,
      MINT,
      [],
      JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        session_id: "main-session",
        prompt: "ordinary §13 answer after reservation",
      }),
    );
    expect(unrelatedTurn.code).toBe(0);

    const unreservedApproval = runTool(root, ENGINE, [
      "report",
      "--stage",
      "requirements-analysis",
      "--result",
      "approved",
      "--user-input",
      "Approve",
    ]);
    expect(JSON.parse(unreservedApproval.stdout).kind).toBe("error");

    const staleCarrier = runTool(root, ENGINE, [
      "report",
      "--stage",
      "requirements-analysis",
      "--result",
      "approved",
      "--user-input",
      "Approve",
      "--target-intent-id",
      carrier.target_intent_id,
      "--presence-reservation-id",
      carrier.presence_reservation_id,
    ]);
    expect(JSON.parse(staleCarrier.stdout).kind).toBe("error");
    expect(readAllAuditShards(root)).not.toContain("GATE_APPROVED");

    const explicitTurn = runTool(
      root,
      MINT,
      [],
      JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        session_id: "main-session",
        prompt: `Approve ${carrier.presence_reservation_id}`,
      }),
    );
    expect(explicitTurn.code).toBe(0);

    const approved = runTool(root, ENGINE, [
      "report",
      "--stage",
      "requirements-analysis",
      "--result",
      "approved",
      "--user-input",
      "Approve",
      "--target-intent-id",
      carrier.target_intent_id,
      "--presence-reservation-id",
      carrier.presence_reservation_id,
    ]);
    expect(JSON.parse(approved.stdout).kind).toBe("committed");
    expect(readFileSync(seededStateFile(root), "utf-8")).toContain(
      "- [x] requirements-analysis",
    );
    const approvedBlock = splitAuditRecords(readAllAuditShards(root)).find(
      (block) => auditBlockField(block, "Event") === "GATE_APPROVED",
    );
    expect(auditBlockField(approvedBlock ?? "", "Presence Reservation Id")).toBe(
      carrier.presence_reservation_id,
    );
  });
});
