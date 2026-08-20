// covers: file:skills/amadeus/SKILL.md, file:otel/event-registry.ts, file:knowledge/amadeus-shared/audit-format.md, file:knowledge/amadeus-shared/state-template.md, file:amadeus-common/protocols/stage-protocol.md, file:amadeus-common/stages/construction/code-generation.md
//
// In-process port of tests/integration/t47-construction-bolts.sh (TAP plan 12),
// mechanism = none. The .sh is a Construction Bolt-by-Bolt vocabulary check: it
// greps the SHIPPED implementation files for the durable anchors of the Bolt
// vocabulary that survived the engine cutover — the retired "Construction Phase
// N" sub-step labels (must be GONE from SKILL.md), the four Bolt audit events
// registered in the canonical Event Registry, the BOLT_STARTED row in audit-format.md, the
// Construction Autonomy Mode state field in state-template.md, the stage-protocol
// Glossary entry tying a Bolt to stages 3.1-3.5 (with 3.6/3.7 once at the end),
// and the orchestrator-managed gating note in code-generation.md.
//
// The .sh carried NO `# covers:` header, so it joined to zero enumerated registry
// units — and none of the seven enumerated unit classes
// (function/audit/scope/stage/hook/subcommand/render-surface) models the presence
// or absence of a literal string inside a shipped markdown / tool file. The
// `file:` covers ids above name the six files under test honestly; they parse
// through gen-coverage-registry's parseCoversHeader and (like the .sh) join to no
// enumerated unit. No coverage guarantee is lost: the .sh contributed none.
//
// MECHANISM = none. The .sh shelled out to `grep` over file content and never
// touched a function, a CLI tool, argv, exit codes, or a process boundary.
// gen-coverage-registry derives mechanism from the DRIVERS a test body calls
// (milestone 3): this twin calls NO driver (no driveAidlc, no tui-drive.ts, no spawn of
// an amadeus-*.ts tool or run-tests.sh), so its derived set is the deterministic
// `none` floor — matching the t34 / t14 / t43 / t44 content-structure family.
// Every assertion is readFileSync + a string / regex check on the real bytes of
// the shipped files, the same observable the .sh's grep asserted.
//
// FIXTURE DISCIPLINE: the inputs are the REAL committed shipped files under
// dist/claude/.claude/, read-only, resolved through AMADEUS_SRC from
// tests/harness/fixtures.ts (the same anchor the .sh's $AMADEUS_SRC pointed at —
// fixtures resolves AMADEUS_SRC to <repo>/dist/claude/.claude). NOTHING is written;
// no temp project, no teardown — there is no mutable surface.
//
// Source under test (read fresh each run):
//   dist/claude/.claude/skills/amadeus/SKILL.md                                (SKILL_MD)
//   dist/claude/.claude/otel/event-registry.ts                                 (EVENT_REGISTRY)
//     canonical registry rows contain BOLT_STARTED / BOLT_COMPLETED /
//            BOLT_FAILED / AUTONOMY_MODE_SET
//   dist/claude/.claude/knowledge/amadeus-shared/audit-format.md               (AUDIT_FORMAT)
//     :109 documents the BOLT_STARTED row
//   dist/claude/.claude/knowledge/amadeus-shared/state-template.md             (STATE_TEMPLATE)
//     :93 **Construction Autonomy Mode**: [unset/autonomous/gated]
//   dist/claude/.claude/amadeus-common/protocols/stage-protocol.md             (STAGE_PROTOCOL)
//     :716 Glossary **Bolt** row: stages 3.1-3.5; 3.6 & 3.7 run once after all Bolts
//   dist/claude/.claude/amadeus-common/stages/construction/code-generation.md  (CODE_GEN)
//     :176 "orchestrator-managed gating" / "suppressed by the orchestrator" note
//
// Old TAP -> new test parity (1:1; the .sh's plan was 12):
//   .sh tests 1-4  ("Construction Phase N" absent for N=1..4)  -> 4 tests,
//                   one per N, each asserting SKILL.md does NOT contain the label
//                   (the failure-event half of this guard: the label being
//                    REINTRODUCED must make the test go red).
//   .sh tests 5-8  (the Event Registry registers the 4 Bolt events)-> 4 tests, one
//                   per event, each asserting the quoted event literal is present.
//                   STRONGER: assert it is present in the canonical registry.
//   .sh test 9     (audit-format.md documents BOLT_STARTED)     -> "audit-format.md documents BOLT_STARTED"
//   .sh test 10    (state-template.md has Construction Autonomy Mode) -> "state-template.md exposes Construction Autonomy Mode"
//   .sh test 11    (stage-protocol Glossary ties Bolt to 3.1-3.5 + 3.6/3.7 once) -> "stage-protocol.md Glossary ..."
//   .sh test 12    (code-generation.md notes orchestrator-managed gating) -> "code-generation.md notes orchestrator-managed gating"

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AMADEUS_SRC } from "../harness/fixtures.ts";
import { canonicalAuditEvents } from "../../dist/claude/.claude/otel/event-registry.ts";

// The six shipped files the .sh's path vars pointed at.
const SKILL_MD = readFileSync(
  join(AMADEUS_SRC, "skills", "amadeus", "SKILL.md"),
  "utf-8",
);
const EVENT_REGISTRY = new Set(canonicalAuditEvents());
const AUDIT_FORMAT = readFileSync(
  join(AMADEUS_SRC, "knowledge", "amadeus-shared", "audit-format.md"),
  "utf-8",
);
const STATE_TEMPLATE = readFileSync(
  join(AMADEUS_SRC, "knowledge", "amadeus-shared", "state-template.md"),
  "utf-8",
);
const STAGE_PROTOCOL = readFileSync(
  join(AMADEUS_SRC, "amadeus-common", "protocols", "stage-protocol.md"),
  "utf-8",
);
const CODE_GEN = readFileSync(
  join(
    AMADEUS_SRC,
    "amadeus-common",
    "stages",
    "construction",
    "code-generation.md",
  ),
  "utf-8",
);

describe("t47 Construction Bolt vocabulary (migrated from t47-construction-bolts.sh, plan 12)", () => {
  // =========================================================================
  // Tests 1-4 — the retired "Construction Phase N" sub-step labels are GONE
  // from SKILL.md (engine cutover moved per-Bolt orchestration prose out of
  // SKILL.md). This is the failure-event half of the guard: if any of these
  // labels is REINTRODUCED, the corresponding test goes red — same direction
  // as the .sh's not_ok branch.
  // =========================================================================
  for (const n of [1, 2, 3, 4] as const) {
    test(`SKILL.md no longer labels sub-steps "Construction Phase ${n}"`, () => {
      expect(SKILL_MD.includes(`Construction Phase ${n}`)).toBe(false);
    });
  }

  // =========================================================================
  // Tests 5-8 — the four Bolt audit events are registered in the Event Registry.
  // The .sh grepped for the quoted event literal `"<EVENT>"`. STRONGER here:
  // assert each event is present in the canonical registry.
  // =========================================================================

  for (const event of [
    "BOLT_STARTED",
    "BOLT_COMPLETED",
    "BOLT_FAILED",
    "AUTONOMY_MODE_SET",
  ] as const) {
    test(`the Event Registry registers ${event}`, () => {
      expect(EVENT_REGISTRY.has(event)).toBe(true);
    });
  }

  // =========================================================================
  // Test 9 — audit-format.md documents BOLT_STARTED (.sh assert_grep).
  // =========================================================================
  test("audit-format.md documents BOLT_STARTED", () => {
    expect(AUDIT_FORMAT.includes("BOLT_STARTED")).toBe(true);
  });

  // =========================================================================
  // Test 10 — state-template.md exposes the Construction Autonomy Mode field
  // (.sh assert_grep).
  // =========================================================================
  test("state-template.md exposes Construction Autonomy Mode", () => {
    expect(STATE_TEMPLATE.includes("Construction Autonomy Mode")).toBe(true);
  });

  // =========================================================================
  // Test 11 — stage-protocol.md Glossary ties a Bolt to stages 3.1-3.5, with
  // 3.6/3.7 run once at the end. The .sh required BOTH greps to hit on the same
  // file:
  //   grep -q  "3\.1.*3\.5"           (the `.` matches the en-dash in "3.1-3.5")
  //   grep -qi "3\.6.*3\.7.*once"
  // Reproduce both as regex tests against the shipped bytes. STRONGER: assert
  // both on a SINGLE line (the Glossary **Bolt** row), so a split across
  // unrelated lines can't satisfy the guard.
  // =========================================================================
  test("stage-protocol.md Glossary ties Bolt to 3.1-3.5 with 3.6/3.7 once at end", () => {
    // .sh grep half 1: "3.1<anything>3.5" — the literal `.` is any-char, which
    // is how the .sh matched the en-dash form "3.1-3.5".
    expect(/3.1.*3.5/.test(STAGE_PROTOCOL)).toBe(true);
    // .sh grep half 2 (case-insensitive): "3.6<...>3.7<...>once".
    expect(/3.6.*3.7.*once/i.test(STAGE_PROTOCOL)).toBe(true);
    // STRONGER: both halves co-located on one Glossary row. Find the line that
    // carries the 3.1-3.5 span and assert the 3.6/3.7-once clause is on it too.
    const boltRow = STAGE_PROTOCOL.split("\n").find((l) =>
      /3.1.*3.5/.test(l),
    );
    expect(boltRow).toBeDefined();
    expect(/3.6.*3.7.*once/i.test(boltRow ?? "")).toBe(true);
  });

  // =========================================================================
  // Test 12 — code-generation.md notes orchestrator-managed gating in the Bolt
  // flow. The .sh used a case-insensitive alternation:
  //   grep -qi "orchestrator-managed gating\|suppressed by the orchestrator"
  // i.e. EITHER phrase satisfies it. Reproduce the alternation; the shipped
  // file carries both (see :176).
  // =========================================================================
  test("code-generation.md notes orchestrator-managed gating in Bolt flow", () => {
    expect(
      /orchestrator-managed gating|suppressed by the orchestrator/i.test(
        CODE_GEN,
      ),
    ).toBe(true);
  });
});
