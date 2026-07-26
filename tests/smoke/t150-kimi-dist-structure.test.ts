// t150-kimi-dist-structure: structural smoke for the dist/kimi harness tree.
//
// covers: file:harness.json
//
// Mirrors t149's pattern (dist/opencode + dist/cursor) for the seventh
// harness: the SHIPPED dist/kimi tree carries the load-bearing generated
// artifacts the Kimi Code shell needs — the core-projected engine, the
// authored orchestrator + question-rendering annex, the managed-block hook
// snippet (ADR-4 single source), the runner-gen skill set, all six session
// skills (FR-10), and the workspace shell seed. Pure fs reads — no spawn,
// no LLM.
//
// Existence-plane check, deliberately paired with the byte-plane drift guard
// (`bun run dist:check`): dist:check proves every shipped file is
// byte-identical to its packages/framework/core + harness/kimi source, while
// this smoke pins WHICH files must exist at all. The expected table below is
// a MODULE-SCOPE literal, NOT derived from manifest.ts — a manifest bug that
// drops a file must not silently co-vary the expectation into false green
// (BR-6).
//
// MAINTENANCE CONTRACT: a PR that changes manifest.ts's artifact composition
// for kimi (adds/removes/renames a shipped file class) MUST update the
// expected-file table here in the same PR.

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DIST = join(REPO_ROOT, "dist");

// Paths are relative to dist/kimi. Confirmed against the real shipped tree.
const KIMI_EXPECTED: ReadonlyArray<string> = [
  ".kimi-code/skills/amadeus/SKILL.md", // orchestrator (/skill:amadeus)
  ".kimi-code/skills/amadeus/question-rendering.md", // AskUserQuestion annex
  ".kimi-code/hooks/amadeus-hooks.snippet.toml", // managed-block source (ADR-4)
  ".kimi-code/tools/amadeus-orchestrate.ts", // the deterministic engine
  ".kimi-code/tools/data/harness.json", // harness descriptor
  ".kimi-code/tools/data/stage-graph.json", // compiled stage graph
  ".kimi-code/tools/data/scope-grid.json", // compiled scope grid
  ".kimi-code/VERSION", // framework version marker
  // runner-gen products (FR-1c): stage runner, scope runner, init, compose
  ".kimi-code/skills/amadeus-code-generation/SKILL.md",
  ".kimi-code/skills/amadeus-feature/SKILL.md",
  ".kimi-code/skills/amadeus-init/SKILL.md",
  ".kimi-code/skills/amadeus-compose/SKILL.md",
  // session skills (6) — session-cost / replay / outcomes-pack / grilling /
  // mirror / election (FR-10, coreDirs projection)
  ".kimi-code/skills/amadeus-session-cost/SKILL.md",
  ".kimi-code/skills/amadeus-replay/SKILL.md",
  ".kimi-code/skills/amadeus-outcomes-pack/SKILL.md",
  ".kimi-code/skills/amadeus-grilling/SKILL.md",
  ".kimi-code/skills/amadeus-mirror/SKILL.md",
  ".kimi-code/skills/amadeus-election/SKILL.md",
  // project-root install files (beside .kimi-code/, not inside it)
  "AGENTS.md", // session-resume onboarding surface
  ".gitignore", // workspace ignore split (harness-neutral + local.toml)
  // workspace shell seed (sibling of .kimi-code/, read by the engine)
  "amadeus/active-space",
  "amadeus/spaces/default/memory/org.md",
];

function readHarnessJson(): Record<string, unknown> {
  const p = join(DIST, "kimi", ".kimi-code", "tools", "data", "harness.json");
  return JSON.parse(readFileSync(p, "utf-8")) as Record<string, unknown>;
}

describe("t150 dist/kimi file structure", () => {
  test("dist/kimi ships every expected artifact", () => {
    for (const rel of KIMI_EXPECTED) {
      expect(existsSync(join(DIST, "kimi", rel))).toBe(true);
    }
  });

  test("kimi harness.json pins harnessDir and rulesSubdir", () => {
    const j = readHarnessJson();
    expect(j.harnessDir).toBe(".kimi-code");
    expect(j.rulesSubdir).toBe("rules");
  });
});
