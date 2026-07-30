// covers: function:evaluateGate function:checkMixedJournal function:checkRegistryComplete function:checkCallsitesZero function:checkShadowEquivalence function:checkRelayProof function:checkDistributionGuards
//
// U8 (legacy-writer-removal) — the deletion gate's pure core (FR-MIG-4).
//
// The gate decides ONE thing: may the legacy audit writer be deleted yet. It
// says GREEN only when all six conditions (a)-(f) report PASS; anything else
// is BLOCKED (BR-1). "Anything else" deliberately includes a condition that
// could not be judged at all: an unjudgeable condition is UNKNOWN, never PASS
// (BR-12), because a gate that reads silence as success is worse than no gate.

import { describe, expect, test } from "bun:test";
import {
  type ConditionResult,
  checkCallsitesZero,
  checkDistributionGuards,
  checkMixedJournal,
  checkRegistryComplete,
  checkRelayProof,
  checkShadowEquivalence,
  evaluateGate,
  validateReportShape,
} from "../deletion-gate.ts";

const AT = "2026-07-30T00:00:00.000Z";
const REF = "0123456789abcdef0123456789abcdef01234567";

const pass = (condition: string): ConditionResult => ({
  condition,
  verdict: "PASS",
  evidence: `evidence:${condition}`,
  detail: "",
});

describe("evaluateGate — six PASS and nothing else is GREEN", () => {
  test("all six conditions PASS yields GREEN", () => {
    const report = evaluateGate(["a", "b", "c", "d", "e", "f"].map(pass), AT, REF);
    expect(report.overall).toBe("GREEN");
    expect(report.results).toHaveLength(6);
    expect(report.evaluatedAt).toBe(AT);
    expect(report.commitRef).toBe(REF);
  });

  test("a single FAIL blocks the gate", () => {
    const results = ["a", "b", "d", "e", "f"].map(pass);
    const failed: ConditionResult = { condition: "c", verdict: "FAIL", evidence: "callsite-guard", detail: "66 remaining" };
    results.push(failed);
    expect(evaluateGate(results, AT, REF).overall).toBe("BLOCKED");
  });

  test("a missing condition is filled with UNKNOWN and blocks the gate", () => {
    const report = evaluateGate(["a", "b", "c", "d", "f"].map(pass), AT, REF);
    expect(report.overall).toBe("BLOCKED");
    expect(report.results).toHaveLength(6);
    const e = report.results.find((r) => r.condition === "e");
    expect(e?.verdict).toBe("UNKNOWN");
  });
});

// --- the six checkers -------------------------------------------------------
//
// Every checker takes MEASURED evidence and returns a ConditionResult. They are
// pure so both arms of each are reachable from a test without a fixture tree:
// the "not達成 -> FAIL / 達成 -> PASS" pair BR-15 requires, plus the
// unjudgeable -> UNKNOWN arm BR-12 requires.

const ran = (passed: boolean, detail = "") => ({ ran: true, passed, detail, sources: ["t365"] });

describe("checkMixedJournal — condition (a)", () => {
  test("passing mixed-journal suite is PASS", () => {
    expect(checkMixedJournal(ran(true)).verdict).toBe("PASS");
  });
  test("failing suite is FAIL", () => {
    expect(checkMixedJournal(ran(false, "1 failing")).verdict).toBe("FAIL");
  });
  test("suite that never ran is UNKNOWN, not PASS", () => {
    expect(checkMixedJournal({ ran: false, passed: false, detail: "runner absent", sources: [] }).verdict).toBe(
      "UNKNOWN"
    );
    expect(checkMixedJournal(null).verdict).toBe("UNKNOWN");
  });
});

describe("checkRegistryComplete — condition (b)", () => {
  test("no drift is PASS", () => {
    expect(checkRegistryComplete([]).verdict).toBe("PASS");
  });
  test("any drift entry is FAIL", () => {
    const result = checkRegistryComplete(["STAGE_STARTED missing from registry"]);
    expect(result.verdict).toBe("FAIL");
    expect(result.detail).toContain("STAGE_STARTED");
  });
  test("unmeasured drift is UNKNOWN", () => {
    expect(checkRegistryComplete(null).verdict).toBe("UNKNOWN");
  });
});

describe("checkCallsitesZero — condition (c)", () => {
  test("zero remaining call sites is PASS", () => {
    expect(checkCallsitesZero(0).verdict).toBe("PASS");
  });
  test("any remaining call site is FAIL", () => {
    const result = checkCallsitesZero(66);
    expect(result.verdict).toBe("FAIL");
    expect(result.detail).toContain("66");
  });
  test("unmeasured census is UNKNOWN", () => {
    expect(checkCallsitesZero(null).verdict).toBe("UNKNOWN");
  });
});

const performed = (equivalent: boolean) => ({ performed: true as const, equivalent, detail: "" });
const shadow = (equivalent: boolean, unexplainedDiffs: string[] = []) => ({
  generatedAt: AT,
  eventCount: performed(equivalent),
  linkage: performed(equivalent),
  status: performed(equivalent),
  allowedAttributes: performed(equivalent),
  unexplainedDiffs,
});

describe("checkShadowEquivalence — condition (d)", () => {
  test("all four dimensions equivalent with no unexplained diff is PASS", () => {
    expect(checkShadowEquivalence(shadow(true)).verdict).toBe("PASS");
  });
  test("a non-equivalent dimension is FAIL", () => {
    expect(checkShadowEquivalence(shadow(false)).verdict).toBe("FAIL");
  });
  test("an unexplained diff is FAIL even when every dimension is equivalent", () => {
    expect(checkShadowEquivalence(shadow(true, ["oldPath: 2 torn store line(s)"])).verdict).toBe("FAIL");
  });
  test("a comparison that did not run is UNKNOWN, never agreement", () => {
    const unperformed = {
      ...shadow(true),
      linkage: { performed: false as const, reason: "new store absent" },
    };
    expect(checkShadowEquivalence(unperformed).verdict).toBe("UNKNOWN");
    expect(checkShadowEquivalence(null).verdict).toBe("UNKNOWN");
  });
});

describe("checkRelayProof — condition (e)", () => {
  test("proof tests present and passing is PASS", () => {
    expect(checkRelayProof({ moduleExists: true, proofTests: ["tests/integration/relay-no-span-proof.test.ts"], outcome: ran(true) }).verdict).toBe("PASS");
  });
  test("module present but proof tests absent is FAIL (BR-10)", () => {
    expect(checkRelayProof({ moduleExists: true, proofTests: [], outcome: null }).verdict).toBe("FAIL");
  });
  test("module present and proof tests failing is FAIL", () => {
    expect(checkRelayProof({ moduleExists: true, proofTests: ["tests/integration/relay-no-span-proof.test.ts"], outcome: ran(false) }).verdict).toBe("FAIL");
  });
  test("Relay module not delivered yet is UNKNOWN, not FAIL (BR-12)", () => {
    expect(checkRelayProof({ moduleExists: false, proofTests: [], outcome: null }).verdict).toBe("UNKNOWN");
    expect(checkRelayProof(null).verdict).toBe("UNKNOWN");
  });
});

describe("checkDistributionGuards — condition (f)", () => {
  test("guards passing is PASS", () => {
    expect(checkDistributionGuards(ran(true)).verdict).toBe("PASS");
  });
  test("guards failing is FAIL", () => {
    expect(checkDistributionGuards(ran(false, "dist DIFFERS")).verdict).toBe("FAIL");
  });
  test("guards that never ran are UNKNOWN", () => {
    expect(checkDistributionGuards(null).verdict).toBe("UNKNOWN");
  });
});

// --- report schema -----------------------------------------------------------
//
// The report is the ONLY admissible evidence that deletion may start (BR-2,
// BR-16), so its shape is machine-checked: an unknown key means something other
// than this evaluator wrote it, and a credential-shaped value means a checker
// leaked evidence it was told not to carry (security-design.md — evidence holds
// identifiers only: file paths, event types, call-site positions).

describe("validateReportShape — the report is checkable, not merely present", () => {
  const wellFormed = () => evaluateGate(["a", "b", "c", "d", "e", "f"].map(pass), AT, REF);

  test("a report this evaluator produced validates clean", () => {
    expect(validateReportShape(wellFormed())).toEqual([]);
  });

  test("an unknown top-level key is rejected", () => {
    const tampered = { ...wellFormed(), forcedGreen: true };
    expect(validateReportShape(tampered).join(" ")).toContain("forcedGreen");
  });

  test("an unknown key inside a result is rejected", () => {
    const report = wellFormed();
    const tampered = { ...report, results: [{ ...report.results[0], override: "yes" }, ...report.results.slice(1)] };
    expect(validateReportShape(tampered).join(" ")).toContain("override");
  });

  test("a missing field is rejected", () => {
    const { commitRef: _dropped, ...missing } = wellFormed();
    expect(validateReportShape(missing).join(" ")).toContain("commitRef");
  });

  test("an out-of-vocabulary verdict is rejected", () => {
    const report = wellFormed();
    const tampered = { ...report, results: [{ ...report.results[0], verdict: "GREEN" }, ...report.results.slice(1)] };
    expect(validateReportShape(tampered).join(" ")).toContain("verdict");
  });

  test("credential-shaped evidence is rejected", () => {
    const report = wellFormed();
    const leaked = {
      ...report,
      results: [
        { ...report.results[0], detail: "failed with Authorization: Bearer sk-ant-not-a-real-key" },
        ...report.results.slice(1),
      ],
    };
    expect(validateReportShape(leaked).join(" ")).toContain("sensitive");
  });

  test("ordinary identifier evidence is not mistaken for a credential", () => {
    const report = wellFormed();
    const ordinary = {
      ...report,
      results: [
        { ...report.results[0], evidence: "packages/framework/core/tools/amadeus-audit.ts:400", detail: "STAGE_STARTED" },
        ...report.results.slice(1),
      ],
    };
    expect(validateReportShape(ordinary)).toEqual([]);
  });

  test("a non-object is rejected rather than thrown on", () => {
    expect(validateReportShape(null).length).toBeGreaterThan(0);
    expect(validateReportShape("GREEN").length).toBeGreaterThan(0);
  });
});

// --- the schema validator's remaining rejection arms -------------------------
//
// Each arm below is a way a report could be malformed. They are tested rather
// than waived because this validator is what stands between a tampered or
// truncated report and a deletion that believes it was authorised.

describe("validateReportShape — every malformation is named", () => {
  const wellFormed = () => evaluateGate(["a", "b", "c", "d", "e", "f"].map(pass), AT, REF);

  test("a result that is not an object is rejected", () => {
    const report = wellFormed();
    const tampered = { ...report, results: ["GREEN", ...report.results.slice(1)] };
    expect(validateReportShape(tampered).join(" ")).toContain("must be an object");
  });

  test("a condition outside (a)-(f) is rejected", () => {
    const report = wellFormed();
    const tampered = { ...report, results: [{ ...report.results[0], condition: "g" }, ...report.results.slice(1)] };
    expect(validateReportShape(tampered).join(" ")).toContain("is not a gate condition");
  });

  test("an overall outside GREEN/BLOCKED is rejected", () => {
    expect(validateReportShape({ ...wellFormed(), overall: "MAYBE" }).join(" ")).toContain("not GREEN/BLOCKED");
  });

  test("results that are not an array are rejected", () => {
    expect(validateReportShape({ ...wellFormed(), results: {} }).join(" ")).toContain("must be an array");
  });

  test("the wrong number of results is rejected", () => {
    const report = wellFormed();
    expect(validateReportShape({ ...report, results: report.results.slice(0, 5) }).join(" ")).toContain(
      "must hold 6 results"
    );
  });
});

describe("evaluateGate — conflicting reports are not silently resolved", () => {
  test("two results for one condition make it UNKNOWN rather than picking one", () => {
    const duplicated = [...["a", "b", "c", "d", "e", "f"].map(pass), pass("c")];
    const report = evaluateGate(duplicated, AT, REF);
    const c = report.results.find((r) => r.condition === "c");
    expect(c?.verdict).toBe("UNKNOWN");
    expect(c?.detail).toContain("conflicting");
    expect(report.overall).toBe("BLOCKED");
  });
});

// --- malformed shadow reports ------------------------------------------------
//
// The shadow report is the one piece of gate evidence that arrives as a file
// written by another Unit, so it is the one input that can be shaped wrongly
// without anybody noticing. Two ways that went wrong (PR #1766 review):
//
//   - a dimension marked performed but carrying no `equivalent` slipped past a
//     `=== false` test and read as agreement — a fail-open on the exact field
//     the condition is about;
//   - a report missing a dimension, or missing unexplainedDiffs, threw while
//     being judged, which surfaced as an UNEXPECTED gate crash rather than as
//     the BLOCKED verdict BR-12 asks for.
//
// Both now land on UNKNOWN: the report cannot be judged, so it does not pass.

const malformed = (mutate: (r: Record<string, unknown>) => void) => {
  const base = JSON.parse(JSON.stringify(shadow(true))) as Record<string, unknown>;
  mutate(base);
  return base as never;
};

describe("checkShadowEquivalence — a report that cannot be judged is UNKNOWN", () => {
  test("a performed dimension with no equivalent field does not read as agreement", () => {
    const result = checkShadowEquivalence(
      malformed((r) => {
        delete (r.linkage as Record<string, unknown>).equivalent;
      })
    );
    expect(result.verdict).toBe("UNKNOWN");
  });

  test("a non-boolean equivalent is rejected rather than coerced", () => {
    const result = checkShadowEquivalence(
      malformed((r) => {
        (r.status as Record<string, unknown>).equivalent = "yes";
      })
    );
    expect(result.verdict).toBe("UNKNOWN");
  });

  test("a missing dimension is UNKNOWN, not a crash", () => {
    const result = checkShadowEquivalence(
      malformed((r) => {
        delete r.eventCount;
      })
    );
    expect(result.verdict).toBe("UNKNOWN");
  });

  test("missing unexplainedDiffs is UNKNOWN, not a crash", () => {
    const result = checkShadowEquivalence(
      malformed((r) => {
        delete r.unexplainedDiffs;
      })
    );
    expect(result.verdict).toBe("UNKNOWN");
  });

  test("unexplainedDiffs that is not a list of strings is rejected", () => {
    expect(
      checkShadowEquivalence(
        malformed((r) => {
          r.unexplainedDiffs = "one diff";
        })
      ).verdict
    ).toBe("UNKNOWN");
    expect(
      checkShadowEquivalence(
        malformed((r) => {
          r.unexplainedDiffs = [{ note: "structured" }];
        })
      ).verdict
    ).toBe("UNKNOWN");
  });

  test("a dimension with a non-boolean performed flag is rejected", () => {
    const result = checkShadowEquivalence(
      malformed((r) => {
        (r.linkage as Record<string, unknown>).performed = "true";
      })
    );
    expect(result.verdict).toBe("UNKNOWN");
  });

  test("a missing generatedAt is rejected", () => {
    const result = checkShadowEquivalence(
      malformed((r) => {
        delete r.generatedAt;
      })
    );
    expect(result.verdict).toBe("UNKNOWN");
  });

  test("an unperformed dimension still needs no equivalent field", () => {
    const result = checkShadowEquivalence(
      malformed((r) => {
        r.linkage = { performed: false, reason: "new store absent" };
      })
    );
    expect(result.verdict).toBe("UNKNOWN");
    expect(result.detail).toContain("linkage");
  });
});
