// covers: function:renderAdvisoryChoiceQuestion
// size: medium
//
// End-to-end packaging proof for the user-visible advisory question. Each
// shipped harness projection is loaded in a fresh Bun process, exactly as an
// installed harness loads its directive contract. The expected text is a
// specification literal: every message must survive byte-for-byte and in order.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const PROJECTIONS = [
  ["claude", "dist/claude/.claude/tools/amadeus-directive.ts"],
  ["codex", "dist/codex/.codex/tools/amadeus-directive.ts"],
  ["cursor", "dist/cursor/.cursor/tools/amadeus-directive.ts"],
  ["kimi", "dist/kimi/.kimi-code/tools/amadeus-directive.ts"],
  ["kiro", "dist/kiro/.kiro/tools/amadeus-directive.ts"],
  ["kiro-ide", "dist/kiro-ide/.kiro/tools/amadeus-directive.ts"],
  ["opencode", "dist/opencode/.opencode/tools/amadeus-directive.ts"],
] as const;

const EXPECTED =
  "first advisory\nwith detail\nsecond advisory: do not summarize\n\n" +
  "各advisoryについて次のいずれかを選択してください。";

describe("advisory human choice user-visible rendering", () => {
  test.each(PROJECTIONS)("%s projection renders every advisory message verbatim", (_harness, relativePath) => {
    const moduleUrl = pathToFileURL(join(REPO_ROOT, relativePath)).href;
    const script = [
      `const module = await import(${JSON.stringify(moduleUrl)});`,
      "const rendered = module.renderAdvisoryChoiceQuestion([",
      "  { message: 'first advisory\\nwith detail' },",
      "  { message: 'second advisory: do not summarize' },",
      "]);",
      "process.stdout.write(rendered);",
    ].join("\n");
    const result = spawnSync(process.execPath, ["-e", script], { encoding: "utf-8" });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe(EXPECTED);
  });
});
