// t149-opencode-cursor-dist-structure: structural smoke for the dist/opencode
// and dist/cursor harness trees.
//
// covers: file:harness.json
//
// Mirrors t148's pattern (dist/kiro) for the two newest harnesses: the SHIPPED
// dist/opencode and dist/cursor trees carry the load-bearing generated
// artifacts each shell needs. Pure fs reads — no spawn, no LLM.
//
// Existence-plane check, deliberately paired with the byte-plane drift guard
// (`bun run dist:check`): dist:check proves every shipped file is byte-identical
// to its packages/framework/core + harness/<h> source, while this smoke pins
// WHICH files must exist at all. The expected tables below are MODULE-SCOPE
// literals, NOT derived from manifest.ts — a manifest bug that drops a file must
// not silently co-vary the expectation into false green.
//
// MAINTENANCE CONTRACT: a PR that changes manifest.ts's artifact composition for
// opencode or cursor (adds/removes/renames a shipped file class) MUST update the
// matching expected-file table here in the same PR.

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIST = join(REPO_ROOT, "dist");

// Paths are relative to dist/<harness>. Confirmed against the real shipped tree.
const OPENCODE_EXPECTED: ReadonlyArray<string> = [
  ".opencode/commands/amadeus.md", // orchestrator ($amadeus command)
  "AGENTS.md", // session-resume onboarding surface
  ".opencode/opencode.json.example", // $schema + permission-narrowing example
  // session skills (4) — session-cost / replay / outcomes-pack / grilling
  ".opencode/skills/amadeus-session-cost/SKILL.md",
  ".opencode/skills/amadeus-replay/SKILL.md",
  ".opencode/skills/amadeus-outcomes-pack/SKILL.md",
  ".opencode/skills/amadeus-grilling/SKILL.md",
  ".opencode/tools/amadeus-orchestrate.ts", // the deterministic engine
  ".opencode/tools/data/harness.json", // harness descriptor
  // workspace shell seed (sibling of .opencode/, read by the engine)
  "amadeus/active-space",
  "amadeus/spaces/default/memory/org.md",
];

const CURSOR_EXPECTED: ReadonlyArray<string> = [
  ".cursor/rules/amadeus.mdc", // always-applied project rule
  ".cursor/commands/amadeus.md", // orchestrator
  "AGENTS.md", // session-resume onboarding surface
  ".cursor/hooks.json.example", // 8-event hook wiring template
  ".cursor/hooks/amadeus-cursor-adapter.ts", // Cursor event → framework hook adapter
  ".cursor/hooks/amadeus-cursor-lib.ts", // adapter shared library
  ".cursor/tools/data/harness.json", // harness descriptor
  // workspace shell seed (sibling of .cursor/, read by the engine)
  "amadeus/active-space",
  "amadeus/spaces/default/memory/org.md",
];

function readHarnessJson(harness: string): Record<string, unknown> {
  const p = join(DIST, harness, `.${harness}`, "tools", "data", "harness.json");
  return JSON.parse(readFileSync(p, "utf-8")) as Record<string, unknown>;
}

describe("t149 dist/opencode + dist/cursor file structure", () => {
  test("dist/opencode ships every expected artifact", () => {
    for (const rel of OPENCODE_EXPECTED) {
      expect(existsSync(join(DIST, "opencode", rel))).toBe(true);
    }
  });

  test("dist/cursor ships every expected artifact", () => {
    for (const rel of CURSOR_EXPECTED) {
      expect(existsSync(join(DIST, "cursor", rel))).toBe(true);
    }
  });

  test("opencode harness.json pins harnessDir and rulesSubdir", () => {
    const j = readHarnessJson("opencode");
    expect(j.harnessDir).toBe(".opencode");
    expect(j.rulesSubdir).toBe("amadeus-rules");
  });

  test("cursor harness.json pins harnessDir and rulesSubdir", () => {
    const j = readHarnessJson("cursor");
    expect(j.harnessDir).toBe(".cursor");
    expect(j.rulesSubdir).toBe("amadeus-rules");
  });
});
