#!/usr/bin/env bun

// persist-cid-metamain eval（Issue #504、#507）。
//
// B001 (#504): amadeus-learnings.ts persist の cid marker 衝突と無言 no-op の
// 回帰検査。実 CLI（amadeus-utility.ts intent-birth、amadeus-learnings.ts
// persist）を隔離 temp workspace で駆動する。LLM を呼ばず、本番 aidlc/ を
// 変更しない。
// - FR-1.1: 異なる Intent の同名 candidate_id (c1) が無言 no-op にならず、
//   両方のテキストが project.md に追記される。
// - FR-1.2/1.3: 旧形式 marker（`cid:<stage>:<cN>`）は照合に使われず改稿も
//   されない。共存時は新形式 marker で追記され、appended 側でカウントされる。
// - FR-1.4/1.5: 同一 selections の再 persist は冪等（appended=0、
//   already_present=1）。project.md は変化しない。
//
// B002 (#507): エンジン tools 5 ファイルの import.meta.main ガード検査。
// - FR-2.2: 5 ファイルとも import しても副作用（main 実行、exit）なしに
//   ロードできる。
// - FR-2.3: CLI としての既存挙動（引数なし実行の usage エラーと exit code）
//   は完全同一を維持する（回帰安全網。修正前後どちらでも成立する）。
// - FR-2.5: 全 tools 走査で無条件 main() 呼び出しの新規混入が 0 件（回帰検査）。

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const ENGINE_DIRS = ["tools", "amadeus-common", "sensors", "scopes", "agents", "knowledge"];

let failures = 0;
function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`ok: ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function run(cmd: string[], cwd: string) {
  const proc = Bun.spawnSync({ cmd, cwd, stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: proc.exitCode ?? -1,
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
  };
}

// エンジンの実ディレクトリ一式を dest 配下の .agents/amadeus/ へコピーする
// （engine-e2e/check.ts、docs-codekb-guards/check.ts と同じ最小コピー方針）。
function copyEngine(dest: string): void {
  for (const dir of ENGINE_DIRS) {
    const src = join(root, ".agents/amadeus", dir);
    const out = join(dest, ".agents/amadeus", dir);
    mkdirSync(out, { recursive: true });
    cpSync(src, out, { recursive: true });
  }
}

function listIntentDirNames(ws: string): string[] {
  const intentsRoot = join(ws, "amadeus/spaces/default/intents");
  if (!existsSync(intentsRoot)) return [];
  return readdirSync(intentsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

const base = mkdtempSync(join(tmpdir(), "persist-cid-metamain-"));

try {
  // ================= B001 (#504) =================

  const ws = join(base, "b001-ws");
  mkdirSync(ws, { recursive: true });
  copyEngine(ws);

  const utility = join(ws, ".agents/amadeus/tools/amadeus-utility.ts");
  const learnings = join(ws, ".agents/amadeus/tools/amadeus-learnings.ts");
  const projectMdPath = join(ws, "amadeus/spaces/default/memory/project.md");

  // bugfix scope: intent-birth 直後の Current Stage は requirements-analysis
  // （ideation 全 stage + units-generation 等を SKIP。docs-codekb-guards の
  // b002 setup コメントで確認済み）。intent-birth は active intent cursor を
  // 新しく生まれた record へ切り替えるため、2 回目の birth だけで「別 Intent
  // へ切り替わった状態」を作れる。
  function birth(label: string): string {
    const before = new Set(listIntentDirNames(ws));
    const res = run(
      ["bun", utility, "intent-birth", "--scope", "bugfix", "--arguments", `${label} eval`, "--label", label, "--project-dir", ws],
      ws
    );
    ok(`B001 setup: intent-birth(${label}) が成功する`, res.exitCode === 0, res.stdout + res.stderr);
    const created = listIntentDirNames(ws).find((d) => !before.has(d));
    if (!created) throw new Error(`intent-birth(${label}) failed to create a new record dir`);
    return created;
  }

  function persist(selectionsPath: string): { exitCode: number; stdout: string; stderr: string; json: Record<string, unknown> | undefined } {
    const res = run(
      ["bun", learnings, "persist", "--slug", "requirements-analysis", "--selections-json", selectionsPath, "--project-dir", ws],
      ws
    );
    let json: Record<string, unknown> | undefined;
    try {
      json = JSON.parse(res.stdout.trim());
    } catch {
      json = undefined;
    }
    return { ...res, json };
  }

  // --- setup: intent A の初回 persist ---
  const dirNameA = birth("b001-a");
  const selAPath = join(base, "selections-a.json");
  writeFileSync(
    selAPath,
    JSON.stringify({
      stage_slug: "requirements-analysis",
      selections: [{ candidate_id: "c1", type: "learning", scope: "project", heading: "Testing Posture", text: "TextA-unique-marker" }],
    })
  );
  const persistA1 = persist(selAPath);
  ok("B001 setup: intent A の初回 persist が成功する", persistA1.exitCode === 0, persistA1.stdout + persistA1.stderr);

  let projectMd = readFileSync(projectMdPath, "utf-8");
  ok("B001 setup: intent A のテキストが project.md に書かれる", projectMd.includes("TextA-unique-marker"), projectMd);
  const markerA = `cid:${dirNameA}:requirements-analysis:c1`;
  ok("B001 setup: intent A の新形式 marker（dirName 込み）が書かれる", projectMd.includes(markerA), projectMd);

  // --- FR-1.1: 別 Intent の同名 candidate_id が無言 no-op にならず追記される ---
  const dirNameB = birth("b001-b");
  const selBPath = join(base, "selections-b.json");
  writeFileSync(
    selBPath,
    JSON.stringify({
      stage_slug: "requirements-analysis",
      selections: [{ candidate_id: "c1", type: "learning", scope: "project", heading: "Testing Posture", text: "TextB-unique-marker" }],
    })
  );
  const persistB1 = persist(selBPath);
  ok("FR-1.1: intent B の persist が成功する", persistB1.exitCode === 0, persistB1.stdout + persistB1.stderr);

  projectMd = readFileSync(projectMdPath, "utf-8");
  ok(
    "FR-1.1: 異なる Intent の同名 candidate_id (c1) が無言 no-op にならず両方追記される",
    projectMd.includes("TextA-unique-marker") && projectMd.includes("TextB-unique-marker"),
    projectMd
  );
  const markerB = `cid:${dirNameB}:requirements-analysis:c1`;
  ok(
    "FR-1.2: intent A と intent B の新形式 marker が dirName で区別される",
    projectMd.includes(markerA) && projectMd.includes(markerB) && markerA !== markerB,
    `${markerA} / ${markerB}`
  );
  ok("FR-1.1: intent B の persist 戻り値 rule_learned=1（appended）", persistB1.json?.rule_learned === 1, JSON.stringify(persistB1.json));
  ok("FR-1.1: intent B の persist 戻り値 already_present=0", persistB1.json?.already_present === 0, JSON.stringify(persistB1.json));

  // --- FR-1.4/1.5: 同一 selections の再 persist は冪等 ---
  const persistB2 = persist(selBPath);
  ok("FR-1.4/1.5: 同一 selections の再 persist が成功する", persistB2.exitCode === 0, persistB2.stdout + persistB2.stderr);
  ok("FR-1.4/1.5: 2 回目は appended (rule_learned) = 0", persistB2.json?.rule_learned === 0, JSON.stringify(persistB2.json));
  ok("FR-1.4/1.5: 2 回目は already_present = 1", persistB2.json?.already_present === 1, JSON.stringify(persistB2.json));

  const projectMdAfterRerun = readFileSync(projectMdPath, "utf-8");
  ok(
    "FR-1.4/1.5: 再 persist で project.md に重複追記されない",
    countOccurrences(projectMdAfterRerun, markerB) === 1,
    projectMdAfterRerun
  );

  // --- FR-1.3: 旧形式 marker 共存時の pin（新形式で追記され appended 側でカウント） ---
  const dirNameC = birth("b001-c");
  const oldMarkerLine = "- Old legacy text (learned 2020-01-01) <!-- cid:requirements-analysis:c1 -->\n";
  const projectMdBeforeC = readFileSync(projectMdPath, "utf-8");
  writeFileSync(projectMdPath, projectMdBeforeC + oldMarkerLine);

  const selCPath = join(base, "selections-c.json");
  writeFileSync(
    selCPath,
    JSON.stringify({
      stage_slug: "requirements-analysis",
      selections: [{ candidate_id: "c1", type: "learning", scope: "project", heading: "Testing Posture", text: "TextC-unique-marker" }],
    })
  );
  const persistC1 = persist(selCPath);
  ok("FR-1.3: 旧形式 marker 共存下での intent C persist が成功する", persistC1.exitCode === 0, persistC1.stdout + persistC1.stderr);

  const projectMdAfterC = readFileSync(projectMdPath, "utf-8");
  ok(
    "FR-1.3: 旧形式 marker はそのまま残る（改稿されない）",
    projectMdAfterC.includes("<!-- cid:requirements-analysis:c1 -->") && projectMdAfterC.includes("Old legacy text"),
    projectMdAfterC
  );
  const markerC = `cid:${dirNameC}:requirements-analysis:c1`;
  ok(
    "FR-1.3: 新形式 marker で追記される",
    projectMdAfterC.includes(markerC) && projectMdAfterC.includes("TextC-unique-marker"),
    projectMdAfterC
  );
  ok(
    "FR-1.3: 追記は appended 側でカウントされる（already_present にしない）",
    persistC1.json?.rule_learned === 1 && persistC1.json?.already_present === 0,
    JSON.stringify(persistC1.json)
  );

  // ================= B002 (#507) =================

  const GUARD_TARGETS = [
    "tools/amadeus-sensor.ts",
    "tools/amadeus-sensor-required-sections.ts",
    "tools/amadeus-sensor-upstream-coverage.ts",
    "tools/amadeus-swarm.ts",
    "tools/amadeus-validate.ts",
  ];

  // FR-2.2: import しても副作用（main 実行、exit）なしにロードできる。
  // サブプロセスで検証する（修正前はプロセス内 import が即 process.exit
  // してしまい eval 自体を巻き込むため、bun -e 経由で隔離する）。
  for (const rel of GUARD_TARGETS) {
    const abs = join(ws, ".agents/amadeus", rel);
    const res = run(["bun", "-e", `await import(${JSON.stringify(abs)})`], ws);
    ok(
      `FR-2.2: ${rel} は import しても副作用なしにロードできる`,
      res.exitCode === 0,
      `exit=${res.exitCode}\n${res.stdout}${res.stderr}`
    );
  }

  // FR-2.3: CLI としての既存挙動（引数なし実行時の usage エラーと exit code）
  // は修正前後で完全同一を維持する（回帰安全網）。
  const NO_ARGS_EXPECTATIONS: Record<string, string> = {
    "tools/amadeus-sensor.ts": "Usage: amadeus-sensor <subcommand>",
    "tools/amadeus-sensor-required-sections.ts": "--output-path is required",
    "tools/amadeus-sensor-upstream-coverage.ts": "--output-path is required",
    "tools/amadeus-swarm.ts": "Unknown subcommand: (none)",
    "tools/amadeus-validate.ts": "Usage: amadeus-validate outputs",
  };
  for (const rel of GUARD_TARGETS) {
    const abs = join(ws, ".agents/amadeus", rel);
    const res = run(["bun", abs], ws);
    const expected = NO_ARGS_EXPECTATIONS[rel]!;
    ok(`FR-2.3: ${rel} は引数なし実行で非ゼロ終了する`, res.exitCode !== 0, `exit=${res.exitCode}`);
    ok(
      `FR-2.3: ${rel} の usage エラーメッセージが維持される`,
      res.stderr.includes(expected) || res.stdout.includes(expected),
      res.stdout + res.stderr
    );
  }

  // FR-2.5: 全 tools 走査で無条件 main() 呼び出しの新規混入が 0 件（回帰検査）。
  // 実 repo の .agents/amadeus/tools/*.ts を対象にする（静的走査であり
  // sandbox コピーを対象にする必要はない）。
  const toolsDir = join(root, ".agents/amadeus/tools");
  const toolFiles = readdirSync(toolsDir).filter((f) => f.endsWith(".ts"));
  const unguarded: string[] = [];
  for (const f of toolFiles) {
    const content = readFileSync(join(toolsDir, f), "utf-8");
    const hasBareMainCall = /^(void )?main\(\);?\s*$/m.test(content);
    const hasGuard = content.includes("import.meta.main");
    if (hasBareMainCall && !hasGuard) unguarded.push(f);
  }
  ok("FR-2.5: 全 tools 走査で未ガードの無条件 main() 呼び出しが 0 件", unguarded.length === 0, JSON.stringify(unguarded));
} finally {
  rmSync(base, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`persist-cid-metamain eval: ${failures} 件失敗`);
  process.exit(1);
}
console.log("persist-cid-metamain eval: pass");
