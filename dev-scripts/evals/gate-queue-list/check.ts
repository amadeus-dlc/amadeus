#!/usr/bin/env bun

// GateQueueList.ts（承認待ちキュー一覧）の決定論的検証。
// Functional Design（20260702-gate-queue-visualization U001）の BL001〜BL007、BR001〜BR009 を判定基準にする。

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const script = "skills/amadeus-validator/scripts/GateQueueList.ts";

const cleanups: string[] = [];

function fail(message: string): never {
  for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
  console.error(message);
  process.exit(1);
}

function runResult(command: string[], cwd = root): { stdout: string; stderr: string; exitCode: number } {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
    exitCode: result.exitCode ?? -1,
  };
}

function run(command: string[], cwd = root): string {
  const result = runResult(command, cwd);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", result.stdout, "stderr:", result.stderr].join("\n"));
  }
  return result.stdout;
}

function newWorkspace(prefix: string): string {
  const workspace = mkdtempSync(join(tmpdir(), prefix));
  cleanups.push(workspace);
  mkdirSync(join(workspace, ".amadeus/intents"), { recursive: true });
  return workspace;
}

function writeIntentState(workspace: string, id: string, state: Record<string, unknown>): void {
  const dir = join(workspace, ".amadeus/intents", id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "state.json"), JSON.stringify({ intent: id, ...state }, null, 2) + "\n");
}

// ---- fixture: 承認待ちあり workspace ----
// alpha: ideation.gate と ideation.status が同時に waiting_approval（1 行に併記される）
// beta: construction の B001 が taskGeneration.status: ready_for_approval
// gamma: phase inception で inception.status が waiting_approval
// delta: 承認待ちなし（not_ready と passed だけ）

const waiting = newWorkspace("gate-queue-list-waiting-");
writeIntentState(waiting, "20260701-alpha", {
  phase: "ideation",
  status: "in_progress",
  ideation: { status: "waiting_approval", gate: "waiting_approval" },
});
writeIntentState(waiting, "20260702-beta", {
  phase: "construction",
  status: "in_progress",
  ideation: { status: "completed", gate: "passed" },
  inception: { status: "completed", gate: "passed" },
  construction: {
    status: "in_progress",
    gate: "not_ready",
    bolts: [{ id: "B001", taskGeneration: { status: "ready_for_approval", evidence: [] } }],
    targetBolts: ["B001"],
  },
});
writeIntentState(waiting, "20260703-gamma", {
  phase: "inception",
  status: "in_progress",
  ideation: { status: "completed", gate: "passed" },
  inception: { status: "waiting_approval", gate: "not_ready" },
});
writeIntentState(waiting, "20260704-delta", {
  phase: "inception",
  status: "completed",
  ideation: { status: "completed", gate: "passed" },
  inception: { status: "completed", gate: "passed" },
});

// (1) 承認待ちあり: 4 列 Markdown 表に承認待ちだけが出る
{
  const output = run(["bun", "run", script, waiting]);
  if (!output.includes("| Intent | phase | ゲート | 待ち理由 |")) {
    fail("(承認待ちあり) 4 列（Intent、phase、ゲート、待ち理由）の Markdown 表ヘッダーがない:\n" + output);
  }
  if (!output.includes("| 20260701-alpha | ideation | Ideation gate |")) {
    fail("(承認待ちあり) alpha の Ideation gate 行がない:\n" + output);
  }
  if (!(output.includes("`ideation.gate` が `waiting_approval`") && output.includes("`ideation.status` が `waiting_approval`"))) {
    fail("(承認待ちあり) alpha の待ち理由に gate と status の両根拠が併記されていない:\n" + output);
  }
  const alphaRows = output.split("\n").filter((line) => line.startsWith("| 20260701-alpha |"));
  if (alphaRows.length !== 1) {
    fail("(承認待ちあり) alpha の同一 phase の gate と status が 1 行に併記されていない（行数: " + alphaRows.length + "）:\n" + output);
  }
  if (!output.includes("| 20260702-beta | construction | Task Generation Gate（B001） |")) {
    fail("(承認待ちあり) beta の Task Generation Gate（B001）行がない:\n" + output);
  }
  if (!output.includes("`construction.bolts[B001].taskGeneration.status` が `ready_for_approval`")) {
    fail("(承認待ちあり) beta の待ち理由がフィールドパス形式でない:\n" + output);
  }
  if (!output.includes("| 20260703-gamma | inception | Inception gate |")) {
    fail("(承認待ちあり) gamma の Inception gate 行がない:\n" + output);
  }
  if (!output.includes("`inception.status` が `waiting_approval`")) {
    fail("(承認待ちあり) gamma の待ち理由がフィールドパス形式でない:\n" + output);
  }
  if (output.includes("20260704-delta")) {
    fail("(非検出) 承認待ちでない delta が表に含まれる:\n" + output);
  }
  // 並び順: Intent ID の辞書順
  const ids = ["20260701-alpha", "20260702-beta", "20260703-gamma"];
  const positions = ids.map((id) => output.indexOf(`| ${id} |`));
  for (let i = 1; i < positions.length; i++) {
    if (positions[i - 1] >= positions[i]) fail("(並び順) 行が Intent ID の辞書順になっていない:\n" + output);
  }
}

// (2) 決定論性: 同じ入力で 2 回実行した出力が一致する
{
  const first = run(["bun", "run", script, waiting]);
  const second = run(["bun", "run", script, waiting]);
  if (first !== second) fail("(決定論性) 同じ入力で出力が変わった");
}

// (3) 0 件: 承認待ちがない workspace でその旨が出力され exit 0
{
  const empty = newWorkspace("gate-queue-list-empty-");
  writeIntentState(empty, "20260701-alpha", {
    phase: "ideation",
    status: "completed",
    ideation: { status: "completed", gate: "passed" },
  });
  const result = runResult(["bun", "run", script, empty]);
  if (result.exitCode !== 0) fail("(0件) 承認待ち 0 件で exit 0 にならない: " + result.exitCode + "\n" + result.stderr);
  if (!result.stdout.includes("承認待ちはありません。")) {
    fail("(0件) 0 件の旨の表示がない:\n" + result.stdout);
  }
}

// (4) 解釈不能: JSON として解釈できない state.json は stderr 警告のうえ読み飛ばし、一覧全体は成功する
{
  const broken = newWorkspace("gate-queue-list-broken-");
  writeIntentState(broken, "20260701-alpha", {
    phase: "ideation",
    status: "in_progress",
    ideation: { status: "in_progress", gate: "waiting_approval" },
  });
  const dir = join(broken, ".amadeus/intents", "20260702-corrupt");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "state.json"), "{ this is not json\n");
  const result = runResult(["bun", "run", script, broken]);
  if (result.exitCode !== 0) fail("(解釈不能) 壊れた state.json で一覧全体が失敗した: " + result.exitCode + "\n" + result.stderr);
  if (!result.stderr.includes("20260702-corrupt")) {
    fail("(解釈不能) stderr の警告に対象 Intent が含まれない:\n" + result.stderr);
  }
  if (!result.stdout.includes("| 20260701-alpha |")) {
    fail("(解釈不能) 読める Intent の承認待ちが表に出ていない:\n" + result.stdout);
  }
}

// (5) 対象外: .amadeus/intents がない workspace は stderr 通知のうえ exit 0
{
  const outside = mkdtempSync(join(tmpdir(), "gate-queue-list-outside-"));
  cleanups.push(outside);
  const result = runResult(["bun", "run", script, outside]);
  if (result.exitCode !== 0) fail("(対象外) .amadeus/intents なしで exit 0 にならない: " + result.exitCode);
  if (!result.stderr.includes("対象外")) fail("(対象外) stderr に対象外の通知がない:\n" + result.stderr);
}

// (6) 入力エラー: workspace 引数の欠落または不存在は exit 1
{
  const noArg = runResult(["bun", "run", script]);
  if (noArg.exitCode !== 1) fail("(入力エラー) 引数なしで exit 1 にならない: " + noArg.exitCode);
  const missing = runResult(["bun", "run", script, "/nonexistent-gate-queue-workspace"]);
  if (missing.exitCode !== 1) fail("(入力エラー) 不存在 workspace で exit 1 にならない: " + missing.exitCode);
}

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("gate queue list eval: ok");
