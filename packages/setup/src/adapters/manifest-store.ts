import type { ManifestStorePort } from "../ports/manifest-store.ts";
import type { TargetFilePort } from "../ports/filesystem.ts";
import type { InstallerManifest } from "../domain/target-types.ts";

export class FileSystemManifestStore implements ManifestStorePort {
  constructor(private readonly files: TargetFilePort) {}

  writeManifestAtomic(manifestPath: string, manifest: InstallerManifest): void {
    const content = new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`);
    this.files.writeFileAtomic(manifestPath, content);
  }
}

export class FailingManifestStore implements ManifestStorePort {
  constructor(private readonly reason: string) {}

  writeManifestAtomic(_manifestPath: string, _manifest: InstallerManifest): void {
    throw new Error(this.reason);
  }
}
