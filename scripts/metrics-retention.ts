// Retention pruner over the metrics/ snapshots that
// scripts/metrics-snapshot.ts accumulates on every main merge (Issue #1121).
// Keeps the newest METRICS_RETENTION_KEEP_LAST snapshots and prunes the rest,
// so the directory does not grow without bound.
//
// Fail-closed contract: a single unreadable or structurally-invalid snapshot
// aborts the whole run with zero deletions — we never prune while the set is
// in doubt. Validation reuses parseSnapshot from the sibling reader (no private
// parser), so writer, reader, and pruner agree on what a valid snapshot is.
//
// Env seam (shared with the writer/reader): AMADEUS_METRICS_ROOT overrides the
// repository root; the metrics/ subdirectory is always appended.

import { readFileSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSnapshot } from "./metrics-timeseries";

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPTS_DIR, "..");

// Keep the last 360 snapshots. Derived from the observed accrual rate of
// ~12 snapshots/day (one per main merge) over ~30 days of history to retain
// (E-1121-RA Q1 ruling).
export const METRICS_RETENTION_KEEP_LAST = 360;

export type SnapshotMeta = { file: string; capturedAt: string; commit: string };

// Two-valued outcome: an empty directory is a valid "ok" with metas=[], not a
// third state — the caller decides that nothing-to-prune is success.
export type ScanOutcome = { kind: "ok"; metas: SnapshotMeta[] } | { kind: "error"; file: string; reason: string };

export type PrunePlan = { keep: SnapshotMeta[]; prune: SnapshotMeta[] };

type ArgsOutcome = { kind: "ok"; apply: boolean } | { kind: "usage"; reason: string };

const USAGE = "Usage: bun scripts/metrics-retention.ts [--apply]";

// Scan the metrics directory into validated snapshot metadata. readdirSync
// throwing (missing/unreadable directory) propagates to the caller — that is a
// directory-level failure with no owning file. A per-file read exception
// (dangling symlink, permission) or any parseSnapshot defect short-circuits to
// a loud error naming the file: fail-closed, one bad snapshot is enough.
export function scanSnapshots(dir: string): ScanOutcome {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const metas: SnapshotMeta[] = [];
  for (const file of files) {
    let text: string;
    try {
      text = readFileSync(join(dir, file), "utf-8");
    } catch (e) {
      return { kind: "error", file, reason: e instanceof Error ? e.message : String(e) };
    }
    const parsed = parseSnapshot(text, file);
    if (parsed.kind === "error") return { kind: "error", file: parsed.file, reason: parsed.reason };
    metas.push({ file, capturedAt: parsed.snapshot.captured_at, commit: parsed.snapshot.commit });
  }
  return { kind: "ok", metas };
}

// Pure: split metas into keep (the newest keepLast) and prune (the rest).
// captured_at is the retention authority, commit breaks ties — the exact
// reverse of the reader's buildSeries order, so the newest survive. keepLast<1
// is a programmer defect (a non-positive retention window), not a runtime path.
export function selectPrunable(metas: SnapshotMeta[], keepLast: number): PrunePlan {
  if (keepLast < 1) throw new Error(`keepLast must be >= 1, got ${keepLast}`);
  const ordered = [...metas].sort(
    (a, b) => b.capturedAt.localeCompare(a.capturedAt) || b.commit.localeCompare(a.commit),
  );
  return { keep: ordered.slice(0, keepLast), prune: ordered.slice(keepLast) };
}

export function parseArgs(argv: string[]): ArgsOutcome {
  if (argv.length === 0) return { kind: "ok", apply: false };
  if (argv.length === 1 && argv[0] === "--apply") return { kind: "ok", apply: true };
  return { kind: "usage", reason: `unexpected arguments: ${argv.join(" ")}` };
}

// stdout carries the result listing only; stderr carries errors only.
export function main(argv: string[]): number {
  const parsed = parseArgs(argv);
  if (parsed.kind === "usage") {
    console.error(parsed.reason);
    console.error(USAGE);
    return 2;
  }
  const root = process.env.AMADEUS_METRICS_ROOT ?? ROOT;
  const dir = join(root, "metrics");
  let scan: ScanOutcome;
  try {
    scan = scanSnapshots(dir);
  } catch (e) {
    console.error(`cannot read ${dir}: ${e instanceof Error ? e.message : String(e)}`);
    return 1;
  }
  if (scan.kind === "error") {
    console.error(`${scan.file}: ${scan.reason}`);
    console.error("refusing to prune: 1 unreadable snapshot(s)");
    return 1;
  }
  const metas = scan.metas;
  if (metas.length === 0) {
    console.log("no snapshots — nothing to prune");
    return 0;
  }
  const plan = selectPrunable(metas, METRICS_RETENTION_KEEP_LAST);
  if (plan.prune.length === 0) {
    console.log(`retention ok (n=${metas.length} <= ${METRICS_RETENTION_KEEP_LAST}) — nothing to prune`);
    return 0;
  }
  if (!parsed.apply) {
    console.log(`would prune ${plan.prune.length} of ${metas.length} snapshots (keep last ${METRICS_RETENTION_KEEP_LAST}):`);
    for (const m of plan.prune) console.log(m.file);
    console.log("dry-run: no files deleted");
    return 0;
  }
  for (const m of plan.prune) {
    try {
      unlinkSync(join(dir, m.file));
    } catch (e) {
      console.error(`failed to delete ${m.file}: ${e instanceof Error ? e.message : String(e)}`);
      return 1;
    }
  }
  console.log(`pruned ${plan.prune.length} snapshots (kept ${plan.keep.length} of ${metas.length})`);
  return 0;
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
