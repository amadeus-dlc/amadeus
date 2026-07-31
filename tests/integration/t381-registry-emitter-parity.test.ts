// covers: function:appendAuditEntryViaEvents, function:emitEvent, function:redactAttributes
// size: medium
//
// G1 (call-site migration) — registry/emitter parity.
//
// MIGRATION EQUIVALENCE IS THE CONTRACT. A migrated call site must land the
// SAME attribute set it landed before, and the canonical path has two places
// that can silently break that:
//
//   1. requiredAttributes — emitEvent THROWS when a declared required key is
//      absent, so a registry that names a key no emitter supplies turns a
//      working legacy write into a crash the moment the site migrates;
//   2. the redaction policy — redactAttributes is default-deny, so a key that
//      is neither safe nor opt-in is dropped WITHOUT a word. A row that still
//      appends but has lost half its fields is the worse of the two failures,
//      because nothing reports it.
//
// Both are checked here the same way: drive the Adapter with the EXACT field
// set the production emitter supplies (measured, not remembered — see the
// provenance note on each case) and assert the landed row carries every one.
//
// EQUIVALENCE MARKER. Each case is tagged `[migration-equivalence]` in its
// test name so the deletion gate's condition (d) can collect the evidence that
// the migrated taxonomy round-trips its fields. Grep the marker to enumerate.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { birthIntent } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { appendAuditEntryViaEvents } from "../../dist/claude/.claude/otel/migration-adapter.ts";
import { ensureOtelBootstrap, resetOtelBootstrapForTests } from "../../dist/claude/.claude/otel/bootstrap.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { resetTracerProviderForTests } from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;
let recordDir: string;

beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
  ensureContextManager();
  recordDir = birthIntent(proj, "registry-parity", "default", "feature").recordDir;
  ensureOtelBootstrap(proj);
});

afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
});

type ShardRecord = {
  schemaVersion?: number;
  eventName?: string;
  attributes?: Record<string, unknown>;
};

function shardRecords(): ShardRecord[] {
  const dir = join(recordDir, "audit");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(".jsonl"))
    .sort()
    .flatMap((n) => readFileSync(join(dir, n), "utf-8").split("\n"))
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as ShardRecord);
}

// Each entry is [legacy event type, the field set a REAL emitter supplies,
// where that field set was measured]. The field sets are transcribed from the
// production call sites, not from the registry — comparing the registry against
// itself would be vacuous.
const EMITTER_FIELD_SETS: readonly (readonly [string, Record<string, string>, string])[] = [
  [
    "PHASE_VERIFIED",
    { "Phase boundary": "inception → construction", Details: "Traceability verification on jump" },
    "tools/amadeus-jump.ts:126-129",
  ],
  [
    "PHASE_STARTED",
    { Phase: "construction", Scope: "amadeus-feature" },
    "tools/amadeus-jump.ts:138-141 (3 of 4 emitters omit 'Stage count')",
  ],
  [
    "WORKSPACE_SCANNED",
    {
      "Project Type": "typescript",
      Languages: "ts",
      Frameworks: "bun",
      "Build System": "bun",
      Details: "Deterministic rule-based scan",
    },
    "tools/amadeus-utility.ts:4319-4332",
  ],
  [
    "SCOPE_CHANGED",
    {
      "Old Scope": "poc",
      "New Scope": "amadeus-feature",
      "Stage Count Delta": "+4",
      "Stages in Scope": "18",
      Depth: "practical",
    },
    "tools/amadeus-utility.ts:5257-5263",
  ],
  [
    "DEPTH_CHANGED",
    { "Old Depth": "practical", "New Depth": "thorough" },
    "tools/amadeus-utility.ts:5560-5563",
  ],
  [
    "TEST_STRATEGY_CHANGED",
    { "Old Strategy": "standard", "New Strategy": "comprehensive" },
    "tools/amadeus-utility.ts:5566-5569",
  ],
  [
    "PRACTICES_DISCOVERED",
    { "Sources Scanned": "ci, tests", Drafts: "team-practices.md, discovered-rules.md" },
    "stages/inception/practices-discovery.md:108 (CLI --field passthrough)",
  ],
  [
    "PRACTICES_AFFIRMED",
    {
      "Affirming User": "j5ik2o",
      "Sections Written": "3",
      "Mandated Rules Appended": "2",
      "Forbidden Rules Appended": "1",
      Timestamp: "2026-07-31T00:00:00Z",
    },
    "tools/amadeus-state.ts:3965 (CLI --field passthrough)",
  ],
  [
    "STAGE_COMPLETED",
    { Stage: "code-generation", Details: "unit landed" },
    "tools/amadeus-utility.ts:4333-4336 (no emitter supplies 'Artifacts')",
  ],
  [
    "STAGE_SKIPPED",
    { Stage: "market-research" },
    "tools/amadeus-state.ts:3800-3802 ('Reason' is conditional)",
  ],
  [
    "WORKFLOW_UNPARKED",
    { Timestamp: "2026-07-31T00:00:00Z" },
    "corpus: 393/393 rows carry Timestamp; registry declares no required key",
  ],
  [
    "ARTIFACT_UPDATED",
    {
      Artifact: "mirror-state.json",
      TransactionId: "tx-1",
      Revision: "3",
      TransitionKind: "sync",
      Digest: "abc123",
      TriggerBoundary: "stage-complete",
      Reconciliation: "none",
    },
    "tools/amadeus-mirror-state-store.ts:403 (disjoint from the hook's Tool/File/Context)",
  ],
  [
    "SUBAGENT_COMPLETED",
    { "Agent Type": "developer", "Agent ID": "a-1", Message: "done" },
    "corpus: Agent ID 5406/5487, Message 5312/5487 — both conditional",
  ],
  [
    "GATE_APPROVED",
    { Stage: "requirements-analysis", "Grant Id": "g-1", "Transaction Id": "tx-2" },
    "corpus: 'User Input' 353/836 — conditional",
  ],
];

describe("every real emitter's field set survives the canonical path", () => {
  for (const [legacy, fields, provenance] of EMITTER_FIELD_SETS) {
    test(`[migration-equivalence] ${legacy} round-trips its fields (${provenance})`, () => {
      // The Adapter throws when the registry demands a key this emitter does
      // not supply — so reaching the assertions at all is half the contract.
      expect(() => appendAuditEntryViaEvents(legacy, fields, proj)).not.toThrow();

      const rows = shardRecords().filter((r) => r.schemaVersion === 2);
      expect(rows.length).toBe(1);
      const landed = rows[0]?.attributes ?? {};
      // The other half: default-deny redaction must not have eaten a field.
      for (const [key, value] of Object.entries(fields)) {
        expect(landed[key]).toBe(value);
      }
      // The v1 type still rides along for the legacy readers.
      expect(landed.Event).toBe(legacy);
    });
  }
});
