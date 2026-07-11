// covers: subcommand:amadeus-orchestrate:next, audit:ERROR_LOGGED
//
// Issue #839: the engine (amadeus-orchestrate) was the ONLY CLI whose error
// exits left no audit trail. Every sibling tool records an ERROR_LOGGED row via
// amadeus-lib's emitError contract; the engine's two error exits — an `error`
// directive emitted to stdout (exit 0, the conductor acts on it) and the
// top-level catch on a malformed-state / missing-graph throw (stderr + exit 1)
// — recorded nothing (an emit⇔terminal asymmetry, PM1-6 class). This test pins
// the fix: BOTH error exits now best-effort append ERROR_LOGGED, while the
// stdout directive JSON and the process exit code stay byte-for-byte unchanged.
//
// Mechanism = cli (spawn the real dist tool). The observables are all at the
// PROCESS boundary: the exact stdout the emit() path prints, the exit code, and
// the audit-shard bytes recordEngineError appends. bun's coverage cannot see
// through the spawn (the spawn blindspot), so the in-process coverage of
// recordEngineError lives in the sibling unit seam
// (tests/unit/t214-engine-error-logged-seam.test.ts); this file proves the
// end-to-end WIRING that the seam cannot reach.
//
// Source under test (dist/claude/.claude/tools/amadeus-orchestrate.ts):
//   emit() error branch — `if (directive.kind === "error") recordEngineError(...)`
//     fires before the JSON print, so every `emit(errorDirective(...))` call
//     site (30+) records without touching stdout. Driven by `next --scope
//     <bogus>` which reaches errorDirective("Unknown scope ...") at exit 0.
//   top-level catch — recordEngineError(errorMessage(e)) before the unchanged
//     console.error + exit(1). Driven by pointing AMADEUS_STAGE_GRAPH at a
//     malformed JSON file so loadStageGraph() throws inside main().
//
// recordEngineError is best-effort: no-op when no workflow state exists in the
// resolved project dir, and any recording failure is swallowed. Both driven
// scenarios seed a state file first, so the guard lets the row through.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  cleanupTestProject,
  createTestProject,
  seededAuditShard,
  seedStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const REPO_ROOT = join(import.meta.dir, "..", "..");
const TOOLS = join(REPO_ROOT, "dist", "claude", ".claude", "tools");
const ORCH = join(TOOLS, "amadeus-orchestrate.ts");

const tempDirs: string[] = [];

afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

/** Fresh temp project seeded with a valid active-intent state file, so
 *  recordEngineError's `existsSync(stateFilePath)` guard passes. */
function projWithState(): string {
  const p = createTestProject();
  tempDirs.push(p);
  seedStateFile(p, "state-init-active.md");
  return p;
}

interface CliResult {
  status: number;
  stdout: string;
  stderr: string;
}

function runOrch(args: string[], p: string, extraEnv: Record<string, string> = {}): CliResult {
  const res = spawnSync(BUN, [ORCH, ...args, "--project-dir", p], {
    encoding: "utf-8",
    // Explicit env (spawn-blindspot discipline): inherit the parent env plus
    // CLAUDE_PROJECT_DIR so project-dir resolution is unambiguous, then layer
    // any per-case override (e.g. the malformed stage-graph seam).
    env: { ...process.env, CLAUDE_PROJECT_DIR: p, ...extraEnv },
  });
  return { status: res.status ?? -1, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

/** Count `**Event**: ERROR_LOGGED` blocks in the project's audit shard. */
function errorLoggedCount(p: string): number {
  const shard = seededAuditShard(p);
  if (!existsSync(shard)) return 0;
  return readFileSync(shard, "utf-8")
    .split("\n")
    .filter((l) => /^\*\*Event\*\*: ERROR_LOGGED$/.test(l)).length;
}

describe("t214: engine error directive records ERROR_LOGGED (#839)", () => {
  test("`next --scope <bogus>` emits the unknown-scope error directive at exit 0", () => {
    const p = projWithState();
    const r = runOrch(["next", "--scope", "zzznotascope"], p);
    // Exit code unchanged: an error directive is a conductor-handled terminal,
    // NOT a process failure.
    expect(r.status).toBe(0);
    // stdout is exactly the directive JSON (recording never writes stdout).
    const directive = JSON.parse(r.stdout.trim());
    expect(directive.kind).toBe("error");
    expect(directive.message).toContain("Unknown scope");
  });

  test("...and that error directive leaves an ERROR_LOGGED audit row", () => {
    const p = projWithState();
    expect(errorLoggedCount(p)).toBe(0); // RED baseline: nothing before the run
    runOrch(["next", "--scope", "zzznotascope"], p);
    // GREEN: the fix appends exactly one ERROR_LOGGED row via emit()'s branch.
    expect(errorLoggedCount(p)).toBe(1);
  });

  test("the recorded row names the engine tool and the error message", () => {
    const p = projWithState();
    runOrch(["next", "--scope", "zzznotascope"], p);
    const shard = readFileSync(seededAuditShard(p), "utf-8");
    expect(shard).toContain("ERROR_LOGGED");
    expect(shard).toContain("amadeus-orchestrate");
    expect(shard).toContain("Unknown scope");
  });
});

describe("t214: engine top-level catch records ERROR_LOGGED (#839)", () => {
  /** Write a malformed stage-graph JSON and return the AMADEUS_STAGE_GRAPH env
   *  that points loadStageGraph() at it (the lib.ts:295 test seam). */
  function badGraphEnv(p: string): Record<string, string> {
    const bad = join(p, "bad-stage-graph.json");
    writeFileSync(bad, "this is not valid json {", "utf-8");
    return { AMADEUS_STAGE_GRAPH: bad };
  }

  test("a malformed stage graph throws → stderr message + exit 1 (unchanged)", () => {
    const p = projWithState();
    const r = runOrch(["next"], p, badGraphEnv(p));
    expect(r.status).toBe(1);
    expect(r.stdout).toBe(""); // never a half-emitted directive on stdout
    expect(r.stderr).toContain("amadeus-orchestrate:");
  });

  test("...and the uncaught throw leaves an ERROR_LOGGED audit row", () => {
    const p = projWithState();
    expect(errorLoggedCount(p)).toBe(0); // RED baseline
    runOrch(["next"], p, badGraphEnv(p));
    // GREEN: the top-level catch best-effort records before exit(1).
    expect(errorLoggedCount(p)).toBe(1);
  });
});
