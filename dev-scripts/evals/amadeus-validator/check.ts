#!/usr/bin/env bun

// amadeus-validator のコードレベル検証。
// steering テンプレートから合成した一時 workspace を使い、workspace 検証と
// schemaVersion 2（v2 互換ライフサイクル）の Intent 検証を確認する。
// 旧契約（schemaVersion 1 の Intent、Discovery）のシナリオは #369 の退役 wave で削除した。

import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { buildIntentsIndex } from "../../../.agents/skills/amadeus-validator/scripts/IndexGenerate";

const root = resolve(import.meta.dir, "../../..");
const validator = ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts";
const steeringTemplates = join(root, ".agents/skills/amadeus-steering/templates/steering");

const cleanups: string[] = [];

function fail(message: string): never {
  for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
  console.error(message);
  process.exit(1);
}

function run(command: string[], cwd = root): string {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stdout;
}

function runExpectFailure(command: string[], expected: string, cwd = root): void {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode === 0) {
    fail(["command unexpectedly succeeded: " + command.join(" "), "expected:", expected, "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  if (!stdout.includes(expected) && !stderr.includes(expected)) {
    fail(["command failed without expected evidence: " + expected, "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
}

function runExpectSuccessIncludes(command: string[], expected: string, cwd = root): void {
  const stdout = run(command, cwd);
  if (!stdout.includes(expected)) {
    fail(["command succeeded without expected evidence: " + expected, "stdout:", stdout].join("\n"));
  }
}

function runExpectSuccessExcludes(command: string[], excluded: string, cwd = root): void {
  const stdout = run(command, cwd);
  if (stdout.includes(excluded)) {
    fail(["command succeeded but output unexpectedly includes: " + excluded, "stdout:", stdout].join("\n"));
  }
}

// steering テンプレートから最小の有効な workspace を合成する。
function workspaceCopy(): string {
  const workspace = mkdtempSync(join(tmpdir(), "amadeus-validator"));
  cleanups.push(workspace);
  cpSync(steeringTemplates, join(workspace, ".amadeus"), { recursive: true });
  for (const file of listFiles(join(workspace, ".amadeus"))) {
    const text = readFileSync(file, "utf8");
    if (text.includes("<product-name>")) {
      writeFileSync(file, text.replaceAll("<product-name>", "検証対象プロダクト"));
    }
  }
  regenerateSharedIndexes(workspace);
  return workspace;
}

function listFiles(path: string): string[] {
  return readdirSync(path).flatMap((entry) => {
    const next = join(path, entry);
    return statSync(next).isDirectory() ? listFiles(next) : [next];
  });
}

function regenerateSharedIndexes(workspace: string): void {
  writeFileSync(join(workspace, ".amadeus/intents.md"), buildIntentsIndex(workspace));
}

// ---- workspace 検証 ----

// (W1) steering テンプレート由来の workspace は Intent 指定なしで pass する。
const happyWorkspace = workspaceCopy();
runExpectSuccessIncludes(["bun", "run", validator, happyWorkspace], "pass");

// (W2) 退役確認: 検証結果に Discovery の検査が現れない（discoveries.md を要求しない）。
runExpectSuccessExcludes(["bun", "run", validator, happyWorkspace], "discoveries.md");

// (W3) steering 成果物の欠落は fail になる。
const brokenSteeringWorkspace = workspaceCopy();
rmSync(join(brokenSteeringWorkspace, ".amadeus/steering/objective.md"));
runExpectFailure(
  ["bun", "run", validator, brokenSteeringWorkspace],
  "steering の目的一覧が存在する",
);

// (W4) intents.md の未再生成は Index 生成整合の fail になる。
const staleIndexWorkspace = workspaceCopy();
writeFileSync(
  join(staleIndexWorkspace, ".amadeus/intents.md"),
  "# インテント\n\n## 一覧\n\n手動編集された索引。\n",
);
runExpectFailure(
  ["bun", "run", validator, staleIndexWorkspace],
  "Index 生成整合",
);

// ---- schemaVersion 2（v2 互換ライフサイクル）の Intent 検証 ----

const v2Intent = "20260703-fix-login-timeout";

function v2IntentModule(): string {
  return [
    "# インテント：ログインタイムアウトの修正",
    "",
    "## 概要",
    "",
    "ログインが 30 秒でタイムアウトする不具合を修正する。",
    "",
    "## 依存",
    "",
    "| 依存 | 理由 |",
    "|---|---|",
    "| なし | 単独で完了判断できるため。 |",
    "",
    "## 目標プロファイル",
    "",
    "| フィールド | 値 | 説明 |",
    "|---|---|---|",
    "| goalType | technical | 既存不具合の修正である。 |",
    "| scope | bugfix | 既存コードの特定バグ修正である。 |",
    "| labels | 未確認 | 補足分類は未確認。 |",
    "",
    "## 目的",
    "",
    "ログインの不当なタイムアウトを解消する。",
    "",
    "## 対象",
    "",
    "ログインする利用者。",
    "",
    "## 成功条件",
    "",
    "- 通常負荷でログインがタイムアウトしない。",
    "",
    "## 契機",
    "",
    "利用者からの障害報告。",
    "",
    "## 範囲",
    "",
    "含めるもの:",
    "",
    "- タイムアウト原因の修正。",
    "",
    "含めないもの:",
    "",
    "- 認証方式の変更。",
    "",
  ].join("\n");
}

function v2State(): Record<string, any> {
  return {
    schemaVersion: 2,
    intentId: v2Intent,
    scope: "bugfix",
    depth: "Minimal",
    status: "in_progress",
    phase: "inception",
    currentStage: "requirements-analysis",
    stages: {
      "reverse-engineering": {
        state: "completed",
        approval: { approvedAt: "2026-07-03T10:00:00+09:00", via: "conversation" },
      },
      "requirements-analysis": { state: "active" },
      "code-generation": { state: "pending" },
      "build-and-test": { state: "pending" },
    },
    phaseGates: { ideation: { skipped: true } },
  };
}

function addV2Intent(workspace: string, state: Record<string, any> = v2State()): void {
  const dir = join(workspace, ".amadeus/intents", v2Intent);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(workspace, ".amadeus/intents", `${v2Intent}.md`), v2IntentModule());
  writeFileSync(join(dir, "state.json"), `${JSON.stringify(state, null, 2)}\n`);
  regenerateSharedIndexes(workspace);
}

const v2HappyWorkspace = workspaceCopy();
addV2Intent(v2HappyWorkspace);
runExpectSuccessIncludes(
  ["bun", "run", validator, v2HappyWorkspace, v2Intent],
  "v2 ライフサイクル",
);

// (V0) 旧契約の拒否: schemaVersion 1 の Intent は v1 契約として検証せず、schemaVersion の不一致として fail する。
const v1RejectedWorkspace = workspaceCopy();
{
  const state = v2State();
  state.schemaVersion = 1;
  addV2Intent(v1RejectedWorkspace, state);
}
runExpectFailure(
  ["bun", "run", validator, v1RejectedWorkspace, v2Intent],
  "`schemaVersion` が 2 である",
);

const v2BadScopeWorkspace = workspaceCopy();
{
  const state = v2State();
  state.scope = "feature-x";
  addV2Intent(v2BadScopeWorkspace, state);
}
runExpectFailure(
  ["bun", "run", validator, v2BadScopeWorkspace, v2Intent],
  "`scope` が既知の値である",
);

const v2StageSetWorkspace = workspaceCopy();
{
  const state = v2State();
  state.stages["market-research"] = { state: "pending" };
  addV2Intent(v2StageSetWorkspace, state);
}
runExpectFailure(
  ["bun", "run", validator, v2StageSetWorkspace, v2Intent],
  "`stages` のキー集合が scope の実行対象と一致する",
);

const v2MissingGateWorkspace = workspaceCopy();
{
  const state = v2State();
  state.phaseGates = {};
  addV2Intent(v2MissingGateWorkspace, state);
}
runExpectFailure(
  ["bun", "run", validator, v2MissingGateWorkspace, v2Intent],
  "先行 phase の `phaseGates` が記録されている",
);

const v2MissingArtifactWorkspace = workspaceCopy();
{
  const state = v2State();
  state.stages["requirements-analysis"] = {
    state: "completed",
    approval: { approvedAt: "2026-07-03T11:00:00+09:00", via: "conversation" },
  };
  state.currentStage = "code-generation";
  addV2Intent(v2MissingArtifactWorkspace, state);
}
runExpectFailure(
  ["bun", "run", validator, v2MissingArtifactWorkspace, v2Intent],
  "completed のステージは必須成果物を持つ",
);

const v2MissingApprovalWorkspace = workspaceCopy();
{
  const state = v2State();
  state.stages["reverse-engineering"] = { state: "completed" };
  addV2Intent(v2MissingApprovalWorkspace, state);
}
runExpectFailure(
  ["bun", "run", validator, v2MissingApprovalWorkspace, v2Intent],
  "completed のステージは approval evidence を持つ",
);

const v2CurrentStageWorkspace = workspaceCopy();
{
  const state = v2State();
  state.currentStage = "intent-capture";
  addV2Intent(v2CurrentStageWorkspace, state);
}
runExpectFailure(
  ["bun", "run", validator, v2CurrentStageWorkspace, v2Intent],
  "`currentStage` が scope の実行対象である",
);

const v2EmptyUnitsWorkspace = workspaceCopy();
{
  const state = v2State();
  state.phase = "construction";
  state.currentStage = "code-generation";
  state.stages["requirements-analysis"] = {
    state: "completed",
    approval: { approvedAt: "2026-07-03T11:00:00+09:00", via: "conversation" },
  };
  state.stages["code-generation"] = { units: {} };
  state.phaseGates = {
    ideation: { skipped: true },
    inception: { approvedAt: "2026-07-03T12:00:00+09:00", via: "pr", reference: "https://example.test/pr/1" },
  };
  addV2Intent(v2EmptyUnitsWorkspace, state);
  mkdirSync(join(v2EmptyUnitsWorkspace, ".amadeus/intents", v2Intent, "inception/requirements-analysis"), { recursive: true });
  writeFileSync(
    join(v2EmptyUnitsWorkspace, ".amadeus/intents", v2Intent, "inception/requirements-analysis/requirements.md"),
    "# Requirements\n\n## 一覧\n\n| ID | 要求 | 由来する成功条件 |\n|---|---|---|\n| R001 | タイムアウトしない | 成功条件 1 |\n",
  );
}
runExpectFailure(
  ["bun", "run", validator, v2EmptyUnitsWorkspace, v2Intent],
  "Unit 単位ステージの `units` が空ではない",
);

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("amadeus validator eval: ok");
