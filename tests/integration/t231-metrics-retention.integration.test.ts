// covers: harness-instrument:metrics-retention
//
// t231 (process boundary) — drives metrics-retention main() through the
// AMADEUS_METRICS_ROOT env seam against temp fixture roots (fs, hence
// integration / medium — size purity keeps the pure-function half in
// tests/unit). Falling proofs of the fail-closed contract: a broken snapshot,
// a dangling symlink, and a missing metrics dir all exit non-zero with zero
// deletions (AC-4c). The reader (metrics-timeseries main) still exits 0 over
// the pruned set (AC-3b). main() fixes the retention window at 360, so the
// prune path is exercised with a light 361-file synthetic fixture.

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../scripts/metrics-retention";
import { main as timeseriesMain } from "../../scripts/metrics-timeseries";

const COVERAGE = { tool: "bun", tool_version: "1.0", values: { hits: 10, lines: 20, percent: 50 } };

function snapshotJson(capturedAt: string, commit: string): string {
  return JSON.stringify({ schema_version: 1, captured_at: capturedAt, commit, collectors: { coverage: COVERAGE } });
}

describe("t231 retention CLI boundary via env seam", () => {
  let root: string | null = null;
  afterEach(() => {
    if (root !== null) rmSync(root, { recursive: true, force: true });
    delete process.env.AMADEUS_METRICS_ROOT;
    root = null;
  });

  function fixtureRoot(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), "t231-"));
    mkdirSync(join(dir, "metrics"), { recursive: true });
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, "metrics", name), text);
    process.env.AMADEUS_METRICS_ROOT = dir;
    return dir;
  }

  // Build n valid snapshots; captured_at ascends with the index, so index 0 is
  // the oldest and is the single file pruned when n = keepLast + 1.
  function bulkRoot(n: number): string {
    const files: Record<string, string> = {};
    for (let i = 0; i < n; i++) {
      const pad = String(i).padStart(4, "0");
      const at = `2026-07-16T${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00Z`;
      files[`snap-${pad}.json`] = snapshotJson(at, `commit-${pad}`);
    }
    return fixtureRoot(files);
  }

  function jsonCount(dir: string): number {
    return readdirSync(join(dir, "metrics")).filter((f) => f.endsWith(".json")).length;
  }

  test("n <= 360 is retention ok, exits 0, deletes nothing", () => {
    root = fixtureRoot({
      "a.json": snapshotJson("2026-07-16T00:00:00Z", "aaa"),
      "b.json": snapshotJson("2026-07-16T01:00:00Z", "bbb"),
      "c.json": snapshotJson("2026-07-16T02:00:00Z", "ccc"),
      "d.json": snapshotJson("2026-07-16T03:00:00Z", "ddd"),
      "e.json": snapshotJson("2026-07-16T04:00:00Z", "eee"),
    });
    expect(main(["--apply"])).toBe(0);
    expect(jsonCount(root)).toBe(5);
  });

  test("dry-run over an oversized set exits 0 and deletes nothing", () => {
    root = bulkRoot(361);
    expect(main([])).toBe(0);
    expect(jsonCount(root)).toBe(361);
  });

  test("--apply over an oversized set prunes the oldest and keeps 360", () => {
    root = bulkRoot(361);
    expect(main(["--apply"])).toBe(0);
    expect(jsonCount(root)).toBe(360);
    // index 0 (oldest captured_at) is the pruned file.
    expect(readdirSync(join(root, "metrics"))).not.toContain("snap-0000.json");
    expect(readdirSync(join(root, "metrics"))).toContain("snap-0360.json");
  });

  test("a broken snapshot aborts with zero deletions (AC-4c falling proof)", () => {
    root = fixtureRoot({
      "a.json": snapshotJson("2026-07-16T00:00:00Z", "aaa"),
      "b.json": "{broken",
    });
    expect(main(["--apply"])).toBe(1);
    expect(jsonCount(root)).toBe(2); // both files survive — fail-closed
  });

  test("a dangling symlink aborts with exit 1", () => {
    root = fixtureRoot({ "a.json": snapshotJson("2026-07-16T00:00:00Z", "aaa") });
    symlinkSync(join(root, "metrics", "gone.json"), join(root, "metrics", "z.json"));
    expect(main(["--apply"])).toBe(1);
  });

  test("an empty metrics dir exits 0 (nothing to prune)", () => {
    root = fixtureRoot({});
    expect(main(["--apply"])).toBe(0);
  });

  test("a missing metrics dir exits 1", () => {
    root = mkdtempSync(join(tmpdir(), "t231-nometrics-"));
    process.env.AMADEUS_METRICS_ROOT = root;
    expect(main(["--apply"])).toBe(1);
  });

  test("the reader still succeeds over the pruned set (AC-3b)", () => {
    root = bulkRoot(361);
    expect(main(["--apply"])).toBe(0);
    expect(timeseriesMain([])).toBe(0);
  });

  test("an unexpected argument exits 2", () => {
    root = fixtureRoot({ "a.json": snapshotJson("2026-07-16T00:00:00Z", "aaa") });
    expect(main(["--nope"])).toBe(2);
  });
});
