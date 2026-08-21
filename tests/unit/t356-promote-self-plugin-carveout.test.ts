// covers: file:scripts
// size: small
//
// t356 — composed-plugin preservation predicates in scripts/promote-self.ts
// (issue #1333, dogfood ruling 2026-07-28). Mechanism: none — pure imports of
// the script's exported helpers (main flow is guarded by import.meta.main);
// zero spawn, zero FS, zero LLM. The end-to-end fixture drive lives in
// tests/integration/t356-promote-self-plugin-carveout.integration.test.ts.
//
// WHY THIS EXISTS: the plugin engine (amadeus-plugin.ts compose) writes
// surfaces that never exist in dist/ — composed stage bodies under
// plugins/<name>/, the generated runner skill per plugin stage, the engine
// dot-state (.amadeus-plugin-*), and one extra plugin_source node inside
// tools/data/stage-graph.json. The byte-parity promote misread all of them as
// drift (ORPHAN / DIFFERS) and --apply destroyed the composition. Ownership
// is decided by the composition record — a deterministic ledger — mirroring
// the composed-scope carve-out t200 pins.
//
// WHAT IS UNDER TEST:
//   1. PLUGIN_ENGINE_STATE_RE matches exactly the engine dot-state shapes.
//   2. parsePluginLedger extracts slugs + plugins/-rooted ownedPaths, ignores
//      paths outside plugins/, and yields null on malformed content.
//   3. isPluginOwned exempts exactly the ledger-owned surfaces.
//   4. stageGraphInSync tolerates ONLY ledger-indexed plugin_source nodes and
//      still fails on unmarked extras, unknown slugs, and non-plugin drift;
//      unparseable content falls back to the byte compare (never weaker).
//   5. mergeStageGraph is byte-stable when in sync, carries plugin nodes over
//      at their spine position otherwise, and round-trips stageGraphInSync.

import { describe, expect, test } from "bun:test";
import {
  PLUGIN_ENGINE_STATE_RE,
  STAGE_GRAPH_RE,
} from "../../packages/framework/core/tools/data/self-install-allowlist.ts";
import {
  isPluginOwned,
  mergeStageGraph,
  parsePluginLedger,
  stageGraphInSync,
  type PluginLedger,
} from "../../scripts/promote-self.ts";

const buf = (value: unknown): Buffer =>
  Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf-8");

const LEDGER: PluginLedger = {
  slugs: new Set(["conformance-fixture"]),
  ownedPaths: new Set(["plugins/conformance-fixture/stages/conformance-fixture.md"]),
};

const STOCK_GRAPH = [
  { slug: "intent-capture", phase: "ideation" },
  { slug: "code-generation", phase: "construction" },
  { slug: "deployment-pipeline", phase: "operation" },
];

const PLUGIN_NODE = {
  slug: "conformance-fixture",
  phase: "construction",
  plugin_source: true,
};

// Composed graph: plugin node at its compile spine slot (after code-generation).
const COMPOSED_GRAPH = [STOCK_GRAPH[0], STOCK_GRAPH[1], PLUGIN_NODE, STOCK_GRAPH[2]];

describe("t356 plugin engine-state and graph path shapes", () => {
  test("PLUGIN_ENGINE_STATE_RE matches the engine dot-state in any engine dir", () => {
    expect(PLUGIN_ENGINE_STATE_RE.test(".claude/.amadeus-plugin-composition.json")).toBe(true);
    expect(PLUGIN_ENGINE_STATE_RE.test(".claude/.amadeus-plugin-audit.json")).toBe(true);
    expect(PLUGIN_ENGINE_STATE_RE.test(".claude/.amadeus-plugin-drops.json")).toBe(true);
    expect(PLUGIN_ENGINE_STATE_RE.test(".claude/.amadeus-plugin-src/x/plugin.json")).toBe(true);
    expect(PLUGIN_ENGINE_STATE_RE.test(".codex/.amadeus-plugin-composition.json")).toBe(true);
  });

  test("PLUGIN_ENGINE_STATE_RE does not match plugin landings or normal files", () => {
    expect(PLUGIN_ENGINE_STATE_RE.test(".claude/plugins/x/stages/x.md")).toBe(false);
    expect(PLUGIN_ENGINE_STATE_RE.test(".claude/tools/data/stage-graph.json")).toBe(false);
    expect(PLUGIN_ENGINE_STATE_RE.test(".amadeus-plugin-composition.json")).toBe(false);
  });

  test("STAGE_GRAPH_RE matches exactly the compiled graph path per engine dir", () => {
    expect(STAGE_GRAPH_RE.test(".claude/tools/data/stage-graph.json")).toBe(true);
    expect(STAGE_GRAPH_RE.test(".codex/tools/data/stage-graph.json")).toBe(true);
    expect(STAGE_GRAPH_RE.test(".claude/tools/data/scope-grid.json")).toBe(false);
    expect(STAGE_GRAPH_RE.test("tools/data/stage-graph.json")).toBe(false);
  });
});

describe("t356 parsePluginLedger", () => {
  test("extracts slugs and plugins/-rooted owned paths", () => {
    const ledger = parsePluginLedger(
      buf({
        plugins: [
          [
            "conformance-fixture",
            {
              ownedPaths: [
                "plugins/conformance-fixture/stages/conformance-fixture.md",
                "tools/amadeus-state.ts", // outside plugins/ — must NOT widen the exemption
              ],
              stageIndex: [{ slug: "conformance-fixture" }],
            },
          ],
        ],
      }),
    );
    expect(ledger).not.toBeNull();
    expect([...(ledger as PluginLedger).slugs]).toEqual(["conformance-fixture"]);
    expect([...(ledger as PluginLedger).ownedPaths]).toEqual([
      "plugins/conformance-fixture/stages/conformance-fixture.md",
    ]);
  });

  test("yields null on malformed content", () => {
    expect(parsePluginLedger(Buffer.from("not json"))).toBeNull();
    expect(parsePluginLedger(buf({ plugins: "nope" }))).toBeNull();
  });
});

describe("t356 isPluginOwned", () => {
  test("exempts ledger-owned stage bodies and plugin runner skills", () => {
    expect(
      isPluginOwned(".claude/plugins/conformance-fixture/stages/conformance-fixture.md", LEDGER),
    ).toBe(true);
    expect(isPluginOwned(".claude/skills/amadeus-conformance-fixture/SKILL.md", LEDGER)).toBe(true);
  });

  test("does not exempt unrelated paths, unknown plugins, or without a ledger", () => {
    expect(isPluginOwned(".claude/plugins/other/stages/other.md", LEDGER)).toBe(false);
    expect(isPluginOwned(".claude/skills/amadeus-code-generation/SKILL.md", LEDGER)).toBe(false);
    expect(isPluginOwned(".claude/tools/amadeus-state.ts", LEDGER)).toBe(false);
    expect(
      isPluginOwned(".claude/plugins/conformance-fixture/stages/conformance-fixture.md", null),
    ).toBe(false);
  });
});

describe("t356 stageGraphInSync", () => {
  test("tolerates the ledger-indexed plugin_source node", () => {
    expect(stageGraphInSync(buf(COMPOSED_GRAPH), buf(STOCK_GRAPH), LEDGER)).toBe(true);
  });

  test("still fails on an extra node without plugin_source", () => {
    const unmarked = [STOCK_GRAPH[0], STOCK_GRAPH[1], { slug: "conformance-fixture" }, STOCK_GRAPH[2]];
    expect(stageGraphInSync(buf(unmarked), buf(STOCK_GRAPH), LEDGER)).toBe(false);
  });

  test("still fails on a plugin_source node whose slug the ledger does not index", () => {
    const unknown = [...STOCK_GRAPH, { slug: "rogue-stage", plugin_source: true }];
    expect(stageGraphInSync(buf(unknown), buf(STOCK_GRAPH), LEDGER)).toBe(false);
  });

  test("still fails on genuine non-plugin drift", () => {
    const drifted = [{ ...STOCK_GRAPH[0], phase: "construction" }, STOCK_GRAPH[1], PLUGIN_NODE, STOCK_GRAPH[2]];
    expect(stageGraphInSync(buf(drifted), buf(STOCK_GRAPH), LEDGER)).toBe(false);
  });

  test("falls back to the byte compare without a ledger or on unparseable content", () => {
    expect(stageGraphInSync(buf(COMPOSED_GRAPH), buf(STOCK_GRAPH), null)).toBe(false);
    expect(stageGraphInSync(buf(STOCK_GRAPH), buf(STOCK_GRAPH), null)).toBe(true);
    expect(stageGraphInSync(Buffer.from("not json"), buf(STOCK_GRAPH), LEDGER)).toBe(false);
  });
});

describe("t356 mergeStageGraph", () => {
  test("returns dist bytes verbatim when no plugin node exists", () => {
    const want = buf(STOCK_GRAPH);
    expect(mergeStageGraph(buf(STOCK_GRAPH), want, LEDGER)).toEqual(want);
    expect(mergeStageGraph(null, want, LEDGER)).toEqual(want);
    expect(mergeStageGraph(buf(COMPOSED_GRAPH), want, null)).toEqual(want);
  });

  test("falls back to dist bytes on unparseable existing content", () => {
    const want = buf(STOCK_GRAPH);
    expect(mergeStageGraph(Buffer.from("not json"), want, LEDGER)).toEqual(want);
  });

  test("keeps an in-sync composed graph byte-identical (apply is byte-stable)", () => {
    const got = buf(COMPOSED_GRAPH);
    expect(mergeStageGraph(got, buf(STOCK_GRAPH), LEDGER)).toEqual(got);
  });

  test("carries the plugin node into fresh dist content at its spine position", () => {
    // Simulate dist drift: stock graph gained a field, so got is out of sync.
    const newStock = STOCK_GRAPH.map((n) => ({ ...n, fresh: true }));
    const merged = mergeStageGraph(buf(COMPOSED_GRAPH), buf(newStock), LEDGER);
    const parsed = JSON.parse(merged.toString("utf-8")) as Array<{ slug: string }>;
    expect(parsed.map((n) => n.slug)).toEqual([
      "intent-capture",
      "code-generation",
      "conformance-fixture",
      "deployment-pipeline",
    ]);
    // write⇔check symmetry: the merged output round-trips the sync predicate.
    expect(stageGraphInSync(merged, buf(newStock), LEDGER)).toBe(true);
  });
});
