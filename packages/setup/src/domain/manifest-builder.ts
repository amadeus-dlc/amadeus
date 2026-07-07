import type { DistributionFile } from "./source-types.ts";
import type { FileOperationPlan } from "./plan-types.ts";
import { INSTALLER_MANIFEST_SCHEMA_VERSION, type InstallerManifest } from "./target-types.ts";
import type { Harness } from "./installer-contracts.ts";

export function buildInstallerManifest(input: {
  plan: FileOperationPlan;
  metadata: readonly DistributionFile[];
  installerPackageVersion: string;
  installedAt: string;
}): InstallerManifest {
  return {
    schemaVersion: INSTALLER_MANIFEST_SCHEMA_VERSION,
    installerPackageVersion: input.installerPackageVersion,
    distributionVersion: input.plan.resolvedVersion.distributionVersion,
    sourceTag: input.plan.resolvedVersion.sourceTag,
    installedAt: input.installedAt,
    harness: input.plan.harness,
    files: input.metadata.map((file) => ({ ...file })),
  };
}

export function installerPackageVersionFromEnv(): string {
  return process.env.AMADEUS_SETUP_PACKAGE_VERSION ?? "0.0.0";
}

export type WriteManifestInput = {
  manifestPath: string;
  manifest: InstallerManifest;
  manifestStore: {
    writeManifestAtomic(manifestPath: string, manifest: InstallerManifest): Promise<void> | void;
  };
};

export async function writeManifest(input: WriteManifestInput): Promise<void> {
  await input.manifestStore.writeManifestAtomic(input.manifestPath, input.manifest);
}

export type VerifyInstallationInput = {
  target: string;
  harness: Harness;
  manifest: InstallerManifest;
  files: {
    exists(path: string): Promise<boolean> | boolean;
  };
};
