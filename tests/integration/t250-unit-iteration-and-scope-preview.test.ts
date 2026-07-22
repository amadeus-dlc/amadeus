// covers: subcommand:amadeus-state:set-construction-iteration subcommand:amadeus-graph:validate-grid
//
// t250-unit-iteration-and-scope-preview.test.ts — CLI-contract twin for U05
// (FR-2 items 8-9), mechanism = cli. Drives the SHIPPED tools over temp
// workspaces so the subprocess boundary + file side effects are the contract
// under test (the pure decision seams themselves are covered in-process by the
// unit twin t250):
//   - amadeus-state.ts set-construction-iteration: invalid token rejects BEFORE
//     any mutation (state bytes byte-identical), valid token opt-in inserts the
//     runtime `Construction Iteration` field.
//   - amadeus-graph.ts validate-grid: the additive `summary` (stage/gate count)
//     rides alongside the unchanged {valid, errors, advisories} payload.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main as graphMain } from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import { handleSetConstructionIteration } from "../../dist/claude/.claude/tools/amadeus-state.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const REPO_ROOT = join(import.meta.dir, "..", "..");
const TOOLS = join(REPO_ROOT, "dist", "claude", ".claude", "tools");
const STATE = join(TOOLS, "amadeus-state.ts");
const GRAPH = join(TOOLS, "amadeus-graph.ts");
const SCOPE_GRID = join(TOOLS, "data", "scope-grid.json");

resetAidlcEnv();

const tempDirs: string[] = [];
const tempFiles: string[] = [];
afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
  for (const f of tempFiles) rmSync(f, { recursive: true, force: true });
});

interface CliResult {
  status: number;
  out: string;
  stdout: string;
}

function run(tool: string, args: string[]): CliResult {
  const res = spawnSync(BUN, [tool, ...args], { encoding: "utf-8" });
  const stdout = res.stdout ?? "";
  return { status: res.status ?? -1, out: `${stdout}${res.stderr ?? ""}`, stdout };
}

function projWithState(fixtureName: string): string {
  const p = createTestProject();
  tempDirs.push(p);
  seedStateFile(p, join(FIXTURES_DIR, fixtureName));
  return p;
}

describe("t250 set-construction-iteration (mutation-before-reject)", () => {
  test("invalid token exits non-zero and leaves the state file byte-identical", () => {
    const p = projWithState("state-construction.md");
    const sp = seededStateFile(p);
    const before = readFileSync(sp, "utf-8");
    const r = run(STATE, ["set-construction-iteration", "bolt-major", "--project-dir", p]);
    expect(r.status).not.toBe(0);
    expect(r.out).toContain("Invalid construction iteration");
    const after = readFileSync(sp, "utf-8");
    expect(after).toBe(before); // no mutation on the reject arm
  });

  test("missing argument exits non-zero with usage and no mutation", () => {
    const p = projWithState("state-construction.md");
    const sp = seededStateFile(p);
    const before = readFileSync(sp, "utf-8");
    const r = run(STATE, ["set-construction-iteration", "--project-dir", p]);
    expect(r.status).not.toBe(0);
    expect(r.out).toContain("Usage: amadeus-state.ts set-construction-iteration");
    expect(readFileSync(sp, "utf-8")).toBe(before);
  });

  test("valid unit-major opt-in inserts the runtime field", () => {
    const p = projWithState("state-construction.md");
    const sp = seededStateFile(p);
    const r = run(STATE, ["set-construction-iteration", "unit-major", "--project-dir", p]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('"construction_iteration":"unit-major"');
    expect(readFileSync(sp, "utf-8")).toContain("**Construction Iteration**: unit-major");
  });

  // In-process drive of the production handler (lcov-visible; the spawn cases
  // above prove the exit-code + byte-identity contract, this proves the happy
  // path executes the lock/write body). CLAUDE_PROJECT_DIR is the resolveProjectDir
  // env seam so the module-level projectDir (unset in-process) resolves here.
  test("handleSetConstructionIteration drives the write body in-process", () => {
    const p = projWithState("state-construction.md");
    const sp = seededStateFile(p);
    const prev = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = p;
    try {
      handleSetConstructionIteration(["stage-major"]);
    } finally {
      if (prev === undefined) delete process.env.CLAUDE_PROJECT_DIR;
      else process.env.CLAUDE_PROJECT_DIR = prev;
    }
    expect(readFileSync(sp, "utf-8")).toContain("**Construction Iteration**: stage-major");
  });
});

describe("t250 validate-grid additive summary", () => {
  function proposalFromScope(scope: string): string {
    const grid = JSON.parse(readFileSync(SCOPE_GRID, "utf-8")) as Record<
      string,
      { stages: Record<string, string> }
    >;
    const f = join(mkdtempSync(join(tmpdir(), "amadeus-t250-")), "proposal.json");
    tempFiles.push(f);
    writeFileSync(f, JSON.stringify(grid[scope].stages, null, 2), "utf-8");
    return f;
  }

  test("emits summary {stageCount, gateCount} alongside the unchanged payload keys", () => {
    const f = proposalFromScope("poc");
    const r = run(GRAPH, ["validate-grid", "--proposal", f]);
    const body = JSON.parse(r.stdout) as {
      valid: boolean;
      errors: string[];
      advisories: string[];
      summary: { stageCount: number; gateCount: number };
    };
    // Existing keys still present and typed as before.
    expect(typeof body.valid).toBe("boolean");
    expect(Array.isArray(body.errors)).toBe(true);
    expect(Array.isArray(body.advisories)).toBe(true);
    // Additive summary, counted from the same EXECUTE set.
    expect(body.summary).toBeDefined();
    const grid = JSON.parse(readFileSync(SCOPE_GRID, "utf-8")) as Record<
      string,
      { stages: Record<string, string> }
    >;
    const execCount = Object.values(grid.poc.stages).filter((a) => a === "EXECUTE").length;
    expect(body.summary.stageCount).toBe(execCount);
    expect(body.summary.gateCount).toBeGreaterThan(0);
    expect(body.summary.gateCount).toBeLessThanOrEqual(body.summary.stageCount);
  });

  test("summary key is emitted LAST (existing key order preserved)", () => {
    const f = proposalFromScope("feature");
    const r = run(GRAPH, ["validate-grid", "--proposal", f]);
    const keys = Object.keys(JSON.parse(r.stdout) as Record<string, unknown>);
    expect(keys.slice(0, 3)).toEqual(["valid", "errors", "advisories"]);
    expect(keys[keys.length - 1]).toBe("summary");
  });

  // In-process drive of the validate-grid COMMAND (lcov-visible) — a VALID grid
  // so main() does not process.exit(1). Captures stdout to read the emitted
  // summary. The spawn cases above prove the shipped subprocess contract.
  test("validate-grid COMMAND emits summary in-process", async () => {
    const f = proposalFromScope("poc");
    const write = process.stdout.write.bind(process.stdout);
    let captured = "";
    // biome-ignore lint/suspicious/noExplicitAny: minimal stdout spy for the CLI COMMAND
    (process.stdout as any).write = (chunk: any): boolean => {
      captured += String(chunk);
      return true;
    };
    try {
      await graphMain(["validate-grid", "--proposal", f]);
    } finally {
      process.stdout.write = write;
    }
    const body = JSON.parse(captured) as { summary: { stageCount: number; gateCount: number } };
    expect(body.summary.stageCount).toBeGreaterThan(0);
    expect(body.summary.gateCount).toBeGreaterThan(0);
  });
});
