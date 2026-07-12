import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectors, defaultEnv, main, runSnapshot, writeSnapshotAtomic, type CollectEnv, type Collector } from "../../scripts/metrics-snapshot.ts";

const roots: string[] = [];
afterEach(() => { while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true }); });
function git(root: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr);
}
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "t221-cli-")); roots.push(root);
  for (const dir of ["coverage", "dist", "tests/unit", "scripts"]) mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, "coverage", "coverage-totals.json"), '{"schemaVersion":1,"hits":5,"lines":10}');
  writeFileSync(join(root, "coverage", "tests-totals.json"), '{"files":1,"failedFiles":0,"assertions":1,"failedAssertions":0}');
  writeFileSync(join(root, "dist", "x"), "dist");
  writeFileSync(join(root, "tests", "unit", "x.test.ts"), 'import { test } from "bun:test"; test("x",()=>{});');
  writeFileSync(join(root, "scripts", "x.ts"), "export function x(v:number){ return v > 0 ? v : 0; }");
  git(root, ["init", "-q", "--initial-branch=main"]); git(root, ["config", "user.email", "test@example.com"]); git(root, ["config", "user.name", "test"]); git(root, ["add", "."]); git(root, ["commit", "-q", "-m", "fixture"]);
  return root;
}
function cli(root: string, verb: "--write" | "--check") {
  const started = performance.now();
  const result = spawnSync(process.execPath, [join(import.meta.dir, "../../scripts/metrics-snapshot.ts"), verb], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, AMADEUS_METRICS_ROOT: root, AMADEUS_COMPLEXITY_ROOTS: join(root, "scripts") },
  });
  return { ...result, elapsed: performance.now() - started };
}

describe("t221 snapshot writer and real CLI", () => {
  test("default environment and every collector read the repository fixture", () => {
    const root = fixture();
    const previousRoots = process.env.AMADEUS_COMPLEXITY_ROOTS;
    process.env.AMADEUS_COMPLEXITY_ROOTS = join(root, "scripts");
    try {
      const env = defaultEnv(root);
      expect(env.readFile(join(root, "coverage", "coverage-totals.json"))).toContain('"hits":5');
      expect(env.listFiles(join(root, "missing"))).toEqual([]);
      expect(env.listFiles(join(root, "tests"))).toContain(join(root, "tests", "unit", "x.test.ts"));
      expect(env.exec(["git", "rev-parse", "HEAD"])).toHaveLength(40);
      expect(collectors.map((collector) => collector.collect(env)).every((result) => result.ok)).toBe(true);
    } finally {
      if (previousRoots === undefined) delete process.env.AMADEUS_COMPLEXITY_ROOTS;
      else process.env.AMADEUS_COMPLEXITY_ROOTS = previousRoots;
    }
  });
  test("collector and command failures retain their boundary error", () => {
    const root = fixture();
    writeFileSync(join(root, "coverage", "coverage-totals.json"), '{"hits":"bad","lines":10}');
    expect(collectors.find(({ name }) => name === "coverage")!.collect(defaultEnv(root))).toEqual({
      ok: false,
      name: "coverage",
      error: "coverage/coverage-totals.json.hits must be finite",
    });
    expect(() => defaultEnv(root).exec(["git", "not-a-command"])).toThrow("not-a-command");
  });
  test("main writes success and failure to the matching process stream", () => {
    const root = fixture();
    const previousRoot = process.env.AMADEUS_METRICS_ROOT;
    const previousComplexityRoots = process.env.AMADEUS_COMPLEXITY_ROOTS;
    const stdout: string[] = [];
    const stderr: string[] = [];
    const stdoutWrite = process.stdout.write;
    const stderrWrite = process.stderr.write;
    process.env.AMADEUS_METRICS_ROOT = root;
    process.env.AMADEUS_COMPLEXITY_ROOTS = join(root, "scripts");
    process.stdout.write = ((value: string) => { stdout.push(value); return true; }) as typeof process.stdout.write;
    process.stderr.write = ((value: string) => { stderr.push(value); return true; }) as typeof process.stderr.write;
    try {
      expect(main(["--check"])).toBe(0);
      expect(main([])).toBe(1);
      expect(stdout.join("")).toContain("CHECK OK 6 collectors");
      expect(stderr.join("")).toContain("Usage:");
    } finally {
      process.stdout.write = stdoutWrite;
      process.stderr.write = stderrWrite;
      if (previousRoot === undefined) delete process.env.AMADEUS_METRICS_ROOT;
      else process.env.AMADEUS_METRICS_ROOT = previousRoot;
      if (previousComplexityRoots === undefined) delete process.env.AMADEUS_COMPLEXITY_ROOTS;
      else process.env.AMADEUS_COMPLEXITY_ROOTS = previousComplexityRoots;
    }
  });
  test("atomic writer creates distinct files for distinct captures", () => {
    const root = fixture();
    const env: CollectEnv = { repoRoot: root, readFile: () => "", listFiles: () => [], exec: () => "b".repeat(40) };
    const collector: Collector = { name: "x", collect: () => ({ ok: true, name: "x", tool: "x", tool_version: "1", values: { n: 1 } }) };
    const one = writeSnapshotAtomic(root, runSnapshot(env, [collector], new Date("2026-01-01T00:00:00.000Z")));
    const two = writeSnapshotAtomic(root, runSnapshot(env, [collector], new Date("2026-01-01T00:00:00.001Z")));
    expect(one).not.toBe(two); expect(existsSync(`${one}.tmp`)).toBe(false); expect(JSON.parse(readFileSync(two, "utf8")).schema_version).toBe(1);
  });
  test("collision never overwrites", () => {
    const root = fixture(); const env: CollectEnv = { repoRoot: root, readFile: () => "", listFiles: () => [], exec: () => "b".repeat(40) };
    const snapshot = runSnapshot(env, [], new Date("2026-01-01T00:00:00Z")); const path = writeSnapshotAtomic(root, snapshot); const before = readFileSync(path, "utf8");
    expect(() => writeSnapshotAtomic(root, snapshot)).toThrow("already exists"); expect(readFileSync(path, "utf8")).toBe(before);
  });
  test("writer failure leaves no partial json", () => {
    const root = fixture(); rmSync(join(root, "metrics"), { recursive: true, force: true }); writeFileSync(join(root, "metrics"), "not-a-directory");
    const env: CollectEnv = { repoRoot: root, readFile: () => "", listFiles: () => [], exec: () => "b".repeat(40) };
    expect(() => writeSnapshotAtomic(root, runSnapshot(env, []))).toThrow();
    expect(readdirSync(root).filter((name) => name.endsWith(".json"))).toEqual([]);
  });
  test("real --write runs all collectors under 10 seconds and two runs create distinct files", () => {
    const root = fixture(); const first = cli(root, "--write"); const second = cli(root, "--write");
    expect(first.status).toBe(0); expect(first.stdout.trim()).toMatch(/^OK 6 collectors .+\.json$/); expect(first.elapsed).toBeLessThan(10_000);
    expect(second.status).toBe(0); expect(readdirSync(join(root, "metrics")).filter((name) => name.endsWith(".json"))).toHaveLength(2);
  }, 20_000);
  test("real --check runs all collectors without writing", () => {
    const root = fixture(); const result = cli(root, "--check");
    expect(result.status).toBe(0); expect(result.stdout.trim()).toBe("CHECK OK 6 collectors"); expect(existsSync(join(root, "metrics"))).toBe(false);
  }, 10_000);
});
