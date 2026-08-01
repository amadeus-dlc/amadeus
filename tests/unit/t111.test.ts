// covers: function:handleAppend
//
// t111 — P0 deterministic floor. Mechanism = none (pure file I/O, zero LLM,
// zero tokens). Exercises the audit CLI's append entry in amadeus-audit.ts:
// handleAppend — the thin wrapper that guards, emits, and prints JSON to
// stdout.
//
// WHAT USED TO BE HERE. This file also held the contract of the legacy writer
// pair (appendAuditEntry / appendAuditEntryUnlocked): block format, CR/LF
// escaping, append-not-overwrite, and a mirrored copy of the 78-entry accept
// set. That writer was deleted (FR-MIG-5 / U8) and those cases went with it.
// The claims did not vanish with them:
//   - the accept set is now registry-sourced and pinned in t389, against the
//     CLI-entry guard that decides it today;
//   - the CR/LF escape seam is pinned in t205, against the v1 write path that
//     still exists (the lifecycle writer);
//   - append-not-overwrite and record shape are pinned in t18.
//
// Test design note (house style, see tests/unit/t69-worktree-path.sh): assert
// the OBSERVABLE CONTRACT, not implementation parity.

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleAppend } from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import {
  auditFilePath,
  readAllAuditShards,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { normalizeAuditRecord } from "../harness/audit-records.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

// --- Per-file temp roots, torn down in afterAll ---------------------------
const tmpRoots: string[] = [];

// The lone intent record every fixture project carries. An audit shard only
// resolves inside an intent's record (#1377 — auditFilePath refuses the bare
// intents root), so a project with no intent is not a place audit can be
// appended at all; that refusal has its own case below.
const FIXTURE_INTENT = "t111-fixture-deadbeef";

// Make a fresh project dir holding one intent record. The source's
// ensureAuditFile() lazily creates that intent's audit SHARD dir + shard on
// first append. The JSONL trail carries no header line, so pre-seeding is an
// empty file; `seedAuditShard` lets a case create the shard up front when it
// wants to prove appends are a pure suffix on an existing shard.
function freshProject(seedAuditShard = false): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t111-"));
  tmpRoots.push(root);
  // The canonical emit path bootstraps per workspace and refuses a second
  // bootstrap for a different project dir. Each fixture project is a new
  // workspace, so drop the per-process records the way the provider
  // registrations already are.
  resetOtelPerProject();
  // A record dir is one holding amadeus-state.md; a lone record resolves with
  // no active-intent cursor (see activeIntent()).
  const record = join(root, "amadeus", "spaces", "default", "intents", FIXTURE_INTENT);
  mkdirSync(record, { recursive: true });
  writeFileSync(join(record, "amadeus-state.md"), "# AI-DLC Workflow State\n", "utf-8");
  if (seedAuditShard) {
    const shard = auditFilePath(root);
    mkdirSync(dirname(shard), { recursive: true });
    writeFileSync(shard, "", "utf-8");
  }
  return root;
}



// One parsed JSONL audit record.
interface AuditRecord {
  schemaVersion: number;
  seq: number;
  cloneId: string;
  intentId: string;
  timestamp: string;
  heading: string;
  event: string | null;
  fields?: Record<string, string>;
  rawBody?: string;
}

// Parse a shard buffer (JSONL — one JSON object per line, no header) into
// records. Blank lines are skipped; anything else must parse, so a malformed
// line fails the case loudly rather than being silently dropped.
//
// Normalised through the shared v1/v2 view: a shard is legitimately MIXED while
// the migration runs, and a migrated row carries its audit event type as an
// `Event` attribute rather than a top-level `event`. Reading raw would make a
// migrated row look like a row that was never written.
function parseRecords(body: string): AuditRecord[] {
  return body
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => normalizeAuditRecord(JSON.parse(l) as Record<string, unknown>) as unknown as AuditRecord);
}

function readRecords(projectDir: string, intent?: string): AuditRecord[] {
  return parseRecords(
    intent === undefined ? readAllAuditShards(projectDir) : readAllAuditShards(projectDir, intent),
  );
}


afterAll(() => {
  for (const root of tmpRoots) {
    try {
      rmSync(root, { recursive: true, force: true });
    } catch {
      // best-effort cleanup; a leaked temp dir is harmless to the suite
    }
  }
});

describe("handleAppend — thin wrapper over appendAuditEntry", () => {
  test("writes the block to audit.md and prints the success JSON to stdout", () => {
    const proj = freshProject();
    const captured: string[] = [];
    const orig = process.stdout.write.bind(process.stdout);
    // jsonSuccess() does process.stdout.write(`${JSON.stringify(data)}\n`).
    // Capture it so we can assert the printed payload without leaking to the
    // test runner's stdout.
    (process.stdout as unknown as { write: typeof process.stdout.write }).write =
      ((chunk: string | Uint8Array) => {
        captured.push(typeof chunk === "string" ? chunk : chunk.toString());
        return true;
      }) as typeof process.stdout.write;

    try {
      handleAppend("GATE_APPROVED", { Stage: "2.1-practices" }, proj);
    } finally {
      (process.stdout as unknown as { write: typeof process.stdout.write }).write =
        orig;
    }

    // Side effect: the record is on disk.
    const rec = readRecords(proj)[0]!;
    expect(rec.event).toBe("GATE_APPROVED");
    // The caller's fields, with the Event carrier excluded: a migrated row
    // relocates the audit event type into the field bag so legacy readers keep
    // finding it (rec.event above reads it back), and it is not a field the
    // caller passed.
    const { Event: _carrier, ...content } = rec.fields ?? {};
    expect(content).toEqual({ Stage: "2.1-practices" });

    // Output: exactly one trailing-newline JSON line carrying the result.
    expect(captured.length).toBe(1);
    expect(captured[0].endsWith("\n")).toBe(true);
    const printed = JSON.parse(captured[0]);
    expect(printed.appended).toBe(true);
    expect(printed.event).toBe("GATE_APPROVED");
    expect(typeof printed.timestamp).toBe("string");
    // The printed timestamp matches the one written into the record.
    expect(rec.timestamp).toBe(printed.timestamp);
  });

  test("propagates the invalid-event-type throw (does not swallow it)", () => {
    const proj = freshProject();
    expect(() => handleAppend("WRONG", {}, proj)).toThrow(
      /Invalid event type: WRONG\. Must be one of:/,
    );
  });
});
