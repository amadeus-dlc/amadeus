#!/usr/bin/env bun

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const fixture = join(root, "examples/03-inception-completed/.amadeus");
const discovery = "20260629-ec-site-construction";
const intent = "20260629-minimum-purchase-flow";
const newIntent = "20260702-eval-scaffold-intent";
const unit2 = "U002-order-creation";
const bolt1 = "B001-order-creation";
const validator = ".agents/skills/amadeus-validator/validator/AmadeusValidator.ts";
const scaffold = ".agents/skills/amadeus-validator/scripts/StateScaffold.ts";

const cleanups: string[] = [];

function fail(message: string): never {
  for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
  console.error(message);
  process.exit(1);
}

function run(command: string[], cwd = root): string {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode !== 0) {
    fail(["command failed: " + command.join(" "), "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
  return stdout;
}

function runExpectFailure(command: string[], expected: string, cwd = root): void {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const stdout = new TextDecoder().decode(result.stdout);
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode === 0) {
    fail(["command unexpectedly succeeded: " + command.join(" "), "expected:", expected].join("\n"));
  }
  if (!stdout.includes(expected) && !stderr.includes(expected)) {
    fail(["command failed without expected evidence: " + expected, "stdout:", stdout, "stderr:", stderr].join("\n"));
  }
}

function workspaceCopy(): string {
  const workspace = mkdtempSync(join(tmpdir(), "state-scaffold"));
  cleanups.push(workspace);
  cpSync(fixture, join(workspace, ".amadeus"), { recursive: true });
  updateDiscoveryCandidateStatus(workspace, "intent_record_created");
  return workspace;
}

function updateDiscoveryCandidateStatus(workspace: string, status: string): void {
  const path = join(workspace, `.amadeus/discoveries/${discovery}.md`);
  const text = readFileSync(path, "utf8");
  const updated = text
    .replace(/\| 販売管理の最小購入フロー \| (initialized|intent_record_created|recommended) \|/, `| 販売管理の最小購入フロー | ${status} |`)
    .replace("`initialized` は「販売管理の最小購入フロー」だけである。", `\`${status}\` は「販売管理の最小購入フロー」だけである。`)
    .replace("`intent_record_created` は「販売管理の最小購入フロー」だけである。", `\`${status}\` は「販売管理の最小購入フロー」だけである。`)
    .replace("初期化済みである。", "Intent Record 作成済みである。");
  writeFileSync(path, updated);
}

function intentRoot(workspace: string, target = intent): string {
  return join(workspace, ".amadeus/intents", target);
}

function statePath(workspace: string, target = intent): string {
  return join(intentRoot(workspace, target), "state.json");
}

function readState(workspace: string, target = intent): Record<string, any> {
  return JSON.parse(readFileSync(statePath(workspace, target), "utf8"));
}

function writeState(workspace: string, state: Record<string, any>, target = intent): void {
  writeFileSync(statePath(workspace, target), JSON.stringify(state, null, 2) + "\n");
}

function runScaffold(workspace: string, args: string[]): string {
  return run(["bun", "run", scaffold, workspace, ...args]);
}

function runValidator(workspace: string, target = intent): void {
  run(["bun", "run", validator, workspace, target]);
}

function assertDeepEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual, null, 2);
  const b = JSON.stringify(expected, null, 2);
  if (a !== b) fail([`assertion failed: ${label}`, "actual:", a, "expected:", b].join("\n"));
}

function assertIdempotent(workspace: string, args: string[], target = intent): void {
  const before = readFileSync(statePath(workspace, target), "utf8");
  runScaffold(workspace, args);
  const after = readFileSync(statePath(workspace, target), "utf8");
  if (before !== after) fail(`idempotency violated for: ${args.join(" ")}`);
}

function ensureConstructionScaffoldDocs(workspace: string): void {
  mkdirSync(join(intentRoot(workspace), "construction/bolts"), { recursive: true });
  writeFileSync(
    join(intentRoot(workspace), "construction/traceability.md"),
    ["# Construction Traceability", ""].join("\n"),
  );
  writeFileSync(
    join(intentRoot(workspace), "construction/decisions.md"),
    ["# Construction Decisions", "", "## 一覧", "", "| 識別子 | 概要 | 状態 | 依存 | 詳細 |", "|---|---|---|---|---|", "", "## 依存関係", "", "| 判断 | 依存 | 理由 |", "|---|---|---|", ""].join("\n"),
  );
}

function writeFunctionalDesignDocs(workspace: string): void {
  const base = join(intentRoot(workspace), `construction/${unit2}/functional-design`);
  mkdirSync(base, { recursive: true });
  writeFileSync(join(base, "business-logic-model.md"), ["# Business Logic Model", "", "## 概要", "", "- U002 は確認済み注文内容を受け取り、注文を作成済みにする。", "", "## 入力", "", "- 注文内容、購入者情報、販売可能在庫の参照結果を扱う。", "", "## 出力", "", "- 作成済み注文を返す。", ""].join("\n"));
  writeFileSync(join(base, "business-rules.md"), ["# Business Rules", "", "## ルール", "", "- 決済、売上確定、在庫引当、出荷は行わない。", ""].join("\n"));
  writeFileSync(join(base, "domain-entities.md"), ["# Domain Entities", "", "## エンティティ", "", "- 注文は注文内容、購入者情報、作成済み状態を持つ。", ""].join("\n"));
  writeFileSync(join(base, "frontend-components.md"), ["# Frontend Components", "", "## コンポーネント", "", "- 注文作成結果を表示する最小の表面を扱う。", ""].join("\n"));
}

function writeBoltDocs(workspace: string): void {
  const base = join(intentRoot(workspace), `construction/bolts/${bolt1}`);
  mkdirSync(base, { recursive: true });
  writeFileSync(
    join(base, "tasks.md"),
    [
      "# Construction Tasks",
      "",
      "- [ ] T001: 注文作成入力の契約を定義する",
      "  - 作業:",
      "    - 注文内容、購入者情報、販売可能在庫の参照結果を注文作成の必須入力として扱う。",
      "  - 要求: R004",
      "  - ユースケース: UC003",
      "  - 依存: なし",
      "  - 設計根拠: ../../U002-order-creation/functional-design/business-logic-model.md#入力",
      "  - 証拠: 未登録",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(base, "notes.md"),
    ["# Construction ノート", "", "## 実行方針", "", "- B001 の最小実装と検証を対象にする。", "", "## 対象タスク", "", "| タスク | 状態 | 方針 | 証拠 |", "|---|---|---|---|", "| T001 | 実装済み | 入力定義を確認する。 | test-results.md |", "", "## 未確認事項", "", "- なし", ""].join("\n"),
  );
}

const prUrl = "https://github.com/amadeus-dlc/amadeus/pull/999";

function writeTraceability(workspace: string, stage: "prepared" | "finalized"): void {
  const path = join(intentRoot(workspace), "construction/traceability.md");
  const taskRow = stage === "prepared"
    ? `| [tasks.md](bolts/${bolt1}/tasks.md) | B001/T001 | 未実施 | 未実施 | 未実施 | ready_for_approval |`
    : `| [tasks.md](bolts/${bolt1}/tasks.md) | B001/T001 | 注文作成入力の契約 | [test-results.md](bolts/${bolt1}/test-results.md) | [PR #999](${prUrl}) | verified |`;
  const lines = [
    "# Construction Traceability",
    "",
    "## Task Generation からの追跡",
    "",
    "| Evidence | Task | 実装 | 検証 | PR | 状態 |",
    "|---|---|---|---|---|---|",
    taskRow,
    "",
  ];
  if (stage === "finalized") {
    lines.push(
      "## Construction からの追跡",
      "",
      "| ボルト | タスク | 証拠 | 状態 |",
      "|---|---|---|---|",
      `| B001 | B001/T001 | [test-results.md](bolts/${bolt1}/test-results.md), [PR #999](${prUrl}) | verified |`,
      "",
    );
  }
  writeFileSync(path, lines.join("\n"));
}

function writePr(workspace: string): void {
  const base = join(intentRoot(workspace), `construction/bolts/${bolt1}`);
  writeFileSync(
    join(base, "pr.md"),
    ["# PR 記録", "", "## Pull Request", "", `- URL: [PR #999](${prUrl})`, "- 状態: merged", "", "## 対象", "", "| ボルト | タスク | 要求 |", "|---|---|---|", "| B001 | T001 | R004 |", "", "## 確認状況", "", "| 観点 | 状態 | 根拠 |", "|---|---|---|", "| CI | pass | eval 用の固定記録である。 |", ""].join("\n"),
  );
}

function writeTestResults(workspace: string): void {
  const base = join(intentRoot(workspace), `construction/bolts/${bolt1}`);
  writeFileSync(
    join(base, "test-results.md"),
    ["# テスト結果", "", "## 検証結果", "", "| テスト | コマンド | 結果 | 根拠 |", "|---|---|---|---|", "| 単体 | npm test | pass | ローカル実行 |", "", "## 安全性確認", "", "- 未確認", "", "## CI確認", "", "- 未確認", "", "## 受け入れ証拠", "", "| 要求 | タスク | 証拠 | 要約 |", "|---|---|---|---|", "| R004 | B001/T001 | npm test | 注文作成入力の契約を確認した。 |", ""].join("\n"),
  );
}

// ---- intent-capture: 新規 Intent の state.json を生成する ----

const captureWorkspace = workspaceCopy();
{
  const moduleSource = readFileSync(join(captureWorkspace, `.amadeus/intents/${intent}.md`), "utf8");
  writeFileSync(join(captureWorkspace, `.amadeus/intents/${newIntent}.md`), moduleSource);
  mkdirSync(join(captureWorkspace, ".amadeus/intents", newIntent), { recursive: true });
  const indexPath = join(captureWorkspace, ".amadeus/intents.md");
  const index = readFileSync(indexPath, "utf8");
  const listRow = `| ${newIntent} | eval 用の雛形生成対象。 | なし | [${newIntent}.md](intents/${newIntent}.md) |`;
  const depRow = `| ${newIntent} | なし | eval 用の独立 Intent であるため。 |`;
  const withList = index.replace(/\n\n## 依存関係/, `\n${listRow}\n\n## 依存関係`);
  writeFileSync(indexPath, withList.trimEnd() + `\n${depRow}\n`);

  runScaffold(captureWorkspace, ["intent-capture", "--intent", newIntent]);
  const state = readState(captureWorkspace, newIntent);
  if (state.phase !== "ideation" || state.status !== "in_progress") fail("intent-capture: phase または status が不正");
  if (state.ideation?.intentCapture?.status !== "completed") fail("intent-capture: intentCapture.status が不正");
  if (state.ideation?.gate !== "not_ready") fail("intent-capture: gate が不正");
  runValidator(captureWorkspace, newIntent);
  assertIdempotent(captureWorkspace, ["intent-capture", "--intent", newIntent], newIntent);

  // 進行中 ideation の既存値（requiredArtifacts など）を再実行で潰さない
  const progressed = readState(captureWorkspace, newIntent);
  progressed.ideation.requiredArtifacts = [`../${newIntent}.md`];
  writeState(captureWorkspace, progressed, newIntent);
  runScaffold(captureWorkspace, ["intent-capture", "--intent", newIntent]);
  const preserved = readState(captureWorkspace, newIntent);
  assertDeepEqual(preserved.ideation.requiredArtifacts, [`../${newIntent}.md`], "intent-capture の再実行は進行中 ideation の値を保持する");
}

// ---- inception-start / inception-complete: 既存 Intent の replay ----

const workspace = workspaceCopy();
const originalState = readState(workspace);
{
  const reduced = {
    intent: originalState.intent,
    phase: "ideation",
    status: "completed",
    ideation: originalState.ideation,
  };
  writeState(workspace, reduced);
  runValidator(workspace);

  runScaffold(workspace, ["inception-start", "--intent", intent]);
  const started = readState(workspace);
  if (started.phase !== "inception" || started.status !== "in_progress") fail("inception-start: phase または status が不正");
  if (started.inception?.gate !== "not_ready") fail("inception-start: gate が不正");
  assertDeepEqual(started.ideation, originalState.ideation, "inception-start は ideation ブロックを保持する");
  runValidator(workspace);
  assertIdempotent(workspace, ["inception-start", "--intent", intent]);

  // Codebase Analysis は stage skill の責務のため、eval が元の値を注入して stage 完了を再現する
  if (originalState.inception?.codebaseAnalysis) {
    const injected = readState(workspace);
    injected.inception.codebaseAnalysis = originalState.inception.codebaseAnalysis;
    writeState(workspace, injected);
  }

  runScaffold(workspace, ["inception-complete", "--intent", intent]);
  const completed = readState(workspace);
  if (completed.inception?.status !== "completed" || completed.inception?.gate !== "passed") fail("inception-complete: status または gate が不正");
  for (const key of [
    "requiredArtifacts",
    "requiredRequirementArtifacts",
    "requiredStoryArtifacts",
    "requiredUseCaseArtifacts",
    "requiredDecisionArtifacts",
    "requiredBoltArtifacts",
  ]) {
    const actual = [...(completed.inception?.[key] ?? [])].sort();
    const expected = [...(originalState.inception?.[key] ?? [])].sort();
    assertDeepEqual(actual, expected, `inception-complete の ${key} が snapshot と一致する`);
  }
  assertDeepEqual(completed.ideation, originalState.ideation, "inception-complete は ideation ブロックを保持する");
  runValidator(workspace);
  assertIdempotent(workspace, ["inception-complete", "--intent", intent]);
}

// ---- construction-start / functional-design / bolt-preparation / finalization ----

{
  ensureConstructionScaffoldDocs(workspace);
  runScaffold(workspace, ["construction-start", "--intent", intent]);
  const started = readState(workspace);
  if (started.phase !== "construction" || started.construction?.gate !== "not_ready") fail("construction-start: phase または gate が不正");
  assertDeepEqual(started.construction?.targetBolts, [], "construction-start の targetBolts は空で始まる");
  assertDeepEqual(started.construction?.functionalDesign?.targetUnits, [], "construction-start の targetUnits は空で始まる");
  assertDeepEqual(started.inception, readState(workspace).inception, "construction-start は inception ブロックを保持する");
  // validator は Bolt 準備済みの Bolt を 1 件以上要求するため、検証チェックポイントは bolt-preparation 後にある
  assertIdempotent(workspace, ["construction-start", "--intent", intent]);

  writeFunctionalDesignDocs(workspace);
  runScaffold(workspace, ["functional-design", "--intent", intent, "--unit", "U002", "--frontend-surface", "present"]);
  const withDesign = readState(workspace);
  const unitEntry = withDesign.construction?.functionalDesign?.units?.find((item: any) => item.unitId === "U002");
  if (!unitEntry || unitEntry.requirement !== "required" || unitEntry.status !== "passed") fail("functional-design: units エントリが不正");
  assertDeepEqual(withDesign.construction?.functionalDesign?.targetUnits, ["U002"], "functional-design が targetUnits へ追加する");
  if (unitEntry.frontendSurface !== "present") fail("functional-design: frontendSurface が不正");
  assertIdempotent(workspace, ["functional-design", "--intent", intent, "--unit", "U002", "--frontend-surface", "present"]);

  writeBoltDocs(workspace);
  writeTraceability(workspace, "prepared");
  runScaffold(workspace, ["bolt-preparation", "--intent", intent, "--bolt", bolt1, "--unit", unit2]);
  const prepared = readState(workspace);
  const boltEntry = prepared.construction?.bolts?.find((item: any) => item.id === "B001");
  if (!boltEntry || boltEntry.taskGeneration?.status !== "ready_for_approval") fail("bolt-preparation: taskGeneration が不正");
  assertDeepEqual(prepared.construction?.targetBolts, ["B001"], "bolt-preparation が targetBolts へ追加する");
  const kinds = boltEntry.taskGeneration.evidence.map((item: any) => item.kind);
  for (const kind of ["functional_design", "unit_design_brief", "bolt_module", "tasks", "notes"]) {
    if (!kinds.includes(kind)) fail(`bolt-preparation: evidence に ${kind} がない`);
  }
  for (const item of boltEntry.taskGeneration.evidence) {
    if (!existsSync(join(intentRoot(workspace), item.path))) fail(`bolt-preparation: evidence path が存在しない: ${item.path}`);
  }
  runValidator(workspace);
  assertIdempotent(workspace, ["bolt-preparation", "--intent", intent, "--bolt", bolt1, "--unit", unit2]);

  // construction-start の再実行は、所有項目（status、gate）を再適用し、Bolt 準備の結果を保持する
  const staleState = readState(workspace);
  staleState.construction.status = "needs_changes";
  writeState(workspace, staleState);
  runScaffold(workspace, ["construction-start", "--intent", intent]);
  const reapplied = readState(workspace);
  if (reapplied.construction.status !== "in_progress") fail("construction-start: 再実行が所有項目 status を再適用しない");
  if (!reapplied.construction.bolts?.find((item: any) => item.id === "B001")) fail("construction-start: 再実行が Bolt 準備の結果を保持しない");
  assertDeepEqual(reapplied.construction.targetBolts, ["B001"], "construction-start の再実行は targetBolts を保持する");

  // Task Generation Gate の人間承認は eval が再現する（承認は skill と人間の責務）
  const approvedState = readState(workspace);
  const approvedBolt = approvedState.construction.bolts.find((item: any) => item.id === "B001");
  approvedBolt.taskGeneration.status = "passed";
  approvedBolt.taskGeneration.evidence.push({ kind: "approval", path: `construction/bolts/${bolt1}/notes.md` });
  writeState(workspace, approvedState);
  const evidenceBeforeFinalization = JSON.parse(JSON.stringify(approvedBolt.taskGeneration.evidence));

  writeTestResults(workspace);
  writePr(workspace);
  writeTraceability(workspace, "finalized");
  // 手書きで欠落した追跡を finalization の再走査が補完する
  const missingArtifacts = readState(workspace);
  missingArtifacts.construction.requiredBoltArtifacts = missingArtifacts.construction.requiredBoltArtifacts.filter(
    (path: string) => !path.endsWith("/tasks.md"),
  );
  writeState(workspace, missingArtifacts);
  runScaffold(workspace, ["finalization", "--intent", intent]);
  const finalized = readState(workspace);
  if (finalized.status !== "completed" || finalized.construction?.status !== "completed" || finalized.construction?.gate !== "passed") {
    fail("finalization: status または gate が不正");
  }
  for (const file of ["tasks.md", "notes.md", "test-results.md", "pr.md"]) {
    if (!finalized.construction.requiredBoltArtifacts.includes(`construction/bolts/${bolt1}/${file}`)) {
      fail(`finalization: requiredBoltArtifacts に ${file} がない`);
    }
  }
  const finalBolt = finalized.construction.bolts.find((item: any) => item.id === "B001");
  assertDeepEqual(finalBolt.taskGeneration.evidence, evidenceBeforeFinalization, "finalization は taskGeneration evidence を保持する");
  runValidator(workspace);
  assertIdempotent(workspace, ["finalization", "--intent", intent]);
}

// ---- 不正入力 ----

runExpectFailure(["bun", "run", scaffold, workspace, "unknown-transition", "--intent", intent], "intent-capture");
runExpectFailure(["bun", "run", scaffold, workspace, "functional-design", "--intent", intent], "--unit");

for (const dir of cleanups) rmSync(dir, { recursive: true, force: true });
console.log("state scaffold eval: ok");
