#!/usr/bin/env bun

// pdm-scope eval（Issue #429）。
//
// Construction を持たない pdm scope が実 CLI で成立することを、隔離 temp
// workspace で検証する。LLM を呼ばず、本番 aidlc/ を変更しない。
// 成功時・失敗時ともに temp workspace を片付ける。
//
// (a) intent-birth --scope pdm が成功し、最初の post-init stage が
//     intent-capture（IDEATION）である。
// (b) state の Construction / Operation 全ステージが [S] であり、EXECUTE は
//     12 ステージ（grid の定義どおり）である。
// (c) scope-grid.json の pdm が期待の EXECUTE 集合を持つ。

import {
  cpSync,
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

const EXPECTED_EXECUTE = [
  "workspace-scaffold",
  "workspace-detection",
  "state-init",
  "intent-capture",
  "market-research",
  "feasibility",
  "scope-definition",
  "rough-mockups",
  "approval-handoff",
  "requirements-analysis",
  "user-stories",
  "refined-mockups",
];

// --- (c) grid 定義（コンパイル成果物）の検査 ---
{
  const grid = JSON.parse(
    readFileSync(join(root, ".agents/amadeus/tools/data/scope-grid.json"), "utf-8")
  ) as Record<string, { stages: Record<string, string> }>;
  const pdm = grid.pdm;
  ok("(c) scope-grid.json に pdm が存在する", pdm !== undefined);
  if (pdm) {
    const ex = Object.entries(pdm.stages).filter(([, v]) => v === "EXECUTE").map(([k]) => k);
    ok(
      "(c) pdm の EXECUTE 集合が期待の 12 ステージと一致する",
      JSON.stringify(ex.sort()) === JSON.stringify([...EXPECTED_EXECUTE].sort()),
      ex.join(",")
    );
    const constructionOps = Object.entries(pdm.stages).filter(
      ([k]) => !EXPECTED_EXECUTE.includes(k)
    );
    ok("(c) EXECUTE 以外はすべて SKIP である", constructionOps.every(([, v]) => v === "SKIP"));
  }
}

// --- (a)(b) 実 CLI: birth → state 検査 ---
{
  const ws = mkdtempSync(join(tmpdir(), "pdm-scope-"));
  try {
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
    const run = (cmd: string[]) => {
      const proc = Bun.spawnSync({
        cmd,
        cwd: ws,
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, CLAUDE_PROJECT_DIR: ws },
      });
      return {
        exitCode: proc.exitCode ?? -1,
        out: new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr),
      };
    };
    const utility = join(ws, ".agents/amadeus/tools/amadeus-utility.ts");
    const birth = run(["bun", utility, "intent-birth", "--scope", "pdm", "--arguments", "PRD 作成 eval", "--label", "pdm-eval"]);
    ok("(a) intent-birth --scope pdm が成功する", birth.exitCode === 0, birth.out.slice(0, 200));
    ok(
      "(a) 最初の post-init stage が intent-capture（IDEATION）",
      birth.out.includes("intent-capture") && /IDEATION/i.test(birth.out),
      birth.out.slice(0, 200)
    );

    const intentsRoot = join(ws, "aidlc/spaces/default/intents");
    const dirName = readdirSync(intentsRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)[0]!;
    const state = readFileSync(join(intentsRoot, dirName, "aidlc-state.md"), "utf-8");

    // Construction / Operation の全ステージが誕生時点で — SKIP 注釈付き [ ] であること
    const CONSTRUCTION_OPS = [
      "functional-design", "nfr-requirements", "nfr-design", "infrastructure-design",
      "code-generation", "build-and-test", "ci-pipeline",
      "deployment-pipeline", "environment-provisioning", "deployment-execution",
      "observability-setup", "performance-validation", "incident-response", "feedback-optimization",
    ];
    // 誕生時点の契約: SKIP は checkbox 注釈（— SKIP）で表現され、[S] への遷移は
    // workflow 進行時に行われる（既存 scope と同じ挙動）
    const notSkipped = CONSTRUCTION_OPS.filter(
      (slug) => !new RegExp(`^- \\[ \\] ${slug} — SKIP$`, "m").test(state)
    );
    ok("(b) Construction / Operation の全ステージが — SKIP 注釈を持つ", notSkipped.length === 0, notSkipped.join(","));

    // EXECUTE 12 ステージのうち post-init 9 個が [ ]/[-] として存在する
    const postInit = EXPECTED_EXECUTE.slice(3);
    const missing = postInit.filter(
      (slug) => !new RegExp(`^- \\[( |-)\\] ${slug} — EXECUTE$`, "m").test(state)
    );
    ok("(b) EXECUTE ステージが — EXECUTE 注釈で並ぶ", missing.length === 0, missing.join(","));

    // (d) R005 / AC6: pdm の completed ステージが validator の検査対象になる。
    // intent-capture を produces なしで [x] にすると、validator が必須成果物の
    // 欠落を fail として検出する（pdm が scope 配列に無ければ検査自体が走らない）
    const stateTool = join(ws, ".agents/amadeus/tools/amadeus-state.ts");
    const cb = run(["bun", stateTool, "checkbox", "intent-capture=completed"]);
    // 前提操作の成功を確認する（失敗すると (d) が誤った前提で判定される）
    ok("(d) 前提の checkbox 操作が成功する", cb.exitCode === 0, cb.out.slice(0, 200));
    const validator = join(root, ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts");
    const vproc = Bun.spawnSync({
      cmd: ["bun", validator, ws, dirName],
      cwd: ws,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, CLAUDE_PROJECT_DIR: ws },
    });
    const vout = new TextDecoder().decode(vproc.stdout);
    // liveness guard: validator が完走して判定を出したことを先に確認する
    // （crash すると出力が空になり、パターン不一致の意味が変わるため）
    ok(
      "(d) validator が完走して判定を出力する",
      /## 判定/.test(vout) && vproc.exitCode === 1,
      `exit=${vproc.exitCode}`
    );
    ok(
      "(d) pdm の completed ステージの成果物欠落を validator が fail 検出する",
      /intent-capture\/intent-statement\.md/.test(vout),
      vout.split("\n").filter((l) => l.includes("intent-capture")).join(" | ").slice(0, 300)
    );
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

// --- (e) completion path（Bugbot High「delivery-planning skip でデッドロック」の反証） ---
// phase-check-<phase>.md は conductor の knowledge work であり（#481 R002、
// amadeus-state.ts の拒否メッセージが生成を指示する契約）、delivery-planning が
// SKIP でも「拒否 → conductor が生成 → 完了成功」で成立する。bugfix / refactor
// scope も delivery-planning を skip して同経路で完了している（実運用実績）。
{
  const ws = mkdtempSync(join(tmpdir(), "pdm-scope-e-"));
  try {
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
    const run = (cmd: string[]) => {
      const proc = Bun.spawnSync({
        cmd,
        cwd: ws,
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, CLAUDE_PROJECT_DIR: ws },
      });
      return {
        exitCode: proc.exitCode ?? -1,
        out: new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr),
      };
    };
    const tools = join(ws, ".agents/amadeus/tools");
    run(["bun", join(tools, "amadeus-utility.ts"), "intent-birth", "--scope", "pdm", "--arguments", "completion eval", "--label", "pdm-done"]);
    const intentsRoot = join(ws, "aidlc/spaces/default/intents");
    const dirName = readdirSync(intentsRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)[0]!;
    const rec = join(intentsRoot, dirName);
    // 終点 stage（refined-mockups）まで forward jump し、produces を用意する
    run(["bun", join(tools, "amadeus-jump.ts"), "execute", "--target", "refined-mockups", "--direction", "forward"]);
    const rm = join(rec, "inception", "refined-mockups");
    mkdirSync(rm, { recursive: true });
    for (const f of ["mockups", "interaction-spec", "design-system-mapping", "accessibility-checklist"]) {
      writeFileSync(join(rm, `${f}.md`), `# ${f}

## eval

fixture
`, "utf-8");
    }
    // phase-check なし → 完了は拒否され、生成すべきパスが指示される（デッドロックではない）
    const denied = run(["bun", join(tools, "amadeus-state.ts"), "complete-workflow", "refined-mockups", "--reason", "eval"]);
    ok("(e) phase-check 不在の完了は拒否される", denied.exitCode !== 0, denied.out.slice(0, 200));
    ok(
      "(e) 拒否メッセージが生成すべき phase-check パスを指示する（conductor knowledge work の契約）",
      denied.out.includes("phase-check-inception"),
      denied.out.slice(0, 250)
    );
    // conductor が phase-check を生成 → 完了成功（Inception Verified / Status Completed）
    mkdirSync(join(rec, "verification"), { recursive: true });
    writeFileSync(
      join(rec, "verification", "phase-check-inception.md"),
      ["# Phase Check — inception", "", "## 検査", "", "eval 用。", ""].join("\n"),
      "utf-8"
    );
    const done = run(["bun", join(tools, "amadeus-state.ts"), "complete-workflow", "refined-mockups", "--reason", "eval"]);
    ok("(e) phase-check 生成後は完了が成功する", done.exitCode === 0, done.out.slice(0, 200));
    const st = readFileSync(join(rec, "aidlc-state.md"), "utf-8");
    ok(
      "(e) Inception が Verified、Status が Completed になる",
      /- \*\*Inception\*\*: Verified/.test(st) && /- \*\*Status\*\*: Completed/.test(st)
    );
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

// --- (f) 空 Construction の e2e（Maintainer 指摘 2026-07-05T11:06Z への対応） ---
// (e) は complete-workflow を直接呼ぶが、本検査は通常進行の gate 経路
// （gate-start → approve → 空 Construction / 空 Operation の phase 境界処理 →
// workflow 完了判定到達）を実 CLI で駆動する。空 Construction は既存 9 scope に
// ない新規形状であり、firstInScopeStageOfPhase() が null を返す経路
// （skeleton-gate 導出・finality 判定）が安全に通過することを確認する。
{
  const ws = mkdtempSync(join(tmpdir(), "pdm-scope-f-"));
  try {
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
    const run = (cmd: string[]) => {
      const proc = Bun.spawnSync({
        cmd,
        cwd: ws,
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, CLAUDE_PROJECT_DIR: ws },
      });
      return {
        exitCode: proc.exitCode ?? -1,
        out: new TextDecoder().decode(proc.stdout) + new TextDecoder().decode(proc.stderr),
      };
    };
    const tools = join(ws, ".agents/amadeus/tools");
    run(["bun", join(tools, "amadeus-utility.ts"), "intent-birth", "--scope", "pdm", "--arguments", "empty construction e2e", "--label", "pdm-gate"]);
    const intentsRoot = join(ws, "aidlc/spaces/default/intents");
    const dirName = readdirSync(intentsRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)[0]!;
    const rec = join(intentsRoot, dirName);
    // 終点 stage（refined-mockups）まで forward jump し、produces と phase-check を用意する
    run(["bun", join(tools, "amadeus-jump.ts"), "execute", "--target", "refined-mockups", "--direction", "forward"]);
    const rm = join(rec, "inception", "refined-mockups");
    mkdirSync(rm, { recursive: true });
    for (const f of ["mockups", "interaction-spec", "design-system-mapping", "accessibility-checklist"]) {
      writeFileSync(join(rm, `${f}.md`), `# ${f}\n\n## eval\n\nfixture\n`, "utf-8");
    }
    mkdirSync(join(rec, "verification"), { recursive: true });
    writeFileSync(
      join(rec, "verification", "phase-check-inception.md"),
      ["# Phase Check — inception", "", "## 検査", "", "eval 用。", ""].join("\n"),
      "utf-8"
    );
    // HUMAN_TURN を mint する（approve の human-presence gate 対策。conductor 実運用と同じ）
    run(["bun", join(ws, ".agents/amadeus/hooks/amadeus-mint-presence.ts")]);
    // 通常進行の gate 経路: gate-start → approve（(e) の complete-workflow 直呼びとは別経路）
    const gs = run(["bun", join(tools, "amadeus-state.ts"), "gate-start", "refined-mockups"]);
    ok("(f) 終点 stage の gate-start が成功する", gs.exitCode === 0, gs.out.slice(0, 250));
    const ap = run(["bun", join(tools, "amadeus-state.ts"), "approve", "refined-mockups"]);
    ok(
      "(f) 終点 stage の approve が空 Construction / 空 Operation を越えて成功する",
      ap.exitCode === 0,
      ap.out.slice(0, 250)
    );
    // エンジンの workflow 完了判定: next が done（残 in-scope stage なし）を返す
    const nx = run(["bun", join(tools, "amadeus-orchestrate.ts"), "next"]);
    ok("(f) 承認後の next が正常終了する", nx.exitCode === 0, nx.out.slice(0, 250));
    let kind = "";
    try {
      kind = (JSON.parse(nx.out) as { kind?: string }).kind ?? "";
    } catch {
      /* JSON でなければ kind 空のまま fail させる */
    }
    ok(
      "(f) next が workflow 完了判定（kind: done）に到達する",
      kind === "done",
      nx.out.slice(0, 250)
    );
    const st = readFileSync(join(rec, "aidlc-state.md"), "utf-8");
    ok(
      "(f) Construction / Operation が Skipped、Status が Completed になる",
      /- \*\*Construction\*\*: Skipped/.test(st) &&
        /- \*\*Operation\*\*: Skipped/.test(st) &&
        /- \*\*Status\*\*: Completed/.test(st)
    );
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

if (failures > 0) {
  console.error(`pdm-scope eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log("pdm-scope eval: ok");
