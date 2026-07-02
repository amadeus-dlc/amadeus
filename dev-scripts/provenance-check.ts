#!/usr/bin/env bun
// provenance:check 照合スクリプト。
// 使い方: bun run dev-scripts/provenance-check.ts <workspace>
// <workspace>/.amadeus/intents/*/provenance/*.json を持つ Intent だけを検査対象にする（BR005, INV002）。
// 記録された commit と path の組から git show <commit>:<path> で記録時点の内容を取り出し、
// md5 を再計算して記録値と照合する。「現在のファイル」とは比較しない（BR003, D001）。
// 検出する drift は3種類（md5 不一致、commit 不一致、参照先欠落）。スキーマ不適合も失敗として扱う（BR004）。
// buildWorkspace.path、targetWorkspace.path は環境依存のため照合対象にせず、記録だけを扱う（BR009）。
// drift は stdout へ1行1件で出力する。exit 0 は正常実行（検出0件を含む）、exit 1 は drift ありまたは入力エラー（BR007）。

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const target = process.argv[2];
if (!target) fail("使い方: bun run dev-scripts/provenance-check.ts <workspace>");
const workspace = resolve(target);
if (!existsSync(workspace) || !statSync(workspace).isDirectory()) fail(`workspace が存在しません: ${workspace}`);

const requiredKeys = [
  "schemaVersion",
  "generatedAt",
  "buildWorkspace",
  "targetWorkspace",
  "hostEnvironment",
  "targetArtifacts",
  "skills",
  "validator",
  "devScripts",
  "stageJudgment",
  "stage0Adoption",
];

function commitExists(commit: string): boolean {
  const result = Bun.spawnSync(["git", "-C", workspace, "cat-file", "-e", `${commit}^{commit}`], { stdout: "pipe", stderr: "pipe" });
  return result.exitCode === 0;
}

function showContent(commit: string, path: string): Buffer | null {
  const result = Bun.spawnSync(["git", "-C", workspace, "show", `${commit}:${path}`], { stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) return null;
  return Buffer.from(result.stdout);
}

function md5Of(content: Buffer): string {
  return createHash("md5").update(content).digest("hex");
}

const drifts: string[] = [];

function checkEntry(recordLabel: string, fieldLabel: string, entry: { path?: unknown; commit?: unknown; md5?: unknown }): void {
  const path = String(entry.path ?? "");
  const commit = String(entry.commit ?? "");
  const md5 = String(entry.md5 ?? "");
  if (!commitExists(commit)) {
    drifts.push(`${recordLabel}: commit不一致 ${fieldLabel} path=${path} commit=${commit}`);
    return;
  }
  const content = showContent(commit, path);
  if (content === null) {
    drifts.push(`${recordLabel}: 参照先欠落 ${fieldLabel} path=${path} commit=${commit}`);
    return;
  }
  if (md5Of(content) !== md5) {
    drifts.push(`${recordLabel}: md5不一致 ${fieldLabel} path=${path} commit=${commit}`);
  }
}

const intentsDir = join(workspace, ".amadeus/intents");
if (existsSync(intentsDir)) {
  for (const intentName of readdirSync(intentsDir).sort()) {
    const intentDir = join(intentsDir, intentName);
    if (!statSync(intentDir).isDirectory()) continue;
    const provenanceDir = join(intentDir, "provenance");
    if (!existsSync(provenanceDir) || !statSync(provenanceDir).isDirectory()) continue;

    for (const fileName of readdirSync(provenanceDir).sort()) {
      if (!fileName.endsWith(".json")) continue;
      const filePath = join(provenanceDir, fileName);
      const recordLabel = relative(workspace, filePath);

      let record: Record<string, any>;
      try {
        record = JSON.parse(readFileSync(filePath, "utf8"));
      } catch {
        drifts.push(`${recordLabel}: スキーマ不適合 JSON を解釈できません`);
        continue;
      }
      const missing = requiredKeys.filter((key) => !(key in record));
      if (missing.length > 0) {
        drifts.push(`${recordLabel}: スキーマ不適合 欠落フィールド=${missing.join(",")}`);
        continue;
      }

      const skills = Array.isArray(record.skills) ? record.skills : [];
      skills.forEach((skill, index) => checkEntry(recordLabel, `skills[${index}]`, skill));
      if (record.validator !== null && record.validator !== undefined) {
        checkEntry(recordLabel, "validator", record.validator);
      }
      const devScripts = Array.isArray(record.devScripts) ? record.devScripts : [];
      devScripts.forEach((devScript, index) => checkEntry(recordLabel, `devScripts[${index}]`, devScript));
    }
  }
}

for (const drift of drifts) console.log(drift);
process.exit(drifts.length > 0 ? 1 : 0);
