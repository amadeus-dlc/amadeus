// covers: function:setField, function:getField, function:fieldExists
// size: small
//
// t419 — properties for the state file's text field layer (#1980, Bolt 2, unit
// state-pbt). `- **Field**: value` lines are written by setField, read by
// getField, and joined by fieldExists — the canonical "the field is present"
// predicate setField and setFieldStrict already share.
//
// The pair is asymmetric on purpose: setField SILENTLY NO-OPS on an absent field
// (#1027 left that in place; requirements A-2 keeps it). So the round-trip is a
// CONDITIONAL property over the accepting domain (P-ST3) and the rest of the
// domain gets its own characterization (P-ST4) instead of being quietly dropped.
// P-ST4 turns "silently does nothing" into a pinned contract.
//
// The accepting domain is narrower than "no newline": under the m flag `.` and
// `$` stop at all four JS line terminators, and setField writes through
// String.prototype.replace, where $&, $`, $', $n and $$ expand instead of being
// stored. fieldValueArb excludes both classes — describing the implementation,
// not proposing to change it.
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
  fieldValueArb,
  stateContentWithFieldArb,
  stateContentWithoutFieldArb,
} from "../helpers/arbitraries/state-field.ts";
import {
  fieldExists,
  getField,
  setField,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

// Fixed seed: deterministic replay of any counterexample (convention #1).
const PBT_SEED = 0x19_80e4;
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
// PR CI: default numRuns (100). Deep tier: a large budget, opt-in via env.
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };

// Deliberately reaches past the accepting domain, including both classes that
// break the round-trip. Local: the shared generator stays domain-restricted.
const unrestrictedValueArb: fc.Arbitrary<string> = fc.oneof(
  fc.string(),
  fc.constantFrom("$&", "$`", "$'", "$1", "$$", "a\nb", "a\rb", "a\u2028b", "a\u2029b"),
);

describe("t419 state text field codec", () => {
  // Expected value is value.trim() because trimming is getField's own semantics,
  // not a liberty taken here. The domain is met CONSTRUCTIVELY by the generator
  // rather than by fc.pre, which would silently shrink the run count; the
  // fieldExists assertion is the non-vacuity guard on that construction.
  test("P-ST3: a value written into an existing field reads back trimmed", () => {
    fc.assert(
      fc.property(stateContentWithFieldArb, fieldValueArb, ({ content, field }, value) => {
        expect(fieldExists(content, field)).toBe(true);
        expect(getField(setField(content, field, value), field)).toBe(value.trim());
      }),
      OPTS,
    );
  });

  // Byte-identical no-op for ANY value, including the ones P-ST3 must exclude.
  // Pinning the behaviour, not endorsing it: it just cannot change silently.
  test("P-ST4: setField on an absent field returns the content unchanged", () => {
    fc.assert(
      fc.property(stateContentWithoutFieldArb, unrestrictedValueArb, ({ content, field }, value) => {
        expect(fieldExists(content, field)).toBe(false);
        expect(setField(content, field, value)).toBe(content);
      }),
      OPTS,
    );
  });
});
