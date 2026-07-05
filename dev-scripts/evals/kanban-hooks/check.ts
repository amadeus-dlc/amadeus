// u003-kanban-hooks: QueueHook / FlushHook の純関数部と搬送（rename 専有・孤立回収）の
// 決定論的検証。ネットワークへ接続しない。
import { mkdtempSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { queueEntryFor } from "../../kanban/hooks/kanban-queue";
import {
  recoverOrphanProcessing,
  restoreProcessingToQueue,
  shouldSuppress,
  splitQueueLines,
} from "../../kanban/hooks/kanban-flush";

let failures = 0;
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`ok: ${name}`);
  } else {
    failures++;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const pd = "/repo";

// --- queueEntryFor: default space の record への書き込みだけを拾う（FR-5.1） ---
ok(
  "record 配下の書き込みは dirName を積む",
  queueEntryFor(`${pd}/aidlc/spaces/default/intents/260705-github-kanban-sync/aidlc-state.md`, pd) ===
    "260705-github-kanban-sync"
);
ok(
  "intents.json 直接更新は * を積む",
  queueEntryFor(`${pd}/aidlc/spaces/default/intents/intents.json`, pd) === "*"
);
ok(
  "default space 以外は積まない",
  queueEntryFor(`${pd}/aidlc/spaces/other/intents/x/aidlc-state.md`, pd) === null
);
ok(
  "intents 配下以外は積まない",
  queueEntryFor(`${pd}/aidlc/spaces/default/memory/team.md`, pd) === null
);
ok("repo 外パスは積まない", queueEntryFor(`/elsewhere/aidlc/spaces/default/intents/x/a.md`, pd) === null);
ok(
  "多重スラッシュを正規化して判定する",
  queueEntryFor(`${pd}//aidlc/spaces/default/intents/260701-a//aidlc-state.md`, `${pd}/`) === "260701-a"
);
ok(
  "active-intent などの直下ファイルは * を積まない",
  queueEntryFor(`${pd}/aidlc/spaces/default/intents/active-intent`, pd) === null
);

// --- shouldSuppress: 2 分抑制（FR-5.2、ハードコード定数） ---
const now = new Date("2026-07-05T12:10:00Z");
ok("直近 2 分以内の成功は抑制する", shouldSuppress("2026-07-05T12:09:00Z", now) === true);
ok("2 分より古い成功は抑制しない", shouldSuppress("2026-07-05T12:07:00Z", now) === false);
ok("記録なしは抑制しない", shouldSuppress(null, now) === false);
ok("壊れた記録は抑制しない", shouldSuppress("not-a-date", now) === false);

// --- splitQueueLines: uniq + * 分離（D-AD11） ---
const split = splitQueueLines(["a", "b", "a", "*", "", "b"]);
ok("dirName は uniq される", split.dirs.length === 2 && split.dirs.includes("a") && split.dirs.includes("b"));
ok("* は分離される（自動 --all にしない）", split.hasStar === true);

// --- 搬送: rename 専有・孤立回収・失敗時の戻し（BR-9、flow step 0.5） ---
const tmp = mkdtempSync(join(tmpdir(), "kanban-hooks-"));
try {
  const dir = join(tmp, ".claude", "kanban-sync");
  mkdirSync(dir, { recursive: true });
  const queue = join(dir, "queue");
  const processing = join(dir, "queue.processing");

  // 孤立回収: queue 無し + processing あり → queue へ戻して削除
  writeFileSync(processing, "x\ny\n");
  recoverOrphanProcessing(dir);
  ok("孤立 processing が queue へ回収される", existsSync(queue) && !existsSync(processing));
  ok("回収内容が保持される", readFileSync(queue, "utf-8").includes("x"));

  // 失敗時の戻し: processing の内容を queue の先頭へ行単位で戻す
  writeFileSync(queue, "new-entry\n");
  writeFileSync(processing, "old-a\nold-b\n");
  restoreProcessingToQueue(dir);
  const q = readFileSync(queue, "utf-8");
  ok("失敗時に processing が queue へ戻る", q.includes("old-a") && q.includes("old-b") && q.includes("new-entry"));
  ok("processing は消える", !existsSync(processing));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`kanban-hooks eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log("kanban-hooks eval: ok");
