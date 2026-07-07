import type { InstallerManifest } from "../domain/target-types.ts";

export type ManifestStorePort = {
  writeManifestAtomic(manifestPath: string, manifest: InstallerManifest): Promise<void> | void;
};
