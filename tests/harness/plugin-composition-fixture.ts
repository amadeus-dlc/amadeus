// Test harness for a COMPOSED plugin host.
//
// A plugin stage on disk is only trusted because the composition record vouches
// for it: owned paths, per-file digests, a stage index, a trust grant, and the
// aggregate index digest that binds every plugin's index at once. Both the
// compile-time reader and the runtime trust check re-derive those digests, so a
// fixture that writes the stage without the record is testing the refusal path
// whether it means to or not.
//
// This builds the record the way compose does, so a test can start from a
// genuinely trusted host and then break exactly one thing.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { parseStageFrontmatter } from "../../packages/framework/core/tools/amadeus-lib.ts";

export const COMPOSITION_RECORD = ".amadeus-plugin-composition.json";

export type CompositionRecord = {
  ledger: [];
  plugins: Array<[string, Record<string, unknown>]>;
  pluginStageIndexDigest?: string;
};

/**
 * A valid stage frontmatter body (every required field). The optional overrides
 * let a case set sensors / scopes / phase without re-authoring the block.
 */
export function stageMd(
  slug: string,
  opts: { phase?: string; sensors?: string[]; scopes?: string[]; leadAgent?: string } = {},
): string {
  const phase = opts.phase ?? "construction";
  // The stage frontmatter parser takes block-style YAML lists, not inline [...].
  const sensors = opts.sensors ? `sensors:\n${opts.sensors.map((s) => `  - ${s}`).join("\n")}\n` : "";
  const scopes = (opts.scopes ?? []).length
    ? `scopes:\n${(opts.scopes ?? []).map((s) => `  - ${s}`).join("\n")}\n`
    : "scopes: []\n";
  const lead = opts.leadAgent ?? "amadeus-developer-agent";
  return (
    "---\n" +
    `slug: ${slug}\n` +
    `phase: ${phase}\n` +
    "execution: CONDITIONAL\n" +
    "condition: Opt-in via --single.\n" +
    `lead_agent: ${lead}\n` +
    "support_agents: []\n" +
    "mode: inline\n" +
    "produces: []\n" +
    "consumes: []\n" +
    "requires_stage: []\n" +
    "inputs: none\n" +
    "outputs: none\n" +
    sensors +
    scopes +
    `---\n\nPlugin stage body for ${slug}.\n`
  );
}

export function recordPathOf(host: string): string {
  return join(host, COMPOSITION_RECORD);
}

export function readCompositionRecord(host: string): CompositionRecord {
  return JSON.parse(readFileSync(recordPathOf(host), "utf-8")) as CompositionRecord;
}

/** Recompute the aggregate index digest and persist — compose's last write. */
export function rewriteAggregateDigest(host: string, persisted: CompositionRecord): void {
  const aggregateIndex = persisted.plugins.map(([name, pluginRecord]) => [
    name,
    (pluginRecord as { stageIndex?: unknown[] }).stageIndex ?? [],
  ]);
  persisted.pluginStageIndexDigest = `sha256:${
    createHash("sha256").update(JSON.stringify(aggregateIndex)).digest("hex")
  }`;
  writeFileSync(recordPathOf(host), JSON.stringify(persisted));
}

/**
 * Write a plugin stage at `<host>/plugins/<plugin>/stages/<file>` and record it
 * as compose would. Returns the absolute stage path.
 */
export function writePluginStage(host: string, plugin: string, file: string, content: string): string {
  const dir = join(host, "plugins", plugin, "stages");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, file);
  writeFileSync(path, content);
  const pluginPath = `plugins/${plugin}/stages/${file}`;
  const persisted: CompositionRecord = existsSync(recordPathOf(host))
    ? readCompositionRecord(host)
    : { ledger: [], plugins: [] };
  const digest = `sha256:${createHash("sha256").update(content).digest("hex")}`;
  const existing = persisted.plugins.find(([name]) => name === plugin)?.[1] as {
    ownedPaths?: string[];
    ownedContentDigests?: Array<[string, string]>;
    stageIndex?: Array<{
      path: string;
      slug: string;
      contentDigest: string;
      frontmatter: Record<string, unknown>;
    }>;
  } | undefined;
  const stageIndex = [...(existing?.stageIndex ?? []), {
    path: pluginPath,
    slug: file.replace(/\.md$/, ""),
    contentDigest: digest,
    frontmatter: parseStageFrontmatter(content),
  }];
  const record = {
    plugin,
    ownedPaths: [...(existing?.ownedPaths ?? []), pluginPath],
    ownedContentDigests: [
      ...(existing?.ownedContentDigests ?? []),
      [pluginPath, digest] as [string, string],
    ],
    stageIndex,
    stageIndexDigest: `sha256:${createHash("sha256").update(JSON.stringify(stageIndex)).digest("hex")}`,
    trustGrant: {
      plugin,
      contentDigest: `sha256:${"0".repeat(64)}`,
      grantTimestamp: "2026-07-25T00:00:00.000Z",
    },
    sharedFiles: [],
  };
  persisted.plugins = [...persisted.plugins.filter(([name]) => name !== plugin), [plugin, record]];
  rewriteAggregateDigest(host, persisted);
  return path;
}

/**
 * Rewrite the first plugin's record through `mutate`.
 *
 * `refreshAggregate` decides WHICH guard the case is aiming at: refreshing it
 * keeps the aggregate digest honest so the per-entry checks are what refuse,
 * while leaving it stale is what a hand edit of the record looks like.
 * `refreshIndexDigest` does the same for the plugin's own index digest, which
 * the runtime trust check re-derives independently.
 */
export function mutateCompositionRecord(
  host: string,
  mutate: (record: Record<string, unknown>) => void,
  { refreshAggregate = true, refreshIndexDigest = false }: {
    refreshAggregate?: boolean;
    refreshIndexDigest?: boolean;
  } = {},
): void {
  const persisted = readCompositionRecord(host);
  const entry = persisted.plugins[0];
  if (entry === undefined) throw new Error("no plugin record to mutate");
  mutate(entry[1]);
  if (refreshIndexDigest) {
    const index = (entry[1] as { stageIndex?: unknown[] }).stageIndex ?? [];
    (entry[1] as { stageIndexDigest: string }).stageIndexDigest = `sha256:${
      createHash("sha256").update(JSON.stringify(index)).digest("hex")
    }`;
  }
  if (refreshAggregate) rewriteAggregateDigest(host, persisted);
  else writeFileSync(recordPathOf(host), JSON.stringify(persisted));
}
