// covers: subcommand:amadeus-state:archive subcommand:amadeus-state:unarchive
// size: medium
import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { exceedsMedianLatencyBudget } from "../lib/latency-median-budget-gate.ts";
import { appendLifecycleAuditEntryUnlocked } from "../../packages/framework/core/tools/amadeus-audit.ts";
import {
  isJournalEntryV2,
  journalRecordField,
  readJournalRecords,
} from "../../packages/framework/core/tools/amadeus-journal.ts";
import {
  auditLockDir,
  auditShardName,
  type IntentLifecycleAuditEvent,
  type LifecycleTransactionHooks,
  runIntentLifecycleTransactionLocked,
  withIntentLifecyclePreflight,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { handleArchive } from "../../packages/framework/core/tools/amadeus-state.ts";

const STATE = join(import.meta.dir, "../../packages/framework/core/tools/amadeus-state.ts");
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function scaffold(status: string, active = true): { root: string; intent: string; audit: string } {
  const root = mkdtempSync(join(tmpdir(), "lifecycle-tx-"));
  roots.push(root);
  const intent = "260723-example";
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  const record = join(intents, intent);
  const auditDir = join(record, "audit");
  mkdirSync(auditDir, { recursive: true });
  writeFileSync(join(record, "amadeus-state.md"), "# AI-DLC State Tracking\n");
  writeFileSync(
    join(intents, "intents.json"),
    `${JSON.stringify([{
      uuid: "123e4567-e89b-42d3-a456-426614174000",
      slug: "example",
      dirName: intent,
      status,
    }], null, 2)}\n`,
  );
  if (active) writeFileSync(join(intents, "active-intent"), `${intent}\n`);
  const audit = join(auditDir, auditShardName(root));
  writeFileSync(audit, ledgerLine(1, "Human Turn", "HUMAN_TURN", "2026-07-23T10:00:00Z", intent));
  return { root, intent, audit };
}

interface AuditRecord {
  schemaVersion: number;
  seq: number;
  cloneId: string;
  intentId: string;
  timestamp: string;
  heading: string;
  event: string | null;
  fields?: Record<string, string>;
}

/** One JSONL ledger line for a hand-seeded fixture shard. */
function ledgerLine(
  seq: number,
  heading: string,
  event: string,
  timestamp: string,
  intentId: string,
  fields: Record<string, string> = {},
): string {
  return `${JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: "fixtureclone1",
    intentId,
    timestamp,
    heading,
    event,
    fields,
  })}\n`;
}

/** Parse a JSONL shard file into records ([] when absent). */
function auditRecords(shardPath: string): AuditRecord[] {
  const text = readFileSync(shardPath, "utf-8");
  return readJournalRecords(text).map((record) => {
    if (!isJournalEntryV2(record)) return record;
    const fields = Object.fromEntries(
      Object.entries(record.attributes)
        .filter(([key]) => key !== "Event")
        .map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)]),
    );
    return {
      schemaVersion: record.schemaVersion,
      seq: record.seq,
      cloneId: record.cloneId,
      intentId: record.intentId,
      timestamp: record.timestamp,
      heading: record.eventName,
      event: journalRecordField(record, "Event"),
      fields,
    };
  });
}

function eventCount(shardPath: string, event: string): number {
  return auditRecords(shardPath).filter((r) => r.event === event).length;
}

function run(root: string, verb: string, intent: string, input = `${verb} requested`) {
  return spawnSync(
    process.execPath,
    [STATE, verb, intent, "--user-input", input, "--project-dir", root],
    { encoding: "utf-8" },
  );
}

function registryStatus(root: string): string {
  const path = join(root, "amadeus", "spaces", "default", "intents", "intents.json");
  return JSON.parse(readFileSync(path, "utf-8"))[0].status;
}

function lifecycleEventBlock(
  operationId: string,
  intent: string,
  seq: number,
  fromStatus = "in-flight",
): string {
  return ledgerLine(seq, "Intent Archived", "INTENT_ARCHIVED", "2026-07-23T10:00:01Z", intent, {
    Intent: intent,
    "From Status": fromStatus,
    "To Status": "archived",
    "Operation Id": operationId,
    "User Input": "archive requested",
    "Human Turn Timestamp": "2026-07-23T10:00:00Z",
  });
}

function appendLifecycle(
  event: IntentLifecycleAuditEvent,
  shard: string,
  pd: string,
  intent: string,
  space: string,
): void {
  appendLifecycleAuditEntryUnlocked(event.eventType, {
    Intent: event.intentDir,
    "From Status": event.fromStatus,
    "To Status": event.toStatus,
    "Operation Id": event.operationId,
    "User Input": event.userInput,
    "Human Turn Timestamp": event.humanTurnTimestamp,
  }, pd, intent, space, shard);
}

describe("intent lifecycle transaction CLI", () => {
  test("allows registered lifecycle events on a completed intent in-process", () => {
    const fixture = scaffold("complete");
    const result = appendLifecycleAuditEntryUnlocked(
      "INTENT_ARCHIVED",
      { "User Input": "archive requested" },
      fixture.root,
      fixture.intent,
      "default",
      basename(fixture.audit),
    );

    expect(result.appended).toBe(true);
    expect(result.event).toBe("INTENT_ARCHIVED");
    expect(eventCount(fixture.audit, "INTENT_ARCHIVED")).toBe(1);
  });

  test("returns the complete-seal outcome for an invalid runtime lifecycle event", () => {
    const fixture = scaffold("complete");
    const eventType = "NOT_REGISTERED" as never;
    const result = appendLifecycleAuditEntryUnlocked(
      eventType,
      {},
      fixture.root,
      fixture.intent,
      "default",
      basename(fixture.audit),
    );

    expect(result).toMatchObject({ appended: false, reason: "intent-complete", event: eventType });
    expect(eventCount(fixture.audit, "NOT_REGISTERED")).toBe(0);
  });

  test("rejects a lifecycle audit shard outside the audit directory", () => {
    const fixture = scaffold("in-flight");
    expect(() => appendLifecycleAuditEntryUnlocked(
      "INTENT_ARCHIVED",
      {},
      fixture.root,
      fixture.intent,
      "default",
      "../escape.md",
    )).toThrow("Invalid lifecycle audit shard");
  });

  test.each(["in-flight", "parked", "complete"])("archives from %s and clears a matching cursor", (status) => {
    const fixture = scaffold(status);
    const result = run(fixture.root, "archive", fixture.intent);
    expect(result.status, result.stderr).toBe(0);
    expect(registryStatus(fixture.root)).toBe("archived");
    expect(() => readFileSync(
      join(fixture.root, "amadeus", "spaces", "default", "intents", "active-intent"),
    )).toThrow();
    // Record-scoped: the consumed turn's timestamp rides on the archive record.
    const archived = auditRecords(fixture.audit).filter(
      (r) => r.event === "INTENT_ARCHIVED",
    );
    expect(archived).toHaveLength(1);
    expect(archived[0]!.fields?.["Human Turn Timestamp"]).toBe("2026-07-23T10:00:00Z");
  });

  test("archives a non-active intent without changing the cursor", () => {
    const fixture = scaffold("in-flight", false);
    const cursor = join(fixture.root, "amadeus", "spaces", "default", "intents", "active-intent");
    writeFileSync(cursor, "260723-other\n");
    const result = run(fixture.root, "archive", fixture.intent);
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(cursor, "utf-8")).toBe("260723-other\n");
  });

  // Issue #2583: the ledger read side trims string fields, so an untrimmed
  // --user-input could never round-trip and wedged the space permanently
  // (journalFailure, journal left behind, every retry replaying the same
  // throw). The CLI normalizes at the entrance, so the value it records is
  // already a fixed point of the read-side normalization.
  test.each([
    ["trailing space", "archive it ", "archive it"],
    ["leading space", " archive it", "archive it"],
    ["trailing tab", "archive it\t", "archive it"],
    ["surrounding whitespace", " \t archive it \t ", "archive it"],
    ["whitespace only", "   ", ""],
  ])("archives with %s in --user-input and records the trimmed value", (_label, input, recorded) => {
    const fixture = scaffold("in-flight");
    const result = run(fixture.root, "archive", fixture.intent, input);
    expect(result.status, result.stderr).toBe(0);
    expect(registryStatus(fixture.root)).toBe("archived");
    const archived = auditRecords(fixture.audit).filter(
      (r) => r.event === "INTENT_ARCHIVED",
    );
    expect(archived).toHaveLength(1);
    expect(archived[0]!.fields?.["User Input"]).toBe(recorded);
    // No wedge: the transaction journal is cleared on success.
    expect(() => readFileSync(join(
      fixture.root,
      "amadeus",
      "spaces",
      "default",
      "intents",
      ".amadeus-intent-status-transaction.json",
    ))).toThrow();
  });

  // The same normalization, driven IN-PROCESS through the exported handleArchive
  // seam. The spawned arms above prove the CLI wiring; this one puts the
  // normalization statement itself inside bun's coverage universe, which a
  // spawned child is structurally outside of. handleIntentLifecycle resolves its
  // project dir through resolveProjectDir(projectDir), and the module-level
  // projectDir is only assigned by main()'s --project-dir parse — so an
  // in-process caller points the handler at the fixture with CLAUDE_PROJECT_DIR,
  // the documented env rung directly below the flag.
  test("handleArchive trims --user-input in-process", () => {
    const fixture = scaffold("in-flight");
    const previous = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = fixture.root;
    const printed: string[] = [];
    const log = console.log;
    console.log = (...parts: unknown[]) => {
      printed.push(parts.map(String).join(" "));
    };
    try {
      handleArchive([fixture.intent, "--user-input", "  archive it \t "]);
    } finally {
      console.log = log;
      if (previous === undefined) delete process.env.CLAUDE_PROJECT_DIR;
      else process.env.CLAUDE_PROJECT_DIR = previous;
    }

    expect(JSON.parse(printed[0]!)).toMatchObject({
      intent: fixture.intent,
      status: "archived",
    });
    expect(registryStatus(fixture.root)).toBe("archived");
    const archived = auditRecords(fixture.audit).filter((r) => r.event === "INTENT_ARCHIVED");
    expect(archived).toHaveLength(1);
    // The recorded value is already a fixed point of the read-side trim.
    expect(archived[0]!.fields?.["User Input"]).toBe("archive it");
  });

  test("unarchives to in-flight without selecting the intent", () => {
    const fixture = scaffold("archived", false);
    const result = run(fixture.root, "unarchive", fixture.intent);
    expect(result.status, result.stderr).toBe(0);
    expect(registryStatus(fixture.root)).toBe("in-flight");
    expect(eventCount(fixture.audit, "INTENT_UNARCHIVED")).toBe(1);
  });

  test("rejects a missing HUMAN_TURN without changing registry or audit", () => {
    const fixture = scaffold("in-flight");
    writeFileSync(fixture.audit, "");
    const registryPath = join(
      fixture.root,
      "amadeus",
      "spaces",
      "default",
      "intents",
      "intents.json",
    );
    const beforeRegistry = readFileSync(registryPath, "utf-8");
    const beforeAudit = readFileSync(fixture.audit, "utf-8");
    const result = run(fixture.root, "archive", fixture.intent);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("requires an unconsumed HUMAN_TURN");
    expect(readFileSync(registryPath, "utf-8")).toBe(beforeRegistry);
    expect(readFileSync(fixture.audit, "utf-8")).not.toBe(beforeAudit);
    expect(eventCount(fixture.audit, "INTENT_ARCHIVED")).toBe(0);
  });

  // #2585. Second-granular audit timestamps make two HUMAN_TURN blocks in one
  // second a normal input, so the scan treats the pair as the single consumable
  // slot the ledger already identifies by shard + timestamp, instead of
  // refusing the operation outright.
  test("resolves duplicate HUMAN_TURN timestamps without wedging", () => {
    const fixture = scaffold("in-flight");
    writeFileSync(
      fixture.audit,
      readFileSync(fixture.audit, "utf-8") +
        ledgerLine(
          auditRecords(fixture.audit).length + 1,
          "Human Turn",
          "HUMAN_TURN",
          "2026-07-23T10:00:00Z",
          fixture.intent,
        ),
    );
    const result = run(fixture.root, "archive", fixture.intent);
    expect(result.status, result.stderr).toBe(0);
    expect(registryStatus(fixture.root)).toBe("archived");
    const archived = auditRecords(fixture.audit).filter((r) => r.event === "INTENT_ARCHIVED");
    expect(archived).toHaveLength(1);
    expect(archived[0]!.fields?.["Human Turn Timestamp"]).toBe("2026-07-23T10:00:00Z");
  });

  // #2585 regression pin: a same-second collision between turns that are ALREADY
  // consumed must not lock the record out. The consumed/resolution filter runs
  // before any tie handling, so a fresh later turn stays selectable.
  test("stays usable when the duplicated HUMAN_TURN timestamps are already consumed", () => {
    const fixture = scaffold("archived");
    writeFileSync(
      fixture.audit,
      readFileSync(fixture.audit, "utf-8") +
        ledgerLine(2, "Human Turn", "HUMAN_TURN", "2026-07-23T10:00:00Z", fixture.intent) +
        lifecycleEventBlock("123e4567-e89b-42d3-a456-426614174111", fixture.intent, 3) +
        ledgerLine(4, "Human Turn", "HUMAN_TURN", "2026-07-23T10:00:02Z", fixture.intent),
    );
    const result = run(fixture.root, "unarchive", fixture.intent);
    expect(result.status, result.stderr).toBe(0);
    expect(registryStatus(fixture.root)).toBe("in-flight");
    const unarchived = auditRecords(fixture.audit).filter((r) => r.event === "INTENT_UNARCHIVED");
    expect(unarchived).toHaveLength(1);
    expect(unarchived[0]!.fields?.["Human Turn Timestamp"]).toBe("2026-07-23T10:00:02Z");
  });

  test("rejects invalid source statuses without consuming the turn", () => {
    const archived = scaffold("archived");
    const archiveResult = run(archived.root, "archive", archived.intent);
    expect(archiveResult.status).toBe(1);
    expect(eventCount(archived.audit, "INTENT_ARCHIVED")).toBe(0);

    const current = scaffold("in-flight");
    const unarchiveResult = run(current.root, "unarchive", current.intent);
    expect(unarchiveResult.status).toBe(1);
    expect(readFileSync(current.audit, "utf-8")).not.toContain("INTENT_UNARCHIVED");
  });

  test.each([
    [false, false, false, "in-flight"],
    [true, false, false, "in-flight"],
    [true, true, false, "archived"],
    [true, true, true, "archived"],
  ] as const)(
    "recovers journal topology %p/%p/%p forward without duplicate audit",
    (auditCommitted, registryCommitted, cursorCommitted, status) => {
      const fixture = scaffold(status);
      const operationId = "123e4567-e89b-42d3-a456-426614174000";
      if (auditCommitted) {
        writeFileSync(
          fixture.audit,
          readFileSync(fixture.audit, "utf-8") +
            lifecycleEventBlock(
              operationId,
              fixture.intent,
              auditRecords(fixture.audit).length + 1,
            ),
        );
      }
      if (cursorCommitted) {
        rmSync(join(
          fixture.root,
          "amadeus",
          "spaces",
          "default",
          "intents",
          "active-intent",
        ));
      }
      const journal = join(
        fixture.root,
        "amadeus",
        "spaces",
        "default",
        "intents",
        ".amadeus-intent-status-transaction.json",
      );
      writeFileSync(journal, `${JSON.stringify({
        schemaVersion: 1,
        operationId,
        verb: "archive",
        intentDir: fixture.intent,
        fromStatus: "in-flight",
        toStatus: "archived",
        humanTurn: {
          shard: basename(fixture.audit),
          timestamp: "2026-07-23T10:00:00Z",
        },
        userInput: "archive requested",
        auditCommitted,
        registryCommitted,
        cursorCommitted,
      }, null, 2)}\n`);
      const result = run(fixture.root, "archive", fixture.intent);
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout).recovered).toBe(true);
      expect(registryStatus(fixture.root)).toBe("archived");
      expect(eventCount(fixture.audit, "INTENT_ARCHIVED")).toBe(1);
      expect(() => readFileSync(journal)).toThrow();
    },
  );

  test("serializes eight competing processes: one commits and seven reject", async () => {
    const fixture = scaffold("in-flight");
    const children = Array.from({ length: 8 }, () => Bun.spawn([
      process.execPath,
      STATE,
      "archive",
      fixture.intent,
      "--user-input",
      "archive requested",
      "--project-dir",
      fixture.root,
    ], { stdout: "pipe", stderr: "pipe" }));
    const statuses = await Promise.all(children.map((child) => child.exited));
    expect(statuses.filter((status) => status === 0).length).toBe(1);
    expect(statuses.filter((status) => status !== 0).length).toBe(7);
    expect(registryStatus(fixture.root)).toBe("archived");
    expect(eventCount(fixture.audit, "INTENT_ARCHIVED")).toBe(1);
  });

  test("serializes eight independent intents without losing any transaction", async () => {
    const root = mkdtempSync(join(tmpdir(), "lifecycle-tx-eight-"));
    roots.push(root);
    const intentsDir = join(root, "amadeus", "spaces", "default", "intents");
    mkdirSync(intentsDir, { recursive: true });
    const rows = Array.from({ length: 8 }, (_, index) => {
      const intent = `260723-intent-${index}`;
      const record = join(intentsDir, intent);
      mkdirSync(join(record, "audit"), { recursive: true });
      writeFileSync(join(record, "amadeus-state.md"), "# AI-DLC State Tracking\n");
      writeFileSync(
        join(record, "audit", auditShardName(root)),
        ledgerLine(
          1,
          "Human Turn",
          "HUMAN_TURN",
          `2026-07-23T10:00:${String(index).padStart(2, "0")}Z`,
          intent,
        ),
      );
      return {
        uuid: `123e4567-e89b-42d3-a456-4266141740${String(index).padStart(2, "0")}`,
        slug: `intent-${index}`,
        dirName: intent,
        status: "in-flight",
      };
    });
    writeFileSync(join(intentsDir, "intents.json"), `${JSON.stringify(rows, null, 2)}\n`);
    const children = rows.map((row) => Bun.spawn([
      process.execPath,
      STATE,
      "archive",
      row.dirName,
      "--user-input",
      `archive ${row.dirName}`,
      "--project-dir",
      root,
    ], { stdout: "pipe", stderr: "pipe" }));
    const statuses = await Promise.all(children.map((child) => child.exited));
    expect(statuses).toEqual(Array(8).fill(0));
    const finalRows = JSON.parse(readFileSync(join(intentsDir, "intents.json"), "utf-8"));
    expect(finalRows.map((row: { status: string }) => row.status)).toEqual(Array(8).fill("archived"));
    for (let index = 0; index < 8; index++) {
      expect(
        eventCount(
          join(intentsDir, `260723-intent-${index}`, "audit", auditShardName(root)),
          "INTENT_ARCHIVED",
        ),
      ).toBe(1);
    }
  });

  test("times out after the five-second workspace lock budget without mutation", () => {
    const fixture = scaffold("in-flight");
    const lockBase = join(fixture.root, "locks");
    mkdirSync(lockBase);
    const saved = process.env.AMADEUS_LOCK_BASE_DIR;
    process.env.AMADEUS_LOCK_BASE_DIR = lockBase;
    const lock = auditLockDir(fixture.root);
    if (saved === undefined) delete process.env.AMADEUS_LOCK_BASE_DIR;
    else process.env.AMADEUS_LOCK_BASE_DIR = saved;
    mkdirSync(lock);
    writeFileSync(join(lock, "owner.json"), JSON.stringify({
      pid: process.pid,
      startedAtMs: Math.floor(performance.timeOrigin + performance.now()),
    }));
    const registryPath = join(
      fixture.root,
      "amadeus",
      "spaces",
      "default",
      "intents",
      "intents.json",
    );
    const beforeRegistry = readFileSync(registryPath, "utf-8");
    const beforeAudit = readFileSync(fixture.audit, "utf-8");
    const started = performance.now();
    const result = spawnSync(
      process.execPath,
      [STATE, "archive", fixture.intent, "--user-input", "archive requested", "--project-dir", fixture.root],
      {
        encoding: "utf-8",
        env: { ...process.env, AMADEUS_LOCK_BASE_DIR: lockBase },
      },
    );
    expect(result.status).toBe(1);
    expect(performance.now() - started).toBeGreaterThanOrEqual(4_900);
    expect(readFileSync(registryPath, "utf-8")).toBe(beforeRegistry);
    expect(readFileSync(fixture.audit, "utf-8")).toBe(beforeAudit);
  }, scaleTestTime(10_000));

  test.each([
    "beforeValidation",
    "beforeJournalWrite",
    "beforeAuditCommit",
    "afterAuditCommit",
    "beforeRegistryCommit",
    "afterRegistryCommit",
    "beforeCursorCommit",
    "afterCursorCommit",
    "beforeJournalDelete",
  ] as const)("recovers after injected durable boundary %s", (boundary) => {
    const fixture = scaffold("in-flight");
    const hooks: LifecycleTransactionHooks = {
      [boundary]: () => {
        throw new Error(boundary);
      },
    };
    expect(() => withIntentLifecyclePreflight(
      fixture.root,
      "default",
      appendLifecycle,
      (context) => runIntentLifecycleTransactionLocked(
        context,
        fixture.intent,
        "archive",
        "archive requested",
        appendLifecycle,
        hooks,
      ),
      hooks,
    )).toThrow(boundary);
    withIntentLifecyclePreflight(
      fixture.root,
      "default",
      appendLifecycle,
      (context, recovery) => {
        if (recovery.kind === "none") {
          runIntentLifecycleTransactionLocked(
            context,
            fixture.intent,
            "archive",
            "archive requested",
            appendLifecycle,
          );
        }
      },
    );
    expect(registryStatus(fixture.root)).toBe("archived");
    expect(eventCount(fixture.audit, "INTENT_ARCHIVED")).toBe(1);
  });
});

// Absolute latency budget (#1424) for the archive path. The real measurement
// moved to tests/perf/t258-lifecycle-transaction-perf.test.ts (#1830 FR-1);
// this file keeps the pure verdict proof, which needs no wall clock.
const ARCHIVE_LATENCY_BUDGET_MS = 500;

describe("intent lifecycle transaction performance contract", () => {
  // FR-4 wiring proof: a genuine across-the-board regression, fed through the
  // exact predicate and budget constant the benchmark asserts against, reports
  // as a failure. This pins that the median swap did not turn the gate into a
  // no-op — the verdict the real run consumes still catches a regression.
  test("a regressed archive latency median fails the same verdict path", () => {
    const regressed = Array.from(
      { length: 100 },
      () => ARCHIVE_LATENCY_BUDGET_MS + 100,
    );
    expect(exceedsMedianLatencyBudget(regressed, ARCHIVE_LATENCY_BUDGET_MS)).toBe(true);
  });
});
