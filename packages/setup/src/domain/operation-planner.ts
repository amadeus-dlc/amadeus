import { buildBackupPath, formatUtcBasicTimestamp } from "./backup-planner.ts";
import { INSTALLER_MANIFEST_PATH } from "./target-types.ts";
import type { DistributionFile } from "./source-types.ts";
import type {
  BackupReasonCode,
  ConflictReasonCode,
  FileOperation,
  FileOperationPlan,
  NoWriteReasonCode,
  PlanningContext,
} from "./plan-types.ts";

type Version = {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
};

const SEMVER_PATTERN = /^(?:v)?(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z.-]+))?$/;

function parseVersion(value: string): Version | undefined {
  const match = SEMVER_PATTERN.exec(value);
  if (match === null) {
    return undefined;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4],
  };
}

function compareVersions(left: string, right: string): number {
  const parsedLeft = parseVersion(left);
  const parsedRight = parseVersion(right);
  if (parsedLeft === undefined || parsedRight === undefined) {
    return left.localeCompare(right);
  }
  for (const key of ["major", "minor", "patch"] as const) {
    const difference = parsedLeft[key] - parsedRight[key];
    if (difference !== 0) {
      return difference;
    }
  }
  if (parsedLeft.prerelease === parsedRight.prerelease) {
    return 0;
  }
  if (parsedLeft.prerelease === undefined) {
    return 1;
  }
  if (parsedRight.prerelease === undefined) {
    return -1;
  }
  return parsedLeft.prerelease.localeCompare(parsedRight.prerelease);
}

function noWritePlan(context: PlanningContext, reason: NoWriteReasonCode, operations: FileOperation[] = []): FileOperationPlan {
  return {
    command: context.command.command,
    harness: context.harness,
    target: context.target,
    resolvedVersion: context.distribution.resolvedVersion,
    manifestPath: INSTALLER_MANIFEST_PATH,
    operations,
    canApply: false,
    requiresConfirmation: false,
    noWriteReason: reason,
  };
}

function candidatePlan(context: PlanningContext, operations: FileOperation[], requiresConfirmation: boolean): FileOperationPlan {
  return {
    command: context.command.command,
    harness: context.harness,
    target: context.target,
    resolvedVersion: context.distribution.resolvedVersion,
    manifestPath: INSTALLER_MANIFEST_PATH,
    operations,
    canApply: true,
    requiresConfirmation,
    confirmationReason: requiresConfirmation ? "shared-file-collision" : undefined,
  };
}

function sourcePathByRelativePath(context: PlanningContext): Map<string, string> {
  return new Map(context.distribution.files.map((file) => [file.path, file.absolutePath]));
}

function snapshotByRelativePath(context: PlanningContext): Map<string, { exists: boolean; md5?: string }> {
  return new Map(context.targetSnapshot.existingFiles.map((file) => [file.path, { exists: file.exists, md5: file.md5 }]));
}

function previousMd5ByRelativePath(context: PlanningContext): Map<string, string> {
  if (context.targetDetection.state !== "manifest-installed") {
    return new Map(context.metadata.map((file) => [file.path, file.md5]));
  }
  return new Map(context.targetDetection.manifest.files.map((file) => [file.path, file.md5]));
}

function sourcePathFor(file: DistributionFile, sourcePaths: Map<string, string>, context: PlanningContext): string {
  return sourcePaths.get(file.path) ?? `${context.distribution.root}/${file.path}`;
}

function sharedBackupReason(snapshotMd5: string | undefined, previousMd5: string | undefined): BackupReasonCode {
  return snapshotMd5 !== undefined && previousMd5 !== undefined && snapshotMd5 !== previousMd5 ? "shared-file-changed" : "shared-file-unknown-md5";
}

function sharedConflictReason(snapshotMd5: string | undefined, previousMd5: string | undefined): ConflictReasonCode {
  return sharedBackupReason(snapshotMd5, previousMd5);
}

function backupAndCopyOperations(input: {
  context: PlanningContext;
  file: DistributionFile;
  sourcePath: string;
  previousMd5?: string;
  reason: BackupReasonCode;
  force: boolean;
  timestamp: string;
}): FileOperation[] {
  const backup = buildBackupPath({
    originalPath: input.file.path,
    timestamp: input.timestamp,
    backupPathExists: input.context.backupPathExists,
  });
  return [
    {
      kind: "backup",
      path: input.file.path,
      backupPath: backup.backupPath,
      reason: input.reason,
    },
    {
      kind: input.force ? "force-update" : "update",
      path: input.file.path,
      class: input.file.class,
      sourcePath: input.sourcePath,
      sourceMd5: input.file.md5,
      previousMd5: input.previousMd5,
      backupPath: backup.backupPath,
    },
  ];
}

function planFiles(context: PlanningContext): FileOperationPlan {
  const sourcePaths = sourcePathByRelativePath(context);
  const snapshots = snapshotByRelativePath(context);
  const previousMd5s = previousMd5ByRelativePath(context);
  const operations: FileOperation[] = [];
  const conflicts: FileOperation[] = [];
  let requiresConfirmation = false;
  const timestamp = formatUtcBasicTimestamp(context.operationTimestamp);

  for (const file of context.metadata) {
    const sourcePath = sourcePathFor(file, sourcePaths, context);
    const snapshot = snapshots.get(file.path);
    if (snapshot?.exists !== true) {
      operations.push({ kind: "add", path: file.path, class: file.class, sourcePath, sourceMd5: file.md5 });
      continue;
    }

    if (file.class === "user-preserved") {
      operations.push({ kind: "skip", path: file.path, class: file.class, reason: "user-preserved" });
      continue;
    }

    if (file.class === "owned") {
      operations.push({
        kind: context.command.force ? "force-update" : "update",
        path: file.path,
        class: file.class,
        sourcePath,
        sourceMd5: file.md5,
        previousMd5: snapshot.md5,
      });
      continue;
    }

    const previousMd5 = previousMd5s.get(file.path);
    if (snapshot.md5 !== undefined && previousMd5 !== undefined && snapshot.md5 === previousMd5) {
      operations.push({ kind: "update", path: file.path, class: file.class, sourcePath, sourceMd5: file.md5, previousMd5 });
      continue;
    }

    if (context.command.force) {
      operations.push(
        ...backupAndCopyOperations({
          context,
          file,
          sourcePath,
          previousMd5,
          reason: sharedBackupReason(snapshot.md5, previousMd5),
          force: true,
          timestamp,
        }),
      );
      continue;
    }

    if (context.mode === "non-interactive") {
      conflicts.push({ kind: "conflict", path: file.path, class: file.class, reason: sharedConflictReason(snapshot.md5, previousMd5), previousMd5 });
      continue;
    }

    requiresConfirmation = true;
    operations.push(
      ...backupAndCopyOperations({
        context,
        file,
        sourcePath,
        previousMd5,
        reason: sharedBackupReason(snapshot.md5, previousMd5),
        force: false,
        timestamp,
      }),
    );
  }

  if (conflicts.length > 0) {
    return safePlan(context, noWritePlan(context, "non-interactive-collision", conflicts));
  }
  return safePlan(context, candidatePlan(context, operations, requiresConfirmation));
}

function upgradeNoWriteReason(context: PlanningContext): NoWriteReasonCode | undefined {
  const detection = context.targetDetection;
  if (detection.state === "none") {
    return "upgrade-target-none";
  }
  if (detection.state === "unsupported-layout") {
    return "unsupported-layout";
  }
  if (detection.state === "ambiguous-harness") {
    return "ambiguous-harness";
  }
  if (detection.state === "partial" && !context.command.force) {
    return "partial-target-force-required";
  }
  if (detection.state !== "manifest-installed") {
    return undefined;
  }

  const installedVersion = detection.manifest.distributionVersion;
  const resolvedVersion = context.distribution.resolvedVersion.distributionVersion;
  const comparison = compareVersions(installedVersion, resolvedVersion);
  if (comparison === 0) {
    return "already-up-to-date";
  }
  if (comparison > 0) {
    return context.command.version === undefined ? "installed-newer-than-latest" : "downgrade-unsupported";
  }
  return undefined;
}

function executableWriteKinds(operation: FileOperation): boolean {
  return operation.kind === "add" || operation.kind === "backup" || operation.kind === "update" || operation.kind === "force-update";
}

export function validateFileOperationPlan(plan: FileOperationPlan): string[] {
  const issues: string[] = [];
  if (!plan.canApply && plan.noWriteReason === undefined) {
    issues.push("canApply:false requires noWriteReason");
  }
  if (!plan.canApply && plan.operations.some(executableWriteKinds)) {
    issues.push("canApply:false cannot include executable write operations");
  }
  if (plan.canApply && plan.operations.some((operation) => operation.kind === "conflict")) {
    issues.push("conflict operations require canApply:false");
  }

  const seenBackups = new Set<string>();
  for (const operation of plan.operations) {
    if (operation.kind === "backup") {
      seenBackups.add(`${operation.path}\0${operation.backupPath}`);
      continue;
    }
    if ((operation.kind === "update" || operation.kind === "force-update") && operation.backupPath !== undefined && !seenBackups.has(`${operation.path}\0${operation.backupPath}`)) {
      issues.push(`backup must precede ${operation.kind} for ${operation.path}`);
    }
    if ((operation.kind === "add" || operation.kind === "update" || operation.kind === "force-update") && (operation.sourcePath.length === 0 || operation.sourceMd5.length === 0)) {
      issues.push(`${operation.kind} for ${operation.path} requires sourcePath and sourceMd5`);
    }
  }
  return issues;
}

function safePlan(context: PlanningContext, plan: FileOperationPlan): FileOperationPlan {
  const issues = validateFileOperationPlan(plan);
  if (issues.length === 0) {
    return plan;
  }
  return noWritePlan(context, "plan-invariant-violation");
}

export function planInstall(context: PlanningContext): FileOperationPlan {
  return planFiles(context);
}

export function planUpgrade(context: PlanningContext): FileOperationPlan {
  const reason = upgradeNoWriteReason(context);
  if (reason !== undefined) {
    return safePlan(context, noWritePlan(context, reason));
  }
  return planFiles(context);
}
