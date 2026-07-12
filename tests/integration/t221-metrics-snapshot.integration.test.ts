import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSnapshot, writeSnapshotAtomic, type CollectEnv, type Collector } from "../../scripts/metrics-snapshot.ts";

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
