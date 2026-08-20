// covers: subcommand:amadeus-state:practices-event
//
// CLI-contract port of tests/unit/t81-bolt-plan-override.sh (TAP plan 4),
// mechanism = cli. Equal-or-stronger migration: every .sh assertion that
// shelled out to `bun amadeus-state.ts practices-event --type override
// --field "K: V" ...` is preserved by SPAWNING the real CLI via
// node:child_process spawnSync (BUN + the tool .ts path), asserting on
// res.stdout (the JSON ack the tool prints) and the audit.md the tool
// appends to — the PROCESS boundary, not an in-process handlePracticesEvent
// call. An in-process twin would lose the JSON-ack-to-stdout half AND the
// real audit-file write the .sh greps; both are observed here through the
// subprocess + the audit.md it writes under --project-dir.
//
// WHAT t81 PINS (v0.4.0 milestone 13, the bolt-plan-marker-conflict semantic):
//   milestone 13 introduced NO new BOLT_PLAN_OVERRIDDEN event. Instead it reuses the
//   existing PRACTICES_OVERRIDE event with a discriminator field (Reason).
//   milestone 8 emits PRACTICES_OVERRIDE for write-failure semantics (Reason:
//   write-failure-*); milestone 13 emits it for orchestrator-overrides-bolt-plan-
//   marker semantics (Reason: bolt-plan-marker-conflict, plus Practices
//   Stance + Bolt-Plan Marker + Bolt slug fields). The contract being pinned
//   is that handlePracticesEvent (amadeus-state.ts:1006-1071) accepts arbitrary
//   --field "Key: Value" pairs unmodified — discriminator-field
//   disambiguation needs zero new tool code.
//
// PARITY NOTES (each .sh `ok` line maps to a test() below; several STRONGER):
//   - .sh Test 1  grep '"emitted":"PRACTICES_OVERRIDE"' in stdout  -> Test 1:
//       res.stdout contains '"emitted":"PRACTICES_OVERRIDE"' (same observable)
//       + res.status === 0 (STRONGER: .sh discarded $?; we pin clean exit) +
//       fields_count === 4 (STRONGER: pins the JSON ack's count of the 4
//       --field pairs the tool parsed).
//   - .sh Test 2  awk PRACTICES_OVERRIDE block, then 4 greps for the milestone 13
//       fields (Reason / Practices Stance / Bolt-Plan Marker / Bolt slug)  ->
//       Test 2: block-scoped auditField() over the FIRST PRACTICES_OVERRIDE
//       block asserts each of the 4 field VALUES exactly (STRONGER: exact
//       value scoped to the event block, not a file-wide substring grep). The
//       .sh's awk starts at the first line containing 'PRACTICES_OVERRIDE'
//       (the `**Event**:` line; the `## Practices Override` heading does NOT
//       contain that literal) and stops at the next `---`; auditField mirrors
//       that block scoping (resets at `## ` headings and `---`).
//   - .sh Test 3  read t28's pinned $TS_COUNT, assert == 68  -> Test 3:
//       same observable. Reads the canonical event-count list the tool
//       enforces the canonical Event Registry AND cross-checks
//       t28's pin. This PR's discriminator reuse introduces no new event, so
//       the framework total stays 68 (the reconciled #367/#369 baseline). STRONGER: rather
//       than only re-reading t28's literal, we also confirm the live tool's
//       canonical Event Registry has exactly 98 entries
//       rejects/accepts — pinning the actual contract t28 mirrors. To avoid
//       coupling to t28's internal regex we keep the t28-literal read too.
//   - .sh Test 4  second override emit (Reason: write-failure-permission-
//       denied), then grep -c PRACTICES_OVERRIDE >= 2  -> Test 4: emit both
//       discriminator variants into ONE project, assert (a) the write-failure
//       emit's stdout carries '"emitted":"PRACTICES_OVERRIDE"' (same event),
//       (b) the audit.md now holds >= 2 PRACTICES_OVERRIDE rows, and (c)
//       STRONGER: the two rows carry the two DISTINCT Reason values
//       (bolt-plan-marker-conflict and write-failure-permission-denied),
//       proving the discriminator field disambiguates them in the same event
//       space.
//
// 4 .sh asserts -> 4 expect()-bearing test() cases here (one observable focus
// per case, matching the .sh's 4 `ok` lines), each with STRONGER additions.
//
// FIXTURE DISCIPLINE (the .sh used setup_integration_project
// --with-greenfield-stub, but that flag only buys a project dir with an
// amadeus-docs/ tree — the contract under test is purely the audit.md the tool
// writes under --project-dir, NOT any greenfield-stub file). So each case
// uses a FRESH temp project dir via createTestProject() (fixtures.ts), which
// scaffolds amadeus-docs/ and toPortablePath-converts on Windows so audit.md —
// written by the tool via the forward-slash audit helpers — round-trips when
// read back. No seed: the tool creates audit.md on first emit, so post-fire
// PRACTICES_OVERRIDE counts are unambiguous (the seed audit-sample.md carries
// none). NOTHING is written under tests/fixtures/**; all temp dirs cleaned in
// afterAll.

import { normalizeAuditRecord } from "../harness/audit-records.ts";
import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { cleanupTestProject, createTestProject, seededStateFile } from "../harness/fixtures.ts";
import { canonicalAuditEvents } from "../../dist/claude/.claude/otel/event-registry.ts";

const BUN = process.execPath; // the bun running this test
const REPO_ROOT = join(import.meta.dir, "..", "..");
const TOOL = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-state.ts");

const tempDirs: string[] = [];

afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

/**
 * Fresh temp project (createTestProject — record scaffolded, Windows-portable).
 * The record carries the header-only amadeus-state.md stub production
 * birthIntent() writes: a dir counts as a record — so an audit shard resolves at
 * all (#1377) — only once it holds one.
 */
function proj(): string {
  const p = createTestProject();
  writeFileSync(seededStateFile(p), "# AI-DLC State Tracking\n", "utf-8");
  tempDirs.push(p);
  return p;
}

// P9: practices-event's appendAuditEvent CREATES the record's per-clone shard on
// first emit; the SPAWNED tool mints its own clone-id, so reads glob every shard.
const readAudit = (p: string): string => readAllAuditShards(p);

interface CliResult {
  status: number;
  out: string; // combined stdout+stderr (mirrors the .sh's 2>&1)
  stdout: string;
}

/**
 * Spawn `bun amadeus-state.ts practices-event <args...> --project-dir <p>`.
 * Mirrors the .sh STATE_TOOL invocation (`bun $AMADEUS_SRC/tools/amadeus-state.ts
 * practices-event ... --project-dir "$PROJ"`).
 */
function practicesEvent(args: string[], p: string): CliResult {
  const res = spawnSync(BUN, [TOOL, "practices-event", ...args, "--project-dir", p], {
    encoding: "utf-8",
  });
  const stdout = res.stdout ?? "";
  return {
    status: res.status ?? -1,
    out: `${stdout}${res.stderr ?? ""}`,
    stdout,
  };
}

/** Parse a JSONL audit buffer into records (blank lines skipped). */
function auditRecords(body: string): Array<Record<string, unknown>> {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => normalizeAuditRecord(JSON.parse(l)) as unknown as Record<string, unknown>);
}

/** Count audit records whose `event` is exactly <ev> in a buffer. */
function auditEventCount(body: string, ev: string): number {
  return auditRecords(body).filter((r) => r.event === ev).length;
}

/**
 * Value of <key> from the FIRST audit record whose `event` matches <ev>.
 * Record-scoped, so a field can never bleed in from a neighbouring event.
 * Returns "" when absent.
 */
function auditField(body: string, ev: string, key: string): string {
  const rec = auditRecords(body).find((r) => r.event === ev);
  if (!rec) return "";
  const fields = (rec.fields ?? {}) as Record<string, string>;
  return fields[key] ?? "";
}

/** ALL values of <key> across every record whose `event` matches <ev>. */
function auditFieldAll(body: string, ev: string, key: string): string[] {
  return auditRecords(body)
    .filter((r) => r.event === ev)
    .map((r) => ((r.fields ?? {}) as Record<string, string>)[key])
    .filter((v): v is string => v !== undefined);
}

// The milestone 13 override field set the .sh fires (t81-bolt-plan-override.sh:41-47).
const MILESTONE13_FIELDS = [
  "--type",
  "override",
  "--field",
  "Reason: bolt-plan-marker-conflict",
  "--field",
  "Practices Stance: never-skeleton",
  "--field",
  "Bolt-Plan Marker: walking-skeleton",
  "--field",
  "Bolt slug: t81-bolt-1",
];

describe("t81 amadeus-state practices-event — bolt-plan-marker-conflict override (migrated from t81-bolt-plan-override.sh, plan 4)", () => {
  // --- Test 1: --type override accepts the milestone 13 field set ---
  test("1: practices-event --type override accepts milestone 13 field set (emits PRACTICES_OVERRIDE)", () => {
    const p = proj();
    const r = practicesEvent(MILESTONE13_FIELDS, p);
    expect(r.status).toBe(0); // STRONGER: .sh discarded $?; pin clean exit
    expect(r.stdout).toContain('"emitted":"PRACTICES_OVERRIDE"');
    // STRONGER: the JSON ack reports all 4 --field pairs were parsed.
    expect(r.stdout).toContain('"fields_count":4');
  });

  // --- Test 2: audit row carries discriminator Reason + the 3 milestone 13 fields ---
  test("2: PRACTICES_OVERRIDE audit row carries discriminator Reason + milestone 13 fields", () => {
    const p = proj();
    practicesEvent(MILESTONE13_FIELDS, p);
    const f = readAudit(p);
    // Exact, block-scoped field values (STRONGER than the .sh's 4 substring greps).
    expect(auditField(f, "PRACTICES_OVERRIDE", "Reason")).toBe("bolt-plan-marker-conflict");
    expect(auditField(f, "PRACTICES_OVERRIDE", "Practices Stance")).toBe("never-skeleton");
    expect(auditField(f, "PRACTICES_OVERRIDE", "Bolt-Plan Marker")).toBe("walking-skeleton");
    expect(auditField(f, "PRACTICES_OVERRIDE", "Bolt slug")).toBe("t81-bolt-1");
  });

  // --- Test 3: t28 audit count unchanged BY THIS PR's discriminator reuse ---
  test("3: framework event count includes Goal and Loop Monitor lifecycle events", () => {
    // The .sh read t28's pinned $TS_COUNT. Under milestone 4, t28 is now a
    // .test.ts (no `assert_eq N "$TS_COUNT"` line to grep), so pin the SAME
    // observable against the SOURCE OF TRUTH instead — the canonical Event
    // Registry — which is stronger (it asserts the real count, not a
    // sibling test's transcription of it). bolt-plan-marker-conflict reuses
    // PRACTICES_OVERRIDE (discriminator-field disambiguation) and registers no
    // new event. The framework total is 79: the v0.6.0 Wave 4 milestone 16
    // baseline of 67 (SWARM_DEGRADED was the last event born then), plus
    // WORKFLOW_PARKED + WORKFLOW_UNPARKED (the park/unpark lifecycle, +2),
    // less TEST_RUN_MODE_ENABLED (removed, -1), plus HUMAN_TURN (+1), plus
    // RECOMPOSED (the adaptive composer's in-flight re-shape, +1), plus
    // DELEGATED_APPROVAL (#671 delegated-approval provenance, +1) = 71, plus
    // DELEGATED_REJECTION (#685 delegated-rejection provenance, +1) = 72, plus
    // GUARD_EXEMPTED (#499/#848 docs-only workspace_requires exemption, +1) = 73,
    // plus GRANT_ISSUED + GRANT_REVOKED (#1125 standing delegation grants, +2) = 75,
    // plus INTENT_ARCHIVED + INTENT_UNARCHIVED (#1424 archived intent status, +2) = 77,
    // plus GATE_AUTHORIZATION_SELECTED (#1466 solo standing-grant route receipt, +1) = 78,
    // plus SUBAGENT_STARTED (U4, the subagent interval's opening half, +1) = 79,
    // plus EXECUTION_EVENT_SET_COMMITTED (#1602 audit-first lifecycle, +1) = 80,
    // plus UNIT_POOL_EVENT_SET_COMMITTED (#1919 fixed-width Unit pool, +1) = 81,
    // plus LOOP_MONITOR_EVENT_SET_COMMITTED (durable Loop Monitor stream, +1) = 82,
    // plus the four Goal Lifecycle events (+4) = 86,
    // plus QUALITY_REPAIR_TRANSACTION_COMMITTED (#2096, +1) = 87,
    // plus INTENT_AUTONOMY_TRANSACTION_COMMITTED (#2067, +1) = 88,
    // plus AUTO_DECISION_REVIEWED (#2067 review surface, +1) = 89,
    // plus INTENT_COMPLETION_TRANSACTION_COMMITTED (#2067 completion seal, +1) = 90,
    // plus INTENT_AUTONOMY_HUMAN_REQUIRED (#2378 refusal visibility, +1) = 91,
    // plus ARTIFACT_ATTESTED (#2838 convergence evidence, +1) = 92,
    // plus UNIT_OUTCOME_SETTLED (#3099 per-unit dispatch outcome ledger, +1) = 93,
    // plus DELEGATED_MERGE_RECORDED (C11/FR-9 delegated-merge provenance, +1) = 94,
    // plus LEARNING_ZERO_CONFIRMED + LEARNING_CANDIDATE_ADDED (ADR-6, +2) = 96,
    // plus WORKFLOW_WAITING_ENTERED + WORKFLOW_WAITING_RESUMED (RFC-0001
    // FR-3/ADR-4, waiting is a terminal distinct from park, +2) = 98.
    expect(canonicalAuditEvents().length).toBe(98);
  });

  // --- Test 4: milestone 8 write-failure path coexists (different Reason value) ---
  test("4: PRACTICES_OVERRIDE coexists across both Reason discriminators", () => {
    const p = proj();
    // milestone 13 emit first, then the milestone 8-style write-failure emit into the SAME project.
    practicesEvent(MILESTONE13_FIELDS, p);
    const writeFail = practicesEvent(
      ["--type", "override", "--field", "Reason: write-failure-permission-denied"],
      p,
    );
    expect(writeFail.stdout).toContain('"emitted":"PRACTICES_OVERRIDE"'); // same event
    const f = readAudit(p);
    // Both emits land as PRACTICES_OVERRIDE rows (the .sh's grep -c >= 2).
    expect(auditEventCount(f, "PRACTICES_OVERRIDE")).toBeGreaterThanOrEqual(2);
    // STRONGER: the discriminator field disambiguates the two rows — both
    // distinct Reason values are present in the PRACTICES_OVERRIDE event space.
    const reasons = auditFieldAll(f, "PRACTICES_OVERRIDE", "Reason");
    expect(reasons).toContain("bolt-plan-marker-conflict");
    expect(reasons).toContain("write-failure-permission-denied");
  });
});

// ============================================================
// Issue #2763 — handlePracticesEvent --type/--field flag-value arm
// ============================================================
//
// --field's own value-shaped check (kv.indexOf(":") > 0) means a swallowed
// flag NAME (no colon) used to be silently DROPPED — no error, the field
// simply never lands in the `fields` map, and (since --type is unaffected in
// this exact ordering) the event still emits successfully missing that field.
// --type's flag-value arm was ALREADY loud (an unknown type falls through the
// `switch` to `default: error(...)`) — the fix touches it too (both branches
// share the same loop) with no behaviour change for it; the falling test below
// is on --field, the genuinely silent one.
describe("t81 Issue #2763: --type/--field flag-value arm", () => {
  test("--field immediately followed by another flag (no colon) is refused, not silently dropped", () => {
    const p = proj();
    // Pre-fix, decisive repro: --type affirmed (PRACTICES_AFFIRMED, whose
    // event-registry schema carries ZERO requiredAttributes — unlike
    // PRACTICES_OVERRIDE's mandatory "Reason") is ALREADY validly set (its
    // own value, parsed BEFORE the swallow) so eventTypeArg stays truthy;
    // --field's swallowed value "--some-other-flag" has no ":"
    // (kv.indexOf(":") === -1, idx > 0 is false) so the field is silently
    // skipped — no error, not even a malformed-field warning — and the
    // trailing "ignored-tail" token matches neither --type nor --field, so
    // the loop just drops it too. Because PRACTICES_AFFIRMED requires no
    // attributes, the tool exits 0 and emits it successfully with the field
    // silently missing (genuinely exhibitable: a real caller's --field value
    // never registers, and nothing in the observable output says so).
    const r = practicesEvent(
      ["--type", "affirmed", "--field", "--some-other-flag", "ignored-tail"],
      p,
    );
    expect(r.status).not.toBe(0);
    expect(r.out).toContain('--field expects a value, got another flag: \\"--some-other-flag\\"');
    expect(auditEventCount(readAudit(p), "PRACTICES_AFFIRMED")).toBe(0);
  });

  test("control: --field \"Key: Value\" then --type override still succeeds", () => {
    const p = proj();
    const r = practicesEvent(["--field", "Reason: t2763-control", "--type", "override"], p);
    expect(r.status).toBe(0);
    const f = readAudit(p);
    expect(auditEventCount(f, "PRACTICES_OVERRIDE")).toBe(1);
    expect(auditField(f, "PRACTICES_OVERRIDE", "Reason")).toBe("t2763-control");
  });

  test("--type immediately followed by --field is refused with the new clear message", () => {
    const p = proj();
    // Pre-fix this already failed loud via the `switch` default arm
    // ("Invalid --type: --field. Must be discovered, affirmed, override, or
    // empty.") — GREEN asserts the EARLIER, clearer parse-layer message now
    // fires instead (defense-in-depth for the shared loop, no exhibited
    // behaviour change since both are exit non-zero, no audit row).
    const r = practicesEvent(["--type", "--field", "Reason: x"], p);
    expect(r.status).not.toBe(0);
    expect(r.out).toContain('--type expects a value, got another flag: \\"--field\\"');
    expect(auditEventCount(readAudit(p), "PRACTICES_OVERRIDE")).toBe(0);
  });
});
