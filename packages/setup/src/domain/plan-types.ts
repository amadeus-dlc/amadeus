import type { Harness, SetupCommand } from "../cli/types.ts";
import type { DistributionFile, LoadedDistribution, ResolvedVersion } from "./source-types.ts";
import type { TargetDetection, TargetSnapshot } from "./target-types.ts";

export type InteractionMode = "interactive" | "non-interactive";

export type NoWriteReasonCode =
  | "ambiguous-harness"
  | "already-up-to-date"
  | "downgrade-unsupported"
  | "installed-newer-than-latest"
  | "non-interactive-collision"
  | "partial-target-force-required"
  | "plan-invariant-violation"
  | "unsupported-layout"
  | "upgrade-target-none";

export type ConfirmationReasonCode = "shared-file-collision";

export type BackupReasonCode = "shared-file-changed" | "shared-file-unknown-md5";

export type ConflictReasonCode = "shared-file-changed" | "shared-file-unknown-md5";

export type SkipReasonCode = "user-preserved";

export type BackupPath = {
  originalPath: string;
  timestamp: string;
  suffix: ".bk" | `.${number}.bk`;
  backupPath: string;
};

type CopyOperationBase = {
  path: string;
  class: DistributionFile["class"];
  sourcePath: string;
  sourceMd5: string;
};

export type FileOperation =
  | (CopyOperationBase & {
      kind: "add";
    })
  | (CopyOperationBase & {
      kind: "update";
      previousMd5?: string;
      backupPath?: string;
    })
  | (CopyOperationBase & {
      kind: "force-update";
      previousMd5?: string;
      backupPath?: string;
    })
  | {
      kind: "skip";
      path: string;
      class: DistributionFile["class"];
      reason: SkipReasonCode;
    }
  | {
      kind: "backup";
      path: string;
      backupPath: string;
      reason: BackupReasonCode;
    }
  | {
      kind: "conflict";
      path: string;
      class: DistributionFile["class"];
      reason: ConflictReasonCode;
      previousMd5?: string;
    };

export type FileOperationPlan = {
  command: SetupCommand["command"];
  harness: Harness;
  target: string;
  resolvedVersion: ResolvedVersion;
  manifestPath: string;
  operations: FileOperation[];
  canApply: boolean;
  requiresConfirmation: boolean;
  noWriteReason?: NoWriteReasonCode;
  confirmationReason?: ConfirmationReasonCode;
};

export type PlanningContext = {
  command: SetupCommand;
  mode: InteractionMode;
  harness: Harness;
  target: string;
  distribution: LoadedDistribution;
  metadata: readonly DistributionFile[];
  targetDetection: TargetDetection;
  targetSnapshot: TargetSnapshot;
  operationTimestamp: Date;
  backupPathExists: (backupPath: string) => boolean;
};
