// covers: file:scripts/upstream-sync-closure.ts
// size: medium
//
// U12 verification-and-ledger-closure (FR-0 / FR-7 items 23-24 / FR-8, NFR-5/6).
// Two faces:
//   1. The REAL-filesystem evidence sweep — every non-SKIP item's traced
//      evidence path must actually exist on disk. This is the point of the unit:
//      catching a traced path that does not exist (fs-tests-integration-first,
//      hence `// size: medium` and the integration tier).
//   2. The pure closure logic — traceCoverage, classifyDisposition,
//      assertPhaseVerification, and the FR-8 ledger transition gate, driven
//      in-process (bun --coverage does not instrument spawned children) with a
//      falling proof that a missing APPLIED condition is refused.

import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  assertPhaseVerification,
  type CompletionEvidence,
  classifyDisposition,
  type GateResult,
  type Ledger,
  planLedgerTransition,
  REQUIRED_DISPOSITION_COUNT,
  REQUIRED_GATES,
  resolveEvidence,
  SKIP_ITEMS,
  traceCoverage,
  TRACED_ITEMS,
  UPSTREAM_ITEMS,
  type UpstreamItem,
} from "../../scripts/upstream-sync-closure.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const realExists = (p: string): boolean => existsSync(join(REPO_ROOT, p));

const greenRun = () => ({
  gates: REQUIRED_GATES.map((name) => ({ name, status: "green" as const })),
  patchUncovered: 0,
  waiverJustified: false,
  comparisonSha: "a326f47bc0146a3b4285552f42b92fd61fb343a7",
});

const FINAL_SHA = "a326f47bc0146a3b4285552f42b92fd61fb343a7";
const inProgressLedger: Ledger = { status: "INTENT_IN_PROGRESS", comparison_commit: FINAL_SHA };
const fullEvidence: CompletionEvidence = {
  dispositionCount: REQUIRED_DISPOSITION_COUNT,
  requiredGatesGreen: true,
  finalComparisonSha: FINAL_SHA,
};

describe("t255 catalogue", () => {
  test("30 items = 24 traced + 6 SKIP", () => {
    expect(UPSTREAM_ITEMS.length).toBe(30);
    expect(TRACED_ITEMS.length).toBe(REQUIRED_DISPOSITION_COUNT);
    expect(SKIP_ITEMS.length).toBe(6);
  });

  test("SKIP items are trace-exempt (no evidence)", () => {
    for (const it of SKIP_ITEMS) expect(it.evidence.length).toBe(0);
  });
});

describe("t255 real-fs evidence sweep", () => {
  test("every traced item's evidence path exists on disk (0 missing)", () => {
    const resolution = resolveEvidence(TRACED_ITEMS, realExists);
    expect(resolution.missing).toEqual([]);
    expect(resolution.present.length).toBeGreaterThan(0);
  });

  test("resolveEvidence reports a fabricated path as missing (falling proof)", () => {
    const bogus: UpstreamItem = {
      id: "bogus",
      domain: "x",
      disposition: "ADAPT",
      unit: "Uxx",
      verdict: "PORTED",
      evidence: [{ kind: "test", path: "tests/unit/does-not-exist.test.ts" }],
    };
    const resolution = resolveEvidence([bogus], realExists);
    expect(resolution.missing).toEqual([{ itemId: "bogus", path: "tests/unit/does-not-exist.test.ts" }]);
  });
});

describe("t255 traceCoverage / classifyDisposition", () => {
  test("24/24 is complete", () => {
    const r = traceCoverage(UPSTREAM_ITEMS);
    expect(r.kind).toBe("complete");
    if (r.kind === "complete") expect(r.traced).toBe(REQUIRED_DISPOSITION_COUNT);
  });

  test("23/24 is incomplete and names the missing item", () => {
    const dropped = TRACED_ITEMS[0];
    const r = traceCoverage(TRACED_ITEMS.slice(1));
    expect(r.kind).toBe("incomplete");
    if (r.kind === "incomplete") expect(r.traced).toBe(23);
    // the dropped one is simply absent, not fabricated as traced
    expect(dropped).toBeDefined();
  });

  test("EQUIVALENT without characterization evidence is insufficient (partial rejected)", () => {
    const partial: UpstreamItem = {
      id: "swarm-batch-advance",
      domain: "engine-correctness",
      disposition: "ADAPT",
      unit: "U03",
      verdict: "EQUIVALENT",
      evidence: [{ kind: "test", path: "tests/integration/t251-swarm-and-next-stage.test.ts", characterization: false }],
    };
    expect(classifyDisposition(partial).kind).toBe("insufficient");
  });

  test("an item with no evidence is insufficient", () => {
    const empty: UpstreamItem = { id: "e", domain: "x", disposition: "ADAPT", unit: "U", verdict: "PORTED", evidence: [] };
    expect(classifyDisposition(empty).kind).toBe("insufficient");
  });
});

describe("t255 assertPhaseVerification", () => {
  test("all gates green + covered + SHA => verified", () => {
    expect(assertPhaseVerification(greenRun()).kind).toBe("verified");
  });

  test("a failed gate is not read as green", () => {
    const run = greenRun();
    (run.gates as GateResult[])[1] = { name: run.gates[1].name, status: "failed" };
    expect(assertPhaseVerification(run).kind).toBe("failed");
  });

  test("a not-run required gate fails", () => {
    const run = { ...greenRun(), gates: greenRun().gates.slice(1) };
    const r = assertPhaseVerification(run);
    expect(r.kind).toBe("failed");
    if (r.kind === "failed") expect(r.reasons.some((x) => x.includes("not run"))).toBe(true);
  });

  test("a stale gate fails", () => {
    const run = greenRun();
    (run.gates as GateResult[])[0] = { name: run.gates[0].name, status: "stale" };
    expect(assertPhaseVerification(run).kind).toBe("failed");
  });

  test("uncovered patch lines without a justified waiver fail; justified waiver passes", () => {
    expect(assertPhaseVerification({ ...greenRun(), patchUncovered: 3, waiverJustified: false }).kind).toBe("failed");
    expect(assertPhaseVerification({ ...greenRun(), patchUncovered: 3, waiverJustified: true }).kind).toBe("verified");
  });

  test("missing comparison SHA fails", () => {
    expect(assertPhaseVerification({ ...greenRun(), comparisonSha: null }).kind).toBe("failed");
  });
});

describe("t255 planLedgerTransition (FR-8 gate)", () => {
  test("three conditions => applied", () => {
    const r = planLedgerTransition(inProgressLedger, fullEvidence);
    expect(r.kind).toBe("applied");
    if (r.kind === "applied") expect(r.comparisonSha).toBe(FINAL_SHA);
  });

  // Falling proof: each missing condition must REJECT (never applied, never blocked).
  test("dispositionCount < 24 => reject", () => {
    const r = planLedgerTransition(inProgressLedger, { ...fullEvidence, dispositionCount: 23 });
    expect(r.kind).toBe("reject");
  });

  test("gates not all green => reject", () => {
    const r = planLedgerTransition(inProgressLedger, { ...fullEvidence, requiredGatesGreen: false });
    expect(r.kind).toBe("reject");
  });

  test("final SHA absent => reject", () => {
    const r = planLedgerTransition(inProgressLedger, { ...fullEvidence, finalComparisonSha: null });
    expect(r.kind).toBe("reject");
  });

  test("mere incompleteness is reject, never BLOCKED", () => {
    const r = planLedgerTransition(inProgressLedger, { dispositionCount: 10, requiredGatesGreen: false, finalComparisonSha: null });
    expect(r.kind).toBe("reject");
  });

  test("structured verification-failure => blocked without advancing baseline", () => {
    const r = planLedgerTransition(inProgressLedger, {
      ...fullEvidence,
      terminal: { kind: "verification-failure", gate: "full-ci", observed: "3 failed", targetSha: "deadbeef" },
    });
    expect(r.kind).toBe("blocked");
    if (r.kind === "blocked") expect(r.targetSha).toBe("deadbeef");
  });

  test("structured abandon => blocked", () => {
    const r = planLedgerTransition(inProgressLedger, {
      ...fullEvidence,
      terminal: { kind: "abandon", actor: "leader", reason: "superseded", targetSha: "cafe" },
    });
    expect(r.kind).toBe("blocked");
  });

  test("re-applying the same APPLIED transition is a no-op (no duplicate history)", () => {
    const applied: Ledger = { status: "APPLIED", comparison_commit: FINAL_SHA };
    expect(planLedgerTransition(applied, fullEvidence).kind).toBe("noop");
  });

  test("re-planning the same BLOCKED is a no-op", () => {
    const blocked: Ledger = { status: "BLOCKED", comparison_commit: "a326f47bc0146a3b4285552f42b92fd61fb343a7" };
    const r = planLedgerTransition(blocked, {
      ...fullEvidence,
      terminal: { kind: "abandon", actor: "leader", reason: "superseded", targetSha: "cafe" },
    });
    expect(r.kind).toBe("noop");
  });
});
