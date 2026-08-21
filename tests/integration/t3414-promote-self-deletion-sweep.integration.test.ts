// covers: file:scripts
// size: medium
//
// t3414 (integration) — deletion drift in the self-install projection
// (issue #3414). Mechanism: in-process drive of the exported
// promoteSelfMain(argv, repoRoot) seam against a temp fixture root (t356's
// pattern) — zero spawn, zero LLM.
//
// WHY THIS EXISTS: promote-self only ever ADDED and UPDATED. When a plugin was
// retired or renamed at the authoring source, its self-install projection
// stayed behind, shielded from the ORPHAN sweep by the two carve-outs that
// exist for COMPOSED plugins:
//   * `<host>/.amadeus-plugin-src/<name>/` — the PLUGIN_ENGINE_STATE_RE
//     per-user pattern exempts it unconditionally, so it survived every build.
//   * `<host>/plugins/<name>/` — the previous run's composition ledger claimed
//     it through ownedPaths, so it survived the build that retired the plugin.
// The residue is not inert: resolvePluginManifest reads the staging tree as the
// manifest face, so a retired plugin's declared advisories keep firing out of a
// tree whose source no longer exists.
//
// WHAT IS UNDER TEST:
//   1. Falling proof (staging face): a retired plugin's staging tree alone is
//      red at --check and gone after --apply.
//   2. Falling proof (host face, ledger-shielded): a retired plugin still named
//      by the on-disk ledger is red at --check and gone after --apply.
//   3. The other side: every surface of a LIVE plugin (source-declared) is
//      untouched by both --check and --apply.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROJECT_INSTRUCTIONS } from "../../packages/framework/harness/claude/project-instructions.ts";
import { promoteSelfMain } from "../../scripts/promote-self.ts";

let root: string;

const LIVE = "live-fixture";
const RETIRED = "retired-fixture";

const write = (rel: string, content: string): void => {
  const abs = join(root, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content);
};

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const STOCK_GRAPH = [
  { slug: "intent-capture", phase: "ideation" },
  { slug: "code-generation", phase: "construction" },
];

const PLUGIN_NODE = { slug: LIVE, phase: "construction", plugin_source: true };

const compositionRecord = (plugins: readonly string[]): unknown => ({
  ledger: [],
  plugins: plugins.map((name) => [
    name,
    {
      plugin: name,
      ownedPaths: [`plugins/${name}/stages/${name}.md`],
      stageIndex: [{ slug: name }],
    },
  ]),
});

// Every surface a live, composed plugin owns in the self install.
const liveSurfaces = [
  `.claude/plugins/${LIVE}/stages/${LIVE}.md`,
  `.claude/skills/amadeus-${LIVE}/SKILL.md`,
  `.claude/.amadeus-plugin-src/${LIVE}/plugin.json`,
];

// The live plugin: declared at the authoring source AND composed into the host.
const composeLive = (): void => {
  write(`plugins/${LIVE}/plugin.json`, json({ name: LIVE, tools: [] }));
  write(".claude/tools/data/stage-graph.json", json([...STOCK_GRAPH, PLUGIN_NODE]));
  write(`.claude/plugins/${LIVE}/stages/${LIVE}.md`, "# stage body\n");
  write(`.claude/skills/amadeus-${LIVE}/SKILL.md`, "# runner\n");
  write(`.claude/.amadeus-plugin-src/${LIVE}/plugin.json`, json({ name: LIVE, tools: [] }));
  write(".claude/.amadeus-plugin-composition.json", json(compositionRecord([LIVE])));
};

// The staging face of a plugin whose authoring source is gone. This is the face
// resolvePluginManifest reads, so on its own it is enough to keep the retired
// plugin's advisories firing.
const plantRetiredStaging = (): void => {
  write(
    `.claude/.amadeus-plugin-src/${RETIRED}/plugin.json`,
    json({ name: RETIRED, tools: ["tools/plugin-activation.ts"] }),
  );
  write(`.claude/.amadeus-plugin-src/${RETIRED}/tools/plugin-activation.ts`, "// ghost\n");
};

// The composed host face of a retired plugin, still claimed by the on-disk
// ledger — the shape the build that retires the plugin leaves behind. The
// generated per-stage runner skill is part of that face: the ledger's stage
// slugs exempt it from the ORPHAN sweep exactly as they exempt the stage body,
// which is how `amadeus-runner-gen.ts check` ends up reporting ORPHAN runners
// for stages the graph no longer carries.
const plantRetiredHostWithStaleLedger = (): void => {
  write(`.claude/plugins/${RETIRED}/stages/${RETIRED}.md`, "# ghost stage body\n");
  write(`.claude/skills/amadeus-${RETIRED}/SKILL.md`, "# ghost runner\n");
  write(".claude/.amadeus-plugin-composition.json", json(compositionRecord([LIVE, RETIRED])));
};

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), "t3414-deletion-sweep-"));
  write("dist/claude/.claude/tools/data/stage-graph.json", json(STOCK_GRAPH));
  write("dist/codex/.codex/b.txt", "beta\n");
  write("dist/codex/.agents/c.txt", "gamma\n");
  write("dist/cursor/.cursor/d.txt", "delta\n");
  write("dist/opencode/.opencode/e.txt", "epsilon\n");
  write("dist/kimi/.kimi-code/f.txt", "zeta\n");
  write("dist/pi/.pi/g.txt", "eta\n");
  write("dist/codex/AGENTS.md", "@.agents/rules/amadeus.md\n\n# AI-DLC on Codex CLI\n\ngenerated\n");
  const claudeOnboarding = "@.claude/rules/amadeus.md\n\n# Claude onboarding\n";
  write(".claude/CLAUDE.md", claudeOnboarding);
  write("CLAUDE.md", `${PROJECT_INSTRUCTIONS}${claudeOnboarding}`);
  write(
    "AGENTS.md",
    "@.agents/rules/amadeus.md\n@.agents/rules/amadeus-codex-suffix.md\n\n# Project rules\n",
  );
  expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
  composeLive();
  // The composed, source-declared baseline is in sync before anything is planted.
  expect(await promoteSelfMain(["--no-build"], root)).toBe(0);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("t3414 retired-plugin projections are swept", () => {
  test("falling proof: a retired plugin's staging tree alone is red and then removed", async () => {
    plantRetiredStaging();
    expect(await promoteSelfMain(["--no-build"], root)).toBe(1);
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    expect(existsSync(join(root, `.claude/.amadeus-plugin-src/${RETIRED}`))).toBe(false);
    expect(await promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  test("falling proof: a ledger-claimed host projection of a retired plugin is red and then removed", async () => {
    plantRetiredHostWithStaleLedger();
    expect(await promoteSelfMain(["--no-build"], root)).toBe(1);
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    expect(existsSync(join(root, `.claude/plugins/${RETIRED}`))).toBe(false);
    // The generated runner skill of the retired plugin's stage goes with it —
    // otherwise `/amadeus-<retired-stage>` stays typeable and runner-gen's
    // drift guard stays red.
    expect(existsSync(join(root, `.claude/skills/amadeus-${RETIRED}/SKILL.md`))).toBe(false);
    // The live plugin's runner is untouched.
    expect(existsSync(join(root, `.claude/skills/amadeus-${LIVE}/SKILL.md`))).toBe(true);
  });

  test("both faces of a retired plugin go in one apply", async () => {
    plantRetiredStaging();
    plantRetiredHostWithStaleLedger();
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    expect(existsSync(join(root, `.claude/.amadeus-plugin-src/${RETIRED}`))).toBe(false);
    expect(existsSync(join(root, `.claude/plugins/${RETIRED}`))).toBe(false);
  });

  test("the other side: a live plugin's surfaces survive check and apply byte-for-byte", async () => {
    plantRetiredStaging();
    const before = new Map(liveSurfaces.map((rel) => [rel, readFileSync(join(root, rel), "utf-8")]));
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    for (const [rel, bytes] of before) {
      expect(existsSync(join(root, rel))).toBe(true);
      expect(readFileSync(join(root, rel), "utf-8")).toBe(bytes);
    }
    expect(await promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  test("a plugin directory without a manifest is not a live identity", async () => {
    // Source dir present but carrying no plugin.json — the same structural gate
    // validatePluginSources applies, so the projection is still deletion drift.
    mkdirSync(join(root, "plugins", RETIRED), { recursive: true });
    plantRetiredStaging();
    expect(await promoteSelfMain(["--no-build"], root)).toBe(1);
  });
});
