// covers: otel:migration-adapter
//
// U7 (callsite-migration) — the compatibility Adapter (FR-MIG-1, BR-1..BR-4)
// and the post-complete suppression propagation it needs (E-U7CG-Q3B, ruling
// A': appendJournalRecordV2 reports whether it suppressed, the exporter and
// emitEvent propagate it).
//
// The Adapter keeps the legacy PARAMETER shape so migrating a call site is a
// one-line swap, looks the legacy v1 eventType up in the registry, and
// delegates to emitEvent. It holds no path to the old writer (BR-1), swallows
// nothing (BR-4), and rounds nothing off (BR-3).
//
// Two shapes are refused fail-closed rather than mishandled, per E-U7CG-Q3A:
// per-call intent/space targeting has no canonical counterpart (emitEvent
// routes to the registered provider's target), so a caller that passes one
// must not be silently retargeted at the default intent.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  activeIntent,
  birthIntent,
  docsRoot,
  intentStatusForAudit,
  transitionIntentStatusLocked,
  withLockedIntentRegistry,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { createAuditLogExporter } from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { isFatalSet, resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import {
  registerLoggerProvider,
  resetLoggerProviderForTests,
} from "../../dist/claude/.claude/otel/logger-provider.ts";
import { appendAuditEntryViaEvents } from "../../dist/claude/.claude/otel/migration-adapter.ts";
import { findAllEvents, readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  ensureContextManager();
  birthIntent(proj, "otel-adapter", "default", "feature");
});
afterEach(() => {
  cleanupTestProject(proj);
});

function register(): void {
  registerLoggerProvider({
    projectDir: proj,
    auditExporter: createAuditLogExporter({ projectDir: proj }),
    logExporter: createLocalLogExporter({ projectDir: proj }),
  });
}

describe("the Adapter delegates a legacy eventType onto the canonical path (FR-MIG-1, BR-2)", () => {
  test("a legacy eventType is looked up in the registry and emitted, and lands in the journal", () => {
    register();

    const result = appendAuditEntryViaEvents("DECISION_RECORDED", { Stage: "code-generation", Decision: "approve" }, proj);

    expect(result.appended).toBe(true);
    expect(result.event).toBe("DECISION_RECORDED");
    expect(typeof result.timestamp).toBe("string");
    // The legacy readers still see it: the v1 audit event type rides the
    // record, so a migrated call site is invisible to downstream consumers.
    expect(findAllEvents(readAllAuditShards(proj), "DECISION_RECORDED").length).toBe(1);
  });
});

describe("drift guard: an unmapped eventType throws, never rounds off (BR-3, VER-1)", () => {
  test("an eventType absent from the registry is a drift-guard violation", () => {
    register();

    expect(() => appendAuditEntryViaEvents("NOT_A_REAL_EVENT", {}, proj)).toThrow(/drift guard violation/);
    // A caller bug is not a write failure: the latch stays clear.
    expect(isFatalSet()).toBe(false);
  });
});

describe("the failure contract is identical to the direct path (BR-4)", () => {
  test("a missing required attribute throws through the Adapter, unswallowed", () => {
    register();

    // DECISION_RECORDED requires Stage and Decision; withholding one must
    // surface as the same invariant violation the direct emit raises.
    expect(() => appendAuditEntryViaEvents("DECISION_RECORDED", { Stage: "s" }, proj)).toThrow(
      /missing required attribute/
    );
  });

  test("emitting before the provider is registered throws — the Adapter adds no fallback", () => {
    // BR-1: the Adapter holds no path to the old writer, so an unregistered
    // provider cannot be papered over by writing through the v1 writer.
    expect(() => appendAuditEntryViaEvents("DECISION_RECORDED", { Stage: "s", Decision: "d" }, proj)).toThrow(
      /registerLoggerProvider/
    );
  });
});

describe("per-call intent/space targeting is refused fail-closed (E-U7CG-Q3A)", () => {
  test("passing an intent throws instead of silently retargeting the default intent", () => {
    register();

    expect(() =>
      appendAuditEntryViaEvents("DECISION_RECORDED", { Stage: "s", Decision: "d" }, proj, "260730-other-1234abcd")
    ).toThrow(/per-call intent\/space targeting/);
  });

  test("passing a space throws for the same reason", () => {
    register();

    expect(() =>
      appendAuditEntryViaEvents("DECISION_RECORDED", { Stage: "s", Decision: "d" }, proj, undefined, "other-space")
    ).toThrow(/per-call intent\/space targeting/);
  });
});

describe("post-complete suppression is observable through the Adapter (E-U7CG-Q3B ruling A')", () => {
  test("a sealed ledger yields the appended:false arm — not an unverified success claim", () => {
    const dir = activeIntent(proj) as string;
    withLockedIntentRegistry(proj, (context) => transitionIntentStatusLocked(context, dir, "complete"));
    expect(intentStatusForAudit(proj)).toBe("complete");
    register();

    const result = appendAuditEntryViaEvents("DECISION_RECORDED", { Stage: "s", Decision: "d" }, proj);

    expect(result).toEqual({
      appended: false,
      reason: "intent-complete",
      event: "DECISION_RECORDED",
      timestamp: result.timestamp,
    });
    // Suppression is not a failure: no throw, no latch, nothing written.
    expect(isFatalSet()).toBe(false);
    expect(existsSync(join(docsRoot(proj) as string, "audit"))).toBe(false);
  });
});
