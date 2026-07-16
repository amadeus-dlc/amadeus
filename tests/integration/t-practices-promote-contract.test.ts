// covers: subcommand:amadeus-state:practices-promote, function:handlePracticesPromote
//
// Process-boundary falling test for the practices-promote section-keyword
// contract (Issue #1013, E-PB2 ruling A = atomic fail-closed). Spawns the real
// dist CLI (BUN + amadeus-state.ts practices-promote) so the EXIT CODE half is
// real — an in-process twin cannot prove the process boundary. Complements the
// in-process coverage seam in
// tests/unit/t-practices-promote-contract-seam.test.ts.
//
// FALLING-TEST RECORD (FR-5): against the pre-fix implementation (no contract
// check), a prose-injected ## Mandated line was appended verbatim and the tool
// exited 0 with both targets written — so Case F (exit non-zero + no write)
// went RED before the fix and GREEN after. Recorded in the bolt PR body.
//
// FIXTURE DISCIPLINE mirrors t75: each case builds a fresh temp project via
// createTestProject; NOTHING is written under tests/fixtures/**; temp dirs are
// cleaned in afterAll.

import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  cleanupTestProject,
  createTestProject,
  seededAuditShard,
  seededStateFile,
} from "../harness/fixtures.ts";
import { memoryDirFor } from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import { handlePracticesPromote } from "../../dist/claude/.claude/tools/amadeus-state.ts";

const BUN = process.execPath;
const REPO_ROOT = join(import.meta.dir, "..", "..");
const STATE_TS = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-state.ts");

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

const TEAM_MD_LIVE = "# Team-Level Rules\n\n## Way of Working\n\nOLD_WAY_TEXT\n";
const PROJECT_MD_LIVE = "# Project-Level Rules\n\n## Mandated\n\n## Forbidden\n";
const TEAM_PRACTICES_DRAFT = "# Team Practices Draft\n";

interface Fixture {
  proj: string;
  teamMd: string;
  projectMd: string;
  teamPractices: string;
  discoveredRules: string;
}

function makeFixture(discoveredRulesBody: string): Fixture {
  const proj = createTestProject();
  tempDirs.push(proj);
  const memDir = memoryDirFor(proj);
  const draftDir = join(proj, "amadeus-docs", "inception", "practices-discovery");
  mkdirSync(memDir, { recursive: true });
  mkdirSync(draftDir, { recursive: true });

  const teamMd = join(memDir, "team.md");
  const projectMd = join(memDir, "project.md");
  const teamPractices = join(draftDir, "team-practices.md");
  const discovered = join(draftDir, "discovered-rules.md");

  writeFileSync(teamMd, TEAM_MD_LIVE, "utf-8");
  writeFileSync(projectMd, PROJECT_MD_LIVE, "utf-8");
  writeFileSync(teamPractices, TEAM_PRACTICES_DRAFT, "utf-8");
  writeFileSync(discovered, discoveredRulesBody, "utf-8");
  writeFileSync(
    seededStateFile(proj),
    "# AI-DLC State Tracking\n## Current Status\n- **Scope**: feature\n",
    "utf-8",
  );

  return { proj, teamMd, projectMd, teamPractices, discoveredRules: discovered };
}

interface CliResult {
  status: number;
  out: string;
}

function runPromote(fx: Fixture): CliResult {
  const res = spawnSync(
    BUN,
    [
      STATE_TS,
      "practices-promote",
      "--project-dir",
      fx.proj,
      "--team-practices",
      fx.teamPractices,
      "--discovered-rules",
      fx.discoveredRules,
      "--affirming-user",
      "test-user",
    ],
    { encoding: "utf-8", env: process.env },
  );
  return { status: res.status ?? -1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

function auditEventCount(file: string, ev: string): number {
  if (!existsSync(file)) return 0;
  const re = new RegExp(`^\\*\\*Event\\*\\*: ${ev}$`);
  return readFileSync(file, "utf-8").split("\n").filter((l) => re.test(l)).length;
}

// ============================================================
// Case F — prose injection fails closed, no write (the FR-5 falling test)
// ============================================================

describe("t-practices-promote-contract: prose injection fails closed", () => {
  test("F: a non-keyword ## Mandated line -> exit non-zero, PRACTICES_OVERRIDE, targets untouched", () => {
    const fx = makeFixture(
      "# Discovered Rules\n\n## Mandated\n\nThis line is prose, not a rule\n\n## Forbidden\n\nNEVER skip CI gates\n",
    );
    const teamBefore = readFileSync(fx.teamMd, "utf-8");
    const projectBefore = readFileSync(fx.projectMd, "utf-8");

    const r = runPromote(fx);

    // Pre-fix this exited 0 and appended the prose verbatim → RED before fix.
    expect(r.status).not.toBe(0);
    expect(r.out).toContain("section-keyword contract");
    expect(r.out).toContain("This line is prose, not a rule");

    // Atomic reject: neither target written.
    expect(readFileSync(fx.teamMd, "utf-8")).toBe(teamBefore);
    expect(readFileSync(fx.projectMd, "utf-8")).toBe(projectBefore);

    // The fail() path always emits PRACTICES_OVERRIDE (AC-2).
    expect(auditEventCount(seededAuditShard(fx.proj), "PRACTICES_OVERRIDE")).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================
// Case G — section-mismatch (AC-1b) fails closed
// ============================================================

describe("t-practices-promote-contract: section mismatch fails closed", () => {
  test("G: NEVER under ## Mandated -> exit non-zero, project.md untouched", () => {
    const fx = makeFixture(
      "# Discovered Rules\n\n## Mandated\n\nNEVER this-belongs-in-forbidden\n\n## Forbidden\n\n",
    );
    const projectBefore = readFileSync(fx.projectMd, "utf-8");
    const r = runPromote(fx);
    expect(r.status).not.toBe(0);
    expect(r.out).toContain("NEVER this-belongs-in-forbidden");
    expect(readFileSync(fx.projectMd, "utf-8")).toBe(projectBefore);
  });
});

// ============================================================
// Case H — bullet-form acceptance (AC-1a), verbatim append, exit 0
// ============================================================

describe("t-practices-promote-contract: bullet-form acceptance", () => {
  test("H: bullet + bare keyword lines accepted, appended verbatim, exit 0", () => {
    const today = new Date().toISOString().slice(0, 10);
    const fx = makeFixture(
      "# Discovered Rules\n\n## Mandated\n\n- ALWAYS run the suite\nALWAYS bare rule\n\n## Forbidden\n\n- NEVER force-push main\n",
    );
    const r = runPromote(fx);
    expect(r.status).toBe(0);
    const project = readFileSync(fx.projectMd, "utf-8");
    expect(project).toContain(`- ALWAYS run the suite (affirmed ${today})`);
    expect(project).toContain(`ALWAYS bare rule (affirmed ${today})`);
    expect(project).toContain(`- NEVER force-push main (affirmed ${today})`);
  });
});

// ============================================================
// In-process handler driving — covers the contract wiring lines that spawn
// (bun's coverage blindspot) cannot see: handlePracticesPromote ->
// parseRuleSectionsOrFail(discoveredRulesDraft, fail). error()/fail() ends the
// CLI via process.exit; captureExit converts that into a throwable so the reject
// branch registers its lines (lcov-wiring-line-checklist).
// ============================================================

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}
function captureExit(fn: () => void): { threw: boolean; stderr: string } {
  let stderr = "";
  const origExit = process.exit.bind(process);
  const origErr = console.error;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.error = (...a: unknown[]) => {
    stderr += a.map(String).join(" ");
  };
  let threw = false;
  try {
    fn();
  } catch (e) {
    if (e instanceof ExitSignal) threw = true;
    else throw e;
  } finally {
    process.exit = origExit;
    console.error = origErr;
  }
  return { threw, stderr };
}

function runHandlerInProcess(fx: Fixture): { threw: boolean; stderr: string } {
  // Called directly (not via main()), handlePracticesPromote resolves the
  // project dir from CLAUDE_PROJECT_DIR; pin it to the fixture so memoryDirFor()
  // targets the fixture memory dir.
  process.env.CLAUDE_PROJECT_DIR = fx.proj;
  return captureExit(() =>
    handlePracticesPromote([
      "--project-dir",
      fx.proj,
      "--team-practices",
      fx.teamPractices,
      "--discovered-rules",
      fx.discoveredRules,
      "--affirming-user",
      "seam-user",
    ]),
  );
}

describe("t-practices-promote-contract: handler wiring (in-process)", () => {
  let prevPd: string | undefined;
  beforeEach(() => {
    prevPd = process.env.CLAUDE_PROJECT_DIR;
  });
  afterEach(() => {
    if (prevPd === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prevPd;
  });

  test("I: violating draft -> fail()/exit, BOTH targets untouched (atomic reject)", () => {
    const fx = makeFixture(
      "# Discovered Rules\n\n## Mandated\n\nThis line is prose, not a rule\n\n## Forbidden\n\nNEVER skip CI\n",
    );
    const teamBefore = readFileSync(fx.teamMd, "utf-8");
    const projectBefore = readFileSync(fx.projectMd, "utf-8");

    const r = runHandlerInProcess(fx);
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("section-keyword contract");
    expect(r.stderr).toContain("This line is prose, not a rule");
    expect(readFileSync(fx.teamMd, "utf-8")).toBe(teamBefore);
    expect(readFileSync(fx.projectMd, "utf-8")).toBe(projectBefore);
  });

  test("J: valid bullet draft -> no throw, appended verbatim (wiring happy path)", () => {
    const today = new Date().toISOString().slice(0, 10);
    const fx = makeFixture(
      "# Discovered Rules\n\n## Mandated\n\n- ALWAYS run tests\n\n## Forbidden\n\n- NEVER force-push main\n",
    );
    const r = runHandlerInProcess(fx);
    expect(r.threw).toBe(false);
    const project = readFileSync(fx.projectMd, "utf-8");
    expect(project).toContain(`- ALWAYS run tests (affirmed ${today})`);
    expect(project).toContain(`- NEVER force-push main (affirmed ${today})`);
  });
});
