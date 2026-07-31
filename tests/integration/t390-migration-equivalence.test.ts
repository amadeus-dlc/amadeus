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
//   legacy:    appendAuditEntry(...)  -> schema v1 row { event, fields }
//   migrated:  emitAuditEvent(...)    -> schema v2 row { eventName, attributes }
//
// normalizeAuditRecord puts both into one view, so `event` and `fields` are
// directly comparable. The v2 row additionally carries an `Event` attribute —
// the audit type relocated so legacy readers keep finding it — which the
// normaliser lifts back out; that lifting is itself pinned below, because if it
// silently stopped happening every field-set comparison here would gain a
// phantom key and these tests would be comparing the wrong thing.
//
// WHY THIS IS NOT CIRCULAR. Both sides are driven from the same inputs and
// compared field-for-field, but neither side is computed from the other: the
// legacy row comes from the legacy writer that is still present, and the
// migrated row from the canonical emit path. When the legacy writer is deleted,
// the recorded expectations here become the fixture that outlives it.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { appendAuditEntry } from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import { auditFilePath, birthIntent } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { emitAuditEvent } from "../../dist/claude/.claude/otel/audit-emit.ts";
import { auditRowsFrom, type NormalizedAuditRecord } from "../harness/audit-records.ts";
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

// One event's worth of audit content, written BOTH ways into two intents that
// differ only in which writer produced the row.
function bothWays(
  event: string,
  fields: Record<string, string>
): { legacy: NormalizedAuditRecord; migrated: NormalizedAuditRecord } {
  const legacyIntent = birthIntent(proj, "equiv-legacy", "default", "feature").dirName;
  const migratedIntent = birthIntent(proj, "equiv-migrated", "default", "feature").dirName;

  appendAuditEntry(event, fields, proj, legacyIntent, "default");
  emitAuditEvent(event, fields, proj, migratedIntent, "default");

  const legacy = rowsFor(legacyIntent, event);
  const migrated = rowsFor(migratedIntent, event);
  expect(legacy.length).toBe(1);
  expect(migrated.length).toBe(1);
  return { legacy: legacy[0] as NormalizedAuditRecord, migrated: migrated[0] as NormalizedAuditRecord };
}

describe("[migration-equivalence] a migrated row carries the legacy row's audit content", () => {
  // A plain event: every field required, nothing conditional.
  test("AUDIT_MERGED — identical event type and field set", () => {
    const fields = {
      "Bolt slug": "bolt-otel-migrate-g2",
      "Entries Merged": "3",
      "Source Audit Hash": "a".repeat(64),
      "Fork Boundary": "2",
    };
    const { legacy, migrated } = bothWays("AUDIT_MERGED", fields);

    expect(migrated.event).toBe(legacy.event);
    expect(auditContent(migrated)).toEqual(auditContent(legacy));
    // ...and both equal what the caller actually passed, so a mutation applied
    // to BOTH writers could not hide inside a legacy-vs-migrated comparison.
    expect(auditContent(migrated)).toEqual(fields);
  });

  // The case the registry sweep existed for: an optional attribute present.
  test("AUDIT_FORKED with Reentrant — an OPTIONAL attribute survives the emit", () => {
    const fields = {
      "Bolt slug": "bolt-otel-migrate-g2",
      "Source Audit Hash": "b".repeat(64),
      "Fork Boundary": "2",
      Reentrant: "true",
    };
    const { legacy, migrated } = bothWays("AUDIT_FORKED", fields);

    expect(auditContent(migrated)).toEqual(auditContent(legacy));
    // Named explicitly: redaction is default-deny, and `Reentrant` only clears
    // it because the registry declares it optional and the policy's safe keys
    // are derived from required + optional. A registry edit that dropped it
    // would land here rather than in a silently thinner audit trail.
    expect(auditContent(migrated).Reentrant).toBe("true");
  });

  // The same event WITHOUT the optional attribute: absence stays absence.
  test("AUDIT_FORKED without Reentrant — no phantom key appears", () => {
    const fields = {
      "Bolt slug": "bolt-otel-migrate-g2",
      "Source Audit Hash": "c".repeat(64),
      "Fork Boundary": "0",
    };
    const { legacy, migrated } = bothWays("AUDIT_FORKED", fields);

    expect(auditContent(migrated)).toEqual(auditContent(legacy));
    expect("Reentrant" in auditContent(migrated)).toBe(false);
  });

  // The delegation events, whose conditional keys were the reason these sites
  // could not migrate until required/optional was re-drawn.
  test("DELEGATED_APPROVAL under a standing grant — no User Input, still equivalent", () => {
    const fields = {
      Stage: "code-generation",
      "Issuer Space": "default",
      "Issuer Intent": "260729-otel-upstream",
      "Issuer Shard": "issuer.jsonl",
      "Issuer Human Ts": "2026-07-31T00:00:00Z",
      "Grant Id": "grant-0001",
    };
    const { legacy, migrated } = bothWays("DELEGATED_APPROVAL", fields);

    expect(auditContent(migrated)).toEqual(auditContent(legacy));
    expect("User Input" in auditContent(migrated)).toBe(false);
    expect(auditContent(migrated)["Grant Id"]).toBe("grant-0001");
  });

  test("DELEGATED_REJECTION with Feedback — the optional key round-trips", () => {
    const fields = {
      Stage: "code-generation",
      "Issuer Space": "default",
      "Issuer Intent": "260729-otel-upstream",
      "Issuer Shard": "issuer.jsonl",
      "Issuer Human Ts": "2026-07-31T00:00:00Z",
      Feedback: "needs a falling proof",
    };
    const { legacy, migrated } = bothWays("DELEGATED_REJECTION", fields);

    expect(auditContent(migrated)).toEqual(auditContent(legacy));
    expect(auditContent(migrated).Feedback).toBe("needs a falling proof");
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
