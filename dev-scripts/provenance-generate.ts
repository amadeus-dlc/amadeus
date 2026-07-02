#!/usr/bin/env bun
// provenance record 生成スクリプト。
// 使い方:
//   bun run dev-scripts/provenance-generate.ts \
//     --build-workspace <path> --target-workspace <path> --intent <intent-dir> --slug <slug> \
//     --harness <name> --stage-judgment <text> \
//     [--target-artifact <path>]... [--skill <path>]... \
//     [--validator <path> --validator-result <text>] [--dev-script <path>]... \
//     [--stage0-reference <参照先>]
// 出力: <target-workspace>/.amadeus/intents/<intent>/provenance/Pnnn-<slug>.json
// commit と md5 は git コマンドとファイルハッシュ計算で実測する。人間は値を手書きしない（INV001）。
// skill / validator / devScripts の対象ファイルが build workspace の working tree と HEAD で異なる場合、
// md5・commit・path の三つ組が崩れるため、該当 path を示して失敗する。

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { platform, release } from "node:os";
import { join, resolve } from "node:path";

type ToolEntry = { path: string; commit: string; md5: string };

type Options = {
  buildWorkspace: string;
  targetWorkspace: string;
  intent: string;
  slug: string;
  harness: string;
  stageJudgment: string;
  targetArtifacts: string[];
  skillPaths: string[];
  validatorPath: string | null;
  validatorResult: string | null;
  devScriptPaths: string[];
  stage0Reference: string | null;
};

function usage(): string {
  return [
    "使い方: bun run dev-scripts/provenance-generate.ts \\",
    "  --build-workspace <path> --target-workspace <path> --intent <intent-dir> --slug <slug> \\",
    "  --harness <name> --stage-judgment <text> \\",
    "  [--target-artifact <path>]... [--skill <path>]... \\",
    "  [--validator <path> --validator-result <text>] [--dev-script <path>]... \\",
    "  [--stage0-reference <参照先>]",
  ].join("\n");
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseOptions(argv: string[]): Options {
  const options: Options = {
    buildWorkspace: "",
    targetWorkspace: "",
    intent: "",
    slug: "",
    harness: "",
    stageJudgment: "",
    targetArtifacts: [],
    skillPaths: [],
    validatorPath: null,
    validatorResult: null,
    devScriptPaths: [],
    stage0Reference: null,
  };

  const single: Record<string, (value: string) => void> = {
    "--build-workspace": (v) => (options.buildWorkspace = v),
    "--target-workspace": (v) => (options.targetWorkspace = v),
    "--intent": (v) => (options.intent = v),
    "--slug": (v) => (options.slug = v),
    "--harness": (v) => (options.harness = v),
    "--stage-judgment": (v) => (options.stageJudgment = v),
    "--validator": (v) => (options.validatorPath = v),
    "--validator-result": (v) => (options.validatorResult = v),
    "--stage0-reference": (v) => (options.stage0Reference = v),
  };
  const repeatable: Record<string, string[]> = {
    "--target-artifact": options.targetArtifacts,
    "--skill": options.skillPaths,
    "--dev-script": options.devScriptPaths,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg in single) {
      const value = argv[index + 1];
      if (value === undefined) fail(usage());
      single[arg](value);
      index += 1;
    } else if (arg in repeatable) {
      const value = argv[index + 1];
      if (value === undefined) fail(usage());
      repeatable[arg].push(value);
      index += 1;
    } else {
      fail(usage());
    }
  }

  if (
    !options.buildWorkspace ||
    !options.targetWorkspace ||
    !options.intent ||
    !options.slug ||
    !options.harness ||
    !options.stageJudgment
  ) {
    fail(usage());
  }
  if (!/^[a-z0-9-]+$/.test(options.slug)) fail(`slug は小文字英数字とハイフンのみ使用できます: ${options.slug}`);
  if ((options.validatorPath === null) !== (options.validatorResult === null)) {
    fail("--validator と --validator-result は同時に指定してください");
  }

  return options;
}

function git(args: string[], cwd: string): { exitCode: number; stdout: Buffer } {
  const result = Bun.spawnSync(["git", "-C", cwd, ...args], { stdout: "pipe", stderr: "pipe" });
  return { exitCode: result.exitCode, stdout: Buffer.from(result.stdout) };
}

function headCommit(workspace: string): string {
  const result = git(["rev-parse", "HEAD"], workspace);
  if (result.exitCode !== 0) fail(`git repository として解決できません: ${workspace}`);
  return result.stdout.toString("utf8").trim();
}

function md5Of(content: Buffer): string {
  return createHash("md5").update(content).digest("hex");
}

// working tree の内容が記録対象の commit（HEAD）の内容と一致するか確認し、実測した md5 を返す
function measureToolFile(buildWorkspace: string, commit: string, relativePath: string, mismatches: string[]): ToolEntry {
  const absolutePath = join(buildWorkspace, relativePath);
  if (!existsSync(absolutePath)) {
    mismatches.push(`${relativePath}（working tree に存在しません）`);
    return { path: relativePath, commit, md5: "" };
  }
  const workingContent = readFileSync(absolutePath);
  const shown = git(["show", `${commit}:${relativePath}`], buildWorkspace);
  if (shown.exitCode !== 0) {
    mismatches.push(`${relativePath}（HEAD に存在しません、未コミットです）`);
    return { path: relativePath, commit, md5: md5Of(workingContent) };
  }
  if (!workingContent.equals(shown.stdout)) {
    mismatches.push(`${relativePath}（working tree と HEAD の内容が異なります）`);
  }
  return { path: relativePath, commit, md5: md5Of(workingContent) };
}

const options = parseOptions(process.argv.slice(2));

const buildWorkspace = resolve(options.buildWorkspace);
const targetWorkspace = resolve(options.targetWorkspace);
if (!existsSync(buildWorkspace) || !statSync(buildWorkspace).isDirectory()) {
  fail(`build workspace が存在しません: ${buildWorkspace}`);
}
if (!existsSync(targetWorkspace) || !statSync(targetWorkspace).isDirectory()) {
  fail(`target workspace が存在しません: ${targetWorkspace}`);
}

const intentDir = join(targetWorkspace, ".amadeus/intents", options.intent);
if (!existsSync(intentDir) || !statSync(intentDir).isDirectory()) {
  fail(`対象 Intent が存在しません: ${options.intent}`);
}

const buildCommit = headCommit(buildWorkspace);
const targetCommit = headCommit(targetWorkspace);

const mismatches: string[] = [];
const skills: ToolEntry[] = options.skillPaths.map((path) => measureToolFile(buildWorkspace, buildCommit, path, mismatches));
const devScripts: ToolEntry[] = options.devScriptPaths.map((path) => measureToolFile(buildWorkspace, buildCommit, path, mismatches));
let validator: (ToolEntry & { result: string }) | null = null;
if (options.validatorPath !== null && options.validatorResult !== null) {
  const entry = measureToolFile(buildWorkspace, buildCommit, options.validatorPath, mismatches);
  validator = { ...entry, result: options.validatorResult };
}

if (mismatches.length > 0) {
  fail(["実測対象ファイルの working tree が HEAD と異なります:", ...mismatches.map((m) => `- ${m}`)].join("\n"));
}

const provenanceDir = join(intentDir, "provenance");
mkdirSync(provenanceDir, { recursive: true });
const existingNumbers = readdirSync(provenanceDir)
  .map((name) => name.match(/^P(\d{3})-.*\.json$/))
  .filter((match): match is RegExpMatchArray => match !== null)
  .map((match) => Number(match[1]));
const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
const fileName = `P${String(nextNumber).padStart(3, "0")}-${options.slug}.json`;
const outputPath = join(provenanceDir, fileName);
if (existsSync(outputPath)) fail(`出力先が既に存在します: ${outputPath}`);

const record = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  buildWorkspace: { path: buildWorkspace, commit: buildCommit },
  targetWorkspace: { path: targetWorkspace, commit: targetCommit },
  hostEnvironment: { os: `${platform()} ${release()}`, runtime: `Bun ${Bun.version}`, harness: options.harness },
  targetArtifacts: options.targetArtifacts,
  skills,
  validator,
  devScripts,
  stageJudgment: options.stageJudgment,
  stage0Adoption: {
    present: options.stage0Reference !== null,
    reference: options.stage0Reference,
  },
};

writeFileSync(outputPath, JSON.stringify(record, null, 2) + "\n");
console.log(outputPath);
