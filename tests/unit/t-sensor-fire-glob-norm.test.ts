// covers: hook:amadeus-sensor-fire
//
// In-process regression tests for #757: the sensor-fire hook's per-entry glob
// match (hook step 11) must run against the NORMALIZED path (`filePathNorm`,
// computed at step 5 for the recursion guard), not the raw `tool_input.file_path`.
// On Windows (native PowerShell — a supported platform) file_path arrives
// backslash-separated, and Bun.Glob path-segment patterns like
// `**/{amadeus-docs,intents}/**` never match a backslash-separated path:
//
//   Bun.Glob("**/{amadeus-docs,intents}/**").match("/a/amadeus-docs/x.md")     -> true
//   Bun.Glob("**/{amadeus-docs,intents}/**").match("C:\\a\\amadeus-docs\\x.md") -> false
//
// so the two shipped content sensors (required-sections, upstream-coverage)
// silently never fire on Windows.
//
// Mechanism: in-process module drive. Unlike t94 (which spawns the hook as a
// subprocess and therefore leaves the hook body off the lcov map — the
// bun-coverage-spawn-blindspot), these cases import the SHIPPED hook module
// (dist/claude/.claude/hooks/amadeus-sensor-fire.ts, the same dist seam
// t-sensor-fire-seam uses) inside the test process:
//   - `Bun.stdin` is writable (verified: writable: true, configurable: false),
//     so a stub `{ text: async () => json }` feeds the PostToolUse payload;
//   - `process.stdin.isTTY` is forced to false past the TTY guard;
//   - `process.exit` is patched to throw, converting the hook's terminal
//     exits into an observable exit code;
//   - a query-string suffix (`?case=N`) busts the module cache so each case
//     re-executes the top-level hook script against its own env.
// The hook's only spawn target is <proj>/.claude/tools/amadeus-sensor.ts; a
// stub there records argv to <proj>/.spawn.log (t94's absence-proof pattern),
// so the log's existence IS the glob-match verdict. The stub derives the log
// path from its OWN location (import.meta.dir/../../.spawn.log) rather than
// an env var: Bun's node:child_process spawnSync passes the process's STARTUP
// environ to the child when `env` is omitted, so env mutations made at test
// runtime never reach the spawned stub (measured on bun 1.3.13).
//
// SOURCE UNDER TEST (dist/claude/.claude/hooks/amadeus-sensor-fire.ts):
//   :88   const filePathNorm = filePath.replace(/\\/g, "/");
//   :193  const glob = new Bun.Glob(entry.matches);
//   :194  glob.match(filePathNorm) — the #757 fix (was: glob.match(filePath)).

import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  seededAuditDir,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";
import { seedSensorInvocation } from "../helpers/sensor-invocation-fixture.ts";

const HOOK = join(AMADEUS_SRC, "hooks", "amadeus-sensor-fire.ts");
const FRAMEWORK_GRAPH = join(AMADEUS_SRC, "tools", "data", "stage-graph.json");

/** How many of requirements-analysis's sensors the hook should fire for a given
 *  write, computed the way the hook itself decides: match each sensor's
 *  `matches` glob against the NORMALIZED path (the very normalization #757
 *  added). Derived from the shipped graph rather than pinned, so adding a sensor
 *  to the stage does not turn this glob-normalization test red for an unrelated
 *  reason. The floor keeps the derivation from vacuously passing at zero. */
function sensorsFiringFor(filePath: string): string[] {
  const graph = JSON.parse(readFileSync(FRAMEWORK_GRAPH, "utf-8")) as {
    slug: string;
    sensors_applicable?: { id: string; matches?: string }[];
  }[];
  const stage = graph.find((s) => s.slug === "requirements-analysis");
  if (stage === undefined) throw new Error("requirements-analysis missing from the shipped graph");
  const norm = filePath.replace(/\\/g, "/");
  return (stage.sensors_applicable ?? [])
    .filter((s) => s.matches !== undefined && s.matches !== "" && new Bun.Glob(s.matches).match(norm))
    .map((s) => s.id)
    .sort();
}

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

// Pinned clone-id so the seeded audit shard is exactly the one the hook's
// active-workflow gate resolves (mirrors t94).
const PINNED_CLONE_ID = "testcloneidglob";
function pinnedShardName(): string {
  const host =
    hostname()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "host";
  return `${host}-${PINNED_CLONE_ID}.jsonl`;
}

// Stub dispatcher: record argv to <proj>/.spawn.log and exit 0. Written to
// the exact path the hook joins for its spawn, so log absence proves "no
// fire". The log path is derived from the stub's own location (it lives at
// <proj>/.claude/tools/amadeus-sensor.ts) — see the env-snapshot note above.
const STUB_DISPATCHER = `// @ts-nocheck
import { writeFileSync, appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const out = join(import.meta.dir, "..", "..", ".spawn.log");
const line = JSON.stringify(process.argv) + "\\n";
if (existsSync(out)) appendFileSync(out, line);
else writeFileSync(out, line);
process.stdout.write('{"pass":true}\\n');
process.exit(0);
`;

/** Active-workflow fixture: stub dispatcher + pinned clone-id + state on a
 *  stage carrying the md-glob sensors in the framework graph + the
 *  resolved audit shard. Mirrors t94's makeProjectActive. */
function makeProjectActive(): string {
  const proj = createTestProject();
  tempDirs.push(proj);
  mkdirSync(join(proj, ".claude", "tools"), { recursive: true });
  writeFileSync(
    join(proj, ".claude", "tools", "amadeus-sensor.ts"),
    STUB_DISPATCHER,
    "utf-8",
  );
  writeFileSync(
    join(proj, "amadeus", ".amadeus-clone-id"),
    `${PINNED_CLONE_ID}\n`,
    "utf-8",
  );
  mkdirSync(seededRecordDir(proj), { recursive: true });
  writeFileSync(
    seededStateFile(proj),
    [
      "# AI-DLC State (glob-norm fixture)",
      "",
      "- **Workflow**: fix",
      "- **Scope**: fix",
      "- **Phase**: inception",
      "- **Current Stage**: requirements-analysis",
      "",
    ].join("\n"),
    "utf-8",
  );
  const auditDir = seededAuditDir(proj);
  mkdirSync(auditDir, { recursive: true });
  // The gate only needs the shard to EXIST; the JSONL ledger carries no header,
  // so one well-formed record is the minimal "active workflow" trail.
  writeFileSync(
    join(auditDir, pinnedShardName()),
    `${JSON.stringify({
      schemaVersion: 1,
      seq: 1,
      cloneId: PINNED_CLONE_ID,
      intentId: "glob-norm-fixture",
      timestamp: "2026-07-11T10:00:00Z",
      heading: "Workflow Start",
      event: "WORKFLOW_STARTED",
      fields: { Scope: "fix" },
    })}\n`,
    "utf-8",
  );
  return proj;
}

function spawnLogPath(proj: string): string {
  return join(proj, ".spawn.log");
}

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

let caseCounter = 0;

/**
 * Drive the shipped hook in-process: feed the PostToolUse JSON through a
 * Bun.stdin stub, force isTTY false, patch process.exit to throw, point the
 * env at the fixture, and import the hook with a cache-busting query so its
 * top-level script re-executes. Returns the exit code the hook terminated with.
 */
async function driveHook(
  proj: string,
  filePath: string,
  produces: string[] | null = [filePath],
): Promise<number> {
  if (produces !== null) {
    seedSensorInvocation(proj, "requirements-analysis", produces);
  }
  const json = JSON.stringify({
    tool_name: "Write",
    tool_input: { file_path: filePath },
  });
  const origStdin = Bun.stdin;
  const origExit = process.exit.bind(process);
  // Materialize process.stdin BEFORE swapping Bun.stdin: the lazy
  // process.stdin getter stops yielding an object once Bun.stdin is replaced.
  const procStdin = process.stdin;
  const isTTYDesc = Object.getOwnPropertyDescriptor(procStdin, "isTTY");
  const prevEnv: Record<string, string | undefined> = {
    CLAUDE_PROJECT_DIR: process.env.CLAUDE_PROJECT_DIR,
    AMADEUS_STAGE_GRAPH: process.env.AMADEUS_STAGE_GRAPH,
  };
  let exitCode = -1;
  try {
    // Bun.stdin is a writable own property of Bun (not configurable, but
    // writable) — a plain assignment swaps in the payload stub.
    (Bun as { stdin: unknown }).stdin = { text: async () => json };
    Object.defineProperty(procStdin, "isTTY", {
      configurable: true,
      value: false,
    });
    process.exit = ((code?: number) => {
      throw new ExitSignal(code ?? 0);
    }) as typeof process.exit;
    process.env.CLAUDE_PROJECT_DIR = proj;
    process.env.AMADEUS_STAGE_GRAPH = FRAMEWORK_GRAPH;
    caseCounter += 1;
    try {
      await import(`${HOOK}?glob-norm-case=${caseCounter}`);
    } catch (e) {
      if (e instanceof ExitSignal) exitCode = e.code;
      else throw e;
    }
  } finally {
    (Bun as { stdin: unknown }).stdin = origStdin;
    process.exit = origExit;
    if (isTTYDesc) Object.defineProperty(procStdin, "isTTY", isTTYDesc);
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
  return exitCode;
}

describe("sensor-fire glob normalization (#757) — in-process hook drive", () => {
  test("backslash-separated file_path fires the path-segment md sensors (Windows repro)", async () => {
    const proj = makeProjectActive();
    // The exact shape Claude Code passes on native Windows: a backslash-
    // separated absolute path whose segments include amadeus-docs/. The
    // framework glob `**/{amadeus-docs,intents}/**` must match it after
    // normalization (hook :88 filePathNorm).
    const winPath =
      "C:\\Users\\dev\\proj\\amadeus-docs\\inception\\requirements-analysis\\requirements.md";
    const status = await driveHook(proj, winPath);
    expect(status).toBe(0);
    // RED before the #757 fix: the hook matched the RAW path, Bun.Glob
    // rejects backslash separators, no sensor fired, no spawn log.
    expect(existsSync(spawnLogPath(proj))).toBe(true);
    const lines = readFileSync(spawnLogPath(proj), "utf-8")
      .split("\n")
      .filter(Boolean);
    // Every sensor whose glob matches the NORMALIZED path fires. Compared as an
    // ID SET (from the shipped graph) so a new sensor does not fail this test,
    // while a sensor silently dropping out is still visible.
    expect(lines.map((l) => (JSON.parse(l) as string[])[3]).sort()).toEqual(sensorsFiringFor(winPath));
    const firstArgv = JSON.parse(lines[0]) as string[];
    // The dispatcher still receives the RAW path (dispatcher normalizes
    // internally via normalizePathForComparison) — only the hook-side
    // match verdict uses the normalized form.
    expect(firstArgv.slice(2)).toEqual([
      "fire",
      "required-sections",
      "--stage",
      "requirements-analysis",
      "--output-path",
      winPath,
    ]);
  });

  test("forward-slash file_path still fires (fixture control, non-regression)", async () => {
    const proj = makeProjectActive();
    const filePath = join(
      proj,
      "amadeus-docs",
      "inception",
      "requirements-analysis",
      "requirements.md",
    );
    const status = await driveHook(proj, filePath);
    expect(status).toBe(0);
    expect(existsSync(spawnLogPath(proj))).toBe(true);
    const lines = readFileSync(spawnLogPath(proj), "utf-8")
      .split("\n")
      .filter(Boolean);
    expect(lines.map((l) => (JSON.parse(l) as string[])[3]).sort()).toEqual(sensorsFiringFor(filePath));
  });

  test("non-matching backslash path stays silent (normalization must not over-match)", async () => {
    const proj = makeProjectActive();
    const status = await driveHook(
      proj,
      join(tmpdir(), "scratch-glob-norm", "notes.txt").replace(/\//g, "\\"),
    );
    expect(status).toBe(0);
    expect(existsSync(spawnLogPath(proj))).toBe(false);
  });

  test("document sensors stay silent when no run-stage scope exists", async () => {
    const proj = makeProjectActive();
    const filePath = join(
      proj,
      "amadeus-docs",
      "inception",
      "requirements-analysis",
      "requirements.md",
    );

    expect(await driveHook(proj, filePath, null)).toBe(0);
    expect(existsSync(spawnLogPath(proj))).toBe(false);
  });

  test("document sensors reject a matching path outside the declared outputs", async () => {
    const proj = makeProjectActive();
    const filePath = join(
      proj,
      "amadeus-docs",
      "inception",
      "requirements-analysis",
      "memory.md",
    );
    const declared = join(
      proj,
      "amadeus-docs",
      "inception",
      "requirements-analysis",
      "requirements.md",
    );

    expect(await driveHook(proj, filePath, [declared])).toBe(0);
    expect(existsSync(spawnLogPath(proj))).toBe(false);
  });
});
