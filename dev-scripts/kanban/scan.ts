// u002-kanban-sync-cli C-1/C-2: ローカル成果物のスキャンと列決定（GitHub 非依存の純ローカル層）。
// 契約は construction/u002-kanban-sync-cli/functional-design/ を正とする。
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { IntentCard } from "./intent-card";
import type { Column } from "./column";

export type { IntentCard } from "./intent-card";
export { COLUMNS } from "./column";
export type { Column } from "./column";

const UNKNOWN = "未確認";

type RegistryEntry = {
  uuid: string;
  slug: string;
  dirName?: string;
  scope?: string;
  status: string;
  issues?: number[];
};

function fieldValue(content: string, name: string): string {
  const m = content.match(new RegExp(`^- \\*\\*${name}\\*\\*: ?(.*)$`, "m"));
  const v = m?.[1]?.trim() ?? "";
  return v;
}

// awaiting は行頭のチェックボックス記法だけで判定する。凡例コメント
// （<!-- Checkbox states: ... [?] ... -->）を部分一致で誤検知しない。
export function parseStateFields(content: string): {
  agent: string;
  worktree: string;
  stage: string;
  phase: string;
  awaiting: boolean;
} {
  return {
    agent: fieldValue(content, "Active Agent") || UNKNOWN,
    worktree: fieldValue(content, "Worktree Path") || "-",
    stage: fieldValue(content, "Current Stage") || UNKNOWN,
    phase: fieldValue(content, "Lifecycle Phase"),
    awaiting: /^- \[\?\] /m.test(content),
  };
}

const SHARD_PATTERN = /^(.+)-([0-9a-f]{8,})\.md$/;

// <host>-<clone>.md にマッチする shard だけを対象に、本文の **Timestamp**: の
// 最大値で最新 shard を選ぶ。レガシー集約ログ（audit.md）は除外。mtime は使わない。
export function latestHostFromFiles(
  files: Array<{ name: string; content: string }>
): string {
  let bestHost = UNKNOWN;
  let bestTs = "";
  for (const f of files) {
    const m = f.name.match(SHARD_PATTERN);
    if (!m) continue;
    const ts = [...f.content.matchAll(/\*\*Timestamp\*\*: ?(\S+)/g)]
      .map((x) => x[1] ?? "")
      .sort()
      .at(-1) ?? "";
    if (ts >= bestTs && ts !== "") {
      bestTs = ts;
      bestHost = m[1] ?? UNKNOWN;
    }
  }
  return bestHost;
}

function latestHost(auditDir: string): string {
  if (!existsSync(auditDir)) return UNKNOWN;
  const files = readdirSync(auditDir)
    .filter((n) => n.endsWith(".md"))
    .map((name) => ({
      name,
      content: readFileSync(join(auditDir, name), "utf-8"),
    }));
  return latestHostFromFiles(files);
}

// 列決定の優先順: awaiting → Done → Lifecycle Phase の写像。
// INITIALIZATION と不明値は Ideation へ丸める（D-AD2）。
export function columnOf(card: IntentCard, phase: string): Column {
  if (card.awaiting) return "Awaiting Approval";
  if (card.status === "completed" || card.status === "complete") return "Done";
  const map: Record<string, Column> = {
    IDEATION: "Ideation",
    INCEPTION: "Inception",
    CONSTRUCTION: "Construction",
    OPERATION: "Operation",
  };
  return map[phase.toUpperCase()] ?? "Ideation";
}

// spaceDir（例: <PROJECT_DIR>/aidlc/spaces/default）配下の registry と record を
// 読んで IntentCard を返す。dirNames 指定時はその record だけ（--dirs 部分 sync）。
// record が欠けても落とさず 未確認 で埋める（欠損で落とさない契約）。
export function scanIntents(
  spaceDir: string,
  now: Date,
  dirNames?: string[]
): Array<IntentCard & { phase: string }> {
  const registryPath = join(spaceDir, "intents", "intents.json");
  const entries = JSON.parse(readFileSync(registryPath, "utf-8")) as RegistryEntry[];
  const syncedAt = now.toISOString();
  const cards: Array<IntentCard & { phase: string }> = [];
  for (const e of entries) {
    if (!e.dirName) continue; // 表示名が無い back-compat 行はカード化しない
    if (dirNames && !dirNames.includes(e.dirName)) continue;
    const recordDir = join(spaceDir, "intents", e.dirName);
    const statePath = join(recordDir, "aidlc-state.md");
    const fields = existsSync(statePath)
      ? parseStateFields(readFileSync(statePath, "utf-8"))
      : { agent: UNKNOWN, worktree: "-", stage: UNKNOWN, phase: "", awaiting: false };
    cards.push({
      dirName: e.dirName,
      uuid: e.uuid,
      status: e.status,
      scope: e.scope ?? UNKNOWN,
      agent: fields.agent,
      host: latestHost(join(recordDir, "audit")),
      worktree: fields.worktree,
      stage: fields.stage,
      awaiting: fields.awaiting,
      issues: e.issues ?? [],
      syncedAt,
      phase: fields.phase,
    });
  }
  return cards;
}
