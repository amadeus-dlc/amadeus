// covers: domain:setup-plan
// size: small
//
// Property-based tests for the setup CLI's install-plan decision seams
// (#697 Phase B). In-process: the pure decision functions (classify,
// classifyAction) are imported and exercised directly — no process is spawned,
// no filesystem or network is touched — so this file classifies as a SMALL test
// and joins the fast unit tier. The filesystem-driven Plan.forInstall behaviour
// stays covered by tests/unit/setup-plan.test.ts.
//
// ── PBT CONVENTIONS ─────────────────────────────────────────────────────────
// These follow the canonical definition in tests/unit/setup-semver.pbt.test.ts:
// 1. DETERMINISTIC PR CI — every property runs with a FIXED per-file seed
//    (PBT_SEED) and fast-check's DEFAULT numRuns (100), so a red build replays
//    the same shrunk counterexample locally and in CI.
// 2. FAILURE OUTPUT — on failure fast-check prints the seed, replay path, and
//    the SHRUNK counterexample; no extra wiring needed.
// 3. PINNING — when a property catches a real bug, copy the shrunk
//    counterexample into an example-based test and commit it as the regression
//    pin; the property keeps hunting.
// 4. DEEP RUNS — AMADEUS_PBT_DEEP=1 raises numRuns to a deep budget, driven from
//    the existing `--release` tier; default (CI) runs stay in the small band.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import type { FileClass } from "../../packages/setup/src/domain/manifest.ts";
import type { PlanAction } from "../../packages/setup/src/domain/plan.ts";
import { classify, classifyAction } from "../../packages/setup/src/domain/plan.ts";

// Fixed seed: deterministic replay of any counterexample (convention #1).
const PBT_SEED = 0x5e_706c; // "Xpl"
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
// PR CI: default numRuns (100). Deep tier: a large budget, opt-in via env.
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };

const FILE_CLASSES: readonly FileClass[] = ["owned", "shared", "user-preserved"];
const fileClassArb: fc.Arbitrary<FileClass> = fc.constantFrom(...FILE_CLASSES);

// A relative-path generator that stresses classify's three discriminators:
// the `amadeus-` basename prefix, a `memory` path segment, and neither. It
// deliberately mixes separators, casing, and extensions so the totality
// property (P-PL1) sees inputs classify was not hand-tuned for. Note: classify
// splits on "/" only (not the OS separator), so paths are joined with "/".
const pathSegmentArb: fc.Arbitrary<string> = fc.oneof(
  // Segments that can trigger the discriminators.
  fc.constantFrom("memory", "Memory", "MEMORY", "amadeus-x", "amadeus-", "amadeus"),
  // Arbitrary segment names with mixed case and optional extension.
  fc
    .tuple(
      fc.string({ minLength: 1, maxLength: 8 }).filter((s) => !s.includes("/")),
      fc.constantFrom("", ".md", ".ts", ".JSON", ".Md", ".txt"),
    )
    .map(([name, ext]) => `${name}${ext}`),
);

const relPathArb: fc.Arbitrary<string> = fc
  .array(pathSegmentArb, { minLength: 1, maxLength: 5 })
  .map((segs) => segs.join("/"));

describe("Plan decision property: P-PL1 classify is total over relative paths", () => {
  test("classify returns a FileClass and never throws for any relPath shape", () => {
    fc.assert(
      fc.property(relPathArb, (relPath) => {
        // Totality: a value is always produced (no throw), and it is one of the
        // three declared FileClass members — nothing outside the union.
        const cls = classify(relPath);
        expect(FILE_CLASSES).toContain(cls);
      }),
      OPTS,
    );
  });
});

describe("Plan decision property: P-PL2 classifyAction obeys the three install laws", () => {
  // Law (a) BR-I10: a non-existent target file is always "add", regardless of
  // force or class. exists=false short-circuits before any other branch.
  test("(a) exists=false ⇒ action is always \"add\" (force/class independent)", () => {
    fc.assert(
      fc.property(fc.boolean(), fileClassArb, (force, cls) => {
        expect(classifyAction(false, force, cls)).toBe<PlanAction>("add");
      }),
      OPTS,
    );
  });

  // Law (b) BR-I12~I14: for an existing file under --force, the action is a pure
  // function of class alone — force being true removes the conflict branch, so
  // two forced calls with the same class always agree, and the mapping is the
  // fixed owned→update / user-preserved→skip / shared→backup table.
  test("(b) exists=true ∧ force=true ⇒ action determined by class only", () => {
    const expected: Record<FileClass, PlanAction> = {
      owned: "update",
      "user-preserved": "skip",
      shared: "backup",
    };
    fc.assert(
      fc.property(fileClassArb, (cls) => {
        expect(classifyAction(true, true, cls)).toBe(expected[cls]);
      }),
      OPTS,
    );
  });

  // Law (c) BR-I11: "conflict" ⟺ (exists ∧ ¬force). This is the iff — conflict is
  // returned exactly when the file exists and force is off, and in no other case.
  test("(c) action === \"conflict\" iff (exists ∧ ¬force)", () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), fileClassArb, (exists, force, cls) => {
        const isConflict = classifyAction(exists, force, cls) === "conflict";
        expect(isConflict).toBe(exists && !force);
      }),
      OPTS,
    );
  });
});

// Representative examples — human-readable anchors for the properties above.
describe("Plan decision examples (readable anchors)", () => {
  test("classify: amadeus- prefix ⇒ owned; memory segment ⇒ user-preserved; else shared", () => {
    expect(classify("tools/amadeus-orchestrate.ts")).toBe<FileClass>("owned");
    expect(classify("amadeus-state.md")).toBe<FileClass>("owned");
    expect(classify("memory/org.md")).toBe<FileClass>("user-preserved");
    expect(classify("skills/amadeus/SKILL.md")).toBe<FileClass>("shared");
  });

  test("classifyAction: the five representative decisions", () => {
    expect(classifyAction(false, false, "shared")).toBe<PlanAction>("add"); // (a)
    expect(classifyAction(true, false, "owned")).toBe<PlanAction>("conflict"); // (c)
    expect(classifyAction(true, true, "owned")).toBe<PlanAction>("update"); // (b)
    expect(classifyAction(true, true, "user-preserved")).toBe<PlanAction>("skip"); // (b)
    expect(classifyAction(true, true, "shared")).toBe<PlanAction>("backup"); // (b)
  });
});
