// covers: function:amadeus-orchestrate:refuseInactiveCodexHooks, function:amadeus-orchestrate:refuseBlockedNextEnvironment, function:handleNext
// size: medium
//
// t513 — `next` fails fast on Codex when the ACTIVE hooks file is missing
// (issue #2703).
//
// Defect: `.codex/hooks.json` is the per-clone runtime state Codex actually
// reads; it is gitignored, so a fresh worktree only carries the tracked
// canonical `.codex/hooks.json.example`. With no active file no Codex hook ever
// fires, so the UserPromptSubmit → `mint` → HUMAN_TURN chain never runs. The
// engine happily emitted intent-birth and run-stage directives, and the
// workflow only died — silently — at the first human checkpoint, when
// `amadeus-log answer` and `amadeus-bolt set-autonomy` hit their provenance
// guards with no HUMAN_TURN in the ledger.
//
// Contract: on Codex, when the canonical example exists but the active file
// does not, `next` refuses BEFORE any state inspection and names the recovery
// (activate + restart the Codex task, because an already-running task does not
// reload hooks.json). Every other harness, and any project without the Codex
// canonical projection, is untouched.
//
// Mechanism: in-process drive of handleNext against real temp projects
// (cid:code-generation:fs-tests-integration-first — the guard reads the real
// filesystem). The harness is forced through AMADEUS_HARNESS_TYPE (the seam
// t460 uses for the sibling Kimi caller guard) AND AMADEUS_HARNESS_DIR, because
// the guard keys on the type while its recovery command is built from
// harnessDir() — on a real Codex install both resolve off the same `.codex`
// tree, so the fixture must move them together.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handleNext } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedStateFile,
} from "../harness/fixtures.ts";

const MID_IDEATION = join(FIXTURES_DIR, "state-mid-ideation.md");

// The engine's error path ends in console.log of an `error` directive; the CLI
// handler may also process.exit. Capture both, exactly as t213 does.
class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

function captureRun(fn: () => void): { stdout: string; stderr: string } {
  let stdout = "";
  let stderr = "";
  const origExit = process.exit.bind(process);
  const origLog = console.log;
  const origErr = console.error;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.log = (...a: unknown[]) => {
    stdout += `${a.map(String).join(" ")}\n`;
  };
  console.error = (...a: unknown[]) => {
    stderr += `${a.map(String).join(" ")}\n`;
  };
  try {
    fn();
  } catch (e) {
    if (!(e instanceof ExitSignal)) throw e;
  } finally {
    process.exit = origExit;
    console.log = origLog;
    console.error = origErr;
  }
  return { stdout, stderr };
}

// A minimal Codex projection: only the two paths the guard inspects matter, so
// the canonical body is a placeholder — the guard is a presence check, not a
// contract check (the contract check lives in codexHooksDoctorCheck).
function writeCodexCanonical(proj: string): void {
  mkdirSync(join(proj, ".codex"), { recursive: true });
  writeFileSync(join(proj, ".codex", "hooks.json.example"), "{}\n", "utf-8");
}

function activateCodex(proj: string): void {
  writeFileSync(join(proj, ".codex", "hooks.json"), "{}\n", "utf-8");
}

function runNext(proj: string): string {
  const r = captureRun(() => handleNext([], proj));
  return `${r.stdout}${r.stderr}`;
}

/** Present the process as the named harness through BOTH resolution seams —
 *  the guard keys on the type, its recovery command on the dir. */
function asHarness(type: string, dir: string): void {
  process.env.AMADEUS_HARNESS_TYPE = type;
  process.env.AMADEUS_HARNESS_DIR = dir;
}

// The source tree carries no generated data/ payload (source-only boundary), so
// the in-process engine is pointed at the built distribution's graph the same
// way t198 drives handleNext from the canonical module.
const SAVED = [
  "AMADEUS_HARNESS_TYPE",
  "AMADEUS_HARNESS_DIR",
  "CLAUDE_PROJECT_DIR",
  "AMADEUS_STAGE_GRAPH",
  "AMADEUS_SCOPE_GRID",
  "AMADEUS_SCOPES_DIR",
] as const;

let proj = "";
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  resetAidlcEnv();
  saved = {};
  for (const key of SAVED) saved[key] = process.env[key];
  proj = createTestProject();
  process.env.CLAUDE_PROJECT_DIR = proj;
  process.env.AMADEUS_STAGE_GRAPH = join(AMADEUS_SRC, "tools", "data", "stage-graph.json");
  process.env.AMADEUS_SCOPE_GRID = join(AMADEUS_SRC, "tools", "data", "scope-grid.json");
  process.env.AMADEUS_SCOPES_DIR = join(AMADEUS_SRC, "scopes");
  seedStateFile(proj, MID_IDEATION);
});

afterEach(() => {
  for (const key of SAVED) {
    const previous = saved[key];
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
  resetAidlcEnv();
  if (proj) cleanupTestProject(proj);
  proj = "";
});

describe("t513 next refuses an inactive Codex hooks projection (#2703)", () => {
  test("REFUSES with actionable guidance when only the canonical example exists", () => {
    asHarness("codex", ".codex");
    writeCodexCanonical(proj);

    const out = runNext(proj);

    expect(out).toContain('"kind":"error"');
    // (a) which file is missing.
    expect(out).toContain(".codex/hooks.json");
    // (b) the command that creates it.
    expect(out).toContain("bun .codex/tools/amadeus-codex-hooks.ts activate");
    // (c) an already-running Codex task will not reload hooks.json.
    expect(out).toContain("restart");
  });

  test("REFUSES when the active path is a directory, not a regular file", () => {
    // Codex cannot load hooks from a directory at .codex/hooks.json, so a
    // directory there must not count as activation — treating it as active
    // would re-open the silent deadlock this guard exists to close.
    asHarness("codex", ".codex");
    writeCodexCanonical(proj);
    mkdirSync(join(proj, ".codex", "hooks.json"), { recursive: true });

    const out = runNext(proj);

    expect(out).toContain('"kind":"error"');
    expect(out).toContain("bun .codex/tools/amadeus-codex-hooks.ts activate");
  });

  test("ALLOWS the same project once the active file exists", () => {
    asHarness("codex", ".codex");
    writeCodexCanonical(proj);
    activateCodex(proj);

    const out = runNext(proj);

    expect(out).not.toContain("amadeus-codex-hooks.ts activate");
  });

  test("does not fire when the project carries no Codex canonical projection", () => {
    // A non-Codex project (or a Codex-typed session pointed at a tree without
    // the projection) must never be blocked by a file it was never given.
    asHarness("codex", ".codex");
    rmSync(join(proj, ".codex"), { recursive: true, force: true });

    const out = runNext(proj);

    expect(out).not.toContain("amadeus-codex-hooks.ts activate");
  });

  test("negative control: another harness with the same missing file is untouched", () => {
    asHarness("claude-code", ".claude");
    writeCodexCanonical(proj);

    const out = runNext(proj);

    expect(out).not.toContain("amadeus-codex-hooks.ts activate");
  });
});
