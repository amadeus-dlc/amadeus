#!/usr/bin/env bun

// engine-gap-trio eval（Issue #478）。
//
// 3 ギャップを隔離 temp workspace の実 CLI 駆動で検証する。LLM を呼ばず、
// 本番 amadeus/ を変更しない。成功時・失敗時ともに temp workspace を片付ける。
//
// gap1 (R101-R103): audit-fork の再入 — worktree 側 shard が main の prefix なら
//   Reentrant fork として成功し、分岐していれば拒否する。
// gap2 (R201-R202): slug の小文字正規化 — 大文字入力（U001-...）が小文字と同じ
//   worktree パスへ解決される（lib の worktreePath チョークポイント）。
// gap3 (R301-R303): validator のマルチ Per unit — 連続する Per unit 行を集合と
//   して解釈し、全 unit の produces を検査する（欠落 unit を fail で検出する）。

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const ENGINE_DIRS = ["tools", "amadeus-common", "sensors", "hooks", "scopes", "agents", "knowledge"];

let failures = 0;
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`ok: ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function makeWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "engine-gap-trio-"));
  for (const dir of ENGINE_DIRS) {
    const src = join(root, ".agents/amadeus", dir);
    const dest = join(workspace, ".agents/amadeus", dir);
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
  }
  mkdirSync(join(workspace, ".claude"), { recursive: true });
  for (const dir of ["tools", "hooks", "sensors", "scopes", "agents", "knowledge"]) {
    symlinkSync(join("..", ".agents/amadeus", dir), join(workspace, ".claude", dir));
  }
  return workspace;
}

function run(cmd: string[], cwd: string) {
  const proc = Bun.spawnSync({
    cmd,
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, CLAUDE_PROJECT_DIR: cwd },
  });
  return {
    exitCode: proc.exitCode ?? -1,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
}

function birthIntent(workspace: string, label: string): string {
  const utility = join(workspace, ".agents/amadeus/tools/amadeus-utility.ts");
  const res = run(
    ["bun", utility, "intent-birth", "--scope", "bugfix", "--arguments", `${label} eval`, "--label", label],
    workspace
  );
  if (res.exitCode !== 0) throw new Error(`intent-birth failed: ${res.stderr}\n${res.stdout}`);
  const intentsRoot = join(workspace, "amadeus/spaces/default/intents");
  const dirName = readdirSync(intentsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)[0];
  if (!dirName) throw new Error(`no record dir created: ${res.stdout}`);
  return dirName;
}

function recordDirPath(workspace: string, dirName: string): string {
  return join(workspace, "amadeus/spaces/default/intents", dirName);
}

function mainShard(workspace: string, dirName: string): { name: string; path: string } {
  const auditDir = join(recordDirPath(workspace, dirName), "audit");
  const name = readdirSync(auditDir).find((f) => f.endsWith(".md"));
  if (!name) throw new Error("no main shard");
  return { name, path: join(auditDir, name) };
}

// --- gap1: audit-fork の再入（prefix 一致で成功、分岐で拒否） ---
{
  const ws = makeWorkspace();
  try {
    const dirName = birthIntent(ws, "gap-one");
    const shard = mainShard(ws, dirName);
    const slug = "gap-one-bolt";
    const relRecord = `amadeus/spaces/default/intents/${dirName}`;
    const wtAudit = join(ws, ".amadeus/worktrees", `bolt-${slug}`, relRecord, "audit");
    mkdirSync(wtAudit, { recursive: true });
    // phase PR で commit 済みの checkout を再現: main shard の prefix を worktree へ置く
    const mainContent = readFileSync(shard.path, "utf-8");
    const prefix = mainContent.slice(0, Math.floor(mainContent.length / 2));
    writeFileSync(join(wtAudit, shard.name), prefix, "utf-8");

    const auditTool = join(ws, ".agents/amadeus/tools/amadeus-audit.ts");
    const fork = run(["bun", auditTool, "audit-fork", "--slug", slug], ws);
    ok("(gap1) prefix 一致の既存 shard へは audit-fork が再入成功する", fork.exitCode === 0, fork.stdout + fork.stderr);
    ok(
      "(gap1) 再入 fork は Reentrant として監査に記録される",
      readFileSync(shard.path, "utf-8").includes("Reentrant"),
    );
    ok(
      "(gap1) 再入後の worktree shard は main の全内容へ置き換わる",
      readFileSync(join(wtAudit, shard.name), "utf-8").startsWith(prefix) &&
        readFileSync(join(wtAudit, shard.name), "utf-8").length > prefix.length
    );

    // 分岐 shard は拒否（内容が main の prefix でない）
    const slug2 = "gap-one-diverged";
    const wtAudit2 = join(ws, ".amadeus/worktrees", `bolt-${slug2}`, relRecord, "audit");
    mkdirSync(wtAudit2, { recursive: true });
    writeFileSync(join(wtAudit2, shard.name), prefix + "\n## Rogue Row\n別作業の痕跡\n", "utf-8");
    const denied = run(["bun", auditTool, "audit-fork", "--slug", slug2], ws);
    ok("(gap1) 分岐した shard へは audit-fork が拒否される", denied.exitCode !== 0, denied.stdout);
    ok(
      "(gap1) 拒否理由が DIVERGED を名指しする",
      (denied.stdout + denied.stderr).includes("DIVERGED"),
      denied.stdout + denied.stderr
    );
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

// --- gap2: slug の小文字正規化（大文字入力が同一 worktree パスへ解決） ---
{
  const ws = makeWorkspace();
  try {
    const dirName = birthIntent(ws, "gap-two");
    const auditTool = join(ws, ".agents/amadeus/tools/amadeus-audit.ts");
    // worktree 不在エラーのパス表示で、lib チョークポイントの正規化を観測する
    const upper = run(["bun", auditTool, "audit-fork", "--slug", "U001-Registry-Field"], ws);
    ok("(gap2) 大文字 slug は worktree 不在段階まで到達する（形式拒否されない）", upper.exitCode !== 0);
    ok(
      "(gap2) 大文字入力が小文字の worktree パスへ正規化される",
      (upper.stdout + upper.stderr).includes("bolt-u001-registry-field"),
      upper.stdout + upper.stderr
    );
    // worktree tool の検証境界も正規化して受理する
    const wtTool = join(ws, ".agents/amadeus/tools/amadeus-worktree.ts");
    const info = run(["bun", wtTool, "info", "--slug", "U001-Registry-Field"], ws);
    ok(
      "(gap2) worktree info が大文字 slug を形式拒否しない",
      !(info.stdout + info.stderr).includes("Invalid --slug"),
      info.stdout + info.stderr
    );
    // 実障害経路（bolt start --worktree）のもう 1 つの独立 validator = state fork。
    // 大文字 slug が形式拒否されず、worktree 不在の実質エラーまで到達すること
    const stTool = join(ws, ".agents/amadeus/tools/amadeus-state.ts");
    const fork = run(["bun", stTool, "fork", "--slug", "U001-Registry-Field"], ws);
    ok(
      "(gap2) state fork が大文字 slug を形式拒否しない（フルチェーン整合）",
      !(fork.stdout + fork.stderr).includes("Invalid --slug"),
      fork.stdout + fork.stderr
    );
    // audit-merge は AUDIT_FORKED の Bolt slug を完全一致で相関するため、
    // 大文字入力でも記録は正準形（小文字）でなければならない
    const relRecord2 = `amadeus/spaces/default/intents/${dirName}`;
    const wtAudit2 = join(ws, ".amadeus/worktrees", "bolt-u002-mixed-case", relRecord2, "audit");
    mkdirSync(wtAudit2, { recursive: true });
    const forked = run(["bun", auditTool, "audit-fork", "--slug", "U002-Mixed-Case"], ws);
    ok("(gap2) 大文字 slug でも audit-fork が worktree を解決して成功する", forked.exitCode === 0, forked.stdout + forked.stderr);
    const mainAudit = readdirSync(join(recordDirPath(ws, dirName), "audit"))
      .map((f) => readFileSync(join(recordDirPath(ws, dirName), "audit", f), "utf-8")).join("\n");
    ok(
      "(gap2) AUDIT_FORKED の Bolt slug は正準形（小文字）で記録される",
      mainAudit.includes("**Bolt slug**: u002-mixed-case") && !mainAudit.includes("**Bolt slug**: U002-Mixed-Case"),
    );
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

// --- gap3: validator のマルチ Per unit（欠落 unit の検出と後方互換） ---
{
  const ws = makeWorkspace();
  try {
    const dirName = birthIntent(ws, "gap-three");
    const rec = recordDirPath(ws, dirName);
    const statePath = join(rec, "amadeus-state.md");
    let state = readFileSync(statePath, "utf-8");
    state = state.replace("Per unit: [TBD]", "Per unit: unit-alpha\nPer unit: unit-beta");
    state = state.replace(/^- \[.\] code-generation — EXECUTE$/m, "- [x] code-generation — EXECUTE");
    writeFileSync(statePath, state, "utf-8");
    const auditTool = join(ws, ".agents/amadeus/tools/amadeus-audit.ts");
    run(["bun", auditTool, "append", "STAGE_COMPLETED", "--field", "Stage=code-generation"], ws);

    // produces は unit-beta（最後の unit）だけに置く → unit-alpha の欠落を検出できるか
    for (const f of ["code-generation-plan", "code-summary"]) {
      const dir = join(rec, "construction", "unit-beta", "code-generation");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${f}.md`), `# ${f}\n\n## eval\n\nfixture\n`, "utf-8");
    }
    const validator = join(root, ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts");
    const v1 = run(["bun", validator, ws, dirName], ws);
    // validator が完走していること（crash なら以降の件数カウントが偽 GREEN になる）
    ok("(gap3) validator が完走して判定を出力する（欠落ケース）", /## 判定/.test(v1.stdout) && v1.exitCode === 1, `exit=${v1.exitCode}`);
    ok(
      "(gap3) 欠落 unit（unit-alpha）の produces 不在を fail として検出する",
      /unit-alpha\/code-generation/.test(v1.stdout),
      v1.stdout.split("\n").filter((l) => l.includes("produces")).join(" | ")
    );

    // unit-alpha にも produces を置けば、この検査は fail しない
    for (const f of ["code-generation-plan", "code-summary"]) {
      const dir = join(rec, "construction", "unit-alpha", "code-generation");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${f}.md`), `# ${f}\n\n## eval\n\nfixture\n`, "utf-8");
    }
    const v2 = run(["bun", validator, ws, dirName], ws);
    // 完走の証拠（判定見出し + 正常系 exit code の範囲）を先に確認してから件数を数える
    ok(
      "(gap3) validator が完走して判定を出力する（充足ケース）",
      /## 判定/.test(v2.stdout) && (v2.exitCode === 0 || v2.exitCode === 1),
      `exit=${v2.exitCode}`
    );
    const producesFails = (v2.stdout.match(/produces 成果物を持つ。根拠/g) ?? []).length;
    ok("(gap3) 全 unit に produces があれば produces 検査は fail しない", producesFails === 0, String(producesFails));
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

if (failures > 0) {
  console.error(`engine-gap-trio eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log("engine-gap-trio eval: ok");
