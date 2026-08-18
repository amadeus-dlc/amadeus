// size: large
//
// Real-LLM E2E: Claude Code and Codex drive the shipped Amadeus TypeScript
// tools against a pre-seeded fixture workspace. The fixture is not born or
// selected by the provider, so this test never creates a live Intent.
// Historical regression targets and their next live journeys are recorded in
// tests/fixtures/live-llm-regression-priority.json.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { scaleTestTime } from "../lib/test-time-factor.ts";
import { claudePrintLiveSkipReason } from "../harness/claude-print-live.ts";
import {
  codexExecLiveSkipReason,
  setupCodexExecProject,
  type CodexExecProject,
} from "../harness/codex-exec-live.ts";
import {
  cleanupTestProject,
  seedAuditFile,
  seedStateFile,
  seedWorkspaceShell,
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
  "Read the tool result. If it reports a missing verification artifact, create the exact path named in that result with a concise markdown verification note, then rerun the same report command.",
  "Continue until the report command succeeds, then stop and summarize the tool commands executed.",
].join(" ");
const STATE_APPROVE_PROMPT = (harnessDir: ".claude" | ".codex"): string => [
  "You are driving a pre-seeded Amadeus test workspace.",
  "Use the shipped TypeScript tools through the shell; do not merely describe actions.",
  "Do not create, birth, select, or switch an Intent. Do not use git, GitHub, or the network.",
  `Run exactly: bun ${harnessDir}/tools/amadeus-state.ts approve formal-model-check --defer-workflow-completion --project-dir .`,
  "Read the tool result. If it reports a missing verification artifact, create the exact path named in that result with a concise markdown verification note, then rerun the same command.",
  "Continue until the command succeeds, then stop and summarize the tool commands executed.",
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
    timeout: scaleTestTime(15_000),
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
  const gateStart = spawnSync(
    process.execPath,
    [join(projectDir, harnessDir, "tools", "amadeus-state.ts"), "gate-start", "formal-model-check", "--project-dir", projectDir],
    { cwd: projectDir, encoding: "utf8" },
  );
  if (gateStart.status !== 0) {
    throw new Error(`fixture gate-start failed: ${gateStart.stderr || gateStart.stdout}`);
  }
  const presence = spawnSync(
    process.execPath,
    harnessDir === ".claude"
      ? [join(projectDir, harnessDir, "hooks", "amadeus-mint-presence.ts")]
      : [join(projectDir, harnessDir, "hooks", "amadeus-codex-adapter.ts"), "mint"],
    {
      cwd: projectDir,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: "UserPromptSubmit",
        prompt: "fixture human gate acknowledgement",
        session_id: "fixture-session",
        cwd: projectDir,
      }),
    },
  );
  if (presence.status !== 0) {
    throw new Error(`fixture human presence failed: ${presence.stderr || presence.stdout}`);
  }
  if (!readAuditRows(projectDir).some((row) =>
    row.eventName === "amadeus.human.turn" || row.attributes?.Event === "HUMAN_TURN",
  )) {
    throw new Error("fixture human presence did not append a HUMAN_TURN audit event");
  }
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

interface AuditRow {
  readonly eventName?: string;
  readonly attributes?: Readonly<Record<string, string>>;
}

function readAuditRows(projectDir: string): AuditRow[] {
  return readdirSync(join(seededRecordDir(projectDir), "audit"))
    .filter((name) => name.endsWith(".jsonl"))
    .flatMap((name) =>
      readFileSync(join(seededRecordDir(projectDir), "audit", name), "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as AuditRow),
    );
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
  const audit = readAuditRows(projectDir);
  const failedReport = audit.findIndex((row) =>
    row.eventName === "amadeus.operation.failed" &&
    row.attributes?.Event === "ERROR_LOGGED" &&
    row.attributes.Command?.includes("report --stage formal-model-check --result completed") &&
    row.attributes.Error?.includes("phase-check-construction.md"),
  );
  expect(failedReport).toBeGreaterThanOrEqual(0);
}

function assertStateApprovalJourney(projectDir: string, run: ToolRun): void {
  expect(run.exitCode).toBe(0);
  const phaseCheck = join(seededRecordDir(projectDir), "verification", "phase-check-construction.md");
  if (!existsSync(phaseCheck)) {
    throw new Error(`LLM did not create ${phaseCheck}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
  }
  expect(readIntentEntries(projectDir)).toHaveLength(1);
  const state = readFileSync(join(seededRecordDir(projectDir), "amadeus-state.md"), "utf8");
  expect(state).toContain("- [x] formal-model-check — EXECUTE");
  expect(state).toContain("- **Workflow Completion Status**: pending");
  const audit = readAuditRows(projectDir);
  const failedApproval = audit.findIndex((row) =>
    row.eventName === "amadeus.operation.failed" &&
    row.attributes?.Event === "ERROR_LOGGED" &&
    row.attributes.Command?.includes("approve formal-model-check") &&
    row.attributes.Error?.includes("phase-check-construction.md"),
  );
  expect(failedApproval).toBeGreaterThanOrEqual(0);
}

function runClaude(projectDir: string, prompt = PROMPT(".claude")): ToolRun {
  const result = spawnSync(
    CLAUDE_BIN,
    [
      "--dangerously-skip-permissions",
      "-p",
      prompt,
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

function runCodex(project: CodexExecProject, prompt = PROMPT(".codex")): ToolRun {
  const result = spawnSync(CODEX_BIN, ["exec", prompt], {
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

  test.skipIf(CLAUDE_SKIP_REASON !== null)(
    `Claude Code follows a direct state-tool error result${CLAUDE_SKIP_REASON ? ` [SKIP: ${CLAUDE_SKIP_REASON}]` : ""}`,
    () => {
      const projectDir = setupIntegrationProject();
      try {
        prepareFormalModelCheckFixture(projectDir, ".claude");
        assertStateApprovalJourney(projectDir, runClaude(projectDir, STATE_APPROVE_PROMPT(".claude")));
      } finally {
        cleanupTestProject(projectDir);
      }
    },
    TIMEOUT_MS,
  );

  test.skipIf(CODEX_SKIP_REASON !== null)(
    `Codex follows a direct state-tool error result${CODEX_SKIP_REASON ? ` [SKIP: ${CODEX_SKIP_REASON}]` : ""}`,
    () => {
      const project = setupCodexExecProject({
        prefix: "amadeus-codex-state-journey-",
        distributionDir: CODEX_DIST,
        repositoryRoot: REPO_ROOT,
        model: process.env.AMADEUS_CODEX_EXEC_MODEL ?? "gpt-5.6-sol",
        rulesDir: ".codex/amadeus-rules",
        prepareProject: (projectDir) => prepareFormalModelCheckFixture(projectDir, ".codex"),
      });
      try {
        assertStateApprovalJourney(project.proj, runCodex(project, STATE_APPROVE_PROMPT(".codex")));
      } finally {
        project.cleanup();
      }
    },
    TIMEOUT_MS,
  );
});
