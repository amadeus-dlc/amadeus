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

const intentsRoot = join(workspace, "aidlc/spaces/default/intents");
const recordDirName = readdirSync(intentsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)[0];
check("Intent record ディレクトリが作られている", recordDirName !== undefined, birthStdout);
const recordDir = join(intentsRoot, recordDirName!);
check("aidlc-state.md が存在する", existsSync(join(recordDir, "aidlc-state.md")), recordDir);

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
const bornState = readFileSync(join(recordDir, "aidlc-state.md"), "utf8");
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

// ---- cleanup ----

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("engine e2e eval: ok");
