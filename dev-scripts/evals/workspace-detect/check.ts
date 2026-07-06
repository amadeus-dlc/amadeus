#!/usr/bin/env bun

// workspace-detect eval（Issue #459）。
//
// workspace-detection の brownfield / 言語判定を、隔離 temp workspace で実 CLI
//（intent-birth の出力）を駆動して検証する。LLM を呼ばず、本番 amadeus/ を変更しない。
// 成功時・失敗時ともに temp workspace を片付ける。
//
// (a) R001/R002: 定型外配置（dev-scripts/ 配下の .ts）のコードベースが
//     Brownfield / TypeScript と判定される（修正前は Greenfield / Unknown = RED）。
// (b) R003: 空ワークスペースは Greenfield / Unknown のまま。
// (c) R004: 定型 source dir（src/）配置の判定は従来どおり Brownfield / TypeScript。
// (d) Q2: ドット始まりディレクトリだけにコードがある場合は brownfield に倒さない。

import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
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
  const ws = mkdtempSync(join(tmpdir(), "wsdetect-"));
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

function birth(ws: string): string {
  const proc = Bun.spawnSync({
    cmd: [
      "bun",
      join(ws, ".agents/amadeus/tools/amadeus-utility.ts"),
      "intent-birth",
      "--scope",
      "bugfix",
      "--arguments",
      "detect eval",
      "--label",
      "detect-eval",
    ],
    cwd: ws,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, CLAUDE_PROJECT_DIR: ws },
  });
  if ((proc.exitCode ?? -1) !== 0) {
    throw new Error(`intent-birth failed: ${new TextDecoder().decode(proc.stderr)}`);
  }
  return new TextDecoder().decode(proc.stdout);
}

// --- (a) 定型外配置: dev-scripts/ の .ts だけ ---
{
  const ws = makeWorkspace();
  try {
    mkdirSync(join(ws, "dev-scripts", "evals"), { recursive: true });
    writeFileSync(join(ws, "dev-scripts", "tool.ts"), "export const x = 1;\n", "utf-8");
    writeFileSync(join(ws, "dev-scripts", "evals", "check.ts"), "export const y = 2;\n", "utf-8");
    // Issue AC1 の再現構成（package.json + TypeScript ソース）。Build System 検出は
    // 本 Issue の対象外（Issue の現状節で検出済みと明記）のため devDeps のみの最小形
    writeFileSync(join(ws, "package.json"), JSON.stringify({ name: "eval", devDependencies: { typescript: "*" } }), "utf-8");
    const out = birth(ws);
    ok("(a) 定型外配置のコードベースが Brownfield と判定される", /Brownfield/.test(out), out.slice(0, 200));
    ok("(a) Languages に TypeScript が検出される", /TypeScript/.test(out), out.slice(0, 200));
    // Issue AC2（主症状の解消）: bugfix scope で reverse-engineering が SKIP へ
    // 降格されず、最初の post-init stage になる
    ok(
      "(a) reverse-engineering が最初の post-init stage になる（SKIP 降格なし）",
      /First post-init stage: reverse-engineering/.test(out),
      out.slice(0, 250)
    );
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

// --- (b) 空ワークスペース ---
{
  const ws = makeWorkspace();
  try {
    const out = birth(ws);
    ok("(b) 空ワークスペースは Greenfield のまま", /Greenfield/.test(out), out.slice(0, 200));
    ok("(b) Languages は Unknown のまま", /Languages: Unknown/.test(out), out.slice(0, 200));
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

// --- (c) 定型配置: src/ ---
{
  const ws = makeWorkspace();
  try {
    mkdirSync(join(ws, "src"), { recursive: true });
    writeFileSync(join(ws, "src", "main.ts"), "export const z = 3;\n", "utf-8");
    const out = birth(ws);
    ok("(c) src/ 配置は従来どおり Brownfield / TypeScript", /Brownfield/.test(out) && /TypeScript/.test(out), out.slice(0, 200));
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

// --- (d) ドット dir のみにコード ---
{
  const ws = makeWorkspace();
  try {
    mkdirSync(join(ws, ".mytools"), { recursive: true });
    writeFileSync(join(ws, ".mytools", "hidden.ts"), "export const h = 4;\n", "utf-8");
    const out = birth(ws);
    ok("(d) ドット dir だけのコードでは brownfield に倒さない", /Greenfield/.test(out), out.slice(0, 200));
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

if (failures > 0) {
  console.error(`workspace-detect eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log("workspace-detect eval: ok");
