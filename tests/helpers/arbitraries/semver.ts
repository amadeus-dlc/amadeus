// Arbitraries for property-based tests over the setup CLI's SemVer / VersionSpec
// domain (#697 / #684 Phase B). These produce STRINGS only — never brand-typed
// values. A SemVer is a brand built exclusively through its smart constructor
// (SemVer.parse); a generator that emitted SemVer objects directly would be able
// to fabricate invalid states the parser can never produce, so this module stops
// at the parser's input boundary and lets the test build domain values.
//
// The grammar mirrored here is packages/setup/src/domain/semver.ts:
//   /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/  (trimmed before matching)

import fc from "fast-check";

// A numeric identifier as the parser sees it: a run of ASCII digits, bounded to
// six so Number() stays lossless. Deliberately allows leading zeros ("007") so
// the roundtrip property exercises SemVer.parse's Number() normalization.
const numericIdentifierArb: fc.Arbitrary<string> = fc
  .array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 6 })
  .map((digits) => digits.join(""));

// A prerelease segment drawn from the parser's charset [0-9A-Za-z.-], non-empty.
const PRERELEASE_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-".split("");
const prereleaseArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...PRERELEASE_CHARS), { minLength: 1, maxLength: 12 })
  .map((chars) => chars.join(""));

/** Valid semver strings: stable or prerelease, with an optional "v" prefix and
 *  possible leading zeros. Every value is accepted by SemVer.parse. */
export const validSemVerStringArb: fc.Arbitrary<string> = fc
  .record({
    prefix: fc.boolean(),
    major: numericIdentifierArb,
    minor: numericIdentifierArb,
    patch: numericIdentifierArb,
    prerelease: fc.option(prereleaseArb, { nil: null }),
  })
  .map(({ prefix, major, minor, patch, prerelease }) => {
    const core = `${prefix ? "v" : ""}${major}.${minor}.${patch}`;
    return prerelease === null ? core : `${core}-${prerelease}`;
  });

/** Valid STABLE semver strings only (no prerelease). Used by the strict-order
 *  properties: isLaterThan is a strict total order over stable versions, but two
 *  stable versions sharing major.minor.patch are non-comparable siblings of any
 *  prerelease (semver-factory.ts:20), so prereleases are excluded from the
 *  ordering domain. */
export const validStableSemVerStringArb: fc.Arbitrary<string> = fc
  .record({
    prefix: fc.boolean(),
    major: numericIdentifierArb,
    minor: numericIdentifierArb,
    patch: numericIdentifierArb,
  })
  .map(({ prefix, major, minor, patch }) => `${prefix ? "v" : ""}${major}.${minor}.${patch}`);

// Illegal characters that can appear inside an otherwise-valid prerelease tail
// but are outside [0-9A-Za-z.-], breaking the anchored match.
const ILLEGAL_PRERELEASE_CHARS = "_+~ !@#/".split("");

/** Strings that SemVer.parse must reject. Each variant is malformed BY
 *  CONSTRUCTION — none can satisfy the anchored grammar — so the "invalid input
 *  always errors" property never depends on the parser to decide invalidity
 *  (which would be circular). */
export const invalidSemVerStringArb: fc.Arbitrary<string> = fc.oneof(
  // Two segments only: no patch.
  fc.tuple(numericIdentifierArb, numericIdentifierArb).map(([a, b]) => `${a}.${b}`),
  // Four numeric segments: the anchor rejects the trailing ".N".
  fc
    .tuple(numericIdentifierArb, numericIdentifierArb, numericIdentifierArb, numericIdentifierArb)
    .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
  // A non-numeric major: a letter cannot open the \d+ group.
  fc
    .tuple(fc.stringMatching(/^[a-z]{1,4}$/), numericIdentifierArb, numericIdentifierArb)
    .map(([w, b, c]) => `${w}.${b}.${c}`),
  // A letter glued into the patch group.
  fc
    .tuple(numericIdentifierArb, numericIdentifierArb, numericIdentifierArb)
    .map(([a, b, c]) => `${a}.${b}.x${c}`),
  // A valid core with an illegal character in the prerelease tail.
  fc
    .record({
      major: numericIdentifierArb,
      minor: numericIdentifierArb,
      patch: numericIdentifierArb,
      pre: prereleaseArb,
      bad: fc.constantFrom(...ILLEGAL_PRERELEASE_CHARS),
    })
    .map(({ major, minor, patch, pre, bad }) => `${major}.${minor}.${patch}-${pre}${bad}1`),
  // Structural constants (whitespace-only excluded: SemVer.parse trims).
  fc.constantFrom("", "v", "1", "1.2", "1.2.3.4", ".1.2", "1..2", "1.2.", "-1.2.3", "not-a-version"),
);
