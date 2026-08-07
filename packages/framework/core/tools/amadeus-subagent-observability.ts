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

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
// Warnings embed values this module does not own - a directory path, a file
// name off disk, an exception message. They are written to stderr by every
// consumer, so a newline or an escape sequence in any of them could forge a log
// row or drive the terminal (CWE-117). Sanitising where the warning is BUILT
// keeps every consumer safe without each one remembering to.
function advisory(message: string): string {
  return sanitizeAdvisoryValue(message);
}

export function sanitizeAdvisoryValue(value: string): string {
  const firstLine = value.split(/[\r\n]/, 1)[0] ?? "";
  return firstLine.replace(CONTROL_CHARS, "").trim();
}

// Frontmatter `name:` on the first lines of an agent definition. Anchored to
// the line start so a `name:` nested inside a later block cannot claim the persona.
const FRONTMATTER_NAME = /^name:[ \t]*(.+?)[ \t]*$/m;

// Frontmatter `model:` — the persona's model pin (FR-3). Same anchoring rule
// as `name:` so a `model:` inside a markdown code fence cannot pose as the pin.
const FRONTMATTER_MODEL = /^model:[ \t]*(.+?)[ \t]*$/m;

/** The frontmatter block of an agent definition, or the whole body when unfenced. */
function frontmatterOf(body: string): string {
  const fenceEnd = body.indexOf("\n---", 3);
  return body.startsWith("---") && fenceEnd > 0 ? body.slice(3, fenceEnd) : body;
}

/** Strip one layer of surrounding quotes and trim; null when nothing remains. */
function frontmatterScalar(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const unquoted = raw.replace(/^["']|["']$/g, "").trim();
  return unquoted === "" ? null : unquoted;
}

/** The persona name a definition file declares, or null when it declares none. */
function personaNameOf(body: string): string | null {
  return frontmatterScalar(FRONTMATTER_NAME.exec(frontmatterOf(body))?.[1]);
}

/** Every `.md` agent definition under `agentsDir`, in name order, paired with
 *  its body. The two resolvers below need exactly this and nothing else, so the
 *  listing, the per-file read, and their two failure warnings live here once
 *  rather than in each caller. A dir that cannot be listed yields no entries and
 *  one warning; a file that cannot be read is skipped with one warning. Neither
 *  throws — U1's fail-open contract holds for both callers by construction. */
function readAgentDefinitions(
  agentsDir: string,
): { listed: boolean; entries: { entry: string; body: string }[]; warnings: string[] } {
  const warnings: string[] = [];
  let names: string[];
  try {
    names = readdirSync(agentsDir).filter((n) => n.endsWith(".md"));
  } catch (e) {
    warnings.push(advisory(`agents dir unreadable (${agentsDir}): ${e instanceof Error ? e.message : String(e)}`));
    return { listed: false, entries: [], warnings };
  }

  const entries: { entry: string; body: string }[] = [];
  for (const entry of names.sort()) {
    try {
      entries.push({ entry, body: readFileSync(join(agentsDir, entry), "utf-8") });
    } catch (e) {
      // Skip this definition, keep the rest: the warning is the record of the
      // loss, and `continue` is the explicit terminal the no-silent-drop rule
      // requires so the skip is a decision rather than a fall-through.
      warnings.push(advisory(`agent definition unreadable (${entry}): ${e instanceof Error ? e.message : String(e)}`));
      continue;
    }
  }
  return { listed: true, entries, warnings };
}

/**
 * Resolve the allowed set from the harness `agents/` dir plus the builtin ledger.
 *
 * Never throws: a missing or unreadable dir degrades to the ledger alone with the
 * reason in `warnings`, because this check is advisory and must not be able to
 * take down the audit write that calls it.
 */
export function resolveAllowedAgentTypes(agentsDir: string): AllowedSetResolution {
  const allowed = new Set<string>(BUILTIN_AGENT_TYPES);
  const warnings: string[] = [];
  let personaCount = 0;

  const read = readAgentDefinitions(agentsDir);
  warnings.push(...read.warnings);

  for (const { entry, body } of read.entries) {
    const name = personaNameOf(body);
    if (name === null) {
      warnings.push(advisory(`agent definition has no frontmatter name (${entry})`));
      continue;
    }
    allowed.add(name);
    personaCount += 1;
  }

  return { allowed, personaCount, warnings };
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


// --- Effective-model attribution (U2, #2279 FR-3) ---------------------------
//
// Which model actually served a dispatch, and where that answer came from.
// The resolution order is ADR-3: the harness's own report (an OBSERVATION of
// what ran) beats an explicit request (what was ASKED — a harness may
// substitute) beats the persona's declaration. The winning stage is always
// carried alongside the value, so a future reorder never makes past audit
// rows uninterpretable.

/** Where the recorded model came from. Closed vocabulary by construction. */
export type ModelSource = "harness" | "request" | "pin";

/**
 * The outcome of effective-model resolution (parse-don't-validate). A
 * `resolved` always pairs the model with its source — a source-less model is
 * unrepresentable. `unresolved` is the TYPE-level form of "write no
 * attributes" (ADR-5): absence is recorded as absence, never as a fabricated
 * placeholder like "unknown".
 */
export type ModelResolution =
  | { readonly kind: "resolved"; readonly model: string; readonly source: ModelSource }
  | { readonly kind: "unresolved" };

/** The three candidate supplies, in priority order (ADR-3). */
export interface ModelResolutionInput {
  /** The payload's `model` — supplied only by harnesses that report it (Codex). */
  readonly harnessModel: string | undefined;
  /** An explicit `tool_input.model` — present only when the dispatch named one. */
  readonly requestedModel: string | undefined;
  /** The persona's frontmatter pin — supplied only for a persona verdict. */
  readonly personaPin: string | undefined;
}

/**
 * Resolve the effective model. First non-empty of harness > request > pin
 * wins; whitespace-only counts as empty (the same convention as
 * normalizeAgentType — trim decides PRESENCE, the recorded value stays
 * verbatim). Pure: same inputs, same resolution, which is what lets the
 * result be written into an audit row.
 */
export function resolveEffectiveModel(input: ModelResolutionInput): ModelResolution {
  const candidates: readonly (readonly [string | undefined, ModelSource])[] = [
    [input.harnessModel, "harness"],
    [input.requestedModel, "request"],
    [input.personaPin, "pin"],
  ];
  for (const [value, source] of candidates) {
    if (value?.trim()) return { kind: "resolved", model: value, source };
  }
  return { kind: "unresolved" };
}

/**
 * The result of a persona pin lookup. Never throws: every read failure comes
 * back as `pin: undefined` plus one warning line, and the CALLER surfaces the
 * warnings (stderr) while resolution continues — the same fail-open channel
 * shape as AllowedSetResolution (NFR-3). A persona whose frontmatter simply
 * has no `model:` is a legitimate state and earns NO warning.
 */
export interface PersonaPinResolution {
  /** The frontmatter `model:` value, or undefined when unpinned / unfindable. */
  readonly pin: string | undefined;
  /** Read failures and anomalies. The caller surfaces these; nothing throws. */
  readonly warnings: readonly string[];
}

/** The persona's model pin a definition file declares, or null when it declares none. */
function personaModelOf(body: string): string | null {
  return frontmatterScalar(FRONTMATTER_MODEL.exec(frontmatterOf(body))?.[1]);
}

/**
 * Read one persona's model pin out of the harness `agents/` dir.
 *
 * The match is the frontmatter `name:` compared EXACTLY — never the file
 * basename. Basename == name is not guaranteed, and a basename shortcut would
 * silently strand the pin on `undefined` forever while looking green. This is
 * the same derivation principle as the allowed set itself (FR-1a). When two
 * files declare the same `name:`, scan order's first wins and the duplicate
 * earns one warning.
 */
export function resolvePersonaPin(agentType: string, agentsDir: string): PersonaPinResolution {
  const warnings: string[] = [];
  const shown = sanitizeAdvisoryValue(agentType);

  const read = readAgentDefinitions(agentsDir);
  warnings.push(...read.warnings);
  // An unlistable dir is already explained by its own warning; adding
  // "found no definition" on top would double-report one cause.
  if (!read.listed) return { pin: undefined, warnings };

  let pin: string | undefined;
  let matched: string | null = null;
  for (const { entry, body } of read.entries) {
    if (personaNameOf(body) !== agentType) continue;
    if (matched !== null) {
      warnings.push(advisory(`duplicate persona name "${shown}" (${matched} already matched, ${entry} ignored)`));
      break;
    }
    matched = entry;
    pin = personaModelOf(body) ?? undefined;
  }

  if (matched === null) {
    warnings.push(advisory(`persona pin lookup found no definition named "${shown}" (${agentsDir})`));
  }
  return { pin, warnings };
}

// ---------------------------------------------------------------------------
// #2438 — dispatch model enforcement (the deny half; #2279 is the advisory half)
// ---------------------------------------------------------------------------

/**
 * The models a subagent dispatch may run on (#2438). A dispatch passes only
 * through a compliant explicit request or a persona pin inside this set —
 * everything else would silently inherit the parent session's model, which is
 * exactly the leak the guard exists to close.
 */
export const ENFORCED_SUBAGENT_MODELS = ["opus", "sonnet"] as const;

// Full model ids count as compliant when their family prefix matches an
// enforced alias (e.g. "claude-opus-5", "claude-sonnet-5-20250929").
const ENFORCED_MODEL_ID_PREFIX = /^claude-(opus|sonnet)(-|$)/;

function isEnforcedModel(value: string): boolean {
  return (ENFORCED_SUBAGENT_MODELS as readonly string[]).includes(value) || ENFORCED_MODEL_ID_PREFIX.test(value);
}

/** The already-resolved dispatch facts the decision consumes. */
export interface DispatchModelInput {
  /** classifyAgentType's verdict for the dispatched type. */
  readonly typeVerdict: TypeVerdict;
  /** The persona's frontmatter pin — attributable only to a persona verdict. */
  readonly personaPin: string | undefined;
  /** The dispatch call's explicit `model` request, verbatim. */
  readonly requestedModel: string | undefined;
}

export type DispatchModelDecision =
  | { readonly kind: "allow"; readonly reason: string }
  | { readonly kind: "deny"; readonly reason: string };

const DISPATCH_REMEDY =
  "dispatch via a declared persona (harness agents/ definition with a model pin) " +
  `or pass an explicit model from {${ENFORCED_SUBAGENT_MODELS.join(", ")}}`;

/**
 * Decide whether a subagent dispatch complies with the enforced model set.
 *
 * Order is load-bearing: an explicit request is judged FIRST and on its own —
 * a non-compliant explicit model must not be rescued by a compliant persona
 * pin, because the harness honours the explicit request over the pin. A pin is
 * consulted only for a persona verdict, so a stray pin passed alongside a
 * builtin or ad-hoc verdict cannot open the gate.
 */
export function decideDispatchModel(input: DispatchModelInput): DispatchModelDecision {
  if (input.requestedModel !== undefined) {
    const requested = input.requestedModel.trim();
    if (isEnforcedModel(requested)) {
      return { kind: "allow", reason: `explicit model "${requested}" is inside the enforced set` };
    }
    return {
      kind: "deny",
      reason:
        `explicit model "${sanitizeAdvisoryValue(requested)}" is outside the enforced set ` +
        `{${ENFORCED_SUBAGENT_MODELS.join(", ")}} — ${DISPATCH_REMEDY} (#2438)`,
    };
  }
  if (input.typeVerdict === "persona") {
    const pin = input.personaPin?.trim() ?? "";
    if (isEnforcedModel(pin)) {
      return { kind: "allow", reason: `persona pin "${pin}" is inside the enforced set` };
    }
    const pinShown = pin === "" ? "no model pin" : `non-compliant pin "${sanitizeAdvisoryValue(pin)}"`;
    return {
      kind: "deny",
      reason: `persona has ${pinShown} — add a model pin from {${ENFORCED_SUBAGENT_MODELS.join(", ")}} to its definition or pass an explicit model (#2438)`,
    };
  }
  return {
    kind: "deny",
    reason: `${input.typeVerdict} dispatch without an explicit model would inherit the session model — ${DISPATCH_REMEDY} (#2438)`,
  };
}
