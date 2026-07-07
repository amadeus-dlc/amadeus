import { join } from "node:path";
import type { ApplyDecision, ApplyResult, SetupResult } from "../domain/apply-types.ts";
import { applyPlan } from "../domain/file-applier.ts";
import type { SetupCommand, SetupError } from "../domain/installer-contracts.ts";
import { buildInstallerManifest, installerPackageVersionFromEnv, writeManifest } from "../domain/manifest-builder.ts";
import { noWriteNextAction, noWriteReasonMessage } from "../domain/plan-messages.ts";
import type { FileOperationPlan } from "../domain/plan-types.ts";
import type { DistributionFile } from "../domain/source-types.ts";
import { verifyInstallation } from "../domain/verifier.ts";
import type { ResolvedSetupServiceDeps } from "./setup-deps.ts";
import { interactionAllowsPrompts } from "./interaction-mode.ts";

function classifiedNoWriteError(plan: FileOperationPlan): SetupError {
  const reason = plan.noWriteReason ?? "plan-invariant-violation";
  return {
    code: "plan-no-write",
    message: noWriteReasonMessage(reason),
    noFilesModified: true,
    nextAction: noWriteNextAction(reason),
    details: {
      noWriteReason: reason,
      command: plan.command,
      harness: plan.harness,
    },
  };
}

async function resolveApplyDecision(plan: FileOperationPlan, command: SetupCommand, deps: ResolvedSetupServiceDeps): Promise<ApplyDecision> {
  if (!plan.requiresConfirmation) {
    return { apply: true };
  }
  if (!interactionAllowsPrompts(command, deps.stdinIsTTY)) {
    return { apply: false, reason: "not-allowed" };
  }
  if (deps.promptPort?.confirmApply === undefined) {
    return { apply: false, reason: "not-allowed" };
  }
  return deps.promptPort.confirmApply(plan);
}

function declinedConfirmationError(): SetupError {
  return {
    code: "apply-declined",
    message: "apply confirmation was declined.",
    noFilesModified: true,
    nextAction: "Re-run the command and accept the confirmation prompt to apply the plan.",
  };
}

function applyFailureError(applyResult: Extract<ApplyResult, { ok: false }>): SetupError {
  return {
    code: "apply-failed",
    message: `file apply failed during ${applyResult.failedPhase} on ${applyResult.failedOperation.path}.`,
    noFilesModified: false,
    nextAction: "Inspect the target directory and backup files, then re-run after fixing the reported failure.",
    details: {
      failedPhase: applyResult.failedPhase,
      failedPath: applyResult.failedOperation.path,
    },
  };
}

function manifestWriteFailureError(): SetupError {
  return {
    code: "manifest-write-failed",
    message: "installer manifest could not be written after file apply succeeded.",
    noFilesModified: false,
    nextAction: "Inspect permissions and disk space in amadeus/.installer, then re-run to rewrite the manifest.",
  };
}

function verificationFailureError(failedChecks: string[]): SetupError {
  return {
    code: "verification-failed",
    message: "installation verification failed.",
    noFilesModified: false,
    nextAction: "Inspect the target directory, then re-run the same command after fixing permissions or disk issues.",
    details: {
      failedChecks: failedChecks.join(", "),
    },
  };
}

async function executeApprovedPlan(input: {
  command: SetupCommand;
  plan: FileOperationPlan;
  metadata: DistributionFile[];
  deps: ResolvedSetupServiceDeps;
}): Promise<SetupResult> {
  const manifestAbsolutePath = join(input.plan.target, input.plan.manifestPath);
  let applyResult = await applyPlan(input.plan, {
    targetRoot: input.plan.target,
    files: input.deps.targetWritableFiles,
  });

  if (!applyResult.ok) {
    return {
      exitCode: 1,
      prependPlan: true,
      plan: input.plan,
      applyResult,
      classifiedError: applyFailureError(applyResult),
    };
  }

  const manifest = buildInstallerManifest({
    plan: input.plan,
    metadata: input.metadata,
    installerPackageVersion: installerPackageVersionFromEnv(),
    installedAt: input.deps.installedAt(),
  });

  try {
    await writeManifest({
      manifestPath: manifestAbsolutePath,
      manifest,
      manifestStore: input.deps.manifestStore,
    });
    applyResult = { ...applyResult, manifestWrite: "written" };
  } catch {
    applyResult = { ...applyResult, manifestWrite: "failed" };
    return {
      exitCode: 1,
      prependPlan: true,
      plan: input.plan,
      applyResult,
      manifest,
      classifiedError: manifestWriteFailureError(),
    };
  }

  const verificationResult = await verifyInstallation({
    target: input.plan.target,
    harness: input.plan.harness,
    manifest,
    files: input.deps.targetFiles,
  });

  if (!verificationResult.ok) {
    const failedChecks = verificationResult.checks.filter((check) => check.status === "failed").map((check) => check.name);
    return {
      exitCode: 1,
      prependPlan: true,
      plan: input.plan,
      applyResult,
      manifest,
      verificationResult,
      classifiedError: verificationFailureError(failedChecks),
    };
  }

  return {
    exitCode: 0,
    prependPlan: true,
    plan: input.plan,
    applyResult,
    manifest,
    verificationResult,
  };
}

export async function executePlannedSetup(input: {
  command: SetupCommand;
  plan: FileOperationPlan;
  metadata: DistributionFile[];
  deps: ResolvedSetupServiceDeps;
}): Promise<SetupResult> {
  const resolved = input.deps;

  if (!input.plan.canApply) {
    return {
      exitCode: 2,
      prependPlan: false,
      plan: input.plan,
      classifiedError: classifiedNoWriteError(input.plan),
    };
  }

  const decision = await resolveApplyDecision(input.plan, input.command, resolved);
  if (!decision.apply) {
    const classifiedError =
      decision.reason === "declined"
        ? declinedConfirmationError()
        : {
            code: "apply-declined" as const,
            message: "apply confirmation is not allowed in the current interaction mode.",
            noFilesModified: true,
            nextAction: "Re-run interactively without --yes or supply --yes only when confirmation is not required.",
          };
    return {
      exitCode: 2,
      prependPlan: true,
      plan: input.plan,
      classifiedError,
    };
  }

  return executeApprovedPlan({
    command: input.command,
    plan: input.plan,
    metadata: input.metadata,
    deps: resolved,
  });
}
