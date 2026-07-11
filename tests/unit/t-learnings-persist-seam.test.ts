// In-process coverage seam for the #754/#745 persist preflights. t99 exercises
// the same contracts end-to-end by spawning the shipped dist CLI, which bun's
// coverage instrumentation cannot see (the spawn blindspot) — so this unit test
// imports handlePersist directly and drives the three new paths in-process:
// duplicate candidate_id rejection, divergent-body marker collision rejection,
// and the fresh two-destination success (emit-dedup bookkeeping included).
// Behavioural depth stays in t99; this file exists so the added lines register
// in lcov (local-lcov-pre-push norm).

import { beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { memoryDirFor } from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import { _resetCloneIdForTests, auditShardName } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { handlePersist } from "../../dist/claude/.claude/tools/amadeus-learnings.ts";
import { createTestProject, seededAuditShard, seededStateFile } from "../harness/fixtures.ts";

// The clone-id / audit-shard-name caches are process-global (amadeus-lib.ts
// _cloneId :1551 / _auditShardName :1893). An earlier in-process test that mints
// a random token from an unseeded fixture (t133's makeProject) leaves that token
// memoized, so persist's emit here lands on the wrong shard and ruleLearnedRows
// reads 0 from the deterministic seededAuditShard (#877). Reset the pair before
// each test so every case re-reads its own seeded .amadeus-clone-id.
beforeEach(() => {
  _resetCloneIdForTests();
});

// The active-intent cursor only resolves when the record carries a state file
// (activeIntent checks for amadeus-state.md), so seed a minimal one — same as
// t99's mkproj — or the emit lands on the bare space root.
function mkproj(): string {
  const pd = createTestProject();
  writeFileSync(
    seededStateFile(pd),
    "# AI-DLC State Tracking\n- **Current Stage**: user-stories\n- **Scope**: feature\n",
  );
  return pd;
}

// fail() ends the CLI via process.exit; in-process we convert that into a
// throwable so the test can assert the exit code and keep running. stderr is
// captured the same way (fail writes the message before exiting).
class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

function callPersist(pd: string, selPath: string): { status: number; stderr: string } {
  let stderr = "";
  const origWrite = process.stderr.write.bind(process.stderr);
  const origExit = process.exit.bind(process);
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8");
    return true;
  }) as typeof process.stderr.write;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  let status = 0;
  try {
    handlePersist(["--slug", "user-stories", "--selections-json", selPath], pd);
  } catch (e) {
    if (e instanceof ExitSignal) status = e.code;
    else throw e;
  } finally {
    process.stderr.write = origWrite;
    process.exit = origExit;
  }
  return { status, stderr };
}

interface Selection {
  candidate_id: string;
  scope: "project" | "team";
  text: string;
}

function writeSelections(pd: string, name: string, selections: Selection[]): string {
  const p = join(pd, name);
  writeFileSync(
    p,
    JSON.stringify({
      stage_slug: "user-stories",
      selections: selections.map((s) => ({
        candidate_id: s.candidate_id,
        type: "learning",
        scope: s.scope,
        heading: "Corrections",
        text: s.text,
        source: "orchestrator",
      })),
    }),
  );
  return p;
}

const readIf = (p: string): string | null => (existsSync(p) ? readFileSync(p, "utf-8") : null);

const ruleLearnedRows = (pd: string): number =>
  (readIf(seededAuditShard(pd)) ?? "").split("\n").filter((l) => /Event.*: RULE_LEARNED/.test(l))
    .length;

describe("t-learnings-persist-seam (#754/#745 in-process)", () => {
  test("duplicate candidate_id across destinations rejects before any side effect", () => {
    const pd = mkproj();
    const sel = writeSelections(pd, "sel-dup.json", [
      { candidate_id: "c1", scope: "project", text: "project body" },
      { candidate_id: "c1", scope: "team", text: "team body" },
    ]);
    const projFile = join(memoryDirFor(pd), "project.md");
    const teamFile = join(memoryDirFor(pd), "team.md");
    const before = [readIf(projFile), readIf(teamFile), readIf(seededAuditShard(pd))];

    const r = callPersist(pd, sel);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("c1-project");
    expect(r.stderr).toContain("c1-team");
    expect([readIf(projFile), readIf(teamFile), readIf(seededAuditShard(pd))]).toEqual(before);
    expect(ruleLearnedRows(pd)).toBe(0);
  });

  test("marker collision with divergent body rejects the whole call", () => {
    const pd = mkproj();
    const projFile = join(memoryDirFor(pd), "project.md");
    const seeded =
      "# Project-Level Rules\n\n## Corrections\n\n- an older learning body that already owns this cid (learned 2026-07-01) <!-- cid:user-stories:c1 -->\n";
    writeFileSync(projFile, seeded);
    const sel = writeSelections(pd, "sel-collide.json", [
      { candidate_id: "c1", scope: "project", text: "a different new body" },
    ]);

    const r = callPersist(pd, sel);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("marker collision");
    expect(r.stderr).toContain("c1");
    expect(readFileSync(projFile, "utf-8")).toBe(seeded);
    expect(ruleLearnedRows(pd)).toBe(0);
  });

  test("fresh project+team selections persist one line and one emit each", () => {
    const pd = mkproj();
    const sel = writeSelections(pd, "sel-fresh.json", [
      { candidate_id: "c1", scope: "project", text: "project practice body" },
      { candidate_id: "c2", scope: "team", text: "team practice body" },
    ]);

    const r = callPersist(pd, sel);
    expect(r.status).toBe(0);
    expect(readIf(join(memoryDirFor(pd), "project.md"))).toContain("cid:user-stories:c1");
    expect(readIf(join(memoryDirFor(pd), "team.md"))).toContain("cid:user-stories:c2");
    expect(ruleLearnedRows(pd)).toBe(2);
  });

  // Two candidate_ids that share a prefix persist and emit as independent keys.
  // The in-memory emit-dedup Set is keyed by (stage, candidate_id); this pins
  // that the visible emit-key separator (#786) still yields one line and one
  // RULE_LEARNED row per distinct candidate_id — dedup does not merge "c1" and
  // "c1x" into a single key.
  test("prefix-sharing candidate_ids stay distinct under the visible emit-key separator", () => {
    const pd = mkproj();
    const sel = writeSelections(pd, "sel-prefix.json", [
      { candidate_id: "c1", scope: "project", text: "first practice body" },
      { candidate_id: "c1x", scope: "project", text: "second practice body" },
    ]);

    const r = callPersist(pd, sel);
    expect(r.status).toBe(0);
    const proj = readIf(join(memoryDirFor(pd), "project.md")) ?? "";
    expect(proj).toContain("cid:user-stories:c1 ");
    expect(proj).toContain("cid:user-stories:c1x ");
    expect(ruleLearnedRows(pd)).toBe(2);
  });
});

// #877 direct-call coverage for the reset seam itself: after auditShardName()
// memoizes one project's token, a second project with a different seeded
// clone-id keeps resolving the STALE cached token until _resetCloneIdForTests()
// clears the pair — then it re-reads the new token. Drives both reset-body
// assignments (_cloneId / _auditShardName) in-process so they register in lcov.
describe("t-learnings-persist-seam — _resetCloneIdForTests clears the clone-id/shard cache (#877)", () => {
  test("stale cached shard token survives until reset, then re-reads the new project", () => {
    _resetCloneIdForTests();
    const a = createTestProject();
    writeFileSync(join(a, "amadeus", ".amadeus-clone-id"), "aaaaaaaaaaaa\n", "utf-8");
    const shardA = auditShardName(a);
    expect(shardA).toContain("aaaaaaaaaaaa");

    const b = createTestProject();
    writeFileSync(join(b, "amadeus", ".amadeus-clone-id"), "bbbbbbbbbbbb\n", "utf-8");
    // No reset yet: the memoized token from A wins even though B seeds its own.
    expect(auditShardName(b)).toBe(shardA);

    _resetCloneIdForTests();
    expect(auditShardName(b)).toContain("bbbbbbbbbbbb");
  });
});

// #786 regression guard: the emit-key separator must be a VISIBLE delimiter,
// never a raw NUL. A NUL byte makes grep classify amadeus-learnings.ts as a
// binary file, silently dropping it from text tooling. This scans the source of
// truth (dist copies are byte-identical to core via dist:check).
describe("t-learnings-persist-seam — emit-key separator is text-safe (#786)", () => {
  const coreLearnings = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "packages",
    "framework",
    "core",
    "tools",
    "amadeus-learnings.ts",
  );

  test("core amadeus-learnings.ts contains no NUL byte", () => {
    const bytes = readFileSync(coreLearnings);
    expect(bytes.includes(0)).toBe(false);
  });
});
