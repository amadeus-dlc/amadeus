#!/usr/bin/env bun
// 共有インデックス `intents.md` を配下モジュールから再生成する同梱スクリプト。
// 使い方:
//   bun run IndexGenerate.ts <workspace> [--check]
// <workspace> は `aidlc/` を持つ対象ディレクトリを指定する。
// Space は aidlc/active-space（なければ default）で解決する。
// 既定（--check なし）は intents.md を生成、上書きする。
// --check は生成される期待内容と実ファイルの完全一致（マーカーを含む）を確認し、
// 不一致の対象ファイルを示して exit 1 にする。一致していれば exit 0 にする。
//
// 生成対象と導出規則:
//   <workspace>/aidlc/spaces/<space>/intents/intents.md
//     同じ intents/ 配下の <dirName>.md の H1 直後の `## 概要`（本文 1 段落）を概要列に、
//     `## 依存`（依存 | 理由 の表）を一覧の依存列と依存関係表（インテント | 依存 | 理由）に使う。
// 行の並び順は、識別子（ファイル名 stem）の辞書順にする。
//
// 見出し契約（intents/*.md の `## 概要` と `## 依存`）を
// 満たさないモジュールがある場合は、対象ファイルと不足している見出しを示して失敗する。
//
// buildIntentsIndex は export しており、validator が import して
// 不整合検査（生成した期待内容と実ファイルの完全一致判定）に再利用できる。

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spaceBase } from "../validator/space-paths";

export const INTENTS_MARKER =
  "<!-- 生成物: 直接編集しないでください。intents/ 配下の各モジュールを更新し、`bun run IndexGenerate.ts <workspace>` で再生成してください。 -->";

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
  const intentsDir = join(workspace, spaceBase(workspace), "intents");
  const ids = listModuleIds(intentsDir);
  const violations: HeadingViolation[] = [];
  const listRows: string[] = [];
  const dependencyRows: string[] = [];

  for (const id of ids) {
    if (id === "intents") continue; // 生成物自身は索引の対象にしない
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
    listRows.push(`| ${id} | ${summary} | ${depColumn} | [${id}.md](${id}.md) |`);
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

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function runCheck(workspace: string, intentsContent: string): void {
  const intentsFile = join(workspace, spaceBase(workspace), "intents/intents.md");
  const actualIntents = existsSync(intentsFile) ? readFileSync(intentsFile, "utf8") : undefined;
  if (actualIntents !== intentsContent) {
    fail(`不整合検査で不一致を検出しました: ${intentsFile}`);
  }
  console.log(`index generate --check: 一致しました (${intentsFile})`);
}

function runGenerate(workspace: string, intentsContent: string): void {
  const intentsFile = join(workspace, spaceBase(workspace), "intents/intents.md");
  writeFileSync(intentsFile, intentsContent);
  console.log(`index generate: ${intentsFile} を再生成しました`);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 1) fail("引数が不足しています: <workspace> [--check]");
  const workspace = resolve(args[0]);
  const checkMode = args.includes("--check");
  const aidlcDir = join(workspace, "aidlc");
  if (!existsSync(aidlcDir)) fail(`対象 workspace に aidlc/ が存在しません: ${aidlcDir}`);

  let intentsContent: string | undefined;
  try {
    intentsContent = buildIntentsIndex(workspace);
  } catch (error) {
    if (error instanceof HeadingContractViolationError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  if (checkMode) {
    runCheck(workspace, intentsContent as string);
  } else {
    runGenerate(workspace, intentsContent as string);
  }
}

if (import.meta.main) {
  main();
}
