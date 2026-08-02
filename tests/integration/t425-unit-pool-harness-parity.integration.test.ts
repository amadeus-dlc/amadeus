// covers: file:packages/framework/core/tools/amadeus-unit-pool.ts
// covers: file:packages/framework/core/tools/amadeus-unit-pool-runtime.ts
// size: medium

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("t425 harness parity", () => {
  const roots = [
    ["claude", ".claude", ".claude/skills/amadeus/SKILL.md"],
    ["codex", ".codex", ".agents/skills/amadeus/SKILL.md"],
    ["cursor", ".cursor", ".cursor/commands/amadeus.md"],
    ["kimi", ".kimi-code", ".kimi-code/skills/amadeus/SKILL.md"],
    ["kiro", ".kiro", ".kiro/skills/amadeus/SKILL.md"],
    ["kiro-ide", ".kiro", ".kiro/skills/amadeus/SKILL.md"],
    ["opencode", ".opencode", ".opencode/commands/amadeus.md"],
  ] as const;

  test.each(roots)("%s ships the same pool owner and native-fact-only protocol", (harness, dir, instruction) => {
    expect(existsSync(join("dist", harness, dir, "tools", "amadeus-unit-pool.ts"))).toBe(true);
    expect(existsSync(join("dist", harness, dir, "tools", "amadeus-unit-pool-runtime.ts"))).toBe(true);
    const text = readFileSync(join("dist", harness, instruction), "utf8");
    expect(text).toContain("confirm-dispatch");
    expect(text).toContain("never owns queue order");
    expect(text).toContain("finalize");
  });
});
