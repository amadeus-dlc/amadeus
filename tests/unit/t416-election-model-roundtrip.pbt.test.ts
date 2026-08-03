// covers: function:Election.parse
// size: small
//
// t416 — roundtrip property for the election definition parser (#1980, Bolt 1
// walking skeleton). election.json is written by JSON.stringify and read back by
// JSON.parse, so the parser must be a faithful decoder of its own encoding: a
// definition that went through the file format must come back unchanged. This
// is the encode/decode half of the read-path work; the fail-closed half (a file
// that must be rejected) lives in the sibling integration file t417, which
// touches a real filesystem and is therefore MEDIUM.
//
// In-process: the pure parser is imported from the core source of truth and
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
import { validElectionArb } from "../helpers/arbitraries/election";
import { Election } from "../../packages/framework/core/tools/amadeus-election-model";

// Fixed seed: deterministic replay of any counterexample (convention #1).
const PBT_SEED = 0x19_80e1;
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
// PR CI: default numRuns (100). Deep tier: a large budget, opt-in via env.
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };

describe("t416 election definition roundtrip", () => {
  // P-EL1: parse ∘ decode ∘ encode = ok(identity) over the parser's own output
  // shape. Metamorphic — no independent re-implementation of the parse rules,
  // so a shared blind spot between oracle and subject cannot cancel out.
  test("P-EL1: a valid definition survives the JSON file format unchanged", () => {
    fc.assert(
      fc.property(validElectionArb, (election) => {
        const parsed = Election.parse(JSON.parse(JSON.stringify(election)));
        expect(parsed.ok).toBe(true);
        if (parsed.ok) expect(parsed.value).toEqual(election);
      }),
      OPTS,
    );
  });
});
