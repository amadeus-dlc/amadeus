// covers: file:packages/framework/core/tools/amadeus-runner-gen.ts
// size: small
//
// U3 (#1598) — the stage-runner generator's TARGET SELECTION over a stage set.
// A composed plugin stage lands on the compiled graph carrying the compile's
// `plugin_source` provenance stamp; the generator must treat it as a runner
// target on exactly the same terms as a core stage (one `/amadeus-<slug>` runner
// from the one template), while the bootstrap initialization stages stay
// excluded. `runnerTargets` is pure over its input, so this is unit tier — no FS,
// no graph load (fs-tests-integration-first).

import { describe, expect, test } from "bun:test";
import type { GraphStage } from "../../packages/framework/core/tools/amadeus-graph.ts";
import { runnerTargets } from "../../packages/framework/core/tools/amadeus-runner-gen.ts";

// A minimal but complete GraphStage. Only slug/phase/plugin_source vary across
// the cases; everything else is the invariant shape the compiler emits.
function stage(slug: string, phase: string, pluginSource?: true): GraphStage {
  const node: GraphStage = {
    slug,
    number: "3.1",
    name: slug,
    phase,
    execution: "CONDITIONAL",
    lead_agent: "amadeus-developer-agent",
    support_agents: [],
    mode: "inline",
    produces: [],
    consumes: [],
    requires_stage: [],
    inputs: "none",
    outputs: "none",
    rules_in_context: [],
    sensors_applicable: [],
  };
  if (pluginSource !== undefined) node.plugin_source = pluginSource;
  return node;
}

describe("t350 runnerTargets (stage-runner target selection, #1598)", () => {
  test("a composed plugin stage is a runner target, like a core stage", () => {
    const core = stage("code-generation", "construction");
    const plugin = stage("conformance-fixture", "construction", true);
    expect(runnerTargets([core, plugin]).map((s) => s.slug)).toEqual([
      "code-generation",
      "conformance-fixture",
    ]);
  });

  test("bootstrap initialization stages are excluded whatever their provenance", () => {
    const coreInit = stage("workspace-detection", "initialization");
    const pluginInit = stage("plugin-bootstrap", "initialization", true);
    const runnable = stage("build-and-test", "construction");
    expect(runnerTargets([coreInit, pluginInit, runnable]).map((s) => s.slug)).toEqual([
      "build-and-test",
    ]);
  });

  test("the stock (0-plugin) selection is unchanged — every runnable core stage, in order", () => {
    const stages = [
      stage("workspace-detection", "initialization"),
      stage("intent-capture", "ideation"),
      stage("requirements-analysis", "inception"),
      stage("code-generation", "construction"),
    ];
    const selected = runnerTargets(stages);
    expect(selected.map((s) => s.slug)).toEqual([
      "intent-capture",
      "requirements-analysis",
      "code-generation",
    ]);
    // Selection returns the SAME node objects (no copy, no field rewrite): the
    // renderer reads slug/phase off the compiled node itself.
    expect(selected[0]).toBe(stages[1]);
    // And it never stamps provenance on a core node (absent, never false).
    expect(Object.hasOwn(selected[0], "plugin_source")).toBe(false);
  });

  test("an empty stage set yields no targets (no implicit fallback set)", () => {
    expect(runnerTargets([])).toEqual([]);
  });
});
