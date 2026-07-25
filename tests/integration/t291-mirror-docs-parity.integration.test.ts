// t291 — runtime/docs/skill semantic parity.
// covers: scripts/mirror-docs-contract.ts, packages/framework/core/skills/amadeus-mirror/SKILL.md
// size: medium

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { MIRROR_USER_CONTRACT } from "../../packages/framework/core/tools/amadeus-mirror-presentation.ts";
import { validateMirrorDocs } from "../../scripts/mirror-docs-contract.ts";

describe("t291 semantic parity", () => {
  test("all docs match the runtime contract and skill names every repair command", () => {
    expect(validateMirrorDocs(process.cwd())).toEqual([]);
    const skill = readFileSync(
      "packages/framework/core/skills/amadeus-mirror/SKILL.md",
      "utf-8",
    );
    for (const command of MIRROR_USER_CONTRACT.repairCommands)
      expect(skill).toContain(command.path.join(" "));
    expect(skill).toContain("off | prompt | auto");
    expect(skill).toMatch(/Legacy\s+booleans are rejected/u);
  });

  test("skill uses a harness-neutral literal and forbids background consent", () => {
    const skill = readFileSync(
      "packages/framework/core/skills/amadeus-mirror/SKILL.md",
      "utf-8",
    );
    expect(skill).not.toContain("{{HARNESS_DIR}}");
    expect(skill).toContain("<harness-dir>");
    expect(skill).toMatch(/not\s+background consent/u);
    expect(skill).toContain("never authorizes repair");
  });
});
