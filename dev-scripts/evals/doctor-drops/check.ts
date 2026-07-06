#!/usr/bin/env bun

// doctor-drops eval（Issue #432）。
//
// doctor が .amadeus-hooks-health/*.drops を読んで hook の静かな失敗を表面化する
// ことを、隔離 temp workspace で実 CLI を駆動して検証する。LLM を呼ばず、
// 本番 amadeus/ を変更しない。成功時・失敗時ともに temp workspace を片付ける。
//
// (a) R004: .drops が無い場合、doctor の出力に drops 行は現れない（後方互換）。
// (b) R001: .drops がある hook は「hook 名 + 件数 + 最新の時刻と理由」の fail 行で
//     報告され、doctor は非 0 exit になる。
// (c) R002: 解釈できない行は件数にだけ数え、理由は最新の解釈可能行を使う。
// (d) R003: fix 文言がクリア手段（.drops の削除）を案内する。

import {
  cpSync,
  mkdirSync,
  mkdtempSync,
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
  const workspace = mkdtempSync(join(tmpdir(), "doctor-drops-"));
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
  // doctor の workspace-shell 検査対象（memory）と settings.json を用意し、
  // drops 以外の検査が pass する素の状態を作る（exit code の検査を意味あるものにする）
  mkdirSync(join(workspace, "amadeus/spaces/default/memory"), { recursive: true });
  cpSync(join(root, ".claude/settings.json"), join(workspace, ".claude/settings.json"));
  return workspace;
}

function runDoctor(cwd: string) {
  const proc = Bun.spawnSync({
    cmd: ["bun", join(cwd, ".agents/amadeus/tools/amadeus-utility.ts"), "doctor"],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, CLAUDE_PROJECT_DIR: cwd },
  });
  return {
    exitCode: proc.exitCode ?? -1,
    out: new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr),
  };
}

// --- (a) drops なし: 出力に drops 行が現れない（後方互換） ---
{
  const ws = makeWorkspace();
  try {
    const health = join(ws, "amadeus/spaces/default/intents/.amadeus-hooks-health");
    mkdirSync(health, { recursive: true });
    writeFileSync(join(health, "amadeus-stop.last"), "2026-07-05T09:00:00Z\n", "utf-8");
    const r = runDoctor(ws);
    ok("(a) drops なしの doctor 出力に drop 行は現れない", !/drop/i.test(r.out), r.out.slice(0, 300));
    ok("(a) drops なしの doctor は exit 0（現状と同じ）", r.exitCode === 0, `exit=${r.exitCode} ${r.out.slice(0, 300)}`);
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

// --- (b)(c)(d) drops あり: fail 行 + 非 0 exit + 壊れ行の扱い + クリア案内 ---
{
  const ws = makeWorkspace();
  try {
    const health = join(ws, "amadeus/spaces/default/intents/.amadeus-hooks-health");
    mkdirSync(health, { recursive: true });
    writeFileSync(join(health, "amadeus-stop.last"), "2026-07-05T09:00:00Z\n", "utf-8");
    // 3 行: 正常 2 行 + 解釈不能 1 行（最新の解釈可能行 = sensor timeout の行）
    writeFileSync(
      join(health, "amadeus-mint-presence.drops"),
      [
        "2026-07-05T08:00:00Z\taudit append failed",
        "not-a-valid-line",
        "2026-07-05T08:30:00Z\tsensor timeout",
      ].join("\n") + "\n",
      "utf-8"
    );
    const r = runDoctor(ws);
    ok("(b) drops 行に hook 名が現れる", /drop[^\n]*amadeus-mint-presence|amadeus-mint-presence[^\n]*drop/i.test(r.out), r.out.slice(0, 400));
    ok("(b) hook 名と件数（3）が同じ行に現れる", /amadeus-mint-presence[^\n]*3/.test(r.out), r.out.slice(0, 400));
    ok("(b) 最新の理由と時刻が出力に現れる", r.out.includes("sensor timeout") && r.out.includes("2026-07-05T08:30:00Z"));
    ok("(b) doctor が非 0 exit になる", r.exitCode !== 0, String(r.exitCode));
    ok("(d) fix 文言が .drops の削除によるクリアを案内する", /\.drops/.test(r.out) && /(削除|delete|remove)/i.test(r.out), r.out.slice(0, 500));
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

if (failures > 0) {
  console.error(`doctor-drops eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log("doctor-drops eval: ok");
