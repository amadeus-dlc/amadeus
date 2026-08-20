// covers: file:tools/amadeus-audit.ts, file:knowledge/amadeus-shared/audit-format.md
//
// t28 — audit event-type SYNC contract. Migrated from
// tests/unit/t28-audit-event-sync.sh (TAP plan 7). The .sh validated that the
// canonical event-type taxonomy is in lock-step across two shipped source
// files, plus that the heading map is exhaustive and the count is pinned to a
// baseline. Pure-bash, "no bun or claude required (L1)" — a cross-file
// structural drift guard with zero process boundary and zero LLM.
//
// Mechanism: none. This is a pure structural / source-inspection check over
// the shipped bytes — read the two files in-process, extract their event-type
// sets with the SAME extraction rules the .sh's sed/grep used, and assert the
// set relationships. There is no argv / exit-code / stdout / audit.md seam to
// cross (the .sh never ran a tool), and the canonical Event Registry / `EVENT_HEADINGS`
// is the canonical source, so the contract is preserved by reading the
// registry in-process and checking its projections. No spawn, no tokens.
//
// Subject under test (the shipped distributable):
//   - dist/claude/.claude/otel/event-registry.ts
//       canonical audit-event definitions
//       :117-185 const EVENT_HEADINGS: Record<string,string> = { TYPE: "...", };
//   - dist/claude/.claude/knowledge/amadeus-shared/audit-format.md
//       "## Event Registry (69 events, 18 categories)" .. "## Hook-Generated"
//       — backtick-delimited `EVENT_TYPE` cells in the registry tables.
//
// Extraction parity with the .sh (so the sets are byte-identical to what the
// .sh compared):
//   - REGISTRY_EVENTS: canonical audit events from the Event Registry.
//   - MD_EVENTS  (.sh L24): the lines from `## Event Registry` through
//       `## Hook-Generated`, all `[A-Z_]+` backtick-delimited tokens, deduped
//       + sorted. (The ✓ MANDATORY marker is not [A-Z_], so it never leaks
//       into a token — same as the .sh.)
//
// Test-design note (house style): assert the OBSERVABLE cross-file contract
// the .sh asserted against the real bytes on disk — never re-declare the
// taxonomy here. The expected sets are DERIVED from the files, not hard-coded;
// only the canonical COUNT (69) is pinned as a literal, exactly as the .sh's
// test 7 baseline did.
//
// Old TAP -> new test parity (1:1, no guarantee dropped):
//   .sh test 1 (assert_gt TS_COUNT 0)                 -> "extracts a non-empty canonical event set"
//   .sh test 2 (assert_gt MD_COUNT 0)                 -> "extracts a non-empty event set from audit-format.md"
//   .sh test 3 (every TS event in MD)                 -> "every canonical event appears in audit-format.md"
//   .sh test 4 (every MD event in TS)                 -> "every audit-format.md event appears in the registry"
//   .sh test 5 (EVENT_HEADINGS has every TS event)    -> "EVENT_HEADINGS maps every canonical event"
//   .sh test 6 (assert_eq TS_COUNT MD_COUNT)          -> "event counts match across the two files"
//   .sh test 7 (assert_eq TS_COUNT - baseline pin)    -> "canonical Event Registry size === 98 (baseline pin)"

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AMADEUS_SRC } from "../harness/fixtures.ts";
import { canonicalAuditEvents } from "../../dist/claude/.claude/otel/event-registry.ts";

// AMADEUS_SRC === <repo>/dist/claude/.claude — the same root the .sh resolved
// AUDIT_TS and AUDIT_MD under ($AMADEUS_SRC/tools, $AMADEUS_SRC/knowledge/...).
const AUDIT_TS = join(AMADEUS_SRC, "tools", "amadeus-audit.ts");
const AUDIT_MD = join(AMADEUS_SRC, "knowledge", "amadeus-shared", "audit-format.md");

// The canonical baseline pinned by .sh test 7. Bump WITH the source when an
// event is added (v0.6.0 Wave 4 milestone 16: +SWARM_DEGRADED took this to 67;
// v2.1.3: +WORKFLOW_PARKED +WORKFLOW_UNPARKED took it to 69; v2.1.4:
// -TEST_RUN_MODE_ENABLED took it to 68; +HUMAN_TURN took it to 69;
// +RECOMPOSED (adaptive composer) takes it to 70; +DELEGATED_APPROVAL
// (#671 delegated-approval provenance) takes it to 71; +DELEGATED_REJECTION
// (#685 delegated-rejection provenance) takes it to 72; +GUARD_EXEMPTED
// (#499/#848 docs-only workspace_requires exemption) takes it to 73;
// +GRANT_ISSUED +GRANT_REVOKED (#1125 standing delegation grants) takes it to 75;
// +INTENT_ARCHIVED +INTENT_UNARCHIVED takes it to 77;
// +GATE_AUTHORIZATION_SELECTED (#1466 solo grant receipt) takes it to 78;
// +SUBAGENT_STARTED (U4 subagent interval opening half) takes it to 79;
// +EXECUTION_EVENT_SET_COMMITTED (#1602 audit-first execution lifecycle) takes it to 80;
// +UNIT_POOL_EVENT_SET_COMMITTED (#1919 fixed-width Unit pool) takes it to 81;
// +GOAL_CHANGE_PROPOSED +GOAL_REVISION_APPROVED +GOAL_RECONCILED
// +LEGACY_GOAL_MIGRATED take it to 85;
// +LOOP_MONITOR_EVENT_SET_COMMITTED (#2095) takes it to 86;
// +QUALITY_REPAIR_TRANSACTION_COMMITTED (#2096) takes it to 87;
// +INTENT_AUTONOMY_TRANSACTION_COMMITTED (#2067) takes it to 88.
// +AUTO_DECISION_REVIEWED (#2067 review surface) takes it to 89;
// +INTENT_COMPLETION_TRANSACTION_COMMITTED (#2067 completion seal) takes it to 90.
// +UNIT_OUTCOME_SETTLED (#3099 per-unit dispatch outcome ledger) takes it to 93.
// +LEARNING_ZERO_CONFIRMED +LEARNING_CANDIDATE_ADDED (unit s13-zero, ADR-6)
// +DELEGATED_MERGE_RECORDED (unit merge-provenance, C11/FR-9) take it to 96.
// +WORKFLOW_WAITING_ENTERED +WORKFLOW_WAITING_RESUMED (unit waiting-interruption,
// RFC-0001 FR-3/ADR-4 — waiting is a terminal distinct from park) take it to 98.
const CANONICAL_COUNT = 98;

/** Slice the lines of `text` BETWEEN the first line matching `start` and the
 *  next line matching `end` (inclusive of both), reproducing `sed -n
 *  '/start/,/end/p'`. */
function sedRange(text: string, start: RegExp, end: RegExp): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let inRange = false;
  for (const line of lines) {
    if (!inRange) {
      if (start.test(line)) {
        inRange = true;
        out.push(line);
      }
      continue;
    }
    out.push(line);
    if (end.test(line)) break; // sed stops at the FIRST end after entering.
  }
  return out.join("\n");
}

/** Deduped + sorted list of `pattern` matches in `block`, stripped of `strip`
 *  delimiters — the .sh's `grep -oE ... | tr -d ... | sort -u` pipeline. */
function extractSorted(block: string, pattern: RegExp, strip: string): string[] {
  const matches = block.match(pattern) ?? [];
  const stripRe = new RegExp(`[${strip.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`, "g");
  return [...new Set(matches.map((m) => m.replace(stripRe, "")))].sort();
}

// --- REGISTRY_EVENTS: canonical event names. ---
const auditTsBody = readFileSync(AUDIT_TS, "utf-8");
const REGISTRY_EVENTS = [...canonicalAuditEvents()].sort();

// --- MD_EVENTS (.sh L24): backtick event tokens in the Event Registry. ---
const auditMdBody = readFileSync(AUDIT_MD, "utf-8");
const MD_BLOCK = sedRange(auditMdBody, /## Event Registry/, /## Hook-Generated/);
const MD_EVENTS = extractSorted(MD_BLOCK, /`[A-Z_]+`/g, "`");

// --- EVENT_HEADINGS block (.sh L57): the heading map keys. The .sh sliced
// `/EVENT_HEADINGS/,/};/` and substring-grepped each TS event against it. We
// parse the keys structurally for a STRONGER co-membership check. ---
const HEADINGS_BLOCK = sedRange(auditTsBody, /EVENT_HEADINGS/, /^};/);
const HEADINGS_KEYS = new Set(
  [...HEADINGS_BLOCK.matchAll(/^\s+([A-Z_]+):/gm)].map((m) => m[1]),
);

describe("t28 audit event-type sync (migrated from t28-audit-event-sync.sh, plan 7)", () => {
  // .sh test 1: assert_gt TS_COUNT 0.
  test("extracts a non-empty canonical event set [.sh test 1]", () => {
    expect(REGISTRY_EVENTS.length).toBeGreaterThan(0);
  });

  // .sh test 2: assert_gt MD_COUNT 0.
  test("extracts a non-empty event set from audit-format.md [.sh test 2]", () => {
    expect(MD_EVENTS.length).toBeGreaterThan(0);
  });

  // .sh test 3: every TS event found in MD. STRONGER than the .sh's
  // accumulate-missing loop: name the exact offenders if any leak through.
  test("every canonical event appears in audit-format.md [.sh test 3]", () => {
    const mdSet = new Set(MD_EVENTS);
    const missingFromMd = REGISTRY_EVENTS.filter((e) => !mdSet.has(e));
    expect(
      missingFromMd,
      `canonical events missing from audit-format.md: ${missingFromMd.join(", ")}`,
    ).toEqual([]);
  });

  // .sh test 4: every MD event found in TS.
  test("every audit-format.md event appears in the canonical registry [.sh test 4]", () => {
    const tsSet = new Set(REGISTRY_EVENTS);
    const missingFromTs = MD_EVENTS.filter((e) => !tsSet.has(e));
    expect(
      missingFromTs,
      `audit-format.md events missing from amadeus-audit.ts: ${missingFromTs.join(", ")}`,
    ).toEqual([]);
  });

  // .sh test 5: EVENT_HEADINGS has an entry for every canonical event.
  // STRONGER than the .sh's substring grep: assert exact-key membership against
  // the parsed heading-map keys, naming any unmapped event type.
  test("EVENT_HEADINGS maps every canonical event [.sh test 5]", () => {
    const missingHeadings = REGISTRY_EVENTS.filter((e) => !HEADINGS_KEYS.has(e));
    expect(
      missingHeadings,
      `canonical events with no EVENT_HEADINGS entry: ${missingHeadings.join(", ")}`,
    ).toEqual([]);
  });

  // .sh test 6: assert_eq TS_COUNT MD_COUNT. STRONGER: the two SETS are equal,
  // not merely the same cardinality (set-equality implies count-equality and
  // subsumes tests 3+4, but we keep the count assertion explicit for parity).
  test("event counts match across the two files [.sh test 6]", () => {
    expect(MD_EVENTS.length).toBe(REGISTRY_EVENTS.length);
    expect(MD_EVENTS).toEqual(REGISTRY_EVENTS); // both deduped + sorted; full set parity.
  });

  // .sh test 7: assert_eq TS_COUNT - the canonical baseline pin, bumped when
  // events are added or removed. (#367 added WORKFLOW_PARKED/UNPARKED -> 69;
  // #369 removed TEST_RUN_MODE_ENABLED -> 68; HUMAN_TURN took it to 69; the adaptive composer added RECOMPOSED -> 70; #671 added DELEGATED_APPROVAL -> 71; #685 added DELEGATED_REJECTION -> 72; #499/#848 added GUARD_EXEMPTED -> 73; #1125 added GRANT_ISSUED + GRANT_REVOKED -> 75; lifecycle transactions add two -> 77.)
  test("canonical Event Registry size === CANONICAL_COUNT (baseline pin) [.sh test 7]", () => {
    expect(REGISTRY_EVENTS.length).toBe(CANONICAL_COUNT);
  });
});
