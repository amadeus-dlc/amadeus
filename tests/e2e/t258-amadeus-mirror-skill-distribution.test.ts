import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const CORE = readFileSync(
  join(
    ROOT,
    "packages",
    "framework",
    "core",
    "skills",
    "amadeus-mirror",
    "SKILL.md",
  ),
  "utf-8",
);

const targets = [
  ["claude", ".claude", "dist/claude/.claude/skills/amadeus-mirror/SKILL.md"],
  ["codex", ".codex", "dist/codex/.agents/skills/amadeus-mirror/SKILL.md"],
  ["cursor", ".cursor", "dist/cursor/.cursor/skills/amadeus-mirror/SKILL.md"],
  ["kiro", ".kiro", "dist/kiro/.kiro/skills/amadeus-mirror/SKILL.md"],
  ["kiro-ide", ".kiro", "dist/kiro-ide/.kiro/skills/amadeus-mirror/SKILL.md"],
  ["opencode", ".opencode", "dist/opencode/.opencode/skills/amadeus-mirror/SKILL.md"],
] as const;

describe("t258 mirror skill distribution", () => {
  test.each(targets)("%s ships one transformed SKILL.md", (_, harnessDir, rel) => {
    const path = join(ROOT, rel);
    expect(existsSync(path)).toBe(true);
    const shipped = readFileSync(path, "utf-8");
    expect(shipped).toBe(CORE.replaceAll("{{HARNESS_DIR}}", harnessDir));
    expect(shipped).not.toContain("{{HARNESS_DIR}}");
  });

  test.each(targets)(
    "%s preserves status-first and the human action boundary",
    (_, __, rel) => {
      const shipped = readFileSync(join(ROOT, rel), "utf-8");
      expect(shipped.indexOf("## Step 1: Run status first")).toBeLessThan(
        shipped.indexOf("## Step 3: Run only the selected fixed verb"),
      );
      expect(shipped).toContain("explicitly select the final verb");
      expect(shipped).toContain("display-only untrusted");
      expect(shipped).toContain("existing intent directory");
      expect(shipped).toContain("as one argument");
      const executableLines = [
        ...shipped.matchAll(/^```bash\n([\s\S]*?)^```/gm),
      ]
        .flatMap((match) => match[1].split("\n"))
        .filter((line) => line.startsWith("bun "));
      expect(executableLines).toHaveLength(4);
      expect(
        executableLines.every(
          (line) => !line.includes("--intent") && !/[\[<$]/.test(line),
        ),
      ).toBe(true);
    },
  );

  test("Codex mirror skill carries the implicit-invocation guard", () => {
    expect(
      existsSync(
        join(
          ROOT,
          "dist/codex/.agents/skills/amadeus-mirror/agents/openai.yaml",
        ),
      ),
    ).toBe(true);
  });
});
