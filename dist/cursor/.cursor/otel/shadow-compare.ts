// shadow-compare.ts — the shadow-comparison harness (FR-MIG-2, VER-5 input).
//
// U7 productionises the U1 walking-skeleton prototype (business-logic-model.md
// § shadow 比較ハーネス — the harness is grown from that prototype, never
// rebuilt from scratch). It correlates the OLD telemetry path (buffer events
// written by appendTelemetryEvent) with the NEW OTel path (completed-span
// records) over the four BR-10 dimensions — event count, linkage, status and
// allowed attributes — and lists every unexplained difference. Phase 4's
// deletion-gate input FR-MIG-4(d) stays unsatisfied while that list is
// non-empty; the gate VERDICT belongs to U8, not here.
//
// Two production properties the prototype lacked:
//   - a harness failure (store absent, torn lines) surfaces as COMPARISON NOT
//     PERFORMED, never as silent equivalence — an unread store must not read
//     as "the two paths agree" (reliability-design.md § 移行正しさの検証設計);
//   - comparisons lean to OVER-detection: a difference we cannot explain is
//     reported rather than absorbed (reliability-design.md § canonical 経路の
//     単一性設計 — false positives get fixed, false negatives are not
//     tolerated).

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { telemetryDir } from "../tools/amadeus-observability.ts";

// One store's read outcome. `present: false` is the harness-failure signal the
// dimensions turn into COMPARISON NOT PERFORMED.
export type StoreCensus = {
  readonly present: boolean;
  readonly files: number;
  readonly records: number;
  readonly tornLines: number;
};

// A dimension's outcome. The arms are deliberately disjoint: a comparison that
// did not run carries no `equivalent` field at all, so no consumer can read an
// unperformed comparison as agreement.
export type ComparisonVerdict =
  | { readonly performed: true; readonly equivalent: boolean; readonly detail: string }
  | { readonly performed: false; readonly reason: string };

// The machine-readable report (domain-entities.md § ShadowComparisonReport).
export type ShadowComparisonReport = {
  readonly generatedAt: string;
  readonly oldPath: StoreCensus;
  readonly newPath: StoreCensus;
  readonly eventCount: ComparisonVerdict;
  readonly linkage: ComparisonVerdict;
  readonly status: ComparisonVerdict;
  readonly allowedAttributes: ComparisonVerdict;
  readonly unexplainedDiffs: readonly string[];
};

// --- store reading ----------------------------------------------------------

type StoreRecord = Record<string, unknown>;
type Grouped = Map<string, StoreRecord[]>;

type StoreRead = {
  readonly census: StoreCensus;
  readonly records: readonly StoreRecord[];
};

const EMPTY_READ: StoreRead = {
  census: { present: false, files: 0, records: 0, tornLines: 0 },
  records: [],
};

function parseLine(line: string): StoreRecord | "torn" | "blank" {
  if (line.trim() === "") return "blank";
  try {
    const parsed: unknown = JSON.parse(line);
    if (parsed === null || typeof parsed !== "object") return "torn";
    return parsed as StoreRecord;
  } catch {
    return "torn";
  }
}

function readStore(dir: string | null, prefix: string): StoreRead {
  if (dir === null || !existsSync(dir)) return EMPTY_READ;
  const files = readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(".jsonl"));
  const records: StoreRecord[] = [];
  let torn = 0;
  for (const file of files) {
    for (const line of readFileSync(join(dir, file), "utf-8").split("\n")) {
      const parsed = parseLine(line);
      if (parsed === "torn") torn += 1;
      else if (parsed !== "blank") records.push(parsed);
    }
  }
  return {
    census: { present: files.length > 0, files: files.length, records: records.length, tornLines: torn },
    records,
  };
}

function operationName(record: StoreRecord): string {
  return typeof record.name === "string" ? record.name : "(unnamed)";
}

function groupByOperation(records: readonly StoreRecord[]): Grouped {
  const grouped: Grouped = new Map();
  for (const record of records) {
    const name = operationName(record);
    const bucket = grouped.get(name);
    if (bucket === undefined) grouped.set(name, [record]);
    else bucket.push(record);
  }
  return grouped;
}

function operationNames(old: Grouped, next: Grouped): string[] {
  return [...new Set([...old.keys(), ...next.keys()])].sort();
}

function countFor(grouped: Grouped, name: string): number {
  return grouped.get(name)?.length ?? 0;
}

// --- the four BR-10 dimensions ----------------------------------------------
//
// Every dimension collects its findings into its OWN list, returns a verdict
// derived from that list, and the caller appends the list to the report's
// unexplainedDiffs. The verdict is therefore always computed from the findings
// actually produced — never asserted independently of them.

function verdictFrom(findings: readonly string[], detail: string): ComparisonVerdict {
  return { performed: true, equivalent: findings.length === 0, detail };
}

// Event count, per operation and in total. BOTH directions are reported: an
// operation the new path never produced is data loss, and one the old path
// never produced is unexplained until someone explains it.
function compareEventCount(old: Grouped, next: Grouped, findings: string[]): ComparisonVerdict {
  let oldTotal = 0;
  let newTotal = 0;
  const names = operationNames(old, next);
  for (const name of names) {
    const oldCount = countFor(old, name);
    const newCount = countFor(next, name);
    oldTotal += oldCount;
    newTotal += newCount;
    if (oldCount !== newCount) {
      findings.push(`eventCount: operation ${name} — old ${oldCount} / new ${newCount}`);
    }
  }
  return verdictFrom(findings, `old ${oldTotal} / new ${newTotal} across ${names.length} operation(s)`);
}

const TRACE_ID_RE = /^[0-9a-f]{32}$/;
const SPAN_ID_RE = /^[0-9a-f]{16}$/;

function hasWellFormedLinkage(record: StoreRecord): boolean {
  const traceId = record.traceId;
  const spanId = record.spanId;
  if (typeof traceId !== "string" || typeof spanId !== "string") return false;
  return TRACE_ID_RE.test(traceId) && SPAN_ID_RE.test(spanId);
}

// Linkage exists only on the new path — that asymmetry is the POINT of the
// migration, not a difference. What is checked is that every new-path record
// actually carries a well-formed trace/span id, so "migrated" can never mean
// "migrated without correlation".
function compareLinkage(next: Grouped, findings: string[]): ComparisonVerdict {
  let linked = 0;
  let total = 0;
  for (const name of [...next.keys()].sort()) {
    for (const record of next.get(name) ?? []) {
      total += 1;
      if (hasWellFormedLinkage(record)) linked += 1;
      else findings.push(`linkage: operation ${name} — new-path record without a well-formed trace/span id`);
    }
  }
  return verdictFrom(
    findings,
    `new-path linkage present on ${linked}/${total} record(s); the old path carries none by construction`
  );
}

function oldFailureCount(records: readonly StoreRecord[]): number {
  return records.filter((r) => r.ok === false).length;
}

function isErrorStatus(record: StoreRecord): boolean {
  const status = record.status;
  if (status === null || typeof status !== "object") return false;
  return (status as { code?: unknown }).code === "ERROR";
}

// Status equivalence: the old path's `ok: false` and the new path's
// status.code === "ERROR" must agree in count per operation. UNSET and OK are
// both non-error on the new side (OTel semantics).
function compareStatus(old: Grouped, next: Grouped, findings: string[]): ComparisonVerdict {
  let oldFailures = 0;
  let newErrors = 0;
  for (const name of operationNames(old, next)) {
    const oldFail = oldFailureCount(old.get(name) ?? []);
    const newErr = (next.get(name) ?? []).filter(isErrorStatus).length;
    oldFailures += oldFail;
    newErrors += newErr;
    if (oldFail !== newErr) {
      findings.push(`status: operation ${name} — old failures ${oldFail} / new ERROR ${newErr}`);
    }
  }
  return verdictFrom(findings, `old failures ${oldFailures} / new ERROR ${newErrors}`);
}

function keysOfBag(records: readonly StoreRecord[], field: "meta" | "attributes"): Set<string> {
  const keys = new Set<string>();
  for (const record of records) {
    const bag = record[field];
    if (bag === null || typeof bag !== "object") continue;
    for (const key of Object.keys(bag)) keys.add(key);
  }
  return keys;
}

// Allowed attributes: every key the old path was permitted to carry must still
// be reachable on the new path ("同等以上" — a superset is fine, a loss is
// not). Redaction has already filtered both sides, so a key missing here is a
// migration loss and not a policy difference.
function compareAllowedAttributes(old: Grouped, next: Grouped, findings: string[]): ComparisonVerdict {
  let checked = 0;
  for (const name of operationNames(old, next)) {
    const oldKeys = keysOfBag(old.get(name) ?? [], "meta");
    const newKeys = keysOfBag(next.get(name) ?? [], "attributes");
    checked += oldKeys.size;
    for (const key of [...oldKeys].sort()) {
      if (!newKeys.has(key)) {
        findings.push(`allowedAttributes: operation ${name} — old key ${key} absent on the new path`);
      }
    }
  }
  return verdictFrom(findings, `${checked} old allowed-attribute key(s) checked for new-path presence`);
}

// --- report assembly --------------------------------------------------------

const DIMENSIONS = ["eventCount", "linkage", "status", "allowedAttributes"] as const;

// A store we could not read yields the SAME unperformed verdict on all four
// dimensions, plus one diff line each so the blockage is visible in the diff
// list a gate reads (BR-10) and not only in the per-dimension arm.
function notPerformed(reason: string, diffs: string[]): ComparisonVerdict {
  for (const dimension of DIMENSIONS) {
    diffs.push(`${dimension}: comparison not performed — ${reason}`);
  }
  return { performed: false, reason };
}

function absentStoreReason(oldRead: StoreRead, newRead: StoreRead): string | null {
  if (!oldRead.census.present && !newRead.census.present) return "neither telemetry store is present";
  if (!oldRead.census.present) return "the old-path telemetry store is absent";
  if (!newRead.census.present) return "the new-path span store is absent";
  return null;
}

// A torn line is not fatal to the comparison (the prototype's rule) but it IS
// unexplained: the records it would have contributed are unknown.
function collectTornDiffs(oldRead: StoreRead, newRead: StoreRead, diffs: string[]): void {
  if (oldRead.census.tornLines > 0) {
    diffs.push(`oldPath: ${oldRead.census.tornLines} torn store line(s) could not be parsed`);
  }
  if (newRead.census.tornLines > 0) {
    diffs.push(`newPath: ${newRead.census.tornLines} torn store line(s) could not be parsed`);
  }
}

export function buildShadowComparisonReport(projectDir: string): ShadowComparisonReport {
  const dir = telemetryDir(projectDir);
  const oldRead = readStore(dir, "buffer-");
  const newRead = readStore(dir, "spans-");
  const diffs: string[] = [];
  collectTornDiffs(oldRead, newRead, diffs);
  const census = { generatedAt: new Date().toISOString(), oldPath: oldRead.census, newPath: newRead.census };
  const blocked = absentStoreReason(oldRead, newRead);
  if (blocked !== null) {
    const unperformed = notPerformed(blocked, diffs);
    return {
      ...census,
      eventCount: unperformed,
      linkage: unperformed,
      status: unperformed,
      allowedAttributes: unperformed,
      unexplainedDiffs: diffs,
    };
  }
  const old = groupByOperation(oldRead.records);
  const next = groupByOperation(newRead.records);
  const countFindings: string[] = [];
  const linkageFindings: string[] = [];
  const statusFindings: string[] = [];
  const attributeFindings: string[] = [];
  const report = {
    ...census,
    eventCount: compareEventCount(old, next, countFindings),
    linkage: compareLinkage(next, linkageFindings),
    status: compareStatus(old, next, statusFindings),
    allowedAttributes: compareAllowedAttributes(old, next, attributeFindings),
  };
  diffs.push(...countFindings, ...linkageFindings, ...statusFindings, ...attributeFindings);
  return { ...report, unexplainedDiffs: diffs };
}

// Persist the report next to the stores it compares; returns the path.
export function writeShadowComparisonReport(projectDir: string, report: ShadowComparisonReport): string {
  const dir = telemetryDir(projectDir);
  if (dir === null) {
    throw new Error("no resolvable intent record for the shadow report");
  }
  const path = join(dir, "shadow-report.json");
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
  return path;
}
