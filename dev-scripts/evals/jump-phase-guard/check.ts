#!/usr/bin/env bun

// jump-phase-guard eval（Issue #481）。
//
// amadeus-jump.ts execute の phase 境界が #479 の契約（PHASE_VERIFIED ⇔
// Phase Progress 更新 ⇔ phase-check 存在）に従うことを、隔離 temp workspace で
// エンジン実 CLI を駆動して検証する。LLM を呼ばず、本番 amadeus/ を変更しない。
// 成功時・失敗時ともに temp workspace を片付ける。
//
// (a) R002: 実行済み（[x]）ステージのある phase を forward jump で閉じるとき、
//     verification/phase-check-<phase>.md が無ければ拒否し、state を変更しない。
// (b) R001: phase-check があれば通過し、PHASE_VERIFIED の emit と同一トランザク
//     ションで Phase Progress が Verified になる。
// (c) R003: 実行済みステージの無い phase を閉じる forward jump は PHASE_SKIPPED
//     を emit して Phase Progress を Skipped にする（phase-check 不要）。
// (d) R004: backward jump は phase 境界イベントを emit せず、Verified を巻き戻さない。
// (e) AC1: (b) の record が AmadeusValidator の phase 整合検査で fail しない。

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
  const workspace = mkdtempSync(join(tmpdir(), "jump-phase-guard-"));
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

function readState(workspace: string, dirName: string): string {
  return readFileSync(join(recordDirPath(workspace, dirName), "amadeus-state.md"), "utf-8");
}

function phaseProgress(state: string, field: string): string {
  const m = state.match(new RegExp(`^- \\*\\*${field}\\*\\*:[ \\t]*(.*)$`, "m"));
  return m ? (m[1] ?? "").trim() : "";
}

function auditText(workspace: string, dirName: string): string {
  const auditDir = join(recordDirPath(workspace, dirName), "audit");
  if (!existsSync(auditDir)) return "";
  return readdirSync(auditDir)
    .map((f) => readFileSync(join(auditDir, f), "utf-8"))
    .join("\n");
}

// 指定 phase に言及する PHASE_VERIFIED 行ブロックの有無。
// intent-birth は initialization の PHASE_VERIFIED を正当に emit するため（#479）、
// 検査は対象 phase を名指しして行う。
function hasPhaseVerifiedFor(audit: string, phase: string): boolean {
  // 境界の起点 phase でアンカーする（intent-birth の
  // 「initialization → inception」行を窓の広い部分一致で誤検知しないため）。
  return new RegExp(`PHASE_VERIFIED[\\s\\S]{0,200}Phase boundary\\*\\*: *${phase} `, "i").test(audit);
}

function jump(workspace: string, target: string, direction: string) {
  const jumpTool = join(workspace, ".agents/amadeus/tools/amadeus-jump.ts");
  return run(["bun", jumpTool, "execute", "--target", target, "--direction", direction], workspace);
}

function setCheckbox(workspace: string, pair: string) {
  const stateTool = join(workspace, ".agents/amadeus/tools/amadeus-state.ts");
  const res = run(["bun", stateTool, "checkbox", pair], workspace);
  if (res.exitCode !== 0) throw new Error(`checkbox failed: ${res.stderr}`);
}

function writePhaseCheck(workspace: string, dirName: string, phase: string) {
  const dir = join(recordDirPath(workspace, dirName), "verification");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `phase-check-${phase}.md`),
    `# Phase Check — ${phase}（eval fixture）\n\n## 検査\n\neval 用の phase-check 成果物である。\n`,
    "utf-8"
  );
}

// --- (a)(b) 実行済みステージのある inception を forward jump で閉じる ---
{
  const ws = makeWorkspace();
  try {
    const dirName = birthIntent(ws, "guard-a");
    // bugfix scope の初期 Current Stage は requirements-analysis（INCEPTION）
    setCheckbox(ws, "requirements-analysis=completed");

    // phase-check 不在 → 拒否、state 不変
    const before = readState(ws, dirName);
    const denied = jump(ws, "code-generation", "forward");
    ok("(a) phase-check 不在の forward 境界越えは非 0 exit", denied.exitCode !== 0, denied.stdout + denied.stderr);
    ok(
      "(a) 拒否メッセージが phase-check を名指しする",
      (denied.stdout + denied.stderr).includes("phase-check-inception"),
      denied.stdout + denied.stderr
    );
    ok("(a) 拒否時に state が変更されない", readState(ws, dirName) === before);
    ok(
      "(a) 拒否時に inception の PHASE_VERIFIED が audit に載らない",
      !hasPhaseVerifiedFor(auditText(ws, dirName), "inception")
    );

    // phase-check を置くと通過し、Phase Progress が Verified になる
    writePhaseCheck(ws, dirName, "inception");
    const allowed = jump(ws, "code-generation", "forward");
    ok("(b) phase-check があれば forward 境界越えが成功する", allowed.exitCode === 0, allowed.stderr);
    const st = readState(ws, dirName);
    ok("(b) Phase Progress の Inception が Verified になる", phaseProgress(st, "Inception") === "Verified", phaseProgress(st, "Inception"));
    ok("(b) inception の PHASE_VERIFIED が audit に載る", hasPhaseVerifiedFor(auditText(ws, dirName), "inception"));

    // (e) validator の phase 整合検査で fail しない
    const validator = join(root, ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts");
    const v = run(["bun", validator, ws, dirName], ws);
    const failLines = (v.stdout.match(/^- .*(先行 phase|Verified の phase).*/gm) ?? []).join("\n");
    ok("(e) validator の phase 整合検査で fail しない", failLines === "", failLines);

    // (d) backward jump は phase 境界イベントを emit せず Verified を保つ
    const auditBefore = auditText(ws, dirName);
    const phaseEventCount = (auditBefore.match(/PHASE_(VERIFIED|COMPLETED|STARTED|SKIPPED)/g) ?? []).length;
    const back = jump(ws, "requirements-analysis", "backward");
    ok("(d) backward jump が成功する", back.exitCode === 0, back.stderr);
    const auditAfter = auditText(ws, dirName);
    const phaseEventCountAfter = (auditAfter.match(/PHASE_(VERIFIED|COMPLETED|STARTED|SKIPPED)/g) ?? []).length;
    ok("(d) backward jump は phase 境界イベントを増やさない", phaseEventCountAfter === phaseEventCount, `${phaseEventCount} -> ${phaseEventCountAfter}`);
    ok(
      "(d) backward jump は Verified を巻き戻さない",
      phaseProgress(readState(ws, dirName), "Inception") === "Verified"
    );
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

// --- (c) 実行済みステージの無い phase を閉じる forward jump は Skipped ---
{
  const ws = makeWorkspace();
  try {
    const dirName = birthIntent(ws, "guard-c");
    // requirements-analysis は [-]（実行済み [x] は inception に無い）のまま跨ぐ
    const res = jump(ws, "code-generation", "forward");
    ok("(c) 実行済みなしの forward 境界越えは phase-check なしで成功する", res.exitCode === 0, res.stderr);
    const st = readState(ws, dirName);
    ok("(c) Phase Progress の Inception が Skipped になる", phaseProgress(st, "Inception") === "Skipped", phaseProgress(st, "Inception"));
    const audit = auditText(ws, dirName);
    ok(
      "(c) inception の PHASE_SKIPPED が audit に載る",
      /PHASE_SKIPPED[\s\S]{0,200}inception/i.test(audit)
    );
    ok("(c) inception の PHASE_VERIFIED は載らない", !hasPhaseVerifiedFor(audit, "inception"));
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

if (failures > 0) {
  console.error(`jump-phase-guard eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log("jump-phase-guard eval: ok");
