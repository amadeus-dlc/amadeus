// covers: file:scripts
// size: medium
//
// t299 — FR-1 kimi hooks merge at the end of scripts/promote-self.ts --apply.
// Mechanism: in-process drive of the promoteSelfMain(argv, repoRoot) seam
// against a temp fixture root (t209 style), with KIMI_CODE_HOME pointed at a
// temp home (save/restore) so the user-level config.toml is never touched —
// zero spawn, zero LLM, zero tokens.
//
// WHY THIS EXISTS: Kimi Code has no project-level wiring config, so in the
// self-development repo nothing merged the managed hooks block into the
// user-level config.toml — dogfooding ran without the kimi hooks until a
// manual installer pass. promote-self --apply now runs the setup installer's
// own merge step (same module, same snippet master, same backup semantics)
// after the dist sync, with implicit approval.
//
// WHAT IS UNDER TEST:
//   1. config.toml absent → the managed block is added, no backup is made,
//      and a preceding --check never touches the home (hermetic check path).
//   2. The identical block already present → noop: config bytes unchanged,
//      no backup, exit 0 (the pre-FR-1 success contract).
//   3. An older block present → replace: new block content lands, the user's
//      own tables survive, and exactly one timestamped backup of the OLD
//      bytes is made.
//   4. dist/kimi absent → the merge step does not fire (mergeKimiHooks
//      direct drive; through promoteSelfMain the branch is unreachable
//      because buildExpected fails closed on a missing managed source dir).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mergeKimiHooks, promoteSelfMain } from "../../scripts/promote-self.ts";

let root: string;
let kimiHome: string;
const savedKimiHome = process.env.KIMI_CODE_HOME;

const write = (rel: string, content: string): void => {
  const abs = join(root, rel);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content);
};

// Minimal snippet master whose block carries two adapter-routed tables, so a
// merged config is distinguishable from the single-table OLD block below.
const SNIPPET = [
  "# >>> amadeus-kimi-hooks >>>",
  "[[hooks]]",
  'event = "Stop"',
  'command = "bun .kimi-code/hooks/amadeus-kimi-adapter.ts stop"',
  "",
  "[[hooks]]",
  'event = "SessionEnd"',
  'matcher = "exit"',
  'command = "bun .kimi-code/hooks/amadeus-kimi-adapter.ts session-end"',
  "# <<< amadeus-kimi-hooks <<<",
  "",
].join("\n");

// An older managed block (same markers, single table) alongside a user's own
// adapter-free table — replace must keep the user bytes and back up the old.
const OLD_CONFIG = [
  '[[hooks]]',
  'event = "Stop"',
  'command = "bun ./my-own-hook.ts"',
  "",
  "# >>> amadeus-kimi-hooks >>>",
  "[[hooks]]",
  'event = "Stop"',
  'command = "bun .kimi-code/hooks/amadeus-kimi-adapter.ts stop"',
  "# <<< amadeus-kimi-hooks <<<",
  "",
].join("\n");

const configPath = (): string => join(kimiHome, "config.toml");
const backups = (): string[] =>
  readdirSync(kimiHome).filter((name) => name.includes("amadeus-backup"));

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "t299-promote-self-"));
  kimiHome = mkdtempSync(join(tmpdir(), "t299-kimi-home-"));
  process.env.KIMI_CODE_HOME = kimiHome;
  // Minimal dist fixture covering all managed dirs (claude/codex/agents/cursor/opencode/kimi).
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
});

afterEach(() => {
  if (savedKimiHome === undefined) delete process.env.KIMI_CODE_HOME;
  else process.env.KIMI_CODE_HOME = savedKimiHome;
  rmSync(root, { recursive: true, force: true });
  rmSync(kimiHome, { recursive: true, force: true });
});

describe("t299 promote-self kimi hooks merge (FR-1)", () => {
  test("config absent → --apply adds the managed block with no backup; --check stays hermetic", async () => {
    // The check path never merges, even when it fails on an unsynced tree.
    expect(await promoteSelfMain(["--no-build"], root)).toBe(1);
    expect(existsSync(configPath())).toBe(false);

    expect(await promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    const merged = readFileSync(configPath(), "utf-8");
    expect(merged).toContain("# >>> amadeus-kimi-hooks >>>");
    expect(merged).toContain("amadeus-kimi-adapter.ts session-end");
    expect(backups()).toEqual([]);
  });

  test("identical block present → noop: config unchanged, no backup, exit 0", async () => {
    expect(await promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    const before = readFileSync(configPath(), "utf-8");

    expect(await promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    expect(readFileSync(configPath(), "utf-8")).toBe(before);
    expect(backups()).toEqual([]);
  });

  test("older block present → replace: new block lands, user tables survive, old bytes backed up", async () => {
    writeFileSync(configPath(), OLD_CONFIG);

    expect(await promoteSelfMain(["--apply", "--no-build"], root)).toBe(0);
    const merged = readFileSync(configPath(), "utf-8");
    expect(merged).toContain("amadeus-kimi-adapter.ts session-end");
    expect(merged).toContain('command = "bun ./my-own-hook.ts"');
    expect(merged.match(/# >>> amadeus-kimi-hooks >>>/g)).toHaveLength(1);

    const created = backups();
    expect(created).toHaveLength(1);
    expect(readFileSync(join(kimiHome, created[0] as string), "utf-8")).toBe(OLD_CONFIG);
  });

  test("dist/kimi absent → the merge step does not fire", async () => {
    const bare = mkdtempSync(join(tmpdir(), "t299-no-kimi-dist-"));
    try {
      expect(await mergeKimiHooks(bare)).toBe(0);
      expect(existsSync(configPath())).toBe(false);
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});
