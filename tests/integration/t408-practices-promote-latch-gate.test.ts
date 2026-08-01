// covers: function:handlePracticesPromote otel:fatal-latch
// size: medium
//
// #1961 — practices-promote under a set fatal health latch. Before the fix,
// handlePracticesPromote wrote project.md and team.md FIRST and only then hit
// the latch inside the Step 6 PRACTICES_AFFIRMED emit; the fail() helper's
// compensating PRACTICES_OVERRIDE emit was itself refused by the same latch
// and swallowed by a bare catch — both files mutated, zero audit rows.
//
// The fix forces the latch to be observable BEFORE the Step 4/5 writes
// (ensureOtelBootstrap + assertMutationAllowed): a latched process now fails
// loudly with NEITHER target written. The post-write emit check stays for the
// tiny window where the latch trips mid-process.
//
// Latch injection follows tests/integration/t395-fatal-latch-emit-fail-closed
// (setFatal seam); handler driving follows the in-process pattern of
// tests/integration/t-practices-promote-contract.test.ts so lcov sees the
// gate lines (spawn is a coverage blindspot).

import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setFatal as setFatalDist } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { memoryDirFor } from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import { handlePracticesPromote as handlePracticesPromoteDist } from "../../dist/claude/.claude/tools/amadeus-state.ts";
import { setFatal as setFatalSrc } from "../../packages/framework/core/otel/fatal-latch.ts";
import { handlePracticesPromote as handlePracticesPromoteSrc } from "../../packages/framework/core/tools/amadeus-state.ts";
import { cleanupTestProject, createTestProject, seededAuditShard, seededStateFile } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

// Both module graphs are driven: the shipped dist copy (what the CLI runs) and
// the canonical packages/framework copy (what the patch-coverage lcov measures
// — other suites load it in-process, so its lines are DA-visible and must be
// hit here, not just in the dist twin). Same dual-surface rationale as
// tests/harness/otel-reset.ts. Each surface's latch is its own singleton, so
// setFatal is paired with the handler from the SAME graph.
interface Surface {
  name: string;
  handler: (args: string[]) => void;
  latch: (reason: string) => void;
}
const SURFACES: Surface[] = [
  { name: "dist", handler: handlePracticesPromoteDist, latch: setFatalDist },
  { name: "src", handler: handlePracticesPromoteSrc, latch: setFatalSrc },
];

const TEAM_MD_LIVE = "# Team-Level Rules\n\n## Way of Working\n\nOLD_WAY_TEXT\n";
const PROJECT_MD_LIVE = "# Project-Level Rules\n\n## Mandated\n\n## Forbidden\n";
const VALID_DISCOVERED_RULES =
  "# Discovered Rules\n\n## Mandated\n\nALWAYS run tests\n\n## Forbidden\n\nNEVER skip CI\n";

interface Fixture {
  proj: string;
  teamMd: string;
  projectMd: string;
  teamPractices: string;
  discoveredRules: string;
}

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

function makeFixture(): Fixture {
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
  writeFileSync(teamPractices, "# Team Practices Draft\n", "utf-8");
  writeFileSync(discovered, VALID_DISCOVERED_RULES, "utf-8");
  writeFileSync(
    seededStateFile(proj),
    "# AI-DLC State Tracking\n## Current Status\n- **Scope**: feature\n",
    "utf-8",
  );

  return { proj, teamMd, projectMd, teamPractices, discoveredRules: discovered };
}

// error()/fail() ends the CLI via process.exit; convert that into a throwable
// so the refusal branch is observable in-process (same pattern as the sibling
// contract suite).
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

function runHandlerInProcess(
  handler: (args: string[]) => void,
  fx: Fixture,
): { threw: boolean; stderr: string } {
  process.env.CLAUDE_PROJECT_DIR = fx.proj;
  return captureExit(() =>
    handler([
      "--project-dir",
      fx.proj,
      "--team-practices",
      fx.teamPractices,
      "--discovered-rules",
      fx.discoveredRules,
      "--affirming-user",
      "latch-user",
    ]),
  );
}

let prevPd: string | undefined;
beforeEach(() => {
  prevPd = process.env.CLAUDE_PROJECT_DIR;
  resetOtelPerProject();
});
afterEach(() => {
  if (prevPd === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = prevPd;
  resetOtelPerProject();
});

for (const { name, handler, latch } of SURFACES) {
  describe(`t408 [${name}]: practices-promote refuses BEFORE file writes under a set fatal latch (#1961)`, () => {
  test("latched process: loud fail, NEITHER target mutated, no PRACTICES_AFFIRMED row", () => {
    const fx = makeFixture();
    const teamBefore = readFileSync(fx.teamMd, "utf-8");
    const projectBefore = readFileSync(fx.projectMd, "utf-8");

    latch("journal health probe failed: unparseable journal line");

    const r = runHandlerInProcess(handler, fx);

    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("fatal health latch");
    // The refusal happens BEFORE Step 4/5: the post-write framing must not appear.
    expect(r.stderr).not.toContain("AFTER both files were written");

    // Core contract: both targets byte-identical to their pre-run contents.
    expect(readFileSync(fx.teamMd, "utf-8")).toBe(teamBefore);
    expect(readFileSync(fx.projectMd, "utf-8")).toBe(projectBefore);

    // And no canonical row landed (the latch refuses the emit path too).
    const shard = seededAuditShard(fx.proj);
    const shardBody = ((): string => {
      try {
        return readFileSync(shard, "utf-8");
      } catch {
        return "";
      }
    })();
    expect(shardBody).not.toContain("PRACTICES_AFFIRMED");
  });

  test("unlatched process: happy path unchanged — rules appended, no throw", () => {
    const today = new Date().toISOString().slice(0, 10);
    const fx = makeFixture();
    const teamBefore = readFileSync(fx.teamMd, "utf-8");

    const r = runHandlerInProcess(handler, fx);

    expect(r.threw).toBe(false);
    expect(readFileSync(fx.teamMd, "utf-8")).toBe(teamBefore);
    const project = readFileSync(fx.projectMd, "utf-8");
    expect(project).toContain(`ALWAYS run tests (affirmed ${today})`);
    expect(project).toContain(`NEVER skip CI (affirmed ${today})`);
  });
});
}
