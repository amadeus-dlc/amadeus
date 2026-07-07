import { join } from "node:path";
import type { ApplyResult } from "./apply-types.ts";
import type { FileOperation, FileOperationPlan } from "./plan-types.ts";
import type { TargetFilePort } from "../ports/filesystem.ts";

export type ApplyPlanPorts = {
  targetRoot: string;
  files: TargetFilePort;
};

function isMutatingOperation(operation: FileOperation): operation is Extract<FileOperation, { kind: "add" | "update" | "force-update" | "backup" }> {
  return operation.kind === "add" || operation.kind === "update" || operation.kind === "force-update" || operation.kind === "backup";
}

function targetPath(targetRoot: string, relativePath: string): string {
  return join(targetRoot, relativePath);
}

export async function applyPlan(plan: FileOperationPlan, ports: ApplyPlanPorts): Promise<ApplyResult> {
  if (!plan.canApply) {
    throw new Error("applyPlan requires a writable plan with canApply:true");
  }

  const applied: FileOperation[] = [];
  const backups: Array<{ path: string; backupPath: string }> = [];

  for (const operation of plan.operations) {
    if (operation.kind === "skip" || operation.kind === "conflict") {
      continue;
    }

    if (operation.kind === "backup") {
      try {
        await ports.files.backupFile(targetPath(ports.targetRoot, operation.path), targetPath(ports.targetRoot, operation.backupPath));
        backups.push({ path: operation.path, backupPath: operation.backupPath });
        applied.push(operation);
      } catch (error) {
        return {
          ok: false,
          failedPhase: "backup",
          failedOperation: operation,
          applied,
          backups,
          manifestWrite: "not-started",
          diagnostics: [error instanceof Error ? error.message : "backup failed"],
        };
      }
      continue;
    }

    try {
      await ports.files.copyFile(operation.sourcePath, targetPath(ports.targetRoot, operation.path));
      applied.push(operation);
    } catch (error) {
      return {
        ok: false,
        failedPhase: "copy",
        failedOperation: operation,
        applied,
        backups,
        manifestWrite: "not-started",
        diagnostics: [error instanceof Error ? error.message : "copy failed"],
      };
    }
  }

  return {
    ok: true,
    applied,
    backups,
    manifestWrite: "not-started",
    diagnostics: [],
  };
}

export function countMutatingOperations(plan: FileOperationPlan): number {
  return plan.operations.filter((operation) => isMutatingOperation(operation)).length;
}
