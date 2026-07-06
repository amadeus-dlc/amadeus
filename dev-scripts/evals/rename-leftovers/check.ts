#!/usr/bin/env bun

// rename-leftovers eval（Issue #537 / #538 / #540）。
//
// engine-namespace 改名（#445）後の取りこぼしを常設で検査する。
// 実ファイルを変更せず、temp workspace も作らない静的・決定論的な検査。
//
// (a) B001 (#537): tools/*.ts 内に旧名 skills/aidlc パス断片が残っていないか。
//     具体的には join 引数としての "skills", "aidlc" パターンを検出する。
//     許可リスト（allowlist.json）にないものを violation として報告する。
//
// (b) B002 (#540): tools/*.ts 内に `aidlc-${ テンプレートリテラルが残っていないか。
//     sensor 解決で aidlc-${sensorId}.md を使っている場合に検出する。
//     許可リストにないものを violation として報告する。
//
// (c) センサーファイル命名: .agents/amadeus/sensors/ の全ファイルが amadeus- prefix
//     で始まっているかを確認する。
//
// (d) scope-table --check: amadeus-utility.ts の scope-table --check が exit 0 で
//     完走することを確認する（B001 修正の実動作確認）。

import { readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const toolsDir = join(root, ".agents/amadeus/tools");
const sensorsDir = join(root, ".agents/amadeus/sensors");
const allowlistPath = join(import.meta.dir, "allowlist.json");

// --- 許可リスト読み込み ---

interface AllowlistEntry {
  pattern: string;
  reason: string;
  files: string[];
}

interface Allowlist {
  entries: AllowlistEntry[];
}

const allowlist: Allowlist = JSON.parse(readFileSync(allowlistPath, "utf-8")) as Allowlist;

function isAllowlisted(line: string, filename: string): boolean {
  for (const entry of allowlist.entries) {
    const matchesFile =
      entry.files.includes("*") || entry.files.some((f) => basename(filename) === f);
    if (matchesFile && line.includes(entry.pattern)) {
      return true;
    }
  }
  return false;
}

// --- ヘルパー ---

let failures = 0;

function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`ok: ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function isCodeLine(line: string): boolean {
  const trimmed = line.trimStart();
  return (
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("*") &&
    !trimmed.startsWith("/*") &&
    trimmed.length > 0
  );
}

function getToolFiles(): string[] {
  return readdirSync(toolsDir)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
    .map((f) => join(toolsDir, f));
}

// --- (a) B001: skills/aidlc パス断片の検出 ---
// "skills", "aidlc" というパターン（join での古いパス組み立て）を検出する。
// これは旧スキルディレクトリ(.agents/amadeus/skills/aidlc/)への参照を示す。

{
  const violations: string[] = [];

  for (const filePath of getToolFiles()) {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!isCodeLine(line)) continue;
      // "skills", "aidlc" パターン（パス join での古いスキル dir 参照）
      if (
        (line.includes('"skills"') && line.includes('"aidlc"')) ||
        (line.includes("'skills'") && line.includes("'aidlc'")) ||
        line.includes("skills/aidlc/")
      ) {
        if (!isAllowlisted(line, filePath)) {
          violations.push(`${basename(filePath)}:${i + 1}: ${line.trim()}`);
        }
      }
    }
  }

  ok(
    "(a) B001: tools/*.ts に skills/aidlc パス断片が残っていない",
    violations.length === 0,
    violations.length > 0
      ? `${violations.length} violation(s):\n${violations.map((v) => `  ${v}`).join("\n")}`
      : undefined
  );
}

// --- (b) B002: `aidlc-${ テンプレートリテラルの検出 ---
// aidlc-${...} パターン（sensor 解決での旧名使用）を検出する。
// amadeus-sensor-schema.ts のエラーメッセージ文字列は許可リストで除外。

{
  const violations: string[] = [];

  for (const filePath of getToolFiles()) {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!isCodeLine(line)) continue;
      // `aidlc-${ パターン（テンプレートリテラルで aidlc- prefix を使っている箇所）
      if (line.includes("`aidlc-${")) {
        if (!isAllowlisted(line, filePath)) {
          violations.push(`${basename(filePath)}:${i + 1}: ${line.trim()}`);
        }
      }
    }
  }

  ok(
    "(b) B002: tools/*.ts に `aidlc-${ テンプレートリテラルが残っていない（許可リスト除く）",
    violations.length === 0,
    violations.length > 0
      ? `${violations.length} violation(s):\n${violations.map((v) => `  ${v}`).join("\n")}`
      : undefined
  );
}

// --- (c) センサーファイル命名確認 ---
// .agents/amadeus/sensors/ の全 .md ファイルが amadeus- prefix で始まることを確認。

{
  const sensorFiles = readdirSync(sensorsDir).filter((f) => f.endsWith(".md"));
  const wrongPrefix = sensorFiles.filter((f) => !f.startsWith("amadeus-"));
  const allAmadeus = wrongPrefix.length === 0;

  ok(
    `(c) センサーファイルが amadeus- prefix（${sensorFiles.length} 件）`,
    allAmadeus,
    allAmadeus
      ? undefined
      : `aidlc- prefix のファイルが残っている: ${wrongPrefix.join(", ")}`
  );

  // 4 センサーすべてが存在することも確認
  const EXPECTED_SENSORS = ["linter", "required-sections", "type-check", "upstream-coverage"];
  for (const id of EXPECTED_SENSORS) {
    const fname = `amadeus-${id}.md`;
    ok(
      `(c) センサーファイル amadeus-${id}.md が存在する`,
      sensorFiles.includes(fname),
      `${fname} が sensors/ に見つからない`
    );
  }
}

// --- (d) scope-table --check の exit 0 確認 ---
// B001 修正の実動作確認。SKILL.md を正しいパスで読めることを検証する。

{
  const utilityTs = join(toolsDir, "amadeus-utility.ts");
  const proc = Bun.spawnSync(
    ["bun", utilityTs, "scope-table", "--check"],
    {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    }
  );
  const exitCode = proc.exitCode ?? -1;
  const stderr = new TextDecoder().decode(proc.stderr);

  ok(
    "(d) scope-table --check が exit 0 で完走する",
    exitCode === 0,
    exitCode !== 0 ? `exit=${exitCode} stderr: ${stderr.slice(0, 300)}` : undefined
  );
}

// --- 集計 ---

if (failures > 0) {
  console.error(`rename-leftovers eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log("rename-leftovers eval: ok");

// --- (e) #526 全面 rename: 旧名トークンの tree-wide 残存検出 ---
// allowlist.json の postRenameScan 設定（scanRoots / excludePaths / tokens / allow）に
// 従って走査する。検出力は下の自己検査（合成サンプル）で証明する。

{
  interface PostRenameScan {
    scanRoots: string[];
    excludePaths: string[];
    tokens: string[];
    allow: { pattern: string; reason: string; files: string[] }[];
  }
  const cfg = (
    JSON.parse(readFileSync(allowlistPath, "utf-8")) as { postRenameScan: PostRenameScan }
  ).postRenameScan;

  const isExcluded = (rel: string): boolean =>
    cfg.excludePaths.some((e) => rel === e || rel.startsWith(e));
  const isAllowedLine = (line: string, rel: string): boolean =>
    cfg.allow.some(
      (a) =>
        (a.files.includes("*") || a.files.some((f) => rel === f || basename(rel) === f)) &&
        line.includes(a.pattern),
    );
  const findViolations = (rel: string, content: string): string[] => {
    const out: string[] = [];
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!cfg.tokens.some((t) => line.includes(t))) continue;
      if (isAllowedLine(line, rel)) continue;
      out.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
    }
    return out;
  };

  // 自己検査: 検出器が合成サンプルの旧名を報告し、allow 該当行を通すこと
  const selfHit = findViolations("synthetic.ts", 'const p = join(root, "aidlc/spaces/default");');
  const selfPass = findViolations("synthetic.ts", "// 旧 aidlc/spaces 構造からの移行注記");
  ok("(e) 自己検査: 検出器が旧名を報告する", selfHit.length === 1, JSON.stringify(selfHit));
  ok("(e) 自己検査: allow 該当行を通す", selfPass.length === 0, JSON.stringify(selfPass));

  const { execSync } = require("node:child_process");
  const tracked: string[] = execSync(`git ls-files ${cfg.scanRoots.join(" ")}`, {
    encoding: "utf-8",
    cwd: root,
  })
    .split("\n")
    .filter(Boolean);
  const violations: string[] = [];
  for (const rel of tracked) {
    if (isExcluded(rel)) continue;
    let content: string;
    try {
      content = readFileSync(join(root, rel), "utf-8");
    } catch {
      continue;
    }
    violations.push(...findViolations(rel, content));
  }
  ok(
    "(e) #526: 旧名トークン（aidlc/spaces、aidlc-state.md、.aidlc-、/aidlc）の残存がない",
    violations.length === 0,
    `${violations.length} violation(s):\n  ${violations.slice(0, 12).join("\n  ")}`,
  );
}

if (failures > 0) {
  console.error(`rename-leftovers eval: ${failures} 件失敗（(e) 追加分）`);
  process.exit(1);
}
