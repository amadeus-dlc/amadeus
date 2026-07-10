// In-process coverage seam for the #754/#745 persist preflights. t99 exercises
// the same contracts end-to-end by spawning the shipped dist CLI, which bun's
// coverage instrumentation cannot see (the spawn blindspot) — so this unit test
// imports handlePersist directly and drives the three new paths in-process:
// duplicate candidate_id rejection, divergent-body marker collision rejection,
// and the fresh two-destination success (emit-dedup bookkeeping included).
// Behavioural depth stays in t99; this file exists so the added lines register
// in lcov (local-lcov-pre-push norm).

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { memoryDirFor } from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import { handlePersist } from "../../dist/claude/.claude/tools/amadeus-learnings.ts";
import { createTestProject, seededAuditShard, seededStateFile } from "../harness/fixtures.ts";

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
});
