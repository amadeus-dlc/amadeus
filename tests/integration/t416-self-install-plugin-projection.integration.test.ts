// covers: function:buildSelfInstallProjection
// covers: contract:self-install-plugin-projection-matrix
// size: medium

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { harnessStageEntry } from "../../packages/framework/core/tools/amadeus-harness.ts";
import { foreignHarnessDirs, harnessDirOf } from "../helpers/harness-dir-fixture.ts";
import type { PluginRecord } from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import { defaultPluginCliDeps } from "../../packages/framework/core/tools/amadeus-plugin.ts";
import { renderStageRunner } from "../../packages/framework/core/tools/amadeus-runner-gen.ts";
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
    plugin: "github-pr-convergence",
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
  test("all six faces produce deterministic managed surfaces from the selected plugin", () => {
    for (const harness of SELF_INSTALL_HARNESSES) {
      const first = buildSelfInstallProjection(harness, REPO_ROOT);
      const second = buildSelfInstallProjection(harness, REPO_ROOT);
      expect(first.expectedPaths.size, harness).toBeGreaterThan(0);
      expect(digestible(second), harness).toBe(digestible(first));
      expect([...first.expectedPaths].some((path) => path.endsWith("tools/data/stage-graph.json")), harness).toBe(true);
      expect([...first.expectedPaths].some((path) => path.includes("plugins/github-pr-convergence/")), harness).toBe(true);
      expect([...first.expectedPaths].some((path) => path.includes(".amadeus-plugin-src/github-pr-convergence/")), harness).toBe(true);
      expect([...first.expectedPaths].some((path) => path.endsWith(".amadeus-plugin-composition.json")), harness).toBe(true);
      expect([...first.expectedPaths].some((path) => path.endsWith(".amadeus-plugin-audit.json")), harness).toBe(false);
      expect([...first.expectedPaths].some((path) => path.endsWith(".amadeus-plugin-drops.json")), harness).toBe(false);
      const composition = [...(first.artifacts ?? [])].find(([path]) =>
        path.endsWith(".amadeus-plugin-composition.json")
      )?.[1].toString("utf-8");
      expect(composition, harness).toEndWith("\n");
      expect(composition, harness).toContain('\n  "plugins":');
    }
  }, scaleTestTime(120_000));

  // #2790: the self-install faces are seeded by projectInTemporaryWorkspace, which
  // fed the authoring plugins/ tree into compose VERBATIM — so a {{HARNESS_DIR}}
  // token in plugin prose reached every face unresolved, and a raw `.claude/…`
  // literal reached every face as a foreign path. Asserted on the composed stage
  // (the surface a host actually reads), face by face.
  test("plugin prose resolves to each self-install face's own harness dir", () => {
    const composedStage = "plugins/github-pr-convergence/stages/pr-convergence.md";
    for (const harness of SELF_INSTALL_HARNESSES) {
      const dir = harnessDirOf(harness);
      const projection = buildSelfInstallProjection(harness, REPO_ROOT);
      const entry = [...(projection.artifacts ?? [])].find(([path]) => path === `${dir}/${composedStage}`);
      expect(entry, `${harness}: composed ${composedStage} missing`).toBeDefined();
      const text = entry![1].toString("utf-8");
      // (i) the plugin-owned sensor line names THIS face's plugin tools dir, exactly once.
      expect(
        text.split(`${dir}/plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts`).length - 1,
        harness,
      ).toBe(1);
      // (ii) no unresolved token survived the seeding copy.
      expect(text.includes("{{HARNESS_DIR}}"), `${harness}: raw token survived`).toBe(false);
      // (iii) no other harness's dir leaked into this face.
      for (const foreign of foreignHarnessDirs(harness)) {
        expect(text.includes(`${foreign}/`), `${harness}: foreign literal ${foreign}/`).toBe(false);
      }
    }
  }, scaleTestTime(300_000));

  test("Codex emits only the project-root .agents runner", () => {
    const projection = buildSelfInstallProjection("codex", REPO_ROOT);
    expect(projection.expectedPaths.has(".agents/skills/amadeus-pr-convergence/SKILL.md")).toBe(true);
    expect([...projection.expectedPaths].some((path) => path.startsWith(".codex/skills/"))).toBe(false);
  }, scaleTestTime(120_000));

  test("Cursor and OpenCode use their existing command entry instead of plugin runner skills", () => {
    for (const harness of ["cursor", "opencode"] as const) {
      const projection = buildSelfInstallProjection(harness, REPO_ROOT);
      expect([...projection.expectedPaths].some((path) => path.includes("amadeus-pr-convergence/SKILL.md"))).toBe(false);
      expect([...projection.expectedPaths].some((path) => path.endsWith("tools/data/stage-graph.json"))).toBe(true);
    }
  }, scaleTestTime(120_000));

  test("missing or empty selection has zero self-projection impact", () => {
    const missing = mkdtempSync(join(tmpdir(), "amadeus-t416-missing-"));
    const empty = mkdtempSync(join(tmpdir(), "amadeus-t416-empty-"));
    scratch.push(missing, empty);
    mkdirSync(join(empty, "amadeus"), { recursive: true });
    writeFileSync(join(empty, "amadeus", "config.json"), '{"plugin":{"activation":{"names":[]}}}\n');
    expect(buildSelfInstallProjection("claude", missing).expectedPaths.size).toBe(0);
    expect(buildSelfInstallProjection("codex", empty).expectedPaths.size).toBe(0);
  });

  test("invalid structured configuration fails closed", () => {
    const invalid = mkdtempSync(join(tmpdir(), "amadeus-t416-invalid-"));
    scratch.push(invalid);
    mkdirSync(join(invalid, "amadeus"), { recursive: true });
    writeFileSync(
      join(invalid, "amadeus", "config.json"),
      '{"plugin":{"activation":{"names":"github-pr-convergence"}}}\n',
    );

    expect(() => buildSelfInstallProjection("codex", invalid)).toThrow(
      /SELF_INSTALL rejected: amadeus\/config\.json plugin\.activation\.names/,
    );
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
  }, scaleTestTime(120_000));

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
      { kind: "runner", root: "\\skills" },
      { kind: "runner", root: "\\\\server\\share" },
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
    const slug = "pr-convergence";
    const current = defaultPluginCliDeps().derivedProjectionCurrent!;
    mkdirSync(dataDir, { recursive: true });
    const node = { slug, phase: "construction" } as Parameters<typeof renderStageRunner>[0];
    writeFileSync(graphPath, JSON.stringify([{ slug: 42 }, node]));

    writeFileSync(descriptor, JSON.stringify({ stageEntry: { kind: "runner", root: ".agents/skills" } }));
    const runner = join(projectDir, ".agents", "skills", `amadeus-${slug}`, "SKILL.md");
    mkdirSync(join(runner, ".."), { recursive: true });
    writeFileSync(runner, renderStageRunner(node));
    expect(current(hostRoot, pluginRecord(slug))).toBe(true);
    writeFileSync(runner, "# modified runner\n");
    expect(current(hostRoot, pluginRecord(slug))).toBe(false);
    writeFileSync(runner, renderStageRunner(node));
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
    writeFileSync(fallbackRunner, renderStageRunner(node));
    expect(current(hostRoot, pluginRecord(slug))).toBe(true);

    writeFileSync(graphPath, JSON.stringify([{ slug: "other" }]));
    expect(current(hostRoot, pluginRecord(slug))).toBe(false);
    writeFileSync(graphPath, JSON.stringify({ slug }));
    expect(current(hostRoot, pluginRecord(slug))).toBe(false);
    writeFileSync(graphPath, "not json");
    expect(current(hostRoot, pluginRecord(slug))).toBe(false);
  });
});
