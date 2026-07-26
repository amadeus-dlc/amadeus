// covers: file:scripts
// size: medium
//
// t227 — contributor-only skill projection in scripts/promote-self.ts.
// Mechanism: in-process drive of promoteSelfMain against a temp fixture root.
//
// Contributor skills are repository maintenance tools, not framework product
// features. Their canonical source lives under contrib/skills/ and promote-self
// projects its runtime files into both project-local discovery trees without
// adding it to dist/. Authoring-only eval assets remain canonical. This test
// proves projection, pruning, drift detection, repair, and removal.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promoteSelfMain } from "../../scripts/promote-self.ts";

let root: string;
let kimiHome: string;
const savedKimiHome = process.env.KIMI_CODE_HOME;

const write = (rel: string, content: string): void => {
  const abs = join(root, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content);
};

// Minimal snippet master so the FR-1 kimi hooks merge (fired by --apply
// whenever dist/kimi/.kimi-code exists) can render the managed block; the
// merge targets a temp KIMI_CODE_HOME, never the real user-level config.
const SNIPPET = [
  "# >>> amadeus-kimi-hooks >>>",
  "[[hooks]]",
  'event = "Stop"',
  'command = "bun .kimi-code/hooks/amadeus-kimi-adapter.ts stop"',
  "# <<< amadeus-kimi-hooks <<<",
  "",
].join("\n");

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "t227-project-skill-"));
  kimiHome = mkdtempSync(join(tmpdir(), "t227-kimi-home-"));
  process.env.KIMI_CODE_HOME = kimiHome;
  write("dist/claude/.claude/tools/a.txt", "alpha\n");
  write("dist/codex/.codex/b.txt", "beta\n");
  write("dist/codex/.agents/c.txt", "gamma\n");
  write("dist/cursor/.cursor/d.txt", "delta\n");
  write("dist/opencode/.opencode/e.txt", "epsilon\n");
  write("dist/kimi/.kimi-code/f.txt", "zeta\n");
  write("packages/framework/harness/kimi/hooks/amadeus-hooks.snippet.toml", SNIPPET);
  write("dist/codex/AGENTS.md", "# AI-DLC on Codex CLI\n\ngenerated\n");
  write(".claude/CLAUDE.md", "# Claude onboarding\n");
  write("AGENTS.md", "# Project rules\n");
  write(
    "contrib/skills/amadeus-upstream-sync/SKILL.md",
    "---\nname: amadeus-upstream-sync\ndescription: Test fixture skill.\n---\n",
  );
  write(
    "contrib/skills/amadeus-upstream-sync/agents/openai.yaml",
    "policy:\n  allow_implicit_invocation: true\n",
  );
  write("contrib/skills/amadeus-upstream-sync/evals/evals.json", "{\"evals\": []}\n");
});

afterEach(() => {
  if (savedKimiHome === undefined) delete process.env.KIMI_CODE_HOME;
  else process.env.KIMI_CODE_HOME = savedKimiHome;
  rmSync(root, { recursive: true, force: true });
  rmSync(kimiHome, { recursive: true, force: true });
});

describe("t227 contributor skill projection", () => {
  test("--apply projects runtime files but keeps evals canonical", async () => {
    write(".claude/skills/amadeus-upstream-sync/evals/evals.json", "stale\n");
    write(".agents/skills/amadeus-upstream-sync/evals/evals.json", "stale\n");
    expect(await promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);

    const source = readFileSync(
      join(root, "contrib/skills/amadeus-upstream-sync/SKILL.md"),
      "utf-8",
    );
    expect(readFileSync(join(root, ".claude/skills/amadeus-upstream-sync/SKILL.md"), "utf-8"))
      .toBe(source);
    expect(readFileSync(join(root, ".agents/skills/amadeus-upstream-sync/SKILL.md"), "utf-8"))
      .toBe(source);
    expect(existsSync(join(root, "contrib/skills/amadeus-upstream-sync/evals/evals.json")))
      .toBe(true);
    expect(existsSync(join(root, ".claude/skills/amadeus-upstream-sync/evals/evals.json")))
      .toBe(false);
    expect(existsSync(join(root, ".agents/skills/amadeus-upstream-sync/evals/evals.json")))
      .toBe(false);
    expect(existsSync(join(root, "dist/claude/.claude/skills/amadeus-upstream-sync")))
      .toBe(false);
    expect(existsSync(join(root, "dist/codex/.agents/skills/amadeus-upstream-sync")))
      .toBe(false);
    expect(await promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  test("--check detects projection drift and --apply repairs both copies", async () => {
    expect(await promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    write(".claude/skills/amadeus-upstream-sync/SKILL.md", "drift\n");
    expect(await promoteSelfMain(["--no-build"], root)).toBe(1);
    expect(await promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    expect(await promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  test("removing canonical source removes both projected orphans", async () => {
    expect(await promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    rmSync(join(root, "contrib/skills/amadeus-upstream-sync"), {
      recursive: true,
      force: true,
    });
    expect(await promoteSelfMain(["--no-build"], root)).toBe(1);
    expect(await promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    expect(existsSync(join(root, ".claude/skills/amadeus-upstream-sync/SKILL.md"))).toBe(false);
    expect(existsSync(join(root, ".agents/skills/amadeus-upstream-sync/SKILL.md"))).toBe(false);
  });
});
