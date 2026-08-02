// covers: function:computeBoltDagOutcome, function:readBoltDagAbsence, subcommand:amadeus-runtime:compile
//
// t399 — the Bolt-DAG outcome resolver and its compile projection.
//
// computeBoltDag used to collapse every failure into `undefined`: an absent
// artefact returned silently (no stderr at all) and a malformed edge block wrote
// an advisory that the PostToolUse hook swallowed, because recordHookDrop only
// fires on a non-zero exit. Both paths therefore dropped the plan's machine
// projection without anyone noticing (#1892 / #1893).
//
// The resolver replaces that with a three-armed discriminated union:
//   dag     -> graph.bolt_dag (byte-identical to the previous envelope)
//   absent  -> graph.bolt_dag_absence, exit 0 (legitimate: the scope skipped
//              units-generation, or it has not run yet)
//   invalid -> throw, non-zero exit, no graph written (units-generation is
//              completed but the artefact is missing, or the file exists and
//              does not parse)
//
// The resolver reads the units-generation checkbox out of the state content the
// caller already holds, so it adds no I/O (NFR-3). It touches the real filesystem
// through existsSync/readFileSync, so this lives in the integration suite
// (cid:code-generation:fs-tests-integration-first) while still being driven
// in-process so bun coverage sees it (cid:code-generation:bun-coverage-spawn-blindspot).

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { AMADEUS_SRC, FIXTURE_CLONE_ID, toPortablePath } from "../harness/fixtures.ts";
import { auditFilePath } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { compile, computeBoltDagOutcome } from "../../dist/claude/.claude/tools/amadeus-runtime.ts";
import { readBoltDagAbsence } from "../../dist/claude/.claude/tools/amadeus-orchestrate.ts";

const BUN = process.execPath;
const RUNTIME = join(AMADEUS_SRC, "tools", "amadeus-runtime.ts");
const RECORD_REL = join("amadeus", "spaces", "default", "intents", "t399-fixture-deadbeef");

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) rmSync(d, { recursive: true, force: true });
});

const AUDIT_JSONL = `${[
  {
    seq: 1,
    timestamp: "2026-08-01T08:00:00Z",
    heading: "Workflow Started",
    event: "WORKFLOW_STARTED",
    fields: { "Workflow ID": "t399-fixture", Scope: "feature" },
  },
]
  .map((r) =>
    JSON.stringify({
      schemaVersion: 1,
      cloneId: FIXTURE_CLONE_ID,
      intentId: "t399-fixture-deadbeef",
      ...r,
    }),
  )
  .join("\n")}\n`;

function recordRoot(proj: string): string {
  return join(proj, RECORD_REL);
}

// A minimal amadeus-state.md whose units-generation checkbox carries the given
// marker. The resolver only reads that one row (parseCheckboxes), so the rest of
// the file is the smallest shape the parser accepts.
function stateWith(marker: string, suffix = "EXECUTE"): string {
  return [
    "# Workflow State",
    "",
    "**Scope**: feature",
    "",
    "## Stages",
    "",
    "- [x] intent-capture — EXECUTE",
    `- [${marker}] units-generation — ${suffix}`,
    "- [ ] code-generation — EXECUTE",
    "",
  ].join("\n");
}

function makeProject(marker: string | null): string {
  const proj = toPortablePath(mkdtempSync(join(tmpdir(), "amadeus-t399-")));
  tempDirs.push(proj);
  mkdirSync(join(recordRoot(proj), "inception", "units-generation"), { recursive: true });
  mkdirSync(join(proj, "amadeus"), { recursive: true });
  writeFileSync(join(proj, "amadeus", ".amadeus-clone-id"), `${FIXTURE_CLONE_ID}\n`, "utf-8");
  // No state file means no resolvable intent, so no audit shard can be placed
  // either; that case only drives the resolver, which never reads the audit.
  if (marker === null) return proj;
  writeFileSync(join(recordRoot(proj), "amadeus-state.md"), stateWith(marker), "utf-8");
  const shard = auditFilePath(proj);
  mkdirSync(dirname(shard), { recursive: true });
  writeFileSync(shard, AUDIT_JSONL, "utf-8");
  return proj;
}

function uowdPath(proj: string): string {
  return join(recordRoot(proj), "inception", "units-generation", "unit-of-work-dependency.md");
}

function writeUowd(proj: string, block: string): void {
  writeFileSync(
    uowdPath(proj),
    ["# Unit Dependency DAG", "", "## Dependencies", block, "", "## Integration Points", "None.", ""].join("\n"),
    "utf-8",
  );
}

const VALID_BLOCK = [
  "```yaml",
  "units:",
  "  - name: U1",
  "    depends_on: []",
  "  - name: U2",
  "    depends_on: [U1]",
  "```",
].join("\n");

// The #1893 shape: `- id:` instead of `- name:`.
const MALFORMED_BLOCK = ["```yaml", "units:", "  - id: U1", "    depends_on: []", "```"].join("\n");

function stateContentOf(proj: string): string | null {
  const p = join(recordRoot(proj), "amadeus-state.md");
  return existsSync(p) ? readFileSync(p, "utf-8") : null;
}

function runCompile(proj: string): { status: number | null; stderr: string } {
  const res = spawnSync(BUN, [RUNTIME, "compile", "--project-dir", proj], { encoding: "utf-8" });
  return { status: res.status, stderr: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

// biome-ignore lint/suspicious/noExplicitAny: test reads arbitrary compiled-graph shape
function readGraph(proj: string): any {
  return JSON.parse(readFileSync(join(recordRoot(proj), "runtime-graph.json"), "utf-8"));
}

describe("t399 computeBoltDagOutcome — decision table", () => {
  test("completed x absent artefact -> invalid(absent)", () => {
    const proj = makeProject("x");
    const outcome = computeBoltDagOutcome(proj, stateContentOf(proj));
    expect(outcome.kind).toBe("invalid");
    if (outcome.kind !== "invalid") throw new Error("unreachable");
    expect(outcome.reason).toBe("absent");
    expect(outcome.detail).toContain("unit-of-work-dependency.md");
  });

  test("skipped x absent artefact -> absent(scope-skips-units)", () => {
    const proj = makeProject("S");
    const outcome = computeBoltDagOutcome(proj, stateContentOf(proj));
    expect(outcome.kind).toBe("absent");
    if (outcome.kind !== "absent") throw new Error("unreachable");
    expect(outcome.absence.reason).toBe("scope-skips-units");
  });

  test("pending x absent artefact -> absent(units-pending)", () => {
    const proj = makeProject(" ");
    const outcome = computeBoltDagOutcome(proj, stateContentOf(proj));
    expect(outcome.kind).toBe("absent");
    if (outcome.kind !== "absent") throw new Error("unreachable");
    expect(outcome.absence.reason).toBe("units-pending");
  });

  // Init writes the plan suffix ("SKIP") at birth but only flips the marker to
  // [S] when the engine passes over the stage — a pending checkbox whose plan
  // says SKIP is already a scope with no unit DAG to ship.
  test("pending marker x SKIP plan suffix -> absent(scope-skips-units)", () => {
    const proj = makeProject(" ");
    writeFileSync(join(recordRoot(proj), "amadeus-state.md"), stateWith(" ", "SKIP"), "utf-8");
    const outcome = computeBoltDagOutcome(proj, stateContentOf(proj));
    expect(outcome.kind).toBe("absent");
    if (outcome.kind !== "absent") throw new Error("unreachable");
    expect(outcome.absence.reason).toBe("scope-skips-units");
  });

  test("no state at all -> absent(units-pending), never invalid", () => {
    const proj = makeProject(null);
    const outcome = computeBoltDagOutcome(proj, stateContentOf(proj));
    expect(outcome.kind).toBe("absent");
    if (outcome.kind !== "absent") throw new Error("unreachable");
    expect(outcome.absence.reason).toBe("units-pending");
  });

  test("valid block parses to a dag whatever the checkbox says", () => {
    for (const marker of ["x", "S", " "]) {
      const proj = makeProject(marker);
      writeUowd(proj, VALID_BLOCK);
      const outcome = computeBoltDagOutcome(proj, stateContentOf(proj));
      expect(outcome.kind).toBe("dag");
      if (outcome.kind !== "dag") throw new Error("unreachable");
      expect(outcome.dag.batches).toEqual([["U1"], ["U2"]]);
    }
  });

  // BR-U1-2: having written the artefact, the author owes its machine-readable
  // form — a degrade scope does not license a malformed block.
  test("present-but-malformed is invalid even in a degrade scope", () => {
    for (const marker of ["x", "S", " "]) {
      const proj = makeProject(marker);
      writeUowd(proj, MALFORMED_BLOCK);
      const outcome = computeBoltDagOutcome(proj, stateContentOf(proj));
      expect(outcome.kind).toBe("invalid");
      if (outcome.kind !== "invalid") throw new Error("unreachable");
      expect(outcome.reason).toBe("malformed");
      expect(outcome.detail).toContain("- id: U1");
    }
  });
});

describe("t399 compile — exit-code contract", () => {
  // AC-3a. Before the fix this exited 0 with no diagnostic whatsoever.
  test("completed x absent artefact: non-zero exit, no graph written", () => {
    const proj = makeProject("x");
    const run = runCompile(proj);
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("absent");
    expect(existsSync(join(recordRoot(proj), "runtime-graph.json"))).toBe(false);
  });

  // AC-3a2. Before the fix this exited 0 and the hook swallowed the stderr.
  test("completed x malformed block: non-zero exit naming the offending line", () => {
    const proj = makeProject("x");
    writeUowd(proj, MALFORMED_BLOCK);
    const run = runCompile(proj);
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("malformed");
    expect(run.stderr).toContain("- id: U1");
    expect(existsSync(join(recordRoot(proj), "runtime-graph.json"))).toBe(false);
  });

  // AC-3b / AC-3c: a degrade scope stays silent-normal, and the graph now says
  // WHY there is no DAG instead of leaving the reader to guess.
  test("skipped x absent artefact: exit 0 and bolt_dag_absence on the graph", () => {
    const proj = makeProject("S");
    const run = runCompile(proj);
    expect(run.status).toBe(0);
    const g = readGraph(proj);
    expect(g.bolt_dag_absence.reason).toBe("scope-skips-units");
    expect("bolt_dag" in g).toBe(false);
    expect(readBoltDagAbsence(proj)).toEqual(g.bolt_dag_absence);
  });

  // The throw arm driven in-process, so the failure is attributable rather than
  // only observable as a spawned process's exit code. The project compiles
  // successfully FIRST so a graph with a bolt_dag exists on disk — the refusal
  // must remove that stale plan, not merely skip the write.
  test("compile() throws on the invalid arm and removes the stale graph", () => {
    const proj = makeProject("x");
    writeUowd(proj, VALID_BLOCK);
    compile({ projectDir: proj });
    expect(readGraph(proj).bolt_dag.batches).toEqual([["U1"], ["U2"]]);
    writeUowd(proj, MALFORMED_BLOCK);
    expect(() => compile({ projectDir: proj })).toThrow(/malformed/);
    expect(existsSync(join(recordRoot(proj), "runtime-graph.json"))).toBe(false);
  });

  test("readBoltDagAbsence returns null when there is no graph to read", () => {
    expect(readBoltDagAbsence(makeProject("S"))).toBeNull();
  });

  test("valid block: bolt_dag present and bolt_dag_absence never co-exists", () => {
    const proj = makeProject("x");
    writeUowd(proj, VALID_BLOCK);
    expect(runCompile(proj).status).toBe(0);
    const g = readGraph(proj);
    expect(g.bolt_dag.batches).toEqual([["U1"], ["U2"]]);
    expect("bolt_dag_absence" in g).toBe(false);
    expect(readBoltDagAbsence(proj)).toBeNull();
  });
});
