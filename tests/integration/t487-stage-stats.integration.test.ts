// covers: function:scanCorpus, function:collectReviewBlocks, function:main
// size: medium
//
// t487 — Issue #2405 (U1 stage-stats). Integration half of the twin: the real
// filesystem scan, the CLI shell driven in-process (so bun --coverage measures
// it), and the exit ladder measured by an actual spawn. The pure aggregation
// core is t486's job.
//
// Every expectation is checked against an INDEPENDENT ORACLE — a walker
// written here in the test that counts shards, lines and events on its own —
// so a defect in the scanner cannot cancel out against the expectation.
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectReviewBlocks, composeReport, main, scanCorpus } from "../../packages/framework/core/tools/amadeus-stage-stats.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TOOL = join(REPO_ROOT, "packages", "framework", "core", "tools", "amadeus-stage-stats.ts");

const scratchDirs: string[] = [];
afterEach(() => {
  while (scratchDirs.length > 0) rmSync(scratchDirs.pop()!, { recursive: true, force: true });
});

function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), "amadeus-stage-stats-"));
  scratchDirs.push(dir);
  return dir;
}

// --- fixture builders -------------------------------------------------------

function v1Line(seq: number, event: string, timestamp: string, fields: Record<string, string> = {}): string {
  return JSON.stringify({ schemaVersion: 1, seq, cloneId: "c1", intentId: "intents", timestamp, heading: event, event, fields });
}

function v2Line(seq: number, event: string, timestamp: string, attrs: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: 2,
    eventId: `e${seq}`,
    seq,
    timestamp,
    eventName: "amadeus.stage",
    attributes: { Event: event, ...attrs },
    intentId: "intents",
    space: "default",
    cloneId: "c2",
    traceId: null,
    spanId: null,
    traceFlags: 0,
    idempotencyKey: `k${seq}`,
    canonical: true,
  });
}

function writeShard(spaceRoot: string, intent: string, name: string, lines: readonly string[]): string {
  const dir = join(spaceRoot, "intents", intent, "audit");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, name);
  writeFileSync(path, `${lines.join("\n")}\n`);
  return path;
}

function writeArtefact(spaceRoot: string, intent: string, relative: string, body: string): void {
  const path = join(spaceRoot, "intents", intent, relative);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
}

// A corpus mixing both journal generations, a torn line, a degenerate
// intentId, an unmatched start, a zero-second window, an unclosed park, and
// review headings both canonical and suffixed.
function buildCorpus(projectDir: string): string {
  const spaceRoot = join(projectDir, "amadeus", "spaces", "default");
  writeShard(spaceRoot, "alpha", "shard-a.jsonl", [
    v1Line(1, "STAGE_STARTED", "2026-01-01T00:00:00Z", { Stage: "design" }),
    v1Line(2, "STAGE_AWAITING_APPROVAL", "2026-01-01T00:00:20Z"),
    v1Line(3, "GATE_APPROVED", "2026-01-01T00:00:50Z"),
    v2Line(4, "STAGE_COMPLETED", "2026-01-01T00:01:40Z", { Stage: "design" }),
    "{ this line is not json",
    v2Line(5, "SENSOR_FIRED", "2026-01-01T00:00:05Z", { "Stage slug": "design", Stage: "Design Stage" }),
    v2Line(6, "SENSOR_FAILED", "2026-01-01T00:00:06Z", { "Stage slug": "design", Stage: "Design Stage" }),
    v2Line(7, "SUBAGENT_COMPLETED", "2026-01-01T00:00:07Z", { Model: "opus", "Model Source": "pin" }),
    v1Line(8, "SUBAGENT_COMPLETED", "2026-01-01T00:00:08Z"),
  ]);
  writeShard(spaceRoot, "beta", "shard-b.jsonl", [
    v1Line(1, "STAGE_STARTED", "2026-01-01T01:00:00Z", { Stage: "build" }),
    v1Line(2, "STAGE_COMPLETED", "2026-01-01T01:00:00Z", { Stage: "build" }),
    v1Line(3, "STAGE_STARTED", "2026-01-01T02:00:00Z", { Stage: "never-finished" }),
    v1Line(4, "STAGE_STARTED", "2026-01-01T03:00:00Z", { Stage: "parked-forever" }),
    v1Line(5, "WORKFLOW_PARKED", "2026-01-01T03:00:10Z"),
    v1Line(6, "STAGE_COMPLETED", "2026-01-01T03:01:00Z", { Stage: "parked-forever" }),
  ]);
  writeArtefact(spaceRoot, "alpha", "construction/unit-x/functional-design/business-rules.md", "## Review — Iteration 1\nbody\n## Review — Iteration 2\n");
  writeArtefact(spaceRoot, "alpha", "construction/{unit-name}/code-generation/code-summary.md", "## Review — Iteration 1\n");
  writeArtefact(spaceRoot, "beta", "inception/requirements-analysis/requirements.md", "## Review — Iteration 1 (follow-up)\n");
  return spaceRoot;
}

// --- independent oracles ----------------------------------------------------

// A walker written from scratch: it counts shards, non-empty lines, and torn
// lines without calling any function under test.
function oracleEventName(line: string): string {
  const parsed = JSON.parse(line) as Record<string, unknown>;
  return parsed.schemaVersion === 2 ? String((parsed.attributes as Record<string, unknown>).Event) : String(parsed.event);
}

function oracleShardPaths(spaceRoot: string): string[] {
  const intentsRoot = join(spaceRoot, "intents");
  const paths: string[] = [];
  for (const intent of readdirSync(intentsRoot).sort()) {
    const auditDir = join(intentsRoot, intent, "audit");
    let entries: string[] = [];
    try {
      entries = readdirSync(auditDir).sort();
    } catch {
      entries = [];
    }
    for (const shard of entries) if (shard.endsWith(".jsonl")) paths.push(join(auditDir, shard));
  }
  return paths;
}

function oracleScan(spaceRoot: string): { shards: number; lines: number; broken: number; events: Record<string, number> } {
  let shards = 0;
  let lines = 0;
  let broken = 0;
  const events: Record<string, number> = {};
  for (const path of oracleShardPaths(spaceRoot)) {
    let body: string;
    try {
      body = readFileSync(path, "utf-8");
    } catch {
      continue;
    }
    shards += 1;
    for (const line of body.split("\n")) {
      if (line.trim() === "") continue;
      lines += 1;
      try {
        const name = oracleEventName(line);
        events[name] = (events[name] ?? 0) + 1;
      } catch {
        broken += 1;
      }
    }
  }
  return { shards, lines, broken, events };
}

// A second, independent heading counter: split on lines and compare the exact
// canonical marker, without touching the module's parser.
function oracleMarkdownPaths(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "audit") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) oracleMarkdownPaths(full, out);
    else if (entry.name.endsWith(".md")) out.push(full);
  }
}

function oracleReviewCount(spaceRoot: string): { canonical: number; suffixed: number } {
  let canonical = 0;
  let suffixed = 0;
  const paths: string[] = [];
  oracleMarkdownPaths(join(spaceRoot, "intents"), paths);
  for (const path of paths) {
    for (const line of readFileSync(path, "utf-8").split("\n")) {
      // The permissive scan the writer uses: "## Review" followed by nothing,
      // a space, or a tab. Anything else is a different heading entirely.
      if (!/^## Review(?:[ \t].*)?$/.test(line)) continue;
      if (/^## Review — Iteration \d+$/.test(line)) canonical += 1;
      else suffixed += 1;
    }
  }
  return { canonical, suffixed };
}

function capturedMain(argv: readonly string[]): { code: number; stdout: string } {
  const chunks: string[] = [];
  const original = process.stdout.write.bind(process.stdout);
  (process.stdout as unknown as { write: (s: string) => boolean }).write = (s: string) => {
    chunks.push(s);
    return true;
  };
  try {
    return { code: main(argv), stdout: chunks.join("") };
  } finally {
    (process.stdout as unknown as { write: typeof original }).write = original;
  }
}

// --- FR-1: corpus scan and attribution --------------------------------------

describe("scanCorpus — both journal generations, path-derived attribution", () => {
  test("rows of both schema versions reach the aggregation, and torn lines are counted", () => {
    const projectDir = scratch();
    const spaceRoot = buildCorpus(projectDir);
    const oracle = oracleScan(spaceRoot);
    const corpus = scanCorpus(spaceRoot);

    expect(corpus.shardCount).toBe(oracle.shards);
    expect(corpus.lineCount).toBe(oracle.lines);
    expect(corpus.brokenLineCount).toBe(oracle.broken);
    expect(corpus.brokenLineCount).toBe(1);
    // 15 written lines minus the one that does not decode.
    expect(corpus.records).toHaveLength(oracle.lines - oracle.broken);
    const versions = new Set(corpus.records.map((r) => r.record.schemaVersion));
    expect([...versions].sort()).toEqual([1, 2]);
  });

  test("a degenerate recorded intentId is overridden by the shard path", () => {
    const projectDir = scratch();
    const corpus = scanCorpus(buildCorpus(projectDir));
    expect(corpus.records.every((r) => r.record.intentId === "intents")).toBe(true);
    expect([...new Set(corpus.records.map((r) => r.intent))].sort()).toEqual(["alpha", "beta"]);
  });

  test("an unreadable shard is counted, and the rest of the corpus still scans", () => {
    const projectDir = scratch();
    const spaceRoot = buildCorpus(projectDir);
    const before = scanCorpus(spaceRoot);
    // A dangling symlink is the portable way to make a directory entry that
    // exists for readdir but cannot be read (a directory would raise EISDIR on
    // macOS and return "" on Linux).
    symlinkSync(join(spaceRoot, "intents", "alpha", "audit", "nowhere.jsonl"), join(spaceRoot, "intents", "alpha", "audit", "dangling.jsonl"));
    const after = scanCorpus(spaceRoot);
    expect(after.unreadableShardCount).toBe(1);
    expect(after.records.length).toBe(before.records.length);
  });

  test("an absent space tree is an empty corpus, not a crash", () => {
    const corpus = scanCorpus(join(scratch(), "no", "such", "space"));
    expect(corpus).toEqual({ records: [], unreadableShardCount: 0, brokenLineCount: 0, shardCount: 0, lineCount: 0 });
  });
});

// --- FR-3: review iterations from the record tree ---------------------------

describe("collectReviewBlocks — record artefacts, literal unit dirs kept", () => {
  test("canonical headings become blocks and suffixed headings are counted", () => {
    const projectDir = scratch();
    const spaceRoot = buildCorpus(projectDir);
    const oracle = oracleReviewCount(spaceRoot);
    const collected = collectReviewBlocks(join(spaceRoot, "intents"));

    expect(collected.blocks).toHaveLength(oracle.canonical);
    expect(collected.unparseableHeadingCount).toBe(oracle.suffixed);
    expect(collected.unparseableHeadingCount).toBe(1);
    expect(collected.blocks.map((b) => b.unit)).toContain("{unit-name}");
    expect(collected.blocks.map((b) => b.unit)).toContain("unit-x");
  });
});

// --- FR-2 / FR-4 / FR-5 / FR-6 through the assembled report -----------------

describe("main — the whole pipeline over a real corpus", () => {
  test("the report opens with the measurement ref and states the hypothesis", () => {
    const projectDir = scratch();
    buildCorpus(projectDir);
    const { code, stdout } = capturedMain(["--project-dir", projectDir, "--space", "default"]);
    expect(code).toBe(0);
    const head = stdout.split("\n").slice(0, 16).join("\n");
    for (const key of ["shards:", "lines:", "broken-line:", "unreadable-shard:", "unmatched-start:", "orphan-complete:", "unclosed-idle:", "zero-second:", "invalid-timestamp:", "unparseable-review-heading:"]) {
      expect(head).toContain(key);
    }
    expect(stdout).toContain("unverified hypothesis");
  });

  test("json carries the layered identities and the exclusion buckets", () => {
    const projectDir = scratch();
    buildCorpus(projectDir);
    const { stdout } = capturedMain(["--project-dir", projectDir, "--space", "default", "--json"]);
    const report = JSON.parse(stdout) as {
      constructedWindowCount: number;
      populationCount: number;
      exclusions: { corpus: Record<string, number>; windowing: Record<string, number>; review: Record<string, number> };
      models: { attributableCount: number; unresolvedCount: number; totalCount: number };
      stages: { stage: string; rawMedian: number; netMedian: number }[];
      sensors: { stageSlug: string; fired: number; failed: number }[];
    };
    // Identity W over the real corpus.
    expect(report.populationCount + report.exclusions.windowing.unclosedIdle + report.exclusions.windowing.zeroSecond).toBe(report.constructedWindowCount);
    // Identity M.
    expect(report.models.attributableCount + report.models.unresolvedCount).toBe(report.models.totalCount);
    expect(report.models.unresolvedCount).toBe(1);
    // The fixture's shapes, each counted exactly once.
    expect(report.exclusions.corpus.brokenLine).toBe(1);
    expect(report.exclusions.windowing.unmatchedStart).toBe(1);
    expect(report.exclusions.windowing.zeroSecond).toBe(1);
    expect(report.exclusions.windowing.unclosedIdle).toBe(1);
    expect(report.exclusions.review.unparseableReviewHeading).toBe(1);
    // Idle subtraction: the design window is 100s raw, 30s of it approval wait.
    const design = report.stages.find((s) => s.stage === "design");
    expect(design?.rawMedian).toBe(100);
    expect(design?.netMedian).toBe(70);
    // Sensors bucket on `Stage slug`, whose value differs from `Stage` here.
    expect(report.sensors.map((s) => s.stageSlug)).toEqual(["design"]);
  });

  test("two runs over the same corpus produce byte-identical output in all three forms", () => {
    const projectDir = scratch();
    buildCorpus(projectDir);
    for (const form of [[], ["--format", "csv"], ["--json"]]) {
      const args = ["--project-dir", projectDir, "--space", "default", ...form];
      expect(capturedMain(args).stdout).toBe(capturedMain(args).stdout);
    }
  });

  test("composeReport over the scanned corpus matches what main rendered", () => {
    const projectDir = scratch();
    const spaceRoot = buildCorpus(projectDir);
    const reviews = collectReviewBlocks(join(spaceRoot, "intents"));
    const report = composeReport({
      scanScope: "x",
      corpus: scanCorpus(spaceRoot),
      reviewBlocks: reviews.blocks,
      unparseableReviewHeadingCount: reviews.unparseableHeadingCount,
    });
    const { stdout } = capturedMain(["--project-dir", projectDir, "--space", "default", "--json"]);
    expect((JSON.parse(stdout) as { populationCount: number }).populationCount).toBe(report.populationCount);
  });

  test("scanning the real workspace stays well inside the sixty-second ceiling", () => {
    const started = Date.now();
    const { code } = capturedMain(["--project-dir", REPO_ROOT, "--space", "default", "--json"]);
    const elapsed = (Date.now() - started) / 1000;
    expect(code === 0 || code === 1).toBe(true);
    expect(elapsed).toBeLessThan(60);
  });
});

// --- Issue #2700: piped stdout must not be truncated at the pipe buffer ----

function isoAt(offsetSeconds: number): string {
  return new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + offsetSeconds * 1000).toISOString();
}

// A corpus with enough distinct stages that the rendered JSON report exceeds
// the 64KiB pipe buffer that reproduced Issue #2700 (measured: 1200 stages ->
// ~104,000 bytes, comfortably past 65536 with margin for renderer changes).
function buildOversizedCorpus(projectDir: string, stageCount: number): string {
  const spaceRoot = join(projectDir, "amadeus", "spaces", "default");
  const lines: string[] = [];
  let seq = 1;
  for (let i = 0; i < stageCount; i++) {
    const stage = `bulk-stage-${String(i).padStart(5, "0")}`;
    lines.push(v1Line(seq++, "STAGE_STARTED", isoAt(i * 2), { Stage: stage }));
    lines.push(v1Line(seq++, "STAGE_COMPLETED", isoAt(i * 2 + 1), { Stage: stage }));
  }
  writeShard(spaceRoot, "bulk", "shard-bulk.jsonl", lines);
  return spaceRoot;
}

describe("pipe integrity — Issue #2700, stdout must fully drain before exit", () => {
  const RUN_OPTIONS = { encoding: "utf-8", env: process.env, timeout: 60_000, killSignal: "SIGKILL" } as const;

  test("output bigger than the 64KiB pipe buffer is not truncated when piped", () => {
    const projectDir = scratch();
    buildOversizedCorpus(projectDir, 1200);

    // Full capture: spawnSync reads the child's stdout pipe to EOF itself, so
    // this number is what a correct, fully-drained run actually produces.
    const full = spawnSync("bun", [TOOL, "--project-dir", projectDir, "--space", "default", "--format", "json"], {
      ...RUN_OPTIONS,
      maxBuffer: 16 * 1024 * 1024,
    });
    expect(full.status).toBe(0);
    const fullBytes = Buffer.byteLength(full.stdout ?? "", "utf-8");
    // Fixture precondition, checked mechanically rather than assumed: the
    // report must actually exceed the pipe buffer size that reproduced the
    // defect, or the byte-count comparison below proves nothing.
    expect(fullBytes).toBeGreaterThan(65536);

    // Piped capture: reproduce the exact shape from the issue report
    // (`... | wc -c`) — a downstream reader racing the producer's exit.
    // Positional params (`--`) keep the scratch paths out of the shell
    // script string entirely.
    const piped = spawnSync("sh", ["-c", 'set -o pipefail; bun "$1" --project-dir "$2" --space default --format json | wc -c', "--", TOOL, projectDir], RUN_OPTIONS);
    expect(piped.status).toBe(0);
    const pipedBytes = Number((piped.stdout ?? "").trim());
    expect(pipedBytes).toBe(fullBytes);
  });
});

// --- FR-7: exit ladder and the read-only invariant --------------------------

describe("exit ladder — measured by spawning the CLI", () => {
  const RUN_OPTIONS = { encoding: "utf-8", env: process.env, timeout: 60_000, killSignal: "SIGKILL" } as const;

  test("a healthy corpus exits 0", () => {
    const projectDir = scratch();
    buildCorpus(projectDir);
    const run = spawnSync("bun", [TOOL, "--project-dir", projectDir, "--space", "default", "--json"], RUN_OPTIONS);
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("hypothesisNotice");
  });

  test("a corpus with an unreadable shard exits 1 while still printing the report", () => {
    const projectDir = scratch();
    const spaceRoot = buildCorpus(projectDir);
    symlinkSync(join(spaceRoot, "intents", "alpha", "audit", "nowhere.jsonl"), join(spaceRoot, "intents", "alpha", "audit", "dangling.jsonl"));
    const run = spawnSync("bun", [TOOL, "--project-dir", projectDir, "--space", "default", "--json"], RUN_OPTIONS);
    expect(run.status).toBe(1);
    expect(run.stdout).toContain('"unreadableShard": 1');
  });

  test("an unknown flag exits 2 and prints usage", () => {
    const run = spawnSync("bun", [TOOL, "--nope"], RUN_OPTIONS);
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("Unknown argument");
  });
});

describe("read-only — the shipped source cannot write", () => {
  const WRITE_APIS = [
    "writeFileSync",
    "appendFileSync",
    "mkdirSync",
    "rmSync",
    "unlinkSync",
    "renameSync",
    "cpSync",
    "copyFileSync",
    "mkdtempSync",
    "chmodSync",
    "createWriteStream",
    "writeFile",
    "appendFile",
  ];

  test("no filesystem write API is imported or referenced by the tool", () => {
    const source = readFileSync(TOOL, "utf-8");
    const imports = [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']node:fs["']/g)].flatMap((m) =>
      (m[1] ?? "").split(",").map((s) => s.trim()).filter((s) => s !== ""),
    );
    const valueImports = imports.filter((s) => !s.startsWith("type "));
    expect(valueImports.sort()).toEqual(["readFileSync", "readdirSync"]);
    for (const api of WRITE_APIS) expect(source.includes(api)).toBe(false);
    expect(source.includes("node:fs/promises")).toBe(false);
  });

  test("a run leaves the corpus byte-identical", () => {
    const projectDir = scratch();
    const spaceRoot = buildCorpus(projectDir);
    const snapshot = new Map<string, string>();
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else snapshot.set(full, readFileSync(full, "utf-8"));
      }
    };
    walk(spaceRoot);
    capturedMain(["--project-dir", projectDir, "--space", "default"]);
    for (const [path, body] of snapshot) expect(readFileSync(path, "utf-8")).toBe(body);
  });
});

describe("resolution seams — driven in-process so bun --coverage measures them", () => {
  test("a usage error returns 2 without touching the filesystem", () => {
    const { code } = capturedMain(["--definitely-unknown-flag"]);
    expect(code).toBe(2);
  });

  test("CLAUDE_PROJECT_DIR resolves the project dir when the flag is absent", () => {
    const projectDir = scratch();
    buildCorpus(projectDir);
    const saved = process.env.CLAUDE_PROJECT_DIR;
    process.env.CLAUDE_PROJECT_DIR = projectDir;
    try {
      const { code, stdout } = capturedMain(["--space", "default"]);
      expect(code).toBe(0);
      expect(stdout).toContain("shards:");
    } finally {
      if (saved === undefined) delete process.env.CLAUDE_PROJECT_DIR;
      else process.env.CLAUDE_PROJECT_DIR = saved;
    }
  });

  test("without env or flag the cwd rung resolves, and active-space names the space", () => {
    const projectDir = scratch();
    buildCorpus(projectDir);
    writeFileSync(join(projectDir, "amadeus", "active-space"), "default\n");
    const savedEnv = process.env.CLAUDE_PROJECT_DIR;
    const savedCwd = process.cwd();
    delete process.env.CLAUDE_PROJECT_DIR;
    process.chdir(projectDir);
    try {
      const { code, stdout } = capturedMain([]);
      expect(code).toBe(0);
      expect(stdout).toContain('space "default"');
    } finally {
      process.chdir(savedCwd);
      if (savedEnv !== undefined) process.env.CLAUDE_PROJECT_DIR = savedEnv;
    }
  });

  test("a missing active-space file falls back to the default space", () => {
    const projectDir = scratch();
    buildCorpus(projectDir);
    const { code, stdout } = capturedMain(["--project-dir", projectDir]);
    expect(code).toBe(0);
    expect(stdout).toContain('space "default"');
  });
});
