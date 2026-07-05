// u002-kanban-sync-cli C-4: ローカル成果物（正）を GitHub Projects v2 の board（鏡）へ
// 冪等反映する CLI。設計は construction/u002-kanban-sync-cli/ を正とする。
//
//   bun dev-scripts/kanban-sync.ts --all             # 全 Intent（メインリポジトリ限定）
//   bun dev-scripts/kanban-sync.ts --dirs <a,b,...>  # 指定 record だけ（flush 用）
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  COLUMNS,
  columnOf,
  scanIntents,
} from "./kanban/scan";
import {
  assertProjectScope,
  ensureFields,
  listItems,
  resolveProject,
  upsertItem,
} from "./kanban/board";

// 暫定機構の固定値（設定化しない。D-AD8）
const ORG = "amadeus-dlc";
const PROJECT_TITLE = "Amadeus Intents";

// D-AD11: --all は worktree からの呼び出しを拒否する（他 Intent の古い checkout で
// 全カードを上書きしない）。git-dir が /worktrees/ を含むなら linked worktree。
function assertMainRepoCheckout(): void {
  const r = spawnSync("git", ["rev-parse", "--git-dir"], { encoding: "utf-8" });
  const gitDir = (r.stdout ?? "").trim().replace(/\\/g, "/");
  if (r.status !== 0) throw new Error("git リポジトリ内で実行する必要がある");
  if (gitDir.includes("/worktrees/")) {
    throw new Error(
      "--all は worktree から実行できない。メインリポジトリのチェックアウトで実行する（D-AD11）"
    );
  }
}

function parseArgs(argv: string[]): { all: boolean; dirs: string[] | null } {
  const all = argv.includes("--all");
  const dirsIdx = argv.indexOf("--dirs");
  const parsed =
    dirsIdx >= 0 && argv[dirsIdx + 1]
      ? argv[dirsIdx + 1]!.split(",").map((s) => s.trim()).filter(Boolean)
      : null;
  // `--dirs ,` のような空指定は usage エラーへ倒す（GitHub アクセス前に止める）
  const dirs = parsed !== null && parsed.length > 0 ? parsed : null;
  return { all, dirs };
}

async function main(): Promise<number> {
  const { all, dirs } = parseArgs(process.argv.slice(2));
  if (!all && !dirs) {
    console.error("usage: bun dev-scripts/kanban-sync.ts --all | --dirs <dirName,...>");
    return 1;
  }
  if (all && dirs) {
    console.error("--all と --dirs は同時に指定できない");
    return 1;
  }
  if (all) assertMainRepoCheckout();

  assertProjectScope();
  const project = resolveProject(ORG, PROJECT_TITLE);
  const fieldMap = ensureFields(project, COLUMNS);

  const spaceDir = join(process.cwd(), "aidlc", "spaces", "default");
  const cards = scanIntents(spaceDir, new Date(), dirs ?? undefined);
  if (cards.length === 0) {
    console.error(dirs ? `対象 record が registry に無い: ${dirs.join(", ")}` : "registry に Intent が無い");
    return 1;
  }

  const items = listItems(project.id);
  for (const card of cards) {
    upsertItem(project, fieldMap, items, card, columnOf(card, card.phase));
  }
  console.log(
    JSON.stringify({ synced: cards.length, project: project.number, dirs: dirs ?? "all" })
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e: unknown) => {
    console.error(`kanban-sync: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
