import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const read = (path: string): string => readFileSync(join(ROOT, path), "utf-8");
const skill = read("packages/framework/core/skills/amadeus-mirror/SKILL.md");
const tool = read("packages/framework/core/tools/amadeus-mirror.ts");
const english = read("docs/guide/17-skills.md");
const japanese = read("docs/guide/17-skills.ja.md");

describe("t258 skill and U1 contract integration", () => {
  test("skill finding vocabulary equals the U1 public union", () => {
    const union = tool
      .match(
        /export type StatusFindingKind =([\s\S]*?);\n\nexport type StatusFinding/,
      )?.[1]
      .match(/"([^"]+)"/g)
      ?.map((value) => value.slice(1, -1))
      .sort();
    const documented = [
      "issue-drifted",
      "mirror-missing",
      "stale-status-line",
    ];
    expect(union).toEqual(documented);
    for (const kind of documented) expect(skill).toContain(kind);
  });

  test("skill ignores U1 finding detail while U1 retains its own state logic", () => {
    expect(skill).not.toContain('Status="Running"');
    expect(skill).not.toContain('Status="Completed"');
    expect(skill).toContain("Only the finding kind may drive the next step");
    expect(tool).toContain('workflowStatus === "Completed"');
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
    expect(read(path)).toContain(
      '{ src: "skills/amadeus-mirror", dst: "skills/amadeus-mirror" }',
    );
  });

  test("Codex emits the mirror skill through its guarded session-skill path", () => {
    const emit = read("packages/framework/harness/codex/emit.ts");
    expect(emit).toContain('"amadeus-mirror"');
    expect(emit).toContain('"agents", "openai.yaml"');
  });

  test("OpenCode emits the mirror skill through its session-skill path", () => {
    const emit = read("packages/framework/harness/opencode/emit.ts");
    expect(emit).toContain('"amadeus-mirror"');
    expect(emit).toContain("for (const skill of SESSION_SKILLS)");
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
