// covers: file:packages/framework/core/tools/amadeus-runner-gen.ts
// size: medium
//
// U3 (#1598) — a COMPOSED PLUGIN stage must get the same typeable
// `/amadeus-<slug>` stage-runner a core stage gets, and must lose it again when
// the plugin is dropped. Driven IN-PROCESS through handleWrite(skillsDir) over a
// fixture stage-graph.json (AMADEUS_STAGE_GRAPH seam) so the generator's real
// write/prune path is instrumented (bun --coverage does not instrument spawned
// children — seam-export-handler-amend). Touches a real temp filesystem, hence
// integration tier (fs-tests-integration-first).
//
// The composed-host fixture is the compiled state a real compose leaves behind:
// the committed graph PLUS one plugin-joined node carrying `plugin_source: true`
// (what amadeus-graph.ts's plugin join stamps). Dropping the plugin is the same
// graph without that node — exactly what the post-drop recompile emits.
//
// FR-4c (stock invariance) is pinned two ways here: the stock runner bytes are
// byte-identical with and without a plugin on the graph, and a second write is
// byte-identical to the first (idempotence). The repo-level guarantee (the
// shipped tree, t129's 29/3) is held by t129 + dist:check.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { type GraphStage, __resetGraphCache } from "../../packages/framework/core/tools/amadeus-graph.ts";
import { _resetStageGraphForTests } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  handleWrite,
  renderStageRunner,
  runnableStages,
} from "../../packages/framework/core/tools/amadeus-runner-gen.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
// The canonical core tree ships no compiled stage-graph.json; the shipped
// surface does, so the fixture seeds from the committed dist graph (mirrors
// t-plugin-stage-error's COMMITTED_GRAPH discipline).
const COMMITTED_GRAPH = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");

const PLUGIN_SLUG = "conformance-fixture";

let work = "";
let savedGraphEnv: string | undefined;

// One plugin-joined graph node, in the shape amadeus-graph.ts emits for a
// composed plugin stage: a normal stage row plus the `plugin_source` stamp.
function pluginNode(): Record<string, unknown> {
  return {
    slug: PLUGIN_SLUG,
    number: "3.99",
    name: "Formal Model Check",
    phase: "construction",
    plugin_source: true,
    execution: "CONDITIONAL",
    condition: "Opt-in via --single.",
    lead_agent: "amadeus-developer-agent",
    support_agents: [],
    mode: "inline",
    produces: [],
    consumes: [],
    requires_stage: [],
    scopes: [],
    inputs: "none",
    outputs: "none",
    rules_in_context: [],
    sensors_applicable: [],
  };
}

/** Write a fixture graph file and point the loader at it (both caches reset). */
function useGraph(name: string, stages: unknown[]): string {
  const path = join(work, name);
  writeFileSync(path, `${JSON.stringify(stages, null, 2)}\n`, "utf-8");
  process.env.AMADEUS_STAGE_GRAPH = path;
  __resetGraphCache();
  _resetStageGraphForTests();
  return path;
}

function committedStages(): unknown[] {
  return JSON.parse(readFileSync(COMMITTED_GRAPH, "utf-8")) as unknown[];
}

function runnerDirs(skills: string): string[] {
  return readdirSync(skills, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** Every SKILL.md under `skills`, keyed by dir name — for byte comparison. */
function snapshot(skills: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const dir of runnerDirs(skills)) {
    const p = join(skills, dir, "SKILL.md");
    if (existsSync(p)) out.set(dir, readFileSync(p, "utf-8"));
  }
  return out;
}

function freshSkillsDir(name: string): string {
  const dir = join(work, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "amadeus-t351-"));
  savedGraphEnv = process.env.AMADEUS_STAGE_GRAPH;
});

afterEach(() => {
  if (savedGraphEnv === undefined) delete process.env.AMADEUS_STAGE_GRAPH;
  else process.env.AMADEUS_STAGE_GRAPH = savedGraphEnv;
  __resetGraphCache();
  _resetStageGraphForTests();
  rmSync(work, { recursive: true, force: true });
});

describe("t351 stage-runner generation for a composed plugin stage (#1598)", () => {
  test("the plugin stage has NO runner until write runs, then gets the standard one", () => {
    useGraph("graph-with-plugin.json", [...committedStages(), pluginNode()]);
    const skills = freshSkillsDir("skills-compose");
    const runner = join(skills, `amadeus-${PLUGIN_SLUG}`, "SKILL.md");

    // Falling proof: a composed+recompiled host that never regenerates runners
    // has the stage on the graph and no way to type it (#1598's defect).
    expect(runnableStages().some((s) => s.slug === PLUGIN_SLUG)).toBe(true);
    expect(existsSync(runner)).toBe(false);

    const written = handleWrite(skills);
    expect(written).toContain(PLUGIN_SLUG);
    expect(existsSync(runner)).toBe(true);

    const body = readFileSync(runner, "utf-8");
    // The drift guard's on-disk runner SIGNATURE — the same markers a core
    // stage-runner carries, so the plugin runner participates in check/prune.
    expect(body).toContain(`--stage ${PLUGIN_SLUG}`);
    expect(body).toContain("--single");
    // One template, no plugin-specific copy (BR-U3-2).
    const node = runnableStages().find((s) => s.slug === PLUGIN_SLUG) as GraphStage;
    expect(body).toBe(renderStageRunner(node));
  });

  test("dropping the plugin (its node leaves the graph) prunes the runner, keeping the rest", () => {
    useGraph("graph-with-plugin.json", [...committedStages(), pluginNode()]);
    const skills = freshSkillsDir("skills-lifecycle");
    // A hand-made NON-runner skill must survive the prune (no `--single` marker).
    const keep = join(skills, "amadeus-my-notes");
    mkdirSync(keep, { recursive: true });
    writeFileSync(join(keep, "SKILL.md"), "---\nname: amadeus-my-notes\n---\n# notes\n", "utf-8");

    handleWrite(skills);
    const composed = runnerDirs(skills);
    expect(composed).toContain(`amadeus-${PLUGIN_SLUG}`);

    // Post-drop recompile: the same graph without the plugin node.
    useGraph("graph-stock.json", committedStages());
    handleWrite(skills);

    const dropped = runnerDirs(skills);
    expect(dropped).not.toContain(`amadeus-${PLUGIN_SLUG}`);
    // Everything else is untouched — only the dropped slug's runner went.
    expect(dropped).toEqual(composed.filter((d) => d !== `amadeus-${PLUGIN_SLUG}`));
    expect(existsSync(join(keep, "SKILL.md"))).toBe(true);
  });

  test("stock runner bytes are unaffected by a plugin on the graph (FR-4c)", () => {
    useGraph("graph-stock.json", committedStages());
    const stockOnly = freshSkillsDir("skills-stock");
    handleWrite(stockOnly);
    const before = snapshot(stockOnly);

    useGraph("graph-with-plugin.json", [...committedStages(), pluginNode()]);
    const withPlugin = freshSkillsDir("skills-with-plugin");
    handleWrite(withPlugin);
    const after = snapshot(withPlugin);

    // Exactly one added runner; every pre-existing one byte-identical.
    expect([...after.keys()].sort()).toEqual([...before.keys(), `amadeus-${PLUGIN_SLUG}`].sort());
    expect(before.size).toBeGreaterThan(0);
    for (const [dir, body] of before) expect(after.get(dir)).toBe(body);
  });

  test("write is idempotent on a composed host (a second run changes no byte)", () => {
    useGraph("graph-with-plugin.json", [...committedStages(), pluginNode()]);
    const skills = freshSkillsDir("skills-idempotent");
    handleWrite(skills);
    const first = snapshot(skills);
    handleWrite(skills);
    const second = snapshot(skills);
    expect([...second.keys()]).toEqual([...first.keys()]);
    for (const [dir, body] of first) expect(second.get(dir)).toBe(body);
  });
});
