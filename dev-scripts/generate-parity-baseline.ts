#!/usr/bin/env bun

// 上流 aidlc-workflows clone（dist/claude/.claude/）からパリティ基準 manifest を抽出する。
// 抽出対象:
//   (a) skills/ 直下のディレクトリ名一覧
//   (b) tools/, aidlc-common/, sensors/, hooks/, scopes/, agents/, knowledge/ の全ファイルの
//       .claude/ からの相対パスと sha256
//   (c) rules/aidlc.md の sha256
//   (d) 基準 commit（`git rev-parse HEAD` を clone 内で実行して取得）
//
// 使い方:
//   bun run dev-scripts/generate-parity-baseline.ts <upstream-clone-path> [--out <path>]

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const engineDirectories = ["tools", "aidlc-common", "sensors", "hooks", "scopes", "agents", "knowledge"] as const;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv: string[]): { upstreamPath: string; outPath: string } {
  const positionals = argv.filter((arg) => !arg.startsWith("--"));
  const upstreamPath = positionals[0];
  if (!upstreamPath) fail("使い方: bun run dev-scripts/generate-parity-baseline.ts <upstream-clone-path> [--out <path>]");

  const outIndex = argv.indexOf("--out");
  const outPath = outIndex >= 0 ? argv[outIndex + 1] : resolve(import.meta.dir, "data/parity-baseline.json");
  if (outIndex >= 0 && !outPath) fail("--out にはパスを指定してください");

  return { upstreamPath: resolve(upstreamPath), outPath: resolve(outPath) };
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function listFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir).sort();
  return entries.flatMap((entry) => {
    const entryPath = join(dir, entry);
    return statSync(entryPath).isDirectory() ? listFilesRecursive(entryPath) : [entryPath];
  });
}

function baselineCommit(upstreamPath: string): string {
  const result = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: upstreamPath, stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) {
    fail(`git rev-parse HEAD が失敗しました（${upstreamPath}）: ${new TextDecoder().decode(result.stderr)}`);
  }
  return new TextDecoder().decode(result.stdout).trim();
}

function collectSkillNames(claudeRoot: string): string[] {
  const skillsDir = join(claudeRoot, "skills");
  if (!existsSync(skillsDir)) fail(`skills ディレクトリが見つかりません: ${skillsDir}`);
  return readdirSync(skillsDir)
    .filter((entry) => statSync(join(skillsDir, entry)).isDirectory())
    .sort();
}

function collectEngineFiles(claudeRoot: string): { path: string; sha256: string }[] {
  const files: { path: string; sha256: string }[] = [];
  for (const directory of engineDirectories) {
    for (const filePath of listFilesRecursive(join(claudeRoot, directory))) {
      files.push({ path: relative(claudeRoot, filePath), sha256: sha256(filePath) });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

function main(): void {
  const { upstreamPath, outPath } = parseArgs(process.argv.slice(2));
  if (!existsSync(upstreamPath)) fail(`upstream clone が見つかりません: ${upstreamPath}`);

  const claudeRoot = join(upstreamPath, "dist/claude/.claude");
  if (!existsSync(claudeRoot)) fail(`dist/claude/.claude が見つかりません: ${claudeRoot}`);

  const rulesAidlcPath = join(claudeRoot, "rules/aidlc.md");
  if (!existsSync(rulesAidlcPath)) fail(`rules/aidlc.md が見つかりません: ${rulesAidlcPath}`);

  const manifest = {
    baselineCommit: baselineCommit(upstreamPath),
    generatedAt: new Date().toISOString(),
    engineDirectories,
    skills: collectSkillNames(claudeRoot),
    engineFiles: collectEngineFiles(claudeRoot),
    rulesAidlcMd: { path: "rules/aidlc.md", sha256: sha256(rulesAidlcPath) },
  };

  writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`parity baseline: ${manifest.skills.length} skills, ${manifest.engineFiles.length} engine files -> ${outPath}`);
}

main();
