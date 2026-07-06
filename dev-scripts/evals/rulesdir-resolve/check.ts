#!/usr/bin/env bun

// rulesdir-resolve eval（Issue #491）。
//
// amadeus-graph.ts compile の rules 解決を、隔離 temp workspace で実体パスの
// 実 CLI を駆動して検証する。LLM を呼ばず、本番 aidlc/ を変更しない。
// 片付けは成功・失敗共通。
//
// (a) R101/R102: 実体パス（.agents/amadeus/tools/amadeus-graph.ts）からの compile で
//     rules_in_context に org/team/project が解決される（修正前は無音で空 = RED）。
// (b) R103: memory ディレクトリが実在するのに rule 候補 0 件なら compile が
//     エラー終了し、stage-graph.json を書かない（修正前は空配列で成功 = RED）。
// (c) R103 互換: memory ディレクトリ不在なら従来どおり成功し rules は []。

import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
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

function makeWorkspace(withMemory: "rules" | "empty" | "none"): string {
  const ws = mkdtempSync(join(tmpdir(), "rulesdir-"));
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
  if (withMemory !== "none") {
    const mem = join(ws, "amadeus/spaces/default/memory");
    mkdirSync(mem, { recursive: true });
    if (withMemory === "rules") {
      writeFileSync(join(mem, "org.md"), "# 組織既定\n\n## 方針\n\n- eval 用の rule である。\n", "utf-8");
      writeFileSync(join(mem, "team.md"), "# チーム\n\n## 方針\n\n- eval 用の rule である。\n", "utf-8");
    }
  }
  return ws;
}

function compile(ws: string) {
  const proc = Bun.spawnSync({
    // 実体パス起動（symlink 経由ではなく）— Issue の再現条件そのもの
    cmd: ["bun", join(ws, ".agents/amadeus/tools/amadeus-graph.ts"), "compile"],
    cwd: ws,
    stdout: "pipe",
    stderr: "pipe",
    env: (() => {
      const e = { ...process.env, CLAUDE_PROJECT_DIR: ws };
      delete (e as Record<string, string | undefined>).AIDLC_RULES_DIR;
      return e;
    })(),
  });
  return {
    exitCode: proc.exitCode ?? -1,
    out: new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr),
  };
}

function graphRules(ws: string): number {
  const p = join(ws, ".agents/amadeus/tools/data/stage-graph.json");
  const s = readFileSync(p, "utf-8");
  return (s.match(/amadeus\/spaces\/default\/memory\/(org|team)\.md/g) ?? []).length;
}

// --- (a) rules あり: 実体パス compile で解決される ---
{
  const ws = makeWorkspace("rules");
  try {
    const r = compile(ws);
    ok("(a) compile が成功する", r.exitCode === 0, r.out.slice(0, 200));
    ok("(a) rules_in_context に org/team が解決される", graphRules(ws) > 0, `refs=${graphRules(ws)}`);
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

// --- (b) memory 実在 + rule 0 件: fail-loud ---
{
  const ws = makeWorkspace("empty");
  try {
    const before = readFileSync(join(ws, ".agents/amadeus/tools/data/stage-graph.json"), "utf-8");
    const r = compile(ws);
    ok("(b) rule 0 件（memory 実在）の compile はエラー終了する", r.exitCode !== 0, `exit=${r.exitCode} ${r.out.slice(0, 150)}`);
    const after = readFileSync(join(ws, ".agents/amadeus/tools/data/stage-graph.json"), "utf-8");
    ok("(b) stage-graph.json は書き換えられない", before === after);
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

// --- (c) memory 不在: 従来どおり成功 ---
{
  const ws = makeWorkspace("none");
  try {
    const r = compile(ws);
    ok("(c) memory 不在では従来どおり成功する", r.exitCode === 0, r.out.slice(0, 200));
    ok("(c) rules は空のまま（互換）", graphRules(ws) === 0, `refs=${graphRules(ws)}`);
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

if (failures > 0) {
  console.error(`rulesdir-resolve eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log("rulesdir-resolve eval: ok");
