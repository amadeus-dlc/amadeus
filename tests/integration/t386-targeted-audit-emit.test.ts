// covers: otel:audit-emit
//
// G2 (targeting call-site migration) — the TARGETED canonical audit emit seam.
//
// The migration Adapter refuses per-call intent/space (E-U7CG-Q3A) because at
// U7 the canonical path had no way to honour it. E-U8PRE O-T1 added that way:
// emitEvent's `target` drives BOTH the shard the row lands in and the row's own
// identity. This seam is the one place that pairing is expressed, so the ~11
// targeting call sites migrated in G2 cannot each re-derive it (and each get it
// subtly wrong).
//
// THE FAILURE THIS PINS. A targeting call site that drops its intent/space does
// NOT throw — it writes to whatever the active cursor happens to be, silently.
// For DELEGATED_APPROVAL that means a leader's gate decision landing in the
// wrong conductor's ledger. Every assertion below is about the row being in the
// target's shard AND claiming the target's intent, never one without the other.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  auditFilePath,
  birthIntent,
  findAllEvents,
  readAllAuditShards,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { emitAuditEvent } from "../../dist/claude/.claude/otel/audit-emit.ts";
import { resetOtelBootstrapForTests } from "../../dist/claude/.claude/otel/bootstrap.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { isFatalSet, resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetOtelBootstrapForTests();
  ensureContextManager();
});
afterEach(() => {
  cleanupTestProject(proj);
});

// The row's own identity, read back off the JSONL shard it landed in.
function intentIdsIn(shardPath: string, eventName: string): string[] {
  return readFileSync(shardPath, "utf-8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((row) => row.eventName === eventName)
    .map((row) => String(row.intentId));
}

describe("a targeted emit lands in the TARGET ledger, identity included (E-U8PRE O-T1)", () => {
  test("intent targeting routes the shard and the row identity together", () => {
    const issuer = birthIntent(proj, "otel-issuer", "default", "feature");
    const target = birthIntent(proj, "otel-target", "default", "feature");
    // birthIntent moves the cursor: the ACTIVE intent is now the target's
    // sibling, so a dropped target would be visible as a row in `issuer`.
    expect(target.dirName).not.toBe(issuer.dirName);

    const result = emitAuditEvent(
      "DELEGATED_APPROVAL",
      {
        Stage: "code-generation",
        "Issuer Space": "default",
        "Issuer Intent": issuer.dirName,
        "Issuer Shard": "issuer.jsonl",
        "Issuer Human Ts": "2026-07-30T00:00:00Z",
        "User Input": "approve",
      },
      proj,
      issuer.dirName,
      "default"
    );

    expect(result.appended).toBe(true);
    expect(result.event).toBe("DELEGATED_APPROVAL");
    // Shard: the issuer's, not the active cursor's.
    expect(findAllEvents(readAllAuditShards(proj, issuer.dirName, "default"), "DELEGATED_APPROVAL").length).toBe(1);
    expect(findAllEvents(readAllAuditShards(proj, target.dirName, "default"), "DELEGATED_APPROVAL").length).toBe(0);
    // Identity: the row claims the issuer too — a row in the issuer's shard
    // claiming the active intent is the misattribution this seam exists to stop.
    expect(intentIdsIn(auditFilePath(proj, issuer.dirName, "default"), "amadeus.delegated.approval")).toEqual([
      issuer.dirName,
    ]);
  });
});

describe("an untargeted emit keeps the Adapter's behaviour (BR-2)", () => {
  test("no intent/space resolves to the active cursor, and the legacy readers still see it", () => {
    const only = birthIntent(proj, "otel-only", "default", "feature");

    const result = emitAuditEvent("DECISION_RECORDED", { Stage: "requirements-analysis", Decision: "ship" }, proj);

    expect(result.appended).toBe(true);
    expect(findAllEvents(readAllAuditShards(proj), "DECISION_RECORDED").length).toBe(1);
    expect(intentIdsIn(auditFilePath(proj), "amadeus.decision.recorded")).toEqual([only.dirName]);
  });
});

describe("the drift guard and the failure contract travel through unchanged (BR-3, BR-4)", () => {
  test("an unmapped eventType throws without latching, targeted or not", () => {
    const born = birthIntent(proj, "otel-drift", "default", "feature");

    expect(() => emitAuditEvent("NOT_A_REAL_EVENT", {}, proj, born.dirName, "default")).toThrow(
      /drift guard violation/
    );
    expect(isFatalSet()).toBe(false);
  });

  test("a missing required attribute throws through the targeted path", () => {
    const born = birthIntent(proj, "otel-required", "default", "feature");

    expect(() => emitAuditEvent("DECISION_RECORDED", {}, proj, born.dirName, "default")).toThrow(
      /missing required attribute/
    );
    expect(isFatalSet()).toBe(false);
  });
});
