// covers: function:buildSelfInstallProjection
// covers: contract:self-install-plugin-projection-matrix
// size: medium

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { harnessStageEntry } from "../../packages/framework/core/tools/amadeus-harness.ts";
import type { PluginRecord } from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import { defaultPluginCliDeps } from "../../packages/framework/core/tools/amadeus-plugin.ts";
import {
  buildSelfInstallProjection,
  SELF_INSTALL_HARNESSES,
} from "../../scripts/plugin-projection.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const scratch: string[] = [];

afterAll(() => {
  for (const root of scratch) rmSync(root, { recursive: true, force: true });
});

function digestible(projection: ReturnType<typeof buildSelfInstallProjection>): string {
  return JSON.stringify(
    [...(projection.artifacts ?? [])].map(([path, bytes]) => [path, bytes.toString("base64")]),
  );
}

function pluginRecord(...slugs: string[]): PluginRecord {
  return {
    plugin: "formal-model-check",
    ownedPaths: [],
    ownedContentDigests: new Map(),
    stageIndex: slugs.map((slug) => ({
      path: `${slug}.md`,
      slug,
      contentDigest: "sha256:fixture",
      frontmatter: {},
    })),
    stageIndexDigest: "sha256:fixture",
    trustGrant: null,
    sharedFiles: [],
  };
}

describe("t416 deterministic self-install plugin projections", () => {
  test("all five faces produce deterministic managed surfaces from the selected plugin", () => {
    for (const harness of SELF_INSTALL_HARNESSES) {
      const first = buildSelfInstallProjection(harness, REPO_ROOT);
      const second = buildSelfInstallProjection(harness, REPO_ROOT);
      expect(first.expectedPaths.size, harness).toBeGreaterThan(0);
      expect(digestible(second), harness).toBe(digestible(first));
      expect([...first.expectedPaths].some((path) => path.endsWith("tools/data/stage-graph.json")), harness).toBe(true);
      expect([...first.expectedPaths].some((path) => path.includes("plugins/formal-model-check/")), harness).toBe(true);
      expect([...first.expectedPaths].some((path) => path.includes(".amadeus-plugin-src/formal-model-check/")), harness).toBe(true);
      expect([...first.expectedPaths].some((path) => path.endsWith(".amadeus-plugin-composition.json")), harness).toBe(true);
      expect([...first.expectedPaths].some((path) => path.endsWith(".amadeus-plugin-audit.json")), harness).toBe(false);
      expect([...first.expectedPaths].some((path) => path.endsWith(".amadeus-plugin-drops.json")), harness).toBe(false);
    }
  }, 120_000);

  test("Codex emits only the project-root .agents runner", () => {
    const projection = buildSelfInstallProjection("codex", REPO_ROOT);
    expect(projection.expectedPaths.has(".agents/skills/amadeus-formal-model-check/SKILL.md")).toBe(true);
    expect([...projection.expectedPaths].some((path) => path.startsWith(".codex/skills/"))).toBe(false);
  }, 120_000);

  test("Cursor and OpenCode use their existing command entry instead of plugin runner skills", () => {
    for (const harness of ["cursor", "opencode"] as const) {
      const projection = buildSelfInstallProjection(harness, REPO_ROOT);
      expect([...projection.expectedPaths].some((path) => path.includes("amadeus-formal-model-check/SKILL.md"))).toBe(false);
      expect([...projection.expectedPaths].some((path) => path.endsWith("tools/data/stage-graph.json"))).toBe(true);
    }
  }, 120_000);

  test("missing or empty selection has zero self-projection impact", () => {
    const missing = mkdtempSync(join(tmpdir(), "amadeus-t416-missing-"));
    const empty = mkdtempSync(join(tmpdir(), "amadeus-t416-empty-"));
    scratch.push(missing, empty);
    mkdirSync(join(empty, "amadeus"), { recursive: true });
    writeFileSync(join(empty, "amadeus", "config.json"), '{"plugins":[]}\n');
    expect(buildSelfInstallProjection("claude", missing).expectedPaths.size).toBe(0);
    expect(buildSelfInstallProjection("codex", empty).expectedPaths.size).toBe(0);
  });

  test("compile fixture environment cannot change committed projection bytes", () => {
    const previous = process.env.AMADEUS_RULES_DIR;
    try {
      delete process.env.AMADEUS_RULES_DIR;
      const canonical = digestible(buildSelfInstallProjection("codex", REPO_ROOT));
      process.env.AMADEUS_RULES_DIR = join(tmpdir(), "amadeus-t416-missing-rules");
      expect(digestible(buildSelfInstallProjection("codex", REPO_ROOT))).toBe(canonical);
    } finally {
      if (previous === undefined) delete process.env.AMADEUS_RULES_DIR;
      else process.env.AMADEUS_RULES_DIR = previous;
    }
  }, 120_000);

  test("packaged stage entries accept native relative surfaces and reject escapes", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "amadeus-t416-stage-entry-"));
    scratch.push(dataDir);
    const descriptor = join(dataDir, "harness.json");

    writeFileSync(descriptor, JSON.stringify({ stageEntry: { kind: "runner", root: ".agents/skills" } }));
    expect(harnessStageEntry(dataDir)).toEqual({ kind: "runner", root: ".agents/skills" });
    writeFileSync(descriptor, JSON.stringify({ stageEntry: { kind: "command", path: ".opencode/commands/amadeus.md" } }));
    expect(harnessStageEntry(dataDir)).toEqual({ kind: "command", path: ".opencode/commands/amadeus.md" });

    for (const stageEntry of [
      { kind: "runner", root: "/tmp/skills" },
      { kind: "runner", root: "../skills" },
      { kind: "command", path: "C:\\commands\\amadeus.md" },
      { kind: "command", path: "" },
    ]) {
      writeFileSync(descriptor, JSON.stringify({ stageEntry }));
      expect(harnessStageEntry(dataDir)).toBeNull();
    }
    writeFileSync(descriptor, "not json");
    expect(harnessStageEntry(dataDir)).toBeNull();
  });

  test("derived projection freshness follows graph and native entry artifacts", () => {
    const projectDir = mkdtempSync(join(tmpdir(), "amadeus-t416-derived-"));
    scratch.push(projectDir);
    const hostRoot = join(projectDir, ".codex");
    const dataDir = join(hostRoot, "tools", "data");
    const graphPath = join(dataDir, "stage-graph.json");
    const descriptor = join(dataDir, "harness.json");
    const slug = "formal-model-check";
    const current = defaultPluginCliDeps().derivedProjectionCurrent!;
    mkdirSync(dataDir, { recursive: true });
    writeFileSync(graphPath, JSON.stringify([{ slug: 42 }, { slug }]));

    writeFileSync(descriptor, JSON.stringify({ stageEntry: { kind: "runner", root: ".agents/skills" } }));
    const runner = join(projectDir, ".agents", "skills", `amadeus-${slug}`, "SKILL.md");
    mkdirSync(join(runner, ".."), { recursive: true });
    writeFileSync(runner, "# runner\n");
    expect(current(hostRoot, pluginRecord(slug))).toBe(true);
    rmSync(runner);
    expect(current(hostRoot, pluginRecord(slug))).toBe(false);

    writeFileSync(descriptor, JSON.stringify({ stageEntry: { kind: "command", path: ".codex/commands/amadeus.md" } }));
    const command = join(projectDir, ".codex", "commands", "amadeus.md");
    mkdirSync(join(command, ".."), { recursive: true });
    writeFileSync(command, "# command\n");
    expect(current(hostRoot, pluginRecord(slug))).toBe(true);
    rmSync(command);
    expect(current(hostRoot, pluginRecord(slug))).toBe(false);

    rmSync(descriptor);
    const fallbackRunner = join(hostRoot, "skills", `amadeus-${slug}`, "SKILL.md");
    mkdirSync(join(fallbackRunner, ".."), { recursive: true });
    writeFileSync(fallbackRunner, "# runner\n");
    expect(current(hostRoot, pluginRecord(slug))).toBe(true);

    writeFileSync(graphPath, JSON.stringify([{ slug: "other" }]));
    expect(current(hostRoot, pluginRecord(slug))).toBe(false);
    writeFileSync(graphPath, JSON.stringify({ slug }));
    expect(current(hostRoot, pluginRecord(slug))).toBe(false);
    writeFileSync(graphPath, "not json");
    expect(current(hostRoot, pluginRecord(slug))).toBe(false);
  });
});
