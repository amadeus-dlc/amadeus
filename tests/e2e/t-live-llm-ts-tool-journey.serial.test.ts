// size: large
//
// Real-LLM E2E: Claude Code and Codex drive the shipped Amadeus TypeScript
// tools against a pre-seeded fixture workspace. The fixture is not born or
// selected by the provider, so this test never creates a live Intent.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { claudePrintLiveSkipReason } from "../harness/claude-print-live.ts";
import {
  codexExecLiveSkipReason,
  setupCodexExecProject,
  type CodexExecProject,
} from "../harness/codex-exec-live.ts";
import {
  cleanupTestProject,
  DEFAULT_RECORD_DIR,
  seedAuditFile,
  seedStateFile,
  seedWorkspaceShell,
  seededAuditShard,
  seededRecordDir,
  setupIntegrationProject,
} from "../harness/fixtures.ts";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CLAUDE_BIN = process.env.AMADEUS_CLAUDE_BIN ?? "claude";
const CODEX_BIN = process.env.AMADEUS_CODEX_BIN ?? "codex";
const CLAUDE_DIST = join(REPO_ROOT, "dist", "claude");
const CODEX_DIST = join(REPO_ROOT, "dist", "codex");
const TIMEOUT_MS = Number.parseInt(process.env.AMADEUS_LLM_TOOL_E2E_TIMEOUT ?? "900000", 10);
const STATE_FIXTURE = "state-formal-model-check.md";
const PROMPT = (harnessDir: ".claude" | ".codex"): string => [
  "You are driving a pre-seeded Amadeus test workspace.",
  "Use the shipped TypeScript tools through the shell; do not merely describe actions.",
  "Do not create, birth, select, or switch an Intent. Do not use git, GitHub, or the network.",
  `Run exactly: bun ${harnessDir}/tools/amadeus-orchestrate.ts report --stage formal-model-check --result completed`,
  `If the command reports that amadeus/spaces/default/intents/${DEFAULT_RECORD_DIR}/verification/phase-check-construction.md is missing, create that exact file with a concise markdown verification note, then rerun the same report command.`,
  "Continue until the report command succeeds, then stop and summarize the tool commands executed.",
].join(" ");

interface ToolRun {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

function liveOptInReason(): string | null {
  if (process.env.GITHUB_ACTIONS === "true") return "disabled on GitHub Actions";
  if (process.env.AMADEUS_LLM_TOOL_E2E !== "1") {
    return "set AMADEUS_LLM_TOOL_E2E=1 to run real-LLM tool E2E";
  }
  return null;
}

function binarySkipReason(binary: string): string | null {
  const probe = spawnSync(binary, ["--version"], {
    encoding: "utf8",
    env: process.env,
    timeout: 15_000,
  });
  return probe.status === 0 ? null : `${binary} is not available`;
}

function claudeSkipReason(): string | null {
  return (
    liveOptInReason() ??
    claudePrintLiveSkipReason({ ...process.env, AMADEUS_CLAUDE_PRINT_LIVE: "1" }) ??
    binarySkipReason(CLAUDE_BIN) ??
    (existsSync(CLAUDE_DIST) ? null : `distributable missing: ${CLAUDE_DIST}`)
  );
}

function codexSkipReason(): string | null {
  return (
    liveOptInReason() ??
    codexExecLiveSkipReason({ ...process.env, AMADEUS_CODEX_EXEC_LIVE: "1" }) ??
    binarySkipReason(CODEX_BIN) ??
    (existsSync(CODEX_DIST) ? null : `distributable missing: ${CODEX_DIST}`)
  );
}

const CLAUDE_SKIP_REASON = claudeSkipReason();
const CODEX_SKIP_REASON = codexSkipReason();

/**
 * Seed the exact fixture needed by the report-repair journey. This is test data
 * preparation, not an Intent lifecycle operation: the provider never runs
 * intent-birth or selects it.
 */
function prepareFormalModelCheckFixture(projectDir: string, harnessDir: ".claude" | ".codex"): void {
  seedWorkspaceShell(projectDir);
  seedStateFile(projectDir, STATE_FIXTURE);
  seedAuditFile(projectDir);
  cpSync(join(REPO_ROOT, "plugins"), join(projectDir, "plugins"), { recursive: true });
  writeFileSync(
    join(projectDir, "amadeus", "config.json"),
    `${JSON.stringify({
      plugin: {
        activation: { names: ["github-pr-convergence", "formal-model-check"] },
        "scope-bindings": {
          "formal-model-check": {
            "formal-model-check": ["self-fix"],
            "tla-authoring": ["self-fix"],
          },
          "github-pr-convergence": { "pr-convergence": ["self-fix"] },
        },
      },
    }, null, 2)}\n`,
    "utf8",
  );
  const compose = spawnSync(
    process.execPath,
    [join(projectDir, harnessDir, "tools", "amadeus-plugin.ts"), "compose", "--if-stale", "--project-root", join(projectDir, harnessDir)],
    { cwd: projectDir, encoding: "utf8" },
  );
  if (compose.status !== 0) {
    throw new Error(`plugin fixture compose failed: ${compose.stderr || compose.stdout}`);
  }
  const shard = seededAuditShard(projectDir);
  const rows = readFileSync(shard, "utf8").trimEnd();
  const seq = rows.split("\n").filter(Boolean).length;
  writeFileSync(
    shard,
    `${rows}\n${JSON.stringify({
      schemaVersion: 2,
      eventId: "fixture-gate-approved-pr-convergence",
      seq: seq + 1,
      timestamp: "2025-06-18T14:19:00Z",
      eventName: "amadeus.gate.approved",
      attributes: { "Approval Provenance": "intent-grant", Event: "GATE_APPROVED", "Grant Id": "fixture-grant", Stage: "pr-convergence" },
      intentId: "fixture-0f14ce29",
      space: "default",
      cloneId: "fixturecloneid01",
      traceId: null,
      spanId: null,
      traceFlags: 0,
      idempotencyKey: "fixture:pr-convergence:gate-approved",
      canonical: true,
    })}\n${JSON.stringify({
      schemaVersion: 2,
      eventId: "fixture-stage-started-formal-model-check",
      seq: seq + 2,
      timestamp: "2025-06-18T14:20:00Z",
      eventName: "amadeus.stage.started",
      attributes: { Agent: "amadeus-quality-agent", Event: "STAGE_STARTED", Stage: "formal-model-check" },
      intentId: "fixture-0f14ce29",
      space: "default",
      cloneId: "fixturecloneid01",
      traceId: null,
      spanId: null,
      traceFlags: 0,
      idempotencyKey: "fixture:formal-model-check:stage-started",
      canonical: true,
    })}\n${JSON.stringify({
      schemaVersion: 2,
      eventId: "fixture-stage-awaiting-formal-model-check-organic",
      seq: seq + 3,
      timestamp: "2025-06-18T14:21:00Z",
      eventName: "amadeus.stage.awaiting.approval",
      attributes: { Event: "STAGE_AWAITING_APPROVAL", Stage: "formal-model-check" },
      intentId: "fixture-0f14ce29",
      space: "default",
      cloneId: "fixturecloneid01",
      traceId: null,
      spanId: null,
      traceFlags: 0,
      idempotencyKey: "fixture:formal-model-check:awaiting-approval-organic",
      canonical: true,
    })}\n${JSON.stringify({
      schemaVersion: 2,
      eventId: "fixture-stage-awaiting-formal-model-check-recovered",
      seq: seq + 4,
      timestamp: "2025-06-18T14:22:00Z",
      eventName: "amadeus.stage.awaiting.approval",
      attributes: { Event: "STAGE_AWAITING_APPROVAL", Recovered: "true", Stage: "formal-model-check" },
      intentId: "fixture-0f14ce29",
      space: "default",
      cloneId: "fixturecloneid01",
      traceId: null,
      spanId: null,
      traceFlags: 0,
      idempotencyKey: "fixture:formal-model-check:awaiting-approval-recovered",
      canonical: true,
    })}\n`,
    "utf8",
  );
  const compile = spawnSync(
    process.execPath,
    [join(projectDir, harnessDir, "tools", "amadeus-runtime.ts"), "compile"],
    { cwd: projectDir, encoding: "utf8" },
  );
  if (compile.status !== 0) {
    throw new Error(`runtime-graph fixture compile failed: ${compile.stderr || compile.stdout}`);
  }
}

function readIntentEntries(projectDir: string): unknown[] {
  return JSON.parse(
    readFileSync(join(projectDir, "amadeus", "spaces", "default", "intents", "intents.json"), "utf8"),
  ) as unknown[];
}

function assertRepairJourney(projectDir: string, run: ToolRun): void {
  expect(run.exitCode).toBe(0);
  const phaseCheck = join(seededRecordDir(projectDir), "verification", "phase-check-construction.md");
  if (!existsSync(phaseCheck)) {
    throw new Error(`LLM did not create ${phaseCheck}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
  }
  expect(readIntentEntries(projectDir)).toHaveLength(1);
  const state = readFileSync(join(seededRecordDir(projectDir), "amadeus-state.md"), "utf8");
  expect(state).toContain("- [x] formal-model-check — EXECUTE");
  expect(readFileSync(seededAuditShard(projectDir), "utf8")).toContain('"Stage":"formal-model-check"');
}

function runClaude(projectDir: string): ToolRun {
  const result = spawnSync(
    CLAUDE_BIN,
    [
      "--dangerously-skip-permissions",
      "-p",
      PROMPT(".claude"),
      "--setting-sources",
      "project",
      "--tools",
      "Bash",
      "--no-session-persistence",
      "--output-format",
      "json",
    ],
    {
      cwd: projectDir,
      encoding: "utf8",
      env: process.env,
      timeout: TIMEOUT_MS,
    },
  );
  return { exitCode: result.status ?? -1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function runCodex(project: CodexExecProject): ToolRun {
  const result = spawnSync(CODEX_BIN, ["exec", PROMPT(".codex")], {
    cwd: project.proj,
    encoding: "utf8",
    env: process.env,
    timeout: TIMEOUT_MS,
  });
  return { exitCode: result.status ?? -1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

describe("real-LLM Amadeus tools repair journey without live Intent birth", () => {
  test.skipIf(CLAUDE_SKIP_REASON !== null)(
    `Claude Code repairs a tool-reported phase boundary${CLAUDE_SKIP_REASON ? ` [SKIP: ${CLAUDE_SKIP_REASON}]` : ""}`,
    () => {
      const projectDir = setupIntegrationProject();
      try {
        prepareFormalModelCheckFixture(projectDir, ".claude");
        assertRepairJourney(projectDir, runClaude(projectDir));
      } finally {
        cleanupTestProject(projectDir);
      }
    },
    TIMEOUT_MS,
  );

  test.skipIf(CODEX_SKIP_REASON !== null)(
    `Codex repairs a tool-reported phase boundary${CODEX_SKIP_REASON ? ` [SKIP: ${CODEX_SKIP_REASON}]` : ""}`,
    () => {
      const project = setupCodexExecProject({
        prefix: "amadeus-codex-tool-journey-",
        distributionDir: CODEX_DIST,
        repositoryRoot: REPO_ROOT,
        model: process.env.AMADEUS_CODEX_EXEC_MODEL ?? "gpt-5.6-sol",
        rulesDir: ".codex/amadeus-rules",
        prepareProject: (projectDir) => prepareFormalModelCheckFixture(projectDir, ".codex"),
      });
      try {
        assertRepairJourney(project.proj, runCodex(project));
      } finally {
        project.cleanup();
      }
    },
    TIMEOUT_MS,
  );
});
