// covers: harness-instrument:metrics-timeseries
//
// t230 (process boundary) — drives metrics-timeseries main() through the
// AMADEUS_METRICS_ROOT env seam against temp fixture roots (fs, hence
// integration / medium — size purity keeps the pure-function half in
// tests/unit). Falling proofs: empty metrics dir, a broken snapshot file,
// an unknown collector, and a missing metrics dir all exit non-zero
// (AC-1a/1b/3d).

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { main, type Snapshot } from "../../scripts/metrics-timeseries";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TOOL = join(REPO_ROOT, "scripts", "metrics-timeseries.ts");

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

  test("usage error through main exits 2 with the usage string", () => {
    root = fixtureRoot({ "a.json": JSON.stringify(snap("2026-07-16T00:00:00Z", "abc", { coverage: COVERAGE })) });
    expect(main(["--nope"])).toBe(2);
  });

  test("a snapshot that cannot be read (dangling symlink) exits 1 (RL-3)", () => {
    root = fixtureRoot({ "a.json": JSON.stringify(snap("2026-07-16T00:00:00Z", "abc", { coverage: COVERAGE })) });
    // ENOENT on read is the portable throw injection (macOS/Linux divergence
    // of readFileSync(dir) makes directory injection non-portable).
    symlinkSync(join(root, "metrics", "gone.json"), join(root, "metrics", "z.json"));
    expect(main([])).toBe(1);
  });

  test("missing metrics dir exits 1", () => {
    root = mkdtempSync(join(tmpdir(), "t230-nometrics-"));
    process.env.AMADEUS_METRICS_ROOT = root;
    expect(main([])).toBe(1);
  });
});

// buildOversizedMetricsRoot writes enough snapshot files that the
// --collector table render (one row per snapshot) exceeds the 64KiB pipe
// buffer that reproduced Issue #2700 (measured: 1300 snapshots -> ~103,012
// bytes, comfortably past 65536 with margin for renderer changes).
function buildOversizedMetricsRoot(count: number): string {
  const dir = mkdtempSync(join(tmpdir(), "t230-oversized-"));
  mkdirSync(join(dir, "metrics"), { recursive: true });
  for (let i = 0; i < count; i++) {
    const capturedAt = `2026-01-01T00:00:00.${String(i).padStart(6, "0")}Z`;
    const commit = String(i).padStart(40, "0");
    const s = snap(capturedAt, commit, {
      test_pyramid: { tool: "bun", tool_version: "1.0", values: { total: i, unit: i, integration: i, e2e: i, smoke: i } },
    });
    writeFileSync(join(dir, "metrics", `s${String(i).padStart(5, "0")}.json`), JSON.stringify(s));
  }
  return dir;
}

// Characterization test, not a reproduction of the Issue #2700 defect class.
// Investigation for that issue's sweep (same-root process.exit(main(...))
// sites) found this tool's console.log-based output does NOT truncate under
// a pipe, even past 200KB and with a deliberately slow reader — Bun's
// console.log appears to use a blocking write path, unlike the async
// Stream-based process.stdout.write that truncated in amadeus-stage-stats.ts
// (t487) and amadeus-subagent-stats.ts (t461). This test pins the
// piped-output-completeness contract this tool currently satisfies via that
// blocking path, so a silent regression (e.g. a future switch to
// process.stdout.write, or a Bun runtime change) would be caught.
describe("pipe integrity — Issue #2700, stdout must fully drain before exit", () => {
  let dir: string | null = null;
  afterEach(() => {
    if (dir !== null) rmSync(dir, { recursive: true, force: true });
    dir = null;
  });

  test("output bigger than the 64KiB pipe buffer is not truncated when piped", () => {
    dir = buildOversizedMetricsRoot(1300);
    const env = { ...process.env, AMADEUS_METRICS_ROOT: dir };
    const RUN_OPTIONS = { encoding: "utf-8", env, timeout: scaleTestTime(60_000), killSignal: "SIGKILL" } as const;

    // Full capture: spawnSync reads the child's stdout pipe to EOF itself, so
    // this number is what a correct, fully-drained run actually produces.
    const full = spawnSync("bun", [TOOL, "--collector", "test_pyramid"], { ...RUN_OPTIONS, maxBuffer: 16 * 1024 * 1024 });
    expect(full.status).toBe(0);
    const fullBytes = Buffer.byteLength(full.stdout ?? "", "utf-8");
    // Fixture precondition, checked mechanically rather than assumed: the
    // report must actually exceed the pipe buffer size that reproduced the
    // defect, or the byte-count comparison below proves nothing.
    expect(fullBytes).toBeGreaterThan(65536);

    // Piped capture: reproduce the exact shape from the issue report
    // (`... | wc -c`) — a downstream reader racing the producer's exit.
    // Positional params (`--`) keep the scratch paths out of the shell
    // script string entirely. bash, not sh: on Linux runners sh is dash,
    // which rejects `set -o pipefail` with exit 2.
    const piped = spawnSync("bash", ["-c", 'set -o pipefail; bun "$1" --collector test_pyramid | wc -c', "--", TOOL], RUN_OPTIONS);
    expect(piped.status).toBe(0);
    const pipedBytes = Number((piped.stdout ?? "").trim());
    expect(pipedBytes).toBe(fullBytes);
  });
});
