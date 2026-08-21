// size: large
//
// Real-LLM E2E: Claude Code and Codex drive the shipped Amadeus TypeScript
// tools against a pre-seeded fixture workspace. The fixture is not born or
// selected by the provider, so this test never creates a live Intent.
// Historical regression targets and their next live journeys are recorded in
// tests/fixtures/live-llm-regression-priority.json.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { scaleTestTime } from "../lib/test-time-factor.ts";
import { claudePrintLiveSkipReason } from "../harness/claude-print-live.ts";
import {
  codexExecLiveSkipReason,
  codexExecChildEnvironment,
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
const STATE_FIXTURE = "state-pr-convergence-repair.md";
const CLAUDE_SANDBOX_SETTINGS = JSON.stringify({
  sandbox: { enabled: true, failIfUnavailable: true },
});
const CHILD_PATH = `${dirname(process.execPath)}:/opt/homebrew/bin:/usr/bin:/bin`;
const PROMPT = (harnessDir: ".claude" | ".codex"): string => [
  "You are driving a pre-seeded Amadeus test workspace.",
  "Use the shipped TypeScript tools through the shell; do not merely describe actions.",
  "Do not create, birth, select, or switch an Intent. Do not use git, GitHub, or the network.",
  `Run exactly: bun ${harnessDir}/tools/amadeus-orchestrate.ts report --stage pr-convergence --result completed`,
  "Read the tool result. If it reports a missing verification artifact, create the exact path named in that result with a concise markdown verification note, then rerun the same report command.",
  "Continue until the report command succeeds, then stop and summarize the tool commands executed.",
].join(" ");
const STATE_APPROVE_PROMPT = (harnessDir: ".claude" | ".codex"): string => [
  "You are driving a pre-seeded Amadeus test workspace.",
  "Use the shipped TypeScript tools through the shell; do not merely describe actions.",
  "Do not create, birth, select, or switch an Intent. Do not use git, GitHub, or the network.",
  `Run exactly: bun ${harnessDir}/tools/amadeus-state.ts approve pr-convergence --defer-workflow-completion --project-dir .`,
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

function claudeSubscriptionAuthSkipReason(): string | null {
  const home = process.env.HOME;
  if (!home) return "HOME is unavailable for subscription auth isolation";
  if (
    (!existsSync(join(home, ".claude", ".claude.json")) &&
      !existsSync(join(home, ".claude.json"))) ||
    !existsSync(join(home, ".claude", ".credentials.json"))
  ) {
    return "Claude subscription auth files are unavailable";
  }
  return null;
}

function codexSubscriptionAuthSkipReason(): string | null {
  const home = process.env.HOME;
  if (!home) return "HOME is unavailable for subscription auth isolation";
  const codexHome = process.env.CODEX_HOME ?? join(home, ".codex");
  if (!existsSync(join(codexHome, "auth.json")) && !process.env.OPENAI_API_KEY) {
    return "Codex subscription auth is unavailable and no API-key fallback is set";
  }
  return null;
}

const CLAUDE_SKIP_REASON = claudeSkipReason() ?? claudeSubscriptionAuthSkipReason();
const CODEX_SKIP_REASON = codexSkipReason() ?? codexSubscriptionAuthSkipReason();

interface ChildEnvironment {
  readonly env: NodeJS.ProcessEnv;
  readonly cleanup: () => void;
}

function installChildBun(home: string): void {
  const bin = join(home, ".nix-profile", "bin");
  mkdirSync(bin, { recursive: true });
  symlinkSync(process.execPath, join(bin, "bun"));
}

function isolatedClaudeEnvironment(projectDir: string): ChildEnvironment {
  const sourceHome = process.env.HOME;
  if (!sourceHome) throw new Error("HOME is unavailable for Claude subscription auth isolation");
  const root = mkdtempSync(join(tmpdir(), "amadeus-claude-child-"));
  const home = join(root, "home");
  const claudeHome = join(home, ".claude");
  try {
    mkdirSync(claudeHome, { recursive: true });
    installChildBun(home);
    cpSync(join(sourceHome, ".claude", ".credentials.json"), join(claudeHome, ".credentials.json"));
    const accountPath = existsSync(join(sourceHome, ".claude", ".claude.json"))
      ? join(sourceHome, ".claude", ".claude.json")
      : join(sourceHome, ".claude.json");
    const account = JSON.parse(readFileSync(accountPath, "utf8")) as {
      readonly hasAvailableSubscription?: boolean;
      readonly oauthAccount?: unknown;
    };
    writeFileSync(
      join(claudeHome, ".claude.json"),
      `${JSON.stringify({
        hasAvailableSubscription: account.hasAvailableSubscription,
        oauthAccount: account.oauthAccount,
        projects: { [projectDir]: { hasTrustDialogAccepted: true } },
      })}\n`,
      "utf8",
    );
    return {
      env: {
        PATH: CHILD_PATH,
        LANG: process.env.LANG,
        LC_ALL: process.env.LC_ALL,
        NO_COLOR: process.env.NO_COLOR,
        HOME: home,
        CLAUDE_CONFIG_DIR: claudeHome,
      },
      cleanup: () => rmSync(root, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

function prepareCodexSubscriptionAuth(home: string): void {
  installChildBun(home);
  const sourceHome = process.env.HOME;
  const sourceCodexHome = process.env.CODEX_HOME ?? (sourceHome ? join(sourceHome, ".codex") : undefined);
  if (!sourceCodexHome || !existsSync(join(sourceCodexHome, "auth.json"))) return;
  cpSync(join(sourceCodexHome, "auth.json"), join(home, "auth.json"));
}

/**
 * Seed the exact fixture needed by the report-repair journey. This is test data
 * preparation, not an Intent lifecycle operation: the provider never runs
 * intent-birth or selects it.
 */
function preparePluginStageFixture(projectDir: string, harnessDir: ".claude" | ".codex"): void {
  seedWorkspaceShell(projectDir);
  seedStateFile(projectDir, STATE_FIXTURE);
  seedAuditFile(projectDir);
  cpSync(join(REPO_ROOT, "plugins"), join(projectDir, "plugins"), { recursive: true });
  writeFileSync(
    join(projectDir, "amadeus", "config.json"),
    `${JSON.stringify({
      plugin: {
        activation: { names: ["github-pr-convergence"] },
        "scope-bindings": {
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
    [join(projectDir, harnessDir, "tools", "amadeus-state.ts"), "gate-start", "pr-convergence", "--project-dir", projectDir],
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

function eventIndexAfter(
  audit: readonly AuditRow[],
  event: string,
  afterIndex: number,
): number {
  return audit.findIndex((row, index) =>
    index > afterIndex &&
    (row.eventName === event || row.attributes?.Event === event) &&
    row.attributes?.Stage === "pr-convergence",
  );
}

function assertRepairJourney(projectDir: string, run: ToolRun): void {
  if (run.exitCode !== 0) {
    throw new Error(`LLM report recovery failed with exit ${run.exitCode}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
  }
  const phaseCheck = join(seededRecordDir(projectDir), "verification", "phase-check-construction.md");
  if (!existsSync(phaseCheck)) {
    throw new Error(`LLM did not create ${phaseCheck}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
  }
  expect(readIntentEntries(projectDir)).toHaveLength(1);
  const state = readFileSync(join(seededRecordDir(projectDir), "amadeus-state.md"), "utf8");
  expect(state).toContain("- [x] pr-convergence — EXECUTE");
  const audit = readAuditRows(projectDir);
  const failedReport = audit.findIndex((row) =>
    row.eventName === "amadeus.operation.failed" &&
    row.attributes?.Event === "ERROR_LOGGED" &&
    row.attributes.Command?.includes("report --stage pr-convergence --result completed") &&
    row.attributes.Error?.includes("phase-check-construction.md"),
  );
  expect(failedReport).toBeGreaterThanOrEqual(0);
  const gateApproved = eventIndexAfter(audit, "GATE_APPROVED", failedReport);
  expect(gateApproved).toBeGreaterThan(failedReport);
  if (state.includes("- **Status**: Completed")) {
    const stageCompleted = eventIndexAfter(audit, "STAGE_COMPLETED", failedReport);
    expect(stageCompleted).toBeGreaterThan(failedReport);
  }
}

function assertStateApprovalJourney(projectDir: string, run: ToolRun): void {
  if (run.exitCode !== 0) {
    throw new Error(`LLM state approval failed with exit ${run.exitCode}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
  }
  const phaseCheck = join(seededRecordDir(projectDir), "verification", "phase-check-construction.md");
  if (!existsSync(phaseCheck)) {
    throw new Error(`LLM did not create ${phaseCheck}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
  }
  expect(readIntentEntries(projectDir)).toHaveLength(1);
  const state = readFileSync(join(seededRecordDir(projectDir), "amadeus-state.md"), "utf8");
  expect(state).toContain("- [x] pr-convergence — EXECUTE");
  expect(state).toContain("- **Workflow Completion Status**: pending");
  const audit = readAuditRows(projectDir);
  const failedApproval = audit.findIndex((row) =>
    row.eventName === "amadeus.operation.failed" &&
    row.attributes?.Event === "ERROR_LOGGED" &&
    row.attributes.Command?.includes("approve pr-convergence") &&
    row.attributes.Error?.includes("phase-check-construction.md"),
  );
  expect(failedApproval).toBeGreaterThanOrEqual(0);
  const gateApproved = eventIndexAfter(audit, "GATE_APPROVED", failedApproval);
  expect(gateApproved).toBeGreaterThan(failedApproval);
  // The direct state journey deliberately uses --defer-workflow-completion;
  // that terminal handoff records GATE_APPROVED and leaves the completion
  // boundary pending, so STAGE_COMPLETED is emitted by the later completion
  // command rather than by this approval command.
}

function runClaude(projectDir: string, prompt = PROMPT(".claude")): ToolRun {
  const child = isolatedClaudeEnvironment(projectDir);
  try {
    const result = spawnSync(
      CLAUDE_BIN,
      [
        "--dangerously-skip-permissions",
        "-p",
        prompt,
        "--setting-sources",
        "project",
        "--settings",
        CLAUDE_SANDBOX_SETTINGS,
        "--tools",
        "Bash",
        "--no-session-persistence",
        "--output-format",
        "json",
      ],
      {
        cwd: projectDir,
        encoding: "utf8",
        env: child.env,
        timeout: TIMEOUT_MS,
      },
    );
    return { exitCode: result.status ?? -1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  } finally {
    child.cleanup();
  }
}

function runCodex(project: CodexExecProject, prompt = PROMPT(".codex")): ToolRun {
  prepareCodexSubscriptionAuth(project.home);
  const childEnvironment = codexExecChildEnvironment(project.home);
  childEnvironment.PATH = CHILD_PATH;
  const result = spawnSync(
    CODEX_BIN,
    [
      "exec",
      "--sandbox",
      "workspace-write",
      "-c",
      "sandbox_workspace_write.network_access=false",
      "--ephemeral",
      prompt,
    ],
    {
      cwd: project.proj,
      encoding: "utf8",
      env: childEnvironment,
      timeout: TIMEOUT_MS,
    },
  );
  return { exitCode: result.status ?? -1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

describe("real-LLM Amadeus tools repair journey without live Intent birth", () => {
  test.skipIf(CLAUDE_SKIP_REASON !== null)(
    `Claude Code repairs a tool-reported phase boundary${CLAUDE_SKIP_REASON ? ` [SKIP: ${CLAUDE_SKIP_REASON}]` : ""}`,
    () => {
      const projectDir = setupIntegrationProject();
      try {
        preparePluginStageFixture(projectDir, ".claude");
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
        prepareProject: (projectDir) => preparePluginStageFixture(projectDir, ".codex"),
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
        preparePluginStageFixture(projectDir, ".claude");
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
        prepareProject: (projectDir) => preparePluginStageFixture(projectDir, ".codex"),
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
