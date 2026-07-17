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

const write = (rel: string, content: string): void => {
  const abs = join(root, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content);
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "t227-project-skill-"));
  write("dist/claude/.claude/tools/a.txt", "alpha\n");
  write("dist/codex/.codex/b.txt", "beta\n");
  write("dist/codex/.agents/c.txt", "gamma\n");
  write("dist/cursor/.cursor/d.txt", "delta\n");
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
  rmSync(root, { recursive: true, force: true });
});

describe("t227 contributor skill projection", () => {
  test("--apply projects runtime files but keeps evals canonical", () => {
    write(".claude/skills/amadeus-upstream-sync/evals/evals.json", "stale\n");
    write(".agents/skills/amadeus-upstream-sync/evals/evals.json", "stale\n");
    expect(promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);

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
    expect(promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  test("--check detects projection drift and --apply repairs both copies", () => {
    expect(promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    write(".claude/skills/amadeus-upstream-sync/SKILL.md", "drift\n");
    expect(promoteSelfMain(["--no-build"], root)).toBe(1);
    expect(promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    expect(promoteSelfMain(["--no-build"], root)).toBe(0);
  });

  test("removing canonical source removes both projected orphans", () => {
    expect(promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    rmSync(join(root, "contrib/skills/amadeus-upstream-sync"), {
      recursive: true,
      force: true,
    });
    expect(promoteSelfMain(["--no-build"], root)).toBe(1);
    expect(promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    expect(existsSync(join(root, ".claude/skills/amadeus-upstream-sync/SKILL.md"))).toBe(false);
    expect(existsSync(join(root, ".agents/skills/amadeus-upstream-sync/SKILL.md"))).toBe(false);
  });
});
