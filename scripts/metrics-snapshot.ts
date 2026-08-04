#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CCN_BLOCK_THRESHOLD, runLizard } from "../tests/complexity-gate.ts";
import { classifyTestSize } from "../tests/lib/test-size.ts";

export type CollectorResult =
  | { ok: true; name: string; tool: string; tool_version: string; values: Record<string, unknown> }
  | { ok: "skipped"; name: string; reason: string }
  | { ok: false; name: string; error: string };
export interface CollectEnv {
  repoRoot: string;
  readFile(path: string): string;
  exec(command: string[]): string;
  listFiles(path: string): string[];
  envVar(name: string): string | undefined;
}
export interface Collector { name: string; collect(env: CollectEnv): CollectorResult }
export interface Snapshot { schema_version: 1; captured_at: string; commit: string; collectors: Record<string, { tool: string; tool_version: string; values: Record<string, unknown> }> }
export type SnapshotResult = { ok: true; snapshot: Snapshot; count: number; skipped: string[] } | { ok: false; name: string; error: string };
export interface CliResult { code: 0 | 1; line: string; path?: string }

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function finite(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} must be finite`);
  return value;
}
function jsonTotals(env: CollectEnv, path: string, keys: string[]): Record<string, number> {
  const raw = JSON.parse(env.readFile(join(env.repoRoot, path))) as Record<string, unknown>;
  return Object.fromEntries(keys.map((key) => [key, finite(raw[key], `${path}.${key}`)]));
}
function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.ceil(sorted.length * fraction) - 1];
}
export function countTextLines(text: string): number {
  if (text.length === 0) return 0;
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  return lines.length;
}
export function summarizeCcn(records: readonly { ccn: number }[]): Record<string, number> {
  const values = records.map((record) => record.ccn).sort((a, b) => a - b);
  return {
    functions: values.length,
    p50: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    max: values.at(-1) ?? 0,
    over_threshold: values.filter((value) => value > CCN_BLOCK_THRESHOLD).length,
    threshold: CCN_BLOCK_THRESHOLD,
  };
}
function successful(name: string, tool: string, toolVersion: string, values: Record<string, unknown>): CollectorResult {
  for (const [key, value] of Object.entries(values)) if (typeof value === "number") finite(value, `${name}.${key}`);
  return { ok: true, name, tool, tool_version: toolVersion, values };
}
function guarded(name: string, operation: () => CollectorResult): CollectorResult {
  try { return operation(); }
  catch (error) { return { ok: false, name, error: (error as Error).message }; }
}
// owner/repo for the bug ledger queries: the CI-provided value wins, otherwise
// the origin remote in scp-like or https form. The host may carry an SSH-config
// alias prefix (git@<alias>.github.com:owner/repo), which real clones use.
const GITHUB_REMOTE = /^(?:[^@]+@|https:\/\/)(?:[\w.-]+\.)?github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/;
function githubRepository(env: CollectEnv): string {
  const provided = env.envVar("GITHUB_REPOSITORY");
  if (provided !== undefined && provided !== "") return provided;
  const remote = env.exec(["git", "remote", "get-url", "origin"]).trim();
  const parsed = GITHUB_REMOTE.exec(remote);
  if (parsed === null) throw new Error(`cannot derive owner/repo from origin remote: ${remote}`);
  return parsed[1];
}
// One Search API total_count — never paginated, so a count costs one call.
function bugCount(env: CollectEnv, repository: string, filter: string): number {
  const query = `repo:${repository} is:issue label:bug ${filter}`.trim();
  const command = ["gh", "api", "-X", "GET", "search/issues", "-f", `q=${query}`, "-f", "advanced_search=true", "--jq", ".total_count"];
  return finite(Number(env.exec(command).trim()), `bugs.total_count(${query})`);
}

export const collectors: Collector[] = [
  { name: "ccn", collect: (env) => guarded("ccn", () => {
    const result = runLizard();
    if (result.kind === "failed") throw new Error(result.detail);
    const toolVersion = env.exec(["python3", "-m", "lizard", "--version"]).trim();
    return successful("ccn", "lizard", toolVersion, summarizeCcn(result.records));
  }) },
  { name: "coverage", collect: (env) => guarded("coverage", () => {
    const values = jsonTotals(env, "coverage/coverage-totals.json", ["hits", "lines"]);
    return successful("coverage", "bun", Bun.version, { ...values, percent: values.lines === 0 ? 100 : (values.hits / values.lines) * 100 });
  }) },
  { name: "loc", collect: (env) => guarded("loc", () => {
    const files = env.exec(["git", "ls-files", "packages/framework/core", "packages/setup/src", "scripts", "tests"]).split("\n").filter(Boolean);
    const values = { core: 0, scripts: 0, tests: 0 };
    for (const file of files) {
      const lines = countTextLines(env.readFile(join(env.repoRoot, file)));
      if (file.startsWith("tests/")) values.tests += lines;
      else if (file.startsWith("scripts/")) values.scripts += lines;
      else values.core += lines;
    }
    return successful("loc", "git", env.exec(["git", "--version"]).trim(), values);
  }) },
  { name: "tests", collect: (env) => guarded("tests", () => successful(
    "tests", "amadeus-run-tests", env.exec(["git", "rev-parse", "HEAD"]).trim(),
    jsonTotals(env, "coverage/tests-totals.json", ["files", "failedFiles", "assertions", "failedAssertions"]),
  )) },
  { name: "test_pyramid", collect: (env) => guarded("test_pyramid", () => {
    const values: Record<string, number> = {};
    for (const file of env.listFiles(join(env.repoRoot, "tests")).filter((path) => path.endsWith(".test.ts"))) {
      const tier = relative(join(env.repoRoot, "tests"), file).split(/[\\/]/)[0];
      const size = classifyTestSize(env.readFile(file)).size;
      values[`${tier}_${size}`] = (values[`${tier}_${size}`] ?? 0) + 1;
    }
    return successful("test_pyramid", "amadeus-test-size", env.exec(["git", "rev-parse", "HEAD"]).trim(), values);
  }) },
  { name: "dist_size", collect: (env) => guarded("dist_size", () => successful(
    "dist_size", "node-fs", process.versions.node,
    { bytes: env.listFiles(join(env.repoRoot, "dist")).reduce((sum, path) => sum + lstatSync(path).size, 0) },
  )) },
  // Bug ledger = GitHub issues labeled `bug`; `total` is cumulative occurrence
  // and `fixed` cumulative repair, so per-period rates are derived downstream by
  // diffing the series. The only network-backed collector: without a token it
  // skips (the snapshot proceeds without it), with a token any failed call is
  // fatal rather than silently partial. open + closed is deliberately not
  // asserted against total — the calls are not atomic w.r.t. issue activity.
  { name: "bugs", collect: (env) => guarded("bugs", () => {
    if ((env.envVar("GH_TOKEN") ?? env.envVar("GITHUB_TOKEN")) === undefined) {
      return { ok: "skipped", name: "bugs", reason: "neither GH_TOKEN nor GITHUB_TOKEN is set" };
    }
    const repository = githubRepository(env);
    const count = (filter: string) => bugCount(env, repository, filter);
    const totals = { total: count(""), open: count("is:open"), closed: count("is:closed"), fixed: count("is:closed reason:completed") };
    const severity = { s1_fatal: count("label:S1-FATAL"), s2_critical: count("label:S2-CRITICAL"), s3_major: count("label:S3-MAJOR"), s4_minor: count("label:S4-MINOR") };
    return successful("bugs", "gh", env.exec(["gh", "--version"]).split("\n")[0].trim(), {
      ...totals, rejected: totals.closed - totals.fixed, ...severity,
    });
  }) },
];

export function defaultEnv(root = process.env.AMADEUS_METRICS_ROOT ?? ROOT): CollectEnv {
  return {
    repoRoot: root,
    readFile: (path) => readFileSync(path, "utf8"),
    listFiles: walk,
    envVar: (name) => process.env[name],
    exec: (command) => {
      const result = spawnSync(command[0], command.slice(1), { cwd: root, encoding: "utf8" });
      if (result.status !== 0) throw new Error((result.stderr || `${command[0]} exited ${result.status}`).trim());
      return result.stdout.trim();
    },
  };
}

export function collectSnapshot(env: CollectEnv, list: readonly Collector[] = collectors, now = new Date()): SnapshotResult {
  const output: Snapshot["collectors"] = {};
  const skipped: string[] = [];
  for (const collector of list) {
    const result = collector.collect(env);
    if (result.ok === false) return result;
    if (result.ok === "skipped") { skipped.push(result.name); continue; }
    output[result.name] = { tool: result.tool, tool_version: result.tool_version, values: result.values };
  }
  try {
    return {
      ok: true,
      count: Object.keys(output).length,
      skipped,
      snapshot: { schema_version: 1, captured_at: now.toISOString(), commit: env.exec(["git", "rev-parse", "HEAD"]).trim(), collectors: output },
    };
  } catch (error) {
    return { ok: false, name: "commit", error: (error as Error).message };
  }
}

export function runSnapshot(env: CollectEnv, list: readonly Collector[] = collectors, now = new Date()): Snapshot {
  const result = collectSnapshot(env, list, now);
  if (!result.ok) throw new Error(`collector ${result.name} failed: ${result.error}`);
  return result.snapshot;
}
export function serializeSnapshot(snapshot: Snapshot): string {
  const text = `${JSON.stringify(snapshot, null, 2)}\n`;
  if (Buffer.byteLength(text) > 16_384) throw new Error("snapshot exceeds 16384 bytes");
  return text;
}
export function writeSnapshotAtomic(root: string, snapshot: Snapshot): string {
  const dir = join(root, "metrics");
  mkdirSync(dir, { recursive: true });
  const name = `${snapshot.captured_at.replace(/[:.]/g, "-")}-${snapshot.commit.slice(0, 12)}.json`;
  const target = join(dir, name);
  if (existsSync(target)) throw new Error(`snapshot already exists: ${name}`);
  const temporary = `${target}.tmp`;
  writeFileSync(temporary, serializeSnapshot(snapshot), { encoding: "utf8", flag: "wx" });
  renameSync(temporary, target);
  return target;
}

export function runCli(
  argv: string[],
  options: { env?: CollectEnv; collectors?: readonly Collector[]; now?: Date; writer?: typeof writeSnapshotAtomic } = {},
): CliResult {
  if (argv.length !== 1 || !["--write", "--check"].includes(argv[0])) return { code: 1, line: "Usage: bun scripts/metrics-snapshot.ts --write|--check" };
  const result = collectSnapshot(options.env ?? defaultEnv(), options.collectors ?? collectors, options.now);
  if (!result.ok) return { code: 1, line: `${argv[0] === "--check" ? "CHECK " : ""}FAILED [COLLECTOR: ${result.name}] ${result.error}` };
  const tally = `${result.count} collectors${result.skipped.length === 0 ? "" : ` (skipped: ${result.skipped.join(", ")})`}`;
  if (argv[0] === "--check") return { code: 0, line: `CHECK OK ${tally}` };
  try {
    const path = (options.writer ?? writeSnapshotAtomic)((options.env ?? defaultEnv()).repoRoot, result.snapshot);
    return { code: 0, line: `OK ${tally} ${path}`, path };
  } catch (error) {
    return { code: 1, line: `FAILED [COLLECTOR: writer] ${(error as Error).message}` };
  }
}
export function main(argv: string[]): number {
  const result = runCli(argv);
  (result.code === 0 ? process.stdout : process.stderr).write(`${result.line}\n`);
  return result.code;
}
if (import.meta.main) process.exit(main(process.argv.slice(2)));
