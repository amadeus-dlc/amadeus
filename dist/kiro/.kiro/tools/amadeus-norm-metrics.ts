// Norm-metrics tool — the read-only measuring instrument for the memory-layer
// norm corpus (org/team/project + phase rule files). It answers "which norms
// carry the most weight, and what is structurally NOT measurable yet" so the
// distillation work (Bolt 2) has an evidence base instead of a guess.
//
// Two verbs:
//
//   rank [--json] [--top <n>]
//       Load the memory layer (via graph.loadRules — the SAME walker the rule
//       resolver uses, so the norm ledger is method-correct), parse every cid
//       definition marker into a CidRecord, scan the citation corpus for
//       citations of each norm, aggregate into a per-norm metric row sorted by
//       citation count, and render a table (default) or a single-line JSON
//       object.
//
//   distill-candidates [--k <n>] [--json]
//       Surface distillation candidates: norms with zero citations that are old
//       enough to judge (ZERO_CITE_THRESHOLD_DAYS) and norms rewritten enough to
//       be unstable (amendmentCount >= CHURN_THRESHOLD), top k of each. Forbidden
//       and Mandated norms are STRUCTURALLY excluded (the fire-extinguisher
//       exemption) and listed separately with a count so the exemption is visible.
//
// CITATION CORPUS (Bolt 2 — AC-1b). Definitions come from the memory layer only
// (the population is cid-bearing norms). Citations are counted across the memory
// layer body PLUS the record tree and audit shards
// (amadeus/spaces/*/intents/**/*.md). Corpus files are read one at a time and
// discarded (a streaming loop — scalability-design), never all loaded at once.
//
// EVERYTHING here is deterministic: the corpus is read off disk in a sorted
// order, the "latest data date" is derived from the corpus itself (never
// Date.now), and two runs on the same tree are byte-identical. The pure
// parsers/scanners/renderers/schema-parsers are exported so tests drive them
// in-process with string fixtures (bun --coverage does not measure spawned
// subprocesses, so the in-process seam is the lcov carrier); the argv dispatch
// is also exercised as a real CLI spawn so the coverage registry's `subcommand`
// units are verified at their cli mechanism.
//
// What this tool deliberately does NOT do: GoA-variance and violation-recurrence
// are NOT collected (no structured records exist for them yet — FR-3 defines the
// input schemas via parseGoaLine/parsePmCidLine, but aggregation is future), and
// E-code citations are counted but NOT aggregated into the ranking. These are
// surfaced as explicit "NOT COLLECTED / NOT AGGREGATED" lines rather than
// silently omitted, so the output can never masquerade as more complete than it
// is.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, type Dirent } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRules, type RuleFile } from "./amadeus-graph.ts";

// This tool's directory (<workspace>/<harness>/tools/) — the anchor for the
// corpus root, mirroring amadeus-graph.ts's __FILE_DIR / rulesDir() idiom.
const __FILE_DIR = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Domain types (bare types + pure functions — this is an instrument, not a
// domain aggregate; the project's functional-domain-modeling style applies to
// domain models, and the Bolt 1 design fixes this tool as bare-type/pure-fn).
// ---------------------------------------------------------------------------

export type NormClass = "forbidden" | "mandated" | "general";
export type RuleScope = "org" | "team" | "project" | "phase";

/** One non-empty body line of a rule file, tagged with the scope it came from
 *  and the `## <section>` heading it lives under. The cid definition marker,
 *  citations, dates, and amendment markers are all inline in `text`. */
export interface RuleLine {
  scope: RuleScope;
  section: string;
  text: string;
}

/** One cid definition marker (`<!-- cid:stage:slug -->`) and everything the
 *  line it sits on tells us about the norm it names. `fullCid` is the
 *  normalised path (a redundant `stage:stage:` double-namespace is collapsed
 *  to `stage:`); `slug` is its last segment. */
export interface CidRecord {
  slug: string;
  fullCid: string;
  klass: NormClass;
  adoptedDate: string | null; // earliest YYYY-MM-DD on the line, or null
  amendmentCount: number;
  oldSlugs: string[]; // legacy aliases declared via "(旧 cid: <slug>)"
}

/** Rules that carry NO cid marker and are therefore invisible to the citation
 *  ranking — counted so the ranking can never pretend to be the whole corpus. */
export interface UncountedRules {
  org: number; // org-scope rule-body lines (org.md carries no cid markers)
  affirmed: number; // lines carrying an "(affirmed" provenance tag
}

/** One aggregated metric row for a single norm. */
export interface NormMetricRow {
  cid: string; // fullCid (the row identity)
  klass: NormClass;
  adoptedDate: string | null;
  amendmentCount: number;
  cites: number;
  lastCited: string | null; // max date on any citing line, or null
  ageNorm: number; // min-max normalised citation-per-day, [0, 1]
}

/** The whole rank output. Every field is consumed by a renderer (renderTable
 *  columns/summary lines OR renderJson's stringify) — no documentation-only
 *  fields (AC-1f: no verification-theatre keys). */
export interface NormMetrics {
  sourceSha: string | null; // provenance: git HEAD the corpus was read at
  latestDataDate: string | null; // max date across the corpus (the age anchor)
  rows: NormMetricRow[];
  uncounted: UncountedRules;
  ecodeOccurrences: number; // E-<code> mentions — observed, NOT aggregated
  adoptionVotes: { have: number; total: number }; // norms with a "採用 n/n" vote
  unlinkedLegacy: number; // legacy-alias citations with no live link (Bolt 2)
}

// ---------------------------------------------------------------------------
// Regexes (module scope so comments stay off function-body lines — a body-line
// comment can hold a permanent DA:0 in bun --coverage lcov merges).
// ---------------------------------------------------------------------------

// A cid definition marker: an HTML comment wrapping `cid:<path>`. Prose
// citations are bare `cid:<path>` (no comment) and are NOT definitions.
const DEF_MARKER_RE = /<!--\s*cid:([a-z0-9-]+(?::[a-z0-9-]+)*)\s*-->/g;
// A citation occurrence: `cid:<path>` at a full token boundary (the char
// before `cid` and after the path must not be [a-z0-9-]) so `cid:code` inside
// `cid:code-generation` is captured whole, never as a fragment.
const CITE_RE = /(?<![a-z0-9-])cid:([a-z0-9-]+(?::[a-z0-9-]+)*)(?![a-z0-9-])/g;
// An E-code election id: `E-` followed by uppercase/digits (E-PM1, E-L59, …).
const ECODE_RE = /\bE-[A-Z0-9]+/g;
// An ISO date (YYYY-MM-DD). Lexicographic max == chronological max.
const ISO_DATE_RE = /20\d{2}-\d{2}-\d{2}/g;
// A recorded adoption vote, e.g. "採用 4/4". Two+ on one line = a churn signal.
const ADOPTION_VOTE_RE = /採用\s*\d+\/\d+/g;
// A legacy-alias declaration: "(旧 cid: <slug>)".
const OLD_SLUG_RE = /旧\s*cid:\s*([a-z0-9-]+(?::[a-z0-9-]+)*)/g;
// Amendment textual markers (each occurrence increments amendmentCount).
const AMENDMENT_TOKENS = ["追補", "amended", "superseded", "精密化", "改定", "updated"];

// distill-candidates thresholds (ADR-2 — design-fixed, not CLI flags, so the
// weekly round stays comparable across runs).
// ZERO_CITE_THRESHOLD_DAYS = 14: two weekly-round cycles — a norm missed on one
// round is still caught on the next, the minimum window that avoids a false
// "unused" flag on a brand-new norm.
export const ZERO_CITE_THRESHOLD_DAYS = 14;
// CHURN_THRESHOLD = 2: two-or-more amendments marks a wording-unstable norm
// (verify-before-notify's three-face rewrite is the archetype).
export const CHURN_THRESHOLD = 2;
// DEFAULT_DISTILL_K = 5: the default per-category candidate cap when --k is
// omitted — a blind-election batch of ~5 candidates per signal is tractable to
// review in one weekly round (matches the refined-mockups M2 worked example).
export const DEFAULT_DISTILL_K = 5;

// FR-3 Phase B input schemas (parse-only). A GoA persist line (ADR-4):
//   `GoA[E-<code>]: 1x<n> 2x<n> 3x<n> 4x<n> 5x<n> 6x<n> 7x<n> 8x<n>`
const GOA_HEAD_RE = /^GoA\[(E-[A-Z0-9]+)\]:\s*(.+)$/;
const GOA_TOKEN_RE = /^([1-8])x(\d+)$/;
// A PM round record line (ADR-4):
//   `PM-cid: <full-cid> incident=<one-line> round=<E-PMn>`
const PM_CID_RE = /^PM-cid:\s+([a-z0-9-]+(?::[a-z0-9-]+)*)\s+incident=(.+)\s+round=(E-[A-Z0-9]+)$/;

// ---------------------------------------------------------------------------
// Pure helpers.
// ---------------------------------------------------------------------------

/** Collapse a redundant leading double-namespace: `stage:stage:slug` ->
 *  `stage:slug`. Idempotent for every other shape. */
export function normaliseCid(path: string): string {
  const segs = path.split(":");
  if (segs.length >= 2 && segs[0] === segs[1]) segs.splice(1, 1);
  return segs.join(":");
}

/** Last `:`-segment of a cid path (the slug). */
function tailOf(path: string): string {
  const segs = path.split(":");
  return segs[segs.length - 1];
}

/** "Forbidden"/"Mandated" section -> that class; everything else -> general. */
export function classifySection(section: string): NormClass {
  if (section === "Forbidden") return "forbidden";
  if (section === "Mandated") return "mandated";
  return "general";
}

/** Earliest / latest ISO date on a line (or across a blob). null when none. */
function extremeDate(text: string, pick: "min" | "max"): string | null {
  const matches = text.match(ISO_DATE_RE);
  if (matches === null) return null;
  let chosen = matches[0];
  for (const d of matches) {
    if (pick === "min" ? d < chosen : d > chosen) chosen = d;
  }
  return chosen;
}

/** Whole-day span from `from` to `to`, floored, never below 1 (the age
 *  denominator). A null/unparseable `from` yields 1 (treated as brand new). */
function daySpan(from: string | null, to: string | null): number {
  if (from === null || to === null) return 1;
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 1;
  const days = Math.floor((b - a) / 86_400_000);
  return days < 1 ? 1 : days;
}

// ---------------------------------------------------------------------------
// IoCollector — the only impure boundary: loadRules() off disk, git HEAD via a
// self-contained one-line probe. (Bolt 1 design: use a local git idiom wrapper
// rather than exporting graph/lib's private gitProbe, to keep this a single
// self-contained tool file with no coupling to the large lib module.)
// ---------------------------------------------------------------------------

/** git HEAD SHA, or null when git is absent / cwd is not a repo. Total: never
 *  throws, never exits (a metrics read must not die on a missing .git). */
function gitHeadSha(): string | null {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" });
  if (r.status !== 0) return null;
  const out = (r.stdout ?? "").toString().trim();
  return out === "" ? null : out;
}

/** Flatten loadRules() output into per-line records. Each heading body is a
 *  `\n`-joined block (graph.parseRuleHeadings already stripped fences,
 *  blockquotes, and standalone comment lines but KEPT inline trailing cid
 *  markers — measured: all definition markers survive). */
export function flattenRules(rules: RuleFile[]): RuleLine[] {
  const lines: RuleLine[] = [];
  for (const rf of rules) {
    for (const [section, body] of rf.headings) {
      for (const raw of body.split("\n")) {
        if (raw.trim() === "") continue;
        lines.push({ scope: rf.scope, section, text: raw });
      }
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// CidLedgerParser — definition markers -> CidRecord[]. Deduped by normalised
// fullCid (the current corpus has no normalised duplicates; the dedup is a
// defensive invariant, keeping the first marker seen).
// ---------------------------------------------------------------------------

function countMatches(text: string, re: RegExp): number {
  const m = text.match(re);
  return m === null ? 0 : m.length;
}

/** amendmentCount for a line: one per textual amendment token, plus one when
 *  the line records two-or-more adoption votes (a re-adoption / churn signal). */
export function amendmentCountOf(text: string): number {
  let n = 0;
  for (const token of AMENDMENT_TOKENS) {
    let idx = text.indexOf(token);
    while (idx !== -1) {
      n++;
      idx = text.indexOf(token, idx + token.length);
    }
  }
  if (countMatches(text, ADOPTION_VOTE_RE) >= 2) n++;
  return n;
}

/** Legacy-alias slugs declared on a line via "(旧 cid: <slug>)". */
function oldSlugsOf(text: string): string[] {
  const out: string[] = [];
  OLD_SLUG_RE.lastIndex = 0;
  let m = OLD_SLUG_RE.exec(text);
  while (m !== null) {
    out.push(tailOf(normaliseCid(m[1])));
    m = OLD_SLUG_RE.exec(text);
  }
  return out;
}

export function parseCidRecords(lines: RuleLine[]): CidRecord[] {
  const records: CidRecord[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    DEF_MARKER_RE.lastIndex = 0;
    let m = DEF_MARKER_RE.exec(line.text);
    while (m !== null) {
      const fullCid = normaliseCid(m[1]);
      if (!seen.has(fullCid)) {
        seen.add(fullCid);
        records.push({
          slug: tailOf(fullCid),
          fullCid,
          klass: classifySection(line.section),
          adoptedDate: extremeDate(line.text, "min"),
          amendmentCount: amendmentCountOf(line.text),
          oldSlugs: oldSlugsOf(line.text),
        });
      }
      m = DEF_MARKER_RE.exec(line.text);
    }
  }
  return records;
}

// ---------------------------------------------------------------------------
// CitationScanner — count corpus citations of each defined norm and find the
// latest date on any citing line. A citation matches a record by (1) exact
// normalised fullCid, else (2) a UNIQUE tail slug (so `cid:merge-approval-
// latency` reaches `requirements-analysis:merge-approval-latency` while
// `cid:code-generation:c2` reaches its own record, never the other `:c2`s).
// An ambiguous tail with no full match is left uncounted rather than smeared
// across every colliding record. Definition markers count as one self-citation
// (a uniform +1 that does not change the ranking order).
// ---------------------------------------------------------------------------

export interface CitationTally {
  cites: number;
  lastCited: string | null;
}

interface RecordIndex {
  byFull: Map<string, CidRecord>;
  byTail: Map<string, CidRecord[]>;
}

function indexRecords(records: CidRecord[]): RecordIndex {
  const byFull = new Map<string, CidRecord>();
  const byTail = new Map<string, CidRecord[]>();
  for (const r of records) {
    byFull.set(r.fullCid, r);
    const bucket = byTail.get(r.slug);
    if (bucket === undefined) byTail.set(r.slug, [r]);
    else bucket.push(r);
  }
  return { byFull, byTail };
}

/** The single record a citation path resolves to, or null when unresolved. */
function resolveCitation(path: string, index: RecordIndex): CidRecord | null {
  const full = index.byFull.get(path);
  if (full !== undefined) return full;
  const bucket = index.byTail.get(tailOf(path));
  if (bucket !== undefined && bucket.length === 1) return bucket[0];
  return null;
}

function recordCitation(tally: CitationTally, lineDate: string | null): void {
  tally.cites++;
  if (lineDate !== null && (tally.lastCited === null || lineDate > tally.lastCited)) {
    tally.lastCited = lineDate;
  }
}

/** Mutable accumulator threaded through every scanned text line (memory layer
 *  and corpus). Bundles the record index, per-norm tallies, the running max
 *  corpus date (the age anchor — Date.now-free), and the running E-code count so
 *  a single streaming pass over the corpus never needs a second read. */
export interface ScanState {
  index: RecordIndex;
  tallies: Map<string, CitationTally>;
  latestDate: string | null;
  ecodeCount: number;
}

export function makeScanState(records: CidRecord[]): ScanState {
  const tallies = new Map<string, CitationTally>();
  for (const r of records) tallies.set(r.fullCid, { cites: 0, lastCited: null });
  return { index: indexRecords(records), tallies, latestDate: null, ecodeCount: 0 };
}

/** Scan one line of text: tally each resolved citation, fold the line's max ISO
 *  date into latestDate, and add its E-code occurrences to ecodeCount. The same
 *  boundary/resolution contract applies to memory and corpus lines alike. */
export function scanTextLine(text: string, state: ScanState): void {
  const lineDate = extremeDate(text, "max");
  CITE_RE.lastIndex = 0;
  let m = CITE_RE.exec(text);
  while (m !== null) {
    const target = resolveCitation(normaliseCid(m[1]), state.index);
    const tally = target === null ? undefined : state.tallies.get(target.fullCid);
    if (tally !== undefined) recordCitation(tally, lineDate);
    m = CITE_RE.exec(text);
  }
  if (lineDate !== null && (state.latestDate === null || lineDate > state.latestDate)) {
    state.latestDate = lineDate;
  }
  state.ecodeCount += countMatches(text, ECODE_RE);
}

/** Scan every non-empty line of a text blob (one corpus file body, or a joined
 *  block) into the state. */
export function scanTextBlob(text: string, state: ScanState): void {
  for (const raw of text.split("\n")) {
    if (raw.trim() === "") continue;
    scanTextLine(raw, state);
  }
}

export function scanCitations(
  records: CidRecord[],
  lines: RuleLine[],
): Map<string, CitationTally> {
  const state = makeScanState(records);
  for (const line of lines) scanTextLine(line.text, state);
  return state.tallies;
}

// ---------------------------------------------------------------------------
// Aggregator — records + tallies -> sorted metric rows + corpus-level counts.
// ---------------------------------------------------------------------------

function minMaxNormalise(raw: number[]): number[] {
  if (raw.length === 0) return [];
  let lo = raw[0];
  let hi = raw[0];
  for (const v of raw) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo;
  if (span === 0) return raw.map(() => 0);
  return raw.map((v) => (v - lo) / span);
}

export function buildRows(
  records: CidRecord[],
  tallies: Map<string, CitationTally>,
  latestDataDate: string | null,
): NormMetricRow[] {
  const rawAge: number[] = [];
  for (const r of records) {
    const cites = tallies.get(r.fullCid)?.cites ?? 0;
    rawAge.push(cites / daySpan(r.adoptedDate, latestDataDate));
  }
  const ageNorms = minMaxNormalise(rawAge);

  const rows: NormMetricRow[] = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const tally = tallies.get(r.fullCid);
    rows.push({
      cid: r.fullCid,
      klass: r.klass,
      adoptedDate: r.adoptedDate,
      amendmentCount: r.amendmentCount,
      cites: tally?.cites ?? 0,
      lastCited: tally?.lastCited ?? null,
      ageNorm: ageNorms[i],
    });
  }

  rows.sort((a, b) => (b.cites - a.cites) || a.cid.localeCompare(b.cid));
  return rows;
}

function countAdoptionVotes(lines: RuleLine[], records: CidRecord[]): number {
  // A record "has an adoption vote" when its definition line carries a "採用 n/n".
  // Re-derive per record from the line the marker sat on.
  let have = 0;
  const withVote = new Set<string>();
  for (const line of lines) {
    if (countMatches(line.text, ADOPTION_VOTE_RE) === 0) continue;
    DEF_MARKER_RE.lastIndex = 0;
    let m = DEF_MARKER_RE.exec(line.text);
    while (m !== null) {
      withVote.add(normaliseCid(m[1]));
      m = DEF_MARKER_RE.exec(line.text);
    }
  }
  for (const r of records) if (withVote.has(r.fullCid)) have++;
  return have;
}

function computeUncounted(lines: RuleLine[]): UncountedRules {
  let org = 0;
  let affirmed = 0;
  for (const line of lines) {
    if (line.scope === "org") org++;
    if (line.text.includes("(affirmed")) affirmed++;
  }
  return { org, affirmed };
}

/** Collect metrics over the memory layer plus an (optional) citation corpus.
 *  `corpus` is an iterable of file bodies — the production caller passes a lazy
 *  generator so files stream in one at a time (scalability-design), tests pass
 *  an array of string fixtures. Definitions and the uncounted/adoption-vote
 *  counts come from the memory layer only; citations, the latest-data-date
 *  anchor, and the E-code count fold in the corpus too (AC-1b). */
export function collectMetrics(
  rules: RuleFile[],
  sourceSha: string | null,
  corpus: Iterable<string> = [],
): NormMetrics {
  const lines = flattenRules(rules);
  const records = parseCidRecords(lines);
  const state = makeScanState(records);
  for (const line of lines) scanTextLine(line.text, state);
  for (const body of corpus) scanTextBlob(body, state);

  const latestDataDate = state.latestDate;
  const rows = buildRows(records, state.tallies, latestDataDate);

  let unlinkedLegacy = 0;
  for (const r of records) unlinkedLegacy += r.oldSlugs.length;

  return {
    sourceSha,
    latestDataDate,
    rows,
    uncounted: computeUncounted(lines),
    ecodeOccurrences: state.ecodeCount,
    adoptionVotes: { have: countAdoptionVotes(lines, records), total: records.length },
    unlinkedLegacy,
  };
}

// ---------------------------------------------------------------------------
// Renderers — every NormMetrics / NormMetricRow field is consumed here.
// ---------------------------------------------------------------------------

function topRows(rows: NormMetricRow[], top: number | null): NormMetricRow[] {
  if (top === null) return rows;
  return rows.slice(0, top);
}

export function renderJson(metrics: NormMetrics, top: number | null): string {
  return JSON.stringify({ ...metrics, rows: topRows(metrics.rows, top) });
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

export function renderTable(metrics: NormMetrics, top: number | null): string {
  const out: string[] = [];
  out.push(`source: ${metrics.sourceSha ?? "unknown"} (latest data date: ${metrics.latestDataDate ?? "n/a"})`);
  out.push(
    `uncounted rules (no cid): ${metrics.uncounted.affirmed} affirmed + ${metrics.uncounted.org} org-rules`,
  );
  out.push(`E-code citations: NOT AGGREGATED (observed: ${metrics.ecodeOccurrences} occurrences)`);
  out.push(
    `GoA-variance, violation-recurrence: NOT COLLECTED -- structured records absent ` +
      `(adoption-votes partial: ${metrics.adoptionVotes.have}/${metrics.adoptionVotes.total})`,
  );
  out.push(`unlinked legacy citations: ${metrics.unlinkedLegacy}`);
  out.push("");
  out.push(
    `${pad("CITES", 6)}${pad("AGE-NORM", 10)}${pad("KLASS", 10)}${pad("ADOPTED", 12)}${pad("AMEND", 7)}${pad("LAST-CITED", 12)}CID`,
  );
  for (const r of topRows(metrics.rows, top)) {
    out.push(
      `${pad(String(r.cites), 6)}${pad(r.ageNorm.toFixed(4), 10)}${pad(r.klass, 10)}` +
        `${pad(r.adoptedDate ?? "-", 12)}${pad(String(r.amendmentCount), 7)}${pad(r.lastCited ?? "-", 12)}${r.cid}`,
    );
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Distiller — rows -> distillation candidates. Zero-cite (old enough to judge)
// and high-churn (rewritten enough to be unstable), top k of each. Forbidden and
// Mandated norms are STRUCTURALLY exempt (never candidates) and listed with a
// count so the fire-extinguisher exemption is visible, never silent (AC-2b).
// ---------------------------------------------------------------------------

/** One distillation candidate. Every field is consumed by a distill renderer
 *  (AC-1f): cid/lastCited/adoptedDate/ageDays on the zero-cite line, and
 *  cid/amendmentCount/cites/lastCited on the high-churn line. */
export interface DistillCandidate {
  cid: string;
  cites: number;
  amendmentCount: number;
  adoptedDate: string | null;
  lastCited: string | null;
  ageDays: number; // whole days from adoptedDate to latestDataDate (staleness)
}

export interface DistillReport {
  zeroCite: DistillCandidate[];
  highChurn: DistillCandidate[];
  exempt: { count: number; cids: string[] }; // every forbidden/mandated cid
}

// Each norm's own definition marker is scanned as one self-citation (the uniform
// +1 baseline documented on the CitationScanner). "Zero-cite" therefore means
// "cited by nothing beyond its own definition" — cites at or below this baseline
// — because a literal cites==0 is unreachable for any defined norm.
const SELF_CITE_BASELINE = 1;

function candidateOf(row: NormMetricRow, latestDataDate: string | null): DistillCandidate {
  return {
    cid: row.cid,
    cites: row.cites,
    amendmentCount: row.amendmentCount,
    adoptedDate: row.adoptedDate,
    lastCited: row.lastCited,
    ageDays: daySpan(row.adoptedDate, latestDataDate),
  };
}

/** Zero-cite candidates: staler first (largest ageDays), cid asc as tiebreak. */
function byAgeDaysDescThenCid(a: DistillCandidate, b: DistillCandidate): number {
  return b.ageDays - a.ageDays || a.cid.localeCompare(b.cid);
}

/** High-churn candidates: most-amended first, cid asc as tiebreak. */
function byChurnDescThenCid(a: DistillCandidate, b: DistillCandidate): number {
  return b.amendmentCount - a.amendmentCount || a.cid.localeCompare(b.cid);
}

export function distillCandidates(metrics: NormMetrics, k: number): DistillReport {
  const zeroCite: DistillCandidate[] = [];
  const highChurn: DistillCandidate[] = [];
  const exemptCids: string[] = [];
  for (const row of metrics.rows) {
    if (row.klass !== "general") {
      exemptCids.push(row.cid);
      continue;
    }
    const cand = candidateOf(row, metrics.latestDataDate);
    // A null adoptedDate yields ageDays 1 (treated as brand new) and so is never
    // flagged zero-cite — we do not estimate staleness we cannot measure (P2).
    if (cand.cites <= SELF_CITE_BASELINE && row.adoptedDate !== null && cand.ageDays >= ZERO_CITE_THRESHOLD_DAYS) {
      zeroCite.push(cand);
    }
    if (cand.amendmentCount >= CHURN_THRESHOLD) highChurn.push(cand);
  }
  zeroCite.sort(byAgeDaysDescThenCid);
  highChurn.sort(byChurnDescThenCid);
  exemptCids.sort();
  return {
    zeroCite: zeroCite.slice(0, k),
    highChurn: highChurn.slice(0, k),
    exempt: { count: exemptCids.length, cids: exemptCids },
  };
}

export function renderDistillTable(report: DistillReport): string {
  const out: string[] = [];
  out.push(`zero-cite candidates (ZERO_CITE_THRESHOLD_DAYS=${ZERO_CITE_THRESHOLD_DAYS}): ${report.zeroCite.length}`);
  for (const c of report.zeroCite) {
    out.push(`  ${c.cid}  (last-cited: ${c.lastCited ?? "never"}, adopted: ${c.adoptedDate ?? "-"}, age-days: ${c.ageDays})`);
  }
  out.push(`high-churn candidates (CHURN_THRESHOLD=${CHURN_THRESHOLD}): ${report.highChurn.length}`);
  for (const c of report.highChurn) {
    out.push(`  ${c.cid}  (amendments: ${c.amendmentCount}, cites: ${c.cites}, last-cited: ${c.lastCited ?? "never"})`);
  }
  out.push(`forbidden/mandated exempt (never candidates): ${report.exempt.count} listed`);
  for (const cid of report.exempt.cids) out.push(`  ${cid}`);
  return out.join("\n");
}

export function renderDistillJson(report: DistillReport): string {
  return JSON.stringify(report);
}

// ---------------------------------------------------------------------------
// PhaseBSchemas (FR-3) — parse-only. These define the input contract for the
// GoA-variance / violation-recurrence axes that rank reports as NOT COLLECTED.
// They structure a single record line into a typed value; they never aggregate,
// and they never fill in missing fields — a malformed line is a ParseFailure,
// not a guessed default (US-3.2 / P2).
// ---------------------------------------------------------------------------

/** An 8-bin Gradients-of-Agreement vote distribution parsed from a persist line. */
export interface GoaBreakdown {
  ok: true;
  ecode: string;
  votes: [number, number, number, number, number, number, number, number];
}

/** One PM-round incident record parsed from a `PM-cid:` line. */
export interface PmIncident {
  ok: true;
  cid: string;
  incident: string;
  round: string;
}

export interface ParseFailure {
  ok: false;
  error: string;
}

/** Parse `GoA[E-<code>]: 1x<n> 2x<n> ... 8x<n>` into a GoaBreakdown, or fail. */
export function parseGoaLine(line: string): GoaBreakdown | ParseFailure {
  const head = GOA_HEAD_RE.exec(line.trim());
  if (head === null) return { ok: false, error: `not a GoA line: ${line}` };
  const tokens = head[2].trim().split(/\s+/);
  if (tokens.length !== 8) return { ok: false, error: `expected 8 vote bins, got ${tokens.length}` };
  const votes: number[] = [];
  for (let i = 0; i < 8; i++) {
    const tok = GOA_TOKEN_RE.exec(tokens[i]);
    if (tok === null) return { ok: false, error: `malformed vote bin: ${tokens[i]}` };
    if (Number(tok[1]) !== i + 1) return { ok: false, error: `bin out of order: ${tokens[i]} (expected ${i + 1}x<n>)` };
    votes.push(Number(tok[2]));
  }
  return { ok: true, ecode: head[1], votes: [votes[0], votes[1], votes[2], votes[3], votes[4], votes[5], votes[6], votes[7]] };
}

/** Parse `PM-cid: <full-cid> incident=<one-line> round=<E-PMn>`, or fail. */
export function parsePmCidLine(line: string): PmIncident | ParseFailure {
  const m = PM_CID_RE.exec(line.trim());
  if (m === null) return { ok: false, error: `not a PM-cid line: ${line}` };
  return { ok: true, cid: normaliseCid(m[1]), incident: m[2].trim(), round: m[3] };
}

// ---------------------------------------------------------------------------
// IoCollector (corpus) — discover and stream the citation corpus off disk. The
// corpus is the record tree + audit shards (amadeus/spaces/*/intents/**/*.md);
// the memory layer body is scanned separately via loadRules. Files are yielded
// one body at a time so collectMetrics never holds the whole corpus in memory.
// AMADEUS_CORPUS_ROOT is a test/relocation seam mirroring AMADEUS_RULES_DIR.
// ---------------------------------------------------------------------------

/** Workspace root holding `amadeus/spaces/`. Defaults to two levels up from this
 *  tool (<ws>/<harness>/tools/ -> <ws>), matching amadeus-graph.ts's rulesDir. */
function corpusRoot(): string {
  return process.env.AMADEUS_CORPUS_ROOT ?? join(__FILE_DIR, "..", "..");
}

/** Directory entries by name, ascending — the default string sort is
 *  deterministic (UTF-16 code-unit order), which is all the corpus needs for
 *  byte-identical runs. Returns [name, Dirent] pairs so callers keep the type. */
function sortedEntries(dir: string): [string, Dirent][] {
  const byName = new Map<string, Dirent>();
  for (const e of readdirSync(dir, { withFileTypes: true })) byName.set(e.name, e);
  const pairs: [string, Dirent][] = [];
  for (const name of [...byName.keys()].sort()) pairs.push([name, byName.get(name) as Dirent]);
  return pairs;
}

/** Recursively collect every `.md` file under `dir`, in a deterministic
 *  (name-sorted) order, appending absolute paths to `out`. */
function collectMarkdownFiles(dir: string, out: string[]): void {
  for (const [name, e] of sortedEntries(dir)) {
    const full = join(dir, name);
    if (e.isDirectory()) collectMarkdownFiles(full, out);
    else if (e.isFile() && name.endsWith(".md")) out.push(full);
  }
}

/** Stream the corpus file bodies (record tree + audit shards). A missing
 *  amadeus/spaces or intents tree yields nothing — the tool then measures the
 *  memory layer alone rather than failing (the corpus is additive). */
export function* corpusFileBodies(): Generator<string> {
  const spacesDir = join(corpusRoot(), "amadeus", "spaces");
  if (!existsSync(spacesDir)) return;
  for (const [name, s] of sortedEntries(spacesDir)) {
    if (!s.isDirectory()) continue;
    const intentsDir = join(spacesDir, name, "intents");
    if (!existsSync(intentsDir)) continue;
    const files: string[] = [];
    collectMarkdownFiles(intentsDir, files);
    for (const f of files) yield readFileSync(f, "utf-8");
  }
}

// ---------------------------------------------------------------------------
// CLI — `rank [--json] [--top <n>]` / `distill-candidates [--k <n>] [--json]`.
// Unknown verb -> exit 2; missing memory layer -> exit 1 (loud ERROR on stderr).
// ---------------------------------------------------------------------------

type ParsedArgs =
  | { kind: "ok"; verb: string; json: boolean; top: number | null; k: number | null }
  | { kind: "error"; code: number; message: string };

/** A `--flag <n>` positive-integer value, or a usage error. Shared by --top and
 *  --k (identical validation intent). */
type IntFlag = { ok: true; n: number } | { ok: false; message: string };

function parsePositiveIntFlag(flag: string, raw: string | undefined): IntFlag {
  const n = Number(raw);
  if (raw === undefined || !Number.isInteger(n) || n < 1) {
    return { ok: false, message: `Invalid ${flag} value: ${raw ?? "(missing)"}` };
  }
  return { ok: true, n };
}

export function parseArgs(argv: string[]): ParsedArgs {
  let verb: string | null = null;
  let json = false;
  let top: number | null = null;
  let k: number | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") {
      json = true;
    } else if (arg === "--top" || arg === "--k") {
      const parsed = parsePositiveIntFlag(arg, argv[++i]);
      if (!parsed.ok) return { kind: "error", code: 2, message: parsed.message };
      if (arg === "--top") top = parsed.n;
      else k = parsed.n;
    } else if (verb === null) {
      verb = arg;
    } else {
      return { kind: "error", code: 2, message: `Unexpected argument: ${arg}` };
    }
  }

  if (verb === null) {
    return {
      kind: "error",
      code: 2,
      message: "Usage: amadeus-norm-metrics <rank [--json] [--top <n>] | distill-candidates [--k <n>] [--json]>",
    };
  }
  return { kind: "ok", verb, json, top, k };
}

/** Load the memory layer, failing closed with exit 1 (loud ERROR) when it is
 *  absent. Returns null on failure so callers can `return 1`. */
function loadMemoryOrReport(): RuleFile[] | null {
  const rules = loadRules();
  if (rules.length === 0) {
    console.error("ERROR: memory layer not found (loadRules returned no rule files)");
    return null;
  }
  return rules;
}

/** The `rank` verb: memory + corpus -> aggregate -> render. */
function runRank(json: boolean, top: number | null): number {
  const rules = loadMemoryOrReport();
  if (rules === null) return 1;
  const metrics = collectMetrics(rules, gitHeadSha(), corpusFileBodies());
  console.log(json ? renderJson(metrics, top) : renderTable(metrics, top));
  return 0;
}

/** The `distill-candidates` verb: memory + corpus -> aggregate -> candidates. */
function runDistill(json: boolean, k: number | null): number {
  const rules = loadMemoryOrReport();
  if (rules === null) return 1;
  const metrics = collectMetrics(rules, gitHeadSha(), corpusFileBodies());
  const report = distillCandidates(metrics, k ?? DEFAULT_DISTILL_K);
  console.log(json ? renderDistillJson(report) : renderDistillTable(report));
  return 0;
}

export function main(argv: string[]): number {
  const parsed = parseArgs(argv);
  if (parsed.kind === "error") {
    console.error(parsed.message);
    return parsed.code;
  }

  const verb = parsed.verb;
  switch (verb) {
    case "rank":
      return runRank(parsed.json, parsed.top);
    case "distill-candidates":
      return runDistill(parsed.json, parsed.k);
    default:
      console.error(`Unknown verb: ${verb} (valid: rank, distill-candidates)`);
      return 2;
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
