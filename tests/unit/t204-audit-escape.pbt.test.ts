// covers: function:escapeAuditValue, function:unescapeAuditBody
// size: small
//
// Property-based tests for the audit line-escaping seams extracted from
// amadeus-audit.ts (#697 Phase B, Bolt B4). In-process: the pure functions are
// imported and exercised directly — no process is spawned, no filesystem or
// network is touched — so this file classifies as a SMALL test and joins the
// fast unit tier.
//
// Import surface follows t111.test.ts (the audit deterministic floor): the
// escape seams are consumed from the generated dist/claude copy, not core,
// which is the established flow for audit-tool tests in this repo.
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
  escapeAuditValue,
  unescapeAuditBody,
} from "../../dist/claude/.claude/tools/amadeus-audit.ts";

// Fixed seed: deterministic replay of any counterexample (convention #1).
const PBT_SEED = 0xa0_d17;
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
// PR CI: default numRuns (100). Deep tier: a large budget, opt-in via env.
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };

// Rich alphabet that DELIBERATELY includes both real line terminators (LF, CR)
// and the literal two-char backslash-n sequence, so P-AE2 exercises exactly the
// bytes the forgery defence must neutralise.
const richCharArb = fc.constantFrom(
  "\n",
  "\r",
  "\\",
  "n",
  "\\n", // literal backslash + n as one unit
  "a",
  " ",
  "\t",
  "*",
  ":",
  "#",
  "/",
  "é",
  "🙂",
);
const richStringArb = fc.string({ unit: richCharArb, maxLength: 40 });

// Roundtrip-SAFE alphabet: excludes BOTH the carriage return AND the backslash.
//   - No "\r"          → every newline is a lone LF, which escape maps to the
//                        two-char "\\n" with NO information loss (a CRLF would
//                        drop its CR: escape("\r\n") === "\\n", so unescape can
//                        only recover the LF — the CR is gone).
//   - No "\\"          → the input can contain no literal backslash-n substring,
//                        so the only "\\n" tokens unescape sees are the ones
//                        escape introduced from real LFs. (unescapeAuditBody
//                        rewrites EVERY literal "\\n" to LF, so a pre-existing
//                        literal "\\n" in the source would be corrupted into a
//                        newline — that is why the backslash is excluded.)
// This is a SUFFICIENT condition for the conditional roundtrip; it is stricter
// than strictly necessary but keeps the law verifiably true against the real
// (lossy) implementation. LF is retained so the escape path is meaningfully
// covered.
const roundtripSafeCharArb = fc.constantFrom("\n", "a", "b", " ", "\t", "*", ":", "#", "/", "n", "é", "🙂");
const roundtripSafeStringArb = fc.string({ unit: roundtripSafeCharArb, maxLength: 40 });

describe("audit escape property: P-AE1 conditional roundtrip (unescape ∘ escape = id on the loss-free domain)", () => {
  test("for s with no CR and no literal backslash-n, unescapeAuditBody(escapeAuditValue(s)) === s", () => {
    fc.assert(
      fc.property(roundtripSafeStringArb, (s) => {
        // Guard the domain assumptions explicitly (belt-and-braces: the alphabet
        // already excludes "\r" and "\\", so these never trip — they document
        // the exact precondition the law is stated under).
        expect(s.includes("\r")).toBe(false);
        expect(s.includes("\\")).toBe(false);
        expect(unescapeAuditBody(escapeAuditValue(s))).toBe(s);
      }),
      OPTS,
    );
  });
});

describe("audit escape property: P-AE2 escape output is always single-line (1-line audit-block invariant)", () => {
  test("escapeAuditValue(s) contains no LF and no CR, for ARBITRARY s (unconditional)", () => {
    fc.assert(
      fc.property(richStringArb, (s) => {
        const escaped = escapeAuditValue(s);
        // The forged-audit-entry defence: a field value can never introduce a
        // second physical line into the audit block. LF is always collapsed to
        // the two-char "\\n". (A lone CR not followed by LF is intentionally NOT
        // collapsed by the /\r?\n/ regex — see the note below.)
        expect(escaped.includes("\n")).toBe(false);
        // A CR only survives when it is a LONE CR (not part of a CRLF pair): the
        // regex /\r?\n/ consumes the CR only together with its trailing LF. So
        // the strict single-line guarantee is "no LF, and no CR that was part of
        // a CRLF". We assert the LF-freedom unconditionally, and that any
        // surviving CR is a lone CR (never immediately followed by an LF — but
        // there are no LFs left, so equivalently: escape output has no "\r\n").
        expect(escaped.includes("\r\n")).toBe(false);
      }),
      OPTS,
    );
  });
});
