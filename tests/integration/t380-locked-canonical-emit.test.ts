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
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { memoryDirFor } from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import { _resetCloneIdForTests, auditFilePath, docsRoot } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { compile } from "../../dist/claude/.claude/tools/amadeus-runtime.ts";
import { handlePersist } from "../../dist/claude/.claude/tools/amadeus-learnings.ts";
import { mintHumanPresence } from "../../dist/claude/.claude/tools/amadeus-presence-reservation.ts";
import { resetOtelBootstrapForTests } from "../../dist/claude/.claude/otel/bootstrap.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import {
  cleanupTestProject,
  createTestProject,
  seededAuditShard,
  seededStateFile,
  toPortablePath,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

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

describe("the sensor half of persist emits through the same seam", () => {
  // SENSOR_PROPOSED rides the OTHER emit in persist's locked body, and its two
  // writes (the manifest and the stage frontmatter) are atomic with the row.
  test("a sensor selection emits amadeus.sensor.proposed with its seven attributes", () => {
    const sel = join(pd, "sel-sensor.json");
    writeFileSync(
      sel,
      JSON.stringify({
        stage_slug: "user-stories",
        selections: [
          {
            candidate_id: "s1",
            type: "sensor",
            origin_stage: "user-stories",
            manifest_fields: {
              id: "acceptance-format",
              kind: "deterministic",
              command: "bun .claude/tools/amadeus-sensor.ts fire acceptance-format",
              default_severity: "advisory",
              description: "Checks AC format",
              matches: "**/inception/user-stories/**",
              timeout_seconds: 30,
            },
            source: "orchestrator",
          },
        ],
      }),
    );
    callPersist(sel);

    const proposed = allRecords()
      .map((r) => r.record)
      .filter((r) => r.schemaVersion === 2 && r.eventName === "amadeus.sensor.proposed");
    expect(proposed.length).toBe(1);
    expect(proposed[0]?.attributes?.Event).toBe("SENSOR_PROPOSED");
    expect(proposed[0]?.attributes?.["Sensor ID"]).toBe("acceptance-format");
    expect(proposed[0]?.attributes?.["Candidate-ID"]).toBe("s1");
    expect(proposed[0]?.attributes?.Destinations).toBe(JSON.stringify(["user-stories"]));
  });
});

describe("the untargeted human turn travels the canonical path", () => {
  // mintHumanPresence's ordinary append — the one the human-presence gate reads
  // on every turn. The owner-targeted mint beside it stays on the legacy writer
  // (its Presence Reservation Id is not a required attribute, and the
  // default-deny redaction policy would drop the field the reservation reads
  // back to find its own row), so this is the half that moved.
  test("mintHumanPresence appends amadeus.human.turn", () => {
    mintHumanPresence({ projectDir: pd, capability: { kind: "unavailable", reason: "no trusted session identity in this test" } });
    const turns = allRecords()
      .map((r) => r.record)
      .filter((r) => r.schemaVersion === 2 && r.eventName === "amadeus.human.turn");
    expect(turns.length).toBe(1);
    expect(turns[0]?.attributes?.Event).toBe("HUMAN_TURN");
  });
});

describe("compile emits MEMORY_EMPTY through the canonical path", () => {
  // The MEMORY_EMPTY rows and the runtime-graph write share ONE locked section
  // (audit-first: rows, then artefact). The emit reaches appendJournalRecordV2,
  // which re-enters that same lock identity. Driven in-process because bun's
  // coverage does not instrument the spawned compile the CLI twins use.
  const REPO_ROOT = join(import.meta.dir, "..", "..");
  const RECORD_REL = join("amadeus", "spaces", "default", "intents", "memempty-fixture-deadbeef");

  function seedApprovedZeroEntryStage(): string {
    const proj = toPortablePath(mkdtempSync(join(tmpdir(), "amadeus-memempty-")));
    const record = join(proj, RECORD_REL);
    mkdirSync(record, { recursive: true });
    writeFileSync(
      join(record, "amadeus-state.md"),
      readFileSync(join(REPO_ROOT, "tests", "fixtures", "state-construction.md")),
    );
    const shard = auditFilePath(proj);
    mkdirSync(dirname(shard), { recursive: true });
    writeFileSync(
      shard,
      readFileSync(
        join(REPO_ROOT, "tests", "fixtures", "v05-mr12-learnings", "audit-instance-learnings-approved.jsonl"),
      ),
    );
    // A stage counts as zero-entry only when its memory.md EXISTS and holds no
    // entries — an absent file reads as "no memory to judge", not as empty.
    const stageMemory = join(record, "construction", "code-generation");
    mkdirSync(stageMemory, { recursive: true });
    writeFileSync(
      join(stageMemory, "memory.md"),
      readFileSync(join(REPO_ROOT, ".claude", "knowledge", "amadeus-shared", "memory-template.md")),
    );
    return proj;
  }

  function memoryEmptyRows(proj: string): ShardRecord[] {
    const dir = join(proj, RECORD_REL, "audit");
    return readdirSync(dir)
      .filter((n) => n.endsWith(".jsonl"))
      .flatMap((n) => readFileSync(join(dir, n), "utf-8").split("\n"))
      .filter((line) => line.startsWith("{"))
      .map((line) => JSON.parse(line) as ShardRecord)
      .filter((r) => r.schemaVersion === 2 && r.eventName === "amadeus.memory.empty");
  }

  test("an approved stage whose memory carries no entries emits amadeus.memory.empty", () => {
    resetOtelPerProject();
    const proj = seedApprovedZeroEntryStage();
    try {
      expect(compile({ projectDir: proj }).written).toBeDefined();
      const rows = memoryEmptyRows(proj);
      expect(rows.length).toBe(1);
      expect(rows[0]?.attributes?.Event).toBe("MEMORY_EMPTY");
      expect(rows[0]?.attributes?.Stage).toBe("code-generation");
      // The artefact from the same locked section landed too.
      expect(existsSync(join(proj, RECORD_REL, "runtime-graph.json"))).toBe(true);
    } finally {
      rmSync(proj, { recursive: true, force: true });
    }
  });

  test("a re-compile suppresses the re-emit — the in-lock re-read sees the v2 row", () => {
    resetOtelPerProject();
    const proj = seedApprovedZeroEntryStage();
    try {
      compile({ projectDir: proj });
      compile({ projectDir: proj });
      expect(memoryEmptyRows(proj).length).toBe(1);
    } finally {
      rmSync(proj, { recursive: true, force: true });
    }
  });
});
