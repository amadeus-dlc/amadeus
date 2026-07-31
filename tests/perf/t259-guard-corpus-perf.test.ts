// covers: harness-instrument:archived-guard-corpus
// size: large
//
// perf tier (#1830 FR-1): the real-time half of t259, split out of
// tests/integration/t259-guard-corpus.test.ts. The sink-guard reachability
// assertions stay in the integration file and keep running under --ci; only the
// interleaved wall-clock/RSS measurement moved here.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  callNames,
  GUARD_CORPUS_FILES as FILES,
  GUARD_CORPUS_TOOLS_DIR as TOOLS,
} from "../lib/guard-corpus-ast.ts";

const BENCHMARK_CHILD = join(import.meta.dir, "../helpers/guard-corpus-benchmark-child.ts");

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

describe("archived guard AST corpus performance", () => {
  test("AST traversal grows linearly over a duplicated corpus", () => {
    const source = FILES.map((name) => readFileSync(join(TOOLS, name), "utf-8")).join("\n");
    const one = callNames(source).length;
    const two = callNames(`${source}\n${source}`).length;
    expect(two).toBe(one * 2);
    const sinks = [
      "setActiveIntentCursor",
      "archivedNextGuard",
      "removeField",
      "transitionIntentStatusLocked",
    ];
    const oneNames = callNames(source);
    const twoNames = callNames(`${source}\n${source}`);
    const oneSinkCounts = Object.fromEntries(
      sinks.map((sink) => [sink, oneNames.filter((name) => name === sink).length]),
    );
    const twoSinkCounts = Object.fromEntries(
      sinks.map((sink) => [sink, twoNames.filter((name) => name === sink).length]),
    );
    // One spawn measures both corpus sizes interleaved, so they share a time
    // window and host load cannot bias the ratio between them (issue #1797).
    const result = spawnSync(process.execPath, [BENCHMARK_CHILD], { encoding: "utf-8" });
    expect(result.status, result.stderr).toBe(0);
    const measured = JSON.parse(result.stdout) as {
      one: Array<{ calls: number; elapsedMs: number; rssBytes: number }>;
      two: Array<{ calls: number; elapsedMs: number; rssBytes: number }>;
    };
    const oneSamples = measured.one;
    const twoSamples = measured.two;
    const oneMedianMs = median(oneSamples.map((sample) => sample.elapsedMs));
    const twoMedianMs = median(twoSamples.map((sample) => sample.elapsedMs));
    const oneRssBytes = median(oneSamples.map((sample) => sample.rssBytes));
    const twoRssBytes = median(twoSamples.map((sample) => sample.rssBytes));
    const rssMultiplier = twoRssBytes / oneRssBytes;
    expect(twoMedianMs / oneMedianMs).toBeLessThanOrEqual(2.5);
    expect(rssMultiplier).toBeLessThanOrEqual(2.5);
    console.log("GUARD_CORPUS_BENCHMARK", JSON.stringify({
      oneTotalCalls: one,
      twoTotalCalls: two,
      oneSinkCounts,
      twoSinkCounts,
      unresolved: 0,
      dynamic: 0,
      unclassified: 0,
      oneMedianMs,
      twoMedianMs,
      timeMultiplier: twoMedianMs / oneMedianMs,
      oneRssBytes,
      twoRssBytes,
      rssMultiplier,
    }));
  }, 180_000);
});
