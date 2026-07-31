// covers: tools:amadeus-audit, tools:amadeus-state, otel:audit-emit
//
// [migration-equivalence] — the evidence for the migration's own claim.
//
// The claim a call-site migration makes is not "the row still gets written".
// It is that the row a MIGRATED site writes carries the SAME AUDIT CONTENT the
// legacy writer's row carried: same audit event type, same field set, same
// values, same ledger. A migration that silently dropped a field, or wrote to
// whatever the active cursor happened to be, still produces a row — and every
// "was it appended?" assertion in the suite stays green while the audit trail
// quietly loses information.
//
// So the assertions below compare CONTENT, not liveness, and they compare it
// against the legacy writer's own output in the same process:
//
//   legacy:    recorded rows          -> schema v1 row { event, fields }
//   migrated:  emitAuditEvent(...)    -> schema v2 row { eventName, attributes }
//
// normalizeAuditRecord puts both into one view, so `event` and `fields` are
// directly comparable. The v2 row additionally carries an `Event` attribute —
// the audit type relocated so legacy readers keep finding it — which the
// normaliser lifts back out; that lifting is itself pinned below, because if it
// silently stopped happening every field-set comparison here would gain a
// phantom key and these tests would be comparing the wrong thing.
//
// THE LEGACY SIDE IS NOW A FIXTURE. It used to be driven live, next to the
// migrated one, while the legacy writer was still in the tree. The writer has
// since been deleted (FR-MIG-5 / U8), so the legacy rows come from
// tests/harness/legacy-audit-rows.ts — recorded off the real writer at the last
// commit that had it, through this same normaliser. That is what the original
// note here anticipated: "the recorded expectations become the fixture that
// outlives it".
//
// WHY THIS IS NOT CIRCULAR. Neither side is computed from the other. The
// migrated row is measured live on every run; the legacy row is a recording
// that nothing in this repository can regenerate, so it cannot drift toward the
// implementation it is judging.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { auditFilePath, birthIntent } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { emitAuditEvent } from "../../dist/claude/.claude/otel/audit-emit.ts";
import { auditRowsFrom, normalizeAuditRecord, type NormalizedAuditRecord } from "../harness/audit-records.ts";
import { LEGACY_AUDIT_ROWS, type LegacyAuditRow } from "../harness/legacy-audit-rows.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetOtelPerProject();
});
afterEach(() => {
  cleanupTestProject(proj);
});

// The audit content a caller actually supplied: the field bag minus the Event
// carrier. Comparing this rather than raw `fields` is what makes a v1 row and a
// v2 row of the same emit directly comparable.
function auditContent(row: NormalizedAuditRecord): Record<string, string> {
  const { Event: _carrier, ...content } = row.fields;
  return content;
}

function rowsFor(intent: string, event: string): NormalizedAuditRecord[] {
  // An intent that was never emitted into has no shard on disk yet. That is
  // zero rows — which is exactly what the leak assertion wants to read — so it
  // must not surface as ENOENT.
  const path = auditFilePath(proj, intent, "default");
  if (!existsSync(path)) return [];
  return auditRowsFrom(readFileSync(path, "utf-8")).filter((r) => r.event === event);
}

// One recorded case: the legacy row as the writer produced it, and the row the
// canonical path produces NOW from the same inputs.
function bothWays(caseName: string): { legacy: LegacyAuditRow["legacy"]; migrated: NormalizedAuditRecord } {
  const recorded = LEGACY_AUDIT_ROWS[caseName];
  if (recorded === undefined) throw new Error(`no recorded legacy row for ${caseName}`);
  const { event, fields } = recorded.input;

  const migratedIntent = birthIntent(proj, "equiv-migrated", "default", "feature").dirName;
  emitAuditEvent(event, fields, proj, migratedIntent, "default");

  const migrated = rowsFor(migratedIntent, event);
  expect(migrated.length).toBe(1);
  return { legacy: recorded.legacy, migrated: migrated[0] as NormalizedAuditRecord };
}

// The inputs a case was recorded with, so an assertion can still name what the
// caller passed rather than only what the two writers agreed on.
function inputsFor(caseName: string): Record<string, string> {
  const recorded = LEGACY_AUDIT_ROWS[caseName];
  if (recorded === undefined) throw new Error(`no recorded legacy row for ${caseName}`);
  return recorded.input.fields;
}

describe("[migration-equivalence] a migrated row carries the legacy row's audit content", () => {
  // A plain event: every field required, nothing conditional.
  test("AUDIT_MERGED — identical event type and field set", () => {
    const { legacy, migrated } = bothWays("AUDIT_MERGED");

    expect(migrated.event).toBe(legacy.event);
    expect(auditContent(migrated)).toEqual(legacy.fields);
    // ...and both equal what the caller actually passed, so a mutation applied
    // to the canonical path could not hide behind a recording of itself.
    expect(auditContent(migrated)).toEqual(inputsFor("AUDIT_MERGED"));
  });

  // The case the registry sweep existed for: an optional attribute present.
  test("AUDIT_FORKED with Reentrant — an OPTIONAL attribute survives the emit", () => {
    const { legacy, migrated } = bothWays("AUDIT_FORKED_reentrant");

    expect(auditContent(migrated)).toEqual(legacy.fields);
    // Named explicitly: redaction is default-deny, and `Reentrant` only clears
    // it because the registry declares it optional and the policy's safe keys
    // are derived from required + optional. A registry edit that dropped it
    // would land here rather than in a silently thinner audit trail.
    expect(auditContent(migrated).Reentrant).toBe("true");
  });

  // The same event WITHOUT the optional attribute: absence stays absence.
  test("AUDIT_FORKED without Reentrant — no phantom key appears", () => {
    const { legacy, migrated } = bothWays("AUDIT_FORKED_plain");

    expect(auditContent(migrated)).toEqual(legacy.fields);
    expect("Reentrant" in auditContent(migrated)).toBe(false);
  });

  // The delegation events, whose conditional keys were the reason these sites
  // could not migrate until required/optional was re-drawn.
  test("DELEGATED_APPROVAL under a standing grant — no User Input, still equivalent", () => {
    const { legacy, migrated } = bothWays("DELEGATED_APPROVAL_standing_grant");

    expect(auditContent(migrated)).toEqual(legacy.fields);
    expect("User Input" in auditContent(migrated)).toBe(false);
    expect(auditContent(migrated)["Grant Id"]).toBe("grant-0001");
  });

  test("DELEGATED_REJECTION with Feedback — the optional key round-trips", () => {
    const { legacy, migrated } = bothWays("DELEGATED_REJECTION_feedback");

    expect(auditContent(migrated)).toEqual(legacy.fields);
    expect(auditContent(migrated).Feedback).toBe("needs a falling proof");
  });
});

describe("[migration-equivalence] the human-readable heading survives the migration", () => {
  // A v1 row carries `heading` as prose ("Audit Merged"); a v2 row carries the
  // OTel `eventName` instead. The heading is not decoration — readers and
  // migrated .sh-era assertions group on it — so the normalised view resolves it
  // from the same EVENT_HEADINGS table the legacy writer stamped, rather than
  // handing back the OTel name and quietly changing what the field means.
  test("a migrated row reports the same heading string as the legacy row", () => {
    const { legacy, migrated } = bothWays("AUDIT_MERGED_heading");

    expect(legacy.heading).toBe("Audit Merged");
    expect(migrated.heading).toBe(legacy.heading);
  });

  test("an eventName outside the table falls back to the name rather than empty", () => {
    // Defensive: an unmapped canonical name must not normalise to "" or
    // undefined, which would read as "this row has no heading" instead of
    // "this heading is not in the table".
    expect(normalizeAuditRecord({ schemaVersion: 2, eventName: "amadeus.not.registered", attributes: {} }).heading)
      .toBe("amadeus.not.registered");
  });
});

describe("[migration-equivalence] the migrated row lands in the TARGET ledger", () => {
  // Equivalence of content is only half of it. A targeted site's whole
  // correctness is WHICH ledger the row joins — and getting that wrong does not
  // throw, it misfiles. So: two live intents, emit at one, assert the other is
  // untouched.
  test("a targeted emit does not leak into the other intent's ledger", () => {
    const target = birthIntent(proj, "equiv-target", "default", "feature").dirName;
    const bystander = birthIntent(proj, "equiv-bystander", "default", "feature").dirName;

    emitAuditEvent(
      "DELEGATED_APPROVAL",
      {
        Stage: "code-generation",
        "Issuer Space": "default",
        "Issuer Intent": bystander,
        "Issuer Shard": "issuer.jsonl",
        "Issuer Human Ts": "2026-07-31T00:00:00Z",
      },
      proj,
      target,
      "default"
    );

    expect(rowsFor(target, "DELEGATED_APPROVAL").length).toBe(1);
    expect(rowsFor(bystander, "DELEGATED_APPROVAL").length).toBe(0);
    // The row claims the target as its own intent, not merely lands in its file.
    expect(String(rowsFor(target, "DELEGATED_APPROVAL")[0]?.intentId)).toBe(target);
  });
});

describe("[migration-equivalence] the Event carrier is where the readers expect it", () => {
  // The comparisons above strip `Event` because it is a carrier rather than a
  // caller-supplied field. That is only sound while the carrier is genuinely
  // present and genuinely carries the audit type — if the exporter stopped
  // writing it, the legacy readers would go blind and auditContent() would be
  // stripping nothing. So the relocation is pinned directly.
  test("the v2 row carries the audit type as an Event attribute, and the view reads it back", () => {
    const intent = birthIntent(proj, "equiv-carrier", "default", "feature").dirName;
    const fields = {
      "Bolt slug": "bolt-otel-migrate-g2",
      "Entries Merged": "1",
      "Source Audit Hash": "d".repeat(64),
      "Fork Boundary": "0",
    };
    emitAuditEvent("AUDIT_MERGED", fields, proj, intent, "default");

    const raw = readFileSync(auditFilePath(proj, intent, "default"), "utf-8")
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((l) => JSON.parse(l) as Record<string, unknown>)
      .find((r) => r.eventName === "amadeus.audit.merged");
    expect(raw).toBeDefined();
    if (!raw) throw new Error("no canonical AUDIT_MERGED row");
    expect((raw.attributes as Record<string, string>).Event).toBe("AUDIT_MERGED");

    const normalised = rowsFor(intent, "AUDIT_MERGED")[0] as NormalizedAuditRecord;
    expect(normalised.event).toBe("AUDIT_MERGED");
    // Present in the field bag (the canonical normaliser leaves it there) and
    // stripped by the content view — the two halves of the declared difference.
    expect(normalised.fields.Event).toBe("AUDIT_MERGED");
    expect(auditContent(normalised)).toEqual(fields);
  });
});
