// examples snapshot の共有契約。
// 各 snapshot の段階不変条件（state、Unit / Bolt 状態、成果物の存在と不在）をここで一元定義し、
// generator（生成直後の検査）と validate-amadeus-examples（コミット済みツリーの --invariants 検査）の
// 両方が同じ定義を使う。二重定義による鏡映漏れを構造的に防ぐ。

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const exampleIntentId = "20260703-minimum-purchase-flow";

export const exampleSnapshots = [
  "examples/01-ideation-completed",
  "examples/02-inception-completed",
  "examples/03-construction-design-ready",
  "examples/04-construction-implementation-planned",
];

// state は state.json の dotted path と期待値の対。
// unitStates は対象 stage の units 配下すべてが期待状態であること。
// allBoltStates は bolts 配下すべてが期待状態であること。
// boltUnits は Bolt に束ねた各 Unit が対象 stage に期待状態で存在し、Unit ごとの成果物条件を満たすこと
// （files / absentFiles の `<unit>` は Unit ID に置換する）。
// files / absentFiles は Intent ディレクトリからの相対パターン（1 セグメントだけ `*` を許可）。
export type SnapshotInvariant = {
  snapshot: string;
  state: Record<string, string>;
  unitStates?: Array<{ stage: string; state: string }>;
  allBoltStates?: string;
  boltUnits?: Array<{ stage: string; state: string; files?: string[]; absentFiles?: string[] }>;
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
    state: {
      schemaVersion: "2",
      intentId: exampleIntentId,
      scope: "feature",
      status: "in_progress",
      phase: "inception",
      "phaseGates.ideation.via": "pr",
      "stages.intent-capture.state": "completed",
      "stages.scope-definition.state": "completed",
      "stages.approval-handoff.state": "completed",
    },
    files: [
      "ideation/scope-definition/scope-document.md",
      "ideation/scope-definition/intent-backlog.md",
      "ideation/approval-handoff/initiative-brief.md",
      "ideation/decisions.md",
      "ideation/traceability.md",
    ],
  },
  {
    snapshot: "examples/02-inception-completed",
    state: {
      schemaVersion: "2",
      intentId: exampleIntentId,
      scope: "feature",
      status: "in_progress",
      phase: "construction",
      "phaseGates.ideation.via": "pr",
      "phaseGates.inception.via": "pr",
      "stages.requirements-analysis.state": "completed",
      "stages.units-generation.state": "completed",
      "stages.delivery-planning.state": "completed",
    },
    files: [
      "inception/requirements-analysis/requirements.md",
      "inception/units-generation/units.md",
      "inception/units-generation/unit-dependencies.md",
      "inception/delivery-planning/bolt-plan.md",
    ],
  },
  {
    snapshot: "examples/03-construction-design-ready",
    state: {
      schemaVersion: "2",
      intentId: exampleIntentId,
      scope: "feature",
      status: "in_progress",
      phase: "construction",
      "phaseGates.ideation.via": "pr",
      "phaseGates.inception.via": "pr",
      "stages.code-generation.state": "pending",
    },
    unitStates: [{ stage: "functional-design", state: "completed" }],
    allBoltStates: "active",
    boltUnits: [{ stage: "functional-design", state: "completed", files: functionalDesignUnitFiles }],
    absentFiles: ["construction/*/code-generation/plan.md", "construction/*/code-generation/summary.md"],
  },
  {
    // 04 は 03 の累積であり、functional-design の不変条件も維持されることを再検査する。
    snapshot: "examples/04-construction-implementation-planned",
    state: {
      schemaVersion: "2",
      intentId: exampleIntentId,
      scope: "feature",
      status: "in_progress",
      phase: "construction",
      "phaseGates.ideation.via": "pr",
      "phaseGates.inception.via": "pr",
    },
    unitStates: [
      { stage: "functional-design", state: "completed" },
      { stage: "code-generation", state: "active" },
    ],
    allBoltStates: "active",
    boltUnits: [
      { stage: "functional-design", state: "completed", files: functionalDesignUnitFiles },
      {
        stage: "code-generation",
        state: "active",
        files: ["construction/<unit>/code-generation/plan.md"],
        absentFiles: ["construction/<unit>/code-generation/summary.md"],
      },
    ],
    absentFiles: ["construction/*/code-generation/summary.md"],
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

function stateValue(state: Record<string, unknown>, dottedPath: string): unknown {
  let current: unknown = state;
  for (const key of dottedPath.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

type FailFn = (message: string) => never;

function checkStateEntries(invariant: SnapshotInvariant, state: Record<string, unknown>, fail: FailFn): void {
  for (const [path, expected] of Object.entries(invariant.state)) {
    const actual = stateValue(state, path);
    if (String(actual ?? "") !== expected) {
      fail(`${invariant.snapshot}: state.json の ${path} が期待値と一致しません（期待: ${expected}、実際: ${String(actual ?? "未設定")}）`);
    }
  }
}

function checkAllEntryStates(invariant: SnapshotInvariant, value: unknown, label: string, expected: string, fail: FailFn): void {
  if (typeof value !== "object" || value === null || Object.keys(value).length === 0) {
    fail(`${invariant.snapshot}: ${label} が空です`);
  }
  for (const [id, entry] of Object.entries(value as Record<string, { state?: string }>)) {
    if (String(entry?.state ?? "") !== expected) {
      fail(`${invariant.snapshot}: ${label}.${id}.state が期待値と一致しません（期待: ${expected}、実際: ${String(entry?.state ?? "未設定")}）`);
    }
  }
}

function checkUnitAndBoltStates(invariant: SnapshotInvariant, state: Record<string, unknown>, fail: FailFn): void {
  for (const expected of invariant.unitStates ?? []) {
    checkAllEntryStates(invariant, stateValue(state, `stages.${expected.stage}.units`), `stages.${expected.stage}.units`, expected.state, fail);
  }
  if (invariant.allBoltStates !== undefined) {
    checkAllEntryStates(invariant, stateValue(state, "bolts"), "bolts", invariant.allBoltStates, fail);
  }
}

function boltUnitIds(invariant: SnapshotInvariant, state: Record<string, unknown>, fail: FailFn): string[] {
  const bolts = stateValue(state, "bolts");
  if (typeof bolts !== "object" || bolts === null || Object.keys(bolts).length === 0) {
    fail(`${invariant.snapshot}: state.json に bolts がありません`);
  }
  const ids = Object.values(bolts as Record<string, { units?: unknown }>).flatMap((bolt) =>
    Array.isArray(bolt.units) ? bolt.units.map((unit) => String(unit)) : [],
  );
  if (ids.length === 0) fail(`${invariant.snapshot}: bolts に units の一覧がありません`);
  return [...new Set(ids)];
}

function checkBoltUnits(invariant: SnapshotInvariant, state: Record<string, unknown>, intentBase: string, fail: FailFn): void {
  for (const expected of invariant.boltUnits ?? []) {
    for (const unitId of boltUnitIds(invariant, state, fail)) {
      const unitState = stateValue(state, `stages.${expected.stage}.units.${unitId}.state`);
      if (String(unitState ?? "") !== expected.state) {
        fail(`${invariant.snapshot}: Bolt の Unit ${unitId} が stages.${expected.stage}.units に期待状態でありません（期待: ${expected.state}、実際: ${String(unitState ?? "未設定")}）`);
      }
      checkUnitFiles(invariant, intentBase, unitId, expected, fail);
    }
  }
}

function checkUnitFiles(
  invariant: SnapshotInvariant,
  intentBase: string,
  unitId: string,
  expected: { files?: string[]; absentFiles?: string[] },
  fail: FailFn,
): void {
  for (const pattern of expected.files ?? []) {
    const path = pattern.replaceAll("<unit>", unitId);
    if (!matchExists(intentBase, path)) {
      fail(`${invariant.snapshot}: Unit ${unitId} の期待成果物が見つかりません: ${path}`);
    }
  }
  for (const pattern of expected.absentFiles ?? []) {
    const path = pattern.replaceAll("<unit>", unitId);
    if (matchExists(intentBase, path)) {
      fail(`${invariant.snapshot}: Unit ${unitId} に存在してはならない成果物が見つかりました: ${path}`);
    }
  }
}

function checkFilePatterns(invariant: SnapshotInvariant, intentBase: string, fail: FailFn): void {
  for (const pattern of invariant.files ?? []) {
    if (!matchExists(intentBase, pattern)) {
      fail(`${invariant.snapshot}: 期待する成果物が見つかりません: ${pattern}`);
    }
  }
  for (const pattern of invariant.absentFiles ?? []) {
    if (matchExists(intentBase, pattern)) {
      fail(`${invariant.snapshot}: 存在してはならない成果物が見つかりました: ${pattern}`);
    }
  }
}

// intentBase は `.amadeus/intents/<intent-id>` を指す絶対パス。
export function checkSnapshotInvariant(invariant: SnapshotInvariant, intentBase: string, fail: FailFn): void {
  const statePath = join(intentBase, "state.json");
  if (!existsSync(statePath)) fail(`${invariant.snapshot}: state.json がありません`);
  const state = JSON.parse(readFileSync(statePath, "utf8")) as Record<string, unknown>;
  checkStateEntries(invariant, state, fail);
  checkUnitAndBoltStates(invariant, state, fail);
  checkBoltUnits(invariant, state, intentBase, fail);
  checkFilePatterns(invariant, intentBase, fail);
}
