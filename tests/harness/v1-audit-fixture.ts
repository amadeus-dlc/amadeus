// v1-audit-fixture.ts — plant a schema v1 audit row from a test.
//
// WHY A FIXTURE WRITER RATHER THAN THE PRODUCTION EMIT. Many suites here are
// about READERS: humanActedSinceGate, the presence and grant predicates, the
// merge-info accessors, doctor. They need a row on disk with a given shape, and
// several of them need shapes production would refuse to write — a sparse field
// bag, a forged shard, a WORKTREE_CREATED missing the field whose absence is the
// case under test. Driving those through emitAuditEvent is not possible: the
// canonical path validates required attributes and redacts unregistered keys, so
// the very rows these tests are about never reach the disk.
//
// The legacy writer used to serve that purpose incidentally, because it wrote
// whatever it was handed. It has been deleted (FR-MIG-5 / U8), and this is the
// test-side replacement for that ONE use of it: planting a row. It is not a
// second production path — nothing outside tests/ imports it, and the call-site
// census only scans packages/framework/core and scripts.
//
// v1 IS DELIBERATE. FR-MIG-5 keeps the v1 readers, so a workspace can still hold
// v1 rows and every reader must go on handling them. Rows planted here are
// therefore the schema the readers still have to support, not a re-enactment of
// a schema nobody writes.
//
// NO LOCK. The legacy writer took the audit lock because production writers race
// across processes. A test plants rows from one process, in order, so the lock
// would only add a failure mode. A suite that is specifically about lock
// behaviour should drive the real locked path instead.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
// The shipped tree, like the sibling audit-records harness: this file is copied
// into sandboxes that carry dist + docs + tests only.
import type { AppendAuditResult } from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import { EVENT_HEADINGS, escapeAuditValue } from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import { JOURNAL_SCHEMA_VERSION, serializeJournalEntry, splitJournalLines } from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import { activeIntent, auditCloneId, auditFilePath, isoTimestamp } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

// Same result shape the legacy writer returned, so a caller that reads back the
// timestamp it planted does not have to change.
export function plantV1AuditRow(
  eventType: string,
  fields: Record<string, string>,
  projectDir: string,
  intent?: string,
  space?: string
): AppendAuditResult {
  const path = auditFilePath(projectDir, intent, space);
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const ts = isoTimestamp();
  const escaped: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) escaped[key] = escapeAuditValue(value);

  appendFileSync(
    path,
    serializeJournalEntry({
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      // Dense 1-based per-shard sequence, the same rule the writers use.
      seq: existsSync(path) ? splitJournalLines(readFileSync(path, "utf-8")).length + 1 : 1,
      cloneId: auditCloneId(projectDir),
      intentId: activeIntent(projectDir, space, intent) ?? "workspace",
      timestamp: ts,
      heading: EVENT_HEADINGS[eventType] ?? eventType,
      event: eventType,
      fields: escaped,
    }),
    "utf-8"
  );

  return { appended: true, event: eventType, timestamp: ts };
}
