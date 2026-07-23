// covers: function:migrateClosedSwarmDriverRegistryLocked, function:writeFileAtomic

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { cpus } from "node:os";
import { join, resolve } from "node:path";
import {
  migrateClosedSwarmDriverRegistryLocked,
  readIntentRegistry,
  writeFileAtomic,
  withLockedIntentRegistry,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const TARGET = "260713-swarm-driver-migration";
const BENCHMARK_CHILD = join(
  import.meta.dir,
  "..",
  "helpers",
  "status-registry-benchmark-child.ts",
);
let projectDir: string;
let registryPath: string;

beforeEach(() => {
  projectDir = join(import.meta.dir, `.tmp-status-migration-${crypto.randomUUID()}`);
  registryPath = join(
    projectDir,
    "amadeus",
    "spaces",
    "default",
    "intents",
    "intents.json",
  );
  mkdirSync(join(registryPath, ".."), { recursive: true });
});

afterEach(() => rmSync(projectDir, { recursive: true, force: true }));

function migrate() {
  return withLockedIntentRegistry(projectDir, (context) =>
    migrateClosedSwarmDriverRegistryLocked(context),
  );
}

describe("t257 byte-preserving status registry migration", () => {
  test("changes only the target status token and converges on repeated runs", () => {
    const original = [
      "[",
      '  { "uuid": "1", "slug": "other", "dirName": "other", "status": "in-flight", "note": "日本語" },',
      `  { "uuid": "2", "slug": "swarm", "dirName": "${TARGET}", "status" : "closed", "nested": { "status": "kept" } }`,
      "]",
      "",
    ].join("\n");
    writeFileSync(registryPath, original);
    migrate();
    const migrated = readFileSync(registryPath, "utf-8");
    expect(migrated).toBe(original.replace('"closed"', '"archived"'));
    expect(readIntentRegistry(projectDir).map((entry) => entry.status))
      .toEqual(["in-flight", "archived"]);

    for (let index = 0; index < 100; index++) migrate();
    expect(readFileSync(registryPath, "utf-8")).toBe(migrated);
  });

  test.each([
    [`[{"dirName":"other","status":"in-flight"}]\n`, "found 0"],
    [
      `[{"dirName":"${TARGET}","status":"closed"},{"dirName":"${TARGET}","status":"closed"}]\n`,
      "found 2",
    ],
    [
      `[{"dirName":"${TARGET}","status":"closed"},{"dirName":"other","status":"closed"}]\n`,
      "registry row 1",
    ],
  ])("validation failure preserves original bytes", (original, message) => {
    writeFileSync(registryPath, original);
    expect(migrate).toThrow(message);
    expect(readFileSync(registryPath, "utf-8")).toBe(original);
  });

  test("validates 10,000 rows with linear-growth headroom", () => {
    const rows = Array.from({ length: 10_000 }, (_, index) => ({
      uuid: String(index),
      slug: `intent-${index}`,
      dirName: index === 5_000 ? TARGET : `intent-${index}`,
      status: index === 5_000 ? "closed" : "in-flight",
    }));
    writeFileSync(registryPath, `${JSON.stringify(rows)}\n`);
    const started = performance.now();
    migrate();
    const elapsedMs = performance.now() - started;
    expect(readIntentRegistry(projectDir)).toHaveLength(10_000);
    expect(elapsedMs).toBeLessThan(2_000);
  });

  test("rejects a symlinked registry before reading migration bytes", () => {
    const external = join(projectDir, "external.json");
    writeFileSync(external, `[{"dirName":"${TARGET}","status":"closed"}]\n`);
    symlinkSync(external, registryPath);
    expect(migrate).toThrow("canonical intents directory");
    expect(readFileSync(external, "utf-8")).toContain('"closed"');
  });
});

describe("t257 durable atomic registry writer", () => {
  test.each(["beforeTempFsync", "beforeRename"] as const)(
    "%s failure preserves target bytes and cleans the unique temp",
    (failurePoint) => {
      const target = join(projectDir, "atomic.json");
      writeFileSync(target, "before\n");
      expect(() =>
        writeFileAtomic(target, "after\n", {
          [failurePoint]: () => {
            throw new Error(failurePoint);
          },
        }),
      ).toThrow(failurePoint);
      expect(readFileSync(target, "utf-8")).toBe("before\n");
      expect(readdirSync(projectDir).filter((name) => name.startsWith("atomic.json.tmp-")))
        .toEqual([]);
    },
  );

  test("directory fsync failure is loud after rename and leaves no temp", () => {
    const target = join(projectDir, "atomic.json");
    writeFileSync(target, "before\n");
    expect(() =>
      writeFileAtomic(target, "after\n", {
        beforeDirectoryFsync: () => {
          throw new Error("directory-fsync");
        },
      }),
    ).toThrow("directory-fsync");
    expect(readFileSync(target, "utf-8")).toBe("after\n");
    expect(readdirSync(projectDir).filter((name) => name.startsWith("atomic.json.tmp-")))
      .toEqual([]);
  });

  test("a real rename failure preserves the target and cleans its temp", () => {
    const target = join(projectDir, "atomic.json");
    writeFileSync(target, "before\n");
    expect(() =>
      writeFileAtomic(target, "after\n", {
        beforeRename: () => {
          unlinkSync(target);
          mkdirSync(target);
        },
      }),
    ).toThrow();
    rmSync(target, { recursive: true, force: true });
    writeFileSync(target, "before\n");
    expect(readdirSync(projectDir).filter((name) => name.startsWith("atomic.json.tmp-")))
      .toEqual([]);
  });
});

type BenchmarkSample = {
  mode: "active" | "noop";
  size: number;
  strictReadMs: number;
  migrationMs: number;
  rssDeltaBytes: number;
  fixtureSha256: string;
  correct: boolean;
};

function benchmarkChild(size: number, mode: "active" | "noop"): BenchmarkSample {
  const result = spawnSync(process.execPath, [BENCHMARK_CHILD, String(size), mode], {
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(`benchmark child failed: ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as BenchmarkSample;
}

function nearestRankP95(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? Number.NaN;
}

function currentGitSha(): string {
  const repositoryRoot = join(import.meta.dir, "..", "..");
  const dotGit = join(repositoryRoot, ".git");
  const dotGitText = statSync(dotGit).isDirectory()
    ? ""
    : readFileSync(dotGit, "utf-8").trim();
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
  const packed = readFileSync(join(commonDir, "packed-refs"), "utf-8")
    .split("\n")
    .find((line) => line.endsWith(` ${ref}`));
  if (!packed) throw new Error(`cannot resolve Git ref ${ref}`);
  return packed.split(" ", 1)[0];
}

describe("t257 status registry performance contract", () => {
  test("records complete 100-child p95, RSS pairs, growth, and provenance", () => {
    for (let index = 0; index < 10; index++) {
      benchmarkChild(10_000, "active");
      benchmarkChild(10_000, "noop");
    }

    const active = Array.from({ length: 100 }, () => benchmarkChild(10_000, "active"));
    const noop = Array.from({ length: 100 }, () => benchmarkChild(10_000, "noop"));
    const rssDifferences = active.map((sample, index) =>
      Math.max(0, sample.rssDeltaBytes - noop[index].rssDeltaBytes)
    );
    const growthSizes = [1_000, 2_000, 5_000, 10_000];
    const growth = growthSizes.map((size) => {
      const samples = Array.from({ length: 10 }, () => benchmarkChild(size, "active"));
      return {
        size,
        strictReadP95Ms: nearestRankP95(samples.map((sample) => sample.strictReadMs)),
        migrationP95Ms: nearestRankP95(samples.map((sample) => sample.migrationMs)),
        correct: samples.every((sample) => sample.correct),
      };
    });

    const result = {
      samples: active.length,
      warmups: 10,
      strictReadP95Ms: nearestRankP95(active.map((sample) => sample.strictReadMs)),
      migrationP95Ms: nearestRankP95(active.map((sample) => sample.migrationMs)),
      rssDifferenceP95MiB: nearestRankP95(rssDifferences) / (1024 * 1024),
      growth,
      growthRatio10x: {
        strictRead: growth[3].strictReadP95Ms / growth[0].strictReadP95Ms,
        migration: growth[3].migrationP95Ms / growth[0].migrationP95Ms,
      },
      correctness: active.every((sample) => sample.correct) &&
        noop.every((sample) => sample.correct) &&
        growth.every((sample) => sample.correct),
      fixtureSha256: active[0]?.fixtureSha256,
      gitSha: currentGitSha(),
      bunVersion: Bun.version,
      runnerImage: process.env.ImageOS ?? process.env.RUNNER_OS ?? "local",
      cpuModel: cpus()[0]?.model ?? "unknown",
    };
    console.log(`STATUS_REGISTRY_BENCHMARK ${JSON.stringify(result)}`);

    expect(result.samples).toBe(100);
    expect(result.correctness).toBe(true);
    expect(new Set(active.map((sample) => sample.fixtureSha256)).size).toBe(1);
    expect(result.strictReadP95Ms).toBeLessThanOrEqual(100);
    expect(result.migrationP95Ms).toBeLessThanOrEqual(250);
    expect(result.rssDifferenceP95MiB).toBeLessThanOrEqual(64);
    expect(result.growthRatio10x.strictRead).toBeLessThanOrEqual(25);
    expect(result.growthRatio10x.migration).toBeLessThanOrEqual(25);
  }, 120_000);
});
