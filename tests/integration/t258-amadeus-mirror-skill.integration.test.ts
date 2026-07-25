import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MIRROR_USER_CONTRACT,
  renderMirrorLifecycleHelp,
} from "../../packages/framework/core/tools/amadeus-mirror-presentation.ts";

const ROOT = join(import.meta.dir, "..", "..");
const read = (path: string): string => readFileSync(join(ROOT, path), "utf-8");
const skill = read("packages/framework/core/skills/amadeus-mirror/SKILL.md");
const lifecycle = read(
  "packages/framework/core/tools/amadeus-mirror-lifecycle.ts",
);
const presentation = read(
  "packages/framework/core/tools/amadeus-mirror-presentation.ts",
);
const english = read("docs/guide/17-skills.md");
const japanese = read("docs/guide/17-skills.ja.md");

describe("t258 skill and lifecycle contract integration", () => {
  test("skill verb vocabulary equals the runtime lifecycle surface", () => {
    const help = renderMirrorLifecycleHelp();
    for (const verb of ["manual create", "manual sync", "manual close"]) {
      expect(skill).toContain(verb);
    }
    for (const verb of ["repair status", "repair relink", "repair abandon"]) {
      expect(skill).toContain(verb);
      expect(help).toContain(verb);
    }
    expect(lifecycle).toContain("renderMirrorLifecycleHelp");
    expect(presentation).toContain("MIRROR_USER_CONTRACT");
  });

  test("skill treats diagnostics as prose while runtime retains state logic", () => {
    expect(skill).not.toContain('Status="Running"');
    expect(skill).not.toContain('Status="Completed"');
    expect(skill).toContain("Never derive a command from output prose");
    expect(presentation).toContain('completionOrder: ["create", "sync", "close"]');
    expect(presentation).toContain('"workflow-completed"');
  });
});

describe("t258 six-harness projection wiring", () => {
  const direct = [
    "packages/framework/harness/claude/manifest.ts",
    "packages/framework/harness/kiro/manifest.ts",
    "packages/framework/harness/kiro-ide/manifest.ts",
    "packages/framework/harness/cursor/manifest.ts",
  ];

  test.each(direct)("%s directly projects the mirror skill", (path) => {
    expect(read(path)).toContain("mirrorCoreSkillDirectory");
  });

  test("Codex emits the mirror skill through its guarded session-skill path", () => {
    const emit = read("packages/framework/harness/codex/emit.ts");
    expect(emit).toContain('mirrorSessionSkillName("codex")');
    expect(emit).toContain('"agents", "openai.yaml"');
  });

  test("OpenCode emits the mirror skill through its session-skill path", () => {
    const emit = read("packages/framework/harness/opencode/emit.ts");
    expect(emit).toContain('mirrorSessionSkillName("opencode")');
    expect(emit).toContain("for (const skill of SESSION_SKILLS)");
  });

  test("runtime modules do not duplicate canonical contract arrays", () => {
    for (const source of [lifecycle, read(
      "packages/framework/core/tools/amadeus-mirror.ts",
    )].map((value) => value.replaceAll(/\s/gu, ""))) {
      expect(source).not.toContain(JSON.stringify(MIRROR_USER_CONTRACT.modes));
      expect(source).not.toContain(
        JSON.stringify(MIRROR_USER_CONTRACT.operations),
      );
      expect(source).not.toContain(JSON.stringify(MIRROR_USER_CONTRACT.boundaries));
    }
  });
});

describe("t258 English and Japanese mirror guide parity", () => {
  const requiredTokens = [
    "/amadeus-mirror",
    "status",
    "create",
    "sync",
    "close",
    "exit 0",
    "exit 1",
    "exit 2",
    "mirror-missing",
    "stale-status-line",
    "issue-drifted",
    "--intent",
    "basename",
    "team.md",
  ];

  test("both guides contain one mirror workflow section", () => {
    expect(english.match(/^## Mirror workflow/gm)).toHaveLength(1);
    expect(japanese.match(/^## ミラーワークフロー/gm)).toHaveLength(1);
  });

  test.each(requiredTokens)("both guides carry the %s contract token", (token) => {
    expect(english).toContain(token);
    expect(japanese).toContain(token);
  });

  test("both guides require a human final choice and reject automatic action", () => {
    expect(english).toMatch(/human chooses the final verb\s+explicitly/);
    expect(english).toContain("no automatic execution");
    expect(japanese).toContain("人間が最終 verb を明示的に選択");
    expect(japanese).toContain("自動実行はありません");
  });

  test("both guides describe the operational convention as non-mechanical", () => {
    expect(english).toContain("not a mechanically enforced restriction");
    expect(japanese).toContain("機械的に強制される制約ではありません");
  });
});
