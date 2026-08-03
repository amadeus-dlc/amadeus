// covers: function:parseMirrorBoundaryReceipts, function:serializeMirrorBoundaryReceipts
// size: small
//
// t418 — properties for the Mirror Boundary Receipts codec (#1980, Bolt 2, unit
// state-pbt). The writer and reader must agree: every value the writer emits
// survives the reader (P-ST1), every text it cannot emit is rejected rather than
// half-understood (P-ST2).
//
// P-ST1 is equality AFTER NORMALIZATION, not byte identity — the writer reorders
// keys and drops undefined phases, so parse ∘ serialize is the identity on the
// writer's own image while the reverse is deliberately not asserted (BR-ST-1).
// Neither normalization nor rejection is re-implemented here, so an oracle blind
// spot cannot cancel a defect out (cid:build-and-test:pbt-oracle-cancellation).
//
// In-process: pure functions imported from core, no spawn, no filesystem.
//
// ── PBT CONVENTIONS ─────────────────────────────────────────────────────────
// Mirrors tests/unit/setup-semver.pbt.test.ts (the canonical B1 definition):
// 1. DETERMINISTIC PR CI. Every property runs with a FIXED per-property seed
//    (PBT_SEED below) and fast-check's DEFAULT numRuns (100). A fixed seed makes
//    a red build reproducible: the same counterexample on re-run, in CI too.
// 2. FAILURE OUTPUT. On failure fast-check prints the seed, replay path, and
//    the SHRUNK counterexample — enough to reproduce with no extra wiring.
// 3. PINNING SHRUNK COUNTEREXAMPLES. When a property catches a real bug, copy
//    the shrunk counterexample into an example-based test and commit it as the
//    permanent regression pin; the property keeps hunting.
// 4. DEEP RUNS (opt-in, no new CI job). AMADEUS_PBT_DEEP=1 raises numRuns via
//    the existing `--release` tier; default (CI) runs stay in the small band.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import {
  nonConformingBranchArbs,
  nonConformingReceiptsTextArb,
  receiptsArb,
} from "../helpers/arbitraries/state-receipts.ts";
import {
  parseMirrorBoundaryReceipts,
  serializeMirrorBoundaryReceipts,
} from "../../packages/framework/core/tools/amadeus-state.ts";

// Fixed seed: deterministic replay of any counterexample (convention #1).
const PBT_SEED = 0x19_80e3;
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
// PR CI: default numRuns (100). Deep tier: a large budget, opt-in via env.
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };

describe("t418 mirror boundary receipts codec", () => {
  // toEqual (deep, key-order independent) rather than comparing serialized text:
  // the writer's reordering is the normalization this property absorbs (BR-ST-2).
  test("P-ST1: receipts survive serialize → parse unchanged", () => {
    fc.assert(
      fc.property(receiptsArb, (receipts) => {
        expect(parseMirrorBoundaryReceipts(serializeMirrorBoundaryReceipts(receipts))).toEqual(
          receipts,
        );
      }),
      OPTS,
    );
  });

  // Argument-free toThrow: why it rejected is the reader's business, and
  // re-checking the message would re-implement the rules under test (BR-ST-3).
  test("P-ST2: non-conforming receipts text is rejected, never half-parsed", () => {
    fc.assert(
      fc.property(nonConformingReceiptsTextArb, (text) => {
        expect(() => parseMirrorBoundaryReceipts(text)).toThrow();
      }),
      OPTS,
    );
  });

  // Generator self-check, NOT part of P-ST2: a constructor that tripped an
  // EARLIER branch would leave its own branch untested while P-ST2 stayed green.
  // Message matching is confined here; the reach evidence of record is lcov DA.
  test("BR-ST-4: each generator constructor reaches its own rejection branch", () => {
    const expectedFragment: Record<keyof typeof nonConformingBranchArbs, string> = {
      duplicatePhase: "duplicate phase",
      invalidJson: "invalid JSON",
      nonObject: "must be a JSON object",
      unknownPhase: "unknown phase",
      invalidStatus: "invalid status",
    };
    for (const [branch, arb] of Object.entries(nonConformingBranchArbs)) {
      const fragment = expectedFragment[branch as keyof typeof nonConformingBranchArbs];
      for (const text of fc.sample(arb, { numRuns: 40, seed: PBT_SEED })) {
        expect(() => parseMirrorBoundaryReceipts(text)).toThrow(fragment);
      }
    }
  });
});
