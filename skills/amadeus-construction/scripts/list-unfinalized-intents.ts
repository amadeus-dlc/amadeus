#!/usr/bin/env bun
// 未 finalize の Intent を列挙する同梱スクリプト。
// 使い方: bun run list-unfinalized-intents.ts <workspace>
// 判定規則: `construction.gate` が `passed` でなく、`targetBolts` のすべてに `test-results.md` があり、
// `pr.md` を欠く Bolt が存在する Intent を未 finalize として扱う（基準 branch 由来の checkout を前提にする）。
// 出力: 未 finalize の Intent ディレクトリ名を stdout へ 1 行 1 件。
// exit 0 は正常実行（検出 0 件を含む）、exit 1 は入力エラー。
// `.amadeus/intents` がない workspace は対象外として stderr へ通知し、exit 0 とする。

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const target = process.argv[2];
if (!target) {
  console.error("使い方: bun run list-unfinalized-intents.ts <workspace>");
  process.exit(1);
}
const workspace = resolve(target);
if (!existsSync(workspace) || !statSync(workspace).isDirectory()) {
  console.error(`workspace が存在しません: ${workspace}`);
  process.exit(1);
}
const intentsDir = join(workspace, ".amadeus/intents");
if (!existsSync(intentsDir)) {
  console.error(`対象外: ${intentsDir} が存在しません`);
  process.exit(0);
}

function boltDirectoryFor(boltsDir: string, boltId: string): string | undefined {
  if (!existsSync(boltsDir)) return undefined;
  return readdirSync(boltsDir)
    .filter((name) => statSync(join(boltsDir, name)).isDirectory())
    .find((name) => name === boltId || name.startsWith(`${boltId}-`));
}

for (const name of readdirSync(intentsDir).sort()) {
  const intentDir = join(intentsDir, name);
  if (!statSync(intentDir).isDirectory()) continue;
  const statePath = join(intentDir, "state.json");
  if (!existsSync(statePath)) continue;

  let state: Record<string, any>;
  try {
    state = JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    continue;
  }
  const construction = state.construction;
  if (!construction || typeof construction !== "object") continue;
  if (String(construction.gate ?? "").trim() === "passed") continue;

  const targetBolts: string[] = Array.isArray(construction.targetBolts)
    ? construction.targetBolts.map((value: unknown) => String(value ?? "").trim()).filter((value: string) => value.length > 0)
    : [];
  if (targetBolts.length === 0) continue;

  const boltsDir = join(intentDir, "construction/bolts");
  const verified = targetBolts.every((boltId) => {
    const boltDir = boltDirectoryFor(boltsDir, boltId);
    return boltDir !== undefined && existsSync(join(boltsDir, boltDir, "test-results.md"));
  });
  if (!verified) continue;

  const missingPr = targetBolts.some((boltId) => {
    const boltDir = boltDirectoryFor(boltsDir, boltId);
    return boltDir !== undefined && !existsSync(join(boltsDir, boltDir, "pr.md"));
  });
  if (missingPr) console.log(name);
}
