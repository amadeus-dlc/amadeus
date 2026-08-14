// covers: file:packages/framework/core/tools/amadeus-plugin.ts, file:packages/framework/core/tools/amadeus-plugin-compose.ts
// size: medium
//
// U1 seam-bridge — the frontmatter seam bridge against REAL stage files and a
// real temp host: the shipped stage corpus round-trips byte-identically
// (BR-U1-1), buildHostSnapshot recognises real stages so a produces-seam
// contribution is no longer rejected as unknown-seam (BR-U1-7), compose appends
// the entry to the real `code-generation.md` frontmatter without touching any
// other byte (BR-U1-2/8), a drop restores the file byte-identically (BR-U1-9),
// plugin stage bytes are never written by the bridge (BR-U1-11), and a
// stage-shaped file the bridge cannot address stops loudly (BR-U1-6). Touches a
// real filesystem, hence the integration tier (fs-tests-integration-first).
//
// Falling/passing evidence: before the bridge, inspectPlugin rejected this exact
// manifest with `unknown-seam` (RE probe2); the acceptance assertion below is
// that rejection turning into a landed produces entry.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyPluginDrop,
  applyPluginPlan,
  clearPluginDrops,
  createNodeBackend,
  createNodeLock,
  diagnosePlugins,
  discoverPlugins,
  inspectPlugin,
  parseStageFrontmatter,
  planPluginDrop,
  recordPluginDrops,
  serializeStageFrontmatterSeams,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import {
  buildHostSnapshot,
  copyPluginSource,
  handlePluginCli,
  listHarnessTrees,
  listPluginSourceDirs,
  type PluginCliDeps,
  stagingEntryState,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE_ROOT = join(REPO_ROOT, "packages", "framework", "core");
const STAGES_ROOT = join(CORE_ROOT, "amadeus-common", "stages");
const PLUGIN = "github-pr-convergence";
const SEAM_ENTRY = "pr-convergence-report";
const STAGE_REL = "amadeus-common/stages/construction/code-generation.md";

let host = "";
const out: string[] = [];
const err: string[] = [];

function listStageFiles(dir: string): readonly string[] {
  const found: string[] = [];
  for (const name of [...readdirSync(dir)].sort()) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) found.push(...listStageFiles(abs));
    else if (name.endsWith(".md")) found.push(abs);
  }
  return found;
}

function deps(): PluginCliDeps {
  return {
    discoverPlugins: (root) => discoverPlugins(root),
    inspectPlugin,
    applyPluginPlan,
    planPluginDrop,
    applyPluginDrop,
    diagnosePlugins,
    buildHostSnapshot,
    makeBackend: (root) => createNodeBackend(root),
    makeTx: (root, backend): WorkspaceTransaction => ({
      backend,
      verify: () => ({ ok: true }),
      lock: createNodeLock(root),
      newTxnId: () => `t445-${Date.now()}-${Math.random()}`,
    }),
    recompile: () => true,
    generateRunners: () => true,
    recordDrops: recordPluginDrops,
    clearDrops: clearPluginDrops,
    stagingEntryState,
    listHarnessTrees,
    listPluginSourceDirs,
    copyPluginSource: (src, dst) => copyPluginSource(src, dst),
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  };
}

// A minimal plugin whose only contribution is the produces seam on the real
// `code-generation` stage, plus one owned stage so the plugin-byte assertion
// (BR-U1-11) has a subject.
function writePluginSource(root: string): void {
  const src = join(root, ".amadeus-plugin-src", PLUGIN);
  mkdirSync(join(src, "stages"), { recursive: true });
  writeFileSync(
    join(src, "plugin.json"),
    JSON.stringify(
      {
        name: PLUGIN,
        stages: [{ slug: PLUGIN, path: "stages/pr-convergence.md" }],
        seams: [{ stage: "code-generation", seam: "produces", entries: [SEAM_ENTRY] }],
        fragments: [],
        tools: [],
      },
      null,
      2,
    ),
  );
  writeFileSync(
    join(src, "stages", "pr-convergence.md"),
    [
      "---",
      `slug: ${PLUGIN}`,
      "phase: construction",
      "execution: CONDITIONAL",
      "condition: Opt-in — install is the boundary.",
      "lead_agent: amadeus-quality-agent",
      "support_agents: []",
      "mode: inline",
      "produces: []",
      "consumes: []",
      "requires_stage: []",
      "inputs: the open pull request for this Bolt.",
      "outputs: the convergence report.",
      "scopes: []",
      "---",
      "",
      "# PR Convergence",
      "",
    ].join("\n"),
  );
}

beforeEach(() => {
  host = mkdtempSync(join(tmpdir(), "amadeus-t445-"));
  for (const name of readdirSync(CORE_ROOT)) cpSync(join(CORE_ROOT, name), join(host, name), { recursive: true });
  writePluginSource(host);
  out.length = 0;
  err.length = 0;
});

afterEach(() => {
  rmSync(host, { recursive: true, force: true });
});

describe("t445 real stage corpus (BR-U1-1)", () => {
  test("every shipped stage parses and round-trips byte-identically", () => {
    const files = listStageFiles(STAGES_ROOT);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const bytes = readFileSync(file);
      const parsed = parseStageFrontmatter(bytes);
      expect(parsed.ok ? "ok" : `${file}: ${parsed.error.kind}`).toBe("ok");
      if (!parsed.ok) continue;
      expect(parsed.value.slug).toBe(file.slice(file.lastIndexOf("/") + 1, -3));
      const back = serializeStageFrontmatterSeams(parsed.value, parsed.value.seams);
      expect(back.ok).toBe(true);
      if (!back.ok) continue;
      expect(back.value.equals(bytes)).toBe(true);
    }
  });
});

describe("t445 host snapshot over real stages", () => {
  test("recognises the real code-generation stage (BR-U1-7 precondition)", () => {
    const snapshot = buildHostSnapshot(host, createNodeBackend(host));
    const stage = snapshot.stages.get("code-generation");
    expect(stage).toBeDefined();
    expect(stage?.path).toBe(STAGE_REL);
    expect(stage?.seams.produces).toEqual(["code-generation-plan", "code-summary"]);
  });

  test("a stage-shaped file the bridge cannot address stops loudly (BR-U1-6)", () => {
    writeFileSync(join(host, "amadeus-common", "stages", "construction", "broken.md"), "---\nphase: construction\n---\n\n# Broken\n");
    expect(() => buildHostSnapshot(host, createNodeBackend(host))).toThrow(/broken\.md/);
  });

  test("plugin-owned stage files are not host stages (BR-U1-11)", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    const composed = readFileSync(join(host, "plugins", PLUGIN, "stages", "pr-convergence.md"));
    const snapshot = buildHostSnapshot(host, createNodeBackend(host));
    // The plugin's own stage stays out of the host stage set, so no seam
    // contribution can ever rewrite its bytes.
    expect(snapshot.stages.has(PLUGIN)).toBe(false);
    expect(composed.equals(readFileSync(join(host, ".amadeus-plugin-src", PLUGIN, "stages", "pr-convergence.md")))).toBe(true);
  });
});

describe("t445 compose end-to-end over real frontmatter", () => {
  test("the produces seam is accepted and lands in the real stage file (BR-U1-7)", () => {
    const before = readFileSync(join(host, STAGE_REL));
    const snapshot = buildHostSnapshot(host, createNodeBackend(host));
    const discovered = discoverPlugins(join(host, ".amadeus-plugin-src"));
    expect(discovered.length).toBe(1);
    const result = inspectPlugin(discovered[0], snapshot);
    expect(result.kind).toBe("ready");

    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    const after = readFileSync(join(host, STAGE_REL));
    expect(after.equals(before)).toBe(false);
    const parsed = parseStageFrontmatter(after);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.seams.produces).toEqual(["code-generation-plan", "code-summary", SEAM_ENTRY]);
    // BR-U1-2: the only changed bytes are the produces span's appended line.
    expect(after.toString("utf-8")).toBe(before.toString("utf-8").replace("  - code-summary\n", `  - code-summary\n  - ${SEAM_ENTRY}\n`));
    // BR-U1-8: the bridge introduces no produces_kinds field.
    expect(after.toString("utf-8")).not.toContain("produces_kinds");
  });

  test("a drop restores the stage file byte-identically (BR-U1-9)", () => {
    const before = readFileSync(join(host, STAGE_REL));
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    expect(readFileSync(join(host, STAGE_REL)).equals(before)).toBe(false);
    expect(handlePluginCli(["drop", PLUGIN, "--project-root", host], deps())).toBe(0);
    expect(readFileSync(join(host, STAGE_REL)).equals(before)).toBe(true);
    expect(existsSync(join(host, "plugins", PLUGIN, "stages", "pr-convergence.md"))).toBe(false);
  });

  test("compose is idempotent over real frontmatter", () => {
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    const first = readFileSync(join(host, STAGE_REL));
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    expect(readFileSync(join(host, STAGE_REL)).equals(first)).toBe(true);
  });
});
