#!/usr/bin/env bun
// 共有インデックス `intents.md` と `discoveries.md` を配下モジュールから再生成する同梱スクリプト。
// 使い方:
//   bun run IndexGenerate.ts <workspace> [--check]
// <workspace> は `.amadeus/` を持つ対象ディレクトリを指定する。
// 既定（--check なし）は intents.md と discoveries.md を生成、上書きする。
// --check は生成される期待内容と実ファイルの完全一致（マーカーを含む）を確認し、
// 不一致の対象ファイルを示して exit 1 にする。一致していれば exit 0 にする。
//
// 生成対象と導出規則:
//   <workspace>/.amadeus/intents.md
//     intents/*.md の H1 直後の `## 概要`（本文 1 段落）を概要列に、
//     `## 依存`（依存 | 理由 の表）を一覧の依存列と依存関係表（インテント | 依存 | 理由）に使う。
//   <workspace>/.amadeus/discoveries.md
//     discoveries/*.md の H1（末尾の「 Discovery Brief」を除去した値）をテーマ列に、
//     discoveries/*/state.json の status と decision を状態列と判定列に、
//     `## 推奨次アクション` の箇条書き（複数あればスペースなしで連結）を推奨次アクション列に使う。
// 行の並び順は、いずれも識別子（ファイル名 stem）の辞書順にする。
//
// 見出し契約（intents/*.md の `## 概要` と `## 依存`、discoveries/*.md の `## 推奨次アクション`）を
// 満たさないモジュールがある場合は、対象ファイルと不足している見出しを示して失敗する。
//
// buildIntentsIndex と buildDiscoveriesIndex は export しており、validator が import して
// 不整合検査（生成した期待内容と実ファイルの完全一致判定）に再利用できる。

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const INTENTS_MARKER =
  "<!-- 生成物: 直接編集しないでください。intents/ 配下の各モジュールを更新し、`bun run IndexGenerate.ts <workspace>` で再生成してください。 -->";

export const DISCOVERIES_MARKER =
  "<!-- 生成物: 直接編集しないでください。discoveries/ 配下の各モジュールを更新し、`bun run IndexGenerate.ts <workspace>` で再生成してください。 -->";

interface HeadingViolation {
  file: string;
  missing: string[];
}

export class HeadingContractViolationError extends Error {
  readonly violations: HeadingViolation[];

  constructor(violations: HeadingViolation[]) {
    super(
      violations
        .map((violation) =>
          violation.file.endsWith("state.json")
            ? `モジュール契約違反: ${violation.file} が読めません（${violation.missing.join("、")}）`
            : `見出し契約違反: ${violation.file} に ${violation.missing.join("、")} がありません`,
        )
        .join("\n"),
    );
    this.name = "HeadingContractViolationError";
    this.violations = violations;
  }
}

interface DependencyRow {
  dep: string;
  reason: string;
}

function listModuleIds(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -3))
    .sort();
}

function extractSection(text: string, heading: string): string | undefined {
  const lines = text.split("\n");
  const startIndex = lines.findIndex((line) => line.trim() === heading);
  if (startIndex === -1) return undefined;
  const rest = lines.slice(startIndex + 1);
  const endOffset = rest.findIndex((line) => line.trim().startsWith("## "));
  const sectionLines = endOffset === -1 ? rest : rest.slice(0, endOffset);
  return sectionLines.join("\n");
}

function paragraphOf(section: string): string {
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ");
}

function bulletsOf(section: string): string[] {
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

function parseDependencyRows(section: string): DependencyRow[] {
  const rows: DependencyRow[] = [];
  for (const rawLine of section.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("|") || !line.endsWith("|")) continue;
    const cells = line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    if (cells.length < 2) continue;
    const [dep, reason] = cells;
    if (dep === "依存" && reason === "理由") continue; // ヘッダー行
    if (/^-+$/.test(dep)) continue; // セパレーター行
    rows.push({ dep, reason });
  }
  return rows;
}

// `.amadeus/intents.md` の期待内容を、配下の intents/ 以下の各モジュールファイルから導出する。
// 見出し契約（## 概要、## 依存）を満たさないモジュールがある場合は HeadingContractViolationError を投げる。
export function buildIntentsIndex(workspace: string): string {
  const intentsDir = join(workspace, ".amadeus/intents");
  const ids = listModuleIds(intentsDir);
  const violations: HeadingViolation[] = [];
  const listRows: string[] = [];
  const dependencyRows: string[] = [];

  for (const id of ids) {
    const filePath = join(intentsDir, `${id}.md`);
    const text = readFileSync(filePath, "utf8");
    const summarySection = extractSection(text, "## 概要");
    const dependencySection = extractSection(text, "## 依存");
    const missing: string[] = [];
    if (summarySection === undefined) missing.push("## 概要");
    if (dependencySection === undefined) missing.push("## 依存");
    if (missing.length > 0) {
      violations.push({ file: `intents/${id}.md`, missing });
      continue;
    }
    const summary = paragraphOf(summarySection as string);
    const deps = parseDependencyRows(dependencySection as string);
    const depIds = deps.map((row) => row.dep).filter((dep) => dep !== "なし");
    const depColumn = depIds.length > 0 ? depIds.join(", ") : "なし";
    listRows.push(`| ${id} | ${summary} | ${depColumn} | [${id}.md](intents/${id}.md) |`);
    for (const { dep, reason } of deps) {
      dependencyRows.push(`| ${id} | ${dep} | ${reason} |`);
    }
  }

  if (violations.length > 0) throw new HeadingContractViolationError(violations);

  const lines = [
    INTENTS_MARKER,
    "",
    "# インテント",
    "",
    "## 一覧",
    "",
    "| 識別子 | 概要 | 依存 | 詳細 |",
    "|---|---|---|---|",
    ...(listRows.length > 0 ? listRows : ["", "Intent は未登録である。"]),
    "",
    "## 依存関係",
    "",
    "| インテント | 依存 | 理由 |",
    "|---|---|---|",
    ...(dependencyRows.length > 0 ? dependencyRows : ["", "Intent 間の依存関係は未登録である。"]),
  ];
  return lines.join("\n") + "\n";
}

// `.amadeus/discoveries.md` の期待内容を、配下の discoveries/ 以下の各モジュールファイルと state.json から導出する。
// 見出し契約（## 推奨次アクション）を満たさないモジュールがある場合は HeadingContractViolationError を投げる。
export function buildDiscoveriesIndex(workspace: string): string {
  const discoveriesDir = join(workspace, ".amadeus/discoveries");
  const ids = listModuleIds(discoveriesDir);
  const violations: HeadingViolation[] = [];
  const listRows: string[] = [];

  for (const id of ids) {
    const filePath = join(discoveriesDir, `${id}.md`);
    const text = readFileSync(filePath, "utf8");
    const lines = text.split("\n");
    const h1Line = (lines.find((line) => line.trim().startsWith("# ")) ?? "").trim();
    const theme = h1Line.replace(/^#\s*/, "").replace(/ Discovery Brief$/, "");
    const actionsSection = extractSection(text, "## 推奨次アクション");
    if (actionsSection === undefined) {
      violations.push({ file: `discoveries/${id}.md`, missing: ["## 推奨次アクション"] });
      continue;
    }
    const actions = bulletsOf(actionsSection).join("");
    const statePath = join(discoveriesDir, id, "state.json");
    if (!existsSync(statePath)) {
      violations.push({ file: `discoveries/${id}/state.json`, missing: ["ファイルが存在しない"] });
      continue;
    }
    let state: Record<string, unknown>;
    try {
      state = JSON.parse(readFileSync(statePath, "utf8"));
    } catch {
      violations.push({ file: `discoveries/${id}/state.json`, missing: ["JSON として解釈できない"] });
      continue;
    }
    const status = state.status ?? "";
    const decision = state.decision ?? "";
    listRows.push(`| ${id} | ${theme} | ${status} | ${decision} | ${actions} | [Discovery のモジュールファイル](discoveries/${id}.md) |`);
  }

  if (violations.length > 0) throw new HeadingContractViolationError(violations);

  const lines = [
    DISCOVERIES_MARKER,
    "",
    "# Discovery",
    "",
    "## 一覧",
    "",
    "| 識別子 | テーマ | 状態 | 判定 | 推奨次アクション | 詳細 |",
    "|---|---|---|---|---|---|",
    ...(listRows.length > 0 ? listRows : ["", "Discovery は未登録である。"]),
  ];
  return lines.join("\n") + "\n";
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function runCheck(workspace: string, intentsContent: string, discoveriesContent: string): void {
  const intentsFile = join(workspace, ".amadeus/intents.md");
  const discoveriesFile = join(workspace, ".amadeus/discoveries.md");
  const mismatches: string[] = [];
  const actualIntents = existsSync(intentsFile) ? readFileSync(intentsFile, "utf8") : undefined;
  const actualDiscoveries = existsSync(discoveriesFile) ? readFileSync(discoveriesFile, "utf8") : undefined;
  if (actualIntents !== intentsContent) mismatches.push(intentsFile);
  if (actualDiscoveries !== discoveriesContent) mismatches.push(discoveriesFile);
  if (mismatches.length > 0) {
    fail(`不整合検査で不一致を検出しました: ${mismatches.join(", ")}`);
  }
  console.log(`index generate --check: 一致しました (${intentsFile}, ${discoveriesFile})`);
}

function runGenerate(workspace: string, intentsContent: string, discoveriesContent: string): void {
  const intentsFile = join(workspace, ".amadeus/intents.md");
  const discoveriesFile = join(workspace, ".amadeus/discoveries.md");
  writeFileSync(intentsFile, intentsContent);
  writeFileSync(discoveriesFile, discoveriesContent);
  console.log(`index generate: ${intentsFile} を再生成しました`);
  console.log(`index generate: ${discoveriesFile} を再生成しました`);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 1) fail("引数が不足しています: <workspace> [--check]");
  const workspace = resolve(args[0]);
  const checkMode = args.includes("--check");
  const amadeusDir = join(workspace, ".amadeus");
  if (!existsSync(amadeusDir)) fail(`対象 workspace に .amadeus/ が存在しません: ${amadeusDir}`);

  const errors: string[] = [];
  let intentsContent: string | undefined;
  let discoveriesContent: string | undefined;
  try {
    intentsContent = buildIntentsIndex(workspace);
  } catch (error) {
    if (error instanceof HeadingContractViolationError) errors.push(error.message);
    else throw error;
  }
  try {
    discoveriesContent = buildDiscoveriesIndex(workspace);
  } catch (error) {
    if (error instanceof HeadingContractViolationError) errors.push(error.message);
    else throw error;
  }
  if (errors.length > 0) {
    for (const message of errors) console.error(message);
    process.exit(1);
  }

  if (checkMode) {
    runCheck(workspace, intentsContent as string, discoveriesContent as string);
  } else {
    runGenerate(workspace, intentsContent as string, discoveriesContent as string);
  }
}

if (import.meta.main) {
  main();
}
