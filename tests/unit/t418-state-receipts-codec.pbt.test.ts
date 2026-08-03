// covers: function:parseMirrorBoundaryReceipts, function:serializeMirrorBoundaryReceipts
// size: small
//
// t418 — properties for the Mirror Boundary Receipts codec (#1980, Bolt 2,
// unit state-pbt). The receipts field is written by serializeMirrorBoundaryReceipts
// and read back by parseMirrorBoundaryReceipts, so the pair must agree: every
// value the writer can emit must survive the reader (P-ST1), and every text the
// writer can NOT emit must be rejected rather than half-understood (P-ST2).
//
// P-ST1 is stated as "equality after normalization", not byte identity: the
// writer reorders keys into MIRROR_BOUNDARY_PHASES order and drops undefined
// phases, so `parse ∘ serialize` is the identity on the writer's own image while
// the reverse direction (`serialize ∘ parse`) is deliberately NOT asserted
// (BR-ST-1). Neither the normalization rules nor the rejection rules are
// re-implemented here — that would let a shared blind spot between oracle and
// subject cancel out (cid:build-and-test:pbt-oracle-cancellation).
//
// In-process: the pure codec is imported from the core source of truth and
// exercised directly — no process is spawned, no filesystem is touched.
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
  // P-ST1: parse ∘ serialize = normalize, which is the identity on already
  // normalized values. toEqual (deep, key-order independent) rather than a byte
  // comparison of the serialized text, because the writer's reordering is the
  // very normalization this property is allowed to absorb (BR-ST-2).
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

  // P-ST2: the fail-closed side. Every non-conforming text is rejected. The
  // assertion is argument-free toThrow — the reason for rejection is the
  // reader's business, and re-checking the message here would re-implement the
  // rejection rules the property exists to guard (BR-ST-3).
  test("P-ST2: non-conforming receipts text is rejected, never half-parsed", () => {
    fc.assert(
      fc.property(nonConformingReceiptsTextArb, (text) => {
        expect(() => parseMirrorBoundaryReceipts(text)).toThrow();
      }),
      OPTS,
    );
  });

  // BR-ST-4 generator self-check — NOT part of P-ST2. Each constructor of
  // nonConformingReceiptsTextArb must land on the rejection branch it was built
  // for: a constructor that trips an EARLIER branch would leave its own branch
  // untested while P-ST2 still passed (the false-green R-1 guards against).
  // Message matching is confined to this check; the branch-reach evidence of
  // record is the lcov DA measurement required by BR-ST-6.
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
