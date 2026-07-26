// t-kimi-hooks-merge: the setup managed-block merge (Bolt 3, setup-hooks-merge)
// against the REAL snippet master and REAL fs ports under a mkdtemp KimiHome
// (never the user's real ~/.kimi-code). The pure merge logic's table-driven
// cases live in tests/unit/setup-kimi-hooks-domain.test.ts; this file pins:
//   - renderManagedBlock on the shipped master (10 hooks + 5 pre-allows)
//   - the Bolt 2 live finding at full fidelity: a marker-stripped config
//     (kimi CLI 0.28.1 drops comments) plans "replace", never a duplicate add
//   - the module flow (FR-3b/3c): plan report -> confirm -> backup -> atomic
//     write, refusal/non-interactive paths, removal, KimiHome resolution
//
// covers: file:packages/setup/src/domain/kimi-hooks.ts,
//         file:packages/setup/src/modules/kimi-hooks.ts

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyMerge,
  MANAGED_BLOCK_BEGIN,
  MANAGED_BLOCK_END,
  planMerge,
  removeManagedBlock,
  renderManagedBlock,
} from "../../packages/setup/src/domain/kimi-hooks.ts";
import {
  kimiConfigPath,
  type KimiHooksPorts,
  renderHooksError,
  resolveKimiHome,
  runHooksMerge,
  runHooksRemoval,
} from "../../packages/setup/src/modules/kimi-hooks.ts";
import { createApplyWrite } from "../../packages/setup/src/ports/apply-write.ts";
import { createFsRead, createFsWrite, IoError } from "../../packages/setup/src/ports/fsops.ts";
import type { TtyIO } from "../../packages/setup/src/ports/tty.ts";
import { Result } from "../../packages/setup/src/shared/result.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SNIPPET_MASTER = join(HERE, "..", "..", "packages", "framework", "harness", "kimi", "hooks", "amadeus-hooks.snippet.toml");

function masterBlock(): string {
  const result = renderManagedBlock(readFileSync(SNIPPET_MASTER, "utf8"));
  if (result.type === "err") throw new Error(`snippet master must render: ${result.error.detail}`);
  return result.value;
}

// Simulates the kimi CLI re-serialization (Bolt 2 finding): every comment
// line — including the markers — is dropped; tables stay as-is.
function stripComments(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#"))
    .join("\n");
}

// 14 pre-existing user hooks (TC-2's measured count) plus an unrelated key.
function userConfigText(): string {
  const hooks = Array.from(
    { length: 14 },
    (_, i) => `[[hooks]]\nevent = "PostToolUse"\nmatcher = "Tool${i}"\ncommand = "echo hook-${i}"`,
  ).join("\n\n");
  return `model = "kimi-k2"\n\n${hooks}\n`;
}

function mustPlan(configText: string, block: string) {
  const plan = planMerge(configText, block);
  if (plan.type === "err") throw new Error(`planMerge must succeed: ${plan.error.detail}`);
  return plan.value;
}

describe("renderManagedBlock — the shipped snippet master", () => {
  test("extracts the marker-wrapped block, dropping the prose preamble", () => {
    const block = masterBlock();
    const lines = block.split("\n");
    expect(lines[0]).toBe(MANAGED_BLOCK_BEGIN);
    expect(lines[lines.length - 1]).toBe(MANAGED_BLOCK_END);
    expect(block).toContain("amadeus-kimi-adapter.ts");
    expect(block).not.toContain("single source of truth"); // preamble stays out
    // The master wires 10 hook entries and 5 permission pre-allows.
    expect(block.split("[[hooks]]").length - 1).toBe(10);
    expect(block.split("[[permission.rules]]").length - 1).toBe(5);
  });
});

describe("planMerge + applyMerge — marker-stripped real master (Bolt 2 finding)", () => {
  test("a config whose markers the kimi CLI stripped still plans 'replace', never a duplicating 'add'", () => {
    const block = masterBlock();
    const stripped = stripComments(block); // what the CLI leaves behind
    const config = `${userConfigText()}\n${stripped}\n`;
    const plan = mustPlan(config, block);
    expect(plan.action).toBe("replace");
    const merged = applyMerge(config, plan);
    // Exactly one managed block afterwards: 10 adapter command lines, markers restored.
    expect(merged.split("amadeus-kimi-adapter.ts").length - 1).toBe(10);
    expect(merged.split(MANAGED_BLOCK_BEGIN).length - 1).toBe(1);
    expect(merged.split(MANAGED_BLOCK_END).length - 1).toBe(1);
    expect(merged).toContain(block);
    // The user's own hooks and sections survive byte-for-byte.
    expect(merged.startsWith(userConfigText())).toBe(true);
    expect(merged.split("[[hooks]]").length - 1).toBe(24); // 14 user + 10 managed
    expect(merged.split("[[permission.rules]]").length - 1).toBe(5);
    Bun.TOML.parse(merged);
    // And the repaired config is a stable noop from then on.
    expect(mustPlan(merged, block).action).toBe("noop");
  });

  test("marker-stripped managed tables separated by user content are consolidated into one block", () => {
    const block = masterBlock();
    const strippedTables = stripComments(block)
      .split("\n")
      .filter((line) => line.trim() !== "")
      .join("\n");
    const hooksOnly = strippedTables.split("[[permission.rules]]")[0] as string;
    const config = [userConfigText(), hooksOnly, "[providers.default]", 'base_url = "https://example.invalid"', ""].join("\n");
    const plan = mustPlan(config, block);
    expect(plan.action).toBe("replace");
    const merged = applyMerge(config, plan);
    expect(merged.split("amadeus-kimi-adapter.ts").length - 1).toBe(10);
    expect(merged.split(MANAGED_BLOCK_BEGIN).length - 1).toBe(1);
    expect(merged).toContain('[providers.default]\nbase_url = "https://example.invalid"');
    Bun.TOML.parse(merged);
  });

  test("removeManagedBlock works content-wise at full fidelity", () => {
    const block = masterBlock();
    const config = `${userConfigText()}\n${stripComments(block)}\n`;
    const removal = removeManagedBlock(config, block);
    expect(removal.type).toBe("ok");
    if (removal.type !== "ok") return;
    expect(removal.value.removed).toBe(true);
    expect(removal.value.text).not.toContain("amadeus-kimi-adapter.ts");
    expect(removal.value.text).not.toContain("bun .kimi-code/tools");
    // The managed git pre-allows go with the block; the user's hooks survive.
    expect(removal.value.text).not.toContain("Bash(git commit*)");
    expect(removal.value.text.split("[[hooks]]").length - 1).toBe(14);
    Bun.TOML.parse(removal.value.text);
  });
});

// ---------------------------------------------------------------------------
// Module flow (FR-3b/3c) — real fs ports under a mkdtemp KimiHome
// ---------------------------------------------------------------------------

const SNIPPET = [
  MANAGED_BLOCK_BEGIN,
  "[[hooks]]",
  'event = "SessionStart"',
  'command = "bun .kimi-code/hooks/amadeus-kimi-adapter.ts session-start"',
  "",
  "[[permission.rules]]",
  'decision = "allow"',
  'pattern = "Bash(bun .kimi-code/tools/*)"',
  MANAGED_BLOCK_END,
  "",
].join("\n");

function block(): string {
  const rendered = renderManagedBlock(SNIPPET);
  if (rendered.type === "err") throw new Error("fixture must render");
  return rendered.value;
}

const homes: string[] = [];
function freshHome(): string {
  const home = mkdtempSync(join(tmpdir(), "setup-kimi-hooks-"));
  homes.push(home);
  return home;
}
afterEach(() => {
  while (homes.length > 0) rmSync(homes.pop() as string, { recursive: true, force: true });
});

function fakeTty(confirmAnswer: boolean): { tty: TtyIO; confirmPrompts: string[] } {
  const confirmPrompts: string[] = [];
  return {
    confirmPrompts,
    tty: {
      isTTY: true,
      select: () => Promise.reject(new Error("unexpected tty.select")),
      input: () => Promise.reject(new Error("unexpected tty.input")),
      confirm: (prompt) => {
        confirmPrompts.push(prompt);
        return Promise.resolve(confirmAnswer);
      },
    },
  };
}

function fakePorts(tty: TtyIO): { ports: KimiHooksPorts; out: string[] } {
  const out: string[] = [];
  return {
    out,
    ports: {
      tty,
      fsRead: createFsRead(),
      fsWrite: createFsWrite(),
      applyWrite: createApplyWrite(),
      out: (message) => out.push(message),
    },
  };
}

const NOW = () => new Date("2026-07-25T12:00:00.000Z");
const baseArgs = { snippet: SNIPPET, snippetSource: "dist/kimi/hooks/amadeus-hooks.snippet.toml", now: NOW };

describe("runHooksMerge — add", () => {
  test("a missing config.toml is created with the block; no backup is needed (FR-7c add)", async () => {
    const home = freshHome();
    const { tty, confirmPrompts } = fakeTty(true);
    const { ports, out } = fakePorts(tty);
    const result = await runHooksMerge({ ...baseArgs, interactive: true, kimiHome: home }, ports);
    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.value).toEqual({ type: "applied", action: "add", backupPath: null });
    expect(confirmPrompts.length).toBe(1);
    const written = readFileSync(kimiConfigPath(home), "utf8");
    expect(written).toBe(`${block()}\n`);
    expect(out.join("\n")).toContain("amadeus-kimi-adapter.ts"); // the diff was shown before confirm
    expect(readdirSync(home).filter((f) => f.includes(".tmp")).length).toBe(0); // atomic write leaves no residue
  });

  test("an existing config gains the block at the end; a backup with the exact prior bytes is written first", async () => {
    const home = freshHome();
    const prior = 'model = "kimi-k2"\n\n[[hooks]]\nevent = "Stop"\ncommand = "echo mine"\n';
    writeFileSync(kimiConfigPath(home), prior);
    const { ports } = fakePorts(fakeTty(true).tty);
    const result = await runHooksMerge({ ...baseArgs, interactive: true, kimiHome: home }, ports);
    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.value.type).toBe("applied");
    if (result.value.type !== "applied") return;
    expect(result.value.backupPath).toBe(join(home, "config.toml.amadeus-backup-20260725T120000000Z"));
    expect(readFileSync(result.value.backupPath as string, "utf8")).toBe(prior); // BR-4/BR-7
    const merged = readFileSync(kimiConfigPath(home), "utf8");
    expect(merged.startsWith(prior)).toBe(true);
    expect(merged).toContain(block());
  });
});

describe("runHooksMerge — noop / refusal / non-interactive", () => {
  test("an up-to-date config is a noop: no confirm, no write, no backup", async () => {
    const home = freshHome();
    const upToDate = `model = "kimi-k2"\n\n${block()}\n`;
    writeFileSync(kimiConfigPath(home), upToDate);
    const { tty, confirmPrompts } = fakeTty(false); // would decline if asked — it must not be asked
    const { ports } = fakePorts(tty);
    const result = await runHooksMerge({ ...baseArgs, interactive: true, kimiHome: home }, ports);
    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.value).toEqual({ type: "noop" });
    expect(confirmPrompts.length).toBe(0);
    expect(readFileSync(kimiConfigPath(home), "utf8")).toBe(upToDate);
    expect(readdirSync(home).filter((f) => f.includes("backup")).length).toBe(0);
  });

  test("declining the confirm changes nothing and prints the manual procedure (BR-6/BR-I18)", async () => {
    const home = freshHome();
    const { ports, out } = fakePorts(fakeTty(false).tty);
    const result = await runHooksMerge({ ...baseArgs, interactive: true, kimiHome: home }, ports);
    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.value).toEqual({ type: "not-applied", reason: "declined" });
    expect(existsSync(kimiConfigPath(home))).toBe(false);
    const text = out.join("\n");
    expect(text).toContain("No changes were made");
    expect(text).toContain(MANAGED_BLOCK_BEGIN); // manual procedure names the markers
    expect(text).toContain(baseArgs.snippetSource);
  });

  test("non-interactive with a pending change refuses to write (install's BR-I11 rule) and shows report + manual", async () => {
    const home = freshHome();
    const { tty, confirmPrompts } = fakeTty(true);
    const { ports, out } = fakePorts(tty);
    const result = await runHooksMerge({ ...baseArgs, interactive: false, kimiHome: home }, ports);
    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.value).toEqual({ type: "not-applied", reason: "non-interactive" });
    expect(confirmPrompts.length).toBe(0);
    expect(existsSync(kimiConfigPath(home))).toBe(false);
    const text = out.join("\n");
    expect(text).toContain("amadeus-kimi-adapter.ts"); // the report still renders for CI logs
    expect(text).toContain("No changes were made");
  });
});

describe("runHooksMerge — loud fail (FR-7c)", () => {
  test("a syntactically broken config.toml is an IoError; the file and no backup are touched", async () => {
    const home = freshHome();
    const broken = "[[hooks]]\nevent = \n";
    writeFileSync(kimiConfigPath(home), broken);
    const { ports } = fakePorts(fakeTty(true).tty);
    const result = await runHooksMerge({ ...baseArgs, interactive: true, kimiHome: home }, ports);
    expect(result.type).toBe("err");
    if (result.type !== "err") return;
    expect(result.error.type).toBe("io");
    expect(renderHooksError(result.error)).toContain("config.toml");
    expect(readFileSync(kimiConfigPath(home), "utf8")).toBe(broken);
    expect(readdirSync(home).filter((f) => f.includes("backup")).length).toBe(0);
  });

  test("duplicate managed blocks are a content-validation loud fail", async () => {
    const home = freshHome();
    writeFileSync(kimiConfigPath(home), `${block()}\n\n${block()}\n`);
    const { ports } = fakePorts(fakeTty(true).tty);
    const result = await runHooksMerge({ ...baseArgs, interactive: true, kimiHome: home }, ports);
    expect(result.type).toBe("err");
    if (result.type !== "err") return;
    expect(result.error.type).toBe("content-validation");
    expect(renderHooksError(result.error)).toContain("manual");
  });

  test("a snippet without markers fails loudly (corrupt distribution is never silent)", async () => {
    const home = freshHome();
    const { ports } = fakePorts(fakeTty(true).tty);
    const result = await runHooksMerge(
      { ...baseArgs, snippet: '[[hooks]]\nevent = "Stop"\n', interactive: true, kimiHome: home },
      ports,
    );
    expect(result.type).toBe("err");
    if (result.type !== "err") return;
    expect(result.error.type).toBe("content-validation");
  });
});

describe("runHooksRemoval", () => {
  test("removes only the managed block after confirm, with a backup (FR-7c removal)", async () => {
    const home = freshHome();
    const prior = `model = "kimi-k2"\n\n${block()}\n`;
    writeFileSync(kimiConfigPath(home), prior);
    const { ports } = fakePorts(fakeTty(true).tty);
    const result = await runHooksRemoval({ ...baseArgs, interactive: true, kimiHome: home }, ports);
    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.value.type).toBe("removed");
    if (result.value.type !== "removed") return;
    expect(readFileSync(result.value.backupPath as string, "utf8")).toBe(prior);
    expect(readFileSync(kimiConfigPath(home), "utf8")).toBe('model = "kimi-k2"\n');
  });

  test("no managed block is a noop without a confirm", async () => {
    const home = freshHome();
    writeFileSync(kimiConfigPath(home), 'model = "kimi-k2"\n');
    const { tty, confirmPrompts } = fakeTty(true);
    const { ports } = fakePorts(tty);
    const result = await runHooksRemoval({ ...baseArgs, interactive: true, kimiHome: home }, ports);
    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.value).toEqual({ type: "noop" });
    expect(confirmPrompts.length).toBe(0);
  });

  test("a missing config.toml is a noop: no confirm, nothing to remove", async () => {
    const home = freshHome(); // never populated — configPath does not exist
    const { tty, confirmPrompts } = fakeTty(true);
    const { ports, out } = fakePorts(tty);
    const result = await runHooksRemoval({ ...baseArgs, interactive: true, kimiHome: home }, ports);
    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.value).toEqual({ type: "noop" });
    expect(confirmPrompts.length).toBe(0);
    expect(out.join("\n")).toContain("does not exist; nothing to remove");
  });

  test("declining the removal confirm changes nothing (not-applied: declined)", async () => {
    const home = freshHome();
    const prior = `model = "kimi-k2"\n\n${block()}\n`;
    writeFileSync(kimiConfigPath(home), prior);
    const { ports } = fakePorts(fakeTty(false).tty);
    const result = await runHooksRemoval({ ...baseArgs, interactive: true, kimiHome: home }, ports);
    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.value).toEqual({ type: "not-applied", reason: "declined" });
    expect(readFileSync(kimiConfigPath(home), "utf8")).toBe(prior); // untouched
  });

  test("non-interactive removal refuses to write (not-applied: non-interactive)", async () => {
    const home = freshHome();
    const prior = `model = "kimi-k2"\n\n${block()}\n`;
    writeFileSync(kimiConfigPath(home), prior);
    const { tty, confirmPrompts } = fakeTty(true);
    const { ports } = fakePorts(tty);
    const result = await runHooksRemoval({ ...baseArgs, interactive: false, kimiHome: home }, ports);
    expect(result.type).toBe("ok");
    if (result.type !== "ok") return;
    expect(result.value).toEqual({ type: "not-applied", reason: "non-interactive" });
    expect(confirmPrompts.length).toBe(0);
    expect(readFileSync(kimiConfigPath(home), "utf8")).toBe(prior); // untouched
  });

  test("a write failure after a successful backup names the backup path in the loud fail (withBackupHint)", async () => {
    const home = freshHome();
    const prior = `model = "kimi-k2"\n\n${block()}\n`;
    writeFileSync(kimiConfigPath(home), prior);
    const { ports: realPorts } = fakePorts(fakeTty(true).tty);
    const ports: KimiHooksPorts = {
      ...realPorts,
      fsWrite: { writeText: () => Promise.resolve(Result.err(IoError.of("disk full"))) },
    };
    const result = await runHooksRemoval({ ...baseArgs, interactive: true, kimiHome: home }, ports);
    expect(result.type).toBe("err");
    if (result.type !== "err") return;
    const expectedBackupPath = join(home, "config.toml.amadeus-backup-20260725T120000000Z");
    expect(result.error.detail).toContain("disk full");
    expect(result.error.detail).toContain(`the pre-write backup remains at ${expectedBackupPath}`);
    expect(readFileSync(expectedBackupPath, "utf8")).toBe(prior); // the backup landed for real (applyWrite ran unmocked)
    expect(readFileSync(kimiConfigPath(home), "utf8")).toBe(prior); // untouched — only the temp-write side failed
  });
});

describe("readConfig — a real (non-notFound) read failure loud-fails (FR-7c)", () => {
  test("runHooksMerge surfaces the IoError with manual-fix guidance, never treats it as absent", async () => {
    const home = freshHome();
    const { ports: realPorts } = fakePorts(fakeTty(true).tty);
    const ports: KimiHooksPorts = {
      ...realPorts,
      fsRead: { readText: () => Promise.resolve(Result.err(IoError.of("EACCES: permission denied", false))) },
    };
    const result = await runHooksMerge({ ...baseArgs, interactive: true, kimiHome: home }, ports);
    expect(result.type).toBe("err");
    if (result.type !== "err") return;
    expect(result.error.type).toBe("io");
    expect(result.error.detail).toContain("EACCES: permission denied");
    expect(result.error.detail).toContain("fix or remove the file manually");
    expect(renderHooksError(result.error)).toContain("EACCES: permission denied");
  });

  test("runHooksRemoval surfaces the same IoError (shared readConfig)", async () => {
    const home = freshHome();
    const { ports: realPorts } = fakePorts(fakeTty(true).tty);
    const ports: KimiHooksPorts = {
      ...realPorts,
      fsRead: { readText: () => Promise.resolve(Result.err(IoError.of("EACCES: permission denied", false))) },
    };
    const result = await runHooksRemoval({ ...baseArgs, interactive: true, kimiHome: home }, ports);
    expect(result.type).toBe("err");
    if (result.type !== "err") return;
    expect(result.error.type).toBe("io");
    expect(result.error.detail).toContain("fix or remove the file manually");
  });
});

describe("resolveKimiHome (domain-entities.md §KimiHome)", () => {
  test("$KIMI_CODE_HOME wins when set", () => {
    expect(resolveKimiHome({ KIMI_CODE_HOME: "/custom/kimi" })).toBe("/custom/kimi");
  });

  test("falls back to ~/.kimi-code", () => {
    expect(resolveKimiHome({}, "/home/alice")).toBe(join("/home/alice", ".kimi-code"));
  });
});
