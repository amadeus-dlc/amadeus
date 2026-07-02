#!/usr/bin/env bun
// 承認待ちキュー（ゲート待ち）を一覧する同梱スクリプト。
// 使い方: bun run GateQueueList.ts <workspace>
// 判定規則: phase ブロック（ideation、inception、construction）の gate または status が waiting_approval、
// top-level status が waiting_approval、または taskGeneration.status の gate 結果が waiting_approval
// （契約カタログ gateResultByStatus に従う。現行語彙では ready_for_approval）の Intent を承認待ちとして扱う。
// 出力: 承認待ちの Intent、phase、ゲート、待ち理由の Markdown 表。0 件時は「承認待ちはありません。」を stdout へ出力する。
// exit 0 は正常実行（検出 0 件を含む）、exit 1 は入力エラー。
// `.amadeus/intents` がない workspace は対象外として stderr へ通知し、exit 0 とする。
// JSON として解釈できない state.json は stderr へ警告して読み飛ばし、一覧全体は失敗させない。

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { taskGenerationContract } from "../validator/generated/task-generation-contract";

const WAITING_APPROVAL = "waiting_approval";
const waitingTaskStatuses = new Set(
  Object.entries(taskGenerationContract.gateResultByStatus)
    .filter(([, result]) => result === WAITING_APPROVAL)
    .map(([status]) => status),
);

const phaseGateLabels: Record<string, string> = {
  ideation: "Ideation gate",
  inception: "Inception gate",
  construction: "Construction gate",
};
const phaseOrder = ["ideation", "inception", "construction"];

const target = process.argv[2];
if (!target) {
  console.error("使い方: bun run GateQueueList.ts <workspace>");
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

type WaitRow = { intent: string; phase: string; gate: string; reasons: string[]; sortKey: [number, number, string] };

const rows: WaitRow[] = [];

for (const name of readdirSync(intentsDir).sort()) {
  const intentDir = join(intentsDir, name);
  if (!statSync(intentDir).isDirectory()) continue;
  const statePath = join(intentDir, "state.json");
  if (!existsSync(statePath)) continue;

  let state: Record<string, any>;
  try {
    state = JSON.parse(readFileSync(statePath, "utf8"));
  } catch {
    console.error(`警告: state.json を JSON として解釈できないため読み飛ばします: ${name}`);
    continue;
  }

  const currentPhase = String(state.phase ?? "").trim();
  const phaseReasons = new Map<string, string[]>();

  for (const phase of phaseOrder) {
    const block = state[phase];
    if (!block || typeof block !== "object") continue;
    const reasons: string[] = [];
    if (String(block.gate ?? "").trim() === WAITING_APPROVAL) reasons.push(`\`${phase}.gate\` が \`${WAITING_APPROVAL}\``);
    if (String(block.status ?? "").trim() === WAITING_APPROVAL) reasons.push(`\`${phase}.status\` が \`${WAITING_APPROVAL}\``);
    if (reasons.length > 0) phaseReasons.set(phase, reasons);
  }

  if (String(state.status ?? "").trim() === WAITING_APPROVAL) {
    const reasons = phaseReasons.get(currentPhase) ?? [];
    reasons.push(`\`status\` が \`${WAITING_APPROVAL}\``);
    phaseReasons.set(currentPhase, reasons);
  }

  for (const [phase, reasons] of phaseReasons) {
    const phaseIndex = phaseOrder.indexOf(phase);
    rows.push({
      intent: name,
      phase: currentPhase,
      gate: phaseGateLabels[phase] ?? "未確認",
      reasons,
      sortKey: [phaseIndex === -1 ? phaseOrder.length : phaseIndex, 0, ""],
    });
  }

  const bolts: any[] = Array.isArray(state.construction?.bolts) ? state.construction.bolts : [];
  for (const bolt of bolts) {
    const boltId = String(bolt?.id ?? "").trim();
    const taskStatus = String(bolt?.taskGeneration?.status ?? "").trim();
    if (!waitingTaskStatuses.has(taskStatus)) continue;
    rows.push({
      intent: name,
      phase: currentPhase,
      gate: `Task Generation Gate（${boltId}）`,
      reasons: [`\`construction.bolts[${boltId}].taskGeneration.status\` が \`${taskStatus}\``],
      sortKey: [phaseOrder.indexOf("construction"), 1, boltId],
    });
  }
}

rows.sort((a, b) => {
  if (a.intent !== b.intent) return a.intent < b.intent ? -1 : 1;
  const [ap, ak, ab] = a.sortKey;
  const [bp, bk, bb] = b.sortKey;
  if (ap !== bp) return ap - bp;
  if (ak !== bk) return ak - bk;
  return ab < bb ? -1 : ab > bb ? 1 : 0;
});

if (rows.length === 0) {
  console.log("承認待ちはありません。");
} else {
  const lines = ["| Intent | phase | ゲート | 待ち理由 |", "|---|---|---|---|"];
  for (const row of rows) {
    lines.push(`| ${row.intent} | ${row.phase} | ${row.gate} | ${row.reasons.join("、")} |`);
  }
  console.log(lines.join("\n"));
}
