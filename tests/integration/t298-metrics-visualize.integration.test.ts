// covers: harness-instrument:metrics-visualize
// fs/CLI boundary of the metrics visualizer (U1 visualize-skeleton), driven
// through the AMADEUS_METRICS_ROOT env seam against temp fixture roots — fs,
// hence integration / medium (size purity keeps the pure-function half in
// tests/unit/t298-metrics-visualize.test.ts). Falling proofs: broken snapshot,
// empty dir, missing dir, and dangling symlink must all fail loudly with a
// zero-write; usage violations exit 2.
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SCRIPT = join(import.meta.dir, "..", "..", "scripts", "metrics-visualize.ts");
const REPO_METRICS = join(import.meta.dir, "..", "..", "metrics");

function run(root: string, args: string[]): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync("bun", [SCRIPT, ...args], {
    env: { ...process.env, AMADEUS_METRICS_ROOT: root },
    encoding: "utf-8",
  });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), "metrics-visualize-"));
}

function validSnapshot(capturedAt: string, commit: string): string {
  return JSON.stringify({
    schema_version: 1,
    captured_at: capturedAt,
    commit,
    collectors: { coverage: { tool: "bun", tool_version: "1.3.13", values: { percent: 80.1 } } },
  });
}

describe("metrics-visualize --write", () => {
  test("renders index.html from valid snapshots and reports path + counts", () => {
    const root = tempRoot();
    mkdirSync(join(root, "metrics"));
    writeFileSync(join(root, "metrics", "a.json"), validSnapshot("2026-07-01T00:00:00.000Z", "a".repeat(40)));
    writeFileSync(join(root, "metrics", "b.json"), validSnapshot("2026-07-02T00:00:00.000Z", "b".repeat(40)));
    const r = run(root, ["--write"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("2 snapshots");
    const html = readFileSync(join(root, "metrics", "index.html"), "utf-8");
    expect(html).toContain("<h2>coverage");
  });

  test("a broken snapshot fails loudly, names the file, and writes nothing", () => {
    const root = tempRoot();
    mkdirSync(join(root, "metrics"));
    writeFileSync(join(root, "metrics", "good.json"), validSnapshot("2026-07-01T00:00:00.000Z", "a".repeat(40)));
    writeFileSync(join(root, "metrics", "broken.json"), "{not json");
    const r = run(root, ["--write"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("broken.json");
    expect(existsSync(join(root, "metrics", "index.html"))).toBe(false);
  });

  test("an empty metrics dir fails loudly with a zero-write", () => {
    const root = tempRoot();
    mkdirSync(join(root, "metrics"));
    const r = run(root, ["--write"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("no snapshots");
  });

  test("a missing metrics dir fails loudly", () => {
    const r = run(tempRoot(), ["--write"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("cannot read");
  });

  test("a dangling symlink fails loudly, names the file, and writes nothing", () => {
    const root = tempRoot();
    mkdirSync(join(root, "metrics"));
    writeFileSync(join(root, "metrics", "good.json"), validSnapshot("2026-07-01T00:00:00.000Z", "a".repeat(40)));
    symlinkSync(join(root, "metrics", "absent-target.json"), join(root, "metrics", "dangling.json"));
    const r = run(root, ["--write"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("dangling.json");
    expect(existsSync(join(root, "metrics", "index.html"))).toBe(false);
  });

  test("usage violations exit 2 with the usage line on stderr", () => {
    const r = run(tempRoot(), []);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("Usage:");
  });
});

describe("real-data sweep", () => {
  test("the repository's committed snapshots render with all six collectors", () => {
    const root = tempRoot();
    mkdirSync(join(root, "metrics"));
    const files = require("node:fs")
      .readdirSync(REPO_METRICS)
      .filter((f: string) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      writeFileSync(join(root, "metrics", f), readFileSync(join(REPO_METRICS, f)));
    }
    const r = run(root, ["--write"]);
    expect(r.status).toBe(0);
    const html = readFileSync(join(root, "metrics", "index.html"), "utf-8");
    for (const collector of ["ccn", "coverage", "loc", "tests", "test_pyramid", "dist_size"]) {
      expect(html).toContain(`<h2>${collector}`);
    }
  });
});

// In-process seam: bun --coverage does not instrument spawned children, so the
// CLI paths above would stay DA:0 in lcov. Driving the exported main() directly
// through the same env seam keeps the fs handler measurable (spawn-blindspot).
describe("main in-process (coverage seam)", () => {
  const { main } = require("../../scripts/metrics-visualize") as typeof import("../../scripts/metrics-visualize");

  function withRoot<T>(root: string, fn: () => T): T {
    const prev = process.env.AMADEUS_METRICS_ROOT;
    process.env.AMADEUS_METRICS_ROOT = root;
    try {
      return fn();
    } finally {
      if (prev === undefined) delete process.env.AMADEUS_METRICS_ROOT;
      else process.env.AMADEUS_METRICS_ROOT = prev;
    }
  }

  test("--write renders and returns 0", () => {
    const root = tempRoot();
    mkdirSync(join(root, "metrics"));
    writeFileSync(join(root, "metrics", "a.json"), validSnapshot("2026-07-01T00:00:00.000Z", "a".repeat(40)));
    expect(withRoot(root, () => main(["--write"]))).toBe(0);
    expect(existsSync(join(root, "metrics", "index.html"))).toBe(true);
  });

  test("a broken snapshot returns 1 with a zero-write", () => {
    const root = tempRoot();
    mkdirSync(join(root, "metrics"));
    writeFileSync(join(root, "metrics", "broken.json"), "{not json");
    expect(withRoot(root, () => main(["--write"]))).toBe(1);
    expect(existsSync(join(root, "metrics", "index.html"))).toBe(false);
  });

  test("an empty dir returns 1", () => {
    const root = tempRoot();
    mkdirSync(join(root, "metrics"));
    expect(withRoot(root, () => main(["--write"]))).toBe(1);
  });

  test("a missing dir returns 1", () => {
    expect(withRoot(tempRoot(), () => main(["--write"]))).toBe(1);
  });

  test("a dangling symlink returns 1 (per-file read failure joins the parse-error path)", () => {
    const root = tempRoot();
    mkdirSync(join(root, "metrics"));
    symlinkSync(join(root, "metrics", "absent.json"), join(root, "metrics", "dangling.json"));
    expect(withRoot(root, () => main(["--write"]))).toBe(1);
    expect(existsSync(join(root, "metrics", "index.html"))).toBe(false);
  });
});

describe("reader-module contract (AC-7 / AC-1c)", () => {
  test("metrics-timeseries.ts imports no fs write API", () => {
    const src = readFileSync(join(import.meta.dir, "..", "..", "scripts", "metrics-timeseries.ts"), "utf-8");
    for (const token of ["writeFileSync", "appendFileSync", "createWriteStream", "writeFile", "unlinkSync", "renameSync"]) {
      expect(src).not.toContain(token);
    }
  });
});

// --- U2 (visualize-hardening) additions -------------------------------------

describe("--check drift guard", () => {
  const { main } = require("../../scripts/metrics-visualize") as typeof import("../../scripts/metrics-visualize");

  function withRoot<T>(root: string, fn: () => T): T {
    const prev = process.env.AMADEUS_METRICS_ROOT;
    process.env.AMADEUS_METRICS_ROOT = root;
    try {
      return fn();
    } finally {
      if (prev === undefined) delete process.env.AMADEUS_METRICS_ROOT;
      else process.env.AMADEUS_METRICS_ROOT = prev;
    }
  }

  function seeded(): string {
    const root = tempRoot();
    mkdirSync(join(root, "metrics"));
    writeFileSync(join(root, "metrics", "a.json"), validSnapshot("2026-07-01T00:00:00.000Z", "a".repeat(40)));
    return root;
  }

  test("matches after --write (exit 0)", () => {
    const root = seeded();
    expect(withRoot(root, () => main(["--write"]))).toBe(0);
    expect(withRoot(root, () => main(["--check"]))).toBe(0);
  });

  test("a tampered index.html is stale (exit 1) — falling proof", () => {
    const root = seeded();
    expect(withRoot(root, () => main(["--write"]))).toBe(0);
    writeFileSync(join(root, "metrics", "index.html"), "tampered");
    expect(withRoot(root, () => main(["--check"]))).toBe(1);
  });

  test("a missing index.html is stale (exit 1)", () => {
    const root = seeded();
    expect(withRoot(root, () => main(["--check"]))).toBe(1);
  });

  test("spawned --check agrees with the in-process seam", () => {
    const root = seeded();
    expect(withRoot(root, () => main(["--write"]))).toBe(0);
    const r = run(root, ["--check"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("up to date");
  });
});

describe("size ceiling (FR-6)", () => {
  const { MAX_HTML_BYTES, main } = require("../../scripts/metrics-visualize") as typeof import("../../scripts/metrics-visualize");

  test("an over-ceiling render refuses both modes with a zero-write — falling proof", () => {
    const root = tempRoot();
    mkdirSync(join(root, "metrics"));
    // One structurally valid snapshot whose values inflate the rendered HTML
    // past MAX_HTML_BYTES (the reader enforces no per-file size cap; only the
    // writer does, and fixtures do not go through the writer).
    const values: Record<string, number> = {};
    for (let i = 0; i < 3000; i++) values[`key_${"x".repeat(1500)}_${i}`] = i;
    writeFileSync(
      join(root, "metrics", "huge.json"),
      JSON.stringify({
        schema_version: 1,
        captured_at: "2026-07-01T00:00:00.000Z",
        commit: "a".repeat(40),
        collectors: { pad: { tool: "t", tool_version: "1", values } },
      }),
    );
    const prev = process.env.AMADEUS_METRICS_ROOT;
    process.env.AMADEUS_METRICS_ROOT = root;
    try {
      expect(main(["--write"])).toBe(1);
    } finally {
      if (prev === undefined) delete process.env.AMADEUS_METRICS_ROOT;
      else process.env.AMADEUS_METRICS_ROOT = prev;
    }
    expect(existsSync(join(root, "metrics", "index.html"))).toBe(false);
    expect(MAX_HTML_BYTES).toBe(16_384 * 360 * 2);
  });
});
