import type { Harness, SetupCommand, SetupError } from "../domain/installer-contracts.ts";
import { loadDistribution } from "../domain/distribution-loader.ts";
import { planInstall, planUpgrade } from "../domain/operation-planner.ts";
import { interactionAllowsPrompts, interactionMode } from "./interaction-mode.ts";
import { CANONICAL_SOURCE_REPO, setupSourceError } from "../domain/source-types.ts";
import { detectTarget } from "../domain/target-detector.ts";
import { snapshotTarget } from "../domain/target-snapshot.ts";
import type { TargetDetection } from "../domain/target-types.ts";
import { resolveVersion } from "../domain/version-resolver.ts";
import type { SetupResult } from "../domain/apply-types.ts";
import { executePlannedSetup } from "./planned-setup.ts";
import { resolveSetupDeps, type SetupServiceDeps } from "./setup-deps.ts";

export type { SetupServiceDeps, ResolvedSetupServiceDeps } from "./setup-deps.ts";

function errorResult(error: SetupError, exitCode: SetupResult["exitCode"] = 2): SetupResult {
  return { exitCode, prependPlan: false, classifiedError: error };
}

function targetRequired(command: SetupCommand): SetupResult {
  return errorResult(
    setupSourceError({
      code: "target-required",
      message: `${command.command} requires --target before target detection can continue.`,
      nextAction: "Pass --target for this installer slice.",
    }),
  );
}

function detectionFailure(command: SetupCommand, detection: TargetDetection): SetupResult {
  return errorResult(
    setupSourceError({
      code: "target-detection-failed",
      message: `${command.command} could not infer a usable harness from target state ${detection.state}.`,
      nextAction: "Pass --harness explicitly or choose a target with a supported first-release Amadeus layout.",
      details: { targetState: detection.state },
    }),
  );
}

function inferredHarness(detection: TargetDetection): Harness | undefined {
  return detection.state === "manifest-installed" || detection.state === "manual-or-unknown" ? detection.inferredHarness : undefined;
}

type ResolvedTargetContext =
  | { ok: true; harness: Harness; detection: TargetDetection }
  | { ok: false; result: SetupResult };

async function resolveTargetContext(command: SetupCommand, deps: ReturnType<typeof resolveSetupDeps>): Promise<ResolvedTargetContext> {
  const detected = await detectTarget({
    targetPath: command.target!,
    requestedHarness: command.harness,
    promptsAllowed: interactionAllowsPrompts(command, deps.stdinIsTTY),
    manifestReader: deps.targetManifestReader,
    files: deps.targetFiles,
    promptPort: deps.promptPort,
  });
  if (!detected.ok) {
    return { ok: false, result: errorResult(detected.error) };
  }
  const harness = command.harness ?? inferredHarness(detected.detection);
  if (harness === undefined) {
    return { ok: false, result: detectionFailure(command, detected.detection) };
  }
  return { ok: true, harness, detection: detected.detection };
}

export async function executeSetupCommand(command: SetupCommand, deps: SetupServiceDeps = {}): Promise<SetupResult> {
  if (command.target === undefined) {
    return targetRequired(command);
  }

  const resolvedDeps = resolveSetupDeps(deps);
  const targetContext = await resolveTargetContext(command, resolvedDeps);
  if (!targetContext.ok) {
    return targetContext.result;
  }
  const { harness, detection } = targetContext;

  const version = await resolveVersion({
    requestedVersion: command.version,
    sourceRepo: CANONICAL_SOURCE_REPO,
    allowExplicitPrerelease: command.version?.includes("-") ?? false,
    tagSource: resolvedDeps.tagSource,
  });
  if (!version.ok) {
    return errorResult(version.error);
  }

  const distribution = await loadDistribution({
    resolvedVersion: version.value,
    harness,
    archiveSource: resolvedDeps.archiveSource,
    archiveExtractor: resolvedDeps.archiveExtractor,
  });
  if (!distribution.ok) {
    return errorResult(distribution.error);
  }

  try {
    const metadata = await resolvedDeps.readMetadata({
      distribution: distribution.value,
      harness,
    });
    if (!metadata.ok) {
      return errorResult(metadata.error);
    }

    const snapshot = await snapshotTarget({
      targetPath: command.target,
      detection,
      distributionFiles: metadata.value,
      files: resolvedDeps.targetFiles,
    });
    const planContext = {
      command,
      mode: interactionMode(command, resolvedDeps.stdinIsTTY),
      harness,
      target: command.target,
      distribution: distribution.value,
      metadata: metadata.value,
      targetDetection: detection,
      targetSnapshot: snapshot,
      operationTimestamp: resolvedDeps.operationTimestamp(),
      backupPathExists: resolvedDeps.backupPathExists,
    };
    const plan = command.command === "install" ? planInstall(planContext) : planUpgrade(planContext);
    return await executePlannedSetup({
      command,
      plan,
      metadata: metadata.value,
      deps: resolvedDeps,
    });
  } finally {
    await resolvedDeps.archiveExtractor.cleanup(distribution.value);
  }
}
