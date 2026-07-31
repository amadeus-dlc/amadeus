import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const WARMUP_ROUNDS = 10;
const SAMPLE_ROUNDS = 100;
// The memory probes only need resident set size to settle, not a latency
// distribution, so they run a short loop. Keeping them cheap holds this
// benchmark's total CPU footprint near the pre-#1797 cost, which matters
// because sibling latency tests share the runner's parallel band.
const RSS_ROUNDS = 20;

const tools = join(import.meta.dir, "../../packages/framework/core/tools");
const files = [
  "amadeus-utility.ts",
  "amadeus-orchestrate.ts",
  "amadeus-state.ts",
  "amadeus-lib.ts",
];
const base = files.map((name) => readFileSync(join(tools, name), "utf-8")).join("\n");

function build(copies: number): string {
  return Array(copies).fill(base).join("\n");
}

function traverse(source: string): number {
  const file = ts.createSourceFile("source.ts", source, ts.ScriptTarget.Latest, true);
  let calls = 0;
  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) calls += 1;
    ts.forEachChild(node, visit);
  }
  visit(file);
  return calls;
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

// Resident set size cannot be compared between corpus sizes inside a single
// process: the heap is shared, never shrinks, and whichever size is measured
// second reuses the pages freed by the first. Each size therefore gets its own
// process, spawned from here so the caller still spawns this helper once.
function measureRss(copies: number): number {
  const source = build(copies);
  for (let round = 0; round < WARMUP_ROUNDS; round += 1) traverse(source);
  const samples: number[] = [];
  for (let round = 0; round < RSS_ROUNDS; round += 1) {
    traverse(source);
    samples.push(process.memoryUsage.rss());
  }
  return median(samples);
}

function spawnRss(copies: number): number {
  const self = fileURLToPath(import.meta.url);
  const result = spawnSync(process.execPath, [self, "--rss", String(copies)], {
    encoding: "utf-8",
  });
  if (result.status !== 0) {
    throw new Error(`guard corpus rss probe failed for ${copies} copies: ${result.stderr}`);
  }
  return (JSON.parse(result.stdout) as { rssBytes: number }).rssBytes;
}

const rssFlag = process.argv.indexOf("--rss");
if (rssFlag !== -1) {
  const copies = Number.parseInt(process.argv[rssFlag + 1] ?? "1", 10);
  console.log(JSON.stringify({ rssBytes: measureRss(copies) }));
} else {
  // Both corpus sizes are measured in one interleaved A/B/A/B run so they share
  // the same time window. Measuring them in separate sequential windows lets a
  // change in host load between the windows bias the ratio (issue #1797).
  const one = build(1);
  const two = build(2);
  for (let round = 0; round < WARMUP_ROUNDS; round += 1) {
    traverse(one);
    traverse(two);
  }
  const sample = (source: string) => {
    const started = performance.now();
    const calls = traverse(source);
    return { calls, elapsedMs: performance.now() - started };
  };
  const oneSamples: Array<{ calls: number; elapsedMs: number }> = [];
  const twoSamples: Array<{ calls: number; elapsedMs: number }> = [];
  for (let round = 0; round < SAMPLE_ROUNDS; round += 1) {
    oneSamples.push(sample(one));
    twoSamples.push(sample(two));
  }
  const oneRssBytes = spawnRss(1);
  const twoRssBytes = spawnRss(2);
  console.log(JSON.stringify({
    one: oneSamples.map((entry) => ({ ...entry, rssBytes: oneRssBytes })),
    two: twoSamples.map((entry) => ({ ...entry, rssBytes: twoRssBytes })),
  }));
}
