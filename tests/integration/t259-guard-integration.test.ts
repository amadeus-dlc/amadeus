// covers: subcommand:amadeus-utility:intent function:archivedNextGuard subcommand:amadeus-state:unpark
// @test-size medium
import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { cpus, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = join(import.meta.dir, "../..");
const UTILITY = join(ROOT, "packages/framework/core/tools/amadeus-utility.ts");
const ORCHESTRATE = join(ROOT, "packages/framework/core/tools/amadeus-orchestrate.ts");
const STATE = join(ROOT, "packages/framework/core/tools/amadeus-state.ts");
const BENCHMARK_CHILD = join(ROOT, "tests/helpers/guard-integration-benchmark-child.ts");
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function scaffold(status: string, human = false, parked = false) {
  const root = mkdtempSync(join(tmpdir(), "guard-integration-"));
  roots.push(root);
  const intent = "260723-example";
  const intents = join(root, "amadeus", "spaces", "default", "intents");
  const record = join(intents, intent);
  const auditDir = join(record, "audit");
  mkdirSync(auditDir, { recursive: true });
  const state = join(record, "amadeus-state.md");
  writeFileSync(
    state,
    `# AI-DLC State Tracking

## Workflow Identity

- **Scope**: feature
- **Status**: Running
- **Current Stage**: requirements-analysis

## Runtime State

${parked ? "- **Parked**: 2026-07-23T10:00:00Z\n- **Parked At Stage**: requirements-analysis\n" : ""}

## Stage Progress

- [ ] 2.3 Requirements Analysis \`requirements-analysis\`
`,
  );
  const registry = join(intents, "intents.json");
  writeFileSync(registry, `${JSON.stringify([{
    uuid: "123e4567-e89b-42d3-a456-426614174000",
    slug: "example",
    dirName: intent,
    status,
  }], null, 2)}\n`);
  const cursor = join(intents, "active-intent");
  writeFileSync(cursor, `${intent}\n`);
  const audit = join(auditDir, "fixture.md");
  writeFileSync(
    audit,
    human
      ? "# AI-DLC Audit Log\n\n## Human Turn\n**Timestamp**: 2026-07-23T10:00:00Z\n**Event**: HUMAN_TURN\n\n---\n"
      : "# AI-DLC Audit Log\n",
  );
  return { root, intent, state, registry, cursor, audit };
}

function run(tool: string, root: string, args: string[]) {
  return spawnSync(process.execPath, [tool, ...args, "--project-dir", root], {
    encoding: "utf-8",
  });
}

function unchanged(paths: string[]): string[] {
  return paths.map((path) => readFileSync(path, "utf-8"));
}

function currentGitSha(repositoryRoot: string): string {
  const dotGit = join(repositoryRoot, ".git");
  const dotGitText = statSync(dotGit).isDirectory()
    ? ""
    : readFileSync(dotGit, "utf-8");
  const gitDir = dotGitText.startsWith("gitdir:")
    ? resolve(repositoryRoot, dotGitText.slice("gitdir:".length).trim())
    : dotGit;
  const head = readFileSync(join(gitDir, "HEAD"), "utf-8").trim();
  if (!head.startsWith("ref:")) return head;
  const ref = head.slice("ref:".length).trim();
  const looseRef = join(gitDir, ref);
  if (existsSync(looseRef)) return readFileSync(looseRef, "utf-8").trim();
  const commonDirPath = join(gitDir, "commondir");
  const commonDir = existsSync(commonDirPath)
    ? join(gitDir, readFileSync(commonDirPath, "utf-8").trim())
    : gitDir;
  const packed = readFileSync(join(commonDir, "packed-refs"), "utf-8");
  const line = packed.split("\n").find((entry) => entry.endsWith(` ${ref}`));
  if (!line) throw new Error(`Unable to resolve Git ref ${ref}`);
  return line.split(" ")[0];
}

type BenchmarkSample = {
  operation: string;
  status: string;
  elapsedMs: number;
  rssDeltaBytes: number;
  fixtureSha256: string;
  correct: boolean;
};

function benchmark(operation: string, status: string, count: number): BenchmarkSample[] {
  const result = spawnSync(process.execPath, [
    BENCHMARK_CHILD,
    operation,
    status,
    String(count),
  ], {
    encoding: "utf-8",
  });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as BenchmarkSample[];
}

function p95(values: number[]): number {
  return [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];
}

describe("guard integration falling proofs", () => {
  test.each([
    ["record dir", "260723-example"],
    ["slug", "example"],
  ])("selector rejects archived by %s without cursor/registry/audit mutation", (_, selector) => {
    const fixture = scaffold("archived");
    const paths = [fixture.cursor, fixture.registry, fixture.audit];
    const before = unchanged(paths);
    const result = run(UTILITY, fixture.root, ["intent", selector]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("status archived");
    expect(result.stderr).toContain(`intent unarchive '${fixture.intent}'`);
    expect(unchanged(paths)).toEqual(before);
  });

  test("selector keeps allowed intent behavior", () => {
    const fixture = scaffold("in-flight");
    const result = run(UTILITY, fixture.root, ["intent", "example"]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(`Active intent → ${fixture.intent}`);
  });

  test("stale archived cursor makes next return exactly one error directive", () => {
    const fixture = scaffold("archived");
    const paths = [fixture.cursor, fixture.registry, fixture.state, fixture.audit];
    const before = unchanged(paths);
    const result = run(ORCHESTRATE, fixture.root, ["next"]);
    expect(result.status, result.stderr).toBe(0);
    const lines = result.stdout.trim().split("\n");
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({
      kind: "error",
      message: expect.stringContaining("status archived"),
    });
    expect(unchanged(paths)).toEqual(before);
  });

  test.each([false, true])(
    "unpark rejects archived when parked=%p without mutation",
    (parked) => {
      const fixture = scaffold("archived", false, parked);
      const paths = [fixture.registry, fixture.state, fixture.audit];
      const before = unchanged(paths);
      const result = run(STATE, fixture.root, ["unpark"]);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("status archived");
      expect(unchanged(paths)).toEqual(before);
    },
  );

  test("utility delegates archive and transparently returns state output", () => {
    const fixture = scaffold("in-flight", true);
    const result = run(UTILITY, fixture.root, [
      "intent",
      "archive",
      "example",
    ]);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      intent: fixture.intent,
      status: "archived",
    });
    expect(JSON.parse(readFileSync(fixture.registry, "utf-8"))[0].status).toBe(
      "archived",
    );
  });

  test("utility preserves state child failure stderr and exit", () => {
    const fixture = scaffold("in-flight", false);
    const result = run(UTILITY, fixture.root, [
      "intent",
      "archive",
      fixture.intent,
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "archive/unarchive requires an unconsumed HUMAN_TURN",
    );
    expect(result.stdout).toBe("");
  });

  test("eight concurrent archived selectors fail without shared-state mutation", async () => {
    const fixture = scaffold("archived");
    const paths = [fixture.cursor, fixture.registry, fixture.audit];
    const before = unchanged(paths);
    const children = Array.from({ length: 8 }, () => Bun.spawn(
      [process.execPath, UTILITY, "intent", "example", "--project-dir", fixture.root],
      { stdout: "pipe", stderr: "pipe" },
    ));
    const exits = await Promise.all(children.map((child) => child.exited));
    expect(exits).toEqual(Array(8).fill(1));
    expect(unchanged(paths)).toEqual(before);
  });

  test("10k-row guard overhead remains bounded for all operations", () => {
    const operations = ["select", "next", "unpark"] as const;
    for (const operation of operations) {
      benchmark(operation, "in-flight", 10);
      benchmark(operation, "archived", 10);
      const allowed = benchmark(operation, "in-flight", 100);
      const archived = benchmark(operation, "archived", 100);
      expect(allowed.every((sample) => sample.correct)).toBe(true);
      expect(archived.every((sample) => sample.correct)).toBe(true);
      expect(new Set([...allowed, ...archived].map((sample) => sample.fixtureSha256)).size).toBe(2);
      expect(p95(archived.map((sample) => sample.elapsedMs))
        - p95(allowed.map((sample) => sample.elapsedMs))).toBeLessThanOrEqual(100);
      expect(p95(archived.map((sample) => sample.rssDeltaBytes))
        - p95(allowed.map((sample) => sample.rssDeltaBytes))).toBeLessThanOrEqual(16 * 1024 * 1024);
      console.log("GUARD_INTEGRATION_BENCHMARK", JSON.stringify({
        gitSha: currentGitSha(ROOT),
        cpu: cpus()[0]?.model ?? "unknown",
        operation,
        allowedP95Ms: p95(allowed.map((sample) => sample.elapsedMs)),
        archivedP95Ms: p95(archived.map((sample) => sample.elapsedMs)),
        pairwiseDifferenceP95Ms: p95(archived.map(
          (sample, index) => sample.elapsedMs - allowed[index].elapsedMs,
        )),
        archivedP95RssDeltaBytes: p95(archived.map((sample) => sample.rssDeltaBytes)),
        allowedP95RssDeltaBytes: p95(allowed.map((sample) => sample.rssDeltaBytes)),
        pairwiseRssDifferenceP95Bytes: p95(archived.map(
          (sample, index) => sample.rssDeltaBytes - allowed[index].rssDeltaBytes,
        )),
        allowedCorrect: allowed.filter((sample) => sample.correct).length,
        archivedCorrect: archived.filter((sample) => sample.correct).length,
        fixtureSha256: archived[0].fixtureSha256,
      }));
    }
  });
});
