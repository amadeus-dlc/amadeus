// covers: subcommand:amadeus-runtime:compile
//
// t201 — regression guard for issue #603: the runtime-graph compile must record
// each stage row's `memory_path` UNDER the active intent's record dir
// (`<slug>-<id8>/`), not the bare space prefix.
//
// THE BUG (#603): compile() built each row's memory_path via
//   relativeMemoryPath(phase, slug)          // recordPrefix omitted
// which falls back to relativeSpaceRecordPrefix() (amadeus/spaces/<space>/intents)
// and drops the intent record-dir segment. Every row then pointed at a
// non-existent `.../intents/<phase>/<stage>/memory.md`, so amadeus-learnings.ts
// `surface` (§13 learnings) read nothing and silently returned zero candidates —
// even though readMemory() at compile time DID resolve the real diary (via
// docsRoot -> the active intent) and recorded a non-zero `memory_entries`. So a
// single row carried a correct count next to a broken path. THE FIX threads
// relativeRecordDir(projectDir) into relativeMemoryPath so the recorded path
// matches where the diary actually lives.
//
// Mechanism: cli. The compiled memory_path is only observable as on-disk bytes
// in runtime-graph.json, so this SPAWNS the real dist tool via the bun runtime
// against a fixture project that has an ACTIVE INTENT seeded (createTestProject),
// the same process-boundary seam t133 drives. A fixture WITHOUT an intent cursor
// (t133) legitimately resolves the bare space prefix; the record-dir segment only
// appears when an intent is active, which is exactly the path that regressed.
//
// SOURCE UNDER TEST (dist/claude/.claude/tools/amadeus-runtime.ts):
//   compile() — resolves `const recordPrefix = relativeRecordDir(projectDir)` and
//   passes it to relativeMemoryPath(phase, slug, recordPrefix) when building each
//   RuntimeStage row.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  AMADEUS_SRC,
  createTestProject,
  DEFAULT_RECORD_DIR,
  FIXTURES_DIR,
  seededAuditShard,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const RUNTIME = join(AMADEUS_SRC, "tools", "amadeus-runtime.ts");
const STATE_FIXTURE = join(FIXTURES_DIR, "state-construction.md");

// A minimal audit shard: WORKFLOW_STARTED gives compile a real header (not the
// empty-graph short-circuit); STAGE_STARTED/COMPLETED for units-generation makes
// the compile emit one row we can assert on. Mirrors t133's AUDIT_MD.
const AUDIT_MD = `# AI-DLC Audit Log

## Workflow Started
**Timestamp**: 2026-07-07T08:00:00Z
**Event**: WORKFLOW_STARTED
**Workflow ID**: t201-fixture
**Scope**: feature

---

## Stage Started
**Timestamp**: 2026-07-07T08:01:00Z
**Event**: STAGE_STARTED
**Stage**: units-generation
**Agent**: amadeus-architect-agent

---

## Stage Completed
**Timestamp**: 2026-07-07T08:02:00Z
**Event**: STAGE_COMPLETED
**Stage**: units-generation

---
`;

// One real §13 diary entry so readMemory() counts >0 — this proves the recorded
// path and the read path resolve to the SAME file after the fix.
const MEMORY_MD = `## Interpretations

- 2026-07-07T08:01:30Z — seeded diary entry; used by t201 to prove the compiled memory_path resolves to a real file

## Deviations

## Tradeoffs

## Open questions
`;

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) rmSync(d, { recursive: true, force: true });
});

// biome-ignore lint/suspicious/noExplicitAny: test reads arbitrary compiled-graph shape
function readGraph(proj: string): any {
  return JSON.parse(readFileSync(join(seededRecordDir(proj), "runtime-graph.json"), "utf-8"));
}

describe("t201 runtime-graph memory_path carries the intent record dir (#603)", () => {
  test("compiled memory_path is under the active intent's record dir, not the bare space prefix", () => {
    const proj = createTestProject();
    tempDirs.push(proj);

    cpSync(STATE_FIXTURE, seededStateFile(proj));
    const shard = seededAuditShard(proj);
    mkdirSync(dirname(shard), { recursive: true });
    writeFileSync(shard, AUDIT_MD, "utf-8");
    const memPath = join(seededRecordDir(proj), "inception", "units-generation", "memory.md");
    mkdirSync(dirname(memPath), { recursive: true });
    writeFileSync(memPath, MEMORY_MD, "utf-8");

    const res = spawnSync(BUN, [RUNTIME, "compile", "--project-dir", proj], { encoding: "utf-8" });
    expect(res.status).toBe(0);

    const graph = readGraph(proj);
    const row = (graph.stages as Array<{ stage_slug: string; memory_path: string; memory_entries: number }>).find(
      (s) => s.stage_slug === "units-generation",
    );
    expect(row).toBeDefined();

    const expected = `amadeus/spaces/default/intents/${DEFAULT_RECORD_DIR}/inception/units-generation/memory.md`;
    const malformed = "amadeus/spaces/default/intents/inception/units-generation/memory.md";

    // The recorded path includes the <slug>-<id8> record-dir segment ...
    expect(row?.memory_path).toBe(expected);
    // ... and is NOT the pre-fix bare-space-prefix shape.
    expect(row?.memory_path).not.toBe(malformed);
    // The count read from the same diary is non-zero, proving record + read agree.
    expect(row?.memory_entries).toBeGreaterThan(0);
  });
});
