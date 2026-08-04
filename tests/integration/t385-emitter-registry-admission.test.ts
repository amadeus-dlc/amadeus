// covers: otel:event-registry, otel:redaction
// size: medium
//
// G1 (call-site migration) — the emitter/registry ADMISSION guard.
//
// THE HAZARD. Redaction is default-deny: `redactAttributes` keeps a key only
// when it is in the safe-key set, and silently drops everything else — no
// throw, no warning, a shorter audit row than the legacy writer produced. The
// safe-key set is derived as the UNION of every registry entry's attributes,
// so the drop is real exactly for a key NO entry declares. Two keys were in
// that state and are fixed with this guard: BOLT_FAILED's `Succeeded siblings`
// and the single-stage runner's `Workflow` (STAGE_STARTED / STAGE_COMPLETED).
//
// TWO TIERS, because the union makes them different failures:
//   1. UNADMITTED — the key is in no registry entry at all. Redaction drops
//      it. This is the silent data loss.
//   2. MISATTRIBUTED — the key is admitted, but by some OTHER event's entry.
//      Nothing is lost today; the row survives on a coincidence, and deleting
//      the unrelated entry that happens to list the key would start dropping
//      it. PHASE_COMPLETED's `Details` and BOLT_FAILED's `Reason` were here
//      (Cursor Bugbot reported the first as data loss on PR #1810; the union
//      is why it was not). Both are registered on their own events now.
//
// WHAT IS CHECKED. For every emitter call site whose field object can be
// resolved statically, the supplied key set must be a subset of the event's
// own `requiredAttributes ∪ optionalAttributes`. Missing REQUIRED keys are NOT
// checked here — `emitEvent` throws on those at runtime, and a conditional
// emitter legitimately omits a key on some paths. It is the extra key, the one
// that disappears without a sound, that needs a static guard.
//
// LIMITS (deliberate, asserted rather than hidden).
//   - Field objects built from runtime input (`--field "Key: Value"` on
//     `amadeus-state.ts practices-event`) have no static key set at all. Those
//     sites are enumerated in UNRESOLVED_SITES so a NEW unanalyzable site
//     shows up as a test failure rather than as silent non-coverage.

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { REGISTERED_EVENTS } from "../../packages/framework/core/otel/event-registry.ts";
import { DEFAULT_REDACTION_POLICY } from "../../packages/framework/core/otel/redaction.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Same scan roots as tests/callsite-guard.ts: the product source of truth.
// dist/ and the self-install trees are projections of core, so scanning core
// covers them by construction.
const SCAN_ROOTS = ["packages/framework/core", "scripts"] as const;

// The registry describes itself; scanning it would read the table as call sites.
const EXCLUDED_FILES = new Set(["packages/framework/core/otel/event-registry.ts"]);

// Every function that carries (event name, fields) to a writer — the legacy
// writer, the migration adapter, the canonical emit, and the per-tool wrappers
// that forward to one of them.
const EMITTER_FUNCTIONS = [
  "emitAudit",
  "emitCanonical",
  "appendAuditEntry",
  "appendAuditEntryUnlocked",
  "appendAuditEntryViaEvents",
  "appendAuditEvent",
  "spawnAuditAppend",
  "emitEvent",
] as const;

// Call sites whose field object is assembled from runtime input. Each entry is
// (file, event); the count is what makes a NEW one visible.
const UNRESOLVED_SITES = [
  "packages/framework/core/tools/amadeus-log.ts:DECISION_RECORDED",
  "packages/framework/core/tools/amadeus-state.ts:PRACTICES_AFFIRMED",
  "packages/framework/core/tools/amadeus-state.ts:PRACTICES_DISCOVERED",
  "packages/framework/core/tools/amadeus-state.ts:PRACTICES_OVERRIDE",
  "packages/framework/core/tools/amadeus-state.ts:PRACTICES_SECTION_EMPTY",
] as const;

// ---------------------------------------------------------------------------
// Registry view
// ---------------------------------------------------------------------------

type AdmissionTable = ReadonlyMap<string, ReadonlySet<string>>;

export function admissionTable(): AdmissionTable {
  const table = new Map<string, Set<string>>();
  for (const def of REGISTERED_EVENTS) {
    const admitted = new Set<string>([...def.requiredAttributes, ...def.optionalAttributes]);
    table.set(def.name, admitted);
    if (def.auditEvent) table.set(def.auditEvent, admitted);
  }
  return table;
}

// ---------------------------------------------------------------------------
// Source reading. A lexer-grade pass (strings and comments only) plus delimiter
// matching — enough to read an object literal, and no type resolution, so the
// guard costs one linear read per file like tests/callsite-guard.ts does.
// ---------------------------------------------------------------------------

export function blankComments(src: string): string {
  let out = "";
  let i = 0;
  let quote: string | null = null;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      out += c;
      if (c === "\\") {
        out += src[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      out += c;
      i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      const end = nl === -1 ? src.length : nl;
      out += " ".repeat(end - i);
      i = end;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      for (let k = i; k < stop; k++) out += src[k] === "\n" ? "\n" : " ";
      i = stop;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function matchDelimiter(src: string, open: number): number {
  const expected = src[open] === "(" ? ")" : src[open] === "{" ? "}" : "]";
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") {
      depth--;
      if (depth === 0) return c === expected ? i : -1;
    }
  }
  return -1;
}

function splitTopLevel(inner: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      parts.push(inner.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(inner.slice(start).trim());
  return parts.filter((p) => p.length > 0);
}

type KeySet = { keys: string[]; unresolved: boolean };

function literalKeys(objectText: string, src: string): KeySet {
  const keys: string[] = [];
  let unresolved = false;
  for (const part of splitTopLevel(objectText.slice(1, -1))) {
    if (part.startsWith("...")) {
      const spread = spreadKeys(part.slice(3).trim(), src);
      keys.push(...spread.keys);
      if (spread.unresolved) unresolved = true;
      continue;
    }
    if (part.startsWith("[")) {
      // A computed key: the name is only known at runtime.
      unresolved = true;
      continue;
    }
    const quoted = /^(["'])([^"']+)\1\s*:/.exec(part);
    if (quoted) {
      keys.push(quoted[2]);
      continue;
    }
    const bare = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*(:|$)/.exec(part);
    if (bare) keys.push(bare[1]);
    else unresolved = true;
  }
  return { keys, unresolved };
}

// `...(cond ? { K: v } : {})` and `...someObject` — the two shapes conditional
// audit fields are written in.
function spreadKeys(expression: string, src: string): KeySet {
  const braces = [...expression.matchAll(/\{/g)].map((m) => m.index as number);
  if (braces.length === 0) {
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(expression)) {
      const resolved = resolveVariable(expression, src, src.length);
      return resolved ?? { keys: [], unresolved: true };
    }
    return { keys: [], unresolved: true };
  }
  const keys: string[] = [];
  let unresolved = false;
  for (const brace of braces) {
    const close = matchDelimiter(expression, brace);
    if (close === -1) {
      unresolved = true;
      continue;
    }
    const nested = literalKeys(expression.slice(brace, close + 1), src);
    keys.push(...nested.keys);
    if (nested.unresolved) unresolved = true;
  }
  return { keys, unresolved };
}

// A field object passed by name. Only the NEAREST PRECEDING declaration counts
// and only mutations between it and the call site: a file-wide sweep would
// merge every unrelated `fields` variable in the module into one key soup, and
// the union of unrelated keys hides real violations behind false ones.
function resolveVariable(name: string, src: string, callIndex: number): KeySet | null {
  const declaration = new RegExp(`\\b(?:const|let|var)\\s+${name}\\b[^=;]*=\\s*`, "g");
  let nearest: number | null = null;
  let match: RegExpExecArray | null = declaration.exec(src);
  while (match !== null && match.index < callIndex) {
    nearest = match.index + match[0].length;
    match = declaration.exec(src);
  }
  if (nearest === null) return null;
  if (src[nearest] !== "{") return { keys: [], unresolved: true };
  const close = matchDelimiter(src, nearest);
  if (close === -1) return { keys: [], unresolved: true };

  const declared = literalKeys(src.slice(nearest, close + 1), src);
  const keys = [...declared.keys];
  let unresolved = declared.unresolved;

  const window = src.slice(close, callIndex);
  for (const m of window.matchAll(new RegExp(`\\b${name}\\.([A-Za-z_$][A-Za-z0-9_$]*)\\s*=[^=]`, "g"))) {
    keys.push(m[1]);
  }
  for (const m of window.matchAll(new RegExp(`\\b${name}\\[\\s*(["'])([^"']+)\\1\\s*\\]\\s*=[^=]`, "g"))) {
    keys.push(m[2]);
  }
  if (new RegExp(`Object\\.assign\\(\\s*${name}\\s*,`).test(window)) unresolved = true;
  if (new RegExp(`\\b${name}\\[[^"'\\]]`).test(window)) unresolved = true;

  return { keys, unresolved };
}

// ---------------------------------------------------------------------------
// The scan
// ---------------------------------------------------------------------------

export type EmitSite = {
  readonly file: string;
  readonly line: number;
  readonly event: string;
  readonly keys: readonly string[];
  readonly unresolved: boolean;
};

export function analyzeSource(file: string, text: string, table: AdmissionTable): EmitSite[] {
  const src = blankComments(text);
  const sites: EmitSite[] = [];
  for (const fn of EMITTER_FUNCTIONS) {
    for (const call of src.matchAll(new RegExp(`\\b${fn}\\s*\\(`, "g"))) {
      const callIndex = call.index as number;
      const open = callIndex + call[0].length - 1;
      const close = matchDelimiter(src, open);
      if (close === -1) continue;
      const args = splitTopLevel(src.slice(open + 1, close));

      let event: string | null = null;
      let eventArg = -1;
      for (let i = 0; i < args.length; i++) {
        const quoted = /^"([^"]+)"$/.exec(args[i]);
        if (quoted && table.has(quoted[1])) {
          event = quoted[1];
          eventArg = i;
          break;
        }
      }
      if (event === null) continue;

      const fieldsArg = args
        .slice(eventArg + 1)
        .find((a) => a.startsWith("{") || /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(a));
      const line = src.slice(0, callIndex).split("\n").length;
      if (fieldsArg === undefined) {
        sites.push({ file, line, event, keys: [], unresolved: true });
        continue;
      }
      const resolved = fieldsArg.startsWith("{")
        ? literalKeys(fieldsArg, src)
        : (resolveVariable(fieldsArg, src, callIndex) ?? { keys: [], unresolved: true });
      sites.push({ file, line, event, keys: [...new Set(resolved.keys)], unresolved: resolved.unresolved });
    }
  }
  return sites.sort((a, b) => a.line - b.line);
}

function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".ts")) found.push(path);
    }
  };
  for (const root of SCAN_ROOTS) walk(join(REPO_ROOT, root));
  return found;
}

export function scanRepository(table: AdmissionTable): EmitSite[] {
  const sites: EmitSite[] = [];
  for (const path of sourceFiles()) {
    const file = relative(REPO_ROOT, path);
    if (EXCLUDED_FILES.has(file)) continue;
    sites.push(...analyzeSource(file, readFileSync(path, "utf-8"), table));
  }
  return sites;
}

// Tier 2: supplied, but not by this event's own registry entry.
export function droppedKeys(site: EmitSite, table: AdmissionTable): string[] {
  const admitted = table.get(site.event);
  if (admitted === undefined) return [];
  return site.keys.filter((key) => !admitted.has(key));
}

// Tier 1: supplied, and in no entry at all — the key redaction really drops.
// Mirrors DEFAULT_REDACTION_POLICY's derivation (union of every entry, minus
// the opt-in `Command` tier, plus the pre-registry operational keys).
export function unadmittedKeys(site: EmitSite): string[] {
  const safe = new Set<string>(DEFAULT_REDACTION_POLICY.safeKeys);
  for (const key of DEFAULT_REDACTION_POLICY.optIn) safe.add(key);
  return site.keys.filter((key) => !safe.has(key));
}

// ---------------------------------------------------------------------------

describe("emitter fields are admitted by the registry", () => {
  const table = admissionTable();
  const sites = scanRepository(table);

  test("no emitter supplies a key redaction drops outright", () => {
    const violations = sites
      .filter((s) => unadmittedKeys(s).length > 0)
      .map((s) => `${s.file}:${s.line} ${s.event} -> ${unadmittedKeys(s).join(", ")}`);
    expect(violations).toEqual([]);
  });

  test("no emitter relies on another event's entry to admit its key", () => {
    const violations = sites
      .filter((s) => droppedKeys(s, table).length > 0)
      .map((s) => `${s.file}:${s.line} ${s.event} -> ${droppedKeys(s, table).join(", ")}`);
    expect(violations).toEqual([]);
  });

  // Vacuity guard: an extraction regression that finds nothing would make the
  // assertion above pass for the wrong reason.
  test("the scan actually resolves the emitter population", () => {
    const resolved = sites.filter((s) => !s.unresolved);
    expect(resolved.length).toBeGreaterThanOrEqual(80);
    expect(new Set(resolved.map((s) => s.event)).size).toBeGreaterThanOrEqual(40);
    expect(new Set(resolved.map((s) => s.file)).size).toBeGreaterThanOrEqual(10);
  });

  test("the unanalyzable sites are the known runtime-keyed ones", () => {
    const unresolved = [...new Set(sites.filter((s) => s.unresolved).map((s) => `${s.file}:${s.event}`))].sort();
    expect(unresolved).toEqual([...UNRESOLVED_SITES]);
  });
});

describe("the admission check detects a dropped key", () => {
  const table = admissionTable();

  // Falling proof: the predicate is driven over a synthetic emitter rather than
  // over the repository, so the negative arm is provable without injecting a
  // defect into product source.
  test("an unregistered key on an object literal is reported", () => {
    const source = `
      emitAudit(pd, "PHASE_COMPLETED", {
        "From phase": a,
        "To phase": b,
        "Stages completed": c,
        Smuggled: d,
      });
    `;
    const [site] = analyzeSource("fixture.ts", source, table);
    expect(site.event).toBe("PHASE_COMPLETED");
    expect(droppedKeys(site, table)).toEqual(["Smuggled"]);
    expect(unadmittedKeys(site)).toEqual(["Smuggled"]);
  });

  // The two tiers must be distinguishable, or the strict one hides the real
  // data loss behind a wall of harmless misattributions.
  test("a key admitted by another event is tier 2 only, not a real drop", () => {
    const source = `emitAudit(pd, "PHASE_STARTED", { Phase: p, Scope: s, Artifacts: a });`;
    const [site] = analyzeSource("fixture.ts", source, table);
    expect(droppedKeys(site, table)).toEqual(["Artifacts"]);
    expect(unadmittedKeys(site)).toEqual([]);
  });

  test("an unregistered key added to a named field object is reported", () => {
    const source = `
      const fields: Record<string, string> = { "Failed Bolt": name, "Error summary": err };
      if (flag) fields["Smuggled"] = value;
      emitAudit(pd, "BOLT_FAILED", fields);
    `;
    const [site] = analyzeSource("fixture.ts", source, table);
    expect(droppedKeys(site, table)).toEqual(["Smuggled"]);
  });

  test("a conditional spread contributes its keys", () => {
    const source = `
      emitAudit(pd, "STAGE_COMPLETED", {
        Stage: slug,
        Details: text,
        ...(extra ? { Smuggled: extra } : {}),
      });
    `;
    const [site] = analyzeSource("fixture.ts", source, table);
    expect(site.keys).toContain("Smuggled");
    expect(droppedKeys(site, table)).toEqual(["Smuggled"]);
  });

  test("a comment naming a key is not read as a key", () => {
    const source = `
      // Smuggled: this is prose, not a field.
      emitAudit(pd, "STAGE_COMPLETED", { Stage: slug, Details: text });
    `;
    const [site] = analyzeSource("fixture.ts", source, table);
    expect(droppedKeys(site, table)).toEqual([]);
  });

  test("a runtime-built field object is reported as unresolved, not as clean", () => {
    const source = `
      const fields = parseFieldFlags(args);
      emitAudit(pd, "PRACTICES_DISCOVERED", fields);
    `;
    const [site] = analyzeSource("fixture.ts", source, table);
    expect(site.unresolved).toBe(true);
  });
});
