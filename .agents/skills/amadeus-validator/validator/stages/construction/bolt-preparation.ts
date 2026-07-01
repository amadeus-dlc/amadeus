import { dirname } from "node:path";
import { taskGenerationContract } from "../../generated/task-generation-contract";
import { type CheckResult, fail, pass } from "../../domain/results";

type StageResult = {
  results: CheckResult[];
  checkedFiles: string[];
};

type TaskGenerationContext = {
  path: string;
  intentBase: string;
  boltDirectories: Map<string, string>;
};

type TaskGenerationEvidenceCheck = StageResult & {
  evidenceByKind: Map<string, string[]>;
};

type RequiredArtifactsContext = {
  path: string;
  intentBase: string;
  required: Set<string>;
  boltDirectories: Map<string, string>;
  taskGenerationStatuses: Map<string, string>;
  requiresTestResults: boolean;
};

type BoltPreparationStageInput = {
  statePath: string;
  construction: Record<string, any>;
  typeName: (value: unknown) => string;
  isObject: (value: unknown) => value is Record<string, any>;
  inceptionBaseForStatePath: (path: string) => string;
  constructionBaseForStatePath: (path: string) => string;
  constructionBoltDirectories: (inceptionBase: string, constructionBase: string) => Map<string, string>;
  relativeToIntent: (intentBase: string, artifactPath: string) => string;
  fileExists: (artifactPath: string) => boolean;
};

const taskGenerationStatusValues = new Set<string>(taskGenerationContract.statuses);
const taskGenerationBlockedReasonValues = new Set<string>(taskGenerationContract.blockedReasons);
const taskGenerationEvidenceKindValues = new Set<string>(taskGenerationContract.evidenceKinds);
const taskGenerationStateMatrixByStatus = new Map<string, {
  requiredEvidenceKinds: readonly string[];
  evidence: "forbidden" | "optional" | "required";
  blockedReason: "forbidden" | "optional" | "required";
}>(taskGenerationContract.allowedStateMatrix.map((item) => [item.status, item]));

export function checkConstructionBoltPreparationStage(input: BoltPreparationStageInput): StageResult {
  const taskGeneration = checkConstructionBoltTaskGeneration(input);
  return {
    results: [
      ...taskGeneration.results,
      ...checkTargetBoltRequiredArtifacts(input),
    ],
    checkedFiles: taskGeneration.checkedFiles,
  };
}

function checkConstructionBoltTaskGeneration(input: BoltPreparationStageInput): StageResult {
  const path = input.statePath;
  const construction = input.construction;
  const targetBolts = construction.targetBolts;
  if (!Array.isArray(targetBolts)) return { results: [], checkedFiles: [] };

  const results: CheckResult[] = [];
  const checkedFiles: string[] = [];
  const values = construction.bolts;
  if (!Array.isArray(values)) {
    results.push(fail(path, "`construction.bolts` が配列である", input.typeName(values)));
    return { results, checkedFiles };
  }
  results.push(pass(path, "`construction.bolts` が配列である", `${values.length}件`));

  const intentBase = dirname(path);
  const inceptionBase = input.inceptionBaseForStatePath(path);
  const constructionBase = input.constructionBaseForStatePath(path);
  const boltDirectories = input.constructionBoltDirectories(inceptionBase, constructionBase);
  const byId = collectConstructionBoltStates(input, values, results);
  const context = { path, intentBase, boltDirectories };

  for (const value of targetBolts) {
    const boltResult = checkTargetBoltTaskGeneration(input, context, byId, value);
    results.push(...boltResult.results);
    checkedFiles.push(...boltResult.checkedFiles);
  }
  return { results, checkedFiles };
}

function collectConstructionBoltStates(
  input: BoltPreparationStageInput,
  values: unknown[],
  results: CheckResult[],
): Map<string, Record<string, any>> {
  const byId = new Map<string, Record<string, any>>();
  const path = input.statePath;
  for (const item of values) {
    if (!input.isObject(item)) {
      results.push(fail(path, "`construction.bolts[]` がオブジェクトである", input.typeName(item)));
      continue;
    }
    const id = String(item.id ?? "").trim();
    if (id.length === 0) {
      results.push(fail(path, "`construction.bolts[].id` が空欄でない", "空欄"));
      continue;
    }
    byId.set(id, item);
  }
  return byId;
}

function checkTargetBoltTaskGeneration(
  input: BoltPreparationStageInput,
  context: TaskGenerationContext,
  byId: Map<string, Record<string, any>>,
  value: unknown,
): StageResult {
  const results: CheckResult[] = [];
  const checkedFiles: string[] = [];
  const boltId = String(value ?? "").trim();
  const item = byId.get(boltId);
  if (!item) {
    results.push(fail(context.path, "`construction.bolts` が targetBolt の taskGeneration を持つ", boltId));
    return { results, checkedFiles };
  }
  results.push(pass(context.path, "`construction.bolts` が targetBolt の taskGeneration を持つ", boltId));
  results.push(...checkDeprecatedBoltStateFields(input, context.path, boltId, item));

  const taskGeneration = item.taskGeneration;
  if (!input.isObject(taskGeneration)) {
    results.push(fail(context.path, "`construction.bolts[].taskGeneration` がオブジェクトである", `${boltId}: ${input.typeName(taskGeneration)}`));
    return { results, checkedFiles };
  }
  results.push(pass(context.path, "`construction.bolts[].taskGeneration` がオブジェクトである", boltId));
  const taskGenerationResult = checkTaskGenerationObject(input, context, boltId, taskGeneration);
  results.push(...taskGenerationResult.results);
  checkedFiles.push(...taskGenerationResult.checkedFiles);
  return { results, checkedFiles };
}

function checkDeprecatedBoltStateFields(
  input: BoltPreparationStageInput,
  path: string,
  boltId: string,
  item: Record<string, any>,
): CheckResult[] {
  const results: CheckResult[] = [];
  if (input.isObject(item.designGate)) {
    results.push(fail(path, "`construction.bolts[].designGate` を残さない", boltId));
  } else {
    results.push(pass(path, "`construction.bolts[].designGate` を残さない", boltId));
  }
  if (input.isObject(item.tasks)) {
    results.push(fail(path, "`construction.bolts[].tasks` を状態契約に残さない", boltId));
  } else {
    results.push(pass(path, "`construction.bolts[].tasks` を状態契約に残さない", boltId));
  }
  return results;
}

function checkTaskGenerationObject(
  input: BoltPreparationStageInput,
  context: TaskGenerationContext,
  boltId: string,
  taskGeneration: Record<string, any>,
): StageResult {
  const results: CheckResult[] = [];
  const checkedFiles: string[] = [];
  const status = String(taskGeneration.status ?? "").trim();
  results.push(checkAllowed(context.path, "construction.bolts[].taskGeneration.status", status, taskGenerationStatusValues));

  const blockedReason = String(taskGeneration.blockedReason ?? "").trim();
  if (blockedReason.length > 0) {
    results.push(checkAllowed(context.path, "construction.bolts[].taskGeneration.blockedReason", blockedReason, taskGenerationBlockedReasonValues));
  }

  const evidenceResult = checkTaskGenerationEvidenceList(input, context, boltId, taskGeneration.evidence);
  results.push(...evidenceResult.results);
  checkedFiles.push(...evidenceResult.checkedFiles);
  checkTaskGenerationStateMatrix(results, context.path, {
    boltId,
    status,
    blockedReason,
    evidenceCount: Array.isArray(taskGeneration.evidence) ? taskGeneration.evidence.length : 0,
    evidenceByKind: evidenceResult.evidenceByKind,
  });
  results.push(...checkTaskGenerationTasksEvidence(input, context, boltId, status, evidenceResult.evidenceByKind));
  return { results, checkedFiles };
}

function checkTaskGenerationEvidenceList(
  input: BoltPreparationStageInput,
  context: TaskGenerationContext,
  boltId: string,
  evidence: unknown,
): TaskGenerationEvidenceCheck {
  const results: CheckResult[] = [];
  const checkedFiles: string[] = [];
  const evidenceValues = Array.isArray(evidence) ? evidence : [];
  if (Array.isArray(evidence)) {
    results.push(pass(context.path, "`construction.bolts[].taskGeneration.evidence` が配列である", `${boltId}: ${evidenceValues.length}件`));
  } else {
    results.push(fail(context.path, "`construction.bolts[].taskGeneration.evidence` が配列である", `${boltId}: ${input.typeName(evidence)}`));
  }

  const evidenceByKind = new Map<string, string[]>();
  for (const item of evidenceValues) {
    const evidenceResult = checkTaskGenerationEvidence(input, context, boltId, item);
    results.push(...evidenceResult.results);
    checkedFiles.push(...evidenceResult.checkedFiles);
    if (evidenceResult.kind !== undefined) {
      if (!evidenceByKind.has(evidenceResult.kind)) evidenceByKind.set(evidenceResult.kind, []);
      evidenceByKind.get(evidenceResult.kind)?.push(evidenceResult.evidencePath);
    }
  }
  return { results, checkedFiles, evidenceByKind };
}

function checkTaskGenerationEvidence(
  input: BoltPreparationStageInput,
  context: TaskGenerationContext,
  boltId: string,
  evidence: unknown,
): StageResult & { kind?: string; evidencePath: string } {
  const results: CheckResult[] = [];
  const checkedFiles: string[] = [];
  if (!input.isObject(evidence)) {
    results.push(fail(context.path, "Task Generation evidence がオブジェクトである", `${boltId}: ${input.typeName(evidence)}`));
    return { results, checkedFiles, evidencePath: "" };
  }

  const kind = String(evidence.kind ?? "").trim();
  const evidencePath = String(evidence.path ?? "").trim();
  results.push(checkAllowed(context.path, "Task Generation evidence kind", kind, taskGenerationEvidenceKindValues));
  if (evidencePath.length === 0) {
    results.push(fail(context.path, "Task Generation evidence.path が空欄でない", `${boltId}: ${kind}`));
  } else {
    results.push(...checkTaskGenerationEvidencePath(input, context, boltId, kind, evidencePath, checkedFiles));
  }
  return { results, checkedFiles, kind, evidencePath };
}

function checkTaskGenerationEvidencePath(
  input: BoltPreparationStageInput,
  context: TaskGenerationContext,
  boltId: string,
  kind: string,
  evidencePath: string,
  checkedFiles: string[],
): CheckResult[] {
  const results: CheckResult[] = [];
  results.push(pass(context.path, "Task Generation evidence.path が空欄でない", `${boltId}: ${kind}: ${evidencePath}`));
  results.push(checkIntentRelativeEvidencePath(context.path, boltId, evidencePath));
  results.push(checkEvidenceDoesNotPointBoltDesign(context.path, boltId, evidencePath));
  const evidenceArtifactPath = `${context.intentBase}/${evidencePath}`;
  if (input.fileExists(evidenceArtifactPath)) {
    checkedFiles.push(evidenceArtifactPath);
    results.push(pass(context.path, "Task Generation evidence が存在する", evidencePath));
  } else {
    results.push(fail(context.path, "Task Generation evidence が存在する", `${evidencePath} が存在しない`));
  }
  return results;
}

function checkIntentRelativeEvidencePath(path: string, boltId: string, evidencePath: string): CheckResult {
  if (evidencePath.includes("/../") || evidencePath.startsWith("/") || !evidencePath.startsWith("inception/") && !evidencePath.startsWith("construction/")) {
    return fail(path, "Task Generation evidence.path が Intent 内相対パスである", `${boltId}: ${evidencePath}`);
  }
  return pass(path, "Task Generation evidence.path が Intent 内相対パスである", `${boltId}: ${evidencePath}`);
}

function checkEvidenceDoesNotPointBoltDesign(path: string, boltId: string, evidencePath: string): CheckResult {
  if (evidencePath.endsWith("/design.md") && evidencePath.includes("construction/bolts/")) {
    return fail(path, "Task Generation evidence は Bolt 側 design.md を指さない", `${boltId}: ${evidencePath}`);
  }
  return pass(path, "Task Generation evidence は Bolt 側 design.md を指さない", `${boltId}: ${evidencePath}`);
}

function checkTaskGenerationTasksEvidence(
  input: BoltPreparationStageInput,
  context: TaskGenerationContext,
  boltId: string,
  status: string,
  evidenceByKind: Map<string, string[]>,
): CheckResult[] {
  const boltDir = context.boltDirectories.get(boltId);
  const expectedTaskEvidence = boltDir ? input.relativeToIntent(context.intentBase, `${boltDir}/tasks.md`) : "";
  if ((status !== "ready_for_approval" && status !== "passed") || expectedTaskEvidence.length === 0) return [];

  const taskEvidence = evidenceByKind.get("tasks") ?? [];
  if (taskEvidence.includes(expectedTaskEvidence)) {
    return [pass(context.path, "Task Generation tasks evidence が対象 tasks.md を指す", `${boltId}: ${expectedTaskEvidence}`)];
  }
  return [fail(context.path, "Task Generation tasks evidence が対象 tasks.md を指す", `${boltId}: ${taskEvidence.join(", ") || "空欄"}`)];
}

function checkTargetBoltRequiredArtifacts(input: BoltPreparationStageInput): CheckResult[] {
  const path = input.statePath;
  const construction = input.construction;
  const targetBolts = construction.targetBolts;
  const requiredBoltArtifacts = construction.requiredBoltArtifacts;
  if (!Array.isArray(targetBolts) || !Array.isArray(requiredBoltArtifacts)) return [];

  const results: CheckResult[] = [];
  const intentBase = dirname(path);
  const inceptionBase = input.inceptionBaseForStatePath(path);
  const constructionBase = input.constructionBaseForStatePath(path);
  const required = new Set(requiredBoltArtifacts.map((value: unknown) => String(value ?? "").trim()));
  const boltDirectories = input.constructionBoltDirectories(inceptionBase, constructionBase);
  const taskGenerationStatuses = collectTaskGenerationStatuses(input, construction.bolts);
  const requiresTestResults = constructionRequiresTestResults(construction);
  const context = { path, intentBase, required, boltDirectories, taskGenerationStatuses, requiresTestResults };
  for (const value of targetBolts) {
    results.push(...checkTargetBoltRequiredArtifactsEntry(input, context, value));
  }
  return results;
}

function collectTaskGenerationStatuses(input: BoltPreparationStageInput, bolts: unknown): Map<string, string> {
  const statuses = new Map<string, string>();
  if (!Array.isArray(bolts)) return statuses;

  for (const item of bolts) {
    if (!input.isObject(item) || !input.isObject(item.taskGeneration)) continue;
    const id = String(item.id ?? "").trim();
    if (id.length === 0) continue;
    statuses.set(id, String(item.taskGeneration.status ?? "").trim());
  }
  return statuses;
}

function constructionRequiresTestResults(construction: Record<string, any>): boolean {
  return String(construction.status ?? "").trim() === "completed" || String(construction.gate ?? "").trim() === "passed";
}

function checkTargetBoltRequiredArtifactsEntry(
  input: BoltPreparationStageInput,
  context: RequiredArtifactsContext,
  value: unknown,
): CheckResult[] {
  const boltId = String(value ?? "").trim();
  const boltDir = context.boltDirectories.get(boltId);
  if (!boltDir) return [];

  const results: CheckResult[] = [];
  const artifactPaths = targetBoltRequiredArtifactPaths(input, context, boltId, boltDir, results);
  for (const artifactPath of artifactPaths) {
    results.push(checkRequiredBoltArtifact(input, context, boltId, artifactPath));
  }
  return results;
}

function targetBoltRequiredArtifactPaths(
  input: BoltPreparationStageInput,
  context: RequiredArtifactsContext,
  boltId: string,
  boltDir: string,
  results: CheckResult[],
): string[] {
  const artifactPaths = [`${boltDir}/notes.md`];
  const taskPath = input.relativeToIntent(context.intentBase, `${boltDir}/tasks.md`);
  const taskGenerationStatus = context.taskGenerationStatuses.get(boltId);
  if (taskGenerationProducesTasks(taskGenerationStatus)) {
    artifactPaths.push(`${boltDir}/tasks.md`);
  } else if (taskGenerationHasNoGeneratedTasks(taskGenerationStatus)) {
    results.push(checkTasksNotRequiredBeforeGeneration(context, boltId, taskPath));
  }
  if (context.requiresTestResults) artifactPaths.push(`${boltDir}/test-results.md`);
  return artifactPaths;
}

function taskGenerationProducesTasks(status: string | undefined): boolean {
  return status === "ready_for_approval" || status === "passed" || status === "failed";
}

function taskGenerationHasNoGeneratedTasks(status: string | undefined): boolean {
  return status === "not_started" || status === "in_progress" || status === "blocked";
}

function checkTasksNotRequiredBeforeGeneration(context: RequiredArtifactsContext, boltId: string, taskPath: string): CheckResult {
  if (context.required.has(taskPath)) {
    return fail(context.path, "`taskGeneration.status` 未生成時は requiredBoltArtifacts に tasks.md を含めない", `${boltId}: ${taskPath}`);
  }
  return pass(context.path, "`taskGeneration.status` 未生成時は requiredBoltArtifacts に tasks.md を含めない", `${boltId}: ${taskPath}`);
}

function checkRequiredBoltArtifact(
  input: BoltPreparationStageInput,
  context: RequiredArtifactsContext,
  boltId: string,
  artifactPath: string,
): CheckResult {
  const relativePath = input.relativeToIntent(context.intentBase, artifactPath);
  const condition = artifactPath.endsWith("/test-results.md")
    ? "Construction 完了時の必須 Bolt 成果物が test-results.md を含む"
    : "Construction 必須 Bolt 成果物が targetBolt の証拠成果物を含む";
  if (context.required.has(relativePath)) return pass(context.path, condition, `${boltId}: ${relativePath}`);
  return fail(context.path, condition, `${boltId}: ${relativePath}`);
}

function checkTaskGenerationStateMatrix(
  results: CheckResult[],
  path: string,
  input: {
    boltId: string;
    status: string;
    blockedReason: string;
    evidenceCount: number;
    evidenceByKind: Map<string, string[]>;
  },
): void {
  const rule = taskGenerationStateMatrixByStatus.get(input.status);
  if (!rule) return;

  for (const kind of rule.requiredEvidenceKinds) {
    requireKind(results, path, input.evidenceByKind, input.boltId, input.status, kind);
  }

  if (rule.evidence === "forbidden") {
    if (input.evidenceCount === 0) results.push(pass(path, `Task Generation ${input.status} は evidence を持たない`, input.boltId));
    else results.push(fail(path, `Task Generation ${input.status} は evidence を持たない`, `${input.boltId}: ${input.evidenceCount}件`));
  } else if (rule.evidence === "required") {
    if (input.evidenceCount > 0) results.push(pass(path, `Task Generation ${input.status} は evidence を持つ`, `${input.boltId}: ${input.evidenceCount}件`));
    else results.push(fail(path, `Task Generation ${input.status} は evidence を持つ`, input.boltId));
  }

  if (rule.blockedReason === "forbidden") {
    if (input.blockedReason.length === 0) results.push(pass(path, `Task Generation ${input.status} は blockedReason を持たない`, input.boltId));
    else results.push(fail(path, `Task Generation ${input.status} は blockedReason を持たない`, `${input.boltId}: ${input.blockedReason}`));
  } else if (rule.blockedReason === "required") {
    if (input.blockedReason.length > 0) results.push(pass(path, `Task Generation ${input.status} は blockedReason を持つ`, `${input.boltId}: ${input.blockedReason}`));
    else results.push(fail(path, `Task Generation ${input.status} は blockedReason を持つ`, input.boltId));
  }
}

function requireKind(
  results: CheckResult[],
  path: string,
  evidenceByKind: Map<string, string[]>,
  boltId: string,
  status: string,
  kind: string,
): void {
  if ((evidenceByKind.get(kind) ?? []).length > 0) {
    results.push(pass(path, `Task Generation ${status} は ${kind} evidence を持つ`, boltId));
  } else {
    results.push(fail(path, `Task Generation ${status} は ${kind} evidence を持つ`, boltId));
  }
}

function checkAllowed(path: string, column: string, actual: unknown, allowed: Set<string>): CheckResult {
  const value = String(actual ?? "").trim();
  if (allowed.has(value)) return pass(path, `\`${column}\` が許可値である`, value);
  return fail(path, `\`${column}\` が許可値である`, value);
}
