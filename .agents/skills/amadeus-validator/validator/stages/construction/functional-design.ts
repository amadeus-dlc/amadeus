import { basename } from "node:path";
import { functionalDesignContract } from "../../generated/functional-design-contract";
import {
  type FunctionalDesignStatus,
  deriveFunctionalDesignGateResult,
  functionalDesignUnitStateCombinationIsValid,
} from "../../domain/functional-design-state";
import { type CheckResult, fail, pass } from "../../domain/results";

type StageResult = {
  results: CheckResult[];
  checkedFiles: string[];
};

type TargetUnitsCheck = {
  results: CheckResult[];
  targetUnitSet: Set<string>;
  valid: boolean;
};

type FunctionalDesignUnitsCheck = StageResult & {
  byUnit: Map<string, Record<string, unknown>>;
};

type FunctionalDesignStageInput = {
  statePath: string;
  value: unknown;
  existingUnitIds: Set<string>;
  unitDirectories: Map<string, string>;
  constructionBase: string;
  intentBase: string;
  fileExists: (path: string) => boolean;
  relativeToIntent: (base: string, path: string) => string;
};

const requirementValues = new Set<string>(functionalDesignContract.requirements);
const statusValues = new Set<string>(functionalDesignContract.statuses);
const frontendSurfaceValues = new Set<string>(functionalDesignContract.frontendSurfaces);
const skipReasonValues = new Set<string>(functionalDesignContract.skipReasons);
const blockedReasonValues = new Set<string>(functionalDesignContract.blockedReasons);
const targetSourceValues = new Set<string>(functionalDesignContract.targetSources);
const runModeValues = new Set<string>(functionalDesignContract.runModes);

export function checkConstructionFunctionalDesignStage(input: FunctionalDesignStageInput): StageResult {
  const results: CheckResult[] = [];
  const checkedFiles: string[] = [];
  const path = input.statePath;
  const value = input.value;
  if (!isObject(value)) {
    results.push(fail(path, "`construction.functionalDesign` がオブジェクトである", typeName(value)));
    return { results, checkedFiles };
  }
  results.push(pass(path, "`construction.functionalDesign` がオブジェクトである", "オブジェクトを確認"));

  results.push(...checkFunctionalDesignStoredKeys(path, value));

  const targetUnitsCheck = checkFunctionalDesignTargetUnits(path, value.targetUnits);
  results.push(...targetUnitsCheck.results);
  if (!targetUnitsCheck.valid) {
    return { results, checkedFiles };
  }

  const units = value.units;
  if (!Array.isArray(units)) {
    results.push(fail(path, "`construction.functionalDesign.units` が配列である", typeName(units)));
    return { results, checkedFiles };
  }
  results.push(pass(path, "`construction.functionalDesign.units` が配列である", `${units.length}件`));

  const unitsCheck = checkFunctionalDesignUnits(input, units);
  results.push(...unitsCheck.results);
  checkedFiles.push(...unitsCheck.checkedFiles);
  results.push(...checkFunctionalDesignTargetUnitCoverage(input, targetUnitsCheck.targetUnitSet, unitsCheck.byUnit));

  return { results, checkedFiles };
}

function checkFunctionalDesignStoredKeys(path: string, value: Record<string, unknown>): CheckResult[] {
  const results: CheckResult[] = [];
  for (const key of ["artifacts", "required", "surfaces", "gate"]) {
    if (key in value) results.push(fail(path, `\`construction.functionalDesign.${key}\` を保存しない`, "派生値または成果物契約は state に持たせない"));
    else results.push(pass(path, `\`construction.functionalDesign.${key}\` を保存しない`, "未保存"));
  }
  return results;
}

function checkFunctionalDesignTargetUnits(path: string, targetUnits: unknown): TargetUnitsCheck {
  const results: CheckResult[] = [];
  const targetUnitSet = new Set<string>();
  if (!Array.isArray(targetUnits)) {
    results.push(fail(path, "`construction.functionalDesign.targetUnits` が配列である", typeName(targetUnits)));
    return { results, targetUnitSet, valid: false };
  }

  results.push(pass(path, "`construction.functionalDesign.targetUnits` が配列である", `${targetUnits.length}件`));
  for (const item of targetUnits) {
    checkFunctionalDesignTargetUnit(path, item, targetUnitSet, results);
  }
  return { results, targetUnitSet, valid: true };
}

function checkFunctionalDesignTargetUnit(
  path: string,
  item: unknown,
  targetUnitSet: Set<string>,
  results: CheckResult[],
): void {
  const unitIdValue = String(item ?? "").trim();
  if (unitIdValue.length === 0) {
    results.push(fail(path, "`construction.functionalDesign.targetUnits[]` が空欄でない", "空欄"));
  } else if (targetUnitSet.has(unitIdValue)) {
    results.push(fail(path, "`construction.functionalDesign.targetUnits[]` が重複しない", unitIdValue));
  } else {
    targetUnitSet.add(unitIdValue);
    results.push(pass(path, "`construction.functionalDesign.targetUnits[]` が空欄でない", unitIdValue));
    results.push(pass(path, "`construction.functionalDesign.targetUnits[]` が重複しない", unitIdValue));
  }
}

function checkFunctionalDesignUnits(input: FunctionalDesignStageInput, units: unknown[]): FunctionalDesignUnitsCheck {
  const results: CheckResult[] = [];
  const checkedFiles: string[] = [];
  const byUnit = new Map<string, Record<string, unknown>>();
  for (const item of units) {
    const unitResult = checkFunctionalDesignUnit(input, item, byUnit);
    results.push(...unitResult.results);
    checkedFiles.push(...unitResult.checkedFiles);
  }
  return { results, checkedFiles, byUnit };
}

function checkFunctionalDesignUnit(
  input: FunctionalDesignStageInput,
  item: unknown,
  byUnit: Map<string, Record<string, unknown>>,
): StageResult {
  const path = input.statePath;
  const results: CheckResult[] = [];
  const checkedFiles: string[] = [];
  if (!isObject(item)) {
    results.push(fail(path, "`construction.functionalDesign.units[]` がオブジェクトである", typeName(item)));
    return { results, checkedFiles };
  }

  results.push(pass(path, "`construction.functionalDesign.units[]` がオブジェクトである", "オブジェクトを確認"));
  const unitIdValue = String(item.unitId ?? "").trim();
  checkFunctionalDesignUnitId(input, item, byUnit, unitIdValue, results);
  results.push(...checkFunctionalDesignUnitAllowedValues(path, item));
  results.push(...checkFunctionalDesignUnitStoredKeys(path, item, unitIdValue));
  results.push(checkFunctionalDesignUnitCombination(path, item, unitIdValue));
  results.push(...checkFunctionalDesignGateDerivation(path, item, unitIdValue));
  if (functionalDesignCatalogArtifactsRequired(item)) {
    const artifactResult = checkFunctionalDesignCatalogArtifacts(input, item);
    results.push(...artifactResult.results);
    checkedFiles.push(...artifactResult.checkedFiles);
  }
  return { results, checkedFiles };
}

function checkFunctionalDesignUnitId(
  input: FunctionalDesignStageInput,
  item: Record<string, unknown>,
  byUnit: Map<string, Record<string, unknown>>,
  unitIdValue: string,
  results: CheckResult[],
): void {
  const path = input.statePath;
  if (unitIdValue.length === 0) {
    results.push(fail(path, "`construction.functionalDesign.units[].unitId` が空欄でない", "空欄"));
    return;
  }

  if (byUnit.has(unitIdValue)) {
    results.push(fail(path, "`construction.functionalDesign.units[].unitId` が重複しない", unitIdValue));
  } else {
    byUnit.set(unitIdValue, item);
    results.push(pass(path, "`construction.functionalDesign.units[].unitId` が重複しない", unitIdValue));
  }
  results.push(pass(path, "`construction.functionalDesign.units[].unitId` が空欄でない", unitIdValue));
  if (input.existingUnitIds.has(unitIdValue) || requirementOf(item) === "unresolved") {
    results.push(pass(path, "`construction.functionalDesign.units[].unitId` が既存 Unit または未解決である", unitIdValue));
  } else {
    results.push(fail(path, "`construction.functionalDesign.units[].unitId` が既存 Unit または未解決である", unitIdValue));
  }
}

function checkFunctionalDesignUnitAllowedValues(path: string, item: Record<string, unknown>): CheckResult[] {
  const results = [
    checkAllowed(path, "construction.functionalDesign.units[].requirement", item.requirement, requirementValues),
    checkAllowed(path, "construction.functionalDesign.units[].status", item.status, statusValues),
    checkAllowed(path, "construction.functionalDesign.units[].frontendSurface", item.frontendSurface, frontendSurfaceValues),
    checkAllowed(path, "construction.functionalDesign.units[].targetSource", item.targetSource, targetSourceValues),
    checkAllowed(path, "construction.functionalDesign.units[].runMode", item.runMode, runModeValues),
  ];
  if (item.skipReason !== undefined) results.push(checkAllowed(path, "construction.functionalDesign.units[].skipReason", item.skipReason, skipReasonValues));
  if (item.blockedReason !== undefined) results.push(checkAllowed(path, "construction.functionalDesign.units[].blockedReason", item.blockedReason, blockedReasonValues));
  return results;
}

function checkFunctionalDesignUnitStoredKeys(path: string, item: Record<string, unknown>, unitIdValue: string): CheckResult[] {
  const results: CheckResult[] = [];
  for (const key of ["artifacts", "required", "surfaces", "gate"]) {
    if (key in item) results.push(fail(path, `\`construction.functionalDesign.units[].${key}\` を保存しない`, `${unitIdValue}: 派生値または成果物契約は state に持たせない`));
    else results.push(pass(path, `\`construction.functionalDesign.units[].${key}\` を保存しない`, unitIdValue || "未確認"));
  }
  return results;
}

function checkFunctionalDesignUnitCombination(
  path: string,
  item: Record<string, unknown>,
  unitIdValue: string,
): CheckResult {
  if (functionalDesignUnitStateCombinationIsValid(item)) {
    return pass(path, "`construction.functionalDesign.units[]` の requirement と status の組み合わせが有効である", unitIdValue || "未確認");
  }
  return fail(path, "`construction.functionalDesign.units[]` の requirement と status の組み合わせが有効である", unitIdValue || "未確認");
}

function checkFunctionalDesignGateDerivation(path: string, item: Record<string, unknown>, unitIdValue: string): CheckResult[] {
  const status = String(item.status ?? "").trim();
  if (!statusValues.has(status)) return [];
  return [
    pass(path, "`FunctionalDesignGateResult` は status から導出できる", `${unitIdValue || "未確認"}: ${deriveFunctionalDesignGateResult(status as FunctionalDesignStatus)}`),
  ];
}

function functionalDesignCatalogArtifactsRequired(item: Record<string, unknown>): boolean {
  const status = String(item.status ?? "").trim();
  return requirementOf(item) === "required" && (status === "ready_for_approval" || status === "passed");
}

function checkFunctionalDesignTargetUnitCoverage(
  input: FunctionalDesignStageInput,
  targetUnitSet: Set<string>,
  byUnit: Map<string, Record<string, unknown>>,
): CheckResult[] {
  const results: CheckResult[] = [];
  for (const unitIdValue of targetUnitSet) {
    const item = byUnit.get(unitIdValue);
    if (!item) {
      results.push(fail(input.statePath, "`construction.functionalDesign.targetUnits` が対応する Unit state を持つ", unitIdValue));
      continue;
    }
    results.push(pass(input.statePath, "`construction.functionalDesign.targetUnits` が対応する Unit state を持つ", unitIdValue));
    results.push(checkFunctionalDesignTargetUnitRequirement(input, unitIdValue, item));
  }
  return results;
}

function checkFunctionalDesignTargetUnitRequirement(
  input: FunctionalDesignStageInput,
  unitIdValue: string,
  item: Record<string, unknown>,
): CheckResult {
  if (input.existingUnitIds.has(unitIdValue) && requirementOf(item) === "required") {
    return pass(input.statePath, "対象 Unit の Functional Design requirement が required である", unitIdValue);
  }
  if (!input.existingUnitIds.has(unitIdValue) && requirementOf(item) === "unresolved") {
    return pass(input.statePath, "未解決 Unit の Functional Design requirement が unresolved である", unitIdValue);
  }
  return fail(input.statePath, "対象 Unit の Functional Design requirement が required である", `${unitIdValue}: ${String(item.requirement ?? "").trim()}`);
}

function checkFunctionalDesignCatalogArtifacts(input: FunctionalDesignStageInput, item: Record<string, unknown>): StageResult {
  const unitIdValue = String(item.unitId ?? "").trim();
  const unitDirectory = input.unitDirectories.get(unitIdValue);
  if (!unitDirectory) {
    return {
      results: [fail(input.statePath, "Functional Design ready は Catalog 必須成果物を満たす", `${unitIdValue}: Unit ディレクトリ未解決`)],
      checkedFiles: [],
    };
  }

  const unitName = basename(unitDirectory);
  const artifactPaths = functionalDesignContract.coreArtifacts
    .map((artifact) => `${input.constructionBase}/${unitName}/functional-design/${artifact.fileName}`);
  if (String(item.frontendSurface ?? "").trim() === "present") {
    artifactPaths.push(`${input.constructionBase}/${unitName}/functional-design/${functionalDesignContract.frontendArtifact.fileName}`);
  }

  const results: CheckResult[] = [];
  const checkedFiles: string[] = [];
  for (const artifactPath of artifactPaths) {
    const relativePath = input.relativeToIntent(input.intentBase, artifactPath);
    if (input.fileExists(artifactPath)) {
      checkedFiles.push(artifactPath);
      results.push(pass(input.statePath, "Functional Design ready は Catalog 必須成果物を満たす", `${unitIdValue}: ${relativePath}`));
    } else {
      results.push(fail(input.statePath, "Functional Design ready は Catalog 必須成果物を満たす", `${unitIdValue}: ${relativePath}`));
    }
  }
  return { results, checkedFiles };
}

function requirementOf(item: Record<string, unknown>): string {
  return String(item.requirement ?? "").trim();
}

function checkAllowed(path: string, column: string, actual: unknown, allowed: Set<string>): CheckResult {
  const value = String(actual ?? "").trim();
  if (allowed.has(value)) return pass(path, `\`${column}\` が許可値である`, value);
  return fail(path, `\`${column}\` が許可値である`, value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typeName(value: unknown): string {
  if (Array.isArray(value)) return "Array";
  if (value === null) return "null";
  return typeof value;
}
