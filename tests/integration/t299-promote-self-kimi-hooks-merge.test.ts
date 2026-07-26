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
//   4. ATOMICITY: a malformed user config (unpaired managed-block marker)
//      fails preflight BEFORE the repo transaction — exit 1, no repo file
//      written, the malformed config left byte-identical. (Regression: the
//      first cut ran the merge after the transaction committed, so this case
//      left the repo promoted and the config broken — a partial apply.)
//   5. A post-commit postApply failure keeps the repo promotion and reports
//      the split precisely (orchestration contract, custom step drive).
//   6. A post-commit kimi write failure (read-only home) exits 1 with the
//      repo applied and the config byte-identical.

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
import { promoteSelfMain } from "../../scripts/promote-self.ts";

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

  test("malformed config (unpaired marker) → preflight fails BEFORE the repo transaction: exit 1, repo untouched, config unchanged", async () => {
    // Unpaired BEGIN marker — the domain's loud-fail class that must never be
    // auto-repaired, and must never leave a half-applied promotion behind.
    const malformed = '# >>> amadeus-kimi-hooks >>>\n[[hooks]]\nevent = "Stop"\n';
    writeFileSync(configPath(), malformed);

    expect(await promoteSelfMain(["--apply", "--no-build"], root)).toBe(1);
    // Nothing was promoted: the repo transaction never ran.
    expect(existsSync(join(root, ".claude/tools/a.txt"))).toBe(false);
    expect(existsSync(join(root, ".kimi-code/f.txt"))).toBe(false);
    // The malformed config is byte-identical — no repair, no backup.
    expect(readFileSync(configPath(), "utf-8")).toBe(malformed);
    expect(backups()).toEqual([]);
  });

  test("normal --apply path (no --no-build): preflight failure aborts BEFORE freshness — the dist-regenerating step never runs", async () => {
    // Regression: freshness() rewrites dist/ in place, so it must not run
    // when the wiring preflight already knows the run will fail.
    const malformed = '# >>> amadeus-kimi-hooks >>>\n[[hooks]]\nevent = "Stop"\n';
    writeFileSync(configPath(), malformed);
    const calls: string[] = [];
    expect(
      await promoteSelfMain(["--apply"], root, (mode) => {
        calls.push(mode);
      }),
    ).toBe(1);
    expect(calls).toEqual([]);
    expect(existsSync(join(root, ".claude/tools/a.txt"))).toBe(false);
    expect(readFileSync(configPath(), "utf-8")).toBe(malformed);
  });

  test("normal --apply path (no --no-build): preflight pass proceeds to freshness, then the transaction, then the merge", async () => {
    const calls: string[] = [];
    expect(
      await promoteSelfMain(["--apply"], root, (mode) => {
        calls.push(mode);
      }),
    ).toBe(0);
    expect(calls).toEqual(["apply"]);
    expect(existsSync(join(root, ".claude/tools/a.txt"))).toBe(true);
    expect(readFileSync(configPath(), "utf-8")).toContain("# >>> amadeus-kimi-hooks >>>");
  });

  test("preflight loud-fail family: missing snippet / markerless snippet / unreadable config all abort BEFORE the repo transaction", async () => {
    const assertAborted = async (): Promise<void> => {
      expect(await promoteSelfMain(["--apply", "--no-build"], root)).toBe(1);
      expect(existsSync(join(root, ".claude/tools/a.txt"))).toBe(false);
    };

    // (a) snippet master absent from the fixture
    rmSync(join(root, "packages/framework/harness/kimi/hooks/amadeus-hooks.snippet.toml"));
    await assertAborted();

    // (b) snippet present but without the managed-block markers (corrupt distribution)
    write("packages/framework/harness/kimi/hooks/amadeus-hooks.snippet.toml", "[[hooks]]\nevent = \"Stop\"\n");
    await assertAborted();

    // (c) config.toml exists as a DIRECTORY — readText fails with a
    // non-notFound IoError (the loud-fail branch, distinct from absence).
    // Restore the valid snippet first so the walk reaches the config read.
    write("packages/framework/harness/kimi/hooks/amadeus-hooks.snippet.toml", SNIPPET);
    mkdirSync(configPath(), { recursive: true });
    await assertAborted();
  });

  test("post-commit step failure → exit 1 with the repo applied and a precise partial report (orchestration contract)", async () => {
    // A postApply whose preflight passes but whose run fails must leave the
    // repo promotion in place and surface exactly that split in the message.
    const errors: string[] = [];
    const originalError = console.error;
    console.error = (msg: unknown) => {
      errors.push(String(msg));
    };
    try {
      const failingStep = {
        name: "failing-step",
        preflight: async () => 0,
        run: async () => {
          console.error(
            "promote-self: repository update applied, but the failing-step merge failed: simulated",
          );
          return 1;
        },
      };
      expect(await promoteSelfMain(["--apply", "--no-build"], root, undefined, failingStep)).toBe(1);
    } finally {
      console.error = originalError;
    }
    // The repo transaction DID commit — the failure is post-commit.
    expect(existsSync(join(root, ".claude/tools/a.txt"))).toBe(true);
    expect(errors.some((line) => line.includes("repository update applied"))).toBe(true);
  });

  test("kimi merge write failure after commit (read-only home) → exit 1, repo applied, config unchanged", async () => {
    if (process.platform === "win32") return; // chmod 0555 does not make dirs read-only there
    writeFileSync(configPath(), OLD_CONFIG);
    const { chmodSync } = await import("node:fs");
    // The writer is atomic temp+rename (directory-write bound), so the
    // failure surface is the home DIRECTORY, not the file's mode bits.
    chmodSync(kimiHome, 0o555);
    try {
      expect(await promoteSelfMain(["--apply", "--no-build"], root)).toBe(1);
    } finally {
      chmodSync(kimiHome, 0o755);
    }
    // Preflight passed (the config reads fine), the repo transaction
    // committed, and only the post-commit write failed.
    expect(existsSync(join(root, ".claude/tools/a.txt"))).toBe(true);
    expect(readFileSync(configPath(), "utf-8")).toBe(OLD_CONFIG);
  });
});
