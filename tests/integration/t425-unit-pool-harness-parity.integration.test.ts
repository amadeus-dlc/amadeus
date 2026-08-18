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
    const poolPath = join("dist", harness, dir, "tools", "amadeus-unit-pool.ts");
    const runtimePath = join("dist", harness, dir, "tools", "amadeus-unit-pool-runtime.ts");
    expect(existsSync(poolPath)).toBe(true);
    expect(existsSync(runtimePath)).toBe(true);
    expect(readFileSync(poolPath, "utf8")).toBe(
      readFileSync("packages/framework/core/tools/amadeus-unit-pool.ts", "utf8"),
    );
    expect(readFileSync(runtimePath, "utf8")).toBe(
      readFileSync("packages/framework/core/tools/amadeus-unit-pool-runtime.ts", "utf8"),
    );
    const text = readFileSync(join("dist", harness, instruction), "utf8");
    expect(text).toContain("never owns queue order");
    expect(text).toContain("prepare --batch <directive.batch> --units <all> --concurrency <directive.cap>");
    expect(text).toContain("acquire --batch <directive.batch> --idempotency-key <stable-delivery-id>");
    expect(text).toContain("confirm-dispatch --batch <directive.batch> --attempt <attempt-id> --native-handle <handle> --idempotency-key <stable-delivery-id>");
    expect(text).toContain("settle-release --batch <directive.batch> --attempt <attempt-id> --outcome <succeeded|failed> --idempotency-key <stable-delivery-id>");
    expect(text).toContain("record-reconciliation --batch <directive.batch> --attempt <attempt-id> --reconciliation-kind <kind> --effect <no-effect-confirmed|effect-possible|unknown> --idempotency-key <stable-delivery-id>");
    expect(text).toContain("late-result-observed --batch <directive.batch> --attempt <attempt-id> --outcome <outcome> --idempotency-key <stable-delivery-id>");
    expect(text).toContain("finalize --batch <directive.batch> --units <all> --claimed <converged> --check-cmd");
    expect(text).toContain("pool exists and is terminal");
  });
});
