// covers: domain:setup-semver
// size: small
//
// Property-based tests for the setup CLI's SemVer / VersionSpec domain
// (#697 / #684 Phase B). In-process: the domain is imported and exercised
// directly — no process is spawned, no filesystem or network is touched — so
// this file classifies as a SMALL test and joins the fast unit tier.
//
// ── PBT CONVENTIONS (canonical definition for this repo) ────────────────────
// 1. DETERMINISTIC PR CI. Every property runs with a FIXED per-property seed
//    (PBT_SEED below) and fast-check's DEFAULT numRuns (100). A fixed seed makes
//    a red build reproducible: the same counterexample is generated on re-run,
//    locally and in CI, with no flaky "passes on retry" behaviour.
// 2. FAILURE OUTPUT. On failure fast-check prints, by default, the seed, the
//    replay path, and the SHRUNK counterexample (the minimal failing input). No
//    extra wiring is needed — the assertion message carries everything required
//    to reproduce.
// 3. PINNING SHRUNK COUNTEREXAMPLES. When a property catches a real bug, copy
//    the shrunk counterexample fast-check reports into an EXAMPLE-BASED test in
//    tests/unit/setup-semver.test.ts and commit it. The example-based test is
//    the permanent regression pin; the property keeps hunting for new inputs.
// 4. DEEP RUNS (opt-in, no new CI job). Set AMADEUS_PBT_DEEP=1 to raise numRuns
//    to a deep budget. This is intended to be driven from the existing
//    `--release` tier (`AMADEUS_PBT_DEEP=1 bash tests/run-tests.sh --release`),
//    which already runs the full pyramid on demand — no dedicated CI job or
//    runner change is introduced. Default (CI) runs stay in the small band so
//    the `--ci` wall-clock budget (FR-1.4) is preserved.
// ────────────────────────────────────────────────────────────────────────────

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { SemVer } from "../../packages/setup/src/domain/semver.ts";
import { VersionSpec } from "../../packages/setup/src/domain/version-spec.ts";
import {
  invalidSemVerStringArb,
  validSemVerStringArb,
  validStableSemVerStringArb,
} from "../helpers/arbitraries/semver.ts";

// Fixed seed: deterministic replay of any counterexample (convention #1).
const PBT_SEED = 0x5e_6970;
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
// PR CI: default numRuns (100). Deep tier: a large budget, opt-in via env.
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };

function parseOk(raw: string): SemVer {
  const r = SemVer.parse(raw);
  if (r.type === "err") throw new Error(`expected ok for ${JSON.stringify(raw)}, got err: ${r.error.reason}`);
  return r.value;
}

describe("SemVer property: P-SV1 roundtrip (format ∘ parse is a normalizing fixed point)", () => {
  test("format(parse(s)) re-parses to an equal, format-stable value", () => {
    fc.assert(
      fc.property(validSemVerStringArb, (s) => {
        const v = parseOk(s);
        const canonical = v.format();
        // Re-parsing the canonical form must succeed, yield an equal SemVer, and
        // be a fixed point of format — normalization (v-prefix stripped, leading
        // zeros collapsed via Number()) has already been applied once, so a
        // second pass changes nothing. This is normalized equivalence, not a raw
        // string match (v01.2.3 and v1.2.3 both normalize to v1.2.3).
        const reparsed = parseOk(canonical);
        expect(reparsed.equals(v)).toBe(true);
        expect(reparsed.format()).toBe(canonical);
      }),
      OPTS,
    );
  });
});

describe("SemVer property: P-SV2 invalid input always yields a Result error", () => {
  test("malformed strings parse to type=err (never throw, never null)", () => {
    fc.assert(
      fc.property(invalidSemVerStringArb, (s) => {
        const r = SemVer.parse(s);
        // A throw would fail the property here; a null return is impossible
        // because parse returns a Result union — assert the error branch.
        expect(r.type).toBe("err");
        if (r.type === "err") expect(r.error.type).toBe("invalid-format");
      }),
      OPTS,
    );
  });
});

describe("SemVer property: P-SV3 isLaterThan is a strict total order over stable versions", () => {
  test("irreflexive: a is never later than itself", () => {
    fc.assert(
      fc.property(validStableSemVerStringArb, (s) => {
        const a = parseOk(s);
        expect(a.isLaterThan(a)).toBe(false);
      }),
      OPTS,
    );
  });

  test("asymmetric + total: distinct stable versions have exactly one later", () => {
    fc.assert(
      fc.property(validStableSemVerStringArb, validStableSemVerStringArb, (sa, sb) => {
        const a = parseOk(sa);
        const b = parseOk(sb);
        const ab = a.isLaterThan(b);
        const ba = b.isLaterThan(a);
        // Asymmetry: the two directions can never both hold.
        expect(ab && ba).toBe(false);
        // Totality over stable: equal ⇒ neither later; distinct ⇒ exactly one.
        if (a.equals(b)) expect(ab || ba).toBe(false);
        else expect(ab !== ba).toBe(true);
      }),
      OPTS,
    );
  });

  test("transitive: a>b and b>c imply a>c", () => {
    fc.assert(
      fc.property(
        validStableSemVerStringArb,
        validStableSemVerStringArb,
        validStableSemVerStringArb,
        (sa, sb, sc) => {
          const a = parseOk(sa);
          const b = parseOk(sb);
          const c = parseOk(sc);
          if (a.isLaterThan(b) && b.isLaterThan(c)) expect(a.isLaterThan(c)).toBe(true);
        },
      ),
      OPTS,
    );
  });
});

describe("SemVer property: P-SV4 VersionSpec.exact's accept-domain is closed under SemVer.parse", () => {
  test("exact(s) succeeds iff parse(s) succeeds, and admits the version it was built from", () => {
    fc.assert(
      fc.property(fc.oneof(validSemVerStringArb, invalidSemVerStringArb), (s) => {
        const parsed = SemVer.parse(s);
        const spec = VersionSpec.exact(s);
        // Domain closure: exact accepts exactly the strings parse accepts.
        expect(spec.type).toBe(parsed.type);
        if (spec.type === "ok" && parsed.type === "ok") {
          expect(spec.value.admits(parsed.value)).toBe(true);
        }
      }),
      OPTS,
    );
  });

  test("BR-F04: an exact spec admits a candidate iff it equals the built version", () => {
    fc.assert(
      fc.property(validSemVerStringArb, validSemVerStringArb, (s1, s2) => {
        const spec = VersionSpec.exact(s1);
        expect(spec.type).toBe("ok");
        if (spec.type !== "ok") return;
        const built = parseOk(s1);
        const candidate = parseOk(s2);
        expect(spec.value.admits(candidate)).toBe(built.equals(candidate));
      }),
      OPTS,
    );
  });
});
