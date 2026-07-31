// covers: function:handlePersist, function:mintHumanPresence
// size: medium
//
// G1 (call-site migration) — the emitters that write from INSIDE a held audit
// lock.
//
// These are the delicate half of the migration. The legacy
// appendAuditEntryUnlocked assumed the caller already owned the lock and did
// no locking of its own; the canonical path reaches appendJournalRecordV2,
// which takes the lock through withAuditLock. That is safe only because the
// lock is reentrant PER IDENTITY: a nested acquire matches on
// (projectDir, intent, space). An emit issued from inside a section held for
// one identity but routed at another does NOT deadlock — it takes a second
// bucket and writes to a different shard, silently. So the assertions here are
// about WHERE the row lands as much as what it says.
//
// learnings/persist is the sharpest case: the RULE_LEARNED row and the method
// file it describes are written in ONE withAuditLock body (decide-inside-lock),
// so a migration that moved the emit out of that section — or into a different
// lock identity — would break the pair without failing loudly.

import { beforeEach, afterEach, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { memoryDirFor } from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import { _resetCloneIdForTests, docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { handlePersist } from "../../dist/claude/.claude/tools/amadeus-learnings.ts";
import { resetOtelBootstrapForTests } from "../../dist/claude/.claude/otel/bootstrap.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import {
  cleanupTestProject,
  createTestProject,
  seededAuditShard,
  seededStateFile,
} from "../harness/fixtures.ts";

let pd: string;

beforeEach(() => {
  _resetCloneIdForTests();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetOtelBootstrapForTests();
  ensureContextManager();
  pd = createTestProject();
  // The active-intent cursor only resolves when the record carries a state
  // file, or the emit lands on the bare space root (t99's mkproj).
  writeFileSync(
    seededStateFile(pd),
    "# AI-DLC State Tracking\n- **Current Stage**: user-stories\n- **Scope**: feature\n",
  );
});

afterEach(() => {
  cleanupTestProject(pd);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetOtelBootstrapForTests();
});

type ShardRecord = {
  schemaVersion?: number;
  eventName?: string;
  event?: string;
  attributes?: Record<string, unknown>;
};

// Every shard under the record, so a row that landed in the WRONG bucket is
// still visible to the assertions rather than silently absent.
function allRecords(): { shard: string; record: ShardRecord }[] {
  const dir = join(docsRoot(pd), "audit");
  if (!existsSync(dir)) return [];
  const out: { shard: string; record: ShardRecord }[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(dir, name), "utf-8").split("\n")) {
      if (!line.startsWith("{")) continue;
      out.push({ shard: name, record: JSON.parse(line) as ShardRecord });
    }
  }
  return out;
}

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

function callPersist(selPath: string): number {
  const origExit = process.exit.bind(process);
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
    process.exit = origExit;
  }
  return status;
}

function writeSelections(name: string, text: string): string {
  const p = join(pd, name);
  writeFileSync(
    p,
    JSON.stringify({
      stage_slug: "user-stories",
      selections: [
        {
          candidate_id: "c1",
          type: "learning",
          scope: "project",
          heading: "Corrections",
          text,
          source: "orchestrator",
        },
      ],
    }),
  );
  return p;
}

describe("learnings/persist emits RULE_LEARNED through the canonical path", () => {
  test("the row is a v2 record naming amadeus.rule.learned, with every field intact", () => {
    callPersist(writeSelections("sel.json", "a fresh learning body"));

    const rows = allRecords().map((r) => r.record);
    const learned = rows.filter((r) => r.schemaVersion === 2 && r.eventName === "amadeus.rule.learned");
    expect(learned.length).toBe(1);
    expect(learned[0]?.attributes?.Event).toBe("RULE_LEARNED");
    // RULE_LEARNED's five registry-required attributes all survive the write —
    // the canonical path validates them, so a missing one would have thrown.
    expect(learned[0]?.attributes?.Stage).toBe("user-stories");
    expect(learned[0]?.attributes?.["Candidate-ID"]).toBe("c1");
    expect(learned[0]?.attributes?.Heading).toBe("## Corrections");
    expect(learned[0]?.attributes?.Source).toBe("orchestrator");
    expect(String(learned[0]?.attributes?.Destination)).toContain("project.md");
    expect(rows.filter((r) => r.schemaVersion !== 2 && r.event === "RULE_LEARNED").length).toBe(0);
  });

  test("the row lands in THIS clone's shard — the nested lock kept one identity", () => {
    callPersist(writeSelections("sel.json", "a fresh learning body"));
    // A canonical emit routed at a different identity would take a second lock
    // bucket and open a second shard. One shard carrying the row is the proof
    // that the nested acquire re-entered the section persist already held.
    const landed = allRecords().filter((e) => e.record.eventName === "amadeus.rule.learned");
    expect(landed.length).toBe(1);
    expect(join(docsRoot(pd), "audit", landed[0]!.shard)).toBe(seededAuditShard(pd));
  });

  test("the audit row and the method file it describes are still written together", () => {
    // decide-inside-lock: one withAuditLock body owns both writes. Moving the
    // emit off that path would let one land without the other.
    callPersist(writeSelections("sel.json", "a fresh learning body"));
    const projectFile = readFileSync(join(memoryDirFor(pd), "project.md"), "utf-8");
    expect(projectFile).toContain("a fresh learning body");
    expect(projectFile).toContain("cid:user-stories:c1");
    expect(allRecords().filter((e) => e.record.eventName === "amadeus.rule.learned").length).toBe(1);
  });

  test("a re-run emits no second row — the in-lock suppression still reads its own write", () => {
    // The suppression re-reads the audit INSIDE the lock and skips a candidate
    // that already has a row. It reads through the mixed-schema accessor, so a
    // v2 row must be as visible to it as a v1 row was.
    const sel = writeSelections("sel.json", "a fresh learning body");
    callPersist(sel);
    callPersist(sel);
    expect(allRecords().filter((e) => e.record.eventName === "amadeus.rule.learned").length).toBe(1);
  });
});
