import type { SetupError, SetupExitCode } from "./installer-contracts.ts";
import type { FileOperation, FileOperationPlan } from "./plan-types.ts";
import type { InstallerManifest } from "./target-types.ts";

export type { SetupExitCode } from "./installer-contracts.ts";

export type ManifestWriteStatus = "written" | "failed" | "not-started";

export type ApplyDecision = { apply: true } | { apply: false; reason: "declined" | "not-allowed" };

export type ApplyResult =
  | {
      ok: true;
      applied: FileOperation[];
      backups: Array<{ path: string; backupPath: string }>;
      manifestWrite: ManifestWriteStatus;
      diagnostics: string[];
    }
  | {
      ok: false;
      failedPhase: "backup" | "copy";
      failedOperation: FileOperation;
      applied: FileOperation[];
      backups: Array<{ path: string; backupPath: string }>;
      manifestWrite: "not-started";
      diagnostics: string[];
    };

export type VerificationCheck = {
  name: string;
  status: "passed" | "failed";
  reason?: string;
};

export type VerificationResult =
  | { ok: true; checks: VerificationCheck[] }
  | { ok: false; checks: VerificationCheck[] };

export type SetupResult = {
  exitCode: SetupExitCode;
  prependPlan: boolean;
  plan?: FileOperationPlan;
  applyResult?: ApplyResult;
  manifest?: InstallerManifest;
  verificationResult?: VerificationResult;
  classifiedError?: SetupError;
};
