#!/usr/bin/env bun
// provenance:generate の eval。
// BR001, BR002, BR006（スキーマ、出力先、採番、既存ファイル非上書き）と、
// 実測 commit の意味（working tree と HEAD が異なる場合は入力エラー）、
// 対象 Intent 不在時の失敗、stage0 採用判断が未判断の場合の出力を固定入力で検証する。

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const script = join(root, "dev-scripts/provenance-generate.ts");
const intent = "20260702-eval-intent";

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

function run(args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(["bun", "run", script, ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

function md5Of(path: string): string {
  return createHash("md5").update(readFileSync(path)).digest("hex");
}

function makeFixture(): string {
  const fixture = mkdtempSync(join(tmpdir(), "provenance-generate"));
  cleanups.push(fixture);
  mkdirSync(join(fixture, ".amadeus/intents", intent), { recursive: true });
  mkdirSync(join(fixture, "skills/sample-skill"), { recursive: true });
  mkdirSync(join(fixture, ".agents/skills/amadeus-validator/validator"), { recursive: true });
  mkdirSync(join(fixture, "dev-scripts"), { recursive: true });
  writeFileSync(join(fixture, "skills/sample-skill/SKILL.md"), "# Sample Skill\n");
  writeFileSync(join(fixture, ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts"), "export const ok = true;\n");
  writeFileSync(join(fixture, "dev-scripts/sample-script.ts"), "export const sample = 1;\n");
  git(["init", "-q"], fixture);
  git(["config", "user.email", "eval@example.com"], fixture);
  git(["config", "user.name", "eval"], fixture);
  git(["add", "-A"], fixture);
  git(["commit", "-q", "-m", "init fixture"], fixture);
  return fixture;
}

const baseArgs = (fixture: string, slug: string, extra: string[] = []) => [
  "--build-workspace", fixture,
  "--target-workspace", fixture,
  "--intent", intent,
  "--slug", slug,
  "--harness", "claude-code",
  "--stage-judgment", "eval 用の固定判定",
  "--target-artifact", "dev-scripts/provenance-generate.ts",
  "--skill", "skills/sample-skill/SKILL.md",
  "--validator", ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts",
  "--validator-result", "pass",
  "--dev-script", "dev-scripts/sample-script.ts",
  ...extra,
];

// ---- 正常系: スキーマ、出力先、採番、既存ファイル非上書き、stage0 未判断 ----
{
  const fixture = makeFixture();
  const provenanceDir = join(fixture, ".amadeus/intents", intent, "provenance");
  mkdirSync(provenanceDir, { recursive: true });
  const seedPath = join(provenanceDir, "P001-manual-seed.json");
  writeFileSync(seedPath, JSON.stringify({ seed: true }, null, 2) + "\n");
  const seedBefore = readFileSync(seedPath, "utf8");

  const commit = git(["rev-parse", "HEAD"], fixture);
  const skillMd5 = md5Of(join(fixture, "skills/sample-skill/SKILL.md"));
  const validatorMd5 = md5Of(join(fixture, ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts"));
  const devScriptMd5 = md5Of(join(fixture, "dev-scripts/sample-script.ts"));

  const result = run(baseArgs(fixture, "sample-generation"));
  if (result.exitCode !== 0) fail(`正常系が失敗しました\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);

  const outputPath = join(provenanceDir, "P002-sample-generation.json");
  if (!existsSync(outputPath)) fail(`採番された出力ファイルが見つかりません: ${outputPath}\nstdout: ${result.stdout}`);

  const seedAfter = readFileSync(seedPath, "utf8");
  if (seedAfter !== seedBefore) fail("既存の provenance ファイルが上書きされました");

  const record = JSON.parse(readFileSync(outputPath, "utf8"));
  if (record.schemaVersion !== 1) fail(`schemaVersion が不正です: ${JSON.stringify(record.schemaVersion)}`);
  if (typeof record.generatedAt !== "string" || Number.isNaN(Date.parse(record.generatedAt))) {
    fail(`generatedAt が不正です: ${JSON.stringify(record.generatedAt)}`);
  }
  if (record.buildWorkspace?.path !== resolve(fixture) || record.buildWorkspace?.commit !== commit) {
    fail(`buildWorkspace が不正です: ${JSON.stringify(record.buildWorkspace)}`);
  }
  if (record.targetWorkspace?.path !== resolve(fixture) || record.targetWorkspace?.commit !== commit) {
    fail(`targetWorkspace が不正です: ${JSON.stringify(record.targetWorkspace)}`);
  }
  if (!record.hostEnvironment?.os || !record.hostEnvironment?.runtime || record.hostEnvironment?.harness !== "claude-code") {
    fail(`hostEnvironment が不正です: ${JSON.stringify(record.hostEnvironment)}`);
  }
  if (JSON.stringify(record.targetArtifacts) !== JSON.stringify(["dev-scripts/provenance-generate.ts"])) {
    fail(`targetArtifacts が不正です: ${JSON.stringify(record.targetArtifacts)}`);
  }
  if (
    record.skills?.length !== 1 ||
    record.skills[0].path !== "skills/sample-skill/SKILL.md" ||
    record.skills[0].commit !== commit ||
    record.skills[0].md5 !== skillMd5
  ) {
    fail(`skills が不正です: ${JSON.stringify(record.skills)}`);
  }
  if (
    record.validator?.path !== ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts" ||
    record.validator?.commit !== commit ||
    record.validator?.md5 !== validatorMd5 ||
    record.validator?.result !== "pass"
  ) {
    fail(`validator が不正です: ${JSON.stringify(record.validator)}`);
  }
  if (
    record.devScripts?.length !== 1 ||
    record.devScripts[0].path !== "dev-scripts/sample-script.ts" ||
    record.devScripts[0].commit !== commit ||
    record.devScripts[0].md5 !== devScriptMd5
  ) {
    fail(`devScripts が不正です: ${JSON.stringify(record.devScripts)}`);
  }
  if (record.stageJudgment !== "eval 用の固定判定") fail(`stageJudgment が不正です: ${JSON.stringify(record.stageJudgment)}`);
  if (record.stage0Adoption?.present !== false || record.stage0Adoption?.reference !== null) {
    fail(`stage0 未判断時の出力が不正です: ${JSON.stringify(record.stage0Adoption)}`);
  }

  // 再実行は次番号（P003）として採番され、P002 を上書きしない
  const secondResult = run(baseArgs(fixture, "second-generation"));
  if (secondResult.exitCode !== 0) fail(`2回目の実行が失敗しました\nstdout: ${secondResult.stdout}\nstderr: ${secondResult.stderr}`);
  if (!existsSync(join(provenanceDir, "P003-second-generation.json"))) {
    fail(`2回目の採番が期待と異なります\nstdout: ${secondResult.stdout}`);
  }
  const firstStillThere = readFileSync(outputPath, "utf8");
  if (JSON.parse(firstStillThere).stageJudgment !== "eval 用の固定判定") fail("1回目の出力ファイルが変化しました");
}

// ---- 入力エラー: skill ファイルに未コミットの変更がある ----
{
  const fixture = makeFixture();
  writeFileSync(join(fixture, "skills/sample-skill/SKILL.md"), "# Sample Skill (未コミット変更)\n");
  const result = run(baseArgs(fixture, "uncommitted-check"));
  if (result.exitCode === 0) fail("未コミット変更があるのに成功しました");
  if (!result.stderr.includes("skills/sample-skill/SKILL.md")) {
    fail(`未コミット変更のエラーに対象 path が含まれていません\nstderr: ${result.stderr}`);
  }
}

// ---- 入力エラー: 対象 Intent ディレクトリが存在しない ----
{
  const fixture = makeFixture();
  const missingIntent = "20260702-not-exist-intent";
  const args = baseArgs(fixture, "missing-intent-check").map((value) => (value === intent ? missingIntent : value));
  const result = run(args);
  if (result.exitCode === 0) fail("存在しない Intent なのに成功しました");
  if (!result.stderr.includes(missingIntent)) fail(`存在しない Intent のエラーに Intent 名が含まれていません\nstderr: ${result.stderr}`);
}

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("provenance generate eval: ok");
