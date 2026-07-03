#!/usr/bin/env bun

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildIntentsIndex, INTENTS_MARKER } from "../../../skills/amadeus-validator/scripts/IndexGenerate";

const root = resolve(import.meta.dir, "../../..");
const script = "skills/amadeus-validator/scripts/IndexGenerate.ts";

const cleanups: string[] = [];

function fail(message: string): never {
  for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
  console.error(message);
  process.exit(1);
}

function run(command: string[], cwd = root): string {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stdout;
}

function runResult(command: string[], cwd = root): { stdout: string; stderr: string; exitCode: number } {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
    exitCode: result.exitCode ?? -1,
  };
}

function runExpectFailure(command: string[], expected: string, cwd = root): void {
  const result = runResult(command, cwd);
  if (result.exitCode === 0) {
    fail(["command unexpectedly succeeded: " + command.join(" "), "expected:", expected, "stdout:", result.stdout].join("\n"));
  }
  if (!result.stdout.includes(expected) && !result.stderr.includes(expected)) {
    fail(["command failed without expected evidence: " + expected, "stdout:", result.stdout, "stderr:", result.stderr].join("\n"));
  }
}

function newWorkspace(prefix: string): string {
  const workspace = mkdtempSync(join(tmpdir(), prefix));
  cleanups.push(workspace);
  mkdirSync(join(workspace, ".amadeus/intents"), { recursive: true });
  return workspace;
}

function intentModule(title: string, summary: string, deps: Array<{ dep: string; reason: string }>): string {
  const rows = deps.map((d) => `| ${d.dep} | ${d.reason} |`);
  return [`# インテント：${title}`, "", "## 概要", "", summary, "", "## 依存", "", "| 依存 | 理由 |", "|---|---|", ...rows, ""].join("\n");
}

function writeIntent(workspace: string, id: string, title: string, summary: string, deps: Array<{ dep: string; reason: string }>): void {
  const dir = join(workspace, ".amadeus/intents");
  writeFileSync(join(dir, `${id}.md`), intentModule(title, summary, deps));
  mkdirSync(join(dir, id), { recursive: true });
  writeFileSync(join(dir, id, "state.json"), JSON.stringify({ schemaVersion: 1, phase: "ideation", status: "in_progress" }, null, 2) + "\n");
}

function intentsPath(workspace: string): string {
  return join(workspace, ".amadeus/intents.md");
}

// ---- 基本 fixture: Intent 2 件 ----

const workspace = newWorkspace("index-generate-");
writeIntent(workspace, "20260701-alpha", "Alpha", "Alpha の概要文である。", [{ dep: "なし", reason: "初回 Intent であるため。" }]);
writeIntent(workspace, "20260702-beta", "Beta", "Beta の概要文である。", [{ dep: "20260701-alpha", reason: "Alpha の完了を前提にするため。" }]);

// (1) 決定論性: 同じ入力で 2 回生成した出力が一致する（純粋関数としての buildIntentsIndex を直接比較）
{
  const intentsA = buildIntentsIndex(workspace);
  const intentsB = buildIntentsIndex(workspace);
  if (intentsA !== intentsB) fail("決定論性違反: buildIntentsIndex が同じ入力で異なる出力を返した");
}

// (4) マーカー: 出力の先頭が生成マーカーの HTML コメント 1 行である
run(["bun", "run", script, workspace]);
{
  const intentsLines = readFileSync(intentsPath(workspace), "utf8").split("\n");
  if (intentsLines[0] !== INTENTS_MARKER) fail(`マーカー不一致（intents.md）: ${intentsLines[0]}`);
  if (intentsLines[1] !== "") fail("マーカー直後に空行がない（intents.md）");
}

// CLI が生成した内容が export された build 関数の期待内容と一致する（CLI と export 関数が同じロジックであることの確認）
{
  const expectedIntents = buildIntentsIndex(workspace);
  const actualIntents = readFileSync(intentsPath(workspace), "utf8");
  if (actualIntents !== expectedIntents) fail("CLI が生成した intents.md が buildIntentsIndex の期待内容と一致しない");

  // 一覧行の中身（依存列）を確認する
  if (!actualIntents.includes("| 20260702-beta | Beta の概要文である。 | 20260701-alpha | [20260702-beta.md](intents/20260702-beta.md) |")) {
    fail("intents.md の一覧行が期待どおりでない（依存列）");
  }
}

// (2) 冪等性: 生成済みインデックスがある状態での再生成が出力を変えない
{
  const beforeIntents = readFileSync(intentsPath(workspace), "utf8");
  run(["bun", "run", script, workspace]);
  const afterIntents = readFileSync(intentsPath(workspace), "utf8");
  if (beforeIntents !== afterIntents) fail("冪等性違反: 再生成で intents.md が変化した");
}

// (3) 並行統合: 2 つの Intent モジュールを別々に追加した状態から生成すると、両方の行を識別子の辞書順で含む
{
  // 既存 fixture に対し、辞書順で先頭に来る Intent を追加する（並行 branch が別々にモジュールを追加した状況を模す）
  writeIntent(workspace, "20260601-zzz-early", "ZzzEarly", "並行統合確認用の Intent である。", [{ dep: "なし", reason: "独立 Intent であるため。" }]);
  run(["bun", "run", script, workspace]);
  const intentsContent = readFileSync(intentsPath(workspace), "utf8");
  const ids = ["20260601-zzz-early", "20260701-alpha", "20260702-beta"];
  const positions = ids.map((id) => intentsContent.indexOf(`| ${id} |`));
  if (positions.some((p) => p === -1)) fail("並行統合: intents.md に期待した行がない");
  for (let i = 1; i < positions.length; i++) {
    if (positions[i - 1] >= positions[i]) fail("並行統合: intents.md の行が識別子の辞書順になっていない");
  }
}

// (5) 見出し契約違反: 概要または依存の見出しがないモジュールで、対象ファイルと不足を示して失敗する
{
  const violationWorkspace = newWorkspace("index-generate-violation-");
  writeFileSync(
    join(violationWorkspace, ".amadeus/intents/20260701-broken.md"),
    ["# インテント：Broken", "", "## 依存", "", "| 依存 | 理由 |", "|---|---|", "| なし | 初回 Intent であるため。 |", ""].join("\n"),
  );
  mkdirSync(join(violationWorkspace, ".amadeus/intents/20260701-broken"), { recursive: true });
  writeFileSync(
    join(violationWorkspace, ".amadeus/intents/20260701-broken/state.json"),
    JSON.stringify({ schemaVersion: 1, phase: "ideation", status: "in_progress" }, null, 2) + "\n",
  );
  runExpectFailure(["bun", "run", script, violationWorkspace], "intents/20260701-broken.md");
  runExpectFailure(["bun", "run", script, violationWorkspace], "## 概要");
}

// (6) --check モード: 実ファイルを改変すると exit 1、一致していれば exit 0
{
  run(["bun", "run", script, workspace]);
  const corrupted = readFileSync(intentsPath(workspace), "utf8") + "\n<!-- 手動編集 -->\n";
  writeFileSync(intentsPath(workspace), corrupted);
  runExpectFailure(["bun", "run", script, workspace, "--check"], intentsPath(workspace));
  run(["bun", "run", script, workspace]);
  const checkResult = runResult(["bun", "run", script, workspace, "--check"]);
  if (checkResult.exitCode !== 0) fail("--check: 一致しているのに exit 1 になった: " + checkResult.stderr);
}

// (7) 退役確認: discoveries.md を生成しない
{
  const ws = newWorkspace("index-generate-no-discoveries-");
  writeIntent(ws, "20260701-alpha", "Alpha", "Alpha の概要文である。", [{ dep: "なし", reason: "初回 Intent であるため。" }]);
  run(["bun", "run", script, ws]);
  const discoveriesFile = join(ws, ".amadeus/discoveries.md");
  if (readFileSyncOptional(discoveriesFile) !== undefined) {
    fail("(退役確認) IndexGenerate が discoveries.md を生成した");
  }
}

function readFileSyncOptional(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

// ---- validator 統合: index 整合検査 (T001) ----
// skills/amadeus-validator/validator/AmadeusValidator.ts が buildIntentsIndex を
// 再利用した不整合検査を持つことを、専用の検査カテゴリ「Index 生成整合」の pass/fail 件数で確認する。
// このカテゴリだけを見ることで、steering layer 等の未整備に起因する他カテゴリの fail と区別する。

const validatorScript = "skills/amadeus-validator/validator/AmadeusValidator.ts";

function runValidator(workspace: string): { stdout: string; stderr: string; exitCode: number } {
  return runResult(["bun", "run", validatorScript, workspace]);
}

function indexGenerationCategoryCounts(report: string): { pass: number; warning: number; fail: number; blocked: number } {
  const match = report.match(/\| Index 生成整合 \| (\d+) \| (\d+) \| (\d+) \| (\d+) \|/);
  if (!match) fail("validator 出力に「Index 生成整合」カテゴリ行が見つかりません:\n" + report);
  return { pass: Number(match[1]), warning: Number(match[2]), fail: Number(match[3]), blocked: Number(match[4]) };
}

// (統合1) 整合: IndexGenerate で生成した直後の fixture workspace は、Index 生成整合カテゴリで fail を出さない
{
  const ws = newWorkspace("index-generate-validator-consistent-");
  writeIntent(ws, "20260701-alpha", "Alpha", "Alpha の概要文である。", [{ dep: "なし", reason: "初回 Intent であるため。" }]);
  run(["bun", "run", script, ws]);
  const result = runValidator(ws);
  const counts = indexGenerationCategoryCounts(result.stdout);
  if (counts.fail !== 0) fail("(統合1) 整合直後の workspace で Index 生成整合カテゴリに fail がある:\n" + result.stdout);
}

// (統合2) 行の改変: intents.md の既存行を書き換えると Index 生成整合カテゴリが fail になる
{
  const ws = newWorkspace("index-generate-validator-corrupted-");
  writeIntent(ws, "20260701-alpha", "Alpha", "Alpha の概要文である。", [{ dep: "なし", reason: "初回 Intent であるため。" }]);
  run(["bun", "run", script, ws]);
  const corrupted = readFileSync(intentsPath(ws), "utf8").replace("Alpha の概要文である。", "Alpha の改変された概要。");
  writeFileSync(intentsPath(ws), corrupted);
  const result = runValidator(ws);
  const counts = indexGenerationCategoryCounts(result.stdout);
  if (counts.fail === 0) fail("(統合2) intents.md の行改変で Index 生成整合カテゴリが fail にならない:\n" + result.stdout);
  if (!result.stdout.includes("`.amadeus/intents.md`: Index 生成整合")) {
    fail("(統合2) fail 対象に .amadeus/intents.md が示されていない:\n" + result.stdout);
  }
}

// (統合3) 行の過不足: モジュール追加後に再生成しないと Index 生成整合カテゴリが fail になる
{
  const ws = newWorkspace("index-generate-validator-missing-row-");
  writeIntent(ws, "20260701-alpha", "Alpha", "Alpha の概要文である。", [{ dep: "なし", reason: "初回 Intent であるため。" }]);
  run(["bun", "run", script, ws]);
  writeIntent(ws, "20260702-beta", "Beta", "Beta の概要文である。", [{ dep: "20260701-alpha", reason: "Alpha の完了を前提にするため。" }]);
  const result = runValidator(ws);
  const counts = indexGenerationCategoryCounts(result.stdout);
  if (counts.fail === 0) fail("(統合3) モジュール追加後の未再生成で Index 生成整合カテゴリが fail にならない:\n" + result.stdout);
  if (!result.stdout.includes("`.amadeus/intents.md`: Index 生成整合")) {
    fail("(統合3) fail 対象に .amadeus/intents.md が示されていない:\n" + result.stdout);
  }
}

// (統合4) マーカー欠落: 生成マーカー行を削除すると Index 生成整合カテゴリが fail になる
{
  const ws = newWorkspace("index-generate-validator-missing-marker-");
  writeIntent(ws, "20260701-alpha", "Alpha", "Alpha の概要文である。", [{ dep: "なし", reason: "初回 Intent であるため。" }]);
  run(["bun", "run", script, ws]);
  const withoutMarker = readFileSync(intentsPath(ws), "utf8").split("\n").slice(2).join("\n");
  writeFileSync(intentsPath(ws), withoutMarker);
  const result = runValidator(ws);
  const counts = indexGenerationCategoryCounts(result.stdout);
  if (counts.fail === 0) fail("(統合4) 生成マーカー欠落で Index 生成整合カテゴリが fail にならない:\n" + result.stdout);
  if (!result.stdout.includes("`.amadeus/intents.md`: Index 生成整合")) {
    fail("(統合4) fail 対象に .amadeus/intents.md が示されていない:\n" + result.stdout);
  }
}

// (統合5) 見出し契約違反: クラッシュではなく fail として報告する
{
  const ws = newWorkspace("index-generate-validator-heading-violation-");
  writeFileSync(
    join(ws, ".amadeus/intents/20260701-broken.md"),
    ["# インテント：Broken", "", "## 依存", "", "| 依存 | 理由 |", "|---|---|", "| なし | 初回 Intent であるため。 |", ""].join("\n"),
  );
  mkdirSync(join(ws, ".amadeus/intents/20260701-broken"), { recursive: true });
  writeFileSync(
    join(ws, ".amadeus/intents/20260701-broken/state.json"),
    JSON.stringify({ schemaVersion: 1, phase: "ideation", status: "in_progress" }, null, 2) + "\n",
  );
  const result = runValidator(ws);
  if (!result.stdout.startsWith("# Amadeus Validator 結果")) {
    fail("(統合5) validator がクラッシュした可能性がある:\nstdout:\n" + result.stdout + "\nstderr:\n" + result.stderr);
  }
  if (result.exitCode !== 1) fail("(統合5) 見出し契約違反時の exitCode が想定外（fail=1 を期待）: " + result.exitCode);
  const counts = indexGenerationCategoryCounts(result.stdout);
  if (counts.fail === 0) fail("(統合5) 見出し契約違反が Index 生成整合カテゴリの fail として報告されない:\n" + result.stdout);
  if (!result.stdout.includes("intents/20260701-broken.md")) {
    fail("(統合5) 見出し契約違反の対象ファイルが報告に含まれない:\n" + result.stdout);
  }
  if (!result.stdout.includes("## 概要")) {
    fail("(統合5) 不足している見出しが報告に含まれない:\n" + result.stdout);
  }
}

// (統合6) greenfield 整合: モジュール 0 件の workspace の生成結果が steering テンプレートと一字一句一致する
{
  const ws = newWorkspace("index-generate-greenfield-");
  run(["bun", "run", script, ws]);
  const generatedIntents = readFileSync(intentsPath(ws), "utf8");
  const templateIntents = readFileSync(join(root, "skills/amadeus-steering/templates/steering/intents.md"), "utf8");
  if (generatedIntents !== templateIntents) {
    fail("(greenfield) 生成した intents.md が steering テンプレートと一致しない:\n生成:\n" + generatedIntents + "\nテンプレート:\n" + templateIntents);
  }
}

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("index generate eval: ok");
