// size: large
// Issue #1336 live boundary proof. This opt-in test starts a real Herdr
// session, launches the installed Codex CLI in a named pane, and verifies that
// the production supervisor publishes exact readiness only after Herdr can
// resolve that live Codex role.
import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../..");
const HELPER = join(ROOT, "packages/framework/core/tools/team-up-codex-safety-wait.ts");
const LIVE_ENABLED =
  process.env.AMADEUS_TEAM_UP_LIVE_E2E === "1" && process.env.GITHUB_ACTIONS !== "true";
const HERDR = Bun.which("herdr");
const CODEX = Bun.which("codex");
const SCRIPT = Bun.which("script");
const LIVE_AVAILABLE = LIVE_ENABLED && HERDR !== null && CODEX !== null && SCRIPT !== null;
const liveTest = LIVE_AVAILABLE ? test : test.skip;

let scratch = "";
let session = "";
let sessionProcess: Bun.Subprocess | null = null;

type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

function run(command: string[], cwd = ROOT): CommandResult {
  const result = Bun.spawnSync(command, { cwd, stderr: "pipe", stdout: "pipe" });
  return {
    exitCode: result.exitCode ?? 1,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

async function waitUntil(predicate: () => boolean, timeoutMs = scaleTestTime(15_000)): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await Bun.sleep(scaleTestTime(100));
  }
  throw new Error(`condition did not become true within ${timeoutMs}ms`);
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function startHerdrSession(): Bun.Subprocess {
  if (HERDR === null || SCRIPT === null) throw new Error("live commands are unavailable");
  const transcript = join(scratch, "herdr-transcript.log");
  const launch = `stty rows 40 cols 120; exec ${shellQuote(HERDR)} --session ${shellQuote(session)}`;
  const args =
    process.platform === "darwin"
      ? ["-q", transcript, "/bin/sh", "-c", launch]
      : ["-q", "-c", launch, transcript];
  const clientLog = Bun.file(join(scratch, "herdr-client.log"));
  return Bun.spawn([SCRIPT, ...args], {
    cwd: ROOT,
    stdin: "ignore",
    stdout: clientLog,
    stderr: clientLog,
  });
}

function sessionIsRunning(): boolean {
  if (HERDR === null) return false;
  const result = run([HERDR, "session", "list", "--json"]);
  if (result.exitCode !== 0) return false;
  try {
    const list = JSON.parse(result.stdout) as {
      sessions?: Array<{ name?: string; running?: boolean }>;
    };
    const entry = (list.sessions ?? []).find((item) => item.name === session);
    return entry?.running === true;
  } catch {
    return false;
  }
}

function liveCodexRoleIsReady(): boolean {
  if (HERDR === null) return false;
  const result = run([process.execPath, HELPER, "role-ready", "--session", session, "--role", "leader"]);
  return result.exitCode === 0;
}

async function cleanupHerdrSession(): Promise<void> {
  if (HERDR !== null && session !== "") {
    run([HERDR, "session", "stop", session, "--json"]);
    run([HERDR, "session", "delete", session, "--json"]);
  }
  if (sessionProcess !== null) {
    sessionProcess.kill();
    await sessionProcess.exited;
    sessionProcess = null;
  }
}

afterEach(async () => {
  await cleanupHerdrSession();
  if (scratch !== "") rmSync(scratch, { recursive: true, force: true });
  scratch = "";
  session = "";
});

describe("team-up Codex safety-wait live readiness (Issue #1336)", () => {
  liveTest(
    "publishes exact readiness only after a real Herdr session resolves a real Codex role",
    async () => {
      if (HERDR === null || CODEX === null) throw new Error("live commands are unavailable");
      scratch = mkdtempSync(join(tmpdir(), "team-up-safety-wait-live-"));
      session = `amadeus-1336-${process.pid}-${Date.now()}`;
      sessionProcess = startHerdrSession();
      await waitUntil(sessionIsRunning);

      const missingRole = run([
        process.execPath,
        HELPER,
        "role-ready",
        "--session",
        session,
        "--role",
        "leader",
      ]);
      expect(missingRole.exitCode).toBe(3);

      const started = run([
        HERDR,
        "--session",
        session,
        "agent",
        "start",
        "leader",
        "--cwd",
        ROOT,
        "--",
        CODEX,
        "--no-alt-screen",
      ]);
      expect(started.exitCode, started.stderr).toBe(0);
      await waitUntil(liveCodexRoleIsReady, 90_000);

      const runId = `run-${process.pid}`;
      const runRecord = join(scratch, runId);
      const memberRecord = join(runRecord, "members", "leader");
      mkdirSync(memberRecord, { recursive: true });
      writeFileSync(join(runRecord, "session"), `${session}\n`);
      writeFileSync(join(runRecord, "runtime"), "codex\n");
      writeFileSync(join(runRecord, "status"), "launching\n");

      const supervisor = Bun.spawn(
        [
          process.execPath,
          HELPER,
          "supervise",
          "--session",
          session,
          "--run",
          runId,
          "--role",
          "leader",
          "--run-record",
          runRecord,
          "--herdr",
          HERDR,
          "--codex",
          CODEX,
        ],
        { cwd: ROOT, stdout: "ignore", stderr: "pipe" },
      );
      const readyPath = join(memberRecord, "safety-wait.ready");
      await waitUntil(() => existsSync(readyPath));

      expect(JSON.parse(readFileSync(readyPath, "utf8"))).toEqual({
        schemaVersion: 1,
        run: runId,
        role: "leader",
        pid: supervisor.pid,
      });
      expect(readdirSync(memberRecord).filter((name) => name.endsWith(".tmp"))).toEqual([]);

      const valid = run([
        process.execPath,
        HELPER,
        "ready-valid",
        "--session",
        session,
        "--run",
        runId,
        "--role",
        "leader",
        "--run-record",
        runRecord,
        "--pid",
        String(supervisor.pid),
      ]);
      expect(valid.exitCode, valid.stderr).toBe(0);

      writeFileSync(join(runRecord, "status"), "stopped\n");
      const [supervisorExit, supervisorStderr] = await Promise.all([
        supervisor.exited,
        new Response(supervisor.stderr).text(),
      ]);
      expect(supervisorExit).toBe(3);
      expect(supervisorStderr).toContain("result=inactive-run");
    },
    120_000,
  );
});
