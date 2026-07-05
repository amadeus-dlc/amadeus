// u003-kanban-hooks C-6 FlushHook（Stop / SessionEnd）: キューに載った record を
// kanban-sync.ts --dirs で部分 sync する。`*`（registry 変更）は自動実行せず drop 記録に
// 落とす（D-AD11）。契約は construction/u003-kanban-hooks/functional-design/ を正とする。
import {
  appendFileSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { resolveKanbanProjectDir, stateDir } from "./kanban-queue";

const SUPPRESS_MS = 2 * 60 * 1000; // FR-5.2: ハードコード定数（設定化しない）
const SYNC_TIMEOUT_MS = 60_000; // BR-10: hook がセッション終了を止めない上限

// 直近 2 分以内に成功した sync があれば抑制する（同一セッション連続起動の抑止）。
export function shouldSuppress(lastSuccessIso: string | null, now: Date): boolean {
  if (!lastSuccessIso) return false;
  const t = Date.parse(lastSuccessIso);
  if (Number.isNaN(t)) return false;
  return now.getTime() - t < SUPPRESS_MS;
}

// queue の行を uniq した dirName 群と `*` の有無に分離する。
export function splitQueueLines(lines: string[]): { dirs: string[]; hasStar: boolean } {
  const dirs = new Set<string>();
  let hasStar = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") continue;
    if (line === "*") {
      hasStar = true;
    } else {
      dirs.add(line);
    }
  }
  return { dirs: [...dirs], hasStar };
}

// flow step 0.5: 前回プロセスの強制終了で残った queue.processing を queue へ
// 行単位 append で回収してから削除する（永久孤立を防ぐ）。
export function recoverOrphanProcessing(dir: string): void {
  const processing = join(dir, "queue.processing");
  if (!existsSync(processing)) return;
  const content = readFileSync(processing, "utf-8");
  if (content.length > 0) appendFileSync(join(dir, "queue"), content, "utf-8");
  rmSync(processing);
}

// 失敗時: processing の内容を queue へ行単位 append で戻して削除する（BR-9）。
export function restoreProcessingToQueue(dir: string): void {
  recoverOrphanProcessing(dir);
}

function drop(dir: string, reason: string): void {
  appendFileSync(join(dir, "drops.log"), `${new Date().toISOString()}\t${reason}\n`, "utf-8");
}

function runFlush(projectDir: string): void {
  const dir = stateDir(projectDir);
  recoverOrphanProcessing(dir);
  const queue = join(dir, "queue");
  if (!existsSync(queue) || readFileSync(queue, "utf-8").trim() === "") return;
  const lastPath = join(dir, "last-success");
  const last = existsSync(lastPath) ? readFileSync(lastPath, "utf-8").trim() : null;
  if (shouldSuppress(last, new Date())) return;

  const processing = join(dir, "queue.processing");
  renameSync(queue, processing); // rename 専有（BR-9）。以降の追記は新しい queue へ入る
  const { dirs, hasStar } = splitQueueLines(readFileSync(processing, "utf-8").split("\n"));
  if (hasStar) {
    drop(dir, "registry 変更あり、メインリポジトリでの手動 --all（npm run kanban:sync）が必要");
  }
  if (dirs.length === 0) {
    rmSync(processing); // `*` だけだった場合は drop 記録のみで消化
    return;
  }
  const r = spawnSync(
    "bun",
    [join(projectDir, "dev-scripts", "kanban-sync.ts"), "--dirs", dirs.join(",")],
    { cwd: projectDir, encoding: "utf-8", timeout: SYNC_TIMEOUT_MS }
  );
  if (r.status === 0) {
    rmSync(processing);
    writeFileSync(lastPath, `${new Date().toISOString()}\n`, "utf-8");
  } else {
    const reason = (r.stderr ?? r.error?.message ?? "unknown").split("\n")[0] ?? "unknown";
    drop(dir, `flush 失敗（次回再試行）: ${reason}`);
    restoreProcessingToQueue(dir);
  }
}

if (import.meta.main) {
  try {
    // Stop / SessionEnd では stdin の内容を使わない（TTY でも安全）
    runFlush(resolveKanbanProjectDir(process.env, import.meta.url));
  } catch {
    // hook は失敗を伝播させない（BR-4）。drop 記録は runFlush 内で実施済み
  }
  process.exit(0);
}
