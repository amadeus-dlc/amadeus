import { renderError } from "../cli/reporter.ts";
import type { EntrypointResult, Harness, SetupCommand, SetupError } from "../cli/types.ts";
import { ArchiveExtractor } from "../adapters/archive-extractor.ts";
import { GitHubArchiveSource, GitHubTagSource } from "../adapters/github-source.ts";
import { FileSystemTargetManifestReader } from "../adapters/target-manifest-reader.ts";
import { NodeTargetReadOnlyFile } from "../adapters/target-readonly-file.ts";
import { loadDistribution } from "../domain/distribution-loader.ts";
import { readDistributionMetadata } from "../domain/distribution-metadata.ts";
import { planInstall, planUpgrade } from "../domain/operation-planner.ts";
import type { FileOperationPlan } from "../domain/plan-types.ts";
import { CANONICAL_SOURCE_REPO, setupSourceError } from "../domain/source-types.ts";
import { detectTarget } from "../domain/target-detector.ts";
import { snapshotTarget } from "../domain/target-snapshot.ts";
import type { TargetDetection, TargetSnapshot } from "../domain/target-types.ts";
import { resolveVersion } from "../domain/version-resolver.ts";
import type { ArchiveExtractorPort } from "../ports/archive-extractor.ts";
import type { ArchiveSourcePort } from "../ports/archive-source.ts";
import type { TagSourcePort } from "../ports/tag-source.ts";
import type { PromptPort, TargetManifestReadPort, TargetReadOnlyFilePort } from "../ports/target-state.ts";

export type SetupServiceDeps = {
  tagSource?: TagSourcePort;
  archiveSource?: ArchiveSourcePort;
  archiveExtractor?: ArchiveExtractorPort;
  readMetadata?: typeof readDistributionMetadata;
  targetManifestReader?: TargetManifestReadPort;
  targetFiles?: TargetReadOnlyFilePort;
  promptPort?: PromptPort;
  operationTimestamp?: () => Date;
  backupPathExists?: (backupPath: string) => boolean;
};

function renderFailure(error: SetupError): EntrypointResult {
  return {
    code: 2,
    stdout: "",
    stderr: `${renderError(error)}\n`,
  };
}

type ResolvedSetupServiceDeps = Required<Omit<SetupServiceDeps, "promptPort">> & Pick<SetupServiceDeps, "promptPort">;

function resolveDeps(deps: SetupServiceDeps): ResolvedSetupServiceDeps {
  const targetFiles = deps.targetFiles ?? new NodeTargetReadOnlyFile();
  return {
    tagSource: deps.tagSource ?? new GitHubTagSource(),
    archiveSource: deps.archiveSource ?? new GitHubArchiveSource(),
    archiveExtractor: deps.archiveExtractor ?? new ArchiveExtractor(),
    readMetadata: deps.readMetadata ?? readDistributionMetadata,
    targetManifestReader: deps.targetManifestReader ?? new FileSystemTargetManifestReader(targetFiles),
    targetFiles,
    promptPort: deps.promptPort,
    operationTimestamp: deps.operationTimestamp ?? (() => new Date()),
    backupPathExists: deps.backupPathExists ?? (() => false),
  };
}

function planSummary(plan: FileOperationPlan): string {
  const operationKinds = plan.operations.map((operation) => operation.kind).join(",");
  const reason = plan.noWriteReason ?? "none";
  return `planned ${plan.operations.length} operations [${operationKinds}] with canApply=${plan.canApply}, requiresConfirmation=${plan.requiresConfirmation}, noWriteReason=${reason}`;
}

function downstreamNotImplemented(command: SetupCommand, distributionVersion: string, sourceTag: string, fileCount: number, detection: TargetDetection, snapshot: TargetSnapshot, plan: FileOperationPlan): EntrypointResult {
  const error: SetupError = {
    code: "downstream-not-implemented",
    message: `${command.command} resolved Amadeus ${distributionVersion} from ${sourceTag} with ${fileCount} source files, detected target state ${detection.state}, snapshotted ${snapshot.diagnostics.expectedFileCount} expected files, and ${planSummary(plan)}, but apply and manifest writing are implemented by later units.`,
    nextAction: "Proceed with later installer units for file apply, manifest writing, reporting, and verification.",
    noFilesModified: true,
    details: {
      planCanApply: String(plan.canApply),
      planOperationCount: String(plan.operations.length),
      planNoWriteReason: plan.noWriteReason ?? "none",
      planRequiresConfirmation: String(plan.requiresConfirmation),
    },
  };
  return renderFailure(error);
}

function targetRequired(command: SetupCommand): EntrypointResult {
  return renderFailure(
    setupSourceError({
      code: "target-required",
      message: `${command.command} requires --target before target detection can continue.`,
      nextAction: "Pass --target for this installer slice.",
    }),
  );
}

function detectionFailure(command: SetupCommand, detection: TargetDetection): EntrypointResult {
  return renderFailure(
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

export async function executeSetupCommand(command: SetupCommand, deps: SetupServiceDeps = {}): Promise<EntrypointResult> {
  if (command.target === undefined) {
    return targetRequired(command);
  }

  const resolvedDeps = resolveDeps(deps);
  let harness = command.harness;
  let detection: TargetDetection | undefined;
  if (harness === undefined) {
    const detected = await detectTarget({
      targetPath: command.target,
      requestedHarness: undefined,
      promptsAllowed: !command.yes,
      manifestReader: resolvedDeps.targetManifestReader,
      files: resolvedDeps.targetFiles,
      promptPort: resolvedDeps.promptPort,
    });
    if (!detected.ok) {
      return renderFailure(detected.error);
    }
    detection = detected.detection;
    harness = inferredHarness(detection);
    if (harness === undefined) {
      return detectionFailure(command, detection);
    }
  }

  const version = await resolveVersion({
    requestedVersion: command.version,
    sourceRepo: CANONICAL_SOURCE_REPO,
    allowExplicitPrerelease: command.version?.includes("-") ?? false,
    tagSource: resolvedDeps.tagSource,
  });
  if (!version.ok) {
    return renderFailure(version.error);
  }

  const distribution = await loadDistribution({
    resolvedVersion: version.value,
    harness,
    archiveSource: resolvedDeps.archiveSource,
    archiveExtractor: resolvedDeps.archiveExtractor,
  });
  if (!distribution.ok) {
    return renderFailure(distribution.error);
  }

  try {
    const metadata = await resolvedDeps.readMetadata({
      distribution: distribution.value,
      harness,
    });
    if (!metadata.ok) {
      return renderFailure(metadata.error);
    }
    if (detection === undefined) {
      const detected = await detectTarget({
        targetPath: command.target,
        requestedHarness: command.harness,
        promptsAllowed: !command.yes,
        manifestReader: resolvedDeps.targetManifestReader,
        files: resolvedDeps.targetFiles,
        promptPort: resolvedDeps.promptPort,
      });
      if (!detected.ok) {
        return renderFailure(detected.error);
      }
      detection = detected.detection;
    }
    const snapshot = await snapshotTarget({
      targetPath: command.target,
      detection,
      distributionFiles: metadata.value,
      files: resolvedDeps.targetFiles,
    });
    const planContext = {
      command,
      mode: command.yes ? ("non-interactive" as const) : ("interactive" as const),
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
    return downstreamNotImplemented(command, version.value.distributionVersion, version.value.sourceTag, metadata.value.length, detection, snapshot, plan);
  } finally {
    await resolvedDeps.archiveExtractor.cleanup(distribution.value);
  }
}
