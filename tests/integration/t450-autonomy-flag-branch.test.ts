// size: medium
//
// t450 (integration) — the `--autonomy` branch inside handleNext (#2253).
//
// t450's unit half drives the judgment ladder over injected ports. This half
// drives the REAL wiring: handleNext's branch, the production ports, and
// readLaunchAutonomyContext reading an actual projection off a seeded
// workspace. Together they cover what the flag does end to end short of a
// verified human turn — which is exactly the point of the last case: without
// one, the delegated write path refuses, and the flag does not become its own
// provenance.
//
// handleNext runs in-process (not spawned) so the branch registers in coverage.

import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { handleNext, readLaunchAutonomyContext } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  removeWorkspaceRecord,
  resetAidlcEnv,
  seedStateFile,
} from "../harness/fixtures.ts";

const MID_IDEATION = join(FIXTURES_DIR, "state-mid-ideation.md");

interface NextResult {
  readonly directive: Record<string, unknown>;
  readonly stderr: string;
}

// Drive handleNext in-process with the shipped graph/scope data pinned, and
// capture both streams: the directive lands on stdout, the grant preview on
// stderr.
function runNextInProcess(proj: string, args: string[]): NextResult {
  const originalLog = console.log;
  const originalError = console.error;
  const originalGraph = process.env.AMADEUS_STAGE_GRAPH;
  const originalGrid = process.env.AMADEUS_SCOPE_GRID;
  const originalScopes = process.env.AMADEUS_SCOPES_DIR;
  let stdout = "";
  let stderr = "";
  process.env.AMADEUS_STAGE_GRAPH = join(AMADEUS_SRC, "tools", "data", "stage-graph.json");
  process.env.AMADEUS_SCOPE_GRID = join(AMADEUS_SRC, "tools", "data", "scope-grid.json");
  process.env.AMADEUS_SCOPES_DIR = join(AMADEUS_SRC, "scopes");
  console.log = (...values: unknown[]) => {
    stdout += `${values.map(String).join(" ")}\n`;
  };
  console.error = (...values: unknown[]) => {
    stderr += `${values.map(String).join(" ")}\n`;
  };
  try {
    handleNext(args, proj);
  } finally {
    console.log = originalLog;
    console.error = originalError;
    if (originalGraph === undefined) delete process.env.AMADEUS_STAGE_GRAPH;
    else process.env.AMADEUS_STAGE_GRAPH = originalGraph;
    if (originalGrid === undefined) delete process.env.AMADEUS_SCOPE_GRID;
    else process.env.AMADEUS_SCOPE_GRID = originalGrid;
    if (originalScopes === undefined) delete process.env.AMADEUS_SCOPES_DIR;
    else process.env.AMADEUS_SCOPES_DIR = originalScopes;
  }
  const line = stdout.split("\n").find((l) => l.trim().startsWith("{"));
  expect(line).toBeDefined();
  return { directive: JSON.parse(line as string) as Record<string, unknown>, stderr };
}

let proj = "";
beforeAll(() => {
  resetAidlcEnv();
});
afterEach(() => {
  resetAidlcEnv();
  cleanupTestProject(proj);
  proj = "";
});

describe("t450 --autonomy branch in handleNext", () => {
  // Revised for #2378 FR-1c. The original case asserted one answer for "no state
  // file"; birth-at-declaration splits it by where the SAME invocation lands.
  test("without a state file and with no birth ahead the flag is refused, not silently dropped", () => {
    proj = createTestProject();
    const { directive } = runNextInProcess(proj, ["--autonomy", "semi"]);
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("--autonomy");
  });

  // createTestProject seeds one registry row, which sends the birth branches to
  // the intent picker; these cases are about the birth itself, so they restore
  // the zero-intent baseline first (the same move t171's beforeEach makes).
  function freshWorkspace(): string {
    const p = createTestProject();
    removeWorkspaceRecord(p);
    return p;
  }

  test("a birth-bound invocation carries the mode onto the intent-birth command", () => {
    proj = freshWorkspace();
    const { directive } = runNextInProcess(proj, ["--autonomy", "semi", "--scope", "fix"]);
    expect(directive.kind).toBe("print");
    expect(String(directive.message)).toContain("intent-birth --scope fix");
    expect(String(directive.message)).toContain("--autonomy semi");
  });

  test("a bare known-scope positional carries it too", () => {
    proj = freshWorkspace();
    const { directive } = runNextInProcess(proj, ["--autonomy", "none", "fix"]);
    expect(directive.kind).toBe("print");
    expect(String(directive.message)).toContain("--autonomy none");
  });

  test("`full` is carried to birth, which owns the grant ceremony", () => {
    proj = freshWorkspace();
    const { directive, stderr } = runNextInProcess(proj, ["--autonomy", "full", "--scope", "fix"]);
    expect(directive.kind).toBe("print");
    expect(String(directive.message)).toContain("--autonomy full");
    // No preview here: judgment 7 belongs to an intent that already exists.
    expect(stderr).not.toContain("grant preview");
  });

  // A workspace with registry rows but no cursor takes the picker, which has no
  // command line to carry a declaration (BR-U2-1). Both birth branches can land
  // there, so both are pinned.
  test("a birth branch that diverts to the intent picker refuses instead of swallowing it", () => {
    proj = createTestProject();
    const { directive } = runNextInProcess(proj, ["--autonomy", "semi", "--scope", "fix"]);
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("--autonomy semi");
  });

  test("the bare known-scope positional diverts the same way", () => {
    proj = createTestProject();
    const { directive } = runNextInProcess(proj, ["--autonomy", "none", "fix"]);
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("--autonomy none");
  });

  test("without a declaration the picker's own answer goes out unchanged", () => {
    // The divert refusal must not displace whatever the picker would have said
    // on an ordinary run — it only speaks when a declaration would be lost.
    proj = createTestProject();
    const { directive } = runNextInProcess(proj, ["fix"]);
    expect(String(directive.message)).not.toContain("--autonomy");
  });

  test("an invocation that falls into the scope-confirm ask is refused, not turned into an ask", () => {
    // BR-U2-1: freeform prose with no scope lands on Branch 8's ask, which has
    // nowhere to carry a declaration. The declaration must not vanish behind it.
    proj = createTestProject();
    const { directive } = runNextInProcess(proj, ["--autonomy", "semi", "build", "a", "widget", "shop"]);
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("--scope");
  });

  test("an out-of-range value is refused before anything is applied", () => {
    proj = createTestProject();
    seedStateFile(proj, MID_IDEATION);
    const { directive } = runNextInProcess(proj, ["--autonomy", "bogus"]);
    expect(directive).toEqual({
      kind: "error",
      message: 'Invalid --autonomy "bogus". Valid values: none, semi, full.',
    });
  });

  test("a value-less flag is refused", () => {
    proj = createTestProject();
    seedStateFile(proj, MID_IDEATION);
    const { directive } = runNextInProcess(proj, ["--autonomy"]);
    expect(directive).toEqual({
      kind: "error",
      message: "--autonomy requires a value: none, semi, or full.",
    });
  });

  test("`full` without an issued grant fails closed and names how to issue one", () => {
    proj = createTestProject();
    seedStateFile(proj, MID_IDEATION);
    const { directive, stderr } = runNextInProcess(proj, ["--autonomy", "full"]);
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("requires an issued grant");
    expect(stderr).toContain("grant preview");
  });

  test("a declaration still needs a verified human turn — the flag is not its own provenance", () => {
    proj = createTestProject();
    seedStateFile(proj, MID_IDEATION);
    const { directive } = runNextInProcess(proj, ["--autonomy", "semi"]);
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).toContain("PROVENANCE_REQUIRED");
  });

  test("a workspace read that throws surfaces as unreadable, not as a default", () => {
    // A corrupt intents ledger behind an active cursor makes the projection
    // read THROW (SyntaxError from the ledger parse), driving the catch arm of
    // readLaunchAutonomyContext — distinct from the resolver's null returns.
    proj = createTestProject();
    seedStateFile(proj, MID_IDEATION);
    writeFileSync(join(proj, "amadeus", "spaces", "default", "intents", "intents.json"), "{not json");
    expect(readLaunchAutonomyContext(proj)).toEqual({ kind: "unreadable" });
  });

  test("the freeform intent text survives the flag", () => {
    proj = createTestProject();
    const { directive } = runNextInProcess(proj, ["--autonomy", "semi", "build", "the", "auth", "service"]);
    // Judgment 0 (no state) refuses, but the parse that got here consumed the
    // mode: nothing downstream ever sees "semi" as intent words.
    expect(directive.kind).toBe("error");
    expect(String(directive.message)).not.toContain("semi build");
  });
});
