// allowlist-semantic-audit.ts — does each allowlist reason still describe the
// code its selector resolves to? (#1622)
//
// WHAT THIS IS. `tests/.coverage-patch-allowlist.json` exempts source ranges
// from the patch gate, and every entry carries a prose `reason` stating WHY the
// range is unmeasurable ("type-only", "catch arm", "spawn-only", …). The
// selector survives line shifts by construction (it resolves through the AST),
// but nothing has ever checked that the range it lands on still MATCHES the
// claim. A reason that no longer describes its code is a waiver granted for a
// property the code no longer has — the ledger equivalent of a stale line pin.
//
// NOT THE GATE. Nothing in this file blocks anything. The blocking check lives
// in coverage-patch-gate.ts and reads exactly one input — the entry's declared
// `selector.class` — held against the AST. It never touches `reason`.
//
// This module is the record instead: it grades every entry's prose against its
// code and reports 一致 / 転位 / 判定不能 (#1622 FR-1, FR-7). Two readings meet:
//   1. `matchesSyntaxClass` / `classifyRange` (from the gate) read the AST and
//      say what the resolved lines actually are.
//   2. `extractReasonClaim` reads the prose and says what class it claims.
// A reason that names several possibilities ("defensive, type-only, or
// spawned-boundary path") claims nothing decidable, so it is reported as
// undecidable rather than guessed at.
//
// The prose half stays advisory on purpose. Four designs tried to make it
// blocking and each was measured false-positive-prone, because `reason` mixes
// target, rationale, coverage status and reachability in one human sentence.
// Reading it is useful for a human triaging the ledger; it is not a verdict.
//
// This module is pure: sources come in as strings, verdicts go out as values.
// The sweep over the real ledger lives in tests/integration.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import {
  type AllowlistEntry,
  classifyRange,
  matchesSyntaxClass,
  parseAllowlist,
  type ResolvedLineRange,
  resolveSemanticSelector,
  type SyntaxClass,
} from "./coverage-patch-gate.ts";

const sourceFileCache = new Map<string, ts.SourceFile>();

function sourceFileFor(file: string, source: string): ts.SourceFile {
  const key = `${file}\u0000${source.length}\u0000${source}`;
  const cached = sourceFileCache.get(key);
  if (cached) return cached;
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  sourceFileCache.set(key, parsed);
  return parsed;
}

// ---------------------------------------------------------------------------
// The prose half. What class does the reason CLAIM, and does it name a function?
// ---------------------------------------------------------------------------

/**
 * Vocabulary the ledger actually uses, per class. Deliberately narrow: bare
 * words that carry no class on their own ("defensive", "dispatch", "residual",
 * "stamped DA:0 by Bun") are absent, so the ledger's house-style boilerplate
 * cannot manufacture a claim its author never made.
 */
const CLAIM_VOCABULARY: ReadonlyArray<{ cls: SyntaxClass; pattern: RegExp }> = [
  { cls: "type-only", pattern: /type-only|type only|runtime-erased|runtime erased|type annotation|type-level/gi },
  { cls: "catch-arm", pattern: /catch[- ](?:arm|clause|block)|catch\/finally|catch and finally/gi },
  {
    cls: "dispatch-case",
    pattern: /dispatch[- ]case|switch[- ]case|case arm|default arm|case clause|switch statement/gi,
  },
  {
    cls: "spawn-only",
    pattern: /spawn-only|spawn only|spawned|spawn-blindspot|spawn blindspot|subprocess|child[- ]process/gi,
  },
];

/** ", or " and " or " — the ledger's way of offering alternatives. */
const DISJUNCTION = /,?\s+or\s+/i;

/** camelCase identifiers, the shape every function in this repo is named with. */
const IDENTIFIER = /\b([a-z][a-z0-9]*(?:[A-Z][A-Za-z0-9]*)+)\b/g;

export type ReasonClaim =
  | { kind: "class"; class: SyntaxClass; phrase: string; functions: string[] }
  | { kind: "none"; functions: string[] }
  | { kind: "disjunctive"; classes: SyntaxClass[]; functions: string[] };

/** Sentences, so a disjunction in one clause does not taint an unrelated one. */
function sentences(reason: string): string[] {
  return reason
    .split(/(?<=[.;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function extractReasonClaim(reason: string): ReasonClaim {
  const functions = [...new Set(Array.from(reason.matchAll(IDENTIFIER), (m) => m[1]))];
  const hits: Array<{ cls: SyntaxClass; phrase: string; sentence: string }> = [];
  for (const sentence of sentences(reason)) {
    for (const { cls, pattern } of CLAIM_VOCABULARY) {
      // matchAll clones the regexp, so a shared /g pattern carries no lastIndex
      // between sentences and needs no recompile here.
      for (const match of sentence.matchAll(pattern)) {
        hits.push({ cls, phrase: match[0], sentence });
      }
    }
  }
  if (hits.length === 0) return { kind: "none", functions };
  const classes = [...new Set(hits.map((h) => h.cls))];
  // Several classes named at once, or a class offered as one possibility among
  // others: the reason states no single testable property.
  if (classes.length > 1) return { kind: "disjunctive", classes, functions };
  if (hits.some((h) => DISJUNCTION.test(h.sentence))) return { kind: "disjunctive", classes, functions };
  return { kind: "class", class: classes[0], phrase: hits[0].phrase, functions };
}

// ---------------------------------------------------------------------------
// Function scopes, resolved independently of the gate's own (unexported) pass.
// Used to decide whether a function NAMED in the reason is a function OF the
// file, and whether the resolved range lies inside it.
// ---------------------------------------------------------------------------
/** The named function a node declares, if it declares one, and the node whose span is its extent. */
function declaredFunction(node: ts.Node): { name: string; node: ts.Node } | null {
  if (ts.isFunctionDeclaration(node)) return node.name ? { name: node.name.text, node } : null;
  if (ts.isMethodDeclaration(node)) return ts.isIdentifier(node.name) ? { name: node.name.text, node } : null;
  if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) return null;
  const parent = node.parent;
  // An arrow assigned to a name is that name's body; the declaration is its extent.
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return { name: parent.name.text, node: parent };
  }
  if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) {
    return { name: parent.name.text, node: parent };
  }
  return null;
}

export function functionRanges(file: string, source: string): Map<string, ResolvedLineRange[]> {
  const sourceFile = sourceFileFor(file, source);
  const ranges = new Map<string, ResolvedLineRange[]>();
  const record = (name: string, node: ts.Node): void => {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
    const list = ranges.get(name) ?? [];
    list.push({ start, end });
    ranges.set(name, list);
  };
  const visit = (node: ts.Node): void => {
    const declared = declaredFunction(node);
    if (declared) record(declared.name, declared.node);
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
  return ranges;
}

// ---------------------------------------------------------------------------
// The verdict. Three values, because "we cannot tell" is a real answer and
// collapsing it into either agreement or drift would be a fabricated reading.
// ---------------------------------------------------------------------------
export type AuditVerdict = "一致" | "転位" | "判定不能";

export interface EntryAudit {
  file: string;
  function: string;
  resolved: ResolvedLineRange;
  verdict: AuditVerdict;
  claimedClass: SyntaxClass | null;
  actualClass: SyntaxClass;
  namedFunctions: string[];
  rationale: string;
}

export function auditEntry(entry: AllowlistEntry, source: string): EntryAudit {
  // A selector that no longer resolves is not an undecidable reason — it is a
  // broken ledger, and the gate itself already fails loudly on it. Let it throw.
  const resolved = resolveSemanticSelector(entry.file, source, entry.selector);
  const actualClass = classifyRange(entry.file, source, resolved);
  const claim = extractReasonClaim(entry.reason);
  const base = {
    file: entry.file,
    function: entry.selector.function,
    resolved,
    actualClass,
    namedFunctions: [] as string[],
  };

  if (claim.kind !== "class") {
    return {
      ...base,
      verdict: "判定不能",
      claimedClass: null,
      rationale:
        claim.kind === "none"
          ? "the reason declares no syntax class"
          : `the reason offers alternatives (${claim.classes.join(", ")})`,
    };
  }

  // Only identifiers that are functions OF THIS FILE count as a naming; prose
  // mentions of unrelated camelCase words are not claims about the selector.
  const ranges = functionRanges(entry.file, source);
  const named = claim.functions.filter((name) => ranges.has(name));
  const withNamed = { ...base, namedFunctions: named, claimedClass: claim.class };
  if (named.length > 0) {
    const selectorNamed = named.includes(entry.selector.function);
    const insideNamed = named.some((name) =>
      (ranges.get(name) ?? []).some((r) => r.start <= resolved.start && r.end >= resolved.end),
    );
    if (!selectorNamed && !insideNamed) {
      return {
        ...withNamed,
        verdict: "転位",
        rationale: `the reason names ${named.join("/")} but the selector resolves inside ${entry.selector.function}`,
      };
    }
  }

  if (!matchesSyntaxClass(entry.file, source, resolved, claim.class)) {
    return {
      ...withNamed,
      verdict: "転位",
      rationale: `the reason claims ${claim.class} ("${claim.phrase}") but the resolved lines are ${actualClass}`,
    };
  }
  return {
    ...withNamed,
    verdict: "一致",
    rationale: `the resolved lines satisfy the claimed ${claim.class} ("${claim.phrase}")`,
  };
}

// ---------------------------------------------------------------------------
// The sweep. Pure over a source map; the file-reading wrapper is the only I/O.
// ---------------------------------------------------------------------------
export function auditAllowlist(
  entries: readonly AllowlistEntry[],
  sources: ReadonlyMap<string, string>,
): EntryAudit[] {
  return entries.map((entry) => {
    const source = sources.get(entry.file);
    if (source === undefined) {
      throw new Error(`allowlist-semantic-audit: source not found for ${entry.file}`);
    }
    return auditEntry(entry, source);
  });
}

export function loadAllowlistAudit(repoRoot: string, ledgerPath: string): EntryAudit[] {
  const entries = parseAllowlist(readFileSync(ledgerPath, "utf8"));
  const sources = new Map<string, string>();
  for (const entry of entries) {
    if (!sources.has(entry.file)) sources.set(entry.file, readFileSync(join(repoRoot, entry.file), "utf8"));
  }
  return auditAllowlist(entries, sources);
}
