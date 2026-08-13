// t-remove-team-up-absence — launcher sources, recipes, and doctor copy stay gone.
// covers: FR-1, FR-2, FR-4, FR-5, NFR-1
// size: small

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "../..");

function gitLsFiles(pattern: string): string[] {
  const result = spawnSync("git", ["ls-files", "--", pattern], {
    cwd: ROOT,
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  return result.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}

function markdownFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) out.push(...markdownFiles(path));
    else if (name.endsWith(".md")) out.push(path);
  }
  return out;
}

describe("team-up launcher absence", () => {
  test("tracked sources are gone", () => {
    expect(gitLsFiles("packages/framework/core/tools/team-up.sh")).toEqual([]);
    expect(gitLsFiles("packages/framework/core/tools/team-up-codex-safety-wait.ts")).toEqual([]);
    expect(gitLsFiles("packages/framework/core/tools/team-msg.sh")).toEqual([]);
    expect(gitLsFiles("tests/**/*team-up*")).toEqual([
      "tests/integration/t-remove-team-up-absence.test.ts",
    ]);
    expect(gitLsFiles("tests/**/*team-msg*")).toEqual([]);
  });

  test("user guides do not teach a live team-up.sh or team-msg.sh invocation", () => {
    const recipe =
      /(?:bash\s+\S*)?(?:\{\{HARNESS_DIR\}\}|<harness-dir>)\/tools\/team-(?:up|msg)\.sh|scripts\/team-(?:up|msg)\.sh/;
    const hits: string[] = [];
    for (const file of markdownFiles(join(ROOT, "docs/guide"))) {
      const text = readFileSync(file, "utf8");
      if (recipe.test(text)) hits.push(file.slice(ROOT.length + 1));
    }
    expect(hits).toEqual([]);
  });

  test("doctor trust fix does not recommend the removed launcher", () => {
    const source = readFileSync(
      join(ROOT, "packages/framework/core/tools/amadeus-utility.ts"),
      "utf8",
    );
    expect(source).not.toContain("team-up.sh");
    expect(source).toContain('trust_level = "trusted"');
  });
});
