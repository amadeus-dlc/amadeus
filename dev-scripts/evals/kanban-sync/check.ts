// u002-kanban-sync-cli: スキャン（C-1/C-2）と GraphQL 引数生成境界（C-3）の決定論的検証。
// ネットワークへ接続しない（gh 呼び出し境界の手前の純関数だけを検証する）。
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  columnOf,
  latestHostFromFiles,
  parseStateFields,
  scanIntents,
} from "../../kanban/scan";
import {
  buildDraftIssueBody,
  buildEnsureStatusOptions,
  buildItemFieldMutation,
} from "../../kanban/board";

let failures = 0;
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`ok: ${name}`);
  } else {
    failures++;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// --- parseStateFields: 凡例コメントを誤検知しない（US-2 / reviewer High 対応） ---
const legendOnly = [
  "## Stage Progress",
  "<!-- Checkbox states: [ ] not started, [-] in progress, [?] awaiting approval (gate open), [R] revising (user rejected gate), [x] completed, [S] skipped via --stage/--phase jump -->",
  "- [x] intent-capture — EXECUTE",
  "- **Active Agent**: amadeus-product-agent",
  "- **Worktree Path**: /tmp/wt",
  "- **Current Stage**: intent-capture",
].join("\n");
const f1 = parseStateFields(legendOnly);
ok("凡例コメントの [?] を awaiting と誤検知しない", f1.awaiting === false);
ok("Active Agent を抽出する", f1.agent === "amadeus-product-agent");
ok("Worktree Path を抽出する", f1.worktree === "/tmp/wt");
ok("Current Stage を抽出する", f1.stage === "intent-capture");

const withGate = legendOnly + "\n- [?] scope-definition — EXECUTE";
ok("行頭の [?] チェックボックスを awaiting と判定する", parseStateFields(withGate).awaiting === true);

// --- latestHostFromFiles: shard 命名にマッチするものだけ、Timestamp 最大で選ぶ ---
const host = latestHostFromFiles([
  { name: "audit.md", content: "**Timestamp**: 2026-07-05T09:00:00Z" }, // レガシーは除外
  { name: "host-a-0123456789ab.md", content: "**Timestamp**: 2026-07-01T00:00:00Z\n**Timestamp**: 2026-07-02T00:00:00Z" },
  { name: "host-b-fedcba987654.md", content: "**Timestamp**: 2026-07-03T00:00:00Z" },
]);
ok("Timestamp 最大の shard の host を返す", host === "host-b", host);
ok(
  "shard 命名にマッチしない場合は 未確認",
  latestHostFromFiles([{ name: "audit.md", content: "**Timestamp**: 2026-07-05T00:00:00Z" }]) === "未確認"
);

// --- columnOf: 判定順（awaiting → Done → phase 写像） ---
const baseCard = {
  dirName: "x", uuid: "u", status: "in_progress", scope: "feature",
  agent: "a", host: "h", worktree: "-", stage: "s", awaiting: false,
  issues: [], syncedAt: "2026-07-05T00:00:00Z",
};
ok("awaiting が最優先", columnOf({ ...baseCard, awaiting: true, status: "complete" }, "CONSTRUCTION") === "Awaiting Approval");
ok("completed は Done", columnOf({ ...baseCard, status: "completed" }, "CONSTRUCTION") === "Done");
ok("complete も Done", columnOf({ ...baseCard, status: "complete" }, "IDEATION") === "Done");
ok("INITIALIZATION は Ideation へ丸める", columnOf(baseCard, "INITIALIZATION") === "Ideation");
ok("CONSTRUCTION は Construction", columnOf(baseCard, "CONSTRUCTION") === "Construction");
ok("不明 phase は Ideation へ丸める", columnOf(baseCard, "") === "Ideation");

// --- scanIntents: 実ディレクトリ fixture（issues 有無混在、record 欠損、legacy audit） ---
const tmp = mkdtempSync(join(tmpdir(), "kanban-scan-"));
try {
  const intentsDir = join(tmp, "aidlc/spaces/default/intents");
  mkdirSync(intentsDir, { recursive: true });
  writeFileSync(join(intentsDir, "intents.json"), JSON.stringify([
    { uuid: "1", slug: "a", dirName: "260701-a", scope: "feature", status: "in_progress", issues: [470] },
    { uuid: "2", slug: "b", dirName: "260702-b", scope: "bugfix", status: "complete" },
    { uuid: "3", slug: "c", status: "in_progress" }, // dirName 無し（back-compat 行）
  ]));
  const recA = join(intentsDir, "260701-a");
  mkdirSync(join(recA, "audit"), { recursive: true });
  writeFileSync(join(recA, "aidlc-state.md"), [
    "- **Active Agent**: amadeus-developer-agent",
    "- **Worktree Path**: /w/a",
    "- **Current Stage**: code-generation",
    "- **Lifecycle Phase**: CONSTRUCTION",
    "- [?] build-and-test — EXECUTE",
  ].join("\n"));
  writeFileSync(join(recA, "audit", "hostx-aaaaaaaaaaaa.md"), "**Timestamp**: 2026-07-05T01:00:00Z");

  const now = new Date("2026-07-05T12:00:00Z");
  const cards = scanIntents(join(tmp, "aidlc/spaces/default"), now);
  ok("dirName を持つ entry がカード化される（2 件）", cards.length === 2, String(cards.length));
  const a = cards.find((c) => c.dirName === "260701-a")!;
  ok("issues が引き継がれる", a.issues.length === 1 && a.issues[0] === 470);
  ok("state から agent を抽出", a.agent === "amadeus-developer-agent");
  ok("awaiting を検知", a.awaiting === true);
  ok("host を shard から抽出", a.host === "hostx");
  ok("syncedAt が now の ISO 形式", a.syncedAt === "2026-07-05T12:00:00.000Z" || a.syncedAt === "2026-07-05T12:00:00Z", a.syncedAt);
  const b = cards.find((c) => c.dirName === "260702-b")!;
  ok("record 欠損 entry は 未確認 で欠損させない", b.agent === "未確認" && b.host === "未確認" && b.worktree === "-");
  const dirsOnly = scanIntents(join(tmp, "aidlc/spaces/default"), now, ["260701-a"]);
  ok("--dirs 部分スキャンは指定 record だけ返す", dirsOnly.length === 1 && dirsOnly[0]!.dirName === "260701-a");
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

// --- board.ts: GraphQL 引数生成境界（ネットワークなし） ---
const mut = buildItemFieldMutation("PID", "IID", [
  { fieldId: "F1", kind: "text", text: "claude" },
  { fieldId: "F2", kind: "single_select", optionId: "OPT" },
]);
ok("mutation が updateProjectV2ItemFieldValue を alias で束ねる", (mut.match(/updateProjectV2ItemFieldValue/g) ?? []).length === 2, mut);
ok("mutation に text 値が入る", mut.includes('"claude"') || mut.includes("claude"));
ok("mutation に option ID が入る", mut.includes("OPT"));

const ensure = buildEnsureStatusOptions(
  [{ id: "o1", name: "Todo", color: "GRAY", description: "" }],
  ["Awaiting Approval", "Ideation", "Inception", "Construction", "Operation", "Done"]
);
ok("既存 option を保持したまま不足 6 option を加える", ensure.length === 7, String(ensure.length));
ok("既存 option の ID を保持する", ensure[0]!.id === "o1");
ok("追加 option は ID を持たない（新規作成扱い）", ensure.slice(1).every((o) => !("id" in o) || o.id === undefined));

const body = buildDraftIssueBody({ ...baseCard, issues: [470, 471], worktree: "/w/x", scope: "feature" });
ok("draft body に Issue リンクが入る", body.includes("#470") && body.includes("#471"));
ok("draft body に scope と worktree が入る", body.includes("feature") && body.includes("/w/x"));

if (failures > 0) {
  console.error(`kanban-sync eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log("kanban-sync eval: ok");
