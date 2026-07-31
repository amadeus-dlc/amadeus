// covers: function:serializeJournalEntry, function:parseJournalLine, function:parseJournalShard, function:forkLineageCloneId
// size: small
//
// Property-based + example tests for the JSONL journal codec (Issue #1628,
// Phase 1 PR-2). Pure functions imported from the shipped dist copy (t204
// precedent) — no filesystem, no spawn: SMALL tier.
//
// ── PBT CONVENTIONS ── mirrors t204-audit-escape.pbt.test.ts: fixed seed,
// default numRuns, shrunk counterexamples get pinned as example tests.

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  JOURNAL_SCHEMA_VERSION,
  JOURNAL_SCHEMA_VERSION_MAX,
  type JournalEntry,
  JournalCodecError,
  forkLineageCloneId,
  journalEntryId,
  parseJournalLine,
  parseJournalShard,
  serializeJournalEntry,
} from "../../dist/claude/.claude/tools/amadeus-journal.ts";

const PBT_SEED = 16280702;

// Single-line strings (no CR/LF) — the invariant every non-rawBody string
// field must satisfy. rawBody may contain anything.
const singleLine = fc.string().filter((s) => !/\r|\n/.test(s));
const seqArb = fc.integer({ min: 1, max: 1_000_000 });

const canonicalEntryArb: fc.Arbitrary<JournalEntry> = fc
  .record({
    seq: seqArb,
    cloneId: singleLine,
    intentId: singleLine,
    timestamp: singleLine,
    heading: singleLine,
    event: singleLine,
    fields: fc.dictionary(singleLine.filter((s) => s.length > 0), singleLine, {
      maxKeys: 6,
    }),
  })
  .map((r) => ({ schemaVersion: JOURNAL_SCHEMA_VERSION, ...r }));

const rawEntryArb: fc.Arbitrary<JournalEntry> = fc
  .record({
    seq: seqArb,
    cloneId: singleLine,
    intentId: singleLine,
    timestamp: singleLine,
    heading: singleLine,
    rawBody: fc.string(), // may contain newlines — JSON encodes them
    opaque: fc.boolean(),
  })
  .map(({ opaque, ...r }) => ({
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    event: null,
    ...r,
    ...(opaque ? { opaque: true as const } : {}),
  }));

const entryArb = fc.oneof(canonicalEntryArb, rawEntryArb);

describe("journal codec — round-trip properties", () => {
  test("parse(serialize(entry)) reproduces the entry exactly", () => {
    fc.assert(
      fc.property(entryArb, (entry) => {
        const line = serializeJournalEntry(entry);
        const back = parseJournalLine(line.slice(0, -1));
        expect(back).toEqual({
          ...entry,
          ...(entry.event === null ? { rawBody: entry.rawBody ?? "" } : { fields: entry.fields ?? {} }),
        });
      }),
      { seed: PBT_SEED },
    );
  });

  test("one entry serializes to exactly one physical line", () => {
    fc.assert(
      fc.property(entryArb, (entry) => {
        const line = serializeJournalEntry(entry);
        expect(line.endsWith("\n")).toBe(true);
        expect(line.slice(0, -1)).not.toContain("\n");
        expect(line.slice(0, -1)).not.toContain("\r");
      }),
      { seed: PBT_SEED },
    );
  });

  test("serialization is deterministic (byte-stable key order)", () => {
    fc.assert(
      fc.property(entryArb, (entry) => {
        expect(serializeJournalEntry(entry)).toBe(serializeJournalEntry({ ...entry }));
      }),
      { seed: PBT_SEED },
    );
  });

  test("parseJournalShard round-trips a whole buffer and tolerates blank lines", () => {
    fc.assert(
      fc.property(fc.array(entryArb, { maxLength: 8 }), (entries) => {
        const buffer = `${entries.map(serializeJournalEntry).join("")}\n`;
        const back = parseJournalShard(buffer);
        expect(back.length).toBe(entries.length);
      }),
      { seed: PBT_SEED },
    );
  });
});

describe("journal codec — refusals (parse, don't validate)", () => {
  const base = {
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    seq: 1,
    cloneId: "abc123def456",
    intentId: "260728-demo-1234abcd",
    timestamp: "2026-07-28T10:00:00Z",
    heading: "Stage Start",
  };

  test("serialize rejects newlines in single-line positions", () => {
    expect(() => serializeJournalEntry({ ...base, event: "STAGE_STARTED", fields: { K: "a\nb" } })).toThrow(JournalCodecError);
    expect(() => serializeJournalEntry({ ...base, event: "BAD\nEVENT", fields: {} })).toThrow(JournalCodecError);
    expect(() => serializeJournalEntry({ ...base, heading: "H\nH", event: "STAGE_STARTED", fields: {} })).toThrow(JournalCodecError);
  });

  test("serialize rejects shape confusion (raw vs canonical)", () => {
    expect(() => serializeJournalEntry({ ...base, event: null, fields: { K: "v" } } as JournalEntry)).toThrow(JournalCodecError);
    expect(() => serializeJournalEntry({ ...base, event: "STAGE_STARTED", rawBody: "x" } as JournalEntry)).toThrow(JournalCodecError);
    expect(() => serializeJournalEntry({ ...base, event: "STAGE_STARTED", fields: {}, opaque: true } as unknown as JournalEntry)).toThrow(JournalCodecError);
    expect(() => serializeJournalEntry({ ...base, seq: 0, event: "STAGE_STARTED", fields: {} })).toThrow(JournalCodecError);
  });

  test("parse rejects malformed lines with a loud diagnosis", () => {
    expect(() => parseJournalLine("not json")).toThrow(JournalCodecError);
    expect(() => parseJournalLine("[1,2]")).toThrow(JournalCodecError);
    expect(() => parseJournalLine(JSON.stringify({ ...base, schemaVersion: 0, seq: 1, event: null, rawBody: "" }))).toThrow(JournalCodecError);
    expect(() => parseJournalLine(JSON.stringify({ ...base, schemaVersion: JOURNAL_SCHEMA_VERSION_MAX + 1, event: null, rawBody: "" }))).toThrow(/newer than supported/);
    expect(() => parseJournalLine(JSON.stringify({ ...base, event: null }))).toThrow(/rawBody/);
    expect(() => parseJournalLine(JSON.stringify({ ...base, event: "STAGE_STARTED" }))).toThrow(/fields/);
    expect(() => parseJournalLine(JSON.stringify({ ...base, event: "STAGE_STARTED", fields: { K: 1 } }))).toThrow(JournalCodecError);
  });

  test("parse rejects envelope violations branch-by-branch", () => {
    const raw = { ...base, event: null, rawBody: "" };
    // invalid seq (schemaVersion valid so the seq branch is the one that fires)
    expect(() => parseJournalLine(JSON.stringify({ ...raw, seq: 0 }))).toThrow(/invalid seq/);
    expect(() => parseJournalLine(JSON.stringify({ ...raw, seq: 1.5 }))).toThrow(/invalid seq/);
    // missing / non-string envelope members
    expect(() => parseJournalLine(JSON.stringify({ ...raw, cloneId: undefined }))).toThrow(/missing string field cloneId/);
    expect(() => parseJournalLine(JSON.stringify({ ...raw, timestamp: 42 }))).toThrow(/missing string field timestamp/);
    // opaque must be literally true when present
    expect(() => parseJournalLine(JSON.stringify({ ...raw, opaque: "yes" }))).toThrow(/opaque must be true/);
    // event must be string or null
    expect(() => parseJournalLine(JSON.stringify({ ...base, event: 7 }))).toThrow(/event must be a string or null/);
  });

  test("parseJournalShard reports the 1-based line number of a bad line", () => {
    const good = serializeJournalEntry({ ...base, event: "STAGE_STARTED", fields: {} });
    expect(() => parseJournalShard(`${good}garbage\n`)).toThrow(/line 2:/);
  });
});

describe("identity helpers", () => {
  test("journalEntryId is intentId:cloneId:seq", () => {
    const entry: JournalEntry = {
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      seq: 7,
      cloneId: "abc123def456",
      intentId: "260728-demo-1234abcd",
      timestamp: "t",
      heading: "h",
      event: "HUMAN_TURN",
      fields: {},
    };
    expect(journalEntryId(entry)).toBe("260728-demo-1234abcd:abc123def456:7");
  });

  test("forkLineageCloneId is deterministic, 12-hex, and collision-splitting", () => {
    const main = "abc123def456";
    const a = forkLineageCloneId(main, "bolt-a");
    const b = forkLineageCloneId(main, "bolt-b");
    expect(a).toMatch(/^[0-9a-f]{12}$/);
    expect(a).toBe(forkLineageCloneId(main, "bolt-a"));
    expect(a).not.toBe(b);
    expect(a).not.toBe(main);
  });
});
