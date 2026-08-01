// covers: subcommand:amadeus-sensor:fire, audit:SENSOR_FIRED, audit:SENSOR_PASSED
// size: medium
//
// G1 (call-site migration) — the sensor dispatcher's four audit emitters.
//
// The dispatcher is the highest-volume canonical emitter in the workspace
// (SENSOR_FIRED and SENSOR_PASSED alone are 59,025 of the corpus's 89,867
// rows), and it is the one call site the canonical path cannot simply be
// imported into: BR-5 requires `amadeus-sensor.ts` to START on a tool tree
// that ships no otel/ directory at all, so a top-level import of the emit path
// would break the CLI for exactly the partial installs that guard is about.
//
// The migration therefore resolves the emit path through the SAME async lazy
// import the trace context already uses (`loadContext`), and does it once per
// fire rather than per row. Both halves are pinned here:
//   - the rows land on the canonical path (schemaVersion 2), and
//   - the CLI still starts with otel/ absent.
//
// Spawn-based, like t92: the contract is the process boundary plus the audit
// rows the dispatcher writes.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BUN = process.execPath;
const DIST_TOOLS = join(import.meta.dir, "../../dist/claude/.claude/tools");
const DIST_ROOT = join(import.meta.dir, "../../dist/claude/.claude");
const SENSOR_TS = join(DIST_TOOLS, "amadeus-sensor.ts");

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) rmSync(d, { recursive: true, force: true });
});

function recordRoot(proj: string): string {
  return join(proj, "amadeus", "spaces", "default", "intents", "t382-sensor-0000abcd");
}

function makeProj(): string {
  const proj = mkdtempSync(join(tmpdir(), "amadeus-t382-proj-"));
  tempDirs.push(proj);
  mkdirSync(join(proj, "amadeus-docs"), { recursive: true });
  const rec = recordRoot(proj);
  mkdirSync(join(rec, "audit"), { recursive: true });
  writeFileSync(join(rec, "amadeus-state.md"), "# AI-DLC State Tracking\n", "utf-8");
  const intentsDir = join(proj, "amadeus", "spaces", "default", "intents");
  writeFileSync(
    join(intentsDir, "intents.json"),
    `${JSON.stringify(
      [{ uuid: "44444444-4444-4444-8444-444444444444", slug: "t382-sensor", dirName: "t382-sensor-0000abcd", status: "in-flight" }],
      null,
      2,
    )}\n`,
    "utf-8",
  );
  writeFileSync(join(intentsDir, "active-intent"), "t382-sensor-0000abcd\n", "utf-8");
  return proj;
}

// A fork sensor whose per-sensor script always reports a clean pass, so the
// fire reaches the SENSOR_PASSED terminal row without needing a real linter.
function makeSensors(): string {
  const dir = mkdtempSync(join(tmpdir(), "amadeus-t382-sensors-"));
  tempDirs.push(dir);
  // The dispatcher resolves `command`'s script against AMADEUS_SENSOR_SCRIPT_DIR
  // (defaulting to the tools dir), so the stub lives beside the manifest and the
  // fire points the override at it — the same seam t92 uses.
  const script = join(dir, "pass.ts");
  writeFileSync(script, `console.log(JSON.stringify({ status: "pass" }));\n`, "utf-8");
  writeFileSync(
    join(dir, "amadeus-t382pass.md"),
    [
      "---",
      "id: t382pass",
      "kind: deterministic",
      "command: bun pass.ts",
      "default_severity: advisory",
      "description: t382 canonical-emit fork manifest",
      "input_schema: {}",
      "output_schema: {}",
      "timeout_seconds: 5",
      "---",
      "# stub",
      "",
    ].join("\n"),
    "utf-8",
  );
  return dir;
}

function shardRows(proj: string): Record<string, unknown>[] {
  const dir = join(recordRoot(proj), "audit");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(".jsonl"))
    .flatMap((n) => readFileSync(join(dir, n), "utf-8").split("\n"))
    .filter((l) => l.startsWith("{"))
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

describe("the sensor dispatcher emits on the canonical Event path", () => {
  test("[migration-equivalence] SENSOR_FIRED and SENSOR_PASSED land as schemaVersion 2 with their fields intact", () => {
    const proj = makeProj();
    const sensors = makeSensors();
    const outputPath = join(recordRoot(proj), "ideation", "intent-capture", "intent-statement.md");
    mkdirSync(join(recordRoot(proj), "ideation", "intent-capture"), { recursive: true });
    writeFileSync(outputPath, "# Intent Statement\n", "utf-8");

    const res = spawnSync(
      BUN,
      [SENSOR_TS, "fire", "t382pass", "--stage", "intent-capture", "--output-path", outputPath],
      { encoding: "utf-8", env: { ...process.env, CLAUDE_PROJECT_DIR: proj, AMADEUS_SENSORS_DIR: sensors, AMADEUS_SENSOR_SCRIPT_DIR: sensors } },
    );
    expect(res.status).toBe(0);

    const rows = shardRows(proj);
    const fired = rows.filter((r) => r.eventName === "amadeus.sensor.fired");
    const passed = rows.filter((r) => r.eventName === "amadeus.sensor.passed");
    expect(fired.length).toBe(1);
    expect(passed.length).toBe(1);
    // No row took the legacy writer: a v1 row carries a top-level `event`.
    expect(rows.filter((r) => typeof r.event === "string").length).toBe(0);

    // The field vocabulary survives the move (migration equivalence).
    const firedAttrs = fired[0]?.attributes as Record<string, unknown>;
    expect(firedAttrs["Sensor ID"]).toBe("t382pass");
    expect(firedAttrs["Stage slug"]).toBe("intent-capture");
    expect(typeof firedAttrs["Fire id"]).toBe("string");
    expect(typeof firedAttrs["Output path"]).toBe("string");
    const passedAttrs = passed[0]?.attributes as Record<string, unknown>;
    expect(typeof passedAttrs["Duration ms"]).toBe("string");
    // Both rows describe the SAME fire.
    expect(passedAttrs["Fire id"]).toBe(firedAttrs["Fire id"]);
  });

  test("BR-5 holds: the CLI still starts on a tool tree with no otel/", () => {
    // The reason the emit path is lazily imported rather than imported at the
    // top of the module. This is t-sensor-fire-seam's guard, re-asserted here
    // because the migration is what could break it.
    const partialRoot = mkdtempSync(join(tmpdir(), "amadeus-t382-partial-"));
    tempDirs.push(partialRoot);
    const toolsDir = join(partialRoot, "tools");
    cpSync(DIST_TOOLS, toolsDir, { recursive: true });
    cpSync(join(DIST_ROOT, "vendor"), join(partialRoot, "vendor"), { recursive: true });
    expect(existsSync(join(partialRoot, "otel"))).toBe(false);

    const res = spawnSync(BUN, [join(toolsDir, "amadeus-sensor.ts"), "--help"], { encoding: "utf-8" });
    expect(res.status).toBe(0);
  });
});
