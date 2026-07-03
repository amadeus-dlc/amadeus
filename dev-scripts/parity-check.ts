#!/usr/bin/env bun

// dev-scripts/data/parity-baseline.json（上流基準 manifest）と
// dev-scripts/data/parity-map.json（名前写像・配置差・除外）を突き合わせ、
// このリポジトリが上流 aidlc-workflows とパリティを保っているか検査する。
//
// 検査対象:
//   (a) baseline の skill 名を写像した各名前が skills/ と .agents/skills/ に存在する
//   (b) baseline の engine ファイル（tools/, aidlc-common/, sensors/, hooks/, scopes/, agents/, knowledge/）が
//       parity-map の relocations に従い .agents/aidlc/ 配下の実体と同一 sha256 で存在する
//       （relocations に宣言のないファイルは .claude/ 配下を直接照合する）
//   (c) rules/aidlc.md は parity-map の relocations に従い .agents/rules/aidlc.md の実体を照合する
//   (d) parity-map.json に宣言のない差分（欠落・hash 不一致）があれば fail し、差分を列挙する
//
// 使い方:
//   bun run dev-scripts/parity-check.ts [root]

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

type ParityBaseline = {
  baselineCommit: string;
  skills: string[];
  engineFiles: { path: string; sha256: string }[];
  rulesAidlcMd: { path: string; sha256: string };
};

type Relocation = { upstreamPath: string; localPath: string; reason: string };

type ParityMap = {
  skillNameMapping: { prefix: string; replacement: string };
  relocations: Relocation[];
  missingSkillExceptions?: string[];
  engineFileExceptions?: string[];
};

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function readJson<T>(path: string, label: string): T {
  if (!existsSync(path)) fail(`${label} が見つかりません: ${path}`);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    fail(`${label} が JSON として解釈できません（${path}）: ${(error as Error).message}`);
  }
}

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function mapSkillName(upstreamName: string, mapping: ParityMap["skillNameMapping"]): string {
  if (upstreamName === mapping.prefix) return mapping.replacement;
  if (upstreamName.startsWith(`${mapping.prefix}-`)) {
    return `${mapping.replacement}-${upstreamName.slice(mapping.prefix.length + 1)}`;
  }
  return upstreamName;
}

function checkSkills(root: string, baseline: ParityBaseline, map: ParityMap): string[] {
  const exceptions = new Set(map.missingSkillExceptions ?? []);
  const issues: string[] = [];
  for (const upstreamName of baseline.skills) {
    const mappedName = mapSkillName(upstreamName, map.skillNameMapping);
    if (exceptions.has(mappedName)) continue;

    const sourcePath = join(root, "skills", mappedName);
    const promotedPath = join(root, ".agents/skills", mappedName);
    if (!existsSync(sourcePath)) issues.push(`skill 欠落: skills/${mappedName}（upstream: ${upstreamName}）`);
    if (!existsSync(promotedPath)) issues.push(`skill 欠落: .agents/skills/${mappedName}（upstream: ${upstreamName}）`);
  }
  return issues;
}

function resolveLocalEnginePath(root: string, upstreamPath: string, relocations: Relocation[]): string {
  const exact = relocations.find((entry) => entry.upstreamPath === upstreamPath);
  if (exact) return join(root, exact.localPath);

  // ディレクトリ単位の配置写像（例: "tools" -> ".agents/aidlc/tools"）。
  // upstreamPath がそのディレクトリ配下のファイルであれば、写像先ディレクトリ + 残りの相対パスで解決する。
  const dirRelocation = relocations.find((entry) => upstreamPath.startsWith(`${entry.upstreamPath}/`));
  if (dirRelocation) {
    const remainder = upstreamPath.slice(dirRelocation.upstreamPath.length + 1);
    return join(root, dirRelocation.localPath, remainder);
  }

  return join(root, ".claude", upstreamPath);
}

function checkEngineFiles(root: string, baseline: ParityBaseline, map: ParityMap): string[] {
  const exceptions = new Set(map.engineFileExceptions ?? []);
  const issues: string[] = [];
  for (const entry of baseline.engineFiles) {
    if (exceptions.has(entry.path)) continue;
    const localPath = resolveLocalEnginePath(root, entry.path, map.relocations);
    if (!existsSync(localPath)) {
      issues.push(`engine ファイル欠落: ${entry.path} -> ${localPath}`);
      continue;
    }
    const actual = sha256(localPath);
    if (actual !== entry.sha256) {
      issues.push(`engine ファイル hash 不一致: ${entry.path}（期待 ${entry.sha256}、実際 ${actual}）`);
    }
  }
  return issues;
}

function checkRulesAidlcMd(root: string, baseline: ParityBaseline, map: ParityMap): string[] {
  const exceptions = new Set(map.engineFileExceptions ?? []);
  if (exceptions.has(baseline.rulesAidlcMd.path)) return [];
  const localPath = resolveLocalEnginePath(root, baseline.rulesAidlcMd.path, map.relocations);
  if (!existsSync(localPath)) return [`rules/aidlc.md 欠落: ${baseline.rulesAidlcMd.path} -> ${localPath}`];
  const actual = sha256(localPath);
  if (actual !== baseline.rulesAidlcMd.sha256) {
    return [`rules/aidlc.md hash 不一致: ${baseline.rulesAidlcMd.path}（期待 ${baseline.rulesAidlcMd.sha256}、実際 ${actual}） -> ${localPath}`];
  }
  return [];
}

function main(): void {
  const root = resolve(process.argv[2] ?? process.cwd());
  const baseline = readJson<ParityBaseline>(join(root, "dev-scripts/data/parity-baseline.json"), "parity-baseline.json");
  const map = readJson<ParityMap>(join(root, "dev-scripts/data/parity-map.json"), "parity-map.json");

  const issues = [...checkSkills(root, baseline, map), ...checkEngineFiles(root, baseline, map), ...checkRulesAidlcMd(root, baseline, map)];

  if (issues.length > 0) {
    console.error(`parity check: ${issues.length} 件の差分（基準 commit ${baseline.baselineCommit}）`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }

  console.log(`parity check: ok（${baseline.skills.length} skills、${baseline.engineFiles.length} engine files、基準 commit ${baseline.baselineCommit}）`);
}

main();
