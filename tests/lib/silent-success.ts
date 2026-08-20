// silent-success.ts — detection logic for the three "silent success" gates (#1982).
//
// WHAT THIS IS. A test file can report PASS while proving nothing. Three shapes
// of that failure are detectable from artifacts the runner already has:
//
//   1. ZERO-ASSERTION — the file executed testcases but evaluated no expect().
//      bun's JUnit root carries `assertions="0"`, so the runner can see it.
//   2. CHRONIC SELF-SKIP — a `test.skip` / conditional `return` inside the file
//      keeps a case permanently unexecuted. bun marks it `<skipped />`. A skip
//      is legitimate as a TIME-BOXED exemption; it is not legitimate as a
//      permanent, unreviewed hole, so skips are registered in a committed ledger
//      with a reason and an expiry.
//   3. PROCESS LEAK — the file leaves an orphan child process behind (#1811).
//      The runner already injects AMADEUS_TEST_NAME=<basename> into every test
//      child's environment; any surviving same-user process still carrying that
//      exact environment entry after the `bun test` child exited is a leak from
//      that file, and nothing else can carry the same marker.
//
// EVERYTHING HERE IS PURE WHERE IT CAN BE. XML parsing, marker detection,
// baseline matching/expiry, mode resolution, and the ps/`/proc` text parsers
// take plain inputs and return plain values, so tests drive them in-process.
// The only I/O is `loadBaseline` (one read at runner startup) and
// `scanForMarkedProcesses` (the platform process scan), and both are reachable
// through injectable seams.
//
// RELATIONSHIP TO THE RUNNER CONTRACT. `tests/run-tests.ts` exits with the
// number of FAILED FILES. A gate violation flips that one file's meta to
// STATUS=FAIL with FAILED>=1 — the same synthesis buildMeta already performs
// for an import crash — so the exit-code contract is unchanged: one more failed
// file, one more count.
//
// BASELINE PRECEDENT. `tests/.silent-success-baseline.json` follows
// tests/.callsite-allowlist.json: a missing baseline is an empty baseline, a
// MALFORMED baseline is fail-closed (the run stops rather than silently gating
// nothing), and the direction is shrink-only by review convention — there is
// deliberately no `--update` writer that would let a violation be waved through
// mechanically.

import { existsSync, readFileSync, readdirSync } from "node:fs";

// ---------------------------------------------------------------------------
// Mode resolution.
// ---------------------------------------------------------------------------

export type GateMode = "off" | "report" | "strict";

export interface GateModes {
  readonly zeroAssertion: GateMode;
  readonly skip: GateMode;
  readonly leak: GateMode;
}

export interface ResolvedGateModes {
  readonly modes: GateModes;
  // A non-fatal note the runner prints (unrecognized env value).
  readonly warning: string | null;
}

// The index signature keeps this assignable straight from `process.env`; the
// three named keys are the only ones read.
export interface GateEnv {
  readonly AMADEUS_SILENT_SUCCESS_GATE?: string | undefined;
  readonly AMADEUS_SILENT_SUCCESS_LEAK?: string | undefined;
  readonly GITHUB_ACTIONS?: string | undefined;
  readonly [key: string]: string | undefined;
}

const OFF_MODES: GateModes = { zeroAssertion: "off", skip: "off", leak: "off" };

/**
 * Resolve the per-gate mode from the environment.
 *
 * `AMADEUS_SILENT_SUCCESS_GATE`:
 *   - `off`    — all three gates disabled (the documented escape hatch).
 *   - `strict` — all three fail-closed.
 *   - `report` — all three evaluate and print, none flips a file's status.
 *   - unset    — per-gate defaults:
 *       zero-assertion: strict. It reads an artifact bun always emits and is
 *         environment-independent once baselined, so there is no substrate on
 *         which it is unfair.
 *       skip: strict in CI, report locally. A local developer mid-edit should
 *         not be blocked by ledger bookkeeping; CI is where the ledger is
 *         enforced.
 *       leak: strict only on Linux CI. Process-environment inspection is exact
 *         on Linux (`/proc/<pid>/environ`) and best-effort elsewhere, so only
 *         the exact platform is allowed to fail a build.
 *
 * `AMADEUS_SILENT_SUCCESS_LEAK=fail` forces the leak gate fail-closed on any
 * platform. `off` still wins over it: the escape hatch stays absolute.
 *
 * An unrecognized `AMADEUS_SILENT_SUCCESS_GATE` value is treated as unset and
 * reported as a warning — a typo must not silently disable a gate, and the
 * unset defaults are the safe direction to fall back to.
 */
export function resolveGateModes(env: GateEnv, platform: string): ResolvedGateModes {
  const raw = env.AMADEUS_SILENT_SUCCESS_GATE?.trim();
  const leakForced = env.AMADEUS_SILENT_SUCCESS_LEAK?.trim() === "fail";
  const ci = env.GITHUB_ACTIONS === "true";

  if (raw === "off") return { modes: OFF_MODES, warning: null };
  if (raw === "strict") {
    return { modes: { zeroAssertion: "strict", skip: "strict", leak: "strict" }, warning: null };
  }
  if (raw === "report") {
    return {
      modes: { zeroAssertion: "report", skip: "report", leak: leakForced ? "strict" : "report" },
      warning: null,
    };
  }

  const warning =
    raw === undefined || raw === ""
      ? null
      : `AMADEUS_SILENT_SUCCESS_GATE="${raw}" is not one of off|report|strict — using the default modes`;
  return {
    modes: {
      zeroAssertion: "strict",
      skip: ci ? "strict" : "report",
      leak: leakForced || (ci && platform === "linux") ? "strict" : "report",
    },
    warning,
  };
}

/** True when at least one gate does something (evaluation is worth running). */
export function anyGateActive(modes: GateModes): boolean {
  return modes.zeroAssertion !== "off" || modes.skip !== "off" || modes.leak !== "off";
}

// ---------------------------------------------------------------------------
// The committed baseline / skip ledger.
// ---------------------------------------------------------------------------

export const BASELINE_BASENAME = ".silent-success-baseline.json";
export const BASELINE_SCHEMA_VERSION = 1;

export interface ZeroAssertionEntry {
  readonly file: string;
  readonly reason: string;
  readonly issue: string;
}

export interface SkipLedgerEntry {
  readonly file: string;
  /** JUnit testcase `name`, or `"*"` for every case in the file. */
  readonly test: string;
  readonly reason: string;
  readonly issue: string;
  /** UTC `YYYY-MM-DD`. */
  readonly firstObserved: string;
  /** UTC `YYYY-MM-DD`; a date in the past makes a still-observed skip a violation. */
  readonly expires: string;
}

export interface LeakEntry {
  readonly file: string;
  readonly reason: string;
  readonly issue: string;
}

export interface SilentSuccessBaseline {
  readonly schemaVersion: number;
  readonly zeroAssertion: readonly ZeroAssertionEntry[];
  readonly skips: readonly SkipLedgerEntry[];
  readonly leaks: readonly LeakEntry[];
}

export const EMPTY_BASELINE: SilentSuccessBaseline = {
  schemaVersion: BASELINE_SCHEMA_VERSION,
  zeroAssertion: [],
  skips: [],
  leaks: [],
};

export type LoadedBaseline =
  | { readonly kind: "loaded"; readonly doc: SilentSuccessBaseline }
  | { readonly kind: "failed"; readonly detail: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function requireString(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (typeof value !== "string" || value.trim() === "") return null;
  return value;
}

function asRows(value: unknown, section: string): { rows: Record<string, unknown>[] } | { detail: string } {
  if (value === undefined) return { rows: [] };
  if (!Array.isArray(value)) return { detail: `${section} must be an array` };
  const rows: Record<string, unknown>[] = [];
  for (const [index, row] of value.entries()) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      return { detail: `${section}[${index}] must be an object` };
    }
    rows.push(row as Record<string, unknown>);
  }
  return { rows };
}

function parseZeroAssertion(value: unknown): { entries: ZeroAssertionEntry[] } | { detail: string } {
  const parsed = asRows(value, "zeroAssertion");
  if ("detail" in parsed) return parsed;
  const entries: ZeroAssertionEntry[] = [];
  for (const [index, row] of parsed.rows.entries()) {
    const where = `zeroAssertion[${index}]`;
    const file = requireString(row, "file");
    const reason = requireString(row, "reason");
    const issue = requireString(row, "issue");
    if (file === null || reason === null || issue === null) {
      return { detail: `${where} needs non-empty "file", "reason", and "issue"` };
    }
    entries.push({ file, reason, issue });
  }
  return { entries };
}

function parseLeaks(value: unknown): { entries: LeakEntry[] } | { detail: string } {
  const parsed = asRows(value, "leaks");
  if ("detail" in parsed) return parsed;
  const entries: LeakEntry[] = [];
  for (const [index, row] of parsed.rows.entries()) {
    const where = `leaks[${index}]`;
    const file = requireString(row, "file");
    const reason = requireString(row, "reason");
    const issue = requireString(row, "issue");
    if (file === null || reason === null || issue === null) {
      return { detail: `${where} needs non-empty "file", "reason", and "issue"` };
    }
    entries.push({ file, reason, issue });
  }
  return { entries };
}

function parseSkips(value: unknown): { entries: SkipLedgerEntry[] } | { detail: string } {
  const parsed = asRows(value, "skips");
  if ("detail" in parsed) return parsed;
  const entries: SkipLedgerEntry[] = [];
  for (const [index, row] of parsed.rows.entries()) {
    const where = `skips[${index}]`;
    const file = requireString(row, "file");
    const test = requireString(row, "test");
    const reason = requireString(row, "reason");
    const issue = requireString(row, "issue");
    const firstObserved = requireString(row, "firstObserved");
    const expires = requireString(row, "expires");
    if (
      file === null ||
      test === null ||
      reason === null ||
      issue === null ||
      firstObserved === null ||
      expires === null
    ) {
      return {
        detail: `${where} needs non-empty "file", "test", "reason", "issue", "firstObserved", and "expires"`,
      };
    }
    if (!DATE_RE.test(firstObserved) || !DATE_RE.test(expires)) {
      return { detail: `${where} dates must be UTC YYYY-MM-DD (got "${firstObserved}" / "${expires}")` };
    }
    entries.push({ file, test, reason, issue, firstObserved, expires });
  }
  return { entries };
}

/**
 * Parse the committed baseline document. Fail-closed: anything the runner
 * cannot understand is an error, never an implicit empty baseline. Only a
 * genuinely ABSENT file means "no exemptions" (see `loadBaseline`).
 */
export function parseBaseline(body: string): LoadedBaseline {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (err) {
    return { kind: "failed", detail: `baseline is not valid JSON: ${(err as Error).message}` };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { kind: "failed", detail: "baseline must be a JSON object" };
  }
  const doc = parsed as Record<string, unknown>;
  if (doc.schemaVersion !== BASELINE_SCHEMA_VERSION) {
    return {
      kind: "failed",
      detail: `baseline schemaVersion must be ${BASELINE_SCHEMA_VERSION}, got ${JSON.stringify(doc.schemaVersion)}`,
    };
  }

  const zeroAssertion = parseZeroAssertion(doc.zeroAssertion);
  if ("detail" in zeroAssertion) return { kind: "failed", detail: zeroAssertion.detail };
  const skips = parseSkips(doc.skips);
  if ("detail" in skips) return { kind: "failed", detail: skips.detail };
  const leaks = parseLeaks(doc.leaks);
  if ("detail" in leaks) return { kind: "failed", detail: leaks.detail };

  return {
    kind: "loaded",
    doc: {
      schemaVersion: BASELINE_SCHEMA_VERSION,
      zeroAssertion: zeroAssertion.entries,
      skips: skips.entries,
      leaks: leaks.entries,
    },
  };
}

/** Read + parse the baseline. A missing file is an empty baseline; a broken one fails. */
export function loadBaseline(path: string): LoadedBaseline {
  if (!existsSync(path)) return { kind: "loaded", doc: EMPTY_BASELINE };
  let body: string;
  try {
    body = readFileSync(path, "utf8");
  } catch (err) {
    return { kind: "failed", detail: `baseline could not be read: ${(err as Error).message}` };
  }
  return parseBaseline(body);
}

// ---------------------------------------------------------------------------
// JUnit reading for the gates.
//
// bun-junit-to-meta.ts owns the STATUS/TESTS/FAILED/DURATION mapping and is
// deliberately left untouched — the gates need two more facts (`assertions` and
// the names of the skipped testcases) that the `.meta` shape has no room for,
// so they are read here from the same XML text.
// ---------------------------------------------------------------------------

export interface JUnitGateSummary {
  readonly tests: number;
  /** Root `assertions` attribute; null when the attribute is absent. */
  readonly assertions: number | null;
  readonly skipped: number;
  /** Names of the testcases carrying a nested `<skipped />`, in document order. */
  readonly skippedTests: readonly string[];
}

export const EMPTY_JUNIT_SUMMARY: JUnitGateSummary = {
  tests: 0,
  assertions: null,
  skipped: 0,
  skippedTests: [],
};

function attrNumber(openTag: string, attr: string): number | null {
  const m = openTag.match(new RegExp(`\\b${attr}\\s*=\\s*"([^"]*)"`));
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function attrRaw(openTag: string, attr: string): string | null {
  const m = openTag.match(new RegExp(`\\b${attr}\\s*=\\s*"([^"]*)"`));
  return m ? m[1] : null;
}

/** Undo the XML entity escaping bun applies to testcase names. */
export function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

const TESTCASE_OPEN_RE = /<testcase\b([^>]*?)(\/?)>/g;

/** Names of the `<testcase>` elements that carry a nested `<skipped />`. */
export function extractSkippedTestNames(xml: string): string[] {
  const names: string[] = [];
  TESTCASE_OPEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null = TESTCASE_OPEN_RE.exec(xml);
  while (match !== null) {
    const selfClosing = match[2] === "/";
    if (!selfClosing) {
      const bodyStart = match.index + match[0].length;
      const bodyEnd = xml.indexOf("</testcase>", bodyStart);
      const body = bodyEnd < 0 ? xml.slice(bodyStart) : xml.slice(bodyStart, bodyEnd);
      if (/<skipped\b/.test(body)) {
        names.push(unescapeXml(attrRaw(match[1], "name") ?? ""));
      }
    }
    match = TESTCASE_OPEN_RE.exec(xml);
  }
  return names;
}

/**
 * Read the gate-relevant facts off the JUnit document. Empty/whitespace input
 * (bun writes no outfile for an empty suite or an import crash) yields the
 * empty summary, which no gate treats as a violation.
 */
export function parseJUnitGateSummary(xml: string): JUnitGateSummary {
  const text = (xml ?? "").trim();
  if (text === "") return EMPTY_JUNIT_SUMMARY;
  const root = text.match(/<testsuites\b[^>]*>/);
  const skippedTests = extractSkippedTestNames(text);
  if (!root) {
    return {
      tests: (text.match(/<testcase\b/g) ?? []).length,
      assertions: null,
      skipped: skippedTests.length,
      skippedTests,
    };
  }
  return {
    tests: attrNumber(root[0], "tests") ?? 0,
    assertions: attrNumber(root[0], "assertions"),
    skipped: attrNumber(root[0], "skipped") ?? skippedTests.length,
    skippedTests,
  };
}

// ---------------------------------------------------------------------------
// Gate 1 — zero assertion.
// ---------------------------------------------------------------------------

/**
 * The opt-out marker for a file that proves something structurally without
 * evaluating an expect() (for example a file whose whole point is that an
 * import does not throw). The reason is mandatory: an unexplained marker is the
 * same silent success the gate exists to catch.
 */
const ASSERTION_FREE_RE = /^[ \t]*\/\/[ \t]*assertion-free:[ \t]*(\S.*?)[ \t]*$/m;

export function findAssertionFreeMarker(source: string): string | null {
  const m = source.match(ASSERTION_FREE_RE);
  return m ? (m[1] as string) : null;
}

export type ZeroAssertionVerdict =
  | { readonly kind: "ok" }
  | { readonly kind: "exempt"; readonly via: "marker" | "baseline"; readonly reason: string }
  | { readonly kind: "violation"; readonly executed: number };

export interface ZeroAssertionInput {
  /** Repo-relative path with forward slashes, e.g. `tests/unit/t1.test.ts`. */
  readonly file: string;
  readonly status: "PASS" | "FAIL" | "SKIP";
  readonly summary: JUnitGateSummary;
  /** File source for the marker scan; null when it could not be read. */
  readonly source: string | null;
  readonly baseline: SilentSuccessBaseline;
}

/**
 * A file is in violation when it PASSED, actually executed at least one
 * testcase, and evaluated zero assertions.
 *
 * Deliberately NOT violations:
 *   - `tests === 0` (the empty-suite case): bun writes no outfile at all, which
 *     is byte-identical to an import crash; the crash is already caught by
 *     buildMeta's rc path, and a genuinely empty suite is a different problem
 *     (a file that runs nothing) than a file that runs and proves nothing.
 *   - every testcase skipped (`tests - skipped === 0`): that is gate 2's
 *     subject, and failing it here too would double-report one condition.
 *   - `assertions === null`: a future bun that stops emitting the attribute
 *     must not turn the whole suite red on a parsing assumption.
 */
export function judgeZeroAssertion(input: ZeroAssertionInput): ZeroAssertionVerdict {
  const { summary } = input;
  if (input.status !== "PASS") return { kind: "ok" };
  if (summary.assertions === null || summary.assertions > 0) return { kind: "ok" };
  const executed = summary.tests - summary.skipped;
  if (summary.tests <= 0 || executed <= 0) return { kind: "ok" };

  const marker = input.source === null ? null : findAssertionFreeMarker(input.source);
  if (marker !== null) return { kind: "exempt", via: "marker", reason: marker };
  const entry = input.baseline.zeroAssertion.find((e) => e.file === input.file);
  if (entry !== undefined) {
    return { kind: "exempt", via: "baseline", reason: `${entry.reason} (${entry.issue})` };
  }
  return { kind: "violation", executed };
}

export function renderZeroAssertionViolation(file: string, executed: number): string[] {
  return [
    `GATE zero-assertion: ${file} ran ${executed} testcase(s) and evaluated 0 assertions`,
    "  A file that executes without asserting cannot fail, so its PASS proves nothing.",
    "  Fix: assert something. If the file is intentionally assertion-free (a structural",
    "  import/shape guard), add a `// assertion-free: <reason>` comment to it. Existing",
    `  debt goes in tests/${BASELINE_BASENAME} under "zeroAssertion" with an issue link.`,
  ];
}

// ---------------------------------------------------------------------------
// Gate 2 — chronic self-SKIP.
//
// Scope: JUnit-level `<skipped />` testcases only, i.e. a skip the FILE decided
// on. The runner's own STATUS=SKIP files (the Claude substrate gate) are not
// covered — that is the runner announcing a visible decision on stdout, not a
// test quietly declining to run.
// ---------------------------------------------------------------------------

export interface SkipObservation {
  readonly file: string;
  readonly test: string;
  readonly count: number;
}

export type SkipVerdict =
  | { readonly kind: "registered"; readonly entry: SkipLedgerEntry; readonly ageDays: number | null }
  | { readonly kind: "expired"; readonly entry: SkipLedgerEntry; readonly ageDays: number | null }
  | { readonly kind: "unregistered" };

/** Today in UTC as `YYYY-MM-DD` — the ledger's comparison unit. */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`, or null when either date is unparseable. */
export function daysBetween(from: string, to: string): number | null {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/**
 * The entry that governs one observed skip. A named entry wins over the file's
 * `"*"` entry regardless of document order, so a broad wildcard cannot mask (or
 * expire) a case that carries its own reason and its own date.
 */
function findSkipEntry(
  baseline: SilentSuccessBaseline,
  file: string,
  test: string,
): SkipLedgerEntry | undefined {
  const forFile = baseline.skips.filter((e) => e.file === file);
  return forFile.find((e) => e.test === test) ?? forFile.find((e) => e.test === "*");
}

export function judgeSkip(
  file: string,
  test: string,
  baseline: SilentSuccessBaseline,
  today: string,
): SkipVerdict {
  const entry = findSkipEntry(baseline, file, test);
  if (entry === undefined) return { kind: "unregistered" };
  const ageDays = daysBetween(entry.firstObserved, today);
  // String comparison is exact for zero-padded ISO dates.
  if (entry.expires < today) return { kind: "expired", entry, ageDays };
  return { kind: "registered", entry, ageDays };
}

export function renderSkipViolation(file: string, offenders: readonly string[]): string[] {
  return [
    `GATE skip: ${file} self-skipped ${offenders.length} testcase(s) with no valid ledger entry`,
    ...offenders.map((line) => `  ${line}`),
    `  A skip is a time-boxed exemption, not a permanent one. Register each one in`,
    `  tests/${BASELINE_BASENAME} under "skips" with a reason, an issue, firstObserved,`,
    "  and an expires date — or renew an expired entry consciously after re-checking",
    "  whether the condition that justified the skip still holds.",
  ];
}

/**
 * The run-wide census: the CI-visible counter evidence that a skip is being
 * carried, how long it has been carried, and when its exemption runs out.
 * Printed in every mode, including `report`.
 */
export function renderSkipCensus(
  observations: readonly SkipObservation[],
  baseline: SilentSuccessBaseline,
  today: string,
): string[] {
  if (observations.length === 0) return ["self-skipped tests: none observed this run"];
  const lines = [`self-skipped tests: ${observations.length} distinct case(s) this run`];
  const sorted = [...observations].sort(
    (a, b) => a.file.localeCompare(b.file) || a.test.localeCompare(b.test),
  );
  for (const obs of sorted) {
    const verdict = judgeSkip(obs.file, obs.test, baseline, today);
    const suffix =
      verdict.kind === "unregistered"
        ? "UNREGISTERED"
        : `${verdict.kind === "expired" ? "EXPIRED" : "registered"} age=${verdict.ageDays ?? "?"}d expires=${verdict.entry.expires}`;
    lines.push(`  ${obs.file} :: ${obs.test} (x${obs.count}) — ${suffix}`);
  }
  return lines;
}

/** Fold one file's skipped testcase names into the run-wide census map. */
export function recordSkips(
  census: Map<string, SkipObservation>,
  file: string,
  skippedTests: readonly string[],
): void {
  for (const test of skippedTests) {
    const key = `${file}\0${test}`;
    const previous = census.get(key);
    census.set(key, { file, test, count: (previous?.count ?? 0) + 1 });
  }
}

// ---------------------------------------------------------------------------
// Gate 3 — process leak.
// ---------------------------------------------------------------------------

export interface MarkedProcess {
  readonly pid: number;
  readonly command: string;
}

/** The exact environment entry a test child carries, e.g. `AMADEUS_TEST_NAME=t33.test.ts`. */
export function leakMarker(testFileBasename: string): string {
  return `AMADEUS_TEST_NAME=${testFileBasename}`;
}

/**
 * Linux: `/proc/<pid>/environ` is NUL-separated `KEY=VALUE` entries, so the
 * match is EXACT — no substring ambiguity is possible.
 */
export function environBufferHasMarker(environ: string, marker: string): boolean {
  return environ.split("\0").some((entry) => entry === marker);
}

// macOS `ps xeww -o pid=,command=` prints `<pid> <argv...> <KEY=VALUE...>` on
// one line per process (`x` selects this user's processes, `e` appends the
// environment, `ww` disables column truncation). Entries are space-separated,
// so the marker must be followed by whitespace or end-of-line; a bare substring
// test would also match a longer basename that merely starts with this one.
const PS_LINE_RE = /^\s*(\d+)\s+(.*)$/;

export function parsePsProcessLines(
  output: string,
  marker: string,
  excludePids: ReadonlySet<number>,
): MarkedProcess[] {
  const found: MarkedProcess[] = [];
  for (const line of output.split(/\r?\n/)) {
    const m = line.match(PS_LINE_RE);
    if (!m) continue;
    const pid = Number(m[1]);
    if (!Number.isFinite(pid) || excludePids.has(pid)) continue;
    const rest = m[2] as string;
    const at = rest.indexOf(marker);
    if (at < 0) continue;
    const after = rest.charAt(at + marker.length);
    if (after !== "" && !/\s/.test(after)) continue;
    // The command is everything before the environment block; keeping the head
    // of the line is enough to identify the offender without dumping the whole
    // inherited environment into CI output.
    found.push({ pid, command: rest.slice(0, 120).trimEnd() });
  }
  return found;
}

export interface ProcessScanIo {
  readonly platform: string;
  readonly selfPid: number;
  /** Directory listing for `/proc` (Linux). */
  readonly listProc: () => string[];
  /** `/proc/<pid>/environ` contents, or null when the read raced/was denied. */
  readonly readEnviron: (pid: number) => string | null;
  /** `/proc/<pid>/cmdline` contents (NUL-separated), or null. */
  readonly readCmdline: (pid: number) => string | null;
  /** `ps xeww -o pid=,command=` output (darwin), or null when it failed. */
  readonly runPs: () => string | null;
}

/**
 * Find same-user processes still carrying `marker` in their environment.
 * win32 has no equivalent cheap read, so it reports nothing rather than
 * guessing — the gate is report-only there by mode resolution anyway.
 */
function scanProcFs(marker: string, io: ProcessScanIo): MarkedProcess[] {
  const found: MarkedProcess[] = [];
  for (const entry of io.listProc()) {
    const pid = Number(entry);
    if (!Number.isInteger(pid) || pid <= 0 || pid === io.selfPid) continue;
    const environ = io.readEnviron(pid);
    // A null read is a dead pid or another user's process, never a leak we own.
    if (environ === null || !environBufferHasMarker(environ, marker)) continue;
    const cmdline = (io.readCmdline(pid) ?? "").split("\0").filter(Boolean).join(" ");
    found.push({ pid, command: cmdline.slice(0, 120) || `pid ${pid}` });
  }
  return found;
}

export function scanForMarkedProcesses(marker: string, io: ProcessScanIo): MarkedProcess[] {
  if (io.platform === "linux") return scanProcFs(marker, io);
  if (io.platform !== "darwin") return [];
  const output = io.runPs();
  return output === null ? [] : parsePsProcessLines(output, marker, new Set([io.selfPid]));
}

export interface LeakDetectOptions {
  readonly scan: () => MarkedProcess[];
  readonly sleep: (ms: number) => Promise<void>;
  readonly now: () => number;
  readonly graceMs: number;
  readonly pollMs: number;
}

export const LEAK_GRACE_MS = 2000;
export const LEAK_POLL_MS = 100;

/**
 * Detect processes that OUTLIVE their test file. The first scan finding nothing
 * ends the check immediately, so a well-behaved file pays one scan and no
 * waiting. Only when something is still marked do we poll the grace window —
 * a child that is merely slow to be reaped by the OS clears within it, and
 * whatever still carries the marker afterwards is a genuine leak.
 */
export async function detectLeakedProcesses(options: LeakDetectOptions): Promise<MarkedProcess[]> {
  let found = options.scan();
  if (found.length === 0) return [];
  const deadline = options.now() + options.graceMs;
  while (options.now() < deadline) {
    await options.sleep(options.pollMs);
    found = options.scan();
    if (found.length === 0) return [];
  }
  return found;
}

/**
 * Reap the leftovers. This runs in EVERY mode, report included: the file that
 * owned these processes has finished, so nothing is still using them, and
 * leaving them behind is how a long suite run accumulates orphans (#1811).
 * The runner's own pid is never a target.
 */
export function reapProcesses(
  processes: readonly MarkedProcess[],
  selfPid: number,
  kill: (pid: number) => void,
): number {
  let reaped = 0;
  for (const proc of processes) {
    if (proc.pid === selfPid || proc.pid <= 0) continue;
    try {
      kill(proc.pid);
      reaped += 1;
    } catch {
      // Already gone, or not ours to kill — either way there is nothing to do.
    }
  }
  return reaped;
}

export function isLeakBaselined(file: string, baseline: SilentSuccessBaseline): LeakEntry | undefined {
  return baseline.leaks.find((e) => e.file === file);
}

export function renderLeakLines(
  file: string,
  processes: readonly MarkedProcess[],
  reaped: number,
  failing: boolean,
): string[] {
  const lines = [
    `GATE process-leak: ${file} left ${processes.length} process(es) running after the test file exited`,
  ];
  for (const proc of processes) lines.push(`  pid ${proc.pid}: ${proc.command}`);
  lines.push(`  reaped ${reaped} of ${processes.length} (SIGKILL)`);
  if (failing) {
    lines.push(
      "  A test must not outlive itself. Kill or await every child it spawns (or use an",
      `  AbortSignal). Existing debt goes in tests/${BASELINE_BASENAME} under "leaks".`,
    );
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Default (real) process-scan I/O. Kept at the bottom so the pure core above
// stays readable and importable without node:child_process side effects.
// ---------------------------------------------------------------------------

export function defaultProcessScanIo(
  runPs: () => string | null,
  platform: string = process.platform,
  selfPid: number = process.pid,
): ProcessScanIo {
  const readProcFile = (pid: number, name: string): string | null => {
    try {
      return readFileSync(`/proc/${pid}/${name}`, "latin1");
    } catch {
      return null;
    }
  };
  return {
    platform,
    selfPid,
    listProc: () => {
      try {
        return readdirSync("/proc");
      } catch {
        return [];
      }
    },
    readEnviron: (pid) => readProcFile(pid, "environ"),
    readCmdline: (pid) => readProcFile(pid, "cmdline"),
    runPs,
  };
}
