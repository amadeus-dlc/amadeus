// covers: harness-instrument:metrics-timeseries
//
// t230 (process boundary) — drives metrics-timeseries main() through the
// AMADEUS_METRICS_ROOT env seam against temp fixture roots (fs, hence
// integration / medium — size purity keeps the pure-function half in
// tests/unit). Falling proofs: empty metrics dir, a broken snapshot file,
// an unknown collector, and a missing metrics dir all exit non-zero
// (AC-1a/1b/3d).

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main, type Snapshot } from "../../scripts/metrics-timeseries";

function snap(capturedAt: string, commit: string, collectors: Snapshot["collectors"]): Snapshot {
  return { schema_version: 1, captured_at: capturedAt, commit, collectors };
}

const COVERAGE = { tool: "bun", tool_version: "1.0", values: { hits: 10, lines: 20, percent: 50 } };

describe("t230 CLI boundary via env seam", () => {
  let root: string | null = null;
  afterEach(() => {
    if (root !== null) rmSync(root, { recursive: true, force: true });
    delete process.env.AMADEUS_METRICS_ROOT;
    root = null;
  });

  function fixtureRoot(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), "t230-"));
    mkdirSync(join(dir, "metrics"), { recursive: true });
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, "metrics", name), text);
    process.env.AMADEUS_METRICS_ROOT = dir;
    return dir;
  }

  test("digest over a fixture root exits 0", () => {
    root = fixtureRoot({ "a.json": JSON.stringify(snap("2026-07-16T00:00:00Z", "abc", { coverage: COVERAGE })) });
    expect(main([])).toBe(0);
  });

  test("empty metrics dir exits 1 (AC-1b falling proof)", () => {
    root = fixtureRoot({});
    expect(main([])).toBe(1);
  });

  test("one broken file fails the whole run (AC-1a falling proof)", () => {
    root = fixtureRoot({
      "a.json": JSON.stringify(snap("2026-07-16T00:00:00Z", "abc", { coverage: COVERAGE })),
      "b.json": "{broken",
    });
    expect(main([])).toBe(1);
  });

  test("unknown collector exits 2 (AC-3d falling proof)", () => {
    root = fixtureRoot({ "a.json": JSON.stringify(snap("2026-07-16T00:00:00Z", "abc", { coverage: COVERAGE })) });
    expect(main(["--collector", "cnn"])).toBe(2);
  });

  test("--collector renders the per-collector table and exits 0", () => {
    root = fixtureRoot({ "a.json": JSON.stringify(snap("2026-07-16T00:00:00Z", "abc", { coverage: COVERAGE })) });
    expect(main(["--collector", "coverage"])).toBe(0);
  });

  test("--last limits the series and exits 0", () => {
    root = fixtureRoot({
      "a.json": JSON.stringify(snap("2026-07-16T00:00:00Z", "abc", { coverage: COVERAGE })),
      "b.json": JSON.stringify(snap("2026-07-16T01:00:00Z", "def", { coverage: COVERAGE })),
    });
    expect(main(["--last", "1"])).toBe(0);
  });

  test("missing metrics dir exits 1", () => {
    root = mkdtempSync(join(tmpdir(), "t230-nometrics-"));
    process.env.AMADEUS_METRICS_ROOT = root;
    expect(main([])).toBe(1);
  });
});
