// u003-kanban-hooks C-5 QueueHook（PostToolUse）: default space の Intent record への
// Write / Edit を検知してローカルキューへ 1 行追記する。ネットワーク・child process なし。
// 契約は construction/u003-kanban-hooks/functional-design/ を正とする。
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// PROJECT_DIR は CLAUDE_PROJECT_DIR を最優先し、無ければ自身のスクリプトパスから
// repo ルートを逆算する（BR-8。process.cwd() は信用しない）。
export function resolveKanbanProjectDir(env: NodeJS.ProcessEnv, scriptUrl: string): string {
  const fromEnv = env.CLAUDE_PROJECT_DIR;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  // <root>/dev-scripts/kanban/hooks/kanban-queue.ts → 3 階層上が root
  return join(dirname(fileURLToPath(scriptUrl)), "..", "..", "..");
}

// 書き込み path からキューへ積むエントリを決める純関数。
//   record 配下 → dirName / intents.json → "*" / それ以外 → null（FR-5.1、D-AD11）
export function queueEntryFor(filePath: string, projectDir: string): string | null {
  const norm = filePath.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  const root = projectDir.replace(/\\/g, "/").replace(/\/{2,}/g, "/").replace(/\/$/, "");
  const prefix = `${root}/aidlc/spaces/default/intents/`;
  if (!norm.startsWith(prefix)) return null;
  const rest = norm.slice(prefix.length);
  if (rest === "intents.json") return "*";
  const dirName = rest.split("/")[0] ?? "";
  if (dirName === "" || !rest.includes("/")) return null; // 直下の単独ファイルは対象外
  return dirName;
}

export function stateDir(projectDir: string): string {
  return join(projectDir, ".claude", "kanban-sync");
}

async function main(): Promise<void> {
  if (process.stdin.isTTY) return; // 手動起動でハングしない（TTY ガード）
  let parsed: { tool_name?: string; tool_input?: { file_path?: string } };
  try {
    parsed = JSON.parse(await Bun.stdin.text()) as typeof parsed;
  } catch {
    return; // parse 失敗も exit 0
  }
  const tool = parsed.tool_name ?? "";
  if (tool !== "Write" && tool !== "Edit") return;
  const filePath = parsed.tool_input?.file_path ?? "";
  if (filePath === "") return;
  const projectDir = resolveKanbanProjectDir(process.env, import.meta.url);
  const entry = queueEntryFor(filePath, projectDir);
  if (entry === null) return;
  const dir = stateDir(projectDir);
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, "queue"), `${entry}\n`, "utf-8");
}

if (import.meta.main) {
  main()
    .catch(() => undefined) // hook は失敗を伝播させない（BR-4）
    .finally(() => process.exit(0));
}
