// covers: function:handleNext, function:handleReport, function:handleFailureRuling
// size: medium
//
// Issue #3004. The in-process entrances to the engine (handleNext /
// handleReport / handleFailureRuling) accept `projectDir: string | undefined`.
// #1389 fixed WHERE an error is recorded when the caller names a project, but
// left the undefined case intact: with no project named, every internal
// resolveProjectDir(undefined) falls through to the ambient ladder
// (CLAUDE_PROJECT_DIR, then the cwd workspace marker) and the handler operates
// on — and writes an ERROR_LOGGED row into — whatever real workspace happens to
// surround the process.
//
// The closure is fail-closed refusal: an in-process caller that names no
// project gets an error directive and NOTHING is resolved, read, or written.
// Each case below drives one entrance with `undefined` and asserts both halves:
// the refusal directive is what came out, and the ambient workspace's audit dir
// gained no shard.
//
// Both ambient rungs are covered: cases A-C point CLAUDE_PROJECT_DIR at a
// seeded fixture (the env rung), case D unsets it and chdirs into a
// marker-carrying fixture (the cwd workspace-marker rung t481 pins).
//
// In-process (integration layer, real FS) so the refusal lines register in
// lcov, mirroring the sibling t258 idiom.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { _resetCloneIdForTests } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  handleFailureRuling,
  handleNext,
  handleReport,
  runEngineMain,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  seededAuditDir,
  seedStateFile,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

// The core source ships no co-located compiled graph — point the engine at the
// packaged dist copy, the same seam t211 uses to drive handleNext in-process.
process.env.AMADEUS_STAGE_GRAPH ??= join(AMADEUS_SRC, "tools", "data", "stage-graph.json");

// The refusal's load-bearing phrase. Held as a literal here (not imported) so
// the test pins the contract the caller sees rather than echoing the source.
const REFUSAL_MARKER = "must not rely on ambient workspace resolution";

const projects: string[] = [];

let savedProjectDir: string | undefined;
let savedArgv: string[];
let savedCwd: string;

beforeEach(() => {
  resetOtelPerProject();
  savedProjectDir = process.env.CLAUDE_PROJECT_DIR;
  savedArgv = process.argv;
  savedCwd = process.cwd();
  // Neutralise argv: an in-process driver carries no `--project-dir`, which is
  // the whole premise of the bug. A stray flag from the runner would otherwise
  // give recordEngineError's argv fallback a project to record against.
  process.argv = ["bun", "amadeus-orchestrate.ts", "report"];
  _resetCloneIdForTests();
});

afterEach(() => {
  resetOtelPerProject();
  process.chdir(savedCwd);
  if (savedProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = savedProjectDir;
  process.argv = savedArgv;
  _resetCloneIdForTests();
  while (projects.length > 0) cleanupTestProject(projects.pop());
});

/** A fixture workspace with a live state file — the shape whose audit dir an
 *  ambient-resolving handler would write into. */
function newSeededProject(): string {
  const proj = createTestProject();
  projects.push(proj);
  seedStateFile(proj, "state-init-active.md");
  return proj;
}

/** Names of the audit shards physically present in a project's record. */
function auditShardsOf(proj: string): string[] {
  const dir = seededAuditDir(proj);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => name.endsWith(".jsonl"));
}

/** Run `drive`, returning every directive it printed. console.log is captured
 *  rather than silenced so the refusal itself can be asserted. */
function capture(drive: () => void): Array<{ kind?: string; message?: string }> {
  const originalLog = console.log;
  const originalError = console.error;
  const lines: string[] = [];
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };
  console.error = () => {};
  try {
    drive();
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
  return lines.flatMap((line) => {
    try {
      return [JSON.parse(line) as { kind?: string; message?: string }];
    } catch {
      return [];
    }
  });
}

function expectRefusal(directives: Array<{ kind?: string; message?: string }>): void {
  expect(directives).toHaveLength(1);
  expect(directives[0]?.kind).toBe("error");
  expect(directives[0]?.message ?? "").toContain(REFUSAL_MARKER);
}

describe("t544 in-process entrances refuse an unnamed project (#3004, env rung)", () => {
  test("handleReport(undefined) refuses without touching the ambient record", () => {
    const ambient = newSeededProject();
    process.env.CLAUDE_PROJECT_DIR = ambient;

    // Pre-fix: resolves to `ambient`, rejects the verdict, and records
    // ERROR_LOGGED there — one shard.
    const directives = capture(() =>
      handleReport(["--result", "__not_a_verdict__"], undefined)
    );

    // Pollution first: this is the defect itself, so the pre-fix red names it.
    expect(auditShardsOf(ambient)).toEqual([]);
    expectRefusal(directives);
  });

  test("handleNext(undefined) refuses without touching the ambient record", () => {
    const ambient = newSeededProject();
    process.env.CLAUDE_PROJECT_DIR = ambient;

    const directives = capture(() =>
      handleNext(["--scope", "zzznotascope"], undefined)
    );

    // Pollution first: this is the defect itself, so the pre-fix red names it.
    expect(auditShardsOf(ambient)).toEqual([]);
    expectRefusal(directives);
  });

  test("handleFailureRuling(undefined) refuses without touching the ambient record", () => {
    const ambient = newSeededProject();
    process.env.CLAUDE_PROJECT_DIR = ambient;

    const directives = capture(() =>
      handleFailureRuling(["--user-input", "Retry"], undefined)
    );

    // Pollution first: this is the defect itself, so the pre-fix red names it.
    expect(auditShardsOf(ambient)).toEqual([]);
    expectRefusal(directives);
  });
});

describe("t544 the CLI names its project before dispatch (#3004, main() side)", () => {
  // The refusal is exclusive to in-process callers: main() resolves argv's
  // project dir before dispatch, so the same handlers keep serving the CLI.
  // Driven through runEngineMain (the t214 T5 idiom) so the dispatch lines
  // register in this process's lcov rather than a spawned child's.
  test("`report` dispatches with the argv project and keeps its typed error", () => {
    const proj = newSeededProject();
    process.argv = [
      "bun", "amadeus-orchestrate.ts",
      "report", "--project-dir", proj, "--result", "__not_a_verdict__",
    ];

    const directives = capture(() => runEngineMain());

    expect(directives).toHaveLength(1);
    expect(directives[0]?.kind).toBe("error");
    expect(directives[0]?.message ?? "").toContain('Unknown --result "__not_a_verdict__"');
    // The named project — not an ambient one — received the ERROR_LOGGED row.
    expect(auditShardsOf(proj)).toHaveLength(1);
  });

  test("`park` dispatches with the argv project and parks that workflow", () => {
    const proj = newSeededProject();
    process.argv = ["bun", "amadeus-orchestrate.ts", "park", "--project-dir", proj];

    const directives = capture(() => runEngineMain());

    expect(directives).toHaveLength(1);
    expect(directives[0]?.kind).toBe("parked");
  });
});

describe("t544 in-process entrances refuse an unnamed project (#3004, cwd-marker rung)", () => {
  test("handleReport(undefined) refuses from inside a marker-carrying workspace", () => {
    const ambient = newSeededProject();
    // The workspace marker t481 pins: an `amadeus/` dir (the fixture ships one)
    // AND a `<harness>/tools/` dir. With env unset, the cwd rung resolves here.
    mkdirSync(join(ambient, ".claude", "tools"), { recursive: true });
    delete process.env.CLAUDE_PROJECT_DIR;
    process.chdir(ambient);

    const directives = capture(() =>
      handleReport(["--result", "__not_a_verdict__"], undefined)
    );

    // Pollution first: this is the defect itself, so the pre-fix red names it.
    expect(auditShardsOf(ambient)).toEqual([]);
    expectRefusal(directives);
  });
});
