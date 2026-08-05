// Subagent type discipline: classify a dispatch's Agent Type against the set of
// types this workspace actually declares, so an ad-hoc name becomes visible in
// the record instead of passing silently (#2279).
//
// The allowed set is the union of two sources: the personas declared under the
// harness `agents/` dir (derived mechanically from each file's frontmatter
// `name:`) and a hand-kept ledger of harness builtins. The builtins are not
// observable from this repository — they live inside each harness — so the
// ledger is the only place they can be written down.
//
// This module deliberately does NOT import amadeus-lib.ts: the hooks and lib
// that consume it sit above it, and keeping the dependency one-way removes the
// possibility of a cycle.

// The harness builtin types. Count-free by intent: entries carry their origin,
// never a total, so adding a harness does not strand a stale number.
//
// NOTE: "unknown" is intentionally absent — it is normalizeAgentType's fallback
// for a dispatch that named no type at all, which is precisely what FR-2b wants
// flagged. The reverse-engineering tally counted eight "builtin" values because
// it bucketed that fallback alongside the real ones.
export const BUILTIN_AGENT_TYPES: readonly string[] = [
  "default", // Codex default type
  "coder", // Codex / kimi native
  "explore", // Codex / kimi native (lowercase)
  "worker", // Codex / kimi native
  "general-purpose", // Claude Code builtin
  "Explore", // Claude Code builtin (capitalised — a value distinct from "explore")
  "Plan", // Claude Code builtin
];

/** Where a type sits relative to the allowed set. */
export type TypeVerdict = "persona" | "builtin" | "unknown-type" | "outside-allowed-set";

/** The verdicts a human should be told about: no type given, or a type nobody declared. */
export function isWarnableVerdict(verdict: TypeVerdict): boolean {
  return verdict === "unknown-type" || verdict === "outside-allowed-set";
}

/** The resolved allowed set, plus whatever went wrong while resolving it. */
export interface AllowedSetResolution {
  /** Persona names union the builtin ledger, compared exactly. */
  readonly allowed: ReadonlySet<string>;
  /** How many personas the dir contributed — reported by the aggregation CLI. */
  readonly personaCount: number;
  /** Read failures and skipped files. The caller surfaces these; nothing throws. */
  readonly warnings: readonly string[];
}

// C0 control characters, tab excepted — the same class subagentPurposeLine
// strips (amadeus-lib.ts, `CONTROL_CHARS`). The constant is duplicated rather
// than shared because that module is above this one and is not imported here.
// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping them is the point
const CONTROL_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F]/g;

// A value read out of a harness payload is arbitrary text. The advisory sink is
// one stderr line, so the value is reduced to its first line and stripped of the
// control bytes that would otherwise forge a log row or drive the terminal —
// the same two-part sanitisation subagentPurposeLine applies, minus its
// truncation (that window belongs to the Purpose field, not to a type name).
export function sanitizeAdvisoryValue(value: string): string {
  const firstLine = value.split(/[\r\n]/, 1)[0] ?? "";
  return firstLine.replace(CONTROL_CHARS, "").trim();
}


/**
 * Classify a normalized Agent Type. First match wins, and the order matters:
 *
 *  1. the verbatim "unknown" — normalizeAgentType's no-type-given fallback, so a
 *     misfiled "unknown" persona or ledger entry cannot silence the warning;
 *  2. the builtin ledger;
 *  3. whatever else the allowed set holds, which is a persona by construction
 *     (the set is personas union builtins, and step 2 already took the builtins);
 *  4. anything left — the ad-hoc name this check exists to surface.
 *
 * Pure: the same input always yields the same verdict, which is what lets the
 * verdict be written into an audit row.
 */
export function classifyAgentType(agentType: string, resolution: AllowedSetResolution): TypeVerdict {
  if (agentType === "unknown") return "unknown-type";
  if (BUILTIN_AGENT_TYPES.includes(agentType)) return "builtin";
  if (resolution.allowed.has(agentType)) return "persona";
  return "outside-allowed-set";
}
