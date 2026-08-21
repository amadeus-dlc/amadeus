// covers: function:copyPluginSource
// covers: function:seedBytesForHarness
// covers: function:stagingHarnessDirOf
// size: medium
//
// #2790 — the runtime seeding point. `compose` seeds a harness tree's staging dir
// from the project's authoring `plugins/`, and that copy used to be verbatim: a
// harness-neutral `{{HARNESS_DIR}}` token in plugin prose reached the composed
// stage raw. This file drives the dogfood shape the build scripts do NOT cover —
// a project whose `plugins/` tree is the untouched authoring source — end to end
// through the real CLI, plus the two pure seams the copy is built from.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  PLUGIN_SOURCE_DIR_NAME,
  seedBytesForHarness,
  stagingHarnessDirOf,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";
import { foreignHarnessDirs, harnessDirOf } from "../helpers/harness-dir-fixture.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const COMPOSED_STAGE = join("plugins", "github-pr-convergence", "stages", "pr-convergence.md");
const FIXTURE_PLUGIN = "conformance-fixture";
const FIXTURE_SOURCE = join(REPO_ROOT, "tests", "fixtures", "conformance-fixture-plugin", FIXTURE_PLUGIN);
const COMPOSED_FIXTURE_STAGE = join("plugins", FIXTURE_PLUGIN, "stages", `${FIXTURE_PLUGIN}.md`);
const ROOT_RELATIVE_PLUGIN_PATH_RE =
  /(^|\.{1,2}\/|[^/A-Za-z0-9._-])plugins\/[a-z0-9-]+\/(tools|stages|specs|hooks)\//m;
const scratch: string[] = [];

afterAll(() => {
  for (const root of scratch) rmSync(root, { recursive: true, force: true });
});

// A project workspace built the way a dogfooding repo is: a packaged harness tree
// plus the UNTRANSFORMED authoring plugins/ beside it. Deliberately a verbatim
// cpSync — the seeding transform under test must be the runtime's own.
function dogfoodWorkspace(harness: string): string {
  const distFace = join(REPO_ROOT, "dist", harness);
  if (!existsSync(distFace)) throw new Error(`missing packaged harness: dist/${harness} (run bun run dist)`);
  const workspace = mkdtempSync(join(tmpdir(), `amadeus-t2790-${harness}-`));
  scratch.push(workspace);
  for (const entry of readdirSync(distFace)) {
    cpSync(join(distFace, entry), join(workspace, entry), { recursive: true });
  }
  cpSync(join(REPO_ROOT, "plugins"), join(workspace, "plugins"), { recursive: true });
  // A second plugin, so the seeding transform is proved over more than one
  // authoring source in the same compose.
  cpSync(FIXTURE_SOURCE, join(workspace, "plugins", FIXTURE_PLUGIN), { recursive: true });
  mkdirSync(join(workspace, "amadeus"), { recursive: true });
  writeFileSync(
    join(workspace, "amadeus", "config.json"),
    `${JSON.stringify({ plugin: { activation: { names: ["github-pr-convergence", FIXTURE_PLUGIN] } } }, null, 2)}\n`,
  );
  return workspace;
}

function compose(workspace: string, harnessDir: string): void {
  const hostRoot = join(workspace, harnessDir);
  const env: NodeJS.ProcessEnv = { ...process.env, AMADEUS_HARNESS_DIR: harnessDir };
  for (const key of [
    "AMADEUS_PLUGINS_HOST_ROOT",
    "AMADEUS_RULES_DIR",
    "AMADEUS_SCOPE_GRID",
    "AMADEUS_SCOPE_MAPPING",
    "AMADEUS_SENSORS_DIR",
    "AMADEUS_STAGE_GRAPH",
    "AMADEUS_STAGES_DIR",
  ]) {
    delete env[key];
  }
  const result = spawnSync(
    "bun",
    [join(hostRoot, "tools", "amadeus-plugin.ts"), "compose", "--if-stale", "--project-root", hostRoot],
    { cwd: workspace, env, encoding: "utf-8", timeout: scaleTestTime(120_000) },
  );
  if (result.status !== 0) {
    throw new Error(`compose failed: ${`${result.stdout ?? ""}${result.stderr ?? ""}`.trim()}`);
  }
}

describe("#2790 plugin staging seed resolves the harness dir", () => {
  test("stagingHarnessDirOf matches only a harness tree's staging landing path", () => {
    expect(stagingHarnessDirOf(join("/p", ".codex", PLUGIN_SOURCE_DIR_NAME, "github-pr-convergence"))).toBe(".codex");
    expect(stagingHarnessDirOf(join("/p", ".kimi-code", PLUGIN_SOURCE_DIR_NAME, "x"))).toBe(".kimi-code");
    // The authoring tree stays harness-neutral: `install --force` writing back to
    // plugins/<name> must never bake a harness dir into the source of truth.
    expect(stagingHarnessDirOf(join("/p", "plugins", "github-pr-convergence"))).toBeNull();
    expect(stagingHarnessDirOf(join("/p", "notaharness", PLUGIN_SOURCE_DIR_NAME, "x"))).toBeNull();
  });

  test("seedBytesForHarness transforms prose only, and applies the rules rename", () => {
    const prose = Buffer.from("bun {{HARNESS_DIR}}/tools/t.ts and {{HARNESS_DIR}}/rules/team.md\n", "utf-8");
    expect(seedBytesForHarness("stages/x.md", prose, ".claude").toString("utf-8")).toBe(
      "bun .claude/tools/t.ts and .claude/rules/team.md\n",
    );
    expect(seedBytesForHarness("stages/x.md", prose, ".codex").toString("utf-8")).toBe(
      "bun .codex/tools/t.ts and .codex/amadeus-rules/team.md\n",
    );
    expect(seedBytesForHarness("stages/x.md.example", prose, ".kiro").toString("utf-8")).toBe(
      "bun .kiro/tools/t.ts and .kiro/steering/team.md\n",
    );
    // Non-prose and the neutral (null) destination are byte-for-byte verbatim.
    expect(seedBytesForHarness("plugin.json", prose, ".codex")).toEqual(prose);
    expect(seedBytesForHarness("tools/x.ts", prose, ".codex")).toEqual(prose);
    expect(seedBytesForHarness("stages/x.md", prose, null)).toEqual(prose);
  });

  test("the staged-prose guard rejects unanchored relative plugin paths", () => {
    for (const prefix of ["", "./", "../"]) {
      expect(ROOT_RELATIVE_PLUGIN_PATH_RE.test(`bun ${prefix}plugins/example/tools/cli.ts`), prefix || "bare").toBe(
        true,
      );
    }
    expect(ROOT_RELATIVE_PLUGIN_PATH_RE.test("bun .codex/plugins/example/tools/cli.ts"), "staged anchor").toBe(
      false,
    );
  });

  test("compose from an empty staging dir resolves plugin prose to the tree's own harness dir", () => {
    const harness = "codex";
    const harnessDir = harnessDirOf(harness);
    const workspace = dogfoodWorkspace(harness);
    expect(existsSync(join(workspace, harnessDir, PLUGIN_SOURCE_DIR_NAME)), "staging must start empty").toBe(false);

    compose(workspace, harnessDir);

    const composed = join(workspace, harnessDir, COMPOSED_STAGE);
    expect(existsSync(composed), `composed stage missing at ${harnessDir}/${COMPOSED_STAGE}`).toBe(true);
    const text = readFileSync(composed, "utf-8");
    expect(
      text.split(`${harnessDir}/plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts`).length -
        1,
    ).toBe(1);
    expect(text.includes("{{HARNESS_DIR}}"), "raw token survived the seed").toBe(false);
    for (const foreign of foreignHarnessDirs(harness)) {
      expect(text.includes(`${foreign}/`), `foreign literal ${foreign}/`).toBe(false);
    }

    const fixtureText = readFileSync(join(workspace, harnessDir, COMPOSED_FIXTURE_STAGE), "utf-8");
    for (const [stage, stageText] of [
      ["pr-convergence", text],
      [FIXTURE_PLUGIN, fixtureText],
    ] as const) {
      expect(stageText.includes("{{HARNESS_DIR}}"), `${stage}: raw token survived`).toBe(false);
      expect(ROOT_RELATIVE_PLUGIN_PATH_RE.test(stageText), `${stage}: repo-root-relative plugin path survived`).toBe(
        false,
      );
    }

    const prCli = `${harnessDir}/plugins/github-pr-convergence/tools/pr-convergence-cli.ts`;
    for (const subcommand of ["status", "create", "report", "override"]) {
      expect(text).toContain(`bun ${prCli} ${subcommand}`);
    }
    const fixtureTools = `${harnessDir}/plugins/${FIXTURE_PLUGIN}/tools`;
    expect(fixtureText).toContain(`${fixtureTools}/${FIXTURE_PLUGIN}-tool.ts`);
    for (const subcommand of ["advisory", "record"]) {
      expect(fixtureText).toContain(`bun ${fixtureTools}/${FIXTURE_PLUGIN}-tool.ts ${subcommand}`);
    }
  }, scaleTestTime(180_000));

  test("a re-compose over the seeded staging dir is a no-op, not a perpetual re-seed", () => {
    const harness = "claude";
    const harnessDir = harnessDirOf(harness);
    const workspace = dogfoodWorkspace(harness);
    compose(workspace, harnessDir);
    const composed = join(workspace, harnessDir, COMPOSED_STAGE);
    const first = readFileSync(composed);
    compose(workspace, harnessDir);
    expect(readFileSync(composed).equals(first)).toBe(true);
  }, scaleTestTime(180_000));
});
