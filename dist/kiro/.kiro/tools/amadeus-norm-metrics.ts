// Norm-metrics tool — the read-only measuring instrument for the memory-layer
// norm corpus (org/team/project + phase rule files). It answers "which norms
// carry the most weight, and what is structurally NOT measurable yet" so the
// distillation work (Bolt 2) has an evidence base instead of a guess.
//
// Bolt 1 (walking skeleton) ships ONE verb:
//
//   rank [--json] [--top <n>]
//       Load the memory layer (via graph.loadRules — the SAME walker the rule
//       resolver uses, so the corpus is method-correct), parse every cid
//       definition marker into a CidRecord, scan the corpus for citations of
//       each norm, aggregate into a per-norm metric row sorted by citation
//       count, and render a table (default) or a single-line JSON object.
//
// EVERYTHING here is deterministic: the corpus is read off disk, the "latest
// data date" is derived from the corpus itself (never Date.now), and two runs
// on the same tree are byte-identical. The pure parsers/scanners/renderers are
// exported so tests drive them in-process with string fixtures (bun --coverage
// does not measure spawned subprocesses, so the in-process seam is the lcov
// carrier); the `rank` argv dispatch is also exercised as a real CLI spawn so
// the coverage registry's `subcommand` unit is verified at its cli mechanism.
//
// What this tool deliberately does NOT do in Bolt 1: GoA-variance and
// violation-recurrence are NOT collected (no structured records exist for
// them — the header says so loudly), E-code citations are counted but NOT
// aggregated into the ranking, and legacy-alias reverse-linking is not
// implemented (unlinkedLegacy is derived from parsed old-slug markers, which
// the current corpus has zero of). These are surfaced as explicit "NOT
// COLLECTED / NOT AGGREGATED" lines rather than silently omitted, so the
// output can never masquerade as more complete than it is.

import { spawnSync } from "node:child_process";
import { loadRules, type RuleFile } from "./amadeus-graph.ts";

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

function scanLine(
  line: RuleLine,
  index: RecordIndex,
  tallies: Map<string, CitationTally>,
): void {
  const lineDate = extremeDate(line.text, "max");
  CITE_RE.lastIndex = 0;
  let m = CITE_RE.exec(line.text);
  while (m !== null) {
    const target = resolveCitation(normaliseCid(m[1]), index);
    const tally = target === null ? undefined : tallies.get(target.fullCid);
    if (tally !== undefined) recordCitation(tally, lineDate);
    m = CITE_RE.exec(line.text);
  }
}

export function scanCitations(
  records: CidRecord[],
  lines: RuleLine[],
): Map<string, CitationTally> {
  const index = indexRecords(records);
  const tallies = new Map<string, CitationTally>();
  for (const r of records) tallies.set(r.fullCid, { cites: 0, lastCited: null });
  for (const line of lines) scanLine(line, index, tallies);
  return tallies;
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

export function collectMetrics(rules: RuleFile[], sourceSha: string | null): NormMetrics {
  const lines = flattenRules(rules);
  const records = parseCidRecords(lines);
  const latestDataDate = extremeDate(lines.map((l) => l.text).join("\n"), "max");
  const tallies = scanCitations(records, lines);
  const rows = buildRows(records, tallies, latestDataDate);

  let ecodeOccurrences = 0;
  let unlinkedLegacy = 0;
  for (const line of lines) ecodeOccurrences += countMatches(line.text, ECODE_RE);
  for (const r of records) unlinkedLegacy += r.oldSlugs.length;

  return {
    sourceSha,
    latestDataDate,
    rows,
    uncounted: computeUncounted(lines),
    ecodeOccurrences,
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
// CLI — `rank [--json] [--top <n>]`. Unknown verb -> exit 2; missing memory
// layer -> exit 1 (loud ERROR on stderr). No other verbs in Bolt 1
// (distill-candidates is Bolt 2).
// ---------------------------------------------------------------------------

type ParsedArgs =
  | { kind: "ok"; verb: string; json: boolean; top: number | null }
  | { kind: "error"; code: number; message: string };

export function parseArgs(argv: string[]): ParsedArgs {
  let verb: string | null = null;
  let json = false;
  let top: number | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") {
      json = true;
    } else if (arg === "--top") {
      const raw = argv[i + 1];
      i++;
      const n = Number(raw);
      if (raw === undefined || !Number.isInteger(n) || n < 1) {
        return { kind: "error", code: 2, message: `Invalid --top value: ${raw ?? "(missing)"}` };
      }
      top = n;
    } else if (verb === null) {
      verb = arg;
    } else {
      return { kind: "error", code: 2, message: `Unexpected argument: ${arg}` };
    }
  }

  if (verb === null) {
    return { kind: "error", code: 2, message: "Usage: amadeus-norm-metrics rank [--json] [--top <n>]" };
  }
  return { kind: "ok", verb, json, top };
}

/** The `rank` verb: load the memory layer, aggregate, render. Fails closed with
 *  exit 1 (loud ERROR) when the memory layer is absent. */
function runRank(json: boolean, top: number | null): number {
  const rules = loadRules();
  if (rules.length === 0) {
    console.error("ERROR: memory layer not found (loadRules returned no rule files)");
    return 1;
  }
  const metrics = collectMetrics(rules, gitHeadSha());
  console.log(json ? renderJson(metrics, top) : renderTable(metrics, top));
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
    default:
      console.error(`Unknown verb: ${verb} (Bolt 1 implements only 'rank')`);
      return 2;
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
