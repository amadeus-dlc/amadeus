// event-registry.ts — the typed Event Registry, U1 minimal representative set.
//
// U1 registers ONLY the events the walking skeleton wires end-to-end (the
// amadeus-log decision/answer pair, the session-end hook event, and one
// telemetry-classified diagnostic to pin the canonical/telemetry split).
// The full 78-vocabulary registry and the four-set drift guard are U2
// (FR-EVT-1, VER-1). Every canonical name maps to the EXISTING v1 audit
// event vocabulary so the current readers understand the records unchanged.

export type Durability = "canonical" | "telemetry";

export type EventDef = {
  // OTel event name (Registry-registered).
  readonly name: string;
  // The v1 audit event type a canonical record is appended as. null for
  // telemetry — telemetry records NEVER reach the audit journal (FR-EXP-4).
  readonly auditEvent: string | null;
  readonly durability: Durability;
  readonly requiredAttributes: readonly string[];
  readonly schemaVersion: number;
};

export const REGISTERED_EVENTS: readonly EventDef[] = [
  {
    name: "amadeus.decision.recorded",
    auditEvent: "DECISION_RECORDED",
    durability: "canonical",
    requiredAttributes: ["Stage", "Decision"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.question.answered",
    auditEvent: "QUESTION_ANSWERED",
    durability: "canonical",
    requiredAttributes: ["Stage", "Details"],
    schemaVersion: 1,
  },
  {
    name: "amadeus.session.ended",
    auditEvent: "SESSION_ENDED",
    durability: "canonical",
    requiredAttributes: [],
    schemaVersion: 1,
  },
  {
    name: "amadeus.diagnostic.note",
    auditEvent: null,
    durability: "telemetry",
    requiredAttributes: [],
    schemaVersion: 1,
  },
];

export type RegisteredEventName =
  | "amadeus.decision.recorded"
  | "amadeus.question.answered"
  | "amadeus.session.ended"
  | "amadeus.diagnostic.note";

// Registry lookup. An unregistered name is an INVARIANT violation (the caller
// emitted outside the registered vocabulary), not a write failure — it throws
// without touching the fatal latch.
export function getEventDef(name: string): EventDef {
  const def = REGISTERED_EVENTS.find((d) => d.name === name);
  if (def === undefined) {
    throw new Error(`unregistered event name: ${name} — invariant violation (FR-EVT-1 minimal set)`);
  }
  return def;
}

// Minimal self-consistency (U2 grows this into the four-set drift guard):
// names unique, durability consistent with the auditEvent mapping.
export function assertRegistryConsistent(): void {
  const seen = new Set<string>();
  for (const def of REGISTERED_EVENTS) {
    if (seen.has(def.name)) {
      throw new Error(`duplicate event name in registry: ${def.name}`);
    }
    seen.add(def.name);
    if (def.durability === "canonical" && def.auditEvent === null) {
      throw new Error(`canonical event without an audit mapping: ${def.name}`);
    }
    if (def.durability === "telemetry" && def.auditEvent !== null) {
      throw new Error(`telemetry event mapped to the audit journal: ${def.name}`);
    }
  }
}
