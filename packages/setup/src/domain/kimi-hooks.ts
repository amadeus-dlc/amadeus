import { IoError } from "../ports/fsops.ts";
import { Result } from "../shared/result.ts";

// domain/kimi-hooks.ts — the pure managed-block merge logic for the user-level
// ~/.kimi-code/config.toml (FR-3a). No I/O: every function is a string
// transformation or a plan, so the whole unit is testable in isolation
// (logical-components.md). The merge is marker/content string processing; a
// TOML parse result is never round-tripped into the output (BR-1: bytes
// outside the managed block are preserved exactly).

export const MANAGED_BLOCK_BEGIN = "# >>> amadeus-kimi-hooks >>>";
export const MANAGED_BLOCK_END = "# <<< amadeus-kimi-hooks <<<";

// Content-validation failures (duplicate/unpaired/reversed markers, a corrupt
// snippet) are loud fails that never auto-repair (domain-entities.md
// §ManagedBlock). Syntactically invalid TOML is an IoError instead
// (reliability-design.md §loud fail).
export type MergeContentError = { readonly type: "content-validation"; readonly detail: string };

export namespace MergeContentError {
  export function of(detail: string): MergeContentError {
    return Object.freeze({ type: "content-validation", detail });
  }
}

Object.freeze(MergeContentError);

export type MergePlanError = IoError | MergeContentError;

export type LineSpan = {
  readonly start: number; // line index, inclusive
  readonly end: number; // line index, exclusive
};

export type MergePlan = {
  readonly action: "add" | "replace" | "noop";
  readonly block: string; // the marker-wrapped block to install
  readonly diffText: string; // for the plan report (domain-entities.md §MergePlan)
  readonly regions: readonly LineSpan[]; // config line spans the block replaces (empty for add/noop)
  readonly insertionLine: number; // line index where the block lands
};

export type RemovalPlan = {
  readonly removed: boolean; // false → no managed block found (noop)
  readonly text: string;
  readonly diffText: string;
};

// Content signatures backing the DUAL identification (Bolt 2 live finding:
// kimi CLI 0.28.1 re-serializes config.toml and drops comments, so the marker
// lines cannot be the only way to recognize the managed block). Every managed
// [[hooks]] entry routes through the Bolt 2 adapter; the managed
// [[permission.rules]] pre-allows name amadeus's own directories. A user's own
// entries are never matched by these.
const HOOKS_SIGNATURE = ".kimi-code/hooks/amadeus-kimi-adapter.ts";
const PERMISSION_SIGNATURES: readonly string[] = [".kimi-code/hooks/", ".kimi-code/tools/"];

// reliability-design.md §loud fail: the syntax oracle is Bun's native TOML
// parser — validation ONLY. Reached via globalThis so running the installer
// under plain node fails loudly with an actionable message instead of a raw
// ReferenceError (the kimi harness requires bun on PATH regardless). The
// optional `tomlParse` is the test seam for the oracle-absent branch (the
// globalThis.Bun property is read-only and non-configurable, so the branch
// cannot be reached by shadowing the global in-process).
export function checkTomlSyntax(text: string, tomlParse?: ((text: string) => unknown) | null): Result<void, IoError> {
  const parse = tomlParse === undefined
    ? (globalThis as { Bun?: { TOML?: { parse(text: string): unknown } } }).Bun?.TOML?.parse
    : tomlParse;
  if (parse === undefined || parse === null) {
    return Result.err(IoError.of("TOML syntax validation requires the Bun runtime; re-run the installer with bunx"));
  }
  try {
    parse(text);
    return Result.ok(undefined);
  } catch (cause) {
    return Result.err(IoError.of(`config.toml is not valid TOML; refusing to touch it: ${String(cause)}`));
  }
}

// renderManagedBlock: snippet master → the marker-wrapped block (everything
// between the markers inclusive; the snippet's prose preamble stays out).
export function renderManagedBlock(snippet: string): Result<string, MergeContentError> {
  const lines = snippet.split("\n");
  const begin = lines.findIndex((line) => line.trim() === MANAGED_BLOCK_BEGIN);
  const end = lines.findIndex((line) => line.trim() === MANAGED_BLOCK_END);
  if (begin === -1 || end === -1 || begin > end) {
    return Result.err(
      MergeContentError.of("the hooks snippet does not contain the managed-block markers; the distribution is corrupt"),
    );
  }
  return Result.ok(lines.slice(begin, end + 1).join("\n"));
}

export function planMerge(configText: string, block: string): Result<MergePlan, MergePlanError> {
  // business-logic-model.md §planMerge: an absent file is "" by convention.
  if (configText === "") {
    return Result.ok(planOf({ action: "add", block, diffText: addedDiff(block), regions: [], insertionLine: 0 }));
  }
  const syntax = checkTomlSyntax(configText); // BR-5: never guess-repair a broken config
  if (syntax.type === "err") return syntax;
  const { lines } = splitText(configText);
  const detection = detectManagedBlock(lines, blockIdentities(block));
  if (detection.type === "err") return detection;
  if (detection.value.type === "none") {
    return Result.ok(planOf({ action: "add", block, diffText: addedDiff(block), regions: [], insertionLine: lines.length }));
  }
  if (detection.value.type === "content") {
    // Marker-stripped managed content always plans "replace" (never "noop"):
    // applying restores the markers around the existing wiring.
    const regions = detection.value.regions;
    const first = regions[0];
    if (first === undefined) return Result.err(MergeContentError.of("internal: empty content detection"));
    return Result.ok(
      planOf({ action: "replace", block, diffText: replacedDiff(lines, regions, block), regions, insertionLine: first.start }),
    );
  }
  const span = detection.value.span;
  const existing = lines.slice(span.start, span.end).join("\n");
  if (normalizeBlockText(existing) === normalizeBlockText(block)) {
    return Result.ok(planOf({ action: "noop", block, diffText: "(no changes)", regions: [], insertionLine: span.start }));
  }
  return Result.ok(
    planOf({ action: "replace", block, diffText: replacedDiff(lines, [span], block), regions: [span], insertionLine: span.start }),
  );
}

// applyMerge: the pure configText × plan → new configText transformation.
// Bytes outside the plan's regions are preserved exactly (BR-1).
export function applyMerge(configText: string, plan: MergePlan): string {
  if (plan.action === "noop") return configText;
  const { lines, trailingNewline } = splitText(configText);
  const blockLines = splitText(plan.block).lines;
  if (plan.action === "add") {
    const base = configText === "" ? [] : lines;
    const last = base[base.length - 1];
    const needsGap = last !== undefined && last.trim() !== "";
    const merged = [...base, ...(needsGap ? [""] : []), ...blockLines];
    return `${merged.join("\n")}\n`;
  }
  // replace: drop every managed region (last first so indices stay valid),
  // then land the block where the first region began.
  for (const span of [...plan.regions].sort((a, b) => b.start - a.start)) {
    lines.splice(span.start, span.end - span.start);
  }
  lines.splice(plan.insertionLine, 0, ...blockLines);
  return joinLines(lines, trailingNewline);
}

// removeManagedBlock: deletes the managed region only; no managed block is a
// noop (business-logic-model.md §除去フロー). Works content-wise when the
// markers were stripped, using the block's tables as the identity reference.
export function removeManagedBlock(configText: string, block: string): Result<RemovalPlan, MergePlanError> {
  if (configText === "") return Result.ok(removalOf(false, configText, "(no changes)"));
  const syntax = checkTomlSyntax(configText);
  if (syntax.type === "err") return syntax;
  const { lines, trailingNewline } = splitText(configText);
  const detection = detectManagedBlock(lines, blockIdentities(block));
  if (detection.type === "err") return detection;
  if (detection.value.type === "none") return Result.ok(removalOf(false, configText, "(no changes)"));
  const spans = (detection.value.type === "marker" ? [detection.value.span] : [...detection.value.regions])
    .map((span) => absorbLeadingBlank(lines, span))
    .sort((a, b) => b.start - a.start);
  const removed = spans.flatMap((span) => lines.slice(span.start, span.end));
  for (const span of spans) {
    lines.splice(span.start, span.end - span.start);
  }
  const diffText = removed.map((line) => `- ${line}`).join("\n");
  return Result.ok(removalOf(true, joinLines(lines, trailingNewline), diffText));
}

// ---------------------------------------------------------------------------
// Detection (DUAL: marker lines first, content signatures when they are gone)
// ---------------------------------------------------------------------------

type Detection =
  | { readonly type: "none" }
  | { readonly type: "marker"; readonly span: LineSpan }
  | { readonly type: "content"; readonly regions: readonly LineSpan[] };

function detectManagedBlock(lines: readonly string[], identities: ReadonlySet<string>): Result<Detection, MergeContentError> {
  const begins = markerIndices(lines, MANAGED_BLOCK_BEGIN);
  const ends = markerIndices(lines, MANAGED_BLOCK_END);
  if (begins.length > 1 || ends.length > 1) return Result.err(duplicateError());
  if (begins.length !== ends.length) {
    return Result.err(
      MergeContentError.of("config.toml has an unpaired amadeus managed-block marker; fix it manually (markers come in a begin/end pair)"),
    );
  }
  if (begins.length === 1) {
    const start = begins[0] ?? 0;
    const end = (ends[0] ?? 0) + 1;
    if (start >= end) {
      return Result.err(MergeContentError.of("config.toml's managed-block markers are reversed; fix them manually"));
    }
    // A markerless copy of the managed hooks alongside the wrapped block is a
    // duplicate too (mixed anomaly) — loud fail, never silently pick one.
    const outside = scanTables([...lines.slice(0, start), ...lines.slice(end)]);
    if (outside.some(isManagedHooksTable)) return Result.err(duplicateError());
    return Result.ok({ type: "marker", span: { start, end } });
  }
  return detectByContent(lines, identities);
}

function markerIndices(lines: readonly string[], marker: string): number[] {
  const indices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.trim() === marker) indices.push(i);
  }
  return indices;
}

function duplicateError(): MergeContentError {
  return MergeContentError.of(
    "config.toml contains more than one amadeus managed block; refusing to auto-repair — remove the duplicates manually and re-run",
  );
}

function detectByContent(lines: readonly string[], identities: ReadonlySet<string>): Result<Detection, MergeContentError> {
  const tables = scanTables(lines);
  const signatureTables = tables.filter((table) => isManagedHooksTable(table) || isManagedPermissionTable(table));
  // Only the adapter hooks establish the managed block's presence — a user's
  // own .kimi-code-flavoured permission rule alone must never trigger a
  // "replace" that would swallow it.
  if (!signatureTables.some(isManagedHooksTable)) return Result.ok({ type: "none" });
  const managed = new Set<TableRegion>(signatureTables);
  // The managed git pre-allows carry no .kimi-code signature; absorb them (and
  // any current-version table) by identity, but only when blank-adjacent to an
  // already-managed table so a user's own identical rule elsewhere stays put.
  let grew = true;
  while (grew) {
    grew = false;
    for (const table of tables) {
      if (managed.has(table) || !identities.has(table.identity)) continue;
      if ([...managed].some((member) => blankGapBetween(lines, member, table))) {
        managed.add(table);
        grew = true;
      }
    }
  }
  // Two identical signature-matched tables mean a past install anomaly.
  const seen = new Set<string>();
  for (const table of signatureTables) {
    if (seen.has(table.identity)) return Result.err(duplicateError());
    seen.add(table.identity);
  }
  return Result.ok({ type: "content", regions: mergeRuns([...managed].sort((a, b) => a.start - b.start)) });
}

function isManagedHooksTable(region: TableRegion): boolean {
  return region.header === "[[hooks]]" && region.bodyText.includes(HOOKS_SIGNATURE);
}

function isManagedPermissionTable(region: TableRegion): boolean {
  return region.header === "[[permission.rules]]" && PERMISSION_SIGNATURES.some((signature) => region.bodyText.includes(signature));
}

// True iff the two regions are consecutive in the scan (only blank lines
// between them — those blanks live inside the earlier region's span).
function blankGapBetween(lines: readonly string[], a: TableRegion, b: TableRegion): boolean {
  const [from, to] = a.end <= b.start ? [a.end, b.start] : [b.end, a.start];
  for (let i = from; i < to; i++) {
    if (lines[i]?.trim() !== "") return false;
  }
  return true;
}

// Group consecutively-scanned managed tables into replacement spans. A user
// table between two managed ones breaks the run, so user content is never
// swallowed into a region.
function mergeRuns(sorted: readonly TableRegion[]): LineSpan[] {
  const runs: LineSpan[] = [];
  for (const table of sorted) {
    const last = runs[runs.length - 1];
    if (last !== undefined && last.end === table.start) {
      runs[runs.length - 1] = { start: last.start, end: table.end };
    } else {
      runs.push({ start: table.start, end: table.end });
    }
  }
  return runs;
}

// The install separates the block from prior content with one blank line;
// removal takes that separator back so add → remove round-trips cleanly.
function absorbLeadingBlank(lines: readonly string[], span: LineSpan): LineSpan {
  if (span.start === 0) return span;
  const before = lines[span.start - 1];
  const beforeThat = lines[span.start - 2];
  if (before?.trim() === "" && beforeThat !== undefined && beforeThat.trim() !== "") {
    return { start: span.start - 1, end: span.end };
  }
  return span;
}

// ---------------------------------------------------------------------------
// Structural table scan (not a TOML parse — header lines + raw bodies only)
// ---------------------------------------------------------------------------

const TABLE_HEADER = /^\s*(\[\[?[^\]]+\]\]?)\s*(?:#.*)?$/;

type TableRegion = {
  readonly header: string; // normalized, e.g. "[[hooks]]"
  readonly start: number;
  readonly end: number; // next header's start, or lines.length
  readonly bodyText: string;
  readonly identity: string; // key-order-insensitive content fingerprint
};

function scanTables(lines: readonly string[]): TableRegion[] {
  const regions: TableRegion[] = [];
  let header: string | null = null;
  let start = 0;
  let body: string[] = [];
  const flush = (end: number): void => {
    if (header === null) return;
    regions.push(Object.freeze({ header, start, end, bodyText: body.join("\n"), identity: tableIdentity(header, body) }));
  };
  for (let i = 0; i < lines.length; i++) {
    const match = TABLE_HEADER.exec(lines[i] ?? "");
    if (match !== null) {
      flush(i);
      header = (match[1] ?? "").replace(/\s+/g, "");
      start = i;
      body = [];
    } else if (header !== null) {
      body.push(lines[i] ?? "");
    }
  }
  flush(lines.length);
  return regions;
}

// Identity tolerates the CLI's re-serialization: blank/comment lines dropped,
// key order ignored, spacing around "=" normalized.
function tableIdentity(header: string, bodyLines: readonly string[]): string {
  const pairs = bodyLines
    .map((line) => normalizePairLine(line))
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .sort();
  return `${header}\n${pairs.join("\n")}`;
}

function normalizePairLine(line: string): string {
  const trimmed = line.replace(/\r$/, "").trim();
  const eq = trimmed.indexOf("=");
  if (eq === -1) return trimmed;
  return `${trimmed.slice(0, eq).trim()}=${trimmed.slice(eq + 1).trim()}`;
}

// The block's own tables are the identity reference for content detection
// (derived, never hardcoded — they track the snippet master automatically).
function blockIdentities(block: string): ReadonlySet<string> {
  const contentLines = splitText(block).lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed !== MANAGED_BLOCK_BEGIN && trimmed !== MANAGED_BLOCK_END;
  });
  return new Set(scanTables(contentLines).map((region) => region.identity));
}

// ---------------------------------------------------------------------------
// Line utilities and small builders
// ---------------------------------------------------------------------------

function splitText(text: string): { lines: string[]; trailingNewline: boolean } {
  const trailingNewline = text.endsWith("\n");
  const lines = text.split("\n");
  if (trailingNewline) lines.pop();
  return { lines, trailingNewline };
}

function joinLines(lines: readonly string[], trailingNewline: boolean): string {
  if (lines.length === 0) return "";
  return lines.join("\n") + (trailingNewline ? "\n" : "");
}

function normalizeBlockText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/\r$/, "").trimEnd())
    .join("\n")
    .trim();
}

function addedDiff(block: string): string {
  return splitText(block)
    .lines.map((line) => `+ ${line}`)
    .join("\n");
}

function replacedDiff(lines: readonly string[], regions: readonly LineSpan[], block: string): string {
  const removed = regions.flatMap((span) => lines.slice(span.start, span.end).map((line) => `- ${line}`));
  return [...removed, ...addedDiff(block).split("\n")].join("\n");
}

function planOf(plan: MergePlan): MergePlan {
  return Object.freeze(plan);
}

function removalOf(removed: boolean, text: string, diffText: string): RemovalPlan {
  return Object.freeze({ removed, text, diffText });
}
