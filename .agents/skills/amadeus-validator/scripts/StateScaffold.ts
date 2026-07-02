#!/usr/bin/env bun
// phase 遷移時の state.json 雛形を生成、更新する同梱スクリプト。
// 使い方:
//   bun run StateScaffold.ts <workspace> <transition> --intent <intent-dir> [補助引数]
// 遷移種別:
//   intent-capture       --intent <intent-dir>
//   inception-start      --intent <intent-dir>
//   inception-complete   --intent <intent-dir>
//   construction-start   --intent <intent-dir>
//   functional-design    --intent <intent-dir> --unit <unit-id> [--frontend-surface absent|present]
//   bolt-preparation     --intent <intent-dir> --bolt <bolt-dir> --unit <unit-dir>
//   finalization         --intent <intent-dir>
// 更新は対象遷移が定義する項目だけを設定し、既存の値と他 phase のブロックを保持する。
// construction-start と functional-design の直後は、validator が Bolt 準備済みの Bolt を 1 件以上要求するため、
// 検証チェックポイントは最初の bolt-preparation 完了後にする。
// 必須成果物配列と evidence には、実在するファイルだけを含める。

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { taskGenerationContract } from "../validator/generated/task-generation-contract";

const transitions = [
  "intent-capture",
  "inception-start",
  "inception-complete",
  "construction-start",
  "functional-design",
  "bolt-preparation",
  "finalization",
] as const;

type Transition = (typeof transitions)[number];
type State = Record<string, any>;

function fail(message: string): never {
  console.error(message);
  console.error(`利用できる遷移種別: ${transitions.join(", ")}`);
  process.exit(1);
}

function assertContractValue(kind: "status" | "evidenceKind", value: string): string {
  const allowed = kind === "status" ? taskGenerationContract.statuses : taskGenerationContract.evidenceKinds;
  if (!(allowed as readonly string[]).includes(value)) {
    fail(`生成済み契約にない値です: ${kind}=${value}`);
  }
  return value;
}

const args = process.argv.slice(2);
if (args.length < 2) fail("引数が不足しています: <workspace> <transition> --intent <intent-dir>");
const workspace = resolve(args[0]);
const transition = args[1] as Transition;
if (!transitions.includes(transition)) fail(`不正な遷移種別です: ${transition}`);

const options = new Map<string, string>();
for (let index = 2; index < args.length; index += 2) {
  const key = args[index];
  const value = args[index + 1];
  if (!key?.startsWith("--") || value === undefined) fail(`不正なオプションです: ${key ?? "(なし)"}`);
  options.set(key.slice(2), value);
}

const intentDir = options.get("intent");
if (!intentDir) fail("--intent <intent-dir> が必要です");
const intentRoot = join(workspace, ".amadeus/intents", intentDir);
if (!existsSync(intentRoot)) fail(`対象 Intent ディレクトリが存在しません: ${intentRoot}`);
const statePath = join(intentRoot, "state.json");

function readState(): State {
  if (!existsSync(statePath)) fail(`state.json が存在しません: ${statePath}`);
  return JSON.parse(readFileSync(statePath, "utf8"));
}

function writeState(state: State): void {
  writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
}

function intentRelativeExists(path: string): boolean {
  return existsSync(join(intentRoot, path));
}

function listMarkdown(path: string): string[] {
  const target = join(intentRoot, path);
  if (!existsSync(target)) return [];
  return readdirSync(target)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => `${path}/${name}`);
}

function listDirectories(path: string): string[] {
  const target = join(intentRoot, path);
  if (!existsSync(target)) return [];
  return readdirSync(target)
    .filter((name) => statSync(join(target, name)).isDirectory())
    .sort();
}

function identifierOf(directoryName: string): string {
  return directoryName.split("-", 1)[0];
}

function appendMissing(list: string[], entries: string[]): string[] {
  const result = [...list];
  for (const entry of entries) {
    if (!result.includes(entry)) result.push(entry);
  }
  return result;
}

const summary: string[] = [];

function applyIntentCapture(): void {
  const defaults: State = {
    intent: intentDir,
    phase: "ideation",
    status: "in_progress",
  };
  const ideationDefaults: State = {
    status: "in_progress",
    intentCapture: {
      status: "completed",
      createdArtifacts: [`../${intentDir}.md`, "state.json"],
      next: "ideation/scope-framing",
    },
    requiredArtifacts: [],
    requiredMocks: [],
    gate: "not_ready",
  };
  if (!existsSync(statePath)) {
    writeState({ ...defaults, ideation: ideationDefaults });
    summary.push("ideation 開始の state.json を生成");
    return;
  }
  const existing = JSON.parse(readFileSync(statePath, "utf8"));
  const inProgressIdeation = existing.phase === "ideation" && existing.ideation?.status === "in_progress";
  if (!inProgressIdeation) fail("既存の state.json が進行済みのため、intent-capture では上書きしません");
  const state: State = {
    ...defaults,
    ...existing,
    ideation: {
      ...ideationDefaults,
      ...existing.ideation,
      intentCapture: existing.ideation?.intentCapture ?? ideationDefaults.intentCapture,
    },
  };
  writeState(state);
  summary.push("ideation 開始の state.json を補完（既存の値を保持）");
}

function inceptionArtifactArrays(): State {
  const unitDirectories = listDirectories("inception/units");
  const requiredArtifacts = [
    "inception/requirements.md",
    "inception/acceptance.md",
    ...(intentRelativeExists("inception/user-stories.md") ? ["inception/user-stories.md"] : []),
    "inception/use-cases.md",
    ...(intentRelativeExists("inception/codebase-analysis.md") ? ["inception/codebase-analysis.md"] : []),
    "inception/units.md",
    ...unitDirectories.map((name) => `inception/units/${name}.md`),
    ...unitDirectories.map((name) => `inception/units/${name}/design.md`),
    "inception/bolts.md",
    "inception/traceability.md",
    "inception/decisions.md",
  ].filter((path) => intentRelativeExists(path));
  return {
    requiredArtifacts,
    requiredRequirementArtifacts: listMarkdown("inception/requirements"),
    requiredStoryArtifacts: listMarkdown("inception/user-stories"),
    requiredUseCaseArtifacts: listMarkdown("inception/use-cases"),
    requiredDecisionArtifacts: listMarkdown("inception/decisions"),
    requiredBoltArtifacts: listMarkdown("inception/bolts"),
  };
}

const codebaseAnalysisDefault = {
  requirement: "unresolved",
  status: "blocked",
  blockedReason: "target_scope_unresolved",
  evidence: [],
  targetScope: [],
};

function applyInceptionStart(): void {
  const state = readState();
  const existing = state.inception ?? {};
  if (existing.status === "completed") {
    summary.push("inception は完了済みのため変更なし");
    return;
  }
  state.phase = "inception";
  state.status = "in_progress";
  state.inception = {
    ...existing,
    status: "in_progress",
    codebaseAnalysis: existing.codebaseAnalysis ?? codebaseAnalysisDefault,
    ...inceptionArtifactArrays(),
    gate: "not_ready",
  };
  writeState(state);
  summary.push("inception ブロックを追加（必須成果物は実在ファイルの走査で確定）");
}

function applyInceptionComplete(): void {
  const state = readState();
  const inception = state.inception ?? {};
  state.phase = "inception";
  state.status = "completed";
  state.inception = {
    ...inception,
    status: "completed",
    codebaseAnalysis: inception.codebaseAnalysis ?? codebaseAnalysisDefault,
    ...inceptionArtifactArrays(),
    gate: "passed",
  };
  writeState(state);
  summary.push("inception を完了へ更新（必須成果物は実在ファイルの走査で確定）");
}

function applyConstructionStart(): void {
  const state = readState();
  const existing = state.construction ?? {};
  if (existing.status === "completed") {
    summary.push("construction は完了済みのため変更なし");
    return;
  }
  state.phase = "construction";
  state.status = "in_progress";
  state.construction = {
    ...existing,
    status: "in_progress",
    gate: "not_ready",
    requiredArtifacts: appendMissing(
      existing.requiredArtifacts ?? [],
      ["construction/traceability.md", "construction/decisions.md"].filter((path) => intentRelativeExists(path)),
    ),
    requiredBoltArtifacts: existing.requiredBoltArtifacts ?? [],
    bolts: existing.bolts ?? [],
    targetBolts: existing.targetBolts ?? [],
    functionalDesign: {
      targetUnits: [],
      units: [],
      ...(existing.functionalDesign ?? {}),
    },
  };
  writeState(state);
  summary.push("construction ブロックを追加（遷移が所有する項目を再適用し、他の値は保持）");
}

function applyFunctionalDesign(): void {
  const unitOption = options.get("unit");
  if (!unitOption) fail("functional-design には --unit <unit-id> が必要です");
  const unitId = identifierOf(unitOption);
  const frontendSurface = options.get("frontend-surface") ?? "absent";
  if (frontendSurface !== "absent" && frontendSurface !== "present") fail("--frontend-surface は absent または present です");
  const state = readState();
  const construction = state.construction ?? fail("construction ブロックがありません。先に construction-start を実行してください");
  const functionalDesign = construction.functionalDesign ?? { targetUnits: [unitId], units: [] };
  const units: State[] = functionalDesign.units ?? [];
  const existing = units.find((item) => item.unitId === unitId);
  const entry = {
    unitId,
    requirement: "required",
    status: "passed",
    frontendSurface,
    targetSource: "construction_target_bolts",
    runMode: existing?.runMode ?? "initial",
  };
  functionalDesign.units = [...units.filter((item) => item.unitId !== unitId), entry].sort((a, b) => a.unitId.localeCompare(b.unitId));
  functionalDesign.targetUnits = appendMissing(functionalDesign.targetUnits ?? [], [unitId]);
  construction.functionalDesign = functionalDesign;
  writeState(state);
  summary.push(`functionalDesign.units に ${unitId} を反映`);
}

function applyBoltPreparation(): void {
  const boltDir = options.get("bolt");
  const unitDir = options.get("unit");
  if (!boltDir) fail("bolt-preparation には --bolt <bolt-dir> が必要です");
  if (!unitDir) fail("bolt-preparation には --unit <unit-dir> が必要です");
  const boltId = identifierOf(boltDir);
  const state = readState();
  if (!state.construction) applyConstructionStart();
  const stateAfterStart = state.construction ? state : readState();
  const construction = stateAfterStart.construction;

  const evidence: Array<{ kind: string; path: string }> = [];
  const push = (kind: string, path: string) => {
    if (intentRelativeExists(path)) evidence.push({ kind: assertContractValue("evidenceKind", kind), path });
  };
  for (const name of ["business-logic-model.md", "business-rules.md", "domain-entities.md", "frontend-components.md"]) {
    push("functional_design", `construction/${unitDir}/functional-design/${name}`);
  }
  push("unit_design_brief", `inception/units/${unitDir}/design.md`);
  push("bolt_module", `inception/bolts/${boltDir}.md`);
  push("tasks", `construction/bolts/${boltDir}/tasks.md`);
  push("notes", `construction/bolts/${boltDir}/notes.md`);

  const bolts: State[] = construction.bolts ?? [];
  const existing = bolts.find((item) => item.id === boltId);
  if (existing?.taskGeneration?.status === "passed") {
    summary.push(`${boltId} は承認済みのため変更なし`);
    return;
  }
  const entry = {
    id: boltId,
    taskGeneration: {
      status: assertContractValue("status", "ready_for_approval"),
      evidence,
    },
  };
  construction.bolts = [...bolts.filter((item) => item.id !== boltId), entry].sort((a, b) => a.id.localeCompare(b.id));
  construction.targetBolts = appendMissing(construction.targetBolts ?? [], [boltId]);
  construction.requiredBoltArtifacts = appendMissing(
    construction.requiredBoltArtifacts ?? [],
    [`construction/bolts/${boltDir}/tasks.md`, `construction/bolts/${boltDir}/notes.md`].filter((path) => intentRelativeExists(path)),
  );
  writeState(stateAfterStart);
  summary.push(`${boltId} の taskGeneration を ready_for_approval で反映`);
}

function applyFinalization(): void {
  const state = readState();
  const construction = state.construction ?? fail("construction ブロックがありません。先に construction-start を実行してください");
  const boltDirectories = listDirectories("construction/bolts");
  const evidenceArtifacts = boltDirectories.flatMap((name) =>
    ["tasks.md", "notes.md", "test-results.md", "pr.md"].map((file) => `construction/bolts/${name}/${file}`).filter((path) => intentRelativeExists(path)),
  );
  construction.requiredArtifacts = appendMissing(
    construction.requiredArtifacts ?? [],
    ["construction/traceability.md", "construction/decisions.md"].filter((path) => intentRelativeExists(path)),
  );
  construction.requiredBoltArtifacts = appendMissing(construction.requiredBoltArtifacts ?? [], evidenceArtifacts);
  construction.status = "completed";
  construction.gate = "passed";
  state.status = "completed";
  writeState(state);
  summary.push("construction を完了へ更新（phase 配下の実在ファイルを再走査して追跡へ追加）");
}

switch (transition) {
  case "intent-capture":
    applyIntentCapture();
    break;
  case "inception-start":
    applyInceptionStart();
    break;
  case "inception-complete":
    applyInceptionComplete();
    break;
  case "construction-start":
    applyConstructionStart();
    break;
  case "functional-design":
    applyFunctionalDesign();
    break;
  case "bolt-preparation":
    applyBoltPreparation();
    break;
  case "finalization":
    applyFinalization();
    break;
}

console.log(`state scaffold: ${transition} ${intentDir}`);
for (const line of summary) console.log(`- ${line}`);
