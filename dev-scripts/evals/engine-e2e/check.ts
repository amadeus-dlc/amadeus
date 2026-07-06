#!/usr/bin/env bun

// engine e2e sandbox eval — LLM を使わず、実エンジン（.agents/amadeus/ の
// intent-birth / next / report）を隔離 temp workspace で駆動し、
// examples/ snapshot 検証を置き換える決定的な e2e チェック。
//
// amadeus-orchestrate.ts の next/report は失敗時も process を exit 0 のまま
// 終える設計（{"kind":"error", ...} という directive を stdout に出す）。
// そのため各コマンドの成否判定は exitCode ではなく、出力 JSON の kind/message
// を見て行う。

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
// intent-birth / next / report の実行に実際に必要だと確認できたエンジンディレクトリだけを
// コピーする（hooks なしでも next/report/intent-birth の挙動は同一だったため除外）。
const ENGINE_DIRS = ["tools", "amadeus-common", "sensors", "scopes", "agents", "knowledge"];

const cleanups: string[] = [];

function fail(message: string): never {
  for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
  console.error(message);
  process.exit(1);
}

function check(name: string, condition: boolean, evidence: string): void {
  if (!condition) fail(`fail: ${name} — ${evidence}`);
  console.log(`ok: ${name}`);
}

function run(command: string[], cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  return { stdout, stderr, exitCode: result.exitCode };
}

function runExpectSuccess(command: string[], cwd: string): string {
  const { stdout, stderr, exitCode } = run(command, cwd);
  if (exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stdout;
}

// next/report の stdout には診断行が混ざる場合があるため、最初の "{" と最後の
// "}" の間を JSON として解釈する（末尾行だけが JSON とは限らないため）。
function parseDirective(stdout: string): Record<string, unknown> {
  const first = stdout.indexOf("{");
  const last = stdout.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) {
    fail(`directive JSON が stdout から見つからない — stdout:\n${stdout}`);
  }
  try {
    return JSON.parse(stdout.slice(first, last + 1));
  } catch (e) {
    fail(`directive JSON の解析に失敗した: ${e instanceof Error ? e.message : String(e)} — stdout:\n${stdout}`);
  }
}

// ---- sandbox workspace の準備 ----

const workspace = mkdtempSync(join(tmpdir(), "engine-e2e-"));
cleanups.push(workspace);

for (const dir of ENGINE_DIRS) {
  const src = join(root, ".agents/amadeus", dir);
  const dest = join(workspace, ".agents/amadeus", dir);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

const utility = join(workspace, ".agents/amadeus/tools/amadeus-utility.ts");
const orchestrate = join(workspace, ".agents/amadeus/tools/amadeus-orchestrate.ts");

// ---- 1. intent-birth ----

const birthStdout = runExpectSuccess(
  ["bun", utility, "intent-birth", "--scope", "poc", "--arguments", "e2e smoke", "--label", "e2e-smoke"],
  workspace
);
console.log("ok: intent-birth exits 0");

const intentsRoot = join(workspace, "amadeus/spaces/default/intents");
const recordDirName = readdirSync(intentsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)[0];
check("Intent record ディレクトリが作られている", recordDirName !== undefined, birthStdout);
const recordDir = join(intentsRoot, recordDirName!);
check("amadeus-state.md が存在する", existsSync(join(recordDir, "amadeus-state.md")), recordDir);

// ---- 1b. エンジンが書く値と validator 許可値の整合（Issue #455 / #446） ----

// FR-1: intent-birth が registry に正準 status `in_progress` を書く。
const registryEntries = JSON.parse(readFileSync(join(intentsRoot, "intents.json"), "utf8")) as Record<string, unknown>[];
check("registry entry が1件である", registryEntries.length === 1, JSON.stringify(registryEntries));
check(
  "FR-1: intent-birth が status: in_progress を書く",
  registryEntries[0].status === "in_progress",
  JSON.stringify(registryEntries[0].status)
);

// FR-3.1: intent-birth が registry entry に repos 配列の既定値を書く。
check(
  "FR-3.1: intent-birth が repos 配列を書く",
  Array.isArray(registryEntries[0].repos),
  JSON.stringify(registryEntries[0].repos)
);

// FR-3.2: state 初期化が Construction Autonomy Mode の既定値（unset）を書く。
const bornState = readFileSync(join(recordDir, "amadeus-state.md"), "utf8");
check(
  "FR-3.2: state 初期化が Construction Autonomy Mode: unset を書く",
  bornState.includes("- **Construction Autonomy Mode**: unset"),
  bornState.slice(bornState.indexOf("## Current Status")),
);

// ---- 1c. FR-4: surface が record path の memory.md を実エントリ数と正しい phase で返す ----

// poc scope の birth 直後は Current Stage = intent-capture（ideation）。
// runtime graph を compile し、record 配下の diary にエントリを書いてから surface する。
const runtimeTool = join(workspace, ".agents/amadeus/tools/amadeus-runtime.ts");
runExpectSuccess(["bun", runtimeTool, "compile"], workspace);
const diaryDir = join(recordDir, "ideation/intent-capture");
mkdirSync(diaryDir, { recursive: true });
writeFileSync(
  join(diaryDir, "memory.md"),
  [
    "## Interpretations",
    "- 2026-07-04T00:00:00Z — 解釈の観測; 文脈A",
    "",
    "## Deviations",
    "- 2026-07-04T00:00:00Z — 逸脱の観測; 文脈B",
    "",
    "## Tradeoffs",
    "",
    "## Open questions",
    "",
  ].join("\n")
);
const learningsTool = join(workspace, ".agents/amadeus/tools/amadeus-learnings.ts");
const surfaceStdout = runExpectSuccess(["bun", learningsTool, "surface", "--slug", "intent-capture"], workspace);
const surfaceOut = parseDirective(surfaceStdout);
check(
  "FR-4: surface が実エントリ数を返す",
  surfaceOut.memory_entries_total === 2,
  JSON.stringify(surfaceOut)
);
check(
  "FR-4: surface が record path から正しい phase を解決する",
  surfaceOut.phase === "ideation",
  JSON.stringify(surfaceOut.phase)
);

// ---- 2. next ----

const nextStdout = runExpectSuccess(["bun", orchestrate, "next"], workspace);
const directive = parseDirective(nextStdout);
check("kind が run-stage である", directive.kind === "run-stage", JSON.stringify(directive.kind));
check("stage が intent-capture である", directive.stage === "intent-capture", JSON.stringify(directive.stage));
check("gate が true である", directive.gate === true, JSON.stringify(directive.gate));
const produces = directive.produces;
check("produces が配列で3件である", Array.isArray(produces) && produces.length === 3, JSON.stringify(produces));
check(
  "conductor_persona が付与されている（セッション最初の next のため）",
  typeof directive.conductor_persona === "string" && (directive.conductor_persona as string).length > 0,
  String(directive.conductor_persona)
);

// ---- 3. report（成果物なし） → produces 不在で拒否される ----

const reportNoArtifacts = runExpectSuccess(["bun", orchestrate, "report", "--stage", "intent-capture", "--result", "completed"], workspace);
const rejectNoArtifacts = parseDirective(reportNoArtifacts);
check("成果物なしの report は kind=error になる", rejectNoArtifacts.kind === "error", JSON.stringify(rejectNoArtifacts));
const rejectNoArtifactsMessage = String(rejectNoArtifacts.message ?? "");
check(
  "produces 不在を理由に拒否している",
  rejectNoArtifactsMessage.includes("none of its declared artifacts exist under the intent's record directory"),
  rejectNoArtifactsMessage
);

// ---- 4. 宣言された3成果物を置いて再度 report → 人間不在で拒否される ----

for (const relPath of produces as string[]) {
  const absPath = join(workspace, relPath);
  mkdirSync(join(absPath, ".."), { recursive: true });
  writeFileSync(absPath, "");
}

const reportWithArtifacts = runExpectSuccess(["bun", orchestrate, "report", "--stage", "intent-capture", "--result", "completed"], workspace);
const rejectHumanPresence = parseDirective(reportWithArtifacts);
check("成果物ありの report も kind=error になる", rejectHumanPresence.kind === "error", JSON.stringify(rejectHumanPresence));
const rejectHumanPresenceMessage = String(rejectHumanPresence.message ?? "");
check(
  "人間不在（real human）を理由に拒否している",
  rejectHumanPresenceMessage.includes("a real human has not acted at this gate"),
  rejectHumanPresenceMessage
);

// ---- 5. audit shard に ERROR_LOGGED が追記されている ----

const auditDir = join(recordDir, "audit");
const shardName = readdirSync(auditDir).find((name) => name.endsWith(".md") && name !== "audit.md");
check("audit shard（<host>-<clone>.md）が作られている", shardName !== undefined, readdirSync(auditDir).join(", "));
const shardText = readFileSync(join(auditDir, shardName!), "utf8");
check("audit shard に ERROR_LOGGED が記録されている", shardText.includes("**Event**: ERROR_LOGGED"), shardText.slice(-500));


// ---- 6. #547: 末尾 skip 連続の workflow を complete-workflow で閉じたときの整合 ----
// feature scope を birth し、build-and-test までを completed、ci-pipeline と
// Operation の EXECUTE ステージを [S] にした状態（PR #546 の実測形）で
// complete-workflow を呼ぶ。期待: Current Stage / Next Stage = none、
// 全 [S] の phase（operation）の Phase Progress = Skipped、PHASE_SKIPPED が
// audit に記録され、手動整合なしで validator が pass する。

{
  const ws547 = mkdtempSync(join(tmpdir(), "engine-e2e-547-"));
  cleanups.push(ws547);
  for (const dir of ENGINE_DIRS) {
    cpSync(join(root, ".agents/amadeus", dir), join(ws547, ".agents/amadeus", dir), { recursive: true });
  }
  const util547 = join(ws547, ".agents/amadeus/tools/amadeus-utility.ts");
  const state547 = join(ws547, ".agents/amadeus/tools/amadeus-state.ts");
  runExpectSuccess(
    ["bun", util547, "intent-birth", "--scope", "feature", "--arguments", "trailing skip fixture", "--label", "trail skip"],
    ws547
  );
  const record547 = join(ws547, "amadeus/spaces/default/intents");
  const dir547 = readdirSync(record547).find((n) => n.includes("trail-skip"));
  check("(#547) fixture record が誕生する", dir547 !== undefined, readdirSync(record547).join(", "));
  const statePath547 = join(record547, dir547!, "amadeus-state.md");
  // build-and-test までの EXECUTE を completed、ci-pipeline と operation の EXECUTE を [S] へ
  const doneSlugs = ["intent-capture", "market-research", "feasibility", "scope-definition", "team-formation", "rough-mockups", "approval-handoff", "reverse-engineering", "practices-discovery", "requirements-analysis", "user-stories", "refined-mockups", "application-design", "units-generation", "delivery-planning", "functional-design", "nfr-requirements", "nfr-design", "infrastructure-design", "code-generation", "build-and-test"];
  for (const s of doneSlugs) {
    run(["bun", state547, "checkbox", `${s}=completed`], ws547);
  }
  for (const s of ["ci-pipeline", "deployment-pipeline", "environment-provisioning", "deployment-execution", "observability-setup", "incident-response", "performance-validation", "feedback-optimization"]) {
    run(["bun", state547, "checkbox", `${s}=skipped`], ws547);
  }
  // phase-check（inception / construction）を置いて complete-workflow の境界要求を満たす
  mkdirSync(join(record547, dir547!, "verification"), { recursive: true });
  for (const ph of ["ideation", "inception", "construction"]) {
    writeFileSync(join(record547, dir547!, "verification", `phase-check-${ph}.md`), `# Phase Check — ${ph}\n\n## 検査\n\n- fixture\n\n## 結果\n\n- pass\n`);
  }
  const doneRes = run(["bun", state547, "complete-workflow", "build-and-test", "--reason", "eval-547"], ws547);
  check("(#547) complete-workflow が exit 0", doneRes.exitCode === 0, doneRes.stderr.slice(0, 300));
  const st = readFileSync(statePath547, "utf8");
  check("(#547) Current Stage が none", /\*\*Current Stage\*\*: none/.test(st), st.match(/\*\*Current Stage\*\*: [^\n]*/)?.[0] ?? "");
  check("(#547) Operation phase が Skipped", /\*\*Operation\*\*: Skipped/.test(st), st.match(/\*\*Operation\*\*: [^\n]*/)?.[0] ?? "");
  const shard547 = readdirSync(join(record547, dir547!, "audit")).find((n) => n.endsWith(".md") && n !== "audit.md");
  const audit547 = readFileSync(join(record547, dir547!, "audit", shard547!), "utf8");
  check("(#547) PHASE_SKIPPED (operation) が audit に記録される", /\*\*Event\*\*: PHASE_SKIPPED[\s\S]{0,80}operation/.test(audit547), audit547.slice(-600));
}

// ---- 7. #558: 縮退 scope での learnings surface の自己修復 ----
// bugfix scope（縮退構成）を birth し、runtime-graph.json を消して「登録漏れ」
// 状態を作る。(a) surface が手動 compile なしで自動再 compile して成立する。
// (b) 自動 compile でも解決しない場合（audit shard 破壊で graph に slug が
// 載らない）は、無言 fail ではなく復旧手順つきエラー（exit 非 0）が出る。

{
  const ws558 = mkdtempSync(join(tmpdir(), "engine-e2e-558-"));
  cleanups.push(ws558);
  for (const dir of ENGINE_DIRS) {
    cpSync(join(root, ".agents/amadeus", dir), join(ws558, ".agents/amadeus", dir), { recursive: true });
  }
  const util558 = join(ws558, ".agents/amadeus/tools/amadeus-utility.ts");
  const learnings558 = join(ws558, ".agents/amadeus/tools/amadeus-learnings.ts");
  runExpectSuccess(
    ["bun", util558, "intent-birth", "--scope", "bugfix", "--arguments", "surface self-heal fixture", "--label", "surface heal"],
    ws558
  );
  const intents558 = join(ws558, "amadeus/spaces/default/intents");
  const dir558 = readdirSync(intents558).find((n) => n.includes("surface-heal"));
  check("(#558) fixture record が誕生する", dir558 !== undefined, readdirSync(intents558).join(", "));
  const graphPath558 = join(intents558, dir558!, "runtime-graph.json");
  const state558 = readFileSync(join(intents558, dir558!, "amadeus-state.md"), "utf8");
  const current558 = state558.match(/\*\*Current Stage\*\*: ([^\n]+)/)?.[1]?.trim() ?? "";
  check("(#558) Current Stage が解決できる", current558.length > 0, state558.slice(0, 200));

  // (a) 登録漏れ状態（graph 不在）からの surface 成立
  rmSync(graphPath558, { force: true });
  const surfaceRes = run(["bun", learnings558, "surface", "--slug", current558], ws558);
  check(
    "(#558a) 登録漏れ状態から surface が手動 compile なしで成立する（自己修復）",
    surfaceRes.exitCode === 0,
    `exit=${surfaceRes.exitCode} stderr=${surfaceRes.stderr.slice(0, 200)}`
  );
  check("(#558a) 自己修復で runtime-graph.json が再生成される", existsSync(graphPath558), graphPath558);

  // (b) 自動 compile でも解決しない場合は復旧手順つきエラー（exit 非 0）。
  // graph を消し、audit shard を STAGE_STARTED を含まない本文へ置き換える —
  // 再 compile は成功しても current slug の row が graph に載らないため、
  // 自己修復の再解決が尽きた経路（フォールバックのエラー文言）に入る。
  rmSync(graphPath558, { force: true });
  const auditDir558 = join(intents558, dir558!, "audit");
  for (const shard of readdirSync(auditDir558).filter((n) => n.endsWith(".md"))) {
    writeFileSync(join(auditDir558, shard), "# audit\n\n---\n\n## Note\n**Timestamp**: 2026-07-06T00:00:00Z\n**Event**: SESSION_STARTED\n\n---\n", "utf8");
  }
  const brokenRes = run(["bun", learnings558, "surface", "--slug", current558], ws558);
  check(
    "(#558b) 自動 compile でも解決しない場合は exit 非 0（無言 fail なし）",
    brokenRes.exitCode !== 0,
    `exit=${brokenRes.exitCode} stdout=${brokenRes.stdout.slice(0, 120)}`
  );
  check(
    "(#558b) エラーに復旧手順（amadeus-runtime.ts compile）が含まれる",
    /amadeus-runtime\.ts compile/.test(brokenRes.stderr + brokenRes.stdout),
    (brokenRes.stderr + brokenRes.stdout).slice(0, 300)
  );
}

// ---- cleanup ----

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("engine e2e eval: ok");
