// covers: function:classifyAgentType, function:sanitizeAdvisoryValue, const:BUILTIN_AGENT_TYPES
//
// t451 — Issue #2279 (U1 detection-skeleton). The subagent observability layer
// classifies a payload's Agent Type against the allowed set (personas union the
// builtin ledger) so an ad-hoc dispatch name becomes visible instead of landing
// silently in the audit record.
//
// The classification order is load-bearing (BR-U1-1, first match wins):
//   1. the verbatim value "unknown" (normalizeAgentType's fallback = no type
//      given) -> "unknown-type", BEFORE any ledger/persona lookup, so a stray
//      "unknown" entry in either set cannot suppress the warning;
//   2. the builtin ledger -> "builtin";
//   3. the remaining allowed values -> "persona" (allowed = personas union
//      builtins, so what survives step 2 is a persona);
//   4. everything else -> "outside-allowed-set" (the detection target).
//
// Casing is compared exactly: "Explore" (Claude Code) and "explore" (Codex /
// kimi) are distinct real values that coexist in the corpus (ADR-2).
//
// MECHANISM: in-process seam — classifyAgentType is a pure function, so its
// branches are measured by bun --coverage. The FS-touching half of the module
// (resolveAllowedAgentTypes) lives in t452's integration layer
// (cid:code-generation:fs-tests-integration-first).

import { describe, expect, test } from "bun:test";
import {
  type AllowedSetResolution,
  BUILTIN_AGENT_TYPES,
  classifyAgentType,
  sanitizeAdvisoryValue,
} from "../../dist/claude/.claude/tools/amadeus-subagent-observability.ts";

/** A resolution carrying the given persona names plus the builtin ledger. */
function resolutionWith(personaNames: readonly string[]): AllowedSetResolution {
  return {
    allowed: new Set<string>([...BUILTIN_AGENT_TYPES, ...personaNames]),
    personaCount: personaNames.length,
    warnings: [],
  };
}

const EMPTY: AllowedSetResolution = { allowed: new Set<string>(), personaCount: 0, warnings: [] };

describe("t451 subagent type classification (#2279)", () => {
  // ---- the four verdicts ----------------------------------------------------

  test("a persona name resolved from .claude/agents is 'persona'", () => {
    expect(classifyAgentType("amadeus-developer-agent", resolutionWith(["amadeus-developer-agent"]))).toBe("persona");
  });

  test("a ledger entry is 'builtin'", () => {
    expect(classifyAgentType("general-purpose", resolutionWith(["amadeus-developer-agent"]))).toBe("builtin");
  });

  test("the verbatim 'unknown' fallback is 'unknown-type'", () => {
    expect(classifyAgentType("unknown", resolutionWith([]))).toBe("unknown-type");
  });

  test("an ad-hoc dispatch name is 'outside-allowed-set'", () => {
    expect(classifyAgentType("builder-x1", resolutionWith(["amadeus-developer-agent"]))).toBe("outside-allowed-set");
  });

  // ---- classification order (BR-U1-1) --------------------------------------

  test("'unknown' stays 'unknown-type' even when injected into the allowed set", () => {
    // A misfiled "unknown" persona/ledger entry must not suppress the warning:
    // step 1 wins before any set lookup (domain-entities invariant 2).
    expect(classifyAgentType("unknown", resolutionWith(["unknown"]))).toBe("unknown-type");
  });

  test("an allowed value that shadows a ledger entry is 'builtin'", () => {
    // A persona literally named "Explore" is classified builtin because the
    // ledger is consulted first (domain-entities invariant 5). Both verdicts sit
    // inside the allowed set, so the warning set is unaffected either way.
    expect(classifyAgentType("Explore", resolutionWith(["Explore"]))).toBe("builtin");
  });

  test("a ledger entry is 'builtin' even with an empty allowed set", () => {
    // The ledger is a sibling constant, not a slice of `allowed`: a failed
    // agents-dir read (allowed empty) still classifies builtins correctly.
    expect(classifyAgentType("coder", EMPTY)).toBe("builtin");
  });

  // ---- exact casing (ADR-2) ------------------------------------------------

  test("'Explore' and 'explore' are independent values", () => {
    expect(BUILTIN_AGENT_TYPES).toContain("Explore");
    expect(BUILTIN_AGENT_TYPES).toContain("explore");
    expect(classifyAgentType("Explore", EMPTY)).toBe("builtin");
    expect(classifyAgentType("explore", EMPTY)).toBe("builtin");
  });

  test("a case variant outside the ledger is 'outside-allowed-set'", () => {
    expect(classifyAgentType("EXPLORE", EMPTY)).toBe("outside-allowed-set");
    expect(classifyAgentType("Coder", EMPTY)).toBe("outside-allowed-set");
  });

  // ---- ledger contents (FR-1b) --------------------------------------------

  test("the ledger carries the harness builtins and excludes 'unknown'", () => {
    for (const t of ["default", "coder", "explore", "worker", "general-purpose", "Explore", "Plan"]) {
      expect(BUILTIN_AGENT_TYPES).toContain(t);
    }
    expect(BUILTIN_AGENT_TYPES).not.toContain("unknown");
  });

  // ---- advisory sanitisation ----------------------------------------------

  test("sanitizeAdvisoryValue strips the C0 bytes that would forge a log line", () => {
    // Same class as subagentPurposeLine's CONTROL_CHARS (tab excepted): NUL, BEL
    // and the ANSI escape introducer are all removed.
    expect(sanitizeAdvisoryValue("a\u0000b\u0007c")).toBe("abc");
    expect(sanitizeAdvisoryValue("\u001b[31mred\u001b[0m")).toBe("[31mred[0m");
  });

  test("sanitizeAdvisoryValue keeps the advisory on one line", () => {
    // The sink is a single stderr line (BR-U1-2), so a newline in the payload
    // value must not split it — mirrors subagentPurposeLine's first-line rule.
    expect(sanitizeAdvisoryValue("builder-x1\nadvisory: forged")).toBe("builder-x1");
    expect(sanitizeAdvisoryValue("a\r\nb")).toBe("a");
  });

  test("sanitizeAdvisoryValue keeps tab and ordinary text", () => {
    expect(sanitizeAdvisoryValue("a\tb")).toBe("a\tb");
    expect(sanitizeAdvisoryValue("builder-x1")).toBe("builder-x1");
  });
});
