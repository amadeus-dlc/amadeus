// covers: file:packages/framework/harness/claude/skills/amadeus/SKILL.md,
//         file:packages/framework/harness/codex/skills/amadeus/SKILL.md,
//         file:packages/framework/harness/kimi/skills/amadeus/SKILL.md,
//         file:packages/framework/harness/kiro/skills/amadeus/SKILL.md,
//         file:packages/framework/harness/kiro-ide/skills/amadeus/SKILL.md
// size: medium
//
// t366 (integration) — the SKILL "On CONFIRM" new-work instruction must name the
// tool that owns the `next --new-intent` verb (issue #1736). `amadeus-utility.ts`
// has no `next` verb; the verb lives in `amadeus-orchestrate.ts`.
//
// Corpus = git-tracked `*skills/amadeus/SKILL.md` (canonical + dist +
// self-install). Enumeration goes through git, so this is an integration-tier
// test (fs-tests-integration-first), never the unit tier.

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..");

function trackedSkillFiles(): string[] {
  const res = spawnSync("git", ["ls-files", "--", "*skills/amadeus/SKILL.md"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: process.env,
  });
  expect(res.status).toBe(0);
  return (res.stdout ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const files = trackedSkillFiles();

describe("t366 SKILL new-intent verb ownership", () => {
  test("the canonical harness SKILL files are part of the corpus", () => {
    for (const harness of ["claude", "codex", "kimi", "kiro", "kiro-ide"]) {
      expect(files).toContain(
        `packages/framework/harness/${harness}/skills/amadeus/SKILL.md`,
      );
    }
  });

  test.each(files)("%s never routes a `next` call through amadeus-utility.ts", (path) => {
    const lines = readFileSync(join(REPO_ROOT, path), "utf-8").split("\n");
    const offenders = lines
      .map((line, i) => ({ line, no: i + 1 }))
      .filter(({ line }) => /amadeus-utility\.ts next/.test(line))
      .map(({ no, line }) => `${path}:${no}: ${line.slice(0, 160)}`);
    expect(offenders).toEqual([]);
  });

  test.each(files)("%s points `next --new-intent` at amadeus-orchestrate.ts", (path) => {
    const lines = readFileSync(join(REPO_ROOT, path), "utf-8").split("\n");
    const instructions = lines.filter((line) => /\bnext --new-intent\b/.test(line));
    expect(instructions.length).toBeGreaterThan(0);
    for (const line of instructions) {
      expect(line).toContain("amadeus-orchestrate.ts next --new-intent");
    }
  });
});
