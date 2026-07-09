#!/usr/bin/env bun
// Native Bun/TypeScript test runner for the AI-DLC harness.
//
// tests/run-tests.sh remains as a POSIX compatibility wrapper. Keep behavior
// aligned with the old runner because smoke/t05 drives the public runner
// contract: flags, tier banners, START/DONE markers, summary fields, verbose
// log dirs, debug trace locations, and the "exit == failed files" convention.

import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, delimiter, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMeta, renderMeta, type MetaCounts } from "./lib/bun-junit-to-meta.ts";
import {
  buildMeasuredRecord,
  buildTestSizeReport,
  classifyTestSize,
  parseSizeAnnotation,
  SIZE_VALUES,
  type SizeObservationBackend,
  type TestSize,
  wallClockBackend,
} from "./lib/test-size.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const BUN = process.execPath;

type Level = "smoke" | "unit" | "integration" | "e2e";
type Status = "PASS" | "FAIL" | "SKIP";

interface ParsedArgs {
  runSmoke: boolean;
  runUnit: boolean;
  runIntegration: boolean;
  runE2e: boolean;
  coverage: boolean;
  coverageDir: string;
  verbose: boolean;
  debug: boolean;
  filter: string;
  parallel: number;
  fullProfile: boolean;
}

interface ResultRow {
  name: string;
  status: Status;
  tests: number;
  failed: number;
  duration: string;
}

// Dynamic test-size measurement (#684 Phase D / #699). Collects each executed
// file's measured wall-clock duration THROUGH an observation backend seam so the
// post-run report can derive per-file size floors and wall-clock drift. Passed
// as an explicit argument from main() (not a module global) so the collection
// path stays an isolatable seam. Advisory only — nothing here affects a file's
// STATUS or the runner's exit code.
interface SizeCollector {
  readonly backend: SizeObservationBackend;
  // Absolute test-file path → measured duration in seconds.
  readonly durations: Map<string, number>;
}

function usage(): string {
  return `Usage: bash tests/run-tests.sh [LEVEL...] [PROFILE...] [OPTIONS]
       bun tests/run-tests.ts [LEVEL...] [PROFILE...] [OPTIONS]

LEVEL FLAGS (combinable, each selects exactly its level):
  --smoke         Structural validation (files exist, permissions, settings)
  --unit          Single-component isolation (hooks, frontmatter, knowledge)
  --integration   Cross-component contracts and live stage/CLI utilities
  --e2e           Full lifecycle, worktree, and rendered terminal journeys

PROFILE FLAGS (shortcuts -- map to test pyramid layers):
  (default)       smoke + unit + integration
  --ci            smoke + unit + integration
  --release       smoke + unit + integration + e2e
  --all           Same as --release

OUTPUT MODIFIERS (combinable with any tier/profile):
  --coverage      Generate an LCOV report while preserving the tiered runner
  --coverage-dir DIR
                  Directory for the combined LCOV report (default: coverage)
  --verbose       Write per-test logs to tests/logs/
  --debug         Implies --verbose; streams per-test output and writes SDK/TUI
                  driver traces to tests/logs/
  --filter PAT    Only run tests whose filename matches extended regex PAT
  --parallel N    Run up to N test files concurrently within a tier (alias: -P N).
                  Default: 1 (serial). Smoke and unit tiers always run serially.
                  Recommended range: 1-8. See docs/reference/09-testing.md.

  -h, --help      Show this help and exit

EXAMPLES:
  bash tests/run-tests.sh                        # Default levels
  bun tests/run-tests.ts                         # Native Bun entrypoint
  bash tests/run-tests.sh --ci                   # CI profile
  bash tests/run-tests.sh --release              # All levels (hours)
  bash tests/run-tests.sh --integration --debug  # Integration with traces
  bash tests/run-tests.sh --smoke --e2e          # Specific levels
  bash tests/run-tests.sh --all --debug          # Everything with traces
  bash tests/run-tests.sh --integration --filter "t25|t26" --debug
  bash tests/run-tests.sh --all --parallel 4     # 4-way parallel for larger levels
`;
}

function failUsage(message: string, code = 1): never {
  process.stderr.write(`${message}\n\n${usage()}`);
  process.exit(code);
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {
    runSmoke: false,
    runUnit: false,
    runIntegration: false,
    runE2e: false,
    coverage: false,
    coverageDir: "coverage",
    verbose: false,
    debug: false,
    filter: "",
    parallel: 1,
    fullProfile: false,
  };
  let levelSelected = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--smoke":
        out.runSmoke = true;
        levelSelected = true;
        break;
      case "--unit":
        out.runUnit = true;
        levelSelected = true;
        break;
      case "--integration":
        out.runIntegration = true;
        levelSelected = true;
        break;
      case "--e2e":
        out.runE2e = true;
        levelSelected = true;
        break;
      case "--ci":
        out.runSmoke = true;
        out.runUnit = true;
        out.runIntegration = true;
        levelSelected = true;
        break;
      case "--release":
      case "--all":
        out.runSmoke = true;
        out.runUnit = true;
        out.runIntegration = true;
        out.runE2e = true;
        out.fullProfile = true;
        levelSelected = true;
        break;
      case "--coverage":
        out.coverage = true;
        break;
      case "--coverage-dir": {
        const value = argv[++i] ?? "";
        if (!value) failUsage("--coverage-dir requires a directory");
        out.coverageDir = value;
        break;
      }
      case "--verbose":
        out.verbose = true;
        break;
      case "--debug":
        out.debug = true;
        out.verbose = true;
        break;
      case "--filter": {
        const value = argv[++i] ?? "";
        out.filter = value;
        break;
      }
      case "--parallel":
      case "-P": {
        const value = argv[++i] ?? "";
        if (!/^[1-9][0-9]*$/.test(value)) {
          process.stderr.write(
            `ERROR: --parallel requires a positive integer (got: '${value || "<missing>"}')\n`,
          );
          process.exit(2);
        }
        out.parallel = Number(value);
        break;
      }
      case "--help":
        process.stdout.write(usage());
        process.exit(0);
        break;
      case "-h":
        process.stdout.write(usage());
        process.exit(0);
        break;
      default:
        failUsage(`Unknown flag: ${arg}`);
    }
  }

  if (!levelSelected) {
    out.runSmoke = true;
    out.runUnit = true;
    out.runIntegration = true;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const coverageRoot = resolve(REPO_ROOT, args.coverageDir);
const coveragePartsDir = join(coverageRoot, ".parts");
const coverageReports: string[] = [];
let coverageCombineFailed = false;

if (args.coverage) {
  rmSync(coverageRoot, { recursive: true, force: true });
  mkdirSync(coveragePartsDir, { recursive: true });
}

let filterRegex: RegExp | null = null;
if (args.filter) {
  try {
    filterRegex = new RegExp(args.filter);
  } catch (err) {
    process.stderr.write(`ERROR: --filter must be a valid JavaScript regex: ${err}\n`);
    process.exit(2);
  }
}

function utcStamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
}

function commandExists(cmd: string): boolean {
  const r = spawnSync(cmd, ["--version"], {
    encoding: "utf8",
    stdio: "ignore",
    env: process.env,
  });
  return r.status === 0;
}

function prependPath(dir: string): void {
  const current = process.env.PATH ?? "";
  process.env.PATH = current ? `${dir}${delimiter}${current}` : dir;
}

const homeBun = join(homedir(), ".bun", "bin");
if (existsSync(homeBun)) prependPath(homeBun);

const needsLlm = args.runIntegration || args.runE2e;

const projectSettings = join(SCRIPT_DIR, "..", ".claude", "settings.json");
if (existsSync(projectSettings)) {
  try {
    const parsed = JSON.parse(readFileSync(projectSettings, "utf8")) as {
      env?: Record<string, unknown>;
    };
    for (const [key, value] of Object.entries(parsed.env ?? {})) {
      if (typeof value === "string") process.env[key] = value;
    }
  } catch (err) {
    process.stderr.write(`WARNING: could not parse ${projectSettings}: ${err}\n`);
  }
}

let logDir = "";
let cleanupLogDir = false;
if (args.verbose) {
  logDir = join(SCRIPT_DIR, "logs", utcStamp());
  mkdirSync(logDir, { recursive: true });
  process.env.AMADEUS_TEST_VERBOSE = "true";
  process.env.AMADEUS_TEST_LOG_DIR = logDir;
  process.stdout.write(`Verbose mode: logging to ${logDir}\n`);
} else {
  logDir = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "amadeus-run-tests."));
  cleanupLogDir = true;
}

const resultsDir = join(logDir, "_results");
mkdirSync(resultsDir, { recursive: true });

if (args.debug) {
  process.env.AMADEUS_TEST_DEBUG = "true";
  process.stdout.write(`Debug driver traces: ${logDir}/{sdk,tui,kiro-acp}-drive-*.ndjson\n`);
}

if (args.fullProfile && args.debug) {
  if (process.env.AMADEUS_TUI_LIVE === undefined) {
    process.env.AMADEUS_TUI_LIVE = "1";
    process.stdout.write(
      "Live TUI coverage: AMADEUS_TUI_LIVE=1 (defaulted by --all/--release --debug; set AMADEUS_TUI_LIVE=0 to keep live TUI skips)\n",
    );
  } else {
    process.stdout.write(
      `Live TUI coverage: AMADEUS_TUI_LIVE=${process.env.AMADEUS_TUI_LIVE} (explicit; --all/--release --debug did not override it)\n`,
    );
  }
}

let claudeGateOpen = true;
if (needsLlm && !commandExists("claude")) {
  process.stdout.write("WARNING: claude CLI not found -- live integration/e2e tests may fail or skip\n");
  claudeGateOpen = false;
}
// Live SDK/substrate tests (*.sdk.test.ts, driveAidlc) drive real turns on AWS
// Bedrock (CLAUDE_CODE_USE_BEDROCK), which needs valid IAM auth. The claude CLI
// being present is not enough — expired AWS creds make driveAidlc hang until the
// per-test cap. So when the aws CLI is present but `sts get-caller-identity`
// fails, close the gate and skip the live SDK tests, mirroring the CLI-missing
// skip above. When creds are valid the gate stays open and the tests run.
if (needsLlm && claudeGateOpen && commandExists("aws")) {
  const sts = spawnSync(
    "aws",
    ["sts", "get-caller-identity", "--query", "Account", "--output", "text"],
    { encoding: "utf8", timeout: 30_000, stdio: ["ignore", "pipe", "pipe"] },
  );
  if (sts.status !== 0) {
    process.stdout.write(
      "WARNING: AWS credentials invalid/expired (aws sts get-caller-identity failed) -- skipping live SDK/substrate tests\n",
    );
    claudeGateOpen = false;
  }
}

let claudeRequiredFiles = new Set<string>();
if (needsLlm) {
  const gate = spawnSync(BUN, [join(SCRIPT_DIR, "harness", "claude-gate.ts")], {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: "utf8",
  });
  if (gate.status !== 0) {
    process.stderr.write("ERROR: failed to derive Claude-dependent test files\n");
    process.stderr.write(gate.stderr ?? "");
    process.exit(2);
  }
  claudeRequiredFiles = new Set(
    (gate.stdout ?? "")
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/\\/g, "/"))
      .filter(Boolean),
  );
}

if (needsLlm && !commandExists("timeout")) {
  process.stdout.write("WARNING: timeout (GNU coreutils) not found -- live compatibility tests may fail\n");
  process.stdout.write("  Linux:  sudo yum install coreutils   # or apt-get install coreutils\n");
  process.stdout.write("  macOS:  brew install coreutils && add gnubin to PATH (see docs/reference/11-contributing.md)\n");
}

let totalFiles = 0;
let failedFiles = 0;
let totalTests = 0;
let totalFailed = 0;
const resultRows: ResultRow[] = [];

function testsRel(file: string): string {
  return `tests/${relative(SCRIPT_DIR, file).replace(/\\/g, "/")}`;
}

function isClaudeRequiredFile(file: string): boolean {
  return claudeRequiredFiles.has(testsRel(file));
}

function shouldSkipForClaude(file: string): boolean {
  return !claudeGateOpen && isClaudeRequiredFile(file);
}

function writeMeta(name: string, meta: MetaCounts | ResultRow): void {
  const status = meta.status;
  const rc = status === "FAIL" ? 1 : 0;
  const content =
    status === "SKIP"
      ? [
          `NAME=${name}`,
          "STATUS=SKIP",
          "TESTS=0",
          "FAILED=0",
          "DURATION=0",
          "RC=0",
          "",
        ].join("\n")
      : renderMeta({
          name,
          status,
          tests: meta.tests,
          failed: meta.failed,
          duration: meta.duration,
          rc,
        });
  writeFileSync(join(resultsDir, `${name}.meta`), content, "utf8");
}

function parseMeta(file: string): ResultRow {
  const row: ResultRow = {
    name: "",
    status: "PASS",
    tests: 0,
    failed: 0,
    duration: "0",
  };
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq);
    const value = line.slice(eq + 1);
    if (key === "NAME") row.name = value;
    else if (key === "STATUS" && (value === "PASS" || value === "FAIL" || value === "SKIP")) {
      row.status = value;
    } else if (key === "TESTS") row.tests = Number(value) || 0;
    else if (key === "FAILED") row.failed = Number(value) || 0;
    else if (key === "DURATION") row.duration = value || "0";
  }
  return row;
}

function aggregateTierResults(): void {
  const metas = readdirSync(resultsDir)
    .filter((f) => f.endsWith(".meta"))
    .sort()
    .map((f) => join(resultsDir, f));
  for (const meta of metas) {
    const row = parseMeta(meta);
    totalFiles += 1;
    totalTests += row.tests;
    totalFailed += row.failed;
    if (row.status === "FAIL") failedFiles += 1;
    resultRows.push(row);
  }
  for (const meta of metas) rmSync(meta, { force: true });
}

let stdoutLock: Promise<void> = Promise.resolve();

async function withStdoutLock(fn: () => void): Promise<void> {
  const prev = stdoutLock;
  let release!: () => void;
  stdoutLock = new Promise((resolvePromise) => {
    release = resolvePromise;
  });
  await prev;
  try {
    fn();
  } finally {
    release();
  }
}

function tmpFile(prefix: string): string {
  return join(process.env.TMPDIR || tmpdir(), `${prefix}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`);
}

function coverageSafeName(file: string): string {
  return relative(SCRIPT_DIR, file)
    .replace(/\\/g, "/")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "test";
}

function normalizeCoverageSourcePath(path: string): string {
  const generatedHarnessPrefixes = [
    ["dist/claude/.claude/", "packages/framework/core/"],
    ["dist/codex/.codex/", "packages/framework/core/"],
    ["dist/kiro/.kiro/", "packages/framework/core/"],
    ["dist/kiro-ide/.kiro/", "packages/framework/core/"],
    [".claude/", "packages/framework/core/"],
    [".codex/", "packages/framework/core/"],
  ] as const;
  for (const [from, to] of generatedHarnessPrefixes) {
    if (path.startsWith(from)) return `${to}${path.slice(from.length)}`;
  }
  return path;
}

function normalizeCoverageReport(body: string): string {
  interface FileCoverage {
    lines: Map<number, number>;
    functionsFound: number;
    functionsHit: number;
  }
  const files = new Map<string, FileCoverage>();
  let current: FileCoverage | null = null;

  const fileFor = (source: string): FileCoverage => {
    const normalized = normalizeCoverageSourcePath(source.replace(/\\/g, "/"));
    let file = files.get(normalized);
    if (!file) {
      file = { lines: new Map(), functionsFound: 0, functionsHit: 0 };
      files.set(normalized, file);
    }
    return file;
  };

  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith("SF:")) {
      current = fileFor(line.slice(3));
      continue;
    }
    if (!current) continue;
    if (line.startsWith("DA:")) {
      const [lineNoRaw, countRaw] = line.slice(3).split(",");
      const lineNo = Number(lineNoRaw);
      const count = Number(countRaw);
      if (Number.isInteger(lineNo) && Number.isFinite(count)) {
        current.lines.set(lineNo, (current.lines.get(lineNo) ?? 0) + count);
      }
      continue;
    }
    if (line.startsWith("FNF:")) {
      current.functionsFound = Math.max(current.functionsFound, Number(line.slice(4)) || 0);
      continue;
    }
    if (line.startsWith("FNH:")) {
      current.functionsHit = Math.max(current.functionsHit, Number(line.slice(4)) || 0);
    }
  }

  const out: string[] = [];
  for (const [source, file] of [...files.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const sortedLines = [...file.lines.entries()].sort(([a], [b]) => a - b);
    out.push("TN:", `SF:${source}`);
    if (file.functionsFound > 0 || file.functionsHit > 0) {
      out.push(`FNF:${file.functionsFound}`, `FNH:${file.functionsHit}`);
    }
    for (const [lineNo, count] of sortedLines) {
      out.push(`DA:${lineNo},${count}`);
    }
    out.push(
      `LF:${sortedLines.length}`,
      `LH:${sortedLines.filter(([, count]) => count > 0).length}`,
      "end_of_record",
    );
  }
  return out.join("\n");
}

function coverageHtmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function writeCoverageHtml(lcov: string): void {
  interface Row {
    source: string;
    lines: number;
    hits: number;
  }
  const rows: Row[] = [];
  let current: Row | null = null;
  for (const line of lcov.split(/\r?\n/)) {
    if (line.startsWith("SF:")) {
      current = { source: line.slice(3), lines: 0, hits: 0 };
      rows.push(current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith("LF:")) {
      current.lines = Number(line.slice(3)) || 0;
      continue;
    }
    if (line.startsWith("LH:")) {
      current.hits = Number(line.slice(3)) || 0;
    }
  }

  const totalLines = rows.reduce((sum, row) => sum + row.lines, 0);
  const totalHits = rows.reduce((sum, row) => sum + row.hits, 0);
  const pct = (hits: number, lines: number): string => (lines === 0 ? "100.00" : ((hits / lines) * 100).toFixed(2));
  const tableRows = rows
    .sort((a, b) => a.source.localeCompare(b.source))
    .map(
      (row) =>
        `<tr><td>${coverageHtmlEscape(row.source)}</td><td>${row.hits}</td><td>${row.lines}</td><td>${pct(row.hits, row.lines)}%</td></tr>`,
    )
    .join("\n");

  const htmlDir = join(coverageRoot, "html");
  mkdirSync(htmlDir, { recursive: true });
  writeFileSync(
    join(htmlDir, "index.html"),
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Amadeus Coverage</title>
<style>
body{font-family:system-ui,sans-serif;margin:2rem;color:#1f2937;background:#fff}
table{border-collapse:collapse;width:100%}
th,td{border-bottom:1px solid #e5e7eb;padding:.45rem .6rem;text-align:left}
th{background:#f9fafb}
td:nth-child(n+2),th:nth-child(n+2){text-align:right}
</style>
</head>
<body>
<h1>Amadeus Coverage</h1>
<p>Total line coverage: ${pct(totalHits, totalLines)}% (${totalHits}/${totalLines})</p>
<table>
<thead><tr><th>Source</th><th>Hit Lines</th><th>Lines</th><th>Coverage</th></tr></thead>
<tbody>
${tableRows}
</tbody>
</table>
</body>
</html>
`,
    "utf8",
  );
}

function combineCoverageReports(): void {
  if (!args.coverage) return;
  const combined = join(coverageRoot, "lcov.info");
  const chunks: string[] = [];
  for (const report of coverageReports.sort()) {
    if (!existsSync(report)) continue;
    const body = readFileSync(report, "utf8").trim();
    if (body.length === 0) continue;
    chunks.push(body, "");
  }
  if (chunks.length === 0) {
    process.stderr.write("ERROR: --coverage was requested, but no LCOV reports were generated\n");
    coverageCombineFailed = true;
    return;
  }
  const normalized = `${normalizeCoverageReport(chunks.join("\n").trim())}\n`;
  writeFileSync(combined, normalized, "utf8");
  writeCoverageHtml(normalized);
  process.stdout.write(`Coverage report: ${displayLogDirPath(combined)}\n`);
}

function displayLogDirPath(path: string): string {
  const rel = relative(SCRIPT_DIR, path);
  return rel.startsWith("..") ? path : rel.replace(/\\/g, "/");
}

async function runSpawnCapture(
  cmd: string,
  cmdArgs: string[],
  env: NodeJS.ProcessEnv,
  debugPrefix: string | null,
): Promise<{ rc: number; output: string }> {
  const child = spawn(cmd, cmdArgs, {
    cwd: REPO_ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const chunks: Buffer[] = [];
  let lineBuf = "";

  const onData = (chunk: Buffer): void => {
    chunks.push(chunk);
    if (debugPrefix === null) return;
    const text = chunk.toString();
    lineBuf += text;
    const lines = lineBuf.split(/\n/);
    lineBuf = lines.pop() ?? "";
    for (const line of lines) {
      process.stdout.write(`${debugPrefix}${line}\n`);
    }
  };

  child.stdout.on("data", onData);
  child.stderr.on("data", onData);

  const rc = await new Promise<number>((resolvePromise) => {
    child.on("error", (err) => {
      chunks.push(Buffer.from(String(err)));
      resolvePromise(127);
    });
    child.on("close", (code, signal) => {
      if (debugPrefix !== null && lineBuf.length > 0) {
        process.stdout.write(`${debugPrefix}${lineBuf}`);
        lineBuf = "";
      }
      resolvePromise(code ?? (signal ? 128 : 1));
    });
  });

  return { rc, output: Buffer.concat(chunks).toString("utf8") };
}

async function runBunTestFile(
  file: string,
  collector: SizeCollector,
  parallelMode = false,
): Promise<void> {
  const base = basename(file);
  const name = base.replace(/\.test\.ts$/, "");

  if (filterRegex && !filterRegex.test(base)) return;

  if (shouldSkipForClaude(file)) {
    process.stdout.write(`\n=== SKIP ${base} ===\n`);
    process.stdout.write(`--- SKIP: ${base} (Claude substrate unavailable; derived live mechanism) ---\n`);
    process.stdout.write(`=== DONE ${base} (SKIP) ===\n`);
    writeMeta(name, { name, status: "SKIP", tests: 0, failed: 0, duration: "0" });
    return;
  }

  // Disable the stage-completion artifact guard (issue #366) for the suite by
  // default: most state/orchestrate tests drive approve/advance against bare
  // fixtures that intentionally produce no artifacts, so the suite sets the env
  // bypass globally. The dedicated guard test (t185-stage-artifact-guard)
  // re-enables the guard by clearing this var in its own tool spawns, so
  // enforcement is still covered.
  //
  // Disable the human-presence gate for the suite by default for the same
  // reason: most approve/advance tests drive the gate without recording a
  // HUMAN_TURN event (the gate requires one since the last gate resolution),
  // so the suite sets the bypass globally. The dedicated guard test
  // (t188-human-presence-gate) clears this var in its own tool spawns to
  // exercise real enforcement.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    AMADEUS_TEST_NAME: base,
    AMADEUS_SKIP_ARTIFACT_GUARD: "1",
    AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1",
  };
  process.stdout.write(`\n=== START ${base} ===\n`);

  const junitXml = tmpFile("amadeus-run-tests-junit");
  const coverageDir = args.coverage
    ? join(coveragePartsDir, coverageSafeName(file))
    : "";
  const start = Date.now();
  const debugPrefix = args.debug && parallelMode ? `[${base}] ` : args.debug ? "" : null;

  if (args.debug) {
    process.stdout.write(`Debug artifacts for ${base}:\n`);
    process.stdout.write(`  log: ${displayLogDirPath(join(logDir, `${base}.log`))}\n`);
    process.stdout.write(`  driver traces: ${displayLogDirPath(logDir)}/{sdk,tui,kiro-acp}-drive-*.ndjson\n`);
  }

  const run = await runSpawnCapture(
    BUN,
    [
      "test",
      file,
      "--reporter=junit",
      `--reporter-outfile=${junitXml}`,
      ...(args.coverage
        ? ["--coverage", "--coverage-reporter=lcov", `--coverage-dir=${coverageDir}`]
        : []),
    ],
    env,
    debugPrefix,
  );
  if (args.coverage) {
    const lcov = join(coverageDir, "lcov.info");
    if (existsSync(lcov)) coverageReports.push(lcov);
  }

  let xml = "";
  try {
    if (existsSync(junitXml) && statSync(junitXml).size > 0) {
      xml = readFileSync(junitXml, "utf8");
    }
  } catch {
    xml = "";
  }
  const meta = buildMeta(xml, name, run.rc);
  // Preserve a duration even if a future Bun omits root time.
  if (meta.duration === "0") meta.duration = String(Math.max(0, (Date.now() - start) / 1000));
  writeMeta(name, meta);

  // Record this file's measured wall-clock duration through the observation seam
  // for the post-run dynamic-size report (#699). meta.duration is a string
  // (renderMeta shape); parse it and drop non-finite/missing values with a note
  // rather than polluting the report. Best-effort — never affects STATUS/exit.
  const measuredSeconds = Number(meta.duration);
  if (Number.isFinite(measuredSeconds)) {
    const observation = collector.backend.observe(file, measuredSeconds);
    collector.durations.set(file, observation.durationSeconds);
  } else {
    process.stderr.write(`NOTE: unparseable duration for ${base} (${meta.duration}); excluded from size report\n`);
  }

  const status = meta.status;
  const body = run.output;
  const doneBlock = (): void => {
    if (!args.debug) process.stdout.write(body);
    process.stdout.write(status === "FAIL" ? `--- FAIL: ${base} ---\n` : `--- PASS: ${base} ---\n`);
    process.stdout.write(`=== DONE ${base} (${status}) ===\n`);
  };
  if (parallelMode) {
    await withStdoutLock(doneBlock);
  } else {
    doneBlock();
  }

  rmSync(junitXml, { force: true });

  if (args.verbose) {
    const logFile = join(logDir, `${base}.log`);
    writeFileSync(
      logFile,
      [
        `Test: ${base}`,
        `File: ${file}`,
        `Status: ${status}`,
        `Exit code: ${run.rc}`,
        `Timestamp: ${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}`,
        "",
        "--- Output ---",
        body,
      ].join("\n"),
      "utf8",
    );
  }
}

function levelFiles(level: Level, excludes: string[] = []): string[] {
  const dir = join(SCRIPT_DIR, level);
  if (!existsSync(dir)) return [];
  const excludeSet = new Set(excludes);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".test.ts"))
    .filter((f) => !excludeSet.has(f))
    .sort()
    .map((f) => join(dir, f));
}

async function runFileBand(
  effectiveParallel: number,
  serialFiles: string[],
  parallelFiles: string[],
  collector: SizeCollector,
): Promise<void> {
  for (const file of serialFiles) await runBunTestFile(file, collector, false);
  if (effectiveParallel <= 1) {
    for (const file of parallelFiles) await runBunTestFile(file, collector, false);
    return;
  }

  const executing = new Set<Promise<void>>();
  for (const file of parallelFiles) {
    const p = runBunTestFile(file, collector, true).finally(() => {
      executing.delete(p);
    });
    executing.add(p);
    if (executing.size >= effectiveParallel) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}

async function runFilesPartitioned(
  level: Level,
  effectiveParallel: number,
  collector: SizeCollector,
  excludes: string[] = [],
): Promise<void> {
  const pinnedSerial = level === "smoke" || level === "unit";
  const serialFiles: string[] = [];
  const parallelFiles: string[] = [];
  const liveSerialFiles: string[] = [];
  const liveParallelFiles: string[] = [];

  for (const file of levelFiles(level, excludes)) {
    const serial = pinnedSerial || basename(file).includes(".serial.");
    if (serial) {
      (isClaudeRequiredFile(file) ? liveSerialFiles : serialFiles).push(file);
    } else {
      (isClaudeRequiredFile(file) ? liveParallelFiles : parallelFiles).push(file);
    }
  }

  await runFileBand(effectiveParallel, serialFiles, parallelFiles, collector);
  await runFileBand(effectiveParallel, liveSerialFiles, liveParallelFiles, collector);
}

async function runTier(level: Level, label: string, collector: SizeCollector): Promise<void> {
  const effectiveParallel = level === "smoke" || level === "unit" ? 1 : args.parallel;
  process.stdout.write("\n");
  process.stdout.write(
    effectiveParallel > 1 ? `## ${label} (parallel=${effectiveParallel})\n` : `## ${label}\n`,
  );
  await runFilesPartitioned(level, effectiveParallel, collector);
  await withStdoutLock(() => undefined);
  aggregateTierResults();
}

function printSummary(collector: SizeCollector): void {
  process.stdout.write("\n==============================\n");
  process.stdout.write("SUMMARY\n");
  process.stdout.write("==============================\n");
  process.stdout.write(`Test files: ${totalFiles}\n`);
  process.stdout.write(`Failed files: ${failedFiles}\n`);
  process.stdout.write(`Total assertions: ${totalTests}\n`);
  process.stdout.write(`Failed assertions: ${totalFailed}\n`);
  if (args.verbose && logDir) {
    process.stdout.write(`Log directory: ${displayLogDirPath(logDir)}\n`);
  }
  // Observability only — MUST NOT affect the process exit code (t112 pins
  // exit == failed-file count). Any failure here is swallowed.
  try {
    printSizeMatrix();
    reportDynamicSizes(collector);
  } catch {
    // size reporting is best-effort; never let it perturb the runner's contract
  }
  process.stdout.write("==============================\n");
  process.stdout.write(failedFiles > 0 ? "RESULT: FAIL\n" : "RESULT: PASS\n");
}

// Map an absolute test-file path to its scope tier (the directory), matching
// printSizeMatrix's classification.
function scopeOfFile(file: string): string {
  const scopes = ["smoke", "unit", "integration", "e2e"] as const;
  const relPath = relative(SCRIPT_DIR, file).replace(/\\/g, "/");
  return (scopes as readonly string[]).find((s) => relPath.startsWith(`${s}/`)) ?? "other";
}

// Dynamic test-size report (#684 Phase D / #699). Builds a MeasuredTestRecord per
// collected file (source + measured duration), aggregates them, writes the JSON
// report to tests/logs/, and prints a wall-clock drift line. ADVISORY: this
// never gates CI and, being inside printSummary's try/catch, never perturbs the
// runner's exit-code contract. Only files that actually ran this invocation are
// included, so a partial run (tier subset / --filter) reports only its subset.
function reportDynamicSizes(collector: SizeCollector): void {
  const records = [];
  for (const [file, durationSeconds] of collector.durations) {
    let source: string;
    try {
      source = readFileSync(file, "utf-8");
    } catch (err) {
      process.stderr.write(`NOTE: could not read ${testsRel(file)} for size report (${err}); excluded\n`);
      continue;
    }
    records.push(
      buildMeasuredRecord({
        file: testsRel(file),
        scope: scopeOfFile(file),
        source,
        durationSeconds,
      }),
    );
  }
  const report = buildTestSizeReport(records);

  const logsDir = join(SCRIPT_DIR, "logs");
  const reportPath = join(logsDir, "test-size-report.json");
  try {
    mkdirSync(logsDir, { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  } catch (err) {
    // Do NOT let a write failure escape into printSummary's exit path; note and
    // continue so the drift line below (pure, no I/O) still prints.
    process.stderr.write(`NOTE: could not write ${displayLogDirPath(reportPath)} (${err})\n`);
  }

  const drifted = report.records.filter((r) => r.drift.kind === "wall-clock");
  process.stdout.write(`wall-clock drift: ${drifted.length} file(s)\n`);
  for (const r of drifted) {
    if (r.drift.kind !== "wall-clock") continue; // narrows the union for the fields below
    process.stdout.write(
      `  ${r.file}: declared=${r.drift.declared} measured=${r.drift.measured} (${r.durationSeconds}s)\n`,
    );
  }
}

// Derived-size distribution (#684 / #696). Size (small/medium/large) is the
// pyramid axis and is INDEPENDENT of the scope tier (the directory). This
// reports the scope×size matrix so the pyramid shape is observable per run;
// it does not gate. Also reports how many files carry a `// size:` annotation.
function printSizeMatrix(): void {
  const scopes = ["smoke", "unit", "integration", "e2e"] as const;
  const counts: Record<string, Record<TestSize, number>> = {};
  for (const s of [...scopes, "other"]) counts[s] = { small: 0, medium: 0, large: 0 };
  let annotated = 0;
  let total = 0;
  const testsRoot = join(SCRIPT_DIR);
  const walk = (dir: string): void => {
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "logs") continue;
        walk(p);
      } else if (e.name.endsWith(".test.ts")) {
        let src: string;
        try {
          src = readFileSync(p, "utf-8");
        } catch {
          continue;
        }
        const size = classifyTestSize(src).size;
        const relPath = relative(testsRoot, p).replace(/\\/g, "/");
        const scope = (scopes as readonly string[]).find((s) => relPath.startsWith(`${s}/`)) ?? "other";
        counts[scope][size]++;
        if (parseSizeAnnotation(src).declared !== null) annotated++;
        total++;
      }
    }
  };
  walk(testsRoot);
  process.stdout.write("------------------------------\n");
  process.stdout.write("Derived test-size matrix (scope × size; size is the pyramid axis, not the directory)\n");
  process.stdout.write(`  ${"scope".padEnd(12)}${"small".padStart(7)}${"medium".padStart(8)}${"large".padStart(7)}\n`);
  for (const s of [...scopes, "other"]) {
    const r = counts[s];
    if (r.small + r.medium + r.large === 0) continue;
    process.stdout.write(`  ${s.padEnd(12)}${String(r.small).padStart(7)}${String(r.medium).padStart(8)}${String(r.large).padStart(7)}\n`);
  }
  const tot = SIZE_VALUES.reduce(
    (acc, sz) => {
      for (const s of [...scopes, "other"]) acc[sz] += counts[s][sz];
      return acc;
    },
    { small: 0, medium: 0, large: 0 } as Record<TestSize, number>,
  );
  process.stdout.write(`  ${"TOTAL".padEnd(12)}${String(tot.small).padStart(7)}${String(tot.medium).padStart(8)}${String(tot.large).padStart(7)}\n`);
  process.stdout.write(`  size-annotated files: ${annotated}/${total}\n`);
}

function writeVerboseSummary(): void {
  if (!args.verbose || !logDir) return;
  const tiersRun = [
    args.runSmoke ? "smoke" : "",
    args.runUnit ? "unit" : "",
    args.runIntegration ? "integration" : "",
    args.runE2e ? "e2e" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const lines = [
    "AI-DLC Test Run Summary",
    "======================",
    `Timestamp: ${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}`,
    `Tiers: ${tiersRun}`,
  ];
  if (args.debug) lines.push("Mode: debug (streaming + driver traces)");
  lines.push("", "Per-file results:");
  lines.push(`  ${"File".padEnd(40)} ${"Status".padEnd(6)} ${"Assertions".padStart(10)} ${"Failed".padStart(10)} ${"Duration".padStart(10)}`);
  lines.push(`  ${"----".padEnd(40)} ${"------".padEnd(6)} ${"----------".padStart(10)} ${"------".padStart(10)} ${"--------".padStart(10)}`);
  for (const row of resultRows) {
    lines.push(
      `  ${row.name.padEnd(40)} ${row.status.padEnd(6)} ${String(row.tests).padStart(10)} ${String(row.failed).padStart(10)} ${`${row.duration}s`.padStart(10)}`,
    );
  }
  lines.push(
    "",
    "Totals:",
    `  Test files: ${totalFiles}`,
    `  Failed files: ${failedFiles}`,
    `  Total assertions: ${totalTests}`,
    `  Failed assertions: ${totalFailed}`,
    `  Result: ${failedFiles > 0 ? "FAIL" : "PASS"}`,
  );
  writeFileSync(join(logDir, "summary.txt"), `${lines.join("\n")}\n`, "utf8");

  const failures: string[] = [];
  if (failedFiles > 0) {
    for (const row of resultRows) {
      if (row.status !== "FAIL") continue;
      failures.push(`FAIL: ${row.name} (${row.failed} failed assertions)`);
      const logFile = join(logDir, `${row.name}.test.ts.log`);
      if (existsSync(logFile)) {
        // bun:test marks a failing case with a line that STARTS WITH `(fail)`
        // (e.g. `(fail) my test name [0.4ms]`) and prints the assertion detail
        // on a preceding `error:` line — NOT the TAP `not ok` the legacy .sh
        // runner emitted. Capture both so failures.txt names the failing
        // assertion, not just the file. (Pre-cutover this grepped `not ok` and
        // silently captured nothing once the suite went all-TS.)
        for (const line of readFileSync(logFile, "utf8").split(/\r?\n/)) {
          const t = line.trim();
          if (t.startsWith("(fail)") || t.startsWith("error:")) {
            failures.push(`  ${t}`);
          }
        }
      }
      failures.push("");
    }
  }
  writeFileSync(join(logDir, "failures.txt"), `${failures.join("\n")}\n`, "utf8");
}

async function main(): Promise<number> {
  process.stdout.write("AI-DLC Testing Harness\n");
  process.stdout.write("======================\n");

  // Dynamic-size collector (#699), threaded through every file-running path so
  // the post-run report reflects exactly the files that executed this run.
  const sizeCollector: SizeCollector = { backend: wallClockBackend, durations: new Map() };

  if (args.runSmoke) await runTier("smoke", "Smoke Tests (structural)", sizeCollector);
  if (args.runSmoke && failedFiles > 0) {
    process.stdout.write("\nSMOKE FAILURES DETECTED -- aborting before unit/integration levels\n");
    writeVerboseSummary();
    printSummary(sizeCollector);
    return failedFiles;
  }

  if (args.runUnit) await runTier("unit", "Unit Tests (single-component isolation)", sizeCollector);

  let preflightRan = false;
  if (needsLlm && !args.filter) {
    const preflight = join(SCRIPT_DIR, "integration", "t19.test.ts");
    if (existsSync(preflight)) {
      process.stdout.write("\n## Preflight Health Check (Claude CLI validation)\n");
      await runBunTestFile(preflight, sizeCollector, false);
      preflightRan = true;
      aggregateTierResults();

      const preflightFailed = resultRows.some((r) => r.name === "t19" && r.status === "FAIL");
      if (preflightFailed) {
        process.stdout.write("\nPREFLIGHT FAILURE -- skipping remaining Claude-dependent tests\n");
        process.stdout.write("  Fix: ensure claude CLI is authenticated and API is responsive\n");
        claudeGateOpen = false;
      }
    }
  }

  if (args.runIntegration) {
    process.stdout.write("\n");
    process.stdout.write(
      args.parallel > 1
        ? `## Integration Tests (Claude CLI end-to-end) (parallel=${args.parallel})\n`
        : "## Integration Tests (Claude CLI end-to-end)\n",
    );
    await runFilesPartitioned(
      "integration",
      args.parallel,
      sizeCollector,
      preflightRan ? ["t19.test.ts"] : [],
    );
    await withStdoutLock(() => undefined);
    aggregateTierResults();
  }

  if (args.runE2e) {
    process.stdout.write("\n");
    process.stdout.write(
      args.parallel > 1
        ? `## E2E Tests (full lifecycle) (parallel=${args.parallel})\n`
        : "## E2E Tests (full lifecycle)\n",
    );
    const e2eFiles = levelFiles("e2e");
    const tuiExcludes = e2eFiles
      .map((f) => basename(f))
      .filter((b) => b.startsWith("t-tui"));
    const nonTuiExcludes = e2eFiles
      .map((f) => basename(f))
      .filter((b) => !b.startsWith("t-tui"));

    await runFilesPartitioned("e2e", args.parallel, sizeCollector, tuiExcludes);
    await withStdoutLock(() => undefined);
    aggregateTierResults();

    const tuiPreflight = join(SCRIPT_DIR, "e2e", "t-tui-preflight.serial.test.ts");
    if (existsSync(tuiPreflight)) {
      process.stdout.write("\n## E2E TUI Capability Gate\n");
      await runBunTestFile(tuiPreflight, sizeCollector, false);
      aggregateTierResults();

      const tuiPreflightFailed = resultRows.some(
        (r) => r.name.includes("preflight") && r.status === "FAIL",
      );
      if (tuiPreflightFailed) {
        process.stdout.write("\nTUI PREFLIGHT FAILURE -- skipping remaining folded TUI tests\n");
        process.stdout.write("  The terminal substrate is present but broken (e.g. node-pty under\n");
        process.stdout.write("  bun on Windows, microsoft/node-pty #748; or tmux capture empty).\n");
      } else {
        await runFilesPartitioned("e2e", args.parallel, sizeCollector, [
          ...nonTuiExcludes,
          "t-tui-preflight.serial.test.ts",
        ]);
        await withStdoutLock(() => undefined);
        aggregateTierResults();
      }
    }
  }

  writeVerboseSummary();
  combineCoverageReports();
  printSummary(sizeCollector);
  if (coverageCombineFailed && failedFiles === 0) return 1;
  return failedFiles;
}

try {
  const rc = await main();
  if (cleanupLogDir) rmSync(logDir, { recursive: true, force: true });
  process.exit(rc);
} catch (err) {
  appendFileSync(2, `${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  if (cleanupLogDir) rmSync(logDir, { recursive: true, force: true });
  process.exit(1);
}
