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
  test("native-manifest (claude) keeps the U2 bundle: marketplace manifest + hooks.json, no INSTALL.md", () => {
    const r = rels("claude");
    expect(r).toContain(".claude-plugin/plugin.json");
    expect(r).toContain("hooks/hooks.json");
    expect(r).not.toContain("INSTALL.md"); // claude projector unchanged (U2)
    expect(r).not.toContain("hooks/auto-compose.snippet");
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
});
