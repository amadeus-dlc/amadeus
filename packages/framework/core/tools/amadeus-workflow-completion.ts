import {
  activeIntent,
  activeSpace,
  errorMessage,
  getField,
  nextInScopeStage,
  readIntentRegistry,
  recordDir,
  recordDirMatches,
  setOrInsertField,
  validScopes,
} from "./amadeus-lib.ts";
import { basename, dirname, resolve } from "node:path";
import { resolveAmadeusConfig } from "./amadeus-config.ts";
import {
  authorizeGoalCompletion,
  goalCompletionContextDigest,
  type GoalReconciliationReceipt,
  readGoalLineage,
  readGoalReconciliationReceipt,
} from "./amadeus-goal-reconciliation.ts";

// The terminal completion has not settled yet: the Goal artifacts this
// completion is authorized against are absent or unusable, or the Goal
// authority declined the receipt it was given. The workflow leaves this state by
// doing the Goal work and re-running completion, so callers answer it as a
// waiting state (the engine's await-completion directive) with no ERROR_LOGGED
// row — issue #2251 found the expected window recorded as
// amadeus.operation.failed on every re-entry.
//
// Deliberately NOT thrown for this module's other refusals — a missing or
// invalid Scope, a target that is not the final in-scope stage, a Goal lineage
// that contradicts the state projection, an Intent absent from the registry.
// Those are malformed state, i.e. genuine failures, and stay on the error path
// with their audit evidence intact (issue #839).
export class WorkflowCompletionNotSettledError extends Error {}

// Read a Goal artifact under the not-settled boundary: an artifact that is
// absent (the confirmed production case) or unreadable leaves the completion
// unsettled rather than failing the workflow.
function asNotSettled<T>(read: () => T): T {
  try {
    return read();
  } catch (cause) {
    throw new WorkflowCompletionNotSettledError(errorMessage(cause));
  }
}

export type WorkflowCompletionPreparation = Readonly<{
  instance: string;
  stage: string;
  status: "pending" | "completed";
}>;

export function workflowCompletionPreparation(
  content: string,
): WorkflowCompletionPreparation | null {
  const instance = getField(content, "Workflow Completion Instance")?.trim();
  const stage = getField(content, "Workflow Completion Stage")?.trim();
  const status = getField(content, "Workflow Completion Status")?.trim();
  if (!instance && !stage) return null;
  if (!instance || !stage) {
    throw new Error(
      "Workflow completion preparation is incomplete: instance and stage must both be present",
    );
  }
  if (!/^[a-z][a-z0-9-]*$/u.test(stage)) {
    throw new Error(`Workflow completion stage is invalid: ${stage}`);
  }
  if (status === undefined) {
    throw new Error("Workflow completion status is missing");
  }
  if (
    status !== "pending" &&
    status !== "completed"
  ) {
    throw new Error(`Workflow completion status is invalid: ${status}`);
  }
  return { instance, stage, status };
}

export function prepareWorkflowCompletion(
  content: string,
  stage: string,
  instance: string,
): string {
  const existing = workflowCompletionPreparation(content);
  if (existing !== null) {
    if (existing.stage !== stage || existing.instance !== instance) {
      throw new Error(
        `Workflow completion is already prepared for ${existing.stage} at ${existing.instance}`,
      );
    }
    return content;
  }
  let updated = setOrInsertField(
    content,
    "## Runtime State",
    "Workflow Completion Instance",
    instance,
  );
  updated = setOrInsertField(
    updated,
    "## Runtime State",
    "Workflow Completion Stage",
    stage,
  );
  return setOrInsertField(
    updated,
    "## Runtime State",
    "Workflow Completion Status",
    "pending",
  );
}

export type CompletionMirrorDisposition =
  | { kind: "defer" | "immediate" }
  | { kind: "error"; message: string };

export function workflowCompletionContextDigest(
  content: string,
  finalStage: string,
): string {
  const scope = getField(content, "Scope")?.trim();
  if (!scope) throw new Error("Workflow completion requires a Scope field");
  const executionProjection = [
    getField(content, "Stages to Execute") ?? "",
    getField(content, "Stages to Skip") ?? "",
    getField(content, "Execution Projection Digest") ?? "",
  ].join("\n");
  return goalCompletionContextDigest({ scope, finalStage, executionProjection });
}

function registeredIntentUuid(projectDir: string, recordDirectory: string): string {
  const intentsDirectory = dirname(recordDirectory);
  if (basename(intentsDirectory) !== "intents") {
    throw new Error("Workflow completion record is not a registered Intent directory");
  }
  const space = basename(dirname(intentsDirectory));
  const intent = basename(recordDirectory);
  const registeredDirectory = recordDir(projectDir, intent, space);
  if (
    registeredDirectory === null ||
    resolve(registeredDirectory) !== resolve(recordDirectory)
  ) {
    throw new Error("Workflow completion record does not match the Intent registry");
  }
  const entry = readIntentRegistry(projectDir, space).find((candidate) =>
    recordDirMatches(candidate, intent)
  );
  if (!entry) throw new Error("Workflow completion Intent UUID is missing from the registry");
  return entry.uuid;
}

export function authorizeWorkflowCompletion(input: {
  readonly projectDir: string;
  readonly recordDir: string;
  readonly content: string;
  readonly completedSlug: string;
  readonly completionInstance: string;
}): GoalReconciliationReceipt {
  const scope = getField(input.content, "Scope")?.trim();
  if (!scope) throw new Error("Workflow completion requires a Scope field");
  if (!validScopes().has(scope)) {
    throw new Error(
      `State file has invalid Scope "${scope}". Valid scopes: ${[...validScopes()].join(", ")}.`,
    );
  }
  if (nextInScopeStage(input.completedSlug, scope, input.content) !== null) {
    throw new Error(
      `Workflow completion target ${input.completedSlug} is not the final in-scope stage`,
    );
  }
  const lineage = asNotSettled(() => readGoalLineage(input.recordDir));
  const current = lineage.revisions[lineage.currentRevision];
  const stateGoalId = getField(input.content, "Goal ID")?.trim();
  const stateRevision = getField(input.content, "Current Goal Revision")?.trim();
  const stateDigest = getField(input.content, "Current Goal Digest")?.trim();
  if (
    stateGoalId !== lineage.goalId ||
    stateRevision !== String(lineage.currentRevision) ||
    stateDigest !== current.digest
  ) {
    throw new Error("Goal lineage does not match the workflow state projection");
  }
  const receipt = asNotSettled(() =>
    readGoalReconciliationReceipt(input.recordDir, input.completionInstance)
  );
  const intentId = registeredIntentUuid(input.projectDir, input.recordDir);
  const authorization = authorizeGoalCompletion({
    intentId,
    lineage,
    receipt,
    scope,
    finalStage: input.completedSlug,
    completionInstance: input.completionInstance,
    completionContextDigest: workflowCompletionContextDigest(
      input.content,
      input.completedSlug,
    ),
  });
  if (authorization.kind === "rejected") {
    throw new WorkflowCompletionNotSettledError(
      `Goal reconciliation refused completion: ${authorization.reason}`,
    );
  }
  return authorization.receipt;
}

export function authorizePersistedCompletedWorkflow(input: {
  readonly projectDir: string;
  readonly recordDir: string;
  readonly content: string;
}): GoalReconciliationReceipt {
  const completedSlug = getField(input.content, "Last Completed Stage")?.trim();
  if (!completedSlug || completedSlug === "none") {
    throw new Error(
      "Completed workflow is missing a valid Last Completed Stage",
    );
  }
  const prepared = workflowCompletionPreparation(input.content);
  return authorizeWorkflowCompletion({
    projectDir: input.projectDir,
    recordDir: input.recordDir,
    content: input.content,
    completedSlug,
    completionInstance: prepared?.instance ?? `terminal:${completedSlug}`,
  });
}

export function completionMirrorDisposition(
  projectDir: string,
  intentOverride?: string,
): CompletionMirrorDisposition {
  const intent = activeIntent(
    projectDir,
    activeSpace(projectDir),
    intentOverride,
  );
  if (intent === null) {
    return {
      kind: "error",
      message: "Workflow completion cannot resolve the active Intent.",
    };
  }
  const resolved = resolveAmadeusConfig(projectDir, intent);
  if (resolved.kind === "invalid") {
    const details = resolved.issues.map((issue) =>
      issue.kind === "read-failure"
        ? `${issue.layer} (${issue.path}): ${issue.summary}`
        : `${issue.layer} (${issue.path}): expected ${issue.expected}, got ${issue.actualType}`
    ).join(" | ");
    return {
      kind: "error",
      message: `Invalid mirror configuration: ${details}`,
    };
  }
  return resolved.config.intentMirror.github.issue.mode === "off"
    ? { kind: "immediate" }
    : { kind: "defer" };
}
