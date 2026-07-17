// Read-only timeseries viewer over the metrics/ snapshots that
// scripts/metrics-snapshot.ts accumulates on every main merge (Issue #921).
// Prints per-collector timelines as plain-text tables. Never writes: this
// module must not import any fs write API (AC-1c; grep-checkable).
//
// Env seam (shared with the writer): AMADEUS_METRICS_ROOT overrides the
// repository root; the metrics/ subdirectory is always appended, matching
// defaultEnv + writeSnapshotAtomic in scripts/metrics-snapshot.ts.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPTS_DIR, "..");

// Validated snapshot. The type claims only what parseSnapshot actually
// verifies (AC-1a): values entries stay unknown because per-value number-ness
// is not validated — renderers must branch on typeof (parse, don't validate).
export type CollectorEntry = {
  tool: string;
  tool_version: string;
  values: Record<string, unknown>;
};
export type Snapshot = {
  schema_version: 1;
  captured_at: string;
  commit: string;
  collectors: Record<string, CollectorEntry>;
};

export type ParseOutcome =
  | { kind: "ok"; snapshot: Snapshot }
  | { kind: "error"; file: string; reason: string };

export type NonEmpty = { kind: "ok" } | { kind: "empty" };

export type CollectorResolution =
  | { kind: "ok"; id: string }
  | { kind: "unknown"; known: string[] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// AC-1a: fail-closed parse. Any structural defect — malformed JSON, wrong
// schema_version, missing top-level keys, or a collector entry without
// tool/tool_version/values(object) — is a loud error naming the file (and
// collector); partially broken snapshots never reach aggregation.
export function parseSnapshot(text: string, file: string): ParseOutcome {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { kind: "error", file, reason: `malformed JSON (${e instanceof Error ? e.message : String(e)})` };
  }
  if (!isRecord(raw)) return { kind: "error", file, reason: "top level is not an object" };
  if (raw.schema_version !== 1) {
    return { kind: "error", file, reason: `schema_version ${JSON.stringify(raw.schema_version)} is not supported (expected 1)` };
  }
  if (typeof raw.captured_at !== "string") return { kind: "error", file, reason: "captured_at is not a string" };
  if (typeof raw.commit !== "string") return { kind: "error", file, reason: "commit is not a string" };
  if (!isRecord(raw.collectors)) return { kind: "error", file, reason: "collectors is not an object" };
  const collectors: Record<string, CollectorEntry> = {};
  for (const [id, entry] of Object.entries(raw.collectors)) {
    if (!isRecord(entry)) return { kind: "error", file, reason: `collector ${id}: entry is not an object` };
    if (typeof entry.tool !== "string") return { kind: "error", file, reason: `collector ${id}: tool is not a string` };
    if (typeof entry.tool_version !== "string") {
      return { kind: "error", file, reason: `collector ${id}: tool_version is not a string` };
    }
    if (!isRecord(entry.values)) return { kind: "error", file, reason: `collector ${id}: values is not an object` };
    collectors[id] = { tool: entry.tool, tool_version: entry.tool_version, values: entry.values };
  }
  return {
    kind: "ok",
    snapshot: { schema_version: 1, captured_at: raw.captured_at, commit: raw.commit, collectors },
  };
}

// AC-1b: an empty snapshot set must not become an empty success.
export function assertNonEmpty(files: string[]): NonEmpty {
  return files.length === 0 ? { kind: "empty" } : { kind: "ok" };
}

// AC-2a: captured_at is the sort authority (file names are derived values);
// commit breaks ties for a stable order.
export function buildSeries(snapshots: Snapshot[]): Snapshot[] {
  return [...snapshots].sort(
    (a, b) => a.captured_at.localeCompare(b.captured_at) || a.commit.localeCompare(b.commit),
  );
}

// FR-3: collectors are discovered from the data, never hardcoded. Works on
// sorted or unsorted input (pure key union).
export function discoverCollectors(series: Snapshot[]): string[] {
  const ids = new Set<string>();
  for (const s of series) for (const id of Object.keys(s.collectors)) ids.add(id);
  return [...ids].sort();
}

// AC-3c: the key set is the union across all snapshots — test_pyramid keys
// come and go per commit, so no single snapshot's keys are authoritative.
export function unionValueKeys(series: Snapshot[], collector: string): string[] {
  const keys = new Set<string>();
  for (const s of series) {
    const entry = s.collectors[collector];
    if (entry) for (const k of Object.keys(entry.values)) keys.add(k);
  }
  return [...keys].sort();
}

// AC-3d: an unknown collector id fails usage-style with the known ids listed.
export function resolveCollector(arg: string, known: string[]): CollectorResolution {
  return known.includes(arg) ? { kind: "ok", id: arg } : { kind: "unknown", known };
}

function formatValue(v: unknown): string {
  return typeof v === "number" ? String(v) : v === undefined ? "" : "?";
}

function renderTable(rows: string[][]): string {
  const widths: number[] = [];
  for (const row of rows) row.forEach((cell, i) => { widths[i] = Math.max(widths[i] ?? 0, cell.length); });
  return rows
    .map((row) => row.map((cell, i) => (i === row.length - 1 ? cell : cell.padEnd(widths[i]))).join("  ").trimEnd())
    .join("\n");
}

// AC-3a: default digest — one row per discovered collector with series length
// and the latest snapshot's values.
export function renderDigest(series: Snapshot[]): string {
  const first = series[0];
  const last = series[series.length - 1];
  const header = `Metrics timeseries: ${series.length} snapshots (${first.captured_at} .. ${last.captured_at})`;
  const rows: string[][] = [["collector", "series", "latest"]];
  for (const id of discoverCollectors(series)) {
    const present = series.filter((s) => s.collectors[id] !== undefined);
    const latest = present[present.length - 1];
    const values = latest
      ? Object.entries(latest.collectors[id].values)
          .map(([k, v]) => `${k}=${formatValue(v) || "?"}`)
          .join(" ")
      : "";
    rows.push([id, String(present.length), values]);
  }
  return `${header}\n${renderTable(rows)}`;
}

// AC-3b: one row per snapshot, one column per union key; absent cells stay
// blank (AC-3c), non-number values render as "?" (loud, non-fatal).
export function renderCollectorTable(series: Snapshot[], collector: string): string {
  const keys = unionValueKeys(series, collector);
  const present = series.filter((s) => s.collectors[collector] !== undefined);
  const latestEntry = present[present.length - 1]?.collectors[collector];
  const header = `${collector} (tool: ${latestEntry?.tool ?? "?"}) - ${present.length} snapshots`;
  const rows: string[][] = [["captured_at", "commit", ...keys]];
  for (const s of present) {
    const values = s.collectors[collector].values;
    rows.push([s.captured_at, s.commit.slice(0, 12), ...keys.map((k) => formatValue(values[k]))]);
  }
  return `${header}\n${renderTable(rows)}`;
}

const USAGE = "Usage: bun scripts/metrics-timeseries.ts [--collector <id>] [--last <n>]";

type CliArgs = { collector: string | null; last: number | null };
type ArgsOutcome = { kind: "ok"; args: CliArgs } | { kind: "usage"; reason: string };

// AC-4b: --last must parse as a positive integer (parse, don't validate — a
// non-numeric value must not silently compare false and pass through).
export function parseArgs(argv: string[]): ArgsOutcome {
  const args: CliArgs = { collector: null, last: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--collector" && i + 1 < argv.length) {
      args.collector = argv[++i];
    } else if (a === "--last" && i + 1 < argv.length) {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n <= 0) return { kind: "usage", reason: `--last expects a positive integer, got "${argv[i]}"` };
      args.last = n;
    } else {
      return { kind: "usage", reason: `unknown argument "${a}"` };
    }
  }
  return { kind: "ok", args };
}

export function main(argv: string[]): number {
  const parsed = parseArgs(argv);
  if (parsed.kind === "usage") {
    console.error(parsed.reason);
    console.error(USAGE);
    return 2;
  }
  const root = process.env.AMADEUS_METRICS_ROOT ?? ROOT;
  const dir = join(root, "metrics");
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  } catch (e) {
    console.error(`cannot read ${dir}: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
  if (assertNonEmpty(files).kind === "empty") {
    console.error(`no snapshots found in ${dir} (0 files)`);
    return 1;
  }
  const outcomes = files.map((f) => {
    try {
      return parseSnapshot(readFileSync(join(dir, f), "utf-8"), f);
    } catch (e) {
      return { kind: "error", file: f, reason: e instanceof Error ? e.message : String(e) } as const;
    }
  });
  const errors = outcomes.filter((o): o is Extract<ParseOutcome, { kind: "error" }> => o.kind === "error");
  if (errors.length > 0) {
    for (const err of errors) console.error(`${err.file}: ${err.reason}`);
    return 1;
  }
  let series = buildSeries(outcomes.map((o) => (o as Extract<ParseOutcome, { kind: "ok" }>).snapshot));
  if (parsed.args.last !== null) series = series.slice(-parsed.args.last);
  if (parsed.args.collector !== null) {
    const resolution = resolveCollector(parsed.args.collector, discoverCollectors(series));
    if (resolution.kind === "unknown") {
      console.error(`unknown collector "${parsed.args.collector}" (known: ${resolution.known.join(", ")})`);
      console.error(USAGE);
      return 2;
    }
    console.log(renderCollectorTable(series, resolution.id));
    return 0;
  }
  console.log(renderDigest(series));
  return 0;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
