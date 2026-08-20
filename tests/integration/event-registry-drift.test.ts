// covers: otel:event-registry otel:event-registry-drift file:tools/amadeus-journal.ts
//
// VER-1 drift guard, layer 2 (integration test). Asserts the registry-backed
// four-set equality of FR-EVT-1 against the SHIPPED bytes (dist/claude/.claude),
// with the canonical cardinality pinned so vacuous equality fails:
//   (a) state machine + hooks reference set == (b) canonical registry set
//   (c) AuditLogExporter accept set == (b), exercised functionally per event
//   (d) journal reader decode set — the v1 reader is open (accepts any event
//       name), so the interim assertion is that it decodes every canonical
//       event; closed-set equality activates when the U3 codec table lands
//       (collectDriftSets returns journalReaderUnderstood: null until then).
// Layer 1 (compile-time) is the RegisteredEventName union — `bun run
// typecheck` covers it; layer 3 is the amadeus-event-registry-drift sensor,
// which runs the same extraction via collectDriftSets/findRegistryDrift.

import { describe, expect, test } from "bun:test";
import {
  collectDriftSets,
  findRegistryDrift,
} from "../../dist/claude/.claude/otel/event-registry-drift.ts";
import {
  assertRegistryConsistent,
  canonicalAuditEvents,
  EXCEPTION_SPAN_EVENT_NAME,
  EXPECTED_CANONICAL_COUNT,
  getEventDef,
  getEventDefByAuditEvent,
  REGISTERED_EVENTS,
} from "../../dist/claude/.claude/otel/event-registry.ts";
import {
  JOURNAL_SCHEMA_VERSION,
  parseJournalLine,
  serializeJournalEntry,
} from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import { isJournalEntryV2 } from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import { createAuditLogExporter } from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import { AMADEUS_SRC } from "../harness/fixtures.ts";

const SETS = collectDriftSets(AMADEUS_SRC);

describe("registry internal consistency (VER-1)", () => {
  test("assertRegistryConsistent passes on the shipped registry", () => {
    expect(() => assertRegistryConsistent()).not.toThrow();
  });

  test("canonical cardinality is pinned at 98 (waiting-interruption RFC-0001 FR-3/ADR-4) — vacuous equality banned", () => {
    expect(EXPECTED_CANONICAL_COUNT).toBe(98);
    expect(canonicalAuditEvents().length).toBe(98);
    expect(SETS.registryCanonical.size).toBe(98);
    expect(SETS.stateMachineReferences.size).toBe(98);
  });

  test("canonical defs always map to the audit journal; telemetry defs never do (FR-EXP-4)", () => {
    for (const def of REGISTERED_EVENTS) {
      if (def.durability === "canonical") {
        expect(def.auditEvent, `${def.name} canonical without audit mapping`).not.toBeNull();
        expect(def.category, `${def.name} canonical with telemetry category`).not.toBe("telemetry");
      } else {
        expect(def.auditEvent, `${def.name} telemetry mapped to the journal`).toBeNull();
      }
    }
  });

  test("schema versions are pinned at 1 — a version change must land with a reader migration (BR-5)", () => {
    for (const def of REGISTERED_EVENTS) {
      expect(def.schemaVersion, `${def.name} schemaVersion`).toBe(1);
    }
  });
});

describe("four-set equality (FR-EVT-1)", () => {
  test("no drift findings on the shipped tree: (a)==(b)==vocabulary, (c) derived", () => {
    expect(findRegistryDrift(SETS)).toEqual([]);
  });

  test("(b) canonical registry supplies the vocabulary used by the reference scan", () => {
    expect([...SETS.registryCanonical].sort()).toEqual([...canonicalAuditEvents()].sort());
  });

  test("(a) every canonical event is referenced by state machine code or hooks (no writer-only events, BR-6)", () => {
    const missing = [...SETS.registryCanonical].filter((e) => !SETS.stateMachineReferences.has(e));
    expect(missing, `canonical events with no tools/+hooks/ reference: ${missing.join(", ")}`).toEqual([]);
  });

  test("(c) the AuditLogExporter accepts every canonical event and appends it as its v1 type", () => {
    const appended: string[] = [];
    const exporter = createAuditLogExporter({
      projectDir: "/nonexistent",
      append: (record) => {
        // U4 seam: the exporter hands over the canonical record; map back to
        // the v1 audit event name to compare against the vocabulary set.
        appended.push(getEventDef(record.eventName).auditEvent as string);
      },
    });
    for (const def of REGISTERED_EVENTS) {
      if (def.durability !== "canonical") continue;
      exporter.exportCanonicalEvent({
        schemaVersion: 2, // v2 codec persistence (BR-13)
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        eventName: def.name,
        // The accept set validates registry-required attributes (BR-10), so
        // the fixture supplies every one of them.
        attributes: Object.fromEntries(def.requiredAttributes.map((key) => [key, "x"])),
        intentId: "intent",
        space: "default",
        cloneId: "clone",
        traceId: null,
        spanId: null,
        traceFlags: 0,
        idempotencyKey: crypto.randomUUID(),
        durability: "canonical",
      });
    }
    expect([...new Set(appended)].sort()).toEqual([...SETS.registryCanonical].sort());
  });

  test("(d) interim: the v1 journal reader decodes every canonical event (full equality at U3)", () => {
    expect(SETS.journalReaderUnderstood).toBeNull(); // U3 codec table not landed yet
    for (const auditEvent of SETS.registryCanonical) {
      const lineOut = serializeJournalEntry({
        schemaVersion: JOURNAL_SCHEMA_VERSION,
        cloneId: "abc123def456",
        intentId: "intent",
        seq: 1,
        timestamp: "2026-07-29T10:00:00Z",
        heading: auditEvent,
        event: auditEvent,
        fields: {},
      });
      const parsed = parseJournalLine(lineOut);
      expect(isJournalEntryV2(parsed)).toBe(false);
      if (!isJournalEntryV2(parsed)) expect(parsed.event).toBe(auditEvent);
    }
  });
});

describe("drift rejection (VER-3: the guard must actually refuse)", () => {
  test("a canonical event missing from the registry is a finding naming the event", () => {
    const tampered = { ...SETS, registryCanonical: new Set([...SETS.registryCanonical].slice(1)) };
    const findings = findRegistryDrift(tampered);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.join("\n")).toContain("cardinality");
  });

  test("an emptied vocabulary fails on cardinality instead of passing vacuously", () => {
    const tampered = { ...SETS, registryCanonical: new Set<string>() };
    expect(findRegistryDrift(tampered).join("\n")).toContain("cardinality");
  });

  test("an unreferenced canonical event (writer-only, BR-6) is a finding", () => {
    const tampered = { ...SETS, stateMachineReferences: new Set([...SETS.stateMachineReferences].slice(1)) };
    expect(findRegistryDrift(tampered).length).toBeGreaterThan(0);
  });

  test("an unregistered name throws at runtime lookup (backstop for non-typed callers, BR-2)", () => {
    expect(() => getEventDef("amadeus.no.such.event" as never)).toThrow(/unregistered/);
    expect(() => getEventDefByAuditEvent("NO_SUCH_EVENT")).toThrow(/unmapped/);
  });

  test("every registry name resolves back through getEventDef (RegisteredEventName union covers the table)", () => {
    for (const def of REGISTERED_EVENTS) {
      expect(getEventDef(def.name).name).toBe(def.name);
    }
  });
});

describe("FR-EVT-7 — the exception span event is telemetry", () => {
  test("the exception span event is registered as telemetry with no audit mapping", () => {
    const def = getEventDef(EXCEPTION_SPAN_EVENT_NAME);
    expect(def.name).toBe("exception");
    expect(def.durability).toBe("telemetry");
    expect(def.auditEvent).toBeNull();
    expect(def.category).toBe("telemetry");
  });

  test("the canonical failure event amadeus.operation.failed maps to ERROR_LOGGED (FR-EVT-7)", () => {
    const def = getEventDef("amadeus.operation.failed");
    expect(def.durability).toBe("canonical");
    expect(def.auditEvent).toBe("ERROR_LOGGED");
  });
});

describe("patch-gate edge coverage — vocabulary extraction and journal-reader set", () => {
  test("collectDriftSets remains registry-backed when the audit tool has no copied vocabulary", () => {
    expect(SETS.registryCanonical.size).toBe(EXPECTED_CANONICAL_COUNT);
    expect(SETS.stateMachineReferences.size).toBe(EXPECTED_CANONICAL_COUNT);
  });

  test("a tampered journal-reader decode set is a finding naming the set (drift.ts:147-148)", () => {
    // In this branch the journal-reader set is null (it activates when U3's
    // codec lands). Drive the guarded branch with a synthetic non-null set
    // that is missing one canonical event.
    const tampered = {
      ...SETS,
      journalReaderUnderstood: new Set([...SETS.registryCanonical].slice(1)),
    };
    expect(findRegistryDrift(tampered).join("\n")).toContain("journal reader decode");
  });
});
