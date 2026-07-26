// Self-contained HTML dashboard over the metrics/ snapshots that
// scripts/metrics-snapshot.ts accumulates on every main merge (Issue #921,
// backlog B1). Reads through the shared validated reader seam in
// scripts/metrics-timeseries.ts (writer/reader/pruner/renderer agree on what a
// valid snapshot is — no private parser) and owns its single fs write, so the
// reader module keeps its no-fs-write contract (AC-1c) intact.
//
// Determinism contract: the same snapshot set renders to the same byte
// sequence — no wall clock, randomness, or environment values are embedded.
// This is what makes the U2 `--check` byte comparison meaningful.
//
// Env seam (shared with the writer/reader/pruner): AMADEUS_METRICS_ROOT
// overrides the repository root; the metrics/ subdirectory is always appended.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type ParseOutcome,
  type Snapshot,
  assertNonEmpty,
  buildSeries,
  discoverCollectors,
  formatValue,
  numericValue,
  parseSnapshot,
  unionValueKeys,
} from "./metrics-timeseries";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPTS_DIR, "..");

const CHART_WIDTH = 720;
const CHART_HEIGHT = 120;
const CHART_PAD = 8;

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Chart x/y for point i of n within the fixed viewBox, on a per-key linear
// scale. A degenerate flat series (min === max) renders as a centered line.
function chartX(i: number, n: number, w: number): number {
  return n === 1 ? w / 2 : CHART_PAD + (i * (w - 2 * CHART_PAD)) / (n - 1);
}

function chartY(v: number, min: number, max: number, h: number): number {
  if (min === max) return h / 2;
  return h - CHART_PAD - ((v - min) * (h - 2 * CHART_PAD)) / (max - min);
}

// Per-key value range for the linear y scale; null when no numeric point
// exists. Shared by the path and its data-point circles so both stay aligned.
function valueRange(points: Array<number | null>): { min: number; max: number } | null {
  const numbers = points.filter((p): p is number => p !== null);
  if (numbers.length === 0) return null;
  return { min: Math.min(...numbers), max: Math.max(...numbers) };
}

// Polyline path over the points within a w×h viewBox; null is a gap that
// breaks the line into segments (a new M command) rather than interpolating
// across missing data. The per-key min/max scale is derived from the points.
export function svgLinePath(points: Array<number | null>, w: number, h: number): string {
  const range = valueRange(points);
  if (range === null) return "";
  const parts: string[] = [];
  let penDown = false;
  points.forEach((p, i) => {
    if (p === null) {
      penDown = false;
      return;
    }
    const x = chartX(i, points.length, w).toFixed(1);
    const y = chartY(p, range.min, range.max, h).toFixed(1);
    parts.push(`${penDown ? "L" : "M"}${x} ${y}`);
    penDown = true;
  });
  return parts.join(" ");
}

function renderKeyChart(series: Snapshot[], collector: string, key: string): string {
  const points = series.map((s) => numericValue(s.collectors[collector]?.values[key]));
  const range = valueRange(points);
  if (range === null) {
    return `<div class="chart"><h3>${escapeHtml(key)}</h3><p class="empty">データなし(数値がありません)</p></div>`;
  }
  const circles = points
    .map((p, i) => {
      if (p === null) return "";
      const s = series[i];
      const title = `${s.captured_at} / ${s.commit.slice(0, 12)} — ${key}=${formatValue(p)}`;
      return `<circle cx="${chartX(i, points.length, CHART_WIDTH).toFixed(1)}" cy="${chartY(p, range.min, range.max, CHART_HEIGHT).toFixed(1)}" r="2.5"><title>${escapeHtml(title)}</title></circle>`;
    })
    .join("");
  return [
    `<div class="chart"><h3>${escapeHtml(key)} <span class="range">min ${formatValue(range.min)} / max ${formatValue(range.max)}</span></h3>`,
    `<svg viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" width="${CHART_WIDTH}" height="${CHART_HEIGHT}" role="img">`,
    `<path d="${svgLinePath(points, CHART_WIDTH, CHART_HEIGHT)}" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
    circles,
    "</svg></div>",
  ].join("");
}

function renderValueTable(series: Snapshot[], collector: string, keys: string[]): string {
  const head = ["captured_at", "commit", ...keys].map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = series
    .filter((s) => s.collectors[collector] !== undefined)
    .map((s) => {
      const values = s.collectors[collector].values;
      const cells = keys.map((k) => `<td>${escapeHtml(formatValue(values[k]))}</td>`).join("");
      return `<tr><td>${escapeHtml(s.captured_at)}</td><td>${escapeHtml(s.commit.slice(0, 12))}</td>${cells}</tr>`;
    })
    .join("");
  return `<details><summary>値表</summary><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></details>`;
}

export function renderCollectorSection(series: Snapshot[], collector: string): string {
  const keys = unionValueKeys(series, collector);
  const latest = series.filter((s) => s.collectors[collector] !== undefined).at(-1);
  const tool = latest ? `${latest.collectors[collector].tool} ${latest.collectors[collector].tool_version}` : "?";
  return [
    `<section class="collector"><h2>${escapeHtml(collector)} <span class="tool">${escapeHtml(tool)}</span></h2>`,
    keys.map((k) => renderKeyChart(series, collector, k)).join(""),
    renderValueTable(series, collector, keys),
    "</section>",
  ].join("");
}

const STYLE = [
  "body{font-family:system-ui,sans-serif;margin:1.5rem auto;max-width:800px;color:#222;background:#fff}",
  "h1{font-size:1.4rem}h2{font-size:1.1rem;border-bottom:1px solid #ddd;padding-bottom:.2rem;margin-top:2rem}",
  "h3{font-size:.9rem;margin:.8rem 0 .2rem}",
  ".tool,.range{font-weight:normal;font-size:.75rem;color:#888}",
  ".meta{color:#555;font-size:.85rem}",
  "svg{display:block;background:#fafafa;border:1px solid #eee}",
  ".empty{color:#999;font-size:.8rem}",
  "table{border-collapse:collapse;font-size:.75rem;font-variant-numeric:tabular-nums}",
  "th,td{border:1px solid #ddd;padding:.15rem .4rem;text-align:right}",
  "th:first-child,td:first-child{text-align:left}",
  "details{margin:.6rem 0}summary{cursor:pointer;font-size:.8rem;color:#555}",
].join("");

export function renderHtml(series: Snapshot[]): string {
  const first = series[0];
  const last = series[series.length - 1];
  const meta = `${series.length} snapshots / ${first.captured_at} 〜 ${last.captured_at} / 最新 commit ${last.commit.slice(0, 12)}`;
  return [
    "<!-- generated by scripts/metrics-visualize.ts - do not edit -->",
    "<!doctype html>",
    '<html lang="ja"><head><meta charset="utf-8"><title>metrics dashboard</title>',
    `<style>${STYLE}</style></head><body>`,
    "<h1>メトリクス定点観測ダッシュボード</h1>",
    `<p class="meta">${escapeHtml(meta)}</p>`,
    discoverCollectors(series).map((c) => renderCollectorSection(series, c)).join(""),
    "</body></html>",
  ].join("\n");
}

const USAGE = "Usage: bun scripts/metrics-visualize.ts --write";

type ArgsOutcome = { kind: "ok"; mode: "write" } | { kind: "usage"; reason: string };

export function parseArgs(argv: string[]): ArgsOutcome {
  if (argv.length === 1 && argv[0] === "--write") return { kind: "ok", mode: "write" };
  return { kind: "usage", reason: `expected exactly "--write", got "${argv.join(" ")}"` };
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
  const series = buildSeries(outcomes.map((o) => (o as Extract<ParseOutcome, { kind: "ok" }>).snapshot));
  const html = renderHtml(series);
  const out = join(dir, "index.html");
  writeFileSync(out, html);
  console.log(`wrote ${out} (${series.length} snapshots, ${Buffer.byteLength(html)} bytes)`);
  return 0;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
