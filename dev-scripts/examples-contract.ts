// examples snapshot の共有契約。
// 各 snapshot の段階不変条件（aidlc-state.md のフィールドと checkbox、成果物の存在と不在）をここで一元定義し、
// generator（生成直後の検査）と validate-amadeus-examples（コミット済みツリーの --invariants 検査）の
// 両方が同じ定義を使う。二重定義による鏡映漏れを構造的に防ぐ。

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { checkboxStateName, parseAidlcState } from "../.agents/skills/amadeus-validator/validator/aidlc-state-contract";

export const exampleIntentId = "260703-minimum-purchase-flow";

export const exampleSnapshots = [
  "examples/01-ideation-completed",
  "examples/02-inception-completed",
  "examples/03-construction-design-ready",
  "examples/04-construction-implementation-planned",
];

// stateFields は aidlc-state.md のフィールド行（**Key**: value）の期待値。
// nonEmptyFields は空でないことだけを求めるフィールド。
// phaseProgress は Phase Progress の期待値。
// stageMarks は unit を持たないステージ行の checkbox 状態名（Pending / Active / AwaitingApproval / Revising / Completed / Skipped）。
// unitStageMarks は Per unit ブロックの全 unit が期待状態であること。files / absentFiles の `<unit>` は unit 識別子に置換する。
// files / absentFiles は record ディレクトリからの相対パターン（1 セグメントだけ `*` を許可）。
export type SnapshotInvariant = {
  snapshot: string;
  stateFields: Record<string, string>;
  nonEmptyFields?: string[];
  phaseProgress?: Record<string, string>;
  stageMarks?: Record<string, string>;
  unitStageMarks?: Array<{ stage: string; state: string; files?: string[]; absentFiles?: string[] }>;
  files?: string[];
  absentFiles?: string[];
};

const functionalDesignUnitFiles = [
  "construction/<unit>/functional-design/business-logic-model.md",
  "construction/<unit>/functional-design/business-rules.md",
  "construction/<unit>/functional-design/domain-entities.md",
];

export const snapshotInvariants: SnapshotInvariant[] = [
  {
    snapshot: "examples/01-ideation-completed",
    stateFields: {
      Scope: "feature",
      Status: "Running",
      "Lifecycle Phase": "INCEPTION",
    },
    phaseProgress: { Ideation: "Verified" },
    stageMarks: {
      "intent-capture": "Completed",
      "scope-definition": "Completed",
      "approval-handoff": "Completed",
    },
    files: [
      "ideation/intent-capture/intent-statement.md",
      "ideation/scope-definition/scope-document.md",
      "ideation/scope-definition/intent-backlog.md",
      "ideation/approval-handoff/initiative-brief.md",
      "ideation/decisions.md",
      "ideation/traceability.md",
    ],
  },
  {
    snapshot: "examples/02-inception-completed",
    stateFields: {
      Scope: "feature",
      Status: "Running",
      "Lifecycle Phase": "CONSTRUCTION",
    },
    phaseProgress: { Ideation: "Verified", Inception: "Verified" },
    stageMarks: {
      "requirements-analysis": "Completed",
      "units-generation": "Completed",
      "delivery-planning": "Completed",
    },
    files: [
      "inception/requirements-analysis/requirements.md",
      "inception/units-generation/unit-of-work.md",
      "inception/units-generation/unit-of-work-dependency.md",
      "inception/delivery-planning/bolt-plan.md",
    ],
  },
  {
    snapshot: "examples/03-construction-design-ready",
    stateFields: {
      Scope: "feature",
      Status: "Running",
      "Lifecycle Phase": "CONSTRUCTION",
    },
    phaseProgress: { Ideation: "Verified", Inception: "Verified", Construction: "Active" },
    nonEmptyFields: ["Bolt Refs"],
    unitStageMarks: [
      { stage: "functional-design", state: "Completed", files: functionalDesignUnitFiles },
      { stage: "code-generation", state: "Pending" },
    ],
    absentFiles: ["construction/*/code-generation/code-generation-plan.md", "construction/*/code-generation/code-summary.md"],
  },
  {
    // 04 は 03 の累積であり、functional-design の不変条件も維持されることを再検査する。
    snapshot: "examples/04-construction-implementation-planned",
    stateFields: {
      Scope: "feature",
      Status: "Running",
      "Lifecycle Phase": "CONSTRUCTION",
    },
    phaseProgress: { Ideation: "Verified", Inception: "Verified", Construction: "Active" },
    nonEmptyFields: ["Bolt Refs"],
    unitStageMarks: [
      { stage: "functional-design", state: "Completed", files: functionalDesignUnitFiles },
      {
        stage: "code-generation",
        state: "Active",
        files: ["construction/<unit>/code-generation/code-generation-plan.md"],
        absentFiles: ["construction/<unit>/code-generation/code-summary.md"],
      },
    ],
    absentFiles: ["construction/*/code-generation/code-summary.md"],
  },
];

export function invariantForSnapshot(snapshot: string): SnapshotInvariant {
  const invariant = snapshotInvariants.find((entry) => entry.snapshot === snapshot);
  if (!invariant) throw new Error(`snapshot の不変条件が定義されていません: ${snapshot}`);
  return invariant;
}

// 1 セグメントだけ `*` を許可する簡易パターンで、base 配下の存在を確認する。
export function matchExists(base: string, pattern: string): boolean {
  const segments = pattern.split("/");
  let candidates = [base];
  for (const segment of segments) {
    const next: string[] = [];
    for (const candidate of candidates) {
      if (segment === "*") {
        if (!existsSync(candidate) || !statSync(candidate).isDirectory()) continue;
        for (const entry of readdirSync(candidate)) next.push(join(candidate, entry));
      } else {
        const target = join(candidate, segment);
        if (existsSync(target)) next.push(target);
      }
    }
    candidates = next;
    if (candidates.length === 0) return false;
  }
  return candidates.length > 0;
}

type FailFn = (message: string) => never;
type ParsedState = ReturnType<typeof parseAidlcState>;

function checkStateFields(invariant: SnapshotInvariant, doc: ParsedState, fail: FailFn): void {
  for (const [key, expected] of Object.entries(invariant.stateFields)) {
    const actual = String(doc.fields[key] ?? "");
    if (actual !== expected) {
      fail(`${invariant.snapshot}: aidlc-state.md の ${key} が期待値と一致しません（期待: ${expected}、実際: ${actual === "" ? "未設定" : actual}）`);
    }
  }
  for (const key of invariant.nonEmptyFields ?? []) {
    if (String(doc.fields[key] ?? "").trim() === "") {
      fail(`${invariant.snapshot}: aidlc-state.md の ${key} が空です`);
    }
  }
  for (const [phase, expected] of Object.entries(invariant.phaseProgress ?? {})) {
    const actual = String(doc.phaseProgress[phase] ?? "");
    if (actual !== expected) {
      fail(`${invariant.snapshot}: Phase Progress の ${phase} が期待値と一致しません（期待: ${expected}、実際: ${actual === "" ? "未設定" : actual}）`);
    }
  }
}

function checkStageMarks(invariant: SnapshotInvariant, doc: ParsedState, fail: FailFn): void {
  for (const [slug, expected] of Object.entries(invariant.stageMarks ?? {})) {
    const entry = doc.stages.find((stage) => stage.slug === slug && stage.unit === undefined);
    const actual = entry === undefined ? "行なし" : checkboxStateName(entry.mark);
    if (actual !== expected) {
      fail(`${invariant.snapshot}: ${slug} の checkbox が期待値と一致しません（期待: ${expected}、実際: ${actual}）`);
    }
  }
}

function unitIds(invariant: SnapshotInvariant, doc: ParsedState, fail: FailFn): string[] {
  const ids = [...new Set(doc.stages.filter((stage) => stage.unit !== undefined).map((stage) => String(stage.unit)))];
  if (ids.length === 0) fail(`${invariant.snapshot}: aidlc-state.md に Per unit ブロックがありません`);
  return ids;
}

function checkUnitStageMarks(invariant: SnapshotInvariant, doc: ParsedState, recordBase: string, fail: FailFn): void {
  if (!invariant.unitStageMarks || invariant.unitStageMarks.length === 0) return;
  for (const expected of invariant.unitStageMarks) {
    for (const unitId of unitIds(invariant, doc, fail)) {
      const entry = doc.stages.find((stage) => stage.slug === expected.stage && stage.unit === unitId);
      const actual = entry === undefined ? "行なし" : checkboxStateName(entry.mark);
      if (actual !== expected.state) {
        fail(`${invariant.snapshot}: Unit ${unitId} の ${expected.stage} が期待状態でありません（期待: ${expected.state}、実際: ${actual}）`);
      }
      checkUnitFiles(invariant, recordBase, unitId, expected, fail);
    }
  }
}

function checkUnitFiles(
  invariant: SnapshotInvariant,
  recordBase: string,
  unitId: string,
  expected: { files?: string[]; absentFiles?: string[] },
  fail: FailFn,
): void {
  for (const pattern of expected.files ?? []) {
    const path = pattern.replaceAll("<unit>", unitId);
    if (!matchExists(recordBase, path)) {
      fail(`${invariant.snapshot}: Unit ${unitId} の期待成果物が見つかりません: ${path}`);
    }
  }
  for (const pattern of expected.absentFiles ?? []) {
    const path = pattern.replaceAll("<unit>", unitId);
    if (matchExists(recordBase, path)) {
      fail(`${invariant.snapshot}: Unit ${unitId} に存在してはならない成果物が見つかりました: ${path}`);
    }
  }
}

function checkFilePatterns(invariant: SnapshotInvariant, recordBase: string, fail: FailFn): void {
  for (const pattern of invariant.files ?? []) {
    if (!matchExists(recordBase, pattern)) {
      fail(`${invariant.snapshot}: 期待する成果物が見つかりません: ${pattern}`);
    }
  }
  for (const pattern of invariant.absentFiles ?? []) {
    if (matchExists(recordBase, pattern)) {
      fail(`${invariant.snapshot}: 存在してはならない成果物が見つかりました: ${pattern}`);
    }
  }
}

// recordBase は `aidlc/spaces/<space>/intents/<dirName>` を指す絶対パス。
export function checkSnapshotInvariant(invariant: SnapshotInvariant, recordBase: string, fail: FailFn): void {
  const statePath = join(recordBase, "aidlc-state.md");
  if (!existsSync(statePath)) fail(`${invariant.snapshot}: aidlc-state.md がありません`);
  const doc = parseAidlcState(readFileSync(statePath, "utf8"));
  checkStateFields(invariant, doc, fail);
  checkStageMarks(invariant, doc, fail);
  checkUnitStageMarks(invariant, doc, recordBase, fail);
  checkFilePatterns(invariant, recordBase, fail);
}
