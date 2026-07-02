#!/usr/bin/env bun
// 未 finalize 検出スクリプトの eval。
// D002 の入出力契約（stdout 1 行 1 件、exit 0 は正常、exit 1 は入力エラー、対象外は stderr 通知で exit 0）と
// BR001 の判定規則（gate 未 passed、targetBolts 全 Bolt に test-results.md、pr.md を欠く Bolt が存在）を固定入力で検証する。

import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../../..");
const script = join(root, ".agents/skills/amadeus-construction/scripts/list-unfinalized-intents.ts");

const cleanups: string[] = [];

function fail(message: string): never {
  for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
  console.error(message);
  process.exit(1);
}

function run(args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(["bun", "run", script, ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

function makeWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "list-unfinalized"));
  cleanups.push(workspace);
  return workspace;
}

function writeIntent(
  workspace: string,
  name: string,
  options: { gate: string; targetBolts: string[]; boltFiles: Record<string, string[]> },
): void {
  const intentDir = join(workspace, ".amadeus/intents", name);
  mkdirSync(intentDir, { recursive: true });
  const state = {
    intent: name,
    phase: "construction",
    status: "in_progress",
    construction: {
      status: "in_progress",
      gate: options.gate,
      targetBolts: options.targetBolts,
    },
  };
  writeFileSync(join(intentDir, "state.json"), JSON.stringify(state, null, 2) + "\n");
  for (const [boltDir, files] of Object.entries(options.boltFiles)) {
    const dir = join(intentDir, "construction/bolts", boltDir);
    mkdirSync(dir, { recursive: true });
    for (const file of files) writeFileSync(join(dir, file), `# ${file}\n`);
  }
}

if (!existsSync(script)) {
  fail(`検出スクリプトが存在しません: ${script}`);
}

// 未 finalize あり: gate 未 passed、test-results.md あり、pr.md なし
const withUnfinalized = makeWorkspace();
writeIntent(withUnfinalized, "20260701-unfinalized-intent", {
  gate: "not_ready",
  targetBolts: ["B001"],
  boltFiles: { "B001-sample-bolt": ["tasks.md", "notes.md", "test-results.md"] },
});
// 同じ workspace に finalize 済みも混在させ、検出されないことを確認する
writeIntent(withUnfinalized, "20260701-finalized-intent", {
  gate: "passed",
  targetBolts: ["B001"],
  boltFiles: { "B001-sample-bolt": ["tasks.md", "notes.md", "test-results.md", "pr.md"] },
});
// 検証前（test-results.md なし）の Intent は検出されない
writeIntent(withUnfinalized, "20260701-unverified-intent", {
  gate: "not_ready",
  targetBolts: ["B001"],
  boltFiles: { "B001-sample-bolt": ["tasks.md", "notes.md"] },
});
{
  const result = run([withUnfinalized]);
  if (result.exitCode !== 0) fail(`未 finalize あり: exit 0 を期待したが ${result.exitCode}\nstderr: ${result.stderr}`);
  const lines = result.stdout.trim().split("\n").filter((line) => line.length > 0);
  if (lines.length !== 1 || lines[0] !== "20260701-unfinalized-intent") {
    fail(`未 finalize あり: 検出結果が期待と異なる\nstdout: ${result.stdout}`);
  }
}

// 未 finalize なし: すべて finalize 済み
const withoutUnfinalized = makeWorkspace();
writeIntent(withoutUnfinalized, "20260701-finalized-intent", {
  gate: "passed",
  targetBolts: ["B001"],
  boltFiles: { "B001-sample-bolt": ["tasks.md", "notes.md", "test-results.md", "pr.md"] },
});
{
  const result = run([withoutUnfinalized]);
  if (result.exitCode !== 0) fail(`未 finalize なし: exit 0 を期待したが ${result.exitCode}`);
  if (result.stdout.trim().length !== 0) fail(`未 finalize なし: 空の stdout を期待したが\n${result.stdout}`);
}

// 対象外: .amadeus/intents がない workspace は stderr 通知で exit 0
const outOfScope = makeWorkspace();
{
  const result = run([outOfScope]);
  if (result.exitCode !== 0) fail(`対象外: exit 0 を期待したが ${result.exitCode}`);
  if (result.stdout.trim().length !== 0) fail(`対象外: 空の stdout を期待したが\n${result.stdout}`);
  if (!result.stderr.includes("対象外")) fail(`対象外: stderr の通知が期待と異なる\n${result.stderr}`);
}

// 入力エラー: 存在しない workspace は exit 1
{
  const result = run([join(outOfScope, "no-such-dir")]);
  if (result.exitCode !== 1) fail(`入力エラー: exit 1 を期待したが ${result.exitCode}`);
}

// 入力エラー: 引数なしは exit 1
{
  const result = run([]);
  if (result.exitCode !== 1) fail(`引数なし: exit 1 を期待したが ${result.exitCode}`);
}

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("list unfinalized intents eval: ok");
