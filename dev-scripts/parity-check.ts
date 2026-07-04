#!/usr/bin/env bun

// dev-scripts/data/parity-baseline.json（上流基準 manifest）と
// dev-scripts/data/parity-map.json（名前写像・配置差・除外）を突き合わせ、
// このリポジトリが上流 aidlc-workflows とパリティを保っているか検査する。
//
// 検査対象:
//   (a) baseline の skill 名を写像した各名前が skills/ と .agents/skills/ に存在する
//   (b) baseline の engine ファイル（parity-map.json の checkedEngineDirectories 参照）が
//       parity-map の nameMappings（対応表駆動のトークン置換）と relocations に従い
//       .agents/amadeus/ 配下の実体と同一 sha256（内容正規化後）で存在する
//       （relocations に宣言のないファイルは .claude/ 配下を直接照合する）
//   (c) baseline.rulesAidlcMd は parity-map の nameMappings + relocations に従いローカルの rules-file 実体を
//       内容正規化後の sha256 で照合する
//   (d) parity-map.json に宣言のない差分（欠落・hash 不一致）があれば fail し、差分を列挙する
//
// 名前写像（nameMappings）は kind ごとに disambiguation 規則を持つ（engine-namespace、Issue #445）。
//   - tool / hook: 拡張子込みの完全一致に限る（bare token では照合しない）
//   - engine-dir: エンジンのディレクトリ全体を指す path 接頭辞一致（workspace ディレクトリには照合しない）
//   - common-dir / shared-dir: path セグメント境界での一致
//   - rules-file: エンジンの rules ファイル 1 件への path 一致
//   - sub-agent: 旧 prefix 付き agent トークン -> 新 prefix 付き agent トークンのパターン一致（#438 の吸収）
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

type NameMappingKind =
  | "engine-dir"
  | "tool"
  | "hook"
  | "common-dir"
  | "shared-dir"
  | "rules-file"
  | "sub-agent"
  | "scope-file"
  | "sensor-file";

type NameMapping = { kind: NameMappingKind; prefix: string; replacement: string };

type ParityMap = {
  skillNameMapping: { prefix: string; replacement: string };
  nameMappings: NameMapping[];
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

function sha256Text(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// kind ごとの disambiguation 規則に従い、置換対象トークンにマッチする正規表現を作る。
// direction が "forward" のときは prefix -> replacement（旧 -> 新、path 解決に使う）、
// "reverse" のときは replacement -> prefix（新 -> 旧、内容正規化に使う）の向きでマッチさせる。
function mappingRegex(mapping: NameMapping, direction: "forward" | "reverse"): RegExp {
  const from = direction === "forward" ? mapping.prefix : mapping.replacement;
  const escaped = escapeRegExp(from);
  switch (mapping.kind) {
    case "tool":
    case "hook": {
      // 拡張子込みの完全一致に限る。bare token（例: "aidlc-state"）には照合しない。
      // ソースファイル自体は .ts だが、兄弟ファイルへの ESM import 参照は .js 拡張子で書かれるため、
      // 拡張子は .ts / .js のどちらでも一致させ、置換時は捕捉した拡張子をそのまま保持する（下記 applyMapping）。
      const base = escaped.replace(/\\\.ts$/, "");
      return new RegExp(`(?<![A-Za-z0-9_-])${base}(\\.ts|\\.js)(?![A-Za-z0-9_])`, "g");
    }
    case "engine-dir":
    case "rules-file":
      // path 接頭辞・path 一致。対象文字列自体が十分に具体的なため単純一致でよい。
      return new RegExp(escaped, "g");
    case "common-dir":
    case "shared-dir":
      // path セグメント境界での一致。前後が英数字・ハイフンでないことを要求する。
      return new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`, "g");
    case "sub-agent":
      // aidlc-<x>-agent -> amadeus-<x>-agent のパターン一致（#438 の吸収）。
      return new RegExp(`(?<![A-Za-z0-9_-])${escaped}-([a-z0-9-]+-agent)(?![A-Za-z0-9_-])`, "g");
    case "scope-file":
    case "sensor-file": {
      // 拡張子込み（.md）の完全一致に限る（tool/hook と同型の disambiguation）。
      // 個々の scope-file / sensor-file の実ファイル名だけでなく、ドキュメント内の命名規則
      // プレースホルダ表記（`<name>`/`<id>` を含む 1 トークン）にも同じ規則で照合する
      // （review 指摘で追加、code-generation 決定記録あり）。
      const base = escaped.replace(/\\\.md$/, "");
      return new RegExp(`(?<![A-Za-z0-9_-])${base}\\.md(?![A-Za-z0-9_])`, "g");
    }
  }
}

function applyMapping(text: string, mapping: NameMapping, direction: "forward" | "reverse"): string {
  const regex = mappingRegex(mapping, direction);
  const replacement = direction === "forward" ? mapping.replacement : mapping.prefix;
  if (mapping.kind === "sub-agent") {
    return text.replace(regex, `${replacement}-$1`);
  }
  if (mapping.kind === "tool" || mapping.kind === "hook") {
    const base = replacement.replace(/\.ts$/, "");
    return text.replace(regex, `${base}$1`);
  }
  return text.replace(regex, replacement);
}

// baseline（上流）の相対 path に、対応表（nameMappings）のトークン置換を前方向に適用する。
// 例: "tools/<旧 tool 名>.ts" -> "tools/<新 tool 名>.ts"、
//     "knowledge/<旧 shared-dir 名>/k.md" -> "knowledge/<新 shared-dir 名>/k.md"。
function mapEnginePath(upstreamPath: string, mappings: NameMapping[]): string {
  let mapped = upstreamPath;
  for (const mapping of mappings) mapped = applyMapping(mapped, mapping, "forward");
  return mapped;
}

// ローカルファイルの内容に、対応表（nameMappings）のトークン置換を逆方向に適用し、
// 上流 baseline の hash と比較できる形（旧名）へ正規化する。
function normalizeContent(localContent: string, mappings: NameMapping[]): string {
  let normalized = localContent;
  for (const mapping of mappings) normalized = applyMapping(normalized, mapping, "reverse");
  return normalized;
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

// 対応表で置換済みの path（mapEnginePath 適用後）を relocations と突き合わせ、ローカル実体の path を解決する。
function resolveLocalEnginePath(root: string, mappedPath: string, relocations: Relocation[]): string {
  const exact = relocations.find((entry) => entry.upstreamPath === mappedPath);
  if (exact) return join(root, exact.localPath);

  // ディレクトリ単位の配置写像（例: "tools" -> ".agents/amadeus/tools"）。
  // mappedPath がそのディレクトリ配下のファイルであれば、写像先ディレクトリ + 残りの相対パスで解決する。
  const dirRelocation = relocations.find((entry) => mappedPath.startsWith(`${entry.upstreamPath}/`));
  if (dirRelocation) {
    const remainder = mappedPath.slice(dirRelocation.upstreamPath.length + 1);
    return join(root, dirRelocation.localPath, remainder);
  }

  return join(root, ".claude", mappedPath);
}

function resolveMappedLocalEnginePath(root: string, upstreamPath: string, map: ParityMap): string {
  return resolveLocalEnginePath(root, mapEnginePath(upstreamPath, map.nameMappings), map.relocations);
}

function checkEngineFiles(root: string, baseline: ParityBaseline, map: ParityMap): string[] {
  const exceptions = new Set(map.engineFileExceptions ?? []);
  const issues: string[] = [];
  for (const entry of baseline.engineFiles) {
    if (exceptions.has(entry.path)) continue;
    const localPath = resolveMappedLocalEnginePath(root, entry.path, map);
    if (!existsSync(localPath)) {
      issues.push(`engine ファイル欠落: ${entry.path} -> ${localPath}`);
      continue;
    }
    const actual = sha256Text(normalizeContent(readFileSync(localPath, "utf8"), map.nameMappings));
    if (actual !== entry.sha256) {
      issues.push(`engine ファイル hash 不一致: ${entry.path}（期待 ${entry.sha256}、実際 ${actual}）`);
    }
  }
  return issues;
}

function checkRulesFile(root: string, baseline: ParityBaseline, map: ParityMap): string[] {
  const exceptions = new Set(map.engineFileExceptions ?? []);
  if (exceptions.has(baseline.rulesAidlcMd.path)) return [];
  const localPath = resolveMappedLocalEnginePath(root, baseline.rulesAidlcMd.path, map);
  if (!existsSync(localPath)) return [`rules-file 欠落: ${baseline.rulesAidlcMd.path} -> ${localPath}`];
  const actual = sha256Text(normalizeContent(readFileSync(localPath, "utf8"), map.nameMappings));
  if (actual !== baseline.rulesAidlcMd.sha256) {
    return [`rules-file hash 不一致: ${baseline.rulesAidlcMd.path}（期待 ${baseline.rulesAidlcMd.sha256}、実際 ${actual}） -> ${localPath}`];
  }
  return [];
}

function main(): void {
  const root = resolve(process.argv[2] ?? process.cwd());
  const baseline = readJson<ParityBaseline>(join(root, "dev-scripts/data/parity-baseline.json"), "parity-baseline.json");
  const map = readJson<ParityMap>(join(root, "dev-scripts/data/parity-map.json"), "parity-map.json");

  const issues = [...checkSkills(root, baseline, map), ...checkEngineFiles(root, baseline, map), ...checkRulesFile(root, baseline, map)];

  if (issues.length > 0) {
    console.error(`parity check: ${issues.length} 件の差分（基準 commit ${baseline.baselineCommit}）`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }

  console.log(`parity check: ok（${baseline.skills.length} skills、${baseline.engineFiles.length} engine files、基準 commit ${baseline.baselineCommit}）`);
}

main();
