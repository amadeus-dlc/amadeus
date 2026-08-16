// covers: audit:WORKFLOW_WAITING_ENTERED, audit:WORKFLOW_WAITING_RESUMED
// size: small
//
// RFC-0001 ADR-4 — waiting gets its OWN audit markers, and they are markers
// only.
//
// The three terminals (park / waiting / REPAIR_STALLED) have to be told apart
// after the fact, which is why waiting does not reuse WORKFLOW_PARKED. But the
// markers are not where the cause lives: they carry the identifiers that point
// at the Intent autonomy transaction holding it, and nothing of variable width.
// If a marker could carry the outcome, two records of the same waiting entry
// would exist and could disagree — the ledger is the truth, the marker is a
// projection of it.
//
// Adding a canonical event name means adding it to four sets at once (writer
// vocabulary, heading table, typed registry, the documented registry) plus the
// two count pins; this file asserts the registry half, and t28 / t81 /
// event-registry-drift assert the equality of the sets.

import { describe, expect, test } from "bun:test";
import { EVENT_HEADINGS } from "../../packages/framework/core/tools/amadeus-audit.ts";
import {
  canonicalAuditEvents,
  getEventDefByAuditEvent,
} from "../../packages/framework/core/otel/event-registry.ts";

const ENTERED = "WORKFLOW_WAITING_ENTERED";
const RESUMED = "WORKFLOW_WAITING_RESUMED";

describe("t1241 the waiting markers are registered", () => {
  test("both are canonical audit events", () => {
    const canonical = canonicalAuditEvents();
    expect(canonical).toContain(ENTERED);
    expect(canonical).toContain(RESUMED);
  });

  test("both carry a human-readable heading", () => {
    expect(EVENT_HEADINGS[ENTERED]).toBe("Workflow Waiting Entered");
    expect(EVENT_HEADINGS[RESUMED]).toBe("Workflow Waiting Resumed");
  });

  test("both are workflow-lifecycle events written to the journal", () => {
    for (const event of [ENTERED, RESUMED]) {
      const def = getEventDefByAuditEvent(event);
      expect(def.category).toBe("workflow-lifecycle");
      expect(def.durability).toBe("canonical");
      expect(def.schemaVersion).toBe(1);
    }
  });
});

describe("t1241 the markers carry identifiers, not the cause (R-7d)", () => {
  test("entered names the ruling point and the transaction that holds the cause", () => {
    const def = getEventDefByAuditEvent(ENTERED);
    expect([...def.requiredAttributes]).toEqual(["Stage", "Occurrence Id", "Basis Fingerprint", "Transaction Id"]);
    expect([...def.optionalAttributes]).toEqual(["Timestamp"]);
  });

  test("resumed names the transaction it closes", () => {
    const def = getEventDefByAuditEvent(RESUMED);
    expect([...def.requiredAttributes]).toEqual(["Stage", "Transaction Id"]);
    expect([...def.optionalAttributes]).toEqual(["Timestamp"]);
  });

  // The variable-width half of the cause belongs to the ledger. An attribute
  // slot for any of it here would be a second, divergeable copy.
  test("neither marker has a slot for the cause payload", () => {
    for (const event of [ENTERED, RESUMED]) {
      const def = getEventDefByAuditEvent(event);
      const attributes = [...def.requiredAttributes, ...def.optionalAttributes];
      for (const forbidden of ["Outcome", "Candidates", "Derivation Transcript", "Interactivity Basis"]) {
        expect(attributes).not.toContain(forbidden);
      }
    }
  });
});
