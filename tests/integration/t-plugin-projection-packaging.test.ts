// covers: file:scripts/package.ts
// covers: file:scripts/plugin-projection.ts
// size: medium
//
// U09 plugin-projection (FR-6 item 19) — end-to-end integration of the C5
// projector with the real packager, driven IN-PROCESS (bun --coverage does not
// instrument spawned children, so a `bun scripts/package.ts` subprocess would
// leave the new buildTree/neutral-bundle lines uncovered).
//
// HERMETIC + RACE-FREE. The plugin source root and dist root are redirected to a
// throwaway temp workspace via AMADEUS_PLUGINS_ROOT / AMADEUS_DIST_ROOT (read at
// call time by package.ts). The real repo-root plugins/ and dist/ are never
// touched, so a concurrent packager spawn in another test file sees the true
// (plugin-free) tree — no cross-test interference. The env vars are restored in
// afterAll.
//
// The fixture drives:
//   - the buildTree plugin path, surfaced by checkHarness("claude") reporting NO
//     plugin surface in the built harness tree: A実装 (intent 260722-tla-plugin,
//     ruling E-TLAU2 option A) ships plugins only as the neutral bundle and no
//     longer projects them into <harnessDir>/plugins/, so the compile-visible
//     harness tree stays plugin-free (0-plugin stage-graph baseline preserved);
//   - buildPluginProjection loading the real claude/kiro manifest and transforming
//     {{HARNESS_DIR}} / rules paths (the projector FUNCTION is unchanged — only
//     the packager's decision to write it into a harness tree was withdrawn);
//   - checkHarnessTree drift over the (absent) committed host surface;
//   - writeNeutralBundle / checkNeutralBundle over <AMADEUS_DIST_ROOT>/plugins/.
//
// The 0-plugin baseline (empty source root) is asserted byte-neutral.

import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { checkHarness, checkNeutralBundle, writeNeutralBundle } from "../../scripts/package.ts";
import {
  buildPluginProjection,
  checkHarnessTree,
  discoverPluginSources,
  validatePluginSources,
} from "../../scripts/plugin-projection.ts";
import { PACKAGE_HARNESSES as SELF_INSTALL_FACES } from "../../scripts/promote-self.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = "zz-u09-fixture";
const PACKAGE_HARNESSES_6 = ["claude", "codex", "cursor", "kiro", "kiro-ide", "opencode"];
const TIMEOUT_MS = 120_000;

let ws = "";
let pluginsRoot = "";
let emptyRoot = "";
let distRoot = "";
const savedEnv: Record<string, string | undefined> = {};

function setEnv(pRoot: string, dRoot: string): void {
  process.env.AMADEUS_PLUGINS_ROOT = pRoot;
  process.env.AMADEUS_DIST_ROOT = dRoot;
}

beforeAll(() => {
  savedEnv.AMADEUS_PLUGINS_ROOT = process.env.AMADEUS_PLUGINS_ROOT;
  savedEnv.AMADEUS_DIST_ROOT = process.env.AMADEUS_DIST_ROOT;
  ws = mkdtempSync(join(tmpdir(), "amadeus-u09-"));
  pluginsRoot = join(ws, "plugins");
  emptyRoot = join(ws, "empty-plugins");
  distRoot = join(ws, "dist");
  mkdirSync(join(pluginsRoot, FIXTURE, "skills"), { recursive: true });
  mkdirSync(emptyRoot, { recursive: true });
  writeFileSync(join(pluginsRoot, FIXTURE, "plugin.json"), '{"name":"zz-u09-fixture"}\n');
  writeFileSync(
    join(pluginsRoot, FIXTURE, "skills", "s.md"),
    "home {{HARNESS_DIR}} rules {{HARNESS_DIR}}/rules/x\n",
  );
  writeFileSync(join(pluginsRoot, FIXTURE, "data.json"), '{"h":"{{HARNESS_DIR}}"}\n');
  setEnv(pluginsRoot, distRoot);
});

afterEach(() => {
  // Reset to the fixture workspace after any test that repointed the env.
  setEnv(pluginsRoot, distRoot);
  rmSync(join(distRoot, "plugins"), { recursive: true, force: true });
});

afterAll(() => {
  for (const k of ["AMADEUS_PLUGINS_ROOT", "AMADEUS_DIST_ROOT"] as const) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  rmSync(ws, { recursive: true, force: true });
});

describe("t-plugin-projection-packaging — U09 FR-6 item 19", () => {
  test("0-plugin baseline: neutral bundle is a no-op (empty source root)", () => {
    setEnv(emptyRoot, join(ws, "dist-empty"));
    expect(checkNeutralBundle()).toEqual([]);
    writeNeutralBundle();
    expect(existsSync(join(ws, "dist-empty", "plugins"))).toBe(false);
  });

  test(
    "buildTree does NOT project plugins into the harness tree (neutral-bundle-only shipping)",
    () => {
      // A実装 (intent 260722-tla-plugin, ruling E-TLAU2 option A): plugins ship
      // ONLY as the harness-neutral bundle (dist/plugins/<name>/); buildTree no
      // longer projects them into the compile-visible <harnessDir>/plugins/ tree.
      // A projected plugin STAGE there would be discovered by the stage-graph
      // compile, making the shipped graph non-0-plugin and breaking the
      // recompile-idempotence invariant (t110/t88, FR-2.3). So checkHarness must
      // report NO plugin surface in the built harness tree.
      const problems = checkHarness("claude");
      const pluginProblems = problems.filter((p) => p.includes(`plugins/${FIXTURE}/`));
      expect(pluginProblems).toEqual([]);
    },
    TIMEOUT_MS,
  );

  test("buildPluginProjection loads the real manifest and transforms prose per harness", () => {
    const [plugin] = validatePluginSources(discoverPluginSources(pluginsRoot));
    const claude = buildPluginProjection(plugin, "claude");
    const s = claude.artifacts.find((a) => a.relativePath === `plugins/${FIXTURE}/skills/s.md`)!;
    expect(s.bytes.toString("utf-8")).toBe("home .claude rules .claude/rules/x\n");
    const j = claude.artifacts.find((a) => a.relativePath === `plugins/${FIXTURE}/data.json`)!;
    expect(j.bytes.toString("utf-8")).toBe('{"h":"{{HARNESS_DIR}}"}\n'); // verbatim
    const kiro = buildPluginProjection(plugin, "kiro");
    const ks = kiro.artifacts.find((a) => a.relativePath === `plugins/${FIXTURE}/skills/s.md`)!;
    expect(ks.bytes.toString("utf-8")).toBe("home .kiro rules .kiro/steering/x\n");
  });

  test("checkHarnessTree reports MISSING for an uncommitted host surface", () => {
    const drift = checkHarnessTree("claude", pluginsRoot);
    expect(drift.length).toBeGreaterThan(0);
    expect(drift.every((d) => d.kind === "MISSING" && d.harness === "claude")).toBe(true);
    expect(drift.some((d) => d.path === `plugins/${FIXTURE}/skills/s.md`)).toBe(true);
    expect(drift.every((d) => d.plugin === FIXTURE)).toBe(true);
  });

  test("neutral bundle: write → in-sync; corrupt → DIFFERS; stray → ORPHAN", () => {
    writeNeutralBundle();
    const bundled = join(distRoot, "plugins", FIXTURE, "skills", "s.md");
    expect(existsSync(bundled)).toBe(true);
    // Neutral bundle is verbatim (no token substitution).
    expect(readFileSync(bundled, "utf-8")).toBe("home {{HARNESS_DIR}} rules {{HARNESS_DIR}}/rules/x\n");
    expect(checkNeutralBundle()).toEqual([]);

    writeFileSync(bundled, "tampered\n");
    expect(checkNeutralBundle().some((p) => p.startsWith("DIFFERS:") && p.includes(`${FIXTURE}/skills/s.md`))).toBe(true);

    writeNeutralBundle(); // restore
    const stray = join(distRoot, "plugins", FIXTURE, "stray.md");
    writeFileSync(stray, "stale\n");
    expect(checkNeutralBundle().some((p) => p.startsWith("ORPHAN in dist:") && p.includes(`${FIXTURE}/stray.md`))).toBe(true);

    writeNeutralBundle(); // clean-sweep removes the stray
    expect(existsSync(stray)).toBe(false);
    expect(checkNeutralBundle()).toEqual([]);
  });

  test("self-install stays the closed four faces (not widened to six)", () => {
    expect([...SELF_INSTALL_FACES].sort()).toEqual(["claude", "codex", "cursor", "opencode"]);
    for (const f of SELF_INSTALL_FACES) expect(PACKAGE_HARNESSES_6).toContain(f);
  });
});
