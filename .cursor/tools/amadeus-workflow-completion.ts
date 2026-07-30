import {
  activeIntent,
  activeSpace,
  getField,
  setOrInsertField,
} from "./amadeus-lib.ts";
import { resolveAmadeusConfig } from "./amadeus-layered-config.ts";

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
  return resolved.config.autoMirror === "off"
    ? { kind: "immediate" }
    : { kind: "defer" };
}
