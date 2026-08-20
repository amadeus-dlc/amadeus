// covers: tools:amadeus-audit
//
// G2 — the general audit CLI's `append` entry validates the event vocabulary at
// the ENTRY, against the OTel event registry.
//
// WHY THE ENTRY AND NOT THE WRITER. The vocabulary check exists today, but it
// lives inside appendAuditEntry and consults the canonical Event Registry — the
// LEGACY writer, which the legacy-writer-removal Bolt deletes. A guard that
// lives only in the code being deleted is a guard with a scheduled expiry: once
// the CLI reaches the canonical path, an unregistered event would travel to
// emitEvent's registry lookup and surface as a drift-guard throw from deep
// inside the emit rather than as the CLI's own readable rejection.
//
// So this pins the guard to the registry, at the entry, independently of which
// writer is behind it. The registry is the single vocabulary of record; the
// legacy set is a copy that goes away.
//
// SCOPE. Vocabulary only. The required-ATTRIBUTE half of the same CLI-entry
// validation is NOT here: the registry's requiredAttributes are being reshaped
// (required narrowed, optionalAttributes introduced) in the parallel registry
// Bolt, and validating against today's sets would reject appends that are legal
// after it lands — measurably so, since two existing CLI-append tests pass
// field sets today's requiredAttributes would reject (t18 WORKFLOW_STARTED
// {Scope} lacks "Request"; t111 GATE_APPROVED {Stage} lacks "User Input").

import { describe, expect, test } from "bun:test";
import {
  missingRequiredRejection,
  unregisteredEventRejection,
} from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import { REGISTERED_EVENTS } from "../../dist/claude/.claude/otel/event-registry.ts";

// The canonical audit vocabulary, taken from the registry rather than restated
// here — a restated list is a second copy that drifts.
const CANONICAL_AUDIT_EVENTS: string[] = REGISTERED_EVENTS.filter(
  (def) => def.durability === "canonical" && def.auditEvent !== null
).map((def) => def.auditEvent as string);

describe("the CLI append entry's vocabulary guard is registry-sourced", () => {
  test("accepts every canonical audit event in the registry", () => {
    expect(CANONICAL_AUDIT_EVENTS.length).toBeGreaterThan(0);
    const rejected = CANONICAL_AUDIT_EVENTS.filter(
      (eventType) => unregisteredEventRejection(eventType) !== null
    );
    expect(rejected).toEqual([]);
  });

  test("rejects an unregistered event with a readable, naming error", () => {
    const rejection = unregisteredEventRejection("WRONG");
    expect(rejection).not.toBeNull();
    // Names the offending value and states the accepted vocabulary — the shape
    // the CLI's existing invalid-event contract already surfaces (t111).
    expect(rejection).toMatch(/Invalid event type: WRONG\. Must be one of:/);
  });

  test("rejects a telemetry event name: telemetry never reaches the audit journal", () => {
    // Telemetry defs carry auditEvent: null, so their OTel NAME is the only
    // string a caller could try to smuggle through the audit CLI.
    const telemetry = REGISTERED_EVENTS.filter((def) => def.durability === "telemetry");
    expect(telemetry.length).toBeGreaterThan(0);
    for (const def of telemetry) {
      expect(unregisteredEventRejection(def.name)).not.toBeNull();
    }
  });
});

describe("the CLI append entry rejects a field set missing required attributes", () => {
  // The canonical path already fails closed on this (emitEvent throws), but it
  // throws in the registry's OTel vocabulary — "amadeus.workflow.started" — and
  // from inside the emit. Checking at the entry lets the CLI name the event the
  // CALLER used and list what is missing.
  test("names the event and every missing attribute", () => {
    const rejection = missingRequiredRejection("WORKFLOW_STARTED", { Scope: "feature" });
    expect(rejection).not.toBeNull();
    expect(rejection).toContain("WORKFLOW_STARTED");
    // The missing list names Request and ONLY Request — Scope was supplied.
    // Asserted on the missing clause alone: the message also states the full
    // required set, where Scope legitimately appears.
    const missingClause = (rejection ?? "").split("Required:")[0];
    expect(missingClause).toContain("Request");
    expect(missingClause).not.toContain("Scope");
  });

  test("accepts a complete field set", () => {
    expect(
      missingRequiredRejection("WORKFLOW_STARTED", { Scope: "feature", Request: "/amadeus feature" })
    ).toBeNull();
  });

  test("optional attributes are not required — the registry sweep's whole point", () => {
    // Each of these carries an optionalAttributes entry that used to sit in
    // requiredAttributes, and each has a production emitter that omits it:
    // a standing-grant delegation has no User Input, a rejection may carry no
    // Feedback, and an initial (non-reentrant) fork has no Reentrant tag.
    expect(
      missingRequiredRejection("DELEGATED_APPROVAL", {
        Stage: "code-generation",
        "Issuer Space": "default",
        "Issuer Intent": "260729-otel-upstream",
        "Issuer Shard": "shard.jsonl",
        "Issuer Human Ts": "2026-07-31T00:00:00Z",
      })
    ).toBeNull();
    expect(
      missingRequiredRejection("AUDIT_FORKED", {
        "Bolt slug": "bolt-otel-migrate-g2",
        "Source Audit Hash": "0".repeat(64),
        "Fork Boundary": "0",
      })
    ).toBeNull();
  });

  test("an unregistered event is the vocabulary guard's business, not this one", () => {
    // Kept separate so a caller sees ONE readable reason, not a required-attribute
    // complaint about an event that does not exist.
    expect(missingRequiredRejection("WRONG", {})).toBeNull();
  });
});
