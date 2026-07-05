#!/usr/bin/env bun

// engine-error-logged eval（Issue #431）。
//
// amadeus-orchestrate.ts の error directive / 未捕捉例外が ERROR_LOGGED として
// audit へ best-effort 記録されることを、隔離 temp workspace で実 CLI を駆動して
// 検証する。LLM を呼ばず、本番 aidlc/ を変更しない。片付けは成功・失敗共通。
//
// (a) R001: workflow がある状態で next が error directive を返すと、stdout の
//     directive 契約は不変のまま、audit に ERROR_LOGGED が追記される。
// (b) R002: 未捕捉例外の非 0 終了前に ERROR_LOGGED が追記される。
// (c) R003/R004: state 不在の workspace では記録されず、directive 契約と
//     exit code は従来どおり。

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
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
  const ws = mkdtempSync(join(tmpdir(), "engerr-"));
  for (const dir of ENGINE_DIRS) {
    const src = join(root, ".agents/amadeus", dir);
    const dest = join(ws, ".agents/amadeus", dir);
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
  }
  mkdirSync(join(ws, ".claude"), { recursive: true });
  for (const dir of ["tools", "hooks", "sensors", "scopes", "agents", "knowledge"]) {
    symlinkSync(join("..", ".agents/amadeus", dir), join(ws, ".claude", dir));
  }
  return ws;
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

function birth(ws: string): string {
  const r = run(
    ["bun", join(ws, ".agents/amadeus/tools/amadeus-utility.ts"), "intent-birth", "--scope", "bugfix", "--arguments", "err eval", "--label", "err-eval"],
    ws
  );
  if (r.exitCode !== 0) throw new Error(`birth failed: ${r.stderr}`);
  const intentsRoot = join(ws, "aidlc/spaces/default/intents");
  return readdirSync(intentsRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)[0]!;
}

function auditText(ws: string, dirName: string): string {
  const dir = join(ws, "aidlc/spaces/default/intents", dirName, "audit");
  if (!existsSync(dir)) return "";
  return readdirSync(dir).map((f) => readFileSync(join(dir, f), "utf-8")).join("\n");
}

const orchestrate = (ws: string) => join(ws, ".agents/amadeus/tools/amadeus-orchestrate.ts");

// --- (a) error directive → ERROR_LOGGED ---
{
  const ws = makeWorkspace();
  try {
    const dirName = birth(ws);
    const r = run(["bun", orchestrate(ws), "next", "--scope", "no-such-scope"], ws);
    const d = JSON.parse(r.stdout) as { kind: string; message?: string };
    ok("(a) stdout は完全な error directive のみ（契約不変）", d.kind === "error", r.stdout.slice(0, 150));
    const audit = auditText(ws, dirName);
    ok(
      "(a) ERROR_LOGGED が audit に追記される",
      /ERROR_LOGGED[\s\S]{0,300}amadeus-orchestrate/.test(audit),
      audit.includes("ERROR_LOGGED") ? "tool 名不一致" : "ERROR_LOGGED なし"
    );
    ok(
      "(a) directive の message が Error フィールドに含まれる",
      audit.includes("no-such-scope"),
    );
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

// --- (b) 未捕捉例外 → ERROR_LOGGED + 非 0 exit ---
{
  const ws = makeWorkspace();
  try {
    const dirName = birth(ws);
    // state file をディレクトリに差し替えて readStateFile を throw させる
    const statePath = join(ws, "aidlc/spaces/default/intents", dirName, "aidlc-state.md");
    renameSync(statePath, statePath + ".bak");
    mkdirSync(statePath);
    const r = run(["bun", orchestrate(ws), "next"], ws);
    ok("(b) 未捕捉例外は非 0 exit（契約不変）", r.exitCode !== 0, String(r.exitCode));
    ok("(b) stderr にエラーが出る（契約不変）", /amadeus-orchestrate/.test(r.stderr), r.stderr.slice(0, 150));
    const audit = auditText(ws, dirName);
    ok(
      "(b) 例外でも ERROR_LOGGED が audit に追記される",
      /ERROR_LOGGED[\s\S]{0,300}amadeus-orchestrate/.test(audit),
      audit.includes("ERROR_LOGGED") ? "tool 名不一致" : "ERROR_LOGGED なし"
    );
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

// --- (c) state 不在 → 記録なし、契約不変 ---
{
  const ws = makeWorkspace();
  try {
    const r = run(["bun", orchestrate(ws), "report", "--stage", "x", "--result", "approved"], ws);
    const d = JSON.parse(r.stdout || "{}") as { kind?: string };
    ok("(c) state 不在でも directive 契約は従来どおり", d.kind === "error" || r.exitCode !== 0, r.stdout.slice(0, 150) + r.stderr.slice(0, 100));
    const intentsRoot = join(ws, "aidlc/spaces/default/intents");
    const anyAudit = existsSync(intentsRoot)
      ? readdirSync(intentsRoot, { withFileTypes: true }).some((e) => e.isDirectory() && existsSync(join(intentsRoot, e.name, "audit")))
      : false;
    ok("(c) state 不在では audit を作らない（emitError と同契約）", !anyAudit);
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

if (failures > 0) {
  console.error(`engine-error-logged eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log("engine-error-logged eval: ok");
