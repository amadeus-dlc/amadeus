#!/usr/bin/env bun
// glossary-projection.ts — project the canonical glossary onto its derived surfaces.
//
// docs/guide/glossary.md (+ .ja.md) own every term definition. Every other
// surface that repeats a definition is generated from them:
//   knowledge  — the shipped agent-facing glossary under core/knowledge
//   protocol   — the stage protocol's Terminology table
//   reference  — the Developer Reference Terminology tables (EN + JA)
//
// `write` regenerates those surfaces; `check` re-renders in memory and fails
// when the committed bytes differ, so drift cannot land silently.
//
// Validation is fail-closed and enumerates every violation before exiting: a
// partially-valid canonical glossary never produces a partially-correct
// projection.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The neutral token authors write in the canonical glossary, and the harness
// placeholder the core surfaces are rendered with.
export const NEUTRAL_HARNESS_TOKEN = "<harness-dir>";
export const CORE_HARNESS_TOKEN = "{{HARNESS_DIR}}";

export type TermRow = {
  readonly key: string;
  readonly term: string;
  readonly definition: string;
};

/** Stable identity of a term: the English name, kebab-cased. A Japanese row
 *  carries its translation in a parenthetical that is not part of the key. */
export function termKey(term: string): string {
  const english = term.split(/[(（]/u)[0]!;
  return english
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

const ROW_RE = /^\|\s*\*\*(.+?)\*\*\s*\|\s*(.*?)\s*\|\s*$/u;

/** Every `| **Term** | Definition |` row of the document, in file order. */
export function parseTermTable(markdown: string): readonly TermRow[] {
  const rows: TermRow[] = [];
  for (const line of markdown.split("\n")) {
    const m = ROW_RE.exec(line);
    if (!m) continue;
    const term = m[1]!.trim();
    rows.push({ key: termKey(term), term, definition: m[2]! });
  }
  return rows;
}

export const PROJECTION_NAMES = ["knowledge", "protocol", "reference"] as const;
export type ProjectionName = (typeof PROJECTION_NAMES)[number];

export type ProjectionSelector =
  | { readonly kind: "all" }
  | { readonly kind: "subset"; readonly terms: readonly string[] };

export type Manifest = ReadonlyMap<string, ProjectionSelector>;

export type Violation = { readonly code: string; readonly detail: string };

function violation(code: string, detail: string): Violation {
  return { code, detail };
}

/** The `projections:` body of the fenced yaml block, as raw `name -> value` text. */
function manifestEntries(block: readonly string[]): {
  readonly entries: ReadonlyArray<readonly [string, string]>;
  readonly violations: readonly Violation[];
} {
  const entries: Array<readonly [string, string]> = [];
  const violations: Violation[] = [];
  let name: string | null = null;
  for (let i = 0; i < block.length; i++) {
    const nameMatch = /^ {2}([\w-]+):\s*$/u.exec(block[i]!);
    if (nameMatch) {
      if (name !== null) violations.push(violation("manifest-malformed-terms", `${name}: no terms`));
      name = nameMatch[1]!;
      continue;
    }
    const termsMatch = /^ {4}terms:\s*(.*)$/u.exec(block[i]!);
    if (!termsMatch || name === null) continue;
    let value = termsMatch[1]!.trim();
    while (value.startsWith("[") && !value.includes("]") && i + 1 < block.length) {
      i += 1;
      value = `${value} ${block[i]!.trim()}`;
    }
    entries.push([name, value]);
    name = null;
  }
  if (name !== null) violations.push(violation("manifest-malformed-terms", `${name}: no terms`));
  return { entries, violations };
}

function parseSelector(name: string, value: string): {
  readonly selector: ProjectionSelector | null;
  readonly violations: readonly Violation[];
} {
  if (value === "all") return { selector: { kind: "all" }, violations: [] };
  if (!value.startsWith("[") || !value.endsWith("]")) {
    return {
      selector: null,
      violations: [violation("manifest-malformed-terms", `${name}: ${value || "(empty)"}`)],
    };
  }
  const terms = value
    .slice(1, -1)
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
  return { selector: { kind: "subset", terms }, violations: [] };
}

/** Read the `## Projection Manifest` fenced yaml block. Returns every violation
 *  it finds rather than throwing on the first one. */
export function parseManifest(markdown: string): {
  readonly manifest: Manifest;
  readonly violations: readonly Violation[];
} {
  const lines = markdown.split("\n");
  const open = lines.findIndex((l) => l.trim() === "```yaml");
  const close = open < 0 ? -1 : lines.findIndex((l, i) => i > open && l.trim() === "```");
  const block = open < 0 || close < 0 ? [] : lines.slice(open + 1, close);
  if (!block.some((l) => l.trim() === "projections:")) {
    return { manifest: new Map(), violations: [violation("manifest-missing", "no projections:")] };
  }

  const manifest = new Map<string, ProjectionSelector>();
  const { entries, violations: entryViolations } = manifestEntries(block);
  const violations: Violation[] = [...entryViolations];
  for (const [name, value] of entries) {
    if (!(PROJECTION_NAMES as readonly string[]).includes(name)) {
      violations.push(violation("manifest-unknown-projection", name));
      continue;
    }
    if (manifest.has(name)) {
      violations.push(violation("manifest-duplicate-projection", name));
      continue;
    }
    const { selector, violations: selectorViolations } = parseSelector(name, value);
    violations.push(...selectorViolations);
    if (selector) manifest.set(name, selector);
  }
  return { manifest, violations };
}

function duplicateKeys(rows: readonly TermRow[]): readonly string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.key)) dupes.add(row.key);
    seen.add(row.key);
  }
  return [...dupes];
}

function keySetViolations(en: readonly TermRow[], ja: readonly TermRow[]): readonly Violation[] {
  const enKeys = new Set(en.map((r) => r.key));
  const jaKeys = new Set(ja.map((r) => r.key));
  const missingJa = [...enKeys].filter((k) => !jaKeys.has(k));
  const missingEn = [...jaKeys].filter((k) => !enKeys.has(k));
  if (missingJa.length === 0 && missingEn.length === 0) return [];
  const parts: string[] = [];
  if (missingJa.length > 0) parts.push(`missing in glossary.ja.md: ${missingJa.join(", ")}`);
  if (missingEn.length > 0) parts.push(`missing in glossary.md: ${missingEn.join(", ")}`);
  return [violation("en-ja-key-mismatch", parts.join("; "))];
}

function selectorViolations(
  manifest: Manifest,
  enKeys: ReadonlySet<string>,
): readonly Violation[] {
  const violations: Violation[] = [];
  for (const [name, selector] of manifest) {
    if (selector.kind === "all") continue;
    if (selector.terms.length === 0) {
      violations.push(violation("manifest-empty-subset", name));
      continue;
    }
    const seen = new Set<string>();
    for (const term of selector.terms) {
      if (seen.has(term)) violations.push(violation("manifest-duplicate-term", `${name}: ${term}`));
      seen.add(term);
      if (!enKeys.has(term)) violations.push(violation("manifest-unknown-term", `${name}: ${term}`));
    }
  }
  return violations;
}

const BOLD_REF_RE = /\*\*([^*]+)\*\*/gu;

/** Prose cites terms in the plural (`**Rules**`), so a bold run resolves to a
 *  term when its key, or a de-pluralised form of it, is a defined term. The
 *  stripped forms only count when they land on a real key, which keeps bold
 *  emphasis that is not a term (`**MUST**`) from resolving to anything. */
export function resolveCitedKey(
  bold: string,
  isTerm: (key: string) => boolean,
): string | null {
  const key = termKey(bold);
  const candidates = [key, key.replace(/es$/u, ""), key.replace(/s$/u, "")];
  return candidates.find((c) => c.length > 0 && isTerm(c)) ?? null;
}

/** A projected table must be self-contained: every bold cross-reference its own
 *  definitions make has to resolve inside the same subset. */
function closureViolations(
  manifest: Manifest,
  rows: readonly TermRow[],
): readonly Violation[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const isTerm = (key: string): boolean => byKey.has(key);
  const violations: Violation[] = [];
  for (const [name, selector] of manifest) {
    if (selector.kind === "all") continue;
    const subset = new Set(selectRows(rows, selector).map((r) => r.key));
    for (const key of subset) {
      const row = byKey.get(key);
      if (!row) continue;
      for (const m of row.definition.matchAll(BOLD_REF_RE)) {
        const cited = resolveCitedKey(m[1]!, isTerm);
        if (cited === null || subset.has(cited)) continue;
        violations.push(violation("subset-reference-unclosed", `${name}: ${key} cites ${cited}`));
      }
    }
  }
  return violations;
}

/** Every reason the canonical pair cannot be projected, enumerated in full. */
export function validateCanonical(enMarkdown: string, jaMarkdown: string): readonly Violation[] {
  const en = parseTermTable(enMarkdown);
  const ja = parseTermTable(jaMarkdown);
  const violations: Violation[] = [];
  for (const key of duplicateKeys(en)) violations.push(violation("canonical-duplicate-term", `glossary.md: ${key}`));
  for (const key of duplicateKeys(ja)) violations.push(violation("canonical-duplicate-term", `glossary.ja.md: ${key}`));
  violations.push(...keySetViolations(en, ja));
  for (const row of [...en, ...ja]) {
    if (row.definition.includes(CORE_HARNESS_TOKEN)) {
      violations.push(violation("token-leak", `${row.key}: canonical text must use ${NEUTRAL_HARNESS_TOKEN}`));
    }
  }
  const { manifest, violations: manifestViolations } = parseManifest(enMarkdown);
  violations.push(...manifestViolations);
  violations.push(...selectorViolations(manifest, new Set(en.map((r) => r.key))));
  violations.push(...closureViolations(manifest, en));
  return violations;
}

export const CANONICAL_EN = "docs/guide/glossary.md";
export const CANONICAL_JA = "docs/guide/glossary.ja.md";

const MARKER_END = "<!-- glossary:projection:end -->";
function beginMarker(projection: string): string {
  return `<!-- glossary:projection:begin ${projection} -->`;
}

/** Canonical-order projection of a selector over the canonical rows. */
export function selectRows(
  rows: readonly TermRow[],
  selector: ProjectionSelector,
): readonly TermRow[] {
  if (selector.kind === "all") return rows;
  const wanted = new Set(selector.terms);
  return rows.filter((r) => wanted.has(r.key));
}

export function renderTable(
  rows: readonly TermRow[],
  headers: readonly [string, string],
): string {
  const head = [`| ${headers[0]} | ${headers[1]} |`, "|------|-----------|"];
  const body = rows.map((r) => `| **${r.term}** | ${r.definition} |`);
  return [...head, ...body].join("\n");
}

/** Core surfaces carry the harness placeholder; docs surfaces keep the neutral token. */
export function toCoreTokens(text: string): string {
  return text.split(NEUTRAL_HARNESS_TOKEN).join(CORE_HARNESS_TOKEN);
}

/** The directory the canonical glossary's own relative links resolve against. */
const CANONICAL_DIR = posix.dirname(CANONICAL_EN);

const INLINE_LINK_RE = /\]\(([^()\s]+)\)/gu;

function isRelativeTarget(target: string): boolean {
  return !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/iu.test(target);
}

/** Re-point the canonical glossary's guide-relative links so they still resolve
 *  from the surface they are projected onto. `linkBase` is the repo-relative
 *  directory the output is read from — `.` yields repo-root-relative paths. */
export function rebaseLinks(text: string, linkBase: string): string {
  return text.replace(INLINE_LINK_RE, (whole, target: string) => {
    if (!isRelativeTarget(target)) return whole;
    const hash = target.indexOf("#");
    const path = hash < 0 ? target : target.slice(0, hash);
    const fragment = hash < 0 ? "" : target.slice(hash);
    const resolved = posix.normalize(posix.join(CANONICAL_DIR, path));
    return `](${posix.relative(linkBase, resolved)}${fragment})`;
  });
}

export type MarkerReplacement = {
  readonly content: string | null;
  readonly violations: readonly Violation[];
};

/** Swap the body between a projection's begin/end markers, leaving the markers
 *  and everything around them untouched. */
export function replaceMarkerSection(
  content: string,
  projection: string,
  body = "",
): MarkerReplacement {
  const begin = beginMarker(projection);
  const lines = content.split("\n");
  const starts = lines.flatMap((l, i) => (l.trim() === begin ? [i] : []));
  if (starts.length === 0) {
    return { content: null, violations: [violation("marker-missing", `${projection}: ${begin}`)] };
  }
  if (starts.length > 1) {
    return {
      content: null,
      violations: [violation("marker-duplicated", `${projection}: ${starts.length} begin markers`)],
    };
  }
  const start = starts[0]!;
  const end = lines.findIndex((l, i) => i > start && l.trim() === MARKER_END);
  if (end < 0) {
    return { content: null, violations: [violation("marker-missing", `${projection}: ${MARKER_END}`)] };
  }
  const inner = lines.slice(start + 1, end);
  if (inner.some((l) => l.trim().startsWith("<!-- glossary:projection:begin "))) {
    return { content: null, violations: [violation("marker-nested", projection)] };
  }
  return {
    content: [...lines.slice(0, start + 1), body, ...lines.slice(end)].join("\n"),
    violations: [],
  };
}

/** The whole shipped agent-facing glossary — this surface is a generated file,
 *  not a marked-up region of a hand-authored one. */
export function renderKnowledgeSurface(rows: readonly TermRow[]): string {
  const header = [
    `<!-- GENERATED FILE — do not edit by hand. Canonical source: ${CANONICAL_EN} (Japanese: ${CANONICAL_JA}). -->`,
    "",
    "# Glossary",
    "",
    `Canonical AI-DLC terminology, projected from ${CANONICAL_EN}. Edit the canonical glossary and regenerate; edits here are overwritten.`,
    "",
  ];
  return toCoreTokens([...header, renderTable(rows, ["Term", "Definition"]), ""].join("\n"));
}

export const KNOWLEDGE_SURFACE_PATH = "packages/framework/core/knowledge/amadeus-shared/glossary.md";

export type Surface = {
  readonly projection: ProjectionName;
  readonly path: string;
  readonly language: "en" | "ja";
  /** `file` renders the whole file; `marker` swaps the body between markers. */
  readonly mode: "file" | "marker";
  readonly coreTokens: boolean;
  /** Repo-relative directory the output is read from — canonical links are
   *  re-pointed relative to it. `.` yields repo-root-relative paths. */
  readonly linkBase: string;
  readonly headers: readonly [string, string];
};

export const SURFACES: readonly Surface[] = [
  {
    projection: "knowledge",
    path: KNOWLEDGE_SURFACE_PATH,
    language: "en",
    mode: "file",
    coreTokens: true,
    linkBase: ".",
    headers: ["Term", "Definition"],
  },
  {
    projection: "protocol",
    path: "packages/framework/core/amadeus-common/protocols/stage-protocol.md",
    language: "en",
    mode: "marker",
    coreTokens: true,
    linkBase: ".",
    headers: ["Term", "Definition"],
  },
  {
    projection: "reference",
    path: "docs/reference/04-stage-protocol.md",
    language: "en",
    mode: "marker",
    coreTokens: false,
    linkBase: "docs/reference",
    headers: ["Term", "Definition"],
  },
  {
    projection: "reference",
    path: "docs/reference/04-stage-protocol.ja.md",
    language: "ja",
    mode: "marker",
    coreTokens: false,
    linkBase: "docs/reference",
    headers: ["用語", "定義"],
  },
];

export type PlannedSurface = { readonly path: string; readonly content: string };

export type Plan = {
  readonly plans: readonly PlannedSurface[];
  readonly violations: readonly Violation[];
};

function readIfPresent(root: string, rel: string): string | null {
  const path = join(root, rel);
  return existsSync(path) ? readFileSync(path, "utf-8") : null;
}

/** JA definitions keyed by the shared English key, so the JA surface follows the
 *  canonical English row order rather than its own file order. */
function jaByKey(rows: readonly TermRow[]): ReadonlyMap<string, TermRow> {
  return new Map(rows.map((r) => [r.key, r]));
}

function rowsForSurface(
  surface: Surface,
  en: readonly TermRow[],
  ja: ReadonlyMap<string, TermRow>,
  selector: ProjectionSelector,
): readonly TermRow[] {
  const selected = selectRows(en, selector);
  if (surface.language === "en") return selected;
  return selected.map((r) => ja.get(r.key) ?? r);
}

/** The rendered surface, plus the projected region on its own. Only the region
 *  this generator owns may be validated — a marker surface's `content` also
 *  carries hand-authored prose whose links and tokens are not ours to police. */
type RenderedSurface = MarkerReplacement & { readonly projected: string };

function renderSurface(
  surface: Surface,
  sourceRows: readonly TermRow[],
  existing: string | null,
): RenderedSurface {
  const rows = sourceRows.map((r) => ({
    ...r,
    definition: rebaseLinks(r.definition, surface.linkBase),
  }));
  if (surface.mode === "file") {
    const content = renderKnowledgeSurface(rows);
    return { content, projected: content, violations: [] };
  }
  if (existing === null) {
    return { content: null, projected: "", violations: [violation("missing-target", surface.path)] };
  }
  const rendered = renderTable(rows, surface.headers);
  const projected = surface.coreTokens ? toCoreTokens(rendered) : rendered;
  return { ...replaceMarkerSection(existing, surface.projection, projected), projected };
}

/** Every rebased link must still point at a file that exists, so a projection
 *  can never ship a link that resolves nowhere. */
function surfaceLinkViolations(
  surface: Surface,
  projected: string,
  root: string,
): readonly Violation[] {
  const violations: Violation[] = [];
  for (const line of projected.split("\n")) {
    if (!line.startsWith("| **")) continue;
    for (const m of line.matchAll(INLINE_LINK_RE)) {
      const target = m[1]!;
      if (!isRelativeTarget(target)) continue;
      const path = target.split("#")[0]!;
      const resolved = posix.normalize(posix.join(surface.linkBase, path));
      if (existsSync(join(root, resolved))) continue;
      violations.push(violation("surface-link-unresolved", `${surface.path}: ${target}`));
    }
  }
  return violations;
}

function surfaceTokenViolations(surface: Surface, projected: string): readonly Violation[] {
  const forbidden = surface.coreTokens ? NEUTRAL_HARNESS_TOKEN : CORE_HARNESS_TOKEN;
  const table = projected.split("\n").filter((l) => l.startsWith("| **"));
  if (!table.some((l) => l.includes(forbidden))) return [];
  return [violation("surface-token-leak", `${surface.path}: unconverted ${forbidden}`)];
}

/** Render every surface from the canonical pair, collecting every reason the
 *  projection cannot be committed. Callers write only when `violations` is empty. */
export function planSurfaces(root: string): Plan {
  const enMarkdown = readIfPresent(root, CANONICAL_EN);
  const jaMarkdown = readIfPresent(root, CANONICAL_JA);
  if (enMarkdown === null || jaMarkdown === null) {
    const missing = enMarkdown === null ? CANONICAL_EN : CANONICAL_JA;
    return { plans: [], violations: [violation("canonical-missing", missing)] };
  }

  const violations: Violation[] = [...validateCanonical(enMarkdown, jaMarkdown)];
  const en = parseTermTable(enMarkdown);
  const ja = jaByKey(parseTermTable(jaMarkdown));
  const { manifest } = parseManifest(enMarkdown);
  const plans: PlannedSurface[] = [];

  for (const surface of SURFACES) {
    const selector = manifest.get(surface.projection);
    if (!selector) continue;
    const rows = rowsForSurface(surface, en, ja, selector);
    const rendered = renderSurface(surface, rows, readIfPresent(root, surface.path));
    violations.push(...rendered.violations);
    if (rendered.content === null) continue;
    violations.push(...surfaceTokenViolations(surface, rendered.projected));
    violations.push(...surfaceLinkViolations(surface, rendered.projected, root));
    plans.push({ path: surface.path, content: rendered.content });
  }
  return { plans, violations };
}

// =========================================================================
// CLI
// =========================================================================

type Emit = (message: string) => void;

function reportViolations(violations: readonly Violation[], err: Emit): void {
  err(`glossary-projection: ${violations.length} violation(s) — nothing written.`);
  for (const v of violations) err(`  [${v.code}] ${v.detail}`);
}

function handleWrite(root: string, plans: readonly PlannedSurface[], log: Emit): number {
  let changed = 0;
  for (const plan of plans) {
    const path = join(root, plan.path);
    if (existsSync(path) && readFileSync(path, "utf-8") === plan.content) continue;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, plan.content, "utf-8");
    log(`wrote ${plan.path}`);
    changed += 1;
  }
  log(`glossary-projection: ${plans.length} surface(s), ${changed} rewritten.`);
  return 0;
}

function handleCheck(root: string, plans: readonly PlannedSurface[], log: Emit, err: Emit): number {
  const drift = plans.filter((p) => readIfPresent(root, p.path) !== p.content);
  if (drift.length === 0) {
    log(`glossary-projection: ${plans.length} surface(s) in sync.`);
    return 0;
  }
  err(`glossary-projection: ${drift.length} surface(s) out of sync with ${CANONICAL_EN}:`);
  for (const p of drift) err(`  ${p.path} differs — re-run the glossary projection \`write\` verb.`);
  return 1;
}

/** Returns the process exit code; all output goes through the injected emitters
 *  so the whole CLI is drivable in-process. */
export function cliEntry(argv: readonly string[], root: string, log: Emit, err: Emit): number {
  const subcommand = argv[0];
  if (subcommand !== "write" && subcommand !== "check") {
    err(`glossary-projection: unknown subcommand ${subcommand ?? "(none)"}. Valid: write, check`);
    return 1;
  }
  const { plans, violations } = planSurfaces(root);
  if (violations.length > 0) {
    reportViolations(violations, err);
    return 1;
  }
  return subcommand === "write" ? handleWrite(root, plans, log) : handleCheck(root, plans, log, err);
}

if (import.meta.main) process.exit(cliEntry(process.argv.slice(2), REPO_ROOT, console.log, console.error));
