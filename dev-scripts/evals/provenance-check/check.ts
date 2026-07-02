#!/usr/bin/env bun
// provenance:check の eval。
// D001（記録照合セマンティクス）と BR003〜BR005, BR007, BR009 を固定入力で検証する。
// 記録時点の内容（git show <commit>:<path>）を照合対象にし、現在のファイルとは比較しない（BR003）。
// 検出する drift は3種類（md5 不一致、commit 不一致、参照先欠落）に加え、スキーマ不適合も失敗として扱う（BR004）。
// provenance/ を持つ Intent だけを検査対象にし、既存 Intent へ遡及しない（BR005, INV002）。
// workspace の絶対 path は照合対象にせず、記録だけを行う（BR009）。

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const script = join(root, "dev-scripts/provenance-check.ts");

const cleanups: string[] = [];

function fail(message: string): never {
  for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
  console.error(message);
  process.exit(1);
}

function git(args: string[], cwd: string): string {
  const result = Bun.spawnSync(["git", "-C", cwd, ...args], { stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) fail(`git 実行に失敗しました: git ${args.join(" ")}\n${new TextDecoder().decode(result.stderr)}`);
  return new TextDecoder().decode(result.stdout).trim();
}

function run(args: string[], cwd = root): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(["bun", "run", script, ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

function md5Of(content: string): string {
  return createHash("md5").update(content).digest("hex");
}

function writeProvenance(workspace: string, intent: string, fileName: string, record: Record<string, unknown>): void {
  const dir = join(workspace, ".amadeus/intents", intent, "provenance");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, fileName), JSON.stringify(record, null, 2) + "\n");
}

function baseRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    buildWorkspace: { path: "/machine-a/amadeus", commit: "will-be-overridden" },
    targetWorkspace: { path: "/machine-b/amadeus", commit: "will-be-overridden" },
    hostEnvironment: { os: "darwin", runtime: "Bun 1.0.0", harness: "claude-code" },
    targetArtifacts: ["dev-scripts/provenance-check.ts"],
    skills: [],
    validator: null,
    devScripts: [],
    stageJudgment: "eval 用の固定判定",
    stage0Adoption: { present: false, reference: null },
    ...overrides,
  };
}

// ---- 固定 workspace: 複数 Intent に drift 3種 + スキーマ不適合 2種 + drift なし + provenance 非保有を混在させる ----
const workspace = mkdtempSync(join(tmpdir(), "provenance-check"));
cleanups.push(workspace);
mkdirSync(join(workspace, "tools/skill"), { recursive: true });
const skillContent = "skill v1\n";
writeFileSync(join(workspace, "tools/skill/SKILL.md"), skillContent);
git(["init", "-q"], workspace);
git(["config", "user.email", "eval@example.com"], workspace);
git(["config", "user.name", "eval"], workspace);
git(["add", "-A"], workspace);
git(["commit", "-q", "-m", "init fixture"], workspace);
const commit = git(["rev-parse", "HEAD"], workspace);
const correctMd5 = md5Of(skillContent);
const nonexistentCommit = "0".repeat(40);

// drift なし。buildWorkspace/targetWorkspace には環境依存の絶対 path を入れ、照合対象にならないことも兼ねて確認する（BR009）
mkdirSync(join(workspace, ".amadeus/intents/intent-driftfree"), { recursive: true });
writeProvenance(
  workspace,
  "intent-driftfree",
  "P001-ok.json",
  baseRecord({
    buildWorkspace: { path: "/machine-a/amadeus", commit },
    targetWorkspace: { path: "/machine-b/amadeus", commit },
    skills: [{ path: "tools/skill/SKILL.md", commit, md5: correctMd5 }],
  }),
);

// md5 不一致
mkdirSync(join(workspace, ".amadeus/intents/intent-md5-mismatch"), { recursive: true });
writeProvenance(
  workspace,
  "intent-md5-mismatch",
  "P001-bad-md5.json",
  baseRecord({ skills: [{ path: "tools/skill/SKILL.md", commit, md5: "0".repeat(32) }] }),
);

// commit 不一致（記録された commit が git 履歴に存在しない）
mkdirSync(join(workspace, ".amadeus/intents/intent-commit-mismatch"), { recursive: true });
writeProvenance(
  workspace,
  "intent-commit-mismatch",
  "P001-bad-commit.json",
  baseRecord({ skills: [{ path: "tools/skill/SKILL.md", commit: nonexistentCommit, md5: correctMd5 }] }),
);

// 参照先欠落（記録 commit 時点で path が存在しない）
mkdirSync(join(workspace, ".amadeus/intents/intent-missing-path"), { recursive: true });
writeProvenance(
  workspace,
  "intent-missing-path",
  "P001-missing-path.json",
  baseRecord({ skills: [{ path: "tools/skill/NOT-EXIST.md", commit, md5: correctMd5 }] }),
);

// スキーマ不適合: 必須9項目が欠落
mkdirSync(join(workspace, ".amadeus/intents/intent-schema-missing"), { recursive: true });
writeProvenance(workspace, "intent-schema-missing", "P001-bad-schema.json", { schemaVersion: 1 });

// スキーマ不適合: JSON 解釈不能
{
  const dir = join(workspace, ".amadeus/intents/intent-schema-unparsable/provenance");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "P001-unparsable.json"), "{ this is not json");
}

// provenance/ を持たない既存 Intent は検査対象から除外される（BR005, INV002）
mkdirSync(join(workspace, ".amadeus/intents/intent-no-provenance"), { recursive: true });
writeFileSync(join(workspace, ".amadeus/intents/intent-no-provenance/state.json"), "{}\n");

{
  const result = run([workspace]);
  if (result.exitCode !== 1) fail(`drift ありのとき exit 1 を期待したが ${result.exitCode}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  const lines = result.stdout.trim().split("\n").filter((line) => line.length > 0);
  if (lines.length !== 5) fail(`drift 検出件数が期待と異なる（期待 5 件）\nstdout: ${result.stdout}`);
  const checks: [string, RegExp][] = [
    ["md5 不一致", /intent-md5-mismatch.*md5不一致/],
    ["commit 不一致", /intent-commit-mismatch.*commit不一致/],
    ["参照先欠落", /intent-missing-path.*参照先欠落/],
    ["スキーマ不適合（欠落）", /intent-schema-missing.*スキーマ不適合/],
    ["スキーマ不適合（解釈不能）", /intent-schema-unparsable.*スキーマ不適合/],
  ];
  for (const [label, pattern] of checks) {
    if (!lines.some((line) => pattern.test(line))) fail(`${label} の drift 行が出力に見つかりません\nstdout: ${result.stdout}`);
  }
  if (lines.some((line) => line.includes("intent-driftfree"))) fail(`drift なしの Intent が誤検出されました\nstdout: ${result.stdout}`);
  if (lines.some((line) => line.includes("intent-no-provenance"))) {
    fail(`provenance/ を持たない Intent が検査対象になりました\nstdout: ${result.stdout}`);
  }
}

// ---- 対象なし: provenance/ を持つ Intent が存在しない workspace は exit 0 ----
{
  const emptyWorkspace = mkdtempSync(join(tmpdir(), "provenance-check-empty"));
  cleanups.push(emptyWorkspace);
  mkdirSync(join(emptyWorkspace, ".amadeus/intents/intent-no-provenance"), { recursive: true });
  writeFileSync(join(emptyWorkspace, ".amadeus/intents/intent-no-provenance/state.json"), "{}\n");
  const result = run([emptyWorkspace]);
  if (result.exitCode !== 0) fail(`対象なし: exit 0 を期待したが ${result.exitCode}\nstderr: ${result.stderr}`);
  if (result.stdout.trim().length !== 0) fail(`対象なし: 空の stdout を期待したが\n${result.stdout}`);
}

// ---- 入力エラー: workspace の path が不正 ----
{
  const result = run([join(workspace, "no-such-dir")]);
  if (result.exitCode !== 1) fail(`入力エラー: exit 1 を期待したが ${result.exitCode}`);
}
{
  const result = run([]);
  if (result.exitCode !== 1) fail(`引数なし: exit 1 を期待したが ${result.exitCode}`);
}

// ---- 実 workspace: このリポジトリ自体を検査する。現時点で provenance/ を持つ Intent は 0 件 ----
{
  const result = run(["."], root);
  if (result.exitCode !== 0) fail(`実 workspace の検査で exit 0 を期待したが ${result.exitCode}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
  if (result.stdout.trim().length !== 0) fail(`実 workspace で検出 0 件を期待したが\n${result.stdout}`);
}

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("provenance check eval: ok");
