// covers: file:packages/framework/core/tools/amadeus-sensor-scope-sizing.ts
//
// t519 — the scope-sizing sensor's filesystem and CLI halves (#2692, the L1 row
// of #2683). The pure predicate lives in the unit sibling t518.
//
// Three things are pinned here that a pure test cannot reach:
//
//   1. SIBLING RESOLUTION. Both sizing artifacts resolve the count from their
//      shared directory, so a fire on either reports the same number and the
//      fallback chain can reach scope-document.md from a backlog fire.
//   2. THE OUTPUT EXISTS. This sensor always passes, and a passing advisory
//      leaves no detail file and no audit payload beyond SENSOR_PASSED — so the
//      measurement lives in the CLI's stdout JSON and nowhere else. A pass that
//      carried no numbers would be a sensor that fires and reports nothing:
//      verification theatre in the exact shape org.md forbids. The CLI tests
//      below assert the numbers are actually in the line.
//   3. THE CORPUS REPRODUCTION. #2692's ruling rests on a measurement over the
//      committed records: 58 of them carry both a backlog and a requirements
//      file with FRs, 56 are answered by the backlog's own table, and the
//      Standard depth's counts run 3..16 with a median of 6. The sweep below
//      re-derives those figures with the shipped predicate — if the predicate
//      ever stops reproducing them, the distribution the later threshold ruling
//      will be built on has moved under it.
//
// The sweep is frozen to the cohort the ruling measured (record directories
// dated before 260809, this sensor's landing day) so the pinned figures stay
// exact as the corpus grows. Records written after it are covered by the
// growth-tolerant assertions in the same block.
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  evaluateScopeSizing,
  main,
  measureCapabilities,
} from "../../packages/framework/core/tools/amadeus-sensor-scope-sizing.ts";

const SENSOR = join(
  import.meta.dir,
  "..",
  "..",
  "packages",
  "framework",
  "core",
  "tools",
  "amadeus-sensor-scope-sizing.ts",
);

const temps: string[] = [];

function scopeDir(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "t519-scope-sizing-"));
  temps.push(root);
  const dir = join(root, "ideation", "scope-definition");
  mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, name), body, "utf-8");
  }
  return dir;
}

afterEach(() => {
  while (temps.length > 0) {
    const dir = temps.pop() as string;
    rmSync(dir, { recursive: true, force: true });
  }
});

const BACKLOG_WITH_TABLE = [
  "# Intent Backlog",
  "",
  "| 順位 | ID | Proto-Unit | MoSCoW |",
  "|---|---|---|---|",
  "| 1 | C-1 | a | Must |",
  "| 2 | C-2 | b | Must |",
  "| 3 | C-3 | c | Should |",
  "| 4 | C-4 | d | Could |",
].join("\n");

const SCOPE_DOC_WITH_LIST = ["# Scope Document", "", "## In", "", "- one", "- two", "", "## Out", "", "- three"].join("\n");

describe("t519 sibling resolution", () => {
  test("a fire on the backlog measures the backlog's table", () => {
    const dir = scopeDir({
      "intent-backlog.md": BACKLOG_WITH_TABLE,
      "scope-document.md": SCOPE_DOC_WITH_LIST,
    });
    const out = evaluateScopeSizing(join(dir, "intent-backlog.md"), "Standard");
    expect(out).toMatchObject({
      pass: true,
      findings_count: 0,
      reason: "measured",
      capabilities: 4,
      source: "backlog-table",
      depth: "Standard",
    });
  });

  test("a fire on the scope document reports the SAME number — the directory is the unit", () => {
    const dir = scopeDir({
      "intent-backlog.md": BACKLOG_WITH_TABLE,
      "scope-document.md": SCOPE_DOC_WITH_LIST,
    });
    const fromBacklog = evaluateScopeSizing(join(dir, "intent-backlog.md"), "Standard");
    const fromScopeDoc = evaluateScopeSizing(join(dir, "scope-document.md"), "Standard");
    expect(fromScopeDoc).toEqual(fromBacklog);
  });

  test("a tableless backlog falls back to the sibling scope document", () => {
    const dir = scopeDir({
      "intent-backlog.md": "# Intent Backlog\n\nprose only, no table\n",
      "scope-document.md": SCOPE_DOC_WITH_LIST,
    });
    expect(evaluateScopeSizing(join(dir, "intent-backlog.md"), "Standard")).toMatchObject({
      capabilities: 2,
      source: "scope-document-list",
      reason: "measured",
    });
  });
});

describe("t519 vacuity guards — the arms that must not silently measure", () => {
  test("no table anywhere reports no-capabilities and still passes", () => {
    const dir = scopeDir({
      "intent-backlog.md": "# Intent Backlog\n\nnothing enumerated\n",
      "scope-document.md": "# Scope Document\n\nnothing enumerated\n",
    });
    expect(evaluateScopeSizing(join(dir, "intent-backlog.md"), "Standard")).toMatchObject({
      pass: true,
      reason: "no-capabilities",
      capabilities: 0,
      source: "none",
    });
  });

  test("neither artifact on disk still passes, measuring nothing", () => {
    const dir = scopeDir({});
    expect(evaluateScopeSizing(join(dir, "intent-backlog.md"), "Standard")).toMatchObject({
      pass: true,
      reason: "no-capabilities",
      capabilities: 0,
      source: "none",
    });
  });

  test("the questions file the glob also matches measures nothing", () => {
    // scope-definition's third output is `scope-definition-questions.md`. The
    // manifest glob reaches it; the predicate must not read its 裁定 tables as
    // a capability enumeration.
    const dir = scopeDir({
      "intent-backlog.md": BACKLOG_WITH_TABLE,
      "scope-definition-questions.md": "| 質問 | 回答 |\n|---|---|\n| a | b |\n| c | d |\n",
    });
    expect(evaluateScopeSizing(join(dir, "scope-definition-questions.md"), "Standard")).toMatchObject({
      pass: true,
      reason: "not-sizing-artifact",
      capabilities: 0,
      source: "none",
    });
  });

  test("an empty backlog file is treated as absent, not as a zero-row table", () => {
    const dir = scopeDir({ "intent-backlog.md": "   \n", "scope-document.md": SCOPE_DOC_WITH_LIST });
    expect(evaluateScopeSizing(join(dir, "intent-backlog.md"), "Standard")).toMatchObject({
      capabilities: 2,
      source: "scope-document-list",
    });
  });

  test("an unreadable depth is reported as null — never guessed", () => {
    const dir = scopeDir({ "intent-backlog.md": BACKLOG_WITH_TABLE });
    expect(evaluateScopeSizing(join(dir, "intent-backlog.md"), "Deep")).toMatchObject({
      capabilities: 4,
      depth: null,
    });
    expect(evaluateScopeSizing(join(dir, "intent-backlog.md"), undefined)).toMatchObject({
      capabilities: 4,
      depth: null,
    });
  });
});

describe("t519 CLI — the measurement is in the output, not merely computed", () => {
  test("spawned: exit 0 and stdout JSON carrying count, source and depth", () => {
    const dir = scopeDir({ "intent-backlog.md": BACKLOG_WITH_TABLE });
    const res = spawnSync(
      "bun",
      [SENSOR, "--stage", "scope-definition", "--output-path", join(dir, "intent-backlog.md"), "--depth", "Standard"],
      { encoding: "utf-8", env: process.env },
    );
    expect(res.status).toBe(0);
    const out = JSON.parse(res.stdout as string) as Record<string, unknown>;
    expect(out.pass).toBe(true);
    expect(out.findings_count).toBe(0);
    expect(out.capabilities).toBe(4);
    expect(out.source).toBe("backlog-table");
    expect(out.depth).toBe("Standard");
  });

  test("in-process main writes the same measured line to stdout", () => {
    const dir = scopeDir({ "intent-backlog.md": BACKLOG_WITH_TABLE });
    const written: string[] = [];
    const realWrite = process.stdout.write;
    const realExit = process.exit;
    // Stub the two process seams main() touches. defineProperty keeps the
    // originals typed — a cast to any would disable checking on the very
    // handles this test has to put back.
    Object.defineProperty(process.stdout, "write", {
      configurable: true,
      writable: true,
      value: (chunk: string) => {
        written.push(chunk);
        return true;
      },
    });
    Object.defineProperty(process, "exit", {
      configurable: true,
      writable: true,
      value: () => undefined,
    });
    try {
      main(["--stage", "scope-definition", "--output-path", join(dir, "intent-backlog.md"), "--depth", "Minimal"]);
    } finally {
      Object.defineProperty(process.stdout, "write", {
        configurable: true,
        writable: true,
        value: realWrite,
      });
      Object.defineProperty(process, "exit", {
        configurable: true,
        writable: true,
        value: realExit,
      });
    }
    expect(written).toHaveLength(1);
    const out = JSON.parse(written[0] as string) as Record<string, unknown>;
    expect(out.capabilities).toBe(4);
    expect(out.source).toBe("backlog-table");
    expect(out.depth).toBe("Minimal");
  });

  test("a missing required flag exits 1 — the only non-zero exit", () => {
    const res = spawnSync("bun", [SENSOR, "--stage", "scope-definition"], {
      encoding: "utf-8",
      env: process.env,
    });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("--output-path is required");
  });
});

describe("t519 manifest and stage declaration", () => {
  const MANIFEST = join(
    import.meta.dir,
    "..",
    "..",
    "packages",
    "framework",
    "core",
    "sensors",
    "amadeus-scope-sizing.md",
  );
  const STAGE = join(
    import.meta.dir,
    "..",
    "..",
    "packages",
    "framework",
    "core",
    "amadeus-common",
    "stages",
    "ideation",
    "scope-definition.md",
  );

  test("the manifest declares an advisory governance sensor over scope-definition outputs", () => {
    const body = readFileSync(MANIFEST, "utf-8");
    expect(body).toContain("id: scope-sizing");
    expect(body).toContain("default_severity: advisory");
    expect(body).toContain("category: governance");
    expect(body).toContain('matches: "**/scope-definition/*.md"');
  });

  test("the manifest records that the threshold is deferred to the accumulated distribution", () => {
    // #2692's ruling: measurement first, band later. A manifest that omitted
    // this reads as a sensor whose threshold was forgotten.
    expect(readFileSync(MANIFEST, "utf-8")).toContain(
      "The threshold comes after the observed distribution accumulates (#2692)",
    );
  });

  test("scope-definition declares the sensor — compile rejects an undeclared id", () => {
    expect(readFileSync(STAGE, "utf-8")).toContain("  - scope-sizing");
  });
});

// ---------------------------------------------------------------------------
// Corpus reproduction — #2692's ruling rests on these figures
// ---------------------------------------------------------------------------

const INTENTS = join(import.meta.dir, "..", "..", "amadeus", "spaces", "default", "intents");
/** This sensor's landing day. The ruling's figures were measured over the
 *  records that existed before it; freezing the cohort keeps the pinned numbers
 *  exact while the corpus keeps growing. */
const SCAN_COHORT_BEFORE = 260809;

interface CorpusRow {
  intent: string;
  depth: string;
  capabilities: number;
  source: string;
}

function frCount(text: string): number {
  const ids = new Set<string>();
  for (const match of text.matchAll(/FR-[A-Za-z]*-?\d+\b/g)) ids.add(match[0]);
  return ids.size;
}

/** Every committed record carrying both a backlog and a requirements file with
 *  at least one FR — the same population the ruling's scan used. */
function sweepCorpus(): CorpusRow[] {
  const rows: CorpusRow[] = [];
  for (const dir of readdirSync(INTENTS)) {
    const base = join(INTENTS, dir);
    if (!statSync(base).isDirectory()) continue;
    const backlogPath = join(base, "ideation", "scope-definition", "intent-backlog.md");
    const scopeDocPath = join(base, "ideation", "scope-definition", "scope-document.md");
    const reqPath = join(base, "inception", "requirements-analysis", "requirements.md");
    if (!existsSync(backlogPath) || !existsSync(reqPath)) continue;
    if (frCount(readFileSync(reqPath, "utf-8")) === 0) continue;
    const measurement = measureCapabilities(
      readFileSync(backlogPath, "utf-8"),
      existsSync(scopeDocPath) ? readFileSync(scopeDocPath, "utf-8") : undefined,
    );
    const statePath = join(base, "amadeus-state.md");
    const depthMatch = existsSync(statePath)
      ? readFileSync(statePath, "utf-8").match(/\*\*Depth\*\*:\s*(\w+)/)
      : null;
    rows.push({
      intent: dir,
      depth: depthMatch === null ? "unknown" : (depthMatch[1] as string),
      capabilities: measurement.capabilities,
      source: measurement.source,
    });
  }
  return rows;
}

function scanCohort(rows: CorpusRow[]): CorpusRow[] {
  return rows.filter((row) => {
    const dated = row.intent.match(/^(\d{6})-/);
    return dated !== null && Number.parseInt(dated[1] as string, 10) < SCAN_COHORT_BEFORE;
  });
}

describe("t519 corpus reproduction", () => {
  const all = sweepCorpus();
  const cohort = scanCohort(all);

  test("the scan cohort is the 58 records the ruling measured", () => {
    expect(cohort).toHaveLength(58);
  });

  test("56 of the 58 are answered by the backlog's own table", () => {
    const backlogTable = cohort.filter((row) => row.source === "backlog-table");
    expect(backlogTable).toHaveLength(56);
  });

  test("the two fallback records are the ones the scan named, with their counts", () => {
    const fallbacks = cohort
      .filter((row) => row.source !== "backlog-table")
      .map((row) => ({ intent: row.intent, capabilities: row.capabilities, source: row.source }))
      .sort((a, b) => a.intent.localeCompare(b.intent));
    expect(fallbacks).toEqual([
      { intent: "260716-eoc1-gate-check", capabilities: 5, source: "scope-document-list" },
      { intent: "260720-upstream-sync-230", capabilities: 8, source: "scope-document-table" },
    ]);
  });

  test("the Standard cohort runs 3..16 with a median of 6", () => {
    const counts = cohort
      .filter((row) => row.depth === "Standard")
      .map((row) => row.capabilities)
      .sort((a, b) => a - b);
    expect(counts).toHaveLength(56);
    expect(counts[0]).toBe(3);
    expect(counts[counts.length - 1]).toBe(16);
    expect(counts[Math.floor(counts.length / 2)]).toBe(6);
  });

  test("Minimal has one record and Comprehensive none — why no band can be set yet", () => {
    // The reason #2692 defers the threshold: two of the three depth levels have
    // no observed range to place one inside
    // (project.md's c1-threshold-inside-observed-range).
    expect(cohort.filter((row) => row.depth === "Minimal").map((r) => r.capabilities)).toEqual([12]);
    expect(cohort.filter((row) => row.depth === "Comprehensive")).toHaveLength(0);
  });

  test("no record in the whole corpus measures zero — the chain always finds an enumeration", () => {
    expect(all.length).toBeGreaterThanOrEqual(58);
    expect(all.filter((row) => row.capabilities === 0)).toEqual([]);
  });
});
