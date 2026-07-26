// covers: hook:amadeus-mint-presence, function:resolveProjectDirFromHook, function:continuationReason, file:settings.json.example
// @test-size medium
//
// t296 — the two ways a worktree session used to lose its hooks entirely.
//
// (A) #1492 — THE HOOK DID NOT LAUNCH. The shipped launch line was
//     `bun $CLAUDE_PROJECT_DIR/.claude/hooks/amadeus-<x>.ts` — bare variable,
//     and for the statusline unquoted. Claude Code does not always export
//     CLAUDE_PROJECT_DIR (a worktree session was measured with it unset), and
//     a hook that never runs writes no audit, no health heartbeat and no error,
//     so the whole gate/audit surface goes silently dead. The shipped form is
//     now quoted and carries the shell default `${CLAUDE_PROJECT_DIR:-.}`,
//     which resolves against the session cwd and hands off to the script's own
//     project-dir ladder. See the note on the falling proof below for exactly
//     which half of that is falsifiable through this seam.
//
// (B) #1482 — THE HOOK LAUNCHED BUT READ THE WRONG TREE. CLAUDE_PROJECT_DIR is
//     pinned to the launch dir and does NOT follow a session into a git
//     worktree, so the env rung resolved the MAIN checkout while the engine
//     worked in the worktree: every HUMAN_TURN landed in the wrong record. The
//     fix promotes the hook payload's own `cwd` above env, gated on the
//     workspace marker.
//
// WHY A SUBPROCESS + A REAL SHELL. Both defects live in the LAUNCH boundary —
// shell expansion and process env — which an in-process call cannot reproduce.
// The commands here are read out of the shipped settings.json.example rather
// than retyped, so the test cannot drift from what actually ships.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  resetAidlcEnv,
  seedStateFile,
  setupIntegrationProject,
} from "../harness/fixtures.ts";
import { readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
// Core (not dist): the seam under test is the reason builder itself, and this
// module is already an in-process import for t246, so it is lcov-measured.
import { continuationReason } from "../../packages/framework/core/hooks/amadeus-stop.ts";

const MID_IDEATION = "state-mid-ideation.md";
const SETTINGS_EXAMPLE = join(AMADEUS_SRC, "settings.json.example");

interface Settings {
  hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>>;
}

/** Every hook command the shipped settings registers, deduplicated. */
function shippedHookCommands(): string[] {
  const settings = JSON.parse(readFileSync(SETTINGS_EXAMPLE, "utf-8")) as Settings;
  const all = Object.values(settings.hooks).flatMap((groups) =>
    groups.flatMap((group) => group.hooks.map((hook) => hook.command)),
  );
  return [...new Set(all)];
}

/** The mint-presence launch line exactly as shipped. */
function mintCommand(): string {
  const command = shippedHookCommands().find((c) => c.includes("amadeus-mint-presence.ts"));
  if (!command) throw new Error("settings.json.example registers no mint-presence hook");
  return command;
}

/** A UserPromptSubmit payload in the live Claude Code shape (measured 2.1.220). */
function promptPayload(cwd: string, prompt = "please approve the gate"): string {
  return JSON.stringify({
    session_id: "sess-t296",
    transcript_path: "/tmp/transcript.jsonl",
    cwd,
    hook_event_name: "UserPromptSubmit",
    prompt,
  });
}

/**
 * Run a launch line through a real shell with CLAUDE_PROJECT_DIR REMOVED from
 * the environment — the #1492 condition. `cwd` is the session dir.
 */
function runWithoutProjectDirEnv(
  command: string,
  cwd: string,
  stdin: string,
): { status: number; stderr: string } {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  const r = spawnSync(command, {
    shell: true,
    cwd,
    input: stdin,
    encoding: "utf-8",
    timeout: 60_000,
    env,
  });
  return { status: r.status ?? -1, stderr: r.stderr ?? "" };
}

function humanTurnCount(proj: string): number {
  return readAllAuditShards(proj)
    .split("\n")
    .filter((line) => line === "**Event**: HUMAN_TURN").length;
}

const projects: string[] = [];
afterEach(() => {
  for (const p of projects.splice(0)) cleanupTestProject(p);
});

function project(): string {
  resetAidlcEnv();
  const proj = setupIntegrationProject({});
  projects.push(proj);
  seedStateFile(proj, MID_IDEATION);
  return proj;
}

describe("t296 (A) #1492 — hook launch lines survive an unset CLAUDE_PROJECT_DIR", () => {
  test("every shipped launch line carries the ${CLAUDE_PROJECT_DIR:-.} default", () => {
    const commands = shippedHookCommands();
    expect(commands.length).toBeGreaterThan(0);
    for (const command of commands) {
      expect(command).toContain("${CLAUDE_PROJECT_DIR:-.}/");
      // The bare form is what silently died — it must not survive anywhere.
      expect(command).not.toContain("bun $CLAUDE_PROJECT_DIR/");
    }
  });

  test("the shipped mint-presence line runs with env unset and appends HUMAN_TURN", () => {
    const proj = project();
    const before = humanTurnCount(proj);
    const r = runWithoutProjectDirEnv(mintCommand(), proj, promptPayload(proj));
    expect(r.status, r.stderr).toBe(0);
    expect(humanTurnCount(proj)).toBe(before + 1);
  });

  // The falling proof for the QUOTING half of the shipped form. The statusline
  // line used to ship BARE (`bun $CLAUDE_PROJECT_DIR/...`, no quotes), so a
  // project path containing a space word-split and the hook never launched.
  // Measured both ways below: pre-fix red, shipped form green.
  //
  // NOTE on the `:-.` half: it is NOT separately falsifiable through this seam.
  // Measured on bun 1.3.13 — with CLAUDE_PROJECT_DIR unset the pre-fix form
  // expands to `bun /.claude/hooks/<x>.ts`, and bun RESOLVES that against the
  // cwd when the file exists there, so it exits 0 from a project root. The
  // default makes the path explicit rather than relying on that undocumented
  // fallback; it is hardening, not a behaviour change, on this runtime.
  test("an unquoted pre-fix line dies on a project path with a space; the shipped form survives", () => {
    const root = mkdtempSync(join(tmpdir(), "t296 space-"));
    projects.push(root);
    const hooksDir = join(root, ".claude", "hooks");
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(join(hooksDir, "probe.ts"), 'console.log("HOOK RAN");\n');

    const preFix = "bun $CLAUDE_PROJECT_DIR/.claude/hooks/probe.ts";
    const shipped = 'bun "${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/probe.ts"';
    const withEnv = (command: string) =>
      spawnSync(command, {
        shell: true,
        cwd: root,
        input: "",
        encoding: "utf-8",
        timeout: 60_000,
        env: { ...process.env, CLAUDE_PROJECT_DIR: root },
      });

    const red = withEnv(preFix);
    expect(red.status).not.toBe(0);

    const green = withEnv(shipped);
    expect(green.status, green.stderr ?? "").toBe(0);
    expect(green.stdout).toContain("HOOK RAN");
  });
});

describe("t296 (B) #1482 — the payload cwd decides which tree a hook writes", () => {
  test("a worktree payload cwd outranks a CLAUDE_PROJECT_DIR pinned to the main checkout", () => {
    const main = project();
    // Stands in for a worktree of `main`: its own amadeus/ record tree and its
    // own .claude/tools/ — the marker resolveProjectDirFromHook checks for.
    const worktreeProject = setupIntegrationProject({});
    projects.push(worktreeProject);
    seedStateFile(worktreeProject, MID_IDEATION);

    const mainBefore = humanTurnCount(main);
    const worktreeBefore = humanTurnCount(worktreeProject);

    // env says main (the launch dir), payload says the worktree (the session).
    const r = spawnSync(process.execPath, [join(AMADEUS_SRC, "hooks", "amadeus-mint-presence.ts")], {
      encoding: "utf-8",
      input: promptPayload(worktreeProject),
      env: { ...process.env, CLAUDE_PROJECT_DIR: main },
    });
    expect(r.status, r.stderr ?? "").toBe(0);
    expect(humanTurnCount(worktreeProject)).toBe(worktreeBefore + 1);
    expect(humanTurnCount(main)).toBe(mainBefore);
  });

  test("a payload cwd with no workspace marker is rejected and env still wins", () => {
    const proj = project();
    const unmarked = join(proj, "not-a-workspace");
    mkdirSync(unmarked, { recursive: true });
    const before = humanTurnCount(proj);

    const r = spawnSync(process.execPath, [join(AMADEUS_SRC, "hooks", "amadeus-mint-presence.ts")], {
      encoding: "utf-8",
      input: promptPayload(unmarked),
      env: { ...process.env, CLAUDE_PROJECT_DIR: proj },
    });
    expect(r.status, r.stderr ?? "").toBe(0);
    expect(humanTurnCount(proj)).toBe(before + 1);
  });
});

// (C) #1482 FR-2e — the block message must name what the hook resolved.
//
// The reason string is the ONLY thing a blocked session sees. When the project
// dir resolved to the wrong checkout, the operator got a pending-step nudge for
// a stage they were not working on and nothing in the message said which tree it
// came from. Driven in-process: this is a pure string builder.
describe("t296 (C) #1482 — the Stop-hook block message names the resolved tree", () => {
  test("the reason carries the resolved project dir and the state path it read", () => {
    const reason = continuationReason(
      "run-stage",
      "requirements-analysis",
      "/tmp/worktree-x",
      "/tmp/worktree-x/amadeus/spaces/default/intents/fixture/amadeus-state.md",
    );
    expect(reason).toContain("pending step");
    expect(reason).toContain('a run-stage directive for "requirements-analysis"');
    expect(reason).toContain("Resolved project dir: /tmp/worktree-x");
    expect(reason).toContain(
      "state read from: /tmp/worktree-x/amadeus/spaces/default/intents/fixture/amadeus-state.md",
    );
  });

  test("a stageless directive still names the resolved tree", () => {
    const reason = continuationReason("ask", "", "/tmp/main", "/tmp/main/state.md");
    expect(reason).toContain("(a ask directive)");
    expect(reason).toContain("Resolved project dir: /tmp/main");
    expect(reason).toContain("state read from: /tmp/main/state.md");
  });
});
