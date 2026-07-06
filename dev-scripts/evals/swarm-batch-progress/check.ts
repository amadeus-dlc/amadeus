#!/usr/bin/env bun

// swarm-batch-progress eval（Issue #486）。
//
// invoke-swarm のバッチ提示が coverage（produces の実在）で進行することを、
// 隔離 temp workspace でエンジン実 CLI を駆動して検証する。LLM を呼ばず、
// 本番 amadeus/ を変更しない。成功時・失敗時ともに temp workspace を片付ける。
//
// (a) batch 1 が未完了のとき、invoke-swarm は batch 1 の未完了 unit を提示する。
// (b) batch 1 の produces が揃うと、次の `next` は batch 2 を提示する（従来は
//     常に batch 1 を再提示 = RED）。
// (c) 全 batch の produces が揃うと、invoke-swarm は発火せず per-unit の
//     all-covered 再入（run-stage / gate:true）へ落ちる（従来は swarm を
//     発火し続けた = RED）。

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

function makeWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), "swarm-batch-"));
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

const ws = makeWorkspace();
try {
  const utility = join(ws, ".agents/amadeus/tools/amadeus-utility.ts");
  const birth = run(
    ["bun", utility, "intent-birth", "--scope", "feature", "--arguments", "swarm batch eval", "--label", "swarm-batch"],
    ws
  );
  if (birth.exitCode !== 0) throw new Error(`intent-birth failed: ${birth.stderr}\n${birth.stdout}`);
  const intentsRoot = join(ws, "amadeus/spaces/default/intents");
  const dirName = readdirSync(intentsRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)[0]!;
  const rec = join(intentsRoot, dirName);

  // 2 batch の Bolt DAG（u-a → u-b）を機械可読 edge block として置く
  mkdirSync(join(rec, "inception/units-generation"), { recursive: true });
  writeFileSync(
    join(rec, "inception/units-generation/unit-of-work-dependency.md"),
    [
      "# Unit of Work Dependency（eval fixture）",
      "",
      "## 依存関係（機械可読）",
      "",
      "```yaml",
      "units:",
      "  - name: u-a1",
      "    depends_on: []",
      "  - name: u-a2",
      "    depends_on: []",
      "  - name: u-b",
      "    depends_on: [u-a1, u-a2]",
      "```",
      "",
      "## 説明",
      "",
      "eval 用の 2 batch DAG である。",
      "",
    ].join("\n"),
    "utf-8"
  );

  // Construction の code-generation まで forward jump（ideation / inception は
  // 実行済みステージなしのため Skipped で通過する = #481 の挙動を利用）
  const jump = run(
    ["bun", join(ws, ".agents/amadeus/tools/amadeus-jump.ts"), "execute", "--target", "code-generation", "--direction", "forward"],
    ws
  );
  if (jump.exitCode !== 0) throw new Error(`jump failed: ${jump.stdout}${jump.stderr}`);

  // autonomy を autonomous にして swarm を発火可能にし、runtime graph を compile
  run(["bun", join(ws, ".agents/amadeus/tools/amadeus-state.ts"), "set", "Construction Autonomy Mode=autonomous"], ws);
  const compile = run(["bun", join(ws, ".agents/amadeus/tools/amadeus-runtime.ts"), "compile"], ws);
  if (compile.exitCode !== 0) throw new Error(`compile failed: ${compile.stderr}`);

  const orchestrate = join(ws, ".agents/amadeus/tools/amadeus-orchestrate.ts");
  const next1 = run(["bun", orchestrate, "next"], ws);
  const d1 = JSON.parse(next1.stdout) as { kind: string; units?: string[] };
  ok(
    "(a) batch 1 未完了時は invoke-swarm が batch 1（u-a1, u-a2）を提示する",
    d1.kind === "invoke-swarm" && JSON.stringify(d1.units) === '["u-a1","u-a2"]',
    next1.stdout.slice(0, 200)
  );

  // 部分完了: u-a1 だけ coverage 充足 → 未完了の u-a2 だけが提示される（R003 / AC3）
  for (const f of ["code-generation-plan", "code-summary"]) {
    const dir = join(rec, "construction", "u-a1", "code-generation");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${f}.md`), `# ${f}\n\n## eval\n\nfixture\n`, "utf-8");
  }
  const nextPartial = run(["bun", orchestrate, "next"], ws);
  const dp = JSON.parse(nextPartial.stdout) as { kind: string; units?: string[] };
  ok(
    "(a2) 部分完了 batch では未完了 unit（u-a2）のみ提示される",
    dp.kind === "invoke-swarm" && JSON.stringify(dp.units) === '["u-a2"]',
    nextPartial.stdout.slice(0, 200)
  );

  // batch 1 を完了させる
  for (const f of ["code-generation-plan", "code-summary"]) {
    const dir = join(rec, "construction", "u-a2", "code-generation");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${f}.md`), `# ${f}\n\n## eval\n\nfixture\n`, "utf-8");
  }
  const next2 = run(["bun", orchestrate, "next"], ws);
  const d2 = JSON.parse(next2.stdout) as { kind: string; units?: string[] };
  ok("(b) batch 1 完了後は batch 2（u-b）を提示する", d2.kind === "invoke-swarm" && JSON.stringify(d2.units) === '["u-b"]', next2.stdout.slice(0, 200));

  // u-b も充足 → swarm は発火せず all-covered 再入（run-stage gate:true）へ
  for (const f of ["code-generation-plan", "code-summary"]) {
    const dir = join(rec, "construction", "u-b", "code-generation");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${f}.md`), `# ${f}\n\n## eval\n\nfixture\n`, "utf-8");
  }
  const next3 = run(["bun", orchestrate, "next"], ws);
  const d3 = JSON.parse(next3.stdout) as { kind: string; stage?: string; gate?: unknown };
  ok(
    "(c) 全 batch 完了後は invoke-swarm を発火せず gate 付き run-stage へ落ちる",
    d3.kind === "run-stage" && d3.stage === "code-generation" && d3.gate === true,
    next3.stdout.slice(0, 200)
  );
} finally {
  rmSync(ws, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`swarm-batch-progress eval: ${failures} failure(s)`);
  process.exit(1);
}
console.log("swarm-batch-progress eval: ok");
