// covers: function:discoverPluginStageFiles, function:compileStageGraph
// size: medium
//
// U2 plugin-skeleton performance contract. The regression case alternates the
// real zero-plugin compile and a fixed 100-plugin treatment in one process.
// The capacity case compiles 1,000 stages whose aggregate fixture stays below
// 64 MiB. Both use two warm-ups followed by ten measured runs.

import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cpus, platform, release } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { tmpdir } from "node:os";
import {
  __resetGraphCache,
  main,
} from "../../dist/claude/.claude/tools/amadeus-graph.ts";

const STAGE_BYTES = 4 * 1024;
const WARM_UP_RUNS = 2;
const MEASURED_RUNS = 10;
const COMPILE_LIMIT_MS = 10_000;
const CAPACITY_BYTES = 64 * 1024 * 1024;
const tempDirs: string[] = [];
const originalPluginRoot = process.env.AMADEUS_PLUGINS_HOST_ROOT;
const originalStageGraph = process.env.AMADEUS_STAGE_GRAPH;
const originalScopeGrid = process.env.AMADEUS_SCOPE_GRID;
const DIST_DATA = join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "data");

function stageFixture(slug: string): string {
  const prefix = `---\nslug: ${slug}\nphase: construction\nexecution: CONDITIONAL\ncondition: Performance fixture.\nlead_agent: amadeus-developer-agent\nsupport_agents: []\nmode: inline\nproduces: []\nconsumes: []\nrequires_stage: []\ninputs: none\noutputs: none\nscopes: []\n---\n\n`;
  const suffix = "\n";
  if (Buffer.byteLength(prefix) + Buffer.byteLength(suffix) > STAGE_BYTES) {
    throw new Error(`stage fixture metadata exceeds ${STAGE_BYTES} bytes`);
  }
  return `${prefix}${"x".repeat(STAGE_BYTES - Buffer.byteLength(prefix) - Buffer.byteLength(suffix))}${suffix}`;
}

function pluginHost(pluginCount: number, stagesPerPlugin: number): { root: string; bytes: number; hash: string } {
  const root = mkdtempSync(join(tmpdir(), "plugin-stage-bench-"));
  tempDirs.push(root);
  const hash = createHash("sha256");
  const records: Array<[string, {
    plugin: string;
    ownedPaths: string[];
    ownedContentDigests: Array<[string, string]>;
    stageIndex: Array<{
      path: string;
      slug: string;
      contentDigest: string;
      frontmatter: Record<string, unknown>;
    }>;
    stageIndexDigest: string;
    trustGrant: { plugin: string; contentDigest: string; grantTimestamp: string };
    sharedFiles: [];
  }]> = [];
  let bytes = 0;
  for (let pluginIndex = 0; pluginIndex < pluginCount; pluginIndex += 1) {
    const plugin = `p${pluginIndex.toString().padStart(4, "0")}`;
    const stageDir = join(root, "plugins", plugin, "stages");
    mkdirSync(stageDir, { recursive: true });
    const ownedPaths: string[] = [];
    const ownedContentDigests: Array<[string, string]> = [];
    const stageIndex: Array<{
      path: string;
      slug: string;
      contentDigest: string;
      frontmatter: Record<string, unknown>;
    }> = [];
    for (let stageOffset = 0; stageOffset < stagesPerPlugin; stageOffset += 1) {
      const slug = `p${pluginIndex.toString().padStart(4, "0")}-s${stageOffset.toString().padStart(4, "0")}`;
      const content = stageFixture(slug);
      writeFileSync(join(stageDir, `${slug}.md`), content);
      const encoded = Buffer.from(content);
      const path = `plugins/${plugin}/stages/${slug}.md`;
      const contentDigest = `sha256:${createHash("sha256").update(encoded).digest("hex")}`;
      ownedPaths.push(path);
      ownedContentDigests.push([path, contentDigest]);
      stageIndex.push({
        path,
        slug,
        contentDigest,
        frontmatter: {
          slug,
          phase: "construction",
          execution: "CONDITIONAL",
          condition: "Performance fixture.",
          lead_agent: "amadeus-developer-agent",
          support_agents: [],
          mode: "inline",
          produces: [],
          consumes: [],
          requires_stage: [],
          inputs: "none",
          outputs: "none",
          scopes: [],
        },
      });
      bytes += encoded.length;
      hash.update(slug);
      hash.update("\0");
      hash.update(encoded);
    }
    records.push([plugin, {
      plugin,
      ownedPaths,
      ownedContentDigests,
      stageIndex,
      stageIndexDigest: `sha256:${createHash("sha256").update(JSON.stringify(stageIndex)).digest("hex")}`,
      trustGrant: {
        plugin,
        contentDigest: `sha256:${"0".repeat(64)}`,
        grantTimestamp: "2026-07-25T00:00:00.000Z",
      },
      sharedFiles: [],
    }]);
  }
  const aggregateIndex = records.map(([plugin, record]) => [plugin, record.stageIndex]);
  writeFileSync(join(root, ".amadeus-plugin-composition.json"), JSON.stringify({
    ledger: [],
    plugins: records,
    pluginStageIndexDigest: `sha256:${createHash("sha256").update(JSON.stringify(aggregateIndex)).digest("hex")}`,
  }));
  copyFileSync(join(DIST_DATA, "stage-graph.json"), join(root, "stage-graph.json"));
  copyFileSync(join(DIST_DATA, "scope-grid.json"), join(root, "scope-grid.json"));
  return { root, bytes, hash: `sha256:${hash.digest("hex")}` };
}

async function compileOnce(root: string): Promise<{ elapsedMs: number; stageCount: number; outputHash: string }> {
  process.env.AMADEUS_PLUGINS_HOST_ROOT = root;
  process.env.AMADEUS_STAGE_GRAPH = join(root, "stage-graph.json");
  process.env.AMADEUS_SCOPE_GRID = join(root, "scope-grid.json");
  __resetGraphCache();
  const started = performance.now();
  await main(["compile"]);
  const elapsedMs = performance.now() - started;
  const json = readFileSync(join(root, "stage-graph.json"), "utf-8");
  const graph = JSON.parse(json) as unknown[];
  return {
    elapsedMs,
    stageCount: graph.length,
    outputHash: `sha256:${createHash("sha256").update(json).digest("hex")}`,
  };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[4] + sorted[5]) / 2;
}

afterAll(() => {
  if (originalPluginRoot === undefined) delete process.env.AMADEUS_PLUGINS_HOST_ROOT;
  else process.env.AMADEUS_PLUGINS_HOST_ROOT = originalPluginRoot;
  if (originalStageGraph === undefined) delete process.env.AMADEUS_STAGE_GRAPH;
  else process.env.AMADEUS_STAGE_GRAPH = originalStageGraph;
  if (originalScopeGrid === undefined) delete process.env.AMADEUS_SCOPE_GRID;
  else process.env.AMADEUS_SCOPE_GRID = originalScopeGrid;
  __resetGraphCache();
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe("plugin stage discovery performance (U2)", () => {
  test("100 plugins add no more than 20% to the zero-plugin median", async () => {
    const baseline = pluginHost(0, 0);
    const treatment = pluginHost(100, 1);

    for (let run = 0; run < WARM_UP_RUNS; run += 1) {
      await compileOnce(baseline.root);
      await compileOnce(treatment.root);
    }

    const baselineRuns: Awaited<ReturnType<typeof compileOnce>>[] = [];
    const treatmentRuns: Awaited<ReturnType<typeof compileOnce>>[] = [];
    for (let run = 0; run < MEASURED_RUNS; run += 1) {
      baselineRuns.push(await compileOnce(baseline.root));
      treatmentRuns.push(await compileOnce(treatment.root));
    }
    const baselineMedianMs = median(baselineRuns.map((run) => run.elapsedMs));
    const treatmentMedianMs = median(treatmentRuns.map((run) => run.elapsedMs));
    const additionalRatio = (treatmentMedianMs - baselineMedianMs) / baselineMedianMs;

    console.log(JSON.stringify({
      schema: "amadeus.plugin-discovery-benchmark.v1",
      case: "regression-100x1x4KiB",
      os: `${platform()} ${release()}`,
      cpu: cpus()[0]?.model ?? "unknown",
      bun: Bun.version,
      fixtureBytes: treatment.bytes,
      fixtureHash: treatment.hash,
      warmUpRuns: WARM_UP_RUNS,
      measuredRuns: MEASURED_RUNS,
      order: "baseline,treatment",
      baselineMs: baselineRuns.map((run) => run.elapsedMs),
      treatmentMs: treatmentRuns.map((run) => run.elapsedMs),
      baselineMedianMs,
      treatmentMedianMs,
      additionalRatio,
      discoveredStages: treatmentRuns[0].stageCount - baselineRuns[0].stageCount,
      outputHash: treatmentRuns[0].outputHash,
    }));

    expect(treatmentRuns.every((run) => run.elapsedMs < COMPILE_LIMIT_MS)).toBe(true);
    expect(treatmentRuns[0].stageCount - baselineRuns[0].stageCount).toBe(100);
    expect(additionalRatio).toBeLessThanOrEqual(0.2);
  });

  test("1,000 stages stay below 64 MiB and every measured compile stays below 10 seconds", async () => {
    const capacity = pluginHost(100, 10);
    expect(capacity.bytes).toBeLessThanOrEqual(CAPACITY_BYTES);

    for (let run = 0; run < WARM_UP_RUNS; run += 1) await compileOnce(capacity.root);
    const runs: Awaited<ReturnType<typeof compileOnce>>[] = [];
    for (let run = 0; run < MEASURED_RUNS; run += 1) runs.push(await compileOnce(capacity.root));

    console.log(JSON.stringify({
      schema: "amadeus.plugin-discovery-benchmark.v1",
      case: "capacity-1000-stages",
      os: `${platform()} ${release()}`,
      cpu: cpus()[0]?.model ?? "unknown",
      bun: Bun.version,
      fixtureBytes: capacity.bytes,
      fixtureHash: capacity.hash,
      warmUpRuns: WARM_UP_RUNS,
      measuredRuns: MEASURED_RUNS,
      compileMs: runs.map((run) => run.elapsedMs),
      discoveredStages: 1_000,
      outputHash: runs[0].outputHash,
    }));

    expect(runs.every((run) => run.elapsedMs < COMPILE_LIMIT_MS)).toBe(true);
  });
});
