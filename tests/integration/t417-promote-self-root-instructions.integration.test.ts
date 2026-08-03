// covers: file:scripts/promote-self.ts, file:packages/framework/harness/claude/project-instructions.ts
// size: medium

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROJECT_INSTRUCTIONS } from "../../packages/framework/harness/claude/project-instructions.ts";
import { DistributionTransactionCoordinator } from "../../scripts/distribution-transaction.ts";
import { promoteSelfMain } from "../../scripts/promote-self.ts";

const CLAUDE_ONBOARDING = "@.claude/rules/amadeus.md\n\n# Claude onboarding\n";
const ROOT_AGENTS = [
  "@.agents/rules/amadeus.md",
  "@.agents/rules/amadeus-codex-suffix.md",
  "",
  "# Project rules",
  "",
].join("\n");
const CODEX_DIST_AGENTS = [
  "@.agents/rules/amadeus.md",
  "",
  "# AI-DLC on Codex CLI",
  "",
  "generated",
  "",
].join("\n");

let root: string;

function write(relativePath: string, contents: string): void {
  const path = join(root, relativePath);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, contents);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "t417-promote-self-root-instructions-"));
  write("dist/claude/.claude/tools/a.txt", "alpha\n");
  write("dist/codex/.codex/b.txt", "beta\n");
  write("dist/codex/.agents/rules/amadeus.md", "method import\n");
  write("dist/cursor/.cursor/d.txt", "delta\n");
  write("dist/opencode/.opencode/e.txt", "epsilon\n");
  write("dist/kimi/.kimi-code/f.txt", "zeta\n");
  write("dist/codex/AGENTS.md", CODEX_DIST_AGENTS);
  write(".claude/CLAUDE.md", CLAUDE_ONBOARDING);
  write("CLAUDE.md", `${PROJECT_INSTRUCTIONS}${CLAUDE_ONBOARDING}`);
  write("AGENTS.md", ROOT_AGENTS);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("t417 promote-self root instruction authority", () => {
  test("--check rejects absent or stale imported bootstrap rules", async () => {
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    rmSync(join(root, ".agents/rules/amadeus-codex-suffix.md"));
    expect(await promoteSelfMain(["--check", "--no-build"], root)).toBe(1);

    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    rmSync(join(root, ".agents/rules/amadeus.md"));
    expect(await promoteSelfMain(["--check", "--no-build"], root)).toBe(1);

    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    write(".agents/rules/amadeus-codex-suffix.md", "stale suffix\n");
    expect(await promoteSelfMain(["--check", "--no-build"], root)).toBe(1);
  });

  test("--apply preserves root AGENTS and generates only the canonical imported suffix", async () => {
    const before = readFileSync(join(root, "AGENTS.md"));

    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    expect(readFileSync(join(root, "AGENTS.md"))).toEqual(before);
    expect(
      readFileSync(join(root, ".agents/rules/amadeus-codex-suffix.md"), "utf-8"),
    ).toBe("# AI-DLC on Codex CLI\n\ngenerated\n");
  });

  test("--check rejects missing, duplicate, unknown, and generated-suffix root AGENTS content", async () => {
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    expect(await promoteSelfMain(["--check", "--no-build"], root)).toBe(0);

    for (const invalid of [
      "@.agents/rules/amadeus.md\n\n# Project rules\n",
      `@.agents/rules/amadeus.md\n@.agents/rules/amadeus-codex-suffix.md\n@.agents/rules/amadeus-codex-suffix.md\n\n# Project rules\n`,
      `@.agents/rules/amadeus.md\n@.agents/rules/amadeus-codex-suffix.md\n@.agents/rules/unknown.md\n\n# Project rules\n`,
      `${ROOT_AGENTS}\n# AI-DLC on Codex CLI\n\nstale generated suffix\n`,
    ]) {
      write("AGENTS.md", invalid);
      expect(await promoteSelfMain(["--check", "--no-build"], root)).toBe(1);
    }
  });

  test("project instructions drift in root fails check and apply without rewriting root CLAUDE", async () => {
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    write(
      "CLAUDE.md",
      `${PROJECT_INSTRUCTIONS.replace("Japanese.", "Japanese (root drift).")}${CLAUDE_ONBOARDING}`,
    );
    const rootClaudeBefore = readFileSync(join(root, "CLAUDE.md"));

    expect(await promoteSelfMain(["--check", "--no-build"], root)).toBe(1);
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(1);
    expect(readFileSync(join(root, "CLAUDE.md"))).toEqual(rootClaudeBefore);
  });

  test("suffix updates use atomic rename and a pre-rename failure preserves existing bytes", async () => {
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    const suffixPath = join(root, ".agents/rules/amadeus-codex-suffix.md");
    const firstInode = statSync(suffixPath).ino;
    write(
      "dist/codex/AGENTS.md",
      CODEX_DIST_AGENTS.replace("generated", "generated version two"),
    );

    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    expect(statSync(suffixPath).ino).not.toBe(firstInode);
    const existing = readFileSync(suffixPath);
    write(
      "dist/codex/AGENTS.md",
      CODEX_DIST_AGENTS.replace("generated", "must not replace existing"),
    );

    const failingCoordinator = (repoRoot: string): DistributionTransactionCoordinator =>
      new DistributionTransactionCoordinator(repoRoot, {
        checkpoint: (checkpoint, detail) => {
          if (
            checkpoint === "target-candidate-fsynced" &&
            detail === ".agents/rules/amadeus-codex-suffix.md"
          ) {
            throw new Error("injected suffix rename failure");
          }
        },
      });
    expect(
      await promoteSelfMain(
        ["--apply", "--no-build"],
        root,
        undefined,
        null,
        failingCoordinator,
      ),
    ).toBe(1);
    expect(readFileSync(suffixPath)).toEqual(existing);
  });

  test("two apply runs are byte-identical and never replace tracked root instructions", async () => {
    const rootAgentsInode = statSync(join(root, "AGENTS.md")).ino;
    const rootClaudeInode = statSync(join(root, "CLAUDE.md")).ino;
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    const first = new Map(
      [
        "AGENTS.md",
        "CLAUDE.md",
        ".agents/rules/amadeus-codex-suffix.md",
      ].map((relativePath) => [relativePath, readFileSync(join(root, relativePath))]),
    );

    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    for (const [relativePath, bytes] of first) {
      expect(readFileSync(join(root, relativePath))).toEqual(bytes);
    }
    expect(statSync(join(root, "AGENTS.md")).ino).toBe(rootAgentsInode);
    expect(statSync(join(root, "CLAUDE.md")).ino).toBe(rootClaudeInode);
  });

  test("--check detects generated suffix, root CLAUDE, and onboarding drift", async () => {
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);
    write(".agents/rules/amadeus-codex-suffix.md", "stale suffix\n");
    expect(await promoteSelfMain(["--check", "--no-build"], root)).toBe(1);
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(0);

    write("CLAUDE.md", `${PROJECT_INSTRUCTIONS}${CLAUDE_ONBOARDING}root drift\n`);
    expect(await promoteSelfMain(["--check", "--no-build"], root)).toBe(1);
    write("CLAUDE.md", `${PROJECT_INSTRUCTIONS}${CLAUDE_ONBOARDING}`);

    write(".claude/CLAUDE.md", `${CLAUDE_ONBOARDING}onboarding drift\n`);
    expect(await promoteSelfMain(["--check", "--no-build"], root)).toBe(1);
  });

  test("missing root CLAUDE fails closed without recreating it", async () => {
    rmSync(join(root, "CLAUDE.md"));

    expect(await promoteSelfMain(["--check", "--no-build"], root)).toBe(1);
    expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, null)).toBe(1);
    expect(() => statSync(join(root, "CLAUDE.md"))).toThrow();
  });
});
