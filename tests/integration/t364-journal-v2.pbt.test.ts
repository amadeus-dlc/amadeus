// covers: function:serializeJournalEntryV2, function:parseJournalLine, function:readJournalRecords, function:mergeShards, function:convertV1ToV2, function:renderJournalView
// size: medium
//
// Property-based + example tests for the Journal Module schema v2 surface
// (FR-JRN-1/2/5, intent 260729-otel-upstream U3): the v2 codec, the
// mixed-version reader, cross-clone/worktree shard merge, the v1->v2
// converter, and the human-readable View. Imports come from the shipped
// dist copy (t352 precedent). Only the checked-in fixture read touches the
// filesystem; everything else is pure: SMALL tier.
//
// ── PBT CONVENTIONS ── mirrors t352-journal-codec.pbt.test.ts: fixed seed,
// default numRuns, shrunk counterexamples get pinned as example tests.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import fc from "fast-check";
import {
  JOURNAL_SCHEMA_VERSION,
  JOURNAL_SCHEMA_VERSION_MAX,
  JOURNAL_SCHEMA_VERSION_V2,
  type JournalEntry,
  type JournalEntryV2,
  JournalCodecError,
  type JournalRecord,
  type JournalShard,
  convertV1ToV2,
  forkLineageCloneId,
  isJournalEntryV2,
  journalEntryId,
  journalRecordKey,
  mergeShards,
  parseJournalLine,
  parseJournalShard,
  readJournalRecords,
  renderJournalView,
  serializeJournalEntry,
  serializeJournalEntryV2,
  serializeJournalRecord,
} from "../../dist/claude/.claude/tools/amadeus-journal.ts";

const PBT_SEED = 26072903;

// Single-line strings (no CR/LF) — the invariant every non-attribute string
// field must satisfy.
const singleLine = fc.string().filter((s) => !/\r|\n/.test(s));
const seqArb = fc.integer({ min: 1, max: 1_000_000 });
const timestampArb = fc.integer({ min: 0, max: 2_000_000_000_000 }).map((ms) => new Date(ms).toISOString());

const canonicalV1Arb: fc.Arbitrary<JournalEntry> = fc
  .record({
    seq: seqArb,
    cloneId: singleLine,
    intentId: singleLine,
    timestamp: timestampArb,
    heading: singleLine,
    event: singleLine.filter((s) => s.length > 0),
    fields: fc.dictionary(singleLine.filter((s) => s.length > 0), singleLine, { maxKeys: 5 }),
  })
  .map((r) => ({ schemaVersion: JOURNAL_SCHEMA_VERSION, ...r }));

const rawV1Arb: fc.Arbitrary<JournalEntry> = fc
  .record({
    seq: seqArb,
    cloneId: singleLine,
    intentId: singleLine,
    timestamp: timestampArb,
    heading: singleLine,
    rawBody: fc.string(),
    opaque: fc.boolean(),
  })
  .map(({ opaque, ...r }) => ({
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    event: null,
    ...r,
    ...(opaque ? { opaque: true as const } : {}),
  }));

const v1EntryArb = fc.oneof(canonicalV1Arb, rawV1Arb);

// JSON values for typed attributes (round-trip must be lossless). Parsed
// records always carry plain-prototype objects, so the arbitrary normalizes
// generated values through JSON to compare like with like.
const jsonValueArb = fc.jsonValue({ maxDepth: 3 }).map((v) => JSON.parse(JSON.stringify(v)));

const v2EntryArb: fc.Arbitrary<JournalEntryV2> = fc.record({
  schemaVersion: fc.constant(JOURNAL_SCHEMA_VERSION_V2),
  eventId: singleLine,
  seq: seqArb,
  timestamp: timestampArb,
  eventName: singleLine,
  attributes: fc.dictionary(singleLine.filter((s) => s.length > 0), jsonValueArb, {
    maxKeys: 5,
    noNullPrototype: true,
  }),
  intentId: singleLine,
  space: singleLine,
  cloneId: singleLine,
  traceId: fc.option(singleLine, { nil: null }),
  spanId: fc.option(singleLine, { nil: null }),
  traceFlags: fc.integer({ min: 0, max: 255 }),
  idempotencyKey: singleLine,
  canonical: fc.boolean(),
});

const recordArb: fc.Arbitrary<JournalRecord> = fc.oneof(v1EntryArb, v2EntryArb);

function shardOf(sourceId: string, records: readonly JournalRecord[]): JournalShard {
  return { sourceId, buffer: records.map(serializeJournalRecord).join("") };
}

describe("v2 codec — round-trip properties", () => {
  test("parse(serializeV2(entry)) reproduces the entry exactly", () => {
    fc.assert(
      fc.property(v2EntryArb, (entry) => {
        const back = parseJournalLine(serializeJournalEntryV2(entry).slice(0, -1));
        expect(back).toEqual(entry);
        // Byte-level round-trip too: re-serializing the parsed record is
        // identical to the original serialization.
        expect(serializeJournalRecord(back)).toBe(serializeJournalEntryV2(entry));
      }),
      { seed: PBT_SEED },
    );
  });

  test("one v2 entry serializes to exactly one physical line", () => {
    fc.assert(
      fc.property(v2EntryArb, (entry) => {
        const line = serializeJournalEntryV2(entry);
        expect(line.endsWith("\n")).toBe(true);
        expect(line.slice(0, -1)).not.toContain("\n");
        expect(line.slice(0, -1)).not.toContain("\r");
      }),
      { seed: PBT_SEED },
    );
  });

  test("v2 serialization is deterministic regardless of attribute key insertion order", () => {
    fc.assert(
      fc.property(v2EntryArb, (entry) => {
        const reversed: Record<string, unknown> = {};
        for (const key of Object.keys(entry.attributes).reverse()) reversed[key] = entry.attributes[key];
        expect(serializeJournalEntryV2({ ...entry, attributes: reversed })).toBe(serializeJournalEntryV2(entry));
      }),
      { seed: PBT_SEED },
    );
  });

  test("mixed v1/v2 buffers round-trip through readJournalRecords in order", () => {
    fc.assert(
      fc.property(fc.array(recordArb, { maxLength: 10 }), (records) => {
        const buffer = records.map(serializeJournalRecord).join("");
        const back = readJournalRecords(buffer);
        expect(back.length).toBe(records.length);
        for (let i = 0; i < records.length; i += 1) {
          expect(isJournalEntryV2(back[i]!)).toBe(isJournalEntryV2(records[i]!));
        }
      }),
      { seed: PBT_SEED },
    );
  });
});

describe("v2 codec — refusals (BR-1/BR-10)", () => {
  const base: JournalEntryV2 = {
    schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
    eventId: "evt-1",
    seq: 1,
    timestamp: "2026-07-29T00:00:00.000Z",
    eventName: "amadeus.session.ended",
    attributes: {},
    intentId: "260729-demo-deadbeef",
    space: "default",
    cloneId: "abc123def456",
    traceId: null,
    spanId: null,
    traceFlags: 0,
    idempotencyKey: "260729-demo-deadbeef:abc123def456:1",
    canonical: true,
  };

  test("serializeV2 rejects invariant violations", () => {
    expect(() => serializeJournalEntryV2({ ...base, schemaVersion: 1 })).toThrow(JournalCodecError);
    expect(() => serializeJournalEntryV2({ ...base, seq: 0 })).toThrow(JournalCodecError);
    expect(() => serializeJournalEntryV2({ ...base, eventName: "a\nb" })).toThrow(JournalCodecError);
    expect(() => serializeJournalEntryV2({ ...base, traceFlags: 256 })).toThrow(JournalCodecError);
    expect(() => serializeJournalEntryV2({ ...base, attributes: { K: undefined } })).toThrow(JournalCodecError);
    expect(() => serializeJournalEntryV2({ ...base, attributes: { K: Number.NaN } })).toThrow(JournalCodecError);
  });

  test("parse rejects v2 shape violations with a loud diagnosis", () => {
    const line = (over: Record<string, unknown>) => JSON.stringify({ ...base, ...over });
    expect(() => parseJournalLine(line({ eventId: 7 }))).toThrow(/missing string field eventId/);
    expect(() => parseJournalLine(line({ seq: 0 }))).toThrow(/invalid seq/);
    expect(() => parseJournalLine(line({ attributes: [1] }))).toThrow(/attributes/);
    expect(() => parseJournalLine(line({ traceId: 3 }))).toThrow(/traceId must be a string or null/);
    expect(() => parseJournalLine(line({ traceFlags: -1 }))).toThrow(/traceFlags/);
    expect(() => parseJournalLine(line({ canonical: "yes" }))).toThrow(/canonical/);
  });

  test("reader refuses a schema version newer than supported", () => {
    expect(() => parseJournalLine(JSON.stringify({ ...base, schemaVersion: JOURNAL_SCHEMA_VERSION_MAX + 1 }))).toThrow(
      /newer than supported/,
    );
    expect(JOURNAL_SCHEMA_VERSION_MAX).toBe(JOURNAL_SCHEMA_VERSION_V2);
  });

  test("v1-only parseJournalShard refuses a v2 line and points at the mixed reader", () => {
    expect(() => parseJournalShard(serializeJournalEntryV2(base))).toThrow(/use readJournalRecords/);
  });
});

describe("merge — no-loss / exactly-once / order invariance (BR-5/BR-6)", () => {
  // Records with globally unique keys: no-loss means every record survives.
  const uniqueRecordsArb = fc
    .array(recordArb, { maxLength: 12 })
    .map((records) =>
      records.map((r, i) =>
        isJournalEntryV2(r)
          ? { ...r, idempotencyKey: `k-${i}` }
          : ({ ...r, intentId: "intent", cloneId: `clone-${i}`, seq: 1 } as JournalRecord),
      ),
    );

  test("no-loss: every decodeable record survives the merge", () => {
    fc.assert(
      fc.property(uniqueRecordsArb, (records) => {
        const merged = mergeShards([shardOf("s1", records)]);
        expect(merged.records.length).toBe(records.length);
        expect(merged.duplicatesDropped).toBe(0);
        expect(merged.decodeErrors).toEqual([]);
        const outKeys = merged.records.map(journalRecordKey).sort();
        expect(outKeys).toEqual(records.map(journalRecordKey).sort());
      }),
      { seed: PBT_SEED },
    );
  });

  test("exactly-once: duplicated shards collapse to one copy per key", () => {
    fc.assert(
      fc.property(uniqueRecordsArb, (records) => {
        const merged = mergeShards([shardOf("s1", records), shardOf("s2", records), shardOf("s3", records)]);
        expect(merged.records.length).toBe(records.length);
        expect(merged.duplicatesDropped).toBe(records.length * 2);
      }),
      { seed: PBT_SEED },
    );
  });

  test("merge is idempotent: re-merging the output changes nothing", () => {
    fc.assert(
      fc.property(uniqueRecordsArb, (records) => {
        const first = mergeShards([shardOf("s1", records), shardOf("s2", records)]);
        const second = mergeShards([{ sourceId: "merged", buffer: first.records.map(serializeJournalRecord).join("") }]);
        expect(second.records).toEqual(first.records);
        expect(second.duplicatesDropped).toBe(0);
      }),
      { seed: PBT_SEED },
    );
  });

  test("order invariance: output does not depend on shard input order", () => {
    fc.assert(
      fc.property(uniqueRecordsArb, uniqueRecordsArb, (a, b) => {
        const forward = mergeShards([shardOf("s1", a), shardOf("s2", b)]);
        const backward = mergeShards([shardOf("s2", b), shardOf("s1", a)]);
        expect(backward.records).toEqual(forward.records);
      }),
      { seed: PBT_SEED },
    );
  });

  test("clone-local sequence is not a cross-shard ordering key (BR-6)", () => {
    const mk = (cloneId: string, seq: number, timestamp: string): JournalEntry => ({
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      seq,
      cloneId,
      intentId: "intent",
      timestamp,
      heading: "h",
      event: "E",
      fields: {},
    });
    // Clone B's later seq carries the EARLIER timestamp: timestamp must win.
    const merged = mergeShards([
      shardOf("b", [mk("clone-b", 5, "2026-07-29T00:00:00.000Z")]),
      shardOf("a", [mk("clone-a", 1, "2026-07-29T01:00:00.000Z")]),
    ]);
    expect(merged.records.map((r) => r.cloneId)).toEqual(["clone-b", "clone-a"]);
  });

  test("fork lineage: worktree tokens keep (cloneId, seq) collision-free (BR-4)", () => {
    // A main clone token is never a 12-hex lineage token, so main and fork
    // rows can never share a (cloneId, seq) key.
    const mainTokenArb = singleLine.filter((s) => s.length > 0 && !/^[0-9a-f]{12}$/.test(s));
    fc.assert(
      fc.property(mainTokenArb, fc.array(seqArb, { minLength: 1, maxLength: 6 }), (main, seqs) => {
        const fork = forkLineageCloneId(main, "bolt-x");
        // Same seq space on both sides: uniqueness must come from cloneId.
        const records: JournalEntry[] = seqs.map((_, i) => ({
          schemaVersion: JOURNAL_SCHEMA_VERSION,
          seq: i + 1,
          cloneId: main,
          intentId: "intent",
          timestamp: "2026-07-29T00:00:00.000Z",
          heading: "h",
          event: "E",
          fields: {},
        }));
        const forkRecords: JournalEntry[] = records.map((r) => ({ ...r, cloneId: fork }));
        const merged = mergeShards([shardOf("main-file", [...records, ...forkRecords])]);
        expect(merged.records.length).toBe(records.length * 2);
        expect(merged.duplicatesDropped).toBe(0);
      }),
      { seed: PBT_SEED },
    );
  });

  test("decode errors are reported with positions, never silently dropped (BR-10)", () => {
    const good = serializeJournalEntryV2({
      schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
      eventId: "e",
      seq: 1,
      timestamp: "2026-07-29T00:00:00.000Z",
      eventName: "E",
      attributes: {},
      intentId: "i",
      space: "default",
      cloneId: "c",
      traceId: null,
      spanId: null,
      traceFlags: 0,
      idempotencyKey: "i:c:1",
      canonical: true,
    });
    const merged = mergeShards([{ sourceId: "torn", buffer: `${good}garbage\n` }]);
    expect(merged.records.length).toBe(1);
    expect(merged.decodeErrors).toEqual([{ sourceId: "torn", line: 2, message: expect.stringContaining("not valid JSON") }]);
  });
});

describe("converter — v1 -> v2 (BR-8/BR-9)", () => {
  test("convert -> serialize -> parse round-trips identically", () => {
    fc.assert(
      fc.property(canonicalV1Arb, (entry) => {
        const result = convertV1ToV2(entry);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const back = parseJournalLine(serializeJournalEntryV2(result.entry).slice(0, -1));
        expect(back).toEqual(result.entry);
      }),
      { seed: PBT_SEED },
    );
  });

  test("idempotency key is preserved: original and conversion dedup to one (BR-9)", () => {
    fc.assert(
      fc.property(canonicalV1Arb, (entry) => {
        const result = convertV1ToV2(entry);
        if (!result.ok) throw new Error("expected conversion");
        expect(result.entry.idempotencyKey).toBe(journalEntryId(entry));
        const merged = mergeShards([shardOf("mixed", [entry, result.entry])]);
        expect(merged.records.length).toBe(1);
        expect(merged.duplicatesDropped).toBe(1);
      }),
      { seed: PBT_SEED },
    );
  });

  test("trace/span IDs come from v1 fields or stay null — never synthesized (BR-8)", () => {
    const entry: JournalEntry = {
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      seq: 3,
      cloneId: "c",
      intentId: "i",
      timestamp: "2026-07-29T00:00:00.000Z",
      heading: "h",
      event: "DECISION_RECORDED",
      fields: { Stage: "construction" },
    };
    const plain = convertV1ToV2(entry);
    if (!plain.ok) throw new Error("expected conversion");
    expect(plain.entry.traceId).toBeNull();
    expect(plain.entry.spanId).toBeNull();
    expect(plain.entry.traceFlags).toBe(0);
    const traced = convertV1ToV2({ ...entry, fields: { ...entry.fields, TraceId: "t-1", SpanId: "s-1" } });
    if (!traced.ok) throw new Error("expected conversion");
    expect(traced.entry.traceId).toBe("t-1");
    expect(traced.entry.spanId).toBe("s-1");
    expect(traced.entry.attributes.TraceId).toBe("t-1"); // no-loss: fields verbatim
  });

  test("eventNameFor maps the audit event; the default keeps the v1 name", () => {
    const entry: JournalEntry = {
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      seq: 1,
      cloneId: "c",
      intentId: "i",
      timestamp: "2026-07-29T00:00:00.000Z",
      heading: "h",
      event: "DECISION_RECORDED",
      fields: {},
    };
    const def = convertV1ToV2(entry);
    if (!def.ok) throw new Error("expected conversion");
    expect(def.entry.eventName).toBe("DECISION_RECORDED");
    const mapped = convertV1ToV2(entry, { eventNameFor: (e) => `amadeus.${e.toLowerCase()}` });
    if (!mapped.ok) throw new Error("expected conversion");
    expect(mapped.entry.eventName).toBe("amadeus.decision_recorded");
  });

  test("raw and opaque records are skipped with an explicit reason (BR-9)", () => {
    fc.assert(
      fc.property(rawV1Arb, (entry) => {
        const result = convertV1ToV2(entry);
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.reason).toBe(entry.opaque === true ? "opaque-record" : "raw-record");
        expect(result.message).toContain(journalEntryId(entry));
      }),
      { seed: PBT_SEED },
    );
  });
});

describe("View — human-readable rendering (FR-JRN-5, BR-11/BR-12)", () => {
  test("view output is deterministic and merge-ordered", () => {
    fc.assert(
      fc.property(fc.array(v2EntryArb, { maxLength: 8 }), (records) => {
        const forward = renderJournalView(records);
        const reversed = renderJournalView([...records].reverse());
        expect(forward).toBe(reversed);
      }),
      { seed: PBT_SEED },
    );
  });

  test("view renders the v2 record shape and its attributes", () => {
    const entry: JournalEntryV2 = {
      schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
      eventId: "evt-1",
      seq: 1,
      timestamp: "2026-07-29T00:00:00.000Z",
      eventName: "amadeus.decision.recorded",
      attributes: { Decision: "ship it", Count: 3 },
      intentId: "i",
      space: "default",
      cloneId: "c",
      traceId: "trace-1",
      spanId: null,
      traceFlags: 1,
      idempotencyKey: "i:c:1",
      canonical: true,
    };
    const view = renderJournalView([entry]);
    expect(view).toContain("## amadeus.decision.recorded");
    expect(view).toContain("**TraceId**: trace-1");
    expect(view).toContain("**IdempotencyKey**: i:c:1");
    expect(view).toContain("**Decision**: ship it");
    expect(view).toContain("**Count**: 3");
    expect(view).not.toContain("**SpanId**");
    expect(view).toContain("---");
  });

  test("v1 input is normalized through the converter; raw bodies render verbatim (BR-11)", () => {
    const canonical: JournalEntry = {
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      seq: 1,
      cloneId: "c",
      intentId: "i",
      timestamp: "2026-07-29T00:00:00.000Z",
      heading: "Stage Start",
      event: "STAGE_STARTED",
      fields: { Stage: "construction" },
    };
    const raw: JournalEntry = {
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      seq: 2,
      cloneId: "c",
      intentId: "i",
      timestamp: "2026-07-29T01:00:00.000Z",
      heading: "Note",
      event: null,
      rawBody: "free-form body",
    };
    const view = renderJournalView([raw, canonical]);
    expect(view).toContain("## STAGE_STARTED"); // converted v1 renders as its event name
    expect(view).toContain("**Stage**: construction");
    expect(view).toContain("free-form body");
    expect(view.indexOf("STAGE_STARTED")).toBeLessThan(view.indexOf("free-form body")); // merge order
  });
});

describe("reader-first regression — the live v1 shard fixture decodes whole (FR-JRN-2)", () => {
  test("every line of the checked-in v1 audit sample decodes via the mixed reader", () => {
    const buffer = readFileSync(new URL("../fixtures/audit-sample.jsonl", import.meta.url), "utf-8");
    const records = readJournalRecords(buffer);
    expect(records.length).toBeGreaterThan(0);
    for (const record of records) {
      expect(record.schemaVersion).toBe(JOURNAL_SCHEMA_VERSION);
    }
    // The v1 reader path stays first-class: same buffer, same entries.
    expect(parseJournalShard(buffer)).toEqual(records as JournalEntry[]);
  });
});

describe("patch-gate edge coverage — validator and reader tie-breaks", () => {
  const edgeBase: JournalEntryV2 = {
    schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
    eventId: "evt-edge",
    seq: 1,
    timestamp: "2026-07-29T00:00:00.000Z",
    eventName: "amadeus.session.ended",
    attributes: {},
    intentId: "260729-demo-deadbeef",
    space: "default",
    cloneId: "abc123def456",
    traceId: null,
    spanId: null,
    traceFlags: 0,
    idempotencyKey: "260729-demo-deadbeef:abc123def456:1",
    canonical: true,
  };

  test("serialize rejects a non-JSON attribute value type (isJsonValue default branch)", () => {
    // An attribute value that is neither JSON scalar nor object/array hits
    // isJsonValue's default -> false (journal.ts:211).
    const entry = { ...edgeBase, attributes: { K: BigInt(1) as unknown as string } };
    expect(() => serializeJournalEntryV2(entry)).toThrow(JournalCodecError);
  });

  test("parse rejects a non-integer traceFlags (journal.ts:398-399)", () => {
    expect(() => parseJournalLine(JSON.stringify({ ...edgeBase, traceFlags: 1.5 }))).toThrow(/traceFlags/);
  });

  test("serialize rejects a non-boolean canonical flag (journal.ts:242)", () => {
    const entry = { ...edgeBase, canonical: "yes" as unknown as boolean };
    expect(() => serializeJournalEntryV2(entry)).toThrow(/canonical must be a boolean/);
  });

  test("readJournalRecords wraps a torn line with its 1-based position (journal.ts:483-485)", () => {
    const good = serializeJournalEntryV2(edgeBase);
    const buffer = `${good}{"schemaVersion":2,"broken":true\n${good}`;
    expect(() => readJournalRecords(buffer)).toThrow(/line 2:/);
  });

  test("the View orders exact-key collisions by serialized form (journal.ts:529-531)", () => {
    // Survivors with the same timestamp and the same record key cannot come
    // from mergeShards (one group, one survivor), but the View sorts any
    // array — same timestamp + same idempotency key, differing only in body,
    // so the serialized form decides (compareJournalRecords tie-break).
    const a = { ...edgeBase, idempotencyKey: "k1", attributes: { k: "a" } };
    const b = { ...edgeBase, idempotencyKey: "k1", attributes: { k: "b" } };
    const view = renderJournalView([b, a]);
    // a's serialized form is strictly smaller (fewer attributes collate first),
    // so the View must render a's block before b's.
    expect(view.indexOf("**k**: a")).toBeLessThan(view.indexOf("**k**: b"));
  });
});
