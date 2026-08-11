// covers: file:scripts/plugin-projection.ts
// size: medium
//
// U3 host-projection-all — installArtifacts generalizes the U2 claude bundle to
// every packaged face via a single 3-arm class switch (component-methods C3).
// This integration drives the class-driven layout: claude (native-manifest)
// keeps its exact U2 bundle, folder-drop-auto ships INSTALL.md + snippet, and
// manual-only ships INSTALL.md WITHOUT a snippet. Reads real harness manifests
// (require), so it lives in the integration tier.

import { beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { discoverPluginSources, installArtifacts, type PluginSource, validatePluginSources } from "../../scripts/plugin-projection.ts";
import { PLUGIN_SOURCE_DIR_NAME } from "../../packages/framework/core/tools/amadeus-plugin.ts";

const FIXTURE = "zz-t307-fixture";
let plugin: PluginSource;

beforeAll(() => {
  const ws = mkdtempSync(join(tmpdir(), "amadeus-t307-src-"));
  const pluginsRoot = join(ws, "plugins");
  mkdirSync(join(pluginsRoot, FIXTURE, "skills"), { recursive: true });
  writeFileSync(join(pluginsRoot, FIXTURE, "plugin.json"), `{"name":"${FIXTURE}"}\n`);
  writeFileSync(join(pluginsRoot, FIXTURE, "skills", "s.md"), "home {{HARNESS_DIR}} rules {{HARNESS_DIR}}/rules/x\n");
  [plugin] = validatePluginSources(discoverPluginSources(pluginsRoot));
});

const rels = (h: Parameters<typeof installArtifacts>[1]) => installArtifacts(plugin, h).map((a) => a.relativePath);

describe("t307 installArtifacts (class-driven layout)", () => {
  test("native-manifest (claude): marketplace manifest + hooks.json + INSTALL.md (matrix install_artifacts), no folder-drop snippet", () => {
    const r = rels("claude");
    expect(r).toContain(".claude-plugin/plugin.json");
    expect(r).toContain("hooks/hooks.json");
    expect(r).toContain("INSTALL.md"); // BR-U1-7 matrix: claude install_artifacts includes INSTALL_doc
    expect(r).not.toContain("hooks/auto-compose.snippet"); // that snippet is folder-drop-auto's
  });

  test("claude INSTALL.md is marketplace-flavored, not folder-drop", () => {
    const doc = installArtifacts(plugin, "claude").find((a) => a.relativePath === "INSTALL.md");
    expect(doc).toBeDefined();
    const text = Buffer.from(doc!.bytes).toString("utf-8");
    expect(text).toContain("marketplace");
    expect(text).toContain(".claude-plugin/plugin.json");
  });

  test("folder-drop-auto (codex) ships content + INSTALL.md + auto-compose snippet, no marketplace manifest", () => {
    const r = rels("codex");
    expect(r).toContain("INSTALL.md");
    expect(r).toContain("hooks/auto-compose.snippet");
    expect(r).toContain(`plugins/${FIXTURE}/plugin.json`);
    expect(r.some((p) => p.startsWith(".claude-plugin/"))).toBe(false); // marketplace is native-manifest only
  });

  test("manual-only (opencode) ships content + INSTALL.md but NO snippet", () => {
    const r = rels("opencode");
    expect(r).toContain("INSTALL.md");
    expect(r).toContain(`plugins/${FIXTURE}/plugin.json`);
    expect(r).not.toContain("hooks/auto-compose.snippet");
  });

  test("prose content is harness-transformed ({{HARNESS_DIR}} → the harness dir)", () => {
    const codexSkill = installArtifacts(plugin, "codex").find((a) => a.relativePath.endsWith("skills/s.md"));
    expect(codexSkill).toBeDefined();
    const text = Buffer.from(codexSkill!.bytes).toString("utf-8");
    expect(text).toContain(".codex");
    expect(text).not.toContain("{{HARNESS_DIR}}");
  });

  test("every folder-drop-auto face carries a snippet; opencode does not", () => {
    for (const h of ["codex", "cursor", "kimi", "kiro", "kiro-ide"] as const)
      expect(rels(h)).toContain("hooks/auto-compose.snippet");
    expect(rels("opencode")).not.toContain("hooks/auto-compose.snippet");
  });

  // #1569 + #1591 (ruling B): the INSTALL.md copy destination must match the
  // CLI's discovery root — the shared PLUGIN_SOURCE_DIR_NAME under the HARNESS
  // dir, which is also the root the engine reads plugin stages back from
  // (pluginHostRoot / pluginsHostRoot). NOT a project-root-relative
  // path (the pre-#1591 direction, invisible to the harness-rooted scan) and
  // NOT a `<harnessDir>/plugins/<name>/` path (the pre-#1569 direction, the
  // composed OUTPUT namespace the scan never reads). Import the constant from
  // the CLI module so this asserts the two surfaces agree.
  const installText = (h: Parameters<typeof installArtifacts>[1]) =>
    Buffer.from(installArtifacts(plugin, h).find((a) => a.relativePath === "INSTALL.md")!.bytes).toString("utf-8");

  test("folder-drop-auto (codex) INSTALL.md copies into the harness-rooted discovery dir (#1569, #1591)", () => {
    const text = installText("codex");
    expect(text).toContain(`.codex/${PLUGIN_SOURCE_DIR_NAME}/${FIXTURE}/`); // the dir compose actually scans
    expect(text).not.toContain(`/plugins/${FIXTURE}/`); // the pre-#1569 `<harnessDir>/plugins/<name>/` dest
  });

  test("manual-only (opencode) INSTALL.md copies into the harness-rooted discovery dir (#1569, #1591)", () => {
    const text = installText("opencode");
    expect(text).toContain(`.opencode/${PLUGIN_SOURCE_DIR_NAME}/${FIXTURE}/`);
    expect(text).not.toContain(`/plugins/${FIXTURE}/`);
  });

  // The harness token is per-face, not a hardcoded ".claude" leak: each
  // folder-drop face names its OWN dir, and never another face's.
  test("every folder-drop face's INSTALL.md names its own harness dir and no other (#1591)", () => {
    const dirs = { codex: ".codex", cursor: ".cursor", kimi: ".kimi-code", kiro: ".kiro", opencode: ".opencode" } as const;
    for (const [harness, dir] of Object.entries(dirs) as [keyof typeof dirs, string][]) {
      const text = installText(harness);
      expect(text).toContain(`${dir}/${PLUGIN_SOURCE_DIR_NAME}/${FIXTURE}/`);
      for (const other of Object.values(dirs)) {
        if (other !== dir) expect(text).not.toContain(`${other}/${PLUGIN_SOURCE_DIR_NAME}/`);
      }
    }
  });

  test("native-manifest (claude) INSTALL.md has no folder-copy step (marketplace install, unchanged) (#1569)", () => {
    const text = installText("claude");
    expect(text).not.toContain("Copy this bundle");
    expect(text).not.toContain(PLUGIN_SOURCE_DIR_NAME);
  });
});
