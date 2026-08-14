// covers: file:packages/framework/core/skills/amadeus-plugin/SKILL.md
// size: medium
//
// t354 — the /amadeus-plugin user-invocable skill: its contract against the
// plugin CLI's real usage block, its projection into every packaged and
// self-install face, and the runner-drift invariant that keeps it OUT of the
// generated stage-runner set.
//
// Modelled on t258-amadeus-mirror-skill.integration.test.ts (the sibling
// user-skill contract test). Medium tier: it reads the real repo tree.

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const read = (path: string): string => readFileSync(join(ROOT, path), "utf-8");

const SKILL_REL = "packages/framework/core/skills/amadeus-plugin/SKILL.md";
const skill = read(SKILL_REL);
const cli = read("packages/framework/core/tools/amadeus-plugin.ts");
const pluginRuntime = read("packages/framework/core/tools/amadeus-plugin-runtime.ts");

// The frontmatter fence, block-scoped the same way the skills-spec guard does.
function frontmatter(body: string): string {
  const match = body.match(/^---\n([\s\S]*?)\n---\n/u);
  return match === null ? "" : match[1];
}

describe("t354 skill contract against the live plugin CLI", () => {
  test("frontmatter carries the required user-invocable keys", () => {
    const fm = frontmatter(skill);
    expect(fm).not.toBe("");
    expect(fm).toMatch(/^name: amadeus-plugin$/mu);
    expect(fm).toMatch(/^description: /mu);
    expect(fm).toMatch(/^argument-hint: /mu);
    expect(fm).toMatch(/^user-invocable: true$/mu);
    // The skill dir name and the declared name must agree (skills-spec rule).
    expect(SKILL_REL).toContain("/amadeus-plugin/");
  });

  test("every verb of the CLI usage block appears in the skill contract", () => {
    // Derive the verb set from the CLI's own USAGE lines rather than restating
    // it here, so a new verb fails this test instead of silently diverging.
    const usage = cli.slice(cli.indexOf("const USAGE = ["));
    const verbs = [...usage.slice(0, usage.indexOf("].join")).matchAll(
      /^\s*"\s{2}(?<verb>[a-z]+)\s/gmu,
    )].map((m) => m.groups?.verb as string);
    expect(verbs.sort()).toEqual([
      "compose",
      "doctor",
      "drop",
      "install",
      "status",
    ]);
    for (const verb of verbs) expect(skill).toContain(verb);
  });

  test("the contract fence spells the flag forms the CLI parser accepts", () => {
    for (const form of [
      "compose [--if-stale] [--project-root <dir>]",
      "doctor [--project-root <dir>]",
      "drop <plugin-name> [--project-root <dir>]",
      "install <path> [--force] [--project-root <dir>]",
      "status [--project-root <dir>]",
    ]) {
      expect(skill).toContain(form);
    }
  });

  test("the skill gates mutation and never derives a command from prose", () => {
    expect(skill).toContain("Never derive a command from output prose");
    expect(skill).toContain("no automatic execution");
    // The staging root it names is the CLI's own constant, not a guess. The CLI
    // re-exports it from the runtime leaf that defines it (#2997), so the
    // definition site is where the literal is read from.
    const staging = pluginRuntime.match(
      /PLUGIN_SOURCE_DIR_NAME = "(?<dir>[^"]+)"/u,
    )?.groups?.dir as string;
    expect(staging).toBeTruthy();
    expect(skill).toContain(staging);
  });
});

describe("t354 projection into every packaged and self-install face", () => {
  const manifests = [
    "packages/framework/harness/claude/manifest.ts",
    "packages/framework/harness/cursor/manifest.ts",
    "packages/framework/harness/kimi/manifest.ts",
    "packages/framework/harness/kiro/manifest.ts",
    "packages/framework/harness/kiro-ide/manifest.ts",
  ];

  test.each(manifests)("%s projects the plugin skill via coreDirs", (path) => {
    expect(read(path)).toContain(
      '{ src: "skills/amadeus-plugin", dst: "skills/amadeus-plugin" }',
    );
  });

  test("Codex and OpenCode emit it through their session-skill paths", () => {
    expect(read("packages/framework/harness/codex/emit.ts")).toContain(
      '"amadeus-plugin"',
    );
    expect(read("packages/framework/harness/opencode/emit.ts")).toContain(
      '"amadeus-plugin"',
    );
  });

  test("the shipped dist tree carries the skill on every packaged face", () => {
    for (const rel of [
      "dist/claude/.claude/skills/amadeus-plugin/SKILL.md",
      "dist/codex/.agents/skills/amadeus-plugin/SKILL.md",
      "dist/cursor/.cursor/skills/amadeus-plugin/SKILL.md",
      "dist/kimi/.kimi-code/skills/amadeus-plugin/SKILL.md",
      "dist/kiro/.kiro/skills/amadeus-plugin/SKILL.md",
      "dist/kiro-ide/.kiro/skills/amadeus-plugin/SKILL.md",
      "dist/opencode/.opencode/skills/amadeus-plugin/SKILL.md",
    ]) {
      expect(existsSync(join(ROOT, rel))).toBe(true);
    }
  });

  test("Codex ships the implicit-invocation guard beside the skill", () => {
    expect(
      existsSync(
        join(ROOT, "dist/codex/.agents/skills/amadeus-plugin/agents/openai.yaml"),
      ),
    ).toBe(true);
  });
});

describe("t354 runner-drift invariant", () => {
  // amadeus-runner-gen.ts's isRunnerSkill() classifies a skills/amadeus-<slug>/
  // dir as a GENERATED stage runner when its SKILL.md carries BOTH the
  // "--stage" marker and "--single". A hand-authored skill carrying both would
  // be treated as an orphan runner and pruned by `runner-gen write`, and would
  // fail `runner-gen check` in between. Pin the exclusion at the source.
  test("the skill carries neither stage-runner marker", () => {
    expect(skill).not.toContain("--stage");
    expect(skill).not.toContain("--single");
  });

  test("the guard's classifier is still the two-marker conjunction", () => {
    const gen = read("packages/framework/core/tools/amadeus-runner-gen.ts");
    expect(gen).toContain('const SINGLE_RUNNER_MARKER = "--stage"');
    expect(gen).toContain(
      'body.includes(SINGLE_RUNNER_MARKER) && body.includes("--single")',
    );
  });
});
