// covers: function:setField, function:getField, function:fieldExists
// size: small
//
// t419 — properties for the state file's text field layer (#1980, Bolt 2, unit
// state-pbt). `- **Field**: value` lines are written by setField and read back
// by getField, and the two are joined by fieldExists, the canonical "the field
// is present" predicate that setFieldStrict and setField already share.
//
// The write⇔read pair is asymmetric on purpose: setField SILENTLY NO-OPS when
// the field is absent (Issue #1027 left that behaviour in place and this Intent
// does not change it — requirements A-2). So the round-trip is stated as a
// CONDITIONAL property over the accepting domain (P-ST3, fieldExists true) and
// the remaining domain gets its own characterization property (P-ST4) instead of
// being quietly excluded. P-ST4 is what turns "silently does nothing" from an
// undocumented habit into a pinned contract: a future change that starts writing
// absent fields goes red here rather than shipping unnoticed.
//
// The accepting domain for values is narrower than "no newline": getField and
// setField both use `.` and `$` under the m flag, so all four JS line
// terminators (LF, CR, U+2028, U+2029) break the read back; and setField writes
// through String.prototype.replace, so `$`-prefixed replacement patterns ($&,
// $`, $', $n, $$) are expanded instead of stored. fieldValueArb excludes both
// classes — a description of the implementation's semantics, not a proposal to
// change them.
//
// In-process: the pure functions are imported from the core source of truth and
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

// P-ST4 quantifies over ANY value, so it deliberately reaches past fieldValueArb's
// accepting domain and includes the two classes that break the round-trip: line
// terminators and replace() patterns. Local to this property — the shared
// generator stays the accepting-domain one.
const unrestrictedValueArb: fc.Arbitrary<string> = fc.oneof(
  fc.string(),
  fc.constantFrom("$&", "$`", "$'", "$1", "$$", "a\nb", "a\rb", "a\u2028b", "a\u2029b"),
);

describe("t419 state text field codec", () => {
  // P-ST3: on the accepting domain, what setField writes is what getField reads.
  // The expected value is value.trim() because trimming is getField's own
  // semantics (`match[1].trim()`), not a liberty taken by this test.
  //
  // The domain is satisfied CONSTRUCTIVELY by the generator, not by fc.pre: a
  // post-hoc filter would silently shrink the effective run count. The
  // fieldExists assertion is a non-vacuity guard on that construction — and it
  // uses the production predicate, so "the field exists" is never redefined here.
  test("P-ST3: a value written into an existing field reads back trimmed", () => {
    fc.assert(
      fc.property(stateContentWithFieldArb, fieldValueArb, ({ content, field }, value) => {
        expect(fieldExists(content, field)).toBe(true);
        expect(getField(setField(content, field, value), field)).toBe(value.trim());
      }),
      OPTS,
    );
  });

  // P-ST4: off the accepting domain, setField is a byte-identical no-op — for
  // ANY value, including the ones P-ST3 must exclude. Pinning the current
  // behaviour, not endorsing it: the point is that changing it cannot happen
  // silently.
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
